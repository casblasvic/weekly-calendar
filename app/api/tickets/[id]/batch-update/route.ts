import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, DiscountType, VATType, CashSessionStatus, TicketItemType } from '@prisma/client';
// Importaremos BatchUpdateTicketPayload desde el hook o lo definiremos aquí con Zod

// Esquema para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

// Esquema Zod para BatchUpdateTicketPayload (simplificado por ahora, se detallará después)
// Esto debería coincidir con la interfaz BatchUpdateTicketPayload de los hooks
const batchUpdateTicketPayloadSchema = z.object({
  scalarUpdates: z.object({
    clientId: z.string().cuid().nullable().optional(),
    sellerUserId: z.string().cuid().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    ticketSeries: z.string().nullable().optional(),
    discountType: z.nativeEnum(DiscountType).nullable().optional(),
    discountAmount: z.number().min(0).nullable().optional(),
    discountReason: z.string().max(255).nullable().optional(),
  }).optional(),
  itemsToAdd: z.array(z.object({
    itemType: z.nativeEnum(TicketItemType),
    itemId: z.string().cuid(),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0).optional(),
    manualDiscountAmount: z.number().min(0).nullable().optional(),
    discountNotes: z.string().nullable().optional(),
    appliedPromotionId: z.string().cuid().nullable().optional(),
    promotionDiscountAmount: z.number().min(0).nullable().optional(),
    tempId: z.string().optional(),
  })).optional(),
  itemsToUpdate: z.array(z.object({
    id: z.string().cuid(),
    updates: z.object({
      quantity: z.number().min(0.01).optional(),
      unitPrice: z.number().min(0).optional(),
      isPriceOverridden: z.boolean().optional(),
      finalPrice: z.number().min(0).optional(),
      manualDiscountPercentage: z.number().min(0).max(100).optional().nullable(),
      manualDiscountAmount: z.number().min(0).optional().nullable(),
      discountNotes: z.string().nullable().optional(),
      appliedPromotionId: z.string().cuid().nullable().optional(),
      promotionDiscountAmount: z.number().min(0).nullable().optional(),
    }),
  })).optional(),
  itemIdsToDelete: z.array(z.string().cuid()).optional(),
  paymentsToAdd: z.array(
    z.object({
      amount: z.number().positive(),
      paymentMethodDefinitionId: z.string().cuid(),
      paymentDate: z.string().datetime().optional(),
      clinicId: z.string().cuid().optional(),
      notes: z.string().nullable().optional(),
      transactionReference: z.string().nullable().optional(),
      tempId: z.string().optional(),
    }).passthrough()
  ).optional(),
  paymentIdsToDelete: z.array(z.string().cuid()).optional(),
  amountToDefer: z.number().min(0).optional().nullable(),
});

async function getPriceAndVatDetails(
  tx: Prisma.TransactionClient, 
  itemType: TicketItemType, 
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

  if (itemType === TicketItemType.PRODUCT) {
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

  } else if (itemType === TicketItemType.SERVICE) {
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

  } else if (itemType === TicketItemType.BONO_DEFINITION) {
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

  } else if (itemType === TicketItemType.PACKAGE_DEFINITION) {
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
    // Si es BONO o PACKAGE y no tienen IVA explícito, usar el defaultVatForComplexItems
    if ((itemType === TicketItemType.BONO_DEFINITION || itemType === TicketItemType.PACKAGE_DEFINITION) && defaultVatForComplexItems) {
        resolvedVatRateDetails = defaultVatForComplexItems;
    } else {
        throw new Error(`El ${itemType} '${description}' no tiene un tipo de IVA configurado o por defecto.`);
    }
  }
  return { resolvedUnitPrice, resolvedVatRateDetails, description, originalItemPrice };
}

