/**
 * Punto de entrada para el servicio de datos
 * Exporta la instancia del servicio de datos que se utilizará en toda la aplicación
 * Permite configurar el servicio para usar diferentes proveedores de datos
 */

import type { DataServiceInterface } from './data-service.interface';
// import { LocalDataService } from './local-data-service.ts';
import { SupabaseDataService, type SupabaseConnectionConfig } from './supabase-data-service.ts';

// Reemplazo del enum con const as const
export const DataServiceType = {
  // LOCAL: 'local',
  SUPABASE: 'supabase',
} as const;

// Exportar el tipo derivado del objeto
export type DataServiceType = (typeof DataServiceType)[keyof typeof DataServiceType];

// Configuración para el servicio de datos
export interface DataServiceConfig {
  type: DataServiceType;
  supabaseConfig?: SupabaseConnectionConfig;
}

/**
 * Instancia única del servicio de datos
 */
let dataServiceInstance: DataServiceInterface | null = null;

/**
 * Tipo de servicio actualmente configurado
 */
let currentServiceType: DataServiceType = DataServiceType.SUPABASE;

/**
 * Inicializa el servicio de datos con la configuración especificada
 */
export const initializeDataService = async (config: DataServiceConfig): Promise<void> => {
  // Si ya existe una instancia, verificar si necesita cambiarse
  if (dataServiceInstance) {
    if (config.type === currentServiceType) {
      // Mismo tipo, no es necesario cambiar
      return;
    }
    
    // Tipo diferente, limpiar la instancia actual
    dataServiceInstance = null;
  }
  
  // Ya no hay default local, config es obligatoria
  // const finalConfig = config || { type: DataServiceType.SUPABASE };
  currentServiceType = config.type;
  
  // Crear la instancia según el tipo
  switch (config.type) {
    case DataServiceType.SUPABASE:
      if (!config.supabaseConfig) {
        // Intentar obtener de env vars si no se proporciona explícitamente?
        // Por ahora, lanzar error si no está en el objeto config.
        throw new Error('No se ha proporcionado configuración Supabase (supabaseConfig) al inicializar.');
      }
      dataServiceInstance = new SupabaseDataService(config.supabaseConfig);
      break;
      
    // case DataServiceType.LOCAL:
    default:
      // Lanzar error si se intenta usar un tipo no soportado (como LOCAL)
      throw new Error(`Tipo de servicio de datos no soportado: ${config.type}`);
      // dataServiceInstance = new LocalDataService();
      // break;
  }
  
  // Inicializar el servicio
  await dataServiceInstance.initialize();
  
  console.log(`Servicio de datos inicializado: ${config.type}`);
};

/**
 * Obtiene la instancia del servicio de datos.
 * Si no está inicializado, lanza un error.
 */
export const getDataService = (): DataServiceInterface => {
  if (!dataServiceInstance) {
    // Ya no inicializa automáticamente, requiere llamada explícita a initializeDataService
    throw new Error('Servicio de datos no inicializado. Llama a initializeDataService primero.');
    // console.log('Inicializando automáticamente el servicio de datos en modo LOCAL');
    // dataServiceInstance = new LocalDataService();
    // dataServiceInstance.initialize().catch(error => {
    //   console.error('Error al inicializar automáticamente el servicio de datos:', error);
    // });
  }
  return dataServiceInstance;
};

/**
 * Obtiene el tipo de servicio actualmente configurado
 */
export const getCurrentServiceType = (): DataServiceType => {
  return currentServiceType;
};

/**
 * Re-exporta las clases e interfaces para facilitar su uso
 */
export type { DataServiceInterface };
// export { LocalDataService, SupabaseDataService };
export { SupabaseDataService };
export type { SupabaseConnectionConfig };

/**
 * Re-exporta los tipos de modelos para facilitar su uso
 */
export * from './models/interfaces.ts';

// Re-exportar el tipo Client también desde data-service
// Comentar re-exportación
// export type { Client } from './data-service.ts';