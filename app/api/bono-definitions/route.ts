import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { ApiBonoDefinitionPayloadSchema } from '@/lib/schemas/bono-definition';

/**
 * GET /api/bono-definitions
 * Obtiene la lista de todas las definiciones de bonos para el sistema del usuario.
 */
export async function GET(request: NextRequest) {
  console.log("[API BONO_DEFINITIONS] GET request received");
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      console.warn("[API BONO_DEFINITIONS GET] Unauthorized access attempt");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API BONO_DEFINITIONS] Validated session for systemId: ${systemId}`);

    // --- Filtros --- 
    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get('isActive');
    const serviceIdParam = searchParams.get('serviceId');
    const productIdParam = searchParams.get('productId');
    
    let whereClause: Prisma.BonoDefinitionWhereInput = {
      systemId: systemId,
    };

    if (isActiveParam !== null) {
      whereClause.settings = {
        isActive: isActiveParam === 'true'
      };
    }
    if (serviceIdParam) {
      whereClause.serviceId = serviceIdParam;
    }
    if (productIdParam) {
      whereClause.productId = productIdParam;
    }
    // --- Fin Filtros --- 

    const bonoDefinitions = await prisma.bonoDefinition.findMany({
      where: whereClause, // Aplicar filtros
      orderBy: { name: 'asc' },
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
        settings: true, // <<< Incluir settings
        tariffPrices: {
          include: {
            tariff: { 
              select: { id: true, name: true } 
            }
          }
        }
      },
    });

    console.log(`[API BONO_DEFINITIONS] Found ${bonoDefinitions.length} bono definitions`);
    return NextResponse.json(bonoDefinitions);

  } catch (error: any) {
    console.error("[API BONO_DEFINITIONS GET] Error:", error);
    return NextResponse.json({ message: "Error al obtener las definiciones de bonos", error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/bono-definitions
 * Crea una nueva definición de bono.
 */
export async function POST(request: NextRequest) {
  console.log("[API BONO_DEFINITIONS] POST request received");
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      console.warn("[API BONO_DEFINITIONS POST] Unauthorized access attempt");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API BONO_DEFINITIONS] Validated session for systemId: ${systemId}`);

    const rawData = await request.json();
    console.log("[API BONO_DEFINITIONS POST] Raw data received:", rawData);

    // Validar los datos con el schema importado
    const validatedData = ApiBonoDefinitionPayloadSchema.parse(rawData);
    console.log("[API BONO_DEFINITIONS POST] Zod validation successful:", validatedData);

    const { serviceId, productId, vatTypeId, settings, ...bonoBaseData } = validatedData;

    // Usar transacción para crear BonoDefinition y BonoDefinitionSetting
    const newBonoDefWithSettings = await prisma.$transaction(async (tx) => {
        // 1. Crear BonoDefinition base
        const newBonoDef = await tx.bonoDefinition.create({
            data: {
                // Campos obligatorios explícitos
      name: validatedData.name,
                quantity: validatedData.quantity,
                price: validatedData.price,
                // Resto de campos base (opcionales)
      description: validatedData.description,
                // Conexiones
      system: { connect: { id: systemId } },
                ...(serviceId && { service: { connect: { id: serviceId } } }),
                ...(productId && { product: { connect: { id: productId } } }),
                ...(vatTypeId && { vatType: { connect: { id: vatTypeId } } }),
            }
        });

        // 2. Crear BonoDefinitionSetting
        const newSettings = await tx.bonoDefinitionSetting.create({
            data: {
                ...settings,
                bonoDefinition: { connect: { id: newBonoDef.id } }
            }
        });

        // 3. Devolver objeto combinado
        return { ...newBonoDef, settings: newSettings };
    });
    
    // Recuperar datos completos fuera de la tx si es necesario
    const finalBonoDefResponse = await prisma.bonoDefinition.findUnique({
        where: { id: newBonoDefWithSettings.id },
        include: { 
            settings: true,
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
      },
    });

    console.log(`[API BONO_DEFINITIONS POST] Successfully created bono definition: ${finalBonoDefResponse?.id}`);
    return NextResponse.json(finalBonoDefResponse, { status: 201 });

  } catch (error: any) {
    console.error("[API BONO_DEFINITIONS POST] Error:", error);
    if (error instanceof z.ZodError) {
      console.error("[API BONO_DEFINITIONS POST] Zod Validation Error:", error.errors);
      return NextResponse.json({ message: "Error de validación", errors: error.errors }, { status: 400 });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'nombre';
        return NextResponse.json({ message: `Ya existe una definición de bono con ese ${target}` }, { status: 409 });
      }
      if (error.code === 'P2003') {
         const fieldName = (error.meta?.field_name as string) || 'relacionado';
         return NextResponse.json({ message: `Referencia inválida: El servicio, producto o tipo de IVA no existe (campo: ${fieldName}).` }, { status: 400 });
      }
      return NextResponse.json({ message: "Error de base de datos", error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al crear la definición de bono", error: error.message }, { status: 500 });
  }
} 