import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id;
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const debt = await prisma.debtLedger.findFirst({
      where: { ticketId, systemId },
      include: {
        payments: {
          include: {
            paymentMethodDefinition: { select: { id: true, name: true, type: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!debt) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(debt, { status: 200 });
  } catch (error: any) {
    console.error('[API_TICKET_DEBT_GET]', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
} 