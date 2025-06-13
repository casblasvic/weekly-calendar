import { createId } from '@paralleldrive/cuid2';

// Mapeo de IDs antiguos a nuevos CUIDs
const idMapping = new Map<string, string>();

/**
 * Obtiene o genera un CUID para un ID antiguo
 * Esto permite mantener las referencias consistentes durante el seed
 */
export function getOrCreateCuid(oldId: string): string {
  if (!idMapping.has(oldId)) {
    idMapping.set(oldId, createId());
  }
  return idMapping.get(oldId)!;
}

/**
 * Genera un nuevo CUID sin mapeo
 */
export function generateCuid(): string {
  return createId();
}

/**
 * Obtiene el CUID mapeado para un ID antiguo
 * Retorna el ID original si no existe mapeo (para backwards compatibility)
 */
export function getMappedId(oldId: string | null | undefined): string | null | undefined {
  if (!oldId) return oldId;
  return idMapping.get(oldId) || oldId;
}

/**
 * Resetea el mapeo de IDs (útil para tests)
 */
export function resetIdMapping(): void {
  idMapping.clear();
}

// Pre-populate algunos IDs conocidos para mantener consistencia
export function initializeKnownIds(): void {
  // Clínicas
  getOrCreateCuid('clinic-1');
  getOrCreateCuid('clinic-2');
  getOrCreateCuid('clinic-3');
  
  // Cabinas
  getOrCreateCuid('cabin-1');
  getOrCreateCuid('cabin-2');
  getOrCreateCuid('cabin-3');
  getOrCreateCuid('cabin-4');
  getOrCreateCuid('cabin-5');
  getOrCreateCuid('cabin-6');
  
  // Familias/Categorías
  getOrCreateCuid('fam-1');
  getOrCreateCuid('fam-2');
  getOrCreateCuid('fam-3');
  getOrCreateCuid('fam-4');
  getOrCreateCuid('fam-5');
  getOrCreateCuid('fam-6');
  
  // Servicios
  getOrCreateCuid('serv-1');
  getOrCreateCuid('serv-2');
  getOrCreateCuid('serv-3');
  getOrCreateCuid('serv-4');
  getOrCreateCuid('serv-5');
  getOrCreateCuid('serv-6');
  
  // Productos
  getOrCreateCuid('prod-1');
  getOrCreateCuid('prod-2');
  getOrCreateCuid('prod-3');
  getOrCreateCuid('prod-4');
  
  // Equipos
  getOrCreateCuid('eq-1');
  getOrCreateCuid('eq-2');
  getOrCreateCuid('eq-3');
  
  // Tipos de IVA
  getOrCreateCuid('iva-gral-mock');
  getOrCreateCuid('iva-red-mock');
  
  // Tarifas
  getOrCreateCuid('tarifa-1');
  getOrCreateCuid('tarifa-2');
  
  // Usuarios
  getOrCreateCuid('usr-houda');
  getOrCreateCuid('usr-islam');
  getOrCreateCuid('usr-latifa');
  getOrCreateCuid('usr-lina');
  getOrCreateCuid('usr-multi');
  getOrCreateCuid('usr-salma');
  getOrCreateCuid('usr-yasmine');
  getOrCreateCuid('usr-admin-sys');
}
