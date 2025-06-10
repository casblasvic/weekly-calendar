#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { FIXED_COUNTRY_ACCOUNTS } from '../app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

const prisma = new PrismaClient();

async function verifyAccountMappings() {
  try {
    console.log('🔍 Verificando mapeos de cuentas contables...\n');

    // Obtener la primera entidad legal disponible
    const legalEntity = await prisma.legalEntity.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!legalEntity) {
      console.error('❌ No se encontró ninguna entidad legal');
      console.log('Listando todas las entidades legales...');
      const allEntities = await prisma.legalEntity.findMany();
      console.log('Total de entidades:', allEntities.length);
      process.exit(1);
    }

    const countryCode = legalEntity.countryIsoCode || 'ES';
    const countryAccounts = FIXED_COUNTRY_ACCOUNTS[countryCode];
    
    console.log(`📍 País: ${countryCode}`);
    console.log(`🏢 Entidad Legal: ${legalEntity.name}\n`);

    // Obtener mapeos
    const categoryMappings = await prisma.categoryAccountMapping.findMany({
      where: { legalEntityId: legalEntity.id },
      include: { category: true, account: true }
    });
    
    const serviceMappings = await prisma.serviceAccountMapping.findMany({
      where: { legalEntityId: legalEntity.id },
      include: { 
        service: true, 
        account: true,
        clinic: true 
      }
    });
    
    const productMappings = await prisma.productAccountMapping.findMany({
      where: { legalEntityId: legalEntity.id },
      include: { 
        product: {
          include: { settings: true }
        }, 
        account: true,
        clinic: true
      }
    });

    const paymentMethodMappings = await prisma.paymentMethodAccountMapping.findMany({
      where: { legalEntityId: legalEntity.id },
      include: { 
        paymentMethodDefinition: true,
        account: true,
        clinic: true
      }
    });
    
    const totalCategories = await prisma.category.count({ where: { systemId: legalEntity.systemId } });
    const totalServices = await prisma.service.count({ where: { systemId: legalEntity.systemId } });
    const totalProducts = await prisma.product.count({ where: { systemId: legalEntity.systemId } });
    const totalPaymentMethods = await prisma.paymentMethodDefinition.count({ where: { systemId: legalEntity.systemId } });
    
    // Contar mapeos por clínica
    const servicesByClinic = serviceMappings.filter(m => m.clinicId !== null).length;
    const productsByClinic = productMappings.filter(m => m.clinicId !== null).length;
    const paymentsByClinic = paymentMethodMappings.filter(m => m.clinicId !== null).length;
    
    console.log(`Categorías: ${categoryMappings.length}/${totalCategories} mapeadas`);
    console.log(`Servicios: ${serviceMappings.length}/${totalServices} mapeados (${servicesByClinic} específicos de clínica)`);
    console.log(`Productos: ${productMappings.length}/${totalProducts} mapeados (${productsByClinic} específicos de clínica)`);
    console.log(`Métodos de pago: ${paymentMethodMappings.length}/${totalPaymentMethods} mapeados (${paymentsByClinic} específicos de clínica)`);

    // Verificar errores comunes
    const incorrectServiceMappings = serviceMappings.filter(m => 
      !m.account.accountNumber.startsWith(countryAccounts.services)
    );
    
    // Para productos, verificar según el tipo
    const incorrectProductMappings = productMappings.filter(mapping => {
      const isForSale = mapping.product.settings?.isForSale ?? true;
      const isInternalUse = mapping.product.settings?.isInternalUse ?? false;
      const accountNumber = mapping.account.accountNumber;
      
      if (isForSale && isInternalUse) {
        // Producto dual - debe estar en 7xx o 6xx
        return !accountNumber.startsWith(countryAccounts.products) && 
               !accountNumber.startsWith(countryAccounts.consumables);
      } else if (isForSale && !isInternalUse) {
        // Solo venta - debe estar en 7xx
        return !accountNumber.startsWith(countryAccounts.products);
      } else if (!isForSale && isInternalUse) {
        // Solo consumo interno - debe estar en 6xx
        return !accountNumber.startsWith(countryAccounts.consumables);
      } else {
        // Por defecto, asumir venta
        return !accountNumber.startsWith(countryAccounts.products);
      }
    });
    
    if (incorrectServiceMappings.length > 0) {
      console.log(`\n⚠️  ${incorrectServiceMappings.length} servicios con mapeo incorrecto:`);
      incorrectServiceMappings.forEach(m => {
        const clinicInfo = m.clinic ? ` (Clínica: ${m.clinic.name})` : ' (Global)';
        console.log(`   - ${m.service.name}${clinicInfo} → ${m.account.accountNumber} ${m.account.name}`);
      });
    }
    
    if (incorrectProductMappings.length > 0) {
      console.log(`\n⚠️  ${incorrectProductMappings.length} productos con mapeo incorrecto:`);
      incorrectProductMappings.forEach(m => {
        const isForSale = m.product.settings?.isForSale ?? true;
        const isInternalUse = m.product.settings?.isInternalUse ?? false;
        const type = isForSale && isInternalUse ? 'dual' : isForSale ? 'venta' : 'consumo';
        const expectedAccount = type === 'venta' ? countryAccounts.products : countryAccounts.consumables;
        const clinicInfo = m.clinic ? ` (Clínica: ${m.clinic.name})` : ' (Global)';
        console.log(`   - ${m.product.name}${clinicInfo} [${type}] → ${m.account.accountNumber} ${m.account.name} (esperado: ${expectedAccount}xx)`);
      });
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
verifyAccountMappings();
