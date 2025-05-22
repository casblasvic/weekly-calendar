import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, TicketItem, Product, Service, VATType, Ticket } from '@prisma/client';

// Esquema para los parámetros de la ruta (id del ticket, itemId)
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }), 
  itemId: z.string().cuid({ message: "ID de ítem de ticket inválido." }),
});

const updateTicketItemSchema = z.object({
  quantity: z.number().min(0.01, "La cantidad debe ser positiva.").optional(),
  unitPrice: z.number().min(0, "El precio unitario no puede ser negativo.").optional(),
  manualDiscountAmount: z.number().min(0, "El descuento manual no puede ser negativo.").optional().nullable(),
  discountNotes: z.string().max(255, "Las notas del descuento no pueden exceder los 255 caracteres.").optional().nullable(),
  appliedPromotionId: z.string().cuid({message: "ID de promoción inválido"}).optional().nullable(),
  promotionDiscountAmount: z.number().min(0, "El descuento por promoción no puede ser negativo.").optional().nullable(),
  // Campos para consumo de bonos/paquetes (si se determina al añadir/editar)
  consumedBonoInstanceId: z.string().cuid().optional().nullable(),
  consumedPackageInstanceId: z.string().cuid().optional().nullable(),
}).refine(data => {
  // Al menos uno de los campos opcionales debe estar presente para una actualización válida
  return Object.values(data).some(value => value !== undefined);
}, { message: "Se debe proporcionar al menos un campo para actualizar." });

async function recalculateTicketTotals(tx: Prisma.TransactionClient, ticketId: string) {
  const currentTicket = await tx.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { items: true } // Incluir items para el recálculo
  });

  let newTicketTotalAmount = 0;     // Suma de (precio línea NETA después de descuentos de ítem, ANTES de IVA)
  let newTicketTaxAmount = 0;       // Suma de IVA de todos los ítems

  currentTicket.items.forEach(item => {
    // El precio base de la línea es el precio unitario por la cantidad
    const itemBaseLinePrice = item.unitPrice * item.quantity;
    // Los descuentos totales aplicados directamente al ítem
    const itemTotalDiscount = (item.manualDiscountAmount || 0) + (item.promotionDiscountAmount || 0);
    // El precio neto del ítem DESPUÉS de sus propios descuentos, ANTES de su IVA
    const itemNetPriceAfterItemDiscounts = itemBaseLinePrice - itemTotalDiscount;
    
    // Acumulamos el precio neto del ítem (antes de IVA) para el Ticket.totalAmount
    newTicketTotalAmount += itemNetPriceAfterItemDiscounts;
    // Acumulamos el IVA del ítem (que ya está calculado sobre el neto del ítem)
    newTicketTaxAmount += item.vatAmount;
  });

  // El descuento global del ticket se aplica sobre la suma de (netos de item + IVA de items)
  const ticketGlobalDiscount = currentTicket.discountAmount ?? 0;
  
  // El finalAmount es el total bruto (netos de item + IVA de items) MENOS el descuento global del ticket.
  const newTicketFinalAmount = (newTicketTotalAmount + newTicketTaxAmount) - ticketGlobalDiscount;
  
  // El subtotalAmount del ticket, si se quiere mantener, podría ser la suma de los precios base de línea ANTES de cualquier descuento de ítem.
  // Por ahora, nos centramos en totalAmount (neto de descuentos de ítem) y finalAmount.
  // const newTicketSubtotalBruto = currentTicket.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return tx.ticket.update({
    where: { id: ticketId },
    data: {
      // subtotalAmount: newTicketSubtotalBruto, // Si decides guardar el bruto total
      totalAmount: newTicketTotalAmount,       // Suma de (base línea - descuentos de ítem)
      taxAmount: newTicketTaxAmount,         // Suma de IVA de todos los ítems
      finalAmount: newTicketFinalAmount,       // (totalAmount + taxAmount) - descuentoGlobalDelTicket
      // dueAmount no se recalcula aquí directamente, se maneja en operaciones de pago o cierre.
    },
    include: { 
      client: true, company: true, sellerUser: true, cashierUser: true, 
      clinic: {include: {tariff:true}}, items: {orderBy: {createdAt: 'asc'}}, 
      payments: {orderBy: {paymentDate: 'asc'}}, invoice: true, originalTicket: true, 
      returnTickets: true, cashSession: true,
      relatedDebts: true // Mantener si es relevante para la respuesta
    }
  });
}

