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

    const where: any = {
      systemId: session.user.systemId,
    };

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (startDate && endDate) {
      console.log(`[API] Received dates: startDate=${startDate}, endDate=${endDate}`);
      // For daily view, startDate and endDate are the same 'YYYY-MM-DD' string.
      // new Date('YYYY-MM-DD') creates a date at midnight UTC.
      const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${endDate}T23:59:59.999Z`);

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

    // Mapear appointments para incluir services en el formato esperado
    const appointmentsWithServices = appointments.map(apt => ({
      ...apt,
      services: apt.services || [],
      tags: apt.tags?.map(t => t.tagId) || [] // Simplificar las etiquetas a un array de IDs
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
        person: true,
        professionalUser: true,
        clinic: true,
        equipment: true, // Cambiar room por equipment
      }
    });

    // Obtener los servicios asociados a la cita
    const appointmentServices = await prisma.$queryRaw`
      SELECT 
        s.id,
        s.name,
        s.price,
        s."durationMinutes"
      FROM saasavatar.appointment_services as_join
      JOIN saasavatar.services s ON as_join."serviceId" = s.id
      WHERE as_join."appointmentId" = ${appointment.id}
    `;

    // Asegurar que las fechas se serialicen correctamente
    const responseData = {
      ...completeAppointment,
      startTime: completeAppointment?.startTime.toISOString(),
      endTime: completeAppointment?.endTime.toISOString(),
      createdAt: completeAppointment?.createdAt.toISOString(),
      updatedAt: completeAppointment?.updatedAt.toISOString(),
      // Agregar los servicios en el formato esperado por el frontend
      services: (appointmentServices as any[]).map(s => ({
        service: {
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.durationMinutes
        }
      }))
    };

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
    console.log('📋 [API PUT] Datos recibidos:', {
      personId,
      professionalId,
      services: services?.length,
      tags: tags?.length,
      roomId,
      startTime,
      endTime,
      date
    });

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

    console.log('📅 [API PUT] Cita existente:', {
      id: existingAppointment.id,
      startTime: existingAppointment.startTime.toISOString(),
      endTime: existingAppointment.endTime.toISOString(),
      roomId: existingAppointment.roomId
    });

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
        console.log('🕐 [API PUT] Usando timestamps ISO directamente:', {
          startTime: appointmentStartTime.toISOString(),
          endTime: appointmentEndTime.toISOString()
        });
      } else {
        // startTime es solo tiempo (ej: "11:33:00"), necesita combinarse con date
        appointmentStartTime = new Date(`${date}T${startTime}`);
        appointmentEndTime = new Date(`${date}T${endTime}`);
        console.log('🕐 [API PUT] Construyendo timestamps desde date+time:', {
          date,
          startTime: appointmentStartTime.toISOString(),
          endTime: appointmentEndTime.toISOString()
        });
      }
    }

    // Actualizar la cita con transacción para incluir servicios y etiquetas
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // Calcular nueva duración si se proporcionan tiempos
      let newDurationMinutes: number | undefined;
      if (appointmentStartTime && appointmentEndTime) {
        newDurationMinutes = Math.ceil((appointmentEndTime.getTime() - appointmentStartTime.getTime()) / (1000 * 60));
      }

      console.log('📊 [API PUT] Valores a actualizar:', {
        startTime: appointmentStartTime?.toISOString(),
        endTime: appointmentEndTime?.toISOString(),
        durationMinutes: newDurationMinutes,
        roomId,
        clinicId
      });

      // Si hay cambio en la duración, verificar si es una extensión
      // O si explícitamente se indica que hay extensión desde el modal
      if ((newDurationMinutes && newDurationMinutes > existingAppointment.durationMinutes) || 
          (hasExtension && extensionMinutes > 0)) {
        
        // Calcular minutos extendidos
        let actualExtendedMinutes = extensionMinutes;
        let actualPreviousDuration = existingAppointment.durationMinutes;
        let actualNewDuration = newDurationMinutes || existingAppointment.durationMinutes;
        let extensionReason = 'Resize manual desde la agenda';
        
        // Si viene del modal con datos explícitos, usar esos
        if (hasExtension && extensionMinutes > 0) {
          actualExtendedMinutes = extensionMinutes;
          extensionReason = 'Extensión desde el modal de edición';
          
          // Si viene estimatedDurationMinutes del modal, usarlo como duración previa
          if (estimatedDurationMinutes) {
            actualPreviousDuration = estimatedDurationMinutes;
          }
        } else {
          // Calculado por resize
          actualExtendedMinutes = newDurationMinutes - existingAppointment.durationMinutes;
        }
        
        console.log('📈 [API PUT] Detectada extensión de cita:', {
          citaId: id,
          duracionAnterior: actualPreviousDuration,
          duracionNueva: actualNewDuration,
          minutosExtendidos: actualExtendedMinutes,
          origen: extensionReason
        });

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

        console.log('✅ [API PUT] Registro de extensión creado');
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

      console.log('✅ [API PUT] Cita actualizada en BD:', {
        id: updated.id,
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
        roomId: updated.roomId,
        updatedAt: updated.updatedAt.toISOString()
      });

      // Si se proporcionan servicios, actualizar la relación
      if (services && Array.isArray(services)) {
        console.log('🔧 [API PUT] Actualizando servicios:', services);
        
        // Eliminar servicios existentes que no estén validados
        await tx.appointmentService.deleteMany({
          where: {
            appointmentId: id,
            status: 'SCHEDULED' // Solo eliminar servicios no validados
          }
        });

        // Crear nuevos servicios
        if (services.length > 0) {
          console.log('➕ [API PUT] Creando nuevos servicios para cita:', id);
          await tx.appointmentService.createMany({
            data: services.map((serviceId: string) => ({
              appointmentId: id,
              serviceId: serviceId,
              status: 'SCHEDULED'
            }))
          });
        }
      }

      // Si se proporcionan etiquetas, actualizar la relación
      if (tags !== undefined && Array.isArray(tags)) {
        console.log('🏷️ [API PUT] Actualizando etiquetas:', tags);
        
        try {
          // Eliminar todas las etiquetas existentes
          await tx.appointmentTag.deleteMany({
            where: { appointmentId: id }
          });

          // Crear nuevas relaciones de etiquetas
          if (tags.length > 0) {
            console.log('➕ [API PUT] Creando nuevas etiquetas para cita:', id);
            console.log('📝 [API PUT] Datos de etiquetas a crear:', tags.map((tagId: string) => ({
              appointmentId: id,
              tagId: tagId
            })));
            
            await tx.appointmentTag.createMany({
              data: tags.map((tagId: string) => ({
                appointmentId: id,
                tagId: tagId
              }))
            });
          }
        } catch (tagError) {
          console.error('❌ [API PUT] Error al actualizar etiquetas:', tagError);
          throw tagError;
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

    return NextResponse.json(completeAppointment, { status: 200 });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
