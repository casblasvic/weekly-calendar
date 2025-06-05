// Script para verificar la configuración de la entidad legal
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEntitySetup() {
  const legalEntityId = 'le-demo-contabilidad-1';
  
  console.log('=== Verificación de Entidad Legal ===\n');
  
  try {
    // Obtener la entidad legal con sus relaciones
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      include: { 
        clinics: {
          select: {
            id: true,
            name: true,
            prefix: true
          }
        }
      }
    });
    
    if (!legalEntity) {
      console.log('❌ Entidad legal no encontrada');
      return;
    }
    
    console.log(`✓ Entidad Legal: ${legalEntity.name}`);
    console.log(`  - País: ${legalEntity.countryIsoCode}`);
    console.log(`  - Sistema: ${legalEntity.systemId}`);
    
    // Verificar clínicas
    console.log(`\n✓ Clínicas asociadas: ${legalEntity.clinics.length}`);
    legalEntity.clinics.forEach(clinic => {
      console.log(`  - ${clinic.name} (${clinic.prefix})`);
    });
    
    // Verificar cuentas bancarias del sistema
    const bankAccounts = await prisma.bankAccount.count({
      where: {
        systemId: legalEntity.systemId,
        isActive: true
      }
    });
    console.log(`\n✓ Cuentas bancarias activas en el sistema: ${bankAccounts}`);
    
    // Verificar estado contable actual
    const accounts = await prisma.chartOfAccountEntry.count({
      where: { legalEntityId }
    });
    console.log(`\n✓ Cuentas contables creadas: ${accounts}`);
    
    const series = await prisma.documentSeries.count({
      where: { legalEntityId }
    });
    console.log(`✓ Series documentales creadas: ${series}`);
    
    const mappings = await prisma.paymentMethodAccountMapping.count({
      where: { legalEntityId }
    });
    console.log(`✓ Mapeos de métodos de pago: ${mappings}`);
    
    if (legalEntity.clinics.length === 0) {
      console.log('\n⚠️  ADVERTENCIA: La entidad legal no tiene clínicas asociadas.');
      console.log('   El Quick Setup fallará. Asocie al menos una clínica primero.');
    } else {
      console.log('\n✅ La entidad legal está lista para el Quick Setup.');
    }
    
  } catch (error) {
    console.error('Error en verificación:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEntitySetup();
