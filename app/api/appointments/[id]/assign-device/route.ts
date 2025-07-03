import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { shellyWebSocketManager } from '@/lib/shelly/websocket-manager'

// Schema de validación
const assignDeviceSchema = z.object({
  equipmentClinicAssignmentId: z.string().cuid(),
  deviceId: z.string(),
  turnOnDevice: z.boolean().default(true)
})

const paramsSchema = z.object({
  id: z.string().cuid()
})

/**
 * POST /api/appointments/[id]/assign-device
 * Asigna un dispositivo a una cita específica
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    console.log('🚀 [ASSIGN_DEVICE] Inicio del endpoint:', { appointmentId: id })
    
    // Verificar autenticación
    const session = await getServerAuthSession()
    if (!session?.user?.id || !session.user.systemId) {
      console.log('❌ [ASSIGN_DEVICE] Error de autenticación')
      return NextResponse.json({ 
        error: 'No autenticado o falta systemId' 
      }, { status: 401 })
    }
    
    console.log('✅ [ASSIGN_DEVICE] Usuario autenticado:', { userId: session.user.id, systemId: session.user.systemId })

    // Validar parámetros
    const paramsValidation = paramsSchema.safeParse({ id })
    if (!paramsValidation.success) {
      return NextResponse.json({ 
        error: 'ID de cita inválido' 
      }, { status: 400 })
    }
    const appointmentId = paramsValidation.data.id

    // Validar body
    const body = await request.json()
    console.log('📦 [ASSIGN_DEVICE] Body recibido:', body)
    
    const bodyValidation = assignDeviceSchema.safeParse(body)
    if (!bodyValidation.success) {
      console.log('❌ [ASSIGN_DEVICE] Error validando body:', bodyValidation.error.format())
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: bodyValidation.error.format()
      }, { status: 400 })
    }

    const { equipmentClinicAssignmentId, deviceId, turnOnDevice } = bodyValidation.data
    const { systemId } = session.user
    
    console.log('✅ [ASSIGN_DEVICE] Datos validados:', { 
      equipmentClinicAssignmentId, 
      deviceId, 
      turnOnDevice, 
      systemId 
    })

    // 🔍 VERIFICAR que la cita existe y pertenece al usuario (OPTIMIZADA)
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: systemId
      },
      select: {
        id: true,
        clinicId: true,
        status: true,
        services: {
          select: {
            serviceId: true,
            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                treatmentDurationMinutes: true,
                settings: {
                  select: {
                    equipmentRequirements: {
                      select: {
                        equipmentId: true,
                        equipment: {
                          select: {
                            id: true,
                            name: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } as any) // TODO: Regenerar tipos de Prisma después de migrar el schema

    if (!appointment) {
      return NextResponse.json({ 
        error: 'Cita no encontrada' 
      }, { status: 404 })
    }

    // 🔍 VERIFICAR que la asignación existe y está disponible (OPTIMIZADA)
    console.log('🔍 [ASSIGN_DEVICE] Buscando asignación:', {
      equipmentClinicAssignmentId,
      clinicId: appointment.clinicId
    })
    
    const assignment = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        id: equipmentClinicAssignmentId,
        clinicId: appointment.clinicId,
        isActive: true
      },
      select: {
        id: true,
        equipmentId: true,
        deviceId: true,
        isActive: true,
        equipment: {
          select: {
            id: true,
            name: true,
            powerThreshold: true
          }
        },
        smartPlugDevice: {
          select: {
            id: true,
            deviceId: true,
            name: true,
            online: true,
            relayOn: true
          }
        }
      }
    })

    if (!assignment) {
      console.log('❌ [ASSIGN_DEVICE] Asignación no encontrada')
      return NextResponse.json({ 
        error: 'Asignación de equipamiento no encontrada o no activa',
        debug: {
          equipmentClinicAssignmentId,
          expectedClinicId: appointment.clinicId
        }
      }, { status: 404 })
    }
    
    console.log('✅ [ASSIGN_DEVICE] Asignación encontrada:', {
      assignmentId: assignment.id,
      equipmentName: assignment.equipment?.name,
      smartPlugDeviceId: assignment.smartPlugDevice?.id
    })

    // 🔍 VERIFICAR que no hay ya un uso activo para esta cita
    const existingUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: appointmentId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        endedAt: null
      }
    })

    if (existingUsage) {
      return NextResponse.json({ 
        error: 'Esta cita ya tiene un dispositivo asignado activo' 
      }, { status: 409 })
    }

    // 🔍 VERIFICAR que el dispositivo no está ocupado por otra cita
    const deviceInUse = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        OR: [
          { deviceId: deviceId },
          { equipmentClinicAssignmentId: equipmentClinicAssignmentId }
        ],
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        endedAt: null,
        appointmentId: { not: appointmentId }
      }
    })

    if (deviceInUse) {
      return NextResponse.json({ 
        error: 'Este dispositivo ya está siendo usado por otra cita' 
      }, { status: 409 })
    }

    // 🎯 CALCULAR appointmentServiceId (array de servicios que usan este equipo)
    const servicesUsingEquipment = (appointment as any).services.filter((appointmentService: any) => {
      const equipmentReqs = appointmentService.service.settings?.equipmentRequirements || []
      return equipmentReqs.some(req => req.equipmentId === assignment.equipmentId)
    })

    const serviceIds = servicesUsingEquipment.map(svc => svc.serviceId)
    
    // 🎯 CALCULAR estimatedMinutes (suma de duraciones de servicios que usan este equipo)
    // Usar treatmentDurationMinutes si está disponible y > 0, sino appointmentDurationMinutes
    const estimatedMinutes = servicesUsingEquipment.reduce((total, appointmentService) => {
      const service = appointmentService.service as any; // TODO: Actualizar tipos
      const duration = service.treatmentDurationMinutes > 0 
        ? service.treatmentDurationMinutes 
        : (service.durationMinutes || 0);
      return total + duration;
    }, 0)

    // 🔍 LOG DETALLADO: Verificar cálculo de duración
    console.log('🧮 [ASSIGN_DEVICE] Cálculo de duración estimada:', {
      totalServicesInAppointment: (appointment as any).services.length,
      allServices: (appointment as any).services.map((svc: any) => ({
        serviceId: svc.serviceId,
        serviceName: svc.service.name,
        durationMinutes: svc.service.durationMinutes,
        hasEquipmentReqs: !!(svc.service.settings?.equipmentRequirements?.length),
        equipmentReqs: svc.service.settings?.equipmentRequirements?.map(req => ({
          equipmentId: req.equipmentId,
          equipmentName: req.equipment?.name
        })) || []
      })),
      targetEquipmentId: assignment.equipmentId,
      targetEquipmentName: assignment.equipment?.name,
      servicesUsingThisEquipment: servicesUsingEquipment.map(svc => ({
        serviceId: svc.serviceId,
        serviceName: svc.service.name,
        durationMinutes: svc.service.durationMinutes
      })),
      calculatedEstimatedMinutes: estimatedMinutes
    })

    // 🚨 VALIDACIÓN: Verificar que al menos un servicio usa este equipo
    if (servicesUsingEquipment.length === 0) {
      console.log('❌ [ASSIGN_DEVICE] No se encontraron servicios que usen este equipo:', {
        equipmentId: assignment.equipmentId,
        equipmentName: assignment.equipment?.name,
        availableServices: (appointment as any).services.map((svc: any) => svc.service.name)
      })
      return NextResponse.json({ 
        error: 'Ningún servicio de esta cita requiere este equipamiento',
        debug: {
          equipmentId: assignment.equipmentId,
          equipmentName: assignment.equipment?.name,
          servicesInAppointment: (appointment as any).services.length
        }
      }, { status: 400 })
    }

    // 🚨 VALIDACIÓN: Verificar que la duración calculada es válida
    if (estimatedMinutes <= 0) {
      console.log('❌ [ASSIGN_DEVICE] Duración estimada inválida:', {
        estimatedMinutes,
        servicesDetails: servicesUsingEquipment.map(svc => ({
          serviceName: svc.service.name,
          durationMinutes: svc.service.durationMinutes
        }))
      })
      return NextResponse.json({ 
        error: 'Los servicios que usan este equipo no tienen duración definida',
        debug: {
          estimatedMinutes,
          servicesCount: servicesUsingEquipment.length
        }
      }, { status: 400 })
    }

    const now = new Date()
    
    console.log('🎯 [ASSIGN_DEVICE] Iniciando transacción...', {
      appointmentId,
      serviceIds,
      estimatedMinutes,
      equipmentClinicAssignmentId,
      deviceId
    })

    // 🚀 TRANSACCIÓN: Crear registro y opcionalmente encender dispositivo (timeout aumentado)
    return await prisma.$transaction(async (tx) => {
      console.log('💾 [ASSIGN_DEVICE] Dentro de la transacción - creando registro...')
      
      // 🔄 FINALIZAR EQUIPOS PREVIOS ACTIVOS EN ESTA CITA
      const activeDeviceUsages = await tx.appointmentDeviceUsage.findMany({
        where: {
          appointmentId: appointmentId,
          currentStatus: { in: ['ACTIVE', 'PAUSED'] },
          endedAt: null,
          id: { not: undefined } // Asegurar que existan registros
        },
        include: {
          equipmentClinicAssignment: {
            include: {
              equipment: true
            }
          }
        }
      })
      
      if (activeDeviceUsages.length > 0) {
        console.log('🔄 [ASSIGN_DEVICE] Finalizando equipos previos activos:', {
          count: activeDeviceUsages.length,
          equipments: activeDeviceUsages.map(usage => ({
            usageId: usage.id,
            equipmentName: usage.equipmentClinicAssignment?.equipment?.name || 'Sin nombre'
          }))
        })
        
        // Finalizar todos los usos activos previos
        for (const usage of activeDeviceUsages) {
          await tx.appointmentDeviceUsage.update({
            where: { id: usage.id },
            data: {
              endedAt: now,
              currentStatus: 'COMPLETED',
              // Calcular actualMinutes si no está definido
              actualMinutes: usage.actualMinutes || Math.round(
                (now.getTime() - usage.startedAt.getTime()) / (1000 * 60)
              )
            }
          })
          
          console.log('✅ [ASSIGN_DEVICE] Equipo previo finalizado:', {
            usageId: usage.id,
            equipmentName: usage.equipmentClinicAssignment?.equipment?.name,
            startedAt: usage.startedAt,
            endedAt: now,
            actualMinutes: usage.actualMinutes || Math.round(
              (now.getTime() - usage.startedAt.getTime()) / (1000 * 60)
            )
          })
        }
      } else {
        console.log('ℹ️ [ASSIGN_DEVICE] No hay equipos previos activos para finalizar')
      }
      
      // 1. Crear registro de uso de dispositivo
      const deviceUsage = await tx.appointmentDeviceUsage.create({
        data: {
          appointmentId: appointmentId,
          appointmentServiceId: JSON.stringify(serviceIds), // Array serializado de servicios
          equipmentId: assignment.equipmentId,
          equipmentClinicAssignmentId: equipmentClinicAssignmentId,
          deviceId: deviceId,
          startedAt: now,
          estimatedMinutes: estimatedMinutes,
          currentStatus: 'ACTIVE',
          startedByUserId: session.user.id,
          systemId: systemId,
          pauseIntervals: [],
          deviceData: {
            assignedAt: now.toISOString(),
            servicesUsingEquipment: serviceIds,
            servicesDetails: servicesUsingEquipment.map(svc => ({
              serviceId: svc.serviceId,
              serviceName: svc.service.name,
              durationMinutes: svc.service.durationMinutes,
              serviceStartedAt: now.toISOString()
            })),
            totalEstimatedMinutes: estimatedMinutes,
            powerThreshold: assignment.equipment.powerThreshold,
            initialAssignment: true
          }
        }
              })
        
        console.log('✅ [ASSIGN_DEVICE] Registro AppointmentDeviceUsage creado:', { 
          usageId: deviceUsage.id,
          appointmentId: deviceUsage.appointmentId,
          deviceId: deviceUsage.deviceId,
          estimatedMinutes: deviceUsage.estimatedMinutes,
          servicesAffected: serviceIds,
          servicesDetails: servicesUsingEquipment.map(svc => ({
            serviceName: svc.service.name,
            durationMinutes: svc.service.durationMinutes
          })),
          calculatedTotal: estimatedMinutes,
          deviceDataStored: JSON.stringify(deviceUsage.deviceData, null, 2)
        })

        // 2. Actualizar estado de la cita
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'IN_PROGRESS',
          deviceActivationTimestamp: now,
          equipmentId: assignment.equipmentId,
          equipmentClinicAssignmentId: equipmentClinicAssignmentId
        }
      })

      // 3. Marcar servicios como iniciados
      await tx.appointmentService.updateMany({
        where: {
          appointmentId: appointmentId,
          serviceId: { in: serviceIds },
          status: 'SCHEDULED'
        },
        data: {
          status: 'IN_PROGRESS',
          serviceStartedAt: now,
          serviceStartedByUserId: session.user.id
        }
      })

      // 🚀 EMISIÓN WEBSOCKET: Notificar asignación de dispositivo
      try {
        if (global.broadcastDeviceUpdate) {
          global.broadcastDeviceUpdate(systemId, {
            type: 'device-assigned',
            appointmentId: appointmentId,
            deviceId: deviceId,
            equipmentClinicAssignmentId: equipmentClinicAssignmentId,
            usageId: deviceUsage.id,
            servicesAffected: serviceIds,
            deviceTurnedOn: false // Se actualizará después
          })
        }
      } catch (wsError) {
        console.error('Error emitiendo WebSocket:', wsError)
      }

      console.log('🎉 [ASSIGN_DEVICE] Transacción completada exitosamente!')
      
      // ⚡ RETORNAR RESPUESTA INMEDIATAMENTE
      return NextResponse.json({
        success: true,
        message: 'Dispositivo asignado correctamente',
        data: {
          usageId: deviceUsage.id,
          assignedAt: deviceUsage.startedAt.toISOString(),
          estimatedMinutes: deviceUsage.estimatedMinutes,
          servicesAffected: serviceIds,
          servicesDetails: servicesUsingEquipment.map(svc => ({
            serviceId: svc.serviceId,
            serviceName: svc.service.name,
            durationMinutes: svc.service.durationMinutes
          })),
          calculationSummary: {
            totalServices: servicesUsingEquipment.length,
            individualDurations: servicesUsingEquipment.map(svc => svc.service.durationMinutes),
            calculatedTotal: estimatedMinutes
          },
          equipment: {
            id: assignment.equipment.id,
            name: assignment.equipment.name,
            powerThreshold: assignment.equipment.powerThreshold
          },
          deviceControlPending: !!(assignment.smartPlugDevice && turnOnDevice)
        }
      })
    }, {
      timeout: 8000 // ✅ REDUCIR TIMEOUT: 8 segundos es suficiente
    })
    
    // 🔌 CONTROL DE DISPOSITIVO ASÍNCRONO - Después de la transacción
    if (assignment.smartPlugDevice && turnOnDevice) {
      // Ejecutar en el siguiente tick para no bloquear la respuesta
      process.nextTick(async () => {
        try {
          console.log('🔌 [ASSIGN_DEVICE] Control asíncrono del dispositivo usando WebSocket Manager...')
          
          // ✅ BUSCAR EL DISPOSITIVO COMPLETO PARA OBTENER CREDENTIAL ID
          const fullDevice = await prisma.smartPlugDevice.findUnique({
            where: { id: assignment.smartPlugDevice.id },
            include: { credential: true }
          })
          
          if (!fullDevice?.credential) {
            throw new Error('Credencial del dispositivo no encontrada')
          }
          
          // ✅ USAR DIRECTAMENTE EL WEBSOCKET MANAGER (ya maneja reconexiones automáticas)
          await shellyWebSocketManager.controlDevice(
            fullDevice.credential.id,
            deviceId, 
            'on'
          )
          
          console.log('✅ [ASSIGN_DEVICE] Control de dispositivo completado exitosamente')
          
          // Emitir WebSocket con actualización de estado
          if (global.broadcastDeviceUpdate) {
            global.broadcastDeviceUpdate(systemId, {
              type: 'device-control-completed',
              appointmentId: appointmentId,
              deviceId: deviceId,
              equipmentClinicAssignmentId: equipmentClinicAssignmentId,
              deviceTurnedOn: true
            })
          }
          
        } catch (error) {
          console.error('❌ [ASSIGN_DEVICE] Error en control de dispositivo:', error instanceof Error ? error.message : error)
          
          // Emitir WebSocket con error
          if (global.broadcastDeviceUpdate) {
            global.broadcastDeviceUpdate(systemId, {
              type: 'device-control-failed',
              appointmentId: appointmentId,
              deviceId: deviceId,
              equipmentClinicAssignmentId: equipmentClinicAssignmentId,
              deviceTurnedOn: false,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      })
    }

  } catch (error) {
    console.error('💥 [ASSIGN_DEVICE] Error capturado:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      appointmentId: id
    })
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 