'use server';

import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { 
  BASIC_ACCOUNTS_BY_COUNTRY, 
  PAYMENT_METHOD_MAPPINGS,
  type BasicAccount 
} from '@/config/accounting/basic-accounts';
import { 
  SERIES_TEMPLATES_BY_COUNTRY,
  generateSeriesCode,
  generateSeriesName
} from '@/config/accounting/basic-series';
import { createSeriesForAllClinics } from '@/app/(main)/configuracion/contabilidad/lib/accounting-sync';
import {
  getAutoServiceMapping,
  getAutoProductMapping,
  getAutoCategoryMapping,
  getAutoPaymentMethodMapping,
  getAutoVATMapping
} from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';
import { generateClinicCode, generateNextSubaccountNumber } from '@/lib/accounting/clinic-utils';
import { UnifiedMappingService } from '@/lib/accounting/unified-mapping-service';

// Tipos de métodos de pago del enum de Prisma
const PAYMENT_METHOD_TYPES = [
  'CASH',
  'CARD', 
  'BANK_TRANSFER',
  'ONLINE_GATEWAY',
  'CHECK',
  'INTERNAL_CREDIT',
  'DEFERRED_PAYMENT',
  'OTHER'
] as const;

// Nombres traducidos por idioma
const PAYMENT_METHOD_NAMES: Record<string, Record<string, string>> = {
  CASH: { es: 'Efectivo', fr: 'Espèces', en: 'Cash' },
  CARD: { es: 'Tarjeta', fr: 'Carte', en: 'Card' },
  BANK_TRANSFER: { es: 'Transferencia', fr: 'Virement', en: 'Transfer' },
  ONLINE_GATEWAY: { es: 'Pasarela Online', fr: 'Passerelle', en: 'Online Gateway' },
  CHECK: { es: 'Cheque', fr: 'Chèque', en: 'Check' },
  INTERNAL_CREDIT: { es: 'Crédito Interno', fr: 'Crédit Interne', en: 'Internal Credit' },
  DEFERRED_PAYMENT: { es: 'Pago Aplazado', fr: 'Paiement Différé', en: 'Deferred Payment' },
  OTHER: { es: 'Otros', fr: 'Autres', en: 'Other' }
};

// Estado inicial de activación por defecto
const DEFAULT_ACTIVE_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'INTERNAL_CREDIT', 'DEFERRED_PAYMENT'];

// Definición de tipos de IVA por país
const VAT_TYPES_BY_COUNTRY: Record<string, Array<{ code: string; name: string; rate: number; isDefault?: boolean }>> = {
  ES: [
    { code: 'VAT_STANDARD', name: 'IVA General', rate: 21, isDefault: true },
    { code: 'VAT_REDUCED', name: 'IVA Reducido', rate: 10 },
    { code: 'VAT_SUPER_REDUCED', name: 'IVA Superreducido', rate: 4 },
    { code: 'VAT_EXEMPT', name: 'Exento de IVA', rate: 0 }
  ],
  FR: [
    { code: 'VAT_STANDARD', name: 'TVA Normal', rate: 20, isDefault: true },
    { code: 'VAT_INTERMEDIATE', name: 'TVA Intermédiaire', rate: 10 },
    { code: 'VAT_REDUCED', name: 'TVA Réduit', rate: 5.5 },
    { code: 'VAT_SUPER_REDUCED', name: 'TVA Super Réduit', rate: 2.1 },
    { code: 'VAT_EXEMPT', name: 'Exonéré de TVA', rate: 0 }
  ],
  MA: [
    { code: 'VAT_STANDARD', name: 'TVA Normal', rate: 20, isDefault: true },
    { code: 'VAT_REDUCED_14', name: 'TVA Réduit 14%', rate: 14 },
    { code: 'VAT_REDUCED_10', name: 'TVA Réduit 10%', rate: 10 },
    { code: 'VAT_REDUCED_7', name: 'TVA Réduit 7%', rate: 7 },
    { code: 'VAT_EXEMPT', name: 'Exonéré de TVA', rate: 0 }
  ],
  PT: [
    { code: 'VAT_STANDARD', name: 'IVA Normal', rate: 23, isDefault: true },
    { code: 'VAT_INTERMEDIATE', name: 'IVA Intermédio', rate: 13 },
    { code: 'VAT_REDUCED', name: 'IVA Reduzido', rate: 6 },
    { code: 'VAT_EXEMPT', name: 'Isento de IVA', rate: 0 }
  ],
  IT: [
    { code: 'VAT_STANDARD', name: 'IVA Ordinaria', rate: 22, isDefault: true },
    { code: 'VAT_REDUCED', name: 'IVA Ridotta', rate: 10 },
    { code: 'VAT_SUPER_REDUCED', name: 'IVA Super Ridotta', rate: 4 },
    { code: 'VAT_EXEMPT', name: 'Esente IVA', rate: 0 }
  ],
  DE: [
    { code: 'VAT_STANDARD', name: 'Regelsteuersatz', rate: 19, isDefault: true },
    { code: 'VAT_REDUCED', name: 'Ermäßigter Steuersatz', rate: 7 },
    { code: 'VAT_EXEMPT', name: 'Steuerfrei', rate: 0 }
  ],
  GB: [
    { code: 'VAT_STANDARD', name: 'Standard Rate', rate: 20, isDefault: true },
    { code: 'VAT_REDUCED', name: 'Reduced Rate', rate: 5 },
    { code: 'VAT_ZERO', name: 'Zero Rate', rate: 0 }
  ],
  US: [
    { code: 'NO_TAX', name: 'No Tax', rate: 0, isDefault: true },
    { code: 'SALES_TAX_5', name: 'Sales Tax 5%', rate: 5 },
    { code: 'SALES_TAX_7', name: 'Sales Tax 7%', rate: 7 },
    { code: 'SALES_TAX_10', name: 'Sales Tax 10%', rate: 10 }
  ]
};