// PUT: Actualizar un TicketItem existente
// params.id es el ID del ticket
export async function PUT(request: NextRequest, { params }: { params: { id: string, itemId: string } }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'IDs de ruta inválidos', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const { id: ticketId, itemId } = paramsValidation.data; 

    const body = await request.json();
    const itemUpdateValidation = updateTicketItemSchema.safeParse(body);

    if (!itemUpdateValidation.success) {
      return NextResponse.json({ message: 'Datos de actualización de ítem inválidos', errors: itemUpdateValidation.error.format() }, { status: 400 });
    }
    const updateData = itemUpdateValidation.data;

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId }, 
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado.');
      }
      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error('Solo se pueden modificar ítems de tickets en estado OPEN.');
      }

      const currentItem = await tx.ticketItem.findUnique({
        where: { id: itemId, ticketId: ticketId }
      });

      if (!currentItem) {
        throw new Error('Ítem de ticket no encontrado.');
      }
      
      // Determinar los valores finales para cada campo actualizable del item
      const resolvedQuantity = updateData.quantity ?? currentItem.quantity;
      const resolvedUnitPrice = updateData.unitPrice ?? currentItem.unitPrice;
      const resolvedManualDiscount = updateData.manualDiscountAmount !== undefined ? updateData.manualDiscountAmount : currentItem.manualDiscountAmount;
      const resolvedDiscountNotes = updateData.discountNotes !== undefined ? updateData.discountNotes : currentItem.discountNotes;
      const resolvedAppliedPromotionId = updateData.appliedPromotionId !== undefined ? updateData.appliedPromotionId : currentItem.appliedPromotionId;
      const resolvedPromotionDiscount = updateData.promotionDiscountAmount !== undefined ? updateData.promotionDiscountAmount : currentItem.promotionDiscountAmount;
      const resolvedConsumedBonoId = updateData.consumedBonoInstanceId !== undefined ? updateData.consumedBonoInstanceId : currentItem.consumedBonoInstanceId;
      const resolvedConsumedPackageId = updateData.consumedPackageInstanceId !== undefined ? updateData.consumedPackageInstanceId : currentItem.consumedPackageInstanceId;

      const vatType = await tx.vATType.findUnique({
          where: { id: currentItem.vatRateId! } // Asumimos que vatRateId siempre existe en un item guardado
      });
      if(!vatType || typeof vatType.rate !== 'number') {
          throw new Error(`No se pudo encontrar la tasa de IVA para el ítem (VAT ID: ${currentItem.vatRateId})`);
      }
      const vatRate = vatType.rate;

      // Recalcular precios del ítem
      const baseLinePrice = resolvedUnitPrice * resolvedQuantity;
      const itemDiscountTotal = (resolvedManualDiscount || 0) + (resolvedPromotionDiscount || 0);
      const netLinePriceAfterItemDiscounts = baseLinePrice - itemDiscountTotal;

      if (netLinePriceAfterItemDiscounts < 0) {
        throw new Error('El total de descuentos del ítem no puede exceder su precio base.');
      }

      const vatAmountItem = netLinePriceAfterItemDiscounts * (vatRate / 100);
      const finalPriceItem = netLinePriceAfterItemDiscounts + vatAmountItem;
      
      await tx.ticketItem.update({
        where: { id: itemId },
        data: {
          quantity: resolvedQuantity,
          unitPrice: resolvedUnitPrice,
          isPriceOverridden: updateData.unitPrice !== undefined ? (updateData.unitPrice !== currentItem.originalUnitPrice) : currentItem.isPriceOverridden,
          manualDiscountAmount: resolvedManualDiscount,
          discountNotes: resolvedDiscountNotes,
          appliedPromotionId: resolvedAppliedPromotionId,
          promotionDiscountAmount: resolvedPromotionDiscount,
          consumedBonoInstanceId: resolvedConsumedBonoId,
          consumedPackageInstanceId: resolvedConsumedPackageId,
          vatAmount: vatAmountItem,
          finalPrice: finalPriceItem,
          // originalUnitPrice y originalVatTypeId no se cambian al actualizar el ítem
        },
      });

      return recalculateTicketTotals(tx, ticketId); 
    });

    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    console.error(`[API_TICKETS_ITEMS_PUT] Error updating item ${params.itemId} for ticket ${params.id}:`, error);
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("excede el total de descuentos") ? 400 :
                   error.message?.includes("Solo se pueden modificar") ? 403 : 400;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al actualizar el ítem.' }, { status });
  }
}

