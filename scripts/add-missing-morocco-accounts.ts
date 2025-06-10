import { prisma } from '../lib/db';
import { AccountType } from '@prisma/client';

async function addMissingMoroccoAccounts() {
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

    const systemId = legalEntity.systemId;
    console.log(`Agregando cuentas faltantes para: ${legalEntity.name} (${legalEntity.id})`);

    // Cuentas que necesitamos crear
    const accountsToCreate = [
      {
        accountNumber: '342',
        name: 'Clients et comptes rattachés',
        type: AccountType.ASSET,
        isMonetary: true,
        allowsDirectEntry: false,
        level: 0,
        isSubAccount: false
      },
      {
        accountNumber: '345',
        name: 'État créditeur',
        type: AccountType.ASSET,
        isMonetary: true,
        allowsDirectEntry: true,
        level: 0,
        isSubAccount: false
      },
      {
        accountNumber: '401',
        name: 'Fournisseurs',
        type: AccountType.LIABILITY,
        isMonetary: true,
        allowsDirectEntry: true,
        level: 0,
        isSubAccount: false
      },
      {
        accountNumber: '606',
        name: 'Achats non stockés',
        type: AccountType.EXPENSE,
        isMonetary: false,
        allowsDirectEntry: true,
        level: 0,
        isSubAccount: false
      },
      {
        accountNumber: '607',
        name: 'Achats de marchandises',
        type: AccountType.EXPENSE,
        isMonetary: false,
        allowsDirectEntry: false,
        level: 0,
        isSubAccount: false
      },
      {
        accountNumber: '713',
        name: 'Variation des stocks',
        type: AccountType.REVENUE,
        isMonetary: false,
        allowsDirectEntry: true,
        level: 0,
        isSubAccount: false
      }
    ];

    // Crear las cuentas que no existen
    for (const accountData of accountsToCreate) {
      const exists = await prisma.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: accountData.accountNumber
        }
      });

      if (!exists) {
        const created = await prisma.chartOfAccountEntry.create({
          data: {
            ...accountData,
            legalEntity: { connect: { id: legalEntity.id } },
            system: { connect: { id: systemId } },
            isActive: true
          }
        });
        console.log(`✓ Creada cuenta ${created.accountNumber} - ${created.name}`);
      } else {
        console.log(`- Cuenta ${accountData.accountNumber} ya existe`);
      }
    }

    // Ahora actualizar la cuenta 3421 para que tenga como padre la 342
    const account342 = await prisma.chartOfAccountEntry.findFirst({
      where: {
        legalEntityId: legalEntity.id,
        accountNumber: '342'
      }
    });

    if (account342) {
      // Actualizar todas las subcuentas 342.x para que tengan el parent correcto
      const updated = await prisma.chartOfAccountEntry.updateMany({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: {
            startsWith: '342.'
          }
        },
        data: {
          parentAccountId: account342.id,
          level: 1,
          isSubAccount: true
        }
      });
      console.log(`\n✓ Actualizadas ${updated.count} subcuentas de 342`);

      // También actualizar 3421 si existe
      const updated3421 = await prisma.chartOfAccountEntry.updateMany({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: '3421'
        },
        data: {
          parentAccountId: account342.id,
          level: 1,
          isSubAccount: true
        }
      });
      if (updated3421.count > 0) {
        console.log(`✓ Actualizada cuenta 3421 para tener padre 342`);
      }
    }

    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingMoroccoAccounts();
