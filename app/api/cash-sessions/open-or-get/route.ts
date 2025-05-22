import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { CashSessionStatus } from '@prisma/client';

const schema = z.object({
  clinicId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // yyyy-mm-dd
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const parse = schema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ message: 'Parámetros inválidos', errors: parse.error.format() }, { status: 400 });
    }

    const { clinicId, date } = parse.data;
    const systemId = session.user.systemId;

    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59');

    const existing = await prisma.cashSession.findFirst({
      where: { clinicId, systemId, openingTime: { gte: start, lte: end }, status: CashSessionStatus.OPEN },
    });

    if (existing) return NextResponse.json(existing, { status: 200 });

    // generar sessionNumber sencillo YYYYMMDD-001 etc.
    const datePrefix = date.replace(/-/g, '');
    const countToday = await prisma.cashSession.count({ where: { clinicId, openingTime: { gte: start, lte: end } } });
    const sessionNumber = `${clinicId.slice(0,4)}-${datePrefix}-${(countToday+1).toString().padStart(3,'0')}`;

    const newSession = await prisma.cashSession.create({
      data: {
        sessionNumber,
        clinicId,
        systemId,
        userId: session.user.id,
        openingBalanceCash: 0,
        status: CashSessionStatus.OPEN,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (err) {
    console.error('[OPEN_OR_GET_CASH_SESSION]', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
} 