import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/services/equipment-requirements?appointmentId={id}
 * 
 * Devuelve los equipos requeridos para los servicios de una cita específica,
 * incluyendo el estado actual de los enchufes inteligentes asociados.
 * 
 * Reutiliza la misma lógica del backend de inicio de cita pero solo para obtener datos.
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerAuthSession()
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ 
        error: 'No autenticado o falta systemId' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json({ 
        error: 'appointmentId es requerido' 
      }, { status: 400 })
    }

    const { systemId } = session.user



    // 1. Obtener la cita con todos los servicios y requerimientos de equipos
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: systemId,
      },
      include: {
        services: {
          include: {
        service: {
              include: {
                settings: {
                  include: {
                    equipmentRequirements: {
                      include: {
                        equipment: {
                          include: {
                            clinicAssignments: {
                              include: {
                                clinic: {
                                  select: { id: true, name: true }
                                },
                                cabin: {
                                  select: { id: true, name: true }
                                },
                                smartPlugDevice: {
                                  select: {
                                    id: true,
                                    name: true,
                                    deviceId: true,
                                    online: true,
                                    relayOn: true,
                                    currentPower: true,
                                    voltage: true,
                                    temperature: true,
                                    credentialId: true,
                                    autoShutdownEnabled: true // ✅ AGREGAR autoShutdownEnabled
                                  }
                                }
                              },
                              where: {
                                isActive: true
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
        },
        clinic: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!appointment) {

      return NextResponse.json({ 
        error: 'Cita no encontrada o no pertenece a tu sistema' 
      }, { status: 404 })
    }

    // 2. Analizar requerimientos de equipamiento igual que en el start endpoint
    const equipmentRequirements = appointment.services.flatMap(
      svc => svc.service.settings?.equipmentRequirements || []
    )

    // 3. ✅ CONSULTAR USOS ACTIVOS Y COMPLETADOS - Para esta cita Y otras citas (ANTES del bucle)
    const [currentAppointmentUsages, currentAppointmentCompletedUsages, otherAppointmentUsages] = await Promise.all([
      // Usos ACTIVOS de ESTA cita específica
      prisma.appointmentDeviceUsage.findMany({
        where: {
          appointmentId: appointmentId,
          currentStatus: { in: ['ACTIVE', 'PAUSED'] },
          endedAt: null
        },
        select: {
          deviceId: true,
          equipmentId: true,
          equipmentClinicAssignmentId: true
        }
      }),
      
      // 🆕 Usos COMPLETADOS de ESTA cita específica (para bloqueo por tiempo)
      prisma.appointmentDeviceUsage.findMany({
        where: {
          appointmentId: appointmentId,
          currentStatus: 'COMPLETED',
          endedAt: { not: null }
        },
        select: {
          deviceId: true,
          equipmentId: true,
          equipmentClinicAssignmentId: true,
          endedReason: true,
          usageOutcome: true
        }
      }),
      
      // Usos de OTRAS citas (para detectar ocupados)
      prisma.appointmentDeviceUsage.findMany({
        where: {
          appointmentId: { not: appointmentId },
          currentStatus: { in: ['ACTIVE', 'PAUSED'] },
          endedAt: null,
          systemId: systemId
        },
        select: {
          deviceId: true,
          equipmentId: true,
          equipmentClinicAssignmentId: true,
          appointmentId: true
        }
      })
    ])

    // Crear maps para lookups rápidos
    const thisAppointmentDeviceIds = new Set(
      currentAppointmentUsages.map(usage => usage.deviceId).filter(Boolean)
    )
    const thisAppointmentAssignmentIds = new Set(
      currentAppointmentUsages.map(usage => usage.equipmentClinicAssignmentId).filter(Boolean)
    )
    
    // 🆕 NUEVO: Sets para dispositivos completados de esta cita (para bloqueo)
    const completedBlockedDeviceIds = new Set(
      currentAppointmentCompletedUsages.map(usage => usage.deviceId).filter(Boolean)
    )
    const completedBlockedAssignmentIds = new Set(
      currentAppointmentCompletedUsages.map(usage => usage.equipmentClinicAssignmentId).filter(Boolean)
    )
    
    // 🔍 DEBUG: Log de registros completados
    console.log('🔍 [COMPLETED_USAGES_DEBUG]:', {
      appointmentId,
      completedUsages: currentAppointmentCompletedUsages.length,
      completedDeviceIds: Array.from(completedBlockedDeviceIds),
      completedAssignmentIds: Array.from(completedBlockedAssignmentIds)
    });
    
    const otherAppointmentDeviceIds = new Set(
      otherAppointmentUsages.map(usage => usage.deviceId).filter(Boolean)
    )
    const otherAppointmentAssignmentIds = new Set(
      otherAppointmentUsages.map(usage => usage.equipmentClinicAssignmentId).filter(Boolean)
    )

    // 4. Crear lista de dispositivos disponibles (igual que en start endpoint)
    const availableDevices: any[] = []
    const requiredEquipmentIds = [...new Set(equipmentRequirements.map(req => req.equipmentId))]

    for (const service of appointment.services) {
      const serviceSettings = service.service.settings
      if (!serviceSettings?.equipmentRequirements || serviceSettings.equipmentRequirements.length === 0) {
        continue
      }

      for (const req of serviceSettings.equipmentRequirements) {
        const equipment = req.equipment
        
        // 🏥 FILTRAR: Solo asignaciones de la clínica actual que estén activas
        const clinicAssignments = equipment.clinicAssignments.filter(assignment => 
          assignment.clinicId === appointment.clinicId && assignment.isActive
        )

        for (const assignment of clinicAssignments) {
          // 🔌 VERIFICAR: Estado del enchufe inteligente si existe
          const smartPlugDevice = assignment.smartPlugDevice
          let deviceStatus: 'available' | 'occupied' | 'offline' | 'in_use_this_appointment' | 'completed' = 'offline'
          
          // ✅ LÓGICA CORRECTA DE STATUS basada en appointment_device_usage
          const assignmentId = assignment.id
          const deviceId = smartPlugDevice?.deviceId || assignment.deviceId
          
          // 🔍 DEBUG: Log de comparación para este dispositivo
          console.log('🔍 [DEVICE_STATUS_CHECK]:', {
            assignmentId,
            deviceId,
            smartPlugDeviceId: smartPlugDevice?.deviceId,
            isCompletedByAssignment: completedBlockedAssignmentIds.has(assignmentId),
            isCompletedByDevice: deviceId && completedBlockedDeviceIds.has(deviceId),
            completedDeviceIds: Array.from(completedBlockedDeviceIds),
            completedAssignmentIds: Array.from(completedBlockedAssignmentIds)
          });
          
          if (smartPlugDevice && !smartPlugDevice.online) {
            // Dispositivo offline
            deviceStatus = 'offline'
          } else if (completedBlockedAssignmentIds.has(assignmentId) || (deviceId && completedBlockedDeviceIds.has(deviceId))) {
            // 🔒 COMPLETADO POR ESTA CITA - BLOQUEADO
            console.log('🔒 [BLOCKING_DEVICE]:', { assignmentId, deviceId, reason: 'completed' });
            deviceStatus = 'completed'
          } else if (thisAppointmentAssignmentIds.has(assignmentId) || (deviceId && thisAppointmentDeviceIds.has(deviceId))) {
            // ✅ EN USO POR ESTA CITA
            deviceStatus = 'in_use_this_appointment'
          } else if (otherAppointmentAssignmentIds.has(assignmentId) || (deviceId && otherAppointmentDeviceIds.has(deviceId))) {
            // ⚠️ OCUPADO POR OTRA CITA
            deviceStatus = 'occupied'
          } else {
            // ✅ DISPONIBLE
            deviceStatus = 'available'
          }

          // 🏷️ CREAR DISPOSITIVO DISPONIBLE
          availableDevices.push({
            id: smartPlugDevice?.id || assignment.id,
            name: assignment.deviceName || `${equipment.name} #${assignment.serialNumber?.slice(-3) || '...'}`,
            deviceId: smartPlugDevice?.deviceId || assignment.deviceId || '', // ✅ CORREGIDO: Usar deviceId de Shelly
            online: smartPlugDevice?.online || false,
            relayOn: smartPlugDevice?.relayOn || false,
            currentPower: smartPlugDevice?.currentPower || 0,
            voltage: smartPlugDevice?.voltage || 0,
            temperature: smartPlugDevice?.temperature || 0,
            
            // Info del equipamiento
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            equipmentClinicAssignmentId: assignment.id,
            powerThreshold: equipment.powerThreshold,
            
            // Info de la asignación
            deviceName: assignment.deviceName,
            cabinName: assignment.cabin?.name,
            serialNumber: assignment.serialNumber,
            
            // Estado inicial
            status: deviceStatus,
            lastSeenAt: new Date(),
            credentialId: smartPlugDevice?.credentialId,
            autoShutdownEnabled: smartPlugDevice?.autoShutdownEnabled ?? true // ✅ AGREGAR autoShutdownEnabled con default true
          })
        }
      }
    }





    return NextResponse.json({
      success: true,
      appointmentId,
      clinicId: appointment.clinicId,
      clinicName: appointment.clinic?.name,
      requiredEquipmentIds,
      availableDevices,
      currentAppointmentUsages: Array.from(thisAppointmentDeviceIds),
      stats: {
        totalDevices: availableDevices.length,
        available: availableDevices.filter(d => d.status === 'available').length,
        occupied: availableDevices.filter(d => d.status === 'occupied').length,
        offline: availableDevices.filter(d => d.status === 'offline').length,
        inUseThisAppointment: availableDevices.filter(d => d.status === 'in_use_this_appointment').length
      }
    })

  } catch (error) {

    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 