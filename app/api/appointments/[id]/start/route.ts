import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import type { EquipmentAvailability } from '@/types/appointments';

// Schema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de cita inválido." }),
});

// Schema de validación para el cuerpo de la petición (opcional para análisis inicial)
const startRequestSchema = z.object({
  equipmentId: z.string().cuid().optional(),
  skipEquipmentCheck: z.boolean().default(false),
}).optional();

/**
 * POST /api/appointments/[id]/start
 * Analiza equipamiento requerido e inicia la cita
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    // Verificar autenticación
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ 
        error: 'No autenticado o falta systemId' 
      }, { status: 401 });
    }

    // Validar ID de la cita
    const paramsValidation = paramsSchema.safeParse({ id });
    if (!paramsValidation.success) {
      return NextResponse.json({ 
        error: 'ID de cita inválido', 
        details: paramsValidation.error.format() 
      }, { status: 400 });
    }
    const appointmentId = paramsValidation.data.id;

    // Obtener datos del cuerpo (opcional)
    const body = await request.json().catch(() => ({}));
    const requestData = startRequestSchema.safeParse(body).data || {};

    const { systemId, id: userId } = session.user;

    console.log('🚀 [START_APPOINTMENT] Iniciando análisis:', {
      appointmentId,
      userId,
      systemId,
      requestData,
      hasEquipmentAssignmentId: !!body.equipmentClinicAssignmentId,
      withoutEquipment: !!body.withoutEquipment
    });

    // 1. Obtener la cita con todos los servicios y requerimientos de equipos
    console.log('📋 [START_APPOINTMENT] Obteniendo cita con relaciones...');
    
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
                                    online: true,
                                    relayOn: true,
                                    currentPower: true,
                                    voltage: true,
                                    temperature: true,
                                    deviceId: true
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
    });

    if (!appointment) {
      console.error('❌ [START_APPOINTMENT] Cita no encontrada:', { appointmentId, systemId });
      return NextResponse.json({ 
        error: 'Cita no encontrada o no pertenece a tu sistema' 
      }, { status: 404 });
    }

    console.log('✅ [START_APPOINTMENT] Cita encontrada:', {
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      clinicName: appointment.clinic?.name,
      servicesCount: appointment.services.length
    });

    // 🔍 LOG DETALLADO DE SERVICIOS Y EQUIPAMIENTO
    console.log('🔍 [START_APPOINTMENT] Análisis detallado de servicios:');
    appointment.services.forEach((appointmentService, index) => {
      const service = appointmentService.service;
      console.log(`   📝 Servicio ${index + 1}:`, {
        appointmentServiceId: appointmentService.id,
        serviceId: service.id,
        serviceName: service.name,
        hasSettings: !!service.settings,
        settingsId: service.settings?.id
      });

      if (service.settings) {
        const equipmentReqs = service.settings.equipmentRequirements || [];
        console.log(`   🔧 Requerimientos de equipamiento (${equipmentReqs.length}):`, {
          requirementsCount: equipmentReqs.length,
          requirements: equipmentReqs.map(req => ({
            serviceId: req.serviceId,
            equipmentId: req.equipmentId,
            equipmentName: req.equipment?.name,
            equipmentActive: req.equipment?.isActive,
            clinicAssignmentsCount: req.equipment?.clinicAssignments?.length || 0
          }))
        });

        // 🔍 ANÁLISIS DE ASIGNACIONES DE CLÍNICA
        equipmentReqs.forEach((req, reqIndex) => {
          const equipment = req.equipment;
          console.log(`     🏭 Equipamiento ${reqIndex + 1} - ${equipment.name}:`, {
            equipmentId: equipment.id,
            isActive: equipment.isActive,
            totalAssignments: equipment.clinicAssignments.length,
            clinicAssignments: equipment.clinicAssignments.map(assignment => ({
              assignmentId: assignment.id,
              clinicId: assignment.clinicId,
              clinicName: assignment.clinic?.name,
              isActive: assignment.isActive,
              isThisClinic: assignment.clinicId === appointment.clinicId,
              hasSmartPlug: !!assignment.smartPlugDevice,
              smartPlugOnline: assignment.smartPlugDevice?.online,
              deviceId: assignment.deviceId
            }))
          });
        });
      } else {
        console.log('   ⚠️  Sin configuración (settings) para este servicio');
      }
    });

    // 2. Verificar si la cita ya está iniciada
    const existingUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: appointmentId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] }
      }
    });

    if (existingUsage) {
      console.log('❌ [START_APPOINTMENT] Cita ya iniciada:', { usageId: existingUsage.id });
      return NextResponse.json({ 
        error: 'La cita ya está iniciada' 
      }, { status: 400 });
    }

    // 🎯 CASO ESPECIAL: Si se seleccionó un equipamiento específico (desde frontend)
    if (requestData.equipmentId) {
      console.log('🎯 [START_APPOINTMENT] Equipamiento seleccionado desde frontend:', requestData.equipmentId);
      
      // Buscar la asignación de clínica para este equipamiento
      const equipmentAssignment = await prisma.equipmentClinicAssignment.findFirst({
        where: {
          equipmentId: requestData.equipmentId,
          clinicId: appointment.clinicId,
          isActive: true
        },
        include: {
          equipment: true,
          smartPlugDevice: true
        }
      });

      if (!equipmentAssignment) {
        console.error('❌ [START_APPOINTMENT] No se encontró asignación para equipamiento:', {
          equipmentId: requestData.equipmentId,
          clinicId: appointment.clinicId
        });
        return NextResponse.json({ 
          error: 'Equipamiento no disponible en esta clínica' 
        }, { status: 400 });
      }

      console.log('✅ [START_APPOINTMENT] Asignación encontrada:', {
        assignmentId: equipmentAssignment.id,
        equipmentName: equipmentAssignment.equipment.name,
        hasSmartPlug: !!equipmentAssignment.smartPlugDevice
      });

      // Iniciar con la asignación específica encontrada
      const result = await startAppointmentWithSpecificAssignment(
        appointmentId, 
        equipmentAssignment.id, 
        session.user.id, 
        session.user.systemId, 
        appointment
      );
      return NextResponse.json(result);
    }

    // 🎯 CASO ESPECIAL: Si se seleccionó una asignación específica directamente
    if (body.equipmentClinicAssignmentId) {
      console.log('🎯 [START_APPOINTMENT] Iniciando con asignación específica:', body.equipmentClinicAssignmentId);
      const result = await startAppointmentWithSpecificAssignment(
        appointmentId, 
        body.equipmentClinicAssignmentId, 
        session.user.id, 
        session.user.systemId, 
        appointment
      );
      return NextResponse.json(result);
    }

    // 🚀 CASO ESPECIAL: Si se solicita iniciar sin equipamiento
    if (body.withoutEquipment) {
      console.log('🚀 [START_APPOINTMENT] Iniciando explícitamente sin equipamiento');
      const result = await startAppointmentWithoutEquipment(appointmentId, session.user.id, session.user.systemId, appointment);
      return NextResponse.json(result);
    }

    // 3. Analizar requerimientos de equipamiento
    const equipmentRequirements = appointment.services.flatMap(
      svc => svc.service.settings?.equipmentRequirements || []
    );

    console.log('🔧 [START_APPOINTMENT] Equipamiento total requerido:', {
      totalRequirements: equipmentRequirements.length,
      uniqueEquipmentIds: [...new Set(equipmentRequirements.map(req => req.equipmentId))]
    });

    // 4. 🔍 ANÁLISIS DETALLADO: ¿Hay asignaciones disponibles por servicio?
    const availableAssignments: any[] = [];
    let servicesWithRequirements = 0;

    for (const service of appointment.services) {
      const serviceSettings = service.service.settings;
      if (!serviceSettings?.equipmentRequirements || serviceSettings.equipmentRequirements.length === 0) {
        continue;
      }

      servicesWithRequirements++;
      console.log(`🔧 [START_APPOINTMENT] Analizando servicio: ${service.service.name}`);

      for (const req of serviceSettings.equipmentRequirements) {
        const equipment = req.equipment;
        
        // 🏥 FILTRAR: Solo asignaciones de la clínica actual que estén activas
        const clinicAssignments = equipment.clinicAssignments.filter(assignment => 
          assignment.clinicId === appointment.clinicId && assignment.isActive
        );

        console.log(`  📍 Equipo ${equipment.name} - Asignaciones en esta clínica:`, clinicAssignments.length);

        for (const assignment of clinicAssignments) {
          // 🔌 VERIFICAR: Estado del enchufe inteligente si existe
          const smartPlugDevice = assignment.smartPlugDevice;
          let deviceStatus = null;
          
          if (smartPlugDevice) {
            deviceStatus = {
              online: smartPlugDevice.online,
              relayOn: smartPlugDevice.relayOn,
              currentPower: smartPlugDevice.currentPower,
              voltage: smartPlugDevice.voltage,
              temperature: smartPlugDevice.temperature
            };
            console.log(`    🔌 SmartPlug: ${smartPlugDevice.name} - Online: ${smartPlugDevice.online}, RelayOn: ${smartPlugDevice.relayOn}`);
          }

          // 🏷️ CREAR ASIGNACIÓN DISPONIBLE (igual que menú flotante)
          availableAssignments.push({
            id: assignment.id,
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            deviceName: assignment.deviceName || `${equipment.name} #${assignment.serialNumber.slice(-3)}`,
            serialNumber: assignment.serialNumber,
            deviceId: assignment.deviceId,
            clinicId: assignment.clinicId,
            clinicName: assignment.clinic?.name || 'Clínica',
            cabinId: assignment.cabinId,
            cabinName: assignment.cabin?.name,
            serviceId: service.service.id,
            serviceName: service.service.name,
            smartPlugDevice: deviceStatus,
            isAvailable: !smartPlugDevice || !smartPlugDevice.relayOn, // 🚨 NO disponible si está encendido
            status: !smartPlugDevice ? 'no_smart_plug' : 
                   !smartPlugDevice.online ? 'offline' : 
                   smartPlugDevice.relayOn ? 'occupied' : 'available'
          });
        }
      }
    }

    console.log('🎯 [START_APPOINTMENT] Resumen de asignaciones:', {
      servicesWithRequirements,
      totalAssignments: availableAssignments.length,
      availableAssignments: availableAssignments.filter(a => a.isAvailable).length,
      occupiedAssignments: availableAssignments.filter(a => !a.isAvailable).length
    });

    // 5. 🤔 DECIDIR: ¿Requiere selección manual?
    const hasAssignments = availableAssignments.length > 0;
    const hasMultipleOptions = availableAssignments.filter(a => a.isAvailable).length > 1;
    const allOccupied = availableAssignments.length > 0 && availableAssignments.every(a => !a.isAvailable);

    if (!hasAssignments || servicesWithRequirements === 0) {
      // ✅ CASO 1: Sin equipamiento requerido - iniciar directamente
      console.log('✅ [START_APPOINTMENT] Sin equipamiento requerido, iniciando directamente...');
      const result = await startAppointmentWithoutEquipment(appointmentId, session.user.id, session.user.systemId, appointment);
      return NextResponse.json(result);
      
    } else if (allOccupied) {
      // ❌ CASO 2: Todos los equipos ocupados
      console.log('❌ [START_APPOINTMENT] Todos los equipos están ocupados');
      
      // 🔄 TRANSFORMAR availableAssignments a EquipmentAvailability[] para mostrar estado
      const availableEquipment: EquipmentAvailability[] = availableAssignments.map(assignment => ({
        id: assignment.equipmentId,
        name: assignment.deviceName || assignment.equipmentName,
        location: assignment.cabinName,
        status: assignment.status as 'available' | 'occupied' | 'offline',
        currentUsage: assignment.status === 'occupied' ? {
          appointmentId: 'unknown',
          clientName: 'En uso',
          estimatedEndTime: new Date(Date.now() + 60 * 60 * 1000)
        } : undefined,
        hasSmartPlug: !!assignment.smartPlugDevice,
        smartPlugOnline: assignment.smartPlugDevice?.online,
        deviceId: assignment.deviceId
      }));
      
      return NextResponse.json({ 
        error: 'Todos los equipos necesarios están ocupados en este momento',
        availableEquipment: availableEquipment // ✅ Campo correcto para mostrar estado
      }, { status: 409 });
      
    } else if (hasMultipleOptions) {
      // 🎯 CASO 3: Múltiples opciones disponibles - requiere selección
      console.log('🎯 [START_APPOINTMENT] Múltiples opciones disponibles, requiere selección');
      
      // 🔄 TRANSFORMAR availableAssignments a EquipmentAvailability[]
      const availableEquipment: EquipmentAvailability[] = availableAssignments.map(assignment => ({
        id: assignment.equipmentId,
        name: assignment.deviceName || assignment.equipmentName,
        location: assignment.cabinName,
        status: assignment.status as 'available' | 'occupied' | 'offline',
        currentUsage: assignment.status === 'occupied' ? {
          appointmentId: 'unknown',  // TODO: implementar si es necesario
          clientName: 'En uso',
          estimatedEndTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hora por defecto
        } : undefined,
        hasSmartPlug: !!assignment.smartPlugDevice,
        smartPlugOnline: assignment.smartPlugDevice?.online,
        deviceId: assignment.deviceId
      }));
      
      return NextResponse.json({
        requiresEquipmentSelection: true,
        availableEquipment: availableEquipment, // ✅ Campo correcto
        message: 'Selecciona el equipamiento para esta cita'
      });
      
    } else {
      // ✅ CASO 4: Solo una opción disponible - usar automáticamente
      const singleAssignment = availableAssignments.find(a => a.isAvailable);
      console.log('✅ [START_APPOINTMENT] Solo una opción disponible, usando automáticamente:', singleAssignment?.deviceName);
      
      // TODO: Implementar inicio automático con asignación específica
      const result = await startAppointmentWithoutEquipment(appointmentId, session.user.id, session.user.systemId, appointment);
      return NextResponse.json({
        ...result,
        autoSelectedAssignment: singleAssignment
      });
    }

  } catch (error) {
    console.error('💥 [START_APPOINTMENT] Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * Inicia la cita sin equipamiento
 */