export async function quickSetupAccounting(
  legalEntityId: string,
  countryCode: string
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) throw new Error('No autorizado');

  // Obtener la entidad legal con sus clínicas
  const legalEntity = await prisma.legalEntity.findUnique({
    where: { id: legalEntityId },
    include: { 
      system: true,
      clinics: {
        select: {
          id: true,
          name: true,
          prefix: true
        }
      }
    }
  });
  
  if (!legalEntity) throw new Error('Entidad legal no encontrada');

  const accounts = BASIC_ACCOUNTS_BY_COUNTRY[countryCode] || [];
  if (accounts.length === 0) throw new Error(`País ${countryCode} no soportado`);

  const seriesTemplates = SERIES_TEMPLATES_BY_COUNTRY[countryCode];
  if (!seriesTemplates) throw new Error(`Series para país ${countryCode} no configuradas`);

  // Usar las clínicas de la entidad legal (puede estar vacío)
  const clinics = await prisma.clinic.findMany({
    where: { 
      legalEntityId: legalEntity.id
    }
  });

  // Obtener las cuentas bancarias del sistema
  const bankAccounts = await prisma.bankAccount.count({
    where: {
      systemId: legalEntity.systemId,
      isActive: true
    }
  });

  // Log informativo
  console.log(`Configurando contabilidad para ${legalEntity.name}:`);
  console.log(`- Clínicas asociadas: ${clinics.length}`);
  console.log(`- Cuentas bancarias activas en el sistema: ${bankAccounts}`);
  console.log(`- País: ${countryCode}`);

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Crear el plan de cuentas básico (siempre se hace)
      console.log('Creando plan de cuentas básico...');
      const accountsCreated = await createBasicAccounts(tx, legalEntity, countryCode);
      
      // 2. Crear todos los métodos de pago del sistema (siempre se hace)
      console.log('Creando métodos de pago...');
      const paymentMethodsCreated = await createPaymentMethods(tx, legalEntity.systemId, countryCode);
      
      // 3. Crear ejercicio fiscal del año actual
      console.log('Creando ejercicio fiscal...');
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1); // 1 de enero
      const endDate = new Date(currentYear, 11, 31); // 31 de diciembre
      
      // Verificar si ya existe un ejercicio fiscal para este año
      const existingFiscalYear = await tx.fiscalYear.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          name: `Ejercicio ${currentYear}`
        }
      });
      
      let fiscalYearCreated = false;
      if (!existingFiscalYear) {
        const fiscalYear = await tx.fiscalYear.create({
          data: {
            name: `Ejercicio ${currentYear}`,
            startDate,
            endDate,
            status: 'OPEN',
            legalEntityId: legalEntity.id,
            systemId: legalEntity.systemId
          }
        });
        console.log(`Ejercicio fiscal ${currentYear} creado`);
        fiscalYearCreated = true;
      } else {
        console.log(`Ejercicio fiscal ${currentYear} ya existe`);
      }
      
      // 4. Crear series de documentos si hay clínicas
      let seriesCreated = 0;
      if (clinics.length > 0) {
        console.log(`Creando series de documentos para ${clinics.length} clínicas...`);
        seriesCreated = await createSeriesForAllClinics(tx, legalEntityId);
        console.log(`${seriesCreated} series de documentos creadas`);
      } else {
        console.log('No hay clínicas asociadas. Las series se crearán cuando se asocien clínicas.');
      }
      
      // 5. Ejecutar mapeos automáticos
      const chartOfAccounts = await tx.chartOfAccountEntry.findMany({
        where: { legalEntityId: legalEntityId },
        select: { 
          id: true, 
          accountNumber: true, 
          name: true,
          level: true,
          isActive: true,
          type: true
        }
      });
      
      const mappingsCreated = await executeAutoMappings(tx, legalEntity, countryCode, chartOfAccounts, session);
      
      return {
        success: true,
        accountsCreated,
        paymentMethodsCreated,
        seriesCreated,
        clinicsProcessed: clinics.length,
        fiscalYearCreated: fiscalYearCreated ? currentYear : null,
        mappingsCreated,
        message: clinics.length === 0 
          ? `Configuración básica creada${fiscalYearCreated ? ` con ejercicio fiscal ${currentYear}` : ''}. Las series documentales se crearán cuando se asocien clínicas.`
          : `Configuración completa creada${fiscalYearCreated ? ` con ejercicio fiscal ${currentYear}` : ''} y series documentales.`
      };
    }, {
      maxWait: 300000, // 5 minutos
      timeout: 300000, // 5 minutos
    });
  } catch (error) {
    console.error('Error en quick setup:', error);
    
    // Si es un error de constraint único, dar mensaje más específico
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new Error('Ya existe un plan de cuentas para esta sociedad. Use el botón de reset si desea empezar de nuevo.');
    }
    
    // Si es otro tipo de error Prisma
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      throw new Error(`Error de base de datos (${error.code}): ${error.message}`);
    }
    
    throw new Error('Error al configurar el sistema contable');
  }
}

