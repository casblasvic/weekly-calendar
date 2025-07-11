import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de cita inválido." }),
});

/**
 * GET /api/appointments/[id]/timer
 * Obtiene el estado actual del cronómetro de una cita
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { systemId } = session.user;

    // Buscar el registro de uso activo, pausado o completado más reciente
    const timerData = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: appointmentId,
        systemId: systemId
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true
          }
        },
        device: {
          select: {
            id: true,
            name: true
          }
        },
        appointment: {
          select: {
            id: true,
            status: true,
            person: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            services: {
              select: {
                service: {
                  select: {
                    name: true,
                    durationMinutes: true,
                    treatmentDurationMinutes: true // ✅ INCLUIR treatmentDurationMinutes
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!timerData) {
      return NextResponse.json({ 
        error: 'No se encontró cronómetro para esta cita' 
      }, { status: 404 });
    }

    // Calcular duración estimada total usando treatmentDurationMinutes para equipos
    const estimatedMinutes = timerData.appointment.services.reduce(
      (total, service) => {
        // ✅ USAR treatmentDurationMinutes si está disponible y > 0, sino durationMinutes
        const duration = service.service.treatmentDurationMinutes > 0 
          ? service.service.treatmentDurationMinutes 
          : (service.service.durationMinutes || 0);
        return total + duration;
      }, 0
    ) || timerData.estimatedMinutes;

    // Formatear respuesta
    const response = {
      id: timerData.id,
      appointmentId: timerData.appointmentId,
      startedAt: timerData.startedAt.toISOString(),
      endedAt: timerData.endedAt?.toISOString() || null,
      estimatedMinutes: estimatedMinutes,
      actualMinutes: timerData.actualMinutes,
      currentStatus: timerData.currentStatus,
      pausedAt: timerData.pausedAt?.toISOString() || null,
      pauseIntervals: timerData.pauseIntervals || [],
      
      // Información del equipamiento (si aplica)
      equipmentId: timerData.equipmentId,
      deviceId: timerData.deviceId,
      equipment: timerData.equipment ? {
        id: timerData.equipment.id,
        name: timerData.equipment.name
      } : null,
      device: timerData.device ? {
        id: timerData.device.id,
        name: timerData.device.name
      } : null,
      
      // Información de la cita
      appointment: {
        id: timerData.appointment.id,
        status: timerData.appointment.status,
        clientName: `${timerData.appointment.person.firstName} ${timerData.appointment.person.lastName}`,
        services: timerData.appointment.services.map(service => ({
          name: service.service.name,
          durationMinutes: service.service.durationMinutes
        }))
      },
      
      // Metadatos
      startedByUserId: timerData.startedByUserId,
      createdAt: timerData.createdAt.toISOString(),
      updatedAt: timerData.updatedAt.toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[GET_APPOINTMENT_TIMER] Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
} 