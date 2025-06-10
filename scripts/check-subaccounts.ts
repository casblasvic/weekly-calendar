import { prisma } from '@/lib/db';

async function checkSubaccounts() {
  try {
    // Buscar todas las cuentas que tienen parentAccountId
    const subaccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        parentAccountId: { not: null },
        legalEntityId: 'cmbjwte3l0000y29zsrb2zbub'
      },
      select: {
        id: true,
        accountNumber: true,
        name: true,
        parentAccountId: true,
        parentAccount: {
          select: {
            accountNumber: true,
            name: true
          }
        }
      }
    });

    console.log(`\nFound ${subaccounts.length} subaccounts:`);
    
    subaccounts.forEach(sub => {
      console.log(`  - ${sub.accountNumber} ${sub.name}`);
      console.log(`    Parent: ${sub.parentAccount?.accountNumber} ${sub.parentAccount?.name}`);
    });

    // Buscar cuentas padres que deberían tener hijos
    const parentsWithChildren = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId: 'cmbjwte3l0000y29zsrb2zbub',
        subAccounts: {
          some: {}
        }
      },
      include: {
        subAccounts: {
          select: {
            accountNumber: true,
            name: true
          }
        }
      }
    });

    console.log(`\nFound ${parentsWithChildren.length} parent accounts with children:`);
    
    parentsWithChildren.forEach(parent => {
      console.log(`\n  Parent: ${parent.accountNumber} ${parent.name}`);
      console.log(`  Children (${parent.subAccounts.length}):`);
      parent.subAccounts.forEach(child => {
        console.log(`    - ${child.accountNumber} ${child.name}`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubaccounts();
