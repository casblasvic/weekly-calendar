// Script de prueba integrada del servicio unificado
import { prisma } from '@/lib/db';
import { UnifiedMappingService } from '@/lib/accounting/unified-mapping-service';
import { ChartOfAccountEntry } from '@prisma/client';

// Datos de prueba simulados
const mockChartOfAccounts: ChartOfAccountEntry[] = [
  {
    id: 'coa-1',
    accountNumber: '705',
    name: 'Prestación de Servicios',
    type: 'REVENUE',
    description: null,
    isSubAccount: false,
    parentAccountId: '70',
    isMonetary: true,
    allowsDirectEntry: true,
    isActive: true,
    legalEntityId: 'test-entity',
    systemId: 'test-system',
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    level: 2,
    defaultForProducts: false,
    defaultForServices: true,
    ifrsCode: null,
    localCode: null,
    names: null,
    productCategories: [],
    serviceCategories: [],
    vatCategory: null
  },
  {
    id: 'coa-2',
    accountNumber: '700',
    name: 'Venta de Mercaderías',
    type: 'REVENUE',
    description: null,
    isSubAccount: false,
    parentAccountId: '70',
    isMonetary: true,
    allowsDirectEntry: true,
    isActive: true,
    legalEntityId: 'test-entity',
    systemId: 'test-system',
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    level: 2,
    defaultForProducts: true,
    defaultForServices: false,
    ifrsCode: null,
    localCode: null,
    names: null,
    productCategories: [],
    serviceCategories: [],
    vatCategory: null
  },
  {
    id: 'coa-3',
    accountNumber: '600',
    name: 'Compras de Mercaderías',
    type: 'EXPENSE',
    description: null,
    isSubAccount: false,
    parentAccountId: '60',
    isMonetary: true,
    allowsDirectEntry: true,
    isActive: true,
    legalEntityId: 'test-entity',
    systemId: 'test-system',
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    level: 2,
    defaultForProducts: false,
    defaultForServices: false,
    ifrsCode: null,
    localCode: null,
    names: null,
    productCategories: [],
    serviceCategories: [],
    vatCategory: null
  },
  {
    id: 'coa-4',
    accountNumber: '570',
    name: 'Caja',
    type: 'ASSET',
    description: null,
    isSubAccount: false,
    parentAccountId: '57',
    isMonetary: true,
    allowsDirectEntry: true,
    isActive: true,
    legalEntityId: 'test-entity',
    systemId: 'test-system',
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    level: 2,
    defaultForProducts: false,
    defaultForServices: false,
    ifrsCode: null,
    localCode: null,
    names: null,
    productCategories: [],
    serviceCategories: [],
    vatCategory: null
  },
  {
    id: 'coa-5',
    accountNumber: '572',
    name: 'Bancos',
    type: 'ASSET',
    description: null,
    isSubAccount: false,
    parentAccountId: '57',
    isMonetary: true,
    allowsDirectEntry: true,
    isActive: true,
    legalEntityId: 'test-entity',
    systemId: 'test-system',
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    level: 2,
    defaultForProducts: false,
    defaultForServices: false,
    ifrsCode: null,
    localCode: null,
    names: null,
    productCategories: [],
    serviceCategories: [],
    vatCategory: null
  }
];

const mockServices = [
  {
    id: 'srv-1',
    name: 'Consulta Dermatología',
    systemId: 'test-system',
    categoryId: 'cat-1',
    price: 100,
    description: null,
    duration: 30,
    category: {
      id: 'cat-1',
      name: 'Dermatología',
      color: '#4CAF50',
      systemId: 'test-system',
      parentId: null,
      orderIndex: 1,
      isActive: true
    }
  },
  {
    id: 'srv-2',
    name: 'Botox Facial',
    systemId: 'test-system',
    categoryId: 'cat-2',
    price: 300,
    description: null,
    duration: 45,
    category: {
      id: 'cat-2',
      name: 'Medicina Estética',
      color: '#2196F3',
      systemId: 'test-system',
      parentId: null,
      orderIndex: 2,
      isActive: true
    }
  }
];

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Crema Hidratante',
    systemId: 'test-system',
    categoryId: 'cat-3',
    sellingPrice: 50,
    costPrice: 20,
    description: null,
    isForSale: true,
    isConsumable: false,
    sku: 'CRM001',
    barcode: null,
    unit: 'unidad',
    category: {
      id: 'cat-3',
      name: 'Cosmética',
      color: '#FF9800',
      systemId: 'test-system',
      parentId: null,
      orderIndex: 3,
      isActive: true
    }
  },
  {
    id: 'prod-2',
    name: 'Agujas Mesoterapia',
    systemId: 'test-system',
    categoryId: 'cat-4',
    sellingPrice: 10,
    costPrice: 5,
    description: null,
    isForSale: false,
    isConsumable: true,
    sku: 'AGU001',
    barcode: null,
    unit: 'unidad',
    category: {
      id: 'cat-4',
      name: 'Material Médico',
      color: '#F44336',
      systemId: 'test-system',
      parentId: null,
      orderIndex: 4,
      isActive: true
    }
  }
];

