import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Limpiando mapeos de promociones incorrectos...');

  try {
    // Eliminar todos los mapeos de promociones sin clinicId (que deberían tener)
    const deletedMappings = await prisma.discountTypeAccountMapping.deleteMany({
      where: {
        clinicId: null
      }
    });
    console.log(`   - Eliminados ${deletedMappings.count} mapeos de promociones sin clínica`);

    // Buscar y eliminar subcuentas de promociones que usen el código genérico
    const promotionSubaccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        OR: [
          { accountNumber: { contains: '.GEN.', mode: 'insensitive' } },
          { 
            AND: [
              { isSubAccount: true },
              { name: { contains: 'descuento', mode: 'insensitive' } }
            ]
          }
        ]
      }
    });

    let deletedSubaccounts = 0;
    for (const subaccount of promotionSubaccounts) {
      // Verificar si hay mapeos usando esta subcuenta
      const mappings = await prisma.discountTypeAccountMapping.findMany({
        where: { accountId: subaccount.id }
      });

      if (mappings.length === 0) {
        // Si no hay mapeos, eliminar la subcuenta
        await prisma.chartOfAccountEntry.delete({
          where: { id: subaccount.id }
        });
        deletedSubaccounts++;
        console.log(`   - Eliminada subcuenta: ${subaccount.accountNumber} - ${subaccount.name}`);
      }
    }

    console.log(`   - Eliminadas ${deletedSubaccounts} subcuentas de promociones sin uso`);

    console.log('\n✅ Limpieza completada!');
    console.log('\n📌 Ahora debes:');
    console.log('   1. Ir a la aplicación web');
    console.log('   2. Navegar a la configuración de mapeos contables');
    console.log('   3. Ejecutar "Mapear Automáticamente"');
    console.log('   4. Las promociones ahora se mapearán por clínica:');
    console.log('      - Promociones globales → se mapean para TODAS las clínicas');
    console.log('      - Promociones específicas → solo para sus clínicas asignadas');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
