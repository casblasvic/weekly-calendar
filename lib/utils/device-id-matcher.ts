/**
 * 🛡️ DEVICE ID MATCHING - Estrategia Robusta con Múltiples Identificadores
 * ================================================================================
 * 
 * CONTEXTO Y PROBLEMA:
 * -------------------
 * En el sistema tenemos múltiples tipos de identificadores para dispositivos:
 * 
 * 1. smartPlugDevice.id          → ID del registro en BD (ej: "cmcs60vu70001y2h6i6w95tt5")
 * 2. smartPlugDevice.deviceId    → Shelly cloudId/deviceId (ej: "e465b84533f0") 
 * 3. appointmentDeviceUsage.deviceId → Puede ser cualquiera de los dos anteriores
 * 
 * INCONSISTENCIAS HISTÓRICAS:
 * ---------------------------
 * - Registros antiguos pueden usar el ID de BD
 * - Registros nuevos pueden usar el Shelly cloudId
 * - APIs diferentes pueden esperar diferentes tipos de ID
 * - WebSocket updates usan el Shelly cloudId
 * 
 * SOLUCIÓN ROBUSTA:
 * ----------------
 * Esta función implementa una estrategia de fallback que compara AMBOS identificadores,
 * garantizando que las comparaciones funcionen independientemente del tipo de ID usado.
 * 
 * CASOS DE USO:
 * ------------
 * - Verificar si un dispositivo está en uso por una cita específica
 * - Encontrar dispositivos en listas basándose en WebSocket updates
 * - Comparar registros de appointmentDeviceUsage con smartPlugDevices
 * - Cualquier operación que requiera matching de dispositivos
 * 
 * @see docs/DEVICE_ID_MATCHING_STRATEGY.md
 * @version 1.0
 * @date 2024-07-10
 */

/**
 * Representa un dispositivo con múltiples identificadores posibles
 */
export interface DeviceWithIds {
  /** ID del registro en base de datos */
  id?: string;
  /** Shelly cloudId/deviceId */
  deviceId?: string;
  /** Cualquier otro identificador adicional */
  cloudId?: string;
  /** Nombre para debug/logging */
  name?: string;
}

/**
 * Compara si dos dispositivos son el mismo usando estrategia de fallback
 * 
 * @param device1 Primer dispositivo a comparar
 * @param device2 Segundo dispositivo a comparar
 * @param debugContext Contexto para logging (opcional)
 * @returns true si los dispositivos coinciden en algún identificador
 * 
 * @example
 * ```typescript
 * const smartPlug = { id: "cmcs60vu70001", deviceId: "e465b84533f0" };
 * const usageRecord = { deviceId: "cmcs60vu70001" }; // Registro antiguo
 * 
 * const matches = deviceIdsMatch(smartPlug, usageRecord);
 * // → true (coincide por smartPlug.id === usageRecord.deviceId)
 * ```
 */
export function deviceIdsMatch(
  device1: DeviceWithIds | string,
  device2: DeviceWithIds | string,
  debugContext?: string
): boolean {
  // Normalizar inputs a objetos
  const d1 = typeof device1 === 'string' ? { deviceId: device1 } : device1;
  const d2 = typeof device2 === 'string' ? { deviceId: device2 } : device2;
  
  // Extraer todos los IDs posibles de cada dispositivo
  const ids1 = [d1.id, d1.deviceId, d1.cloudId].filter(Boolean);
  const ids2 = [d2.id, d2.deviceId, d2.cloudId].filter(Boolean);
  
  // Si alguno no tiene IDs, no hay match
  if (ids1.length === 0 || ids2.length === 0) {
    return false;
  }
  
  // Buscar coincidencia en cualquier combinación
  const hasMatch = ids1.some(id1 => ids2.includes(id1));
  
  // Debug logging si se proporciona contexto
  if (debugContext && process.env.NODE_ENV === 'development') {
    console.log(`🔍 [DEVICE_MATCH] ${debugContext}:`, {
      device1: { ids: ids1, name: d1.name },
      device2: { ids: ids2, name: d2.name },
      match: hasMatch
    });
  }
  
  return hasMatch;
}

