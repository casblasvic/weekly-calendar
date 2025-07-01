import { NextResponse, NextRequest } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from "@/lib/auth"
import { z } from 'zod'

// Esquema Zod para crear/actualizar recambio
const sparePartSchema = z.object({
  partName: z.string().min(1, "El nombre del recambio es obligatorio"),
  productId: z.string().cuid("ID de producto inválido"),
  partNumber: z.string().optional().nullable(),
  installationNotes: z.string().optional().nullable(),
  isRequired: z.boolean().optional().default(true),
  category: z.string().optional().nullable(),
  costPrice: z.number().min(0, "El coste debe ser positivo").optional().nullable(),
})

// GET /api/equipment/[id]/spare-parts - Obtener recambios de un equipamiento
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id: equipmentId } = awaitedParams

    if (!equipmentId) {
      return NextResponse.json({ error: 'ID de equipamiento requerido' }, { status: 400 })
    }

    // Verificar que el equipamiento existe y pertenece al sistema
    const equipment = await prisma.equipment.findFirst({
      where: { 
        id: equipmentId,
        systemId: systemId 
      },
      select: { id: true, name: true }
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado' }, { status: 404 })
    }

    const spareParts = await prisma.equipmentSparePart.findMany({
      where: { 
        equipmentId: equipmentId,
        systemId: systemId 
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPrice: true,
            price: true,
            settings: {
              select: {
                currentStock: true
              }
            },
            category: {
              select: {
                name: true
              }
            }
          }
        },
        installations: {
          include: {
            installedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          },
          orderBy: { installedAt: 'desc' }
        },
        _count: {
          select: {
            installations: true
          }
        }
      },
      orderBy: { partName: 'asc' }
    })

    return NextResponse.json(spareParts)

  } catch (error) {
    console.error("[API_EQUIPMENT_SPARE_PARTS_GET]", error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/equipment/[id]/spare-parts - Eliminar recambios (individual o bulk)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id: equipmentId } = awaitedParams

    if (!equipmentId) {
      return NextResponse.json({ error: 'ID de equipamiento requerido' }, { status: 400 })
    }

    const body = await request.json()
    const { sparePartIds } = body

    if (!sparePartIds || !Array.isArray(sparePartIds) || sparePartIds.length === 0) {
      return NextResponse.json({ error: 'IDs de recambios requeridos' }, { status: 400 })
    }

    // Verificar que el equipamiento existe y pertenece al sistema
    const equipment = await prisma.equipment.findFirst({
      where: { 
        id: equipmentId,
        systemId: systemId 
      },
      select: { id: true }
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado' }, { status: 404 })
    }

    // Verificar que todos los recambios existen y pertenecen al equipamiento
    const existingSpareParts = await prisma.equipmentSparePart.findMany({
      where: { 
        id: { in: sparePartIds },
        equipmentId: equipmentId,
        systemId: systemId 
      },
      include: {
        installations: {
          where: { isActive: true },
          select: { id: true }
        },
        product: {
          select: { name: true }
        }
      }
    })

    if (existingSpareParts.length !== sparePartIds.length) {
      return NextResponse.json({ error: 'Algunos recambios no fueron encontrados' }, { status: 404 })
    }

    // Verificar si alguno tiene instalaciones activas
    const partsWithActiveInstallations = existingSpareParts.filter(part => part.installations.length > 0)
    if (partsWithActiveInstallations.length > 0) {
      const partNames = partsWithActiveInstallations.map(part => part.product.name).join(', ')
      return NextResponse.json({ 
        error: `No se pueden eliminar los siguientes recambios porque tienen instalaciones activas: ${partNames}. Desinstálalos primero.` 
      }, { status: 400 })
    }

    // Eliminar los recambios (las instalaciones se eliminan en cascada)
    const deletedCount = await prisma.equipmentSparePart.deleteMany({
      where: { 
        id: { in: sparePartIds },
        equipmentId: equipmentId,
        systemId: systemId 
      }
    })

    return NextResponse.json({ 
      message: `${deletedCount.count} recambio(s) eliminado(s) correctamente`,
      deletedCount: deletedCount.count 
    })

  } catch (error) {
    console.error("[API_EQUIPMENT_SPARE_PARTS_DELETE]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 

// POST /api/equipment/[id]/spare-parts - Crear nuevo recambio para equipamiento
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id: equipmentId } = awaitedParams

    if (!equipmentId) {
      return NextResponse.json({ error: 'ID de equipamiento requerido' }, { status: 400 })
    }

    const body = await request.json()
    
    // Validar con Zod
    const validation = sparePartSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.format() }, { status: 400 })
    }
    const validatedData = validation.data

    // Verificar que el equipamiento existe y pertenece al sistema
    const equipment = await prisma.equipment.findFirst({
      where: { 
        id: equipmentId,
        systemId: systemId 
      },
      select: { id: true }
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipamiento no encontrado' }, { status: 404 })
    }

    // Verificar que el producto existe y pertenece al sistema
    const product = await prisma.product.findFirst({
      where: { 
        id: validatedData.productId,
        systemId: systemId 
      },
      select: { id: true, name: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const newSparePart = await prisma.equipmentSparePart.create({
      data: {
        equipmentId: equipmentId,
        productId: validatedData.productId,
        partName: validatedData.partName,
        partNumber: validatedData.partNumber,
        installationNotes: validatedData.installationNotes,
        isRequired: validatedData.isRequired,
        category: validatedData.category,
        costPrice: validatedData.costPrice,
        systemId: systemId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPrice: true,
            price: true,
            settings: {
              select: {
                currentStock: true
              }
            },
            category: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(newSparePart, { status: 201 })

  } catch (error) {
    console.error("[API_EQUIPMENT_SPARE_PARTS_POST]", error)
    if (error instanceof PrismaClientKnownRequestError) { 
      if (error.code === 'P2002') {
        return NextResponse.json({ 
          error: 'Este producto ya está asociado como recambio para este equipamiento' 
        }, { status: 409 })
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 