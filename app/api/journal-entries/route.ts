/**
 * API para gestionar asientos contables
 * 
 * Endpoints:
 * - GET: Listar asientos con filtros y paginación
 * - POST: Crear asiento manual (futuro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/journal-entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');
    const fiscalYearId = searchParams.get('fiscalYearId');
    const accountId = searchParams.get('accountId');
    const documentType = searchParams.get('documentType');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    // Construir condiciones where
    const where: Prisma.JournalEntryWhereInput = {
      legalEntityId,
      systemId: session.user.systemId
    };

    // Filtro por ejercicio fiscal
    if (fiscalYearId) {
      // Obtener las fechas del ejercicio fiscal
      const fiscalYear = await prisma.fiscalYear.findFirst({
        where: {
          id: fiscalYearId,
          legalEntityId,
          systemId: session.user.systemId
        }
      });

      if (fiscalYear) {
        where.date = {
          gte: fiscalYear.startDate,
          lte: fiscalYear.endDate
        };
      }
    }

    // Filtro por fechas específicas
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Filtro por tipo de documento
    if (documentType && documentType !== 'all') {
      switch (documentType) {
        case 'ticket':
          where.ticketId = { not: null };
          break;
        case 'payment':
          where.paymentId = { not: null };
          break;
        case 'cash':
          where.cashSessionId = { not: null };
          break;
        case 'manual':
          where.AND = [
            { ticketId: null },
            { paymentId: null },
            { cashSessionId: null }
          ];
          break;
      }
    }

    // Filtro por cuenta
    if (accountId && accountId !== 'all') {
      where.lines = {
        some: {
          accountId
        }
      };
    }

    // Búsqueda por texto
    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Contar total de registros
    const totalEntries = await prisma.journalEntry.count({ where });
    const totalPages = Math.ceil(totalEntries / pageSize);

    // Obtener asientos paginados
    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                accountNumber: true,
                name: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        ticket: {
          select: {
            ticketNumber: true,
            type: true
          }
        },
        payment: {
          select: {
            id: true,
            amount: true
          }
        },
        cashSession: {
          select: {
            sessionNumber: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { entryNumber: 'desc' }
      ],
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // Calcular resumen
    const allLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: where
      }
    });

    const totalDebit = allLines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = allLines.reduce((sum, line) => sum + Number(line.credit), 0);

    // Transformar los datos para el frontend
    const transformedEntries = entries.map(entry => ({
      id: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date.toISOString(),
      description: entry.description,
      reference: entry.reference,
      ticketId: entry.ticketId,
      paymentId: entry.paymentId,
      cashSessionId: entry.cashSessionId,
      ticket: entry.ticket,
      payment: entry.payment,
      cashSession: entry.cashSession,
      lines: entry.lines.map(line => ({
        id: line.id,
        accountId: line.accountId,
        account: line.account,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description,
        vatAmount: line.vatAmount ? Number(line.vatAmount) : null,
        order: line.order
      }))
    }));

    return NextResponse.json({
      entries: transformedEntries,
      pagination: {
        page,
        pageSize,
        totalEntries,
        totalPages
      },
      summary: {
        totalDebit,
        totalCredit,
        difference: Math.abs(totalDebit - totalCredit)
      }
    });
  } catch (error) {
    console.error('Error al obtener asientos contables:', error);
    return NextResponse.json(
      { error: 'Error al obtener asientos' },
      { status: 500 }
    );
  }
}

// POST /api/journal-entries
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { date, description, reference, legalEntityId, systemId, lines } = body;

    // Validaciones básicas
    if (!date || !description || !legalEntityId || !systemId || !lines || lines.length < 2) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que el systemId coincida con el del usuario
    if (systemId !== session.user.systemId) {
      return NextResponse.json(
        { error: 'No autorizado para este sistema' },
        { status: 403 }
      );
    }

    // Verificar ejercicio fiscal
    const entryDate = new Date(date);
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        legalEntityId,
        systemId,
        status: 'OPEN',
        startDate: { lte: entryDate },
        endDate: { gte: entryDate }
      }
    });

    if (!fiscalYear) {
      return NextResponse.json(
        { error: 'La fecha no está dentro de un ejercicio fiscal activo' },
        { status: 400 }
      );
    }

    // Validar cuadre
    const totalDebit = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: 'El asiento no está cuadrado' },
        { status: 400 }
      );
    }

    // Generar número de asiento
    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        legalEntityId,
        systemId,
        date: {
          gte: new Date(entryDate.getFullYear(), 0, 1),
          lt: new Date(entryDate.getFullYear() + 1, 0, 1)
        }
      },
      orderBy: {
        entryNumber: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastEntry && lastEntry.entryNumber) {
      const match = lastEntry.entryNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const entryNumber = `${entryDate.getFullYear()}/${nextNumber.toString().padStart(6, '0')}`;

    // Crear asiento
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: entryDate,
        description,
        reference,
        legalEntityId,
        systemId,
        createdBy: session.user.id,
        lines: {
          create: lines.map((line: any, index: number) => ({
            accountId: line.accountId,
            description: line.description || description,
            debit: new Prisma.Decimal(line.debit || 0),
            credit: new Prisma.Decimal(line.credit || 0),
            order: index
          }))
        }
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });

    // Registrar en el log de cambios (comentado hasta que se añada JOURNAL_ENTRY al enum)
    // await prisma.entityChangeLog.create({
    //   data: {
    //     entityId: journalEntry.id,
    //     entityType: 'JOURNAL_ENTRY',
    //     action: 'CREATE',
    //     changes: {
    //       description: `Asiento manual creado: ${entryNumber}`,
    //       data: journalEntry
    //     },
    //     changedBy: session.user.id,
    //     systemId
    //   }
    // });

    return NextResponse.json(journalEntry);
  } catch (error) {
    console.error('Error al crear asiento manual:', error);
    return NextResponse.json(
      { error: 'Error al crear asiento' },
      { status: 500 }
    );
  }
} 