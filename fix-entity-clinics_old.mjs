// Script para asociar clínicas a la entidad legal
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEntityClinics() {
  const legalEntityId = 'le-demo-contabilidad-1';
  const systemId = 'cmbbggjpe0000y2w74mjoqsbo';
  
  console.log('=== Asociando Clínicas a Entidad Legal ===\n');
  
  try {
    // Primero, limpiar datos contables anteriores
    console.log('Limpiando configuración contable anterior...');
    
    await prisma.$transaction(async (tx) => {
      // Eliminar mapeos
      const mappings = await tx.paymentMethodAccountMapping.deleteMany({
        where: { legalEntityId }
      });
      console.log(`✓ Mapeos eliminados: ${mappings.count}`);
      
      // Eliminar series
      const series = await tx.documentSeries.deleteMany({
        where: { legalEntityId }
      });
      console.log(`✓ Series eliminadas: ${series.count}`);
      
      // Eliminar cuentas
      const accounts = await tx.chartOfAccountEntry.deleteMany({
        where: { legalEntityId }
      });
      console.log(`✓ Cuentas eliminadas: ${accounts.count}`);
    });
    
    // Buscar clínicas del sistema
    const clinics = await prisma.clinic.findMany({
      where: { systemId },
      select: {
        id: true,
        name: true,
        legalEntityId: true
      }
    });
    
    console.log(`\nClínicas encontradas en el sistema: ${clinics.length}`);
    
    // Actualizar las clínicas para asociarlas a la entidad legal
    let updated = 0;
    for (const clinic of clinics) {
      if (!clinic.legalEntityId || clinic.legalEntityId !== legalEntityId) {
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: { legalEntityId }
        });
        console.log(`✓ Asociada: ${clinic.name}`);
        updated++;
      } else {
        console.log(`- Ya asociada: ${clinic.name}`);
      }
    }
    
    console.log(`\n✅ Clínicas actualizadas: ${updated}`);
    console.log('\nAhora puedes ejecutar el Quick Setup de contabilidad.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixEntityClinics();
