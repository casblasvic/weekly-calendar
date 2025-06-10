/**
 * Script para probar el servicio de mapeo unificado completo
 * Incluye mapeo de servicios, productos, métodos de pago, promociones, gastos y bancos
 */

import { PrismaClient } from '@prisma/client';
import { UnifiedMappingService } from '../lib/accounting/unified-mapping-service.js';

const prisma = new PrismaClient();

async function testUnifiedMappingComplete() {
  try {
    console.log('\n🚀 Iniciando prueba completa del mapeo unificado contable...\n');

    // 1. Obtener el sistema y la entidad legal
    const system = await prisma.system.findFirst({
      where: { isActive: true }
    });
    
    if (!system) {
      throw new Error('No se encontró un sistema activo');
    }

    const legalEntity = await prisma.legalEntity.findFirst({
      where: { systemId: system.id }
    });

    if (!legalEntity) {
      throw new Error('No se encontró una entidad legal');
    }

    // 2. Obtener clínicas
    const clinics = await prisma.clinic.findMany({
      where: { systemId: system.id },
      include: { tariff: true }
    });

    console.log(`📍 Sistema: ${system.name}`);
    console.log(`🏢 Entidad Legal: ${legalEntity.name}`);
    console.log(`🏥 Clínicas encontradas: ${clinics.length}`);
    clinics.forEach(c => console.log(`   - ${c.name} (${c.prefix})`));

    // 3. Obtener el plan de cuentas
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId: legalEntity.id,
        isActive: true
      }
    });

    if (chartOfAccounts.length === 0) {
      throw new Error('No se encontró un plan de cuentas activo');
    }
    console.log(`📊 Plan de cuentas cargado: ${chartOfAccounts.length} cuentas`);

    // 4. Mapear servicios
    console.log('\n🔧 Mapeando servicios...');
    const services = await prisma.service.findMany({
      where: { systemId: system.id },
      include: { category: true }
    });

    const serviceResult = await UnifiedMappingService.mapServices(
      services,
      chartOfAccounts,
      legalEntity.countryIsoCode || 'ES',
      {
        legalEntityId: legalEntity.id,
        systemId: system.id,
        forceRemap: false
      }
    );
    console.log(`   ✅ Servicios mapeados: ${serviceResult.mapped}`);

    // 5. Mapear productos
    console.log('\n📦 Mapeando productos...');
    const products = await prisma.product.findMany({
      where: { systemId: system.id },
      include: { category: true }
    });

    const productResult = await UnifiedMappingService.mapProducts(
      products,
      chartOfAccounts,
      legalEntity.countryIsoCode || 'ES',
      {
        legalEntityId: legalEntity.id,
        systemId: system.id,
        forceRemap: false
      }
    );
    console.log(`   ✅ Productos mapeados: ${productResult.mapped}`);

    // 6. Mapear métodos de pago
    console.log('\n💳 Mapeando métodos de pago...');
    const paymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: { systemId: system.id }
    });

    const paymentResult = await UnifiedMappingService.mapPaymentMethods(
      paymentMethods,
      chartOfAccounts,
      legalEntity.countryIsoCode || 'ES',
      {
        legalEntityId: legalEntity.id,
        systemId: system.id,
        forceRemap: false
      }
    );
    console.log(`   ✅ Métodos de pago mapeados: ${paymentResult.mapped}`);

    // 7. Mostrar resumen de mapeos
    console.log('\n📊 RESUMEN DE MAPEOS CREADOS:');
    
    // Servicios
    const serviceMappings = await prisma.serviceAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Servicios: ${serviceMappings}`);

    // Productos
    const productMappings = await prisma.productAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Productos: ${productMappings}`);

    // Métodos de pago
    const paymentMappings = await prisma.paymentMethodAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Métodos de pago: ${paymentMappings}`);

    // Gastos (pendiente)
    const expenseMappings = await prisma.expenseTypeAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Gastos: ${expenseMappings}`);

    // Descuentos
    const discountMappings = await prisma.discountTypeAccountMapping.count({
      where: { systemId: system.id }
    });
    console.log(`   - Descuentos/Promociones: ${discountMappings}`);

    // 8. Mostrar ejemplos de mapeos
    console.log('\n📋 EJEMPLOS DE MAPEOS:');
    
    // Ejemplo de servicio
    const serviceExample = await prisma.serviceAccountMapping.findFirst({
      where: { systemId: system.id },
      include: { 
        service: true,
        account: true,
        clinic: true
      }
    });
    if (serviceExample) {
      console.log(`\n   Servicio: ${serviceExample.service.name}`);
      console.log(`   Clínica: ${serviceExample.clinic?.name || 'Todas'}`);
      console.log(`   Cuenta: ${serviceExample.account.accountNumber} - ${serviceExample.account.name}`);
      console.log(`   Subcuenta: ${serviceExample.subaccountPattern}`);
    }

    // Ejemplo de producto
    const productExample = await prisma.productAccountMapping.findFirst({
      where: { systemId: system.id },
      include: { 
        product: true,
        account: true,
        clinic: true
      }
    });
    if (productExample) {
      console.log(`\n   Producto: ${productExample.product.name}`);
      console.log(`   Clínica: ${productExample.clinic?.name || 'Todas'}`);
      console.log(`   Cuenta: ${productExample.account.accountNumber} - ${productExample.account.name}`);
      console.log(`   Subcuenta: ${productExample.subaccountPattern}`);
    }

    // Ejemplo de descuento (si existe)
    const discountExample = await prisma.discountTypeAccountMapping.findFirst({
      where: { systemId: system.id },
      include: { 
        account: true
      }
    });
    if (discountExample) {
      console.log(`\n   Descuento: ${discountExample.discountTypeName}`);
      console.log(`   Cuenta: ${discountExample.account.accountNumber} - ${discountExample.account.name}`);
      console.log(`   Subcuenta: ${discountExample.subaccountPattern || 'N/A'}`);
    }

    console.log('\n✅ Prueba completada exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testUnifiedMappingComplete();
