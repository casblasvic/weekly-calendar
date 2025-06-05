import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountIds, legalEntityId, systemId } = body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron IDs de cuentas" },
        { status: 400 }
      );
    }

    if (!legalEntityId || !systemId) {
      return NextResponse.json(
        { error: "Entidad legal y sistema requeridos" },
        { status: 400 }
      );
    }

    console.log(`Iniciando eliminación masiva de ${accountIds.length} cuentas`);

    // Primero verificar que todas las cuentas pertenecen al sistema y entidad legal
    const accountsToProcess = await prisma.chartOfAccountEntry.findMany({
      where: {
        id: { in: accountIds },
        systemId: systemId,
        legalEntityId: legalEntityId,
      },
      include: {
        subAccounts: {
          include: {
            subAccounts: {
              include: {
                subAccounts: {
                  include: {
                    subAccounts: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (accountsToProcess.length !== accountIds.length) {
      return NextResponse.json(
        { error: "Algunas cuentas no se encontraron o no tienes permisos para eliminarlas" },
        { status: 403 }
      );
    }

    // Función recursiva para obtener todos los IDs de subcuentas
    const getAllDescendantIds = (account: any): string[] => {
      let ids = [account.id];
      if (account.subAccounts && account.subAccounts.length > 0) {
        for (const child of account.subAccounts) {
          ids = ids.concat(getAllDescendantIds(child));
        }
      }
      return ids;
    };

    // Obtener todos los IDs incluyendo subcuentas
    let allAccountIds: string[] = [];
    for (const account of accountsToProcess) {
      allAccountIds = allAccountIds.concat(getAllDescendantIds(account));
    }

    // Eliminar duplicados
    allAccountIds = [...new Set(allAccountIds)];

    console.log(`IDs totales a eliminar: ${allAccountIds.length}`);

    // Obtener todas las cuentas con su información de nivel
    const accountsWithLevel = await prisma.chartOfAccountEntry.findMany({
      where: {
        id: { in: allAccountIds },
        systemId: systemId,
        legalEntityId: legalEntityId,
      },
      select: {
        id: true,
        level: true,
        accountNumber: true,
        name: true,
        _count: {
          select: {
            subAccounts: true
          }
        }
      }
    });

    // Ordenar por nivel descendente (eliminar primero las cuentas de mayor nivel/más profundas)
    accountsWithLevel.sort((a, b) => b.level - a.level);

    let deletedAccountsCount = 0;
    let deletedMappingsCount = 0;
    const retryAccounts: string[] = [];

    // Dividir en transacciones más pequeñas para evitar timeout
    const ACCOUNTS_PER_TRANSACTION = 10;
    const accountBatches: typeof accountsWithLevel[] = [];
    
    for (let i = 0; i < accountsWithLevel.length; i += ACCOUNTS_PER_TRANSACTION) {
      accountBatches.push(accountsWithLevel.slice(i, i + ACCOUNTS_PER_TRANSACTION));
    }

    console.log(`Procesando ${accountBatches.length} lotes de transacciones`);

    // Primero eliminar todas las asociaciones en una sola transacción
    await prisma.$transaction(async (tx) => {
      console.log("Eliminando asociaciones contables...");
      
      const [
        deletedPayments,
        deletedVat,
        deletedCategories,
        deletedProducts,
        deletedDiscounts
      ] = await Promise.all([
        tx.paymentMethodAccountMapping.deleteMany({
          where: {
            accountId: { in: allAccountIds },
            legalEntityId: legalEntityId
          }
        }),
        tx.vATTypeAccountMapping.deleteMany({
          where: {
            OR: [
              { inputAccountId: { in: allAccountIds } },
              { outputAccountId: { in: allAccountIds } }
            ],
            legalEntityId: legalEntityId
          }
        }),
        tx.categoryAccountMapping.deleteMany({
          where: {
            accountId: { in: allAccountIds },
            legalEntityId: legalEntityId
          }
        }),
        tx.productAccountMapping.deleteMany({
          where: {
            accountId: { in: allAccountIds },
            legalEntityId: legalEntityId
          }
        }),
        tx.discountTypeAccountMapping.deleteMany({
          where: {
            accountId: { in: allAccountIds },
            legalEntityId: legalEntityId
          }
        })
      ]);

      deletedMappingsCount = 
        deletedPayments.count +
        deletedVat.count +
        deletedCategories.count +
        deletedProducts.count +
        deletedDiscounts.count;

      console.log(`Asociaciones eliminadas: ${deletedMappingsCount}`);
    }, {
      timeout: 60000 // 60 segundos para las asociaciones
    });

    // Luego eliminar las cuentas en lotes pequeños
    for (let batchIndex = 0; batchIndex < accountBatches.length; batchIndex++) {
      const batch = accountBatches[batchIndex];
      console.log(`Procesando lote ${batchIndex + 1}/${accountBatches.length} con ${batch.length} cuentas`);
      
      await prisma.$transaction(async (tx) => {
        for (const account of batch) {
          try {
            // Verificar que la cuenta no tenga subcuentas antes de eliminar
            const currentAccount = await tx.chartOfAccountEntry.findUnique({
              where: { id: account.id },
              select: {
                _count: {
                  select: {
                    subAccounts: true
                  }
                }
              }
            });

            if (!currentAccount) {
              console.log(`Cuenta ${account.id} ya fue eliminada`);
              deletedAccountsCount++;
              continue;
            }

            if (currentAccount._count.subAccounts > 0) {
              console.log(`Cuenta ${account.id} tiene ${currentAccount._count.subAccounts} subcuentas, saltando por ahora`);
              retryAccounts.push(account.id);
              continue;
            }

            await tx.chartOfAccountEntry.delete({
              where: { id: account.id }
            });
            
            deletedAccountsCount++;
            console.log(`Eliminada cuenta ${account.accountNumber} - ${account.name}`);
          } catch (error) {
            console.error(`Error eliminando cuenta ${account.id}:`, error);
            retryAccounts.push(account.id);
          }
        }
      }, {
        timeout: 30000 // 30 segundos por lote
      });
    }

    // Intentar eliminar las cuentas que fallaron (pueden haber quedado sin subcuentas ahora)
    if (retryAccounts.length > 0) {
      console.log(`Intentando segunda pasada para ${retryAccounts.length} cuentas...`);
      
      for (const accountId of retryAccounts) {
        try {
          await prisma.chartOfAccountEntry.delete({
            where: { id: accountId }
          });
          deletedAccountsCount++;
          console.log(`Eliminada cuenta ${accountId} en segunda pasada`);
        } catch (error) {
          console.error(`Error en segunda pasada para cuenta ${accountId}:`, error);
        }
      }
    }

    console.log(`Eliminación completada: ${deletedAccountsCount} cuentas, ${deletedMappingsCount} asociaciones`);

    // Revalidar la caché
    revalidatePath("/configuracion/contabilidad");

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${deletedAccountsCount} cuentas y ${deletedMappingsCount} asociaciones`,
      deletedAccounts: deletedAccountsCount,
      deletedMappings: deletedMappingsCount,
      failedAccounts: retryAccounts.length > 0 ? retryAccounts : undefined
    });

  } catch (error) {
    console.error("Error en eliminación masiva:", error);
    
    // Manejo específico de error de timeout
    if (error instanceof Error && error.message.includes("Transaction already closed")) {
      return NextResponse.json(
        { 
          error: "La operación tardó demasiado tiempo. Por favor, intenta eliminar menos cuentas a la vez o contacta al administrador.",
          details: "Transaction timeout exceeded"
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Error al eliminar las cuentas", 
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
