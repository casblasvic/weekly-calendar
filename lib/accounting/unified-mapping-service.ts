import { prisma } from '@/lib/db';
import { generateClinicCode, generateNextSubaccountNumber } from '@/lib/accounting/clinic-utils';
import { 
  getAutoServiceMapping,
  getAutoProductMapping,
  getAutoPaymentMethodMapping,
  getCountrySpecificAccounts
} from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

interface MappingOptions {
  legalEntityId: string;
  systemId: string;
  clinicId?: string;
  forceRemap?: boolean;
}

/**
 * Estructura para generar códigos de subcuenta
 */
export interface SubaccountStructure {
  baseAccount: string;
  clinicCode?: string;
  categoryCode?: string;
  itemCode?: string;
  itemType?: string | null; // Para productos: V=Venta, C=Consumo
}

/**
 * Genera el código de subcuenta siguiendo la estructura jerárquica
 */
export function generateSubaccountCode(structure: SubaccountStructure): string {
  const parts = [structure.baseAccount];
  
  if (structure.clinicCode) {
    parts.push(structure.clinicCode);
  }
  
  if (structure.categoryCode) {
    parts.push(structure.categoryCode);
  }
  
  if (structure.itemCode) {
    parts.push(structure.itemCode);
  }
  
  if (structure.itemType) {
    parts.push(structure.itemType);
  }
  
  return parts.join('.');
}

/**
 * Servicio unificado para mapeo contable
 */
export class UnifiedMappingService {
  /**
   * Mapea servicios con la estructura correcta de subcuentas
   */
  static async mapServices(
    services: any[],
    chartOfAccounts: any[],
    countryCode: string,
    options: MappingOptions,
    tx?: any
  ) {
    const db = tx || prisma;
    const results = {
      mapped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Obtener todas las clínicas si no se especifica una
    let clinicsToMap = [];
    if (options.clinicId) {
      const clinic = await db.clinic.findUnique({
        where: { id: options.clinicId }
      });
      if (clinic) clinicsToMap = [clinic];
    } else {
      clinicsToMap = await db.clinic.findMany({
        where: {
          legalEntityId: options.legalEntityId
        }
      });
    }

    const hasMultipleClinics = clinicsToMap.length > 1;

    for (const service of services) {
      try {
        // Si forceRemap, eliminar mapeos existentes
        if (options.forceRemap) {
          await db.serviceAccountMapping.deleteMany({
            where: {
              serviceId: service.id,
              legalEntityId: options.legalEntityId,
              ...(options.clinicId && { clinicId: options.clinicId })
            }
          });
        }

        // Obtener mapeo automático
        const mapping = getAutoServiceMapping(
          service,
          chartOfAccounts,
          countryCode
        );

        if (!mapping) {
          results.errors++;
          results.details.push({
            name: service.name,
            error: 'No se encontró mapeo apropiado'
          });
          continue;
        }

        const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === mapping.accountNumber);
        if (!baseAccount) {
          results.errors++;
          results.details.push({
            name: service.name,
            error: `No se encontró cuenta ${mapping.accountNumber}`
          });
          continue;
        }

        // Generar código de categoría si existe
        let categoryCode = null;
        if (service.category) {
          // Usar las primeras 3 letras de la categoría
          categoryCode = service.category.name.substring(0, 3).toUpperCase();
        }

        // Si hay múltiples clínicas o se especificó una clínica, crear subcuentas
        if (hasMultipleClinics || options.clinicId) {
          for (const clinic of clinicsToMap) {
            // Usar el prefix de la clínica en lugar de generar un código
            const clinicCode = clinic.prefix || generateClinicCode(clinic.name);
            
            // Generar código único para el servicio basado en su nombre
            const serviceCode = service.name.substring(0, 3).toUpperCase();

            const subaccountCode = generateSubaccountCode({
              baseAccount: baseAccount.accountNumber,
              clinicCode: clinicCode,
              categoryCode: categoryCode,
              itemCode: serviceCode
            });

            // Verificar si la subcuenta existe
            let subaccount = await db.chartOfAccountEntry.findFirst({
              where: {
                legalEntityId: options.legalEntityId,
                accountNumber: subaccountCode
              }
            });

            // Crear subcuenta si no existe
            if (!subaccount) {
              const nameParts = [service.name];
              if (service.category) nameParts.push(service.category.name);
              nameParts.push(clinic.name);

              subaccount = await db.chartOfAccountEntry.create({
                data: {
                  accountNumber: subaccountCode,
                  name: nameParts.join(' - '),
                  type: baseAccount.type || 'REVENUE',
                  isSubAccount: true,
                  parentAccountId: baseAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: options.legalEntityId,
                  systemId: options.systemId
                }
              });
            }

            // Crear mapeo
            await db.serviceAccountMapping.create({
              data: {
                serviceId: service.id,
                accountId: subaccount.id,
                legalEntityId: options.legalEntityId,
                clinicId: clinic.id,
                systemId: options.systemId,
                subaccountPattern: '{base}.{clinic}.{category}.{service}'
              }
            });

            results.mapped++;
            results.details.push({
              name: `${service.name} - ${clinic.name}`,
              account: subaccountCode
            });
          }
        } else {
          // Una sola clínica, mapeo directo
          await db.serviceAccountMapping.create({
            data: {
              serviceId: service.id,
              accountId: baseAccount.id,
              legalEntityId: options.legalEntityId,
              systemId: options.systemId
            }
          });

          results.mapped++;
          results.details.push({
            name: service.name,
            account: baseAccount.accountNumber
          });
        }
      } catch (error: any) {
        console.error(`Error mapeando servicio ${service.name}:`, error);
        results.errors++;
        results.details.push({
          name: service.name,
          error: error.message || 'Error desconocido'
        });
      }
    }

    return results;
  }

