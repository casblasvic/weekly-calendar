/**
 * API para exportar asientos contables
 * 
 * Formatos soportados:
 * - Excel (.xlsx)
 * - CSV (futuro)
 * - PDF (futuro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// GET /api/journal-entries/export
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
    const exportFormat = searchParams.get('format') || 'excel';

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    // Construir condiciones where (igual que en la API principal)
    const where: Prisma.JournalEntryWhereInput = {
      legalEntityId,
      systemId: session.user.systemId
    };

    if (fiscalYearId) {
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

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

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

    if (accountId && accountId !== 'all') {
      where.lines = {
        some: {
          accountId
        }
      };
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Obtener todos los asientos (sin paginación para exportación)
    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: {
                accountNumber: true,
                name: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        ticket: {
          select: {
            ticketNumber: true
          }
        },
        payment: {
          select: {
            id: true
          }
        },
        cashSession: {
          select: {
            sessionNumber: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { entryNumber: 'asc' }
      ]
    });

    // Obtener información de la entidad legal
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId }
    });

    if (exportFormat === 'excel') {
      // Crear libro de Excel
      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen de asientos
      const summaryData = entries.map(entry => {
        const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const totalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
        
        return {
          'Número': entry.entryNumber,
          'Fecha': format(new Date(entry.date), 'dd/MM/yyyy', { locale: es }),
          'Descripción': entry.description,
          'Referencia': entry.reference || '',
          'Debe Total': totalDebit,
          'Haber Total': totalCredit,
          'Tipo': entry.ticketId ? 'Ticket' : 
                  entry.paymentId ? 'Pago' : 
                  entry.cashSessionId ? 'Cierre Caja' : 'Manual',
          'Documento': entry.ticket?.ticketNumber || 
                      entry.cashSession?.sessionNumber || 
                      entry.reference || ''
        };
      });

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen Asientos');

      // Hoja 2: Detalle de líneas
      const detailData: any[] = [];
      entries.forEach(entry => {
        entry.lines.forEach(line => {
          detailData.push({
            'Asiento': entry.entryNumber,
            'Fecha': format(new Date(entry.date), 'dd/MM/yyyy', { locale: es }),
            'Cuenta': line.account.accountNumber,
            'Nombre Cuenta': line.account.name,
            'Descripción': line.description || entry.description,
            'Debe': Number(line.debit),
            'Haber': Number(line.credit),
            'IVA': line.vatAmount ? Number(line.vatAmount) : ''
          });
        });
      });

      const detailSheet = XLSX.utils.json_to_sheet(detailData);
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle Líneas');

      // Hoja 3: Información de exportación
      const infoData = [
        { 'Campo': 'Entidad Legal', 'Valor': legalEntity?.name || '' },
        { 'Campo': 'Fecha Exportación', 'Valor': format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es }) },
        { 'Campo': 'Usuario', 'Valor': session.user.email || '' },
        { 'Campo': 'Total Asientos', 'Valor': entries.length },
        { 'Campo': 'Período', 'Valor': `${startDate || 'Inicio'} - ${endDate || 'Fin'}` }
      ];

      const infoSheet = XLSX.utils.json_to_sheet(infoData);
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Información');

      // Generar buffer
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // Devolver archivo
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="asientos_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx"`
        }
      });
    }

    // Si se solicita otro formato no soportado
    return NextResponse.json(
      { error: 'Formato no soportado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error al exportar asientos:', error);
    return NextResponse.json(
      { error: 'Error al exportar asientos' },
      { status: 500 }
    );
  }
} 