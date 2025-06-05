'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
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

export async function quickSetupAccounting(
  legalEntityId: string,
  countryCode: string
) {
  const session = await auth();
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
  const clinics = legalEntity.clinics;

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
      
      // Crear series de documentos si hay clínicas
      let seriesCreated = 0;
      if (clinics.length > 0) {
        console.log(`Creando series de documentos para ${clinics.length} clínicas...`);
        seriesCreated = await createSeriesForAllClinics(tx, legalEntityId);
        console.log(`${seriesCreated} series de documentos creadas`);
      } else {
        console.log('No hay clínicas asociadas. Las series se crearán cuando se asocien clínicas.');
      }
      
      return {
        success: true,
        accountsCreated,
        paymentMethodsCreated,
        seriesCreated,
        clinicsProcessed: clinics.length,
        message: clinics.length === 0 
          ? 'Configuración básica creada. Las series documentales se crearán cuando se asocien clínicas.'
          : 'Configuración completa creada con series documentales.'
      };
    }, {
      maxWait: 10000, // Esperar máximo 10 segundos
      timeout: 30000, // Timeout de 30 segundos
    });
  } catch (error) {
    console.error('Error en quick setup:', error);
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

  // Preparar las cuentas a crear
  const accountsToCreate = accounts.filter(a => !existingAccountNumbers.has(a.accountNumber));
  
  // Separar cuentas padre e hijas
  const parentAccounts = accountsToCreate.filter(a => !a.parentNumber);
  const childAccounts = accountsToCreate.filter(a => a.parentNumber);

  let created = 0;

  // Crear todas las cuentas padre de una sola vez
  if (parentAccounts.length > 0) {
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
  }
  
  return created;
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