  /**
   * Mapea productos con la estructura correcta de subcuentas
   */
  static async mapProducts(
    products: any[],
    chartOfAccounts: any[],
    countryCode: string,
    options: MappingOptions,
    tx?: any
  ) {
    const db = tx || prisma;
    const results = {
      mapped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Obtener todas las clínicas si no se especifica una
    let clinicsToMap = [];
    if (options.clinicId) {
      const clinic = await db.clinic.findUnique({
        where: { id: options.clinicId }
      });
      if (clinic) clinicsToMap = [clinic];
    } else {
      clinicsToMap = await db.clinic.findMany({
        where: {
          legalEntityId: options.legalEntityId
        }
      });
    }

    const hasMultipleClinics = clinicsToMap.length > 1;

    for (const product of products) {
      try {
        // Si forceRemap, eliminar mapeos existentes
        if (options.forceRemap) {
          await db.productAccountMapping.deleteMany({
            where: {
              productId: product.id,
              legalEntityId: options.legalEntityId,
              ...(options.clinicId && { clinicId: options.clinicId })
            }
          });
        }

        // Obtener mapeos automáticos (puede ser múltiple para productos duales)
        const mappingResult = getAutoProductMapping(
          product,
          chartOfAccounts,
          countryCode
        );

        // Convertir a array si es necesario
        const mappings = Array.isArray(mappingResult) ? mappingResult : [mappingResult];

        if (!mappings || mappings.length === 0) {
          results.errors++;
          results.details.push({
            name: product.name,
            error: 'No se encontró mapeo apropiado'
          });
          continue;
        }

        // Procesar cada mapeo (venta/consumo)
        for (const mapping of mappings) {
          const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === mapping.accountNumber);
          if (!baseAccount) {
            results.errors++;
            results.details.push({
              name: product.name,
              error: `No se encontró cuenta ${mapping.accountNumber}`
            });
            continue;
          }

          // Generar código de categoría si existe
          let categoryCode = null;
          if (product.category) {
            categoryCode = product.category.name.substring(0, 3).toUpperCase();
          }

          // Si hay múltiples clínicas o se especificó una clínica, crear subcuentas
          if (hasMultipleClinics || options.clinicId) {
            for (const clinic of clinicsToMap) {
              // Usar el prefix de la clínica en lugar de generar un código
              const clinicCode = clinic.prefix || generateClinicCode(clinic.name);
              
              // Generar código único para el producto basado en su nombre
              const productCode = product.name.substring(0, 3).toUpperCase();

              // Determinar tipo (V=Venta, C=Consumo/Compra)
              const itemType = mapping.accountType === 'INVENTORY_CONSUMPTION' ? 'C' : 'V';

              const subaccountCode = generateSubaccountCode({
                baseAccount: baseAccount.accountNumber,
                clinicCode: clinicCode,
                categoryCode: categoryCode,
                itemCode: productCode,
                itemType: itemType
              });

              // Verificar si la subcuenta existe
              let subaccount = await db.chartOfAccountEntry.findFirst({
                where: {
                  legalEntityId: options.legalEntityId,
                  accountNumber: subaccountCode
                }
              });

              // Crear subcuenta si no existe
              if (!subaccount) {
                const nameParts = [product.name];
                if (product.category) nameParts.push(product.category.name);
                nameParts.push(clinic.name);
                nameParts.push(itemType === 'V' ? 'Venta' : 'Consumo');

                subaccount = await db.chartOfAccountEntry.create({
                  data: {
                    accountNumber: subaccountCode,
                    name: nameParts.join(' - '),
                    type: baseAccount.type || 'REVENUE',
                    isSubAccount: true,
                    parentAccountId: baseAccount.id,
                    isMonetary: true,
                    allowsDirectEntry: true,
                    isActive: true,
                    legalEntityId: options.legalEntityId,
                    systemId: options.systemId
                  }
                });
              }

              // Crear mapeo
              await db.productAccountMapping.create({
                data: {
                  productId: product.id,
                  accountId: subaccount.id,
                  legalEntityId: options.legalEntityId,
                  clinicId: clinic.id,
                  accountType: mapping.accountType,
                  systemId: options.systemId,
                  subaccountPattern: '{base}.{clinic}.{category}.{type}.{product}'
                }
              });

              results.mapped++;
              results.details.push({
                name: `${product.name} - ${clinic.name} (${itemType === 'V' ? 'Venta' : 'Consumo'})`,
                account: subaccountCode
              });
            }
          } else {
            // Una sola clínica, mapeo directo
            await db.productAccountMapping.create({
              data: {
                productId: product.id,
                accountId: baseAccount.id,
                legalEntityId: options.legalEntityId,
                accountType: mapping.accountType,
                systemId: options.systemId
              }
            });

            results.mapped++;
            results.details.push({
              name: product.name,
              account: baseAccount.accountNumber
            });
          }
        }
      } catch (error: any) {
        console.error(`Error mapeando producto ${product.name}:`, error);
        results.errors++;
        results.details.push({
          name: product.name,
          error: error.message || 'Error desconocido'
        });
      }
    }

    return results;
  }

