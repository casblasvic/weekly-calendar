import { NextResponse, type NextRequest } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { PromotionSchema } from '@/lib/schemas/promotion';
import { Prisma, PromotionAccumulationMode, PromotionTargetScope, PromotionType } from '@prisma/client';
import { autoMapPromotion } from '@/lib/accounting/auto-mapping-helpers';

/**
 * GET /api/promociones
 * Obtiene la lista de promociones para el sistema actual.
 * Acepta parámetros de filtro: clinicId, includeGlobal, isActive, etc.
 * TODO: Implementar paginación y ordenación más robusta si es necesario.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const systemId = session.user.systemId;

    // Leer parámetros de la URL
    const { searchParams } = req.nextUrl;
    const clinicId = searchParams.get('clinicId');
    // Parsear includeGlobal (viene como string 'true'/'false')
    const includeGlobalParam = searchParams.get('includeGlobal');
    const includeGlobal = includeGlobalParam === 'true'; // Convierte a boolean
    const isActiveParam = searchParams.get('isActive');
    const typeParam = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10); // Default limit 10
    const skip = (page - 1) * limit;

    // Construir cláusula Where dinámicamente
    const whereClause: Prisma.PromotionWhereInput = {
      systemId: systemId,
    };

    // Añadir filtro de estado activo si se proporciona
    if (isActiveParam !== null) {
      whereClause.isActive = isActiveParam === 'true';
    }

    // Añadir filtro por tipo si se proporciona
    if (typeParam) {
      // Validar que typeParam sea un valor válido del enum PromotionType
      if (Object.values(PromotionType).includes(typeParam as PromotionType)) {
          whereClause.type = typeParam as PromotionType;
      } else {
          console.warn(`Invalid PromotionType received: ${typeParam}. Ignoring filter.`);
      }
    }
    
    // Añadir filtro de búsqueda si se proporciona
    if (search) {
      // Inicializar OR si no existe
      if (!whereClause.OR) {
         whereClause.OR = [];
      }
      // Añadir condiciones de búsqueda al OR existente
      whereClause.OR.push(
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      );
    }


    // --- Lógica de filtro por Clínica y Globales ---
    const clinicScopeFilter: Prisma.PromotionWhereInput[] = [];

    if (clinicId) {
      // Condición 1: Promociones específicas de la clínica
      clinicScopeFilter.push({
        applicableClinics: {
          some: { clinicId: clinicId },
        },
      });

      // Condición 2: Promociones globales (si se solicita)
      if (includeGlobal) {
        clinicScopeFilter.push({
          // 'none: {}' significa que no tiene ninguna relación en applicableClinics
          applicableClinics: { none: {} },
        });
      }
      
      // Aplicar el filtro OR solo si hay condiciones de alcance
       if (clinicScopeFilter.length > 0) {
          // Si ya existe un OR (por la búsqueda), necesitamos un AND con el OR del scope
          if (whereClause.OR) {
              whereClause.AND = [ // Envolver todo en un AND
                 { OR: whereClause.OR }, // El OR de la búsqueda
                 { OR: clinicScopeFilter } // El OR del scope
              ];
              delete whereClause.OR; // Eliminar el OR original
          } else {
             // Si no había búsqueda, simplemente añadimos el OR del scope
             whereClause.OR = clinicScopeFilter; 
          }
       }

    } 
    // Si no se proporciona clinicId, la query original (solo systemId y otros filtros) se aplica,
    // devolviendo todas las promociones (incluyendo globales y específicas de otras clínicas).
    // --- Fin Lógica de Filtro ---


    console.log("[API PROMOTIONS GET] Final Prisma Where Clause:", JSON.stringify(whereClause, null, 2));

    // Ejecutar consulta con el where dinámico
    const promotions = await prisma.promotion.findMany({
      where: whereClause, // Aplicar el where construido
      select: { // Mantener la selección de campos necesarios
        id: true,
        name: true,
        code: true,
        type: true,
        value: true,
        targetScope: true,
        isActive: true,
        startDate: true,
        endDate: true,
        accumulationMode: true,
        definedCompatibilities: {
          select: {
            compatiblePromotion: {
              select: {
                id: true, // Incluir ID para posible uso futuro
                name: true
              }
            }
          }
        },
        applicableClinics: {
          select: {
            clinic: {
              select: {
                id: true, // Incluir ID de la clínica
                name: true
              }
            }
          }
        },
        // Incluir relaciones de target para mostrar nombres en la tabla
        targetService: { select: { name: true } },
        targetProduct: { select: { name: true } },
        targetCategory: { select: { name: true } },
        targetTariff: { select: { name: true } },
        targetBonoDefinition: { select: { name: true } },
        targetPackageDefinition: { select: { name: true } },
        // Incluir relaciones de BOGO gift para mostrar nombres
        bogoGetService: { select: { name: true } },
        bogoGetProduct: { select: { name: true } },
        bogoBuyQuantity: true, // Incluir para BOGO
        bogoGetQuantity: true, // Incluir para BOGO
      },
      orderBy: {
        createdAt: 'desc', // Mantener ordenación o hacerla configurable
      },
       // Añadir paginación
       skip: skip,
       take: limit,
    });
    
     // Obtener el conteo total para la paginación (con el mismo filtro)
     const totalPromotions = await prisma.promotion.count({
        where: whereClause,
     });

    // Devolver los datos junto con la información de paginación
    return NextResponse.json({
      // Si tu frontend espera { data: [...] }, mantenlo.
      // Si espera { promotions: [...], totalPromotions: ... }, ajústalo.
      data: promotions, // Asumiendo que data es lo que espera la lib/api/promotions
      promotions: promotions, // Opcional: incluir bajo la clave 'promotions' si es necesario
      totalPromotions: totalPromotions, // Incluir el total
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalPromotions / limit),
    });

  } catch (error) {
    console.error('[API PROMOTIONS GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error fetching promotions.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promociones
 * Crea una nueva promoción para el sistema actual.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const validationResult = PromotionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          message: 'Invalid promotion data',
          errors: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const promotionData = validationResult.data;

    // TODO: Add logic to ensure only ONE target...Id is set based on targetScope
    // This validation might be complex and better suited for a service layer
    // if the application grows.
    // Example check (needs refinement):
    const targetFields = [
      promotionData.targetServiceId,
      promotionData.targetProductId,
      promotionData.targetBonoDefinitionId,
      promotionData.targetPackageDefinitionId,
      promotionData.targetCategoryId,
      promotionData.targetTariffId,
    ];
    const targetCount = targetFields.filter(Boolean).length;
    
    // --- VALIDACIÓN REFINADA: Asegurar que el targetId correcto está presente y solo uno ---
    let targetIdError = false;
    const requiredTargetScopes = [
        PromotionTargetScope.SPECIFIC_SERVICE, PromotionTargetScope.SPECIFIC_PRODUCT,
        PromotionTargetScope.SPECIFIC_BONO, PromotionTargetScope.SPECIFIC_PACKAGE,
        PromotionTargetScope.CATEGORY, PromotionTargetScope.TARIFF
    ];
    
    if (requiredTargetScopes.includes(promotionData.targetScope)) {
        const expectedField = 
            promotionData.targetScope === PromotionTargetScope.SPECIFIC_SERVICE ? 'targetServiceId' :
            promotionData.targetScope === PromotionTargetScope.SPECIFIC_PRODUCT ? 'targetProductId' :
            promotionData.targetScope === PromotionTargetScope.SPECIFIC_BONO ? 'targetBonoDefinitionId' :
            promotionData.targetScope === PromotionTargetScope.SPECIFIC_PACKAGE ? 'targetPackageDefinitionId' :
            promotionData.targetScope === PromotionTargetScope.CATEGORY ? 'targetCategoryId' :
            promotionData.targetScope === PromotionTargetScope.TARIFF ? 'targetTariffId' : null;
        
        if (!expectedField || !promotionData[expectedField]) {
            targetIdError = true;
             return NextResponse.json({ message: `Target ID for scope ${promotionData.targetScope} is required.` }, { status: 400 });
        }
        // Asegurar que SOLO el campo esperado está presente
        targetFields.forEach((fieldValue, index) => {
            // const fieldName = targetFields[index]; // Esto no da el nombre, corregir lógica
             const currentFieldName = ['targetServiceId', 'targetProductId', 'targetBonoDefinitionId', 'targetPackageDefinitionId', 'targetCategoryId', 'targetTariffId'][index];
            if (currentFieldName !== expectedField && promotionData[currentFieldName as keyof typeof promotionData]) {
                 targetIdError = true;
                 // <<< MOVER return fuera del forEach >>>
            }
        });
        // <<< MOVER return aquí >>>
        if (targetIdError) {
             return NextResponse.json({ message: `Multiple target fields provided. Only ${expectedField} should be set for scope ${promotionData.targetScope}.` }, { status: 400 });
        }
    } else {
        // Si el scope NO requiere un ID específico, asegurarse de que NINGUNO esté presente
        if (targetCount > 0) {
             targetIdError = true;
             return NextResponse.json({ message: `No target ID (Service, Product, etc.) should be set for scope ${promotionData.targetScope}.` }, { status: 400 });
        }
    }
    
    // if (targetIdError) {
    //     // Ya se ha devuelto la respuesta de error, salir de la función
    //     return; // No es necesario si los return están dentro de los if
    // }
    // --- FIN VALIDACIÓN REFINADA ---


    try {
      // Usar una transacción para asegurar atomicidad
      const newPromotion = await prisma.$transaction(async (tx) => {
        // 1. Crear la promoción
        const createdPromotion = await tx.promotion.create({
          data: {
            // Datos básicos validados
            name: promotionData.name,
            type: promotionData.type,
            targetScope: promotionData.targetScope,
            isActive: promotionData.isActive,
            description: promotionData.description || null,
            code: promotionData.code || null,
            value: promotionData.value !== undefined ? Number(promotionData.value) : null,
            bogoBuyQuantity: promotionData.bogoBuyQuantity !== undefined ? Number(promotionData.bogoBuyQuantity) : null,
            bogoGetQuantity: promotionData.bogoGetQuantity !== undefined ? Number(promotionData.bogoGetQuantity) : null,
            bogoGetValue: promotionData.bogoGetValue !== undefined ? Number(promotionData.bogoGetValue) : null,
            minPurchaseAmount: promotionData.minPurchaseAmount !== undefined ? Number(promotionData.minPurchaseAmount) : null,
            maxDiscountAmount: promotionData.maxDiscountAmount !== undefined ? Number(promotionData.maxDiscountAmount) : null,
            maxTotalUses: promotionData.maxTotalUses !== undefined ? Number(promotionData.maxTotalUses) : null,
            maxUsesPerClient: promotionData.maxUsesPerClient !== undefined ? Number(promotionData.maxUsesPerClient) : null,
            startDate: promotionData.startDate ? new Date(promotionData.startDate) : null,
            endDate: promotionData.endDate ? new Date(promotionData.endDate) : null,
            accumulationMode: promotionData.accumulationMode, 

            // Relaciones
            system: { connect: { id: systemId } },
            // Manejo M-M applicableClinics
            applicableClinics: promotionData.applicableClinicIds && promotionData.applicableClinicIds.length > 0
              ? {
                  create: promotionData.applicableClinicIds.map(cId => ({
                    clinic: { connect: { id: cId } }
                  }))
                }
              : undefined,
            // Conexiones de target (como estaban)
            targetService: promotionData.targetServiceId ? { connect: { id: promotionData.targetServiceId } } : undefined,
            targetProduct: promotionData.targetProductId ? { connect: { id: promotionData.targetProductId } } : undefined,
            targetBonoDefinition: promotionData.targetBonoDefinitionId ? { connect: { id: promotionData.targetBonoDefinitionId } } : undefined,
            targetPackageDefinition: promotionData.targetPackageDefinitionId ? { connect: { id: promotionData.targetPackageDefinitionId } } : undefined,
            targetCategory: promotionData.targetCategoryId ? { connect: { id: promotionData.targetCategoryId } } : undefined,
            targetTariff: promotionData.targetTariffId ? { connect: { id: promotionData.targetTariffId } } : undefined,
            // Conexiones de BOGO gift (como estaban)
            bogoGetService: promotionData.bogoGetServiceId ? { connect: { id: promotionData.bogoGetServiceId } } : undefined,
            bogoGetProduct: promotionData.bogoGetProductId ? { connect: { id: promotionData.bogoGetProductId } } : undefined,
          },
        });

        // 2. Crear entradas de compatibilidad si el modo es SPECIFIC
        if (
          promotionData.accumulationMode === PromotionAccumulationMode.SPECIFIC &&
          promotionData.compatiblePromotionIds &&
          promotionData.compatiblePromotionIds.length > 0
        ) {
          // <<< CORRECCIÓN LINTER: Añadir systemId a los datos de compatibilidad >>>
          await tx.promotionCompatibility.createMany({
            data: promotionData.compatiblePromotionIds.map((compatibleId) => ({
              promotionId: createdPromotion.id, 
              compatiblePromotionId: compatibleId,
              systemId: systemId, // <<< AÑADIR systemId aquí >>>
            })),
            skipDuplicates: true, 
          });
        }

        // 3. Recuperar la promoción con las relaciones para devolverla
        // (Esto es opcional, podrías devolver solo el ID o un mensaje de éxito)
        const finalPromotion = await tx.promotion.findUniqueOrThrow({
             where: { id: createdPromotion.id },
             include: { // Incluir lo necesario para la respuesta
                 applicableClinics: { select: { clinicId: true } },
                 definedCompatibilities: { select: { compatiblePromotionId: true } }
             }
         });

        // 4. Mapear datos para la respuesta final si es necesario
         const responseData = {
             ...finalPromotion,
             applicableClinicIds: finalPromotion.applicableClinics.map(ac => ac.clinicId),
             compatiblePromotionIds: finalPromotion.definedCompatibilities.map(dc => dc.compatiblePromotionId),
         };

        // Llamar a la función de mapeo automático
        await autoMapPromotion(tx, finalPromotion.id, session.user.systemId);

        return responseData; // Devolver la promoción creada y mapeada
      });

      // Si la transacción es exitosa, devolver los datos mapeados
      return NextResponse.json(newPromotion, { status: 201 });

    } catch (error) {
      console.error('[API PROMOTIONS POST] Prisma Error:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[])?.join(', ') || 'field';
          return NextResponse.json({ message: `Promotion with this ${target} already exists.` }, { status: 409 });
        }
        if (error.code === 'P2003') {
           return NextResponse.json({ message: `One or more referenced entities (clinic, compatible promotion, etc.) do not exist or another foreign key constraint failed.` }, { status: 400 });
        }
         // Añadir manejo P2025 si una conexión falla
         if (error.code === 'P2025') {
             return NextResponse.json({ message: `One or more referenced entities could not be found.` }, { status: 404 });
         }
      }
      return NextResponse.json({ message: 'Failed to create promotion' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API PROMOTIONS POST] General Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 