import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DebtStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const clinicId = req.nextUrl.searchParams.get('clinicId');
    const statusParam = req.nextUrl.searchParams.get('status') as DebtStatus | null;

    const where: any = { systemId, OR: [{ status: 'PENDING' }, { status: 'PARTIALLY_PAID' }], pendingAmount: { gt: 0.009 } };
    if (clinicId) where.clinicId = clinicId;
    if (statusParam) {
      where.status = statusParam;
      delete where.OR;
    }

    const debts = await prisma.debtLedger.findMany({
      where,
      include: {
        ticket: { select: { ticketNumber: true, issueDate: true } },
        clinic: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(debts, { status: 200 });
  } catch (error) {
    console.error('[API_DEBT_LEDGERS_GET]', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
} 