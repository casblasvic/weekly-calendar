import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { CashSessionStatus, TicketStatus, Prisma } from '@prisma/client';

const closeCashSessionSchema = z.object({
  countedCash: z.number().min(0).optional(),
  countedCard: z.number().min(0).optional(),
  countedBankTransfer: z.number().min(0).optional(),
  countedCheck: z.number().min(0).optional(),
  countedInternalCredit: z.number().min(0).optional(),
  countedOther: z.record(z.string(), z.number().min(0)).optional(), // Ejemplo: { "Bizum": 10.0, "Vales": 5.0 }
  cashWithdrawal: z.number().min(0).optional(), // Cantidad retirada
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }

    const sessionId = params.id;
    if (!sessionId) {
      return NextResponse.json({ message: 'ID de sesión es requerido' }, { status: 400 });
    }

    const body = await request.json();
    const validation = closeCashSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos', errors: validation.error.format() }, { status: 400 });
    }

    const { countedCash, countedCard, countedBankTransfer, countedCheck, countedInternalCredit, countedOther, cashWithdrawal, notes } = validation.data;

    const systemId = session.user.systemId;
    const userId = session.user.id;

    const [updatedSession, ticketsUpdateResult] = await prisma.$transaction(async (tx) => {
      const cashSession = await tx.cashSession.findUnique({
        where: { id: sessionId, systemId },
        include: { payments: { include: { paymentMethodDefinition: true } } }
      });

      if (!cashSession) {
        throw new Error('Sesión de caja no encontrada.');
      }
      if (cashSession.status !== CashSessionStatus.OPEN) {
        throw new Error('La sesión de caja no está abierta y no puede ser cerrada.');
      }

      const pendingVerifications = await tx.payment.count({
        where: {
          cashSessionId: sessionId,
          paymentMethodDefinition: { type: { in: ['BANK_TRANSFER', 'CHECK'] } },
          // @ts-ignore relación opcional
          verification: { is: null },
        },
      });
      if (pendingVerifications > 0) {
        throw new Error('Existen pagos de transferencia o cheque sin verificar.');
      }

      const cashPaymentsTotal = cashSession.payments
        .filter(p => p.paymentMethodDefinition?.type === 'CASH' && p.type === 'DEBIT')
        .reduce((sum, p) => sum + p.amount, 0);
      const cashRefundsTotal = cashSession.payments
        .filter(p => p.paymentMethodDefinition?.type === 'CASH' && p.type === 'CREDIT')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const expectedCash = cashSession.openingBalanceCash + cashPaymentsTotal - cashRefundsTotal;
      const differenceCash = (countedCash !== undefined) ? countedCash - expectedCash : null;

      // Marcar todos los tickets asociados a esta sesión (con status CLOSED) como ACCOUNTED
      const ticketsAccountedUpdateResult = await tx.ticket.updateMany({
        where: {
          cashSessionId: sessionId,
          status: TicketStatus.CLOSED,
          systemId,
        },
        data: { status: TicketStatus.ACCOUNTED },
      });

      let calculatedDeferredAtClose = 0;

      // ---- CREAR/ACTUALIZAR DEBTS PARA TICKETS ACCOUNTED Y CALCULAR TOTAL APLAZADO ----
      if (ticketsAccountedUpdateResult.count > 0) {
        const accountedTickets = await tx.ticket.findMany({
          where: { cashSessionId: sessionId, status: TicketStatus.ACCOUNTED, systemId },
          include: { payments: { include: { paymentMethodDefinition: true } }, clinic: true },
        });

        for (const t of accountedTickets) {
          const deferredPayments = t.payments.filter(p => {
            const def = p.paymentMethodDefinition;
            const isDeferred = !def || def.type === 'DEFERRED_PAYMENT' || def.code === 'SYS_DEFERRED_PAYMENT';
            if (isDeferred) {
              console.log('[DEFERRED-DETECT]', t.id, p.id, p.paymentMethodDefinitionId, def?.type, p.amount);
            }
            return isDeferred;
          });
          const totalDeferredForTicket = deferredPayments.reduce((s,p)=>s+p.amount,0);

          if (totalDeferredForTicket > 0.009) { 
            const existingDebt = await tx.debtLedger.findFirst({ where: { ticketId: t.id, systemId } });
            if (existingDebt) {
              await tx.debtLedger.update({
                where: { id: existingDebt.id },
                data: {
                  originalAmount: totalDeferredForTicket,
                  pendingAmount: totalDeferredForTicket - existingDebt.paidAmount,
                  status: (totalDeferredForTicket - existingDebt.paidAmount) < 0.009 ? 'PAID' : (existingDebt.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING'),
                },
              });
            } else {
              // Cambiar validación a personId
              if (!t.personId) {
                console.warn(`Ticket ${t.id} no tiene personId, no se puede crear deuda. Se marcará sin deuda pendiente.`);
                await tx.ticket.update({ where: { id: t.id }, data: { hasOpenDebt: false, dueAmount: 0 } });
                continue; 
              }
              await tx.debtLedger.create({
                data: {
                  ticketId: t.id,
                  personId: t.personId!, // Cambiar a personId
                  clinicId: t.clinicId!,
                  originalAmount: totalDeferredForTicket,
                  paidAmount: 0,
                  pendingAmount: totalDeferredForTicket,
                  status: 'PENDING',
                  systemId,
                },
              });
              await tx.entityChangeLog.create({
                data: {
                  entityId: t.id,
                  entityType: 'TICKET',
                  action: 'DEBT_CREATED',
                  userId,
                  systemId,
                  details: { amount: totalDeferredForTicket },
                },
              });
            }
            await tx.ticket.update({ where: { id: t.id }, data: { hasOpenDebt: true, dueAmount: totalDeferredForTicket } });
            calculatedDeferredAtClose += totalDeferredForTicket;
            process.stdout.write(`[LOG_AFTER_ACCUM] Ticket_ID: ${t.id}, current_calcDefAtClose: ${calculatedDeferredAtClose}\n`);
          } else {
             const existingDebt = await tx.debtLedger.findFirst({ where: { ticketId: t.id, systemId } });
             if(existingDebt && existingDebt.pendingAmount > 0.009) {
                await tx.debtLedger.update({
                    where: {id: existingDebt.id},
                    data: {pendingAmount: 0, status: 'PAID'}
                });
             }
            await tx.ticket.update({ where: { id: t.id }, data: { hasOpenDebt: false, dueAmount: 0 } });
          }
        }
      }

      process.stdout.write(`[LOG_BEFORE_DB_UPDATE] Final_calcDefAtClose: ${calculatedDeferredAtClose}, Type: ${typeof calculatedDeferredAtClose}\n`);
      
      const closedSession = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          closingTime: new Date(),
          status: CashSessionStatus.CLOSED,
          countedCash,
          countedCard,
          countedBankTransfer,
          countedCheck,
          countedInternalCredit,
          countedOther: countedOther ? countedOther as Prisma.InputJsonValue : Prisma.JsonNull,
          notes,
          expectedCash,
          differenceCash,
          calculatedDeferredAtClose, 
        },
      });

      return [closedSession, ticketsAccountedUpdateResult];
    });

    return NextResponse.json({ ...updatedSession, ticketsAccountedCount: ticketsUpdateResult.count }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
    console.error("[API_CASH_SESSIONS_CLOSE_PATCH]", error);
    const status = errorMessage.includes("no encontrada") ? 404 :
                   errorMessage.includes("no está abierta") ? 400 : 500;
    return NextResponse.json({ message: errorMessage }, { status });
  }
} 