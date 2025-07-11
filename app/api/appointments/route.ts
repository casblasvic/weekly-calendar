import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';
import { auth } from '@/lib/auth';
import { userHasPermission, PERMISSIONS } from '@/lib/permissions';

// GET /api/appointments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clinicId = searchParams.get('clinicId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const weekParam = searchParams.get('week');
    const dateParam = searchParams.get('date');

    const where: any = {
      systemId: session.user.systemId,
    };

    if (clinicId) {
      where.clinicId = clinicId;
    }

    // ✅ NUEVO: Soporte para parámetro de semana (para cache inteligente)
    if (weekParam) {
      console.log(`[API] 🗓️ Received week param: ${weekParam}`);
      
      // ✅ PARSEAR weekParam format: "Wyyyy-ww" (ej: "W2024-25") 
      const weekMatch = weekParam.match(/W(\d{4})-(\d{1,2})/);
      if (weekMatch) {
        const year = parseInt(weekMatch[1]);
        const weekNumber = parseInt(weekMatch[2]);
        
        console.log(`[API] 🗓️ Parsing week: year=${year}, weekNumber=${weekNumber}`);
        
        // ✅ CALCULAR usando date-fns para consistencia con frontend
        const { startOfWeek: startOfWeekFn, addWeeks, addDays } = require('date-fns');
        
        // Crear fecha del 4 de enero del año (siempre está en semana 1 ISO)
        const jan4 = new Date(year, 0, 4);
        const startOfWeek1 = startOfWeekFn(jan4, { weekStartsOn: 1 }); // Lunes de semana 1
        
        // Calcular semana objetivo
        const targetWeekStart = addWeeks(startOfWeek1, weekNumber - 1);
        const monday = targetWeekStart;
        const sunday = addDays(monday, 6);
        
                 // ✅ TIMEZONE CORREGIDO: Usar timezone local en lugar de Z (UTC)
         const startOfWeekTZ = new Date(`${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}T00:00:00`);
         const endOfWeekTZ = new Date(`${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}T23:59:59.999`);
        
                 console.log(`[API] 🗓️ Week range: ${startOfWeekTZ.toISOString()} to ${endOfWeekTZ.toISOString()}`);
         
         where.startTime = {
           gte: startOfWeekTZ,
           lte: endOfWeekTZ,
         };
      }
    }
    // ✅ NUEVO: Soporte para parámetro de día único (date)
         else if (dateParam) {
       console.log(`[API] 📅 Received date param: ${dateParam}`);
       // ✅ TIMEZONE CORREGIDO: Sin Z para usar timezone local
       const startOfDay = new Date(`${dateParam}T00:00:00`);
       const endOfDay = new Date(`${dateParam}T23:59:59.999`);
      
      console.log(`[API] 📅 Day range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    // ✅ MANTENER: Soporte legacy para startDate/endDate
    else if (startDate && endDate) {
      console.log(`[API] Received dates: startDate=${startDate}, endDate=${endDate}`);
      // ✅ TIMEZONE CORREGIDO: Usar timezone de clínica en lugar de UTC
      // TODO: Obtener timezone de la clínica basado en clinicId
      const clinicTimezone = 'Europe/Madrid'; // Default - debería venir de clínica
      
      // Crear fechas en timezone de clínica
      const startOfDay = new Date(`${startDate}T00:00:00`);
      const endOfDay = new Date(`${endDate}T23:59:59.999`);

      console.log(`[API] Querying between: gte=${startOfDay.toISOString()}, lte=${endOfDay.toISOString()}`);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          }
        },
        professionalUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
          }
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                colorCode: true,
                categoryId: true,
                durationMinutes: true,  // ✅ AÑADIR duración para cálculos
              }
            }
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc',
      }
    });

    // =============================================================
    // 🔄 CARGAR ESTADO FINAL DE USO DE DISPOSITIVO (marco índigo, etc.)
    // =============================================================
    const appointmentIds = appointments.map(a => a.id)

    // Último registro COMPLETED por cita
    const usages = await prisma.appointmentDeviceUsage.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        currentStatus: 'COMPLETED'
      },
      select: {
        appointmentId: true,
        endedReason: true,
        deviceData: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    const usageStatusMap: Record<string, 'completed_ok' | 'over_stopped' | 'over_consuming' | null> = {}
    // Función de ayuda para calcular estado final si no se guardó finalStatus
    const tolerance = 0.5 // minutos, igual a ENERGY_INSIGHT_CFG.timeToleranceMinutes

    for (const u of usages) {
      let status: 'completed_ok' | 'over_stopped' | 'over_consuming' | null = (u.deviceData as any)?.finalStatus || null

      if (!status) {
        // Calcular diff si tenemos estimated y actual
        const estimated = (u as any).estimatedMinutes ?? 0
        const actual = (u as any).actualMinutes ?? 0
        const diff = actual - estimated
        if (Math.abs(diff) <= tolerance) status = 'completed_ok'
        else if (diff > tolerance) status = 'over_stopped'
      }

      if (status) {
        usageStatusMap[u.appointmentId] = status
      }
    }

    // Mapear appointments para incluir services en el formato esperado
    const appointmentsWithServices = appointments.map(apt => ({
      ...apt,
      services: apt.services || [],
      tags: apt.tags?.map(t => t.tagId) || [], // Simplificar las etiquetas a un array de IDs
      usageFinalStatus: usageStatusMap[apt.id] || null
    }));

    return NextResponse.json(appointmentsWithServices);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/appointments
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 [API POST] Datos recibidos:', JSON.stringify(body, null, 2));
    
    const {
      clinicId,
      professionalId,
      personId,
      date,
      startTime,
      endTime,
      services,
      notes,
      tags,
      roomId, // Restaurar roomId
      hasExtension,
      extensionMinutes
    } = body;

    console.log('🔍 [API] Campos extraídos:', {
      clinicId,
      professionalId,
      personId,
      date,
      startTime,
      endTime,
      services: services?.length,
      notes,
      roomId, // Añadir al log
      tags
    });

    // Validaciones básicas
    if (!clinicId || !personId || !date || !startTime || !services || !Array.isArray(services)) {
      console.log('❌ [API] Validación fallida:', {
        clinicId: !clinicId ? 'FALTA' : 'OK',
        professionalId: !professionalId ? 'FALTA' : 'OK', 
        personId: !personId ? 'FALTA' : 'OK',
        date: !date ? 'FALTA' : 'OK',
        startTime: !startTime ? 'FALTA' : 'OK',
        services: !services || !Array.isArray(services) ? 'FALTA O INVÁLIDO' : 'OK'
      });
      
      return NextResponse.json(
        { error: 'Missing required fields: clinicId, personId, date, startTime, services' },
        { status: 400 }
      );
    }

    if (services.length === 0) {
      console.log('❌ [API] Error: Array de servicios está vacío');
      return NextResponse.json(
        { error: 'At least one service must be selected' },
        { status: 400 }
      );
    }

    // Si no hay professionalId, usar el primer profesional del sistema como fallback temporal
    let finalProfessionalId = professionalId;
    if (!professionalId || professionalId.trim() === '') {
      console.log('⚠️ [API] professionalId vacío, buscando profesional por defecto...');
      
      // Por ahora, usar cualquier usuario del sistema como profesional por defecto
      // TODO: Implementar lógica de roles más adelante
      const defaultProfessional = await prisma.user.findFirst({
        where: {
          systemId: session.user.systemId,
        }
      });
      
      if (!defaultProfessional) {
        console.log('❌ [API] No se encontró ningún usuario en el sistema');
        return NextResponse.json(
          { error: 'No professionals found in system' },
          { status: 404 }
        );
      }
      
      finalProfessionalId = defaultProfessional.id;
      console.log('✅ [API] Usando profesional por defecto:', defaultProfessional.id);
    }

    console.log('✅ [API] Professional ID final:', finalProfessionalId);

    // Crear fecha y hora de inicio/fin
    const appointmentStartTime = new Date(`${date}T${startTime}`);
    const appointmentEndTime = endTime ? new Date(`${date}T${endTime}`) : appointmentStartTime;

    // Verificar que la persona existe y pertenece al sistema
    const person = await prisma.person.findFirst({
      where: {
        id: personId,
        systemId: session.user.systemId,
      }
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found or does not belong to your system' },
        { status: 404 }
      );
    }

    // Verificar que los servicios existen
    const existingServices = await prisma.service.findMany({
      where: {
        id: { in: services },
        systemId: session.user.systemId,
      }
    });

    if (existingServices.length !== services.length) {
      return NextResponse.json(
        { error: 'One or more services not found or do not belong to your system' },
        { status: 404 }
      );
    }

    // Calcular la duración estimada sumando las duraciones de todos los servicios
    const estimatedDurationMinutes = existingServices.reduce((total, service) => {
      return total + service.durationMinutes;
    }, 0);

    console.log('📊 [API] Duración estimada calculada:', {
      servicios: existingServices.map(s => ({ nombre: s.name, duracion: s.durationMinutes })),
      duracionTotalEstimada: estimatedDurationMinutes
    });

    // Crear la cita básica primero
    const appointment = await prisma.appointment.create({
      data: {
        systemId: session.user.systemId,
        clinicId,
        professionalUserId: finalProfessionalId,
        personId,
        startTime: appointmentStartTime,
        endTime: appointmentEndTime,
        durationMinutes: Math.ceil((appointmentEndTime.getTime() - appointmentStartTime.getTime()) / (1000 * 60)),
        estimatedDurationMinutes: estimatedDurationMinutes, // Guardar duración estimada
        status: 'SCHEDULED',
        notes: notes || undefined,
        roomId: roomId || undefined, // RESTAURAR: guardar roomId correctamente
      },
    });

    // Crear los servicios de la cita manualmente
    const createdServices = [];
    for (const serviceId of services) {
      try {
        const appointmentService = await prisma.$executeRaw`
          INSERT INTO saasavatar.appointment_services (id, "appointmentId", "serviceId", status, "createdAt", "updatedAt")
          VALUES (${createId()}, ${appointment.id}, ${serviceId}, 'SCHEDULED', NOW(), NOW())
        `;
        createdServices.push({ serviceId, appointmentId: appointment.id });
      } catch (error) {
        console.error('Error creating appointment service:', error);
      }
    }

    await prisma.$disconnect();

    // Crear las relaciones con etiquetas si se proporcionaron
    if (tags && Array.isArray(tags) && tags.length > 0) {
      try {
        // Verificar que las etiquetas existen y pertenecen al sistema
        const existingTags = await prisma.tag.findMany({
          where: {
            id: { in: tags },
            systemId: session.user.systemId,
            isActive: true
          }
        });

        // Crear las relaciones AppointmentTag
        if (existingTags.length > 0) {
          await prisma.appointmentTag.createMany({
            data: existingTags.map(tag => ({
              appointmentId: appointment.id,
              tagId: tag.id
            })),
            skipDuplicates: true
          });
        }
      } catch (error) {
        console.error('Error creating appointment tags:', error);
        // No fallar la creación de la cita si hay error con las etiquetas
      }
    }

    // Crear registro de extensión si corresponde
    if (hasExtension && extensionMinutes > 0) {
      try {
        await prisma.appointmentExtension.create({
          data: {
            appointmentId: appointment.id,
            previousDuration: estimatedDurationMinutes, // La duración teórica de los servicios
            newDuration: appointment.durationMinutes, // La duración real de la cita
            extendedMinutes: extensionMinutes,
            extendedByUserId: session.user.id,
            reason: 'Extensión inicial al crear la cita'
          }
        });
        console.log('✅ [API] Registro de extensión creado:', extensionMinutes, 'minutos');
      } catch (error) {
        console.error('Error creating appointment extension:', error);
        // No fallar la creación de la cita si hay error con la extensión
      }
    }

    console.log('✅ [API] Cita creada exitosamente:', appointment.id);

    // Obtener la cita completa con todas sus relaciones para devolver al frontend
    const completeAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          }
        },
        professionalUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
          }
        },
        // ✅ INCLUIR SERVICIOS IGUAL QUE EN GET
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                colorCode: true,
                categoryId: true,
                durationMinutes: true,
                price: true, // ✅ AÑADIR PRECIO TAMBIÉN
              }
            }
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              }
            }
          }
        }
      }
    });

    // ✅ DEBUG: Verificar datos antes de mapear
    console.log('🔍 [API POST] Services from DB:', JSON.stringify(completeAppointment?.services, null, 2));
    console.log('🔍 [API POST] Tags from DB:', JSON.stringify(completeAppointment?.tags, null, 2));
    console.log('🔍 [API POST] Equipment from DB:', JSON.stringify(completeAppointment?.equipment, null, 2));

    // Asegurar que las fechas se serialicen correctamente y mapear datos igual que GET
    const responseData = {
      ...completeAppointment,
      startTime: completeAppointment?.startTime.toISOString(),
      endTime: completeAppointment?.endTime.toISOString(),
      createdAt: completeAppointment?.createdAt.toISOString(),
      updatedAt: completeAppointment?.updatedAt.toISOString(),
      // ✅ Mapear etiquetas igual que en GET
      tags: completeAppointment?.tags?.map(t => t.tagId) || [],
      // ✅ Los servicios ya vienen incluidos en completeAppointment con todos los datos
    };

    console.log('🔍 [API POST] Final response data services:', JSON.stringify(responseData.services, null, 2));

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const appointmentId = searchParams.get('id');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la cita pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId,
      },
      include: {
        services: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verificar si la cita o alguno de sus servicios están validados
    const hasValidatedServices = appointment.services.some(
      service => service.status === 'VALIDATED' || service.status === 'NO_SHOW'
    );
    
    const isAppointmentValidated = 
      appointment.status === 'COMPLETED' || 
      appointment.status === 'LOCKED' || 
      appointment.status === 'NO_SHOW';

    if (hasValidatedServices || isAppointmentValidated) {
      // Verificar si el usuario tiene permisos para eliminar citas validadas
      const canDeleteValidated = await userHasPermission(
        session.user.id,
        PERMISSIONS.APPOINTMENTS.DELETE_VALIDATED.action,
        PERMISSIONS.APPOINTMENTS.DELETE_VALIDATED.module
      );

      if (!canDeleteValidated) {
        return NextResponse.json(
          { error: 'No tienes permisos para eliminar citas validadas. Contacta con un administrador.' },
          { status: 403 }
        );
      }
    }

    // Eliminar la cita (los servicios se eliminarán en cascada)
    await prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return NextResponse.json(
      { message: 'Appointment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments - Para validar servicios
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, action } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la cita pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId,
      },
      include: {
        services: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Acción: Validar servicios
    if (action === 'validate') {
      const now = new Date();
      
      // Actualizar todos los servicios de la cita como validados
      await prisma.appointmentService.updateMany({
        where: {
          appointmentId: appointmentId,
          status: 'SCHEDULED',
        },
        data: {
          status: 'VALIDATED',
          validatedAt: now,
          validatedByUserId: session.user.id,
        },
      });

      // Actualizar el estado de la cita a COMPLETED
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'COMPLETED',
        },
      });

      return NextResponse.json(
        { message: 'Services validated successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/appointments - Para actualizar citas (mover con drag and drop)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id, 
      startTime, 
      endTime, 
      roomId, 
      clinicId,
      professionalId,
      personId,
      services,
      notes,
      tags,
      date,
      hasExtension,
      extensionMinutes,
      estimatedDurationMinutes
    } = body;

    console.log('🔄 [API PUT] Actualizando cita:', id);

    // Verificar que la cita existe y pertenece al sistema del usuario
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: id,
        systemId: session.user.systemId,
      },
      include: {
        services: true,
        tags: true
      }
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }



    // Verificar si la cita está validada
    const hasValidatedServices = existingAppointment.services.some(
      service => service.status === 'VALIDATED' || service.status === 'NO_SHOW'
    );
    
    const isAppointmentValidated = 
      existingAppointment.status === 'COMPLETED' || 
      existingAppointment.status === 'LOCKED' || 
      existingAppointment.status === 'NO_SHOW';

    if (hasValidatedServices || isAppointmentValidated) {
      // Verificar si el usuario tiene permisos para modificar citas validadas
      const canModifyValidated = await userHasPermission(
        session.user.id,
        PERMISSIONS.APPOINTMENTS.MODIFY_VALIDATED.action,
        PERMISSIONS.APPOINTMENTS.MODIFY_VALIDATED.module
      );

      if (!canModifyValidated) {
        return NextResponse.json(
          { error: 'No tienes permisos para modificar citas validadas.' },
          { status: 403 }
        );
      }
    }

    // Construir las fechas de inicio y fin si se proporcionan
    let appointmentStartTime, appointmentEndTime;
    
    // Si startTime y endTime ya son timestamps completos ISO, usarlos directamente
    if (startTime && endTime) {
      // Verificar si startTime es un timestamp completo ISO o solo tiempo
      if (startTime.includes('T') && startTime.includes('Z')) {
        // startTime es timestamp completo ISO (ej: "2025-06-17T11:33:00.000Z")
        appointmentStartTime = new Date(startTime);
        appointmentEndTime = new Date(endTime);

      } else {
        // startTime es solo tiempo (ej: "11:33:00"), necesita combinarse con date
        appointmentStartTime = new Date(`${date}T${startTime}`);
        appointmentEndTime = new Date(`${date}T${endTime}`);
      }
    }

    // Actualizar la cita con transacción para incluir servicios y etiquetas
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // Calcular nueva duración si se proporcionan tiempos
      let newDurationMinutes: number | undefined;
      if (appointmentStartTime && appointmentEndTime) {
        newDurationMinutes = Math.ceil((appointmentEndTime.getTime() - appointmentStartTime.getTime()) / (1000 * 60));
      }



      // ✅ CORREGIDO: Solo crear extensión para cambios MANUALES de duración
      // NO para cambios naturales por añadir/quitar servicios
      let shouldCreateExtension = false;
      let actualExtendedMinutes = 0;
      let actualPreviousDuration = existingAppointment.durationMinutes;
      let actualNewDuration = newDurationMinutes || existingAppointment.durationMinutes;
      let extensionReason = '';

      // ✅ CASO 1: Extensión explícita desde modal con flag isManualDurationChange
      if (hasExtension && extensionMinutes > 0 && body.isManualDurationChange) {
        shouldCreateExtension = true;
        actualExtendedMinutes = extensionMinutes;
        extensionReason = 'Extensión manual desde el modal de edición';
        
        // Si viene estimatedDurationMinutes del modal, usarlo como duración previa
        if (estimatedDurationMinutes) {
          actualPreviousDuration = estimatedDurationMinutes;
        }
      }
      // ✅ CASO 2: Resize manual desde la agenda (NO desde modal con servicios)
      else if (newDurationMinutes && 
               newDurationMinutes > existingAppointment.durationMinutes && 
               !body.userModifiedServices &&
               !services) { // Si no se están modificando servicios, es resize manual
        shouldCreateExtension = true;
        actualExtendedMinutes = newDurationMinutes - existingAppointment.durationMinutes;
        extensionReason = 'Resize manual desde la agenda';
      }

      // ✅ SOLO crear registro de extensión si es cambio MANUAL
      if (shouldCreateExtension) {
        // Crear registro de extensión
        await tx.appointmentExtension.create({
          data: {
            appointmentId: id,
            previousDuration: actualPreviousDuration,
            newDuration: actualNewDuration,
            extendedMinutes: actualExtendedMinutes,
            extendedByUserId: session.user.id,
            reason: extensionReason
          }
        });
      }

      // Actualizar datos básicos de la cita
      const updated = await tx.appointment.update({
        where: { id: id },
        data: {
          ...(appointmentStartTime && { startTime: appointmentStartTime }),
          ...(appointmentEndTime && { endTime: appointmentEndTime }),
          ...(newDurationMinutes && { 
            durationMinutes: newDurationMinutes
          }),
          ...(roomId !== undefined && { roomId }),
          ...(clinicId && { clinicId }),
          ...(professionalId && { professionalUserId: professionalId }),
          ...(personId && { personId }),
          ...(notes !== undefined && { notes }),
          updatedAt: new Date()
        },
      });

      // ---------------------------------------------------------
      //  SYNC estimatedMinutes en usos activos/pausados
      // ---------------------------------------------------------
      if (newDurationMinutes) {
        await tx.appointmentDeviceUsage.updateMany({
          where: {
            appointmentId: id,
            currentStatus: { in: ['ACTIVE', 'PAUSED'] }
          },
          data: {
            estimatedMinutes: newDurationMinutes
          }
        })
      }

      // Si se proporcionan servicios, actualizar la relación
      if (services && Array.isArray(services)) {
        
        // ✅ LÓGICA ORIGINAL SIMPLE: Eliminar servicios no validados y recrear
        await tx.appointmentService.deleteMany({
          where: {
            appointmentId: id,
            status: 'SCHEDULED' // Solo eliminar servicios no validados
          }
        });

        // Crear nuevos servicios
        if (services.length > 0) {
          await tx.appointmentService.createMany({
            data: services.map((serviceId: string) => ({
              appointmentId: id,
              serviceId: serviceId,
              status: 'SCHEDULED' as const
            }))
          });
          
          // ✅ CRÍTICO: Recalcular estimatedDurationMinutes cuando cambian los servicios
          const servicesFromDb = await tx.service.findMany({
            where: { id: { in: services } }
          });
          
          const newEstimatedDuration = servicesFromDb.reduce((sum, service) => 
            sum + (service.durationMinutes || 0), 0
          );
          
          // Actualizar estimatedDurationMinutes en la cita
          await tx.appointment.update({
            where: { id: id },
            data: {
              estimatedDurationMinutes: newEstimatedDuration
            }
          });
        }
      }

      // Si se proporcionan etiquetas, actualizar la relación
      if (tags !== undefined && Array.isArray(tags)) {
          // Eliminar todas las etiquetas existentes
          await tx.appointmentTag.deleteMany({
            where: { appointmentId: id }
          });

          // Crear nuevas relaciones de etiquetas
          if (tags.length > 0) {
            await tx.appointmentTag.createMany({
              data: tags.map((tagId: string) => ({
                appointmentId: id,
                tagId: tagId
              }))
            });
        }
      }

      return updated;
    });

    // Obtener la cita completa con todas las relaciones
    const completeAppointment = await prisma.appointment.findUnique({
      where: { id: id },
      include: {
        person: true,
        professionalUser: {
          select: {
            id: true,
            email: true,
          }
        },
        clinic: true,
        equipment: true,
        services: {
          include: {
            service: {
              include: {
                category: true
              }
            }
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // ✅ MAPEAR RESPUESTA IGUAL QUE EN GET para consistencia
    const responseData = {
      ...completeAppointment,
      startTime: completeAppointment?.startTime.toISOString(),
      endTime: completeAppointment?.endTime.toISOString(),
      createdAt: completeAppointment?.createdAt.toISOString(),
      updatedAt: completeAppointment?.updatedAt.toISOString(),
      // ✅ CRUCIAL: Mapear etiquetas igual que en GET (array de IDs)
      tags: completeAppointment?.tags?.map(t => t.tagId) || [],
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
