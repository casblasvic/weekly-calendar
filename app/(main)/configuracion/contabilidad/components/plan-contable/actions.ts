"use server";

import { prisma } from "@/lib/db"; // CORREGIDO: Importación nombrada de Prisma
import { AccountType, ChartOfAccountEntry } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ChartOfAccountRow }  from "./columns";
import {
  CreateChartOfAccountEntryInput,
  CreateChartOfAccountEntrySchema,
  UpdateChartOfAccountEntryInput,
  UpdateChartOfAccountEntrySchema
} from "./schemas";
import { auth } from "@/lib/auth"; // Añadir importación de auth

interface ChartOfAccountEntryWithSubAccountsPrisma extends ChartOfAccountEntry {
  subAccounts?: ChartOfAccountEntryWithSubAccountsPrisma[];
  level: number; // Asegurar que level está en el tipo que Prisma devuelve o se añade
}

function transformToRow(entry: ChartOfAccountEntryWithSubAccountsPrisma): ChartOfAccountRow {
  return {
    id: entry.id,
    accountNumber: entry.accountNumber,
    name: entry.name,
    type: entry.type,
    isActive: entry.isActive,
    description: entry.description,
    isMonetary: entry.isMonetary,
    allowsDirectEntry: entry.allowsDirectEntry,
    parentAccountId: entry.parentAccountId,
    level: entry.level, // Añadido para que la tabla pueda usarlo si es necesario
    subRows: entry.subAccounts?.map(transformToRow),
  };
}

export async function getChartOfAccounts(legalEntityId: string, systemId: string) {
  if (!legalEntityId || !systemId) {
    console.warn("getChartOfAccounts called without legalEntityId or systemId. legalEntityId:", legalEntityId, "systemId:", systemId);
    return { data: [], error: "legalEntityId y systemId son requeridos.", success: false };
  }

  try {
    const accountsPrisma = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId,
        parentAccountId: null,
      },
      orderBy: {
        accountNumber: "asc",
      },
      include: {
        subAccounts: { 
          orderBy: { accountNumber: "asc" },
          include: {
            subAccounts: { 
              orderBy: { accountNumber: "asc" },
              include: {
                subAccounts: { 
                  orderBy: { accountNumber: "asc" },
                },
              },
            },
          },
        },
      },
    }) as ChartOfAccountEntryWithSubAccountsPrisma[]; // Cast para asegurar 'level' si no está directamente en el modelo Prisma
    const transformedData: ChartOfAccountRow[] = accountsPrisma.map(transformToRow);
    return { data: transformedData, success: true };
  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    return { data: [], error: "Error al obtener el plan contable.", success: false };
  }
}

