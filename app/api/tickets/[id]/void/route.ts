import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, DebtStatus } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

// Podríamos añadir un body schema si se requiere un motivo para la anulación
// const voidTicketBodySchema = z.object({
//   reason: z.string().min(1, "Se requiere un motivo para la anulación."),
// });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId } = session.user;

    // const body = await request.json(); // Descomentar si se añade body schema
    // const bodyValidation = voidTicketBodySchema.safeParse(body); // Descomentar
    // if (!bodyValidation.success) { // Descomentar
    //   return NextResponse.json({ message: 'Datos de anulación inválidos', errors: bodyValidation.error.format() }, { status: 400 });
    // }
    // const { reason } = bodyValidation.data; // Descomentar

    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'ID de ticket inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const ticketId = paramsValidation.data.id;

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId },
        include: {
          items: { // Necesario para la reversión de stock/bonos
            include: {
              product: { include: { settings: true } },
              consumedBonoInstance: true,
            }
          },
          relatedDebts: true // Para cancelar deudas pendientes
        }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado.');
      }

      if (ticket.status !== TicketStatus.OPEN && ticket.status !== TicketStatus.CLOSED) {
        throw new Error('Solo se pueden anular tickets que estén en estado OPEN o CLOSED.');
      }

      if (ticket.cashSessionId) {
        throw new Error('No se puede anular un ticket que ya ha sido incluido en un cierre de caja.');
      }

      // Lógica de reversión para cada ítem del ticket
      for (const item of ticket.items) {
        if (item.itemType === 'PRODUCT' && item.productId && item.product?.settings) {
          await tx.productSetting.update({
            where: { productId: item.productId },
            data: { currentStock: { increment: item.quantity } }
          });
          console.log(`[API_TICKETS_VOID] Stock reverted for product ${item.productId} by ${item.quantity} from ticket ${ticketId}`);
        }
        if (item.consumedBonoInstanceId && item.consumedBonoInstance) {
          await tx.bonoInstance.update({
            where: { id: item.consumedBonoInstanceId },
            data: { remainingQuantity: { increment: 1 } } // Asumiendo 1 item = 1 sesión de bono
          });
          console.log(`[API_TICKETS_VOID] Bono consumption reverted for instance ${item.consumedBonoInstanceId} from ticket ${ticketId}`);
        }
        // TODO: Lógica de reversión para consumedPackageInstanceId
      }

      // Gestionar DebtLedger si existe una deuda abierta para este ticket
      const activeDebt = ticket.relatedDebts.find(d => d.status === DebtStatus.PENDING || d.status === DebtStatus.PARTIALLY_PAID);
      if (activeDebt) {
        await tx.debtLedger.update({
          where: { id: activeDebt.id },
          data: {
            status: DebtStatus.CANCELLED,
            notes: activeDebt.notes ? `${activeDebt.notes}\nCancelada por anulación de ticket.` : 'Cancelada por anulación de ticket.'
          }
        });
        console.log(`[API_TICKETS_VOID] DebtLedger ${activeDebt.id} cancelled for ticket ${ticketId}.`);
      }

      // Actualizar el ticket a VOID
      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.VOID,
          hasOpenDebt: false, // La deuda asociada (si la hubo) se cancela
          dueAmount: null,    // Se anula la deuda original también
          // voidReason: reason, // Si se implementa
          // voidedAt: new Date(), // Si se implementa
        },
        include: { 
          client: true, company: true, sellerUser: true, cashierUser: true, 
          clinic: {include: {tariff:true}}, items: {orderBy: {createdAt: 'asc'}}, 
          payments: {orderBy: {paymentDate: 'asc'}}, invoice: true, originalTicket: true, 
          returnTickets: true, cashSession: true,
          relatedDebts: true
        }
      });
    });

    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    console.error(`[API_TICKETS_VOID] Error for ticket ${params.id}:`, error);
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("Solo se pueden anular") || error.message?.includes("incluido en un cierre") ? 403 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status });
  }
} 