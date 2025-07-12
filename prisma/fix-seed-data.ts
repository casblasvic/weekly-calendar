#!/usr/bin/env tsx
/**
 * 🔧 SCRIPT DE CORRECCIÓN DE DATOS DE SEED
 * 
 * Este script corrige todos los registros existentes en la base de datos
 * que no tienen los campos systemId y clinicId que hemos añadido recientemente.
 * 
 * EJECUTAR CON: npx tsx prisma/fix-seed-data.ts
 */

import { prisma } from '@/lib/db';

async function fixExistingSeedData() {
  console.log('🔧 Iniciando corrección de datos de seed existentes...');
  
  try {
    // Buscar el sistema principal
    const system = await prisma.system.findFirst();
    if (!system) {
      throw new Error('❌ No se encontró ningún sistema en la base de datos');
    }

    console.log(`✅ Sistema encontrado: ${system.name} (ID: ${system.id})`);
    
    let totalFixed = 0;

    // 1. Corregir ServiceSettings
    console.log('\n🔧 Corrigiendo ServiceSettings...');
    const serviceSettings = await prisma.serviceSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of serviceSettings) {
      await prisma.serviceSetting.update({
        where: { id: setting.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${serviceSettings.length} ServiceSettings`);
    totalFixed += serviceSettings.length;

    // 2. Corregir ProductSettings
    console.log('\n🔧 Corrigiendo ProductSettings...');
    const productSettings = await prisma.productSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of productSettings) {
      await prisma.productSetting.update({
        where: { id: setting.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${productSettings.length} ProductSettings`);
    totalFixed += productSettings.length;

    // 3. Corregir BonoDefinitionSettings
    console.log('\n🔧 Corrigiendo BonoDefinitionSettings...');
    const bonoSettings = await prisma.bonoDefinitionSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of bonoSettings) {
      await prisma.bonoDefinitionSetting.update({
        where: { id: setting.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${bonoSettings.length} BonoDefinitionSettings`);
    totalFixed += bonoSettings.length;

    // 4. Corregir PackageDefinitionSettings
    console.log('\n🔧 Corrigiendo PackageDefinitionSettings...');
    const packageSettings = await prisma.packageDefinitionSetting.findMany({
      where: { systemId: null }
    });
    
    for (const setting of packageSettings) {
      await prisma.packageDefinitionSetting.update({
        where: { id: setting.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${packageSettings.length} PackageDefinitionSettings`);
    totalFixed += packageSettings.length;

    // 5. Corregir PackageItems
    console.log('\n🔧 Corrigiendo PackageItems...');
    const packageItems = await prisma.packageItem.findMany({
      where: { systemId: null }
    });
    
    for (const item of packageItems) {
      await prisma.packageItem.update({
        where: { id: item.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${packageItems.length} PackageItems`);
    totalFixed += packageItems.length;

    // 6. Corregir ScheduleTemplateBlocks
    console.log('\n🔧 Corrigiendo ScheduleTemplateBlocks...');
    const scheduleBlocks = await prisma.scheduleTemplateBlock.findMany({
      where: { systemId: null }
    });
    
    for (const block of scheduleBlocks) {
      await prisma.scheduleTemplateBlock.update({
        where: { id: block.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${scheduleBlocks.length} ScheduleTemplateBlocks`);
    totalFixed += scheduleBlocks.length;

    // 7. Corregir PersonLeadData
    console.log('\n🔧 Corrigiendo PersonLeadData...');
    const leadData = await prisma.personLeadData.findMany({
      where: { systemId: null }
    });
    
    for (const data of leadData) {
      await prisma.personLeadData.update({
        where: { id: data.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${leadData.length} PersonLeadData`);
    totalFixed += leadData.length;

    // 8. Corregir PersonContactData
    console.log('\n🔧 Corrigiendo PersonContactData...');
    const contactData = await prisma.personContactData.findMany({
      where: { systemId: null }
    });
    
    for (const data of contactData) {
      await prisma.personContactData.update({
        where: { id: data.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${contactData.length} PersonContactData`);
    totalFixed += contactData.length;

    // 9. Corregir PersonClientData
    console.log('\n🔧 Corrigiendo PersonClientData...');
    const clientData = await prisma.personClientData.findMany({
      where: { systemId: null }
    });
    
    for (const data of clientData) {
      await prisma.personClientData.update({
        where: { id: data.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${clientData.length} PersonClientData`);
    totalFixed += clientData.length;

    // 10. Corregir ClinicSchedules
    console.log('\n🔧 Corrigiendo ClinicSchedules...');
    const clinicSchedules = await prisma.clinicSchedule.findMany({
      where: { systemId: null }
    });
    
    for (const schedule of clinicSchedules) {
      await prisma.clinicSchedule.update({
        where: { id: schedule.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${clinicSchedules.length} ClinicSchedules`);
    totalFixed += clinicSchedules.length;

    // 11. Corregir ClinicScheduleBlocks
    console.log('\n🔧 Corrigiendo ClinicScheduleBlocks...');
    const clinicScheduleBlocks = await prisma.clinicScheduleBlock.findMany({
      where: { systemId: null }
    });
    
    for (const block of clinicScheduleBlocks) {
      await prisma.clinicScheduleBlock.update({
        where: { id: block.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${clinicScheduleBlocks.length} ClinicScheduleBlocks`);
    totalFixed += clinicScheduleBlocks.length;

    // 12. Corregir UserClinicSchedules
    console.log('\n🔧 Corrigiendo UserClinicSchedules...');
    const userSchedules = await prisma.userClinicSchedule.findMany({
      where: { systemId: null }
    });
    
    for (const schedule of userSchedules) {
      await prisma.userClinicSchedule.update({
        where: { id: schedule.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${userSchedules.length} UserClinicSchedules`);
    totalFixed += userSchedules.length;

    // 13. Corregir UserClinicScheduleExceptions
    console.log('\n🔧 Corrigiendo UserClinicScheduleExceptions...');
    const userExceptions = await prisma.userClinicScheduleException.findMany({
      where: { systemId: null }
    });
    
    for (const exception of userExceptions) {
      await prisma.userClinicScheduleException.update({
        where: { id: exception.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${userExceptions.length} UserClinicScheduleExceptions`);
    totalFixed += userExceptions.length;

    // 14. Corregir CabinScheduleOverrides
    console.log('\n🔧 Corrigiendo CabinScheduleOverrides...');
    const cabinOverrides = await prisma.cabinScheduleOverride.findMany({
      where: { systemId: null }
    });
    
    for (const override of cabinOverrides) {
      await prisma.cabinScheduleOverride.update({
        where: { id: override.id },
        data: { systemId: system.id }
      });
    }
    console.log(`✅ Corregidos ${cabinOverrides.length} CabinScheduleOverrides`);
    totalFixed += cabinOverrides.length;

    console.log('\n🎉 ¡Corrección completada exitosamente!');
    console.log(`📊 Total de registros corregidos: ${totalFixed}`);
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (import.meta.url === `file://${process.argv[1]}`) {
  fixExistingSeedData()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando el script:', error);
      process.exit(1);
    });
} 