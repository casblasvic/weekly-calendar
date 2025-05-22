import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
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
            client: { // Cliente del ticket
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
  countedOther: z.record(z.string(), z.number()).optional().nullable(),
  notes: z.string().optional().nullable(),
  countedCashWithdrawal: z.number().optional().nullable(),
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
      countedCashWithdrawal,
      notes
    } = validation.data;

    // TODO: Implementar verificación de permisos del usuario para cerrar esta CashSession.

    const updatedCashSession = await prisma.$transaction(async (tx) => {
      const cashSessionToClose = await tx.cashSession.findUnique({
        where: { id: sessionId },
        include: {
          payments: {
            where: { paymentMethodDefinition: { type: 'CASH' } },
            select: { amount: true, type: true }
          }
        }
      });

      if (!cashSessionToClose) {
        throw new Error('NOT_FOUND');
      }
      if (cashSessionToClose.status !== 'OPEN') {
        throw new Error('ALREADY_CLOSED_OR_RECONCILED');
      }

      let expectedCash = cashSessionToClose.openingBalanceCash;
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
          // cashWithdrawal: countedCashWithdrawal, // Este campo no existe en el modelo CashSession, se maneja como un recuento para la UI
        },
      });

      // 1) Marcar como ACCOUNTED todos los tickets Cerrados de la clínica que aún no lo estén y asociarlos a esta sesión
      await tx.ticket.updateMany({
        where: {
          status: 'CLOSED',
          clinicId: closedSession.clinicId,
        },
        data: {
          status: 'ACCOUNTED',
          cashSessionId: sessionId,
        },
      });

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
            console.log('[DEBUG] ticket clientId', t.clientId, 'clinicId', t.clinicId);
            const existing = await tx.debtLedger.findFirst({where:{ticketId:t.id}});
            if(existing){
              console.log('[DEBT UPDATE] antes', existing);
              await tx.debtLedger.update({where:{id:existing.id},data:{originalAmount:totalDeferred,pendingAmount:totalDeferred-existing.paidAmount,status: existing.paidAmount>0 ? 'PARTIALLY_PAID':'PENDING'}});
              console.log('[DEBT UPDATE] después', totalDeferred-existing.paidAmount);
            }else if(t.clientId){
              await tx.debtLedger.create({
                data: {
                  ticketId: t.id,
                  clientId: t.clientId!,
                  clinicId: t.clinicId!,
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
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ message: 'Sesión de caja no encontrada.' }, { status: 404 });
    }
    if (error.message === 'ALREADY_CLOSED_OR_RECONCILED') {
      return NextResponse.json({ message: 'La sesión de caja ya está cerrada o conciliada.' }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: 'Error de validación de datos.', errors: error.format() }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al cerrar la sesión de caja.' }, { status: 500 });
  }
} 