async function startAppointmentWithoutEquipment(
  appointmentId: string,
  userId: string,
  systemId: string,
  appointment: any
) {
  console.log('⚡ [START_WITHOUT_EQUIPMENT] Iniciando proceso...');
  
  const now = new Date();
  
  // Calcular duración estimada total usando treatmentDurationMinutes para equipos
  const estimatedMinutes = appointment.services.reduce((total: number, svc: any) => {
    // ✅ USAR treatmentDurationMinutes si está disponible y > 0, sino durationMinutes
    const duration = svc.service.treatmentDurationMinutes > 0 
      ? svc.service.treatmentDurationMinutes 
      : (svc.service.durationMinutes || 0);
    return total + duration;
  }, 0);

  console.log('⏱️ [START_WITHOUT_EQUIPMENT] Duración estimada:', { estimatedMinutes });

  return await prisma.$transaction(async (tx) => {
    // Crear registro de uso sin equipamiento
    const deviceUsage = await tx.appointmentDeviceUsage.create({
      data: {
        appointmentId: appointmentId,
        equipmentId: null,
        deviceId: null,
        startedAt: now,
        estimatedMinutes: estimatedMinutes,
        currentStatus: 'ACTIVE',
        startedByUserId: userId,
        systemId: systemId,
        pauseIntervals: []
      }
    });

    console.log('📝 [START_WITHOUT_EQUIPMENT] Registro creado:', { usageId: deviceUsage.id });

    // Actualizar estado de la cita
    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.IN_PROGRESS
      }
    });

    // Marcar servicios como iniciados
    await tx.appointmentService.updateMany({
      where: {
        appointmentId: appointmentId,
        status: 'SCHEDULED'
      },
      data: {
        status: 'IN_PROGRESS',
        serviceStartedAt: now,
        serviceStartedByUserId: userId
      }
    });

    console.log('✅ [START_WITHOUT_EQUIPMENT] Proceso completado');

    // 🚀 EMISIÓN WEBSOCKET: Notificar inicio de cronómetro en tiempo real
    try {
      const timerData = {
        id: deviceUsage.id,
        appointmentId: deviceUsage.appointmentId,
        startedAt: deviceUsage.startedAt.toISOString(),
        endedAt: null,
        estimatedMinutes: deviceUsage.estimatedMinutes,
        actualMinutes: 0,
        currentStatus: deviceUsage.currentStatus,
        pausedAt: null,
        pauseIntervals: [],
        equipmentId: null,
        deviceId: null
      };

      // Usar función global broadcastDeviceUpdate para emitir evento
      if (global.broadcastDeviceUpdate) {
        global.broadcastDeviceUpdate(systemId, {
          type: 'appointment-timer-update',
          appointmentId: appointmentId,
          timerData: timerData,
          action: 'started'
        });
        console.log('📡 [START_WITHOUT_EQUIPMENT] ✅ WebSocket emitido exitosamente');
      } else {
        console.warn('📡 [START_WITHOUT_EQUIPMENT] ⚠️ global.broadcastDeviceUpdate no disponible');
      }
    } catch (wsError) {
      console.error('📡 [START_WITHOUT_EQUIPMENT] ❌ Error emitiendo WebSocket:', wsError);
      // No fallar la transacción por errores de WebSocket
    }

    return NextResponse.json({
      success: true,
      message: 'Cita iniciada sin equipamiento',
      data: {
        usageId: deviceUsage.id,
        startedAt: deviceUsage.startedAt.toISOString(),
        estimatedMinutes: deviceUsage.estimatedMinutes,
        requiresEquipment: false
      }
    });
  });
}

