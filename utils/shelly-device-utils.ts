/**
 * ========================================
 * UTILIDADES PARA DISPOSITIVOS SHELLY
 * ========================================
 * 
 * Funciones helper para identificar y filtrar tipos específicos de dispositivos Shelly
 */

/**
 * ==========================================================
 * DETECCIÓN DE ENCHUFES INTELIGENTES SHELLY (3 capas)
 * ----------------------------------------------------------
 * 1. Lista exacta de modelos confirmados           (100 %)
 * 2. Expresiones regulares flexibles               (cubre futuros)
 * 3. Fallback técnico por componentes              (switch+meter)
 * ==========================================================
 */

/** Modelos oficiales confirmados */
const KNOWN_PLUG_MODELS = [
  // Gen1
  'SHPLG-S', 'SHPLG-1', 'SHPLG-U1',
  // Gen2
  'SNPL-00112EU', 'SNPL-00112US', 'SNPL-00110EU', 'SNPL-00110US',
  // Gen3 (Matter)
  'S3PL-00112EU', 'S3PL-00116US'
] as const;

/** Expresiones regulares genéricas */
const PLUG_REGEXES: RegExp[] = [
  /^S\d?PL/i,      // S3PL-, S4PL- …
  /^SNPL/i,        // SNPL-
  /^SH?PLG/i,      // SHPLG- o SPLG-
  /PLUG/i,         // contiene "PLUG"
  /PL-\d/i         // PL-001xx
];

/**
 * Determina si un dispositivo Shelly es un enchufe inteligente.
 * @param modelCode   Código del modelo, p. ej. "S3PL-00112EU".
 * @param components  Lista de componentes (opcional) recibida del API Shelly.
 */
export function isSmartPlug(
  modelCode?: string | null,
  components?: string[]
): boolean {
  if (!modelCode) return false;
  
  // 1) Comparación exacta
  if (KNOWN_PLUG_MODELS.includes(modelCode as any)) return true;

  // 2) Regex flexibles
  if (PLUG_REGEXES.some((re) => re.test(modelCode))) return true;
  
  // 3) Fallback técnico por componentes del status
  if (components && components.length > 0) {
    const hasSwitch = components.includes('switch:0');
    const hasMeter = components.includes('meter:0');
    if (hasSwitch && hasMeter) return true;
  }

  return false;
}

// Exponer también arrays para uso externo
export const SMART_PLUG_MODEL_CODES = {
  GEN1: KNOWN_PLUG_MODELS.filter((code) => code.startsWith('SHPLG')),
  GEN2: KNOWN_PLUG_MODELS.filter((code) => code.startsWith('SNPL')),
  GEN3: KNOWN_PLUG_MODELS.filter((code) => code.startsWith('S3PL'))
} as const;

export const ALL_SMART_PLUG_CODES = [...KNOWN_PLUG_MODELS];

/**
 * Determina la generación de un enchufe inteligente Shelly
 * @param modelCode - Código del modelo del dispositivo
 * @returns 1, 2, 3 o null si no es un enchufe o no se puede determinar
 */
export function getSmartPlugGeneration(modelCode: string | null | undefined): 1 | 2 | 3 | null {
  if (!modelCode || !isSmartPlug(modelCode)) return null;
  
  if (SMART_PLUG_MODEL_CODES.GEN1.includes(modelCode as any)) {
    return 1;
  }
  
  if (SMART_PLUG_MODEL_CODES.GEN2.includes(modelCode as any)) {
    return 2;
  }
  
  // Gen3 o patrones no identificados (asumir Gen2+ por funcionalidades)
  const upperCode = modelCode.toUpperCase();
  if (upperCode.includes('MTR') || upperCode.includes('GEN3')) {
    return 3;
  }
  
  // Para códigos SNPL (Plus series), asumir Gen2
  if (upperCode.includes('SNPL')) {
    return 2;
  }
  
  // Para códigos SHPLG (series original), es Gen1
  if (upperCode.includes('SHPLG')) {
    return 1;
  }
  
  // Por defecto, asumir Gen2 para nuevos dispositivos
  return 2;
}

/**
 * Filtra una lista de dispositivos Shelly para obtener solo enchufes inteligentes
 * @param devices - Array de dispositivos Shelly
 * @returns Array filtrado solo con enchufes inteligentes
 */
export function filterSmartPlugs<T extends { modelCode?: string | null }>(devices: T[]): T[] {
  return devices.filter(device => isSmartPlug(device.modelCode));
}

