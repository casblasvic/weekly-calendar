import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session || !session.user || !session.user.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get('legalEntityId');
    
    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'ID de sociedad fiscal requerido' },
        { status: 400 }
      );
    }

    const systemId = session.user.systemId;

    // Verificar que la sociedad fiscal pertenece al sistema
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId
      }
    });

    if (!legalEntity) {
      return NextResponse.json(
        { error: 'Sociedad fiscal no encontrada' },
        { status: 404 }
      );
    }

    // TRANSACCIÓN 1: Eliminar asientos contables
    const deletedJournalEntries = await prisma.$transaction(async (tx) => {
      // Primero eliminar asientos contables (esto eliminará en cascada JournalEntryLine)
      const result = await tx.journalEntry.deleteMany({
        where: { legalEntityId }
      });
      return result.count;
    }, {
      timeout: 30000 // 30 segundos
    });

    // TRANSACCIÓN 2: Eliminar mapeos contables
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar mapeos de categorías
      await tx.categoryAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 2. Eliminar mapeos de servicios
      await tx.serviceAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 3. Eliminar mapeos de productos
      await tx.productAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 4. Eliminar mapeos de métodos de pago
      await tx.paymentMethodAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 5. Eliminar mapeos de IVA
      await tx.vATTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 6. Eliminar mapeos de sesiones de caja
      await tx.cashSessionAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 7. Eliminar mapeos de tipos de descuento/promociones
      await tx.discountTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 8. Eliminar mapeos de promociones (tienen FK explícita a chart_of_account_entries)
      await tx.promotionAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 9. Eliminar mapeos de tipos de gastos
      await tx.expenseTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });
    }, {
      timeout: 30000 // 30 segundos
    });

    // TRANSACCIÓN 3: Limpiar referencias directas
    await prisma.$transaction(async (tx) => {
      // 1. Limpiar referencias de accountId en banks
      await tx.bank.updateMany({
        where: { 
          systemId,
          accountId: { not: null }
        },
        data: { accountId: null }
      });

      // 2. Limpiar accountId de cuentas bancarias
      await tx.bankAccount.updateMany({
        where: { 
          systemId,
          accountId: { not: null }
        },
        data: { accountId: null }
      });

      // 3. Limpiar referencias adicionales en VATTypeAccountMapping
      await tx.vATTypeAccountMapping.updateMany({
        where: { 
          legalEntityId,
          chartOfAccountEntryId: { not: null }
        },
        data: { chartOfAccountEntryId: null }
      });

      // 4. Limpiar referencias en ExpenseType
      await tx.expenseType.updateMany({
        where: { 
          systemId,
          chartOfAccountEntryId: { not: null }
        },
        data: { chartOfAccountEntryId: null }
      });
    }, {
      timeout: 20000 // 20 segundos
    });

    // TRANSACCIÓN 4: Eliminar plan de cuentas
    await prisma.$transaction(async (tx) => {
      // Primero, desconectamos todas las relaciones parent-child
      await tx.chartOfAccountEntry.updateMany({
        where: { 
          legalEntityId,
          parentAccountId: { not: null }
        },
        data: { parentAccountId: null }
      });
      
      // Eliminar cuentas en lotes para evitar timeout
      const totalAccounts = await tx.chartOfAccountEntry.count({
        where: { legalEntityId }
      });

      if (totalAccounts > 0) {
        const batchSize = 100; // Eliminar de 100 en 100
        let deletedTotal = 0;
        
        while (deletedTotal < totalAccounts) {
          // Obtener IDs del siguiente lote
          const accountsToDelete = await tx.chartOfAccountEntry.findMany({
            where: { legalEntityId },
            select: { id: true },
            take: batchSize
          });
          
          if (accountsToDelete.length === 0) break;
          
          // Eliminar el lote
          await tx.chartOfAccountEntry.deleteMany({
            where: {
              id: { in: accountsToDelete.map(a => a.id) }
            }
          });
          
          deletedTotal += accountsToDelete.length;
        }
      }
    }, {
      timeout: 60000 // 60 segundos para el plan de cuentas
    });

    // TRANSACCIÓN 5: Eliminar ejercicios fiscales y series documentales
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar series documentales
      await tx.documentSeries.deleteMany({
        where: { legalEntityId }
      });

      // 2. Eliminar ejercicios fiscales
      await tx.fiscalYear.deleteMany({
        where: { legalEntityId }
      });
    }, {
      timeout: 20000 // 20 segundos
    });

    return NextResponse.json({
      success: true,
      message: 'Mapeos contables reseteados correctamente'
    });

  } catch (error: any) {
    console.error('Error al resetear mapeos contables:', error);
    let errorMeta = null;
    if (error && typeof error === 'object' && 'meta' in error) {
      errorMeta = error.meta;
      console.error('Error meta:', errorMeta);
    }
    
    let errorMessage = 'Error desconocido al resetear mapeos contables.';
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
    }

    return NextResponse.json({
      error: 'Error al resetear mapeos contables',
      details: errorMessage,
      errorMeta: errorMeta
    }, { status: 500 });
  }
}
