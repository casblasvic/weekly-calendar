import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { DebtStatus, PaymentType, PaymentMethodType, TicketStatus, TicketItemType } from '@prisma/client';
import { ensureCashSessionForOperation, generateNextTicketNumber } from '@/lib/db-helpers';

const createDebtPaymentSchema = z.object({
  debtLedgerId: z.string().cuid({ message: "ID de deuda inválido." }),
  amount: z.number().positive({ message: "El importe debe ser positivo." }),
  paymentMethodDefinitionId: z.string().cuid({ message: "ID de método de pago inválido." }),
  paymentDate: z.string().datetime({ message: "Fecha de pago inválida." }).optional(),
  clinicId: z.string().cuid({ message: "ID de clínica donde se cobra es inválido." }),
  notes: z.string().optional(),
  transactionReference: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId, id: userId } = session.user;

    const body = await request.json();
    const validation = createDebtPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos', errors: validation.error.format() }, { status: 400 });
    }

    const {
      debtLedgerId,
      amount,
      paymentMethodDefinitionId,
      paymentDate,
      clinicId: clinicOfPayment,
      notes,
      transactionReference,
    } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      const debtLedger = await tx.debtLedger.findUnique({
        where: { id: debtLedgerId, systemId },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              currencyCode: true,
              sellerUserId: true,
              clinicId: true,
              finalAmount: true,
            },
          },
        },
      });

      if (!debtLedger) throw new Error(`Deuda con ID ${debtLedgerId} no encontrada o no pertenece al sistema ${systemId}.`);

      const clinicIdForOperation = debtLedger.clinicId;

      if (debtLedger.status === DebtStatus.PAID) throw new Error('Esta deuda ya ha sido completamente saldada.');
      if (debtLedger.status === DebtStatus.CANCELLED) throw new Error('Esta deuda está cancelada y no admite pagos.');
      if (amount > debtLedger.pendingAmount + 0.01) {
        throw new Error(`El importe del pago (S/.${amount.toFixed(2)}) excede el saldo pendiente (S/.${debtLedger.pendingAmount.toFixed(2)}).`);
      }

      const paymentMethod = await tx.paymentMethodDefinition.findUnique({
        where: { id: paymentMethodDefinitionId, systemId },
        include: {
          clinicSettings: {
            where: { clinicId: clinicIdForOperation, isActiveInClinic: true },
            select: { id: true },
          },
        },
      });

      if (!paymentMethod) throw new Error('Método de pago inválido.');
      if (paymentMethod.type === PaymentMethodType.DEFERRED_PAYMENT) throw new Error('No se puede utilizar el método de pago de tipo Aplazado para liquidar deudas.');
      const isActiveInClinic = paymentMethod.clinicSettings && paymentMethod.clinicSettings.length > 0;
      if (!isActiveInClinic && !paymentMethod.isActive) throw new Error('El método de pago no está activo.');

      const cashSessionForPayment = await ensureCashSessionForOperation(tx, clinicIdForOperation, userId, systemId);

      const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
      const startOfDay = new Date(paymentDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(paymentDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const existingSettlementTicket = await tx.ticket.findFirst({
        where: {
          systemId,
          clinicId: clinicIdForOperation,
          personId: debtLedger.personId,
          issueDate: { gte: startOfDay, lte: endOfDay },
          items: { some: { itemType: TicketItemType.DEBT_LIQUIDATION } },
        },
        orderBy: { createdAt: 'asc' },
      });

      let newLiquidationTicket;
      if (existingSettlementTicket) {
        newLiquidationTicket = await tx.ticket.update({
          where: { id: existingSettlementTicket.id },
          data: {
            finalAmount: { increment: amount },
            totalAmount: { increment: amount },
            items: {
              create: {
                itemType: TicketItemType.DEBT_LIQUIDATION,
                description: `Liquidación deuda Ticket #${debtLedger.ticket.ticketNumber}`,
                quantity: 1,
                unitPrice: amount,
                finalPrice: amount,
                vatRateId: null,
                vatAmount: 0,
              },
            },
            payments: {
              create: {
                systemId,
                amount,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                paymentMethodDefinitionId,
                userId,
                clinicId: clinicIdForOperation,
                cashSessionId: cashSessionForPayment.id,
                type: PaymentType.DEBIT,
                status: 'COMPLETED',
                notes,
                transactionReference,
                payerPersonId: debtLedger.personId,
                debtLedgerId,
              },
            },
          },
        });
      } else {
        const newLiquidationTicketNumber = await generateNextTicketNumber(tx, systemId, clinicIdForOperation);

        newLiquidationTicket = await tx.ticket.create({
          data: {
            systemId,
            clinicId: clinicIdForOperation,
            personId: debtLedger.personId,
            sellerUserId: debtLedger.ticket.sellerUserId || userId,
            cashierUserId: userId,
            issueDate: new Date(),
            ticketNumber: newLiquidationTicketNumber,
            status: TicketStatus.CLOSED,
            finalAmount: amount,
            totalAmount: amount,
            taxAmount: 0,
            currencyCode: debtLedger.ticket.currencyCode || 'PEN',
            notes: `Liquidación de deuda del ticket original ID: ${debtLedger.ticket.id}. Número original: #${debtLedger.ticket.ticketNumber}`,
            cashSessionId: cashSessionForPayment.id,
            hasOpenDebt: false,
            items: {
              create: [
                {
                  itemType: TicketItemType.DEBT_LIQUIDATION,
                  description: `Liquidación deuda Ticket #${debtLedger.ticket.ticketNumber}`,
                  quantity: 1,
                  unitPrice: amount,
                  finalPrice: amount,
                  vatRateId: null,
                  vatAmount: 0,
                },
              ],
            },
            payments: {
              create: [
                {
                  systemId,
                  amount,
                  paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                  paymentMethodDefinitionId,
                  userId,
                  clinicId: clinicIdForOperation,
                  cashSessionId: cashSessionForPayment.id,
                  type: PaymentType.DEBIT,
                  status: 'COMPLETED',
                  notes,
                  transactionReference,
                  payerPersonId: debtLedger.personId,
                  debtLedgerId,
                },
              ],
            },
          },
        });
      }

      const newPaidAmount = debtLedger.paidAmount + amount;
      const newPendingAmount = Math.max(0, debtLedger.originalAmount - newPaidAmount);
      let newDebtStatus: DebtStatus = debtLedger.status;
      if (newPendingAmount < 0.01) newDebtStatus = DebtStatus.PAID;
      else if (debtLedger.status === DebtStatus.PENDING && newPaidAmount > 0) newDebtStatus = DebtStatus.PARTIALLY_PAID;

      const updatedDebtLedger = await tx.debtLedger.update({
        where: { id: debtLedgerId },
        data: {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          status: newDebtStatus,
        },
      });

      const originalTicket = await tx.ticket.findUnique({
        where: { id: debtLedger.ticket.id, systemId },
        select: { finalAmount: true, paidAmount: true },
      });
      if (!originalTicket) throw new Error('Ticket original no encontrado para actualizar montos de deuda.');

      const newOriginalTicketPaidAmount = originalTicket.paidAmount + amount;
      const newOriginalTicketPendingAmount = originalTicket.finalAmount - newOriginalTicketPaidAmount;
      await tx.ticket.update({
        where: { id: debtLedger.ticket.id },
        data: {
          paidAmount: newOriginalTicketPaidAmount,
          pendingAmount: newOriginalTicketPendingAmount,
          hasOpenDebt: newOriginalTicketPendingAmount > 0,
        },
      });

      if (newDebtStatus === DebtStatus.PAID) {
        await tx.ticket.update({ where: { id: debtLedger.ticket.id, systemId }, data: { hasOpenDebt: false } });
      }

      return { newLiquidationTicket, updatedDebtLedger };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[API_PAYMENTS_DEBT_POST]', error);
    const status = error.message?.includes('Deuda no encontrada') ? 404 :
                   error.message?.includes('deuda ya ha sido completamente saldada') ? 400 :
                   error.message?.includes('deuda está cancelada') ? 400 :
                   error.message?.includes('excede el saldo pendiente') ? 400 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status });
  }
}
