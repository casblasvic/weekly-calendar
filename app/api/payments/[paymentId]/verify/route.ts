import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { paymentId: string } }) {
  const { paymentId } = params;
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.systemId) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const userId = session.user.id;
  const systemId = session.user.systemId;

  const body = await req.json();
  const { verified = true, attachmentUrl } = body ?? {};

  // Verificar que el pago pertenece al sistema del usuario
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.systemId !== systemId) {
    return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });
  }

  // @ts-expect-error Modelo generado dinámicamente por Prisma
  await prisma.paymentVerification.upsert({
    where: { paymentId },
    update: {
      verified,
      verifiedByUserId: userId,
      verifiedAt: new Date(),
      attachmentUrl,
      systemId: systemId, // 🏢 NUEVO: Actualizar systemId en caso de que no existiera
    },
    create: {
      paymentId,
      verified,
      verifiedByUserId: userId,
      verifiedAt: new Date(),
      attachmentUrl,
      systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
    },
  });

  return NextResponse.json({ ok: true });
} 