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

    // Obtener todos los pagos aplazados de la persona
    // Los pagos aplazados son payments con debtLedgerId no nulo
    const deferredPayments = await prisma.payment.findMany({
      where: {
        payerPersonId: id,
        debtLedgerId: {
          not: null,
        },
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        paymentMethodDefinition: {
          select: {
            name: true,
            type: true,
          },
        },
        debtLedger: {
          select: {
            id: true,
            status: true,
            originalAmount: true,
            paidAmount: true,
            pendingAmount: true,
            dueDate: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    })

    // No hay necesidad de transformar si los tipos coinciden
    return NextResponse.json(deferredPayments)
  } catch (error) {
    console.error("[API GET /api/persons/[id]/deferred-payments] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener los pagos aplazados" },
      { status: 500 }
    )
  }
} 