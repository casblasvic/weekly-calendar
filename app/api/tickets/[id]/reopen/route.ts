import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, DebtStatus, CashSessionStatus } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const resolvedParams = await params;
  console.log(`[API REOPEN TICKET] Iniciando proceso para ticket ID desde params: ${resolvedParams.id}`);
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      console.log('[API REOPEN TICKET] Error: No autenticado o falta systemId.');
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const { systemId } = session.user;
    console.log(`[API REOPEN TICKET] Usuario autenticado. SystemId: ${systemId}`);

    const paramsValidation = paramsSchema.safeParse(resolvedParams);
    if (!paramsValidation.success) {
      console.log('[API REOPEN TICKET] Error: ID de ticket inválido en params.', paramsValidation.error.format());
      return NextResponse.json({ message: 'ID de ticket inválido', errors: paramsValidation.error.format() }, { status: 400 });
    }
    const ticketId = paramsValidation.data.id;
    console.log(`[API REOPEN TICKET] ID de ticket validado: ${ticketId}`);

    const updatedTicket = await prisma.$transaction(async (tx) => {
      console.log(`[API REOPEN TICKET] Buscando ticket ID: ${ticketId} para systemId: ${systemId} dentro de la transacción.`);
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId, systemId: systemId },
        include: { relatedDebts: true }
      });

      console.log('[API REOPEN TICKET] Ticket encontrado en BD:', ticket);

      if (!ticket) {
        console.log('[API REOPEN TICKET] Error: Ticket no encontrado en BD.');
        throw new Error('Ticket no encontrado.');
      }

      if (ticket.status !== TicketStatus.CLOSED) {
        console.log(`[API REOPEN TICKET] Error: El ticket no está en estado CLOSED. Estado actual: ${ticket.status}`);
        throw new Error('Solo se pueden reabrir tickets que estén en estado CLOSED.');
      }

      // Verificar la caja asociada si existe
      if (ticket.cashSessionId) {
        console.log(`[API REOPEN TICKET] Ticket asociado a CashSessionId: ${ticket.cashSessionId}. Verificando estado de la caja.`);
        const cashSession = await tx.cashSession.findUnique({
          where: { id: ticket.cashSessionId, systemId: systemId }, // Asegurar que la caja pertenezca al mismo systemId
        });

        if (!cashSession) {
          console.log(`[API REOPEN TICKET] Error: Caja (CashSession) con ID ${ticket.cashSessionId} no encontrada.`);
          throw new Error('La caja asociada al ticket no fue encontrada.');
        }

        if (cashSession.status !== CashSessionStatus.OPEN) {
          console.log(`[API REOPEN TICKET] Error: La caja asociada (ID: ${ticket.cashSessionId}) no está ABIERTA. Estado actual: ${cashSession.status}`);
          throw new Error('No se puede reabrir un ticket si la caja asociada no está en estado ABIERTA.');
        }
        console.log(`[API REOPEN TICKET] La caja asociada (ID: ${ticket.cashSessionId}) está ABIERTA. Se permite la reapertura del ticket.`);
      } else {
        console.log(`[API REOPEN TICKET] El ticket no está asociado a ninguna caja. Se permite la reapertura.`);
      }
      console.log(`[API REOPEN TICKET] El ticket cumple las condiciones para ser reabierto.`);
      
      // Gestionar DebtLedger si existe una deuda abierta para este ticket
      const activeDebt = ticket.relatedDebts.find(d => d.status === DebtStatus.PENDING || d.status === DebtStatus.PARTIALLY_PAID);
      
      if (activeDebt) {
        await tx.debtLedger.update({
          where: { id: activeDebt.id },
          data: {
            status: DebtStatus.CANCELLED,
            notes: activeDebt.notes ? `${activeDebt.notes}\nCancelada por reapertura de ticket.` : 'Cancelada por reapertura de ticket.'
          }
        });
        console.log(`[API REOPEN TICKET] DebtLedger ${activeDebt.id} cancelled for ticket ${ticketId}.`);
      }
      
      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.OPEN,
          hasOpenDebt: false, // Ya no hay deuda activa o la anterior fue cancelada
          dueAmount: null,    // Anular la "foto fija" de la deuda anterior, ya que el ticket se reabre
                              // Opcionalmente, podrías dejarlo con el valor original si prefieres mantener ese historial específico.
                              // Pero si la deuda se cancela, anular dueAmount parece más consistente.
        },
        include: { 
          client: true, company: true, sellerUser: true, cashierUser: true, 
          clinic: {include: {tariff:true}}, items: {orderBy: {createdAt: 'asc'}}, 
          payments: {orderBy: {paymentDate: 'asc'}}, invoice: true, originalTicket: true, 
          returnTickets: true, cashSession: true,
          relatedDebts: true // Devolver las deudas actualizadas (ahora cancelada si había una)
        }
      });
    });
    console.log('[API REOPEN TICKET] Ticket actualizado y reabierto exitosamente.', updatedTicket);
    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    let ticketIdForErrorLog: string | undefined = "desconocido";
    if (resolvedParams && typeof resolvedParams.id === 'string') {
      ticketIdForErrorLog = resolvedParams.id;
    }
    
    console.error(`[API_TICKETS_REOPEN] Error procesando ticket ${ticketIdForErrorLog}:`, error.message, error.stack);
    const isNotFoundError = error.message?.includes("no encontrado");
    const isForbiddenError = error.message?.includes("Solo se pueden reabrir") || error.message?.includes("incluido en un cierre");
    
    let status = 500;
    if (isNotFoundError) status = 404;
    if (isForbiddenError) status = 403;
    // Si es un error de validación de Zod desde el $transaction (aunque menos probable aquí)
    if (error.name === 'ZodError') status = 400; 

    console.log(`[API REOPEN TICKET] Devolviendo error con estado: ${status}`);
    return NextResponse.json({ message: error.message || 'Error interno del servidor.' }, { status });
  }
} 