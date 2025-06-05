import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { 
  CategoryType,
  getAutoCategoryMapping, 
  getAutoProductMapping, 
  getAutoServiceMapping 
} from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

// Schema de validación
const AutoMapSingleSchema = z.object({
  entityType: z.enum(['category', 'product', 'service']),
  entityId: z.string(),
  legalEntityId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = AutoMapSingleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { entityType, entityId, legalEntityId } = validation.data;

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

    let result = null;

    switch (entityType) {
      case 'category': {
        const category = await prisma.category.findUnique({
          where: { id: entityId }
        });

        if (!category) {
          return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
        }

        const categoryType = (category as any).type || CategoryType.MIXED;
        const accountId = getAutoCategoryMapping(
          { id: category.id, name: category.name, type: categoryType },
          chartOfAccounts
        );

        if (accountId) {
          const appliesToServices = categoryType === CategoryType.SERVICE || categoryType === CategoryType.MIXED;
          const appliesToProducts = categoryType === CategoryType.PRODUCT || categoryType === CategoryType.MIXED;

          await prisma.categoryAccountMapping.create({
            data: {
              categoryId: category.id,
              accountId,
              legalEntityId,
              appliesToServices,
              appliesToProducts,
              systemId: session.user.systemId
            }
          });

          const account = chartOfAccounts.find(a => a.id === accountId);
          result = {
            entityType: 'category',
            entityId: category.id,
            entityName: category.name,
            accountNumber: account?.accountNumber,
            accountName: account?.name
          };
        }
        break;
      }

      case 'product': {
        const product = await prisma.product.findUnique({
          where: { id: entityId },
          include: { category: true }
        });

        if (!product) {
          return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        const accountId = getAutoProductMapping(product as any, chartOfAccounts);

        if (accountId) {
          await prisma.productAccountMapping.create({
            data: {
              productId: product.id,
              accountId,
              legalEntityId,
              systemId: session.user.systemId
            }
          });

          const account = chartOfAccounts.find(a => a.id === accountId);
          result = {
            entityType: 'product',
            entityId: product.id,
            entityName: product.name,
            accountNumber: account?.accountNumber,
            accountName: account?.name
          };
        }
        break;
      }

      case 'service': {
        const service = await prisma.service.findUnique({
          where: { id: entityId },
          include: { category: true }
        });

        if (!service) {
          return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
        }

        const accountId = getAutoServiceMapping(service as any, chartOfAccounts);

        if (accountId) {
          await prisma.serviceAccountMapping.create({
            data: {
              serviceId: service.id,
              accountId,
              legalEntityId,
              systemId: session.user.systemId
            }
          });

          const account = chartOfAccounts.find(a => a.id === accountId);
          result = {
            entityType: 'service',
            entityId: service.id,
            entityName: service.name,
            accountNumber: account?.accountNumber,
            accountName: account?.name
          };
        }
        break;
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'No se pudo determinar una cuenta apropiada para el mapeo automático' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Mapeo automático aplicado exitosamente`,
      result
    });

  } catch (error) {
    console.error('Error in auto-map single:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático' },
      { status: 500 }
    );
  }
}
