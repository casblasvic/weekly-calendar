import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAutoProductMapping } from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

// Schema de validación
const AutoMapSchema = z.object({
  productIds: z.array(z.string()).min(1),
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

    const { productIds, legalEntityId } = validation.data;

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

    // Obtener los productos a mapear
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        systemId: session.user.systemId
      },
      include: {
        category: true
      }
    });

    const results = [];
    const errors = [];

    // Aplicar mapeo automático a cada producto
    for (const product of products) {
      try {
        // Obtener cuenta sugerida
        const accountId = getAutoProductMapping(product, chartOfAccounts);

        if (!accountId) {
          errors.push({
            productId: product.id,
            productName: product.name,
            error: 'No se encontró cuenta apropiada'
          });
          continue;
        }

        // Crear o actualizar el mapeo
        const mapping = await prisma.productAccountMapping.upsert({
          where: {
            productId_legalEntityId: {
              productId: product.id,
              legalEntityId
            }
          },
          update: {
            accountId,
            updatedAt: new Date()
          },
          create: {
            productId: product.id,
            accountId,
            legalEntityId,
            systemId: session.user.systemId
          }
        });

        const account = chartOfAccounts.find(a => a.id === accountId);
        results.push({
          productId: product.id,
          productName: product.name,
          accountNumber: account?.accountNumber,
          accountName: account?.name
        });

      } catch (error) {
        errors.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se mapearon ${results.length} de ${products.length} productos`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in auto-map products:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático' },
      { status: 500 }
    );
  }
}
