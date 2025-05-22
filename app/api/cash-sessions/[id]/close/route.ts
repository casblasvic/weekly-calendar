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

      // Verificar que no existan pagos de transferencia/cheque sin verificar en esta sesión
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

      // Calcular expectedCash basado en openingBalanceCash y los pagos tipo CASH en la sesión
      const cashPaymentsTotal = cashSession.payments
        .filter(p => p.paymentMethodDefinition?.type === 'CASH' && p.type === 'DEBIT')
        .reduce((sum, p) => sum + p.amount, 0);
      const cashRefundsTotal = cashSession.payments
        .filter(p => p.paymentMethodDefinition?.type === 'CASH' && p.type === 'CREDIT')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const expectedCash = cashSession.openingBalanceCash + cashPaymentsTotal - cashRefundsTotal;

      const differenceCash = (countedCash !== undefined) ? countedCash - expectedCash : null;

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
          countedOther: countedOther ? countedOther as Prisma.InputJsonValue : Prisma.JsonNull, // Cast a Prisma.InputJsonValue
          // cashWithdrawal, // Asumiendo que cashWithdrawal no es un campo de CashSession directamente
          notes,
          expectedCash,
          differenceCash,
        },
      });

      // Marcar todos los tickets asociados a esta sesión (con status CLOSED) como ACCOUNTED
      const ticketsAccounted = await tx.ticket.updateMany({
        where: {
          cashSessionId: sessionId,
          status: TicketStatus.CLOSED,
          systemId,
        },
        data: { status: TicketStatus.ACCOUNTED },
      });

      // ---- CREAR/ACTUALIZAR DEBTS PARA TICKETS ACCOUNTED ----
      if (ticketsAccounted.count > 0) {
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
          const totalDeferred = deferredPayments.reduce((s,p)=>s+p.amount,0);
          if (totalDeferred > 0.009) {
            // comprobar debt existente
            const existingDebt = await tx.debtLedger.findFirst({ where: { ticketId: t.id, systemId } });
            if (existingDebt) {
              await tx.debtLedger.update({
                where: { id: existingDebt.id },
                data: {
                  originalAmount: totalDeferred,
                  pendingAmount: totalDeferred - existingDebt.paidAmount,
                  status: existingDebt.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING',
                },
              });
            } else {
              if (!t.clientId) continue; // safety
              await tx.debtLedger.create({
                data: {
                  ticketId: t.id,
                  clientId: t.clientId!,
                  clinicId: t.clinicId!,
                  originalAmount: totalDeferred,
                  paidAmount: 0,
                  pendingAmount: totalDeferred,
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
                  details: { amount: totalDeferred },
                },
              });
            }
            await tx.ticket.update({ where: { id: t.id }, data: { hasOpenDebt: true, dueAmount: totalDeferred } });
          }
        }
      }

      return [closedSession, ticketsAccounted];
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