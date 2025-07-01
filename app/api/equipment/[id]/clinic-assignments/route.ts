import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
// Los imports de equipment-utils ya no son necesarios
// porque los valores vienen del frontend

// GET - Obtener asignaciones de un equipamiento
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const awaitedParams = await params
    const equipmentId = awaitedParams.id

    // Verificar que el equipamiento existe y pertenece al sistema
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        systemId: session.user.systemId
      }
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado' }, { status: 404 })
    }

    // Obtener todas las asignaciones
    const assignments = await prisma.equipmentClinicAssignment.findMany({
      where: {
        equipmentId: equipmentId,
        systemId: session.user.systemId
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            prefix: true,
            address: true,
            city: true
          }
        },
        cabin: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            description: true,
            modelNumber: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { assignedAt: 'desc' }
      ]
    })

    return NextResponse.json({ assignments })

  } catch (error) {
    console.error('Error al obtener asignaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nueva asignación de equipamiento a clínica
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const awaitedParams = await params
    const equipmentId = awaitedParams.id
    const body = await request.json()
    const { clinicId, cabinId, deviceName, serialNumber, deviceId, notes } = body

    // Validaciones de entrada
    if (!serialNumber?.trim()) {
      return NextResponse.json({ error: 'Número de serie requerido' }, { status: 400 })
    }

    if (!deviceId?.trim()) {
      return NextResponse.json({ error: 'Device ID requerido' }, { status: 400 })
    }

    // Validar que el equipamiento existe
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        systemId: session.user.systemId
      }
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado' }, { status: 404 })
    }

    // Validar que la clínica existe
    const clinic = await prisma.clinic.findFirst({
      where: {
        id: clinicId,
        systemId: session.user.systemId
      }
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    // Validar cabina si se proporciona
    if (cabinId) {
      const cabin = await prisma.cabin.findFirst({
        where: {
          id: cabinId,
          clinicId: clinicId,
          systemId: session.user.systemId
        }
      })

      if (!cabin) {
        return NextResponse.json({ error: 'Cabina no encontrada en la clínica seleccionada' }, { status: 404 })
      }
    }

    // Verificar si ya existe una asignación activa
    const existingActive = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        equipmentId: equipmentId,
        clinicId: clinicId,
        isActive: true,
        systemId: session.user.systemId
      }
    })

    if (existingActive) {
      return NextResponse.json({ 
        error: 'Ya existe una asignación activa de este equipamiento en esta clínica' 
      }, { status: 400 })
    }

    // Verificar que el serial number sea único
    const existingSerial = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        serialNumber: serialNumber.trim(),
        systemId: session.user.systemId
      }
    })

    if (existingSerial) {
      return NextResponse.json({ 
        error: 'Ya existe un equipamiento con este número de serie' 
      }, { status: 400 })
    }

    // Verificar que el device ID sea único
    const existingDeviceId = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        deviceId: deviceId.trim(),
        systemId: session.user.systemId
      }
    })

    if (existingDeviceId) {
      return NextResponse.json({ 
        error: 'Ya existe un equipamiento con este Device ID' 
      }, { status: 400 })
    }

    // Crear la asignación
    const assignment = await prisma.equipmentClinicAssignment.create({
      data: {
        equipmentId: equipmentId,
        clinicId: clinicId,
        cabinId: cabinId || null,
        deviceName: deviceName || null,
        serialNumber: serialNumber.trim(),
        deviceId: deviceId.trim(),
        systemId: session.user.systemId,
        notes: notes || null,
        isActive: true,
        assignedAt: new Date()
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            prefix: true,
            address: true,
            city: true
          }
        },
        cabin: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            description: true,
            modelNumber: true
          }
        }
      }
    })

    return NextResponse.json({ assignment }, { status: 201 })

  } catch (error) {
    console.error('Error al crear asignación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 