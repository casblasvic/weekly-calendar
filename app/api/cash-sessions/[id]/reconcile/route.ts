import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { CashSessionStatus } from '@prisma/client';

// Esquema para validar el ID (CUID) en los parámetros
const cuidSchema = z.string().cuid({ message: "ID de sesión inválido." });

// Esquema de validación para el cuerpo del POST (Conciliar Caja)
const reconcileCashSessionSchema = z.object({
  reconciliationNotes: z.string().optional().nullable(), // Notas adicionales de la conciliación
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params);
}

// Maintain POST for backward compatibility optionally
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, context.params);
}

async function handle(request: Request, params: Promise<{ id: string }> ) {
  const { id } = await params;
  try {
    const authSession = await getServerAuthSession();
    if (!authSession?.user?.id) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const userId = authSession.user.id; // Usuario que realiza la conciliación

    // Validar el ID de la sesión de los parámetros de la ruta
    const sessionIdValidation = cuidSchema.safeParse(id);
    if (!sessionIdValidation.success) {
      return NextResponse.json({ message: sessionIdValidation.error.errors[0].message }, { status: 400 });
    }
    const sessionId = sessionIdValidation.data;

    const body = await request.json();
    const validation = reconcileCashSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos', errors: validation.error.format() }, { status: 400 });
    }

    const { reconciliationNotes } = validation.data;

    // Iniciar transacción
    const reconciledSession = await prisma.$transaction(async (tx) => {
      const cashSession = await tx.cashSession.findUnique({
        where: { id: sessionId },
      });

      if (!cashSession) {
        throw new Error('Sesión de caja no encontrada.');
      }

      if (cashSession.status !== CashSessionStatus.CLOSED) {
        throw new Error(`La sesión de caja no está en estado CLOSED. Estado actual: ${cashSession.status}`);
      }
      
      // Aquí se podría añadir lógica de permisos más granular, ej: solo ciertos roles pueden conciliar
      // if (!userHasPermissionToReconcile(authSession.user)) {
      //   throw new Error('Permiso denegado para conciliar la caja.');
      // }

      const updatedSession = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          status: CashSessionStatus.RECONCILED,
          reconciliationTime: new Date(),
          notes: reconciliationNotes ? `${cashSession.notes ? cashSession.notes + '\n' : ''}Conciliación: ${reconciliationNotes}` : cashSession.notes,
          // Podríamos añadir un campo específico para `reconcilerUserId: userId` si se necesita
          hasChangesAfterReconcile: false,
        },
      });

      await tx.entityChangeLog.create({
        data:{
          entityId: sessionId,
          entityType: 'CASH_SESSION' as any,
          action: 'RECONCILE',
          userId,
          systemId: cashSession.systemId,
          details: { reconciliationNotes } as any
        }
      });

      return updatedSession;
    });

    return NextResponse.json(reconciledSession, { status: 200 });

  } catch (error: any) {
    console.error("Error al conciliar la sesión de caja:", error);
    // Distinguir errores conocidos de desconocidos
    if (error.message.includes('Sesión de caja no encontrada') || error.message.includes('La sesión de caja no está en estado CLOSED')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error.message.includes('Permiso denegado')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al conciliar la sesión de caja.' }, { status: 500 });
  }
} 