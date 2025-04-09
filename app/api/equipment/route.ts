import { NextResponse } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'
// import { auth } from '@/lib/auth' // Comentado temporalmente

// GET /api/equipment - Obtener lista de equipamientos
export async function GET(request: Request) {
  try {
    // const session = await auth()
    // if (!session?.user?.systemId) { // Asegurarse que el usuario tiene systemId
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Obtener parámetros de búsqueda (ej: clinicId)
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get('clinicId')
    // const systemId = session.user.systemId; // Usar systemId del usuario autenticado
    const systemId = "cm93h9jrt0000y2mc0tx1z3p5"; // TEMPORAL: Usar ID del sistema de ejemplo hasta tener auth

    const whereClause: any = {
      systemId: systemId, // Filtrar siempre por sistema
    }

    if (clinicId) {
      whereClause.clinicId = clinicId
    }

    const equipment = await prisma.equipment.findMany({
      where: whereClause,
      include: {
        clinic: true, // Incluir info de la clínica si se desea
        // device: true, // Incluir info del dispositivo asociado si se desea
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(equipment)

  } catch (error) {
    console.error("[API_EQUIPMENT_GET]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/equipment - Crear nuevo equipamiento
export async function POST(request: Request) {
  try {
    // const session = await auth()
    // if (!session?.user?.systemId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    // // Añadir comprobación de permisos
    // // if (!hasPermission(session.user.roles, 'create', 'equipment')) { 
    // //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // // }

    const body = await request.json()
    const { 
      name,
      description,
      serialNumber,
      modelNumber,
      purchaseDate,
      warrantyEndDate,
      location,
      notes,
      clinicId, // ID de la clínica a la que pertenece
      deviceId, // ID del dispositivo inteligente asociado (opcional)
      isActive = true 
    } = body

    // const systemId = session.user.systemId;
    const systemId = "cm93h9jrt0000y2mc0tx1z3p5"; // TEMPORAL: Usar ID del sistema de ejemplo

    if (!name || !systemId) {
      return NextResponse.json({ error: 'Name and systemId are required' }, { status: 400 })
    }

    // Validar fechas si vienen
    const purchaseDateObj = purchaseDate ? new Date(purchaseDate) : null;
    const warrantyEndDateObj = warrantyEndDate ? new Date(warrantyEndDate) : null;

    const newEquipment = await prisma.equipment.create({
      data: {
        name,
        description,
        serialNumber,
        modelNumber,
        purchaseDate: purchaseDateObj,
        warrantyEndDate: warrantyEndDateObj,
        location,
        notes,
        isActive,
        systemId,
        clinicId, // Puede ser null si no se asigna a una clínica al crear
        deviceId, // Puede ser null
      },
    })

    return NextResponse.json(newEquipment, { status: 201 })

  } catch (error) {
    console.error("[API_EQUIPMENT_POST]", error)
    // Manejar errores específicos de Prisma (ej: violación de unicidad)
    if (error instanceof PrismaClientKnownRequestError) { 
        if (error.code === 'P2002') { // Unique constraint violation
            // Construir mensaje de error más específico si es posible
            let errorMessage = "A unique constraint violation occurred.";
            if (error.meta?.target) {
                const targetFields = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
                errorMessage = `Equipment with this ${targetFields} already exists.`
            }
            return NextResponse.json({ error: errorMessage }, { status: 409 });
        }
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 