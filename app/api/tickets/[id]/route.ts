import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, CashSessionStatus } from '@prisma/client';

// Definir el esquema de validación para los parámetros de la ruta
const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

// La firma de la función ahora indica que `params` es una Promesa
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // --- INICIO DE LA MODIFICACIÓN PARA DEBUGGING Y CORRECCIÓN DE PROMESA ---
    const actualParams = await paramsPromise; // Resolver la promesa params
    console.log("[API_TICKETS_ID_GET] Received actualParams:", JSON.stringify(actualParams, null, 2));

    const paramsValidation = paramsSchema.safeParse(actualParams);
    if (!paramsValidation.success) {
      console.error("[API_TICKETS_ID_GET] Zod params validation failed:", JSON.stringify(paramsValidation.error.format(), null, 2));
      return NextResponse.json({ 
        message: 'ID de ticket inválido (Zod validation failed for CUID)', 
        errors: paramsValidation.error.format(),
        receivedParams: actualParams // Usar actualParams aquí también
      }, { status: 400 });
    }
    // --- FIN DE LA MODIFICACIÓN ---
    const { id: ticketId } = paramsValidation.data;
    console.log(`[API_TICKETS_ID_GET] Validated ticketId: ${ticketId} for systemId: ${systemId}`);

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
        systemId: systemId,
      },
      select: {
        id: true,
        ticketNumber: true,
        ticketSeries: true,
        issueDate: true,
        status: true,
        finalAmount: true,
        currencyCode: true,
        notes: true,
        discountType: true,
        discountAmount: true,
        discountReason: true,
        createdAt: true,
        updatedAt: true,
        clientId: true,
        companyId: true,
        sellerUserId: true,
        cashierUserId: true,
        clinicId: true,
        appointmentId: true,
        invoiceId: true,
        originalTicketId: true,
        systemId: true,
        cashSessionId: true,
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, taxId: true, fiscalName: true, address: true, city: true, postalCode: true, countryIsoCode: true },
        },
        company: {
          select: { id: true, fiscalName: true, taxId: true, address: true, city: true, postalCode: true, countryIsoCode: true },
        },
        sellerUser: {
          select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
        },
        cashierUser: {
          select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
        },
        clinic: {
          select: { id: true, name: true, currency: true, ticketSize: true, cif: true, address: true, city: true, postalCode: true, phone: true, email: true },
        },
        items: {
          select: {
            id: true,
            itemType: true,
            description: true,
            quantity: true,
            unitPrice: true,
            originalUnitPrice: true,
            isPriceOverridden: true,
            manualDiscountAmount: true,
            manualDiscountPercentage: true,
            discountNotes: true,
            promotionDiscountAmount: true,
            appliedPromotionId: true,
            vatRateId: true,
            vatAmount: true,
            finalPrice: true,
            consumedBonoInstanceId: true,
            consumedPackageInstanceId: true,
            createdAt: true,
            updatedAt: true,
            professionalUserId: true,
            isValidationGenerated: true,
            service: { select: { id: true, name: true, durationMinutes: true } },
            product: { select: { id: true, name: true, sku: true } },
            vatRate: { select: { id: true, name: true, rate: true } },
            originalVatType: { select: { id: true, name: true, rate: true } },
            appliedPromotion: { select: { id: true, name: true, code: true } },
            consumedBonoInstance: { include: { bonoDefinition: {select: {name: true, serviceId: true, productId: true}} } },
            consumedPackageInstance: { include: { packageDefinition: {select: {name: true}} } },
          },
          orderBy: { createdAt: 'asc' }
        },
        payments: {
          include: {
            paymentMethodDefinition: { select: { id: true, name: true, type: true } },
            bankAccount: { select: { id: true, accountName: true, iban: true, bank: { select: { name: true } } } },
            posTerminal: { select: { id: true, name: true } },
            user: { select: { id: true, firstName: true, lastName: true } } 
          },
          orderBy: { paymentDate: 'asc' }
        },
        invoice: { 
          select: { id: true, invoiceNumber: true, invoiceSeries: true, issueDate: true, totalAmount: true, status: true }
        },
        originalTicket: {
            select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true }
        },
        returnTickets: {
            select: { id: true, ticketNumber: true, issueDate: true, finalAmount: true, status: true}
        },
        hasOpenDebt: true,
        dueAmount: true,
        relatedDebts: {
          select: { id: true, pendingAmount: true, status: true }
        },
        cashSession: { 
            select: { id: true, sessionNumber: true, closingTime: true, status: true}
        }
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ticket);

  } catch (error: any) {
    // Si actualParams no está definido porque paramsPromise falló o no es el esperado,
    // intentamos loguear la promesa original o un mensaje genérico.
    // Es importante notar que si `await paramsPromise` falla, el catch se activará antes.
    // Aquí asumimos que el error es posterior a la resolución de la promesa o en la lógica de negocio.
    let errorContextParams = 'paramsPromise no resuelta o error previo.';
    try {
      // Este intento de stringify puede fallar si paramsPromise sigue siendo una promesa rechazada
      // o si actualParams no se asignó. Es solo para dar más contexto si es posible.
      const resolvedParamsForError = await paramsPromise;
      errorContextParams = JSON.stringify(resolvedParamsForError, null, 2);
    } catch (e) {
      errorContextParams = 'Fallo al intentar resolver/serializar paramsPromise en el catch.';
    }
    console.error(`[API_TICKETS_ID_GET] Error fetching ticket. Params context: ${errorContextParams}. Error:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el ticket.' }, { status: 500 });
  }
}

// Esquema de validación para la actualización del ticket (campos escalares)
const updateTicketSchema = z.object({
  clientId: z.string().cuid({ message: "ID de cliente inválido." }).optional().nullable(),
  sellerUserId: z.string().cuid({ message: "ID de vendedor inválido." }).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  ticketSeries: z.string().optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional().nullable(),
  discountAmount: z.number().min(0, "El monto del descuento debe ser positivo o cero.").optional().nullable(),
  discountReason: z.string().max(255).optional().nullable(),
});

// Placeholder para PUT /api/tickets/[id]
export async function PUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const actualParams = await paramsPromise; 
    const paramsValidation = paramsSchema.safeParse(actualParams);

    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'ID de ticket inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const { id: ticketId } = paramsValidation.data;

    const body = await request.json();
    const validation = updateTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos para actualizar ticket', errors: validation.error.format() }, { status: 400 });
    }
    const validatedData = validation.data;

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const ticketToUpdate = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId },
        include: { items: true, payments: true } 
      });

      if (!ticketToUpdate) {
        throw new Error('Ticket no encontrado');
      }
      if (ticketToUpdate.status !== TicketStatus.OPEN) {
        throw new Error(`Solo se pueden modificar tickets en estado OPEN. Estado actual: ${ticketToUpdate.status}`);
      }

      const dataToUpdate: Prisma.TicketUpdateInput = {};
      let needsFinalAmountRecalculation = false;

      if (validatedData.clientId !== undefined) {
        dataToUpdate.client = validatedData.clientId ? { connect: { id: validatedData.clientId } } : { disconnect: true };
      }
      if (validatedData.sellerUserId !== undefined) {
        dataToUpdate.sellerUser = validatedData.sellerUserId ? { connect: { id: validatedData.sellerUserId } } : { disconnect: true };
      }
      if (validatedData.notes !== undefined) {
        dataToUpdate.notes = validatedData.notes;
      }
      if (validatedData.ticketSeries !== undefined) {
        dataToUpdate.ticketSeries = validatedData.ticketSeries;
      }

      if (validatedData.discountType !== undefined || validatedData.discountAmount !== undefined || validatedData.discountReason !== undefined) {
        if ((validatedData.discountAmount !== null && validatedData.discountAmount > 0 && validatedData.discountType === null) || 
            (validatedData.discountType !== null && (validatedData.discountAmount === null || validatedData.discountAmount <= 0) ) ) {
            
            if (! (validatedData.discountType === null && (validatedData.discountAmount === null || validatedData.discountAmount === 0))) {
                 throw new Error('El tipo y el monto del descuento global deben proporcionarse juntos o ambos ser nulos/cero.');
            }
        }
        dataToUpdate.discountType = validatedData.discountType;
        dataToUpdate.discountAmount = (validatedData.discountType === null) ? null : validatedData.discountAmount;
        dataToUpdate.discountReason = (validatedData.discountType === null) ? null : validatedData.discountReason;
        needsFinalAmountRecalculation = true;
      }

      if (needsFinalAmountRecalculation) {
        let newTotalAmount = 0;
        let newTaxAmount = 0;
        
        const itemsFromDb = await tx.ticketItem.findMany({ where: { ticketId: ticketToUpdate.id }});

        itemsFromDb.forEach(item => {
          const linePriceBeforeTax = (item.unitPrice * item.quantity) - (item.manualDiscountAmount || 0) - (item.promotionDiscountAmount || 0);
          newTotalAmount += linePriceBeforeTax;
          newTaxAmount += item.vatAmount;
        });
        dataToUpdate.totalAmount = parseFloat(newTotalAmount.toFixed(2));
        dataToUpdate.taxAmount = parseFloat(newTaxAmount.toFixed(2));

        const newGlobalDiscount = (dataToUpdate.discountAmount as number | null) ?? ticketToUpdate.discountAmount ?? 0;
        dataToUpdate.finalAmount = parseFloat(((dataToUpdate.totalAmount ?? 0) + (dataToUpdate.taxAmount ?? 0) - newGlobalDiscount).toFixed(2));
      }

      return tx.ticket.update({
        where: { id: ticketId },
        data: dataToUpdate,
        select: {
            id: true, ticketNumber: true, ticketSeries: true, status: true, finalAmount: true, totalAmount: true,
            taxAmount: true, currencyCode: true, notes: true, discountType: true, discountAmount: true, discountReason: true,
            clientId: true, client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, taxId: true, fiscalName: true, address: true, city: true, postalCode: true, countryIsoCode: true }},
            sellerUserId: true, sellerUser: { select: { id: true, firstName: true, lastName: true }},
            cashierUserId: true, cashierUser: { select: { id: true, firstName: true, lastName: true }},
            clinicId: true, 
            clinic: {
              select: { 
                id: true, name: true, currency: true, 
                ticketSize: true,
                cif: true, address: true, city: true, postalCode: true, phone: true, email: true 
              }
            },
            appointmentId: true, invoiceId: true, originalTicketId: true, systemId: true, cashSessionId: true,
            issueDate: true, createdAt: true, updatedAt: true, 
            dueAmount: true, 
            hasOpenDebt: true, 
            paidAmountDirectly: true
        }
      });
    });

    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    let errorContextParams = 'paramsPromise no resuelta o error previo.';
    try {
      const resolvedParamsForError = await paramsPromise;
      errorContextParams = JSON.stringify(resolvedParamsForError, null, 2);
    } catch (e) {
      errorContextParams = 'Fallo al intentar resolver/serializar paramsPromise en el catch.';
    }
    console.error(`[API_TICKETS_ID_PUT] Error updating ticket. Params context: ${errorContextParams}. Error:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ message: `Error de base de datos: ${error.message}` }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Error de validación en el cuerpo de la petición', errors: error.format() }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Error interno del servidor al actualizar el ticket.' }, { status: 500 });
  }
}

