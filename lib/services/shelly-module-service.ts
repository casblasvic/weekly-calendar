import { prisma } from '@/lib/db';

/**
 * 🛡️ SERVICIO DE VERIFICACIÓN DE MÓDULOS SHELLY
 * 
 * Centraliza toda la lógica para verificar si el módulo de Shelly está activo
 * desde el marketplace. Esto protege el módulo de pago y evita consumo de recursos
 * cuando está desactivado.
 */
export class ShellyModuleService {
  private static instance: ShellyModuleService | null = null;
  private cache = new Map<string, { isActive: boolean; expiresAt: number }>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 segundos de cache

  /**
   * Singleton - una sola instancia global
   */
  static getInstance(): ShellyModuleService {
    if (!ShellyModuleService.instance) {
      ShellyModuleService.instance = new ShellyModuleService();
    }
    return ShellyModuleService.instance;
  }

  private constructor() {
    console.log('🛡️ [ShellyModuleService] Inicializado');
  }

  /**
   * ✅ VERIFICAR SI EL MÓDULO SHELLY ESTÁ ACTIVO PARA UN SISTEMA
   */
  async isModuleActive(systemId: string): Promise<boolean> {
    if (!systemId) {
      console.warn('⚠️ [ShellyModuleService] systemId requerido');
      return false;
    }

    // Verificar cache primero
    const cached = this.cache.get(systemId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.isActive;
    }

    try {
      // Buscar el módulo de Shelly en el marketplace
      const shellyModule = await prisma.integrationModule.findFirst({
        where: {
          name: { contains: 'Shelly', mode: 'insensitive' },
          category: 'IOT_DEVICES'
        }
      });

      if (!shellyModule) {
        console.warn('⚠️ [ShellyModuleService] Módulo Shelly no encontrado en marketplace');
        return false;
      }

      // Verificar si está activo para este sistema
      const systemIntegration = await prisma.systemIntegration.findUnique({
        where: {
          systemId_moduleId: {
            systemId,
            moduleId: shellyModule.id
          }
        }
      });

      const isActive = systemIntegration?.isActive === true;

      // Guardar en cache
      this.cache.set(systemId, {
        isActive,
        expiresAt: Date.now() + this.CACHE_DURATION
      });

      console.log(`🔍 [ShellyModuleService] Sistema ${systemId}: ${isActive ? 'ACTIVO' : 'INACTIVO'}`);
      return isActive;

    } catch (error) {
      console.error('❌ [ShellyModuleService] Error verificando módulo:', error);
      return false; // Fail-safe: desactivado por defecto
    }
  }

  /**
   * ✅ VERIFICAR SI SE PUEDEN INICIALIZAR WEBSOCKETS
   */
  async canInitializeWebSockets(systemId: string): Promise<boolean> {
    const isActive = await this.isModuleActive(systemId);
    
    if (!isActive) {
      console.log(`🔒 [ShellyModuleService] WebSockets Shelly BLOQUEADOS - módulo inactivo para sistema ${systemId}`);
      return false;
    }

    console.log(`✅ [ShellyModuleService] WebSockets Shelly PERMITIDOS para sistema ${systemId}`);
    return true;
  }

  /**
   * ✅ VERIFICAR SI SE DEBEN OMITIR SERVICIOS SHELLY
   */
  async shouldSkipShellyServices(systemId: string): Promise<boolean> {
    const isActive = await this.isModuleActive(systemId);
    const shouldSkip = !isActive;

    if (shouldSkip) {
      console.log(`🔒 [ShellyModuleService] Servicios Shelly OMITIDOS - módulo inactivo para sistema ${systemId}`);
    }

    return shouldSkip;
  }

  /**
   * 🔄 INVALIDAR CACHE PARA UN SISTEMA (útil cuando se activa/desactiva)
   */
  invalidateCache(systemId: string): void {
    this.cache.delete(systemId);
    console.log(`🗑️ [ShellyModuleService] Cache invalidado para sistema ${systemId}`);
  }

