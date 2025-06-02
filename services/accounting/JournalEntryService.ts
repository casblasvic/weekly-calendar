/**
 * Servicio de Generación Automática de Asientos Contables
 * 
 * Genera asientos contables automáticamente desde:
 * - Tickets de venta
 * - Pagos recibidos
 * - Cierres de caja
 */

import { prisma } from '@/lib/db';
import { 
  Ticket, 
  Payment, 
  CashSession, 
  ChartOfAccountEntry,
  PaymentMethodAccountMapping,
  CategoryAccountMapping,
  LegalEntity,
  PaymentType,
  JournalEntry,
  Prisma
} from '@prisma/client';
import { format } from 'date-fns';

interface JournalEntryLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  vatAmount?: number;
  vatRate?: number;
}

export class JournalEntryService {
  /**
   * Genera asiento contable para un ticket de venta
   */
  static async generateFromTicket(ticketId: string): Promise<JournalEntry> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        clinic: {
          include: { legalEntity: true }
        },
        items: {
          include: {
            service: {
              include: { category: true }
            },
            product: {
              include: { category: true }
            },
            vatRate: true
          }
        },
        payments: {
          include: {
            paymentMethodDefinition: true
          }
        }
      }
    });

    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    if (!ticket.clinic.legalEntityId) {
      throw new Error('La clínica no tiene entidad legal configurada');
    }

    const legalEntityId = ticket.clinic.legalEntityId;
    const lines: JournalEntryLine[] = [];

    // 1. Asientos por ventas de servicios/productos
    const salesByCategory = new Map<string, { amount: number; vatAmount: number; categoryId?: string }>();
    
    for (const item of ticket.items) {
      const categoryId = item.service?.categoryId || item.product?.categoryId;
      const key = categoryId || 'sin-categoria';
      
      const existing = salesByCategory.get(key) || { amount: 0, vatAmount: 0, categoryId };
      existing.amount += item.finalPrice - item.vatAmount;
      existing.vatAmount += item.vatAmount;
      salesByCategory.set(key, existing);
    }

    // Buscar cuentas contables para cada categoría
    for (const [key, data] of salesByCategory) {
      let accountId: string | null = null;

      if (data.categoryId) {
        const mapping = await prisma.categoryAccountMapping.findFirst({
          where: {
            categoryId: data.categoryId,
            legalEntityId,
            appliesToServices: true // Asumimos servicios por ahora
          }
        });
        accountId = mapping?.accountId || null;
      }

      if (!accountId) {
        // Buscar cuenta por defecto para ventas
        const defaultAccount = await prisma.chartOfAccountEntry.findFirst({
          where: {
            legalEntityId,
            type: 'REVENUE',
            isActive: true,
            allowsDirectEntry: true,
            OR: [
              { name: { contains: 'ventas', mode: 'insensitive' } },
              { names: { path: ['es'], string_contains: 'ventas' } }
            ]
          }
        });
        accountId = defaultAccount?.id;
      }

      if (accountId && data.amount > 0) {
        lines.push({
          accountId,
          debit: 0,
          credit: data.amount,
          description: `Ventas ${key}`
        });
      }
    }

    // 2. Asiento por IVA repercutido
    const totalVat = ticket.items.reduce((sum, item) => sum + item.vatAmount, 0);
    if (totalVat > 0) {
      const vatAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: 'LIABILITY',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'IVA repercutido', mode: 'insensitive' } },
            { names: { path: ['es'], string_contains: 'IVA repercutido' } },
            { accountNumber: { startsWith: '477' } }
          ]
        }
      });

      if (vatAccount) {
        lines.push({
          accountId: vatAccount.id,
          debit: 0,
          credit: totalVat,
          description: 'IVA repercutido',
          vatAmount: totalVat
        });
      }
    }

    // 3. Asientos por forma de pago (contrapartida)
    const paymentsByMethod = new Map<string, { amount: number; methodId: string }>();
    
    for (const payment of ticket.payments) {
      if (payment.paymentMethodDefinitionId) {
        const key = payment.paymentMethodDefinitionId;
        const existing = paymentsByMethod.get(key) || { amount: 0, methodId: key };
        existing.amount += payment.amount;
        paymentsByMethod.set(key, existing);
      }
    }

    for (const [methodId, data] of paymentsByMethod) {
      const mapping = await prisma.paymentMethodAccountMapping.findFirst({
        where: {
          paymentMethodDefinitionId: methodId,
          legalEntityId
        }
      });

      if (mapping) {
        lines.push({
          accountId: mapping.accountId,
          debit: data.amount,
          credit: 0,
          description: `Cobro ticket ${ticket.ticketNumber}`
        });
      }
    }

    // 4. Si hay deuda pendiente, asiento a clientes
    if (ticket.pendingAmount > 0) {
      const clientAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: 'ASSET',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'clientes', mode: 'insensitive' } },
            { accountNumber: { startsWith: '430' } }
          ]
        }
      });

      if (clientAccount) {
        lines.push({
          accountId: clientAccount.id,
          debit: ticket.pendingAmount,
          credit: 0,
          description: `Deuda cliente - Ticket ${ticket.ticketNumber}`
        });
      }
    }

    // Crear el asiento contable
    const entryNumber = await this.generateEntryNumber(legalEntityId, new Date(ticket.issueDate));

    return await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: ticket.issueDate,
        description: `Venta ticket ${ticket.ticketNumber}`,
        reference: ticket.ticketNumber,
        ticketId: ticket.id,
        legalEntityId,
        systemId: ticket.systemId,
        createdBy: ticket.cashierUserId,
        lines: {
          create: lines.map((line, index) => ({
            ...line,
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
            vatAmount: line.vatAmount ? new Prisma.Decimal(line.vatAmount) : null,
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
  }

  /**
   * Genera asiento contable para un pago
   */
  static async generateFromPayment(paymentId: string): Promise<JournalEntry | null> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        ticket: {
          include: {
            clinic: {
              include: { legalEntity: true }
            }
          }
        },
        invoice: {
          include: {
            ticket: {
              include: {
                clinic: {
                  include: { legalEntity: true }
                }
              }
            }
          }
        },
        paymentMethodDefinition: true,
        debtLedger: true
      }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    // Determinar la entidad legal
    const legalEntityId = payment.ticket?.clinic?.legalEntityId || 
                         payment.invoice?.ticket?.clinic?.legalEntityId;

    if (!legalEntityId) {
      console.warn('No se puede determinar la entidad legal para el pago');
      return null;
    }

    const lines: JournalEntryLine[] = [];

    // Si es un pago de deuda aplazada
    if (payment.debtLedgerId) {
      // Asiento: Banco/Caja (Debe) a Clientes (Haber)
      
      // 1. Cuenta del método de pago
      if (payment.paymentMethodDefinitionId) {
        const mapping = await prisma.paymentMethodAccountMapping.findFirst({
          where: {
            paymentMethodDefinitionId: payment.paymentMethodDefinitionId,
            legalEntityId
          }
        });

        if (mapping) {
          lines.push({
            accountId: mapping.accountId,
            debit: payment.amount,
            credit: 0,
            description: 'Cobro deuda cliente'
          });
        }
      }

      // 2. Cuenta de clientes
      const clientAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: 'ASSET',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'clientes', mode: 'insensitive' } },
            { accountNumber: { startsWith: '430' } }
          ]
        }
      });

      if (clientAccount) {
        lines.push({
          accountId: clientAccount.id,
          debit: 0,
          credit: payment.amount,
          description: `Cobro deuda ${payment.debtLedger.id}`
        });
      }
    }

    // Solo crear asiento si hay líneas
    if (lines.length === 0) {
      return null;
    }

    const entryNumber = await this.generateEntryNumber(legalEntityId, payment.paymentDate);

    return await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: payment.paymentDate,
        description: `Pago ${payment.id}`,
        reference: payment.transactionReference || undefined,
        paymentId: payment.id,
        legalEntityId,
        systemId: payment.systemId,
        createdBy: payment.userId,
        lines: {
          create: lines.map((line, index) => ({
            ...line,
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
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
  }

  /**
   * Genera asiento de cierre de caja
   */
  static async generateFromCashSession(cashSessionId: string): Promise<JournalEntry> {
    const session = await prisma.cashSession.findUnique({
      where: { id: cashSessionId },
      include: {
        clinic: {
          include: { legalEntity: true }
        },
        payments: {
          include: {
            paymentMethodDefinition: true
          }
        }
      }
    });

    if (!session || session.status !== 'RECONCILED') {
      throw new Error('Sesión de caja no encontrada o no reconciliada');
    }

    if (!session.clinic.legalEntityId) {
      throw new Error('La clínica no tiene entidad legal configurada');
    }

    const legalEntityId = session.clinic.legalEntityId;
    const lines: JournalEntryLine[] = [];

    // 1. Diferencias de caja (si las hay)
    if (session.differenceCash && session.differenceCash !== 0) {
      const cashAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: 'ASSET',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'caja', mode: 'insensitive' } },
            { accountNumber: { startsWith: '570' } }
          ]
        }
      });

      const differenceAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: session.differenceCash > 0 ? 'REVENUE' : 'EXPENSE',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'diferencias', mode: 'insensitive' } },
            { name: { contains: 'descuadre', mode: 'insensitive' } }
          ]
        }
      });

      if (cashAccount && differenceAccount) {
        if (session.differenceCash > 0) {
          // Sobrante
          lines.push({
            accountId: cashAccount.id,
            debit: session.differenceCash,
            credit: 0,
            description: 'Sobrante de caja'
          });
          lines.push({
            accountId: differenceAccount.id,
            debit: 0,
            credit: session.differenceCash,
            description: 'Ingreso por diferencia positiva'
          });
        } else {
          // Faltante
          const faltante = Math.abs(session.differenceCash);
          lines.push({
            accountId: differenceAccount.id,
            debit: faltante,
            credit: 0,
            description: 'Gasto por diferencia negativa'
          });
          lines.push({
            accountId: cashAccount.id,
            debit: 0,
            credit: faltante,
            description: 'Faltante de caja'
          });
        }
      }
    }

    // 2. Retiros de caja
    const cashWithdrawals = session.cashWithdrawals ? Number(session.cashWithdrawals) : 0;
    if (cashWithdrawals > 0) {
      const cashAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: 'ASSET',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'caja', mode: 'insensitive' } },
            { accountNumber: { startsWith: '570' } }
          ]
        }
      });

      const bankAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId,
          type: 'ASSET',
          isActive: true,
          allowsDirectEntry: true,
          OR: [
            { name: { contains: 'banco', mode: 'insensitive' } },
            { accountNumber: { startsWith: '572' } }
          ]
        }
      });

      if (cashAccount && bankAccount) {
        lines.push({
          accountId: bankAccount.id,
          debit: cashWithdrawals,
          credit: 0,
          description: 'Depósito bancario desde caja'
        });
        lines.push({
          accountId: cashAccount.id,
          debit: 0,
          credit: cashWithdrawals,
          description: 'Retiro de efectivo para banco'
        });
      }
    }

    if (lines.length === 0) {
      throw new Error('No hay movimientos para generar asiento');
    }

    const entryNumber = await this.generateEntryNumber(legalEntityId, session.reconciliationTime || new Date());

    return await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: session.reconciliationTime || new Date(),
        description: `Cierre de caja ${session.sessionNumber}`,
        reference: session.sessionNumber,
        cashSessionId: session.id,
        legalEntityId,
        systemId: session.systemId,
        createdBy: session.userId,
        lines: {
          create: lines.map((line, index) => ({
            ...line,
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
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
  }

  /**
   * Genera número de asiento secuencial
   */
  private static async generateEntryNumber(legalEntityId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    
    // Buscar el último asiento del año
    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        legalEntityId,
        date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
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

    return `${year}/${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Valida que el asiento esté cuadrado
   */
  static validateJournalEntry(lines: JournalEntryLine[]): boolean {
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    
    // Permitir una diferencia mínima por redondeos
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }
} 