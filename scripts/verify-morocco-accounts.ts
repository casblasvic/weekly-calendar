import { prisma } from '../lib/db';

async function verifyMoroccoAccounts() {
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

    console.log(`Verificando plan contable para: ${legalEntity.name} (${legalEntity.id})`);

    // Verificar cuentas específicas necesarias para el mapeo
    const accountsToCheck = [
      { number: '342', name: 'Clients et comptes rattachés' },
      { number: '3421', name: 'Clients' },
      { number: '514', name: 'Banques' },
      { number: '516', name: 'Caisses' },
      { number: '607', name: 'Achats de marchandises' },
      { number: '713', name: 'Variation des stocks' },
      { number: '7129', name: 'Rabais, remises et ristournes accordés' },
      { number: '345', name: 'État créditeur' },
      { number: '401', name: 'Fournisseurs' },
      { number: '606', name: 'Achats non stockés' }
    ];

    console.log('\nVerificando cuentas necesarias:');
    
    for (const accountToCheck of accountsToCheck) {
      const account = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: accountToCheck.number
        }
      });

      if (account) {
        console.log(`✓ ${accountToCheck.number} - ${accountToCheck.name}: EXISTE`);
      } else {
        console.log(`✗ ${accountToCheck.number} - ${accountToCheck.name}: NO EXISTE`);
      }
    }

    // Verificar subcuentas de clientes (342.x)
    const clientSubaccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId: legalEntity.id,
        accountNumber: {
          startsWith: '342.'
        }
      }
    });

    console.log(`\nSubcuentas de clientes (342.x) encontradas: ${clientSubaccounts.length}`);
    if (clientSubaccounts.length > 0) {
      clientSubaccounts.forEach(acc => {
        console.log(`  - ${acc.accountNumber}: ${acc.name}`);
      });
    }

    // Verificar que la cuenta 342 tenga el parentNumber correcto
    const account342 = await prisma.chartOfAccountEntry.findFirst({
      where: {
        legalEntityId: legalEntity.id,
        accountNumber: '342'
      },
      include: {
        parentAccount: true,
        subAccounts: true
      }
    });

    if (account342) {
      console.log(`\nCuenta 342 - Detalles:`);
      console.log(`  ID: ${account342.id}`);
      console.log(`  Parent: ${account342.parentAccount?.accountNumber || 'Ninguno'}`);
      console.log(`  Subcuentas: ${account342.subAccounts.length}`);
      console.log(`  Nivel: ${account342.level}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMoroccoAccounts();
