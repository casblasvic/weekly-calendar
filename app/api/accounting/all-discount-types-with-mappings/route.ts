/**
 * API para obtener TODOS los tipos de descuento con sus mapeos actuales
 * Incluye tanto promociones como descuentos manuales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = session.user.systemId;
    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get('legalEntityId');
    
    if (!legalEntityId) {
      return NextResponse.json({ error: 'legalEntityId es requerido' }, { status: 400 });
    }

    // Obtener todas las clínicas de la entidad legal
    const clinics = await prisma.clinic.findMany({
      where: { legalEntityId },
      select: { id: true }
    });
    
    const clinicIds = clinics.map(c => c.id);

    // Verificar que la entidad legal pertenece al sistema
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId
      },
      include: {
        clinics: true
      }
    });

    if (!legalEntity) {
      return NextResponse.json({ error: 'Entidad legal no encontrada' }, { status: 404 });
    }

    // Obtener todas las promociones activas (globales y de clínicas)
    const promotions = await prisma.promotion.findMany({
      where: {
        systemId,
        isActive: true,
        OR: [
          // Promociones globales
          {
            applicableClinics: {
              none: {}
            }
          },
          // Promociones asignadas a las clínicas de esta entidad legal
          {
            applicableClinics: {
              some: {
                clinicId: { in: clinicIds }
              }
            }
          }
        ]
      },
      include: {
        applicableClinics: {
          include: {
            clinic: true
          }
        }
      }
    });

    // Obtener todos los mapeos existentes
    const discountMappings = await prisma.discountTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId
      },
      include: {
        account: true
      }
    });

    // Crear un mapa de mapeos por código de descuento
    const mappingsByCode = discountMappings.reduce((acc, mapping) => {
      acc[mapping.discountTypeCode] = mapping;
      return acc;
    }, {} as Record<string, any>);

    // Tipos de descuento fijos
    const fixedDiscountTypes = [
      {
        discountTypeCode: 'MANUAL_DISCOUNT',
        discountTypeName: 'Descuento Manual',
        isFixed: true,
        scope: 'global' as const,
        level: 0,
        currentAccountId: mappingsByCode['MANUAL_DISCOUNT']?.accountId || null,
        currentAccountName: mappingsByCode['MANUAL_DISCOUNT']?.account?.name || null
      },
      {
        discountTypeCode: 'PROMOTIONS',
        discountTypeName: 'Promociones',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 0,
        currentAccountId: mappingsByCode['PROMOTIONS']?.accountId || null,
        currentAccountName: mappingsByCode['PROMOTIONS']?.account?.name || null
      }
    ];

    // Categorías de tipos de promoción
    const promotionCategories = [
      {
        discountTypeCode: 'PROMO_TYPE_PERCENTAGE_DISCOUNT',
        discountTypeName: 'Descuento Porcentual',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 1,
        currentAccountId: mappingsByCode['PROMO_TYPE_PERCENTAGE_DISCOUNT']?.accountId || null,
        currentAccountName: mappingsByCode['PROMO_TYPE_PERCENTAGE_DISCOUNT']?.account?.name || null
      },
      {
        discountTypeCode: 'PROMO_TYPE_FIXED_AMOUNT_DISCOUNT',
        discountTypeName: 'Descuento Cantidad Fija',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 1,
        currentAccountId: mappingsByCode['PROMO_TYPE_FIXED_AMOUNT_DISCOUNT']?.accountId || null,
        currentAccountName: mappingsByCode['PROMO_TYPE_FIXED_AMOUNT_DISCOUNT']?.account?.name || null
      },
      {
        discountTypeCode: 'PROMO_TYPE_BUY_X_GET_Y_SERVICE',
        discountTypeName: 'Compra X Obtén Y (Servicios)',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 1,
        currentAccountId: mappingsByCode['PROMO_TYPE_BUY_X_GET_Y_SERVICE']?.accountId || null,
        currentAccountName: mappingsByCode['PROMO_TYPE_BUY_X_GET_Y_SERVICE']?.account?.name || null
      },
      {
        discountTypeCode: 'PROMO_TYPE_BUY_X_GET_Y_PRODUCT',
        discountTypeName: 'Compra X Obtén Y (Productos)',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 1,
        currentAccountId: mappingsByCode['PROMO_TYPE_BUY_X_GET_Y_PRODUCT']?.accountId || null,
        currentAccountName: mappingsByCode['PROMO_TYPE_BUY_X_GET_Y_PRODUCT']?.account?.name || null
      },
      {
        discountTypeCode: 'PROMO_TYPE_POINTS_MULTIPLIER',
        discountTypeName: 'Multiplicador de Puntos',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 1,
        currentAccountId: mappingsByCode['PROMO_TYPE_POINTS_MULTIPLIER']?.accountId || null,
        currentAccountName: mappingsByCode['PROMO_TYPE_POINTS_MULTIPLIER']?.account?.name || null
      },
      {
        discountTypeCode: 'PROMO_TYPE_FREE_SHIPPING',
        discountTypeName: 'Envío Gratuito',
        isFixed: true,
        scope: 'global' as const,
        isCategory: true,
        level: 1,
        currentAccountId: mappingsByCode['PROMO_TYPE_FREE_SHIPPING']?.accountId || null,
        currentAccountName: mappingsByCode['PROMO_TYPE_FREE_SHIPPING']?.account?.name || null
      }
    ];

    // Convertir promociones a formato de tipos de descuento con nivel 2
    const promotionDiscountTypes = promotions
      .filter(p => p.code)
      .map(promo => {
        const code = `PROMO_${promo.code}`;
        const mapping = mappingsByCode[code];
        const isGlobal = promo.applicableClinics.length === 0;
        
        return {
          discountTypeCode: code,
          discountTypeName: promo.name,
          isFixed: false,
          scope: isGlobal ? 'global' : 'clinic',
          level: 2,
          promotionType: promo.type,
          clinics: isGlobal ? [] : promo.applicableClinics.map(ac => ({
            id: ac.clinic.id,
            name: ac.clinic.name
          })),
          currentAccountId: mapping?.accountId || null,
          currentAccountName: mapping?.account?.name || null
        };
      });

    // Mapeo de tipos de promoción para ordenamiento
    const typeOrder: Record<string, number> = {
      'PERCENTAGE_DISCOUNT': 0,
      'FIXED_AMOUNT_DISCOUNT': 1,
      'BUY_X_GET_Y_SERVICE': 2,
      'BUY_X_GET_Y_PRODUCT': 3,
      'POINTS_MULTIPLIER': 4,
      'FREE_SHIPPING': 5
    };

    // Combinar todos en orden jerárquico
    const allDiscountTypes: any[] = [];
    
    // Agregar descuento manual
    allDiscountTypes.push(fixedDiscountTypes[0]);
    
    // Agregar categoría de promociones
    allDiscountTypes.push(fixedDiscountTypes[1]);
    
    // Para cada categoría de tipo de promoción
    promotionCategories.forEach((category, index) => {
      // Agregar la categoría
      allDiscountTypes.push(category);
      
      // Buscar promociones de este tipo
      const typeKey = Object.keys(typeOrder)[index];
      const promotionsOfType = promotionDiscountTypes.filter(p => p.promotionType === typeKey);
      
      // Agregar las promociones de este tipo
      allDiscountTypes.push(...promotionsOfType);
    });

    return NextResponse.json({
      hasData: true,
      items: allDiscountTypes,
      totalCount: allDiscountTypes.length,
      mappedCount: allDiscountTypes.filter(d => d.currentAccountId).length,
      unmappedCount: allDiscountTypes.filter(d => !d.currentAccountId).length
    });

  } catch (error) {
    console.error('Error fetching all discount types:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de descuento' },
      { status: 500 }
    );
  }
}
