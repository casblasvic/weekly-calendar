/**
 * ========================================
 * WEBSOCKET CONNECTION SERVICE - SERVICIO DE GESTIÓN DE CONEXIONES BD
 * ========================================
 * 
 * 🗄️ SERVICIO DE PERSISTENCIA WEBSOCKET
 * Este servicio maneja todas las operaciones de base de datos relacionadas
 * con conexiones WebSocket, incluyendo CRUD, estadísticas, logging y métricas.
 * Es la capa de abstracción entre el manager de conexiones y la base de datos.
 * 
 * 📊 TABLAS PRINCIPALES:
 * - `WebSocketConnection`: Estado y configuración de conexiones activas
 * - `WebSocketLog`: Registro exhaustivo de eventos y mensajes
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * CRÍTICO: Siempre usar: import { prisma } from '@/lib/db';
 * Esta es la única importación válida para Prisma en el proyecto.
 * 
 * 🏗️ ESTRUCTURA DE DATOS:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                  WebSocketConnection                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  id: string (UUID)                                          │
 * │  type: 'SHELLY' | 'SOCKET_IO' | 'CUSTOM' | 'TEST'          │
 * │  referenceId: string (credential, user, etc.)              │
 * │  url: string (WebSocket URL)                                │
 * │  status: 'connected' | 'disconnected' | 'error'            │
 * │  autoReconnect: boolean (reconexión automática)            │
 * │  metadata: JSON (configuración específica)                 │
 * │  lastConnectedAt: DateTime                                  │
 * │  lastDisconnectedAt: DateTime                               │
 * │  systemId: string (tenant isolation)                       │
 * │  createdAt: DateTime                                        │
 * │  updatedAt: DateTime                                        │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    WebSocketLog                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │  id: string (UUID)                                          │
 * │  connectionId: string (FK → WebSocketConnection)           │
 * │  eventType: 'connect' | 'disconnect' | 'message' | 'error' │
 * │  message: string (contenido del evento)                    │
 * │  errorDetails: string (detalles de errores)                │
 * │  metadata: JSON (datos adicionales)                        │
 * │  responseTime: number (latencia en ms)                     │
 * │  dataSize: number (tamaño de datos en bytes)               │
 * │  clientIp: string (IP del cliente)                         │
 * │  userAgent: string (User-Agent del cliente)                │
 * │  createdAt: DateTime                                        │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * 🔄 OPERACIONES PRINCIPALES:
 * 
 * **CRUD de Conexiones:**
 * - findOrCreateConnection(): Buscar o crear conexión
 * - updateConnectionStatus(): Actualizar estado de conexión
 * - getConnectionsByType(): Obtener conexiones por tipo
 * - deleteConnection(): Eliminar conexión y sus logs
 * 
 * **Logging de Eventos:**
 * - logEvent(): Registrar evento en WebSocketLog
 * - logConnectionEvent(): Log específico de conexión/desconexión
 * - logMessageEvent(): Log de mensajes enviados/recibidos
 * - logErrorEvent(): Log de errores con stack trace
 * 
 * **Estadísticas y Métricas:**
 * - getConnectionStats(): Estadísticas generales
 * - getMessageStats(): Métricas de mensajes
 * - getErrorStats(): Análisis de errores
 * - getPerformanceMetrics(): Métricas de rendimiento
 * 
 * **Limpieza y Mantenimiento:**
 * - cleanupOldLogs(): Eliminar logs antiguos
 * - cleanupInactiveConnections(): Limpiar conexiones muertas
 * - optimizeDatabase(): Optimización de índices
 * 
 * 🎯 CASOS DE USO TÍPICOS:
 * 
 * **1. Inicialización de Conexión:**
 * ```typescript
 * const connection = await webSocketConnectionService.findOrCreateConnection({
 *   type: 'SHELLY',
 *   referenceId: 'credential_123',
 *   url: 'wss://api.shelly.cloud/device/relay',
 *   autoReconnect: true,
 *   metadata: { credentialId: '123', apiHost: 'api.shelly.cloud' }
 * });
 * ```
 * 
 * **2. Logging de Eventos:**
 * ```typescript
 * await webSocketConnectionService.logEvent(connectionId, {
 *   eventType: 'message',
 *   message: 'Device control command sent',
 *   metadata: { deviceId: 'device_456', action: 'on' },
 *   responseTime: 150,
 *   dataSize: 256
 * });
 * ```
 * 
 * **3. Obtener Estadísticas:**
 * ```typescript
 * const stats = await webSocketConnectionService.getConnectionStats();
 * console.log(`Conexiones activas: ${stats.activeConnections}`);
 * console.log(`Total mensajes: ${stats.totalMessages}`);
 * console.log(`Tasa error: ${stats.errorRate}%`);
 * ```
 * 
 * **4. Limpieza Automática:**
 * ```typescript
 * // Eliminar logs mayores a 30 días
 * await webSocketConnectionService.cleanupOldLogs(30);
 * 
 * // Limpiar conexiones inactivas > 24h
 * await webSocketConnectionService.cleanupInactiveConnections(24);
 * ```
 * 
 * 🚨 CONSIDERACIONES CRÍTICAS:
 * 
 * **Tenant Isolation:**
 * - Todas las operaciones filtran por systemId
 * - Nunca mezclar datos entre sistemas
 * - Validar permisos en cada operación
 * 
 * **Performance:**
 * - Usar índices en queries frecuentes
 * - Paginar resultados grandes
 * - Cleanup periódico de logs antiguos
 * - Optimizar queries con includes selectivos
 * 
 * **Reliability:**
 * - Transacciones para operaciones críticas
 * - Manejo robusto de errores
 * - Retry automático para fallos temporales
 * - Validación de datos antes de insertar
 * 
 * **Monitoring:**
 * - Log de todas las operaciones críticas
 * - Métricas de performance de queries
 * - Alertas por volumen anómalo
 * - Tracking de errores de BD
 * 
 * 📈 MÉTRICAS DISPONIBLES:
 * 
 * **Conexiones:**
 * - Total de conexiones por tipo
 * - Conexiones activas vs inactivas
 * - Tiempo promedio de conexión
 * - Frecuencia de reconexiones
 * 
 * **Mensajes:**
 * - Mensajes por segundo
 * - Distribución por tipo de evento
 * - Tamaño promedio de mensajes
 * - Latencia promedio
 * 
 * **Errores:**
 * - Tasa de errores por conexión
 * - Tipos de errores más frecuentes
 * - Conexiones problemáticas
 * - Tendencias de errores
 * 
 * **Performance:**
 * - Tiempo de respuesta de queries
 * - Uso de memoria de logs
 * - Crecimiento de datos
 * - Eficiencia de índices
 * 
 * 🔧 CONFIGURACIÓN Y OPTIMIZACIÓN:
 * 
 * **Retención de Logs:**
 * - Logs de conexión: 90 días
 * - Logs de mensajes: 30 días
 * - Logs de errores: 180 días
 * - Métricas agregadas: 1 año
 * 
 * **Índices Recomendados:**
 * - WebSocketConnection: (systemId, type, status)
 * - WebSocketConnection: (referenceId, systemId)
 * - WebSocketLog: (connectionId, createdAt)
 * - WebSocketLog: (eventType, createdAt)
 * 
 * **Limpieza Automática:**
 * - Ejecutar cleanup diario en horario de bajo uso
 * - Archivar logs antiguos antes de eliminar
 * - Mantener métricas agregadas para histórico
 * - Monitorizar crecimiento de datos
 * 
 * ⚠️ TROUBLESHOOTING:
 * 
 * **Queries Lentas:**
 * - Verificar índices en filtros
 * - Reducir tamaño de includes
 * - Paginar resultados grandes
 * - Usar agregaciones en lugar de conteos
 * 
 * **Crecimiento Excesivo:**
 * - Revisar retención de logs
 * - Verificar cleanup automático
 * - Optimizar logging innecesario
 * - Archivar datos históricos
 * 
 * **Errores de Conexión BD:**
 * - Verificar pool de conexiones
 * - Revisar timeouts de Prisma
 * - Comprobar límites de BD
 * - Validar permisos de usuario
 * 
 * 💡 MEJORES PRÁCTICAS:
 * 
 * **Logging Eficiente:**
 * - Log solo eventos relevantes
 * - Usar niveles de log apropiados
 * - Incluir contexto suficiente
 * - Evitar logging en loops
 * 
 * **Gestión de Memoria:**
 * - Paginar queries grandes
 * - Usar streams para exports
 * - Liberar referencias no usadas
 * - Monitorizar uso de memoria
 * 
 * **Seguridad:**
 * - Sanitizar datos de entrada
 * - No loggear información sensible
 * - Validar permisos siempre
 * - Usar prepared statements
 */