async function createBasicAccounts(
  tx: any,
  legalEntity: { id: string; systemId: string },
  country: string
) {
  const accounts = BASIC_ACCOUNTS_BY_COUNTRY[country] || [];

  if (accounts.length === 0) {
    throw new Error(`No hay cuentas disponibles para el país ${country}`);
  }

  // Verificar primero qué cuentas ya existen
  const existingAccounts = await tx.chartOfAccountEntry.findMany({
    where: {
      legalEntityId: legalEntity.id,
      accountNumber: {
        in: accounts.map(a => a.accountNumber)
      }
    },
    select: {
      id: true,
      accountNumber: true
    }
  });

  const existingAccountNumbers = new Set(existingAccounts.map(a => a.accountNumber));
  const accountIdMap = new Map<string, string>();
  
  // Mapear las cuentas existentes
  existingAccounts.forEach(acc => {
    accountIdMap.set(acc.accountNumber, acc.id);
  });

  console.log(`[createBasicAccounts] LegalEntityId: ${legalEntity.id}`);
  console.log(`[createBasicAccounts] SystemId: ${legalEntity.systemId}`);
  console.log(`[createBasicAccounts] Cuentas ya existentes: ${existingAccounts.length} de ${accounts.length}`);
  console.log(`[createBasicAccounts] Números existentes:`, Array.from(existingAccountNumbers));
  
  // Si ya existen todas las cuentas, no hacer nada
  if (existingAccounts.length === accounts.length) {
    console.log('El plan de cuentas ya está completo, no se requiere acción');
    return 0;
  }

  // Preparar las cuentas a crear
  const accountsToCreate = accounts.filter(a => !existingAccountNumbers.has(a.accountNumber));
  
  // Eliminar duplicados por accountNumber
  const uniqueAccountsToCreate = accountsToCreate.filter((account, index, self) => 
    index === self.findIndex(a => a.accountNumber === account.accountNumber)
  );
  
  console.log(`[createBasicAccounts] Cuentas por crear: ${uniqueAccountsToCreate.length}`);
  console.log(`[createBasicAccounts] Números a crear:`, uniqueAccountsToCreate.map(a => a.accountNumber));
  
  // Separar cuentas padre e hijas
  const parentAccounts = uniqueAccountsToCreate.filter(a => !a.parentNumber);
  const childAccounts = uniqueAccountsToCreate.filter(a => a.parentNumber);

  let created = 0;

  // Crear todas las cuentas padre de una sola vez
  if (parentAccounts.length > 0) {
    console.log(`[createBasicAccounts] Creando ${parentAccounts.length} cuentas padre...`);
    console.log(`[createBasicAccounts] Cuentas padre a crear:`, parentAccounts.map(a => ({
      num: a.accountNumber,
      name: a.name
    })));
    
    try {
      const createdParents = await tx.chartOfAccountEntry.createMany({
        data: parentAccounts.map(account => ({
          legalEntityId: legalEntity.id,
          systemId: legalEntity.systemId,
          accountNumber: account.accountNumber,
          name: account.name,
          type: account.type,
          isMonetary: account.isMonetary ?? false,
          allowsDirectEntry: account.allowDirectEntry ?? true,
          isActive: true,
          level: 0,
          isSubAccount: false
        }))
      });
      created += createdParents.count;

      // Obtener los IDs de las cuentas padre recién creadas
      const newParents = await tx.chartOfAccountEntry.findMany({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: {
            in: parentAccounts.map(a => a.accountNumber)
          }
        },
        select: {
          id: true,
          accountNumber: true
        }
      });

      newParents.forEach(acc => {
        accountIdMap.set(acc.accountNumber, acc.id);
      });
    } catch (error: any) {
      console.error('[createBasicAccounts] Error creando cuentas padre:', error);
      
      // Si es un error de constraint único, intentar identificar qué cuenta está duplicada
      if (error.code === 'P2002') {
        // Verificar cuáles cuentas ya existen
        const conflictingAccounts = await tx.chartOfAccountEntry.findMany({
          where: {
            legalEntityId: legalEntity.id,
            systemId: legalEntity.systemId,
            accountNumber: {
              in: parentAccounts.map(a => a.accountNumber)
            }
          },
          select: {
            accountNumber: true,
            name: true
          }
        });
        
        console.error('[createBasicAccounts] Cuentas que ya existen:', conflictingAccounts);
        throw new Error(`Las siguientes cuentas ya existen: ${conflictingAccounts.map(a => a.accountNumber).join(', ')}`);
      }
      
      throw error;
    }
  }

  // Crear las cuentas hijas una por una para poder establecer el parentAccountId
  for (const childAccount of childAccounts) {
    const parentId = accountIdMap.get(childAccount.parentNumber!);
    
    if (!parentId) {
      // Si no encontramos el padre, lo buscamos en la BD
      const parentAccount = await tx.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: childAccount.parentNumber
        }
      });
      
      if (parentAccount) {
        accountIdMap.set(childAccount.parentNumber!, parentAccount.id);
      }
    }

    try {
      await tx.chartOfAccountEntry.create({
        data: {
          legalEntityId: legalEntity.id,
          systemId: legalEntity.systemId,
          accountNumber: childAccount.accountNumber,
          name: childAccount.name,
          type: childAccount.type,
          isMonetary: childAccount.isMonetary ?? false,
          allowsDirectEntry: childAccount.allowDirectEntry ?? true,
          isActive: true,
          level: 1,
          isSubAccount: true,
          parentAccountId: accountIdMap.get(childAccount.parentNumber!)
        }
      });
      created++;
    } catch (error) {
      console.error('[createBasicAccounts] Error creando cuenta hija:', error);
    }
  }
  
  return created;
}

