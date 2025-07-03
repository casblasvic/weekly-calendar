import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateActualMinutes, completePauseInterval } from '@/utils/appointment-timer-utils';
import { AppointmentStatus } from '@prisma/client';
import type { PauseIntervals, AppointmentTimerData } from '@/types/appointments';

// Schema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de cita inválido." }),
});

// Schema de validación para el cuerpo de la petición
const finishRequestSchema = z.object({
  reason: z.string().optional(),
  forceFinish: z.boolean().default(false), // Para casos de emergencia
});

/**
 * POST /api/appointments/[id]/finish
 * Finaliza una cita activa o pausada
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

    // Obtener y validar datos del cuerpo
    const body = await request.json().catch(() => ({}));
    const bodyValidation = finishRequestSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos', 
        details: bodyValidation.error.format() 
      }, { status: 400 });
    }

    const { reason, forceFinish } = bodyValidation.data;
    const { systemId } = session.user;

    // Buscar el registro de uso activo o pausado
    const activeUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: appointmentId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        systemId: systemId
      },
      include: {
        equipmentClinicAssignment: {
          include: {
            smartPlugDevice: true
          }
        }
      }
    });

    if (!activeUsage) {
      return NextResponse.json({ 
        error: 'No hay una cita activa para finalizar' 
      }, { status: 404 });
    }

    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      // Si estaba pausado, completar el último intervalo de pausa
      let updatedIntervals = (activeUsage.pauseIntervals as unknown as PauseIntervals) || [];
      if (activeUsage.currentStatus === 'PAUSED') {
        updatedIntervals = completePauseInterval(updatedIntervals);
      }

      // Calcular tiempo real utilizado
      const timerData: AppointmentTimerData = {
        id: activeUsage.id,
        appointmentId: activeUsage.appointmentId,
        startedAt: activeUsage.startedAt,
        endedAt: now,
        estimatedMinutes: activeUsage.estimatedMinutes,
        currentStatus: 'COMPLETED' as any,
        pauseIntervals: updatedIntervals,
        equipmentId: activeUsage.equipmentId || undefined,
        deviceId: activeUsage.deviceId || undefined
      };

      const actualMinutes = calculateActualMinutes(timerData);

      // Actualizar registro de uso como completado
      const updatedUsage = await tx.appointmentDeviceUsage.update({
        where: { id: activeUsage.id },
        data: {
          currentStatus: 'COMPLETED',
          endedAt: now,
          pausedAt: null,
          actualMinutes: actualMinutes,
          pauseIntervals: updatedIntervals as any,
          updatedAt: now
        }
      });

      // Actualizar estado de la cita
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
          deviceDeactivationTimestamp: now,
          actualUsageMinutes: Math.round(actualMinutes)
        }
      });

          // Marcar servicios como validados (completados)
    await tx.appointmentService.updateMany({
      where: {
        appointmentId: appointmentId,
        status: 'IN_PROGRESS'
      },
      data: {
        status: 'VALIDATED'
      }
    });

      // TODO: Si hay dispositivo conectado, apagar via WebSocket
      // if (activeUsage.equipmentClinicAssignment?.smartPlugDevice && activeUsage.equipmentClinicAssignment.smartPlugDevice.online) {
      //   await shellyWebSocketManager.toggleDevice(
      //     activeUsage.equipmentClinicAssignment.smartPlugDevice.credentialId,
      //     activeUsage.equipmentClinicAssignment.smartPlugDevice.deviceId,
      //     false
      //   );
      // }

      // 🚀 EMISIÓN WEBSOCKET: Notificar finalización de cronómetro en tiempo real
      try {
        const finalTimerData = {
          id: updatedUsage.id,
          appointmentId: updatedUsage.appointmentId,
          startedAt: activeUsage.startedAt.toISOString(),
          endedAt: updatedUsage.endedAt?.toISOString() || null,
          estimatedMinutes: activeUsage.estimatedMinutes,
          actualMinutes: actualMinutes,
          currentStatus: updatedUsage.currentStatus,
          pausedAt: null,
          pauseIntervals: updatedIntervals,
          equipmentId: activeUsage.equipmentId || null,
          deviceId: activeUsage.deviceId || null
        };

        // Usar función global broadcastDeviceUpdate para emitir evento
        if (global.broadcastDeviceUpdate) {
          global.broadcastDeviceUpdate(systemId, {
            type: 'appointment-timer-update',
            appointmentId: appointmentId,
            timerData: finalTimerData,
            action: 'finished'
          });
          console.log('📡 [FINISH_APPOINTMENT] ✅ WebSocket emitido exitosamente');
        } else {
          console.warn('📡 [FINISH_APPOINTMENT] ⚠️ global.broadcastDeviceUpdate no disponible');
        }
      } catch (wsError) {
        console.error('📡 [FINISH_APPOINTMENT] ❌ Error emitiendo WebSocket:', wsError);
        // No fallar la transacción por errores de WebSocket
      }

      return NextResponse.json({
        success: true,
        message: reason ? `Cita finalizada: ${reason}` : 'Cita finalizada correctamente',
        data: {
          usageId: updatedUsage.id,
          finishedAt: updatedUsage.endedAt?.toISOString(),
          actualMinutes: actualMinutes,
          estimatedMinutes: activeUsage.estimatedMinutes,
          efficiency: ((actualMinutes / activeUsage.estimatedMinutes) * 100).toFixed(1),
          pauseIntervals: updatedIntervals,
          totalPauses: updatedIntervals.length
        }
      });
    });

  } catch (error) {
    console.error('[FINISH_APPOINTMENT] Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
} 