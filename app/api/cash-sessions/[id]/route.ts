import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
// Añadir Prisma directamente si se necesita para Prisma.JsonNull
import { Prisma } from '@prisma/client'; 
import { CashSessionStatus, TicketStatus, PaymentMethodType } from '@prisma/client';

// Esquema para validar el ID (CUID)
const cuidSchema = z.string().cuid({ message: "ID de sesión inválido." });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const sessionIdValidation = cuidSchema.safeParse(id);
    if (!sessionIdValidation.success) {
      return NextResponse.json({ message: 'ID de sesión proporcionado no es válido.', errors: sessionIdValidation.error.format() }, { status: 400 });
    }
    const sessionId = sessionIdValidation.data;

    // TODO: Implementar verificación de permisos del usuario para acceder a esta CashSession específica
    // (ej. ¿pertenece a una de sus clínicas asignadas?)

    const cashSessionDetails = await prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { // Usuario que abrió/cerró la sesión
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        clinic: { // Clínica de la sesión
          select: { id: true, name: true, prefix: true },
        },
        posTerminal: { // TPV de la sesión (si aplica)
          select: { id: true, name: true },
        },
        payments: { // Pagos realizados durante esta sesión
          orderBy: { paymentDate: 'asc' },
          include: {
            paymentMethodDefinition: {
              select: { id: true, name: true, type: true },
            },
            ticket: { // El ticket al que está asociado el pago
              select: { id: true, ticketNumber: true }
            },
            // Considerar si se necesita info del cliente del pago también
            // payerClient: { select: { id: true, firstName: true, lastName: true }}
          },
        },
        ticketsAccountedInSession: { // Tickets que se contabilizaron en esta sesión
          orderBy: { ticketNumber: 'asc' },
          include: {
            items: { // Items de cada ticket
              select: { id: true, description: true, quantity: true, finalPrice: true, itemType: true, serviceId: true, productId: true }
            },
            person: { // Cliente del ticket
              select: { id: true, firstName: true, lastName: true }
            }
            // Otros campos o relaciones de Ticket que puedan ser útiles para el resumen
          }
        }
      },
    });

    if (!cashSessionDetails) {
      return NextResponse.json({ message: 'Sesión de caja no encontrada.' }, { status: 404 });
    }

    // Calcular totales por método de pago
    const paymentTotals: Record<string, { amount: number, type: PaymentMethodType, posTerminalId?: string | null, posTerminalName?: string | null }> = {};
    cashSessionDetails.payments.forEach(p => {
      if (!p.paymentMethodDefinition) return;
      const key = `${p.paymentMethodDefinition.type}${p.posTerminalId ? `_${p.posTerminalId}` : ''}`;
      if (!paymentTotals[key]) {
        paymentTotals[key] = { amount: 0, type: p.paymentMethodDefinition.type, posTerminalId: p.posTerminalId, posTerminalName: (p as any).posTerminal?.name };
      }
      paymentTotals[key].amount += p.type === 'DEBIT' ? p.amount : -p.amount;
    });

    return NextResponse.json({ ...cashSessionDetails, paymentTotals: Object.values(paymentTotals) }, { status: 200 });

  } catch (error) {
    console.error(`Error al obtener detalles de CashSession ${id}:`, error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: 'Error de validación', errors: error.format() }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al obtener los detalles de la sesión de caja.' }, { status: 500 });
  }
}

