// @ts-nocheck
import { prisma, Prisma } from '@/lib/db';

// 🌐 Función local para obtener URL base del sitio
// Prioridad: NEXTAUTH_URL → VERCEL_URL → localhost fallback
function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 🎯 PRIORIDAD 1: NEXTAUTH_URL (variable principal)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // 🎯 PRIORIDAD 2: VERCEL_URL (para deploys en Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 🎯 FALLBACK: localhost solo si no hay variables de entorno
  console.warn('⚠️ No NEXTAUTH_URL found, using localhost fallback. Set NEXTAUTH_URL for production.');
  return 'http://localhost:3000';
}

export async function seedWebhooks(prisma: PrismaClient, systemId: string) {
  console.log('🔗 Creating example webhooks for smart plug integration...')
  
  try {
    // Verificar que el sistema existe
    const system = await prisma.system.findUnique({
      where: { id: systemId }
    })
    
    if (!system) {
      throw new Error(`System with id ${systemId} not found`)
    }

    // Buscar un usuario para crear los webhooks
    const user = await prisma.user.findFirst({
      where: { systemId }
    })

    if (!user) {
      throw new Error('No users found in system')
    }

    console.log(`Creating webhooks for system: ${system.name}`)

    // 1. Webhook para datos de enchufes inteligentes Shelly
    const shellyData = {
        name: 'Shelly Smart Plug - Device Usage',
        description: 'Recibe datos de uso de equipos desde enchufes inteligentes Shelly',
        slug: 'shelly-device-usage',
        systemId,
        isActive: true,
        direction: 'INCOMING',
        allowedMethods: ['POST'],
        // URL se generará después
        token: `wh_shelly_${Math.random().toString(36).substring(2, 15)}`,
        secretKey: `sk_shelly_${Math.random().toString(36).substring(2, 25)}`,
        rateLimitPerMinute: 120,
        ipWhitelist: [],
        customHeaders: {
          'X-Webhook-Source': 'shelly-cloud',
          'Content-Type': 'application/json'
        },
        triggerEvents: ['device.power_on', 'device.power_off', 'device.energy_report'],
        expectedSchema: {
          type: 'object',
          required: ['device_id', 'event_type', 'timestamp'],
          properties: {
            device_id: { type: 'string' },
            event_type: { type: 'string', enum: ['power_on', 'power_off', 'energy_report'] },
            timestamp: { type: 'string', format: 'date-time' },
            power_consumption: { type: 'number' },
            total_energy: { type: 'number' },
            voltage: { type: 'number' },
            current: { type: 'number' },
            temperature: { type: 'number' },
            device_name: { type: 'string' },
            appointment_id: { type: 'string' },
            service_id: { type: 'string' },
            user_id: { type: 'string' }
          }
        },
        dataMapping: {
          targetTable: 'appointment_device_usage',
          fieldMappings: {
            'appointmentId': { source: 'appointment_id', required: true },
            'deviceId': { source: 'device_id', required: true, lookup: 'devices.deviceIdProvider' },
            'equipmentId': { source: 'device_id', required: true, lookup: 'equipment.deviceId->id' },
            'startedByUserId': { source: 'user_id', required: true },
            'systemId': { value: systemId },
            'startedAt': { 
              source: 'timestamp', 
              condition: 'event_type === "power_on"',
              transform: 'datetime'
            },
            'endedAt': { 
              source: 'timestamp', 
              condition: 'event_type === "power_off"',
              transform: 'datetime'
            },
            'appointmentServiceId': { source: 'service_id', required: false },
            'energyConsumption': { source: 'total_energy', transform: 'float' },
            'estimatedMinutes': { source: 'estimated_duration', default: 30 },
            'actualMinutes': { 
              source: 'duration_minutes', 
              calculate: 'timeDifference(startedAt, endedAt)'
            },
            'deviceData': {
              construct: {
                power_consumption: 'power_consumption',
                voltage: 'voltage',
                current: 'current',
                temperature: 'temperature',
                device_name: 'device_name',
                event_type: 'event_type',
                raw_timestamp: 'timestamp'
              }
            }
          },
          processingRules: {
            filterCondition: 'appointment_id !== null && appointment_id !== ""',
            eventHandling: {
              'power_on': 'CREATE_OR_UPDATE',
              'power_off': 'UPDATE_END_TIME',
              'energy_report': 'UPDATE_ENERGY_DATA'
            },
            validations: [
              'device_exists_in_system',
              'appointment_is_active',
              'user_has_permission'
            ]
          }
        },
        createdByUserId: user.id
    };

    let shellyWebhook = await prisma.webhook.findUnique({ where: { systemId_slug: { systemId, slug: 'shelly-device-usage' } } });
    if (shellyWebhook) {
        shellyWebhook = await prisma.webhook.update({ where: { id: shellyWebhook.id }, data: { ...shellyData, url: `/api/webhooks/${shellyWebhook.id}` } });
    } else {
        shellyWebhook = await prisma.webhook.create({ data: { ...shellyData, url: '' } }); // URL temporal vacía
        shellyWebhook = await prisma.webhook.update({
            where: { id: shellyWebhook.id },
            data: { url: `/api/webhooks/${shellyWebhook.id}` }
        });
    }

    console.log(`✅ Ensured Shelly webhook: ${shellyWebhook.slug}`)

    // 2. Webhook para TP-Link Kasa
    const kasaData = {
        name: 'TP-Link Kasa - Equipment Monitoring',
        description: 'Recibe datos de monitoreo de equipos desde enchufes TP-Link Kasa',
        slug: 'kasa-equipment-monitor',
        systemId,
        isActive: true,
        direction: 'INCOMING',
        allowedMethods: ['POST'],
        token: `wh_kasa_${Math.random().toString(36).substring(2, 15)}`,
        secretKey: `sk_kasa_${Math.random().toString(36).substring(2, 25)}`,
        rateLimitPerMinute: 60,
        ipWhitelist: [],
        customHeaders: { 'X-Webhook-Source': 'kasa-cloud' },
        expectedSchema: {
          type: 'object',
          required: ['device_alias', 'state', 'timestamp'],
          properties: {
            device_alias: { type: 'string' },
            device_id: { type: 'string' },
            state: { type: 'string', enum: ['ON', 'OFF'] },
            timestamp: { type: 'string' },
            power_mw: { type: 'number' },
            energy_wh: { type: 'number' },
            context: {
              type: 'object',
              properties: {
                appointment_id: { type: 'string' },
                service_id: { type: 'string' },
                user_id: { type: 'string' }
              }
            }
          }
        },
        dataMapping: {
          targetTable: 'appointment_device_usage',
          fieldMappings: {
            'appointmentId': { source: 'context.appointment_id', required: true },
            'deviceId': { source: 'device_alias', required: true, lookup: 'devices.name' },
            'equipmentId': { source: 'device_alias', required: true, lookup: 'equipment.device.name->id' },
            'startedByUserId': { source: 'context.user_id', required: true },
            'systemId': { value: systemId },
            'startedAt': { 
              source: 'timestamp', 
              condition: 'state === "ON"',
              transform: 'datetime'
            },
            'endedAt': { 
              source: 'timestamp', 
              condition: 'state === "OFF"',
              transform: 'datetime'
            },
            'appointmentServiceId': { source: 'context.service_id' },
            'energyConsumption': { source: 'energy_wh', transform: 'float' },
            'estimatedMinutes': { default: 30 },
            'deviceData': {
              construct: {
                device_alias: 'device_alias',
                device_id: 'device_id',
                state: 'state',
                power_mw: 'power_mw',
                energy_wh: 'energy_wh'
              }
            }
          }
        },
        createdByUserId: user.id
    };
    let kasaWebhook = await prisma.webhook.findUnique({ where: { systemId_slug: { systemId, slug: 'kasa-equipment-monitor' } } });
    if (kasaWebhook) {
        kasaWebhook = await prisma.webhook.update({ where: { id: kasaWebhook.id }, data: { ...kasaData, url: `/api/webhooks/${kasaWebhook.id}` } });
    } else {
        kasaWebhook = await prisma.webhook.create({ data: { ...kasaData, url: '' } });
        kasaWebhook = await prisma.webhook.update({ where: { id: kasaWebhook.id }, data: { url: `/api/webhooks/${kasaWebhook.id}` } });
    }
    console.log(`✅ Ensured Kasa webhook: ${kasaWebhook.slug}`)

    // 3. Webhook genérico para otros enchufes inteligentes
    const genericData = {
        name: 'Generic Smart Plug Integration',
        description: 'Webhook genérico para cualquier enchufe inteligente compatible',
        slug: 'generic-smart-plug',
        systemId,
        isActive: true,
        direction: 'INCOMING',
        allowedMethods: ['POST', 'PUT'],
        token: `wh_generic_${Math.random().toString(36).substring(2, 15)}`,
        secretKey: `sk_generic_${Math.random().toString(36).substring(2, 25)}`,
        rateLimitPerMinute: 100,
        ipWhitelist: [],
        customHeaders: {},
        expectedSchema: {
          type: 'object',
          required: ['device_id', 'action', 'timestamp', 'appointment_id'],
          properties: {
            device_id: { type: 'string' },
            equipment_id: { type: 'string' },
            action: { type: 'string', enum: ['start', 'stop', 'update'] },
            timestamp: { type: 'string', format: 'date-time' },
            appointment_id: { type: 'string' },
            service_id: { type: 'string' },
            user_id: { type: 'string' },
            energy_data: {
              type: 'object',
              properties: {
                consumption_kwh: { type: 'number' },
                power_w: { type: 'number' },
                voltage_v: { type: 'number' },
                current_a: { type: 'number' }
              }
            },
            estimated_minutes: { type: 'integer' }
          }
        },
        dataMapping: {
          targetTable: 'appointment_device_usage',
          fieldMappings: {
            'appointmentId': { source: 'appointment_id', required: true },
            'deviceId': { source: 'device_id', required: true },
            'equipmentId': { source: 'equipment_id', required: true },
            'startedByUserId': { source: 'user_id', required: true },
            'systemId': { value: systemId },
            'startedAt': { 
              source: 'timestamp', 
              condition: 'action === "start"'
            },
            'endedAt': { 
              source: 'timestamp', 
              condition: 'action === "stop"'
            },
            'appointmentServiceId': { source: 'service_id' },
            'energyConsumption': { source: 'energy_data.consumption_kwh' },
            'estimatedMinutes': { source: 'estimated_minutes', default: 30 },
            'deviceData': {
              construct: {
                action: 'action',
                energy_data: 'energy_data',
                raw_timestamp: 'timestamp'
              }
            }
          }
        },
        createdByUserId: user.id
    };
    let genericWebhook = await prisma.webhook.findUnique({ where: { systemId_slug: { systemId, slug: 'generic-smart-plug' } } });
    if (genericWebhook) {
        genericWebhook = await prisma.webhook.update({ where: { id: genericWebhook.id }, data: { ...genericData, url: `/api/webhooks/${genericWebhook.id}` } });
    } else {
        genericWebhook = await prisma.webhook.create({ data: { ...genericData, url: '' } });
        genericWebhook = await prisma.webhook.update({ where: { id: genericWebhook.id }, data: { url: `/api/webhooks/${genericWebhook.id}` } });
    }
    console.log(`✅ Ensured Generic webhook: ${genericWebhook.slug}`)

    // 4. Webhook bidireccional para control de dispositivos
    const controlData = {
        name: 'Device Control - Bidirectional',
        description: 'Control bidireccional de dispositivos (enviar comandos y recibir estado)',
        slug: 'device-control',
        systemId,
        isActive: true,
        direction: 'BIDIRECTIONAL',
        allowedMethods: ['POST', 'GET'],
        token: `wh_control_${Math.random().toString(36).substring(2, 15)}`,
        secretKey: `sk_control_${Math.random().toString(36).substring(2, 25)}`,
        rateLimitPerMinute: 200,
        triggerEvents: ['appointment.service_started', 'appointment.service_ended'],
        targetUrl: 'https://api.smart-devices.com/control',
        expectedSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', enum: ['turn_on', 'turn_off', 'status_update'] },
            device_id: { type: 'string' },
            appointment_id: { type: 'string' },
            user_id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        createdByUserId: user.id
    };
    let controlWebhook = await prisma.webhook.findUnique({ where: { systemId_slug: { systemId, slug: 'device-control' } } });
    if (controlWebhook) {
        controlWebhook = await prisma.webhook.update({ where: { id: controlWebhook.id }, data: { ...controlData, url: `/api/webhooks/${controlWebhook.id}` } });
    } else {
        controlWebhook = await prisma.webhook.create({ data: { ...controlData, url: '' } });
        controlWebhook = await prisma.webhook.update({ where: { id: controlWebhook.id }, data: { url: `/api/webhooks/${controlWebhook.id}` } });
    }
    console.log(`✅ Ensured Control webhook: ${controlWebhook.slug}`)

    console.log('\n🎯 Webhooks created/updated successfully!')
    const siteUrl = getSiteUrl();
    console.log('\nWebhook URLs para configurar en tus dispositivos:')
    console.log(`📡 Shelly: ${siteUrl}${shellyWebhook.url}`)
    console.log(`📡 Kasa: ${siteUrl}${kasaWebhook.url}`)
    console.log(`📡 Generic: ${siteUrl}${genericWebhook.url}`)
    console.log(`📡 Control: ${siteUrl}${controlWebhook.url}`)

    console.log('\n🔑 Tokens de autenticación:')
    console.log(`🔐 Shelly: ${shellyWebhook.token}`)
    console.log(`🔐 Kasa: ${kasaWebhook.token}`)
    console.log(`🔐 Generic: ${genericWebhook.token}`)
    console.log(`🔐 Control: ${controlWebhook.token}`)

    return {
      shellyWebhook,
      kasaWebhook,
      genericWebhook,
      controlWebhook
    }

  } catch (error) {
    console.error('❌ Error creating webhooks:', error)
    throw error
  }
}

