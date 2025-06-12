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

    // Obtener tickets donde este cliente es el pagador (paga por otros)
    // NOTA: Temporalmente comentado hasta que se añadan los campos payerClientId al schema
    const tickets = await prisma.ticket.findMany({
      where: {
        // payerClientId: clientId,
        clientId: clientId, // Temporalmente usando clientId
        systemId: systemId
      },
      include: {
        clinic: {
          select: {
            name: true
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true
          }
        }
      },
      orderBy: {
        issueDate: 'desc'
      }
    })

    return NextResponse.json(tickets)

  } catch (error) {
    console.error('Error fetching tickets as payer:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