// Esquema de validación para el cuerpo del PUT (Cerrar Caja)
const closeCashSessionSchema = z.object({
  countedCash: z.number(),
  countedCard: z.number().optional().nullable(),
  countedBankTransfer: z.number().optional().nullable(),
  countedCheck: z.number().optional().nullable(),
  countedInternalCredit: z.number().optional().nullable(),
  countedOther: z.record(z.string(), z.number()).optional().nullable(), // For JSON: { "Bizum": 10.0 }
  notes: z.string().optional().nullable(),
  manualCashInput: z.number().optional().nullable(), // Cash added manually during this session
  cashWithdrawals: z.number().optional().nullable(), // Cash physically withdrawn at close
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authSession = await getServerAuthSession();
    if (!authSession?.user?.id) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const userId = authSession.user.id;

    const sessionIdValidation = cuidSchema.safeParse(id);
    if (!sessionIdValidation.success) {
      return NextResponse.json({ message: 'ID de sesión proporcionado no es válido.', errors: sessionIdValidation.error.format() }, { status: 400 });
    }
    const sessionId = sessionIdValidation.data;

    const body = await request.json();
    const validation = closeCashSessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos para cerrar caja.', errors: validation.error.format() }, { status: 400 });
    }
    const {
      countedCash,
      countedCard,
      countedBankTransfer,
      countedCheck,
      countedInternalCredit,
      countedOther,
      manualCashInput, 
      cashWithdrawals, 
      notes
    } = validation.data;

    // TODO: Implementar verificación de permisos del usuario para cerrar esta CashSession.

    const updatedCashSession = await prisma.$transaction(async (tx) => {
      const systemId = authSession.user.systemId;
      if (!systemId) {
        console.error('[CASH_CLOSE_PUT_ERROR] systemId is missing on user session. Cannot proceed with DebtLedger operations.');
        throw new Error('SYSTEM_ID_MISSING_ON_SESSION');
      }
      const cashSessionToClose = await tx.cashSession.findUnique({
        where: { id: sessionId },
        include: {
          payments: {
            where: { paymentMethodDefinition: { type: 'CASH' } },
            select: { amount: true, type: true }
          },
          clinic: { select: { id: true } } // Need clinicId for fetching tickets
        }
      });

      if (!cashSessionToClose) {
        throw new Error('NOT_FOUND');
      }
      if (cashSessionToClose.status !== 'OPEN') {
        throw new Error('ALREADY_CLOSED_OR_RECONCILED');
      }

      // Sequential Closing Check:
      const earlierOpenSession = await tx.cashSession.findFirst({
        where: {
          clinicId: cashSessionToClose.clinicId,
          posTerminalId: cashSessionToClose.posTerminalId,
          openingTime: { lt: cashSessionToClose.openingTime },
          status: CashSessionStatus.OPEN,
        },
      });
      if (earlierOpenSession) {
        console.log(`[CASH_CLOSE_FAIL_PUT] Cannot close session ${sessionId}. Earlier session ${earlierOpenSession.id} (opened at ${earlierOpenSession.openingTime}) is still OPEN.`);
        throw new Error('EARLIER_SESSION_OPEN');
      }

      let expectedCash = (cashSessionToClose.openingBalanceCash ?? 0) + (manualCashInput ?? 0);
      cashSessionToClose.payments.forEach(payment => {
        if (payment.type === 'DEBIT') {
          expectedCash += payment.amount;
        } else if (payment.type === 'CREDIT') {
          expectedCash -= payment.amount;
        }
      });
      expectedCash = parseFloat(expectedCash.toFixed(2));

      const differenceCash = parseFloat((countedCash - expectedCash).toFixed(2));

      const newStatus = CashSessionStatus.CLOSED;

      // START: Logic for calculatedDeferredAtClose
      let calculatedDeferredAtClose = 0;
      console.log(`[CASH_CLOSE_PUT] Processing tickets for session: ${sessionId}`);

      // Fetch tickets already associated with this session to calculate deferred amounts and ensure their state.
      const associatedTickets = await tx.ticket.findMany({
        where: {
          cashSessionId: sessionId,
        },
        include: {
          payments: { // Still need payments to ensure DebtLedger/Ticket.dueAmount is correct
            include: {
              paymentMethodDefinition: true,
            },
          },
          person: { select: { id: true, firstName: true, lastName: true } }, // For DebtLedger creation if needed
        },
      });
      console.log(`[CASH_CLOSE_PUT] Found ${associatedTickets.length} tickets associated with session ${sessionId}.`);

      for (const t of associatedTickets) {
        // Recalculate deferred amount based on its payments to ensure accuracy
        const deferredPayments = t.payments.filter(
          p => p.paymentMethodDefinition.type === PaymentMethodType.DEFERRED_PAYMENT && p.type === 'DEBIT'
        );
        const currentTicketDeferredAmount = deferredPayments.reduce((s, p) => s + p.amount, 0);

        if (currentTicketDeferredAmount > 0.009) {
          const existingDebt = await tx.debtLedger.findFirst({ where: { ticketId: t.id, systemId } });
          if (existingDebt) {
            if (existingDebt.pendingAmount !== currentTicketDeferredAmount) {
              await tx.debtLedger.update({
                where: { id: existingDebt.id },
                data: { pendingAmount: currentTicketDeferredAmount, status: 'PENDING', updatedAt: new Date() }
              });
              console.log(`[DEBT_UPDATE_PUT] Updated DebtLedger ${existingDebt.id} for ticket ${t.id} from ${existingDebt.pendingAmount} to ${currentTicketDeferredAmount}`);
            }
          } else {
            if (!t.person?.id || !t.clinicId || !systemId) {
              console.error(`[DEBT_CREATE_ERROR_PUT] Missing personId, clinicId, or systemId for ticket ${t.id}. Cannot create debt record.`);
            } else {
              await tx.debtLedger.create({
                data: {
                  ticketId: t.id,
                  personId: t.person.id,
                  clinicId: t.clinicId,
                  originalAmount: currentTicketDeferredAmount,
                  paidAmount: 0,
                  pendingAmount: currentTicketDeferredAmount,
                  status: 'PENDING',
                  systemId: systemId,
                }
              });
              console.log(`[DEBT_CREATE_PUT] Created new DebtLedger for ticket ${t.id} with amount ${currentTicketDeferredAmount}`);
            }
          }
          // Ensure ticket reflects the true deferred state
          if (t.dueAmount !== currentTicketDeferredAmount || !t.hasOpenDebt) {
             await tx.ticket.update({ where: { id: t.id }, data: { hasOpenDebt: true, dueAmount: currentTicketDeferredAmount } });
             console.log(`[TICKET_UPDATE_PUT] Ensured ticket ${t.id} hasOpenDebt=true, dueAmount=${currentTicketDeferredAmount}`);
          }
          calculatedDeferredAtClose += currentTicketDeferredAmount;
          process.stdout.write(`[LOG_AFTER_ACCUM_PUT] Ticket_ID: ${t.id}, Added_Deferred: ${currentTicketDeferredAmount}, current_calcDefAtClose: ${calculatedDeferredAtClose}\n`);
        } else {
          // If no current deferred payment, ensure ticket state is clean.
          if (t.hasOpenDebt || t.dueAmount !== 0) {
            await tx.ticket.update({ where: { id: t.id }, data: { hasOpenDebt: false, dueAmount: 0 } });
            console.log(`[TICKET_UPDATE_PUT] Ensured ticket ${t.id} hasOpenDebt=false, dueAmount=0 as no current deferred payments.`);
          }
          // Also, if there was an existing debt for this ticket, it might need to be marked as RESOLVED.
          // This part of the logic might need further refinement based on business rules for resolving old debts.
          const existingDebt = await tx.debtLedger.findFirst({ where: { ticketId: t.id, systemId, status: 'PENDING' } });
          if (existingDebt) {
            await tx.debtLedger.update({
              where: { id: existingDebt.id },
              data: { status: 'PAID', pendingAmount: 0, updatedAt: new Date() }
            });
            console.log(`[DEBT_PAID_PUT] Marked existing PENDING DebtLedger ${existingDebt.id} for ticket ${t.id} as PAID.`);
          }
        }
      }
      process.stdout.write(`[LOG_BEFORE_DB_UPDATE_PUT] Final_calcDefAtClose: ${calculatedDeferredAtClose}, Type: ${typeof calculatedDeferredAtClose}\n`);
      // END: Logic for calculatedDeferredAtClose

      const closedSession = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          countedCash,
          countedCard: countedCard ?? undefined,
          countedBankTransfer: countedBankTransfer ?? undefined,
          countedCheck: countedCheck ?? undefined,
          countedInternalCredit: countedInternalCredit ?? undefined,
          countedOther: countedOther ? countedOther as Prisma.InputJsonValue : Prisma.JsonNull,
          notes: notes ?? undefined,
          expectedCash,
          differenceCash,
          closingTime: new Date(),
          status: newStatus,
          hasChangesAfterReconcile: false,
          manualCashInput: manualCashInput ?? 0,
            cashWithdrawals: cashWithdrawals ?? 0,
          calculatedDeferredAtClose, // ADDED THIS
        },
      });

      // 1) Update status of tickets associated with this session to ACCOUNTED.
      // This logic might need refinement if tickets can be disassociated or moved between sessions before closure.
      // For now, we assume all 'associatedTickets' should be marked as ACCOUNTED under this session.
      const associatedTicketIds = associatedTickets.map(t => t.id);
      if (associatedTicketIds.length > 0) {
        await tx.ticket.updateMany({
          where: {
            id: { in: associatedTicketIds },
            // Ensure we only update tickets that are not already in a 'final' state from another perspective
            // or are explicitly meant to be re-accounted by this session closure.
            // For now, we'll update all associated tickets if their status isn't already ACCOUNTED by this session.
            NOT: {
              AND: [
                { status: TicketStatus.ACCOUNTED },
                { cashSessionId: sessionId }
              ]
            }
          },
          data: {
            status: TicketStatus.ACCOUNTED,
            cashSessionId: sessionId, // Explicitly ensure they are linked to this session
          },
        });
        console.log(`[CASH_CLOSE_PUT] Ensured ${associatedTicketIds.length} tickets associated with session ${sessionId} are marked ACCOUNTED.`);
      }


      // 2) Obtener ahora todos los tickets ACCOUNTED dentro de la sesión (ya incluyen los actualizados)
      const accountedTickets = await tx.ticket.findMany({
        where: { cashSessionId: sessionId, status: 'ACCOUNTED' },
        include: {
          payments: { include: { paymentMethodDefinition: true } },
          clinic: true,
        },
      });

      console.log('[CASH CLOSE] Tickets ACCOUNTED en sesión', accountedTickets.map(t => t.id));

      if (accountedTickets.length > 0) {
        for (const t of accountedTickets) {
          const deferredPayments = t.payments.filter(p => {
            const def = p.paymentMethodDefinition;
            const isDeferred = !def ? false : (def.type === 'DEFERRED_PAYMENT' || def.code === 'SYS_DEFERRED_PAYMENT');
            return isDeferred;
          });
          const totalDeferred = deferredPayments.reduce((s, p) => s + p.amount, 0);
          if (totalDeferred > 0.009) {
            console.log('[DEFERRED DETECT] Ticket', t.id, 'Total', totalDeferred, 'NumPagos', deferredPayments.length);
            console.log('[DEBUG] ticket personId', t.personId, 'clinicId', t.clinicId);
            const existing = await tx.debtLedger.findFirst({where:{ticketId:t.id}});
            if(existing){
              console.log('[DEBT UPDATE] antes', existing);
              await tx.debtLedger.update({where:{id:existing.id},data:{originalAmount:totalDeferred,pendingAmount:totalDeferred-existing.paidAmount,status: existing.paidAmount>0 ? 'PARTIALLY_PAID':'PENDING'}});
              console.log('[DEBT UPDATE] después', totalDeferred-existing.paidAmount);
            }else if(t.personId){
              await tx.debtLedger.create({
                data: {
                  ticketId: t.id,
                  personId: t.personId,
                  clinicId: t.clinicId,
                  originalAmount: totalDeferred,
                  paidAmount: 0,
                  pendingAmount: totalDeferred,
                  status: 'PENDING',
                  systemId: closedSession.systemId,
                },
              });
              console.log('[DEBT CREATED] Ticket', t.id, 'Debt', totalDeferred);
              await tx.entityChangeLog.create({data:{entityId:t.id,entityType:'TICKET',action:'DEBT_CREATED',userId,systemId:closedSession.systemId,details:{amount:totalDeferred}}});
            }
            await tx.ticket.update({where:{id:t.id},data:{hasOpenDebt:true,dueAmount:totalDeferred}});
          }
        }
      }
      
      // Crear log de cierre
      await tx.entityChangeLog.create({
        data:{
          entityId: sessionId,
          entityType: 'CASH_SESSION' as any,
          action: 'CLOSE',
          userId,
          systemId: closedSession.systemId,
          details: {
            countedCash,
            differenceCash,
            expectedCash
          } as any
        }
      });

      // START: Recalculate openingBalanceCash for the next open session
      const effectiveFinalCashForNext = (validation.data.countedCash ?? 0) - (validation.data.cashWithdrawals ?? 0);

      console.log(`[CASH_CASCADE_DEBUG] effectiveFinalCashForNext: ${effectiveFinalCashForNext}`);
      console.log(`[CASH_CASCADE_DEBUG] Searching for next open session for clinicId: ${cashSessionToClose.clinicId} after closingTime: ${closedSession.closingTime}`);

      const nextOpenSessionToUpdate = await tx.cashSession.findFirst({
        where: {
          clinicId: cashSessionToClose.clinicId, // Solo clinicId
          status: CashSessionStatus.OPEN,
          openingTime: { gt: closedSession.openingTime }, // Use openingTime of the session being closed for correct sequencing // Solo sesiones que abrieron DESPUÉS de que esta cerró
        },
        orderBy: { openingTime: 'asc' }, // La más próxima en abrir
      });

      if (nextOpenSessionToUpdate) {
        console.log(`[CASH_CASCADE_DEBUG] Found nextOpenSessionToUpdate: ID=${nextOpenSessionToUpdate.id}, current openingBalanceCash=${nextOpenSessionToUpdate.openingBalanceCash}`);
        let currentNextOpeningBalance: number | null = null;
        if (nextOpenSessionToUpdate.openingBalanceCash !== null) {
          // Si no es null, Prisma nos da un objeto Decimal o ya es un número
          const obCash = nextOpenSessionToUpdate.openingBalanceCash;
          if (typeof obCash === 'number') {
            currentNextOpeningBalance = obCash;
          } else if (obCash && typeof (obCash as any).toNumber === 'function') { // Duck typing for Decimal
            currentNextOpeningBalance = (obCash as any).toNumber();
          } else {
            console.warn(`[CASH_CASCADE_DEBUG] Unexpected type or null value for nextOpenSessionToUpdate.openingBalanceCash: ${typeof obCash}, value: ${obCash}. Defaulting to null.`);
            currentNextOpeningBalance = null; // Or handle as an error if strictness is required
          }
        }
        console.log(`[CASH_CASCADE_DEBUG] Comparing currentNextOpeningBalance (${currentNextOpeningBalance}) with effectiveFinalCashForNext (${effectiveFinalCashForNext})`);
        if (currentNextOpeningBalance !== effectiveFinalCashForNext) {
          await tx.cashSession.update({
            where: { id: nextOpenSessionToUpdate.id },
            data: { openingBalanceCash: effectiveFinalCashForNext },
          });
          console.log(`[CASH_CASCADE_UPDATE] Updated openingBalanceCash for next session ${nextOpenSessionToUpdate.id} from ${currentNextOpeningBalance} to ${effectiveFinalCashForNext}`);
          
          await tx.entityChangeLog.create({
            data: {
              entityId: nextOpenSessionToUpdate.id,
              entityType: 'CASH_SESSION' as any, 
              action: 'AUTO_UPDATE_OPENING_BALANCE',
              userId: userId, // User who triggered the close of the previous session
              systemId: closedSession.systemId, 
              details: {
                previousOpeningBalance: currentNextOpeningBalance,
                newOpeningBalance: effectiveFinalCashForNext,
                triggeredBySessionId: closedSession.id,
              } as any, 
            },
          });
        }
      } else {
        console.log(`[CASH_CASCADE_DEBUG] No nextOpenSessionToUpdate found, or its openingBalanceCash already matches effectiveFinalCashForNext.`);
      }

      // END: Recalculate openingBalanceCash for the next open session

      // Devolver los totales calculados también, similar al GET de sesión
      const finalSessionWithDetails = await tx.cashSession.findUnique({
        where: { id: sessionId },
        include: {
          payments: { include: { paymentMethodDefinition: true, posTerminal: true } },
          user: { select: { id:true, firstName:true, lastName:true}},
          clinic: { select: {id:true, name:true}},
          posTerminal: {select: {id:true, name:true}},
        }
      });

      if (!finalSessionWithDetails) throw new Error("No se pudo recargar la sesión cerrada.");

      // Calcular totales por método de pago
      const paymentTotals: Record<string, { amount: number, type: PaymentMethodType, posTerminalId?: string | null, posTerminalName?: string | null }> = {};
      finalSessionWithDetails.payments.forEach(p => {
        if (!p.paymentMethodDefinition) return;
        const key = `${p.paymentMethodDefinition.type}${p.posTerminalId ? `_${p.posTerminalId}` : ''}`;
        if (!paymentTotals[key]) {
          paymentTotals[key] = { amount: 0, type: p.paymentMethodDefinition.type, posTerminalId: p.posTerminalId, posTerminalName: (p as any).posTerminal?.name };
        }
        paymentTotals[key].amount += p.type === 'DEBIT' ? p.amount : -p.amount;
      });

      return { 
        ...finalSessionWithDetails,
        paymentTotals: Object.values(paymentTotals),
        ticketsAccountedCount: accountedTickets.length
      };
    });

    return NextResponse.json(updatedCashSession, { status: 200 });

  } catch (error: any) {
    console.error(`Error al cerrar CashSession ${id}:`, error);
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ message: 'Sesión de caja no encontrada.' }, { status: 404 });
      }
      if (error.message === 'ALREADY_CLOSED_OR_RECONCILED') {
        return NextResponse.json({ message: 'La sesión de caja ya está cerrada o conciliada.' }, { status: 409 });
      }
      if (error.message === 'EARLIER_SESSION_OPEN') {
        return NextResponse.json({ message: 'No se puede cerrar esta sesión. Una sesión anterior para esta clínica/TPV sigue abierta y debe cerrarse primero.' }, { status: 409 });
      }
      if (error.message === 'SYSTEM_ID_MISSING_ON_SESSION') {
        return NextResponse.json({ message: 'Error de configuración interna (systemId). Contacte a soporte.' }, { status: 500 });
      }
      console.error('[CASH_SESSION_PUT_ERROR]', error.message, error.stack);
      return NextResponse.json({ message: `Error al actualizar la sesión de caja: ${error.message}` }, { status: 500 });
    }
    // Fallback for errors that are not instances of Error
    return NextResponse.json({ message: 'Error interno desconocido al cerrar la sesión de caja.' }, { status: 500 });
  }
}