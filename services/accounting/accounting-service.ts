/**
 * Servicio de Contabilización Automática
 * 
 * Este servicio gestiona la generación automática de asientos contables
 * basándose en las transacciones del sistema (tickets, pagos, etc.)
 */

import { prisma } from '@/lib/db';
import { 
  Ticket, 
  Payment, 
  CashSession, 
  ChartOfAccountEntry,
  AccountType,
  PaymentMethodType,
  Prisma
} from '@prisma/client';

interface AccountingConfig {
  isEnabled: boolean;
  legalEntityId: string;
  systemId: string;
}

interface AccountCodes {
  // Cuentas de activo
  cash: string;              // 570 - Caja
  bank: string;              // 572 - Bancos
  bankCard: string;          // 572.1 - Bancos TPV  
  customers: string;         // 430 - Clientes
  customersEffects: string;  // 431 - Clientes efectos comerciales
  
  // Cuentas de ingresos
  serviceRevenue: string;    // 700 - Ventas de servicios
  productRevenue: string;    // 701 - Ventas de productos
  
  // Cuentas de IVA
  outputVat: string;         // 477 - IVA repercutido
  
  // Cuentas de devoluciones
  salesReturns: string;      // 708 - Devoluciones de ventas
  
  // Cuentas de gastos
  cashExpenses: string;      // 600 - Gastos de caja
}

// Mapeo de códigos de cuenta por país
const COUNTRY_ACCOUNT_CODES: Record<string, AccountCodes> = {
  ES: {
    cash: '570',
    bank: '572',
    bankCard: '572.1',
    customers: '430',
    customersEffects: '431',
    serviceRevenue: '700',
    productRevenue: '701',
    outputVat: '477',
    salesReturns: '708',
    cashExpenses: '600'
  },
  FR: {
    cash: '531',
    bank: '512',
    bankCard: '512.1',
    customers: '411',
    customersEffects: '413',
    serviceRevenue: '706',
    productRevenue: '707',
    outputVat: '4457',
    salesReturns: '709',
    cashExpenses: '606'
  },
  MA: {
    cash: '5161',
    bank: '5141',
    bankCard: '5141.1',
    customers: '3421',
    customersEffects: '3425',
    serviceRevenue: '7111',
    productRevenue: '7112',
    outputVat: '4455',
    salesReturns: '7119',
    cashExpenses: '6111'
  }
};

export class AccountingService {
  private config: AccountingConfig;
  
  constructor(config: AccountingConfig) {
    this.config = config;
  }

