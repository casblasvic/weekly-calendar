import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PaymentMethodType } from '@prisma/client';

/**
 * GET /api/payments/pending-verification
 * Devuelve los pagos (transferencias, cheques, etc.) que aún no han sido verificados.
 * Query params:
 *   - clinicId  (obligatorio)
 *   - sessionId (opcional)  -> limita a una caja concreta
 *   - methodType (opcional) -> PaymentMethodType específico
 *   - posTerminalId (opcional)
 * Respuesta: { data: Payment[] }
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const clinicId = params.get('clinicId');
  if (!clinicId) {
    return NextResponse.json({ message: 'clinicId requerido' }, { status: 400 });
  }
  const sessionId = params.get('sessionId');
  const methodType = params.get('methodType') as PaymentMethodType | null;
  const posTerminalId = params.get('posTerminalId');

  // Auth
  const auth = await getServerAuthSession();
  if (!auth?.user?.systemId) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const systemId = auth.user.systemId;

  const defaultMethodTypes: PaymentMethodType[] = ['BANK_TRANSFER', 'CHECK'];
  const methodTypesFilter = methodType ? [methodType] : defaultMethodTypes;

  try {
    const payments = await prisma.payment.findMany({
      where: {
        clinicId,
        systemId,
        ...(sessionId ? { cashSessionId: sessionId } : {}),
        ...(posTerminalId ? { posTerminalId } : {}),
        paymentMethodDefinition: {
          type: { in: methodTypesFilter },
        },
        verification: { is: null }, // Falta verificación
      },
      orderBy: { paymentDate: 'asc' },
      include: {
        paymentMethodDefinition: { select: { id: true, name: true, type: true } },
        posTerminal: { select: { name: true } },
        ticket: {
          select: {
            ticketNumber: true,
            client: { select: { firstName: true, lastName: true } },
          },
        },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    return NextResponse.json({ data: payments });
  } catch (error) {
    console.error('[API_PAYMENTS_PENDING_VERIFICATION] Error:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
