import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from "@prisma/client";

// Definir el esquema de validación para los parámetros de la ruta
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "El ID del ticket debe ser un CUID válido." }),
});

// La firma de la función ahora indica que `params` es una Promesa
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    // Hacemos await a la promesa de params para obtener el objeto real
    const params = await paramsPromise;
    const { id: routeId } = params; // Ahora 'params' es el objeto resuelto

    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json(
        { error: "Usuario no autenticado o falta systemId." },
        { status: 401 }
      );
    }
    const systemId = session.user.systemId;

    // Usar 'routeId' para el log
    console.log("[API_TICKETS_ID_GET] Received routeId:", routeId);

    // Validar el 'routeId' extraído
    const paramsValidation = ParamsSchema.safeParse({ id: routeId });

    if (!paramsValidation.success) {
      console.error("[API_TICKETS_ID_GET] Zod validation failed for ticketId:", paramsValidation.error.flatten());
      return NextResponse.json(
        { error: "Parámetro ID de ticket inválido", details: paramsValidation.error.flatten() },
        { status: 400 }
      );
    }

    // Ahora 'id' es el ticketId validado y seguro para usar.
    const { id } = paramsValidation.data;

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: id,
        systemId: systemId, // Asegurar que el ticket pertenece al systemId del usuario
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            taxId: true,
            fiscalName: true,
            // ...otros campos de cliente que puedan ser útiles
          },
        },
        sellerUser: { // Vendedor
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        cashierUser: { // Cajero/Usuario que cierra el ticket
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true /*, más campos si son necesarios */ },
            },
            service: {
              select: { id: true, name: true, code: true /*, más campos si son necesarios */ },
            },
            bonoDefinition: { // Si un item de ticket consume un bono
              select: { id: true, name: true }
            },
            packageDefinition: { // Si un item de ticket consume un paquete
              select: { id: true, name: true }
            }
            // Consumptions and other relations per item might be too much for a detail view header, 
            // but could be fetched separately if needed for a specific section.
          },
          orderBy: {
            createdAt: 'asc' // O algún otro orden lógico para los items
          }
        },
        payments: {
          include: {
            paymentMethodDefinition: {
              select: { id: true, name: true, type: true },
            },
            bankAccount: { // Si el pago está asociado a una cuenta bancaria
                select: { id: true, accountName: true, bank: { select: { name: true } } }
            },
            posTerminal: { // Si el pago está asociado a un terminal POS
                select: { id: true, name: true }
            }
          },
          orderBy: {
            paymentDate: 'asc'
          }
        },
        // Se podría incluir la clínica si se necesita mostrar más info que solo el ID
        // clinic: { select: { id: true, name: true, currencyCode: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    console.log(`[API_TICKETS_ID_GET] Ticket details fetched for ID: ${id}, System: ${systemId}`);
    return NextResponse.json(ticket);

  } catch (error) {
    console.error("[API_TICKETS_ID_GET] Error fetching ticket:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Error de validación.", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor al obtener el ticket." },
      { status: 500 }
    );
  }
}

// TODO: Implementar PUT y DELETE para actualizar y eliminar un ticket individual si es necesario
// export async function PUT(request: NextRequest, { params }: { params: { id: string } }) { ... }
// export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) { ... } 