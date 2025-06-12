import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const systemId = session.user.systemId

    // Verificar que la persona existe y pertenece al sistema
    const person = await prisma.person.findFirst({
      where: {
        id,
        systemId,
      },
    })

    if (!person) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 })
    }

    // Obtener todos los pagos realizados por esta persona
    const payments = await prisma.payment.findMany({
      where: {
        payerPersonId: id,
        ticketId: {
          not: null,
        },
      },
      include: {
        ticket: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            items: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            clinic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Filtrar solo los tickets donde el pagador no es el receptor
    const ticketsAsPayer = payments
      .filter(payment => payment.ticket && payment.ticket.personId !== id)
      .map(payment => payment.ticket!)
      // Eliminar duplicados por ticketId
      .filter((ticket, index, self) => 
        index === self.findIndex(t => t.id === ticket.id)
      );

    // Transformar los datos para el formato esperado por el frontend
    const transformedTickets = ticketsAsPayer.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      createdAt: ticket.createdAt.toISOString(),
      totalPrice: ticket.totalAmount,
      finalPrice: ticket.finalAmount,
      paidAmount: ticket.paidAmount,
      remainingAmount: ticket.pendingAmount,
      status: ticket.status,
      type: ticket.type,
      person: ticket.person,
      items: ticket.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.finalPrice,
      })),
    }))

    return NextResponse.json(transformedTickets)
  } catch (error) {
    console.error("[API GET /api/persons/[id]/tickets-as-payer] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener los tickets como pagador" },
      { status: 500 }
    )
  }
} 