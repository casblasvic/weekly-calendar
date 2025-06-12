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
      },
      include: {
        paymentMethodDefinition: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceSeries: true,
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
        paymentDate: 'desc',
      },
    })

    // Transformar los datos para el formato esperado por el frontend
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      paymentNumber: payment.id, // Usando el ID como número de pago por ahora
      createdAt: payment.paymentDate.toISOString(),
      amount: payment.amount,
      status: payment.status || 'COMPLETED',
      paymentMethodCode: payment.paymentMethodDefinition?.code || 'UNKNOWN',
      tickets: payment.ticket ? [{
        id: payment.ticket.id,
        ticketNumber: payment.ticket.ticketNumber || '',
        amount: payment.amount,
        person: payment.ticket.person,
      }] : [],
    }))

    return NextResponse.json(transformedPayments)
  } catch (error) {
    console.error("[API GET /api/persons/[id]/payments-as-payer] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener los pagos realizados" },
      { status: 500 }
    )
  }
} 