/**
 * ========================================
 * EJEMPLOS DE USO - FILTRADO DE ENCHUFES INTELIGENTES SHELLY
 * ========================================
 * 
 * Ejemplos prácticos de cómo identificar y filtrar enchufes inteligentes
 * de otros dispositivos Shelly (como switches, dimmers, sensores, etc.)
 */

import { prisma } from '@/lib/db';
import { 
  isSmartPlug, 
  getSmartPlugGeneration, 
  filterSmartPlugs, 
  groupSmartPlugsByGeneration,
  getSmartPlugInfo,
  supportsFeature
} from '@/utils/shelly-device-utils';

// ========================================
// EJEMPLO 1: CONSULTA DIRECTA EN BASE DE DATOS
// ========================================

/**
 * Obtener SOLO enchufes inteligentes de la base de datos
 */
export async function getOnlySmartPlugsFromDB(systemId: string) {
  // Obtener todos los dispositivos Shelly
  const allDevices = await prisma.smartPlugDevice.findMany({
    where: {
      systemId,
      type: 'SHELLY'
    },
    include: {
      credential: true,
      equipmentClinicAssignment: {
        include: {
          equipment: true,
          clinic: true
        }
      }
    }
  });

  // Filtrar solo enchufes inteligentes
  const smartPlugsOnly = filterSmartPlugs(allDevices);
  
  console.log(`📊 Total dispositivos Shelly: ${allDevices.length}`);
  console.log(`🔌 Enchufes inteligentes: ${smartPlugsOnly.length}`);
  
  return smartPlugsOnly;
}

// ========================================
// EJEMPLO 2: CONSULTA OPTIMIZADA CON WHERE
// ========================================

/**
 * Obtener enchufes inteligentes directamente con WHERE en la consulta
 */
export async function getSmartPlugsOptimized(systemId: string) {
  // Códigos conocidos de enchufes inteligentes
  const smartPlugCodes = [
    'SHPLG-1', 'SHPLG-S', 'SHPLG-U1',           // Gen 1
    'SNPL-00112EU', 'SNPL-00112US',             // Gen 2
    'SNPL-00110EU', 'SNPL-00110US'              // Gen 2 variantes
  ];

  const smartPlugs = await prisma.smartPlugDevice.findMany({
    where: {
      systemId,
      type: 'SHELLY',
      OR: [
        // Códigos exactos conocidos
        { modelCode: { in: smartPlugCodes } },
        // Patrones para detectar enchufes
        { modelCode: { contains: 'PLUG' } },
        { modelCode: { contains: 'SNPL' } },
        { modelCode: { contains: 'SHPLG' } },
        { modelCode: { contains: 'MTR' } }       // Gen 3
      ]
    },
    include: {
      credential: true,
      equipmentClinicAssignment: {
        include: {
          equipment: true,
          clinic: true
        }
      }
    }
  });

  return smartPlugs;
}

// ========================================
// EJEMPLO 3: ANÁLISIS POR GENERACIÓN
// ========================================

/**
 * Analizar enchufes inteligentes por generación
 */
export async function analyzeSmartPlugsByGeneration(systemId: string) {
  const allDevices = await getOnlySmartPlugsFromDB(systemId);
  const groupedByGen = groupSmartPlugsByGeneration(allDevices);

  console.log('📊 ANÁLISIS POR GENERACIÓN:');
  console.log(`Gen 1 (HTTP REST): ${groupedByGen.gen1.length} dispositivos`);
  console.log(`Gen 2 (WebSocket): ${groupedByGen.gen2.length} dispositivos`);
  console.log(`Gen 3 (LED RGB): ${groupedByGen.gen3.length} dispositivos`);
  console.log(`Sin identificar: ${groupedByGen.unknown.length} dispositivos`);

  // Mostrar detalles de cada generación
  console.log('\n🔍 DETALLES POR GENERACIÓN:');
  
  groupedByGen.gen1.forEach(device => {
    const info = getSmartPlugInfo(device.modelCode);
    console.log(`Gen 1: ${device.name} (${device.modelCode}) - ${info?.name}`);
  });

  groupedByGen.gen2.forEach(device => {
    const info = getSmartPlugInfo(device.modelCode);
    console.log(`Gen 2: ${device.name} (${device.modelCode}) - ${info?.name}`);
  });

  groupedByGen.gen3.forEach(device => {
    const info = getSmartPlugInfo(device.modelCode);
    console.log(`Gen 3: ${device.name} (${device.modelCode}) - ${info?.name}`);
  });

  return groupedByGen;
}

// ========================================
// EJEMPLO 4: VERIFICACIÓN DE FUNCIONALIDADES
// ========================================

/**
 * Obtener enchufes que soportan WebSocket (Gen 2+)
 */
export async function getWebSocketCapablePlugs(systemId: string) {
  const smartPlugs = await getOnlySmartPlugsFromDB(systemId);
  
  const webSocketPlugs = smartPlugs.filter(device => 
    supportsFeature(device.modelCode, 'websocket')
  );

  console.log(`🌐 Enchufes con WebSocket: ${webSocketPlugs.length}/${smartPlugs.length}`);
  
  return webSocketPlugs;
}

/**
 * Obtener enchufes con LED RGB (Gen 3)
 */
export async function getLEDCapablePlugs(systemId: string) {
  const smartPlugs = await getOnlySmartPlugsFromDB(systemId);
  
  const ledPlugs = smartPlugs.filter(device => 
    supportsFeature(device.modelCode, 'led')
  );

  console.log(`💡 Enchufes con LED RGB: ${ledPlugs.length}/${smartPlugs.length}`);
  
  return ledPlugs;
}

