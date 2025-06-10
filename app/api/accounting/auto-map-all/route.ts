import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { UnifiedMappingService } from '@/lib/accounting/unified-mapping-service';
import { 
  CategoryType,
  getAutoCategoryMapping, 
  getAutoProductMapping, 
  getAutoServiceMapping,
  getAutoPaymentMethodMapping,
  getAutoVATMapping,
  getDefaultCashAccount,
  getDefaultBankAccount,
  getDefaultDiscountAccount,
  getCountrySpecificAccounts
} from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';
import type { NextApiRequest, NextApiResponse } from 'next';

// Schema de validación
const AutoMapAllSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string().optional(),
  clinicId: z.string().optional(), // Añadir clinicId opcional
  types: z.array(z.enum([
    'categories', 
    'products', 
    'services', 
    'paymentMethods',
    'vat',
    'expenseTypes',
    'all',
    'cash-session',
    'discount',
    'discountTypes',
    'banks'
  ])).optional(),
  forceRemap: z.boolean().optional()
});

// Función auxiliar para crear subcuentas si no existen
async function createSubaccountIfNeeded(
  prisma: any,
  parentAccountIdOrNumber: string,
  subaccountNumber: string,
  name: string,
  legalEntityId: string
): Promise<any> {
  console.log(`Intentando crear subcuenta ${subaccountNumber} para ${name}`);
  
  // Verificar si ya existe
  const existingSubaccount = await prisma.chartOfAccountEntry.findFirst({
    where: {
      accountNumber: subaccountNumber,
      legalEntityId
    }
  });
  
  if (existingSubaccount) {
    console.log(`Subcuenta ${subaccountNumber} ya existe con ID: ${existingSubaccount.id}`);
    return existingSubaccount;
  }
  
  // Buscar la cuenta padre
  let parentAccount = null;
  
  // Si es un ID (contiene guiones), buscar por ID
  if (parentAccountIdOrNumber.includes('-')) {
    parentAccount = await prisma.chartOfAccountEntry.findUnique({
      where: { id: parentAccountIdOrNumber }
    });
  } else {
    // Si es un número de cuenta, buscar por número
    parentAccount = await prisma.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: parentAccountIdOrNumber,
        legalEntityId
      }
    });
  }
  
  if (!parentAccount) {
    console.error(`No se encontró la cuenta padre: ${parentAccountIdOrNumber}`);
    return null;
  }
  
  // Crear la subcuenta
  const subaccount = await prisma.chartOfAccountEntry.create({
    data: {
      accountNumber: subaccountNumber,
      name,
      type: parentAccount.type,
      parentAccountId: parentAccount.id,
      legalEntityId,
      systemId: parentAccount.systemId,
      isActive: true,
      isSubAccount: true,
      allowsDirectEntry: true
    }
  });
  
  console.log(`Subcuenta ${subaccountNumber} creada con ID: ${subaccount.id}`);
  return subaccount;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
      console.log('[AutoMapAll] Request body:', body);
    } catch (error) {
      console.error('[AutoMapAll] Error parsing JSON:', error);
      return NextResponse.json(
        { error: 'Error al parsear JSON. Asegúrese de enviar un body válido.' },
        { status: 400 }
      );
    }

    const validation = AutoMapAllSchema.safeParse(body);

    if (!validation.success) {
      console.error('[AutoMapAll] Validation failed:', validation.error.errors);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { legalEntityId, types = ['all'], forceRemap = false, clinicId } = validation.data;
    const systemId = validation.data.systemId || session.user.systemId;
    const includeAll = types.includes('all');

    // Obtener la entidad legal con su país
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      select: { 
        id: true, 
        name: true,
        country: true 
      }
    });

    if (!legalEntity) {
      return NextResponse.json(
        { error: 'Entidad legal no encontrada' },
        { status: 404 }
      );
    }

    const countryCode = legalEntity.country?.isoCode;
    console.log(`Legal entity country: ${countryCode}`);

    // Obtener el plan contable
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId,
        isActive: true
      }
    });

    console.log(`Found ${chartOfAccounts.length} chart of account entries for legalEntityId: ${legalEntityId}`);
    
    // Mostrar algunas cuentas de ejemplo si existen
    if (chartOfAccounts.length > 0) {
      console.log('Sample accounts:', chartOfAccounts.slice(0, 5).map(acc => ({
        number: acc.accountNumber,
        name: acc.name,
        id: acc.id
      })));
    }

    if (chartOfAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró plan contable para esta entidad legal' },
        { status: 404 }
      );
    }

    // Verificar que existen todas las cuentas requeridas para el país
    try {
      const countryAccounts = getCountrySpecificAccounts(countryCode);
      const missingAccounts: string[] = [];
      
      // Verificar cada cuenta requerida
      for (const [accountType, accountNumber] of Object.entries(countryAccounts)) {
        const exists = chartOfAccounts.some(acc => 
          acc.accountNumber === accountNumber && acc.isActive
        );
        if (!exists) {
          missingAccounts.push(`${accountType}: ${accountNumber}`);
        }
      }
      
      if (missingAccounts.length > 0) {
        console.error(`[AutoMapAll] Faltan cuentas requeridas para ${countryCode}:`, missingAccounts);
        return NextResponse.json({
          success: false,
          error: `Faltan cuentas contables requeridas para ${countryCode}`,
          missingAccounts,
          results: {},
          message: `El plan contable no tiene las siguientes cuentas requeridas: ${missingAccounts.join(', ')}`
        }, { status: 400 });
      }
    } catch (error) {
      console.error('[AutoMapAll] Error verificando cuentas:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Error al verificar cuentas',
        results: {}
      }, { status: 400 });
    }

    const results = {
      categories: { mapped: 0, errors: 0, details: [] as any[] },
      products: { mapped: 0, errors: 0, details: [] as any[] },
      services: { mapped: 0, errors: 0, details: [] as any[] },
      paymentMethods: { mapped: 0, errors: 0, details: [] as any[] },
      vat: { mapped: 0, errors: 0, details: [] as any[] },
      cashEntities: { mapped: 0, errors: 0, details: [] as any[] },
      banks: { total: 0, mapped: 0, errors: 0, details: [] as any[] },
      discounts: { mapped: 0, errors: 0, details: [] as any[] }
    };

    // Variables para estadísticas
    let categoriesMapped = 0;
    let servicesMapped = 0;
    let productsMapped = 0;
    let paymentMethodsMapped = 0;
    let vatTypesMapped = 0;
    let subaccountsCreated = 0;
    const createdSubaccounts: Array<{
      type: string;
      parentAccount: string;
      subaccountCode: string;
      subaccountName: string;
    }> = [];

    // Mapear categorías
    if (includeAll || types.includes('categories')) {
      const categories = await prisma.category.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            categoryAccountMappings: {
              none: { legalEntityId }
            }
          })
        }
      });

      for (const category of categories) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.categoryAccountMapping.deleteMany({
              where: {
                categoryId: category.id,
                legalEntityId
              }
            });
          }
          
          // Verificar si la categoría tiene productos y/o servicios asociados
          const categoryWithRelations = await prisma.category.findUnique({
            where: { id: category.id },
            include: {
              products: { select: { id: true } },
              services: { select: { id: true } }
            }
          });
          
          if (!categoryWithRelations) continue;
          
          const hasProducts = categoryWithRelations.products.length > 0;
          const hasServices = categoryWithRelations.services.length > 0;
          
          // Solo mapear si la categoría tiene productos o servicios
          if (!hasProducts && !hasServices) {
            console.log(`[AutoMapAll] Categoría ${category.name} sin productos ni servicios, saltando...`);
            continue;
          }
          
          const countryAccounts = getCountrySpecificAccounts(countryCode);
          
          // Determinar cuenta base y flags según el contenido real
          let accountNumber: string;
          let appliesToServices = false;
          let appliesToProducts = false;
          
          if (hasServices && hasProducts) {
            // Categoría mixta: usar cuenta de servicios como base
            // Pero marcar que aplica a ambos para que las subcuentas se creen correctamente
            accountNumber = countryAccounts.services;
            appliesToServices = true;
            appliesToProducts = true;
          } else if (hasServices) {
            // Solo servicios
            accountNumber = countryAccounts.services;
            appliesToServices = true;
          } else {
            // Solo productos
            accountNumber = countryAccounts.products;
            appliesToProducts = true;
          }

          // Encontrar la cuenta base por número
          const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === accountNumber);
          let finalAccountId: string | null = null;
          
          if (baseAccount) {
            // Generar código de categoría (2 dígitos)
            const categoryCode = (results.categories.mapped + 1).toString().padStart(2, '0');
            
            // Crear subcuenta para esta categoría
            const subaccount = await createSubaccountIfNeeded(
              prisma,
              baseAccount.accountNumber,
              `${baseAccount.accountNumber}.${categoryCode}`,
              `${category.name} - Categoría`,
              legalEntityId
            );
            
            if (subaccount) {
              finalAccountId = subaccount.id;
            }
          }
          
          if (finalAccountId) {
            await prisma.categoryAccountMapping.create({
              data: {
                categoryId: category.id,
                accountId: finalAccountId,
                appliesToServices,
                appliesToProducts,
                legalEntityId,
                systemId,
                subaccountPattern: '{base}.{category}.{clinic}',
                analyticalDimensions: null
              }
            });

            results.categories.mapped++;
            results.categories.details.push({
              category: category.name,
              account: baseAccount?.accountNumber || 'N/A',
              services: appliesToServices,
              products: appliesToProducts,
              status: 'success'
            });
            
            console.log(`[AutoMapAll] Mapeada categoría ${category.name} -> ${baseAccount?.accountNumber} (servicios: ${appliesToServices}, productos: ${appliesToProducts})`);
          } else {
            results.categories.errors++;
          }
        } catch {
          results.categories.errors++;
        }
      }
    }

    // Mapear productos
    if (includeAll || types.includes('products')) {
      const products = await prisma.product.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            productAccountMappings: {
              none: { legalEntityId }
            }
          })
        },
        include: { 
          category: true,
          settings: true  // Incluir settings para tener isForSale
        }
      });

      for (const product of products) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.productAccountMapping.deleteMany({
              where: {
                productId: product.id
              }
            });
          }
            
          let baseAccount: any = null;
          let finalAccountId: string | null = null;
          
          // Si el producto tiene categoría, buscar el mapeo de la categoría
          if (product.categoryId) {
            const categoryMapping = await prisma.categoryAccountMapping.findFirst({
              where: {
                categoryId: product.categoryId,
                legalEntityId,
                appliesToProducts: true
              },
              include: {
                account: true
              }
            });
            
            if (categoryMapping && categoryMapping.account) {
              // Para productos, siempre usar la cuenta de productos del país
              const countryAccounts = getCountrySpecificAccounts(countryCode);
              const productAccountNumber = countryAccounts.products;
              
              // Buscar la cuenta de productos
              baseAccount = chartOfAccounts.find(acc => acc.accountNumber === productAccountNumber);
              
              if (baseAccount) {
                // Generar código único para el producto
                const productCode = (results.products.mapped + 1).toString().padStart(3, '0');
                
                // Si hay clinicId, incluir código de clínica en el código de subcuenta
                let subaccountCode = `${baseAccount.accountNumber}.${productCode}`;
                let subaccountName = `${baseAccount.name} - ${product.name}`;
                
                if (clinicId) {
                  // Buscar la clínica para obtener su nombre
                  const clinic = await prisma.clinic.findUnique({
                    where: { id: clinicId }
                  });
                  
                  if (clinic) {
                    const clinicCode = clinic.name.substring(0, 3).toUpperCase();
                    subaccountCode = `${baseAccount.accountNumber}.${clinicCode}.${productCode}`;
                    subaccountName = `${baseAccount.name} - ${clinic.name} - ${product.name}`;
                  }
                }
                
                // Crear subcuenta para este producto
                const subaccount = await createSubaccountIfNeeded(
                  prisma,
                  baseAccount.accountNumber,
                  subaccountCode,
                  subaccountName,
                  legalEntityId
                );
                
                if (subaccount && subaccount.id) {
                  finalAccountId = subaccount.id;
                } else {
                  finalAccountId = baseAccount.id;
                }
              }
            }
          }
          
          // Si no se pudo usar la cuenta de la categoría, usar el mapeo automático
          if (!finalAccountId) {
            const mapping = getAutoProductMapping(product as any, chartOfAccounts, countryCode);

            if (mapping) {
              // Manejar tanto mapeos únicos como múltiples
              const mappings = Array.isArray(mapping) ? mapping : [mapping];
              
              for (const singleMapping of mappings) {
                if (!singleMapping.accountNumber) continue;
                
                // Encontrar la cuenta base por número
                baseAccount = chartOfAccounts.find(acc => acc.accountNumber === singleMapping.accountNumber);
                
                if (baseAccount) {
                  // Generar código único para el producto
                  const productCode = (results.products.mapped + 1).toString().padStart(3, '0');
                  
                  // Si hay clinicId, incluir código de clínica en el código de subcuenta
                  let subaccountCode = `${baseAccount.accountNumber}.${productCode}`;
                  let subaccountName = `${baseAccount.name} - ${product.name}`;
                  
                  if (clinicId) {
                    // Buscar la clínica para obtener su nombre
                    const clinic = await prisma.clinic.findUnique({
                      where: { id: clinicId }
                    });
                    
                    if (clinic) {
                      const clinicCode = clinic.name.substring(0, 3).toUpperCase();
                      subaccountCode = `${baseAccount.accountNumber}.${clinicCode}.${productCode}`;
                      subaccountName = `${baseAccount.name} - ${clinic.name} - ${product.name}`;
                    }
                  }
                  
                  // Crear subcuenta para este producto
                  const subaccount = await createSubaccountIfNeeded(
                    prisma,
                    baseAccount.accountNumber,
                    subaccountCode,
                    subaccountName,
                    legalEntityId
                  );
                  
                  if (subaccount && subaccount.id) {
                    finalAccountId = subaccount.id;
                  } else {
                    finalAccountId = baseAccount.id;
                  }
                  
                  // Crear el mapeo con clinicId si está presente
                  await prisma.productAccountMapping.create({
                    data: {
                      productId: product.id,
                      accountId: finalAccountId,
                      legalEntityId,
                      systemId,
                      clinicId: clinicId || null, // Añadir clinicId si está presente
                      subaccountPattern: singleMapping.subaccountPattern || '{category}.{product}',
                      analyticalDimensions: singleMapping.analyticalDimensions || {},
                      accountType: (singleMapping as any).accountType
                    }
                  });
                  
                  results.products.mapped++;
                  results.products.details.push({
                    name: product.name,
                    account: baseAccount?.accountNumber || 'No asignado'
                  });
                }
              }
              
              if (finalAccountId) {
                productsMapped++;
                // Añadir a estadísticas
                subaccountsCreated++;
                
                createdSubaccounts.push({
                  type: 'product',
                  parentAccount: `${baseAccount?.accountNumber} - ${baseAccount?.name}`,
                  subaccountCode: finalAccountId,
                  subaccountName: `${baseAccount?.name} - ${product.name}`
                });
              }
            } else {
              results.products.errors++;
              results.products.details.push({
                name: product.name,
                error: 'No se pudo encontrar una cuenta apropiada'
              });
            }
          } else {
            // Si ya tenemos finalAccountId de la categoría, crear el mapeo
            await prisma.productAccountMapping.create({
              data: {
                productId: product.id,
                accountId: finalAccountId,
                legalEntityId,
                systemId,
                clinicId: clinicId || null, // Añadir clinicId si está presente
                subaccountPattern: '{category}.{product}',
                analyticalDimensions: {}
              }
            });
            results.products.mapped++;
            results.products.details.push({
              name: product.name,
              account: baseAccount?.accountNumber || 'No asignado'
            });
            productsMapped++;
            // Añadir a estadísticas
            subaccountsCreated++;
            
            createdSubaccounts.push({
              type: 'product',
              parentAccount: `${baseAccount?.accountNumber} - ${baseAccount?.name}`,
              subaccountCode: finalAccountId,
              subaccountName: `${baseAccount?.name} - ${product.name}`
            });
          }
        } catch (error) {
          console.error(`Error mapping product ${product.name}:`, error);
          results.products.errors++;
        }
      }
    }

    // Mapear servicios
    if (includeAll || types.includes('services')) {
      const services = await prisma.service.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            serviceAccountMappings: {
              none: { legalEntityId }
            }
          })
        },
        include: { category: true }
      });

      // Usar el servicio unificado para mapear servicios
      const serviceResults = await UnifiedMappingService.mapServices(
        services,
        chartOfAccounts,
        countryCode,
        {
          legalEntityId,
          systemId,
          clinicId,
          forceRemap
        }
      );

      results.services = serviceResults;
      // Los detalles ya están incluidos en serviceResults, no necesitamos agregarlos nuevamente
    }

    // Mapear métodos de pago
    if (includeAll || types.includes('paymentMethods')) {
      const paymentMethods = await prisma.paymentMethodDefinition.findMany({
        where: {
          systemId,
          isActive: true,
          ...(!forceRemap && {
            paymentMethodAccountMappings: {
              none: { legalEntityId }
            }
          })
        }
      });

      for (const paymentMethod of paymentMethods) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.paymentMethodAccountMapping.deleteMany({
              where: {
                paymentMethodDefinitionId: paymentMethod.id,
                legalEntityId
              }
            });
          }

          const mapping = getAutoPaymentMethodMapping(paymentMethod.type, chartOfAccounts, countryCode);

          if (mapping && mapping.accountNumber) {
            // Encontrar la cuenta base para crear subcuenta
            const baseAccount = chartOfAccounts.find(acc => acc.accountNumber === mapping.accountNumber);
            let finalAccountId: string | null = null;
            
            if (baseAccount) {
              // Generar sufijo basado en el tipo de pago
              const paymentTypeSuffix = paymentMethod.type.substring(0, 2).toUpperCase();
              const paymentCode = `${paymentTypeSuffix}${(results.paymentMethods.mapped + 1).toString().padStart(2, '0')}`;
              
              // Si hay clinicId, incluir código de clínica en el código de subcuenta
              let subaccountCode = `${baseAccount.accountNumber}.${paymentCode}`;
              let subaccountName = `${baseAccount.name} - ${paymentMethod.name}`;
              
              if (clinicId) {
                // Buscar la clínica para obtener su nombre
                const clinic = await prisma.clinic.findUnique({
                  where: { id: clinicId }
                });
                
                if (clinic) {
                  const clinicCode = clinic.name.substring(0, 3).toUpperCase();
                  subaccountCode = `${baseAccount.accountNumber}.${clinicCode}.${paymentCode}`;
                  subaccountName = `${baseAccount.name} - ${clinic.name} - ${paymentMethod.name}`;
                }
              }
              
              // Crear subcuenta para este método de pago
              const subaccount = await createSubaccountIfNeeded(
                prisma,
                baseAccount.accountNumber,
                subaccountCode,
                subaccountName,
                legalEntityId
              );
              
              if (subaccount && subaccount.id) {
                finalAccountId = subaccount.id;
              } else {
                finalAccountId = baseAccount.id;
              }
              
              await prisma.paymentMethodAccountMapping.create({
                data: {
                  paymentMethodDefinitionId: paymentMethod.id,
                  accountId: finalAccountId,
                  legalEntityId,
                  systemId,
                  clinicId: clinicId || null, // Añadir clinicId si está presente
                  subaccountPattern: clinicId ? '{base}.{clinic}.{payment}' : '{base}.{payment}',
                  analyticalDimensions: mapping.analyticalDimensions
                }
              });
              results.paymentMethods.mapped++;
              results.paymentMethods.details.push({
                name: paymentMethod.name,
                account: baseAccount?.accountNumber || 'No asignado'
              });
              paymentMethodsMapped++;
              // Añadir a estadísticas
              subaccountsCreated++;
              createdSubaccounts.push({
                type: 'paymentMethod',
                parentAccount: `${baseAccount?.accountNumber} - ${baseAccount?.name}`,
                subaccountCode: finalAccountId,
                subaccountName: `${baseAccount?.name} - ${paymentMethod.name}`
              });
            } else {
              results.paymentMethods.errors++;
              results.paymentMethods.details.push({
                name: paymentMethod.name,
                error: 'No se pudo encontrar una cuenta apropiada'
              });
            }
          } else {
            results.paymentMethods.errors++;
          }
        } catch {
          results.paymentMethods.errors++;
        }
      }
    }

    // Mapear tipos de IVA
    if (includeAll || types.includes('vat')) {
      const vatTypes = await prisma.vATType.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            vatTypeAccountMappings: {
              none: { legalEntityId }
            }
          })
        }
      });

      for (const vatType of vatTypes) {
        try {
          // Si forceRemap es true, eliminar mapeos existentes
          if (forceRemap) {
            await prisma.vATTypeAccountMapping.deleteMany({
              where: {
                vatTypeId: vatType.id,
                legalEntityId
              }
            });
          }

          // Usar la nueva función de mapeo automático de IVA
          const vatMapping = getAutoVATMapping(chartOfAccounts, countryCode);

          if (vatMapping && (vatMapping.inputAccount || vatMapping.outputAccount)) {
            // Buscar las cuentas por número
            const inputAccount = vatMapping.inputAccount ? 
              chartOfAccounts.find(a => a.accountNumber === vatMapping.inputAccount && a.isActive) : null;
            const outputAccount = vatMapping.outputAccount ? 
              chartOfAccounts.find(a => a.accountNumber === vatMapping.outputAccount && a.isActive) : null;
            
            await prisma.vATTypeAccountMapping.create({
              data: {
                vatTypeId: vatType.id,
                inputAccountId: inputAccount?.id || null,
                outputAccountId: outputAccount?.id || null,
                legalEntityId,
                systemId
              }
            });
            results.vat.mapped++;
            vatTypesMapped++;
            
            results.vat.details.push({
              type: 'vat',
              name: vatType.name,
              rate: vatType.rate,
              inputAccount: inputAccount?.accountNumber,
              outputAccount: outputAccount?.accountNumber
            });
          } else {
            throw new Error('No se encontraron cuentas de IVA configuradas');
          }
        } catch (error) {
          console.error(`Error mapping VAT type ${vatType.name}:`, error);
          results.vat.errors++;
        }
      }
    }

    // Mapear sesiones de caja/cajas registradoras
    if (includeAll || types.includes('cash-session')) {
      console.log('Mapeando cajas/sesiones de caja...');
      
      // Obtener los terminales POS de las clínicas
      const posTerminals = await prisma.posTerminal.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            CashSessionAccountMapping: {
              none: {
                legalEntityId,
                posTerminalId: { not: null }
              }
            }
          })
        },
        include: {
          applicableClinics: {
            include: {
              clinic: true
            }
          }
        }
      });

      // También buscar clínicas sin mapeo de caja
      const clinicsWithoutMapping = await prisma.clinic.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            CashSessionAccountMapping: {
              none: { 
                legalEntityId,
                clinicId: { not: null }
              }
            }
          })
        }
      });

      // Buscar cuenta de caja por defecto usando el código del país
      const defaultCashAccount = getDefaultCashAccount(chartOfAccounts, countryCode);
      
      if (!defaultCashAccount) {
        console.warn('No se encontró cuenta de caja por defecto');
      }

      // Mapear terminales POS
      for (const posTerminal of posTerminals) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.cashSessionAccountMapping.deleteMany({
              where: {
                posTerminalId: posTerminal.id,
                legalEntityId
              }
            });
          }

          if (defaultCashAccount) {
            const clinicName = posTerminal.applicableClinics[0]?.clinic?.name || 'Global';
            const clinicId = posTerminal.applicableClinics[0]?.clinic?.id;
            
            // Crear subcuenta para este terminal/clínica
            let finalAccountId = defaultCashAccount.id;
            
            // Generar código único para la subcuenta
            const clinicCode = clinicName.substring(0, 3).toUpperCase();
            const terminalCode = posTerminal.name.substring(0, 3).toUpperCase();
            const uniqueCode = `${clinicCode}.${terminalCode}`;
            
            // Crear subcuenta si no existe
            const subaccount = await createSubaccountIfNeeded(
              prisma,
              defaultCashAccount.accountNumber,
              `${defaultCashAccount.accountNumber}.${uniqueCode}`,
              `${defaultCashAccount.name} - ${clinicName} - ${posTerminal.name}`,
              legalEntityId
            );
            
            if (subaccount && subaccount.id) {
              finalAccountId = subaccount.id;
              subaccountsCreated++;
              createdSubaccounts.push({
                type: 'cashSession',
                parentAccount: `${defaultCashAccount.accountNumber} - ${defaultCashAccount.name}`,
                subaccountCode: `${defaultCashAccount.accountNumber}.${uniqueCode}`,
                subaccountName: `${defaultCashAccount.name} - ${clinicName} - ${posTerminal.name}`
              });
            }
            
            await prisma.cashSessionAccountMapping.create({
              data: {
                posTerminalId: posTerminal.id,
                accountId: finalAccountId,
                legalEntityId,
                systemId,
                clinicId: clinicId && clinicId ? clinicId : undefined, // Añadir clinicId si está disponible
                subaccountPattern: '{base}.{clinic}.{terminal}',
                analyticalDimensions: {
                  dimensions: [
                    { code: 'TERMINAL', value: posTerminal.name },
                    { code: 'CLINIC', value: clinicName }
                  ]
                }
              }
            });
            results.cashEntities.mapped++;
            console.log(`Terminal POS "${posTerminal.name}" mapeado a subcuenta ${defaultCashAccount.accountNumber}.${uniqueCode}`);
          } else {
            console.log('No se encontró cuenta de caja por defecto');
            results.cashEntities.errors++;
          }
        } catch (error) {
          console.error(`Error mapping POS terminal ${posTerminal.name}:`, error);
          results.cashEntities.errors++;
        }
      }

      // Mapear clínicas sin terminal específico
      for (const clinic of clinicsWithoutMapping) {
        try {
          // Si forceRemap es true, eliminar mapeo existente
          if (forceRemap) {
            await prisma.cashSessionAccountMapping.deleteMany({
              where: {
                clinicId: clinic.id,
                legalEntityId
              }
            });
          }

          if (defaultCashAccount) {
            // Crear subcuenta para esta clínica
            let finalAccountId = defaultCashAccount.id;
            
            // Generar código único para la subcuenta de clínica
            const clinicCode = clinic.name.substring(0, 3).toUpperCase();
            const uniqueCode = `${clinicCode}`;
            
            // Crear subcuenta si no existe
            const subaccount = await createSubaccountIfNeeded(
              prisma,
              defaultCashAccount.accountNumber,
              `${defaultCashAccount.accountNumber}.${uniqueCode}`,
              `${defaultCashAccount.name} - ${clinic.name}`,
              legalEntityId
            );
            
            if (subaccount && subaccount.id) {
              finalAccountId = subaccount.id;
              subaccountsCreated++;
              createdSubaccounts.push({
                type: 'cashSession',
                parentAccount: `${defaultCashAccount.accountNumber} - ${defaultCashAccount.name}`,
                subaccountCode: `${defaultCashAccount.accountNumber}.${uniqueCode}`,
                subaccountName: `${defaultCashAccount.name} - ${clinic.name}`
              });
            }
            
            await prisma.cashSessionAccountMapping.create({
              data: {
                clinicId: clinic.id,
                accountId: finalAccountId,
                legalEntityId,
                systemId,
                subaccountPattern: '{base}.{clinic}',
                analyticalDimensions: {
                  dimensions: [
                    { code: 'CLINIC', value: clinic.name }
                  ]
                }
              }
            });
            results.cashEntities.mapped++;
            console.log(`Clínica "${clinic.name}" mapeada a subcuenta ${defaultCashAccount.accountNumber}.${uniqueCode}`);
          } else {
            console.log('No se encontró cuenta de caja por defecto');
            results.cashEntities.errors++;
          }
        } catch (error) {
          console.error(`Error mapping clinic ${clinic.name}:`, error);
          results.cashEntities.errors++;
        }
      }
    }

    // Mapear bancos
    if (includeAll || types.includes('banks')) {
      console.log('Mapeando bancos...');
      
      // Obtener bancos sin mapeo
      const banks = await prisma.bank.findMany({
        where: {
          systemId,
          ...(!forceRemap && {
            accountId: null
          })
        }
      });

      console.log(`Bancos sin mapear encontrados: ${banks.length}`);
      results.banks.total = banks.length;

      // Buscar cuenta raíz para bancos usando la función específica por país
      const defaultBankParentAccount = getDefaultBankAccount(chartOfAccounts, countryCode);

      let banksMapped = 0;

      // Mapear cada banco
      for (const bank of banks) {
        try {
          // Si forceRemap es true, limpiar el mapeo existente
          if (forceRemap && bank.accountId) {
            // Actualizar el mapeo existente
            await prisma.bank.update({
              where: { id: bank.id },
              data: { accountId: null }
            });
          }

          let accountToMap: any = null;

          // Buscar cuenta específica para este banco
          const specificBankAccount = chartOfAccounts.find(account => {
            const nameLower = account.name.toLowerCase();
            const bankNameLower = bank.name.toLowerCase();
            
            // Buscar coincidencia por nombre
            return nameLower.includes(bankNameLower) || 
                   bankNameLower.includes(nameLower.split(' ')[0]);
          });

          if (specificBankAccount) {
            accountToMap = specificBankAccount;
          } else if (defaultBankParentAccount) {
            // Crear subcuenta para el banco
            try {
              // Generar un sufijo único basado en el nombre del banco
              const suffix = bank.code || bank.name.substring(0, 3).toUpperCase();
              const subaccountName = `${bank.name}`;
              
              const subaccountId = await createSubaccountIfNeeded(
                prisma,
                defaultBankParentAccount.accountNumber,
                `${defaultBankParentAccount.accountNumber}.${suffix}`,
                subaccountName,
                legalEntityId
              );

              // Buscar la subcuenta creada
              accountToMap = await prisma.chartOfAccountEntry.findUnique({
                where: { id: subaccountId.id }
              });

              if (accountToMap) {
                subaccountsCreated++;
                createdSubaccounts.push({
                  type: 'bank',
                  parentAccount: defaultBankParentAccount.accountNumber,
                  subaccountCode: accountToMap.accountNumber,
                  subaccountName: accountToMap.name
                });
              }
            } catch (error) {
              console.error(`Error creando subcuenta para banco ${bank.name}:`, error);
            }
          }

          // Mapear el banco
          if (accountToMap) {
            await prisma.bank.update({
              where: { id: bank.id },
              data: {
                accountId: accountToMap.id
              }
            });

            results.banks.mapped++;
            banksMapped++;
            results.banks.details.push({
              type: 'bank',
              name: bank.name,
              accountNumber: accountToMap.accountNumber,
              accountName: accountToMap.name
            });

            console.log(`Banco ${bank.name} mapeado a cuenta ${accountToMap.accountNumber}`);

            // Ahora mapear las cuentas bancarias de este banco
            const bankAccounts = await prisma.bankAccount.findMany({
              where: {
                bankId: bank.id,
                systemId,
                ...(!forceRemap && {
                  accountId: null
                })
              }
            });

            console.log(`Cuentas bancarias del banco ${bank.name}: ${bankAccounts.length}`);

            // Mapear cada cuenta bancaria
            for (const bankAccount of bankAccounts) {
              try {
                // Si forceRemap es true, limpiar el mapeo existente
                if (forceRemap && bankAccount.accountId) {
                  await prisma.bankAccount.update({
                    where: { id: bankAccount.id },
                    data: { accountId: null }
                  });
                }

                // Crear sub-subcuenta para la cuenta bancaria
                const bankAccountSuffix = bankAccount.iban ? 
                  bankAccount.iban.slice(-4) : 
                  bankAccount.accountName.substring(0, 3).toUpperCase();
                
                const bankAccountSubaccountName = `${bankAccount.accountName} - ${bankAccount.iban || ''}`.trim();
                
                const bankAccountSubaccountId = await createSubaccountIfNeeded(
                  prisma,
                  accountToMap.accountNumber,
                  `${accountToMap.accountNumber}.${bankAccountSuffix}`,
                  bankAccountSubaccountName,
                  legalEntityId
                );

                // Buscar la subcuenta creada
                const bankAccountSubaccount = await prisma.chartOfAccountEntry.findUnique({
                  where: { id: bankAccountSubaccountId.id }
                });

                if (bankAccountSubaccount) {
                  // Mapear la cuenta bancaria
                  await prisma.bankAccount.update({
                    where: { id: bankAccount.id },
                    data: {
                      accountId: bankAccountSubaccount.id
                    }
                  });

                  subaccountsCreated++;
                  createdSubaccounts.push({
                    type: 'bankAccount',
                    parentAccount: accountToMap.accountNumber,
                    subaccountCode: bankAccountSubaccount.accountNumber,
                    subaccountName: bankAccountSubaccount.name
                  });

                  console.log(`Cuenta bancaria ${bankAccount.accountName} mapeada a subcuenta ${bankAccountSubaccount.accountNumber}`);
                }
              } catch (error) {
                console.error(`Error mapping bank account ${bankAccount.accountName}:`, error);
              }
            }
          } else {
            console.log(`No se encontró cuenta para mapear el banco ${bank.name}`);
            results.banks.errors++;
          }
        } catch (error) {
          console.error(`Error mapping bank ${bank.name}:`, error);
          results.banks.errors++;
        }
      }

      console.log(`Bancos mapeados: ${banksMapped} de ${banks.length}`);
    }

    // Mapear descuentos si se solicita
    let discountsMapped = 0;
    if (types.includes('discountTypes')) {
      console.log('Iniciando mapeo de descuentos y promociones...');
      
      results.discounts = { mapped: 0, errors: 0, details: [] as any[] };

      // Obtener la cuenta de descuentos específica del país
      const discountAccount = getDefaultDiscountAccount(chartOfAccounts, countryCode);

      if (!discountAccount) {
        results.discounts.errors++;
        results.discounts.details.push({
          error: `No se encontró cuenta de descuentos para el país ${countryCode}`
        });
        console.error(`No se encontró cuenta de descuentos para el país ${countryCode}`);
      } else {
        // 1. Crear subcuentas principales si no existen
        const manualDiscountsSubaccount = await createSubaccountIfNeeded(
          prisma,
          discountAccount.accountNumber,
          `${discountAccount.accountNumber}.01`,
          'Descuentos Manuales',
          legalEntityId
        );

        const promotionsSubaccount = await createSubaccountIfNeeded(
          prisma,
          discountAccount.accountNumber,
          `${discountAccount.accountNumber}.02`,
          'Promociones',
          legalEntityId
        );

        // 2. Mapear categorías de tipos de promoción
        if (promotionsSubaccount) {
          const promotionCategories = [
            { code: 'PROMO_TYPE_PERCENTAGE_DISCOUNT', name: 'Descuento Porcentual', number: `${promotionsSubaccount.accountNumber}.01` },
            { code: 'PROMO_TYPE_FIXED_AMOUNT_DISCOUNT', name: 'Descuento Cantidad Fija', number: `${promotionsSubaccount.accountNumber}.02` },
            { code: 'PROMO_TYPE_BUY_X_GET_Y_SERVICE', name: 'Compra X Obtén Y (Servicios)', number: `${promotionsSubaccount.accountNumber}.03` },
            { code: 'PROMO_TYPE_BUY_X_GET_Y_PRODUCT', name: 'Compra X Obtén Y (Productos)', number: `${promotionsSubaccount.accountNumber}.04` },
            { code: 'PROMO_TYPE_POINTS_MULTIPLIER', name: 'Multiplicador de Puntos', number: `${promotionsSubaccount.accountNumber}.05` },
            { code: 'PROMO_TYPE_FREE_SHIPPING', name: 'Envío Gratuito', number: `${promotionsSubaccount.accountNumber}.06` }
          ];

          for (const category of promotionCategories) {
            const categoryAccount = await createSubaccountIfNeeded(
              prisma,
              promotionsSubaccount.accountNumber,
              category.number,
              category.name,
              legalEntityId
            );

            if (categoryAccount) {
              const existingMapping = await prisma.discountTypeAccountMapping.findFirst({
                where: {
                  discountTypeCode: category.code,
                  legalEntityId
                }
              });

              if (!existingMapping || forceRemap) {
                await prisma.discountTypeAccountMapping.upsert({
                  where: {
                    discountTypeCode_legalEntityId: {
                      discountTypeCode: category.code,
                      legalEntityId
                    }
                  },
                  update: {
                    accountId: categoryAccount.id
                  },
                  create: {
                    discountTypeCode: category.code,
                    discountTypeName: category.name,
                    accountId: categoryAccount.id,
                    legalEntityId,
                    systemId
                  }
                });
                results.discounts.mapped++;
                results.discounts.details.push({
                  code: category.code,
                  name: category.name,
                  account: category.number
                });
              }
            }
          }
        }

        // 3. Mapear descuentos manuales
        if (manualDiscountsSubaccount) {
          const manualDiscountMapping = await createSubaccountIfNeeded(
            prisma,
            manualDiscountsSubaccount.accountNumber,
            `${manualDiscountsSubaccount.accountNumber}.01`,
            'Descuento Manual',
            legalEntityId
          );
          
          if (manualDiscountMapping) {
            const existingMapping = await prisma.discountTypeAccountMapping.findFirst({
              where: {
                discountTypeCode: 'MANUAL_DISCOUNT',
                legalEntityId
              }
            });

            if (!existingMapping || forceRemap) {
              await prisma.discountTypeAccountMapping.upsert({
                where: {
                  discountTypeCode_legalEntityId: {
                    discountTypeCode: 'MANUAL_DISCOUNT',
                    legalEntityId
                  }
                },
                update: {
                  accountId: manualDiscountMapping.id
                },
                create: {
                  discountTypeCode: 'MANUAL_DISCOUNT',
                  discountTypeName: 'Descuento Manual',
                  accountId: manualDiscountMapping.id,
                  legalEntityId,
                  systemId
                }
              });
              discountsMapped++;
              results.discounts.mapped++;
              results.discounts.details.push({
                code: 'MANUAL_DISCOUNT',
                name: 'Descuento Manual',
                account: `${manualDiscountsSubaccount.accountNumber}.01`
              });
            }
          }
        }

        // 4. Mapear promociones individuales
        // Definir las subcuentas para cada tipo de promoción
        const promotionTypeAccounts = promotionsSubaccount ? {
          PERCENTAGE_DISCOUNT: { number: `${promotionsSubaccount.accountNumber}.01`, name: 'Descuentos Porcentaje' },
          FIXED_AMOUNT_DISCOUNT: { number: `${promotionsSubaccount.accountNumber}.02`, name: 'Descuentos Importe Fijo' },
          BUY_X_GET_Y_SERVICE: { number: `${promotionsSubaccount.accountNumber}.03`, name: 'Compra X Llévate Y Servicio' },
          BUY_X_GET_Y_PRODUCT: { number: `${promotionsSubaccount.accountNumber}.04`, name: 'Compra X Llévate Y Producto' },
          POINTS_MULTIPLIER: { number: `${promotionsSubaccount.accountNumber}.05`, name: 'Multiplicador de Puntos' },
          FREE_SHIPPING: { number: `${promotionsSubaccount.accountNumber}.06`, name: 'Envío Gratis' }
        } : {};

        // Crear subcuentas por tipo de promoción
        const typeSubaccounts: Record<string, any> = {};
        for (const [type, accountInfo] of Object.entries(promotionTypeAccounts)) {
          typeSubaccounts[type] = await createSubaccountIfNeeded(
            prisma,
            promotionsSubaccount.accountNumber,
            accountInfo.number,
            accountInfo.name,
            legalEntityId
          );
        }

        // Obtener promociones activas
        const promotions = await prisma.promotion.findMany({
          where: {
            systemId,
            isActive: true,
            applicableClinics: {
              some: {
                clinic: {
                  legalEntityId
                }
              }
            }
          },
          include: {
            applicableClinics: {
              include: {
                clinic: true
              }
            }
          }
        });

        // También obtener promociones globales (sin clínicas específicas)
        const globalPromotions = await prisma.promotion.findMany({
          where: {
            systemId,
            isActive: true,
            applicableClinics: {
              none: {}
            }
          }
        });

        const allPromotions = [...promotions, ...globalPromotions];

        // Agrupar promociones por tipo
        const promotionsByType = allPromotions.reduce((acc, promo) => {
          if (!acc[promo.type]) {
            acc[promo.type] = [];
          }
          acc[promo.type].push(promo);
          return acc;
        }, {} as Record<string, typeof allPromotions>);

        // Mapear cada promoción bajo su tipo correspondiente
        for (const [type, promos] of Object.entries(promotionsByType)) {
          const typeSubaccount = typeSubaccounts[type];
          if (!typeSubaccount) continue;

          // Obtener el último número usado para este tipo
          const existingMappings = await prisma.discountTypeAccountMapping.findMany({
            where: {
              legalEntityId
            },
            include: {
              account: {
                select: {
                  accountNumber: true
                }
              }
            }
          });

          // Filtrar solo los que corresponden a este tipo
          const relevantMappings = existingMappings.filter(mapping => 
            mapping.account && mapping.account.accountNumber.startsWith(promotionTypeAccounts[type as keyof typeof promotionTypeAccounts].number + '.')
          );

          let nextNumber = 1;
          if (relevantMappings.length > 0) {
            // Ordenar por número para obtener el último
            const sortedMappings = relevantMappings.sort((a, b) => {
              const aNum = parseInt(a.account.accountNumber.split('.').pop() || '0');
              const bNum = parseInt(b.account.accountNumber.split('.').pop() || '0');
              return bNum - aNum;
            });
            
            const lastNumber = sortedMappings[0].account.accountNumber;
            const match = lastNumber.match(/\.(\d{3})$/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }

          // Mapear cada promoción
          for (const promotion of promos) {
            try {
              const promotionNumber = `${promotionTypeAccounts[type as keyof typeof promotionTypeAccounts].number}.${nextNumber.toString().padStart(3, '0')}`;
              const promotionName = `${promotion.name}${promotion.code ? ` (${promotion.code})` : ''}`;

              const subaccount = await createSubaccountIfNeeded(
                prisma,
                typeSubaccount.accountNumber,
                promotionNumber,
                promotionName,
                legalEntityId
              );

              if (subaccount) {
                const existingMapping = await prisma.discountTypeAccountMapping.findFirst({
                  where: {
                    discountTypeCode: promotion.code || promotion.id,
                    legalEntityId
                  }
                });

                if (!existingMapping || forceRemap) {
                  await prisma.discountTypeAccountMapping.upsert({
                    where: {
                      discountTypeCode_legalEntityId: {
                        discountTypeCode: promotion.code || promotion.id,
                        legalEntityId
                      }
                    },
                    update: {
                      accountId: subaccount.id
                    },
                    create: {
                      discountTypeCode: promotion.code || promotion.id,
                      discountTypeName: promotionName,
                      accountId: subaccount.id,
                      legalEntityId,
                      systemId
                    }
                  });
                  discountsMapped++;
                  results.discounts.mapped++;
                  results.discounts.details.push({
                    code: promotion.code || promotion.id,
                    name: promotionName,
                    account: promotionNumber
                  });
                }

                nextNumber++;
              }
            } catch (error) {
              console.error(`Error mapping promotion ${promotion.name}:`, error);
              results.discounts.errors++;
            }
          }
        }

        results.discounts.mapped = discountsMapped;
        console.log(`Descuentos y promociones mapeados: ${discountsMapped}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Mapeo automático completado. Categorías: ${categoriesMapped}, Productos: ${productsMapped}, Servicios: ${servicesMapped}, Métodos de pago: ${paymentMethodsMapped}, Tipos de IVA: ${vatTypesMapped}, Bancos: ${results.banks.mapped}, Descuentos: ${discountsMapped}. Subcuentas creadas: ${subaccountsCreated}`,
      mappings: {
        categories: categoriesMapped,
        products: productsMapped,
        services: servicesMapped,
        paymentMethods: paymentMethodsMapped,
        vatTypes: vatTypesMapped,
        banks: results.banks.mapped,
        discounts: discountsMapped,
        subaccountsCreated: subaccountsCreated
      },
      results: results,
      createdSubaccounts: createdSubaccounts
    });

  } catch (error) {
    console.error('Error in auto-map all:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático masivo' },
      { status: 500 }
    );
  }
}
