import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, CashSessionStatus, PaymentType } from '@prisma/client'; // Importar PaymentType

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

    let deletedPaymentAmount = 0;
    let associatedTicketId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const paymentToDelete = await tx.payment.findUnique({
        where: {
          id: paymentId,
          systemId: systemId, 
        },
        include: {
          ticket: { select: { id: true, status: true } },
          cashSession: { select: { id: true, status: true } },
        }
      });

      if (!paymentToDelete) {
        throw new Error('Pago no encontrado o no autorizado para eliminar.');
      }

      if (paymentToDelete.debtLedgerId) {
        throw new Error('Este pago está asociado a una deuda y no puede eliminarse directamente. Considere anular la deuda o el movimiento de deuda relacionado.');
      }

      if (!paymentToDelete.ticket) {
          throw new Error('El pago no está asociado a ningún ticket.');
      }
      if (paymentToDelete.ticket.status !== TicketStatus.OPEN) {
        throw new Error(`Solo se pueden eliminar pagos de tickets en estado OPEN. Estado actual del ticket: ${paymentToDelete.ticket.status}`);
      }

      if (paymentToDelete.cashSession && 
          (paymentToDelete.cashSession.status === CashSessionStatus.CLOSED || paymentToDelete.cashSession.status === CashSessionStatus.RECONCILED)) {
        throw new Error(`No se puede eliminar un pago asociado a una sesión de caja cerrada o conciliada (Sesión: ${paymentToDelete.cashSessionId}).`);
      }

      deletedPaymentAmount = paymentToDelete.amount;
      associatedTicketId = paymentToDelete.ticketId;

      await tx.payment.delete({
        where: {
          id: paymentId,
        },
      });

      // Decrementar paidAmountDirectly en el Ticket si el pago era de tipo DEBIT
      if (associatedTicketId && paymentToDelete.type === PaymentType.DEBIT) {
        await tx.ticket.update({
          where: { id: associatedTicketId },
          data: {
            paidAmountDirectly: { decrement: deletedPaymentAmount }
          }
        });
      } else if (associatedTicketId && paymentToDelete.type === PaymentType.CREDIT) {
        // Si en el futuro se permiten pagos CREDIT directos al ticket (devoluciones parciales sin ticket de devolución)
        // Aquí se incrementaría paidAmountDirectly (o se manejaría una lógica de "monto devuelto")
        // Por ahora, solo consideramos DEBIT para paidAmountDirectly.
      }
    });

    return NextResponse.json({ message: 'Pago eliminado correctamente' }, { status: 200 });

  } catch (error: any) {
    console.error('[API_PAYMENTS_DELETE] Error al eliminar el pago:', error);
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("Solo se pueden eliminar") || error.message?.includes("asociado a una deuda") || error.message?.includes("asociado a una sesión de caja cerrada") ? 403 :
                   error.message?.includes("no está asociado a ningún ticket") ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al eliminar el pago.' },
      { status }
    );
  }
} 