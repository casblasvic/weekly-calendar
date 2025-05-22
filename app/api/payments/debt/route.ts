import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { DebtStatus, PaymentType, PaymentMethodType } from '@prisma/client';
import { getOpenCashSessionForClinic } from '@/lib/db-helpers';

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
    const { systemId, id: userId } = session.user; // userId es el cajero que registra el pago

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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar DebtLedger
      const debtLedger = await tx.debtLedger.findUnique({
        where: { id: debtLedgerId, systemId: systemId },
      });

      if (!debtLedger) {
        throw new Error('Deuda no encontrada.');
      }

      if (debtLedger.status === DebtStatus.PAID) {
        throw new Error('Esta deuda ya ha sido completamente saldada.');
      }
      if (debtLedger.status === DebtStatus.CANCELLED) {
        throw new Error('Esta deuda está cancelada y no admite pagos.');
      }
      if (amount > debtLedger.pendingAmount + 0.009) { // Permitir una pequeña diferencia por redondeo
        throw new Error(`El importe del pago (S/.${amount.toFixed(2)}) excede el saldo pendiente (S/.${debtLedger.pendingAmount.toFixed(2)}).`);
      }

      // 2. Validar método de pago: debe existir, estar activo, NO ser de tipo DEFERRED_PAYMENT y estar activo en la clínica
      const paymentMethod = await tx.paymentMethodDefinition.findUnique({
        where: { id: paymentMethodDefinitionId, systemId },
        include: {
          clinicSettings: {
            where: { clinicId: clinicOfPayment, isActiveInClinic: true },
            select: { id: true },
          },
        },
      });

      if (!paymentMethod) {
        throw new Error('Método de pago inválido.');
      }
      if (paymentMethod.type === PaymentMethodType.DEFERRED_PAYMENT) {
        throw new Error('No se puede utilizar el método de pago de tipo Aplazado para liquidar deudas.');
      }
      const isActiveInClinic = paymentMethod.clinicSettings && paymentMethod.clinicSettings.length > 0;
      if (!isActiveInClinic && !paymentMethod.isActive) {
        throw new Error('El método de pago no está activo.');
      }

      // 3. Encontrar CashSession abierta, si existe.
      const activeCashSession = await getOpenCashSessionForClinic(tx, clinicOfPayment, systemId);

      // 4. Crear el Payment
      const newPayment = await tx.payment.create({
        data: {
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethodDefinitionId,
          debtLedgerId, // Vincular al DebtLedger
          ticketId: debtLedger.ticketId, // Mantener referencia al ticket original
          userId,
          systemId,
          clinicId: clinicOfPayment, // Clínica donde se recibe el pago
          cashSessionId: activeCashSession?.id, // Asociar a la sesión de caja activa, si existe
          type: PaymentType.DEBIT,
          status: 'COMPLETED', // Asumimos que los pagos de deuda se completan al registrarse
          notes,
          transactionReference,
          payerClientId: debtLedger.clientId 
        },
      });

      // 5. Actualizar DebtLedger
      const newPaidAmount = debtLedger.paidAmount + amount;
      const newPendingAmount = debtLedger.originalAmount - newPaidAmount;
      let newDebtStatus: DebtStatus = debtLedger.status; // Declarar explícitamente el tipo DebtStatus

      if (newPendingAmount <= 0.009) { 
        newDebtStatus = DebtStatus.PAID;
      }
      else if (debtLedger.status === DebtStatus.PENDING && newPaidAmount > 0) {
        newDebtStatus = DebtStatus.PARTIALLY_PAID;
      }

      const updatedDebtLedger = await tx.debtLedger.update({
        where: { id: debtLedgerId },
        data: {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount > 0 ? newPendingAmount : 0, 
          status: newDebtStatus,
        },
      });

      // 6. Si la deuda está completamente pagada, actualizar Ticket.hasOpenDebt
      if (newDebtStatus === DebtStatus.PAID) {
        await tx.ticket.update({
          where: { id: debtLedger.ticketId, systemId: systemId },
          data: { hasOpenDebt: false },
        });
      }

      // 7. Registrar cambio en EntityChangeLog
      await tx.entityChangeLog.create({
        data: {
          entityId: debtLedger.ticketId,
          entityType: 'TICKET',
          action: 'DEBT_PAYMENT',
          userId,
          systemId,
          details: {
            paymentId: newPayment.id,
            amount,
            paymentMethodDefinitionId,
            debtLedgerId,
          },
        },
      });

      return { newPayment, updatedDebtLedger };
    });

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