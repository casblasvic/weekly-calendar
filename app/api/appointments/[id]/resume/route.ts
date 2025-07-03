import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { completePauseInterval } from '@/utils/appointment-timer-utils';
import type { PauseIntervals } from '@/types/appointments';

// Schema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de cita inválido." }),
});

/**
 * POST /api/appointments/[id]/resume
 * Reanuda una cita pausada
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

    const { systemId } = session.user;

    // Buscar el registro de uso pausado
    const pausedUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: appointmentId,
        currentStatus: 'PAUSED',
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

    if (!pausedUsage) {
      return NextResponse.json({ 
        error: 'No hay una cita pausada para reanudar' 
      }, { status: 404 });
    }

    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      // Completar el último intervalo de pausa
      const currentIntervals = (pausedUsage.pauseIntervals as unknown as PauseIntervals) || [];
      const updatedIntervals = completePauseInterval(currentIntervals);

      // Actualizar registro de uso
      const updatedUsage = await tx.appointmentDeviceUsage.update({
        where: { id: pausedUsage.id },
        data: {
          currentStatus: 'ACTIVE',
          pausedAt: null,
          pauseIntervals: updatedIntervals as any,
          updatedAt: now
        }
      });

      // TODO: Si hay dispositivo conectado, reactivar via WebSocket
      // if (pausedUsage.equipmentClinicAssignment?.smartPlugDevice && pausedUsage.equipmentClinicAssignment.smartPlugDevice.online) {
      //   await shellyWebSocketManager.toggleDevice(
      //     pausedUsage.equipmentClinicAssignment.smartPlugDevice.credentialId,
      //     pausedUsage.equipmentClinicAssignment.smartPlugDevice.deviceId,
      //     true
      //   );
      // }

      // 🚀 EMISIÓN WEBSOCKET: Notificar reanudación de cronómetro en tiempo real
      try {
        const timerData = {
          id: updatedUsage.id,
          appointmentId: updatedUsage.appointmentId,
          startedAt: pausedUsage.startedAt.toISOString(),
          endedAt: null,
          estimatedMinutes: pausedUsage.estimatedMinutes,
          actualMinutes: null,
          currentStatus: updatedUsage.currentStatus,
          pausedAt: null,
          pauseIntervals: updatedIntervals,
          equipmentId: pausedUsage.equipmentId || null,
          deviceId: pausedUsage.deviceId || null
        };

        // Usar función global broadcastDeviceUpdate para emitir evento
        if (global.broadcastDeviceUpdate) {
          global.broadcastDeviceUpdate(systemId, {
            type: 'appointment-timer-update',
            appointmentId: appointmentId,
            timerData: timerData,
            action: 'resumed'
          });
          console.log('📡 [RESUME_APPOINTMENT] ✅ WebSocket emitido exitosamente');
        } else {
          console.warn('📡 [RESUME_APPOINTMENT] ⚠️ global.broadcastDeviceUpdate no disponible');
        }
      } catch (wsError) {
        console.error('📡 [RESUME_APPOINTMENT] ❌ Error emitiendo WebSocket:', wsError);
        // No fallar la transacción por errores de WebSocket
      }

      return NextResponse.json({
        success: true,
        message: 'Cita reanudada',
        data: {
          usageId: updatedUsage.id,
          resumedAt: now.toISOString(),
          currentStatus: updatedUsage.currentStatus,
          pauseIntervals: updatedIntervals
        }
      });
    });

  } catch (error) {
    console.error('[RESUME_APPOINTMENT] Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
} 