  /**
   * Mapea métodos de pago con subcuentas por clínica
   */
  static async mapPaymentMethods(
    paymentMethods: any[],
    chartOfAccounts: any[],
    countryCode: string,
    options: MappingOptions,
    tx?: any
  ) {
    const db = tx || prisma;
    const results = {
      mapped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Obtener todas las clínicas si no se especifica una
    let clinicsToMap = [];
    if (options.clinicId) {
      const clinic = await db.clinic.findUnique({
        where: { id: options.clinicId }
      });
      if (clinic) clinicsToMap = [clinic];
    } else {
      clinicsToMap = await db.clinic.findMany({
        where: {
          legalEntityId: options.legalEntityId
        }
      });
    }

    const hasMultipleClinics = clinicsToMap.length > 1;

    for (const method of paymentMethods) {
      try {
        // Si forceRemap, eliminar mapeos existentes
        if (options.forceRemap) {
          await db.paymentMethodAccountMapping.deleteMany({
            where: {
              paymentMethodDefinitionId: method.id,
              legalEntityId: options.legalEntityId,
              ...(options.clinicId && { clinicId: options.clinicId })
            }
          });
        }

        // Verificar si ya existe un mapeo
        const existingMapping = await db.paymentMethodAccountMapping.findFirst({
          where: {
            paymentMethodDefinitionId: method.id,
            legalEntityId: options.legalEntityId,
            ...(options.clinicId && { clinicId: options.clinicId })
          }
        });

        // Obtener mapeo automático
        const mapping = getAutoPaymentMethodMapping(
          method.type,
          chartOfAccounts,
          countryCode
        );

        if (!mapping) {
          results.errors++;
          results.details.push({
            name: method.name,
            error: 'No se encontró mapeo apropiado'
          });
          continue;
        }

        const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === mapping.accountNumber);
        if (!baseAccount) {
          results.errors++;
          results.details.push({
            name: method.name,
            error: `No se encontró cuenta ${mapping.accountNumber}`
          });
          continue;
        }

        // Si hay múltiples clínicas o se especificó una clínica, crear subcuentas
        if (hasMultipleClinics || options.clinicId) {
          for (const clinic of clinicsToMap) {
            // Usar el prefix de la clínica en lugar de generar un código
            const clinicCode = clinic.prefix || generateClinicCode(clinic.name);
            
            // Generar código único para el método de pago
            const paymentCode = method.name.substring(0, 3).toUpperCase();

            const subaccountCode = generateSubaccountCode({
              baseAccount: baseAccount.accountNumber,
              clinicCode: clinicCode,
              itemCode: paymentCode
            });

            // Verificar si la subcuenta existe
            let subaccount = await db.chartOfAccountEntry.findFirst({
              where: {
                legalEntityId: options.legalEntityId,
                accountNumber: subaccountCode
              }
            });

            // Crear subcuenta si no existe
            if (!subaccount) {
              subaccount = await db.chartOfAccountEntry.create({
                data: {
                  accountNumber: subaccountCode,
                  name: `${method.name} - ${clinic.name}`,
                  type: baseAccount.type || 'ASSET',
                  isSubAccount: true,
                  parentAccountId: baseAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: options.legalEntityId,
                  systemId: options.systemId
                }
              });
            }

            // Crear mapeo
            await db.paymentMethodAccountMapping.create({
              data: {
                paymentMethodDefinitionId: method.id,
                accountId: subaccount.id,
                legalEntityId: options.legalEntityId,
                clinicId: clinic.id,
                systemId: options.systemId,
                subaccountPattern: '{base}.{clinic}.{payment}'
              }
            });

            results.mapped++;
            results.details.push({
              name: `${method.name} - ${clinic.name}`,
              account: subaccountCode
            });
          }
        } else {
          // Una sola clínica, mapeo directo
          await db.paymentMethodAccountMapping.create({
            data: {
              paymentMethodDefinitionId: method.id,
              accountId: baseAccount.id,
              legalEntityId: options.legalEntityId,
              systemId: options.systemId
            }
          });

          results.mapped++;
          results.details.push({
            name: method.name,
            account: baseAccount.accountNumber
          });
        }
      } catch (error: any) {
        console.error(`Error mapeando método de pago ${method.name}:`, error);
        results.errors++;
        results.details.push({
          name: method.name,
          error: error.message || 'Error desconocido'
        });
      }
    }

    return results;
  }
}

