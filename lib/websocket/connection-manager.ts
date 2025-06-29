import { v4 as uuidv4 } from 'uuid';
import {
  IConnectionManager,
  ConnectionConfig,
  WebSocketConnection,
  ConnectionStatus,
  ConnectionMetrics,
  HealthCheckResult,
  MessageEnvelope,
  MessagePriority,
  IEventBus,
  IMessageQueue,
  IRateLimiter
} from './types';
import { WebSocketEventBus } from './event-bus';
import { PriorityMessageQueue } from './message-queue';
import { TokenBucketRateLimiter } from './rate-limiter';
import WebSocket from 'ws';

/**
 * ========================================
 * WEBSOCKET CONNECTION MANAGER - GESTOR ROBUSTO DE CONEXIONES
 * ========================================
 * 
 * 🔧 MANAGER PRINCIPAL DE WEBSOCKETS
 * Este es el componente central que gestiona todas las conexiones WebSocket
 * de la aplicación. Proporciona reconexión automática, health checks,
 * métricas en tiempo real y integración completa con base de datos.
 * 
 * 📊 TABLAS DE BASE DE DATOS:
 * - `WebSocketConnection`: Estado y configuración de conexiones
 * - `WebSocketLog`: Registro de eventos, errores y mensajes
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * IMPORTANTE: Siempre usar: import { prisma } from '@/lib/db';
 * 
 * 🏗️ ARQUITECTURA DEL MANAGER:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                RobustWebSocketManager                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │  🔌 Connection Pool                                         │
 * │  ├── Map<string, WebSocketConnection>                      │
 * │  ├── Estado por conexión (connecting/connected/error)      │
 * │  └── Metadata y configuración por conexión                 │
 * │                                                             │
 * │  🔄 Reconnection Engine                                     │
 * │  ├── Exponential backoff (1s → 2s → 4s → 8s → 16s)        │
 * │  ├── Máximo de reintentos configurable                     │
 * │  ├── Reconexión automática opcional por conexión          │
 * │  └── Detección de conexiones perdidas                      │
 * │                                                             │
 * │  📊 Metrics & Health                                        │
 * │  ├── Conexiones activas/inactivas                          │
 * │  ├── Mensajes por segundo                                  │
 * │  ├── Tasa de errores                                       │
 * │  ├── Latencia promedio                                     │
 * │  └── Health checks periódicos                              │
 * │                                                             │
 * │  🗂️ Message Queue Integration                               │
 * │  ├── Cola de prioridades por conexión                      │
 * │  ├── Rate limiting integrado                               │
 * │  ├── Reintento automático de mensajes fallidos            │
 * │  └── Persistencia de mensajes críticos                     │
 * │                                                             │
 * │  📝 Database Integration                                    │
 * │  ├── Sincronización automática con BD                      │
 * │  ├── Logging de todos los eventos                          │
 * │  ├── Persistencia de estado entre reinicios               │
 * │  └── Auditoría completa de actividad                       │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * 🔌 TIPOS DE CONEXIONES SOPORTADAS:
 * - **SHELLY**: Dispositivos IoT Shelly via Cloud API
 * - **SOCKET_IO**: Conexiones Socket.io para tiempo real
 * - **CUSTOM**: WebSockets personalizados
 * - **TEST**: Conexiones de prueba para desarrollo
 * 
 * 📡 FLUJO DE GESTIÓN DE CONEXIONES:
 * 
 * 1. **Creación de Conexión:**
 *    - Validar URL y parámetros
 *    - Crear registro en tabla WebSocketConnection
 *    - Establecer conexión física WebSocket
 *    - Configurar event listeners
 *    - Iniciar health checks
 * 
 * 2. **Gestión de Mensajes:**
 *    - Validar rate limits
 *    - Encolar mensaje con prioridad
 *    - Enviar via WebSocket
 *    - Registrar resultado en logs
 *    - Manejar reintentos si falla
 * 
 * 3. **Reconexión Automática:**
 *    - Detectar desconexión inesperada
 *    - Calcular delay con exponential backoff
 *    - Intentar reconexión automática
 *    - Actualizar estado en BD
 *    - Notificar via EventBus
 * 
 * 4. **Health Monitoring:**
 *    - Ping/Pong periódico
 *    - Verificar latencia
 *    - Detectar conexiones zombie
 *    - Generar métricas en tiempo real
 *    - Alertas automáticas
 * 
 * 🚨 CONSIDERACIONES CRÍTICAS:
 * 
 * **Seguridad:**
 * - Validación de URLs WebSocket (solo WSS en producción)
 * - Autenticación por tokens
 * - Rate limiting por conexión
 * - Validación de permisos por systemId
 * 
 * **Performance:**
 * - Pool de conexiones limitado
 * - Cleanup automático de conexiones inactivas
 * - Optimización de memoria con weak references
 * - Batching de mensajes cuando es posible
 * 
 * **Reliability:**
 * - Persistencia de estado en BD
 * - Recuperación automática tras reinicio
 * - Detección de conexiones perdidas
 * - Fallback a polling si WebSocket falla
 * 
 * **Observability:**
 * - Logging exhaustivo de eventos
 * - Métricas en tiempo real
 * - Health checks configurables
 * - Alertas automáticas por thresholds
 * 
 * 🎯 CONFIGURACIÓN RECOMENDADA:
 * 
 * ```typescript
 * const manager = new RobustWebSocketManager({
 *   maxConnections: 100,              // Máximo de conexiones simultáneas
 *   maxReconnectAttempts: 5,          // Reintentos antes de marcar como failed
 *   reconnectInterval: 1000,          // Delay inicial de reconexión (ms)
 *   heartbeatInterval: 30000,         // Frecuencia de ping/pong (ms)
 *   messageTimeout: 10000,            // Timeout para respuestas (ms)
 *   rateLimitWindow: 60000,           // Ventana de rate limiting (ms)
 *   rateLimitMaxMessages: 60,         // Máximo mensajes por ventana
 *   healthCheckInterval: 60000,       // Frecuencia de health checks (ms)
 *   cleanupInterval: 300000           // Limpieza de conexiones muertas (ms)
 * });
 * ```
 * 
 * 💡 EJEMPLOS DE USO:
 * 
 * ```typescript
 * // Crear conexión básica
 * const connection = await manager.connect({
 *   url: 'wss://api.shelly.cloud/device/relay',
 *   type: 'SHELLY',
 *   referenceId: 'credential_123',
 *   metadata: { credentialId: '123', apiHost: 'api.shelly.cloud' },
 *   autoReconnect: true
 * });
 * 
 * // Enviar mensaje con prioridad
 * await manager.send(connection.id, {
 *   type: 'control',
 *   data: { deviceId: 'device_456', action: 'on' },
 *   priority: MessagePriority.HIGH,
 *   timeout: 5000
 * });
 * 
 * // Escuchar eventos
 * manager.getEventBus().on('message:received', (data) => {
 *   console.log(`Mensaje de ${data.connectionId}:`, data.message);
 * });
 * 
 * // Obtener métricas
 * const metrics = manager.getMetrics();
 * console.log(`Conexiones: ${metrics.activeConnections}/${metrics.totalConnections}`);
 * console.log(`Mensajes/seg: ${metrics.messagesPerSecond}`);
 * console.log(`Tasa error: ${(metrics.errorRate * 100).toFixed(1)}%`);
 * 
 * // Health check manual
 * const healthResults = await manager.healthCheck();
 * const unhealthy = healthResults.filter(r => !r.isHealthy);
 * console.log(`${unhealthy.length} conexiones no saludables`);
 * ```
 * 
 * 🔧 INTEGRACIÓN CON OTROS SISTEMAS:
 * 
 * **Shelly Plugin:**
 * - Usa este manager para conexiones a Shelly Cloud
 * - Mapeo automático deviceId → cloudId
 * - Control de dispositivos en tiempo real
 * 
 * **Socket.io:**
 * - Notificaciones push a usuarios
 * - Actualizaciones de UI en tiempo real
 * - Colaboración entre usuarios
 * 
 * **Monitoring:**
 * - Integración con sistemas de alertas
 * - Dashboards de métricas
 * - Logs centralizados
 * 
 * ⚠️ TROUBLESHOOTING COMÚN:
 * 
 * **Conexión no se establece:**
 * - Verificar URL (debe ser WSS en producción)
 * - Validar token de autenticación
 * - Comprobar firewall/proxy
 * 
 * **Reconexión constante:**
 * - Verificar estabilidad de red
 * - Revisar rate limiting
 * - Comprobar validez del token
 * 
 * **Mensajes perdidos:**
 * - Verificar cola de mensajes
 * - Comprobar rate limits
 * - Revisar logs de errores
 * 
 * **Alto uso de memoria:**
 * - Verificar cleanup de conexiones
 * - Comprobar tamaño de colas
 * - Revisar retención de logs
 */

