import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { CashSessionStatus, TicketStatus, Prisma } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de sesión inválido." }),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId, id: userId } = session.user; // userId es quien realiza la acción

    const paramsValidation = paramsSchema.safeParse({id});
    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'ID de sesión inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const sessionId = paramsValidation.data.id;

    // TODO: Verificar permisos del usuario para reabrir esta caja específica

    const updatedSession = await prisma.$transaction(async (tx) => {
      const cashSessionToReopen = await tx.cashSession.findUnique({
        where: { id: sessionId, systemId },
      });

      if (!cashSessionToReopen) {
        throw new Error('CASH_SESSION_NOT_FOUND');
      }

      if (cashSessionToReopen.status === CashSessionStatus.OPEN) {
        throw new Error('CASH_SESSION_NOT_CLOSED');
      }

      // Construir notas nuevas preservando historial
      const logLines: string[] = [];
      if(cashSessionToReopen.closingTime){
        logLines.push(`Cierre registrado el ${cashSessionToReopen.closingTime.toISOString()}`);
      }

      const newNotes = [cashSessionToReopen.notes, ...logLines, `Reabierta por ${session.user.email} el ${new Date().toISOString()}`].filter(Boolean).join('\n');

      // Reabrir la sesión de caja
      const reopenedSession = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          status: CashSessionStatus.OPEN,
          closingTime: null,
          hasChangesAfterReconcile: cashSessionToReopen.status === CashSessionStatus.RECONCILED ? true : cashSessionToReopen.hasChangesAfterReconcile,
          expectedCash: null,
          countedCash: null,
          differenceCash: null,
          countedCard: null,
          countedBankTransfer: null,
          countedCheck: null,
          countedInternalCredit: null,
          countedOther: null,
          notes: newNotes,
          // No modificar openingBalanceCash ni openingTime
          // manualCashInput and cashWithdrawals will persist their values from before reopening.
          reconciliationTime: null, // Anular tiempo de reconciliación anterior
          calculatedDeferredAtClose: null, // Anular cálculo de diferidos anterior (o 0 si es Decimal no nullable)
        },
      });

      // Devolver tickets asociados de ACCOUNTED a CLOSED
      await tx.ticket.updateMany({
        where: {
          cashSessionId: sessionId,
          systemId,
          status: TicketStatus.ACCOUNTED,
        },
        data: {
          status: TicketStatus.CLOSED,
        },
      });

      await tx.entityChangeLog.create({
        data:{
          entityId: sessionId,
          entityType: 'CASH_SESSION' as any,
          action: 'REOPEN',
          userId,
          systemId,
          details: {} as any
        }
      });

      // Lógica para ajustar la siguiente caja abierta si existe
      if (reopenedSession.clinicId) { // clinicId es mandatorio
        const nextOpenSession = await tx.cashSession.findFirst({
          where: {
            clinicId: reopenedSession.clinicId,
            // posTerminalId ya no es un criterio para la secuencia de cajas de una clínica
            openingTime: { gt: reopenedSession.openingTime },
            status: CashSessionStatus.OPEN,
          },
          orderBy: {
            openingTime: 'asc',
          },
        });

        if (nextOpenSession) {
          // Encontramos la siguiente caja abierta (Caja B).
          // Ahora buscamos la caja cerrada anterior a la que reabrimos (Caja A)
          const previousClosedSessionToReopened = await tx.cashSession.findFirst({
            where: {
              clinicId: reopenedSession.clinicId,
              // posTerminalId ya no es un criterio para la secuencia de cajas de una clínica
              openingTime: { lt: reopenedSession.openingTime },
              status: CashSessionStatus.CLOSED,
              closingTime: { not: null },
              countedCash: { not: null },
            },
            orderBy: {
              openingTime: 'desc',
            },
          });

          let newOpeningBalanceForNextSession = new Prisma.Decimal(0);
          if (previousClosedSessionToReopened) {
            const prevCountedCashDecimal = new Prisma.Decimal(previousClosedSessionToReopened.countedCash || 0);
            const prevCashWithdrawalsDecimal = new Prisma.Decimal(previousClosedSessionToReopened.cashWithdrawals || 0);
            newOpeningBalanceForNextSession = prevCountedCashDecimal.sub(prevCashWithdrawalsDecimal);
          }

          // Actualizar el openingBalanceCash de la nextOpenSession (Caja B)
          await tx.cashSession.update({
            where: { id: nextOpenSession.id },
            data: {
              openingBalanceCash: newOpeningBalanceForNextSession.toNumber(), // Usar 'set' explícito
              notes: `${nextOpenSession.notes || ''}\nSaldo inicial ajustado el ${new Date().toISOString()} debido a reapertura de caja anterior (ID: ${reopenedSession.id}).`.trim(),
            },
          });

          // Registrar este cambio también
          await tx.entityChangeLog.create({
            data: {
              entityId: nextOpenSession.id,
              entityType: 'CASH_SESSION' as any,
              action: 'UPDATE_OPENING_BALANCE',
              userId,
              systemId,
              details: {
                reason: `Reapertura de caja ${reopenedSession.id}`,
                oldOpeningBalance: nextOpenSession.openingBalanceCash?.toString(),
                newOpeningBalance: newOpeningBalanceForNextSession.toNumber().toString(),
              } as Prisma.JsonValue,
            },
          });
        }
      }

      return reopenedSession;
    });

    return NextResponse.json(updatedSession, { status: 200 });

  } catch (error: any) {
    console.error('[API_CASH_SESSIONS_REOPEN_PATCH]', error);
    let errorMessage = 'Error interno del servidor al reabrir la sesión de caja.';
    let statusCode = 500;

    if (error.message === 'CASH_SESSION_NOT_FOUND') {
      errorMessage = 'Sesión de caja no encontrada.';
      statusCode = 404;
    } else if (error.message === 'CASH_SESSION_NOT_CLOSED') {
      errorMessage = 'Solo se pueden reabrir sesiones de caja que estén cerradas.';
      statusCode = 400;
    }
    
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
} 