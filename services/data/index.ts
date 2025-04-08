/**
 * Punto de entrada para el servicio de datos
 * Exporta la instancia del servicio de datos que se utilizará en toda la aplicación
 * Permite configurar el servicio para usar diferentes proveedores de datos
 */

// >>> ELIMINAR: Ya no se usa la interfaz genérica <<<
// import type { DataServiceInterface } from './data-service.interface'; 
// >>> FIN ELIMINAR <<<

// >>> OLD: import { LocalDataService } from './local-data-service.ts';
import { SupabaseDataService, type SupabaseConnectionConfig } from './supabase-data-service'; // <- Asegurar extensión .ts si es necesaria

// Configuración AHORA SOLO para Supabase
export type DataServiceConfig = SupabaseConnectionConfig;

/**
 * Instancia única del servicio de datos (SIEMPRE SupabaseDataService)
 */
// >>> AJUSTAR TIPO: Ahora siempre será SupabaseDataService o null
let dataServiceInstance: SupabaseDataService | null = null;

/**
 * Inicializa el servicio de datos (AHORA SOLO PARA SUPABASE)
 * @param config Configuración específica de Supabase
 */
export const initializeDataService = async (config: SupabaseConnectionConfig): Promise<void> => {

  // Si ya está inicializado, no hacer nada (podría añadir un check más robusto)
  if (dataServiceInstance) {
      console.warn("initializeDataService llamado de nuevo, pero ya existe una instancia.");
      return;
  }

  console.log("[initializeDataService] Configurando instancia de SupabaseDataService.");

  // Crear directamente la instancia de Supabase
  if (!config) { // Chequeo básico por si acaso
      throw new Error('Configuración de Supabase requerida para inicializar.');
  }
  dataServiceInstance = new SupabaseDataService(config);
  
  // Inicializar el servicio
  await dataServiceInstance.initialize();
  
  console.log(`Servicio de datos inicializado: supabase`); // Tipo fijo
};

/**
 * Obtiene la instancia del servicio de datos (SIEMPRE SupabaseDataService).
 * Si no está inicializado, lanza un error.
 */
// >>> AJUSTAR TIPO DE RETORNO: Ahora siempre SupabaseDataService
export const getDataService = (): SupabaseDataService => {
  if (!dataServiceInstance) {
    throw new Error('Servicio de datos no inicializado. Llama a initializeDataService primero.');
  }
  return dataServiceInstance;
};

/**
 * Re-exporta las clases e interfaces para facilitar su uso
 */
export { SupabaseDataService };
export type { SupabaseConnectionConfig };

/**
 * Re-exporta los tipos de modelos para facilitar su uso
 */
export * from './models/interfaces';

// Re-exportar el tipo Client también desde data-service
// Comentar re-exportación
// export type { Client } from './data-service.ts';