export async function PUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId, id: currentUserId } = session.user;

    const actualParams = await paramsPromise;
    const paramsValidation = paramsSchema.safeParse(actualParams);

    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'ID de ticket inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const ticketId = paramsValidation.data.id;

    const body = await request.json();
    const payloadValidation = batchUpdateTicketPayloadSchema.safeParse(body);

    if (!payloadValidation.success) {
      console.error("[API BatchUpdate] Zod payload validation failed:", payloadValidation.error.format());
      if (body.paymentIdsToDelete) {
        console.log("[API BatchUpdate] RAW body.paymentIdsToDelete ANTES de Zod:", JSON.stringify(body.paymentIdsToDelete, null, 2));
        console.log("[API BatchUpdate] TIPO DE body.paymentIdsToDelete ANTES de Zod:", typeof body.paymentIdsToDelete, "Es Array?", Array.isArray(body.paymentIdsToDelete));
      }
      return NextResponse.json({ message: 'Payload de actualización en lote inválido', errors: payloadValidation.error.format() }, { status: 400 });
    }
    const payload = payloadValidation.data;
    console.log(`[API BatchUpdate] Iniciando actualización para ticket ${ticketId}`);
    console.log("[API BatchUpdate] payload.paymentIdsToDelete DESPUÉS de Zod:", JSON.stringify(payload.paymentIdsToDelete, null, 2));
    console.log("[API BatchUpdate] TIPO DE payload.paymentIdsToDelete DESPUÉS de Zod:", typeof payload.paymentIdsToDelete, "Es Array?", Array.isArray(payload.paymentIdsToDelete));
    if (Array.isArray(payload.paymentIdsToDelete)) {
      payload.paymentIdsToDelete.forEach((id, index) => {
        console.log(`[API BatchUpdate] paymentIdsToDelete[${index}] DESPUÉS de Zod: '${id}', Tipo: ${typeof id}`);
      });
    }

    const updatedTicketResult = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId, systemId },
        include: { items: true, payments: true, client: { select: { id: true }}, clinic: {select: {tariffId: true, currency: true}} },
      });

      if (!ticket) throw new Error('Ticket no encontrado o no pertenece al sistema.');
      if (ticket.status !== TicketStatus.OPEN) throw new Error(`El ticket no está en estado OPEN. Estado actual: ${ticket.status}`);
      if (!ticket.clinic.tariffId) throw new Error("La clínica del ticket no tiene una tarifa por defecto asignada.");
      const clinicTariffId = ticket.clinic.tariffId;
      let currentPaidAmountDirectly = ticket.paidAmountDirectly || 0;
      const dataToUpdate: Prisma.TicketUpdateInput = {};
      let needsScalarUpdate = false;
      let needsTotalsRecalculation = false;

      // 0. Procesar eliminaciones primero
      // 0.1 Procesar payload.paymentIdsToDelete
      if (payload.paymentIdsToDelete && payload.paymentIdsToDelete.length > 0) {
        for (const paymentId of payload.paymentIdsToDelete) {
          const paymentToDelete = await tx.payment.findUnique({ where: { id: paymentId, ticketId: ticket.id } });
          if (paymentToDelete) {
            if (paymentToDelete.type === 'DEBIT') { // Solo restar si era un ingreso directo
              currentPaidAmountDirectly -= paymentToDelete.amount;
            }
            await tx.payment.delete({ where: { id: paymentId } });
            console.log(`[API BatchUpdate] Payment ${paymentId} deleted.`);
          } else {
            console.warn(`[API BatchUpdate] Payment ${paymentId} to delete not found or not associated with ticket ${ticket.id}.`);
          }
        }
        needsTotalsRecalculation = true; // Cambios en pagos afectan el estado de pago
      }

      // 0.2 Procesar payload.itemIdsToDelete
      if (payload.itemIdsToDelete && payload.itemIdsToDelete.length > 0) {
        for (const ticketItemId of payload.itemIdsToDelete) {
          const itemToDelete = await tx.ticketItem.findUnique({
            where: { id: ticketItemId, ticketId: ticket.id },
            include: { product: { include: { settings: true } }, consumedBonoInstance: true, consumedPackageInstance: true }
          });

          if (itemToDelete) {
            // Revertir stock si es producto
            if (itemToDelete.itemType === 'PRODUCT' && itemToDelete.productId && itemToDelete.product?.settings) {
              await tx.productSetting.update({
                where: { productId: itemToDelete.productId },
                data: { currentStock: { increment: itemToDelete.quantity } }
              });
            }
            // Revertir consumo de bono
            if (itemToDelete.consumedBonoInstanceId) {
              await tx.bonoInstance.update({
                where: { id: itemToDelete.consumedBonoInstanceId },
                data: { remainingQuantity: { increment: itemToDelete.quantity } } // Asume 1 item Qty = 1 sesión de bono
              });
            }
            // TODO: Revertir consumo de paquete (similar a bono)

            await tx.ticketItem.delete({ where: { id: ticketItemId } });
            console.log(`[API BatchUpdate] TicketItem ${ticketItemId} deleted.`);
          } else {
            console.warn(`[API BatchUpdate] TicketItem ${ticketItemId} to delete not found or not associated with ticket ${ticket.id}.`);
          }
        }
        needsTotalsRecalculation = true; // Cambios en ítems afectan totales
      }
      
      // 1. Procesar payload.scalarUpdates
      if (payload.scalarUpdates) {
        const { scalarUpdates } = payload;
        if (scalarUpdates.clientId !== undefined) {
          dataToUpdate.client = scalarUpdates.clientId ? { connect: { id: scalarUpdates.clientId } } : { disconnect: true };
          needsScalarUpdate = true;
        }
        if (scalarUpdates.sellerUserId !== undefined) {
          dataToUpdate.sellerUser = scalarUpdates.sellerUserId ? { connect: { id: scalarUpdates.sellerUserId } } : { disconnect: true };
          needsScalarUpdate = true;
        }
        if (scalarUpdates.notes !== undefined) {
          dataToUpdate.notes = scalarUpdates.notes;
          needsScalarUpdate = true;
        }
        if (scalarUpdates.ticketSeries !== undefined) {
          dataToUpdate.ticketSeries = scalarUpdates.ticketSeries;
          needsScalarUpdate = true;
        }
        if (scalarUpdates.discountType !== undefined || scalarUpdates.discountAmount !== undefined || scalarUpdates.discountReason !== undefined) {
          if ((scalarUpdates.discountAmount !== null && scalarUpdates.discountAmount > 0 && scalarUpdates.discountType === null) || 
              (scalarUpdates.discountType !== null && (scalarUpdates.discountAmount === null || scalarUpdates.discountAmount <= 0) ) ) {
              if (! (scalarUpdates.discountType === null && (scalarUpdates.discountAmount === null || scalarUpdates.discountAmount === 0))) {
                   throw new Error('El tipo y el monto del descuento global deben proporcionarse juntos o ambos ser nulos/cero.');
              }
          }
          dataToUpdate.discountType = scalarUpdates.discountType;
          dataToUpdate.discountAmount = (scalarUpdates.discountType === null) ? null : scalarUpdates.discountAmount;
          dataToUpdate.discountReason = (scalarUpdates.discountType === null) ? null : scalarUpdates.discountReason;
          needsScalarUpdate = true;
          needsTotalsRecalculation = true; // Descuentos globales afectan totales
        }
      }
      
      // TEMPORAL: Aplicar solo actualizaciones escalares si existen.
      // La lógica completa de ítems, pagos y recálculo de totales se añadirá después.
      if (needsScalarUpdate) {
        console.log("[API BatchUpdate] Scalar changes prepared.");
      }

      // 2. Procesar payload.itemsToAdd
      if (payload.itemsToAdd && payload.itemsToAdd.length > 0) {
        for (const itemToAdd of payload.itemsToAdd) {
          const { 
            resolvedUnitPrice, 
            resolvedVatRateDetails, 
            description: itemDescription,
            originalItemPrice 
          } = await getPriceAndVatDetails(
            tx,
            itemToAdd.itemType as 'PRODUCT' | 'SERVICE' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION',
            itemToAdd.itemId, // Este es el ID del producto/servicio/bono/paquete base
            clinicTariffId,
            systemId,
            itemToAdd.unitPrice
          );

          const quantity = itemToAdd.quantity;
          const manualDiscountAmount = itemToAdd.manualDiscountAmount || 0;
          const promotionDiscountAmount = itemToAdd.promotionDiscountAmount || 0;
          const linePriceBeforeTax = (resolvedUnitPrice * quantity) - manualDiscountAmount - promotionDiscountAmount;
          if (linePriceBeforeTax < 0 && (manualDiscountAmount > 0 || promotionDiscountAmount > 0)) {
            throw new Error(`Los descuentos para el ítem '${itemDescription}' no pueden exceder su precio base.`);
          }
          const vatAmount = linePriceBeforeTax * (resolvedVatRateDetails.rate / 100);
          const finalPrice = linePriceBeforeTax + vatAmount;

          const ticketItemDataForCreation: Prisma.TicketItemUncheckedCreateInput = {
            ticketId: ticket.id,
            itemType: itemToAdd.itemType,
            ...(itemToAdd.itemType === TicketItemType.PRODUCT && { productId: itemToAdd.itemId }),
            ...(itemToAdd.itemType === TicketItemType.SERVICE && { serviceId: itemToAdd.itemId }),
            ...(itemToAdd.itemType === TicketItemType.BONO_DEFINITION && { bonoDefinitionId: itemToAdd.itemId }),
            ...(itemToAdd.itemType === TicketItemType.PACKAGE_DEFINITION && { packageDefinitionId: itemToAdd.itemId }),
            description: itemDescription,
            quantity: quantity,
            unitPrice: resolvedUnitPrice,
            originalUnitPrice: originalItemPrice, 
            isPriceOverridden: itemToAdd.unitPrice !== undefined && itemToAdd.unitPrice !== resolvedUnitPrice,
            manualDiscountAmount: manualDiscountAmount,
            discountNotes: itemToAdd.discountNotes ?? null,
            appliedPromotionId: itemToAdd.appliedPromotionId,
            promotionDiscountAmount: promotionDiscountAmount,
            vatRateId: resolvedVatRateDetails.id,
            vatAmount: parseFloat(vatAmount.toFixed(2)),
            finalPrice: parseFloat(finalPrice.toFixed(2)),
          };

          // Eliminar propiedades undefined del objeto de datos
          Object.keys(ticketItemDataForCreation).forEach(key => {
            const typedKey = key as keyof typeof ticketItemDataForCreation;
            if (ticketItemDataForCreation[typedKey] === undefined) {
              delete ticketItemDataForCreation[typedKey];
            }
          });

          console.log("[API BatchUpdate] ticketItemDataForCreation (limpio):", ticketItemDataForCreation);

          const createdItem = await tx.ticketItem.create({
            data: ticketItemDataForCreation
          });
          console.log(`[API BatchUpdate] TicketItem ${createdItem.id} created for item '${itemDescription}'.`);

          if (itemToAdd.itemType === 'PRODUCT') {
            // CORRECCIÓN para buscar y actualizar ProductSetting:
            // Asumimos que ProductSetting tiene una FK productId que es única o parte de un índice único con systemId.
            // Para buscarlo, si no es CUID, y productId es el identificador único de ProductSetting para el producto:
            const productSetting = await tx.productSetting.findUnique({
              where: { productId: itemToAdd.itemId } // Asumiendo que productId es la clave para buscar el setting del producto
            });
            
            if (productSetting) { 
              await tx.productSetting.update({
                where: { id: productSetting.id }, // Actualizar por el ID de ProductSetting
                data: { currentStock: { decrement: quantity } },
              });
              console.log(`[API BatchUpdate] Stock decremented for product ${itemToAdd.itemId} by ${quantity}.`);
            } else {
              console.warn(`[API BatchUpdate] ProductSetting no encontrado para productId ${itemToAdd.itemId}. No se actualizó el stock.`);
            }
          }
        }
        needsTotalsRecalculation = true;
      }

      // 3. Procesar payload.itemsToUpdate
      if (payload.itemsToUpdate && payload.itemsToUpdate.length > 0) {
        for (const itemToUpdate of payload.itemsToUpdate) {
          const existingItem = await tx.ticketItem.findUnique({
            where: { id: itemToUpdate.id, ticketId: ticket.id },
            include: { vatRate: true } // Incluir para obtener el vatRate si no hay snapshot
          });

          if (!existingItem) {
            console.warn(`[API BatchUpdate] TicketItem ${itemToUpdate.id} para actualizar no encontrado.`);
            continue; 
          }

          const itemUpdateData: Prisma.TicketItemUpdateInput = {};
          let needsItemPriceRecalculation = false;
          const updatesReceived = itemToUpdate.updates;
          console.log(`[API BatchUpdate - itemsToUpdate] Ítem ${existingItem.id} - Updates RECIBIDOS:`, JSON.stringify(updatesReceived));

          // Prioridad a isPriceOverridden
          if (updatesReceived.isPriceOverridden === true && updatesReceived.finalPrice !== undefined) {
            console.log(`[API BatchUpdate - itemsToUpdate] Ítem ${existingItem.id} - Aplicando PRECIO FINAL DIRECTO: ${updatesReceived.finalPrice}`);
            itemUpdateData.isPriceOverridden = true;
            itemUpdateData.finalPrice = updatesReceived.finalPrice; // Este es el precio de línea neto
            const basePrice = (existingItem.unitPrice * existingItem.quantity);
            const newManualAmount = parseFloat((basePrice - updatesReceived.finalPrice).toFixed(2));
            itemUpdateData.manualDiscountAmount = newManualAmount >= 0 ? newManualAmount : 0;
            itemUpdateData.manualDiscountPercentage = null;
            needsItemPriceRecalculation = true; // Para recalcular vatAmount
          } else {
            // Si no es overridden, procesar descuentos manuales
            itemUpdateData.isPriceOverridden = false; // Asegurar que sea false si no se está fijando precio
            let percentageUpdated = false;
            if (updatesReceived.manualDiscountPercentage !== undefined) {
              const newPerc = updatesReceived.manualDiscountPercentage ?? null;
              if (newPerc !== (existingItem.manualDiscountPercentage ?? null)) {
                itemUpdateData.manualDiscountPercentage = newPerc;
                const basePriceForDiscount = ((itemUpdateData.unitPrice ?? existingItem.unitPrice) as number) * ((itemUpdateData.quantity ?? existingItem.quantity) as number);
                itemUpdateData.manualDiscountAmount = newPerc !== null ? parseFloat(((newPerc / 100) * basePriceForDiscount).toFixed(2)) : 0;
                needsItemPriceRecalculation = true;
                percentageUpdated = true;
              }
            } 
            if (!percentageUpdated && updatesReceived.manualDiscountAmount !== undefined) {
              const newAmount = updatesReceived.manualDiscountAmount ?? 0;
              if (newAmount !== (existingItem.manualDiscountAmount ?? 0)) {
                itemUpdateData.manualDiscountAmount = newAmount;
                itemUpdateData.manualDiscountPercentage = null;
                console.log(`[API BatchUpdate - itemsToUpdate] Ítem ${existingItem.id} - Vía IMPORTE. newAmount: ${itemUpdateData.manualDiscountAmount}, Perc Anulado.`);
                needsItemPriceRecalculation = true;
              }
            } else if (updatesReceived.manualDiscountPercentage !== undefined && 
                       updatesReceived.manualDiscountPercentage === (existingItem.manualDiscountPercentage ?? null) && 
                       updatesReceived.manualDiscountAmount !== undefined && // Asegurar que venga el monto
                       updatesReceived.manualDiscountAmount !== (existingItem.manualDiscountAmount ?? 0)) {
              // Caso especial: El porcentaje no cambió, pero el monto sí 
              // (ej. el modal recalculó y envió ambos, pero solo el monto es diferente por redondeo o ajuste manual del monto)
              itemUpdateData.manualDiscountAmount = updatesReceived.manualDiscountAmount ?? 0;
              // Mantener el porcentaje existente si no cambió explícitamente
              itemUpdateData.manualDiscountPercentage = existingItem.manualDiscountPercentage;
              console.log(`[API BatchUpdate - itemsToUpdate] Ítem ${existingItem.id} - Rama IMPORTE (porcentaje no cambió explícitamente, monto sí). newAmount: ${itemUpdateData.manualDiscountAmount}`);
              needsItemPriceRecalculation = true;
            } else {
              console.log(`[API BatchUpdate - itemsToUpdate] Ítem ${existingItem.id} - Sin cambios detectados en descuentos manuales (perc y amount) respecto a BD.`);
            }
          }
          
          // Actualizar otros campos como quantity, unitPrice (si se permite), discountNotes, appliedPromotionId, promotionDiscountAmount
          // ... (copiar la lógica existente para estos campos, asegurando que no entren en conflicto con isPriceOverridden)
          if (updatesReceived.quantity !== undefined && updatesReceived.quantity !== existingItem.quantity) {
            itemUpdateData.quantity = updatesReceived.quantity;
            needsItemPriceRecalculation = true;
          }
          if (updatesReceived.unitPrice !== undefined && updatesReceived.unitPrice !== existingItem.unitPrice) {
            itemUpdateData.unitPrice = updatesReceived.unitPrice;
            itemUpdateData.isPriceOverridden = true;
            needsItemPriceRecalculation = true;
          }
          if (updatesReceived.discountNotes !== undefined && updatesReceived.discountNotes !== (existingItem.discountNotes ?? null) ) {
            itemUpdateData.discountNotes = updatesReceived.discountNotes;
          }
          
          if (updatesReceived.appliedPromotionId !== undefined) {
            if (updatesReceived.appliedPromotionId) {
              itemUpdateData.appliedPromotion = { connect: { id: updatesReceived.appliedPromotionId } };
            } else {
              itemUpdateData.appliedPromotion = { disconnect: true };
            }
            needsItemPriceRecalculation = true;
          }
          if (updatesReceived.promotionDiscountAmount !== undefined && updatesReceived.promotionDiscountAmount !== (existingItem.promotionDiscountAmount ?? 0)) {
            itemUpdateData.promotionDiscountAmount = updatesReceived.promotionDiscountAmount ?? 0;
            needsItemPriceRecalculation = true;
          }

          if (needsItemPriceRecalculation) {
            const iu_unitPrice = Number(itemUpdateData.unitPrice ?? existingItem.unitPrice);
            const iu_quantity = Number(itemUpdateData.quantity ?? existingItem.quantity);
            let iu_lineBase = iu_unitPrice * iu_quantity;

            if (itemUpdateData.isPriceOverridden === true && typeof itemUpdateData.finalPrice === 'number') {
              iu_lineBase = itemUpdateData.finalPrice; // El finalPrice (neto) es la base para el IVA
            } else {
              const iu_manualDiscount = Number(itemUpdateData.manualDiscountAmount ?? existingItem.manualDiscountAmount ?? 0);
              const iu_promoDiscount = Number(itemUpdateData.promotionDiscountAmount ?? existingItem.promotionDiscountAmount ?? 0);
              iu_lineBase = iu_lineBase - iu_manualDiscount - iu_promoDiscount;
            }
            if (iu_lineBase < 0) iu_lineBase = 0; // Prevenir base negativa para IVA

            const vatRateToUse = existingItem.vatRate?.rate ?? 0; 
            itemUpdateData.vatAmount = parseFloat((iu_lineBase * (vatRateToUse / 100)).toFixed(2));
            // El finalPrice en DB es el neto de línea (antes de IVA)
            itemUpdateData.finalPrice = parseFloat(iu_lineBase.toFixed(2)); 
          }

          if (Object.keys(itemUpdateData).length > 0) {
            // Asegurar que manualDiscountAmount no sea null si el schema no lo permite
            if (itemUpdateData.manualDiscountAmount === null) {
                itemUpdateData.manualDiscountAmount = 0; 
            }
            // Si manualDiscountPercentage va a ser null, y el amount no se recalculó a 0, poner amount a 0.
            if (itemUpdateData.manualDiscountPercentage === null && itemUpdateData.manualDiscountAmount !== 0 && !updatesReceived.manualDiscountAmount ){
                // Esta condición es si el % se puso a null, y no se actualizó el monto explícitamente.
                // itemUpdateData.manualDiscountAmount = 0; // Podría ser demasiado agresivo.
            }

            console.log(`[API BatchUpdate] Final itemUpdateData para ${itemToUpdate.id}:`, JSON.stringify(itemUpdateData));
            await tx.ticketItem.update({ where: { id: itemToUpdate.id }, data: itemUpdateData });
            console.log(`[API BatchUpdate] TicketItem ${itemToUpdate.id} updated.`);
          }
        }
        needsTotalsRecalculation = true; 
      }

      // 4. Procesar payload.paymentsToAdd
      if (payload.paymentsToAdd && payload.paymentsToAdd.length > 0) {
        const activeCashSession = await tx.cashSession.findFirst({
          where: {
            clinicId: ticket.clinicId,
            systemId: systemId,
            status: CashSessionStatus.OPEN,
            // Considerar posTerminalId si los pagos se asocian a un TPV específico desde el form.
            // Por ahora, se asocia a la caja general abierta de la clínica.
          },
          orderBy: { openingTime: 'desc' } // Tomar la más reciente si hubiera varias (no debería)
        });

        for (const paymentToAdd of payload.paymentsToAdd) {
          const paymentDate = paymentToAdd.paymentDate ? new Date(paymentToAdd.paymentDate) : new Date();
          
          // Validar que el paymentMethodDefinitionId existe
          const paymentMethodDef = await tx.paymentMethodDefinition.findUnique({
            where: { id: paymentToAdd.paymentMethodDefinitionId, systemId: systemId }
          });
          if (!paymentMethodDef) {
            throw new Error(`Método de pago con ID ${paymentToAdd.paymentMethodDefinitionId} no encontrado.`);
          }

          const createdPayment = await tx.payment.create({
            data: {
              ticketId: ticket.id,
              amount: paymentToAdd.amount,
              paymentDate: paymentDate,
              paymentMethodDefinitionId: paymentToAdd.paymentMethodDefinitionId,
              clinicId: ticket.clinicId, 
              userId: currentUserId, 
              cashSessionId: activeCashSession?.id, 
              type: 'DEBIT', 
              transactionReference: paymentToAdd.transactionReference,
              notes: paymentToAdd.notes,
              systemId: systemId,
              // bankAccountId: paymentToAdd.bankAccountId, // Si se envía y es relevante
              // posTerminalId: paymentToAdd.posTerminalId, // Si se envía y es relevante
            }
          });
          currentPaidAmountDirectly += createdPayment.amount;
          console.log(`[API BatchUpdate] Payment ${createdPayment.id} created for amount ${createdPayment.amount}.`);
        }
        needsTotalsRecalculation = true; 
      }

      // Establecer el paidAmountDirectly acumulado en dataToUpdate ANTES de la lógica de deuda
      dataToUpdate.paidAmountDirectly = parseFloat(currentPaidAmountDirectly.toFixed(2));

      // --- 4. LÓGICA DE DEBTLEDGER Y CAMPOS DE DEUDA DEL TICKET ---
      if (payload.amountToDefer !== undefined && payload.amountToDefer !== null) {
        const amountToDefer = payload.amountToDefer;
        const clientIdForDebt = payload.scalarUpdates?.clientId === null ? null : (payload.scalarUpdates?.clientId || ticket.clientId);

        const existingDebt = await tx.debtLedger.findFirst({
          where: { ticketId: ticket.id, status: { notIn: ['PAID', 'CANCELLED'] } }
        });

        if (amountToDefer > 0) {
          if (!clientIdForDebt) {
              throw new Error("Se requiere un cliente para crear o actualizar una deuda aplazada.");
          }
          if (existingDebt) {
            const newPendingAmount = amountToDefer - (existingDebt.paidAmount || 0);
            await tx.debtLedger.update({
              where: { id: existingDebt.id },
              data: { 
                originalAmount: amountToDefer, 
                pendingAmount: newPendingAmount,
                status: newPendingAmount <= 0 ? 'PAID' : 'PENDING'
              }
            });
          } else {
            await tx.debtLedger.create({
              data: {
                ticketId: ticketId,
                clientId: clientIdForDebt, 
                clinicId: ticket.clinicId,
                systemId: systemId,
                originalAmount: amountToDefer,
                pendingAmount: amountToDefer,
                status: 'PENDING',
              }
            });
          }
          dataToUpdate.hasOpenDebt = true;
          dataToUpdate.dueAmount = amountToDefer; 
        } else { // amountToDefer es 0
          if (existingDebt) {
            if ((existingDebt.paidAmount || 0) === 0) {
              await tx.debtLedger.update({ where: { id: existingDebt.id }, data: { status: 'CANCELLED', pendingAmount: 0 }});
              dataToUpdate.hasOpenDebt = false;
              dataToUpdate.dueAmount = 0;
            } else {
              dataToUpdate.hasOpenDebt = true; 
              dataToUpdate.dueAmount = existingDebt.pendingAmount; 
            }
          } else {
            dataToUpdate.hasOpenDebt = false;
            dataToUpdate.dueAmount = 0;
          }
        }
        needsTotalsRecalculation = true; 
      } else if (payload.paymentsToAdd || payload.paymentIdsToDelete) {
         // Si amountToDefer no vino, pero hubo cambios en pagos, solo paidAmountDirectly se actualiza (ya hecho arriba).
      }

      // 7. Recalcular Totales del Ticket y preparar actualización final
      if (needsTotalsRecalculation || needsScalarUpdate) { 
        const finalTicketItems = await tx.ticketItem.findMany({
          where: { ticketId: ticket.id }
        });

        let newTicketTotalAmountBruto = 0; 
        finalTicketItems.forEach(item => {
          newTicketTotalAmountBruto += (item.unitPrice * item.quantity);
        });

        let totalDescuentosDeLinea = 0;
        finalTicketItems.forEach(item => {
            totalDescuentosDeLinea += (item.manualDiscountAmount || 0) + (item.promotionDiscountAmount || 0);
        });

        const baseParaDescuentoGlobal = newTicketTotalAmountBruto - totalDescuentosDeLinea;
        dataToUpdate.totalAmount = parseFloat(baseParaDescuentoGlobal.toFixed(2));

        let newTicketTaxAmount = 0;
        finalTicketItems.forEach(item => {
          newTicketTaxAmount += item.vatAmount; 
        });
        dataToUpdate.taxAmount = parseFloat(newTicketTaxAmount.toFixed(2));

        // Determinar el descuento global a APLICAR (puede ser el nuevo o el existente)
        const globalDiscountTypeToUse = dataToUpdate.discountType !== undefined ? dataToUpdate.discountType : ticket.discountType;
        
        // Asegurar que globalDiscountValueToUse sea un número (0 si es null/undefined)
        let globalDiscountValueToUse: number = 0;
        if (dataToUpdate.discountAmount !== undefined && dataToUpdate.discountAmount !== null) {
          globalDiscountValueToUse = dataToUpdate.discountAmount as number; // Cast si estamos seguros que es number o null
        } else if (ticket.discountAmount !== null && ticket.discountAmount !== undefined) {
          globalDiscountValueToUse = ticket.discountAmount;
        }
        
        let effectiveGlobalDiscountApplied = 0;
        if (globalDiscountTypeToUse === DiscountType.PERCENTAGE) {
          effectiveGlobalDiscountApplied = baseParaDescuentoGlobal * (globalDiscountValueToUse / 100); // Ahora globalDiscountValueToUse es number
        } else if (globalDiscountTypeToUse === DiscountType.FIXED_AMOUNT) {
          effectiveGlobalDiscountApplied = globalDiscountValueToUse; // Ahora globalDiscountValueToUse es number
        }
        effectiveGlobalDiscountApplied = Math.max(0, Math.min(effectiveGlobalDiscountApplied, baseParaDescuentoGlobal));
        
        // El campo dataToUpdate.discountAmount ya guarda el VALOR del descuento global (no el efectivo aplicado)
        // si se actualizó desde payload.scalarUpdates.

        dataToUpdate.finalAmount = parseFloat(((baseParaDescuentoGlobal - effectiveGlobalDiscountApplied) + newTicketTaxAmount).toFixed(2));
        
        // dataToUpdate.paidAmountDirectly, dataToUpdate.dueAmount, y dataToUpdate.hasOpenDebt ya están seteados.

        console.log("[API BatchUpdate] Recalculated Totals => totalAmount (subtotal neto línea):", dataToUpdate.totalAmount, "taxAmount:", dataToUpdate.taxAmount, "finalAmount (a pagar):", dataToUpdate.finalAmount, "paidAmountDirectly:", dataToUpdate.paidAmountDirectly, "dueAmount (aplazado):", dataToUpdate.dueAmount, "hasOpenDebt:", dataToUpdate.hasOpenDebt);

        // Recalcular la suma total de todos los pagos DEBIT asociados al ticket
        // Esto asegura que paidAmount refleje el estado real después de eliminaciones/adiciones.
        const allTicketPayments = await tx.payment.findMany({
          where: {
            ticketId: ticket.id,
            type: 'DEBIT' // Considerar solo ingresos para el paidAmount general
          }
        });
        const totalActuallyPaid = allTicketPayments.reduce((sum, payment) => sum + payment.amount, 0);

        dataToUpdate.paidAmount = parseFloat(totalActuallyPaid.toFixed(2));

        // Asegurarse de que finalAmount es un número para el cálculo de pendingAmount
        const finalAmountForPendingCalc = (typeof dataToUpdate.finalAmount === 'number') 
                                          ? dataToUpdate.finalAmount 
                                          : (ticket.finalAmount ?? 0); // Usar el valor existente si no se recalculó

        dataToUpdate.pendingAmount = parseFloat((finalAmountForPendingCalc - totalActuallyPaid).toFixed(2));

        console.log(`[API BatchUpdate] Recalculated general paidAmount: ${dataToUpdate.paidAmount}, pendingAmount: ${dataToUpdate.pendingAmount}`);
        
        await tx.ticket.update({
          where: { id: ticketId },
          data: dataToUpdate,
        });
        console.log(`[API BatchUpdate] Ticket ${ticketId} final update with totals successful.`);
      
      } else if (Object.keys(dataToUpdate).length > 0 ) { // No needsTotalsRecalculation pero sí dataToUpdate (ej. solo paidAmountDirectly)
        await tx.ticket.update({ where: { id: ticketId }, data: dataToUpdate });
        console.log(`[API BatchUpdate] Ticket ${ticketId} updated with minor non-recalculated changes (e.g. only paidAmountDirectly).`);
      } else {
        console.log("[API BatchUpdate] No effective changes to update ticket master in the end.");
      }

      // Devolver el ticket completo y actualizado
      return tx.ticket.findUniqueOrThrow({
         where: { id: ticketId },
         select: { 
            id: true, ticketNumber: true, ticketSeries: true, status: true, finalAmount: true, totalAmount: true,
            taxAmount: true, currencyCode: true, notes: true, discountType: true, discountAmount: true, discountReason: true,
            clientId: true, client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, taxId: true, fiscalName: true, address: true, city: true, postalCode: true, countryIsoCode: true }},
            sellerUserId: true, sellerUser: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }},
            cashierUserId: true, cashierUser: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true }},
            clinicId: true, clinic: { select: { id: true, name: true, currency: true, ticketSize: true, cif: true, address: true, city: true, postalCode: true, phone: true, email: true, tariffId: true }},
            
            items: true,
            payments: true,

            invoice: { select: { id: true, invoiceNumber: true, invoiceSeries: true, issueDate: true, totalAmount: true, status: true }},
            originalTicket: { select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true }},
            returnTickets: { select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true, status: true}},
            cashSession: { select: { id: true, sessionNumber: true, closingTime: true, status: true}},
            relatedDebts: true,
            issueDate: true, createdAt: true, updatedAt: true, dueAmount: true, hasOpenDebt: true, paidAmountDirectly: true,
            companyId: true, company: true, appointmentId: true,
         }
       });
    });
    return NextResponse.json(updatedTicketResult);

  } catch (error: any) {
    console.error(`[API BatchUpdate PUT /api/tickets/[id]/batch-update] Error:`, error);
    const statusCode = error.message?.includes("no encontrado") || error.message?.includes("not found") ? 404 :
                       error.message?.includes("no está en estado OPEN") ? 403 :
                       error.message?.includes("tarifa por defecto asignada") ? 400 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al actualizar el ticket en lote.', details: error.stack }, { status: statusCode });
  }
} 