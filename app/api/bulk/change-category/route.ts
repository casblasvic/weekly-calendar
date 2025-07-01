import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from "@/lib/auth";
import { updateCategoryTypeIfNeeded } from '@/utils/category-type-calculator';
import { z } from 'zod';

const BulkChangeCategorySchema = z.object({
  itemIds: z.array(z.string().cuid()),
  itemType: z.enum(['service', 'product', 'mixed']),
  newCategoryId: z.string().cuid().nullable(),
});

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session || !session.user?.systemId) {
    console.error("API POST /api/bulk/change-category: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  
  const systemId = session.user.systemId;

  try {
    const body = await request.json();
    const validatedData = BulkChangeCategorySchema.parse(body);
    const { itemIds, itemType, newCategoryId } = validatedData;

    if (!itemIds.length) {
      return NextResponse.json({ message: 'No hay elementos para actualizar' }, { status: 400 });
    }

    // Usar transacción para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      const affectedCategories = new Set<string>();

      if (itemType === 'service' || itemType === 'mixed') {
        // 1. Obtener categorías anteriores de servicios
        const servicesWithCategories = await tx.service.findMany({
          where: { 
            id: { in: itemIds },
            systemId: systemId
          },
          select: { id: true, categoryId: true }
        });

        // Recopilar categorías anteriores
        servicesWithCategories.forEach(service => {
          if (service.categoryId) {
            affectedCategories.add(service.categoryId);
          }
        });

        // 2. Actualizar servicios
        const serviceIdsToUpdate = servicesWithCategories.map(s => s.id);
        if (serviceIdsToUpdate.length > 0) {
          await tx.service.updateMany({
            where: { 
              id: { in: serviceIdsToUpdate },
              systemId: systemId
            },
            data: { categoryId: newCategoryId }
          });
        }
      }

      if (itemType === 'product' || itemType === 'mixed') {
        // 3. Obtener categorías anteriores de productos
        const productsWithCategories = await tx.product.findMany({
          where: { 
            id: { in: itemIds },
            systemId: systemId
          },
          select: { id: true, categoryId: true }
        });

        // Recopilar categorías anteriores
        productsWithCategories.forEach(product => {
          if (product.categoryId) {
            affectedCategories.add(product.categoryId);
          }
        });

        // 4. Actualizar productos
        const productIdsToUpdate = productsWithCategories.map(p => p.id);
        if (productIdsToUpdate.length > 0) {
          await tx.product.updateMany({
            where: { 
              id: { in: productIdsToUpdate },
              systemId: systemId
            },
            data: { categoryId: newCategoryId }
          });
        }
      }

      // 5. Añadir nueva categoría a la lista si existe
      if (newCategoryId) {
        affectedCategories.add(newCategoryId);
      }

      return {
        updatedItems: itemIds.length,
        affectedCategories: Array.from(affectedCategories)
      };
    });

    // 6. Actualizar tipos de categorías afectadas FUERA de la transacción
    // para evitar problemas de concurrencia
    const categoryUpdatePromises = result.affectedCategories.map(async (categoryId) => {
      try {
        await updateCategoryTypeIfNeeded(categoryId, systemId);
        return { categoryId, success: true };
      } catch (error) {
        console.error(`Error actualizando tipo de categoría ${categoryId}:`, error);
        return { categoryId, success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    });

    const categoryUpdateResults = await Promise.all(categoryUpdatePromises);
    const successfulCategoryUpdates = categoryUpdateResults.filter(r => r.success).length;
    const failedCategoryUpdates = categoryUpdateResults.filter(r => !r.success);

    if (failedCategoryUpdates.length > 0) {
      console.warn('Algunas categorías no pudieron actualizar su tipo:', failedCategoryUpdates);
    }

    return NextResponse.json({
      success: true,
      updatedItems: result.updatedItems,
      affectedCategories: result.affectedCategories.length,
      categoryUpdatesSuccessful: successfulCategoryUpdates,
      categoryUpdatesFailed: failedCategoryUpdates.length,
      message: `${result.updatedItems} elementos actualizados. ${successfulCategoryUpdates} categorías recalculadas.`
    });

  } catch (error) {
    console.error("Error in bulk category change:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 