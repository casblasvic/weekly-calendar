import { prisma } from '@/lib/db';

export interface WebSocketConnectionData {
  type: string;
  referenceId: string;
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting' | 'connecting';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface WebSocketLogData {
  connectionId: string;
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
          unique_websocket_per_reference: {
            type: data.type,
            referenceId: data.referenceId
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

      // Crear nueva conexión
      const newConnection = await prisma.webSocketConnection.create({
        data: {
          type: data.type,
          referenceId: data.referenceId,
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata,
          lastPingAt: data.status === 'connected' ? new Date() : undefined
        }
      });

      console.log(`✨ Nuevo WebSocket creado: ${data.type}/${data.referenceId} (${newConnection.id})`);
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
   * Obtiene una conexión por tipo y referenceId
   */
  async getConnection(type: string, referenceId: string) {
    try {
      return await prisma.webSocketConnection.findUnique({
        where: {
          unique_websocket_per_reference: {
            type,
            referenceId
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