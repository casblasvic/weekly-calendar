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
  clinicId: z.string().cuid({ message: "ID de clínica donde se cobra es inválido." }), // Clínica donde se realiza el cobro
  notes: z.string().optional(),
  transactionReference: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId, id: userId } = session.user; // userId es el cajero que registra el pago. userClinicId eliminado temporalmente.

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
      transactionReference
    } = validation.data;

    // Iniciar transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar DebtLedger y obtener datos del ticket original
      const debtLedger = await tx.debtLedger.findUnique({
        where: { id: debtLedgerId, systemId },
        include: { ticket: { select: { id: true, ticketNumber: true, currencyCode: true, sellerUserId: true, clinicId: true, finalAmount: true } } }
      });

      if (!debtLedger) {
        throw new Error(`Deuda con ID ${debtLedgerId} no encontrada o no pertenece al sistema ${systemId}.`);
      }

      // Para la sesión de caja y la moneda, usaremos la clínica donde se registró la deuda originalmente.
      const clinicIdForOperation = debtLedger.clinicId;

      // Opcional: Advertir si la clínica de la deuda y la del ticket original difieren.
      if (debtLedger.clinicId !== debtLedger.ticket.clinicId) {
        console.warn(`[API_DEBT_PAYMENT] La clínica del DebtLedger (${debtLedger.clinicId}) difiere de la del Ticket original (${debtLedger.ticket.clinicId}). Se usará la clínica del DebtLedger (${clinicIdForOperation}) para la operación.`);
      }

      if (debtLedger.status === DebtStatus.PAID) {
        throw new Error('Esta deuda ya ha sido completamente saldada.');
      }
      if (debtLedger.status === DebtStatus.CANCELLED) {
        throw new Error('Esta deuda está cancelada y no admite pagos.');
      }
      // Permitir una pequeña diferencia por redondeo (e.g. 0.01)
      if (amount > debtLedger.pendingAmount + 0.01) { 
        throw new Error(`El importe del pago (S/.${amount.toFixed(2)}) excede el saldo pendiente (S/.${debtLedger.pendingAmount.toFixed(2)}).`);
      }

      // 2. Validar método de pago
      const paymentMethod = await tx.paymentMethodDefinition.findUnique({
        where: { id: paymentMethodDefinitionId, systemId },
        include: {
          clinicSettings: {
            where: { clinicId: clinicIdForOperation, isActiveInClinic: true }, // Usar clinicIdForOperation
            select: { id: true },
          },
        },
      });

      if (!paymentMethod) throw new Error('Método de pago inválido.');
      if (paymentMethod.type === PaymentMethodType.DEFERRED_PAYMENT) throw new Error('No se puede utilizar el método de pago de tipo Aplazado para liquidar deudas.');
      const isActiveInClinic = paymentMethod.clinicSettings && paymentMethod.clinicSettings.length > 0;
      if (!isActiveInClinic && !paymentMethod.isActive) throw new Error('El método de pago no está activo.');

      // 3. Asegurar/Crear CashSession para la operación en la clínica de pago
      const cashSessionForPayment = await ensureCashSessionForOperation(tx, clinicIdForOperation, userId, systemId);

      // 4. Generar número para el nuevo ticket de liquidación
      const newLiquidationTicketNumber = await generateNextTicketNumber(tx, systemId, clinicIdForOperation);

      // 5. Crear el nuevo Ticket de Liquidación
      const newLiquidationTicket = await tx.ticket.create({
        data: {
          systemId,
          clinicId: clinicIdForOperation, // Asegurar que es la única definición de clinicId aquí
          clientId: debtLedger.clientId,
          sellerUserId: debtLedger.ticket.sellerUserId || userId, // Corregido de sellerId a sellerUserId
          cashierUserId: userId, // Corregido de cashierId a cashierUserId
          issueDate: new Date(),
          ticketNumber: newLiquidationTicketNumber,
          status: TicketStatus.ACCOUNTED, 
          finalAmount: amount,
          totalAmount: amount,
          taxAmount: 0,
          currencyCode: debtLedger.ticket.currencyCode || "PEN", // Corregido de currency a currencyCode
          notes: `Liquidación de deuda del ticket original ID: ${debtLedger.ticket.id}. Número original: #${debtLedger.ticket.ticketNumber}`,
          cashSessionId: cashSessionForPayment.id,
          hasOpenDebt: false, 
          items: {
            create: [{
              itemType: TicketItemType.DEBT_LIQUIDATION, // Usando el enum para el tipo de ítem
              description: `Liquidación deuda Ticket #${debtLedger.ticket.ticketNumber}`,
              quantity: 1,
              unitPrice: amount, // Este es el precio del ítem
              finalPrice: amount, // Precio final del ítem (unitPrice * quantity - discounts + tax)
              vatRateId: null, // O el ID de un tipo de IVA exento si existe
              vatAmount: 0,
            }]
          },
          payments: {
            create: [{
              systemId,
              amount,
              paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
              paymentMethodDefinitionId,
              userId,
              clinicId: clinicIdForOperation, 
              cashSessionId: cashSessionForPayment.id,
              type: PaymentType.DEBIT, 
              status: 'COMPLETED',
              notes: notes, 
              transactionReference,
              payerClientId: debtLedger.clientId,
              debtLedgerId: debtLedgerId, 
            }]
          }
        }
      });

      // 6. Actualizar DebtLedger
      const newPaidAmount = debtLedger.paidAmount + amount;
      // Asegurar que el nuevo pendiente no sea negativo por problemas de precisión
      const newPendingAmount = Math.max(0, debtLedger.originalAmount - newPaidAmount);
      let newDebtStatus: DebtStatus = debtLedger.status;

      if (newPendingAmount < 0.01) { 
        newDebtStatus = DebtStatus.PAID;
      }
      else if (debtLedger.status === DebtStatus.PENDING && newPaidAmount > 0) {
        newDebtStatus = DebtStatus.PARTIALLY_PAID;
      }

      const updatedDebtLedger = await tx.debtLedger.update({
        where: { id: debtLedgerId },
        data: {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          status: newDebtStatus,
        },
      });

      // Actualizar el ticket original
      const originalTicket = await tx.ticket.findUnique({
        where: { id: debtLedger.ticket.id, systemId: systemId },
        select: { finalAmount: true, paidAmount: true }
      });

      if (!originalTicket) {
        throw new Error('Ticket original no encontrado para actualizar montos de deuda.');
      }

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

      // 7. Si la deuda original está completamente pagada, actualizar Ticket.hasOpenDebt en el ticket original
      if (newDebtStatus === DebtStatus.PAID) {
        await tx.ticket.update({
          where: { id: debtLedger.ticket.id, systemId: systemId },
          data: { hasOpenDebt: false },
        });
      }

      // 8. Registrar cambios en EntityChangeLog
      // Log para el pago de la deuda en el ticket original
      await tx.entityChangeLog.create({
        data: {
          entityId: debtLedger.ticket.id,
          entityType: 'TICKET',
          action: 'DEBT_PAYMENT_SETTLED', // Acción más específica
          userId,
          systemId,
          details: {
            paymentAmount: amount,
            paymentMethodDefinitionId,
            debtLedgerId,
            settlementTicketId: newLiquidationTicket.id, // ID del ticket de liquidación
          },
        },
      });

      // Log para la creación del nuevo ticket de liquidación
      await tx.entityChangeLog.create({
        data: {
          entityId: newLiquidationTicket.id,
          entityType: 'TICKET',
          action: 'CREATED_FOR_DEBT_SETTLEMENT',
          userId,
          systemId,
          details: {
            amount,
            originalDebtLedgerId: debtLedgerId,
            originalTicketId: debtLedger.ticket.id,
          },
        },
      });

      return { newLiquidationTicket, updatedDebtLedger };
    }); // Fin de la transacción

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('[API_PAYMENTS_DEBT_POST]', error);
    const status = error.message?.includes("Deuda no encontrada") ? 404 :
                   error.message?.includes("deuda ya ha sido completamente saldada") ? 400 :
                   error.message?.includes("deuda está cancelada") ? 400 :
                   error.message?.includes("excede el saldo pendiente") ? 400 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al procesar el pago de la deuda.' }, { status });
  }
} 