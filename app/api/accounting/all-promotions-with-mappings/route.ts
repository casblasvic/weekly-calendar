/**
 * API para obtener TODOS los tipos de promociones/descuentos con sus mapeos agrupados por clínica
 * NO incluye promociones individuales, solo tipos de promoción
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

    // Verificar que la entidad legal pertenece al sistema
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId
      },
      include: {
        clinics: {
          select: { 
            id: true, 
            name: true 
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

    const clinicIds = legalEntity.clinics.map(c => c.id);

    // Tipos de promoción/descuento del sistema
    const systemPromotionTypes = [
      {
        code: 'MANUAL_DISCOUNT',
        name: 'Descuentos Manuales',
        isSystem: true,
        isGlobal: true
      },
      {
        code: 'BUY_X_GET_Y_SERVICE',
        name: 'Compra X Obtén Y (Servicios)',
        isSystem: true,
        isGlobal: true
      },
      {
        code: 'BUY_X_GET_Y_PRODUCT',
        name: 'Compra X Obtén Y (Productos)',
        isSystem: true,
        isGlobal: true
      },
      {
        code: 'POINTS_MULTIPLIER',
        name: 'Multiplicador de Puntos',
        isSystem: true,
        isGlobal: true
      },
      {
        code: 'FREE_SHIPPING',
        name: 'Envío Gratuito',
        isSystem: true,
        isGlobal: true
      }
    ];

    // Agregar tipos legacy para compatibilidad - se mostrarán como parte de MANUAL_DISCOUNT
    const legacyDiscountTypes = ['PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT'];

    // Obtener todos los mapeos de descuentos/promociones
    const discountMappings = await prisma.discountTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId
      },
      include: {
        account: true,
        clinic: true
      }
    });

    // Crear mapa de mapeos por código de descuento y clínica
    const mappingsByCodeAndClinic = discountMappings.reduce((acc, mapping) => {
      const key = `${mapping.discountTypeCode}:${mapping.clinicId || 'global'}`;
      acc[key] = mapping;
      return acc;
    }, {} as Record<string, any>);

    // Procesar cada clínica
    const clinicsWithPromotions = legalEntity.clinics.map(clinic => {
      const clinicPromotionTypes: any[] = [];

      // Agregar tipos de promoción del sistema
      systemPromotionTypes.forEach(promType => {
        const clinicMappingKey = `${promType.code}:${clinic.id}`;
        const globalMappingKey = `${promType.code}:global`;
        
        const clinicMapping = mappingsByCodeAndClinic[clinicMappingKey];
        const globalMapping = mappingsByCodeAndClinic[globalMappingKey];
        
        // Para MANUAL_DISCOUNT, también buscar mapeos de los tipos legacy
        let currentMapping = clinicMapping || globalMapping;
        
        if (promType.code === 'MANUAL_DISCOUNT' && !currentMapping) {
          // Buscar mapeos de tipos legacy
          for (const legacyType of legacyDiscountTypes) {
            const legacyClinicKey = `${legacyType}:${clinic.id}`;
            const legacyGlobalKey = `${legacyType}:global`;
            
            const legacyClinicMapping = mappingsByCodeAndClinic[legacyClinicKey];
            const legacyGlobalMapping = mappingsByCodeAndClinic[legacyGlobalKey];
            
            currentMapping = legacyClinicMapping || legacyGlobalMapping;
            if (currentMapping) break;
          }
        }
        
        clinicPromotionTypes.push({
          id: promType.code,
          code: promType.code,
          name: promType.name,
          isSystem: true,
          isGlobal: promType.isGlobal,
          hasMapping: !!currentMapping,
          accountId: currentMapping?.accountId || null,
          accountCode: currentMapping?.account?.accountNumber || null,
          accountName: currentMapping?.account?.name || null,
          mappingClinicId: currentMapping?.clinicId || null,
          mappingIsGlobal: !currentMapping?.clinicId
        });
      });

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        promotionTypes: clinicPromotionTypes,
        promotions: [] // NO incluimos promociones individuales
      };
    });

    // Contar tipos de promoción totales y mapeados
    let totalPromotionTypes = 0;
    let mappedPromotionTypes = 0;

    clinicsWithPromotions.forEach(clinic => {
      clinic.promotionTypes.forEach(promType => {
        totalPromotionTypes++;
        if (promType.hasMapping) {
          mappedPromotionTypes++;
        }
      });
    });

    return NextResponse.json({
      hasData: true,
      clinics: clinicsWithPromotions,
      totalTypes: totalPromotionTypes,
      mappedTypes: mappedPromotionTypes,
      unmappedTypes: totalPromotionTypes - mappedPromotionTypes
    });

  } catch (error) {
    console.error('Error al obtener tipos de promoción con mapeos:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de promoción con mapeos' },
      { status: 500 }
    );
  }
}
