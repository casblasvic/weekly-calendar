/**
 * Utilidades para gestión de equipamiento con soporte múltiples clínicas
 */

export interface EquipmentInstanceData {
  equipmentId: string
  clinicId: string
  clinicPrefix?: string
  equipmentName: string
  counter?: number
}

/**
 * Genera un deviceId único basado en el equipamiento y clínica
 */
export function generateDeviceId(data: EquipmentInstanceData): string {
  const { equipmentName, clinicPrefix = 'CLI', counter = 1 } = data
  
  // Crear código del equipamiento (primeras letras de cada palabra, max 6 chars)
  const equipmentCode = equipmentName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 6)
  
  // Formato: EQUIPCODE-CLINPREFIX-001
  return `${equipmentCode}-${clinicPrefix}-${counter.toString().padStart(3, '0')}`
}

/**
 * Genera un número de serie único basado en el equipamiento y clínica
 */
export function generateSerialNumber(data: EquipmentInstanceData): string {
  const { equipmentName, clinicPrefix = 'CLI', counter = 1 } = data
  
  // Usar el nombre del equipamiento limpio (sin espacios, max 6 chars)
  const equipmentCode = equipmentName
    .replace(/\s+/g, '')
    .substring(0, 6)
    .toUpperCase()
  
  // Formato: EQUIPCODE-CLINPREFIX-001
  return `${equipmentCode}-${clinicPrefix}-${counter.toString().padStart(3, '0')}`
}

/**
 * Valida si un deviceId tiene el formato correcto
 */
export function validateDeviceId(deviceId: string): boolean {
  // Formato esperado: CODIGO-PREFIJO-NNN
  const pattern = /^[A-Z0-9]{1,6}-[A-Z0-9]{2,4}-\d{3}$/
  return pattern.test(deviceId)
}

/**
 * Valida si un número de serie tiene el formato correcto
 */
export function validateSerialNumber(serialNumber: string): boolean {
  // Formato esperado: CODIGO-PREFIJO-NNN
  const pattern = /^[A-Z0-9]{1,6}-[A-Z0-9]{2,4}-\d{3}$/
  return pattern.test(serialNumber)
}

/**
 * Extrae información de un deviceId
 */
export function parseDeviceId(deviceId: string): {
  equipmentCode: string
  clinicPrefix: string
  counter: number
} | null {
  if (!validateDeviceId(deviceId)) {
    return null
  }
  
  const parts = deviceId.split('-')
  return {
    equipmentCode: parts[0],
    clinicPrefix: parts[1],
    counter: parseInt(parts[2], 10)
  }
}

/**
 * Genera el siguiente deviceId disponible para un equipamiento en una clínica
 */
export async function getNextAvailableDeviceId(
  data: Omit<EquipmentInstanceData, 'counter'>,
  existingDeviceIds: string[]
): Promise<string> {
  let counter = 1
  let deviceId = generateDeviceId({ ...data, counter })
  
  // Buscar un deviceId disponible
  while (existingDeviceIds.includes(deviceId)) {
    counter++
    deviceId = generateDeviceId({ ...data, counter })
    
    // Prevenir loop infinito
    if (counter > 999) {
      throw new Error(`No se pudo generar deviceId único para ${data.equipmentName} en clínica ${data.clinicPrefix}`)
    }
  }
  
  return deviceId
}

/**
 * Genera el siguiente número de serie disponible para un equipamiento en una clínica
 */
export async function getNextAvailableSerialNumber(
  data: Omit<EquipmentInstanceData, 'counter'>,
  existingSerials: string[]
): Promise<string> {
  let counter = 1
  let serialNumber = generateSerialNumber({ ...data, counter })
  
  // Buscar un número de serie disponible
  while (existingSerials.includes(serialNumber)) {
    counter++
    serialNumber = generateSerialNumber({ ...data, counter })
    
    // Prevenir loop infinito
    if (counter > 999) {
      throw new Error(`No se pudo generar número de serie único para ${data.equipmentName} en clínica ${data.clinicPrefix}`)
    }
  }
  
  return serialNumber
}

/**
 * Tipos para filtros de búsqueda de equipamiento
 */
export interface EquipmentFilter {
  systemId: string
  clinicId?: string
  isActive?: boolean
  equipmentId?: string
  searchTerm?: string
}

/**
 * Construye filtros de Prisma para búsqueda de asignaciones de equipamiento
 */
export function buildEquipmentAssignmentFilters(filter: EquipmentFilter) {
  const where: any = {
    systemId: filter.systemId
  }
  
  if (filter.clinicId) {
    where.clinicId = filter.clinicId
  }
  
  if (filter.isActive !== undefined) {
    where.isActive = filter.isActive
  }
  
  if (filter.equipmentId) {
    where.equipmentId = filter.equipmentId
  }
  
  if (filter.searchTerm) {
    where.OR = [
      {
        serialNumber: {
          contains: filter.searchTerm,
          mode: 'insensitive'
        }
      },
      {
        deviceId: {
          contains: filter.searchTerm,
          mode: 'insensitive'
        }
      },
      {
        equipment: {
          name: {
            contains: filter.searchTerm,
            mode: 'insensitive'
          }
        }
      }
    ]
  }
  
  return where
}

/**
 * Normaliza un deviceId o serialNumber limpiando caracteres no válidos
 */
export function normalizeDeviceId(deviceId: string): string {
  if (!deviceId) return ''
  
  return deviceId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '') // Remover caracteres no válidos
    .substring(0, 50) // Limitar longitud
}

/**
 * Alias para validateDeviceId para compatibilidad
 */
export const isValidDeviceId = validateDeviceId 