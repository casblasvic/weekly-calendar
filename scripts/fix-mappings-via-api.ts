import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMappingsViaAPI() {
  try {
    console.log('\n🔧 Limpiando y regenerando mapeos...\n');

    // 1. Obtener el sistema y entidad legal
    const system = await prisma.system.findFirst();
    const legalEntity = await prisma.legalEntity.findFirst({
      where: { 
        systemId: system?.id,
        name: 'Entidad Demo SaaS'
      }
    });

    if (!system || !legalEntity) {
      throw new Error('No se encontraron el sistema o la entidad legal');
    }

    // 2. Limpiar mapeos existentes
    console.log('🗑️  Limpiando mapeos existentes...');
    
    const deletedServices = await prisma.serviceAccountMapping.deleteMany({
      where: { systemId: system.id }
    });
    console.log(`   - Eliminados ${deletedServices.count} mapeos de servicios`);

    const deletedProducts = await prisma.productAccountMapping.deleteMany({
      where: { systemId: system.id }
    });
    console.log(`   - Eliminados ${deletedProducts.count} mapeos de productos`);

    const deletedPayments = await prisma.paymentMethodAccountMapping.deleteMany({
      where: { systemId: system.id }
    });
    console.log(`   - Eliminados ${deletedPayments.count} mapeos de métodos de pago`);

    // 3. Limpiar subcuentas creadas por los mapeos incorrectos
    console.log('\n🗑️  Limpiando subcuentas con códigos incorrectos...');
    
    const deletedAccounts = await prisma.chartOfAccountEntry.deleteMany({
      where: {
        systemId: system.id,
        isSubAccount: true,
        OR: [
          { accountNumber: { contains: '.CM-O.' } },
          { accountNumber: { contains: '.CAMU.' } },
          { accountNumber: { contains: '.CM.' } }
        ]
      }
    });
    console.log(`   - Eliminadas ${deletedAccounts.count} subcuentas`);

    console.log('\n✅ Limpieza completada!');
    console.log('\n📌 Ahora debes:');
    console.log('   1. Ir a la aplicación web');
    console.log('   2. Navegar a la configuración de mapeos contables');
    console.log('   3. Ejecutar "Mapear Automáticamente"');
    console.log('   4. Verificar que los servicios ahora usen prefijos diferentes (CMO, CAFC, TEST)');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMappingsViaAPI();
