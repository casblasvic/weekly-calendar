import { NextResponse, type NextRequest } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
// Importar también PromotionAccumulationMode
import { Prisma, PromotionType, PromotionTargetScope, PromotionAccumulationMode } from '@prisma/client';
import { PromotionSchema } from '@/lib/schemas/promotion'; 

// Esquema para validación de CUID en parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de promoción inválido." }),
});

// Extraer el schema base y aplicar partial() a ese.
const BasePromotionSchema = PromotionSchema._def.schema; 
// Actualizar schema para incluir compatiblePromotionIds
const UpdatePromotionSchema = BasePromotionSchema.partial().extend({
    compatiblePromotionIds: z.array(z.string().cuid()).optional(),
});

/**
 * GET /api/promociones/[id]
 * Obtiene los detalles de una promoción específica.
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    // <<< CORRECCIÓN: Await params ANTES de usarlo >>>
    const { id } = await ctx.params;

    // Ahora obtener la sesión
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // La validación de 'id' ahora se hace después del await
    if (!id) { 
      return NextResponse.json({ message: 'Promotion ID is required' }, { status: 400 });
    }

    const promotion = await prisma.promotion.findUniqueOrThrow({
      where: {
        id: id,
        systemId: systemId,
      },
      include: {
        applicableClinics: {
          select: {
            clinicId: true
          }
        },
        // Incluir compatibilidades definidas por esta promo
        definedCompatibilities: {
            select: {
                compatiblePromotionId: true
            }
        }
      }
    });
    
    // Extraer los clinicIds y los compatiblePromotionIds
    const responseData = {
        ...promotion,
        applicableClinicIds: promotion.applicableClinics.map(scope => scope.clinicId),
        // Mapear las compatibilidades a un array plano de IDs
        compatiblePromotionIds: promotion.definedCompatibilities.map(comp => comp.compatiblePromotionId),
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[API PROMOTIONS GET /id] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Promotion not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/promociones/[id]
 * Actualiza una promoción existente, manejando la lógica de acumulación.
 */