/**
 * Encuentra un dispositivo en una lista usando comparación robusta
 * 
 * @param targetDevice Dispositivo a buscar
 * @param deviceList Lista donde buscar
 * @param debugContext Contexto para logging (opcional)
 * @returns Dispositivo encontrado o undefined
 * 
 * @example
 * ```typescript
 * const devices = [
 *   { id: "device1", deviceId: "shelly1", name: "Enchufe 1" },
 *   { id: "device2", deviceId: "shelly2", name: "Enchufe 2" }
 * ];
 * 
 * const found = findDeviceInList({ deviceId: "device1" }, devices);
 * // → { id: "device1", deviceId: "shelly1", name: "Enchufe 1" }
 * ```
 */
export function findDeviceInList<T extends DeviceWithIds>(
  targetDevice: DeviceWithIds | string,
  deviceList: T[],
  debugContext?: string
): T | undefined {
  return deviceList.find(device => 
    deviceIdsMatch(targetDevice, device, debugContext)
  );
}

/**
 * Verifica si un deviceId está presente en un Set usando comparación robusta
 * 
 * @param targetDeviceId ID del dispositivo a buscar
 * @param deviceSet Set de dispositivos donde buscar
 * @param debugContext Contexto para logging (opcional)
 * @returns true si el dispositivo está en el Set
 * 
 * @example
 * ```typescript
 * const activeDevices = new Set([
 *   { id: "device1", deviceId: "shelly1" },
 *   { id: "device2", deviceId: "shelly2" }
 * ]);
 * 
 * const isActive = isDeviceInSet("shelly1", activeDevices);
 * // → true
 * ```
 */
export function isDeviceInSet(
  targetDeviceId: string,
  deviceSet: Set<DeviceWithIds>,
  debugContext?: string
): boolean {
  for (const device of deviceSet) {
    if (deviceIdsMatch(targetDeviceId, device, debugContext)) {
      return true;
    }
  }
  return false;
}

/**
 * Crea un Set de todos los IDs posibles de una lista de dispositivos
 * Útil para comparaciones rápidas posteriores
 * 
 * @param devices Lista de dispositivos
 * @returns Set con todos los IDs únicos
 * 
 * @example
 * ```typescript
 * const devices = [
 *   { id: "device1", deviceId: "shelly1" },
 *   { id: "device2", deviceId: "shelly2" }
 * ];
 * 
 * const allIds = createDeviceIdSet(devices);
 * // → Set(["device1", "shelly1", "device2", "shelly2"])
 * ```
 */
export function createDeviceIdSet(devices: DeviceWithIds[]): Set<string> {
  const allIds = new Set<string>();
  
  devices.forEach(device => {
    [device.id, device.deviceId, device.cloudId]
      .filter(Boolean)
      .forEach(id => allIds.add(id!));
  });
  
  return allIds;
}

/**
 * Extrae el ID preferido de un dispositivo siguiendo orden de prioridad
 * 
 * @param device Dispositivo del cual extraer ID
 * @param preferCloudId Si true, prefiere cloudId/deviceId sobre id de BD
 * @returns ID preferido o undefined si no hay ninguno
 * 
 * @example
 * ```typescript
 * const device = { id: "bd123", deviceId: "shelly456" };
 * 
 * const dbId = getPreferredDeviceId(device, false);     // → "bd123"
 * const cloudId = getPreferredDeviceId(device, true);   // → "shelly456"
 * ```
 */
export function getPreferredDeviceId(
  device: DeviceWithIds,
  preferCloudId: boolean = false
): string | undefined {
  if (preferCloudId) {
    return device.deviceId || device.cloudId || device.id;
  } else {
    return device.id || device.deviceId || device.cloudId;
  }
} 