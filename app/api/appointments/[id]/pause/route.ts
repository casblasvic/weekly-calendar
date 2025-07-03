import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createPauseInterval } from '@/utils/appointment-timer-utils';
import type { PauseIntervals } from '@/types/appointments';

// Schema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de cita inválido." }),
});

// Schema de validación para el cuerpo de la petición
const pauseRequestSchema = z.object({
  reason: z.string().optional(),
});

/**
 * POST /api/appointments/[id]/pause
 * Pausa una cita activa
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
    const bodyValidation = pauseRequestSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos', 
        details: bodyValidation.error.format() 
      }, { status: 400 });
    }

    const { reason } = bodyValidation.data;
    const { systemId } = session.user;

    // Buscar el registro de uso activo
    const activeUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: appointmentId,
        currentStatus: 'ACTIVE',
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
        error: 'No hay una cita activa para pausar' 
      }, { status: 404 });
    }

    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      // Crear nuevo intervalo de pausa
      const newPauseInterval = createPauseInterval(reason);
      const currentIntervals = (activeUsage.pauseIntervals as unknown as PauseIntervals) || [];
      const updatedIntervals = [...currentIntervals, newPauseInterval];

      // Actualizar registro de uso
      const updatedUsage = await tx.appointmentDeviceUsage.update({
        where: { id: activeUsage.id },
        data: {
          currentStatus: 'PAUSED',
          pausedAt: now,
          pauseIntervals: updatedIntervals as any,
          updatedAt: now
        }
      });

      // TODO: Si hay dispositivo conectado, pausar/apagar via WebSocket
      // if (activeUsage.equipmentClinicAssignment?.smartPlugDevice && activeUsage.equipmentClinicAssignment.smartPlugDevice.online) {
      //   await shellyWebSocketManager.toggleDevice(
      //     activeUsage.equipmentClinicAssignment.smartPlugDevice.credentialId,
      //     activeUsage.equipmentClinicAssignment.smartPlugDevice.deviceId,
      //     false
      //   );
      // }

      // 🚀 EMISIÓN WEBSOCKET: Notificar pausa de cronómetro en tiempo real
      try {
        const timerData = {
          id: updatedUsage.id,
          appointmentId: updatedUsage.appointmentId,
          startedAt: activeUsage.startedAt.toISOString(),
          endedAt: null,
          estimatedMinutes: activeUsage.estimatedMinutes,
          actualMinutes: null,
          currentStatus: updatedUsage.currentStatus,
          pausedAt: updatedUsage.pausedAt?.toISOString() || null,
          pauseIntervals: updatedIntervals,
          equipmentId: activeUsage.equipmentId || null,
          deviceId: activeUsage.deviceId || null
        };

        // Usar función global broadcastDeviceUpdate para emitir evento
        if (global.broadcastDeviceUpdate) {
          global.broadcastDeviceUpdate(systemId, {
            type: 'appointment-timer-update',
            appointmentId: appointmentId,
            timerData: timerData,
            action: 'paused'
          });
          console.log('📡 [PAUSE_APPOINTMENT] ✅ WebSocket emitido exitosamente');
        } else {
          console.warn('📡 [PAUSE_APPOINTMENT] ⚠️ global.broadcastDeviceUpdate no disponible');
        }
      } catch (wsError) {
        console.error('📡 [PAUSE_APPOINTMENT] ❌ Error emitiendo WebSocket:', wsError);
        // No fallar la transacción por errores de WebSocket
      }

      return NextResponse.json({
        success: true,
        message: reason ? `Cita pausada: ${reason}` : 'Cita pausada',
        data: {
          usageId: updatedUsage.id,
          pausedAt: updatedUsage.pausedAt?.toISOString(),
          currentStatus: updatedUsage.currentStatus,
          pauseIntervals: updatedIntervals
        }
      });
    });

  } catch (error) {
    console.error('[PAUSE_APPOINTMENT] Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
} 