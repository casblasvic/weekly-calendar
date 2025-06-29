import { webSocketManager } from './index';
import { shellyRobustManager } from '../shelly/robust-websocket-manager';

class WebSocketSystemInitializer {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔄 Sistema WebSocket ya inicializado');
      return;
    }

    if (this.initPromise) {
      console.log('⏳ Inicialización en progreso...');
      return this.initPromise;
    }

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Inicializando Sistema de WebSocket Robusto...');

      // 1. Configurar event listeners globales
      this.setupGlobalEventListeners();

      // 2. Inicializar sistema Shelly
      console.log('📡 Inicializando conexiones Shelly...');
      await shellyRobustManager.initializeAll();

      // 3. Configurar health checks periódicos
      this.setupHealthChecks();

      // 4. Configurar limpieza automática
      this.setupCleanupTasks();

      this.initialized = true;
      console.log('✅ Sistema WebSocket inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando sistema WebSocket:', error);
      this.initPromise = null;
      throw error;
    }
  }

  private setupGlobalEventListeners(): void {
    const eventBus = webSocketManager.getEventBus();

    // Log de conexiones
    eventBus.on('connection:opened', (data) => {
      console.log(`🟢 Conexión abierta: ${data.connectionId} (${data.metadata?.type || 'unknown'})`);
    });

    eventBus.on('connection:closed', (data) => {
      console.log(`🔴 Conexión cerrada: ${data.connectionId}`);
    });

    eventBus.on('connection:error', (data) => {
      console.error(`⚠️ Error de conexión: ${data.connectionId}`, data.error?.message);
    });

    // Log de métricas
    eventBus.on('metrics:updated', (metrics) => {
      if (metrics.totalConnections > 0) {
        console.log(`📊 Métricas: ${metrics.activeConnections}/${metrics.totalConnections} activas, ${(metrics.errorRate * 100).toFixed(1)}% errores`);
      }
    });

    // Log de mensajes importantes
    eventBus.on('message:failed', (data) => {
      console.error(`📨 Fallo enviando mensaje: ${data.connectionId}`, data.error?.message);
    });
  }

  private setupHealthChecks(): void {
    // Health check cada 60 segundos
    setInterval(async () => {
      try {
        const healthResults = await webSocketManager.healthCheck();
        const unhealthyConnections = healthResults.filter(r => !r.isHealthy);
        
        if (unhealthyConnections.length > 0) {
          console.warn(`⚠️ ${unhealthyConnections.length} conexiones no saludables detectadas`);
        }
      } catch (error) {
        console.error('❌ Error en health check:', error);
      }
    }, 60000);
  }

  private setupCleanupTasks(): void {
    // Limpieza cada 5 minutos
    setInterval(() => {
      try {
        const metrics = webSocketManager.getMetrics();
        console.log(`🧹 Limpieza automática - Uptime: ${Math.round(metrics.uptime / 1000 / 60)}min`);
      } catch (error) {
        console.error('❌ Error en limpieza automática:', error);
      }
    }, 5 * 60 * 1000);
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('🛑 Cerrando sistema WebSocket...');

    try {
      // Cerrar conexiones Shelly
      await shellyRobustManager.destroy();

      // Cerrar manager principal
      webSocketManager.destroy();

      this.initialized = false;
      console.log('✅ Sistema WebSocket cerrado correctamente');

    } catch (error) {
      console.error('❌ Error cerrando sistema WebSocket:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getSystemStatus() {
    if (!this.initialized) {
      return {
        status: 'not_initialized',
        message: 'Sistema no inicializado'
      };
    }

    try {
      const metrics = webSocketManager.getMetrics();
      const shellyMetrics = shellyRobustManager.getMetrics();
      const healthResults = await webSocketManager.healthCheck();

      return {
        status: 'running',
        metrics: {
          system: metrics,
          shelly: shellyMetrics
        },
        health: {
          total: healthResults.length,
          healthy: healthResults.filter(r => r.isHealthy).length,
          unhealthy: healthResults.filter(r => !r.isHealthy).length
        },
        uptime: metrics.uptime
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Singleton para uso global
export const webSocketInitializer = new WebSocketSystemInitializer();

// Auto-inicializar en entornos de servidor
if (typeof window === 'undefined') {
  // Solo en servidor (Node.js)
  process.nextTick(async () => {
    try {
      await webSocketInitializer.initialize();
    } catch (error) {
      console.error('❌ Error en auto-inicialización:', error);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📡 Recibida señal SIGTERM, cerrando WebSocket...');
    await webSocketInitializer.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📡 Recibida señal SIGINT, cerrando WebSocket...');
    await webSocketInitializer.shutdown();
    process.exit(0);
  });
} 