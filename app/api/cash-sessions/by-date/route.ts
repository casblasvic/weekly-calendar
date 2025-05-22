import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PaymentMethodType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get('clinicId');
  const dateIso = req.nextUrl.searchParams.get('date'); // yyyy-mm-dd
  if (!clinicId || !dateIso) {
    return NextResponse.json({ message: 'clinicId y date son obligatorios' }, { status: 400 });
  }
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  const start = new Date(dateIso + 'T00:00:00');
  const end = new Date(dateIso + 'T23:59:59');

  const cashSession = await prisma.cashSession.findFirst({
    where: {
      clinicId,
      systemId,
      openingTime: { gte: start, lte: end },
      // Aquí NO filtramos por status: 'OPEN', porque queremos la sesión del día, esté abierta o cerrada.
    },
    include: {
      payments: {
        include: { paymentMethodDefinition: true, posTerminal: true },
      },
      user: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { id: true, name: true, currency: true } },
      posTerminal: { select: { id: true, name: true } },
      ticketsAccountedInSession: {
        select: {
          id: true,
          ticketNumber: true,
          finalAmount: true,
          paidAmountDirectly: true,
          hasOpenDebt: true,
          dueAmount: true,
          client: { select: { firstName: true, lastName: true } },
          payments: {
            select: {
              id: true,
              amount: true,
              type: true,
              debtLedgerId: true,
              paymentMethodDefinition: { select: { type: true, name: true } },
              posTerminal: { select: { name: true } },
            },
          },
        },
        orderBy: { ticketNumber: 'asc' },
      }
    }
  });

  if (!cashSession) return NextResponse.json(null, { status: 200 });

  // Modificación para paymentTotals: distinguir directos y deudas
  const paymentTotals: Record<string, { 
    type: PaymentMethodType; 
    posTerminalId?: string | null; 
    posTerminalName?: string | null; 
    directAmount: number;
    debtPaymentAmount: number;
    totalAmount: number;
  }> = {};

  const allPaymentsInSession = cashSession.payments || []; // Asegurar que payments existe

  allPaymentsInSession.forEach(p => {
    if (!p.paymentMethodDefinition || !p.type) return; // Chequear type también
    const key = `${p.paymentMethodDefinition.type}${p.posTerminalId ? `_${p.posTerminalId}` : ''}`;
    if (!paymentTotals[key]) {
      paymentTotals[key] = { 
        type: p.paymentMethodDefinition.type, 
        posTerminalId: p.posTerminalId, 
        posTerminalName: p.posTerminal?.name, 
        directAmount: 0, 
        debtPaymentAmount: 0, 
        totalAmount: 0 
      };
    }
    const amount = p.type === 'DEBIT' ? p.amount : (p.type === 'CREDIT' ? -p.amount : 0); // Considerar CREDIT
    if (p.debtLedgerId) {
      paymentTotals[key].debtPaymentAmount += amount;
    } else {
      paymentTotals[key].directAmount += amount;
    }
    paymentTotals[key].totalAmount += amount;
  });

  const resp = {
    id: cashSession.id,
    sessionNumber: cashSession.sessionNumber,
    openingTime: cashSession.openingTime.toISOString(),
    closingTime: cashSession.closingTime?.toISOString() || null,
    status: cashSession.status,
    openingBalanceCash: cashSession.openingBalanceCash,
    countedCash: cashSession.countedCash,
    expectedCash: cashSession.expectedCash,
    differenceCash: cashSession.differenceCash,
    notes: cashSession.notes,
    user: cashSession.user,
    clinic: cashSession.clinic,
    posTerminal: cashSession.posTerminal,
    paymentTotals: Object.values(paymentTotals).map(pt => ({...pt, directAmount: parseFloat(pt.directAmount.toFixed(2)), debtPaymentAmount: parseFloat(pt.debtPaymentAmount.toFixed(2)), totalAmount: parseFloat(pt.totalAmount.toFixed(2))})),
    ticketsAccountedInSession: cashSession.ticketsAccountedInSession,
    countedCard: cashSession.countedCard,
    countedBankTransfer: cashSession.countedBankTransfer,
    countedCheck: cashSession.countedCheck,
    countedInternalCredit: cashSession.countedInternalCredit,
    countedOther: cashSession.countedOther as any, // Prisma.JsonValue
    cashWithdrawal: (cashSession as any).cashWithdrawal, // Si se añade al modelo
  };

  return NextResponse.json(resp, { status: 200 });
} 