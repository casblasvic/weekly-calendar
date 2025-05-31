import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DebtStatus } from '@prisma/client';

/**
 * GET /api/debt-ledgers/:id
 * Devuelve el detalle de una deuda, incluyendo la lista de liquidaciones (payments).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const { systemId } = session.user;
    const { id: debtId } = params;

    const debt = await prisma.debtLedger.findUnique({
      where: { id: debtId, systemId },
      include: {
        payments: {
          orderBy: { paymentDate: 'asc' },
          where: { systemId },
          include: {
            paymentMethodDefinition: { select: { id: true, name: true, type: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        clinic: { select: { id: true, name: true } },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            cashSession: { select: { id: true, status: true } },
            client: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!debt) {
      return NextResponse.json({ message: 'Deuda no encontrada' }, { status: 404 });
    }

    return NextResponse.json(debt, { status: 200 });
  } catch (error: any) {
    console.error('[API_DEBT_LEDGER_DETAIL]', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
}