  /**
   * Genera asiento contable para un ticket de venta
   */
  async generateTicketEntry(ticketId: string): Promise<string | null> {
    if (!this.config.isEnabled) return null;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        items: {
          include: {
            service: true,
            product: true,
            vatRate: true
          }
        },
        client: true,
        clinic: {
          include: {
            legalEntity: {
              include: {
                country: true
              }
            }
          }
        }
      }
    });

    if (!ticket || !ticket.clinic.legalEntity) {
      throw new Error('Ticket o entidad legal no encontrada');
    }

    const countryCode = ticket.clinic.legalEntity.countryIsoCode;
    const accountCodes = COUNTRY_ACCOUNT_CODES[countryCode] || COUNTRY_ACCOUNT_CODES.ES;

    // Calcular totales por tipo
    let serviceRevenue = 0;
    let productRevenue = 0;
    let totalVat = 0;

    for (const item of ticket.items) {
      const baseAmount = item.finalPrice - item.vatAmount;
      if (item.service) {
        serviceRevenue += baseAmount;
      } else if (item.product) {
        productRevenue += baseAmount;
      }
      totalVat += item.vatAmount;
    }

    // Crear asiento contable
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: await this.generateEntryNumber(),
        date: ticket.issueDate,
        description: `Venta ticket ${ticket.ticketNumber}`,
        reference: ticket.ticketNumber || undefined,
        ticketId: ticket.id,
        legalEntityId: ticket.clinic.legalEntityId!,
        systemId: this.config.systemId,
        lines: {
          create: await this.buildTicketEntryLines(
            ticket,
            accountCodes,
            serviceRevenue,
            productRevenue,
            totalVat
          )
        }
      }
    });

    return journalEntry.id;
  }

  /**
   * Genera asiento contable para un pago
   */
  async generatePaymentEntry(paymentId: string): Promise<string | null> {
    if (!this.config.isEnabled) return null;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentMethodDefinition: true,
        ticket: {
          include: {
            clinic: {
              include: {
                legalEntity: {
                  include: {
                    country: true
                  }
                }
              }
            }
          }
        },
        debtLedger: true
      }
    });

    if (!payment || !payment.ticket?.clinic.legalEntity) {
      throw new Error('Pago o entidad legal no encontrada');
    }

    const countryCode = payment.ticket.clinic.legalEntity.countryIsoCode;
    const accountCodes = COUNTRY_ACCOUNT_CODES[countryCode] || COUNTRY_ACCOUNT_CODES.ES;

    // Determinar cuenta de destino según método de pago
    let debitAccount = accountCodes.cash; // Por defecto efectivo
    if (payment.paymentMethodDefinition?.type === PaymentMethodType.CARD) {
      debitAccount = accountCodes.bankCard;
    } else if (payment.paymentMethodDefinition?.type === PaymentMethodType.BANK_TRANSFER) {
      debitAccount = accountCodes.bank;
    }

    // Determinar cuenta de origen
    let creditAccount = accountCodes.customers;
    if (payment.debtLedger) {
      creditAccount = accountCodes.customersEffects;
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: await this.generateEntryNumber(),
        date: payment.paymentDate,
        description: `Cobro ticket ${payment.ticket.ticketNumber}`,
        reference: payment.transactionReference || undefined,
        paymentId: payment.id,
        legalEntityId: payment.ticket.clinic.legalEntityId!,
        systemId: this.config.systemId,
        lines: {
          create: [
            {
              account: { connect: { id: await this.getAccountId(debitAccount) } },
              debit: new Prisma.Decimal(payment.amount),
              credit: new Prisma.Decimal(0),
              description: `Cobro ${payment.paymentMethodDefinition?.name || 'Efectivo'}`,
              order: 0
            },
            {
              account: { connect: { id: await this.getAccountId(creditAccount) } },
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(payment.amount),
              description: payment.debtLedger ? 'Cobro deuda aplazada' : 'Cobro cliente',
              order: 1
            }
          ]
        }
      }
    });

    return journalEntry.id;
  }

  /**
   * Genera número secuencial de asiento
   */
  private async generateEntryNumber(): Promise<string> {
    // TODO: Implementar generación de números secuenciales
    // Por ahora, usar timestamp
    return `AS-${Date.now()}`;
  }

  /**
   * Construye las líneas del asiento para un ticket
   */
  private async buildTicketEntryLines(
    ticket: any,
    accountCodes: AccountCodes,
    serviceRevenue: number,
    productRevenue: number,
    totalVat: number
  ): Promise<Prisma.JournalEntryLineCreateWithoutJournalEntryInput[]> {
    const lines: Prisma.JournalEntryLineCreateWithoutJournalEntryInput[] = [];
    let order = 0;

    // Línea del DEBE - Cliente o Caja
    const debitAccount = ticket.client ? accountCodes.customers : accountCodes.cash;
    lines.push({
      account: { connect: { id: await this.getAccountId(debitAccount) } },
      debit: new Prisma.Decimal(ticket.finalAmount),
      credit: new Prisma.Decimal(0),
      description: ticket.client 
        ? `Cliente: ${ticket.client.firstName} ${ticket.client.lastName}`
        : 'Venta al contado',
      order: order++
    });

    // Línea del HABER - Ingresos por servicios
    if (serviceRevenue > 0) {
      const serviceAccountId = await this.getRevenueAccountId(ticket, 'SERVICE');
      lines.push({
        account: { connect: { id: serviceAccountId } },
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(serviceRevenue),
        description: 'Ingresos por servicios',
        order: order++
      });
    }

    // Línea del HABER - Ingresos por productos
    if (productRevenue > 0) {
      const productAccountId = await this.getRevenueAccountId(ticket, 'PRODUCT');
      lines.push({
        account: { connect: { id: productAccountId } },
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(productRevenue),
        description: 'Ingresos por productos',
        order: order++
      });
    }

    // Línea del HABER - IVA repercutido
    if (totalVat > 0) {
      lines.push({
        account: { connect: { id: await this.getAccountId(accountCodes.outputVat) } },
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(totalVat),
        description: 'IVA repercutido',
        vatAmount: new Prisma.Decimal(totalVat),
        order: order++
      });
    }

    return lines;
  }

  /**
   * Obtiene el ID de cuenta contable por su número
   */
  private async getAccountId(accountNumber: string): Promise<string> {
    const account = await prisma.chartOfAccountEntry.findFirst({
      where: {
        accountNumber,
        legalEntityId: this.config.legalEntityId
      }
    });

    if (!account) {
      throw new Error(`Cuenta contable ${accountNumber} no encontrada`);
    }

    return account.id;
  }

  /**
   * Obtiene la cuenta de ingresos según el tipo y mapeos configurados
   */
  private async getRevenueAccountId(ticket: any, type: 'SERVICE' | 'PRODUCT'): Promise<string> {
    // TODO: Implementar lógica completa de resolución:
    // 1. Buscar ServiceAccountMapping/ProductAccountMapping específico
    // 2. Si no existe, buscar CategoryAccountMapping
    // 3. Si no existe, usar cuenta por defecto
    
    // Por ahora, usar cuentas por defecto
    const countryCode = ticket.clinic.legalEntity.countryIsoCode;
    const accountCodes = COUNTRY_ACCOUNT_CODES[countryCode] || COUNTRY_ACCOUNT_CODES.ES;
    
    const defaultAccount = type === 'SERVICE' 
      ? accountCodes.serviceRevenue 
      : accountCodes.productRevenue;
      
    return this.getAccountId(defaultAccount);
  }
} 