export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    // <<< CORRECCIÓN: Await params ANTES de usarlo >>>
    const { id } = await ctx.params;

    // Ahora obtener la sesión
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    
    // La validación de 'id' ahora se hace después del await
    if (!id) { 
      return NextResponse.json({ message: 'Promotion ID is required' }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    // Usar el schema parcial extendido
    const validationResult = UpdatePromotionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          message: 'Invalid promotion data for update',
          errors: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const promotionData = validationResult.data;

    // --- Validación de target único (como antes, necesita refinamiento) ---
    if (promotionData.targetScope || promotionData.targetServiceId || promotionData.targetProductId /* ... etc */) {
        const targetFields = [
            promotionData.targetServiceId,
            promotionData.targetProductId,
            promotionData.targetBonoDefinitionId,
            promotionData.targetPackageDefinitionId,
            promotionData.targetCategoryId,
            promotionData.targetTariffId,
        ];
        const targetCount = targetFields.filter(field => field !== undefined).length;
        // console.warn("Target validation in PUT needs refinement."); 
    }

    try {
      // Envolver en transacción
      const updatedPromotion = await prisma.$transaction(async (tx) => {
        // 1. Extraer datos relevantes
        const { applicableClinicIds, compatiblePromotionIds, ...restPromotionData } = promotionData;
        const newAccumulationMode = promotionData.accumulationMode;

        // 2. Preparar datos base para la actualización de Promotion
        const dataToUpdate: Prisma.PromotionUpdateInput = {};
        for (const key in restPromotionData) {
          if (restPromotionData[key as keyof typeof restPromotionData] !== undefined) {
            // Evitar intentar asignar 'compatiblePromotionIds' directamente a PromotionUpdateInput
            if (key !== 'compatiblePromotionIds') { 
                 (dataToUpdate as any)[key] = restPromotionData[key as keyof typeof restPromotionData];
            }
          }
        }

        // Manejo de M-M applicableClinics (Borrar y crear)
        if (applicableClinicIds !== undefined) {
          await tx.promotionClinicScope.deleteMany({ where: { promotionId: id } });
          if (applicableClinicIds.length > 0) {
              await tx.promotionClinicScope.createMany({
                 data: applicableClinicIds.map(clinicId => ({ promotionId: id, clinicId: clinicId }))
              });
          }
          // Ya no está en dataToUpdate porque se filtró arriba
        } 

        // Limpiar clinic obsoleto (si existiera)
        delete (dataToUpdate as any).clinic;

        // 3. Leer estado actual y actualizar la promoción principal
        const currentPromotionState = await tx.promotion.findUnique({ 
             where: { id: id, systemId: systemId },
             select: { accumulationMode: true }
        });

        if (!currentPromotionState) {
            throw new Prisma.PrismaClientKnownRequestError('Promotion not found within transaction', { code: 'P2025', clientVersion: 'tx' });
        }
        
        const updatedPromo = await tx.promotion.update({
          where: { id: id, systemId: systemId },
          data: dataToUpdate,
        });

        // 4. Gestionar PromotionCompatibility según accumulationMode
        const previousAccumulationMode = currentPromotionState.accumulationMode;
        const hasCompatibilityData = compatiblePromotionIds !== undefined; 

        if (newAccumulationMode === PromotionAccumulationMode.SPECIFIC) {
            if (hasCompatibilityData) { 
                 await tx.promotionCompatibility.deleteMany({
                      where: { promotionId: id } 
                 });
                 if (compatiblePromotionIds && compatiblePromotionIds.length > 0) {
                     await tx.promotionCompatibility.createMany({
                          data: compatiblePromotionIds.map(compatibleId => ({
                              promotionId: id,
                              compatiblePromotionId: compatibleId
                          })),
                          skipDuplicates: true 
                     });
                 }
            }
        } else if (previousAccumulationMode === PromotionAccumulationMode.SPECIFIC) { 
             // Si antes era SPECIFIC y ahora NO lo es (ya cubierto por no entrar al primer IF)
             await tx.promotionCompatibility.deleteMany({
                  where: { promotionId: id }
             });
        }

        // 5. Recuperar datos actualizados para la respuesta
        const finalPromotion = await tx.promotion.findUniqueOrThrow({
            where: { id: id },
            include: {
                applicableClinics: { select: { clinicId: true } },
                definedCompatibilities: { select: { compatiblePromotionId: true } }
            }
        });

        return finalPromotion; 
      });

      // Transformar respuesta fuera de la transacción
      const responseData = {
        ...updatedPromotion,
        applicableClinicIds: updatedPromotion.applicableClinics.map(scope => scope.clinicId),
        compatiblePromotionIds: updatedPromotion.definedCompatibilities.map(comp => comp.compatiblePromotionId),
      };

      return NextResponse.json(responseData);

    } catch (error) {
      console.error('[API PROMOTIONS PUT /id] Transaction/Prisma Error:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return NextResponse.json({ message: 'Promotion not found or does not belong to this system' }, { status: 404 });
        }
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[])?.join(', ') || 'field';
          return NextResponse.json({ message: `Update failed: Promotion with this ${target} already exists.` }, { status: 409 });
        }
         if (error.code === 'P2003') { 
            return NextResponse.json({ message: 'Update failed: One or more compatible promotions do not exist.' }, { status: 400 });
         }
      }
      return NextResponse.json({ message: 'Failed to update promotion' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API PROMOTIONS PUT /id] General Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/promociones/[id]
 * Elimina una promoción.
 */
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    // <<< CORRECCIÓN: Await params ANTES de usarlo >>>
    const { id } = await ctx.params;

    // Ahora obtener la sesión
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // La validación de 'id' ahora se hace después del await
    if (!id) { 
      return NextResponse.json({ message: 'Promotion ID is required' }, { status: 400 });
    }
    
    // Usar transacción para asegurar borrado completo
    await prisma.$transaction(async (tx) => {
        // Borrar relaciones de compatibilidad donde esta promoción es la 'A' o la 'B'
        await tx.promotionCompatibility.deleteMany({ where: { OR: [{ promotionId: id }, { compatiblePromotionId: id }] } });
        // Borrar alcances de clínica
        await tx.promotionClinicScope.deleteMany({ where: { promotionId: id } });
        // Ahora borrar la promoción
        await tx.promotion.delete({
             where: { id: id, systemId: systemId },
        });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('[API PROMOTIONS DELETE /id] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Promotion not found or does not belong to this system' }, { status: 404 });
      }
    }
    return NextResponse.json({ message: 'Failed to delete promotion' }, { status: 500 });
  }
}