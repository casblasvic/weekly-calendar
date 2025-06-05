/**
 * Script de prueba para los generadores de configuración contable
 */

import { generateCompleteConfiguration, validateConfiguration, generateConfigurationSummary } from '../lib/accounting/generators/template-configurator';
import { BusinessFeatures } from '../lib/accounting/generators/types';

// Configuración de prueba
const testConfig = {
  businessType: 'MEDICAL_AESTHETIC',
  features: {
    hasHairSalon: true,
    hasSpa: true,
    hasMedicalTreatments: true,
    sellsProducts: true,
    hasMultipleLocations: true
  } as BusinessFeatures,
  locations: ['Madrid', 'Barcelona', 'Valencia'],
  productStrategy: 'SALES_AND_CONSUMABLES' as const,
  paymentConfig: {
    enableFinancing: true,
    enableGiftCards: true,
    enableDirectDebit: true,
    enableChecks: false,
    enableDigital: true
  },
  inventoryControl: 'STRICT' as const,
  language: 'es'
};

// Plantilla base simulada
const baseTemplate = {
  chartOfAccounts: [
    { accountNumber: '100', name: 'Capital Social', type: 'EQUITY' },
    { accountNumber: '572', name: 'Bancos', type: 'ASSET' },
    { accountNumber: '700', name: 'Ventas', type: 'REVENUE' }
  ],
  vatTypes: [
    { code: 'IVA21', rate: 21, description: 'IVA General' },
    { code: 'IVA10', rate: 10, description: 'IVA Reducido' }
  ]
};

// Ejecutar pruebas
console.log('🧪 Probando generadores de configuración contable...\n');

// Validar configuración
const errors = validateConfiguration(testConfig);
if (errors.length > 0) {
  console.error('❌ Errores de validación:', errors);
  process.exit(1);
}
console.log('✅ Configuración válida\n');

// Generar configuración completa
const fullConfig = generateCompleteConfiguration(testConfig, baseTemplate);
console.log('📋 Configuración generada:');
console.log('- Tipo de negocio:', fullConfig.configuration.baseType);
console.log('- Características:', fullConfig.configuration.features);
console.log('- Ubicaciones:', fullConfig.configuration.locations);
console.log('');

// Mostrar categorías generadas
console.log('📁 Categorías de servicios generadas:');
fullConfig.serviceCategories.forEach(cat => {
  console.log(`  - ${cat.name} (${cat.code})`);
});
console.log('');

// Mostrar familias de productos
console.log('📦 Familias de productos generadas:');
fullConfig.productFamilies.forEach(fam => {
  console.log(`  - ${fam.name} (${fam.code})`);
});
console.log('');

// Mostrar series de documentos
console.log('📄 Series de documentos generadas:');
fullConfig.documentSeries.forEach(series => {
  console.log(`  - ${series.code}: ${series.prefix} (${series.description?.es})`);
});
console.log('');

// Mostrar métodos de pago
console.log('💳 Métodos de pago generados:');
fullConfig.paymentMethods.forEach(method => {
  console.log(`  - ${method.name.es} (${method.code}) - Tipo: ${method.type}`);
});
console.log('');

// Generar resumen
const summary = generateConfigurationSummary(fullConfig, 'es');
console.log('📊 Resumen de la configuración:');
summary.details.forEach(detail => console.log(`  ${detail}`));
console.log('');

console.log('✅ Prueba completada exitosamente!');
