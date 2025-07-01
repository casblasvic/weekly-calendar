import { NextResponse, NextRequest } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerAuthSession } from "@/lib/auth"
import { z } from 'zod'

// GET /api/equipment - Obtener lista de equipamientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId

    const { searchParams } = request.nextUrl
    const clinicId = searchParams.get('clinicId')

    const whereClause: Prisma.EquipmentWhereInput = {
      systemId: systemId,
    }

    // Filtrar por clínica se hace ahora a través de las asignaciones
    if (clinicId) {
      const clinic = await prisma.clinic.findFirst({
        where: { id: clinicId, systemId: systemId },
        select: { id: true }
      })
      if (!clinic) {
        return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a tu sistema.' }, { status: 404 })
      }
      whereClause.clinicAssignments = {
        some: {
          clinicId: clinicId,
          isActive: true
        }
      }
    }

    const equipment = await prisma.equipment.findMany({
      where: whereClause,
      include: {
        clinicAssignments: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                prefix: true,
                city: true,
              }
            },
            cabin: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log(`[API_EQUIPMENT_GET] Devolviendo ${equipment.length} equipos`);
    equipment.forEach((equipo) => {
      console.log(`[API_EQUIPMENT_GET] ${equipo.name}: ${equipo.clinicAssignments.length} asignaciones`);
    });

    return NextResponse.json(equipment)

  } catch (error) {
    console.error("[API_EQUIPMENT_GET]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Esquema Zod para la creación de Equipment (solo tipo/modelo)
const createEquipmentSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Formato de fecha de compra inválido.",
  }).transform(val => val ? new Date(val) : null),
  warrantyEndDate: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Formato de fecha de fin de garantía inválido.",
  }).transform(val => val ? new Date(val) : null),
  isActive: z.boolean().optional().default(true),
})

// POST /api/equipment - Crear nuevo equipamiento
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    
    const body = await request.json()
    
    // Validar con Zod
    const validation = createEquipmentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.format() }, { status: 400 })
    }
    const validatedData = validation.data

    const newEquipment = await prisma.equipment.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        modelNumber: validatedData.modelNumber,
        purchaseDate: validatedData.purchaseDate,
        warrantyEndDate: validatedData.warrantyEndDate,
        isActive: validatedData.isActive,
        systemId: systemId,
      },
    })

    return NextResponse.json(newEquipment, { status: 201 })

  } catch (error) {
    console.error("[API_EQUIPMENT_POST]", error)
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
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 