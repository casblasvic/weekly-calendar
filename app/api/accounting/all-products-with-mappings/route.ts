import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get('legalEntityId');
    const systemId = searchParams.get('systemId');

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    // Obtener todas las clínicas de esta entidad legal
    const clinics = await prisma.clinic.findMany({
      where: {
        legalEntityId,
        ...(systemId && { id: systemId }),
      },
      include: {
        tariff: {
          include: {
            productPrices: {
              include: {
                product: {
                  include: {
                    category: true,
                    settings: true,
                    productAccountMappings: {
                      where: {
                        legalEntityId,
                        ...(systemId && { systemId })
                      },
                      include: {
                        account: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Agrupar productos por clínica
    const productsByClinic = clinics.map(clinic => {
      const products = clinic.tariff?.productPrices.map(priceItem => {
        const product = priceItem.product;
        const mapping = product.productAccountMappings[0];
        
        return {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name || null,
          isActive: product.settings?.isActive ?? true,
          price: priceItem.price,
          hasMapping: !!mapping,
          accountId: mapping?.accountId || null,
          accountCode: mapping?.account?.accountNumber || null,
          accountName: mapping?.account?.name || null,
        };
      }) || [];

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        products: products
      };
    });

    // También obtener productos globales del sistema sin tarifa específica
    const globalProducts = await prisma.product.findMany({
      where: {
        systemId: clinics[0]?.systemId || session.user.systemId,
      },
      include: {
        category: true,
        settings: true,
        productAccountMappings: {
          where: {
            legalEntityId,
            ...(systemId && { systemId })
          },
          include: {
            account: true
          }
        }
      }
    });

    // Filtrar productos que no estén en ninguna tarifa
    const allTariffProductIds = new Set(
      productsByClinic.flatMap(clinic => 
        clinic.products.map(product => product.id)
      )
    );

    const unmappedGlobalProducts = globalProducts
      .filter(product => !allTariffProductIds.has(product.id))
      .map(product => {
        const mapping = product.productAccountMappings[0];
        return {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name || null,
          isActive: product.settings?.isActive ?? true,
          hasMapping: !!mapping,
          accountId: mapping?.accountId || null,
          accountCode: mapping?.account?.accountNumber || null,
          accountName: mapping?.account?.name || null,
        };
      });

    return NextResponse.json({
      items: productsByClinic,
      globalProducts: unmappedGlobalProducts,
      totalProducts: productsByClinic.reduce((acc, clinic) => acc + clinic.products.length, 0) + unmappedGlobalProducts.length
    });
  } catch (error) {
    console.error('Error obteniendo productos con mapeos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos con mapeos' },
      { status: 500 }
    );
  }
}
