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

    // Obtener relaciones donde este cliente es el origen (clientA)
    const relationsAsSource = await prisma.clientRelation.findMany({
      where: {
        clientAId: clientId
      },
      include: {
        clientB: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Obtener relaciones donde este cliente es el destino (clientB)
    const relationsAsTarget = await prisma.clientRelation.findMany({
      where: {
        clientBId: clientId
      },
      include: {
        clientA: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Combinar y formatear las relaciones
    const allRelations = [
      ...relationsAsSource.map(rel => ({
        id: `${rel.clientAId}-${rel.clientBId}`,
        relationType: rel.relationType,
        notes: rel.notes,
        createdAt: rel.createdAt,
        relatedClient: rel.clientB,
        direction: 'outgoing' as const
      })),
      ...relationsAsTarget.map(rel => ({
        id: `${rel.clientAId}-${rel.clientBId}`,
        relationType: rel.relationType,
        notes: rel.notes,
        createdAt: rel.createdAt,
        relatedClient: rel.clientA,
        direction: 'incoming' as const
      }))
    ]

    return NextResponse.json(allRelations)

  } catch (error) {
    console.error('Error fetching client relations:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const clientAId = resolvedParams.id
    const systemId = session.user.systemId

    const body = await request.json()
    const { clientBId, relationType, notes } = body

    // Verificar que ambos clientes pertenecen al sistema del usuario
    const clients = await prisma.client.findMany({
      where: {
        id: { in: [clientAId, clientBId] },
        systemId: systemId
      }
    })

    if (clients.length !== 2) {
      return NextResponse.json({ error: 'Uno o ambos clientes no encontrados' }, { status: 404 })
    }

    // Crear la relación
    const relation = await prisma.clientRelation.create({
      data: {
        clientAId,
        clientBId,
        relationType,
        notes
      },
      include: {
        clientB: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      id: `${relation.clientAId}-${relation.clientBId}`,
      relationType: relation.relationType,
      notes: relation.notes,
      createdAt: relation.createdAt,
      relatedClient: relation.clientB,
      direction: 'outgoing'
    })

  } catch (error) {
    console.error('Error creating client relation:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