/**
 * Inicia la cita con equipamiento específico
 */
async function startAppointmentWithEquipment(
  appointmentId: string,
  equipmentId: string,
  userId: string,
  systemId: string,
  appointment: any
) {
  console.log('🔧 [START_WITH_EQUIPMENT] Iniciando proceso:', { equipmentId });
  
  const now = new Date();
  
  return await prisma.$transaction(async (tx) => {
    // Verificar que el equipo esté disponible
    const equipment = await tx.equipment.findFirst({
      where: { id: equipmentId },
      include: {
        clinicAssignments: {
          where: {
            clinicId: appointment.clinicId,
            isActive: true
          },
          include: {
            smartPlugDevice: true
          }
        }
      }
    });

    if (!equipment || equipment.clinicAssignments.length === 0) {
      console.error('❌ [START_WITH_EQUIPMENT] Equipo no disponible:', { equipmentId });
      throw new Error('Equipo no disponible');
    }

    const assignment = equipment.clinicAssignments[0];
    
    console.log('✅ [START_WITH_EQUIPMENT] Equipo verificado:', {
      equipmentName: equipment.name,
      assignmentId: assignment.id,
      hasSmartPlug: !!assignment.smartPlugDevice,
      deviceId: assignment.deviceId
    });
    
    // Calcular duración estimada usando treatmentDurationMinutes para equipos
    const estimatedMinutes = appointment.services.reduce((total: number, svc: any) => {
      // ✅ USAR treatmentDurationMinutes si está disponible y > 0, sino durationMinutes
      const duration = svc.service.treatmentDurationMinutes > 0 
        ? svc.service.treatmentDurationMinutes 
        : (svc.service.durationMinutes || 0);
      return total + duration;
    }, 0);

    // Crear registro de uso con equipamiento
    const deviceUsage = await tx.appointmentDeviceUsage.create({
      data: {
        appointmentId: appointmentId,
        equipmentId: equipmentId,
        equipmentClinicAssignmentId: assignment.id,
        deviceId: assignment.deviceId,
        startedAt: now,
        estimatedMinutes: estimatedMinutes,
        currentStatus: 'ACTIVE',
        startedByUserId: userId,
        systemId: systemId,
        pauseIntervals: []
      }
    });

    console.log('📝 [START_WITH_EQUIPMENT] Registro creado:', { usageId: deviceUsage.id });

    // Actualizar estado de la cita
    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.IN_PROGRESS,
        deviceActivationTimestamp: now,
        equipmentId: equipmentId,
        equipmentClinicAssignmentId: assignment.id
      }
    });

    // Marcar servicios como iniciados
    await tx.appointmentService.updateMany({
      where: {
        appointmentId: appointmentId,
        status: 'SCHEDULED'
      },
      data: {
        status: 'IN_PROGRESS',
        serviceStartedAt: now,
        serviceStartedByUserId: userId
      }
    });

    console.log('✅ [START_WITH_EQUIPMENT] Proceso completado');

    return NextResponse.json({
      success: true,
      message: 'Cita iniciada con equipamiento',
      data: {
        usageId: deviceUsage.id,
        startedAt: deviceUsage.startedAt.toISOString(),
        estimatedMinutes: deviceUsage.estimatedMinutes,
        equipment: {
          id: equipment.id,
          name: equipment.name
        },
        requiresEquipment: true,
        smartPlugDevice: assignment.smartPlugDevice
      }
    });
  });
}

