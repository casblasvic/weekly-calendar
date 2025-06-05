/**
 * Ejemplo de uso de la Configuración Máxima de Plantillas Contables
 * 
 * Este ejemplo muestra cómo importar y personalizar una configuración
 * contable completa para un negocio.
 */

import { generateMaximumConfiguration } from '@/lib/accounting/generators/maximum-template-configurator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Ejemplo 1: Importar configuración máxima para España
 */
async function importMaximumConfigForSpain(
  systemId: string,
  legalEntityId: string
) {
  try {
    // Generar la configuración máxima
    const config = await generateMaximumConfiguration('ES', 'es');
    
    console.log('Configuración generada:');
    console.log(`- ${config.accounts.length} cuentas contables`);
    console.log(`- ${config.paymentMethods.length} métodos de pago`);
    console.log(`- ${config.serviceCategories.length} categorías de servicios`);
    console.log(`- ${config.productFamilies.length} familias de productos`);
    console.log(`- ${config.documentSeries.length} series de documentos`);
    
    // Importar al sistema
    const response = await fetch('/api/chart-of-accounts/import-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemId,
        legalEntityId,
        countryCode: 'ES'
      })
    });
    
    const result = await response.json();
    console.log('Importación completada:', result);
    
    return result;
  } catch (error) {
    console.error('Error importando configuración:', error);
    throw error;
  }
}

/**
 * Ejemplo 2: Personalizar métodos de pago después de importar
 */
async function customizePaymentMethods(legalEntityId: string) {
  // Desactivar métodos de pago que no se usan
  const unusedMethods = ['CHECK', 'ONLINE_GATEWAY'];
  
  for (const methodType of unusedMethods) {
    await prisma.paymentMethod.updateMany({
      where: {
        legalEntityId,
        type: methodType
      },
      data: {
        isActive: false
      }
    });
  }
  
  console.log('Métodos de pago personalizados');
}

/**
 * Ejemplo 3: Ocultar cuentas no utilizadas
 */
async function hideUnusedAccounts(legalEntityId: string) {
  // Lista de prefijos de cuentas a ocultar
  const accountPrefixesToHide = [
    '280', // Amortizaciones (si no tienen activos fijos)
    '640', // Nóminas (si no tienen empleados)
    '431'  // Efectos comerciales (si no aceptan pagarés)
  ];
  
  for (const prefix of accountPrefixesToHide) {
    await prisma.chartOfAccount.updateMany({
      where: {
        legalEntityId,
        accountCode: {
          startsWith: prefix
        }
      },
      data: {
        isVisible: false // Campo hipotético para visibilidad
      }
    });
  }
  
  console.log('Cuentas no utilizadas ocultadas');
}

/**
 * Ejemplo 4: Configurar para un negocio específico
 */
async function setupForBeautySalon(
  systemId: string,
  legalEntityId: string
) {
  // 1. Importar configuración máxima
  await importMaximumConfigForSpain(systemId, legalEntityId);
  
  // 2. Personalizar métodos de pago
  await customizePaymentMethods(legalEntityId);
  
  // 3. Ocultar cuentas irrelevantes
  await hideUnusedAccounts(legalEntityId);
  
  // 4. Activar categorías de servicios relevantes
  const relevantCategories = [
    'TRATAMIENTO_ESTETICO',
    'SERVICIOS_PELUQUERIA',
    'SERVICIOS_SPA'
  ];
  
  await prisma.serviceCategory.updateMany({
    where: {
      legalEntityId,
      code: {
        notIn: relevantCategories
      }
    },
    data: {
      isActive: false
    }
  });
  
  console.log('Configuración personalizada para salón de belleza completada');
}

/**
 * Ejemplo 5: Verificar integridad de la configuración
 */
async function verifyConfiguration(legalEntityId: string) {
  const checks = {
    accounts: await prisma.chartOfAccount.count({ where: { legalEntityId } }),
    paymentMethods: await prisma.paymentMethod.count({ where: { legalEntityId } }),
    activePaymentMethods: await prisma.paymentMethod.count({ 
      where: { legalEntityId, isActive: true } 
    }),
    mappedAccounts: await prisma.accountingMapping.count({ where: { legalEntityId } })
  };
  
  console.log('Verificación de configuración:');
  console.log(`- Total cuentas: ${checks.accounts}`);
  console.log(`- Total métodos de pago: ${checks.paymentMethods}`);
  console.log(`- Métodos de pago activos: ${checks.activePaymentMethods}`);
  console.log(`- Mapeos contables: ${checks.mappedAccounts}`);
  
  // Verificar que todos los métodos de pago tienen mapeo
  const unmappedMethods = await prisma.paymentMethod.findMany({
    where: {
      legalEntityId,
      isActive: true,
      mappings: {
        none: {}
      }
    }
  });
  
  if (unmappedMethods.length > 0) {
    console.warn('⚠️ Métodos de pago sin mapeo contable:', unmappedMethods);
  }
  
  return checks;
}

/**
 * Ejemplo 6: Generar reporte de configuración
 */
async function generateConfigurationReport(
  legalEntityId: string
): Promise<string> {
  const config = await generateMaximumConfiguration('ES', 'es');
  const summary = config.generateSummary();
  
  const stats = await verifyConfiguration(legalEntityId);
  
  const report = `
# Reporte de Configuración Contable
Fecha: ${new Date().toLocaleDateString('es-ES')}
Entidad Legal: ${legalEntityId}

## Resumen de Configuración Máxima
${summary}

## Estadísticas Actuales
- Cuentas contables: ${stats.accounts}
- Métodos de pago totales: ${stats.paymentMethods}
- Métodos de pago activos: ${stats.activePaymentMethods}
- Mapeos contables configurados: ${stats.mappedAccounts}

## Recomendaciones
${stats.accounts < 100 ? '⚠️ Pocas cuentas detectadas. Considera importar la configuración máxima.' : '✅ Configuración de cuentas completa.'}
${stats.activePaymentMethods < 3 ? '⚠️ Pocos métodos de pago activos. Revisa si necesitas habilitar más.' : '✅ Métodos de pago suficientes.'}
${stats.mappedAccounts < stats.paymentMethods ? '⚠️ Algunos métodos de pago no tienen mapeo contable.' : '✅ Todos los mapeos configurados.'}
`;

  return report;
}

// Exportar funciones para uso externo
export {
  importMaximumConfigForSpain,
  customizePaymentMethods,
  hideUnusedAccounts,
  setupForBeautySalon,
  verifyConfiguration,
  generateConfigurationReport
};
