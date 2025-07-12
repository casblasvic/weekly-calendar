/**
 * 🔧 CORRECCIONES CRÍTICAS PARA ARCHIVOS DE SEED
 * 
 * Este archivo documenta y proporciona las correcciones necesarias para los archivos de seed
 * que tienen problemas con los campos systemId y clinicId que hemos añadido recientemente.
 * 
 * PROBLEMAS IDENTIFICADOS:
 * ========================
 * 
 * 1. ServiceSetting y ProductSetting NO incluyen systemId y clinicId
 * 2. BonoDefinitionSetting y PackageDefinitionSetting NO incluyen systemId y clinicId
 * 3. PackageItem NO incluye systemId y clinicId
 * 4. ScheduleTemplateBlock NO incluye systemId y clinicId
 * 5. PersonLeadData, PersonContactData, PersonClientData NO incluyen systemId
 * 6. Algunas tablas pueden necesitar clinicId para filtros multi-tenant
 * 
 * SOLUCIONES:
 * ===========
 */

import { prisma, Prisma } from '@/lib/db';

export interface SeedFixContext {
  systemId: string;
  clinicsMap: Map<string, any>;
}

/**
 * 🔧 CORRECCIÓN 1: ServiceSetting con systemId y clinicId
 */
export function fixServiceSettingCreation(systemId: string, clinicId?: string) {
  return {
    where: { serviceId: 'SERVICE_ID' },
    update: {
      systemId: systemId,
      clinicId: clinicId || null,
    },
    create: { 
      serviceId: 'SERVICE_ID',
      systemId: systemId,
      clinicId: clinicId || null,
    }
  };
}

/**
 * 🔧 CORRECCIÓN 2: ProductSetting con systemId y clinicId
 */
export function fixProductSettingCreation(systemId: string, clinicId?: string) {
  return {
    where: { productId: 'PRODUCT_ID' },
    update: {
      currentStock: 0,
      minStockThreshold: 0,
      isForSale: true,
      isInternalUse: false,
      pointsAwarded: 0,
      systemId: systemId,
      clinicId: clinicId || null,
    },
    create: { 
      productId: 'PRODUCT_ID',
      currentStock: 0,
      minStockThreshold: 0,
      isForSale: true,
      isInternalUse: false,
      pointsAwarded: 0,
      systemId: systemId,
      clinicId: clinicId || null,
    }
  };
}

/**
 * 🔧 CORRECCIÓN 3: BonoDefinitionSetting con systemId y clinicId
 */
export function fixBonoDefinitionSettingCreation(systemId: string, clinicId?: string) {
  return {
    where: { bonoDefinitionId: 'BONO_DEF_ID' },
    update: {
      systemId: systemId,
      clinicId: clinicId || null,
    },
    create: { 
      bonoDefinitionId: 'BONO_DEF_ID',
      systemId: systemId,
      clinicId: clinicId || null,
    }
  };
}

/**
 * 🔧 CORRECCIÓN 4: PackageDefinitionSetting con systemId y clinicId
 */
export function fixPackageDefinitionSettingCreation(systemId: string, clinicId?: string) {
  return {
    where: { packageDefinitionId: 'PACKAGE_DEF_ID' },
    update: {
      systemId: systemId,
      clinicId: clinicId || null,
    },
    create: { 
      packageDefinitionId: 'PACKAGE_DEF_ID',
      systemId: systemId,
      clinicId: clinicId || null,
    }
  };
}

/**
 * 🔧 CORRECCIÓN 5: PackageItem con systemId y clinicId
 */
export function fixPackageItemCreation(systemId: string, clinicId?: string) {
  return {
    itemType: 'SERVICE', // o 'PRODUCT'
    serviceId: 'SERVICE_ID', // o productId
    quantity: 1,
    price: 0,
    systemId: systemId,
    clinicId: clinicId || null,
  };
}

/**
 * 🔧 CORRECCIÓN 6: ScheduleTemplateBlock con systemId y clinicId
 */
export function fixScheduleTemplateBlockCreation(systemId: string, clinicId?: string) {
  return {
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
    isWorking: true,
    systemId: systemId,
    clinicId: clinicId || null,
  };
}

/**
 * 🔧 CORRECCIÓN 7: PersonLeadData con systemId
 */
export function fixPersonLeadDataCreation(systemId: string) {
  return {
    functionalRoleId: 'ROLE_ID',
    status: 'NEW',
    source: 'WEB',
    interests: '',
    systemId: systemId,
  };
}

/**
 * 🔧 CORRECCIÓN 8: PersonContactData con systemId
 */
export function fixPersonContactDataCreation(systemId: string) {
  return {
    functionalRoleId: 'ROLE_ID',
    position: '',
    companyId: 'COMPANY_ID',
    isPrimary: false,
    systemId: systemId,
  };
}

