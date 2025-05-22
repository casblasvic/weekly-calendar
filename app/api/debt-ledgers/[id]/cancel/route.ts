import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DebtStatus } from '@prisma/client';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const { systemId, id: userId } = session.user;
    const debtId = params.id;

    const updated = await prisma.$transaction(async (tx) => {
      const debt = await tx.debtLedger.findUnique({ where: { id: debtId, systemId } });
      if (!debt) {
        throw new Error('Deuda no encontrada.');
      }
      if (debt.status === DebtStatus.PAID) {
        throw new Error('La deuda ya está pagada.');
      }
      const updatedLedger = await tx.debtLedger.update({
        where: { id: debtId },
        data: { status: DebtStatus.CANCELLED, pendingAmount: 0 },
      });

      // Log
      await tx.entityChangeLog.create({
        data: {
          entityId: debt.ticketId,
          entityType: 'TICKET',
          action: 'CANCEL_DEBT_PAYMENT',
          userId,
          systemId,
          details: { debtLedgerId: debtId },
        },
      });

      return updatedLedger;
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('[API_DEBT_LEDGER_CANCEL]', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
} 