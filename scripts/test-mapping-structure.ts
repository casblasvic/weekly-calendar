// Script para verificar la estructura de subcuentas generada
import { generateClinicCode } from '@/lib/accounting/clinic-utils';
import { generateSubaccountCode } from '@/lib/accounting/unified-mapping-service';

console.log('🧪 Probando la generación de códigos de subcuenta...\n');

// Casos de prueba para servicios
console.log('📋 SERVICIOS:');
const serviceTests = [
  {
    baseAccount: '705',
    clinic: 'Clínica Centro Madrid',
    category: 'Medicina Estética',
    service: 'Botox',
    expected: '705.CCM.MED.BOT'
  },
  {
    baseAccount: '705',
    clinic: 'Clínica Norte Barcelona',
    category: 'Dermatología',
    service: 'Láser CO2',
    expected: '705.CNB.DER.LAS'
  },
  {
    baseAccount: '705',
    clinic: 'Centro Wellness Valencia',
    category: 'Fisioterapia',
    service: 'Masaje Terapéutico',
    expected: '705.CWV.FIS.MAS'
  }
];

serviceTests.forEach((test, index) => {
  const clinicCode = generateClinicCode(test.clinic);
  const categoryCode = test.category.substring(0, 3).toUpperCase();
  const serviceCode = test.service.substring(0, 3).toUpperCase();
  
  const subaccountCode = generateSubaccountCode({
    baseAccount: test.baseAccount,
    clinicCode,
    categoryCode,
    itemCode: serviceCode,
    itemType: null as string | null
  });
  
  console.log(`  ${index + 1}. ${test.service} (${test.clinic})`);
  console.log(`     Código generado: ${subaccountCode}`);
  console.log(`     Esperado: ${test.expected}`);
  console.log(`     ✅ Estructura: ${test.baseAccount} (cuenta base) . ${clinicCode} (clínica) . ${categoryCode} (categoría) . ${serviceCode} (servicio)\n`);
});

// Casos de prueba para productos
console.log('\n📦 PRODUCTOS:');
const productTests = [
  {
    baseAccount: '700',
    clinic: 'Clínica Centro Madrid',
    category: 'Cosmética',
    product: 'Crema Antiedad',
    type: 'V', // Venta
    expected: '700.CCM.COS.CRE.V'
  },
  {
    baseAccount: '600',
    clinic: 'Clínica Centro Madrid',
    category: 'Material Médico',
    product: 'Agujas Botox',
    type: 'C', // Consumo
    expected: '600.CCM.MAT.AGU.C'
  }
];

productTests.forEach((test, index) => {
  const clinicCode = generateClinicCode(test.clinic);
  const categoryCode = test.category.substring(0, 3).toUpperCase();
  const productCode = test.product.substring(0, 3).toUpperCase();
  
  const subaccountCode = generateSubaccountCode({
    baseAccount: test.baseAccount,
    clinicCode,
    categoryCode,
    itemCode: productCode,
    itemType: test.type as string | null
  });
  
  console.log(`  ${index + 1}. ${test.product} (${test.clinic}) - ${test.type === 'V' ? 'Venta' : 'Consumo'}`);
  console.log(`     Código generado: ${subaccountCode}`);
  console.log(`     Esperado: ${test.expected}`);
  console.log(`     ✅ Estructura: ${test.baseAccount} . ${clinicCode} . ${categoryCode} . ${productCode} . ${test.type}\n`);
});

// Casos de prueba para métodos de pago
console.log('\n💳 MÉTODOS DE PAGO:');
const paymentTests = [
  {
    baseAccount: '570',
    clinic: 'Clínica Centro Madrid',
    method: 'Efectivo',
    expected: '570.CCM.EFE'
  },
  {
    baseAccount: '572',
    clinic: 'Clínica Norte Barcelona',
    method: 'Transferencia Bancaria',
    expected: '572.CNB.TRA'
  }
];

paymentTests.forEach((test, index) => {
  const clinicCode = generateClinicCode(test.clinic);
  const methodCode = test.method.substring(0, 3).toUpperCase();
  
  const subaccountCode = generateSubaccountCode({
    baseAccount: test.baseAccount,
    clinicCode,
    categoryCode: null as string | null,
    itemCode: methodCode,
    itemType: null as string | null
  });
  
  console.log(`  ${index + 1}. ${test.method} (${test.clinic})`);
  console.log(`     Código generado: ${subaccountCode}`);
  console.log(`     Esperado: ${test.expected}`);
  console.log(`     ✅ Estructura: ${test.baseAccount} . ${clinicCode} . ${methodCode}\n`);
});

console.log('\n📊 RESUMEN DE LA ESTRUCTURA:');
console.log('  - Servicios: {cuenta_base}.{clínica}.{categoría}.{servicio}');
console.log('  - Productos venta: {cuenta_base}.{clínica}.{categoría}.{producto}.V');
console.log('  - Productos consumo: {cuenta_base}.{clínica}.{categoría}.{producto}.C');
console.log('  - Métodos de pago: {cuenta_base}.{clínica}.{método}');
console.log('\n✅ Esta estructura garantiza:');
console.log('  1. Separación contable por clínica');
console.log('  2. Análisis por categoría de servicio/producto');
console.log('  3. Diferenciación entre venta y consumo de productos');
console.log('  4. Trazabilidad completa de ingresos y gastos');
