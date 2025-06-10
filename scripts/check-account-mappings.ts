import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccountMappings() {
  try {
    console.log('\n🔍 Verificando mapeos contables...\n');

    // 1. Obtener clínicas
    const clinics = await prisma.clinic.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('📍 Clínicas encontradas:');
    clinics.forEach(c => {
      console.log(`   - ${c.name} (Prefix: ${c.prefix})`);
    });

    // 2. Verificar mapeos de servicios
    console.log('\n🔧 MAPEOS DE SERVICIOS:');
    
    const serviceMappings = await prisma.serviceAccountMapping.findMany({
      include: {
        service: true,
        clinic: true,
        account: true
      },
      orderBy: [
        { service: { name: 'asc' } },
        { clinic: { name: 'asc' } }
      ]
    });

    if (serviceMappings.length === 0) {
      console.log('   ❌ No hay mapeos de servicios');
    } else {
      // Agrupar por servicio
      const serviceGroups = serviceMappings.reduce((acc, mapping) => {
        const serviceName = mapping.service.name;
        if (!acc[serviceName]) acc[serviceName] = [];
        acc[serviceName].push(mapping);
        return acc;
      }, {} as Record<string, typeof serviceMappings>);

      for (const [serviceName, mappings] of Object.entries(serviceGroups)) {
        console.log(`\n   ${serviceName}:`);
        mappings.forEach(m => {
          console.log(`     - ${m.clinic?.name || 'Sin clínica'} → ${m.account.accountNumber} (${m.account.name})`);
        });
      }
    }

    // 3. Verificar mapeos de productos
    console.log('\n\n📦 MAPEOS DE PRODUCTOS:');
    
    const productMappings = await prisma.productAccountMapping.findMany({
      include: {
        product: true,
        clinic: true,
        account: true
      },
      orderBy: [
        { product: { name: 'asc' } },
        { clinic: { name: 'asc' } }
      ]
    });

    if (productMappings.length === 0) {
      console.log('   ❌ No hay mapeos de productos');
    } else {
      // Agrupar por producto
      const productGroups = productMappings.reduce((acc, mapping) => {
        const productName = mapping.product.name;
        if (!acc[productName]) acc[productName] = [];
        acc[productName].push(mapping);
        return acc;
      }, {} as Record<string, typeof productMappings>);

      for (const [productName, mappings] of Object.entries(productGroups)) {
        console.log(`\n   ${productName}:`);
        mappings.forEach(m => {
          const accountType = m.accountType === 'INVENTORY_CONSUMPTION' ? 'Consumo' : 'Venta';
          console.log(`     - ${m.clinic?.name || 'Sin clínica'} (${accountType}) → ${m.account.accountNumber} (${m.account.name})`);
        });
      }
    }

    // 4. Verificar cuentas contables con códigos de clínica
    console.log('\n\n📊 CUENTAS CON CÓDIGOS DE CLÍNICA:');
    
    const accountsWithClinicCodes = await prisma.chartOfAccountEntry.findMany({
      where: {
        OR: [
          { accountNumber: { contains: 'CMO' } },
          { accountNumber: { contains: 'CAFC' } },
          { accountNumber: { contains: 'TEST' } },
          { accountNumber: { contains: 'CM' } },
          { accountNumber: { contains: 'CARN' } },
          { accountNumber: { contains: 'CAFU' } }
        ]
      },
      orderBy: { accountNumber: 'asc' }
    });

    console.log(`   Encontradas ${accountsWithClinicCodes.length} cuentas con códigos de clínica`);
    accountsWithClinicCodes.slice(0, 10).forEach(acc => {
      console.log(`   - ${acc.accountNumber}: ${acc.name}`);
    });

    // 5. Analizar prefijos de clínica y sus códigos generados
    console.log('\n\n🏥 ANÁLISIS DE CÓDIGOS DE CLÍNICA:');
    
    const { generateClinicCode } = await import('../lib/accounting/clinic-utils.js');
    
    for (const clinic of clinics) {
      const generatedCode = generateClinicCode(clinic.name);
      console.log(`   ${clinic.name}:`);
      console.log(`     - Prefix almacenado: ${clinic.prefix}`);
      console.log(`     - Código generado por función: ${generatedCode}`);
      console.log(`     - ¿Deberían usar el prefix?: ${clinic.prefix !== generatedCode ? '⚠️ SÍ' : 'No'}`);
    }

    console.log('\n✅ Verificación completada!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccountMappings();
