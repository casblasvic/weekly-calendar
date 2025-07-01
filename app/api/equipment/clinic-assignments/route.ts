import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Obtener asignaciones de equipos por clínica
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const clinicId = searchParams.get('clinicId')
    const available = searchParams.get('available') // Para filtrar solo equipos disponibles para enchufes
    const includeAssignmentId = searchParams.get('includeAssignmentId') // Para incluir una asignación específica aunque tenga enchufe

    if (!clinicId) {
      return NextResponse.json({ error: 'Se requiere clinicId' }, { status: 400 })
    }

    // Verificar que la clínica pertenece al sistema del usuario
    const clinic = await prisma.clinic.findFirst({
      where: {
        id: clinicId,
        systemId: session.user.systemId
      }
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    // Construir filtros
    const whereClause: any = {
      clinicId: clinicId,
      isActive: true,
      systemId: session.user.systemId
    }

    // Si se solicitan solo asignaciones disponibles para enchufes
    if (available === 'true') {
      if (includeAssignmentId) {
        // Para edición: incluir asignaciones disponibles O la asignación específica actual
        whereClause.OR = [
          { smartPlugDevice: null }, // Asignaciones disponibles
          { id: includeAssignmentId } // La asignación actual (aunque tenga enchufe)
        ]
      } else {
        // Para nueva asignación: solo asignaciones disponibles
        whereClause.smartPlugDevice = null
      }
    }

    const assignments = await prisma.equipmentClinicAssignment.findMany({
      where: whereClause,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            description: true,
            modelNumber: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true,
            prefix: true
          }
        },
        cabin: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { equipment: { name: 'asc' } },
        { deviceName: 'asc' }
      ]
    })

    return NextResponse.json(assignments)

  } catch (error) {
    console.error('Error al obtener asignaciones por clínica:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 