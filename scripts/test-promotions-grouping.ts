import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPromotionsGrouping() {
  try {
    // Buscar todas las promociones activas
    const allPromotions = await prisma.promotion.findMany({
      where: {
        isActive: true
      },
      include: {
        applicableClinics: {
          include: {
            clinic: true
          }
        },
        system: true
      }
    });

    console.log(`\n=== Total de promociones activas en todos los sistemas: ${allPromotions.length} ===`);

    // Agrupar por sistema
    const promotionsBySystem = allPromotions.reduce((acc, p) => {
      if (!acc[p.systemId]) {
        acc[p.systemId] = {
          systemName: p.system.name,
          promotions: []
        };
      }
      acc[p.systemId].promotions.push(p);
      return acc;
    }, {} as Record<string, any>);

    // Mostrar promociones por sistema
    for (const [systemId, data] of Object.entries(promotionsBySystem)) {
      console.log(`\n=== Sistema: ${data.systemName} ===`);
      console.log(`Promociones: ${data.promotions.length}`);
      
      const globalPromos = data.promotions.filter((p: any) => p.applicableClinics.length === 0);
      const clinicPromos = data.promotions.filter((p: any) => p.applicableClinics.length > 0);
      
      console.log(`  - Globales: ${globalPromos.length}`);
      console.log(`  - Por clínica: ${clinicPromos.length}`);
      
      if (globalPromos.length > 0) {
        console.log('\n  Promociones Globales:');
        globalPromos.forEach((p: any) => {
          console.log(`    • ${p.name} (${p.code})`);
        });
      }
      
      if (clinicPromos.length > 0) {
        console.log('\n  Promociones por Clínica:');
        clinicPromos.forEach((p: any) => {
          console.log(`    • ${p.name} (${p.code})`);
          p.applicableClinics.forEach((ac: any) => {
            console.log(`      → ${ac.clinic.name}`);
          });
        });
      }
    }

    // Buscar mapeos de descuentos
    console.log('\n\n=== MAPEOS DE DESCUENTOS ===');
    
    const discountMappings = await prisma.discountTypeAccountMapping.findMany({
      include: {
        account: true,
        clinic: true,
        legalEntity: true
      },
      take: 20 // Limitar a 20 para no saturar la salida
    });

    if (discountMappings.length === 0) {
      console.log('No se encontraron mapeos de descuentos');
    } else {
      // Agrupar por entidad legal
      const mappingsByEntity = discountMappings.reduce((acc, m) => {
        if (!acc[m.legalEntityId]) {
          acc[m.legalEntityId] = {
            entityName: m.legalEntity.name,
            mappings: []
          };
        }
        acc[m.legalEntityId].mappings.push(m);
        return acc;
      }, {} as Record<string, any>);

      for (const [entityId, data] of Object.entries(mappingsByEntity)) {
        console.log(`\n${data.entityName}:`);
        data.mappings.forEach((m: any) => {
          const clinicInfo = m.clinicId ? `[${m.clinic?.name}]` : '[Global]';
          console.log(`  - ${m.discountTypeCode} ${clinicInfo} → ${m.account.accountNumber} - ${m.account.name}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPromotionsGrouping();
