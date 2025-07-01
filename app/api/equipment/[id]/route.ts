import { NextResponse, NextRequest } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from "@/lib/auth"
import { z } from 'zod'

// Esquema Zod para la actualización de Equipment (solo tipo/modelo)
const updateEquipmentSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio.").optional(),
  description: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Formato de fecha de compra inválido.",
  }).transform(val => val ? new Date(val) : null),
  warrantyEndDate: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Formato de fecha de fin de garantía inválido.",
  }).transform(val => val ? new Date(val) : null),
  isActive: z.boolean().optional(),
})

// GET /api/equipment/[id] - Obtener equipamiento por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id } = awaitedParams

    if (!id) {
      return NextResponse.json({ error: 'ID de equipamiento requerido' }, { status: 400 })
    }

    const equipment = await prisma.equipment.findFirst({
      where: { 
        id: id,
        systemId: systemId 
      },
      include: {
        clinicAssignments: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          where: {
            isActive: true
          }
        },
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado' }, { status: 404 })
    }

    return NextResponse.json(equipment)

  } catch (error) {
    console.error("[API_EQUIPMENT_GET_BY_ID]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/equipment/[id] - Actualizar equipamiento
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id } = awaitedParams

    if (!id) {
      return NextResponse.json({ error: 'ID de equipamiento requerido' }, { status: 400 })
    }

    const body = await request.json()
    console.log(`[API_EQUIPMENT_PUT] Actualizando equipamiento ${id} con datos:`, body)
    
    // Validar con Zod
    const validation = updateEquipmentSchema.safeParse(body)
    if (!validation.success) {
      console.log(`[API_EQUIPMENT_PUT] Error de validación:`, validation.error.format())
      return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.format() }, { status: 400 })
    }
    const validatedData = validation.data
    console.log(`[API_EQUIPMENT_PUT] Datos validados:`, validatedData)

    // Verificar que el equipamiento existe y pertenece al sistema
    const existingEquipment = await prisma.equipment.findFirst({
      where: { 
        id: id,
        systemId: systemId 
      },
      select: { id: true, name: true }
    })

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado o no pertenece a tu sistema' }, { status: 404 })
    }

    // Preparar datos para actualización (solo campos no undefined)
    const updateData: any = {}
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key as keyof typeof validatedData] !== undefined) {
        updateData[key] = validatedData[key as keyof typeof validatedData]
      }
    })

    const updatedEquipment = await prisma.equipment.update({
      where: { id: id },
      data: updateData,
      include: {
        clinicAssignments: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          where: {
            isActive: true
          }
        },
      },
    })

    console.log(`[API_EQUIPMENT_PUT] Equipamiento actualizado exitosamente:`, {
      id: updatedEquipment.id,
      name: updatedEquipment.name,
      assignments: updatedEquipment.clinicAssignments.length
    })

    return NextResponse.json(updatedEquipment)

  } catch (error) {
    console.error("[API_EQUIPMENT_PUT]", error)
    if (error instanceof PrismaClientKnownRequestError) { 
      if (error.code === 'P2002') {
        let errorMessage = "A unique constraint violation occurred."
        if (error.meta?.target) {
          const targetFields = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target
          errorMessage = `Equipment with this ${targetFields} already exists.`
        }
        return NextResponse.json({ error: errorMessage }, { status: 409 })
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/equipment/[id] - Eliminar equipamiento
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id } = awaitedParams

    if (!id) {
      return NextResponse.json({ error: 'ID de equipamiento requerido' }, { status: 400 })
    }

    // Verificar que el equipamiento existe y pertenece al sistema
    const existingEquipment = await prisma.equipment.findFirst({
      where: { 
        id: id,
        systemId: systemId 
      },
      select: { id: true, name: true }
    })

    if (!existingEquipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado o no pertenece a tu sistema' }, { status: 404 })
    }

    // Verificar si tiene asignaciones activas
    const activeAssignments = await prisma.equipmentClinicAssignment.count({
      where: {
        equipmentId: id,
        isActive: true
      }
    })

    if (activeAssignments > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: el equipamiento tiene ${activeAssignments} asignación(es) activa(s). Desactívalas primero.` 
      }, { status: 409 })
    }

    await prisma.equipment.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Equipamiento eliminado correctamente' })

  } catch (error) {
    console.error("[API_EQUIPMENT_DELETE]", error)
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'No se puede eliminar el equipamiento porque está siendo utilizado en otras entidades.' }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 