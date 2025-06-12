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

    // Obtener todos los tickets donde esta persona es el receptor
    const tickets = await prisma.ticket.findMany({
      where: {
        personId: id, // personId es el receptor del servicio
        systemId,
      },
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
                code: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        payments: {
          include: {
            payerPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transformar los datos para el formato esperado por el frontend
    const transformedTickets = tickets.map(ticket => {
      // Encontrar el pagador principal (puede haber varios pagos)
      const payerPerson = ticket.payments.length > 0 
        ? ticket.payments[0].payerPerson 
        : null;

      return {
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
        payerPerson,
        items: ticket.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.finalPrice,
        })),
      };
    })

    return NextResponse.json(transformedTickets)
  } catch (error) {
    console.error("[API GET /api/persons/[id]/tickets-as-receiver] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener los tickets como receptor" },
      { status: 500 }
    )
  }
} 