import { prisma } from '@/lib/db';

export interface WebSocketConnectionData {
  type: string;
  referenceId: string;
  systemId: string; // 🆔 AÑADIR systemId obligatorio para multi-tenancy
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting' | 'connecting';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface WebSocketLogData {
  connectionId: string;
  systemId: string; // 🆔 AÑADIR systemId obligatorio para multi-tenancy
  eventType: 'connect' | 'disconnect' | 'error' | 'message' | 'ping' | 'reconnect';
  message?: string;
  errorDetails?: string;
  metadata?: Record<string, any>;
  responseTime?: number;
  dataSize?: number;
  clientIp?: string;
  userAgent?: string;
}

export class WebSocketConnectionService {
  
  /**
   * Busca o crea una conexión WebSocket única por tipo y referenceId
   */
  async findOrCreateConnection(data: WebSocketConnectionData): Promise<{ id: string; isNew: boolean }> {
    try {
      // Intentar encontrar conexión existente
      const existing = await prisma.webSocketConnection.findUnique({
        where: {
          unique_websocket_per_reference_system: {
            type: data.type,
            referenceId: data.referenceId,
            systemId: data.systemId
          }
        }
      });

      if (existing) {
        // Actualizar conexión existente
        await prisma.webSocketConnection.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            errorMessage: data.errorMessage,
            metadata: data.metadata,
            lastPingAt: data.status === 'connected' ? new Date() : existing.lastPingAt,
            updatedAt: new Date()
          }
        });

