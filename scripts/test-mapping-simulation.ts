// Script de simulación del servicio de mapeo unificado
// Este script simula el comportamiento sin hacer llamadas reales a la base de datos

import { 
  getAutoServiceMapping,
  getAutoProductMapping,
  getAutoPaymentMethodMapping
} from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';
import { generateClinicCode } from '@/lib/accounting/clinic-utils';

// Función para generar códigos de subcuenta
function generateSubaccountCode({
  baseAccount,
  clinicCode,
  categoryCode,
  itemCode,
  itemType
}: {
  baseAccount: string;
  clinicCode?: string;
  categoryCode?: string | null;
  itemCode?: string;
  itemType?: 'V' | 'C';
}) {
  const parts = [baseAccount];
  
  if (clinicCode) parts.push(clinicCode);
  if (categoryCode) parts.push(categoryCode);
  if (itemCode) parts.push(itemCode);
  if (itemType) parts.push(itemType);
  
  return parts.join('.');
}

// Datos simulados
const mockClinics = [
  { id: 'clinic-1', name: 'Clínica Centro Madrid' },
  { id: 'clinic-2', name: 'Clínica Norte Barcelona' }
];

const mockServices = [
  { id: 'srv-1', name: 'Consulta Dermatología', category: { name: 'Dermatología' } },
  { id: 'srv-2', name: 'Botox Facial', category: { name: 'Medicina Estética' } },
  { id: 'srv-3', name: 'Láser CO2', category: { name: 'Dermatología' } }
];

const mockProducts = [
  { id: 'prod-1', name: 'Crema Antiedad', category: { name: 'Cosmética' }, forSale: true, isConsumable: false },
  { id: 'prod-2', name: 'Agujas Botox', category: { name: 'Material Médico' }, forSale: false, isConsumable: true },
  { id: 'prod-3', name: 'Sérum Vitamina C', category: { name: 'Cosmética' }, forSale: true, isConsumable: true }
];

const mockPaymentMethods = [
  { id: 'pm-1', name: 'Efectivo', type: 'CASH' },
  { id: 'pm-2', name: 'Tarjeta de Crédito', type: 'CARD' },
  { id: 'pm-3', name: 'Transferencia Bancaria', type: 'TRANSFER' }
];

// Simulación del plan de cuentas
const mockChartOfAccounts = [
  { accountNumber: '705', name: 'Prestación de Servicios', type: 'REVENUE' },
  { accountNumber: '700', name: 'Venta de Mercaderías', type: 'REVENUE' },
  { accountNumber: '600', name: 'Compras de Mercaderías', type: 'EXPENSE' },
  { accountNumber: '570', name: 'Caja', type: 'ASSET' },
  { accountNumber: '572', name: 'Bancos', type: 'ASSET' }
];

console.log('🎯 SIMULACIÓN DEL SERVICIO DE MAPEO CONTABLE UNIFICADO');
console.log('=====================================================\n');

// Test 1: Mapeo de servicios
console.log('📋 TEST 1: MAPEO DE SERVICIOS POR CLÍNICA');
console.log('------------------------------------------\n');

for (const clinic of mockClinics) {
  console.log(`🏥 ${clinic.name} (${generateClinicCode(clinic.name)})`);
  
  for (const service of mockServices) {
    // Simular obtención de mapeo automático
    const mapping = getAutoServiceMapping(
      service as any,
      mockChartOfAccounts as any,
      'ES'
    );
    
    if (mapping) {
      const clinicCode = generateClinicCode(clinic.name);
      const categoryCode = service.category ? service.category.name.substring(0, 3).toUpperCase() : null;
      const serviceCode = service.name.substring(0, 3).toUpperCase();
      
      const subaccountCode = generateSubaccountCode({
        baseAccount: mapping.accountNumber,
        clinicCode,
        categoryCode,
        itemCode: serviceCode
      });
      
      console.log(`   ✓ ${service.name}: ${subaccountCode}`);
    } else {
      console.log(`   ✗ ${service.name}: Sin mapeo`);
    }
  }
  console.log('');
}

