import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener todos los paquetes con sus items
    const packages = await prisma.packageDefinition.findMany({
      include: {
        items: {
          include: {
            service: {
              include: {
                category: true
              }
            },
            product: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Devolver en el formato esperado por el frontend
    return NextResponse.json({ 
      packageDefinitions: packages 
    })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Error fetching packages' },
      { status: 500 }
    )
  }
}