  /**
   * 🗑️ LIMPIAR TODO EL CACHE
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`🗑️ [ShellyModuleService] Cache completamente limpiado`);
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DEL SERVICIO
   */
  getStats(): {
    cacheSize: number;
    cacheEntries: { systemId: string; isActive: boolean; expiresAt: Date }[];
  } {
    const entries = Array.from(this.cache.entries()).map(([systemId, data]) => ({
      systemId,
      isActive: data.isActive,
      expiresAt: new Date(data.expiresAt)
    }));

    return {
      cacheSize: this.cache.size,
      cacheEntries: entries
    };
  }
}

// Export singleton instance
export const shellyModuleService = ShellyModuleService.getInstance();

/**
 * 🔧 HELPER FUNCTIONS PARA USO RÁPIDO
 */

/**
 * Verificar si Shelly está activo (función helper)
 */
export async function isShellyModuleActive(systemId: string): Promise<boolean> {
  return shellyModuleService.isModuleActive(systemId);
}

/**
 * Verificar si se pueden usar servicios Shelly (función helper)
 */
export async function canUseShellyServices(systemId: string): Promise<boolean> {
  return shellyModuleService.canInitializeWebSockets(systemId);
}

/**
 * Verificar si se deben omitir servicios Shelly (función helper)
 */
export async function shouldSkipShelly(systemId: string): Promise<boolean> {
  return shellyModuleService.shouldSkipShellyServices(systemId);
}

/**
 * 🔌 Función para desconectar todas las conexiones WebSocket Shelly de un sistema específico
 * MÉTODO SIMPLE: Marca credenciales como suspendidas para evitar reconexiones
 */
export async function disconnectAllShellyWebSockets(systemId: string): Promise<void> {
  try {
    console.log(`🔌 [MODULE-SERVICE] Desactivando credenciales Shelly para sistema ${systemId}...`);
    
    // 🎯 MÉTODO ELEGANTE: Cambiar status de credenciales para evitar reconexión
    const updatedCredentials = await prisma.shellyCredential.updateMany({
      where: {
        systemId,
        status: 'connected'
      },
      data: {
        status: 'module_inactive' // Nuevo status específico
      }
    });
    
    console.log(`✅ [MODULE-SERVICE] ${updatedCredentials.count} credenciales Shelly marcadas como inactivas por módulo`);
    
    // 🛡️ CRUCIAL: Ahora filtramos por systemId para multi-tenancy
    const updatedConnections = await prisma.webSocketConnection.updateMany({
      where: {
        systemId,
        type: 'SHELLY'
      },
      data: {
        status: 'disconnected',
        autoReconnect: false, // 🛡️ DESHABILITAR RECONEXIÓN AUTOMÁTICA
        errorMessage: 'Módulo Shelly desactivado'
      }
    });
    
    console.log(`✅ [MODULE-SERVICE] ${updatedConnections.count} conexiones WebSocket marcadas como desconectadas y autoReconnect deshabilitado`);
    
    // Intentar desconexión física (pero no es crítico)
    try {
      const { shellyWebSocketManager } = await import('@/lib/shelly/websocket-manager');
      await shellyWebSocketManager.disconnectAll();
      console.log('✅ [MODULE-SERVICE] Desconexión física completada');
    } catch (physicalError) {
      console.warn('⚠️ [MODULE-SERVICE] Error en desconexión física (no crítico):', physicalError);
    }
    
  } catch (error) {
    console.error('❌ [MODULE-SERVICE] Error desconectando WebSockets Shelly:', error);
  }
}

/**
 * 🔄 Función para reactivar todas las credenciales WebSocket Shelly de un sistema específico
 * Se llama cuando el módulo se activa para restaurar credenciales
 */
