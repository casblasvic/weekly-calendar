import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CashSessionStatus } from '@prisma/client';

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
  const count = await prisma.cashSession.count({ where: { clinicId, systemId, status: CashSessionStatus.OPEN } });
  return NextResponse.json({ count });
} 