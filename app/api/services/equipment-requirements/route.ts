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
                                    credentialId: true
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

    // 3. Crear lista de dispositivos disponibles (igual que en start endpoint)
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
          let deviceStatus: 'available' | 'occupied' | 'offline' = 'offline'
          
          if (smartPlugDevice) {
            if (smartPlugDevice.online) {
              deviceStatus = smartPlugDevice.relayOn ? 'occupied' : 'available'
            } else {
              deviceStatus = 'offline'
            }
          } else {
            // Sin enchufe inteligente = siempre disponible
            deviceStatus = 'available'
          }

          // 🏷️ CREAR DISPOSITIVO DISPONIBLE
          availableDevices.push({
            id: smartPlugDevice?.id || assignment.id,
            name: assignment.deviceName || `${equipment.name} #${assignment.serialNumber?.slice(-3) || '...'}`,
            deviceId: assignment.deviceId || '',
            online: smartPlugDevice?.online || false,
            relayOn: smartPlugDevice?.relayOn || false,
            currentPower: smartPlugDevice?.currentPower || 0,
            voltage: smartPlugDevice?.voltage || 0,
            temperature: smartPlugDevice?.temperature || 0,
            
            // Info del equipamiento
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            equipmentClinicAssignmentId: assignment.id,
            
            // Info de la asignación
            deviceName: assignment.deviceName,
            cabinName: assignment.cabin?.name,
            serialNumber: assignment.serialNumber,
            
            // Estado inicial
            status: deviceStatus,
            lastSeenAt: new Date(),
            credentialId: smartPlugDevice?.credentialId
          })
        }
      }
    }

    // 4. Verificar qué equipos están siendo usados por ESTA cita específicamente
    const currentAppointmentUsages = await prisma.appointmentDeviceUsage.findMany({
      where: {
        appointmentId: appointmentId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] }
      },
      select: {
        deviceId: true,
        equipmentId: true
      }
    })

    const currentAppointmentDeviceIds = currentAppointmentUsages
      .map(usage => usage.deviceId)
      .filter(Boolean) as string[]



    return NextResponse.json({
      success: true,
      appointmentId,
      clinicId: appointment.clinicId,
      clinicName: appointment.clinic?.name,
      requiredEquipmentIds,
      availableDevices,
      currentAppointmentUsages: currentAppointmentDeviceIds,
      stats: {
        totalDevices: availableDevices.length,
        available: availableDevices.filter(d => d.status === 'available').length,
        occupied: availableDevices.filter(d => d.status === 'occupied').length,
        offline: availableDevices.filter(d => d.status === 'offline').length
      }
    })

  } catch (error) {

    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 