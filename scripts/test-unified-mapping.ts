// Script de prueba para el servicio unificado de mapeo
import { prisma } from '@/lib/db';
import { UnifiedMappingService } from '@/lib/accounting/unified-mapping-service';

async function testUnifiedMappingService() {
  try {
    console.log('🧪 Iniciando pruebas del servicio unificado de mapeo...\n');
    
    // Obtener una entidad legal de prueba
    const legalEntity = await prisma.legalEntity.findFirst({
      include: {
        chartOfAccountEntries: true
      }
    });
    
    if (!legalEntity) {
      console.error('❌ No se encontró ninguna entidad legal');
      return;
    }
    
    console.log(`✅ Entidad legal encontrada: ${legalEntity.name}`);
    console.log(`📊 Cuentas en el plan contable: ${legalEntity.chartOfAccountEntries.length}\n`);
    
    // Obtener servicios para mapear
    const services = await prisma.service.findMany({
      where: {
        systemId: legalEntity.systemId
      },
      include: {
        category: true
      },
      take: 5 // Solo probar con 5 servicios
    });
    
    console.log(`📋 Servicios encontrados: ${services.length}`);
    
    if (services.length > 0) {
      console.log('\n🔄 Probando mapeo de servicios...');
      
      const serviceResults = await UnifiedMappingService.mapServices(
        services,
        legalEntity.chartOfAccountEntries,
        'ES', // País España por defecto
        {
          legalEntityId: legalEntity.id,
          systemId: legalEntity.systemId,
          forceRemap: true // Forzar remapeo para la prueba
        }
      );
      
      console.log('\n📊 Resultados del mapeo de servicios:');
      console.log(`  ✅ Mapeados: ${serviceResults.mapped}`);
      console.log(`  ❌ Errores: ${serviceResults.errors}`);
      console.log('\n📝 Detalles:');
      serviceResults.details.forEach((detail, index) => {
        if (detail.error) {
          console.log(`  ${index + 1}. ❌ ${detail.name}: ${detail.error}`);
        } else {
          console.log(`  ${index + 1}. ✅ ${detail.name} → Cuenta ${detail.account}`);
        }
      });
    }
    
    // Obtener productos para mapear
    const products = await prisma.product.findMany({
      where: {
        systemId: legalEntity.systemId
      },
      take: 5 // Solo probar con 5 productos
    });
    
    console.log(`\n📦 Productos encontrados: ${products.length}`);
    
    if (products.length > 0) {
      console.log('\n🔄 Probando mapeo de productos...');
      
      const productResults = await UnifiedMappingService.mapProducts(
        products,
        legalEntity.chartOfAccountEntries,
        'ES',
        {
          legalEntityId: legalEntity.id,
          systemId: legalEntity.systemId,
          forceRemap: true
        }
      );
      
      console.log('\n📊 Resultados del mapeo de productos:');
      console.log(`  ✅ Mapeados: ${productResults.mapped}`);
      console.log(`  ❌ Errores: ${productResults.errors}`);
      console.log('\n📝 Detalles:');
      productResults.details.forEach((detail, index) => {
        if (detail.error) {
          console.log(`  ${index + 1}. ❌ ${detail.name}: ${detail.error}`);
        } else {
          console.log(`  ${index + 1}. ✅ ${detail.name} → Cuenta ${detail.account}`);
        }
      });
    }
    
    // Obtener métodos de pago para mapear
    const paymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: {
        systemId: legalEntity.systemId
      },
      take: 5 // Solo probar con 5 métodos
    });
    
    console.log(`\n💳 Métodos de pago encontrados: ${paymentMethods.length}`);
    
    if (paymentMethods.length > 0) {
      console.log('\n🔄 Probando mapeo de métodos de pago...');
      
      const paymentResults = await UnifiedMappingService.mapPaymentMethods(
        paymentMethods,
        legalEntity.chartOfAccountEntries,
        'ES',
        {
          legalEntityId: legalEntity.id,
          systemId: legalEntity.systemId,
          forceRemap: true
        }
      );
      
      console.log('\n📊 Resultados del mapeo de métodos de pago:');
      console.log(`  ✅ Mapeados: ${paymentResults.mapped}`);
      console.log(`  ❌ Errores: ${paymentResults.errors}`);
      console.log('\n📝 Detalles:');
      paymentResults.details.forEach((detail, index) => {
        if (detail.error) {
          console.log(`  ${index + 1}. ❌ ${detail.name}: ${detail.error}`);
        } else {
          console.log(`  ${index + 1}. ✅ ${detail.name} → Cuenta ${detail.account}`);
        }
      });
    }
    
    console.log('\n✅ Pruebas completadas');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar las pruebas
testUnifiedMappingService();
