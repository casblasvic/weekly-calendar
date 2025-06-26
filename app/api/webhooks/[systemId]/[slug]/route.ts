import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface WebhookRouteParams {
  params: Promise<{
    systemId: string
    slug: string
  }>
}

// Handler principal para webhooks
export async function POST(request: NextRequest, { params }: WebhookRouteParams) {
  const resolvedParams = await params
  const { systemId, slug } = resolvedParams
  
  console.log(`[Webhook] Processing ${slug} for system ${systemId}`)
  
  try {
    // 1. Buscar y validar el webhook
    const webhook = await prisma.webhook.findUnique({
      where: {
        systemId_slug: {
          systemId,
          slug
        }
      }
    })

    if (!webhook) {
      console.error(`[Webhook] Webhook not found: ${systemId}/${slug}`)
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    if (!webhook.isActive) {
      console.error(`[Webhook] Webhook inactive: ${systemId}/${slug}`)
      return NextResponse.json(
        { error: 'Webhook is inactive' },
        { status: 403 }
      )
    }

    // 2. Validar autenticación
    const authHeader = request.headers.get('authorization')
    if (authHeader && webhook.token) {
      const token = authHeader.replace('Bearer ', '')
      if (token !== webhook.token) {
        console.error(`[Webhook] Invalid token for ${systemId}/${slug}`)
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }
    }

    // 3. Obtener y validar datos del cuerpo
    const body = await request.json()
    console.log(`[Webhook] Received data:`, JSON.stringify(body, null, 2))

    // 4. Log del webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        sourceIp: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    console.log(`[Webhook] Log created: ${webhookLog.id}`)

    // 5. Procesar según el tipo de webhook (detectar por patrón en slug y estructura de datos)
    let result
    
    // Detectar si el payload ya tiene estructura de AppointmentDeviceUsage
    const hasAppointmentDeviceUsageStructure = body.appointmentId && body.equipmentId && body.deviceId && body.startedAt && body.estimatedMinutes && body.startedByUserId

    if (hasAppointmentDeviceUsageStructure) {
      // Si ya tiene la estructura correcta, usar el procesador genérico
      result = await processAppointmentDeviceUsage(body, webhook, webhookLog.id)
    } else if (slug.includes('shelly') || slug === 'shelly-device-usage') {
      result = await processShellyDeviceUsage(body, webhook, webhookLog.id)
    } else if (slug.includes('kasa') || slug === 'kasa-equipment-monitor') {
      result = await processKasaEquipmentMonitor(body, webhook, webhookLog.id)
    } else if (slug.includes('smart-plug') || slug === 'generic-smart-plug') {
      result = await processGenericSmartPlug(body, webhook, webhookLog.id)
    } else {
      // Procesador genérico para cualquier webhook que mapee a AppointmentDeviceUsage
      result = await processAppointmentDeviceUsage(body, webhook, webhookLog.id)
    }

    // 6. Actualizar log con resultado exitoso
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        statusCode: 200,
        responseBody: result,
        wasProcessed: true
      }
    })

    console.log(`[Webhook] Processing completed successfully`)
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      data: result
    })

  } catch (error) {
    console.error(`[Webhook] Error processing webhook:`, error)
    
    // Intentar actualizar log con error
    try {
      const webhookLogId = (error as any).webhookLogId
      if (webhookLogId) {
        await prisma.webhookLog.update({
          where: { id: webhookLogId },
          data: {
            statusCode: 500,
            responseBody: { error: (error as Error).message },
            wasProcessed: true
          }
        })
      }
    } catch (logError) {
      console.error('[Webhook] Failed to update error log:', logError)
    }

    return NextResponse.json(
      { 
        success: false,
        error: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

// Procesador específico para webhooks de Shelly
async function processShellyDeviceUsage(data: any, webhook: any, logId: string) {
  console.log('[Shelly] Processing device usage data')
  
  // Validar campos requeridos
  if (!data.device_id || !data.event_type || !data.timestamp) {
    throw new Error('Missing required fields: device_id, event_type, timestamp')
  }

  // Solo procesar si hay appointment_id
  if (!data.appointment_id || data.appointment_id === 'APPOINTMENT_ID_PLACEHOLDER') {
    console.log('[Shelly] No appointment_id provided, skipping database creation')
    return {
      message: 'Data processed but no appointment_id provided',
      device_id: data.device_id,
      event_type: data.event_type,
      timestamp: data.timestamp
    }
  }

  // Buscar el dispositivo
  const device = await prisma.device.findFirst({
    where: {
      deviceIdProvider: data.device_id,
      systemId: webhook.systemId
    },
    include: {
      equipmentControlled: true
    }
  })

  if (!device) {
    throw new Error(`Device not found: ${data.device_id}`)
  }

  if (!device.equipmentControlled) {
    throw new Error(`No equipment associated with device: ${data.device_id}`)
  }

  // Verificar que la cita existe
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointment_id }
  })

  if (!appointment) {
    throw new Error(`Appointment not found: ${data.appointment_id}`)
  }

  // Verificar usuario (solo si no es placeholder)
  let userId = data.user_id
  if (userId === 'USER_ID_PLACEHOLDER') {
    // Usar el usuario profesional de la cita como fallback
    userId = appointment.professionalUserId
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const timestamp = new Date(data.timestamp)
  
  if (data.event_type === 'power_on') {
    // Buscar registro existente y crear o actualizar
    const existingUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: data.appointment_id,
        deviceId: device.id,
        endedAt: null // Solo los activos
      }
    })

    const deviceData = {
      power_consumption: data.power_consumption,
      voltage: data.voltage,
      current: data.current,
      temperature: data.temperature,
      device_name: data.device_name,
      event_type: data.event_type,
      raw_timestamp: data.timestamp
    }

    let deviceUsage
    if (existingUsage) {
      // Actualizar registro existente
      deviceUsage = await prisma.appointmentDeviceUsage.update({
        where: { id: existingUsage.id },
        data: {
          startedAt: timestamp,
          startedByUserId: userId,
          energyConsumption: data.total_energy || 0,
          deviceData
        }
      })
    } else {
      // Crear nuevo registro
      deviceUsage = await prisma.appointmentDeviceUsage.create({
        data: {
          appointmentId: data.appointment_id,
          appointmentServiceId: data.service_id !== 'SERVICE_ID_PLACEHOLDER' ? data.service_id : null,
          equipmentId: device.equipmentControlled.id,
          deviceId: device.id,
          startedAt: timestamp,
          estimatedMinutes: 30, // Default
          startedByUserId: userId,
          systemId: webhook.systemId,
          energyConsumption: data.total_energy || 0,
          deviceData
        }
      })
    }

    console.log(`[Shelly] Device usage started: ${deviceUsage.id}`)
    return {
      action: 'device_started',
      deviceUsageId: deviceUsage.id,
      device: device.name,
      equipment: device.equipmentControlled.name,
      startedAt: timestamp
    }

  } else if (data.event_type === 'power_off') {
    // Buscar registro existente y actualizarlo
    const existingUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: data.appointment_id,
        deviceId: device.id,
        endedAt: null // Solo los que están activos
      }
    })

    if (existingUsage) {
      // Calcular duración real
      const actualMinutes = Math.round(
        (timestamp.getTime() - existingUsage.startedAt.getTime()) / (1000 * 60)
      )

      const updatedUsage = await prisma.appointmentDeviceUsage.update({
        where: { id: existingUsage.id },
        data: {
          endedAt: timestamp,
          actualMinutes,
          energyConsumption: data.total_energy || existingUsage.energyConsumption,
          deviceData: {
            ...(existingUsage.deviceData as any || {}),
            final_power_consumption: data.power_consumption,
            final_temperature: data.temperature,
            final_energy: data.total_energy,
            power_off_timestamp: data.timestamp
          }
        }
      })

      console.log(`[Shelly] Device usage ended: ${updatedUsage.id} (${actualMinutes} minutes)`)
      return {
        action: 'device_stopped',
        deviceUsageId: updatedUsage.id,
        actualMinutes,
        energyConsumption: data.total_energy,
        endedAt: timestamp
      }
    } else {
      console.log('[Shelly] No active usage found for power_off event')
      return {
        action: 'power_off_without_start',
        message: 'No active device usage found to end'
      }
    }

  } else if (data.event_type === 'energy_report') {
    // Actualizar datos de energía en registros activos
    const activeUsages = await prisma.appointmentDeviceUsage.updateMany({
      where: {
        deviceId: device.id,
        endedAt: null,
        appointmentId: data.appointment_id
      },
      data: {
        energyConsumption: data.total_energy,
        deviceData: {
          energy_report_timestamp: data.timestamp,
          current_power: data.power_consumption,
          total_energy: data.total_energy,
          temperature: data.temperature
        }
      }
    })

    console.log(`[Shelly] Updated ${activeUsages.count} active usage records with energy data`)
    return {
      action: 'energy_updated',
      updatedRecords: activeUsages.count,
      energyConsumption: data.total_energy
    }
  }

  throw new Error(`Unknown Shelly event type: ${data.event_type}`)
}

