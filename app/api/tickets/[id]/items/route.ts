import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, TicketItem, Product, Service, VATType, Ticket, PackageDefinition, BonoDefinition } from '@prisma/client';

// Esquema para los parámetros de la ruta (id del ticket)
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }), // Cambiado de ticketId a id
});

// Esquema para el cuerpo de la petición al añadir un ítem
const addTicketItemSchema = z.object({
  itemType: z.enum(['SERVICE', 'PRODUCT', 'BONO_DEFINITION', 'PACKAGE_DEFINITION']),
  itemId: z.string().cuid({ message: "ID de ítem inválido." }),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.number().min(0, "El precio unitario no puede ser negativo.").optional(),
  manualDiscountAmount: z.number().min(0).optional().nullable(),
  discountNotes: z.string().max(255).optional().nullable(),
  appliedPromotionId: z.string().cuid().optional().nullable(),
  promotionDiscountAmount: z.number().min(0).optional().nullable(),
  consumedBonoInstanceId: z.string().cuid().optional().nullable(),
  consumedPackageInstanceId: z.string().cuid().optional().nullable(),
});

async function getPriceAndVatDetails(
  tx: Prisma.TransactionClient, 
  itemType: 'PRODUCT' | 'SERVICE' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION', 
  itemId: string, 
  clinicTariffId: string, 
  systemId: string,
  manualUnitPrice?: number
): Promise<{ resolvedUnitPrice: number; resolvedVatRateDetails: { id: string; rate: number; name: string }; description: string; originalItemPrice: number | null }> {
    
  let resolvedUnitPrice: number | undefined = undefined;
  let resolvedVatRateDetails: { id: string; rate: number; name: string } | null = null;
  let description: string = '';
  let originalItemPrice: number | null = null;
  let defaultVatForComplexItems: VATType | null = null;

  const tariff = await tx.tariff.findUnique({ where: { id: clinicTariffId }, include: { vatType: true } });
  if (tariff?.vatType) {
    defaultVatForComplexItems = tariff.vatType;
  } else {
    defaultVatForComplexItems = await tx.vATType.findFirst({ where: { systemId: systemId, isDefault: true } });
  }
  if (!defaultVatForComplexItems) {
    throw new Error("No se pudo determinar un tipo de IVA por defecto para el sistema o la tarifa de la clínica.");
  }

  if (itemType === 'PRODUCT') {
    const product = await tx.product.findUnique({ 
      where: { id: itemId, systemId: systemId },
      include: { 
        productPrices: { 
          where: { tariffId: clinicTariffId, isActive: true },
          include: { vatType: {select: {id: true, rate: true, name: true}} } 
        },
        vatType: {select: {id: true, rate: true, name: true}}
      }
    });
    if (!product) throw new Error('Producto no encontrado.');
    description = product.name;
    originalItemPrice = product.price;
    const tariffPriceEntry = (product as any).productPrices?.[0];
    if (manualUnitPrice !== undefined) resolvedUnitPrice = manualUnitPrice;
    else if (tariffPriceEntry?.price !== undefined) resolvedUnitPrice = tariffPriceEntry.price;
    else if (product.price !== null && product.price !== undefined) resolvedUnitPrice = product.price;
    else throw new Error(`El producto '${product.name}' no tiene un precio base ni un precio definido en la tarifa.`);
    const vatFromTariffPrice = tariffPriceEntry?.vatType;
    const vatFromProductBase = (product as any).vatType;
    if (vatFromTariffPrice?.id && vatFromTariffPrice?.rate !== undefined) resolvedVatRateDetails = vatFromTariffPrice;
    else if (vatFromProductBase?.id && vatFromProductBase?.rate !== undefined) resolvedVatRateDetails = vatFromProductBase;

  } else if (itemType === 'SERVICE') {
    const service = await tx.service.findUnique({ 
      where: { id: itemId, systemId: systemId },
      include: { 
        tariffPrices: { 
          where: { tariffId: clinicTariffId, isActive: true },
          include: { vatType: {select: {id: true, rate: true, name: true}} }
        },
        vatType: {select: {id: true, rate: true, name: true}}
      }
    });
    if (!service) throw new Error('Servicio no encontrado.');
    description = service.name;
    originalItemPrice = service.price;
    const tariffPriceEntry = (service as any).tariffPrices?.[0];
    if (manualUnitPrice !== undefined) resolvedUnitPrice = manualUnitPrice;
    else if (tariffPriceEntry?.price !== undefined) resolvedUnitPrice = tariffPriceEntry.price;
    else if (service.price !== null && service.price !== undefined) resolvedUnitPrice = service.price;
    else throw new Error(`El servicio '${service.name}' no tiene un precio base ni un precio definido en la tarifa.`);
    const vatFromTariffPrice = tariffPriceEntry?.vatType;
    const vatFromServiceBase = (service as any).vatType;
    if (vatFromTariffPrice?.id && vatFromTariffPrice?.rate !== undefined) resolvedVatRateDetails = vatFromTariffPrice;
    else if (vatFromServiceBase?.id && vatFromServiceBase?.rate !== undefined) resolvedVatRateDetails = vatFromServiceBase;

  } else if (itemType === 'BONO_DEFINITION') {
    const bonoDef = await tx.bonoDefinition.findUnique({
      where: { id: itemId, systemId: systemId },
      include: {
        tariffPrices: { where: { tariffId: clinicTariffId, isActive: true }, include: { vatType: true } },
        vatType: true
      }
    });
    if (!bonoDef) throw new Error('Definición de bono no encontrada.');
    description = bonoDef.name;
    originalItemPrice = bonoDef.price;
    const tariffPriceEntry = bonoDef.tariffPrices?.[0];
    if (manualUnitPrice !== undefined) resolvedUnitPrice = manualUnitPrice;
    else if (tariffPriceEntry?.price !== undefined) resolvedUnitPrice = tariffPriceEntry.price;
    else if (bonoDef.price !== null && bonoDef.price !== undefined) resolvedUnitPrice = bonoDef.price;
    else throw new Error(`El bono '${bonoDef.name}' no tiene un precio base definido.`);
    if (tariffPriceEntry?.vatType) resolvedVatRateDetails = tariffPriceEntry.vatType;
    else if (bonoDef.vatType) resolvedVatRateDetails = bonoDef.vatType;
    else resolvedVatRateDetails = defaultVatForComplexItems;

  } else if (itemType === 'PACKAGE_DEFINITION') {
    const packageDef = await tx.packageDefinition.findUnique({
      where: { id: itemId, systemId: systemId },
      include: {
        tariffPrices: { where: { tariffId: clinicTariffId, isActive: true }, include: { vatType: true } }
      }
    });
    if (!packageDef) throw new Error('Definición de paquete no encontrada.');
    description = packageDef.name;
    originalItemPrice = packageDef.price;
    const tariffPriceEntry = packageDef.tariffPrices?.[0];
    if (manualUnitPrice !== undefined) resolvedUnitPrice = manualUnitPrice;
    else if (tariffPriceEntry?.price !== undefined) resolvedUnitPrice = tariffPriceEntry.price;
    else if (packageDef.price !== null && packageDef.price !== undefined) resolvedUnitPrice = packageDef.price;
    else throw new Error(`El paquete '${packageDef.name}' no tiene un precio base definido.`);
    if (tariffPriceEntry?.vatType) resolvedVatRateDetails = tariffPriceEntry.vatType;
    else resolvedVatRateDetails = defaultVatForComplexItems;
  }

  if (resolvedUnitPrice === undefined || resolvedUnitPrice === null || resolvedUnitPrice < 0) {
    throw new Error(`No se pudo determinar un precio válido para el ítem '${description}'.`);
  }
  
  if (!resolvedVatRateDetails?.id || resolvedVatRateDetails.rate === undefined ) {
    throw new Error(`El ${itemType.toLowerCase()} '${description}' no tiene un tipo de IVA configurado o por defecto.`);
  }
  return { resolvedUnitPrice, resolvedVatRateDetails, description, originalItemPrice };
}

