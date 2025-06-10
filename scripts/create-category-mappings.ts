import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

// Patrones de subcuentas por país/PGC
const ACCOUNT_PATTERNS = {
  ES: {
    serviceSales: '705', // Prestación de servicios
    productSales: '701', // Venta de productos
    purchases: '600',    // Compras
    clients: '430',      // Clientes
    discounts: '708',    // Descuentos sobre ventas
    cash: '570',         // Caja
    banks: '572',        // Bancos
    vatOutput: '477',    // IVA repercutido
    vatInput: '472'      // IVA soportado
  },
  MA: {
    serviceSales: '712', // Prestación de servicios (Marruecos)
    productSales: '711', // Venta de productos (Marruecos)
    purchases: '611',    // Compras
    clients: '342',      // Clientes
    discounts: '718',    // Descuentos
    cash: '516',         // Caja
    banks: '514',        // Bancos
    vatOutput: '445',    // TVA collectée
    vatInput: '345'      // TVA déductible
  }
};

async function createSubaccount(
  parentCode: string,
  suffix: string,
  name: string,
  type: AccountType,
  legalEntityId: string,
  systemId: string
): Promise<any> {
  const accountNumber = `${parentCode}.${suffix}`;
  
  // Verificar si ya existe
  const existing = await prisma.chartOfAccountEntry.findFirst({
    where: {
      accountNumber,
      legalEntityId
    }
  });
  
  if (existing) {
    console.log(`Subcuenta ya existe: ${accountNumber}`);
    return existing;
  }
  
  // Buscar cuenta padre
  const parentAccount = await prisma.chartOfAccountEntry.findFirst({
    where: {
      accountNumber: parentCode,
      legalEntityId
    }
  });
  
  // Crear subcuenta
  const subaccount = await prisma.chartOfAccountEntry.create({
    data: {
      accountNumber,
      name,
      type,
      description: `Subcuenta analítica - ${name}`,
      isSubAccount: true,
      parentAccountId: parentAccount?.id || null,
      level: parentAccount ? 1 : 0,
      isMonetary: true,
      allowsDirectEntry: true,
      isActive: true,
      legalEntityId,
      systemId
    }
  });
  
  console.log(`✅ Creada subcuenta: ${accountNumber} - ${name}`);
  return subaccount;
}

