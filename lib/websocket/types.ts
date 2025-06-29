/**
 * ========================================
 * WEBSOCKET TYPES - DEFINICIONES DE TIPOS Y INTERFACES
 * ========================================
 * 
 * 🏷️ SISTEMA DE TIPOS WEBSOCKET
 * Este archivo define todas las interfaces, tipos y enums utilizados
 * en el sistema de WebSocket. Proporciona type safety y documentación
 * de la estructura de datos para toda la aplicación.
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * IMPORTANTE: Siempre usar: import { prisma } from '@/lib/db';
 * 
 * 🎯 CATEGORÍAS DE TIPOS:
 * 
 * **Conexiones WebSocket:**
 * - WebSocketConnection: Configuración y estado de conexión
 * - ConnectionStatus: Estados posibles de conexión
 * - ConnectionConfig: Configuración de conexión
 * - ConnectionMetrics: Métricas de rendimiento
 * 
 * **Mensajes y Comunicación:**
 * - MessageEnvelope: Estructura de mensaje estándar
 * - MessagePriority: Niveles de prioridad de mensajes
 * - MessageQueue: Interface de cola de mensajes
 * - MessageResponse: Respuestas de mensajes
 * 
 * **Eventos del Sistema:**
 * - ConnectionEvents: Eventos de conexión/desconexión
 * - MessageEvents: Eventos de mensajes
 * - ErrorEvents: Eventos de errores
 * - HealthEvents: Eventos de health checks
 * 
 * **Interfaces de Servicios:**
 * - IConnectionManager: Interface del manager principal
 * - IMessageQueue: Interface de cola de mensajes
 * - IRateLimiter: Interface de rate limiting
 * - IEventBus: Interface del bus de eventos
 * 
 * 🔌 TIPOS DE CONEXIONES SOPORTADAS:
 * 
 * **SHELLY:**
 * - Dispositivos IoT Shelly via Cloud API
 * - URL: wss://{apiHost}/device/relay
 * - Autenticación por token
 * - Mapeo automático deviceId → cloudId
 * 
 * **SOCKET_IO:**
 * - Conexiones Socket.io para tiempo real
 * - Notificaciones push a usuarios
 * - Actualizaciones de UI en tiempo real
 * 
 * **CUSTOM:**
 * - WebSockets personalizados
 * - Integraciones con APIs externas
 * - Protocolos específicos de cliente
 * 
 * **TEST:**
 * - Conexiones de prueba para desarrollo
 * - Mocking y testing automatizado
 * - Validación de funcionalidad
 * 
 * 📊 ESTADOS DE CONEXIÓN:
 * 
 * **CONNECTING:** Estableciendo conexión inicial
 * **CONNECTED:** Conexión activa y funcional
 * **DISCONNECTED:** Desconectado (normal o por error)
 * **RECONNECTING:** Intentando reconectar automáticamente
 * **ERROR:** Error permanente, requiere intervención
 * **SUSPENDED:** Pausado temporalmente
 * 
 * 🏷️ PRIORIDADES DE MENSAJES:
 * 
 * **CRITICAL (0):** Mensajes críticos del sistema
 * - Comandos de emergencia
 * - Alertas de seguridad
 * - Shutdown graceful
 * 
 * **HIGH (1):** Mensajes de alta prioridad
 * - Control de dispositivos
 * - Respuestas de comandos
 * - Notificaciones importantes
 * 
 * **NORMAL (2):** Mensajes normales
 * - Datos de telemetría
 * - Actualizaciones de estado
 * - Sincronización rutinaria
 * 
 * **LOW (3):** Mensajes de baja prioridad
 * - Logs de debug
 * - Métricas históricas
 * - Datos de análisis
 * 
 * 🎛️ CONFIGURACIÓN DE CONEXIONES:
 * 
 * **Timeouts:**
 * - connectionTimeout: Tiempo máximo para establecer conexión
 * - messageTimeout: Tiempo máximo para respuesta de mensaje
 * - heartbeatInterval: Frecuencia de ping/pong
 * 
 * **Reconexión:**
 * - autoReconnect: Habilitar reconexión automática
 * - maxReconnectAttempts: Máximo número de reintentos
 * - reconnectInterval: Delay inicial entre reintentos
 * - backoffMultiplier: Multiplicador para exponential backoff
 * 
 * **Rate Limiting:**
 * - maxMessagesPerSecond: Límite de mensajes por segundo
 * - burstLimit: Límite de ráfaga de mensajes
 * - rateLimitWindow: Ventana de tiempo para rate limiting
 * 
 * 📈 MÉTRICAS Y MONITORING:
 * 
 * **Conexiones:**
 * - totalConnections: Total de conexiones registradas
 * - activeConnections: Conexiones actualmente conectadas
 * - failedConnections: Conexiones con errores
 * - reconnectAttempts: Intentos de reconexión totales
 * 
 * **Mensajes:**
 * - messagesSent: Total de mensajes enviados
 * - messagesReceived: Total de mensajes recibidos
 * - messagesPerSecond: Tasa de mensajes por segundo
 * - averageLatency: Latencia promedio de mensajes
 * 
 * **Errores:**
 * - errorCount: Total de errores
 * - errorRate: Tasa de errores (0-1)
 * - lastError: Último error registrado
 * - errorsByType: Distribución de errores por tipo
 * 
 * **Performance:**
 * - uptime: Tiempo de actividad del sistema
 * - memoryUsage: Uso de memoria del sistema
 * - cpuUsage: Uso de CPU del sistema
 * - networkLatency: Latencia de red promedio
 * 
 * 🚨 EVENTOS DEL SISTEMA:
 * 
 * **Eventos de Conexión:**
 * - connection:opened: Conexión establecida exitosamente
 * - connection:closed: Conexión cerrada (normal o error)
 * - connection:error: Error en la conexión
 * - connection:reconnecting: Iniciando proceso de reconexión
 * 
 * **Eventos de Mensajes:**
 * - message:sent: Mensaje enviado exitosamente
 * - message:received: Mensaje recibido
 * - message:failed: Error enviando mensaje
 * - message:queued: Mensaje agregado a cola
 * 
 * **Eventos de Sistema:**
 * - health:check: Resultado de health check
 * - metrics:updated: Métricas actualizadas
 * - rate:limited: Mensaje bloqueado por rate limiting
 * - queue:full: Cola de mensajes llena
 * 
 * 💡 EJEMPLOS DE USO:
 * 
 * ```typescript
 * // Definir conexión con tipo específico
 * const connection: WebSocketConnection = {
 *   id: 'conn_123',
 *   url: 'wss://api.example.com/ws',
 *   status: ConnectionStatus.CONNECTED,
 *   type: ConnectionType.SHELLY,
 *   metadata: { credentialId: '456' }
 * };
 * 
 * // Crear mensaje con prioridad
 * const message: MessageEnvelope = {
 *   id: 'msg_789',
 *   connectionId: 'conn_123',
 *   type: 'control',
 *   data: { action: 'on', deviceId: 'device_456' },
 *   priority: MessagePriority.HIGH,
 *   timestamp: new Date(),
 *   timeout: 5000
 * };
 * 
 * // Escuchar eventos tipados
 * eventBus.on('connection:opened', (data: ConnectionEventData) => {
 *   console.log(`Conexión ${data.connectionId} abierta`);
 * });
 * 
 * // Configurar manager con tipos
 * const config: ConnectionConfig = {
 *   maxConnections: 100,
 *   autoReconnect: true,
 *   maxReconnectAttempts: 5,
 *   heartbeatInterval: 30000
 * };
 * ```
 * 
 * ⚠️ CONSIDERACIONES DE TIPOS:
 * 
 * **Type Safety:**
 * - Usar tipos específicos en lugar de 'any'
 * - Validar tipos en runtime cuando sea necesario
 * - Proporcionar tipos por defecto seguros
 * 
 * **Compatibilidad:**
 * - Mantener compatibilidad hacia atrás
 * - Deprecar tipos obsoletos gradualmente
 * - Documentar cambios breaking
 * 
 * **Performance:**
 * - Evitar tipos complejos en hot paths
 * - Usar tipos primitivos cuando sea posible
 * - Optimizar serialización/deserialización
 */

