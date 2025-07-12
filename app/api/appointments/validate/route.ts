import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AppointmentServiceStatus, AppointmentStatus, TicketStatus, CashSessionStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

// Esquema de validación para la petición
const validateAppointmentSchema = z.object({
  appointmentId: z.string().cuid(),
  servicesToValidate: z.array(z.object({
    serviceId: z.string(),
    status: z.enum(['VALIDATED', 'NO_SHOW'])
  })),
  clinicId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const systemId = session.user.systemId;
    const userId = session.user.id;
    const body = await request.json();

    const validation = validateAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Invalid request data', 
        errors: validation.error.flatten() 
      }, { status: 400 });
    }

    const { appointmentId, servicesToValidate, clinicId } = validation.data;

    // Usar transacción para asegurar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la cita con sus servicios y persona
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          services: {
            include: {
              service: true
            }
          },
          person: true,
        }
      });

      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      if (appointment.systemId !== systemId) {
        throw new Error('No autorizado para validar esta cita');
      }

      // 2. Actualizar estado de los servicios seleccionados
      const validatedServices = [];
      const notShowServices = [];
      
      for (const serviceToValidate of servicesToValidate) {
        const appointmentService = appointment.services.find(
          s => s.serviceId === serviceToValidate.serviceId
        );
        
        if (!appointmentService) {
          throw new Error(`Servicio ${serviceToValidate.serviceId} no encontrado en la cita`);
        }

        // Actualizar estado del servicio
        await tx.appointmentService.update({
          where: { id: appointmentService.id },
          data: {
            status: serviceToValidate.status as AppointmentServiceStatus,
            validatedAt: new Date(),
            validatedByUserId: userId,
          }
        });

        if (serviceToValidate.status === 'VALIDATED') {
          validatedServices.push(appointmentService);
        } else {
          notShowServices.push(appointmentService);
        }
      }

      // 3. Si hay servicios validados, gestionar ticket
      let ticket = null;
      if (validatedServices.length > 0) {
        // Buscar ticket abierto del día para la persona
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        ticket = await tx.ticket.findFirst({
          where: {
            personId: appointment.personId,
            clinicId: clinicId,
            systemId: systemId,
            status: TicketStatus.OPEN,
            issueDate: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        });

        // Si no hay ticket, crear uno nuevo
        if (!ticket) {
          // Verificar si hay una caja abierta
          let cashSession = await tx.cashSession.findFirst({
            where: {
              clinicId: clinicId,
              status: CashSessionStatus.OPEN,
              userId: userId,
            },
            orderBy: {
              openingTime: 'desc'
            }
          });

          // Si no hay caja abierta, crear una
          if (!cashSession) {
            cashSession = await tx.cashSession.create({
              data: {
                userId: userId,
                clinicId: clinicId,
                systemId: systemId,
                status: CashSessionStatus.OPEN,
                openingBalanceCash: 0,
                sessionNumber: `CS${Date.now()}`, // Generar número de sesión único
              }
            });
          }

          // Crear el ticket
          ticket = await tx.ticket.create({
            data: {
              systemId: systemId,
              clinicId: clinicId,
              personId: appointment.personId,
              cashierUserId: userId,
              sellerUserId: userId,
              status: TicketStatus.OPEN,
              currencyCode: 'EUR',
              totalAmount: 0,
              taxAmount: 0,
              finalAmount: 0,
              paidAmount: 0,
              pendingAmount: 0,
              appointmentId: appointmentId,
              cashSessionId: cashSession.id,
            }
          });
        }

        // Añadir servicios validados como items del ticket
        let totalAmount = 0;
        
        for (const validatedService of validatedServices) {
          if (!validatedService.service) continue;

          // Obtener precio del servicio según tarifa
          const tariff = await tx.tariff.findFirst({
            where: {
              systemId: systemId,
              isDefault: true,
            },
            include: {
              servicePrices: {
                where: {
                  serviceId: validatedService.serviceId
                }
              },
              vatType: true
            }
          });

          const servicePrice = tariff?.servicePrices[0]?.price || 0;
          const vatRate = tariff?.vatType?.rate || 0;
          const vatAmount = servicePrice * (vatRate / 100);
          const finalPrice = servicePrice + vatAmount;

          // Crear item del ticket
          await tx.ticketItem.create({
            data: {
              ticketId: ticket.id,
              systemId: systemId, // 🏢 NUEVO: Añadir systemId
              clinicId: clinicId, // 🏥 NUEVO: Añadir clinicId
              serviceId: validatedService.serviceId,
              description: validatedService.service.name,
              quantity: 1,
              unitPrice: servicePrice,
              vatAmount: vatAmount,
              finalPrice: finalPrice,
              vatRateId: tariff?.vatTypeId,
              itemType: 'SERVICE',
              isValidationGenerated: true,
              professionalUserId: appointment.professionalUserId,
            }
          });

          totalAmount += finalPrice;
        }

        // Actualizar totales del ticket
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            totalAmount: { increment: totalAmount },
            finalAmount: { increment: totalAmount },
            pendingAmount: { increment: totalAmount },
          }
        });
      }

      // 4. Determinar estado de la cita
      const allServices = await tx.appointmentService.findMany({
        where: { appointmentId: appointmentId }
      });

      const validatedCount = allServices.filter(s => s.status === 'VALIDATED').length;
      const noShowCount = allServices.filter(s => s.status === 'NO_SHOW').length;
      const totalCount = allServices.length;

      let appointmentStatus: AppointmentStatus;
      
      if (validatedCount === totalCount) {
        // Todos los servicios validados
        appointmentStatus = AppointmentStatus.COMPLETED;
      } else if (validatedCount === 0 && noShowCount === totalCount) {
        // Ningún servicio realizado
        appointmentStatus = AppointmentStatus.NO_SHOW;
      } else if (validatedCount > 0) {
        // Parcialmente validada (algunos servicios realizados)
        appointmentStatus = AppointmentStatus.LOCKED;
      } else {
        // Mantener estado actual
        appointmentStatus = appointment.status;
      }

      // Actualizar estado de la cita
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: appointmentStatus,
        },
        include: {
          services: {
            include: {
              service: true
            }
          },
          person: true,
        }
      });

      return {
        appointment: updatedAppointment,
        ticket: ticket,
        validatedCount,
        noShowCount,
        totalCount
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Validación completada: ${result.validatedCount} servicios validados, ${result.noShowCount} no realizados`
    });

  } catch (error) {
    console.error('Error validating appointment:', error);
    return NextResponse.json({
      message: error instanceof Error ? error.message : 'Error al validar la cita',
    }, { status: 500 });
  }
}

// PATCH para actualizar servicios no realizados después de validación
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const systemId = session.user.systemId;
    const userId = session.user.id;
    const body = await request.json();

    const { appointmentId, serviceId, newStatus } = body;

    if (!appointmentId || !serviceId || !newStatus) {
      return NextResponse.json({ 
        message: 'Faltan datos requeridos' 
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verificar que la cita esté validada/bloqueada
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          services: {
            where: { serviceId: serviceId }
          }
        }
      });

      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      if (appointment.systemId !== systemId) {
        throw new Error('No autorizado');
      }

      const appointmentService = appointment.services[0];
      if (!appointmentService) {
        throw new Error('Servicio no encontrado en la cita');
      }

      // Solo permitir cambiar de NO_SHOW a VALIDATED
      if (appointmentService.status !== 'NO_SHOW' || newStatus !== 'VALIDATED') {
        throw new Error('Cambio de estado no permitido');
      }

      // Actualizar estado del servicio
      await tx.appointmentService.update({
        where: { id: appointmentService.id },
        data: {
          status: newStatus as AppointmentServiceStatus,
          validatedAt: new Date(),
          validatedByUserId: userId,
        }
      });

      // TODO: Añadir el servicio al ticket correspondiente

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating appointment service:', error);
    return NextResponse.json({
      message: error instanceof Error ? error.message : 'Error al actualizar servicio',
    }, { status: 500 });
  }
}