/**
 * Agrupa enchufes inteligentes por generación
 * @param devices - Array de dispositivos Shelly
 * @returns Objeto con arrays de dispositivos agrupados por generación
 */
export function groupSmartPlugsByGeneration<T extends { modelCode?: string | null }>(
  devices: T[]
): { gen1: T[], gen2: T[], gen3: T[], unknown: T[] } {
  const smartPlugs = filterSmartPlugs(devices);
  
  const result = {
    gen1: [] as T[],
    gen2: [] as T[],
    gen3: [] as T[],
    unknown: [] as T[]
  };
  
  smartPlugs.forEach(device => {
    const generation = getSmartPlugGeneration(device.modelCode);
    switch (generation) {
      case 1:
        result.gen1.push(device);
        break;
      case 2:
        result.gen2.push(device);
        break;
      case 3:
        result.gen3.push(device);
        break;
      default:
        result.unknown.push(device);
    }
  });
  
  return result;
}

/**
 * Obtiene información descriptiva de un enchufe inteligente
 * @param modelCode - Código del modelo del dispositivo
 * @returns Información legible del dispositivo o null si no es un enchufe
 */
export function getSmartPlugInfo(modelCode: string | null | undefined): {
  name: string;
  generation: 1 | 2 | 3;
  features: string[];
  region?: 'EU' | 'US' | 'Global';
} | null {
  if (!modelCode || !isSmartPlug(modelCode)) return null;
  
  const generation = getSmartPlugGeneration(modelCode);
  if (!generation) return null;
  
  // Información específica por modelo
  const modelInfo: Record<string, any> = {
    'SHPLG-1': {
      name: 'Shelly Plug',
      generation: 1,
      features: ['HTTP REST', 'Medición de energía'],
      region: 'Global'
    },
    'SHPLG-S': {
      name: 'Shelly Plug S',
      generation: 1,
      features: ['HTTP REST', 'Medición de energía', 'Compacto'],
      region: 'Global'
    },
    'SHPLG-U1': {
      name: 'Shelly Plug US',
      generation: 1,
      features: ['HTTP REST', 'Medición de energía', 'Formato US'],
      region: 'US'
    },
    'SNPL-00112EU': {
      name: 'Shelly Plus Plug S',
      generation: 2,
      features: ['WebSocket', 'RPC JSON', 'Medición de energía', 'Plus series'],
      region: 'EU'
    },
    'SNPL-00112US': {
      name: 'Shelly Plus Plug S',
      generation: 2,
      features: ['WebSocket', 'RPC JSON', 'Medición de energía', 'Plus series'],
      region: 'US'
    }
  };
  
  // Si tenemos información específica, la devolvemos
  if (modelInfo[modelCode]) {
    return modelInfo[modelCode];
  }
  
  // Si no, generar información basada en patrones
  const upperCode = modelCode.toUpperCase();
  let name = 'Enchufe Inteligente Shelly';
  let features = ['Control remoto', 'Medición de energía'];
  let region: 'EU' | 'US' | 'Global' | undefined = 'Global';
  
  if (upperCode.includes('PLUS')) {
    name = 'Shelly Plus Plug';
    features.push('Plus series');
  }
  
  if (upperCode.includes('EU')) {
    region = 'EU';
  } else if (upperCode.includes('US')) {
    region = 'US';
  }
  
  if (generation >= 2) {
    features.push('WebSocket', 'RPC JSON');
  }
  
  if (generation >= 3) {
    features.push('LED RGB', 'Funcionalidades avanzadas');
  }
  
  return {
    name,
    generation,
    features,
    region
  };
}

/**
 * Verifica si un dispositivo soporta funcionalidades específicas
 * @param modelCode - Código del modelo del dispositivo
 * @param feature - Funcionalidad a verificar
 * @returns true si soporta la funcionalidad, false si no
 */
export function supportsFeature(
  modelCode: string | null | undefined, 
  feature: 'websocket' | 'rpc' | 'led' | 'energy_measurement' | 'local_http'
): boolean {
  const generation = getSmartPlugGeneration(modelCode);
  if (!generation) return false;
  
  switch (feature) {
    case 'websocket':
    case 'rpc':
      return generation >= 2;
    case 'led':
      return generation >= 3;
    case 'energy_measurement':
      return true; // Todos los enchufes Shelly tienen medición de energía
    case 'local_http':
      return true; // Todos soportan HTTP local (aunque Gen1 solo tiene esto)
    default:
      return false;
  }
}