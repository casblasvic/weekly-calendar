#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndRemap() {
  try {
    console.log('🔄 Reseteando y remapeando cuentas contables...\n');

    const legalEntity = await prisma.legalEntity.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!legalEntity) {
      console.error('❌ No se encontró ninguna entidad legal');
      process.exit(1);
    }

    const legalEntityId = legalEntity.id;
    console.log(`🏢 Entidad Legal: ${legalEntity.name}`);
    console.log(`🔑 ID: ${legalEntityId}\n`);

    // 1. Eliminar todos los mapeos existentes
    console.log('🗑️  Eliminando mapeos existentes...');
    
    await prisma.$transaction(async (tx) => {
      // Eliminar mapeos
      await tx.categoryAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.serviceAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.productAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.paymentMethodAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.vATTypeAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.cashSessionAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.discountTypeAccountMapping.deleteMany({ where: { legalEntityId } });
      await tx.expenseTypeAccountMapping.deleteMany({ where: { legalEntityId } });
    });

    console.log('✅ Mapeos eliminados\n');

    // 2. Volver a cargar la configuración rápida
    console.log('🚀 Ejecutando configuración rápida...');
    console.log('Por favor, usa la interfaz web para ejecutar la configuración rápida');
    console.log('o ejecuta el mapeo automático desde la interfaz de usuario.\n');

    console.log('💡 Alternativamente, puedes ejecutar:');
    console.log('   - El botón "Aplicar mapeo automático" en la pestaña de Mapeo');
    console.log('   - O la configuración rápida desde el Plan Contable\n');

    // 3. Mostrar estado actual
    const [categories, services, products] = await Promise.all([
      prisma.category.count({ where: { systemId: legalEntity.systemId } }),
      prisma.service.count({ where: { systemId: legalEntity.systemId } }),
      prisma.product.count({ where: { systemId: legalEntity.systemId } })
    ]);

    console.log('📊 Elementos por mapear:');
    console.log(`   - Categorías: ${categories}`);
    console.log(`   - Servicios: ${services}`);
    console.log(`   - Productos: ${products}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
resetAndRemap();
