import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const clientId = resolvedParams.id
    const systemId = session.user.systemId

    // Verificar que el cliente pertenece al sistema del usuario
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        systemId: systemId
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Obtener bonos del cliente
    const bonoInstances = await prisma.bonoInstance.findMany({
      where: {
        clientId: clientId,
        systemId: systemId
      },
      include: {
        bonoDefinition: {
          select: {
            id: true,
            name: true,
            description: true,
            quantity: true,
            validityDays: true
          }
        },
        consumedItems: {
          select: {
            id: true,
            quantity: true,
            createdAt: true,
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    })

    return NextResponse.json(bonoInstances)
  } catch (error) {
    console.error('Error fetching bonos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
