import { prisma } from '@/lib/db';
import { CategoryType } from '@prisma/client';

export interface CategoryTypeCalculationResult {
  currentType: CategoryType;
  calculatedType: CategoryType;
  needsUpdate: boolean;
  servicesCount: number;
  productsCount: number;
}

/**
 * Calcula el tipo que debería tener una categoría basándose en su contenido
 * y determina si necesita actualización
 */
export async function calculateCategoryType(
  categoryId: string,
  systemId: string
): Promise<CategoryTypeCalculationResult> {
  
  // 🔍 Obtener datos actuales de la categoría y contar servicios/productos
  const [category, servicesCount, productsCount] = await Promise.all([
    prisma.category.findUnique({
      where: { id: categoryId, systemId },
      select: { id: true, name: true, type: true }
    }),
    prisma.service.count({
      where: { categoryId, systemId }
    }),
    prisma.product.count({
      where: { categoryId, systemId }
    })
  ]);

  if (!category) {
    throw new Error(`Categoría ${categoryId} no encontrada`);
  }

  // 📊 Calcular el tipo que debería tener según las reglas de negocio
  const calculatedType = determineTypeByContent(servicesCount, productsCount);
  
  // ✅ Determinar si necesita actualización
  const needsUpdate = category.type !== calculatedType;

  return {
    currentType: category.type,
    calculatedType,
    needsUpdate,
    servicesCount,
    productsCount
  };
}

/**
 * Determina el tipo de categoría según las reglas de negocio
 */
function determineTypeByContent(servicesCount: number, productsCount: number): CategoryType {
  const hasServices = servicesCount > 0;
  const hasProducts = productsCount > 0;

  if (hasServices && hasProducts) {
    return CategoryType.MIXED;
  } else if (hasServices && !hasProducts) {
    return CategoryType.SERVICE;
  } else if (!hasServices && hasProducts) {
    return CategoryType.PRODUCT;
  } else {
    // Sin servicios ni productos - mantener MIXED como default
    return CategoryType.MIXED;
  }
}

/**
 * Actualiza automáticamente el tipo de una categoría si es necesario
 * Devuelve true si se realizó una actualización
 */
export async function updateCategoryTypeIfNeeded(
  categoryId: string,
  systemId: string
): Promise<boolean> {
  
  const result = await calculateCategoryType(categoryId, systemId);
  
  if (!result.needsUpdate) {
    console.log(`📋 [CategoryType] Categoría ${categoryId} ya tiene el tipo correcto: ${result.currentType}`);
    return false;
  }

  // 🔄 Actualizar el tipo en la base de datos
  await prisma.category.update({
    where: { id: categoryId, systemId },
    data: { type: result.calculatedType }
  });

  console.log(`✅ [CategoryType] Categoría ${categoryId} actualizada: ${result.currentType} → ${result.calculatedType} (${result.servicesCount} servicios, ${result.productsCount} productos)`);
  
  return true;
}

/**
 * Recalcula y actualiza tipos de múltiples categorías
 * Útil para operaciones que afectan varias categorías
 */
export async function updateMultipleCategoryTypes(
  categoryIds: string[],
  systemId: string
): Promise<number> {
  
  let updatedCount = 0;
  
  for (const categoryId of categoryIds) {
    try {
      const wasUpdated = await updateCategoryTypeIfNeeded(categoryId, systemId);
      if (wasUpdated) updatedCount++;
    } catch (error) {
      console.error(`❌ [CategoryType] Error actualizando categoría ${categoryId}:`, error);
    }
  }
  
  console.log(`📊 [CategoryType] Proceso completado: ${updatedCount}/${categoryIds.length} categorías actualizadas`);
  
  return updatedCount;
} 