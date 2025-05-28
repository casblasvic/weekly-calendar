import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PaymentMethodType } from '@prisma/client';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) return NextResponse.json({ message: 'No auth' }, { status: 401 });
  const systemId = session.user.systemId;

  // Query pagos de la sesión agrupados
  const payments = await prisma.payment.findMany({
    where: {
      systemId,
      OR: [
        // 1) Pagos cuyo ticket pertenece a la caja
        { ticket: { cashSessionId: sessionId } },
        // 2) Pagos sin ticket (movimientos manuales) asociados directamente a la caja
        { ticketId: null, cashSessionId: sessionId },
      ],
    },
    include: { paymentMethodDefinition: true, posTerminal: true },
  });

  // Helper maps
  const cardByPos: Record<string, any> = {};
  let transfer = { expectedTickets: 0, expectedDeferred: 0, expectedTotal: 0 };
  let check = { expectedTickets: 0, expectedDeferred: 0, expectedTotal: 0 };
  let deferredAmount = 0;

  for (const p of payments) {
    const amount = p.type === 'DEBIT' ? p.amount : -p.amount;
    const method = p.paymentMethodDefinition?.type;
    const isDeferred = !!p.debtLedgerId;

    if (method === PaymentMethodType.CARD) {
      const key = p.posTerminalId || 'unknown';
      if (!cardByPos[key]) cardByPos[key] = { posId: key, posName: p.posTerminal?.name || '—', expectedTickets: 0, expectedDeferred: 0, expectedTotal: 0 };
      if (isDeferred) cardByPos[key].expectedDeferred += amount; else cardByPos[key].expectedTickets += amount;
      cardByPos[key].expectedTotal += amount;
    } else if (method === PaymentMethodType.BANK_TRANSFER) {
      if (isDeferred) transfer.expectedDeferred += amount; else transfer.expectedTickets += amount;
      transfer.expectedTotal += amount;
    } else if (method === PaymentMethodType.CHECK) {
      if (isDeferred) check.expectedDeferred += amount; else check.expectedTickets += amount;
      check.expectedTotal += amount;
    } else if (method === PaymentMethodType.DEFERRED_PAYMENT) {
      deferredAmount += amount;
    }
  }

  return NextResponse.json({
    cardByPos: Object.values(cardByPos),
    transfer,
    check,
    deferred: { amount: deferredAmount },
  });
} 