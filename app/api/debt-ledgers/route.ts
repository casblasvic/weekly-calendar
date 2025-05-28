import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DebtStatus, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { searchParams } = req.nextUrl;
    const clinicId = searchParams.get('clinicId');
    const statusParam = searchParams.get('status') as DebtStatus | null;
    const clientIdParam = searchParams.get('clientId');
    const clientNameSearch = searchParams.get('clientNameSearch');
    const ticketNumberSearch = searchParams.get('ticketNumberSearch');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');

    const page = parseInt(searchParams.get('page') || '1');
    const pageSizeParam = parseInt(searchParams.get('pageSize') || '10');
    const pageSize = Math.min(Math.max(pageSizeParam, 1), 50); // Min 1, Max 50

    const whereConditions: Prisma.DebtLedgerWhereInput[] = [{ systemId }];

    if (clinicId) {
      whereConditions.push({ clinicId });
    }

    if (clientIdParam) {
      whereConditions.push({ clientId: clientIdParam });
    }

    if (clientNameSearch) {
      whereConditions.push({
        client: {
          OR: [
            { firstName: { contains: clientNameSearch, mode: 'insensitive' } },
            { lastName: { contains: clientNameSearch, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (ticketNumberSearch) {
      // ticketNumber in Prisma schema is a String, so we use ticketNumberSearch directly.
      whereConditions.push({ ticket: { ticketNumber: ticketNumberSearch } });
    }

    if (dateFromParam) {
      try {
        // Ensure YYYY-MM-DD is interpreted as UTC start of day
        const startDate = new Date(dateFromParam + 'T00:00:00.000Z');
        whereConditions.push({ createdAt: { gte: startDate } });
      } catch (e) { /* Invalid date format, ignore */ }
    }
    if (dateToParam) {
      try {
        // Ensure YYYY-MM-DD is interpreted as UTC end of day
        const endDate = new Date(dateToParam + 'T23:59:59.999Z');
        whereConditions.push({ createdAt: { lte: endDate } });
      } catch (e) { /* Invalid date format, ignore */ }
    }

    // Status and pendingAmount logic
    if (statusParam) {
      whereConditions.push({ status: statusParam });
      if (statusParam === DebtStatus.PENDING || statusParam === DebtStatus.PARTIALLY_PAID) {
        whereConditions.push({ pendingAmount: { gt: 0.009 } });
      } else if (statusParam === DebtStatus.PAID || statusParam === DebtStatus.CANCELLED) {
        whereConditions.push({ pendingAmount: { lte: 0.009 } });
      }
    } else {
      // Default: PENDING or PARTIALLY_PAID debts with a pending amount
      whereConditions.push({
        OR: [{ status: DebtStatus.PENDING }, { status: DebtStatus.PARTIALLY_PAID }],
      });
      whereConditions.push({ pendingAmount: { gt: 0.009 } });
    }

    const finalWhere: Prisma.DebtLedgerWhereInput = { AND: whereConditions };

    const totalCount = await prisma.debtLedger.count({
      where: finalWhere,
    });

    const debts = await prisma.debtLedger.findMany({
      where: finalWhere,
      include: {
        ticket: {
          select: {
            ticketNumber: true,
            issueDate: true,
            cashSession: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        clinic: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(
      {
        debts,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API_DEBT_LEDGERS_GET]', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
} 