import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { z } from 'zod';
import { AppointmentServiceStarter } from '@/lib/services/appointment-service-starter';

// Schema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de cita inválido." }),
});

// Schema de validación para el cuerpo de la petición
const startServiceSchema = z.object({
  serviceId: z.string().cuid({ message: "ID de servicio inválido." }),
  equipmentId: z.string().cuid({ message: "ID de equipo inválido." }).optional(),
});

/**
 * POST /api/appointments/[id]/start-service
 * Inicia un servicio específico de una cita
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
    const body = await request.json();
    const bodyValidation = startServiceSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos', 
        details: bodyValidation.error.format() 
      }, { status: 400 });
    }

    const { serviceId, equipmentId } = bodyValidation.data;
    const { systemId, id: userId } = session.user;

    // Usar el servicio de lógica de negocio
    const result = await AppointmentServiceStarter.startService({
      appointmentId,
      serviceId,
      equipmentId,
      userId,
      systemId
    });

    // Manejar respuesta según el resultado
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    // Si requiere selección de equipo
    if (result.requiresSelection) {
      return NextResponse.json(result, { status: 200 });
    }

    // Error de validación o lógica de negocio
    return NextResponse.json({
      error: result.message
    }, { status: 400 });

  } catch (error) {
    console.error('[START_SERVICE] Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
} 