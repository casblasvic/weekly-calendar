import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PaymentMethodType, CashSessionStatus, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get('clinicId');
  const dateIso = req.nextUrl.searchParams.get('date'); // yyyy-mm-dd
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  // Validación de parámetros de entrada
  if (!clinicId) {
    return NextResponse.json({ message: 'clinicId es obligatorio' }, { status: 400 });
  }
  if (!dateIso && !sessionId) {
    return NextResponse.json({ message: '(date o sessionId) es obligatorio junto con clinicId' }, { status: 400 });
  }

  // Autenticación y obtención de systemId
  const auth = await getServerAuthSession();
  if (!auth?.user?.systemId) {
    return NextResponse.json({ message: 'No autenticado o systemId no encontrado en la sesión' }, { status: 401 });
  }
  const systemId = auth.user.systemId;

  // Definición de los campos a seleccionar para la cashSession
  const cashSessionSelectFields = {
    id: true,
    sessionNumber: true,
    userId: true,
    clinicId: true,
    posTerminalId: true,
    openingBalanceCash: true,
    manualCashInput: true,
    cashWithdrawals: true,
    cashExpenses: true,
    expectedCash: true,
    countedCash: true,
    differenceCash: true,
    status: true,
    openingTime: true,
    closingTime: true,
    reconciliationTime: true,
    notes: true,
    systemId: true,
    countedCard: true,
    countedBankTransfer: true,
    countedCheck: true,
    countedInternalCredit: true,
    countedOther: true,
    hasChangesAfterReconcile: true,
    calculatedDeferredAtClose: true,
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
            posTerminal: { select: { id:true, name: true } },
            posTerminalId: true,
          },
        },
      },
      orderBy: { ticketNumber: Prisma.SortOrder.asc },
    }
  };

  let cashSession: any = null; // Tipar explícitamente si es posible, o usar el tipo inferido por Prisma

  try {
    if (sessionId) {
      cashSession = await prisma.cashSession.findUnique({
        where: {
          id: sessionId,
          clinicId: clinicId, // Asegurar que pertenece a la clínica y sistema correctos
          systemId: systemId,
        },
        select: cashSessionSelectFields,
      });
    } else if (dateIso) { 
      const start = new Date(dateIso + 'T00:00:00.000Z'); // Forzar UTC
      const end = new Date(dateIso + 'T23:59:59.999Z');   // Forzar UTC
      cashSession = await prisma.cashSession.findFirst({
        where: {
          clinicId: clinicId,
          systemId: systemId,
          openingTime: { gte: start, lte: end },
        },
        select: cashSessionSelectFields,
      });
    }
  } catch (error) {
    console.error("[API /cash-sessions/by-date] Error al buscar cash session:", error);
    return NextResponse.json({ message: 'Error al acceder a la base de datos' }, { status: 500 });
  }

  if (!cashSession) {
    return NextResponse.json(null, { status: 200 }); // No se encontró sesión, pero no es un error de servidor
  }

  // El resto de la lógica (hasEarlierOpenSession, paymentTotals, etc.) continúa desde aquí
  // usando la variable 'cashSession' que ya tiene los datos seleccionados.

  let hasEarlierOpenSession = false;
  if (cashSession.status === CashSessionStatus.OPEN) {
    const earlierOpenSessionCheck = await prisma.cashSession.findFirst({
      where: {
        clinicId: cashSession.clinicId,
        // posTerminalId ya no es un criterio para la secuencia de cajas de una clínica
        openingTime: { lt: cashSession.openingTime },
        status: CashSessionStatus.OPEN,
        id: { not: cashSession.id } // Exclude the current session itself
      },
      select: { id: true } // We only need to know if one exists
    });
    if (earlierOpenSessionCheck) {
      hasEarlierOpenSession = true;
    }
  }

  // Modificación para paymentTotals: distinguir directos y deudas
  const paymentTotals: Record<string, { 
    paymentMethodType: PaymentMethodType; 
    posTerminalId?: string | null; 
    posTerminalName?: string | null; 
    directAmount: number;
    debtPaymentAmount: number;
    totalAmount: number;
  }> = {};

  const allTicketPayments = cashSession.ticketsAccountedInSession.flatMap(ticket => ticket.payments || []) || [];

  console.log(`[DEBUG_PAYMENT_TOTALS] Processing ${allTicketPayments.length} ticket payments for paymentTotals.`);
  allTicketPayments.forEach((p, index) => {
    console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: ID=${p.id}, Amount=${p.amount?.toString()}, PaymentType=${p.type}, POSId=${p.posTerminalId}, DebtLedgerId=${p.debtLedgerId}`);
    if (p.paymentMethodDefinition) {
      console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: PMD_Name=${p.paymentMethodDefinition.name}, PMD_Type=${p.paymentMethodDefinition.type}`);
    } else {
      console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: p.paymentMethodDefinition is NULL or UNDEFINED.`);
    }

    if (!p.paymentMethodDefinition || !p.type) {
      console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: SKIPPED due to missing paymentMethodDefinition or PaymentType (DEBIT/CREDIT).`);
      return; 
    }
    console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: PMD_Type is ${p.paymentMethodDefinition.type}. PaymentType is ${p.type}.`);
    const key = `${p.paymentMethodDefinition.type}${p.posTerminalId ? `_${p.posTerminalId}` : ''}`;
    if (!paymentTotals[key]) {
      paymentTotals[key] = { 
        paymentMethodType: p.paymentMethodDefinition.type, 
        posTerminalId: p.posTerminalId, 
        posTerminalName: p.posTerminal?.name, 
        directAmount: 0, 
        debtPaymentAmount: 0, 
        totalAmount: 0 
      };
    }
    const paymentAmount = Number(p.amount ?? 0); // Convert Decimal to number
    const amount = p.type === 'DEBIT' ? paymentAmount : (p.type === 'CREDIT' ? -paymentAmount : 0);
    console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: PrismaAmount=${p.amount?.toString()}, NumericPaymentAmount=${paymentAmount}, CalculatedAmountForTotals=${amount}`);
    if (p.debtLedgerId) {
      paymentTotals[key].debtPaymentAmount += amount;
    } else {
      paymentTotals[key].directAmount += amount;
    }
    paymentTotals[key].totalAmount += amount;
    console.log(`[DEBUG_PAYMENT_TOTALS] Ticket Payment ${index + 1}: Updated paymentTotals['${key}'].totalAmount to ${paymentTotals[key].totalAmount}`);
  });

  let calculatedExpectedCash = cashSession.expectedCash;
  let currentManualCashInput = cashSession.manualCashInput;

  if (cashSession.status === CashSessionStatus.OPEN) {
    let currentCashSales = 0;
    let currentCashExpenses = 0;

    const directSessionPayments = cashSession.payments || [];
    directSessionPayments.forEach(p => {
      if (p.paymentMethodDefinition?.type === PaymentMethodType.CASH) {
        // Linter indicates p.amount is number | null
        const amountNum = Number(p.amount ?? 0); // Convert Decimal to number 
        if (p.type === 'DEBIT') {
          currentCashSales += amountNum;
        }
        // Assuming 'CREDIT' for cash payments means an expense or refund from the till
        else if (p.type === 'CREDIT') { 
          currentCashExpenses += amountNum;
        }
      }
    });

    // Linter indicates openingBalanceCash & directCashPayouts are Decimal?,
    // while manualCashInput is number | null.
    const openingBalanceCashNum = cashSession.openingBalanceCash ?? 0;
    const manualCashInputNum = cashSession.manualCashInput ?? 0; 

    console.log('[DEBUG] Calculating expectedCash for OPEN session ID:', cashSession.id);
    console.log('[DEBUG]   DB cashSession.openingBalanceCash (Decimal?):', cashSession.openingBalanceCash?.toString() ?? 'null');
    console.log('[DEBUG]   DB cashSession.manualCashInput (expected number?):', cashSession.manualCashInput?.toString() ?? 'null');
    console.log('[DEBUG]   Numeric openingBalanceCashNum (from Decimal?.toNumber()):', openingBalanceCashNum);
    console.log('[DEBUG]   Numeric currentCashSales (from p.amount ?? 0):', currentCashSales);
    console.log('[DEBUG]   Numeric currentCashExpenses (from p.amount ?? 0):', currentCashExpenses);
    console.log('[DEBUG]   Numeric manualCashInputNum (from manualCashInput ?? 0):', manualCashInputNum);

    calculatedExpectedCash = 
      Number(openingBalanceCashNum) + 
      Number(currentCashSales) - 
      Number(currentCashExpenses) + 
      Number(manualCashInputNum);

    console.log('[DEBUG]   Resulting calculatedExpectedCash:', calculatedExpectedCash);
  }

  const finalPaymentTotalsArray = Object.values(paymentTotals);
  console.log('[API DEBUG] finalPaymentTotalsArray being sent:', JSON.stringify(finalPaymentTotalsArray, null, 2));

  const resp = {
    id: cashSession.id,
    sessionNumber: cashSession.sessionNumber,
    openingTime: cashSession.openingTime.toISOString(),
    closingTime: cashSession.closingTime?.toISOString() || null,
    status: cashSession.status,
    openingBalanceCash: cashSession.openingBalanceCash,
    countedCash: cashSession.countedCash,
    expectedCash: calculatedExpectedCash,
    differenceCash: cashSession.differenceCash,
    notes: cashSession.notes,
    user: cashSession.user,
    clinic: cashSession.clinic,
    posTerminal: cashSession.posTerminal,
    paymentTotals: finalPaymentTotalsArray,
    ticketsAccountedInSession: cashSession.ticketsAccountedInSession,
    countedCard: cashSession.countedCard,
    countedBankTransfer: cashSession.countedBankTransfer,
    countedCheck: cashSession.countedCheck,
    countedInternalCredit: cashSession.countedInternalCredit,
    countedOther: cashSession.countedOther as any, // Prisma.JsonValue
    manualCashInput: currentManualCashInput ?? 0,
    cashWithdrawals: cashSession.cashWithdrawals,
    cashExpenses: cashSession.cashExpenses ?? null, // Added cashExpenses
    calculatedDeferredAtClose: cashSession.calculatedDeferredAtClose, // Añadido para devolver el total de aplazados al cierre
    hasEarlierOpenSession, // Add the new flag to the response
  };

  return NextResponse.json(resp, { status: 200 });
} 