// Función para crear datos de apoyo (equipos, dispositivos, etc.)
export async function createSupportingData(prisma: PrismaClient, systemId: string) {
  console.log('🏗️ Creating supporting data for webhook testing...')

  try {
    // Buscar clínica existente
    const clinic = await prisma.clinic.findFirst({
      where: { systemId }
    })

    if (!clinic) {
      throw new Error('No clinic found for webhook testing')
    }

    // Crear equipos de ejemplo
    const equipment1 = await prisma.equipment.create({
      data: {
        name: 'Máquina Láser CO2',
        description: 'Equipo láser para tratamientos de piel',
        modelNumber: 'LaserPro 3000',
        serialNumber: 'LP3000-001',
        location: 'Sala de Tratamientos 1',
        notes: 'Fabricante: MedTech Solutions',
        isActive: true,
        clinicId: clinic.id,
        systemId
      }
    })

    const equipment2 = await prisma.equipment.create({
      data: {
        name: 'Radiofrecuencia Tripolar',
        description: 'Equipo de radiofrecuencia para tratamientos corporales',
        modelNumber: 'RF-Tripolar 500',
        serialNumber: 'RFT500-002',
        location: 'Sala de Tratamientos 2',
        notes: 'Fabricante: AestheTech',
        isActive: true,
        clinicId: clinic.id,
        systemId
      }
    })

    // Crear dispositivos (enchufes inteligentes) asociados
    const device1 = await prisma.device.create({
      data: {
        name: 'Shelly Plug S - Láser',
        deviceIdProvider: 'shelly_laser_001', // ID que usará el webhook
        deviceType: 'SMART_PLUG',
        apiEndpoint: 'https://shelly-api.cloud/devices/shelly_laser_001',
        lastKnownStatus: 'ONLINE',
        notes: 'Modelo: Shelly Plug S, Serie: SHPLG-S-001, IP: 192.168.1.101, MAC: 5C:CF:7F:12:34:56',
        systemId
      }
    })

    const device2 = await prisma.device.create({
      data: {
        name: 'TP-Link Kasa - RF',
        deviceIdProvider: 'kasa_rf_002',
        deviceType: 'SMART_PLUG',
        apiEndpoint: 'https://kasa-api.tplinkcloud.com/devices/kasa_rf_002',
        lastKnownStatus: 'ONLINE',
        notes: 'Modelo: HS110, Serie: KASA-HS110-002, IP: 192.168.1.102, MAC: 50:C7:BF:98:76:54',
        systemId
      }
    })

    // Asociar los dispositivos con los equipos
    await prisma.equipment.update({
      where: { id: equipment1.id },
      data: { deviceId: device1.id }
    })

    await prisma.equipment.update({
      where: { id: equipment2.id },
      data: { deviceId: device2.id }
    })

    console.log(`✅ Created equipment: ${equipment1.name}, ${equipment2.name}`)
    console.log(`✅ Created devices: ${device1.name}, ${device2.name}`)

    return {
      clinic,
      equipment: [equipment1, equipment2],
      devices: [device1, device2]
    }

  } catch (error) {
    console.error('❌ Error creating supporting data:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const systemId = 'cmccb694h0000y2h3wrrruukn' // ID del sistema real
      
      console.log('🚀 Starting webhook seeding process...')
      
      // Crear datos de apoyo primero
      const supportData = await createSupportingData(systemId)
      
      // Crear webhooks
      const webhooks = await seedWebhooks(systemId)
      
      console.log('\n🎉 Seeding completed successfully!')
      console.log('\n📝 Next steps:')
      console.log('1. Configure your smart plugs with the webhook URLs')
      console.log('2. Test the endpoints with sample data')
      console.log('3. Monitor webhook logs in the admin panel')
      
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  })()
} 