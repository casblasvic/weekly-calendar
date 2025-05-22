import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { PaymentType, Prisma, TicketStatus } from '@prisma/client';

// Esquema para el cuerpo de la petición al crear un pago
const createPaymentSchema = z.object({
  ticketId: z.string().cuid({ message: "ID de ticket inválido." }),
  amount: z.number().positive({ message: "El monto debe ser positivo." }),
  paymentDate: z.string().datetime({ message: "Fecha de pago inválida." }).optional(),
  paymentMethodDefinitionId: z.string().cuid({ message: "ID de método de pago inválido." }),
  transactionReference: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  bankAccountId: z.string().cuid().optional().nullable(), // Para transferencias, cheques
  posTerminalId: z.string().cuid().optional().nullable(), // Para pagos con TPV físico
  // paymentType: z.nativeEnum(PaymentType).default(PaymentType.DEBIT), // DEBIT (ingreso), CREDIT (devolución/salida)
  // Por ahora, asumimos que todos los pagos creados desde aquí son DEBIT (ingresos para el ticket)
  // Las devoluciones (CREDIT) se gestionarían a través de tickets de devolución.
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId, id: userId } = session.user;

    const body = await request.json();
    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de pago inválidos', errors: validation.error.format() }, { status: 400 });
    }
    const paymentData = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: paymentData.ticketId, systemId: systemId },
        include: { clinic: { select: { id: true } } } 
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado.');
      }

      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error('Solo se pueden añadir pagos a tickets en estado OPEN.');
      }

      const existingPayments = await tx.payment.findMany({
        where: { ticketId: ticket.id, debtLedgerId: null } 
      });
      const totalCurrentlyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Validar que el nuevo pago no sobrepase el monto final del ticket
      if (ticket.finalAmount - totalCurrentlyPaid - paymentData.amount < -0.009) { // Margen para errores de flotantes
        throw new Error(`El importe del pago excede el saldo pendiente del ticket. Pendiente: ${(ticket.finalAmount - totalCurrentlyPaid).toFixed(2)}`);
      }

      let activeCashSessionId: string | null = null;
      if (ticket.clinicId) {
        const activeCashSession = await tx.cashSession.findFirst({
          where: {
            clinicId: ticket.clinicId,
            posTerminalId: paymentData.posTerminalId, 
            status: 'OPEN',
            systemId: systemId,
          },
          select: { id: true }
        });
        if (activeCashSession) {
          activeCashSessionId = activeCashSession.id;
        }
      }

      const newPayment = await tx.payment.create({
        data: {
          ticketId: paymentData.ticketId,
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          paymentMethodDefinitionId: paymentData.paymentMethodDefinitionId,
          transactionReference: paymentData.transactionReference,
          notes: paymentData.notes,
          bankAccountId: paymentData.bankAccountId,
          posTerminalId: paymentData.posTerminalId,
          cashSessionId: activeCashSessionId, 
          userId: userId,
          systemId: systemId,
          type: PaymentType.DEBIT, 
        },
      });

      // Actualizar paidAmountDirectly en el Ticket
      const updatedTicket = await tx.ticket.update({
        where: { id: paymentData.ticketId },
        data: {
          paidAmountDirectly: { increment: newPayment.amount }
        },
        select: { // Devolver solo los campos necesarios para la UI y la lógica de TanStack Query
            id: true,
            finalAmount: true,
            paidAmountDirectly: true,
            dueAmount: true, // Aunque no lo actualizamos aquí, puede ser útil para el frontend saber su valor actual (foto fija)
            hasOpenDebt: true,
            status: true,
            payments: { // Devolver la lista actualizada de pagos directos podría ser útil para la UI
                where: { debtLedgerId: null },
                orderBy: { paymentDate: 'asc' },
                select: { id: true, amount: true, paymentDate: true, paymentMethodDefinition: {select: {id:true, name:true, type:true}} }
            }
        }
      });

      return { newPayment, updatedTicketPartial: updatedTicket };
    });

    // Devolver el pago creado y la información parcial del ticket actualizada
    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[API_PAYMENTS_POST] Error creating payment:`, error);
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("Solo se pueden añadir pagos") ? 403 :
                   error.message?.includes("excede el saldo pendiente") ? 400 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al crear el pago.' }, { status });
  }
} 