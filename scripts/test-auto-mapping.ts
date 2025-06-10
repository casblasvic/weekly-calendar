import { prisma } from '../lib/db';

// No podemos importar funciones de Next.js directamente, vamos a replicar la lógica básica

async function testAutoMapping() {
  try {
    // Obtener la entidad legal de Marruecos
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        countryIsoCode: 'MA'
      }
    });

    if (!legalEntity) {
      console.error('No se encontró la entidad legal de Marruecos');
      return;
    }

    console.log(`\nProbando mapeo automático para: ${legalEntity.name} (${legalEntity.id})`);
    
    // Obtener mapeos existentes de métodos de pago
    const existingMappings = await prisma.paymentMethodAccountMapping.findMany({
      where: {
        legalEntityId: legalEntity.id
      },
      include: {
        account: true
      }
    });

    console.log(`\n✓ Mapeos de métodos de pago existentes: ${existingMappings.length}`);
    
    if (existingMappings.length > 0) {
      console.log('\nMapeos existentes:');
      existingMappings.forEach(mapping => {
        console.log(`  - Método ID: ${mapping.id} -> Cuenta: ${mapping.account.accountNumber} - ${mapping.account.name}`);
      });
    }
    
    // Obtener plan de cuentas
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId: legalEntity.id,
        isActive: true
      }
    });

    console.log(`\n✓ Cuentas contables encontradas: ${chartOfAccounts.length}`);
    
    // Verificar cuentas clave para pagos
    console.log('\n=== CUENTAS CLAVE PARA PAGOS ===');
    const keyCounts = ['516', '514', '342', '3421'];
    keyCounts.forEach(num => {
      const account = chartOfAccounts.find(a => a.accountNumber === num);
      if (account) {
        console.log(`  ✓ ${num} - ${account.name}`);
      } else {
        console.log(`  ❌ ${num} - NO ENCONTRADA`);
      }
    });
    
    // Verificar tipos de gastos
    console.log('\n\n=== VERIFICANDO TIPOS DE GASTOS ===');
    const expenseTypes = await prisma.expenseType.findMany({
      where: {
        systemId: legalEntity.systemId,
        isActive: true
      }
    });
    
    console.log(`✓ Tipos de gastos encontrados: ${expenseTypes.length}`);
    
    if (expenseTypes.length > 0) {
      console.log('\nTipos de gastos:');
      expenseTypes.forEach(type => {
        console.log(`  - ${type.name} (${type.code})`);
      });
      
      // Verificar mapeos de tipos de gastos
      const expenseMappings = await prisma.expenseTypeAccountMapping.findMany({
        where: {
          legalEntityId: legalEntity.id
        },
        include: {
          account: true,
          expenseType: true
        }
      });
      
      console.log(`\n✓ Mapeos de tipos de gastos existentes: ${expenseMappings.length}`);
      
      if (expenseMappings.length > 0) {
        console.log('\nMapeos de gastos existentes:');
        expenseMappings.forEach(mapping => {
          console.log(`  - ${mapping.expenseType.name} -> ${mapping.account.accountNumber} - ${mapping.account.name}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoMapping();
