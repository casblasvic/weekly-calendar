/**
 * API para obtener TODAS las promociones/descuentos con sus mapeos agrupados por clínica
 * Las promociones se agrupan dentro de sus tipos correspondientes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

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

    // Verificar que la entidad legal pertenece al sistema
    const legalEntity = await db.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId
      },
      include: {
        clinics: {
          select: { 
            id: true, 
            name: true,
            prefix: true 
          }
        }
      }
    });

    if (!legalEntity) {
      return NextResponse.json({ error: 'Entidad legal no encontrada' }, { status: 404 });
    }

    // Si no hay clínicas asignadas
    if (legalEntity.clinics.length === 0) {
      return NextResponse.json({
        hasData: false,
        reason: 'no_clinics_assigned',
        clinics: []
      });
    }

    // Obtener mapeos de tipos de promoción
    const discountMappings = await db.discountTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        clinicId: {
          in: [...legalEntity.clinics.map(c => c.id), 'global']
        }
      },
      include: {
        account: true
      }
    });

    // Obtener mapeos de promociones creadas por usuarios
    const promotionMappings = await db.promotionAccountMapping.findMany({
      where: {
        legalEntityId
      },
      include: {
        account: true,
        promotion: true
      }
    });

    // Crear índice de mapeos por tipo/código y clínica
    const mappingsByTypeAndClinic: Record<string, any> = {};
    discountMappings.forEach(mapping => {
      const key = `${mapping.clinicId}:${mapping.discountTypeCode}`;
      mappingsByTypeAndClinic[key] = mapping;
    });

    // Añadir mapeos de promociones al índice
    promotionMappings.forEach(mapping => {
      const key = `${mapping.clinicId}:PROMO_${mapping.promotion.code}`;
      mappingsByTypeAndClinic[key] = mapping;
    });

    // Obtener todas las promociones activas del sistema
    const allPromotions = await db.promotion.findMany({
      where: {
        systemId,
        isActive: true
      },
      include: {
        applicableClinics: {
          include: {
            clinic: true
          }
        }
      }
    });

    // Tipos de promoción del sistema
    const promotionTypes = [
      { code: 'MANUAL_DISCOUNT', name: 'Descuentos Manuales', isManualDiscount: true },
      { code: 'PERCENTAGE_DISCOUNT', name: 'Descuento Porcentual', promotionType: 'PERCENTAGE_DISCOUNT' },
      { code: 'FIXED_AMOUNT_DISCOUNT', name: 'Descuento Cantidad Fija', promotionType: 'FIXED_AMOUNT_DISCOUNT' },
      { code: 'BUY_X_GET_Y_SERVICE', name: 'Compra X Obtén Y (Servicios)', promotionType: 'BUY_X_GET_Y_SERVICE' },
      { code: 'BUY_X_GET_Y_PRODUCT', name: 'Compra X Obtén Y (Productos)', promotionType: 'BUY_X_GET_Y_PRODUCT' },
      { code: 'POINTS_MULTIPLIER', name: 'Multiplicador de Puntos', promotionType: 'POINTS_MULTIPLIER' },
      { code: 'FREE_SHIPPING', name: 'Envío Gratuito', promotionType: 'FREE_SHIPPING' }
    ];

    // Procesar información por clínica
    const clinicsData = legalEntity.clinics.map(clinic => {
      // Filtrar promociones para esta clínica (globales + específicas)
      const clinicPromotions = allPromotions.filter(promo => 
        promo.applicableClinics.length === 0 || // Global
        promo.applicableClinics.some(ac => ac.clinicId === clinic.id)
      );

      // Crear estructura de tipos de promoción con sus promociones anidadas
      const promotionTypesWithPromotions = promotionTypes.map(type => {
        // Buscar mapeo para este tipo y clínica
        const globalMapping = mappingsByTypeAndClinic[`global:${type.code}`];
        const clinicMapping = mappingsByTypeAndClinic[`${clinic.id}:${type.code}`];
        const mapping = clinicMapping || globalMapping;

        // Filtrar promociones que pertenecen a este tipo
        let typePromotions: any[] = [];
        
        if (type.isManualDiscount) {
          // Los descuentos manuales no tienen promociones asociadas
          typePromotions = [];
        } else if (type.promotionType) {
          // Filtrar promociones por tipo
          typePromotions = clinicPromotions
            .filter(promo => promo.type === type.promotionType)
            .map(promo => {
              // Buscar mapeo específico para esta promoción
              const promoCode = `PROMO_${promo.code}`;
              const promoGlobalMapping = mappingsByTypeAndClinic[`global:${promoCode}`];
              const promoClinicMapping = mappingsByTypeAndClinic[`${clinic.id}:${promoCode}`];
              const promoMapping = promoClinicMapping || promoGlobalMapping;
              
              const isGlobal = promo.applicableClinics.length === 0;
              
              return {
                id: promo.id,
                code: promo.code,
                name: promo.name,
                type: promo.type,
                isGlobal,
                hasMapping: !!promoMapping,
                accountId: promoMapping?.accountId || null,
                accountCode: promoMapping?.account?.accountNumber || null,
                accountName: promoMapping?.account?.name || null,
                mappingIsGlobal: !!promoGlobalMapping && !promoClinicMapping,
                mappingId: promoMapping?.id || null
              };
            });
        }

        return {
          id: type.code,
          code: type.code,
          name: type.name,
          isPromotionType: true,
          hasMapping: !!mapping,
          accountId: mapping?.accountId || null,
          accountCode: mapping?.account?.accountNumber || null,
          accountName: mapping?.account?.name || null,
          mappingIsGlobal: !!globalMapping && !clinicMapping,
          mappingId: mapping?.id || null,
          promotions: typePromotions
        };
      });

      // Contar totales
      const totalTypes = promotionTypesWithPromotions.length;
      const mappedTypes = promotionTypesWithPromotions.filter(t => t.hasMapping).length;
      const totalPromotions = promotionTypesWithPromotions.reduce((sum, type) => sum + type.promotions.length, 0);
      const mappedPromotions = promotionTypesWithPromotions.reduce((sum, type) => 
        sum + type.promotions.filter((p: any) => p.hasMapping).length, 0);

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        clinicPrefix: clinic.prefix,
        promotionTypes: promotionTypesWithPromotions,
        totalTypes,
        mappedTypes,
        totalPromotions,
        mappedPromotions
      };
    });

    // Calcular totales generales
    const totalItems = clinicsData.reduce((sum, clinic) => 
      sum + clinic.totalTypes + clinic.totalPromotions, 0);
    const totalMapped = clinicsData.reduce((sum, clinic) => 
      sum + clinic.mappedTypes + clinic.mappedPromotions, 0);

    return NextResponse.json({
      hasData: true,
      clinics: clinicsData,
      totalItems,
      totalMapped,
      totalUnmapped: totalItems - totalMapped
    });

  } catch (error) {
    console.error('Error fetching promotions with mappings:', error);
    return NextResponse.json(
      { error: 'Error al obtener promociones con mapeos' },
      { status: 500 }
    );
  }
}