async function createCategoryMappings() {
  try {
    // Obtener datos necesarios
    const [categories, legalEntities, systems] = await Promise.all([
      prisma.category.findMany(),
      prisma.legalEntity.findMany(),
      prisma.system.findMany()
    ]);
    
    console.log(`📊 Encontradas ${categories.length} categorías`);
    console.log(`🏢 Encontradas ${legalEntities.length} entidades legales`);
    console.log(`🌐 Encontrados ${systems.length} sistemas`);
    
    for (const legalEntity of legalEntities) {
      for (const system of systems) {
        // Determinar el patrón según el país (por defecto España)
        const countryCode = legalEntity.countryIsoCode || 'ES';
        const patterns = ACCOUNT_PATTERNS[countryCode] || ACCOUNT_PATTERNS.ES;
        
        console.log(`\n🔧 Procesando entidad ${legalEntity.name} (${countryCode})`);
        
        // Crear cuentas principales si no existen
        const mainAccounts = [
          { code: patterns.serviceSales, name: 'Prestación de servicios', type: 'REVENUE' },
          { code: patterns.productSales, name: 'Venta de productos', type: 'REVENUE' },
          { code: patterns.clients, name: 'Clientes', type: 'ASSET' },
          { code: patterns.discounts, name: 'Descuentos sobre ventas', type: 'REVENUE' },
          { code: patterns.cash, name: 'Caja', type: 'ASSET' },
          { code: patterns.banks, name: 'Bancos', type: 'ASSET' },
          { code: patterns.vatOutput, name: 'IVA repercutido', type: 'LIABILITY' },
          { code: patterns.vatInput, name: 'IVA soportado', type: 'ASSET' }
        ];
        
        // Crear cuentas principales
        for (const account of mainAccounts) {
          const existing = await prisma.chartOfAccountEntry.findFirst({
            where: {
              accountNumber: account.code,
              legalEntityId: legalEntity.id
            }
          });
          
          if (!existing) {
            await prisma.chartOfAccountEntry.create({
              data: {
                accountNumber: account.code,
                name: account.name,
                type: account.type as AccountType,
                description: `Cuenta principal - ${account.name}`,
                isSubAccount: false,
                level: 0,
                isMonetary: true,
                allowsDirectEntry: false, // No permitir apuntes directos en cuentas principales
                isActive: true,
                legalEntityId: legalEntity.id,
                systemId: system.id
              }
            });
            console.log(`✅ Creada cuenta principal: ${account.code} - ${account.name}`);
          }
        }
        
        // Mapear categorías y crear subcuentas
        for (let i = 0; i < categories.length; i++) {
          const category = categories[i];
          const categoryCode = String(i + 1).padStart(2, '0');
          
          // Determinar si es servicio o producto
          const isService = !category.name.toLowerCase().includes('producto') && 
                           !category.name.toLowerCase().includes('cosmética');
          
          const baseAccount = isService ? patterns.serviceSales : patterns.productSales;
          
          // Crear subcuenta para la categoría
          const categoryAccount = await createSubaccount(
            baseAccount,
            categoryCode,
            category.name,
            'REVENUE',
            legalEntity.id,
            system.id
          );
          
          // Verificar si ya existe el mapeo
          const existingMapping = await prisma.categoryAccountMapping.findFirst({
            where: {
              categoryId: category.id,
              legalEntityId: legalEntity.id
            }
          });
          
          if (!existingMapping && categoryAccount) {
            // Crear el mapeo con patrón de subcuentas
            await prisma.categoryAccountMapping.create({
              data: {
                categoryId: category.id,
                accountId: categoryAccount.id,
                legalEntityId: legalEntity.id,
                systemId: system.id,
                // Patrón para generar subcuentas adicionales (por clínica, etc)
                subaccountPattern: `${baseAccount}.${categoryCode}.{clinic}`,
                analyticalDimensions: {
                  base: baseAccount,
                  categoryCode,
                  dimensions: ['clinic', 'professional', 'period']
                },
                appliesToServices: isService,
                appliesToProducts: !isService
              }
            });
            console.log(`✅ Creado mapeo: ${category.name} -> ${categoryAccount.accountNumber}`);
          }
        }
        
        // Crear mapeos para tipos de IVA
        const vatTypes = await prisma.vATType.findMany({
          where: { systemId: system.id }
        });
        
        for (const vatType of vatTypes) {
          const vatRate = String(vatType.rate).replace('.', '');
          
          // Crear subcuenta para IVA repercutido
          const vatOutputAccount = await createSubaccount(
            patterns.vatOutput,
            vatRate,
            `IVA repercutido ${vatType.rate}%`,
            'LIABILITY',
            legalEntity.id,
            system.id
          );
          
          // Crear subcuenta para IVA soportado
          const vatInputAccount = await createSubaccount(
            patterns.vatInput,
            vatRate,
            `IVA soportado ${vatType.rate}%`,
            'ASSET',
            legalEntity.id,
            system.id
          );
          
          // Verificar mapeo existente
          const existingVatMapping = await prisma.vATTypeAccountMapping.findFirst({
            where: {
              vatTypeId: vatType.id,
              legalEntityId: legalEntity.id
            }
          });
          
          if (!existingVatMapping) {
            await prisma.vATTypeAccountMapping.create({
              data: {
                vatTypeId: vatType.id,
                outputAccountId: vatOutputAccount.id,
                inputAccountId: vatInputAccount.id,
                legalEntityId: legalEntity.id,
                systemId: system.id
              }
            });
            console.log(`✅ Creado mapeo IVA ${vatType.rate}%`);
          }
        }
        
        // Crear mapeos para métodos de pago
        const paymentMethods = await prisma.paymentMethodDefinition.findMany({
          where: { systemId: system.id }
        });
        
        for (let i = 0; i < paymentMethods.length; i++) {
          const paymentMethod = paymentMethods[i];
          const methodCode = String(i + 1).padStart(3, '0');
          
          // Determinar cuenta base según tipo de pago
          let baseAccount = patterns.cash; // Por defecto caja
          if (paymentMethod.type === 'CARD' || paymentMethod.type === 'BANK_TRANSFER') {
            baseAccount = patterns.banks;
          }
          
          // Crear subcuenta para método de pago
          const paymentAccount = await createSubaccount(
            baseAccount,
            methodCode,
            paymentMethod.name,
            'ASSET',
            legalEntity.id,
            system.id
          );
          
          // Verificar mapeo existente
          const existingPaymentMapping = await prisma.paymentMethodAccountMapping.findFirst({
            where: {
              paymentMethodDefinitionId: paymentMethod.id,
              legalEntityId: legalEntity.id
            }
          });
          
          if (!existingPaymentMapping) {
            await prisma.paymentMethodAccountMapping.create({
              data: {
                paymentMethodDefinitionId: paymentMethod.id,
                accountId: paymentAccount.id,
                legalEntityId: legalEntity.id,
                systemId: system.id
              }
            });
            console.log(`✅ Creado mapeo pago: ${paymentMethod.name} -> ${paymentAccount.accountNumber}`);
          }
        }
        
        // Crear mapeos para tipos de descuento
        const discountTypes = ['MANUAL', 'PROMO', 'PERCENTAGE', 'AMOUNT'];
        
        for (let i = 0; i < discountTypes.length; i++) {
          const discountType = discountTypes[i];
          const discountCode = String(i + 1).padStart(2, '0');
          
          // Crear subcuenta para tipo de descuento
          const discountAccount = await createSubaccount(
            patterns.discounts,
            discountCode,
            `Descuento ${discountType}`,
            'REVENUE',
            legalEntity.id,
            system.id
          );
          
          // Verificar mapeo existente
          const existingDiscountMapping = await prisma.discountTypeAccountMapping.findFirst({
            where: {
              discountTypeCode: discountType,
              legalEntityId: legalEntity.id
            }
          });
          
          if (!existingDiscountMapping) {
            await prisma.discountTypeAccountMapping.create({
              data: {
                discountTypeCode: discountType,
                discountTypeName: `Descuento ${discountType}`,
                accountId: discountAccount.id,
                legalEntityId: legalEntity.id,
                systemId: system.id
              }
            });
            console.log(`✅ Creado mapeo descuento: ${discountType} -> ${discountAccount.accountNumber}`);
          }
        }
      }
    }
    
    console.log('\n✅ Proceso completado. Sistema de contabilidad analítica configurado.');
    
  } catch (error) {
    console.error('❌ Error creando mapeos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCategoryMappings();
