/**
 * Punto de entrada para el servicio de datos
 * Exporta la instancia del servicio de datos que se utilizará en toda la aplicación
 * Permite configurar el servicio para usar diferentes proveedores de datos
 */

// Comentar importación problemática
// import type { DataService } from './data-service.ts'; 
// Volver a importación normal para clases
import { LocalDataService } from './local-data-service.ts'; 
import { SupabaseDataService, type SupabaseConnectionConfig } from './supabase-data-service.ts'; // SupabaseConnectionConfig sí puede ser type

// Reemplazo del enum con const as const
export const DataServiceType = {
  LOCAL: 'local',
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
// Comentar uso de DataService
// let dataServiceInstance: DataService | null = null;
let dataServiceInstance: any | null = null; // Usar any temporalmente

/**
 * Tipo de servicio actualmente configurado
 */
let currentServiceType: DataServiceType = DataServiceType.LOCAL;

/**
 * Inicializa el servicio de datos con la configuración especificada
 */
export const initializeDataService = async (config?: DataServiceConfig): Promise<void> => {
  // Si ya existe una instancia, verificar si necesita cambiarse
  if (dataServiceInstance) {
    if (!config || config.type === currentServiceType) {
      // Mismo tipo, no es necesario cambiar
      return;
    }
    
    // Tipo diferente, limpiar la instancia actual
    dataServiceInstance = null;
  }
  
  // Usar configuración proporcionada o la predeterminada
  const finalConfig = config || { type: DataServiceType.LOCAL };
  currentServiceType = finalConfig.type;
  
  // Crear la instancia según el tipo
  switch (finalConfig.type) {
    case DataServiceType.SUPABASE:
      if (!finalConfig.supabaseConfig) {
        throw new Error('No se ha proporcionado configuración para Supabase');
      }
      dataServiceInstance = new SupabaseDataService(finalConfig.supabaseConfig);
      break;
      
    case DataServiceType.LOCAL:
    default:
      dataServiceInstance = new LocalDataService();
      break;
  }
  
  // Inicializar el servicio
  await dataServiceInstance.initialize();
  
  console.log(`Servicio de datos inicializado: ${finalConfig.type}`);
};

/**
 * Obtiene la instancia del servicio de datos.
 * Si no está inicializado, lo inicializa automáticamente en modo LOCAL.
 */
// Comentar uso de DataService
// export const getDataService = (): DataService => {
export const getDataService = (): any => { // Usar any temporalmente
  if (!dataServiceInstance) {
    // Inicializar automáticamente en modo LOCAL
    console.log('Inicializando automáticamente el servicio de datos en modo LOCAL');
    dataServiceInstance = new LocalDataService();
    // Inicializar de forma asíncrona
    dataServiceInstance.initialize().catch(error => {
      console.error('Error al inicializar automáticamente el servicio de datos:', error);
    });
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
// Comentar re-exportación
// export type { DataService };
export { LocalDataService, SupabaseDataService };
export type { SupabaseConnectionConfig };

/**
 * Re-exporta los tipos de modelos para facilitar su uso
 */
export * from './models/interfaces.ts';

// Re-exportar el tipo Client también desde data-service
// Comentar re-exportación
// export type { Client } from './data-service.ts';