export async function createChartOfAccountEntry(input: CreateChartOfAccountEntryInput) {
  try {
    const validationResult = CreateChartOfAccountEntrySchema.safeParse(input);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
      return {
        success: false,
        error: "Datos inválidos.",
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { accountNumber, name, type, description, isMonetary, isActive, parentAccountId, legalEntityId, systemId, allowsDirectEntry } = validationResult.data;

    let level = 0;
    if (parentAccountId) {
      const parentAccount = await prisma.chartOfAccountEntry.findUnique({
        where: { id: parentAccountId, legalEntityId, systemId }, // Asegurar que el padre pertenezca a la misma entidad/sistema
        select: { level: true }
      });
      if (parentAccount) {
        level = parentAccount.level + 1;
      } else {
        console.warn(`Parent account with id ${parentAccountId} not found for legalEntityId ${legalEntityId} and systemId ${systemId}. Setting level to 0, but this might indicate an issue.`);
        // Podríamos devolver un error aquí si un parentAccountId se proporciona pero no se encuentra
        // return { success: false, error: `La cuenta padre especificada (${parentAccountId}) no existe o no pertenece a la entidad/sistema actual.` };
      }
    }
    
    const existingAccount = await prisma.chartOfAccountEntry.findFirst({
        where: { accountNumber, legalEntityId, systemId }
    });

    if (existingAccount) {
        return {
            success: false,
            error: `Ya existe una cuenta con el número '${accountNumber}' para esta entidad legal y sistema.`,
        };
    }

    const newEntry = await prisma.chartOfAccountEntry.create({
      data: {
        accountNumber,
        name,
        type,
        description,
        isMonetary,
        isActive,
        parentAccountId: parentAccountId || null,
        legalEntityId,
        systemId,
        level,
        allowsDirectEntry,
      },
    });

    revalidatePath("/configuracion/contabilidad");
    return { success: true, data: newEntry };

  } catch (error: any) {
    console.error("Error creating chart of account entry:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('accountNumber')) {
        return {
            success: false,
            error: `Ya existe una cuenta con el número '${input.accountNumber}' para esta entidad legal y sistema.`,
        };
    }
    return { success: false, error: "Error al crear la cuenta contable." };
  }
}

export async function updateChartOfAccountEntry(input: UpdateChartOfAccountEntryInput) {
  try {
    const validationResult = UpdateChartOfAccountEntrySchema.safeParse(input);
    if (!validationResult.success) {
      console.error("Validation failed for update:", validationResult.error.flatten().fieldErrors);
      return {
        success: false,
        error: "Datos inválidos para la actualización.",
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { id, accountNumber, name, type, description, isMonetary, isActive, parentAccountId, legalEntityId, systemId, allowsDirectEntry } = validationResult.data;

    const accountToUpdate = await prisma.chartOfAccountEntry.findUnique({
        where: { id }
    });
    if (!accountToUpdate) {
        return { success: false, error: `No se encontró la cuenta con ID ${id} para actualizar.` };
    }
    // Asegurar que la actualización se mantenga dentro de la misma legalEntityId y systemId
    // Esto previene que se cambie una cuenta a otra entidad por error si se pasaran esos campos.
    // Normalmente, legalEntityId y systemId no deberían cambiar en una actualización.
    if (legalEntityId !== accountToUpdate.legalEntityId || systemId !== accountToUpdate.systemId) {
        return { success: false, error: "No se permite cambiar la entidad legal o el sistema de una cuenta existente."};
    }

    let level = accountToUpdate.level;
    if (parentAccountId && parentAccountId !== accountToUpdate.parentAccountId) {
      const parentAccount = await prisma.chartOfAccountEntry.findUnique({
        where: { id: parentAccountId, legalEntityId, systemId },
        select: { level: true }
      });
      if (parentAccount) {
        level = parentAccount.level + 1;
      } else {
         return { success: false, error: `La nueva cuenta padre especificada (${parentAccountId}) no existe o no pertenece a la entidad/sistema actual.` };
      }
    } else if (!parentAccountId && accountToUpdate.parentAccountId) {
      // Se está moviendo a cuenta raíz
      level = 0;
    }
    
    if (accountNumber !== accountToUpdate.accountNumber) {
        const conflictingAccount = await prisma.chartOfAccountEntry.findFirst({
            where: {
                accountNumber,
                legalEntityId, // Usar el de la cuenta a actualizar para consistencia
                systemId,      // Usar el de la cuenta a actualizar
                id: { not: id } 
            }
        });
        if (conflictingAccount) {
            return {
                success: false,
                error: `Ya existe otra cuenta con el número '${accountNumber}' para esta entidad legal y sistema.`,
            };
        }
    }

    const updatedEntry = await prisma.chartOfAccountEntry.update({
      where: { id },
      data: {
        accountNumber,
        name,
        type,
        description,
        isMonetary,
        isActive,
        parentAccountId: parentAccountId || null,
        level, // Nivel actualizado
        // legalEntityId y systemId no se actualizan aquí para mantener la cuenta en su contexto original
        allowsDirectEntry,
      },
    });

    revalidatePath("/configuracion/contabilidad");
    return { success: true, data: updatedEntry };

  } catch (error: any) {
    console.error("Error updating chart of account entry:", error);
     if (error.code === 'P2002' && error.meta?.target?.includes('accountNumber')) {
        return {
            success: false,
            error: `Ya existe otra cuenta con el número '${input.accountNumber}' para esta entidad legal y sistema.`,
        };
    }
    return { success: false, error: "Error al actualizar la cuenta contable." };
  }
}

export async function deleteChartOfAccountEntry(id: string, legalEntityId: string, systemId: string) {
  if (!id || !legalEntityId || !systemId) {
    console.warn("deleteChartOfAccountEntry called without id, legalEntityId, or systemId.");
    return { success: false, error: "ID de cuenta, ID de entidad legal y ID de sistema son requeridos." };
  }

  try {
    // 1. Verificar que la cuenta pertenece a la entidad legal y sistema correctos
    const accountToDelete = await prisma.chartOfAccountEntry.findUnique({
      where: {
        id,
        // No es necesario filtrar por legalEntityId y systemId aquí si 'id' es globalmente único.
        // Si 'id' puede repetirse entre diferentes legalEntities/systems, entonces sí sería necesario:
        // id_legalEntityId_systemId: { id, legalEntityId, systemId } // Asumiendo un índice compuesto
      },
    });

    if (!accountToDelete) {
      return { success: false, error: `No se encontró la cuenta con ID ${id}.` };
    }
    // Doble verificación para asegurar la pertenencia, si 'id' no es suficiente por sí solo
    if (accountToDelete.legalEntityId !== legalEntityId || accountToDelete.systemId !== systemId) {
        return { success: false, error: `La cuenta con ID ${id} no pertenece a la entidad legal o sistema especificado.` };
    }

    // 2. Verificar si la cuenta tiene subcuentas
    const subAccountCount = await prisma.chartOfAccountEntry.count({
      where: {
        parentAccountId: id,
        legalEntityId, // Asegurar que las subcuentas también se cuentan dentro del mismo contexto
        systemId,
      },
    });

    if (subAccountCount > 0) {
      return { success: false, error: "Esta cuenta tiene subcuentas asociadas. Por favor, elimine primero todas las subcuentas." };
    }

    // Aquí se podría añadir una verificación de si la cuenta ha sido usada en asientos contables.
    // const hasTransactions = await prisma.journalEntryLine.count({ where: { chartOfAccountEntryId: id }});
    // if (hasTransactions > 0) {
    //   return { success: false, error: "No se puede eliminar. La cuenta tiene transacciones asociadas. Considere desactivarla."};
    // }

    // 3. Proceder con la eliminación
    const deletedEntry = await prisma.chartOfAccountEntry.delete({
      where: {
        id,
      },
    });

    revalidatePath("/configuracion/contabilidad");
    return { success: true, data: deletedEntry, message: "Cuenta eliminada con éxito." };

  } catch (error: any) {
    console.error("Error deleting chart of account entry:", error);
    if (error.code === 'P2003') { // Foreign key constraint failed
        return { success: false, error: "No se puede eliminar la cuenta porque está siendo referenciada. Verifique que no tenga subcuentas (incluso inactivas) o esté en uso." };
    }
    return { success: false, error: "Error al eliminar la cuenta contable." };
  }
}

// Nueva función para obtener Systems
export async function getSystems() {
  try {
    const systems = await prisma.system.findMany({
      where: { isActive: true }, // Filtrar por sistemas activos
      orderBy: { name: "asc" },
    });
    return { data: systems, success: true };
  } catch (error) {
    console.error("Error fetching systems:", error);
    return { data: [], error: "Error al obtener los sistemas.", success: false };
  }
}

// Nueva función para obtener LegalEntities por System ID
export async function getLegalEntitiesBySystem(systemId: string) {
  if (!systemId) {
    return { data: [], error: "System ID es requerido.", success: false };
  }
  try {
    const legalEntities = await prisma.legalEntity.findMany({
      where: { systemId: systemId }, 
      include: {
        _count: {
          select: { clinics: true }
        }
      }
    });
    
    // Ordenar por número de clínicas descendente
    const sortedEntities = legalEntities.sort((a, b) => b._count.clinics - a._count.clinics);
    
    return { data: sortedEntities, success: true };
  } catch (error) {
    console.error(`Error fetching legal entities for system ${systemId}:`, error);
    return { data: [], error: "Error al obtener las entidades legales.", success: false };
  }
}

// Función simplificada para importar plan de cuentas desde CSV
export async function importChartOfAccountsFromCSV(
  legalEntityId: string,
  rows: Array<{
    accountNumber: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    parentNumber?: string;
    isMonetary?: boolean;
    allowDirectEntry?: boolean;
  }>
) {
  const user = await auth();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  const errors: { row: number; accountNumber?: string; message: string }[] = [];
  let accountsCreated = 0;
  let accountsSkipped = 0;

  try {
    // Verificar que la entidad legal existe
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      include: { system: true }
    });

    if (!legalEntity) {
      throw new Error('Entidad legal no encontrada');
    }

    const systemId = legalEntity.systemId;

    // Procesar cada fila del CSV
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Verificar si la cuenta ya existe
        const existingAccount = await prisma.chartOfAccountEntry.findFirst({
          where: {
            accountNumber: row.accountNumber,
            legalEntityId,
            systemId
          }
        });

        if (existingAccount) {
          errors.push({
            row: rowNumber,
            accountNumber: row.accountNumber,
            message: 'Cuenta ya existe'
          });
          accountsSkipped++;
          continue;
        }

        // Determinar el ID de la cuenta padre si se proporciona
        let parentAccountId: string | null = null;
        if (row.parentNumber) {
          const parentAccount = await prisma.chartOfAccountEntry.findFirst({
            where: {
              accountNumber: row.parentNumber,
              legalEntityId,
              systemId
            }
          });

          if (!parentAccount) {
            errors.push({
              row: rowNumber,
              accountNumber: row.accountNumber,
              message: `Cuenta padre ${row.parentNumber} no encontrada`
            });
            accountsSkipped++;
            continue;
          }
          parentAccountId = parentAccount.id;
        }

        // Crear la cuenta
        await prisma.chartOfAccountEntry.create({
          data: {
            accountNumber: row.accountNumber,
            name: row.name,
            type: row.type,
            isMonetary: row.isMonetary ?? false,
            allowsDirectEntry: row.allowDirectEntry ?? true,
            isActive: true,
            parentAccountId,
            legalEntityId,
            systemId,
            level: 0 // Se calculará según la jerarquía
          }
        });

        accountsCreated++;
      } catch (error) {
        console.error(`Error procesando fila ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          accountNumber: row.accountNumber,
          message: error instanceof Error ? error.message : 'Error desconocido'
        });
        accountsSkipped++;
      }
    }

    revalidatePath('/configuracion/contabilidad');
    
    return {
      success: true,
      accountsCreated,
      accountsSkipped,
      errors,
      message: errors.length > 0 
        ? `Importación completada con advertencias: ${accountsCreated} cuentas creadas, ${accountsSkipped} omitidas`
        : `Importación exitosa: ${accountsCreated} cuentas creadas`
    };
  } catch (error) {
    console.error('Error en importación CSV:', error);
    return {
      success: false,
      accountsCreated: 0,
      accountsSkipped: 0,
      errors: [],
      message: error instanceof Error ? error.message : 'Error desconocido durante la importación'
    };
  }
}
