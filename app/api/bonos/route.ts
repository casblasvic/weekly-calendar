import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener todos los bonos (no hay campo isActive)
    const bonos = await prisma.bonoDefinition.findMany({
      include: {
        service: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(bonos)
  } catch (error) {
    console.error('Error fetching bonos:', error)
    return NextResponse.json(
      { error: 'Error fetching bonos' },
      { status: 500 }
    )
  }
}
