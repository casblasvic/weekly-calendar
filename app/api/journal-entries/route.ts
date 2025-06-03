/**
 * API para consultar asientos contables generados
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación para parámetros de consulta
const QueryParamsSchema = z.object({
  legalEntityId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  ticketId: z.string().optional(),
  invoiceId: z.string().optional(),
  cashSessionId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

// GET /api/journal-entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      legalEntityId: searchParams.get('legalEntityId'),
      fromDate: searchParams.get('fromDate'),
      toDate: searchParams.get('toDate'),
      ticketId: searchParams.get('ticketId'),
      invoiceId: searchParams.get('invoiceId'),
      cashSessionId: searchParams.get('cashSessionId'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize')
    };

    const validation = QueryParamsSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { 
      legalEntityId, 
      fromDate, 
      toDate, 
      ticketId, 
      invoiceId, 
      cashSessionId,
      page, 
      pageSize 
    } = validation.data;

    // Construir el where clause
    const where: any = {
      systemId: session.user.systemId
    };

    if (legalEntityId) {
      where.legalEntityId = legalEntityId;
    }

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }
      if (toDate) {
        where.date.lte = new Date(toDate);
      }
    }

    if (ticketId) {
      where.ticketId = ticketId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (cashSessionId) {
      where.cashSessionId = cashSessionId;
    }

    // Ejecutar consultas en paralelo
    const [journalEntries, totalCount] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  accountNumber: true,
                  name: true,
                  type: true
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              finalAmount: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true
            }
          },
          cashSession: {
            select: {
              id: true,
              sessionNumber: true,
              status: true
            }
          },
          legalEntity: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.journalEntry.count({ where })
    ]);

    // Calcular totales para cada asiento
    const entriesWithTotals = journalEntries.map(entry => {
      const totalDebit = entry.lines.reduce((sum, line) => 
        sum + parseFloat(line.debit.toString()), 0
      );
      const totalCredit = entry.lines.reduce((sum, line) => 
        sum + parseFloat(line.credit.toString()), 0
      );

      return {
        ...entry,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
      };
    });

    return NextResponse.json({
      data: entriesWithTotals,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    });

  } catch (error) {
    console.error('Error al obtener asientos contables:', error);
    return NextResponse.json(
      { error: 'Error al obtener asientos contables' },
      { status: 500 }
    );
  }
}

// POST /api/journal-entries/export
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { legalEntityId, fromDate, toDate, format = 'csv' } = body;

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    // TODO: Implementar lógica de exportación según el formato solicitado
    // Por ahora retornamos un mensaje de no implementado
    return NextResponse.json(
      { error: 'Exportación no implementada aún' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error al exportar asientos:', error);
    return NextResponse.json(
      { error: 'Error al exportar asientos' },
      { status: 500 }
    );
  }
} 