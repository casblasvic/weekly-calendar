/**
 * API para generar informes contables
 * 
 * Proporciona datos para:
 * - Plan de cuentas
 * - Libro diario
 * - Libro mayor
 * - Balance de sumas y saldos
 * - Estado de resultados
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
// GET /api/accounting/reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');
    const reportType = searchParams.get('reportType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeDetails = searchParams.get('includeDetails') === 'true';

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    const reportData: any = {};

    // 1. Plan de Cuentas
    if (reportType === 'chart-of-accounts' || reportType === 'all') {
      const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
        where: {
          legalEntityId,
          systemId: session.user.systemId
        },
        orderBy: [
          { accountNumber: 'asc' }
        ]
      });

      reportData.chartOfAccounts = chartOfAccounts.map(account => ({
        id: account.id,
        accountNumber: account.accountNumber,
        name: account.name,
        names: account.names,
        type: account.type,
        level: account.level,
        isSubAccount: account.isSubAccount,
        allowsDirectEntry: account.allowsDirectEntry,
        isActive: account.isActive,
        parentAccountId: account.parentAccountId
      }));
    }

    // 2. Libro Diario (Journal Entries)
    if (reportType === 'journal' || reportType === 'all') {
      const whereConditions: Prisma.JournalEntryWhereInput = {
        legalEntityId,
        systemId: session.user.systemId
      };

      if (startDate && endDate) {
        whereConditions.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const journalEntries = await prisma.journalEntry.findMany({
        where: whereConditions,
        include: {
          lines: {
            include: {
              account: true
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
          { date: 'asc' },
          { entryNumber: 'asc' }
        ]
      });

      reportData.journalEntries = journalEntries;
    }

    // 3. Balance de Sumas y Saldos (Trial Balance)
    if (reportType === 'trial-balance' || reportType === 'all') {
      // Obtener todas las cuentas
      const accounts = await prisma.chartOfAccountEntry.findMany({
        where: {
          legalEntityId,
          systemId: session.user.systemId,
          isActive: true
        }
      });

      // Obtener todos los movimientos del período
      const whereConditions: Prisma.JournalEntryWhereInput = {
        legalEntityId,
        systemId: session.user.systemId
      };

      if (startDate && endDate) {
        whereConditions.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const journalLines = await prisma.journalEntryLine.findMany({
        where: {
          journalEntry: whereConditions
        },
        include: {
          account: true
        }
      });

      // Calcular sumas y saldos por cuenta
      const balanceByAccount = new Map<string, {
        accountNumber: string;
        name: string;
        totalDebit: number;
        totalCredit: number;
        balance: number;
      }>();

      // Inicializar todas las cuentas
      accounts.forEach(account => {
        balanceByAccount.set(account.id, {
          accountNumber: account.accountNumber,
          name: account.name,
          totalDebit: 0,
          totalCredit: 0,
          balance: 0
        });
      });

      // Sumar movimientos
      journalLines.forEach(line => {
        const accountData = balanceByAccount.get(line.accountId);
        if (accountData) {
          const debitAmount = Number(line.debit);
          const creditAmount = Number(line.credit);
          
          accountData.totalDebit += debitAmount;
          accountData.totalCredit += creditAmount;
          accountData.balance = accountData.totalDebit - accountData.totalCredit;
        }
      });

      // Convertir a array y filtrar cuentas sin movimientos si no se incluyen detalles
      reportData.trialBalance = Array.from(balanceByAccount.values())
        .filter(account => includeDetails || account.totalDebit > 0 || account.totalCredit > 0)
        .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    }

    // 4. Libro Mayor (General Ledger)
    if (reportType === 'general-ledger' || reportType === 'all') {
      const whereConditions: Prisma.JournalEntryWhereInput = {
        legalEntityId,
        systemId: session.user.systemId
      };

      if (startDate && endDate) {
        whereConditions.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Obtener cuentas con movimientos
      const accountsWithMovements = await prisma.chartOfAccountEntry.findMany({
        where: {
          legalEntityId,
          systemId: session.user.systemId,
          journalEntryLines: {
            some: {
              journalEntry: whereConditions
            }
          }
        },
        include: {
          journalEntryLines: {
            where: {
              journalEntry: whereConditions
            },
            include: {
              journalEntry: true
            },
            orderBy: {
              journalEntry: {
                date: 'asc'
              }
            }
          }
        },
        orderBy: {
          accountNumber: 'asc'
        }
      });

      reportData.generalLedger = accountsWithMovements.map(account => ({
        accountNumber: account.accountNumber,
        accountName: account.name,
        movements: account.journalEntryLines.map(line => ({
          date: line.journalEntry.date,
          entryNumber: line.journalEntry.entryNumber,
          description: line.description || line.journalEntry.description,
          debit: Number(line.debit),
          credit: Number(line.credit),
          balance: 0 // Se calculará en el frontend de forma acumulativa
        }))
      }));
    }

    // 5. Estado de Resultados (Income Statement)
    if (reportType === 'income-statement' || reportType === 'all') {
      const whereConditions: Prisma.JournalEntryWhereInput = {
        legalEntityId,
        systemId: session.user.systemId
      };

      if (startDate && endDate) {
        whereConditions.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      // Obtener movimientos de cuentas de ingresos y gastos
      const incomeExpenseLines = await prisma.journalEntryLine.findMany({
        where: {
          journalEntry: whereConditions,
          account: {
            type: {
              in: ['REVENUE', 'EXPENSE', 'COST_OF_GOODS_SOLD']
            }
          }
        },
        include: {
          account: true
        }
      });

      // Agrupar por tipo de cuenta
      const revenues: any[] = [];
      const expenses: any[] = [];
      const costOfGoodsSold: any[] = [];

      const accountTotals = new Map<string, {
        account: any;
        total: number;
      }>();

      incomeExpenseLines.forEach(line => {
        const accountId = line.accountId;
        const amount = Number(line.credit) - Number(line.debit);
        
        if (!accountTotals.has(accountId)) {
          accountTotals.set(accountId, {
            account: line.account,
            total: 0
          });
        }
        
        const accountData = accountTotals.get(accountId)!;
        accountData.total += amount;
      });

      // Clasificar cuentas
      accountTotals.forEach(({ account, total }) => {
        const entry = {
          accountNumber: account.accountNumber,
          accountName: account.name,
          amount: Math.abs(total)
        };

        switch (account.type) {
          case 'REVENUE':
            revenues.push(entry);
            break;
          case 'EXPENSE':
            expenses.push(entry);
            break;
          case 'COST_OF_GOODS_SOLD':
            costOfGoodsSold.push(entry);
            break;
        }
      });

      // Calcular totales
      const totalRevenue = revenues.reduce((sum, item) => sum + item.amount, 0);
      const totalCOGS = costOfGoodsSold.reduce((sum, item) => sum + item.amount, 0);
      const grossProfit = totalRevenue - totalCOGS;
      const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
      const netIncome = grossProfit - totalExpenses;

      reportData.incomeStatement = {
        revenues: revenues.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
        costOfGoodsSold: costOfGoodsSold.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
        expenses: expenses.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
        summary: {
          totalRevenue,
          totalCOGS,
          grossProfit,
          totalExpenses,
          netIncome
        }
      };
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error al generar informe contable:', error);
    return NextResponse.json(
      { error: 'Error al generar informe' },
      { status: 500 }
    );
  }
} 