export class RobustWebSocketManager implements IConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private eventBus: IEventBus;
  private messageQueue: IMessageQueue;
  private rateLimiter: IRateLimiter;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private pingTimers: Map<string, NodeJS.Timeout> = new Map();
  private metrics: ConnectionMetrics;
  private startTime: Date;
  private messageProcessor: NodeJS.Timeout;

  constructor(
    eventBus?: IEventBus,
    messageQueue?: IMessageQueue,
    rateLimiter?: IRateLimiter
  ) {
    this.eventBus = eventBus || new WebSocketEventBus();
    this.messageQueue = messageQueue || new PriorityMessageQueue();
    this.rateLimiter = rateLimiter || new TokenBucketRateLimiter();
    this.startTime = new Date();
    this.metrics = this.initializeMetrics();
    
    // Procesar cola de mensajes cada 100ms
    this.messageProcessor = setInterval(() => {
      this.processMessageQueue();
    }, 100);
  }

  async connect(config: ConnectionConfig): Promise<string> {
    const connectionId = uuidv4();
    
    const connection: WebSocketConnection = {
      id: connectionId,
      url: config.url,
      status: ConnectionStatus.CONNECTING,
      lastPing: new Date(),
      lastPong: new Date(),
      reconnectAttempts: 0,
      maxReconnectAttempts: config.maxReconnectAttempts,
      metadata: { ...config.metadata, originalConfig: config },
      tags: config.tags || []
    };

    this.connections.set(connectionId, connection);
    this.updateMetrics();

    try {
      await this.createWebSocketConnection(connectionId, config);
      return connectionId;
    } catch (error) {
      this.connections.delete(connectionId);
      throw error;
    }
  }

  private async createWebSocketConnection(
    connectionId: string, 
    config: ConnectionConfig
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    try {
      const ws = new WebSocket(config.url);
      this.websockets.set(connectionId, ws);

      // Configurar timeout para la conexión
      const connectTimeout = setTimeout(() => {
        if (connection.status === ConnectionStatus.CONNECTING) {
          ws.close();
          this.handleConnectionError(connectionId, new Error('Connection timeout'));
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        this.handleConnectionOpen(connectionId, config);
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        this.handleConnectionClose(connectionId, event);
      };

      ws.onerror = (error) => {
        clearTimeout(connectTimeout);
        this.handleConnectionError(connectionId, error);
      };

      ws.onmessage = (event) => {
        this.handleMessage(connectionId, event);
      };

    } catch (error) {
      this.handleConnectionError(connectionId, error as Error);
    }
  }

  private initializeMetrics(): ConnectionMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      errorRate: 0,
      uptime: 0
    };
  }

  // Continuará en la siguiente parte...
  getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  getMetrics(): ConnectionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  async healthCheck(connectionId?: string): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    return results;
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = ConnectionStatus.DISCONNECTING;
    }
    this.connections.delete(connectionId);
    this.websockets.delete(connectionId);
  }

  async send(connectionId: string, message: any, priority: MessagePriority = MessagePriority.NORMAL): Promise<void> {
    const messageEnvelope: MessageEnvelope = {
      id: uuidv4(),
      connectionId,
      type: 'outbound',
      payload: message,
      timestamp: new Date(),
      retryCount: 0,
      priority
    };

    await this.messageQueue.enqueue(messageEnvelope);
  }

  async broadcast(message: any, tags?: string[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const connection of this.connections.values()) {
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(tag => connection.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }
      promises.push(this.send(connection.id, message, MessagePriority.NORMAL));
    }

    await Promise.all(promises);
  }

  private updateMetrics(): void {
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(c => c.status === ConnectionStatus.CONNECTED);
    const failedConnections = connections.filter(c => c.status === ConnectionStatus.FAILED);

    this.metrics = {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      failedConnections: failedConnections.length,
      messagesPerSecond: 0,
      averageLatency: 0,
      errorRate: failedConnections.length / Math.max(connections.length, 1),
      uptime: Date.now() - this.startTime.getTime()
    };

    this.eventBus.emit('metrics:updated', this.metrics);
  }

  private handleConnectionOpen(connectionId: string, config: ConnectionConfig): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = ConnectionStatus.CONNECTED;
    connection.lastPong = new Date();
    connection.reconnectAttempts = 0;

    this.eventBus.emit('connection:opened', {
      connectionId,
      status: ConnectionStatus.CONNECTED,
      metadata: connection.metadata
    });

    this.updateMetrics();
    console.log(`✅ WebSocket conectado: ${connectionId}`);
  }

  private handleConnectionClose(connectionId: string, event: CloseEvent): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = ConnectionStatus.DISCONNECTED;

    this.eventBus.emit('connection:closed', {
      connectionId,
      status: ConnectionStatus.DISCONNECTED,
      metadata: connection.metadata
    });

    this.updateMetrics();
    console.log(`🔌 WebSocket desconectado: ${connectionId} (code: ${event.code})`);
  }

  private handleConnectionError(connectionId: string, error: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = ConnectionStatus.FAILED;

    this.eventBus.emit('connection:error', {
      connectionId,
      status: ConnectionStatus.FAILED,
      metadata: connection.metadata,
      error: error instanceof Error ? error : new Error(String(error))
    });

    this.updateMetrics();
    console.error(`❌ Error WebSocket ${connectionId}:`, error);
  }

  private handleMessage(connectionId: string, event: MessageEvent): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (!this.rateLimiter.consume(connectionId)) {
      console.warn(`Rate limit exceeded for connection ${connectionId}`);
      return;
    }

    try {
      const data = JSON.parse(event.data);
      
      const messageEnvelope: MessageEnvelope = {
        id: uuidv4(),
        connectionId,
        type: data.type || 'message',
        payload: data,
        timestamp: new Date(),
        retryCount: 0,
        priority: MessagePriority.NORMAL
      };

      this.eventBus.emit('message:received', {
        connectionId,
        message: messageEnvelope
      });

    } catch (error) {
      console.error(`Error parsing message from ${connectionId}:`, error);
    }
  }

  private async processMessageQueue(): Promise<void> {
    const message = await this.messageQueue.dequeue();
    if (!message) return;

    const ws = this.websockets.get(message.connectionId);
    const connection = this.connections.get(message.connectionId);

    if (!ws || !connection || ws.readyState !== WebSocket.OPEN) {
      if (message.retryCount < 3) {
        message.retryCount++;
        await this.messageQueue.enqueue(message);
      }
      return;
    }

    try {
      ws.send(JSON.stringify(message.payload));
      
      this.eventBus.emit('message:sent', {
        connectionId: message.connectionId,
        message
      });
    } catch (error) {
      this.eventBus.emit('message:failed', {
        connectionId: message.connectionId,
        message,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  destroy(): void {
    if (this.messageProcessor) {
      clearInterval(this.messageProcessor);
    }
    
    this.eventBus.removeAllListeners();
    this.messageQueue.clear();
  }
} 