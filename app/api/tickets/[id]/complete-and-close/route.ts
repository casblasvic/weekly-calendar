import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, Ticket, Payment } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

// Función para generar ticketNumber (simplificada, se debe mejorar para unicidad real por serie/clínica)
// Esta es una implementación muy básica y necesitaría ser más robusta en producción,
// considerando concurrencia y secuencias por clínica/serie.
async function generateTicketNumber(tx: Prisma.TransactionClient, clinicId: string): Promise<string> {
  // Lógica MUY simplificada: Intenta obtener el último número para esta clínica y lo incrementa.
  // Esto NO es robusto para producción sin un manejo de secuencia adecuado o bloqueo.
  const lastTicket = await tx.ticket.findFirst({
    where: {
      clinicId: clinicId,
      ticketNumber: { not: null },
    },
    orderBy: {
      createdAt: 'desc' // Asumiendo que createdAt refleja el orden de cierre, lo cual no es perfecto
                        // O mejor, si tuviéramos un campo numérico secuencial interno.
    },
    select: { ticketNumber: true }
  });

  let nextNumber = 1;
  if (lastTicket && lastTicket.ticketNumber) {
    const numericPart = parseInt(lastTicket.ticketNumber.replace(/\D/g, ''), 10);
    if (!isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }
  // Aquí se podría añadir un prefijo de clínica o serie.
  return `T-${String(nextNumber).padStart(6, '0')}`;
}

export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId, id: userId } = session.user;

    const actualParams = await paramsPromise;
    const paramsValidation = paramsSchema.safeParse(actualParams);

    if (!paramsValidation.success) {
      return NextResponse.json({ message: 'ID de ticket inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const ticketId = paramsValidation.data.id;
    console.log(`[API_TICKETS_COMPLETE_CLOSE] Iniciando transacción para ticket ID: ${ticketId}`); // LOG INICIO TRANSACCIÓN

    const updatedTicket = await prisma.$transaction(async (tx) => {
      console.log(`[API_TICKETS_COMPLETE_CLOSE] Paso 1: Buscando ticket ${ticketId} con detalles...`); // LOG
      const ticketWithDetails = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId },
        include: { 
          payments: true,
          items: true, 
          clinic: { select: { delayedPayments: true, id: true } },
          client: { select: { id: true } } // Incluir client para DebtLedger
        }
      });

      if (!ticketWithDetails) {
        console.error(`[API_TICKETS_COMPLETE_CLOSE] Error: Ticket ${ticketId} no encontrado.`); // LOG
        throw new Error('Ticket no encontrado.');
      }
      console.log(`[API_TICKETS_COMPLETE_CLOSE] Paso 2: Ticket ${ticketId} encontrado. Estado actual: ${ticketWithDetails.status}`); // LOG

      const ticket = ticketWithDetails as Ticket & { 
        payments: Payment[]; 
        items: Prisma.TicketItemGetPayload<{}>[];
        clinic: { delayedPayments: boolean | null, id: string } | null;
        client: { id: string } | null; // Añadido para tipado de client
      };

      if (ticket.status !== TicketStatus.OPEN) {
        console.warn(`[API_TICKETS_COMPLETE_CLOSE] Advertencia: Ticket ${ticketId} no está en estado OPEN. Estado actual: ${ticket.status}`); // LOG
        throw new Error('Solo se pueden cerrar tickets que estén en estado OPEN.');
      }

      console.log(`[API_TICKETS_COMPLETE_CLOSE] Paso 3: Calculando montos para ticket ${ticketId}...`); // LOG
      // Recalcular finalAmount basado en los items actuales.
      const subtotalFromItems = ticket.items.reduce((sum, item) => {
        // Considerar descuentos por línea si existen en TicketItem
        const itemTotal = (item.unitPrice * item.quantity) - (item.manualDiscountAmount || 0) - (item.promotionDiscountAmount || 0);
        return sum + itemTotal; 
      }, 0);
      const taxFromItems = ticket.items.reduce((sum, item) => sum + item.vatAmount, 0);
      const currentFinalAmount = subtotalFromItems + taxFromItems - (ticket.discountAmount || 0); // Descuento global del ticket

      const totalPaidStandard = ticket.payments
        .filter(p => p.debtLedgerId === null) // Considerar solo pagos directos al ticket, no pagos de deudas anteriores
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const dueAmount = currentFinalAmount - totalPaidStandard;
      console.log(`[API_TICKETS_COMPLETE_CLOSE] Ticket ${ticketId} - currentFinalAmount: ${currentFinalAmount}, totalPaidStandard: ${totalPaidStandard}, dueAmount: ${dueAmount}`); // LOG

      let ticketNumberToAssign = ticket.ticketNumber;
      if (!ticketNumberToAssign) {
        if (!ticket.clinicId) {
          console.error(`[API_TICKETS_COMPLETE_CLOSE] Error: clinicId es null para ticket ${ticketId}, no se puede generar número.`); // LOG
          throw new Error('La clínica del ticket es requerida para generar el número de ticket.');
        }
        console.log(`[API_TICKETS_COMPLETE_CLOSE] Paso 4: Generando número de ticket para ${ticketId} en clínica ${ticket.clinicId}...`); // LOG
        ticketNumberToAssign = await generateTicketNumber(tx, ticket.clinicId);
        console.log(`[API_TICKETS_COMPLETE_CLOSE] Ticket ${ticketId} - Número asignado: ${ticketNumberToAssign}`); // LOG
      }

      let hasOpenDebtForTicket = false;
      console.log(`[API_TICKETS_COMPLETE_CLOSE] Paso 5: Verificando deuda para ticket ${ticketId}. DueAmount: ${dueAmount}, Permite aplazado: ${ticket.clinic?.delayedPayments}`); // LOG

      if (dueAmount > 0.009) {
        if (ticket.clinic?.delayedPayments === true) {
          if (!ticket.clientId) {
            console.error(`[API_TICKETS_COMPLETE_CLOSE] Error: clientId es null para ticket ${ticketId} al intentar crear DebtLedger.`); // LOG
            throw new Error('Se requiere un cliente asignado al ticket para registrar un pago aplazado.');
          }
          if (!ticket.clinicId) { // Doble check, aunque ya validado para ticketNumber
            console.error(`[API_TICKETS_COMPLETE_CLOSE] Error: clinicId es null para ticket ${ticketId} al intentar crear DebtLedger.`); // LOG
            throw new Error('Se requiere una clínica asignada al ticket para registrar un pago aplazado.');
          }
          console.log(`[API_TICKETS_COMPLETE_CLOSE] Creando DebtLedger para ticket ${ticketId}...`); // LOG
          await tx.debtLedger.create({
            data: {
              ticketId: ticket.id,
              clientId: ticket.clientId,
              clinicId: ticket.clinicId,
              originalAmount: dueAmount,
              paidAmount: 0,
              pendingAmount: dueAmount,
              status: 'PENDING',
              systemId: systemId,
              notes: `Deuda generada automáticamente al cerrar ticket ${ticketNumberToAssign || ticket.id} con saldo pendiente.`
            }
          });
          console.log(`[API_TICKETS_COMPLETE_CLOSE] DebtLedger created for ticket ${ticket.id} for amount ${dueAmount}`);
          hasOpenDebtForTicket = true;
        } else {
          console.warn(`[API_TICKETS_COMPLETE_CLOSE] Ticket ${ticketId} con deuda ${dueAmount} pero la clínica no permite aplazados.`); // LOG
          throw new Error(`El ticket no está completamente pagado (pendiente: ${dueAmount.toFixed(2)}) y la clínica no permite pagos aplazados.`);
        }
      }
      
      // Paso 6: Asegurar CashSession abierta hoy y obtener ID
      const clinicIdForSession = ticket.clinicId;
      if (!clinicIdForSession) {
        throw new Error('El ticket no tiene clínica asociada.');
      }

      // Usar la fecha de emisión del ticket para buscar/crear la sesión de caja
      const ticketIssueDate = new Date(ticket.issueDate);
      ticketIssueDate.setHours(0,0,0,0); // Inicio del día de emisión del ticket
      const dayAfterTicketIssue = new Date(ticketIssueDate);
      dayAfterTicketIssue.setDate(dayAfterTicketIssue.getDate() + 1); // Inicio del día siguiente

      let openSession = await tx.cashSession.findFirst({
        where: {
          clinicId: clinicIdForSession,
          systemId: systemId,
          openingTime: { gte: ticketIssueDate, lt: dayAfterTicketIssue }, // Sesión del día del ticket
          status: 'OPEN',
        },
      });

      if (!openSession) {
        const countToday = await tx.cashSession.count({
          where:{ clinicId: clinicIdForSession, openingTime:{ gte: ticketIssueDate, lt: dayAfterTicketIssue }},
        });
        const sessionNumber = `${clinicIdForSession.slice(0,4)}-${ticketIssueDate.toISOString().substring(0,10).replace(/-/g,'')}-${(countToday+1).toString().padStart(3,'0')}`;
        openSession = await tx.cashSession.create({
          data:{
            sessionNumber,
            clinicId: clinicIdForSession,
            systemId,
            userId,
            openingBalanceCash:0,
            status:'OPEN',
            openingTime: ticketIssueDate, // Asegurar que la nueva sesión tenga la fecha del ticket
          }
        });
      }

      // --- NUEVO: asegurar coherencia de pagos ---
      await tx.payment.updateMany({
        where: { ticketId: ticket.id, systemId },
        data: { cashSessionId: openSession.id },
      });
      console.log(`[API_TICKETS_COMPLETE_CLOSE] Pagos de ticket ${ticket.id} vinculados a sesión ${openSession.id}`);

      console.log(`[API_TICKETS_COMPLETE_CLOSE] Paso 6: Actualizando ticket ${ticketId} a estado CLOSED y vinculando cashSessionId ${openSession.id}`);
      // Actualizar el ticket
      const finalUpdatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CLOSED,
          ticketNumber: ticketNumberToAssign,
          finalAmount: currentFinalAmount, 
          dueAmount: dueAmount > 0.009 ? dueAmount : null, // Guardar la deuda original si existió, sino null
          hasOpenDebt: hasOpenDebtForTicket, // Establecer el campo hasOpenDebt
          cashSessionId: openSession.id,
        },
        include: { 
          client: true, company: true, sellerUser: true, cashierUser: true, 
          clinic: {include: {tariff:true}}, items: {orderBy: {createdAt: 'asc'}}, 
          payments: {orderBy: {paymentDate: 'asc'}}, invoice: true, originalTicket: true, 
          returnTickets: true, cashSession: true, 
          relatedDebts: true // Incluir la deuda recién creada si aplica
        }
      });
      console.log(`[API_TICKETS_COMPLETE_CLOSE] Ticket ${ticketId} actualizado correctamente a estado CLOSED. Transacción finalizada.`); // LOG
      return finalUpdatedTicket;
    });

    console.log(`[API_TICKETS_COMPLETE_CLOSE] Transacción completada para ticket ID: ${ticketId}. Enviando respuesta.`); // LOG RESPUESTA
    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    const ticketIdForError = (await paramsPromise)?.id || 'desconocido';
    console.error(`[API_TICKETS_COMPLETE_CLOSE] Catch General: Error para ticket ${ticketIdForError}:`, error.message, error.stack); // LOG ERROR GENERAL
    const status = error.message?.includes("no encontrado") ? 404 :
                   error.message?.includes("requiere un cliente") ? 400 :
                   error.message?.includes("requiere una clínica") ? 400 :
                   error.message?.includes("Solo se pueden cerrar") ? 403 :
                   error.message?.includes("no está completamente pagado") ? 400 : 500;
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status });
  }
} 