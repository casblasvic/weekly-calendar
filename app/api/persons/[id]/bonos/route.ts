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

    // Obtener todos los bonos de la persona
    const bonos = await prisma.bonoInstance.findMany({
      where: {
        personId: id,
      },
      include: {
        bonoDefinition: {
          select: {
            id: true,
            name: true,
            description: true,
            quantity: true,
            validityDays: true,
          },
        },
        consumedItems: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    })

    // Transformar los datos para incluir el remainingQuantity calculado
    const bonosWithRemaining = bonos.map(bono => ({
      ...bono,
      remainingQuantity: bono.remainingQuantity,
    }))

    return NextResponse.json(bonosWithRemaining)
  } catch (error) {
    console.error("[API GET /api/persons/[id]/bonos] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener los bonos" },
      { status: 500 }
    )
  }
} 