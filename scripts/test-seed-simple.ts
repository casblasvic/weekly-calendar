import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSeedData() {
  try {
    console.log('\n🚀 Verificando datos del seed...\n');

    // 1. Verificar sistemas
    const systems = await prisma.system.findMany();
    console.log(`📍 Sistemas encontrados: ${systems.length}`);
    systems.forEach(s => console.log(`   - ${s.name} (ID: ${s.id})`));

    if (systems.length !== 1) {
      console.error('❌ ERROR: Se esperaba 1 sistema, se encontraron ' + systems.length);
    }

    const system = systems[0];

    // 2. Verificar entidades legales
    const legalEntities = await prisma.legalEntity.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n🏢 Entidades legales encontradas: ${legalEntities.length}`);
    legalEntities.forEach(le => console.log(`   - ${le.name} (ID: ${le.id})`));

    // 3. Verificar clínicas
    const clinics = await prisma.clinic.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n🏥 Clínicas encontradas: ${clinics.length}`);
    clinics.forEach(c => console.log(`   - ${c.name} (${c.prefix}) - Legal Entity: ${c.legalEntityId}`));

    // 4. Verificar plan de cuentas
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n📊 Cuentas contables encontradas: ${chartOfAccounts.length}`);
    
    // Mostrar cuentas principales
    const mainAccounts = chartOfAccounts.filter(a => !a.isSubAccount);
    console.log(`   - Cuentas principales: ${mainAccounts.length}`);
    mainAccounts.slice(0, 5).forEach(a => console.log(`     ${a.accountNumber} - ${a.name}`));

    // 5. Verificar servicios
    const services = await prisma.service.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n🔧 Servicios encontrados: ${services.length}`);
    services.slice(0, 3).forEach(s => console.log(`   - ${s.name}`));

    // 6. Verificar productos
    const products = await prisma.product.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n📦 Productos encontrados: ${products.length}`);
    products.forEach(p => console.log(`   - ${p.name}`));

    // 7. Verificar métodos de pago
    const paymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n💳 Métodos de pago encontrados: ${paymentMethods.length}`);
    paymentMethods.forEach(pm => console.log(`   - ${pm.name}`));

    // 8. Verificar mapeos existentes
    console.log(`\n📋 MAPEOS EXISTENTES:`);
    
    const serviceMappings = await prisma.serviceAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Servicios mapeados: ${serviceMappings}`);

    const productMappings = await prisma.productAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Productos mapeados: ${productMappings}`);

    const paymentMappings = await prisma.paymentMethodAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Métodos de pago mapeados: ${paymentMappings}`);

    // 9. Verificar tipos de IVA
    const vatTypes = await prisma.vATType.findMany({
      where: { systemId: system.id }
    });
    console.log(`\n💸 Tipos de IVA encontrados: ${vatTypes.length}`);
    vatTypes.forEach(vat => console.log(`   - ${vat.name} (${vat.rate}%)`));

    console.log('\n✅ Verificación completada!\n');

  } catch (error) {
    console.error('\n❌ Error en la verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la verificación
testSeedData();