export async function reactivateAllShellyWebSockets(systemId: string): Promise<void> {
  try {
    console.log(`🔄 [MODULE-SERVICE] Reactivando credenciales Shelly para sistema ${systemId}...`);
    
    // Reactivar credenciales que fueron suspendidas por el módulo
    const reactivatedCredentials = await prisma.shellyCredential.updateMany({
      where: {
        systemId,
        status: 'module_inactive'
      },
      data: {
        status: 'connected'
      }
    });
    
    console.log(`✅ [MODULE-SERVICE] ${reactivatedCredentials.count} credenciales Shelly reactivadas`);
    
    // 🔄 HABILITAR autoReconnect en conexiones WebSocket existentes (solo para este sistema)
    const reactivatedConnections = await prisma.webSocketConnection.updateMany({
      where: {
        systemId,
        type: 'SHELLY'
      },
      data: {
        autoReconnect: true, // 🔄 HABILITAR RECONEXIÓN AUTOMÁTICA
        errorMessage: null // Limpiar mensaje de error
      }
    });
    
    console.log(`✅ [MODULE-SERVICE] ${reactivatedConnections.count} conexiones WebSocket con autoReconnect habilitado`);
    
    // Las conexiones se crearán automáticamente en el próximo reinicio del servidor
    // o mediante los workers automáticos
    
  } catch (error) {
    console.error('❌ [MODULE-SERVICE] Error reactivando credenciales Shelly:', error);
  }
}

/**
 * 🔍 VERIFICACIÓN AUTOMÁTICA DE CONEXIONES LEGACY
 * Detecta y limpia automáticamente conexiones Shelly legacy cuando el módulo está inactivo
 * Se ejecuta al cargar la aplicación para mantener consistencia
 */
export async function autoCleanupLegacyConnections(systemId: string): Promise<{
  hadLegacyConnections: boolean;
  cleaned: boolean;
  details: string;
}> {
  try {
    // 1. Verificar si el módulo Shelly está activo
    const isModuleActive = await isShellyModuleActive(systemId);
    
    if (isModuleActive) {
      return {
        hadLegacyConnections: false,
        cleaned: false,
        details: 'Módulo Shelly activo - verificación omitida'
      };
    }

    // 2. Buscar conexiones Shelly activas en BD para este sistema
    const activeShellyConnections = await prisma.webSocketConnection.findMany({
      where: {
        systemId,
        type: 'SHELLY',
        status: 'connected'
      }
    });

    // 3. Buscar credenciales Shelly conectadas  
    const activeCredentials = await prisma.shellyCredential.findMany({
      where: {
        systemId,
        status: 'connected'
      }
    });

    const hasLegacyConnections = activeShellyConnections.length > 0 || activeCredentials.length > 0;

    if (!hasLegacyConnections) {
      return {
        hadLegacyConnections: false,
        cleaned: false,
        details: 'No se encontraron conexiones legacy'
      };
    }

    console.log(`🔍 [AUTO-CLEANUP] Sistema ${systemId}: Módulo Shelly INACTIVO pero encontradas ${activeShellyConnections.length} conexiones WebSocket y ${activeCredentials.length} credenciales activas`);
    console.log(`🧹 [AUTO-CLEANUP] Iniciando limpieza automática de conexiones legacy...`);

    // 4. Ejecutar limpieza automática
    await disconnectAllShellyWebSockets(systemId);

    console.log(`✅ [AUTO-CLEANUP] Limpieza automática completada para sistema ${systemId}`);

    return {
      hadLegacyConnections: true,
      cleaned: true,
      details: `Limpiadas ${activeShellyConnections.length} conexiones WebSocket y ${activeCredentials.length} credenciales`
    };

  } catch (error) {
    console.error(`❌ [AUTO-CLEANUP] Error en limpieza automática para sistema ${systemId}:`, error);
    return {
      hadLegacyConnections: false,
      cleaned: false,
      details: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
} 