// DELETE: Eliminar un TicketItem existente
// params.id es el ID del ticket
export async function DELETE(request: NextRequest, { params }: { params: { id: string, itemId: string } }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'IDs de ruta inválidos', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const { id: ticketId, itemId } = paramsValidation.data;

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId }, 
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado.');
      }
      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error('Solo se pueden eliminar ítems de tickets en estado OPEN.');
      }

      const itemToDelete = await tx.ticketItem.findUnique({
        where: { id: itemId, ticketId: ticketId }, 
        // Incluir relaciones necesarias para la reversión
        include: {
          product: { include: { settings: true } }, // Para ProductSetting.currentStock
          consumedBonoInstance: true,
          // consumedPackageInstance: true, // Para futura lógica de paquetes
        }
      });

      if (!itemToDelete) {
        throw new Error('Ítem de ticket no encontrado o no pertenece al ticket especificado.');
      }

      // Lógica básica de reversión de stock/bonos ANTES de eliminar el ítem
      if (itemToDelete.itemType === 'PRODUCT' && itemToDelete.productId && itemToDelete.product?.settings) {
        await tx.productSetting.update({
          where: { productId: itemToDelete.productId },
          data: {
            currentStock: { increment: itemToDelete.quantity }
          }
        });
        console.log(`[API_TICKETS_ITEMS_DELETE] Stock reverted for product ${itemToDelete.productId} by ${itemToDelete.quantity}`);
      }

      if (itemToDelete.consumedBonoInstanceId && itemToDelete.consumedBonoInstance) {
        // Asumimos que un TicketItem que consume un bono representa 1 sesión/unidad del bono.
        // Si pudiera representar más, la lógica de itemToDelete.quantity vs lo que representa una sesión de bono sería necesaria.
        await tx.bonoInstance.update({
          where: { id: itemToDelete.consumedBonoInstanceId },
          data: {
            remainingQuantity: { increment: 1 } // Revertir 1 unidad/sesión del bono
            // Aquí podría añadirse lógica para cambiar el estado del BonoInstance si pasa de "agotado" a "disponible"
          }
        });
        console.log(`[API_TICKETS_ITEMS_DELETE] Bono consumption reverted for instance ${itemToDelete.consumedBonoInstanceId}`);
      }

      // TODO: Lógica de reversión para consumedPackageInstanceId si es necesario en el futuro.

      await tx.ticketItem.delete({
        where: { id: itemId },
      });

      return recalculateTicketTotals(tx, ticketId); 
    });

    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    console.error(`[API_TICKETS_ITEMS_DELETE] Error deleting item ${params.itemId} for ticket ${params.id}:`, error);
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("Solo se pueden eliminar") ? 403 : 400;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al eliminar el ítem.' }, { status });
  }
} 