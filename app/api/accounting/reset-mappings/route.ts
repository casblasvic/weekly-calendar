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

    // Ejecutar todo en una transacción
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

      // 5. Eliminar mapeos de tipos de IVA
      await tx.vATTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 6. Eliminar mapeos de tipos de descuento/promociones
      await tx.discountTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 7. Eliminar mapeos de tipos de gastos
      await tx.expenseTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 8. Eliminar mapeos de sesiones de caja
      await tx.cashSessionAccountMapping.deleteMany({
        where: { legalEntityId }
      });

      // 9. Limpiar referencias de accountId en banks
      // Primero obtener todos los bancos del sistema
      const banks = await tx.bank.findMany({
        where: { systemId }
      });

      // Actualizar cada banco para limpiar su accountId
      for (const bank of banks) {
        await tx.bank.update({
          where: { id: bank.id },
          data: { accountId: null }
        });
      }

      // 10. Limpiar accountId de cuentas bancarias
      // Obtener todas las cuentas bancarias del sistema
      const bankAccounts = await tx.bankAccount.findMany({
        where: { systemId }
      });

      // Actualizar cada cuenta bancaria para limpiar su accountId
      for (const bankAccount of bankAccounts) {
        await tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: { accountId: null }
        });
      }

      // 11. Eliminar primero las líneas de asientos contables
      await tx.journalEntryLine.deleteMany({
        where: {
          journalEntry: {
            legalEntityId
          }
        }
      });

      // 12. Eliminar los asientos contables
      await tx.journalEntry.deleteMany({
        where: { legalEntityId }
      });

      // 13. Ahora sí podemos eliminar el plan de cuentas
      // Primero, desconectamos todas las relaciones parent-child
      await tx.chartOfAccountEntry.updateMany({
        where: { 
          legalEntityId,
          parentAccountId: { not: null }
        },
        data: { parentAccountId: null }
      });
      
      // Ahora podemos eliminar todas las cuentas de una vez
      await tx.chartOfAccountEntry.deleteMany({
        where: { legalEntityId }
      });

      // 14. Eliminar los ejercicios fiscales
      await tx.fiscalYear.deleteMany({
        where: { legalEntityId }
      });
      
      // 15. Eliminar las series documentales
      await tx.documentSeries.deleteMany({
        where: { legalEntityId }
      });

      console.log(`[RESET] Eliminados todos los mapeos, plan de cuentas, ejercicios fiscales y series documentales para sociedad ${legalEntityId}`);
    }, {
      timeout: 20000 // 20 segundos de timeout para la transacción
    });

    return NextResponse.json({
      success: true,
      message: 'Todos los mapeos contables y el plan de cuentas han sido eliminados'
    });

  } catch (error) {
    console.error('Error reseteando mapeos contables:', error);
    return NextResponse.json(
      { error: 'Error al resetear mapeos contables' },
      { status: 500 }
    );
  }
}
