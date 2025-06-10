/**
 * Servicio para generar asientos contables automáticos
 * Integra operaciones de venta con la contabilidad
 */

import { prisma } from '@/lib/db';
import type { Ticket, TicketItem, Payment, CashSession } from '@prisma/client';

interface JournalEntryLineData {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  vatAmount?: number;
  vatRate?: number;
}

interface AccountMapping {
  categoryAccountMappings: Array<{
    accountId: string;
    category: { id: string; name: string };
  }>;
  paymentMethodAccountMappings: Array<{
    accountId: string;
    paymentMethodDefinition: { id: string; name: string };
  }>;
  vatTypeAccountMappings: Array<{
    inputAccountId: string | null;
    outputAccountId: string | null;
    vatType: { id: string; name: string };
  }>;
  discountTypeAccountMappings: Array<{
    accountId: string;
    discountTypeCode: string;
  }>;
}

export class JournalEntryService {
  /**
   * Genera asiento contable para un ticket de venta
   */
  static async generateFromTicket(
    ticketId: string,
    legalEntityId: string
  ): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        items: {
          include: {
            service: {
              include: {
                category: true,
                vatType: true
              }
            },
            product: {
              include: {
                category: true,
                vatType: true
              }
            },
            vatRate: true,
            appliedPromotion: true
          }
        },
        payments: {
          include: {
            paymentMethodDefinition: true
          }
        },
        cashSession: true,
        clinic: true
      }
    });

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} no encontrado`);
    }

    // Solo procesar tickets cerrados/contabilizados
    if (ticket.status !== 'CLOSED' && ticket.status !== 'ACCOUNTED') {
      return;
    }

    // Obtener todos los mapeos necesarios
    const mappings = await this.getAccountMappings(
      legalEntityId,
      ticket.clinic.systemId
    );
    
    console.log('[JOURNAL_ENTRY_DEBUG] Getting mappings for legalEntityId:', legalEntityId, 'systemId:', ticket.clinic.systemId);
    console.log('[JOURNAL_ENTRY_DEBUG] Category mappings found:', mappings.categoryAccountMappings.length);
    console.log('[JOURNAL_ENTRY_DEBUG] Payment mappings found:', mappings.paymentMethodAccountMappings.length);

    // Construir las líneas del asiento
    const lines: JournalEntryLineData[] = [];
    
    // Calcular pagos aplazados para ajustar IVA proporcionalmente
    const deferredPayments = ticket.payments.filter((p: any) => 
      p.paymentMethodDefinition?.type === 'DEFERRED_PAYMENT' || 
      p.paymentMethodDefinition?.code === 'SYS_DEFERRED_PAYMENT'
    );
    const totalTicket = ticket.finalAmount || 0;
    const deferredAmount = deferredPayments.reduce((sum, p) => sum + p.amount, 0);
    const effectivelyPaidAmount = ticket.payments.reduce((sum, p) => sum + p.amount, 0) - deferredAmount;
    const paidPercentage = totalTicket > 0 ? effectivelyPaidAmount / totalTicket : 0;
    
    // 1. Líneas de venta por categoría (proporcional a lo pagado)
    const salesByCategory = this.groupSalesByCategory(ticket.items);
    console.log('[JOURNAL_ENTRY_DEBUG] Sales by category:', Array.from(salesByCategory.entries()));
    console.log('[JOURNAL_ENTRY_DEBUG] Paid percentage:', paidPercentage);
    
    let salesAdded = false;
    for (const [categoryId, amount] of salesByCategory) {
      const mapping = mappings.categoryAccountMappings.find(m => m.category.id === categoryId);
      if (mapping) {
        const proportionalAmount = amount * paidPercentage;
        console.log(`[JOURNAL_ENTRY_DEBUG] Adding sales line: category=${mapping.category.name}, amount=${amount}, proportional=${proportionalAmount}`);
        lines.push({
          accountId: mapping.accountId,
          debit: 0,
          credit: proportionalAmount,
          description: `Ventas - ${mapping.category.name}`
        });
        salesAdded = true;
      } else {
        console.log(`[JOURNAL_ENTRY_DEBUG] No mapping found for category ${categoryId}`);
      }
    }
    
    // Si no se encontraron mapeos de categorías, usar cuenta de ventas genérica
    if (!salesAdded) {
      const totalSales = Array.from(salesByCategory.values()).reduce((sum, val) => sum + val, 0);
      const proportionalAmount = totalSales * paidPercentage;
      
      // TODO: Configurar cuenta de ventas genérica por defecto
      const defaultSalesAccountId = 'cmbjwux060002y29ztw5hzidw'; // Cuenta temporal
      
      console.log(`[JOURNAL_ENTRY_DEBUG] No category mappings configured. Using default sales account: ${defaultSalesAccountId}, amount=${proportionalAmount}`);
      lines.push({
        accountId: defaultSalesAccountId,
        debit: 0,
        credit: proportionalAmount,
        description: 'Ventas'
      });
    }

    // 2. Líneas de IVA
    const vatByType = this.groupVATByType(ticket.items);
    for (const [vatTypeId, { amount, rate }] of vatByType) {
      const mapping = mappings.vatTypeAccountMappings.find(m => m.vatType.id === vatTypeId);
      if (mapping?.outputAccountId) {
        const proportionalVatAmount = amount * paidPercentage;
        lines.push({
          accountId: mapping.outputAccountId,
          debit: 0,
          credit: proportionalVatAmount,
          description: `IVA Repercutido ${rate}%`,
          vatAmount: proportionalVatAmount,
          vatRate: rate
        });
      }
    }

    // 3. Líneas de descuentos (proporcional a lo pagado)
    const discountsByType = this.groupDiscountsByType(ticket);
    for (const [discountType, amount] of discountsByType) {
      const mapping = mappings.discountTypeAccountMappings.find(
        m => m.discountTypeCode === discountType
      );
      
      const proportionalDiscount = amount * paidPercentage;
      
      if (mapping) {
        lines.push({
          accountId: mapping.accountId,
          debit: proportionalDiscount,
          credit: 0,
          description: `Descuento aplicado - ${discountType}`
        });
      } else {
        // Si no hay mapeo, usar cuenta de descuentos genérica
        const defaultDiscountAccountId = 'cmbjwux0a0003y29zb7ywir7t'; // Cuenta temporal de descuentos
        console.log(`[JOURNAL_ENTRY_DEBUG] No discount mapping for type ${discountType}. Using default account: ${defaultDiscountAccountId}, amount=${proportionalDiscount}`);
        lines.push({
          accountId: defaultDiscountAccountId,
          debit: proportionalDiscount,
          credit: 0,
          description: `Descuento aplicado`
        });
      }
    }

    // 4. Líneas de cobros (tesorería) - EXCLUIR PAGOS APLAZADOS
    for (const payment of ticket.payments) {
      // Saltar pagos aplazados
      if (payment.paymentMethodDefinition?.type === 'DEFERRED_PAYMENT' || 
          payment.paymentMethodDefinition?.code === 'SYS_DEFERRED_PAYMENT') {
        continue;
      }
      
      const mapping = mappings.paymentMethodAccountMappings.find(
        m => m.paymentMethodDefinition.id === payment.paymentMethodDefinitionId
      );
      if (mapping) {
        lines.push({
          accountId: mapping.accountId,
          debit: payment.amount,
          credit: 0,
          description: `Cobro - ${mapping.paymentMethodDefinition.name}`
        });
      }
    }

    // 5. Línea de deuda pendiente + aplazada
    const totalPendiente = (ticket.pendingAmount || 0) + deferredAmount;
    if (totalPendiente > 0.01) {
      // TODO: Configurar cuenta de clientes por defecto
      const clientAccountId = 'cmbjwux030001y29zs29j5pfv'; // Cuenta temporal de clientes
      
      console.log(`[JOURNAL_ENTRY_DEBUG] Adding client debt: pendingAmount=${ticket.pendingAmount}, deferredAmount=${deferredAmount}, total=${totalPendiente}`);
      
      // La deuda debe aparecer tanto en el debe como en el haber para que el asiento cuadre
      lines.push({
        accountId: clientAccountId,
        debit: totalPendiente,
        credit: 0,
        description: `Deuda cliente`
      });
      
      // Añadir también al haber para cuadrar el asiento
      lines.push({
        accountId: clientAccountId,
        debit: 0,
        credit: totalPendiente,
        description: `Deuda cliente (contrapartida)`
      });
    }

    // Verificar que el asiento cuadra
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    
    console.log('[JOURNAL_ENTRY_DEBUG] Total lines:', lines.length);
    console.log('[JOURNAL_ENTRY_DEBUG] Lines detail:', lines.map(l => ({
      account: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description
    })));
    console.log('[JOURNAL_ENTRY_DEBUG] Total Debit:', totalDebit);
    console.log('[JOURNAL_ENTRY_DEBUG] Total Credit:', totalCredit);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Asiento descuadrado: Debe=${totalDebit}, Haber=${totalCredit}`
      );
    }

    // Crear el asiento contable
    await prisma.journalEntry.create({
      data: {
        entryNumber: await this.generateEntryNumber(legalEntityId),
        date: ticket.issueDate,
        description: `Venta Ticket ${ticket.ticketNumber || ticket.id}`,
        reference: ticket.ticketNumber || undefined,
        ticketId: ticket.id,
        legalEntityId,
        systemId: ticket.systemId,
        lines: {
          create: lines.map((line, index) => ({
            ...line,
            order: index + 1
          }))
        }
      }
    });
  }

  /**
   * Genera asiento contable para una sesión de caja
   */
  static async generateFromCashSession(
    cashSessionId: string,
    legalEntityId: string
  ): Promise<void> {
    const cashSession = await prisma.cashSession.findUnique({
      where: { id: cashSessionId },
      include: {
        clinic: true,
        posTerminal: true,
        ticketsAccountedInSession: {
          include: {
            payments: {
              include: {
                paymentMethodDefinition: true
              }
            }
          }
        }
      }
    });

    if (!cashSession) {
      throw new Error(`Sesión de caja ${cashSessionId} no encontrada`);
    }

    // Solo procesar sesiones reconciliadas
    if (cashSession.status !== 'RECONCILED') {
      return;
    }

    // TODO: Implementar lógica específica para cierre de caja
    // - Cuadre de efectivo
    // - Diferencias de caja
    // - Movimientos de efectivo a banco
  }

  /**
   * Obtiene todos los mapeos de cuentas configurados
   */
  private static async getAccountMappings(
    legalEntityId: string,
    systemId: string
  ): Promise<AccountMapping> {
    const [
      categoryAccountMappings,
      paymentMethodAccountMappings,
      vatTypeAccountMappings,
      discountTypeAccountMappings
    ] = await Promise.all([
      prisma.categoryAccountMapping.findMany({
        where: { legalEntityId, systemId },
        include: {
          category: true
        }
      }),
      prisma.paymentMethodAccountMapping.findMany({
        where: { legalEntityId, systemId },
        include: {
          paymentMethodDefinition: true
        }
      }),
      prisma.vATTypeAccountMapping.findMany({
        where: { legalEntityId, systemId },
        include: {
          vatType: true
        }
      }),
      prisma.discountTypeAccountMapping.findMany({
        where: { legalEntityId, systemId }
      })
    ]);

    return {
      categoryAccountMappings,
      paymentMethodAccountMappings,
      vatTypeAccountMappings,
      discountTypeAccountMappings
    };
  }

  /**
   * Agrupa las ventas por categoría
   */
  private static groupSalesByCategory(
    items: Array<any>
  ): Map<string, number> {
    const salesByCategory = new Map<string, number>();

    for (const item of items) {
      const category = item.service?.category || item.product?.category;
      if (category) {
        const currentAmount = salesByCategory.get(category.id) || 0;
        // finalPrice ya es el precio sin IVA (base imponible)
        // Pero necesitamos incluir el descuento en la base para que cuadre el asiento
        const discount = (item.manualDiscountAmount || 0) + (item.promotionDiscountAmount || 0);
        const itemAmount = item.finalPrice + discount; // Añadir descuento a la base
        salesByCategory.set(category.id, currentAmount + itemAmount);
      }
    }

    return salesByCategory;
  }

  /**
   * Agrupa el IVA por tipo
   */
  private static groupVATByType(
    items: Array<any>
  ): Map<string, { amount: number; rate: number }> {
    const vatByType = new Map<string, { amount: number; rate: number }>();

    for (const item of items) {
      if (item.vatRate && item.vatAmount > 0) {
        const current = vatByType.get(item.vatRate.id) || { amount: 0, rate: item.vatRate.rate };
        vatByType.set(item.vatRate.id, {
          amount: current.amount + item.vatAmount,
          rate: item.vatRate.rate
        });
      }
    }

    return vatByType;
  }

  /**
   * Agrupa los descuentos por tipo
   */
  private static groupDiscountsByType(
    ticket: any
  ): Map<string, number> {
    const discountsByType = new Map<string, number>();

    // Descuentos a nivel de ticket
    if (ticket.discountAmount > 0) {
      const type = ticket.discountType === 'PERCENTAGE' ? 'MANUAL' : 'MANUAL';
      discountsByType.set(type, ticket.discountAmount);
    }

    // Descuentos a nivel de línea
    for (const item of ticket.items) {
      // Descuento manual
      if (item.manualDiscountAmount > 0) {
        const current = discountsByType.get('MANUAL') || 0;
        discountsByType.set('MANUAL', current + item.manualDiscountAmount);
      }

      // Descuento promocional
      if (item.promotionDiscountAmount > 0) {
        const current = discountsByType.get('PROMO') || 0;
        discountsByType.set('PROMO', current + item.promotionDiscountAmount);
      }
    }

    return discountsByType;
  }

  /**
   * Obtiene la cuenta de clientes por defecto
   */
  private static async getDefaultClientAccount(
    legalEntityId: string
  ): Promise<string | null> {
    // TODO: Implementar lógica para obtener cuenta de clientes
    // Por ahora buscar cuenta 430* (clientes en plan contable español)
    const account = await prisma.chartOfAccountEntry.findFirst({
      where: {
        legalEntityId,
        accountNumber: {
          startsWith: '430'
        },
        isActive: true,
        allowsDirectEntry: true
      }
    });

    return account?.id || null;
  }

  /**
   * Genera el siguiente número de asiento
   */
  private static async generateEntryNumber(
    legalEntityId: string
  ): Promise<string> {
    // Obtener el último asiento del año fiscal actual
    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        legalEntityId,
        date: {
          gte: new Date(new Date().getFullYear(), 0, 1), // Inicio del año
          lt: new Date(new Date().getFullYear() + 1, 0, 1) // Inicio del próximo año
        }
      },
      orderBy: {
        entryNumber: 'desc'
      }
    });

    if (!lastEntry) {
      return `${new Date().getFullYear()}/00001`;
    }

    // Extraer número y incrementar
    const parts = lastEntry.entryNumber.split('/');
    const nextNumber = (parseInt(parts[1]) + 1).toString().padStart(5, '0');
    
    return `${parts[0]}/${nextNumber}`;
  }
} 