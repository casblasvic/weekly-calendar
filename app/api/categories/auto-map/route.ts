import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { CategoryType, getAutoCategoryMapping } from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

// Schema de validación
const AutoMapSchema = z.object({
  categoryIds: z.array(z.string()).min(1),
  legalEntityId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = AutoMapSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { categoryIds, legalEntityId } = validation.data;

    // Obtener el plan contable
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId,
        isActive: true
      }
    });

    if (chartOfAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró plan contable para esta entidad legal' },
        { status: 404 }
      );
    }

    // Obtener las categorías a mapear
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        systemId: session.user.systemId
      }
    });

    const results = [];
    const errors = [];

    // Aplicar mapeo automático a cada categoría
    for (const category of categories) {
      try {
        // Obtener el tipo de categoría (temporalmente usar MIXED si no existe)
        const categoryType = (category as any).type || CategoryType.MIXED;
        
        // Obtener cuenta sugerida
        const accountId = getAutoCategoryMapping(
          {
            id: category.id,
            name: category.name,
            type: categoryType
          },
          chartOfAccounts
        );

        if (!accountId) {
          errors.push({
            categoryId: category.id,
            categoryName: category.name,
            error: 'No se encontró cuenta apropiada'
          });
          continue;
        }

        // Determinar a qué aplica según el tipo
        const appliesToServices = categoryType === CategoryType.SERVICE || categoryType === CategoryType.MIXED;
        const appliesToProducts = categoryType === CategoryType.PRODUCT || categoryType === CategoryType.MIXED;

        // Crear o actualizar el mapeo
        const mapping = await prisma.categoryAccountMapping.upsert({
          where: {
            categoryId_legalEntityId: {
              categoryId: category.id,
              legalEntityId
            }
          },
          update: {
            accountId,
            appliesToServices,
            appliesToProducts,
            updatedAt: new Date()
          },
          create: {
            categoryId: category.id,
            accountId,
            legalEntityId,
            appliesToServices,
            appliesToProducts,
            systemId: session.user.systemId
          }
        });

        const account = chartOfAccounts.find(a => a.id === accountId);
        results.push({
          categoryId: category.id,
          categoryName: category.name,
          accountNumber: account?.accountNumber,
          accountName: account?.name,
          appliesToServices,
          appliesToProducts
        });

      } catch (error) {
        errors.push({
          categoryId: category.id,
          categoryName: category.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se mapearon ${results.length} de ${categories.length} categorías`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in auto-map categories:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático' },
      { status: 500 }
    );
  }
}