// Procesador para Kasa (similar estructura)
async function processKasaEquipmentMonitor(data: any, webhook: any, logId: string) {
  console.log('[Kasa] Processing equipment monitor data')
  
  // Implementación similar a Shelly pero con estructura de datos Kasa
  // Por ahora retornamos respuesta simple
  return {
    message: 'Kasa processing not fully implemented yet',
    received_data: data
  }
}

// Procesador genérico
async function processGenericSmartPlug(data: any, webhook: any, logId: string) {
  console.log('[Generic] Processing smart plug data')
  
  // Implementación genérica
  return {
    message: 'Generic processing not fully implemented yet',
    received_data: data
  }
}

// Nuevo procesador genérico para AppointmentDeviceUsage
async function processAppointmentDeviceUsage(data: any, webhook: any, logId: string) {
  console.log('[Generic] Processing AppointmentDeviceUsage data')
  
  // Validar campos requeridos según el schema de Prisma
  const requiredFields = ['appointmentId', 'equipmentId', 'deviceId', 'startedAt', 'estimatedMinutes', 'startedByUserId', 'systemId']
  const missingFields = requiredFields.filter(field => !data[field])
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }

  // Verificar que la cita existe
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId }
  })

  if (!appointment) {
    throw new Error(`Appointment not found: ${data.appointmentId}`)
  }

  // Verificar que el equipo existe
  const equipment = await prisma.equipment.findUnique({
    where: { id: data.equipmentId }
  })

  if (!equipment) {
    throw new Error(`Equipment not found: ${data.equipmentId}`)
  }

  // Verificar que el dispositivo existe
  const device = await prisma.device.findUnique({
    where: { id: data.deviceId }
  })

  if (!device) {
    throw new Error(`Device not found: ${data.deviceId}`)
  }

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: data.startedByUserId }
  })

  if (!user) {
    throw new Error(`User not found: ${data.startedByUserId}`)
  }

  // Preparar deviceData con todos los campos adicionales
  const deviceData = {
    power: data.deviceData?.power,
    voltage: data.deviceData?.voltage,
    current: data.deviceData?.current,
    temperature: data.deviceData?.temperature,
    is_on: data.deviceData?.is_on,
    total_energy: data.deviceData?.total_energy,
    fw_version: data.deviceData?.fw_version,
    mac_address: data.deviceData?.mac_address,
    ip_address: data.deviceData?.ip_address,
    received_at: new Date().toISOString(),
    webhook_slug: webhook.slug,
    original_payload: data
  }

  // Crear el registro AppointmentDeviceUsage
  const appointmentDeviceUsage = await prisma.appointmentDeviceUsage.create({
    data: {
      appointmentId: data.appointmentId,
      appointmentServiceId: data.appointmentServiceId || null,
      equipmentId: data.equipmentId,
      deviceId: data.deviceId,
      startedAt: new Date(data.startedAt),
      endedAt: data.endedAt ? new Date(data.endedAt) : null,
      estimatedMinutes: data.estimatedMinutes,
      actualMinutes: data.actualMinutes || null,
      energyConsumption: data.energyConsumption || null,
      deviceData: deviceData,
      startedByUserId: data.startedByUserId,
      systemId: data.systemId || webhook.systemId
    },
    include: {
      appointment: true,
      equipment: true,
      device: true,
      startedByUser: true
    }
  })

  console.log(`[Generic] AppointmentDeviceUsage created: ${appointmentDeviceUsage.id}`)

  return {
    action: 'appointment_device_usage_created',
    id: appointmentDeviceUsage.id,
    appointmentId: appointmentDeviceUsage.appointmentId,
    equipmentName: appointmentDeviceUsage.equipment.name,
    deviceName: appointmentDeviceUsage.device.name,
    startedAt: appointmentDeviceUsage.startedAt,
    endedAt: appointmentDeviceUsage.endedAt,
    energyConsumption: appointmentDeviceUsage.energyConsumption,
    deviceData: appointmentDeviceUsage.deviceData
  }
}