// Test 2: Mapeo de productos
console.log('📦 TEST 2: MAPEO DE PRODUCTOS');
console.log('-----------------------------\n');

const testClinic = mockClinics[0];
console.log(`🏥 ${testClinic.name} (${generateClinicCode(testClinic.name)})\n`);

for (const product of mockProducts) {
  const clinicCode = generateClinicCode(testClinic.name);
  const categoryCode = product.category ? product.category.name.substring(0, 3).toUpperCase() : null;
  const productCode = product.name.substring(0, 3).toUpperCase();
  
  if (product.forSale) {
    const saleMapping = getAutoProductMapping(
      product as any,
      mockChartOfAccounts as any,
      'ES'
    );
    
    if (saleMapping && !Array.isArray(saleMapping)) {
      const subaccountCode = generateSubaccountCode({
        baseAccount: saleMapping.accountNumber,
        clinicCode,
        categoryCode,
        itemCode: productCode,
        itemType: 'V'
      });
      console.log(`   💰 ${product.name} (Venta): ${subaccountCode}`);
    }
  }
  
  if (product.isConsumable) {
    const consumptionMapping = getAutoProductMapping(
      product as any,
      mockChartOfAccounts as any,
      'ES'
    );
    
    if (consumptionMapping && !Array.isArray(consumptionMapping)) {
      const subaccountCode = generateSubaccountCode({
        baseAccount: consumptionMapping.accountNumber,
        clinicCode,
        categoryCode,
        itemCode: productCode,
        itemType: 'C'
      });
      console.log(`   📦 ${product.name} (Consumo): ${subaccountCode}`);
    }
  }
}

console.log('');

// Test 3: Mapeo de métodos de pago
console.log('💳 TEST 3: MAPEO DE MÉTODOS DE PAGO');
console.log('-----------------------------------\n');

for (const clinic of mockClinics) {
  console.log(`🏥 ${clinic.name} (${generateClinicCode(clinic.name)})`);
  
  for (const method of mockPaymentMethods) {
    const mapping = getAutoPaymentMethodMapping(method.type as any, mockChartOfAccounts as any, 'ES');
    
    if (mapping) {
      const clinicCode = generateClinicCode(clinic.name);
      const methodCode = method.name.substring(0, 3).toUpperCase();
      
      const subaccountCode = generateSubaccountCode({
        baseAccount: mapping.accountNumber,
        clinicCode,
        itemCode: methodCode
      });
      
      console.log(`   ✓ ${method.name}: ${subaccountCode}`);
    } else {
      console.log(`   ✗ ${method.name}: Sin mapeo`);
    }
  }
  console.log('');
}

// Resumen de estructura
console.log('📊 RESUMEN DE ESTRUCTURA DE CÓDIGOS');
console.log('===================================\n');

console.log('Servicios:');
console.log('  Formato: {cuenta_base}.{clínica}.{categoría}.{servicio}');
console.log('  Ejemplo: 705.CCM.DER.CON\n');

console.log('Productos Venta:');
console.log('  Formato: {cuenta_base}.{clínica}.{categoría}.{producto}.V');
console.log('  Ejemplo: 700.CCM.COS.CRE.V\n');

console.log('Productos Consumo:');
console.log('  Formato: {cuenta_base}.{clínica}.{categoría}.{producto}.C');
console.log('  Ejemplo: 600.CCM.MAT.AGU.C\n');

console.log('Métodos de Pago:');
console.log('  Formato: {cuenta_base}.{clínica}.{método}');
console.log('  Ejemplo: 570.CCM.EFE\n');

console.log('✅ SIMULACIÓN COMPLETADA');
console.log('\nEsta simulación muestra cómo se generarían los códigos');
console.log('sin realizar operaciones reales en la base de datos.');
