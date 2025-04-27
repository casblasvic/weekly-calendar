import { NextResponse, type NextRequest } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { PromotionSchema } from '@/lib/schemas/promotion';
import { Prisma, PromotionAccumulationMode, PromotionTargetScope } from '@prisma/client';

/**
 * GET /api/promociones
 * Obtiene la lista de promociones para el sistema actual.
 * TODO: Implementar paginación, filtros, ordenación avanzada.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const systemId = session.user.systemId;

    const promotions = await prisma.promotion.findMany({
      where: {
        systemId: systemId,
      },
      select: {
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
                name: true
              }
            }
          }
        },
        applicableClinics: { 
          select: { 
            clinic: { 
              select: { 
                name: true 
              } 
            } 
          } 
        },
        targetService: { select: { name: true } },
        targetProduct: { select: { name: true } },
        targetCategory: { select: { name: true } },
        targetTariff: { select: { name: true } },
        targetBonoDefinition: { select: { name: true } },
        targetPackageDefinition: { select: { name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      data: promotions,
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
    if (targetCount > 1) {
        return NextResponse.json({ message: 'Only one target field (Service, Product, Bono, etc.) can be set' }, { status: 400 });
    }
    // Add more specific checks based on targetScope if needed

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

            // AÑADIDO: Guardar accumulationMode
            accumulationMode: promotionData.accumulationMode, // Asume que PromotionSchema lo provee

            // Relaciones
            system: { connect: { id: systemId } },
            applicableClinics: promotionData.applicableClinicIds && promotionData.applicableClinicIds.length > 0
              ? {
                  create: promotionData.applicableClinicIds.map(clinicId => ({
                    clinic: { connect: { id: clinicId } }
                  }))
                }
              : undefined,
            targetService: promotionData.targetServiceId ? { connect: { id: promotionData.targetServiceId } } : undefined,
            targetProduct: promotionData.targetProductId ? { connect: { id: promotionData.targetProductId } } : undefined,
            targetBonoDefinition: promotionData.targetBonoDefinitionId ? { connect: { id: promotionData.targetBonoDefinitionId } } : undefined,
            targetPackageDefinition: promotionData.targetPackageDefinitionId ? { connect: { id: promotionData.targetPackageDefinitionId } } : undefined,
            targetCategory: promotionData.targetCategoryId ? { connect: { id: promotionData.targetCategoryId } } : undefined,
            targetTariff: promotionData.targetTariffId ? { connect: { id: promotionData.targetTariffId } } : undefined,
            bogoGetService: promotionData.bogoGetServiceId ? { connect: { id: promotionData.bogoGetServiceId } } : undefined,
            bogoGetProduct: promotionData.bogoGetProductId ? { connect: { id: promotionData.bogoGetProductId } } : undefined,
          },
        });

        // 2. Crear entradas de compatibilidad si el modo es SPECIFIC
        if (
          promotionData.accumulationMode === PromotionAccumulationMode.SPECIFIC && // Usar miembro del enum
          promotionData.compatiblePromotionIds &&
          promotionData.compatiblePromotionIds.length > 0
        ) {
          // Crear enlaces de compatibilidad
          await tx.promotionCompatibility.createMany({
            data: promotionData.compatiblePromotionIds.map((compatibleId) => ({
              promotionId: createdPromotion.id, // La nueva promoción - Nombre corregido
              compatiblePromotionId: compatibleId,       // La compatible - Nombre corregido
            })),
            skipDuplicates: true, // Evita errores si la relación ya existe de alguna manera
          });
        }

        return createdPromotion; // Devolver la promoción creada desde la transacción
      });

      // Si la transacción es exitosa, devolver la promoción creada
      return NextResponse.json(newPromotion, { status: 201 });

    } catch (error) {
      console.error('[API PROMOTIONS POST] Prisma Error:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Violación de restricción única (ej. código duplicado)
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[])?.join(', ') || 'field';
          return NextResponse.json({ message: `Promotion with this ${target} already exists.` }, { status: 409 }); // Conflicto
        }
        // Fallo de clave foránea (ej. compatiblePromotionId no existe)
        if (error.code === 'P2003') {
           // Podrías ser más específico si sabes qué campo falló (compatiblePromotionId)
           return NextResponse.json({ message: `One or more compatible promotions do not exist or another foreign key constraint failed.` }, { status: 400 });
        }
      }
      // Error genérico del servidor durante la transacción o creación
      return NextResponse.json({ message: 'Failed to create promotion' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API PROMOTIONS POST] General Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 