// TODO: Implementar DELETE para eliminar un ticket individual si es necesario
// export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) { ... } 

export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId } = session.user;

    const actualParams = await paramsPromise; 
    const paramsValidation = paramsSchema.safeParse(actualParams);

    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'ID de ticket inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const ticketId = paramsValidation.data.id;

    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId },
        include: { 
          items: { // Incluir items para comprobación y reversión
            include: {
              product: { include: { settings: true } },
              consumedBonoInstance: true,
            }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado.');
      }

      if (ticket.status !== TicketStatus.OPEN) {
        throw new Error('Solo se pueden eliminar tickets que estén en estado OPEN.');
      }

      //  Validar que no existan ítems "validados" (generados por la validación de servicio)
      const hasValidatedItems = ticket.items.some((it) => it.isValidationGenerated === true);
      if (hasValidatedItems) {
        throw new Error('No se puede eliminar un ticket que contiene ítems validados.');
      }

      let cashSessionIdForPotentialDeletion: string | null = ticket.cashSessionId;
      let clinicIdForPotentialEmptySessionCheck: string | null = ticket.clinicId;

      if (cashSessionIdForPotentialDeletion) {
        const cashSession = await tx.cashSession.findUnique({
          where: { id: cashSessionIdForPotentialDeletion },
          select: { status: true },
        });
        if (cashSession && (cashSession.status === CashSessionStatus.CLOSED || cashSession.status === CashSessionStatus.RECONCILED)) {
          throw new Error(`No se puede eliminar un ticket de una sesión de caja que está ${cashSession.status}.`);
        }
      }

      // Lógica de reversión para cada ítem del ticket ANTES de eliminar nada
      for (const item of ticket.items) {
        if (item.itemType === 'PRODUCT' && item.productId && item.product?.settings) {
          await tx.productSetting.update({
            where: { productId: item.productId },
            data: { currentStock: { increment: item.quantity } }
          });
          console.log(`[API_TICKETS_DELETE] Stock reverted for product ${item.productId} by ${item.quantity} from ticket ${ticketId}`);
        }
        if (item.consumedBonoInstanceId && item.consumedBonoInstance) {
          await tx.bonoInstance.update({
            where: { id: item.consumedBonoInstanceId },
            data: { remainingQuantity: { increment: 1 } } // Asumiendo 1 item = 1 sesión de bono
          });
          console.log(`[API_TICKETS_DELETE] Bono consumption reverted for instance ${item.consumedBonoInstanceId} from ticket ${ticketId}`);
        }
        // TODO: Lógica de reversión para consumedPackageInstanceId
      }

      // No debería haber DebtLedger para un ticket OPEN que nunca se cerró,
      // pero por si acaso y para limpieza, se podrían eliminar si existieran por alguna razón anómala.
      // Aunque, si el flujo es correcto, no deberían existir.
      await tx.debtLedger.deleteMany({
        where: { ticketId: ticketId }
      });

      await tx.payment.deleteMany({
        where: { ticketId: ticketId },
      });

      await tx.ticketItem.deleteMany({
        where: { ticketId: ticketId },
      });

      await tx.ticket.delete({
        where: { id: ticketId },
      });

      // START: Logic to delete CashSession if it becomes empty and meets criteria
      if (cashSessionIdForPotentialDeletion && clinicIdForPotentialEmptySessionCheck) {
        const remainingTicketsCount = await tx.ticket.count({
          where: { cashSessionId: cashSessionIdForPotentialDeletion },
        });

        if (remainingTicketsCount === 0) {
          const cashSessionToDelete = await tx.cashSession.findUnique({
            where: { id: cashSessionIdForPotentialDeletion },
          });

          if (
            cashSessionToDelete &&
            cashSessionToDelete.status === CashSessionStatus.OPEN &&
            (cashSessionToDelete.manualCashInput === null || cashSessionToDelete.manualCashInput.toNumber() === 0) &&
            (cashSessionToDelete.cashWithdrawals === null || cashSessionToDelete.cashWithdrawals.toNumber() === 0) &&
            cashSessionToDelete.countedCash === null && // Not manually counted
            (cashSessionToDelete.openingBalanceCash === null || cashSessionToDelete.openingBalanceCash === 0) // Did not carry a significant balance
          ) {
            await tx.cashSession.delete({
              where: { id: cashSessionIdForPotentialDeletion },
            });
            console.log(`[CASH_SESSION_AUTO_DELETE] CashSession ${cashSessionIdForPotentialDeletion} deleted automatically as it became empty and met inactivity criteria after ticket ${ticketId} deletion.`);
            
            // Optional: Create an EntityChangeLog for this auto-deletion
            await tx.entityChangeLog.create({
                data: {
                    entityId: cashSessionIdForPotentialDeletion,
                    entityType: 'CASH_SESSION' as any,
                    action: 'AUTO_DELETE_EMPTY',
                    userId: session.user.id,
                    systemId: systemId,
                    details: {
                        reason: `Session became empty after ticket ${ticketId} was deleted and met inactivity criteria.`,
                        deletedTicketId: ticketId,
                        clinicId: clinicIdForPotentialEmptySessionCheck,
                    } as any,
                },
            });
          } else if (cashSessionToDelete) {
            console.log(`[CASH_SESSION_AUTO_DELETE_SKIP] CashSession ${cashSessionIdForPotentialDeletion} is empty but did not meet all criteria for auto-deletion. Status: ${cashSessionToDelete.status}, ManualInput: ${cashSessionToDelete.manualCashInput}, Withdrawals: ${cashSessionToDelete.cashWithdrawals}, CountedCash: ${cashSessionToDelete.countedCash}, OpeningBalance: ${cashSessionToDelete.openingBalanceCash}`);
          }
        }
      }
      // END: Logic to delete CashSession
    });

    return NextResponse.json({ message: 'Ticket eliminado correctamente' }, { status: 200 });

  } catch (error: any) {
    let errorContextParams = 'paramsPromise no resuelta o error previo.';
    try {
      const resolvedParamsForError = await paramsPromise;
      errorContextParams = JSON.stringify(resolvedParamsForError, null, 2);
    } catch (e) {
      errorContextParams = 'Fallo al intentar resolver/serializar paramsPromise en el catch.';
    }
    console.error(`[API_TICKETS_ID_DELETE] Error deleting ticket. Params context: ${errorContextParams}. Error:`, error);
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("Solo se pueden eliminar") || error.message?.includes("incluido o está referenciado") ? 403 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor al eliminar el ticket.' }, { status });
  }
} 