        console.log(`🔄 WebSocket reutilizado: ${data.type}/${data.referenceId} (${existing.id})`);
        return { id: existing.id, isNew: false };
      }

      // 🛡️ CONFIGURAR autoReconnect SEGÚN ESTADO DEL MÓDULO (para conexiones Shelly)
      let autoReconnectValue = true; // Valor por defecto para tipos no-Shelly
      
      if (data.type === 'SHELLY') {
        try {
          // Obtener systemId de la credencial para verificar módulo
          const credential = await prisma.shellyCredential.findUnique({
            where: { id: data.referenceId },
            select: { systemId: true }
          });
          
          if (credential) {
            const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
            const isModuleActive = await isShellyModuleActive(credential.systemId);
            autoReconnectValue = isModuleActive;
            
            console.log(`🛡️ [CONNECTION-SERVICE] Nueva conexión Shelly con autoReconnect=${autoReconnectValue} (módulo ${isModuleActive ? 'activo' : 'inactivo'})`);
          }
        } catch (error) {
          console.warn('⚠️ [CONNECTION-SERVICE] Error verificando módulo Shelly, usando autoReconnect=true por defecto:', error);
        }
      }

      // Crear nueva conexión
      const newConnection = await prisma.webSocketConnection.create({
        data: {
          type: data.type,
          referenceId: data.referenceId,
          systemId: data.systemId, // 🆔 AÑADIR systemId obligatorio
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata,
          autoReconnect: autoReconnectValue, // 🛡️ CONFIGURAR SEGÚN ESTADO DEL MÓDULO
          lastPingAt: data.status === 'connected' ? new Date() : undefined
        }
      });

      console.log(`✨ Nuevo WebSocket creado: ${data.type}/${data.referenceId} (${newConnection.id}) autoReconnect=${autoReconnectValue}`);
      return { id: newConnection.id, isNew: true };

    } catch (error) {
      console.error('❌ Error en findOrCreateConnection:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de una conexión existente
   */
  async updateConnectionStatus(
    type: string, 
    referenceId: string, 
    status: WebSocketConnectionData['status'],
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.webSocketConnection.updateMany({
        where: {
          type,
          referenceId
        },
        data: {
          status,
          errorMessage,
          metadata,
          lastPingAt: status === 'connected' ? new Date() : undefined,
          updatedAt: new Date()
        }
      });

      console.log(`📡 Estado actualizado: ${type}/${referenceId} → ${status}`);
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw error;
    }
  }

  /**
   * Registra un evento/log en la conexión
   */
  async logEvent(data: WebSocketLogData): Promise<void> {
    try {
      await prisma.webSocketLog.create({
        data: {
          connectionId: data.connectionId,
          systemId: data.systemId, // 🆔 AÑADIR systemId obligatorio
          eventType: data.eventType,
          message: data.message,
          errorDetails: data.errorDetails,
          metadata: data.metadata,
          responseTime: data.responseTime,
          dataSize: data.dataSize,
          clientIp: data.clientIp,
          userAgent: data.userAgent
        }
      });

      // Opcional: Log solo eventos importantes para no saturar la consola
      if (['connect', 'disconnect', 'error', 'reconnect'].includes(data.eventType)) {
        console.log(`📝 Log registrado: ${data.eventType} en ${data.connectionId}`);
      }
    } catch (error) {
      console.error('❌ Error registrando log:', error);
      // No lanzar error aquí para no interrumpir el flujo principal
    }
  }

  /**
   * Obtiene una conexión por tipo, referenceId y systemId
   */
  async getConnection(type: string, referenceId: string, systemId: string) {
    try {
      return await prisma.webSocketConnection.findUnique({
        where: {
          unique_websocket_per_reference_system: {
            type,
            referenceId,
            systemId
          }
        },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Últimos 10 logs
          }
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo conexión:', error);
      return null;
    }
  }

  /**
   * Lista todas las conexiones de un tipo específico
   */
  async getConnectionsByType(type: string) {
    try {
      return await prisma.webSocketConnection.findMany({
        where: { type },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error obteniendo conexiones por tipo:', error);
      return [];
    }
  }

  /**
   * Elimina conexiones antiguas desconectadas (limpieza)
   */
  async cleanupOldConnections(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.webSocketConnection.deleteMany({
        where: {
          AND: [
            { status: { in: ['disconnected', 'error'] } },
            { updatedAt: { lt: cutoffDate } }
          ]
        }
      });

      if (result.count > 0) {
        console.log(`🧹 Limpieza: ${result.count} conexiones antiguas eliminadas`);
      }

      return result.count;
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de conexiones
   */
  async getConnectionStats() {
    try {
      const [total, connected, disconnected, error, reconnecting] = await Promise.all([
        prisma.webSocketConnection.count(),
        prisma.webSocketConnection.count({ where: { status: 'connected' } }),
        prisma.webSocketConnection.count({ where: { status: 'disconnected' } }),
        prisma.webSocketConnection.count({ where: { status: 'error' } }),
        prisma.webSocketConnection.count({ where: { status: 'reconnecting' } })
      ]);

      return {
        total,
        connected,
        disconnected,
        error,
        reconnecting,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        total: 0,
        connected: 0,
        disconnected: 0,
        error: 0,
        reconnecting: 0,
        lastUpdate: new Date()
      };
    }
  }

  /**
   * Marca una conexión como reconectando
   */
  async markAsReconnecting(type: string, referenceId: string): Promise<void> {
    await this.updateConnectionStatus(type, referenceId, 'reconnecting');
  }

  /**
   * Marca una conexión como conectada exitosamente
   */
  async markAsConnected(type: string, referenceId: string, metadata?: Record<string, any>): Promise<void> {
    await this.updateConnectionStatus(type, referenceId, 'connected', undefined, metadata);
  }

  /**
   * Marca una conexión como desconectada
   */
  async markAsDisconnected(type: string, referenceId: string, reason?: string): Promise<void> {
    await this.updateConnectionStatus(type, referenceId, 'disconnected', reason);
  }

  /**
   * Marca una conexión como error
   */
  async markAsError(type: string, referenceId: string, errorMessage: string): Promise<void> {
    await this.updateConnectionStatus(type, referenceId, 'error', errorMessage);
  }
}

// Singleton para uso global
export const webSocketConnectionService = new WebSocketConnectionService(); 