/**
 * 🔧 CORRECCIÓN 9: PersonClientData con systemId
 */
export function fixPersonClientDataCreation(systemId: string) {
  return {
    functionalRoleId: 'ROLE_ID',
    marketingConsent: false,
    dataProcessingConsent: false,
    systemId: systemId,
  };
}

/**
 * 🔧 CORRECCIÓN COMPLETA: Función para corregir todos los seeds existentes
 */
export async function fixAllExistingSeedData(context: SeedFixContext) {
  console.log('🔧 Iniciando corrección de datos de seed existentes...');
  
  const { systemId, clinicsMap } = context;
  
  try {
    // 1. Corregir ServiceSettings
    console.log('Corrigiendo ServiceSettings...');
    const serviceSettings = await prisma.serviceSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of serviceSettings) {
      await prisma.serviceSetting.update({
        where: { id: setting.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${serviceSettings.length} ServiceSettings`);

    // 2. Corregir ProductSettings
    console.log('Corrigiendo ProductSettings...');
    const productSettings = await prisma.productSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of productSettings) {
      await prisma.productSetting.update({
        where: { id: setting.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${productSettings.length} ProductSettings`);

    // 3. Corregir BonoDefinitionSettings
    console.log('Corrigiendo BonoDefinitionSettings...');
    const bonoSettings = await prisma.bonoDefinitionSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of bonoSettings) {
      await prisma.bonoDefinitionSetting.update({
        where: { id: setting.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${bonoSettings.length} BonoDefinitionSettings`);

    // 4. Corregir PackageDefinitionSettings
    console.log('Corrigiendo PackageDefinitionSettings...');
    const packageSettings = await prisma.packageDefinitionSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of packageSettings) {
      await prisma.packageDefinitionSetting.update({
        where: { id: setting.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${packageSettings.length} PackageDefinitionSettings`);

    // 5. Corregir PackageItems
    console.log('Corrigiendo PackageItems...');
    const packageItems = await prisma.packageItem.findMany({
      where: { systemId: null }
    });
    
    for (const item of packageItems) {
      await prisma.packageItem.update({
        where: { id: item.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${packageItems.length} PackageItems`);

    // 6. Corregir ScheduleTemplateBlocks
    console.log('Corrigiendo ScheduleTemplateBlocks...');
    const scheduleBlocks = await prisma.scheduleTemplateBlock.findMany({
      where: { systemId: null }
    });
    
    for (const block of scheduleBlocks) {
      await prisma.scheduleTemplateBlock.update({
        where: { id: block.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${scheduleBlocks.length} ScheduleTemplateBlocks`);

    // 7. Corregir PersonLeadData
    console.log('Corrigiendo PersonLeadData...');
    const leadData = await prisma.personLeadData.findMany({
      where: { systemId: null }
    });
    
    for (const data of leadData) {
      await prisma.personLeadData.update({
        where: { id: data.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${leadData.length} PersonLeadData`);

    // 8. Corregir PersonContactData
    console.log('Corrigiendo PersonContactData...');
    const contactData = await prisma.personContactData.findMany({
      where: { systemId: null }
    });
    
    for (const data of contactData) {
      await prisma.personContactData.update({
        where: { id: data.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${contactData.length} PersonContactData`);

    // 9. Corregir PersonClientData
    console.log('Corrigiendo PersonClientData...');
    const clientData = await prisma.personClientData.findMany({
      where: { systemId: null }
    });
    
    for (const data of clientData) {
      await prisma.personClientData.update({
        where: { id: data.id },
        data: { systemId: systemId }
      });
    }
    console.log(`✅ Corregidos ${clientData.length} PersonClientData`);

    console.log('🎉 Corrección de datos de seed completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la corrección de datos de seed:', error);
    throw error;
  }
}

/**
 * 🔧 SCRIPT PARA EJECUTAR LAS CORRECCIONES
 */
export async function runSeedFixes() {
  try {
    // Buscar el sistema principal
    const system = await prisma.system.findFirst();
    if (!system) {
      throw new Error('No se encontró ningún sistema en la base de datos');
    }

    // Buscar clínicas
    const clinics = await prisma.clinic.findMany({
      where: { systemId: system.id }
    });
    
    const clinicsMap = new Map();
    clinics.forEach(clinic => {
      clinicsMap.set(clinic.id, clinic);
    });

    const context: SeedFixContext = {
      systemId: system.id,
      clinicsMap: clinicsMap
    };

    await fixAllExistingSeedData(context);
    
    console.log('✅ Todas las correcciones aplicadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error ejecutando correcciones:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runSeedFixes();
} 