export interface WebSocketConnection {
  id: string;
  url: string;
  status: ConnectionStatus;
  lastPing: Date;
  lastPong: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  metadata: Record<string, any>;
  tags: string[];
}

export interface ConnectionConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  pingInterval: number;
  pongTimeout: number;
  messageQueueSize: number;
  rateLimitPerMinute: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  uptime: number;
}

export interface MessageEnvelope {
  id: string;
  connectionId: string;
  type: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
  priority: MessagePriority;
}

export interface HealthCheckResult {
  connectionId: string;
  isHealthy: boolean;
  latency: number;
  lastCheck: Date;
  errorMessage?: string;
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  SUSPENDED = 'suspended'
}

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export interface ConnectionEventData {
  connectionId: string;
  status: ConnectionStatus;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface MessageEventData {
  connectionId: string;
  message: MessageEnvelope;
  error?: Error;
}

// Event types
export type ConnectionEvents = {
  'connection:opened': ConnectionEventData;
  'connection:closed': ConnectionEventData;
  'connection:error': ConnectionEventData;
  'connection:reconnecting': ConnectionEventData;
  'message:received': MessageEventData;
  'message:sent': MessageEventData;
  'message:failed': MessageEventData;
  'health:check': HealthCheckResult;
  'metrics:updated': ConnectionMetrics;
};

export interface IConnectionManager {
  connect(config: ConnectionConfig): Promise<string>;
  disconnect(connectionId: string): Promise<void>;
  send(connectionId: string, message: any, priority?: MessagePriority): Promise<void>;
  broadcast(message: any, tags?: string[]): Promise<void>;
  getConnection(connectionId: string): WebSocketConnection | null;
  getMetrics(): ConnectionMetrics;
  healthCheck(connectionId?: string): Promise<HealthCheckResult[]>;
}

export interface IEventBus {
  emit<K extends keyof ConnectionEvents>(event: K, data: ConnectionEvents[K]): void;
  on<K extends keyof ConnectionEvents>(event: K, listener: (data: ConnectionEvents[K]) => void): void;
  off<K extends keyof ConnectionEvents>(event: K, listener: (data: ConnectionEvents[K]) => void): void;
  removeAllListeners(event?: keyof ConnectionEvents): void;
}

export interface IMessageQueue {
  enqueue(message: MessageEnvelope): Promise<void>;
  dequeue(): Promise<MessageEnvelope | null>;
  size(): number;
  clear(): void;
}

export interface IRateLimiter {
  isAllowed(connectionId: string): boolean;
  consume(connectionId: string, tokens?: number): boolean;
  reset(connectionId: string): void;
} 