// params.id es el ID del ticket
export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const actualParams = await paramsPromise; 
    const paramsValidation = paramsSchema.safeParse(actualParams); 

    if (!paramsValidation.success) {
      console.error("[API_TICKETS_ITEMS_POST] Zod params validation failed:", JSON.stringify(paramsValidation.error.format(), null, 2), "Received params object:", actualParams);
      return NextResponse.json({ message: 'ID de ticket inválido en ruta', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const { id: ticketId } = paramsValidation.data; 

    const body = await request.json();
    const itemValidation = addTicketItemSchema.safeParse(body);

    if (!itemValidation.success) {
      return NextResponse.json({ message: 'Datos de ítem inválidos', errors: itemValidation.error.format() }, { status: 400 });
    }
    const {
      itemType, itemId, quantity, unitPrice: manualUnitPriceInput,
      manualDiscountAmount, discountNotes, appliedPromotionId, promotionDiscountAmount,
      consumedBonoInstanceId, consumedPackageInstanceId
    } = itemValidation.data;

    const preliminaryTicket = await prisma.ticket.findUnique({
        where: { id: ticketId, systemId: systemId },
        select: { status: true, clinic: { select: { tariffId: true, systemId: true } } }
    });

    if (!preliminaryTicket) {
        return NextResponse.json({ message: 'Ticket no encontrado' }, { status: 404 });
    }
    if (preliminaryTicket.status !== TicketStatus.OPEN) {
        return NextResponse.json({ message: 'Solo se pueden añadir ítems a tickets en estado OPEN.' }, { status: 403 });
    }
    const clinicTariffId = preliminaryTicket.clinic?.tariffId;
    const clinicSystemId = preliminaryTicket.clinic?.systemId;
    if (!clinicTariffId || !clinicSystemId) {
        return NextResponse.json({ message: 'La clínica asociada al ticket no tiene una tarifa o systemId configurado.' }, { status: 400 });
    }

    const updatedTicketData = await prisma.$transaction(async (tx) => {
      const { resolvedUnitPrice, resolvedVatRateDetails, description, originalItemPrice } = 
        await getPriceAndVatDetails(tx, itemType, itemId, clinicTariffId, clinicSystemId, manualUnitPriceInput);

      const baseLinePrice = resolvedUnitPrice * quantity;
      const itemDiscountTotal = (manualDiscountAmount || 0) + (promotionDiscountAmount || 0);
      const netLinePriceAfterItemDiscounts = baseLinePrice - itemDiscountTotal;

      if (netLinePriceAfterItemDiscounts < 0) {
        throw new Error('El total de descuentos del ítem no puede exceder su precio base.');
      }

      const vatAmountItem = netLinePriceAfterItemDiscounts * (resolvedVatRateDetails.rate / 100);
      const finalPriceItem = netLinePriceAfterItemDiscounts + vatAmountItem;

      // Obtener información de la clínica del ticket
      const ticketInfo = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { clinicId: true }
      })

      await tx.ticketItem.create({
        data: {
          ticketId: ticketId, 
          systemId: systemId, // 🏢 NUEVO: Añadir systemId
          clinicId: ticketInfo?.clinicId, // 🏥 NUEVO: Añadir clinicId
          itemType: itemType,
          productId: itemType === 'PRODUCT' ? itemId : null,
          serviceId: itemType === 'SERVICE' ? itemId : null,
          bonoDefinitionId: itemType === 'BONO_DEFINITION' ? itemId : null,
          packageDefinitionId: itemType === 'PACKAGE_DEFINITION' ? itemId : null,
          description: description,
          quantity: quantity,
          unitPrice: resolvedUnitPrice, 
          originalUnitPrice: originalItemPrice, 
          isPriceOverridden: manualUnitPriceInput !== undefined && manualUnitPriceInput !== resolvedUnitPrice,
          manualDiscountAmount: manualDiscountAmount,
          discountNotes: discountNotes,
          appliedPromotionId: appliedPromotionId,
          promotionDiscountAmount: promotionDiscountAmount,
          vatRateId: resolvedVatRateDetails.id,
          vatAmount: parseFloat(vatAmountItem.toFixed(2)),
          originalVatTypeId: resolvedVatRateDetails.id, 
          finalPrice: parseFloat(finalPriceItem.toFixed(2)),
          consumedBonoInstanceId: consumedBonoInstanceId,
          consumedPackageInstanceId: consumedPackageInstanceId,
        }
      });

      const currentTicketState = await tx.ticket.findUniqueOrThrow({
        where: { id: ticketId }, 
        include: { items: true }
      }) as Ticket & { items: TicketItem[], paidAmount: number | null, discountAmount: number | null }; 
      
      let newTicketSubtotal = 0; 
      let newTicketTaxAmount = 0;  

      currentTicketState.items.forEach(item => {
        const itemBaseTotal = item.unitPrice * item.quantity;
        const itemTotalDiscount = (item.manualDiscountAmount || 0) + (item.promotionDiscountAmount || 0);
        const itemNetPriceAfterItemDiscount = itemBaseTotal - itemTotalDiscount;
        newTicketSubtotal += itemNetPriceAfterItemDiscount; 
        newTicketTaxAmount += item.vatAmount; 
      });

      const newTicketTotalAmount = newTicketSubtotal; 
      const ticketGlobalDiscount = currentTicketState.discountAmount ?? 0;
      const newTicketFinalAmount = newTicketTotalAmount + newTicketTaxAmount - ticketGlobalDiscount; 

      // --- INICIO DE MODIFICACIONES ---
      const currentPaidAmount = currentTicketState.paidAmount ?? 0;
      let newPendingAmount = newTicketFinalAmount - currentPaidAmount;
      newPendingAmount = Math.max(0, newPendingAmount); // Asegurar que no sea negativo
      const newHasOpenDebt = newPendingAmount > 0;
      // --- FIN DE MODIFICACIONES ---

      return tx.ticket.update({
        where: { id: ticketId }, 
        data: {
          totalAmount: parseFloat(newTicketTotalAmount.toFixed(2)), 
          taxAmount: parseFloat(newTicketTaxAmount.toFixed(2)),     
          finalAmount: parseFloat(newTicketFinalAmount.toFixed(2)),
          // --- INICIO DE MODIFICACIONES ---
          // paidAmount no se modifica aquí, solo se usa para calcular pendingAmount
          pendingAmount: parseFloat(newPendingAmount.toFixed(2)),
          hasOpenDebt: newHasOpenDebt,
          // --- FIN DE MODIFICACIONES ---
        },
        include: { 
          client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, taxId: true, fiscalName: true, address: true, city: true, postalCode: true, countryIsoCode: true }},
          company: true, 
          sellerUser: { select: { id: true, firstName: true, lastName: true }},
          cashierUser: { select: { id: true, firstName: true, lastName: true }},
          clinic: { include: { tariff: true }},
          items: { 
            orderBy: { createdAt: 'asc' },
            include: {
              service: { select: { id: true, name: true, durationMinutes: true } },
              product: { select: { id: true, name: true, sku: true } },
              bonoDefinition: { select: { id: true, name: true } },
              packageDefinition: { select: { id: true, name: true } },
              vatRate: { select: { id: true, name: true, rate: true } },
              originalVatType: { select: { id: true, name: true, rate: true } },
              appliedPromotion: { select: { id: true, name: true, code: true } },
              consumedBonoInstance: { include: { bonoDefinition: {select: {name: true, serviceId: true, productId: true}} } },
              consumedPackageInstance: { include: { packageDefinition: {select: {name: true}} } },
            }
          }, 
          payments: { 
            orderBy: { paymentDate: 'asc' },
            include: {
              paymentMethodDefinition: { select: { id: true, name: true, type: true } },
              bankAccount: { select: { id: true, accountName: true, iban: true, bank: { select: { name: true } } } },
              posTerminal: { select: { id: true, name: true } },
              user: { select: { id: true, firstName: true, lastName: true } } 
            }
          }, 
          invoice: { select: { id: true, invoiceNumber: true, invoiceSeries: true, issueDate: true, totalAmount: true, status: true }},
          originalTicket: { select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true }},
          returnTickets: { select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true, status: true}},
          cashSession: { select: { id: true, sessionNumber: true, closingTime: true, status: true}},
          relatedDebts: true
        }
      });
    });

    return NextResponse.json(updatedTicketData);

  } catch (error: any) {
    const ticketIdForError = (await paramsPromise)?.id || 'desconocido';
    console.error(`[API_TICKETS_ITEMS_POST] Error adding item to ticket ${ticketIdForError}:`, error); 
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("Solo se pueden añadir ítems") ? 403 :
                   error.message?.includes("excede el total de descuentos") ? 400 :
                   error.message?.includes("no tiene una tarifa") || error.message?.includes("no tiene un precio base") || error.message?.includes("no tiene un tipo de IVA") ? 400 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al añadir el ítem.' }, { status });
  }
} 