/**
 * Mapea promociones/descuentos con subcuentas por clínica
 */
export async function mapPromotions(
  db: any,
  promotions: any[],
  chartOfAccounts: any[],
  options: MappingOptions
) {
  const result = {
    success: true,
    mappingsCreated: 0,
    errors: [] as string[],
    details: [] as any[]
  };

  try {
    // Obtener país del plan de cuentas
    const chartCountry = chartOfAccounts[0]?.names?.country || 'ES';
    
    // Obtener cuenta base para descuentos según país
    const discountAccounts = {
      'ES': '665',  // España: Descuentos sobre ventas
      'MA': '6195', // Marruecos: Remises et ristournes obtenus
      'FR': '709'   // Francia: Rabais, remises et ristournes accordés
    };
    
    const baseAccountNumber = discountAccounts[chartCountry];
    if (!baseAccountNumber) {
      throw new Error(`No hay configuración de descuentos para el país ${chartCountry}`);
    }

    const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === baseAccountNumber);
    if (!baseAccount) {
      throw new Error(`No se encontró la cuenta base ${baseAccountNumber} para descuentos`);
    }

    // Obtener todas las clínicas
    let clinicsToMap = [];
    if (options.clinicId) {
      const clinic = await db.clinic.findUnique({
        where: { id: options.clinicId }
      });
      if (clinic) clinicsToMap = [clinic];
    } else {
      clinicsToMap = await db.clinic.findMany({
        where: {
          legalEntityId: options.legalEntityId
        }
      });
    }

    for (const promotion of promotions) {
      // Obtener el alcance de la promoción
      const promotionScopes = await db.promotionClinicScope.findMany({
        where: { promotionId: promotion.id },
        include: { clinic: true }
      });
      
      // Determinar si la promoción es global (sin clínicas específicas)
      const isGlobalPromotion = promotionScopes.length === 0;
      
      // Si la promoción es global, mapearla para todas las clínicas
      // Si es específica, solo mapearla para sus clínicas aplicables
      const clinicsForThisPromotion = isGlobalPromotion 
        ? clinicsToMap 
        : clinicsToMap.filter(clinic => 
            promotionScopes.some(scope => scope.clinicId === clinic.id)
          );
      
      for (const clinic of clinicsForThisPromotion) {
        try {
          // Verificar si ya existe mapeo
          const existingMapping = await db.discountTypeAccountMapping.findFirst({
            where: {
              discountTypeId: promotion.id,
              legalEntityId: options.legalEntityId,
              clinicId: clinic.id
            }
          });

          if (existingMapping && !options.forceRemap) {
            continue;
          }

          // Generar código de subcuenta
          const clinicCode = clinic.prefix || generateClinicCode(clinic.name);
          const promoCode = promotion.name.substring(0, 3).toUpperCase();
          const subaccountCode = generateSubaccountCode({
            baseAccount: baseAccount.accountNumber,
            clinicCode,
            itemCode: promoCode
          });

          // Buscar o crear subcuenta
          let subaccount = await db.chartOfAccountEntry.findFirst({
            where: {
              accountNumber: subaccountCode,
              legalEntityId: options.legalEntityId
            }
          });

          if (!subaccount) {
            subaccount = await db.chartOfAccountEntry.create({
              data: {
                accountNumber: subaccountCode,
                name: `${promotion.name} - ${clinic.name}`,
                type: baseAccount.type || 'EXPENSE',
                description: `Subcuenta de descuentos para ${promotion.name} en ${clinic.name}`,
                isSubAccount: true,
                parentAccountId: baseAccount.id,
                isMonetary: true,
                allowsDirectEntry: true,
                isActive: true,
                legalEntityId: options.legalEntityId,
                systemId: options.systemId
              }
            });
          }

          // Crear mapeo
          if (existingMapping && options.forceRemap) {
            await db.discountTypeAccountMapping.delete({
              where: { id: existingMapping.id }
            });
          }

          await db.discountTypeAccountMapping.create({
            data: {
              legalEntityId: options.legalEntityId,
              systemId: options.systemId,
              clinicId: clinic.id,
              discountTypeId: promotion.id,
              accountId: subaccount.id,
              name: `Mapeo ${promotion.name} - ${clinic.name}`,
              subaccountPattern: '{base}.{clinic}.{promotion}'
            }
          });

          result.mappingsCreated++;
          result.details.push({
            promotion: promotion.name,
            clinic: clinic.name,
            account: subaccountCode
          });

        } catch (error: any) {
          result.errors.push(`Error mapeando promoción ${promotion.name}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Error general en mapeo de promociones: ${error.message}`);
  }

  return result;
}

/**
 * Mapea tipos de gastos con subcuentas por clínica
 */
export async function mapExpenseTypes(
  db: any,
  expenseTypes: any[],
  chartOfAccounts: any[],
  options: MappingOptions
) {
  const result = {
    success: true,
    mappingsCreated: 0,
    errors: [] as string[],
    details: [] as any[]
  };

  try {
    // Obtener país del plan de cuentas
    const chartCountry = chartOfAccounts[0]?.names?.country || 'ES';
    
    // Cuenta base para gastos generales
    const expenseBaseAccount = chartOfAccounts.find(acc => 
      acc.accountNumber.startsWith('6') && 
      !acc.isSubAccount &&
      acc.type === 'EXPENSE'
    );

    if (!expenseBaseAccount) {
      throw new Error('No se encontró cuenta base para gastos');
    }

    // Obtener todas las clínicas
    let clinicsToMap = [];
    if (options.clinicId) {
      const clinic = await db.clinic.findUnique({
        where: { id: options.clinicId }
      });
      if (clinic) clinicsToMap = [clinic];
    } else {
      clinicsToMap = await db.clinic.findMany({
        where: {
          legalEntityId: options.legalEntityId
        }
      });
    }

    for (const expenseType of expenseTypes) {
      for (const clinic of clinicsToMap) {
        try {
          // Verificar si ya existe mapeo
          const existingMapping = await db.expenseTypeAccountMapping.findFirst({
            where: {
              expenseTypeId: expenseType.id,
              legalEntityId: options.legalEntityId,
              clinicId: clinic.id
            }
          });

          if (existingMapping && !options.forceRemap) {
            continue;
          }

          // Generar código de subcuenta
          const clinicCode = clinic.prefix || generateClinicCode(clinic.name);
          const expenseCode = expenseType.name.substring(0, 3).toUpperCase();
          const subaccountCode = generateSubaccountCode({
            baseAccount: expenseBaseAccount.accountNumber,
            clinicCode,
            itemCode: expenseCode
          });

          // Buscar o crear subcuenta
          let subaccount = await db.chartOfAccountEntry.findFirst({
            where: {
              accountNumber: subaccountCode,
              legalEntityId: options.legalEntityId
            }
          });

          if (!subaccount) {
            subaccount = await db.chartOfAccountEntry.create({
              data: {
                accountNumber: subaccountCode,
                name: `${expenseType.name} - ${clinic.name}`,
                type: 'EXPENSE',
                description: `Subcuenta de gastos para ${expenseType.name} en ${clinic.name}`,
                isSubAccount: true,
                parentAccountId: expenseBaseAccount.id,
                isMonetary: true,
                allowsDirectEntry: true,
                isActive: true,
                legalEntityId: options.legalEntityId,
                systemId: options.systemId
              }
            });
          }

          // Crear mapeo
          if (existingMapping && options.forceRemap) {
            await db.expenseTypeAccountMapping.delete({
              where: { id: existingMapping.id }
            });
          }

          await db.expenseTypeAccountMapping.create({
            data: {
              legalEntityId: options.legalEntityId,
              systemId: options.systemId,
              clinicId: clinic.id,
              expenseTypeId: expenseType.id,
              accountId: subaccount.id,
              subaccountPattern: '{base}.{clinic}.{expense}'
            }
          });

          result.mappingsCreated++;
          result.details.push({
            expenseType: expenseType.name,
            clinic: clinic.name,
            account: subaccountCode
          });

        } catch (error: any) {
          result.errors.push(`Error mapeando tipo de gasto ${expenseType.name}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Error general en mapeo de gastos: ${error.message}`);
  }

  return result;
}

/**
 * Mapea cuentas bancarias con subcuentas por clínica
 */
export async function mapBankAccounts(
  db: any,
  bankAccounts: any[],
  chartOfAccounts: any[],
  options: MappingOptions
) {
  const result = {
    success: true,
    mappingsCreated: 0,
    errors: [] as string[],
    details: [] as any[]
  };

  try {
    // Obtener país del plan de cuentas
    const chartCountry = chartOfAccounts[0]?.names?.country || 'ES';
    
    // Obtener cuenta base para bancos según país
    const bankAccountNumbers = {
      'ES': '572',  // España: Bancos e instituciones de crédito
      'MA': '514',  // Marruecos: Banques
      'FR': '512'   // Francia: Banques
    };
    
    const baseAccountNumber = bankAccountNumbers[chartCountry];
    if (!baseAccountNumber) {
      throw new Error(`No hay configuración de bancos para el país ${chartCountry}`);
    }

    const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === baseAccountNumber);
    if (!baseAccount) {
      throw new Error(`No se encontró la cuenta base ${baseAccountNumber} para bancos`);
    }

    for (const bankAccount of bankAccounts) {
      try {
        const clinic = bankAccount.clinic || { name: 'General', id: null };
        
        // Verificar si ya existe mapeo
        const existingMapping = await db.cashSessionAccountMapping.findFirst({
          where: {
            clinicId: bankAccount.clinicId,
            legalEntityId: options.legalEntityId,
            posTerminalId: null // Para distinguir de cajas
          }
        });

        if (existingMapping && !options.forceRemap) {
          continue;
        }

        // Generar código de subcuenta
        const clinicCode = clinic.id ? clinic.prefix || generateClinicCode(clinic.name) : 'GEN';
        const bankCode = bankAccount.name.substring(0, 3).toUpperCase();
        const subaccountCode = generateSubaccountCode({
          baseAccount: baseAccount.accountNumber,
          clinicCode,
          itemCode: bankCode
        });

        // Buscar o crear subcuenta
        let subaccount = await db.chartOfAccountEntry.findFirst({
          where: {
            accountNumber: subaccountCode,
            legalEntityId: options.legalEntityId
          }
        });

        if (!subaccount) {
          subaccount = await db.chartOfAccountEntry.create({
            data: {
              accountNumber: subaccountCode,
              name: `${bankAccount.name} - ${clinic.name}`,
              type: baseAccount.type || 'ASSET',
              description: `Subcuenta bancaria para ${bankAccount.name} en ${clinic.name}`,
              isSubAccount: true,
              parentAccountId: baseAccount.id,
              isMonetary: true,
              allowsDirectEntry: true,
              isActive: true,
              legalEntityId: options.legalEntityId,
              systemId: options.systemId
            }
          });
        }

        // Crear mapeo
        if (existingMapping && options.forceRemap) {
          await db.cashSessionAccountMapping.delete({
            where: { id: existingMapping.id }
          });
        }

        await db.cashSessionAccountMapping.create({
          data: {
            legalEntityId: options.legalEntityId,
            systemId: options.systemId,
            clinicId: bankAccount.clinicId || null,
            accountId: subaccount.id,
            subaccountPattern: '{base}.{clinic}.{bankAccount}'
          }
        });

        result.mappingsCreated++;
        result.details.push({
          bankAccount: bankAccount.name,
          clinic: clinic.name,
          account: subaccountCode
        });

      } catch (error: any) {
        result.errors.push(`Error mapeando cuenta bancaria ${bankAccount.name}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Error general en mapeo de bancos: ${error.message}`);
  }

  return result;
}
