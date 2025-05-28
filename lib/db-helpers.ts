import { CashSession } from '@prisma/client';

export async function getOpenCashSessionForClinic(tx: any, clinicId: string, systemId: string): Promise<CashSession | null> {
  return await tx.cashSession.findFirst({
    where: {
      clinicId,
      systemId,
      status: 'OPEN',
    },
    orderBy: { openingTime: 'desc' },
  });
}

/**
 * Generates the next ticket number for a given clinic within a system.
 * Ticket numbers are padded with leading zeros to a length of 6 characters (e.g., "000001").
 * This function assumes ticket numbers are sequential per clinic.
 */
export async function generateNextTicketNumber(tx: any, systemId: string, clinicId: string): Promise<string> {
  const latestTicket = await tx.ticket.findFirst({
    where: {
      systemId,
      clinicId,
    },
    orderBy: {
      createdAt: 'desc', // Order by creation time to reliably get the last entered ticket
    },
    select: { ticketNumber: true },
  });

  let nextNumericValue = 1;
  if (latestTicket && latestTicket.ticketNumber) {
    const numericPartMatch = latestTicket.ticketNumber.match(/\d+$/); // Extracts trailing numbers
    if (numericPartMatch && numericPartMatch[0]) {
      const lastNum = parseInt(numericPartMatch[0], 10);
      if (!isNaN(lastNum)) {
        nextNumericValue = lastNum + 1;
      }
    } else {
      // Fallback for purely numeric ticketNumber or if parsing failed
      const simpleNum = parseInt(latestTicket.ticketNumber, 10);
      if (!isNaN(simpleNum)) {
        nextNumericValue = simpleNum + 1;
      }
      // If still NaN, it defaults to 1 (e.g. first ticket or unexpected format)
    }
  }
  return String(nextNumericValue).padStart(6, '0');
}

/**
 * Ensures a cash session is available for an operation for a given clinic and system.
 * - If an open session exists for today, it's returned.
 * - If no open session today, but other sessions were opened and closed today, a new subsequent session is created for today.
 * - If no sessions at all today, a new session is created for today (first of the day).
 * The opening balance is derived from the last closed session (either from today or a previous day).
 */
export async function ensureCashSessionForOperation(tx: any, clinicId: string, userId: string, systemId: string): Promise<CashSession> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Try to find an already OPEN session for today in this clinic
  const openSessionToday = await tx.cashSession.findFirst({
    where: {
      clinicId,
      systemId,
      status: 'OPEN',
      openingTime: { // Ensure it was opened today, not an old session left open
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { openingTime: 'desc' }, // Get the latest if multiple somehow exist
  });

  if (openSessionToday) {
    return openSessionToday;
  }

  // 2. No open session today. Determine opening balance for a new session.
  let openingBalance = 0;

  // Find the latest session (if any) that was closed *today* for this clinic
  const lastClosedSessionToday = await tx.cashSession.findFirst({
    where: {
      clinicId,
      systemId,
      status: 'CLOSED',
      closingTime: { // Must have been closed today
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { closingTime: 'desc' }, // Get the most recently closed one today
  });

  if (lastClosedSessionToday) {
    // This new session is subsequent to another one closed today
    openingBalance = (lastClosedSessionToday.countedCash?.toNumber() || 0) - (lastClosedSessionToday.cashWithdrawals?.toNumber() || 0);
  } else {
    // No session was closed today. Look for the latest closed session from any previous day.
    const lastClosedSessionAnyDay = await tx.cashSession.findFirst({
      where: {
        clinicId,
        systemId,
        status: 'CLOSED',
      },
      orderBy: { closingTime: 'desc' }, // The absolute latest closed session for this clinic
    });
    if (lastClosedSessionAnyDay) {
      openingBalance = (lastClosedSessionAnyDay.countedCash?.toNumber() || 0) - (lastClosedSessionAnyDay.cashWithdrawals?.toNumber() || 0);
    }
    // If no closed sessions ever, openingBalance remains 0 (default)
  }
  
  openingBalance = Math.max(0, openingBalance); // Ensure opening balance is not negative

  // 3. Create and return a new CashSession
  const newCashSession = await tx.cashSession.create({
    data: {
      systemId,
      clinicId,
      openedById: userId,
      openingTime: new Date(),
      status: 'OPEN',
      openingBalanceCash: openingBalance,
      // Default other financial fields to 0 or null as appropriate
      expectedCash: openingBalance, // Initially, expected is same as opening
      countedCash: null,
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      cashExpenses: 0,
      cashIncome: 0, // This might be openingBalance or payments received
      manualCashInput: 0,
      cashWithdrawals: 0,
      deferredPaymentsTotal: 0,
      calculatedDeferredAtClose: null,
      posTerminalCount: 1, // Default or could be a setting
    },
  });

  return newCashSession;
}