/**
 * Analiza equipos disponibles para la clínica
 */
async function analyzeAvailableEquipment(
  requiredEquipmentIds: string[],
  clinicId: string,
  systemId: string
): Promise<EquipmentAvailability[]> {
  
  console.log('🔍 [ANALYZE_EQUIPMENT] Analizando equipos:', {
    requiredEquipmentIds,
    clinicId,
    systemId
  });
  
  const equipmentAssignments = await prisma.equipmentClinicAssignment.findMany({
    where: {
      equipmentId: { in: requiredEquipmentIds },
      clinicId: clinicId,
      isActive: true
    },
    include: {
      equipment: true,
      smartPlugDevice: true,
      cabin: {
        select: { name: true }
      }
    }
  });

  console.log('📋 [ANALYZE_EQUIPMENT] Asignaciones encontradas:', {
    count: equipmentAssignments.length,
    assignments: equipmentAssignments.map(assignment => ({
      id: assignment.id,
      equipmentId: assignment.equipmentId,
      equipmentName: assignment.equipment.name,
      hasSmartPlug: !!assignment.smartPlugDevice,
      deviceId: assignment.deviceId,
      cabinName: assignment.cabin?.name
    }))
  });

  // Verificar cuáles están ocupados
  const occupiedEquipment = await prisma.appointmentDeviceUsage.findMany({
    where: {
      equipmentId: { in: requiredEquipmentIds },
      currentStatus: { in: ['ACTIVE', 'PAUSED'] }
    },
    include: {
      appointment: {
        include: {
          person: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });

  console.log('⚠️ [ANALYZE_EQUIPMENT] Equipos ocupados:', {
    count: occupiedEquipment.length,
    occupied: occupiedEquipment.map(usage => ({
      equipmentId: usage.equipmentId,
      appointmentId: usage.appointmentId,
      status: usage.currentStatus
    }))
  });

  const occupiedEquipmentIds = new Set(occupiedEquipment.map(usage => usage.equipmentId));

  const result = equipmentAssignments.map(assignment => {
    const isOccupied = occupiedEquipmentIds.has(assignment.equipmentId);
    const occupiedUsage = occupiedEquipment.find(usage => usage.equipmentId === assignment.equipmentId);
    
    const equipmentInfo: EquipmentAvailability = {
      id: assignment.equipmentId,
      name: assignment.equipment.name,
      location: assignment.cabin?.name,
      status: isOccupied ? 'occupied' : (assignment.smartPlugDevice?.online ? 'available' : 'offline'),
      currentUsage: isOccupied && occupiedUsage ? {
        appointmentId: occupiedUsage.appointmentId,
        clientName: `${occupiedUsage.appointment.person.firstName} ${occupiedUsage.appointment.person.lastName}`,
        estimatedEndTime: new Date(occupiedUsage.startedAt.getTime() + (occupiedUsage.estimatedMinutes * 60000))
      } : undefined,
      hasSmartPlug: !!assignment.smartPlugDevice,
      smartPlugOnline: assignment.smartPlugDevice?.online,
      deviceId: assignment.deviceId
    };

    console.log(`📊 [ANALYZE_EQUIPMENT] Resultado para ${assignment.equipment.name}:`, equipmentInfo);
    
    return equipmentInfo;
  });

  console.log('✅ [ANALYZE_EQUIPMENT] Análisis completado:', {
    totalProcessed: result.length,
    available: result.filter(eq => eq.status === 'available').length,
    occupied: result.filter(eq => eq.status === 'occupied').length,
    offline: result.filter(eq => eq.status === 'offline').length
  });

  return result;
}

/**
 * Inicia la cita con una asignación específica de equipamiento
 */
async function startAppointmentWithSpecificAssignment(
  appointmentId: string,
  equipmentClinicAssignmentId: string,
  userId: string,
  systemId: string,
  appointment: any
) {
  console.log('🎯 [START_WITH_ASSIGNMENT] Iniciando proceso:', { equipmentClinicAssignmentId });
  
  const now = new Date();
  
  return await prisma.$transaction(async (tx) => {
    // Verificar que la asignación existe y está activa
    const assignment = await tx.equipmentClinicAssignment.findFirst({
      where: { 
        id: equipmentClinicAssignmentId,
        clinicId: appointment.clinicId,
        isActive: true
      },
      include: {
        equipment: true,
        smartPlugDevice: true,
        clinic: true,
        cabin: true
      }
    });

    if (!assignment) {
      console.error('❌ [START_WITH_ASSIGNMENT] Asignación no encontrada:', { equipmentClinicAssignmentId });
      throw new Error('Asignación de equipamiento no encontrada');
    }

    console.log('✅ [START_WITH_ASSIGNMENT] Asignación verificada:', {
      assignmentId: assignment.id,
      equipmentName: assignment.equipment.name,
      deviceName: assignment.deviceName,
      hasSmartPlug: !!assignment.smartPlugDevice,
      deviceId: assignment.deviceId
    });
    
    // Calcular duración estimada usando treatmentDurationMinutes para equipos
    const estimatedMinutes = appointment.services.reduce((total: number, svc: any) => {
      // ✅ USAR treatmentDurationMinutes si está disponible y > 0, sino durationMinutes
      const duration = svc.service.treatmentDurationMinutes > 0 
        ? svc.service.treatmentDurationMinutes 
        : (svc.service.durationMinutes || 0);
      return total + duration;
    }, 0);

    // Crear registro de uso con la asignación específica
    const deviceUsage = await tx.appointmentDeviceUsage.create({
      data: {
        appointmentId: appointmentId,
        equipmentId: assignment.equipmentId,
        equipmentClinicAssignmentId: assignment.id,
        deviceId: assignment.deviceId,
        startedAt: now,
        estimatedMinutes: estimatedMinutes,
        currentStatus: 'ACTIVE',
        startedByUserId: userId,
        systemId: systemId,
        pauseIntervals: []
      }
    });

    console.log('📝 [START_WITH_ASSIGNMENT] Registro creado:', { usageId: deviceUsage.id });

    // Actualizar estado de la cita
    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.IN_PROGRESS,
        deviceActivationTimestamp: now,
        equipmentId: assignment.equipmentId,
        equipmentClinicAssignmentId: assignment.id
      }
    });

    // Marcar servicios como iniciados
    await tx.appointmentService.updateMany({
      where: {
        appointmentId: appointmentId,
        status: 'SCHEDULED'
      },
      data: {
        status: 'IN_PROGRESS',
        serviceStartedAt: now,
        serviceStartedByUserId: userId
      }
    });

    console.log('✅ [START_WITH_ASSIGNMENT] Proceso completado');

    // 🚀 EMISIÓN WEBSOCKET: Notificar inicio con equipamiento
    try {
      const timerData = {
        id: deviceUsage.id,
        appointmentId: deviceUsage.appointmentId,
        startedAt: deviceUsage.startedAt.toISOString(),
        endedAt: null,
        estimatedMinutes: deviceUsage.estimatedMinutes,
        actualMinutes: 0,
        currentStatus: deviceUsage.currentStatus,
        pausedAt: null,
        pauseIntervals: [],
        equipmentId: assignment.equipmentId,
        equipmentClinicAssignmentId: assignment.id,
        deviceId: assignment.deviceId
      };

      if (global.broadcastDeviceUpdate) {
        global.broadcastDeviceUpdate(systemId, {
          type: 'appointment-timer-update',
          appointmentId: appointmentId,
          timerData: timerData,
          action: 'started',
          equipmentUsed: true,
          assignmentDetails: {
            equipmentName: assignment.equipment.name,
            deviceName: assignment.deviceName,
            clinicName: assignment.clinic.name,
            cabinName: assignment.cabin?.name
          }
        });
        console.log('📡 [START_WITH_ASSIGNMENT] ✅ WebSocket emitido exitosamente');
      } else {
        console.warn('📡 [START_WITH_ASSIGNMENT] ⚠️ global.broadcastDeviceUpdate no disponible');
      }
    } catch (wsError) {
      console.error('📡 [START_WITH_ASSIGNMENT] ❌ Error emitiendo WebSocket:', wsError);
    }

    return {
      success: true,
      message: 'Cita iniciada con equipamiento específico',
      data: {
        usageId: deviceUsage.id,
        startedAt: deviceUsage.startedAt.toISOString(),
        estimatedMinutes: deviceUsage.estimatedMinutes,
        requiresEquipment: true,
        equipmentUsed: {
          id: assignment.equipment.id,
          name: assignment.equipment.name,
          assignmentId: assignment.id,
          deviceName: assignment.deviceName,
          deviceId: assignment.deviceId
        },
        smartPlugDevice: assignment.smartPlugDevice
      }
    };
  });
} 