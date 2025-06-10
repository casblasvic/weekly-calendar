import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPromotionsAPI() {
  try {
    // Buscar una entidad legal con clínicas
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        clinics: {
          some: {}
        }
      },
      include: {
        clinics: true
      }
    });

    if (!legalEntity) {
      console.log('No se encontró ninguna entidad legal con clínicas');
      return;
    }

    console.log(`\n=== Probando API de promociones para: ${legalEntity.name} ===`);
    console.log(`Sistema: ${legalEntity.systemId}`);
    console.log(`Clínicas: ${legalEntity.clinics.map(c => c.name).join(', ')}`);

    // Simular la respuesta del API
    const systemPromotionTypes = [
      {
        code: 'MANUAL_DISCOUNT',
        name: 'Descuento Manual',
        isSystem: true,
        isGlobal: true
      },
      {
        code: 'PERCENTAGE_DISCOUNT', 
        name: 'Descuento Porcentual',
        isSystem: true,
        isGlobal: true
      },
      {
        code: 'FIXED_AMOUNT_DISCOUNT',
        name: 'Descuento Cantidad Fija',
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

    // Obtener mapeos existentes
    const discountMappings = await prisma.discountTypeAccountMapping.findMany({
      where: {
        legalEntityId: legalEntity.id,
        systemId: legalEntity.systemId
      },
      include: {
        account: true,
        clinic: true
      }
    });

    console.log(`\nMapeos existentes: ${discountMappings.length}`);

    // Simular estructura de respuesta por clínica
    const clinicsWithPromotions = legalEntity.clinics.map(clinic => {
      const clinicPromotionTypes = systemPromotionTypes.map(promType => {
        // Buscar mapeo específico de clínica o global
        const clinicMapping = discountMappings.find(m => 
          m.discountTypeCode === promType.code && m.clinicId === clinic.id
        );
        const globalMapping = discountMappings.find(m => 
          m.discountTypeCode === promType.code && !m.clinicId
        );
        
        const currentMapping = clinicMapping || globalMapping;
        
        return {
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
        };
      });

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        promotionTypes: clinicPromotionTypes,
        promotions: [] // Por ahora vacío
      };
    });

    console.log('\n=== Estructura de respuesta ===');
    clinicsWithPromotions.forEach(clinic => {
      console.log(`\nClínica: ${clinic.clinicName}`);
      console.log(`Tipos de promoción: ${clinic.promotionTypes.length}`);
      
      const mapped = clinic.promotionTypes.filter(p => p.hasMapping).length;
      const unmapped = clinic.promotionTypes.filter(p => !p.hasMapping).length;
      
      console.log(`  - Mapeados: ${mapped}`);
      console.log(`  - Sin mapear: ${unmapped}`);
      
      clinic.promotionTypes.forEach(promType => {
        console.log(`  ${promType.hasMapping ? '✓' : '✗'} ${promType.name} (${promType.code})`);
        if (promType.hasMapping) {
          console.log(`     -> ${promType.accountCode} - ${promType.accountName}`);
          if (promType.mappingIsGlobal) {
            console.log(`        (Heredado de global)`);
          }
        }
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPromotionsAPI();
