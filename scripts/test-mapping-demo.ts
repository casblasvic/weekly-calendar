// Script de demostración del servicio de mapeo unificado
import { generateClinicCode } from '@/lib/accounting/clinic-utils';
import { generateSubaccountCode } from '@/lib/accounting/unified-mapping-service';

console.log('🎯 Demostración del Sistema de Mapeo Contable Unificado\n');
console.log('Este sistema genera subcuentas jerárquicas automáticamente');
console.log('para cada clínica, categoría y servicio/producto.\n');

// Simulación de escenarios
console.log('📍 ESCENARIO 1: Una empresa con 3 clínicas');
console.log('================================================\n');

const clinics = [
  'Clínica Centro Madrid',
  'Clínica Norte Barcelona', 
  'Centro Wellness Valencia'
];

const services = [
  { name: 'Consulta Dermatología', category: 'Dermatología', baseAccount: '705' },
  { name: 'Botox Facial', category: 'Medicina Estética', baseAccount: '705' },
  { name: 'Láser CO2', category: 'Dermatología', baseAccount: '705' }
];

console.log('🏥 Clínicas:');
clinics.forEach((clinic, i) => {
  const code = generateClinicCode(clinic);
  console.log(`  ${i + 1}. ${clinic} → Código: ${code}`);
});

console.log('\n📋 Mapeo de Servicios por Clínica:\n');

clinics.forEach(clinic => {
  const clinicCode = generateClinicCode(clinic);
  console.log(`  ${clinic}:`);
  
  services.forEach(service => {
    const categoryCode = service.category.substring(0, 3).toUpperCase();
    const serviceCode = service.name.substring(0, 3).toUpperCase();
    
    const subaccountCode = generateSubaccountCode({
      baseAccount: service.baseAccount,
      clinicCode,
      categoryCode,
      itemCode: serviceCode
    });
    
    console.log(`    - ${service.name}: ${subaccountCode}`);
  });
  console.log('');
});

console.log('📍 ESCENARIO 2: Productos con diferenciación Venta/Consumo');
console.log('========================================================\n');

const products = [
  { name: 'Crema Antiedad', category: 'Cosmética', forSale: true, forConsumption: false },
  { name: 'Agujas Botox', category: 'Material Médico', forSale: false, forConsumption: true },
  { name: 'Sérum Vitamina C', category: 'Cosmética', forSale: true, forConsumption: true }
];

console.log('📦 Mapeo de Productos para Clínica Centro Madrid:\n');

const madridCode = generateClinicCode('Clínica Centro Madrid');

products.forEach(product => {
  const categoryCode = product.category.substring(0, 3).toUpperCase();
  const productCode = product.name.substring(0, 3).toUpperCase();
  
  console.log(`  ${product.name}:`);
  
  if (product.forSale) {
    const saleCode = generateSubaccountCode({
      baseAccount: '700', // Venta de mercaderías
      clinicCode: madridCode,
      categoryCode,
      itemCode: productCode,
      itemType: 'V'
    });
    console.log(`    → Venta: ${saleCode}`);
  }
  
  if (product.forConsumption) {
    const consumptionCode = generateSubaccountCode({
      baseAccount: '600', // Compra/Consumo
      clinicCode: madridCode,
      categoryCode,
      itemCode: productCode,
      itemType: 'C'
    });
    console.log(`    → Consumo: ${consumptionCode}`);
  }
  
  console.log('');
});

console.log('📍 ESCENARIO 3: Métodos de Pago');
console.log('================================\n');

const paymentMethods = [
  { name: 'Efectivo', baseAccount: '570' },
  { name: 'Tarjeta de Crédito', baseAccount: '572' },
  { name: 'Transferencia Bancaria', baseAccount: '572' }
];

console.log('💳 Mapeo de Métodos de Pago por Clínica:\n');

clinics.slice(0, 2).forEach(clinic => {
  const clinicCode = generateClinicCode(clinic);
  console.log(`  ${clinic}:`);
  
  paymentMethods.forEach(method => {
    const methodCode = method.name.substring(0, 3).toUpperCase();
    
    const subaccountCode = generateSubaccountCode({
      baseAccount: method.baseAccount,
      clinicCode,
      itemCode: methodCode
    });
    
    console.log(`    - ${method.name}: ${subaccountCode}`);
  });
  console.log('');
});

console.log('✅ BENEFICIOS DEL SISTEMA:');
console.log('=========================\n');
console.log('1. 🎯 Trazabilidad Completa:');
console.log('   - Cada transacción queda registrada con la clínica específica');
console.log('   - Análisis detallado por categoría de servicio/producto');
console.log('   - Diferenciación clara entre venta y consumo\n');

console.log('2. 📊 Informes Precisos:');
console.log('   - Rentabilidad por clínica');
console.log('   - Ingresos por categoría de servicio');
console.log('   - Control de inventario y consumo por centro\n');

console.log('3. 🔧 Mantenimiento Simplificado:');
console.log('   - Un único servicio centralizado');
console.log('   - Mapeos consistentes en todo el sistema');
console.log('   - Fácil corrección de errores\n');

console.log('4. 🚀 Escalabilidad:');
console.log('   - Agregar nuevas clínicas es automático');
console.log('   - Nuevos servicios/productos se mapean consistentemente');
console.log('   - Estructura preparada para crecimiento');