async function executeAutoMappings(
  tx: any,
  legalEntity: { id: string; systemId: string },
  countryCode: string,
  chartOfAccounts: Array<{ id: string; accountNumber: string; name: string; level: number; isActive: boolean; type?: string }>,
  session: any
) {
  const mappingsCreated = {
    categories: 0,
    services: 0,
    products: 0,
    paymentMethods: 0,
    vat: 0,
    banks: 0,
    cashSessions: 0,  // Cambiado de 'cashes' a 'cashSessions'
    expenses: 0,
    promotions: 0
  };

  try {
    // 1. Mapear categorías
    const categories = await tx.category.findMany({
      where: { systemId: legalEntity.systemId },
      include: {
        products: { select: { id: true } },
        services: { select: { id: true } }
      }
    });
    
    const countryAccounts = await getCountrySpecificAccounts(countryCode);
    
    for (const category of categories) {
      // Determinar si la categoría tiene productos y/o servicios
      const hasProducts = category.products.length > 0;
      const hasServices = category.services.length > 0;
      
      // Solo mapear si la categoría tiene productos o servicios
      if (!hasProducts && !hasServices) {
        continue;
      }
      
      const existingMapping = await tx.categoryAccountMapping.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          categoryId: category.id
        }
      });
      
      if (!existingMapping) {
        // Determinar la cuenta base según el tipo
        let accountNumber: string;
        let appliesToServices = false;
        let appliesToProducts = false;
        
        if (hasServices && hasProducts) {
          // Categoría mixta: usar cuenta de servicios como base
          // Las subcuentas se crearán dinámicamente: 712.xxx para servicios, 711.xxx para productos
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
        
        const parentAccount = chartOfAccounts.find(acc => acc.accountNumber === accountNumber);
        
        if (parentAccount) {
          await tx.categoryAccountMapping.create({
            data: {
              legalEntityId: legalEntity.id,
              categoryId: category.id,
              accountId: parentAccount.id,
              systemId: legalEntity.systemId,
              appliesToServices,
              appliesToProducts
            }
          });
          mappingsCreated.categories++;
        } else {
          console.warn(`No se encontró cuenta ${accountNumber} para categoría ${category.name}`);
        }
      }
    }

    // 2. Mapear servicios
    const services = await tx.service.findMany({
      where: { systemId: legalEntity.systemId }
    });
    
    // Usar el servicio unificado para mapear servicios
    const serviceResults = await UnifiedMappingService.mapServices(
      services,
      chartOfAccounts,
      countryCode,
      {
        legalEntityId: legalEntity.id,
        systemId: legalEntity.systemId,
        forceRemap: true // Siempre forzar remapeo en quick setup
      },
      tx // Pasar la transacción
    );

    mappingsCreated.services = serviceResults.mapped;

    // 3. Mapear productos
    const products = await tx.product.findMany({
      where: { systemId: legalEntity.systemId },
      include: { settings: true }  // Incluir settings para tener isForSale
    });
    
    // Usar el servicio unificado para mapear productos
    const productResults = await UnifiedMappingService.mapProducts(
      products,
      chartOfAccounts,
      countryCode,
      {
        legalEntityId: legalEntity.id,
        systemId: legalEntity.systemId,
        forceRemap: true // Siempre forzar remapeo en quick setup
      },
      tx // Pasar la transacción
    );

    mappingsCreated.products = productResults.mapped;

    // 4. Mapear métodos de pago
    const paymentMethods = await tx.paymentMethodDefinition.findMany({
      where: { systemId: legalEntity.systemId }
    });
    
    // Usar el servicio unificado para mapear métodos de pago
    const paymentMethodResults = await UnifiedMappingService.mapPaymentMethods(
      paymentMethods,
      chartOfAccounts,
      countryCode,
      {
        legalEntityId: legalEntity.id,
        systemId: legalEntity.systemId,
        forceRemap: true // Siempre forzar remapeo en quick setup
      },
      tx // Pasar la transacción
    );

    mappingsCreated.paymentMethods = paymentMethodResults.mapped;

    // 5. Mapear cajas y sesiones de caja
    const cashAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        legalEntityId: legalEntity.id,
        accountNumber: (await getCountrySpecificAccounts(countryCode)).cash || (countryCode === 'ES' ? '570' : '521')
      }
    });
    
    if (cashAccount) {
      // Obtener las clínicas de la entidad legal
      const clinics = await tx.clinic.findMany({
        where: { 
          legalEntityId: legalEntity.id
        }
      });
      
      // Mapear cajas físicas por clínica
      for (const clinic of clinics) {
        // Verificar si ya existe un mapeo para esta clínica
        const existingClinicMapping = await tx.cashSessionAccountMapping.findFirst({
          where: {
            legalEntityId: legalEntity.id,
            clinicId: clinic.id
          }
        });
        
        if (!existingClinicMapping) {
          // Si hay múltiples clínicas, crear subcuentas específicas
          if (clinics.length > 1) {
            const clinicCode = clinic.prefix || 'GEN';
            const subaccountCode = `${cashAccount.accountNumber}.${clinicCode}`;
            
            // Verificar si la subcuenta ya existe
            let clinicCashSubaccount = await tx.chartOfAccountEntry.findFirst({
              where: {
                legalEntityId: legalEntity.id,
                accountNumber: subaccountCode
              }
            });
            
            if (!clinicCashSubaccount) {
              // Buscar en la base de datos por si fue creada recientemente
              clinicCashSubaccount = await tx.chartOfAccountEntry.findFirst({
                where: {
                  accountNumber: subaccountCode,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            if (!clinicCashSubaccount) {
              clinicCashSubaccount = await tx.chartOfAccountEntry.create({
                data: {
                  accountNumber: subaccountCode,
                  name: `Caja - ${clinic.name}`,
                  type: 'ASSET',
                  isSubAccount: true,
                  parentAccountId: cashAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            // Crear mapeo para la caja de la clínica
            await tx.cashSessionAccountMapping.create({
              data: {
                legalEntityId: legalEntity.id,
                clinicId: clinic.id,
                accountId: clinicCashSubaccount.id,
                systemId: legalEntity.systemId
              }
            });
            mappingsCreated.cashSessions++;
          } else {
            // Solo una clínica, usar la cuenta de caja principal
            await tx.cashSessionAccountMapping.create({
              data: {
                legalEntityId: legalEntity.id,
                clinicId: clinic.id,
                accountId: cashAccount.id,
                systemId: legalEntity.systemId
              }
            });
            mappingsCreated.cashSessions++;
          }
        }
      }
      
      // Mapear TPV (POS Terminals) si existen
      const posTerminals = await tx.posTerminal.findMany({
        where: { systemId: legalEntity.systemId }
      });
      
      for (const terminal of posTerminals) {
        const existingTerminalMapping = await tx.cashSessionAccountMapping.findFirst({
          where: {
            legalEntityId: legalEntity.id,
            posTerminalId: terminal.id
          }
        });
        
        if (!existingTerminalMapping) {
          // Los TPV normalmente van a cuentas bancarias, no a caja
          const bankAccount = chartOfAccounts.find(account => 
            account.accountNumber === '572' || 
            account.accountNumber.startsWith('572')
          );
          
          if (bankAccount) {
            await tx.cashSessionAccountMapping.create({
              data: {
                legalEntityId: legalEntity.id,
                systemId: legalEntity.systemId,
                clinicId: null,
                accountId: bankAccount.id,
                posTerminalId: terminal.id
              }
            });
            mappingsCreated.cashSessions++;
          }
        }
      }
    } else {
      console.warn('No se encontró cuenta de caja en el plan contable');
    }

    // 6. Mapear bancos y cuentas bancarias
    const banks = await tx.bank.findMany({
      where: { systemId: legalEntity.systemId },
      include: {
        bankAccounts: {
          where: { isActive: true }
        }
      }
    });
    
    const bankAccountNumber = (await getCountrySpecificAccounts(countryCode)).banks;
    const bankAccount = chartOfAccounts.find(acc => acc.accountNumber === bankAccountNumber);
    
    if (bankAccount) {
      // Primero, obtener todos los bancos sin mapeo
      const banksToMap = banks.filter(bank => !bank.accountId);
      
      // Mapear todos los bancos sin mapeo de una vez
      if (banksToMap.length > 0) {
        await tx.bank.updateMany({
          where: {
            id: { in: banksToMap.map(b => b.id) }
          },
          data: { accountId: bankAccount.id }
        });
        mappingsCreated.banks += banksToMap.length;
      }
      
      // Ahora procesar las cuentas bancarias
      for (const bank of banks) {
        for (const bankAccountItem of bank.bankAccounts) {
          if (!bankAccountItem.accountId) {
            // Crear subcuenta específica para la cuenta bancaria
            const bankCode = bank.code || 'BANK';
            const accountCode = bankAccountItem.accountNumber?.slice(-4) || 'XXXX';
            const subaccountNumber = `${bankAccountNumber}.${bankCode}.${accountCode}`;
            
            // Verificar si la subcuenta ya existe
            let subaccount = chartOfAccounts.find(acc => acc.accountNumber === subaccountNumber);
            
            if (!subaccount) {
              // Buscar en la base de datos por si fue creada recientemente
              subaccount = await tx.chartOfAccountEntry.findFirst({
                where: {
                  accountNumber: subaccountNumber,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            if (!subaccount) {
              subaccount = await tx.chartOfAccountEntry.create({
                data: {
                  accountNumber: subaccountNumber,
                  name: `${bank.name} - ${bankAccountItem.accountNumber || 'Cuenta'}`,
                  type: bankAccount.type,
                  description: `Subcuenta bancaria para ${bank.name}`,
                  isSubAccount: true,
                  parentAccountId: bankAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            if (subaccount) {
              await tx.bankAccount.update({
                where: { id: bankAccountItem.id },
                data: { accountId: subaccount.id }
              });
              mappingsCreated.banks++;
            }
          }
        }
      }
    } else {
      console.warn(`No se encontró cuenta ${bankAccountNumber} para bancos`);
    }

    // 7. Mapear tipos de IVA
    const vatTypesDefinitions = VAT_TYPES_BY_COUNTRY[countryCode] || [];
    
    // Primero crear los tipos de IVA si no existen
    for (const vatDef of vatTypesDefinitions) {
      const existingVat = await tx.vATType.findFirst({
        where: {
          systemId: legalEntity.systemId,
          code: vatDef.code
        }
      });
      
      if (!existingVat) {
        await tx.vATType.create({
          data: {
            systemId: legalEntity.systemId,
            code: vatDef.code,
            name: vatDef.name,
            rate: vatDef.rate,
            isDefault: vatDef.isDefault || false
          }
        });
      }
    }
    
    // Ahora obtener todos los tipos de IVA y mapearlos
    const vatTypes = await tx.vATType.findMany({
      where: { systemId: legalEntity.systemId },
    });
    
    // Obtener el mapeo de cuentas para IVA
    const vatMapping = await getAutoVATMapping(chartOfAccounts, countryCode);
    
    if (vatMapping && vatMapping.inputAccount && vatMapping.outputAccount) {
      // Buscar cuentas de IVA soportado y repercutido
      const inputAccount = await tx.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: vatMapping.inputAccount
        }
      });
      
      const outputAccount = await tx.chartOfAccountEntry.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          accountNumber: vatMapping.outputAccount
        }
      });
      
      // Mapear cada tipo de IVA
      for (const vat of vatTypes) {
        // Verificar si ya existe un mapeo para este tipo de IVA
        const existingMapping = await tx.vATTypeAccountMapping.findFirst({
          where: {
            vatTypeId: vat.id,
            legalEntityId: legalEntity.id,
            clinicId: null
          }
        });
        
        if (!existingMapping && (inputAccount || outputAccount)) {
          await tx.vATTypeAccountMapping.create({
            data: {
              legalEntityId: legalEntity.id,
              systemId: legalEntity.systemId,
              vatTypeId: vat.id,
              inputAccountId: inputAccount?.id || null,
              outputAccountId: outputAccount?.id || null
            }
          });
          mappingsCreated.vat++;
        }
      }
      
      if (!inputAccount) {
        console.warn(`No se encontró cuenta ${vatMapping.inputAccount} para IVA soportado`);
      }
      if (!outputAccount) {
        console.warn(`No se encontró cuenta ${vatMapping.outputAccount} para IVA repercutido`);
      }
    } else {
      console.warn(`No se encontró configuración de mapeo de IVA para el país ${countryCode}`);
    }
    
    // 8. Mapear categorías de gastos
    const expenseCategories = await tx.expenseType.findMany({
      where: { systemId: legalEntity.systemId }
    });
    
    for (const expense of expenseCategories) {
      const existingMapping = await tx.expenseTypeAccountMapping.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          expenseTypeId: expense.id
        }
      });
      
      if (!existingMapping) {
        // Usar cuenta genérica de gastos según el país
        const expenseAccount = BASIC_ACCOUNTS_BY_COUNTRY[countryCode]?.find(
          acc => acc.type === 'EXPENSE' && acc.allowDirectEntry
        );
        
        if (expenseAccount) {
          const parentAccount = chartOfAccounts.find(acc => acc.accountNumber === expenseAccount.accountNumber);
          
          if (parentAccount) {
            // Crear subcuenta específica para la categoría de gastos y clínica
            const clinicCode = 'GEN';
            const expenseCode = expense.name.substring(0, 3).toUpperCase();
            const subaccountNumber = `${parentAccount.accountNumber}.${clinicCode}.${expenseCode}`;
            
            // Verificar si la subcuenta ya existe
            let subaccount = chartOfAccounts.find(acc => acc.accountNumber === subaccountNumber);
            
            if (!subaccount) {
              // Buscar en la base de datos por si fue creada recientemente
              subaccount = await tx.chartOfAccountEntry.findFirst({
                where: {
                  accountNumber: subaccountNumber,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            if (!subaccount) {
              subaccount = await tx.chartOfAccountEntry.create({
                data: {
                  accountNumber: subaccountNumber,
                  name: `${expense.name} - General`,
                  type: parentAccount.type,
                  description: `Subcuenta de gastos para ${expense.name} en General`,
                  isSubAccount: true,
                  parentAccountId: parentAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            await tx.expenseTypeAccountMapping.create({
              data: {
                legalEntityId: legalEntity.id,
                systemId: legalEntity.systemId,
                expenseTypeId: expense.id,
                accountId: subaccount.id
              }
            });
            mappingsCreated.expenses++;
          } else {
            console.warn(`No se encontró cuenta ${expenseAccount.accountNumber} para categoría de gastos ${expense.name}`);
          }
        }
      }
    }

    // 9. Mapear tipos de promoción
    const discountAccountNumber = getDiscountAccountByCountry(countryCode);
    const discountAccount = chartOfAccounts.find(a => a.accountNumber === discountAccountNumber);
    const clinics = await tx.clinic.findMany({
      where: { 
        legalEntityId: legalEntity.id
      }
    });
    const promotionTypes = getDiscountTypesByCountry(countryCode);
    
    if (discountAccount) {
      // Crear subcuentas para cada tipo de promoción en cada clínica
      for (const clinic of clinics) {
        const clinicCode = clinic.prefix || clinic.name.substring(0, 4).toUpperCase();
        
        // Contar las subcuentas existentes del tipo para esta clínica
        const existingSubaccounts = chartOfAccounts.filter(account => 
          account.accountNumber.startsWith(`${discountAccountNumber}.${clinicCode}.`)
        );
        
        let nextNumber = existingSubaccounts.length + 1;
        
        for (const type of promotionTypes) {
          // Verificar si ya existe mapeo
          const existingMapping = await tx.discountTypeAccountMapping.findFirst({
            where: {
              discountTypeCode: type.code,
              clinicId: clinic.id,
              legalEntityId: legalEntity.id
            }
          });
          
          if (!existingMapping) {
            const accountNumber = `${discountAccountNumber}.${clinicCode}.${String(nextNumber).padStart(3, '0')}`;
            nextNumber++;
            
            // Crear subcuenta
            let subaccount = await tx.chartOfAccountEntry.findFirst({
              where: {
                accountNumber,
                legalEntityId: legalEntity.id
              }
            });
            
            if (!subaccount) {
              subaccount = await tx.chartOfAccountEntry.create({
                data: {
                  accountNumber,
                  name: `${type.name} - ${clinic.name}`,
                  type: discountAccount.type,
                  description: `Subcuenta para ${type.name} en ${clinic.name}`,
                  isSubAccount: true,
                  parentAccountId: discountAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            // Crear mapeo
            await tx.discountTypeAccountMapping.create({
              data: {
                discountTypeCode: type.code,
                discountTypeName: type.name, // Agregar el nombre del tipo de descuento
                accountId: subaccount.id,
                systemId: legalEntity.systemId,
                legalEntityId: legalEntity.id,
                clinicId: clinic.id
              }
            });
            mappingsCreated.promotions++;
            
            // Crear mapeos de compatibilidad para tipos legacy
            if (type.legacyCodes && type.legacyCodes.length > 0) {
              for (const legacyCode of type.legacyCodes) {
                const existingLegacyMapping = await tx.discountTypeAccountMapping.findFirst({
                  where: {
                    discountTypeCode: legacyCode,
                    clinicId: clinic.id,
                    legalEntityId: legalEntity.id
                  }
                });
                
                if (!existingLegacyMapping) {
                  await tx.discountTypeAccountMapping.create({
                    data: {
                      discountTypeCode: legacyCode,
                      discountTypeName: type.name, // Agregar el nombre del tipo de descuento
                      accountId: subaccount.id,
                      systemId: legalEntity.systemId,
                      legalEntityId: legalEntity.id,
                      clinicId: clinic.id
                    }
                  });
                  mappingsCreated.promotions++;
                }
              }
            }
          }
        }
      }
      
      // 10. Mapear promociones creadas por usuarios
      // Obtener todas las promociones creadas
      const userPromotions = await tx.promotion.findMany({
        where: {
          systemId: legalEntity.systemId,
          isActive: true
        },
        include: {
          applicableClinics: {
            include: {
              clinic: true
            }
          }
        }
      });
      
      for (const promotion of userPromotions) {
        // Determinar el tipo de promoción para encontrar su cuenta padre
        const promotionTypeCode = promotionTypes.find(pt => pt.code === promotion.type)?.uniqueCode;
        if (!promotionTypeCode) {
          continue;
        }
        
        // Determinar las clínicas para esta promoción
        const isGlobalPromotion = promotion.applicableClinics.length === 0;
        const promotionClinics = isGlobalPromotion 
          ? clinics 
          : clinics.filter(clinic => 
              promotion.applicableClinics.some(scope => scope.clinicId === clinic.id)
            );
        
        for (const clinic of promotionClinics) {
          // Verificar si ya existe mapeo
          const existingMapping = await tx.promotionAccountMapping.findFirst({
            where: {
              promotionId: promotion.id,
              clinicId: clinic.id
            }
          });
          
          if (!existingMapping) {
            const clinicCode = clinic.prefix || clinic.name.substring(0, 4).toUpperCase();
            
            // Buscar la cuenta del tipo de promoción
            const typeAccountNumber = `${discountAccount.accountNumber}.${clinicCode}.${promotionTypeCode}`;
            const typeAccount = await tx.chartOfAccountEntry.findFirst({
              where: {
                accountNumber: typeAccountNumber,
                legalEntityId: legalEntity.id
              }
            });
            
            if (!typeAccount) {
              continue;
            }
            
            // Contar promociones existentes de este tipo para generar número secuencial
            const existingPromotionsOfType = await tx.promotionAccountMapping.findMany({
              where: {
                legalEntityId: legalEntity.id,
                clinicId: clinic.id
              },
              include: {
                account: true
              }
            });
            
            const sameTypePromotions = existingPromotionsOfType.filter(mapping => {
              return mapping.account?.accountNumber?.startsWith(typeAccountNumber);
            });
            
            const nextNumber = String(sameTypePromotions.length + 1).padStart(3, '0');
            const subaccountNumber = `${typeAccountNumber}.${nextNumber}`;
            
            // Crear subcuenta para la promoción
            let promotionSubaccount = await tx.chartOfAccountEntry.findFirst({
              where: {
                accountNumber: subaccountNumber,
                legalEntityId: legalEntity.id
              }
            });
            
            if (!promotionSubaccount) {
              promotionSubaccount = await tx.chartOfAccountEntry.create({
                data: {
                  accountNumber: subaccountNumber,
                  name: `${promotion.name} - ${clinic.name}`,
                  type: discountAccount.type,
                  description: `Subcuenta para promoción ${promotion.name} en ${clinic.name}`,
                  isSubAccount: true,
                  parentAccountId: typeAccount.id,
                  isMonetary: true,
                  allowsDirectEntry: true,
                  isActive: true,
                  legalEntityId: legalEntity.id,
                  systemId: legalEntity.systemId
                }
              });
            }
            
            // Crear mapeo en la tabla correcta
            await tx.promotionAccountMapping.create({
              data: {
                promotionId: promotion.id,
                accountId: promotionSubaccount.id,
                legalEntityId: legalEntity.id,
                clinicId: clinic.id,
                systemId: legalEntity.systemId
              }
            });
            mappingsCreated.promotions++;
          }
        }
      }
    } else {
      console.warn(`No se encontró cuenta ${discountAccountNumber} para promociones`);
    }
    
    console.log('Mapeos finales creados:', mappingsCreated);
    return mappingsCreated;
  } catch (error) {
    console.error('Error ejecutando mapeos automáticos:', error);
    console.error('Mapeos creados hasta el error:', mappingsCreated);
    // No lanzamos el error para que no falle toda la configuración
  }
}

async function createPaymentMethods(
  tx: any,
  systemId: string,
  countryCode: string
) {
  let created = 0;
  const mappings = PAYMENT_METHOD_MAPPINGS[countryCode] || {};
  
  // Primero, obtener todos los métodos de pago existentes
  const existingMethods = await tx.paymentMethodDefinition.findMany({
    where: {
      systemId,
      type: {
        in: PAYMENT_METHOD_TYPES
      }
    },
    select: {
      id: true,
      type: true,
      code: true
    }
  });
  
  const existingTypes = new Set(existingMethods.map(m => m.type));
  
  for (const type of PAYMENT_METHOD_TYPES) {
    if (!existingTypes.has(type)) {
      const names = PAYMENT_METHOD_NAMES[type];
      const isActive = DEFAULT_ACTIVE_METHODS.includes(type);
      
      const paymentMethod = await tx.paymentMethodDefinition.create({
        data: {
          systemId,
          name: names.es || type, // Por defecto español
          code: type,
          type,
          isActive
        }
      });
      
      // Crear el mapeo contable si existe cuenta para este país
      const accountNumber = mappings[type];
      if (accountNumber) {
        const legalEntities = await tx.legalEntity.findMany({
          where: { systemId },
          select: { id: true }
        });
        
        for (const le of legalEntities) {
          // Verificar que la cuenta exista antes de crear el mapeo
          const account = await tx.chartOfAccountEntry.findFirst({
            where: {
              legalEntityId: le.id,
              accountNumber: accountNumber
            }
          });
          
          if (account) {
            await tx.paymentMethodAccountMapping.create({
              data: {
                paymentMethodDefinitionId: paymentMethod.id,
                accountId: account.id,
                legalEntityId: le.id,
                systemId: systemId
              }
            });
          }
        }
      }
      
      created++;
    }
  }
  
  return created;
}

// Función para verificar si ya existe configuración contable
export async function checkExistingAccountingSetup(legalEntityId: string) {
  const accounts = await prisma.chartOfAccountEntry.count({
    where: { legalEntityId }
  });
  
  const series = await prisma.documentSeries.count({
    where: { legalEntityId }
  });
  
  return {
    hasAccounts: accounts > 0,
    hasSeries: series > 0,
    accountsCount: accounts,
    seriesCount: series
  };
}

export async function getCountrySpecificAccounts(countryCode: string) {
  switch (countryCode) {
    case 'ES':
      return {
        services: '712',
        products: '711',
        cash: '570',
        banks: '572',
        expenses: '610'
      };
    case 'FR':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        expenses: '610'
      };
    case 'MA':
      return {
        services: '712',
        products: '711',
        cash: '516',  // Corregir: cuenta de caja para Marruecos
        banks: '514',  // Corregir: cuenta de bancos para Marruecos
        expenses: '610'
      };
    case 'PT':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        expenses: '610'
      };
    case 'IT':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        expenses: '610'
      };
    case 'DE':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        expenses: '610'
      };
    case 'GB':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        expenses: '610'
      };
    case 'US':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        expenses: '610'
      };
    default:
      return {};
  }
}

// Función auxiliar para obtener la cuenta de descuentos según el país
function getDiscountAccountByCountry(country: string): string {
  switch (country) {
    case 'ES':
      return '708';
    case 'FR':
      return '709';
    case 'MA':
      return '7129';
    default:
      return '708';
  }
}

// Función auxiliar para obtener los tipos de promoción según el país
function getDiscountTypesByCountry(country: string) {
  // Por ahora todos los países usan los mismos tipos
  return [
    { 
      code: 'MANUAL_DISCOUNT', 
      name: 'Descuentos Manuales', 
      uniqueCode: '001',
      legacyCodes: ['PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT']
    },
    { code: 'BUY_X_GET_Y_SERVICE', name: 'Compra X Obtén Y (Servicios)', uniqueCode: '002' },
    { code: 'BUY_X_GET_Y_PRODUCT', name: 'Compra X Obtén Y (Productos)', uniqueCode: '003' },
    { code: 'POINTS_MULTIPLIER', name: 'Multiplicador de Puntos', uniqueCode: '004' },
    { code: 'FREE_SHIPPING', name: 'Envío Gratuito', uniqueCode: '005' }
  ];
}