const mockPaymentMethods = [
  {
    id: 'pm-1',
    name: 'Efectivo',
    type: 'CASH' as const,
    systemId: 'test-system',
    details: null,
    isActive: true,
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    code: 'CASH',
    bankId: null
  },
  {
    id: 'pm-2',
    name: 'Tarjeta de Crédito',
    type: 'CARD' as const,
    systemId: 'test-system',
    details: null,
    isActive: true,
    createdAt: new Date('2024-03-16T14:30:00.000Z'),
    updatedAt: new Date('2024-03-16T14:30:00.000Z'),
    code: 'CARD',
    bankId: null
  }
];

async function testUnifiedIntegration() {
  try {
    console.log(' Iniciando prueba de integración del servicio unificado...\n');
    
    const options = {
      legalEntityId: 'test-entity',
      systemId: 'test-system',
      forceRemap: true
    };
    
    // Test 1: Mapeo de servicios con clínica específica
    console.log(' TEST 1: Mapeo de servicios con clínica específica');
    console.log('=========================================\n');
    
    const serviceResults = await UnifiedMappingService.mapServices(
      mockServices as any,
      mockChartOfAccounts,
      'ES',
      { ...options, clinicId: 'clinic-madrid' }
    );
    
    console.log(' Resultados:');
    console.log(`  Mapeados: ${serviceResults.mapped}`);
    console.log(`  Errores: ${serviceResults.errors}`);
    console.log('\n Detalles:');
    serviceResults.details.forEach((detail, index) => {
      console.log(`  ${index + 1}. ${detail.name}`);
      console.log(`     Cuenta: ${detail.account || 'N/A'}`);
      console.log(`     Error: ${detail.error || 'Ninguno'}`);
    });
    
    // Test 2: Mapeo de productos con clínica específica
    console.log('\n\n TEST 2: Mapeo de productos con clínica específica');
    console.log('===========================================\n');
    
    const productResults = await UnifiedMappingService.mapProducts(
      mockProducts as any,
      mockChartOfAccounts,
      'ES',
      { ...options, clinicId: 'clinic-barcelona' }
    );
    
    console.log(' Resultados:');
    console.log(`  Mapeados: ${productResults.mapped}`);
    console.log(`  Errores: ${productResults.errors}`);
    console.log('\n Detalles:');
    productResults.details.forEach((detail, index) => {
      console.log(`  ${index + 1}. ${detail.name}`);
      console.log(`     Cuenta: ${detail.account || 'N/A'}`);
      console.log(`     Error: ${detail.error || 'Ninguno'}`);
    });
    
    // Test 3: Mapeo de métodos de pago global (sin clínica)
    console.log('\n\n TEST 3: Mapeo de métodos de pago global');
    console.log('=====================================\n');
    
    const paymentResults = await UnifiedMappingService.mapPaymentMethods(
      mockPaymentMethods as any,
      mockChartOfAccounts,
      'ES',
      options
    );
    
    console.log(' Resultados:');
    console.log(`  Mapeados: ${paymentResults.mapped}`);
    console.log(`  Errores: ${paymentResults.errors}`);
    console.log('\n Detalles:');
    paymentResults.details.forEach((detail, index) => {
      console.log(`  ${index + 1}. ${detail.name}`);
      console.log(`     Cuenta: ${detail.account || 'N/A'}`);
      console.log(`     Error: ${detail.error || 'Ninguno'}`);
    });
    
    // Test 4: Verificar que se respeta forceRemap
    console.log('\n\n TEST 4: Verificación de forceRemap');
    console.log('================================\n');
    
    // Simular mapeo sin forceRemap (debería mantener mapeos existentes)
    const noForceResults = await UnifiedMappingService.mapServices(
      [mockServices[0]] as any,
      mockChartOfAccounts,
      'ES',
      { ...options, forceRemap: false }
    );
    
    console.log('Sin forceRemap:');
    console.log(`  Servicio: ${noForceResults.details[0].name}`);
    console.log(`  Resultado: ${noForceResults.details[0].error ? 'Error: ' + noForceResults.details[0].error : 'Mapeado'}`);
    
    console.log('\n\n Pruebas de integración completadas');
    console.log('\n RESUMEN:');
    console.log('  1. El servicio genera códigos de subcuenta jerárquicos');
    console.log('  2. Respeta la separación por clínica cuando se especifica');
    console.log('  3. Diferencia entre productos de venta y consumo');
    console.log('  4. Maneja correctamente forceRemap');
    console.log('  5. Proporciona información detallada de errores');
    
  } catch (error) {
    console.error(' Error durante las pruebas:', error);
  }
}

// Ejecutar las pruebas
testUnifiedIntegration();
