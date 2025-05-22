import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PaymentMethodType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get('clinicId');
  if (!clinicId) {
    return NextResponse.json({ message: 'clinicId requerido' }, { status: 400 });
  }
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  // Leer filtros opcionales
  const methodType = req.nextUrl.searchParams.get('methodType') as PaymentMethodType | null;
  const posTerminalId = req.nextUrl.searchParams.get('posTerminalId');
  const sessionIdParam = req.nextUrl.searchParams.get('sessionId');

  // @ts-ignore tabla generada
  const verified = await prisma.paymentVerification.findMany({ select: { paymentId: true }});
  const verifiedIds = verified.map(v => v.paymentId);

  const where = {
    systemId,
    clinicId,
    ...(sessionIdParam ? { cashSessionId: sessionIdParam } : {}),
    ...(methodType ? { paymentMethodDefinition: { type: methodType } } : { paymentMethodDefinition: { type: { in: [PaymentMethodType.BANK_TRANSFER, PaymentMethodType.CHECK, PaymentMethodType.CARD] }}}),
    ...(posTerminalId ? { posTerminalId } : {}),
    id: { notIn: verifiedIds },
  } as any;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      paymentMethodDefinition: true,
      ticket: { select: { ticketNumber: true, client: { select: { firstName: true, lastName: true } } } },
      invoice: { select: { invoiceNumber: true } },
      posTerminal: { select: { name: true } },
    },
    orderBy: { paymentDate: 'desc' },
  });

  const expected = payments.reduce((s,p)=>s + (p.type==='DEBIT'?p.amount:-p.amount),0);
  const summary = { expected, verified:0, invalid:0};

  return NextResponse.json({ data: payments, summary });
} 