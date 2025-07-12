import { prisma, Prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { getSystemId, requireSystemId } from '@/lib/auth/getSystemId';
import { decimal } from '@/lib/utils';

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

// Schema de validación
const GenerateJournalEntriesSchema = z.object({
  entityType: z.enum(['ticket', 'invoice', 'payment', 'cashSession', 'expense']),
  entityId: z.string(),
  legalEntityId: z.string(),
  regenerate: z.boolean().optional().default(false), // Si regenerar asientos existentes
});

// Tipos auxiliares
interface TicketWithRelations {
  id: string;
  ticketNumber: string;
  type: string;
  status: string;
  issueDate: Date;
  currencyCode: string;
  totalAmount: number;
  taxAmount: number;
  items?: any[];
  payments?: any[];
  person?: any;
  createdById?: string;
  [key: string]: any;
}

interface InvoiceWithRelations {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  issueDate: Date;
  currencyCode: string;
  totalAmount: number;
  items?: any[];
  person?: any;
  company?: any;
  [key: string]: any;
}

interface CashSessionWithRelations {
  id: string;
  closingTime?: Date | null;
  posTerminal?: any;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const systemId = await requireSystemId();
    if (!systemId) {
      return NextResponse.json({ error: 'No system ID found' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = GenerateJournalEntriesSchema.parse(body);

    // Verificar si ya existen asientos para esta entidad
    const existingEntry = await prisma.journalEntry.findFirst({
      where: {
        systemId,
        [`${validatedData.entityType}Id`]: validatedData.entityId,
      },
    });

    if (existingEntry && !validatedData.regenerate) {
      return NextResponse.json({
        message: 'Journal entry already exists',
        journalEntry: existingEntry,
      });
    }

    // Generar asientos según el tipo de entidad
    let journalEntry;
    switch (validatedData.entityType) {
      case 'ticket':
        journalEntry = await generateTicketJournalEntry(
          validatedData.entityId,
          validatedData.legalEntityId,
          systemId
        );
        break;
      
      case 'invoice':
        journalEntry = await generateInvoiceJournalEntry(
          validatedData.entityId,
          validatedData.legalEntityId,
          systemId
        );
        break;
      
      case 'payment':
        journalEntry = await generatePaymentJournalEntry(
          validatedData.entityId,
          validatedData.legalEntityId,
          systemId
        );
        break;
      
      case 'cashSession':
        journalEntry = await generateCashSessionJournalEntry(
          validatedData.entityId,
          validatedData.legalEntityId,
          systemId
        );
        break;
      
      case 'expense':
        journalEntry = await generateExpenseJournalEntry(
          validatedData.entityId,
          validatedData.legalEntityId,
          systemId
        );
        break;
      
      default:
        throw new Error('Entity type not supported');
    }

    return NextResponse.json({
      message: 'Journal entry generated successfully',
      journalEntry,
    });
  } catch (error) {
    console.error('Error generating journal entries:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Función para generar asientos de tickets
async function generateTicketJournalEntry(
  ticketId: string,
  legalEntityId: string,
  systemId: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId, systemId },
    include: {
      items: {
        include: {
          service: {
            include: {
              serviceAccountMappings: {
                where: { legalEntityId },
              },
            },
          },
          originalVatType: true,
        },
      },
      payments: {
        include: {
          paymentMethodDefinition: {
            include: {
              paymentMethodAccountMappings: {
                where: { legalEntityId },
              },
            },
          },
        },
      },
      person: true,
      company: true,
    },
  }) as TicketWithRelations | null;

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const lines: any[] = [];
  let lineOrder = 0;

  // 1. Líneas de ingresos por servicios/productos
  for (const item of ticket.items || []) {
    if (!item.isGift) { // Solo items pagados
      const accountMapping = item.service
        ? item.service.serviceAccountMappings?.[0]
        : null; // TODO: Mapeo para productos

      if (accountMapping) {
        lines.push({
          accountId: accountMapping.chartOfAccountEntryId,
          systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
          debit: decimal(0),
          credit: decimal(item.finalPrice),
          description: item.description,
          order: lineOrder++,
        });
      }
    }

    // Línea de IVA si aplica
    if (item.originalVatType && item.vatAmount > 0) {
      const vatAccountId = await getVATAccountMapping(
        item.originalVatType.id,
        legalEntityId,
        'OUTPUT'
      );
      if (vatAccountId) {
        lines.push({
          accountId: vatAccountId,
          systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
          debit: decimal(0),
          credit: decimal(item.vatAmount),
          description: `IVA ${item.originalVatType.name}`,
          order: lineOrder++,
        });
      }
    }
  }

  // 2. Líneas de pago (debe)
  for (const payment of ticket.payments || []) {
    const accountMapping = payment.paymentMethodDefinition?.paymentMethodAccountMappings?.[0];
    if (accountMapping) {
      lines.push({
        accountId: accountMapping.chartOfAccountEntryId,
        systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
        debit: decimal(payment.amount),
        credit: decimal(0),
        description: `Pago - ${payment.paymentMethodDefinition.name}`,
        order: lineOrder++,
      });
    }
  }

  // 3. Si hay descuentos, contabilizarlos
  const totalDiscount = (ticket.items || []).reduce(
    (sum: number, item: any) => sum + (item.manualDiscountAmount || 0),
    0
  );
  if (totalDiscount > 0) {
    const discountAccountId = await getDiscountAccountMapping(legalEntityId);
    if (discountAccountId) {
      lines.push({
        accountId: discountAccountId,
        systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
        debit: decimal(totalDiscount),
        credit: decimal(0),
        description: 'Descuentos aplicados',
        order: lineOrder++,
      });
    }
  }

  // Crear el asiento contable
  const entryNumber = await generateJournalEntryNumber(legalEntityId, systemId);
  
  return await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: ticket.issueDate,
      description: `Ticket ${ticket.ticketNumber}`,
      reference: ticket.ticketNumber,
      ticketId: ticket.id,
      legalEntityId,
      systemId,
      createdBy: ticket.createdById || 'system',
      lines: {
        create: lines,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

// Función para generar asientos de facturas
async function generateInvoiceJournalEntry(
  invoiceId: string,
  legalEntityId: string,
  systemId: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: {
        include: {
          product: true,
          service: true,
          vatRate: true,
        },
      },
      person: true,
      company: true,
    },
  }) as InvoiceWithRelations | null;

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const lines: any[] = [];
  let lineOrder = 0;

  const legalEntityIdInvoice = invoice.type === 'SALE' 
    ? invoice.person?.legalEntityId 
    : invoice.company?.legalEntityId;

  // Para facturas de venta (emitidas)
  if (invoice.type === 'SALE') {
    // 1. Línea de cliente (debe)
    const clientAccountId = await getPersonAccountId(invoice.person?.id, legalEntityIdInvoice);
    lines.push({
      accountId: clientAccountId,
      systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
      debit: decimal(invoice.totalAmount),
      credit: decimal(0),
      description: `${invoice.person?.firstName || ''} ${invoice.person?.lastName || ''}`.trim() || 'Cliente',
      order: lineOrder++,
    });

    // Agrupar items por tipo de IVA
    const vatGroups = new Map<string, { base: number; vat: number; rate: number }>();
    
    for (const item of invoice.items || []) {
      const vatKey = item.vatRate?.id || 'no-vat';
      const current = vatGroups.get(vatKey) || { base: 0, vat: 0, rate: item.vatRate?.rate || 0 };
      current.base += item.finalPrice - item.vatAmount;
      current.vat += item.vatAmount;
      vatGroups.set(vatKey, current);
    }

    // Crear líneas por cada grupo de IVA
    for (const [vatTypeId, amounts] of vatGroups) {
      // Línea de ingreso
      const incomeAccountId = await getDefaultIncomeAccountId(legalEntityIdInvoice);
      lines.push({
        accountId: incomeAccountId,
        systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
        debit: decimal(0),
        credit: decimal(amounts.base),
        description: 'Ingresos por ventas',
        order: lineOrder++,
      });

      // Línea de IVA si aplica
      if (amounts.vat > 0) {
        const vatAccountId = await getVATAccountMapping(
          vatTypeId,
          legalEntityIdInvoice,
          'OUTPUT'
        );
        if (vatAccountId) {
          lines.push({
            accountId: vatAccountId,
            systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
            debit: decimal(0),
            credit: decimal(amounts.vat),
            description: `IVA ${amounts.rate}%`,
            order: lineOrder++,
          });
        }
      }
    }
  }
  
  // Para facturas de compra (recibidas)
  else if (invoice.type === 'PURCHASE') {
    // Lógica inversa: proveedor al haber, gastos/compras al debe
    // TODO: Implementar cuando se tenga modelo de proveedores
  }

  // Crear el asiento contable
  const entryNumber = await generateJournalEntryNumber(legalEntityIdInvoice, systemId);
  
  return await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: invoice.issueDate,
      description: `Factura ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      invoiceId: invoice.id,
      legalEntityId: legalEntityIdInvoice,
      systemId,
      lines: {
        create: lines,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

// Función para generar asientos de pagos
async function generatePaymentJournalEntry(
  paymentId: string,
  legalEntityId: string,
  systemId: string
) {
  // TODO: Implementar lógica de pagos
  throw new Error('Payment journal entry generation not implemented yet');
}

// Función para generar asientos de sesiones de caja
async function generateCashSessionJournalEntry(
  cashSessionId: string,
  legalEntityId: string,
  systemId: string
) {
  const cashSession = await prisma.cashSession.findUnique({
    where: { id: cashSessionId },
    include: {
      posTerminal: {
        include: {
          CashSessionAccountMapping: {
            where: { legalEntityId },
          },
        },
      },
    },
  }) as CashSessionWithRelations | null;

  if (!cashSession || !cashSession.closingTime) {
    throw new Error('Cash session not found or not closed');
  }

  const lines: any[] = [];
  let lineOrder = 0;

  const expectedCash = cashSession.expectedCash || 0;
  const countedCash = cashSession.countedCash || 0;
  const difference = cashSession.differenceCash || 0;

  // Obtener la cuenta de caja
  const mapping = cashSession.posTerminal?.CashSessionAccountMapping?.[0];
  if (!mapping) {
    throw new Error('No cash account mapping found');
  }

  // 1. Línea de caja (debe - por el conteo)
  lines.push({
    accountId: mapping.chartOfAccountEntryId,
    systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
    debit: decimal(countedCash),
    credit: decimal(0),
    description: 'Arqueo de caja - Efectivo contado',
    order: lineOrder++,
  });

  // 2. Línea de ingresos esperados (haber)
  lines.push({
    accountId: mapping.chartOfAccountEntryId,
    systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
    debit: decimal(0),
    credit: decimal(expectedCash),
    description: 'Ingresos esperados del día',
    order: lineOrder++,
  });

  // 3. Si hay diferencia, contabilizarla
  if (Math.abs(difference) > 0.01) {
    lines.push({
      accountId: mapping.chartOfAccountEntryId, // TODO: Usar cuenta específica para diferencias
      systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
      debit: difference > 0 ? decimal(0) : decimal(Math.abs(difference)),
      credit: difference > 0 ? decimal(difference) : decimal(0),
      description: difference > 0 ? 'Sobrante de caja' : 'Faltante de caja',
      order: lineOrder++,
    });
  }

  // Crear el asiento solo si hay líneas
  if (lines.length === 0) {
    return null;
  }

  const entryNumber = await generateJournalEntryNumber(legalEntityId, systemId);
  
  return await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: cashSession.closingTime!,
      description: `Cierre de caja ${cashSession.id}`,
      reference: `CAJA-${cashSession.id}`,
      cashSessionId: cashSession.id,
      legalEntityId,
      systemId,
      lines: {
        create: lines,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

// Función para generar asientos de gastos
async function generateExpenseJournalEntry(
  expenseId: string,
  legalEntityId: string,
  systemId: string
) {
  // TODO: Implementar cuando se tenga el modelo de gastos
  throw new Error('Expense journal entry generation not implemented yet');
}

// Funciones auxiliares
async function generateJournalEntryNumber(legalEntityId: string, systemId: string): Promise<string> {
  const lastEntry = await prisma.journalEntry.findFirst({
    where: { legalEntityId, systemId },
    orderBy: { createdAt: 'desc' },
    select: { entryNumber: true },
  });

  const lastNumber = lastEntry ? parseInt(lastEntry.entryNumber.split('-').pop() || '0') : 0;
  const newNumber = lastNumber + 1;
  const year = new Date().getFullYear();
  
  return `AST-${year}-${newNumber.toString().padStart(6, '0')}`;
}

async function getVATAccountMapping(
  vatTypeId: string,
  legalEntityId: string,
  direction: 'INPUT' | 'OUTPUT'
): Promise<string | null> {
  const mapping = await prisma.vATTypeAccountMapping.findFirst({
    where: {
      vatTypeId,
      legalEntityId,
    },
    select: {
      chartOfAccountEntryId: true,
    },
  });
  
  return mapping?.chartOfAccountEntryId || null;
}

async function getDiscountAccountMapping(legalEntityId: string): Promise<string | null> {
  // TODO: Implementar mapeo de cuentas de descuento
  // Por ahora usar una cuenta genérica de descuentos
  const discountAccount = await prisma.chartOfAccountEntry.findFirst({
    where: {
      legalEntityId,
      accountNumber: { startsWith: '708' }, // Rappels sobre ventas
    },
    select: { id: true },
  });
  
  return discountAccount?.id || null;
}

async function getPersonAccountId(personId: string | undefined, legalEntityId: string): Promise<string> {
  // TODO: Implementar cuentas individuales por persona
  // Por ahora usar cuenta genérica de clientes
  const clientAccount = await prisma.chartOfAccountEntry.findFirst({
    where: {
      legalEntityId,
      accountNumber: { startsWith: '430' }, // Clientes
    },
    select: { id: true },
  });
  
  if (!clientAccount) {
    throw new Error('Client account not found');
  }
  
  return clientAccount.id;
}

async function getDefaultIncomeAccountId(legalEntityId: string): Promise<string> {
  const incomeAccount = await prisma.chartOfAccountEntry.findFirst({
    where: {
      legalEntityId,
      accountNumber: { startsWith: '705' }, // Prestación de servicios
    },
    select: { id: true },
  });
  
  if (!incomeAccount) {
    throw new Error('Income account not found');
  }
  
  return incomeAccount.id;
}
