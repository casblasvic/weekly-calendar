import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ParamsSchema = z.object({
  paymentId: z.string().cuid({ message: "El ID del pago debe ser un CUID válido." }),
});

export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ paymentId: string }> }) {
  try {
    const params = await paramsPromise;
    const { paymentId } = params;

    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json(
        { error: "Usuario no autenticado o falta systemId." },
        { status: 401 }
      );
    }
    const systemId = session.user.systemId;

    const paramsValidation = ParamsSchema.safeParse({ paymentId });
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: 'Parámetro paymentId inválido', details: paramsValidation.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar que el pago existe y pertenece al systemId del usuario antes de eliminar
    const paymentToDelete = await prisma.payment.findUnique({
      where: {
        id: paymentId,
        systemId: systemId, // Asegurar que el pago pertenece al sistema del usuario
      },
    });

    if (!paymentToDelete) {
      return NextResponse.json(
        { error: 'Pago no encontrado o no autorizado para eliminar.' },
        { status: 404 }
      );
    }

    // Eliminar el pago
    await prisma.payment.delete({
      where: {
        id: paymentId,
        // No es necesario repetir systemId aquí si ya lo verificamos,
        // pero no hace daño para mayor seguridad si la lógica de arriba cambiara.
      },
    });

    return NextResponse.json({ message: 'Pago eliminado correctamente' }, { status: 200 });

  } catch (error) {
    console.error('[API_PAYMENTS_DELETE] Error al eliminar el pago:', error);
    // Considerar manejo de errores específicos de Prisma si es necesario
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el pago.' },
      { status: 500 }
    );
  }
} 