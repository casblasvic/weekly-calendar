import { PrismaClient } from '@prisma/client';
import { UnifiedMappingService } from '../lib/accounting/unified-mapping-service.js';

const prisma = new PrismaClient();

async function fixClinicMappings() {
  try {
    console.log('\n🔧 Corrigiendo mapeos de clínicas...\n');

    // 1. Obtener el sistema y entidades
    const system = await prisma.system.findFirst();
    if (!system) {
      throw new Error('No se encontró ningún sistema');
    }

    const legalEntity = await prisma.legalEntity.findFirst({
      where: { 
        systemId: system.id,
        name: 'Entidad Demo SaaS'
      }
    });

    if (!legalEntity) {
      throw new Error('No se encontró la entidad legal "Entidad Demo SaaS"');
    }

    // 2. Limpiar todos los mapeos existentes
    console.log('🗑️  Limpiando mapeos existentes...');
    
    await prisma.serviceAccountMapping.deleteMany({
      where: { systemId: system.id }
    });
    console.log('   - Mapeos de servicios eliminados');

    await prisma.productAccountMapping.deleteMany({
      where: { systemId: system.id }
    });
    console.log('   - Mapeos de productos eliminados');

    await prisma.paymentMethodAccountMapping.deleteMany({
      where: { systemId: system.id }
    });
    console.log('   - Mapeos de métodos de pago eliminados');

    // 3. Obtener datos necesarios
    const services = await prisma.service.findMany({
      where: { systemId: system.id },
      include: { category: true }
    });

    const products = await prisma.product.findMany({
      where: { systemId: system.id },
      include: { category: true }
    });

    const paymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: { systemId: system.id }
    });

    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: { systemId: system.id }
    });

    console.log(`\n📊 Datos encontrados:`);
    console.log(`   - Servicios: ${services.length}`);
    console.log(`   - Productos: ${products.length}`);
    console.log(`   - Métodos de pago: ${paymentMethods.length}`);
    console.log(`   - Cuentas contables: ${chartOfAccounts.length}`);

    // 4. Recrear mapeos con los prefijos correctos
    console.log('\n♻️  Recreando mapeos con prefijos correctos...\n');

    const options = {
      legalEntityId: legalEntity.id,
      systemId: system.id,
      forceRemap: true
    };

    // Mapear servicios
    console.log('   Mapeando servicios...');
    const serviceResults = await UnifiedMappingService.mapServices(
      services,
      chartOfAccounts,
      'ES',
      options
    );
    console.log(`   ✅ Servicios mapeados: ${serviceResults.mapped}`);

    // Mapear productos
    console.log('   Mapeando productos...');
    const productResults = await UnifiedMappingService.mapProducts(
      products,
      chartOfAccounts,
      'ES',
      options
    );
    console.log(`   ✅ Productos mapeados: ${productResults.mapped}`);

    // Mapear métodos de pago
    console.log('   Mapeando métodos de pago...');
    const paymentResults = await UnifiedMappingService.mapPaymentMethods(
      paymentMethods,
      chartOfAccounts,
      'ES',
      options
    );
    console.log(`   ✅ Métodos de pago mapeados: ${paymentResults.mapped}`);

    // 5. Verificar los nuevos mapeos
    console.log('\n\n🔍 Verificando nuevos mapeos:\n');

    // Verificar servicios
    const serviceMappings = await prisma.serviceAccountMapping.findMany({
      where: { systemId: system.id },
      include: {
        service: true,
        clinic: true,
        account: true
      },
      take: 6
    });

    console.log('📍 Ejemplos de mapeos de servicios:');
    serviceMappings.forEach(m => {
      console.log(`   - ${m.service.name} (${m.clinic?.prefix}): ${m.account.accountNumber}`);
    });

    // Verificar productos
    const productMappings = await prisma.productAccountMapping.findMany({
      where: { 
        systemId: system.id,
        accountType: 'INVENTORY_SALE'
      },
      include: {
        product: true,
        clinic: true,
        account: true
      },
      take: 6
    });

    console.log('\n📍 Ejemplos de mapeos de productos:');
    productMappings.forEach(m => {
      console.log(`   - ${m.product.name} (${m.clinic?.prefix}): ${m.account.accountNumber}`);
    });

    console.log('\n✅ Corrección completada!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixClinicMappings();
