import { NextResponse } from 'next/server';
import { PrismaClient, DebtAdjustmentType, DebtStatus, CashSessionStatus, EntityType } from '@prisma/client';
import { auth } from '@/lib/auth'; // Correct import for Auth.js (NextAuth.js v5+)

const prisma = new PrismaClient();

interface DebtAdjustmentRequestBody {
  debtLedgerId: string;
  adjustmentType: DebtAdjustmentType;
  amount: number;
  reason: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

  if (!session || !session.user || !session.user.id || !session.user.systemId) {
    return NextResponse.json({ error: 'Unauthorized - User session or systemId missing' }, { status: 401 });
  }
  const userId = session.user.id;
  const systemId = session.user.systemId;

    const body: DebtAdjustmentRequestBody = await req.json();
    const { debtLedgerId, adjustmentType, amount, reason } = body;

    // --- Validaciones --- 
    if (!debtLedgerId || !adjustmentType || amount === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields: debtLedgerId, adjustmentType, amount, reason' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Adjustment amount must be a positive number' }, { status: 400 });
    }

    if (typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json({ error: 'Reason cannot be empty' }, { status: 400 });
    }

    if (!Object.values(DebtAdjustmentType).includes(adjustmentType)) {
      return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 });
    }

    const debtLedger = await prisma.debtLedger.findUnique({
      where: { id: debtLedgerId, systemId: systemId }, // Asegurar que la deuda pertenece al systemId del usuario
      include: {
        originatingCashSession: true, // Incluir la sesión de caja de origen
      },
    });

    if (!debtLedger) {
      return NextResponse.json({ error: 'Debt ledger not found or does not belong to this system' }, { status: 404 });
    }

    if (debtLedger.status === DebtStatus.PAID || debtLedger.status === DebtStatus.CANCELLED) {
      return NextResponse.json({ error: `Cannot adjust debt that is already ${debtLedger.status.toLowerCase()}` }, { status: 400 });
    }

    // Redondear el 'amount' del request a 2 decimales por si acaso viene con más
    const roundedAmount = parseFloat(amount.toFixed(2)); 

    // Validar si la caja de origen está abierta
    if (debtLedger.originatingCashSession && debtLedger.originatingCashSession.status === CashSessionStatus.OPEN) {
      return NextResponse.json(
        { error: 'Cannot adjust debt: The originating cash session is currently open. Please close the cash session before making adjustments.' },
        { status: 409 } // 409 Conflict es apropiado aquí
      );
    }

    if (roundedAmount > debtLedger.pendingAmount) {
      return NextResponse.json({ error: `Adjustment amount (${roundedAmount}) cannot be greater than pending amount (${debtLedger.pendingAmount}).` }, { status: 400 });
    }

    // --- Lógica Principal (Transacción) --- 
    const result = await prisma.$transaction(async (tx) => {
      const newDebtAdjustment = await tx.debtAdjustment.create({
        data: {
          debtLedgerId,
          adjustmentType: adjustmentType,
          amount: roundedAmount, // Usar el monto redondeado
          reason,
          userId,
          systemId, // Guardar el systemId en el ajuste
        },
      });

      const newPendingAmount = parseFloat((debtLedger.pendingAmount - roundedAmount).toFixed(2));
      let newStatus = debtLedger.status;

      if (newPendingAmount <= 0) {
        newStatus = DebtStatus.CANCELLED;
      } else if (newPendingAmount < debtLedger.originalAmount) {
        newStatus = DebtStatus.PARTIALLY_PAID;
      } else { 
        newStatus = DebtStatus.PENDING;
      }

      const updatedDebtLedger = await tx.debtLedger.update({
        where: { id: debtLedgerId },
        data: {
          pendingAmount: newPendingAmount,
          status: newStatus,
        },
      });

      // Creación de EntityChangeLog para DebtAdjustment
      await tx.entityChangeLog.create({
        data: {
          systemId,
          entityType: EntityType.DEBT_ADJUSTMENT,
          entityId: newDebtAdjustment.id,
          action: 'CREATE',
          userId,
          timestamp: new Date(),
          details: {
            debtLedgerId: newDebtAdjustment.debtLedgerId,
            adjustmentType: newDebtAdjustment.adjustmentType,
            amount: newDebtAdjustment.amount,
            reason: newDebtAdjustment.reason,
          }
        },
      });

      // Creación de EntityChangeLog para DebtLedger (actualización)
      await tx.entityChangeLog.create({
        data: {
          systemId,
          entityType: EntityType.DEBT_LEDGER,
          entityId: updatedDebtLedger.id,
          action: 'UPDATE',
          userId,
          timestamp: new Date(),
          details: {
            action: 'DebtAdjustmentApplied',
            adjustmentId: newDebtAdjustment.id,
            previousPendingAmount: debtLedger.pendingAmount,
            newPendingAmount: updatedDebtLedger.pendingAmount,
            previousStatus: debtLedger.status,
            newStatus: updatedDebtLedger.status,
          }
        },
      });

      return { newDebtAdjustment, updatedDebtLedger };
    });

    return NextResponse.json(result.newDebtAdjustment, { status: 201 });

  } catch (error) {
    console.error("Error creating debt adjustment:", error);
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error instanceof Error) {
        // Puedes añadir más manejo específico aquí si es necesario
        errorMessage = error.message;
        if (error.message.includes('Missing required fields') || 
            error.message.includes('Invalid adjustment type') || 
            error.message.includes('must be a positive number') ||
            error.message.includes('cannot be empty') ||
            error.message.includes('Cannot adjust debt') ||
            error.message.includes('cannot be greater than pending amount')) {
          statusCode = 400;
        }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
