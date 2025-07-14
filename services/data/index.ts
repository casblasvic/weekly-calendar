/**
 * Punto de entrada para el servicio de datos
 * Exporta la instancia del servicio de datos que se utilizará en toda la aplicación
 * Permite configurar el servicio para usar diferentes proveedores de datos
 */

// >>> ELIMINAR: Ya no se usa la interfaz genérica <<<
// import type { DataServiceInterface } from './data-service.interface'; 
// >>> FIN ELIMINAR <<<

// >>> OLD: import { LocalDataService } from './local-data-service.ts';
import { SupabaseDataService, type SupabaseConnectionConfig } from './supabase-data-service.ts'; // <<< AÑADIDA EXTENSIÓN .ts

// Configuración AHORA SOLO para Supabase
export type DataServiceConfig = SupabaseConnectionConfig;

/**
 * Instancia única del servicio de datos (SIEMPRE SupabaseDataService)
 */
// >>> AJUSTAR TIPO: Ahora siempre será SupabaseDataService o null
let dataServiceInstance: SupabaseDataService | null = null;
let isInitializing = false; // Flag para evitar inicializaciones concurrentes

/**
 * Inicializa el servicio de datos (AHORA SOLO PARA SUPABASE)
 * @param config Configuración específica de Supabase
 */
export const initializeDataService = async (config: SupabaseConnectionConfig): Promise<void> => {

  // Si ya está inicializado o se está inicializando, no hacer nada
  if (dataServiceInstance || isInitializing) {
      if (process.env.NODE_ENV === 'development') {
        // Solo mostrar en desarrollo y con más contexto
        console.debug("DataService: Ya inicializado o en proceso de inicialización, omitiendo...");
      }
      return;
  }

  isInitializing = true;

  try {
    // Crear directamente la instancia de Supabase
    if (!config) { // Chequeo básico por si acaso
        throw new Error('Configuración de Supabase requerida para inicializar.');
    }
    dataServiceInstance = new SupabaseDataService(config);
    
    // Inicializar el servicio
    await dataServiceInstance.initialize();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug("DataService: Inicializado correctamente");
    }
  } finally {
    isInitializing = false;
  }
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
export * from './models/interfaces.ts';

// Re-exportar el tipo Client también desde data-service
// Comentar re-exportación
// export type { Client } from './data-service.ts';