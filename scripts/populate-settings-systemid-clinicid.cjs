/**
 * 🔧 MIGRACIÓN DE DATOS: ServiceSetting, ProductSetting, ServiceConsumption
 * 
 * Este script migra registros existentes para añadir systemId y clinicId a:
 * - ServiceSetting: obtiene systemId del Service relacionado
 * - ProductSetting: obtiene systemId del Product relacionado  
 * - ServiceConsumption: obtiene systemId del Service relacionado
 * 
 * PRECAUCIONES:
 * - Ejecutar DESPUÉS de aplicar la migración de schema
 * - Verificar que no hay registros huérfanos antes de ejecutar
 * - clinicId se establece como null (no hay relación directa con clínica)
 * 
 * USO:
 * node scripts/populate-settings-systemid-clinicid.cjs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'], // Solo errores para mantener output limpio
});

async function migrateServiceSettings() {
  console.log('\n🔧 MIGRANDO ServiceSetting...');
  
  // Buscar ServiceSettings sin systemId
  const serviceSettingsToMigrate = await prisma.serviceSetting.findMany({
    where: {
      systemId: null
    },
    include: {
      service: {
        select: { systemId: true }
      }
    }
  });

  console.log(`📊 ServiceSettings encontrados sin systemId: ${serviceSettingsToMigrate.length}`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const setting of serviceSettingsToMigrate) {
    try {
      if (!setting.service?.systemId) {
        console.warn(`⚠️  ServiceSetting ${setting.id}: Service relacionado no tiene systemId`);
        errorCount++;
        continue;
      }

      await prisma.serviceSetting.update({
        where: { id: setting.id },
        data: {
          systemId: setting.service.systemId,
          clinicId: null // ServiceSetting no está vinculado directamente a clínica
        }
      });

      migratedCount++;
      if (migratedCount % 10 === 0) {
        console.log(`✅ Migrados ${migratedCount} ServiceSettings...`);
      }
    } catch (error) {
      console.error(`❌ Error migrando ServiceSetting ${setting.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`🎉 ServiceSetting migración completada: ${migratedCount} exitosos, ${errorCount} errores`);
  return { migrated: migratedCount, errors: errorCount };
}

async function migrateProductSettings() {
  console.log('\n🔧 MIGRANDO ProductSetting...');
  
  // Buscar ProductSettings sin systemId
  const productSettingsToMigrate = await prisma.productSetting.findMany({
    where: {
      systemId: null
    },
    include: {
      product: {
        select: { systemId: true }
      }
    }
  });

  console.log(`📊 ProductSettings encontrados sin systemId: ${productSettingsToMigrate.length}`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const setting of productSettingsToMigrate) {
    try {
      if (!setting.product?.systemId) {
        console.warn(`⚠️  ProductSetting ${setting.id}: Product relacionado no tiene systemId`);
        errorCount++;
        continue;
      }

      await prisma.productSetting.update({
        where: { id: setting.id },
        data: {
          systemId: setting.product.systemId,
          clinicId: null // ProductSetting no está vinculado directamente a clínica
        }
      });

      migratedCount++;
      if (migratedCount % 10 === 0) {
        console.log(`✅ Migrados ${migratedCount} ProductSettings...`);
      }
    } catch (error) {
      console.error(`❌ Error migrando ProductSetting ${setting.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`🎉 ProductSetting migración completada: ${migratedCount} exitosos, ${errorCount} errores`);
  return { migrated: migratedCount, errors: errorCount };
}

async function migrateServiceConsumptions() {
  console.log('\n🔧 MIGRANDO ServiceConsumption...');
  
  // Buscar ServiceConsumptions sin systemId
  const serviceConsumptionsToMigrate = await prisma.serviceConsumption.findMany({
    where: {
      systemId: null
    },
    include: {
      service: {
        select: { systemId: true }
      }
    }
  });

  console.log(`📊 ServiceConsumptions encontrados sin systemId: ${serviceConsumptionsToMigrate.length}`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const consumption of serviceConsumptionsToMigrate) {
    try {
      if (!consumption.service?.systemId) {
        console.warn(`⚠️  ServiceConsumption ${consumption.id}: Service relacionado no tiene systemId`);
        errorCount++;
        continue;
      }

      await prisma.serviceConsumption.update({
        where: { id: consumption.id },
        data: {
          systemId: consumption.service.systemId,
          clinicId: null // ServiceConsumption no está vinculado directamente a clínica
        }
      });

      migratedCount++;
      if (migratedCount % 10 === 0) {
        console.log(`✅ Migrados ${migratedCount} ServiceConsumptions...`);
      }
    } catch (error) {
      console.error(`❌ Error migrando ServiceConsumption ${consumption.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`🎉 ServiceConsumption migración completada: ${migratedCount} exitosos, ${errorCount} errores`);
  return { migrated: migratedCount, errors: errorCount };
}

async function verifyMigration() {
  console.log('\n🔍 VERIFICANDO MIGRACIÓN...');
  
  const remainingServiceSettings = await prisma.serviceSetting.count({
    where: { systemId: null }
  });
  
  const remainingProductSettings = await prisma.productSetting.count({
    where: { systemId: null }
  });
  
  const remainingServiceConsumptions = await prisma.serviceConsumption.count({
    where: { systemId: null }
  });

  console.log(`📊 Registros restantes sin systemId:`);
  console.log(`   - ServiceSetting: ${remainingServiceSettings}`);
  console.log(`   - ProductSetting: ${remainingProductSettings}`);
  console.log(`   - ServiceConsumption: ${remainingServiceConsumptions}`);

  const totalRemaining = remainingServiceSettings + remainingProductSettings + remainingServiceConsumptions;
  
  if (totalRemaining === 0) {
    console.log('✅ MIGRACIÓN COMPLETADA: Todos los registros tienen systemId');
  } else {
    console.log(`⚠️  MIGRACIÓN INCOMPLETA: ${totalRemaining} registros restantes sin systemId`);
  }

  return totalRemaining === 0;
}

async function main() {
  console.log('🚀 INICIANDO MIGRACIÓN DE DATOS: Settings Tables');
  console.log('📅 Fecha:', new Date().toISOString());
  
  try {
    // Ejecutar migraciones en paralelo para eficiencia
    const [serviceResults, productResults, consumptionResults] = await Promise.all([
      migrateServiceSettings(),
      migrateProductSettings(),
      migrateServiceConsumptions()
    ]);

    // Mostrar resumen
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log(`   ServiceSetting: ${serviceResults.migrated} migrados, ${serviceResults.errors} errores`);
    console.log(`   ProductSetting: ${productResults.migrated} migrados, ${productResults.errors} errores`);
    console.log(`   ServiceConsumption: ${consumptionResults.migrated} migrados, ${consumptionResults.errors} errores`);
    
    const totalMigrated = serviceResults.migrated + productResults.migrated + consumptionResults.migrated;
    const totalErrors = serviceResults.errors + productResults.errors + consumptionResults.errors;
    
    console.log(`\n🎯 TOTAL: ${totalMigrated} registros migrados, ${totalErrors} errores`);

    // Verificar migración
    const isComplete = await verifyMigration();
    
    if (isComplete && totalErrors === 0) {
      console.log('\n🎉 MIGRACIÓN EXITOSA: Todos los registros migrados correctamente');
      process.exit(0);
    } else if (totalErrors > 0) {
      console.log('\n⚠️  MIGRACIÓN CON ERRORES: Revisar logs anteriores');
      process.exit(1);
    } else {
      console.log('\n⚠️  MIGRACIÓN INCOMPLETA: Algunos registros no pudieron ser migrados');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN MIGRACIÓN:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Error no capturado:', error);
    process.exit(1);
  });
} 