// ========================================
// EJEMPLO 5: FILTRADO EN TIEMPO REAL
// ========================================

/**
 * Verificar si un dispositivo específico es un enchufe inteligente
 */
export function checkIfDeviceIsSmartPlug(device: { modelCode?: string | null }) {
  const isPlug = isSmartPlug(device.modelCode);
  
  if (isPlug) {
    const generation = getSmartPlugGeneration(device.modelCode);
    const info = getSmartPlugInfo(device.modelCode);
    
    console.log(`✅ Es un enchufe inteligente:`);
    console.log(`   - Generación: ${generation}`);
    console.log(`   - Nombre: ${info?.name}`);
    console.log(`   - Funcionalidades: ${info?.features.join(', ')}`);
    console.log(`   - Región: ${info?.region}`);
    
    return {
      isSmartPlug: true,
      generation,
      info
    };
  } else {
    console.log(`❌ No es un enchufe inteligente (${device.modelCode})`);
    return {
      isSmartPlug: false,
      generation: null,
      info: null
    };
  }
}

// ========================================
// EJEMPLO 6: USO EN COMPONENTES REACT
// ========================================

/**
 * Hook personalizado para filtrar enchufes en tiempo real
 */
export function useSmartPlugsFilter(allDevices: any[]) {
  // Filtrar solo enchufes inteligentes
  const smartPlugs = filterSmartPlugs(allDevices);
  
  // Agrupar por generación
  const byGeneration = groupSmartPlugsByGeneration(smartPlugs);
  
  // Estadísticas útiles
  const stats = {
    total: smartPlugs.length,
    totalDevices: allDevices.length,
    percentage: allDevices.length > 0 ? (smartPlugs.length / allDevices.length * 100).toFixed(1) : '0',
    gen1Count: byGeneration.gen1.length,
    gen2Count: byGeneration.gen2.length,
    gen3Count: byGeneration.gen3.length,
    unknownCount: byGeneration.unknown.length,
    webSocketCapable: smartPlugs.filter(d => supportsFeature(d.modelCode, 'websocket')).length,
    ledCapable: smartPlugs.filter(d => supportsFeature(d.modelCode, 'led')).length
  };

  return {
    smartPlugs,
    byGeneration,
    stats,
    // Función helper para verificar si un device específico es enchufe
    isSmartPlug: (device: any) => isSmartPlug(device.modelCode),
    // Función helper para obtener info de un device
    getDeviceInfo: (device: any) => getSmartPlugInfo(device.modelCode)
  };
}

// ========================================
// EJEMPLO 7: CONSULTA ESPECIALIZADA
// ========================================

/**
 * Obtener solo enchufes inteligentes con equipamiento asignado
 */
export async function getSmartPlugsWithEquipment(systemId: string) {
  const smartPlugs = await getSmartPlugsOptimized(systemId);
  
  const plugsWithEquipment = smartPlugs.filter(plug => 
    plug.equipmentClinicAssignmentId && plug.equipmentClinicAssignment
  );

  console.log(`🔧 Enchufes con equipamiento: ${plugsWithEquipment.length}/${smartPlugs.length}`);
  
  return plugsWithEquipment.map(plug => ({
    plugInfo: {
      id: plug.id,
      name: plug.name,
      modelCode: plug.modelCode,
      generation: getSmartPlugGeneration(plug.modelCode),
      deviceInfo: getSmartPlugInfo(plug.modelCode)
    },
    equipment: plug.equipmentClinicAssignment?.equipment,
    clinic: plug.equipmentClinicAssignment?.clinic
  }));
}

// ========================================
// EJEMPLO 8: ESTADÍSTICAS AVANZADAS
// ========================================

/**
 * Obtener estadísticas completas de enchufes inteligentes
 */
export async function getSmartPlugsStatistics(systemId: string) {
  const allDevices = await prisma.smartPlugDevice.findMany({
    where: { systemId, type: 'SHELLY' }
  });

  const smartPlugs = filterSmartPlugs(allDevices);
  const grouped = groupSmartPlugsByGeneration(smartPlugs);
  
  const statistics = {
    overview: {
      totalDevices: allDevices.length,
      totalSmartPlugs: smartPlugs.length,
      percentage: (smartPlugs.length / allDevices.length * 100).toFixed(1) + '%',
      nonPlugDevices: allDevices.length - smartPlugs.length
    },
    byGeneration: {
      gen1: {
        count: grouped.gen1.length,
        percentage: (grouped.gen1.length / smartPlugs.length * 100).toFixed(1) + '%',
        models: [...new Set(grouped.gen1.map(d => d.modelCode))]
      },
      gen2: {
        count: grouped.gen2.length,
        percentage: (grouped.gen2.length / smartPlugs.length * 100).toFixed(1) + '%',
        models: [...new Set(grouped.gen2.map(d => d.modelCode))]
      },
      gen3: {
        count: grouped.gen3.length,
        percentage: (grouped.gen3.length / smartPlugs.length * 100).toFixed(1) + '%',
        models: [...new Set(grouped.gen3.map(d => d.modelCode))]
      }
    },
    capabilities: {
      webSocketCapable: smartPlugs.filter(d => supportsFeature(d.modelCode, 'websocket')).length,
      ledCapable: smartPlugs.filter(d => supportsFeature(d.modelCode, 'led')).length,
      energyMeasurement: smartPlugs.filter(d => supportsFeature(d.modelCode, 'energy_measurement')).length
    },
    status: {
      online: smartPlugs.filter(d => d.online).length,
      offline: smartPlugs.filter(d => !d.online).length,
      withEquipment: smartPlugs.filter(d => d.equipmentClinicAssignmentId).length
    }
  };

  return statistics;
} 