// Handler GET para webhooks (típico de dispositivos IoT como Shelly)
export async function GET(request: NextRequest, { params }: WebhookRouteParams) {
  const resolvedParams = await params
  const { systemId, slug } = resolvedParams
  
  console.log(`[Webhook GET] Processing ${slug} for system ${systemId}`)
  
  try {
    // 1. Buscar y validar el webhook
    const webhook = await prisma.webhook.findUnique({
      where: {
        systemId_slug: {
          systemId,
          slug
        }
      }
    })

    if (!webhook) {
      console.error(`[Webhook GET] Webhook not found: ${systemId}/${slug}`)
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    if (!webhook.isActive) {
      console.error(`[Webhook GET] Webhook inactive: ${systemId}/${slug}`)
      return NextResponse.json(
        { error: 'Webhook is inactive' },
        { status: 403 }
      )
    }

    // 2. Verificar que GET está permitido
    const allowedMethods = webhook.allowedMethods as string[] || []
    if (!allowedMethods.includes('GET')) {
      return NextResponse.json(
        { error: 'GET method not allowed for this webhook' },
        { status: 405 }
      )
    }

    // 3. Extraer parámetros de la URL
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    
    console.log(`[Webhook GET] Received params:`, JSON.stringify(params, null, 2))

    // Si no hay parámetros, es solo una verificación
    if (Object.keys(params).length === 0) {
      return NextResponse.json({
        message: 'Webhook endpoint active',
        systemId,
        slug,
        methods: allowedMethods,
        timestamp: new Date().toISOString()
      })
    }

    // 4. Log del webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        method: 'GET',
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: params, // Para GET, guardamos los parámetros como body
        sourceIp: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    console.log(`[Webhook GET] Log created: ${webhookLog.id}`)

    // 5. Procesar los datos según el slug
    let result
    if (slug === 'shelly-status' || slug.includes('shelly')) {
      result = await processShellyStatusUpdate(params, webhook, webhookLog.id)
    } else {
      // Procesamiento genérico para GET
      result = await processGenericGetData(params, webhook, webhookLog.id)
    }

    // 6. Actualizar log con resultado exitoso
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        statusCode: 200,
        responseBody: result,
        wasProcessed: true
      }
    })

    console.log(`[Webhook GET] Processing completed successfully`)
    return NextResponse.json({
      success: true,
      message: 'Data received and processed',
      data: result
    })

  } catch (error) {
    console.error(`[Webhook GET] Error processing webhook:`, error)
    
    return NextResponse.json(
      { 
        success: false,
        error: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

// Procesador para datos de estado de Shelly por GET
async function processShellyStatusUpdate(params: any, webhook: any, logId: string) {
  console.log('[Shelly GET] Processing status update')
  
  // Crear un registro simple de datos recibidos
  const processedData = {
    device_id: params.device_id || 'unknown',
    timestamp: params.timestamp || new Date().toISOString(),
    power: parseFloat(params.power) || 0,
    voltage: parseFloat(params.voltage) || 0,
    current: parseFloat(params.current) || 0,
    is_on: params.is_on === 'true' || params.is_on === '1',
    energy: parseFloat(params.energy) || 0,
    temperature: parseFloat(params.temperature) || null,
    method: 'GET',
    raw_params: params
  }

  console.log(`[Shelly GET] Processed data:`, processedData)

  // Por ahora solo registramos los datos
  // En el futuro podríamos mapear a tablas específicas basado en el mapeo configurado
  return {
    action: 'status_received',
    device_id: processedData.device_id,
    power_state: processedData.is_on ? 'ON' : 'OFF',
    power_consumption: processedData.power,
    timestamp: processedData.timestamp,
    processed_data: processedData
  }
}

// Procesador genérico para datos GET
async function processGenericGetData(params: any, webhook: any, logId: string) {
  console.log('[Generic GET] Processing data')
  
  return {
    action: 'data_received',
    parameters_count: Object.keys(params).length,
    received_at: new Date().toISOString(),
    data: params
  }
} 