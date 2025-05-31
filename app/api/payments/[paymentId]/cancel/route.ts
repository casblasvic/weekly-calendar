import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DebtStatus, TicketStatus, PaymentType } from '@prisma/client';

/**
 * Cancel a payment associated with a debt ledger.
 * POST /api/payments/[paymentId]/cancel
 * Body: { reason: string }
 */
export async function POST(req: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const { systemId, id: userId } = session.user;
    const paymentId = params.paymentId;

    const body = await req.json();
    const reason = (body?.reason as string | undefined)?.trim();
    if (!reason || reason.length < 3) {
      return NextResponse.json({ message: 'Motivo requerido' }, { status: 400 });
    }

    const cancelledPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, systemId }, include: { ticket: true, debtLedger: true, cashSession: true } });
      if (!payment) throw new Error('Pago no encontrado');
      if (payment.status === 'CANCELLED') throw new Error('El pago ya está cancelado');

      // --------------   CANCELACIÓN DE PAGO DE UNA DEUDA  -----------------
      if (payment.debtLedgerId) {
        // 1. Cancelar el pago
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'CANCELLED',
            notes: reason,
            // campos de auditoría no incluidos en modelo Payment
          },
        });

        // 2. Recalcular la deuda
        const debt = await tx.debtLedger.findFirst({ where: { id: payment.debtLedgerId, systemId } });
        if (!debt) throw new Error('Deuda asociada no encontrada');

        const newPaid = debt.paidAmount - payment.amount;
        const newPending = debt.pendingAmount + payment.amount;
        let newStatus: DebtStatus;
        if (newPaid <= 0.009) newStatus = DebtStatus.PENDING;
        else if (newPending <= 0.009) newStatus = DebtStatus.PAID; // unlikely here, but keep logic
        else newStatus = DebtStatus.PARTIALLY_PAID;

        await tx.debtLedger.update({
          where: { id: debt.id },
          data: {
            paidAmount: newPaid,
            pendingAmount: newPending,
            status: newStatus,
          },
        });

        // 3. Registrar en change log
        await tx.entityChangeLog.create({
          data: {
            entityId: debt.ticketId,
            entityType: 'TICKET',
            action: 'DEBT_PAYMENT_CANCELLED',
            userId,
            systemId,
            details: { paymentId, reason },
          },
        });

        return updatedPayment;
      } else {
        // NUEVA LÓGICA: CANCELAR PAGO DE TICKET ACCOUNTED (DEVOLUCIÓN PARCIAL)
        // Validar estado del ticket
        const ticket = payment.ticket!;
        if (ticket.status !== TicketStatus.ACCOUNTED) {
          throw new Error('Solo se puede cancelar un pago de un ticket ACCOUNTED');
        }

        // 1. Marcar pago original como CANCELLED
        await tx.payment.update({ where: { id: paymentId }, data: { status: 'CANCELLED', notes: reason } });

        // 2. Crear pago reverso negativo
        await tx.payment.create({
          data: {
            ticketId: ticket.id,
            cashSessionId: payment.cashSessionId, // TODO: si la sesión está cerrada, crear ajuste
            paymentMethodDefinitionId: payment.paymentMethodDefinitionId,
            amount: -payment.amount,
            paymentDate: new Date(),
            type: PaymentType.CREDIT,
            transactionReference: `REVERSO-${payment.transactionReference || payment.id}`.slice(0, 255),
            notes: `Reverso de pago ${payment.id}. ${reason}`.slice(0, 255),
            userId,
            systemId,
          },
        });

        // 3. Recalcular importes del ticket
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            paidAmount: { decrement: payment.amount },
            pendingAmount: { increment: payment.amount },
            paidAmountDirectly: payment.type === PaymentType.DEBIT ? { decrement: payment.amount } : undefined,
            // Mantenemos el estado ACCOUNTED; el saldo pendiente indicará la corrección
          },
        });

        // 4. Registro en change log
        await tx.entityChangeLog.create({
          data: {
            entityId: ticket.id,
            entityType: 'TICKET',
            action: 'PAYMENT_CANCELLED',
            userId,
            systemId,
            details: { paymentId, reason, reverseAmount: payment.amount },
          },
        });

        return { updatedTicketId: updatedTicket.id };
      }
    });

    return NextResponse.json(cancelledPayment, { status: 200 });
  } catch (error: any) {
    console.error('[API_CANCEL_DEBT_PAYMENT]', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
}

// Se eliminó el handler PATCH duplicado para evitar conflictos; POST cubre ambas rutas.
