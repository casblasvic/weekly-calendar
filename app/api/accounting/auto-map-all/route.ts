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
import type { NextApiRequest, NextApiResponse } from 'next';

// Schema de validación
const AutoMapAllSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string().optional(),
  types: z.array(z.enum([
    'categories', 
    'products', 
    'services', 
    'paymentMethods',
    'vat',
    'expenseTypes',
    'cashEntities',
    'promotions',
    'all'
  ])).optional(),
  forceRemap: z.boolean().optional()
});

// Mapeo de tipos de método de pago a cuentas contables por defecto
const PAYMENT_METHOD_ACCOUNT_MAPPING: Record<string, string> = {
  'CASH': '570',
  'CARD': '572',
  'BANK_TRANSFER': '572',
  'DEFERRED_PAYMENT': '430',
  'CHECK': '572',
  'VOUCHER': '438',
  'FINANCING': '170',
  'GIFT_CARD': '438',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Error al parsear JSON. Asegúrese de enviar un body válido.' },
        { status: 400 }
      );
    }

    const validation = AutoMapAllSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { legalEntityId, types = ['all'], forceRemap = false } = validation.data;
    const systemId = validation.data.systemId || session.user.systemId;
    const includeAll = types.includes('all');

    // Obtener el plan contable
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId,
        isActive: true
      }
    });

    if (chartOfAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró plan contable para esta entidad legal' },
        { status: 404 }
      );
    }

    const results = {
      categories: { mapped: 0, errors: 0, details: [] as any[] },
      products: { mapped: 0, errors: 0, details: [] as any[] },
      services: { mapped: 0, errors: 0, details: [] as any[] },
      paymentMethods: { mapped: 0, errors: 0, details: [] as any[] }
    };

    // Mapear categorías
    if (includeAll || types.includes('categories')) {
      const categories = await prisma.category.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            categoryAccountMappings: {
              none: { legalEntityId }
            }
          })
        }
      });

      for (const category of categories) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.categoryAccountMapping.deleteMany({
              where: {
                categoryId: category.id,
                legalEntityId
              }
            });
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
                systemId
              }
            });
            results.categories.mapped++;
          } else {
            results.categories.errors++;
          }
        } catch {
          results.categories.errors++;
        }
      }
    }

    // Mapear productos
    if (includeAll || types.includes('products')) {
      const products = await prisma.product.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            productAccountMappings: {
              none: { legalEntityId }
            }
          })
        },
        include: { category: true }
      });

      for (const product of products) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.productAccountMapping.deleteMany({
              where: {
                productId: product.id,
                legalEntityId
              }
            });
          }
          
          const accountId = getAutoProductMapping(product as any, chartOfAccounts);

          if (accountId) {
            await prisma.productAccountMapping.create({
              data: {
                productId: product.id,
                accountId,
                legalEntityId,
                systemId
              }
            });
            results.products.mapped++;
          } else {
            results.products.errors++;
          }
        } catch {
          results.products.errors++;
        }
      }
    }

    // Mapear servicios
    if (includeAll || types.includes('services')) {
      const services = await prisma.service.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            serviceAccountMappings: {
              none: { legalEntityId }
            }
          })
        },
        include: { category: true }
      });

      for (const service of services) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.serviceAccountMapping.deleteMany({
              where: {
                serviceId: service.id,
                legalEntityId
              }
            });
          }
          
          const accountId = getAutoServiceMapping(service as any, chartOfAccounts);

          if (accountId) {
            await prisma.serviceAccountMapping.create({
              data: {
                serviceId: service.id,
                accountId,
                legalEntityId,
                systemId
              }
            });
            results.services.mapped++;
          } else {
            results.services.errors++;
          }
        } catch {
          results.services.errors++;
        }
      }
    }

    // Mapear métodos de pago
    if (includeAll || types.includes('paymentMethods')) {
      const paymentMethods = await prisma.paymentMethodDefinition.findMany({
        where: {
          systemId,
          isActive: true,
          ...(!forceRemap && {
            paymentMethodAccountMappings: {
              none: { legalEntityId }
            }
          })
        }
      });

      for (const paymentMethod of paymentMethods) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.paymentMethodAccountMapping.deleteMany({
              where: {
                paymentMethodDefinitionId: paymentMethod.id,
                legalEntityId
              }
            });
          }
          
          const defaultAccount = PAYMENT_METHOD_ACCOUNT_MAPPING[paymentMethod.type] || '572';
          const account = chartOfAccounts.find(acc => acc.accountNumber.startsWith(defaultAccount));

          if (account) {
            await prisma.paymentMethodAccountMapping.create({
              data: {
                paymentMethodDefinitionId: paymentMethod.id,
                accountId: account.id,
                legalEntityId,
                systemId
              }
            });
            results.paymentMethods.mapped++;
          } else {
            results.paymentMethods.errors++;
          }
        } catch {
          results.paymentMethods.errors++;
        }
      }
    }

    const totalMapped = Object.values(results).reduce((sum, r) => sum + r.mapped, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      message: `Se mapearon ${totalMapped} elementos automáticamente${totalErrors > 0 ? ` (${totalErrors} errores)` : ''}`,
      results
    });

  } catch (error) {
    console.error('Error in auto-map all:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático masivo' },
      { status: 500 }
    );
  }
}
