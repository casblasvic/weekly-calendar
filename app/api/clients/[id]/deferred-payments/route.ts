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

    // Obtener pagos aplazados del cliente
    const deferredPayments = await prisma.payment.findMany({
      where: {
        payerClientId: clientId,
        systemId: systemId,
        paymentMethodDefinition: {
          type: 'DEFERRED_PAYMENT'
        }
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true
          }
        },
        paymentMethodDefinition: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    return NextResponse.json(deferredPayments)
  } catch (error) {
    console.error('Error fetching deferred payments:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
