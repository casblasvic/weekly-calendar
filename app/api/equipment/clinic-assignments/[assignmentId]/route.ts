import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Obtener detalles de una asignación específica
export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const awaitedParams = await params
    const assignmentId = awaitedParams.assignmentId

    const assignment = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        id: assignmentId,
        systemId: session.user.systemId
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            prefix: true,
            address: true,
            city: true,
            phone: true,
            email: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            description: true,
            modelNumber: true,
            purchaseDate: true,
            warrantyEndDate: true
          }
        },
        installations: {
          include: {
            equipmentSparePart: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true
                  }
                }
              }
            }
          },
          where: {
            isActive: true
          },
          orderBy: {
            installedAt: 'desc'
          }
        },
        appointments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          where: {
            startTime: {
              gte: new Date()
            }
          },
          orderBy: {
            startTime: 'asc'
          },
          take: 5
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ assignment })

  } catch (error) {
    console.error('Error al obtener asignación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar asignación completa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const awaitedParams = await params
    const assignmentId = awaitedParams.assignmentId
    const body = await request.json()
    
    // Verificar que la asignación existe y pertenece al sistema del usuario
    const existingAssignment = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        id: assignmentId,
        systemId: session.user.systemId
      }
    })

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
    }

    // Si es una actualización simple de estado (compatibilidad hacia atrás)
    if (body.isActive !== undefined && Object.keys(body).length <= 2) {
      const { isActive, notes } = body
      
      const updateData: any = {}
      if (typeof isActive === 'boolean') {
        updateData.isActive = isActive
        updateData.unassignedAt = isActive ? null : new Date()
      }
      if (notes !== undefined) {
        updateData.notes = notes
      }

      const updatedAssignment = await prisma.equipmentClinicAssignment.update({
        where: { id: assignmentId },
        data: updateData,
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

      return NextResponse.json({ assignment: updatedAssignment })
    }

    // Actualización completa de la asignación
    const { clinicId, cabinId, deviceName, serialNumber, deviceId, notes } = body

    // Validaciones de entrada
    if (!clinicId) {
      return NextResponse.json({ error: 'La clínica es requerida' }, { status: 400 })
    }

    if (!serialNumber?.trim()) {
      return NextResponse.json({ error: 'El número de serie es requerido' }, { status: 400 })
    }

    if (!deviceId?.trim()) {
      return NextResponse.json({ error: 'El Device ID es requerido' }, { status: 400 })
    }

    // Verificar que la clínica existe y pertenece al sistema del usuario
    const clinic = await prisma.clinic.findFirst({
      where: {
        id: clinicId,
        systemId: session.user.systemId
      }
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    // Verificar que la cabina existe y pertenece a la clínica (si se especifica)
    if (cabinId) {
      const cabin = await prisma.cabin.findFirst({
        where: {
          id: cabinId,
          clinicId: clinicId,
          systemId: session.user.systemId
        }
      })

      if (!cabin) {
        return NextResponse.json({ error: 'Cabina no encontrada en la clínica especificada' }, { status: 404 })
      }
    }

    // Verificar unicidad del número de serie (excluyendo la asignación actual)
    const existingSerial = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        serialNumber: serialNumber.trim(),
        systemId: session.user.systemId,
        NOT: {
          id: assignmentId
        }
      }
    })

    if (existingSerial) {
      return NextResponse.json({ 
        error: 'Ya existe un dispositivo con este número de serie' 
      }, { status: 409 })
    }

    // Verificar unicidad del Device ID (excluyendo la asignación actual)
    const existingDevice = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        deviceId: deviceId.trim(),
        systemId: session.user.systemId,
        NOT: {
          id: assignmentId
        }
      }
    })

    if (existingDevice) {
      return NextResponse.json({ 
        error: 'Ya existe un dispositivo con este Device ID' 
      }, { status: 409 })
    }

    // Actualizar la asignación
    const updatedAssignment = await prisma.equipmentClinicAssignment.update({
      where: {
        id: assignmentId
      },
      data: {
        clinicId: clinicId,
        cabinId: cabinId || null,
        deviceName: deviceName || null,
        serialNumber: serialNumber.trim(),
        deviceId: deviceId.trim(),
        notes: notes || null,
        updatedAt: new Date()
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

    return NextResponse.json({ 
      message: 'Asignación actualizada correctamente',
      assignment: updatedAssignment 
    })

  } catch (error) {
    console.error('Error al actualizar asignación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar asignación permanentemente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const awaitedParams = await params
    const assignmentId = awaitedParams.assignmentId

    // Verificar que la asignación existe
    const existingAssignment = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        id: assignmentId,
        systemId: session.user.systemId
      }
    })

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
    }

    // Verificar si tiene dependencias antes de eliminar
    const sparePartInstallations = await prisma.sparePartInstallation.count({
      where: {
        equipmentClinicAssignmentId: assignmentId
      }
    })

    if (sparePartInstallations > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: la asignación tiene ${sparePartInstallations} instalación(es) de recambios asociadas` 
      }, { status: 409 })
    }

    const deviceUsage = await prisma.appointmentDeviceUsage.count({
      where: {
        equipmentClinicAssignmentId: assignmentId
      }
    })

    if (deviceUsage > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: la asignación tiene ${deviceUsage} uso(s) en citas registradas` 
      }, { status: 409 })
    }

    // Eliminar asignación
    await prisma.equipmentClinicAssignment.delete({
      where: { id: assignmentId }
    })

    return NextResponse.json({ message: 'Asignación eliminada correctamente' })

  } catch (error) {
    console.error('Error al eliminar asignación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 