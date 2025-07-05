/**
 * ========================================
 * WEBSOCKET SYSTEM - MÓDULO PRINCIPAL
 * ========================================
 * 
 * 🌐 SISTEMA DE WEBSOCKETS ROBUSTO
 * Este módulo proporciona la infraestructura principal para manejar conexiones WebSocket
 * en toda la aplicación. Incluye gestión de conexiones, reconexión automática, 
 * rate limiting, colas de mensajes y un sistema de eventos centralizado.
 * 
 * 📊 TABLAS DE BASE DE DATOS UTILIZADAS:
 * - `WebSocketConnection`: Estado y configuración de conexiones activas
 * - `WebSocketLog`: Registro completo de eventos, errores y mensajes
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * IMPORTANTE: Siempre usar la línea exacta: import { prisma } from '@/lib/db';
 * NO usar otras variaciones como '@/lib/prisma' o '@/prisma/client'
 * 
 * 🏗️ ARQUITECTURA DEL SISTEMA:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    WEBSOCKET SYSTEM                         │
 * ├─────────────────────────────────────────────────────────────┤
 * │  RobustWebSocketManager (connection-manager.ts)            │
 * │  ├── Gestión de conexiones múltiples                       │
 * │  ├── Reconexión automática con backoff                     │
 * │  ├── Health checks y métricas                              │
 * │  └── Integración con base de datos                         │
 * │                                                             │
 * │  WebSocketEventBus (event-bus.ts)                          │
 * │  ├── Sistema de eventos centralizado                       │
 * │  ├── Pub/Sub para comunicación entre componentes          │
 * │  └── Type-safe event handling                              │
 * │                                                             │
 * │  MessageQueue (message-queue.ts)                           │
 * │  ├── Cola de mensajes con prioridades                      │
 * │  ├── Reintento automático de envíos fallidos              │
 * │  └── Rate limiting integrado                               │
 * │                                                             │
 * │  ConnectionService (connection-service.ts)                 │
 * │  ├── CRUD de conexiones en base de datos                   │
 * │  ├── Estadísticas y métricas                               │
 * │  └── Logging de eventos                                    │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * 🔌 TIPOS DE CONEXIONES SOPORTADAS:
 * - SHELLY: Conexiones a dispositivos Shelly via Cloud API
 * - SOCKET_IO: Conexiones Socket.io para tiempo real
 * - CUSTOM: Conexiones WebSocket personalizadas
 * - TEST: Conexiones de prueba para desarrollo
 * 
 * 📡 FLUJO DE UNA CONEXIÓN TÍPICA:
 * 1. Crear registro en tabla `WebSocketConnection`
 * 2. RobustWebSocketManager establece conexión física
 * 3. EventBus notifica eventos de conexión/desconexión
 * 4. MessageQueue gestiona envío de mensajes
 * 5. ConnectionService registra todos los eventos en logs
 * 6. Health checks monitorizan estado continuamente
 * 
 * 🎯 CASOS DE USO PRINCIPALES:
 * - **Dispositivos IoT**: Control en tiempo real (Shelly, sensores)
 * - **Notificaciones**: Push notifications a usuarios
 * - **Colaboración**: Actualizaciones en tiempo real entre usuarios
 * - **Monitoreo**: Métricas y alertas en tiempo real
 * 
 * 🚨 CONSIDERACIONES CRÍTICAS:
 * - **Reconexión**: Sistema automático con exponential backoff
 * - **Rate Limiting**: Prevención de spam y sobrecarga
 * - **Persistencia**: Todos los eventos se guardan en BD
 * - **Escalabilidad**: Diseñado para múltiples conexiones simultáneas
 * - **Seguridad**: Validación de tokens y permisos por systemId
 * 
 * 📈 MÉTRICAS Y MONITOREO:
 * - Conexiones activas/inactivas
 * - Mensajes enviados/recibidos por segundo
 * - Tasa de errores y reconexiones
 * - Latencia promedio de mensajes
 * - Uso de memoria y CPU
 * 
 * 🔧 CONFIGURACIÓN:
 * - maxReconnectAttempts: Máximo número de reintentos
 * - reconnectInterval: Tiempo entre reintentos (ms)
 * - heartbeatInterval: Frecuencia de ping/pong (ms)
 * - messageTimeout: Timeout para respuestas (ms)
 * - rateLimitWindow: Ventana de rate limiting (ms)
 * 
 * 💡 EJEMPLOS DE USO:
 * 
 * // Crear conexión básica
 * const connection = await webSocketManager.connect({
 *   url: 'wss://api.example.com/ws',
 *   type: 'CUSTOM',
 *   tags: ['monitoring', 'alerts']
 * });
 * 
 * // Enviar mensaje
 * await webSocketManager.send(connection.id, {
 *   type: 'command',
 *   data: { action: 'status' }
 * });
 * 
 * // Escuchar eventos
 * webSocketEventBus.on('message:received', (data) => {
 *   console.log('Mensaje recibido:', data);
 * });
 * 
 * // Obtener métricas
 * const metrics = webSocketManager.getMetrics();
 * console.log(`Conexiones activas: ${metrics.activeConnections}`);
 */

// Tipos e interfaces
export * from './types';

// Componentes principales
export { RobustWebSocketManager } from './connection-manager';
export { webSocketConnectionService } from './connection-service';
export { PriorityMessageQueue } from './message-queue';
export { TokenBucketRateLimiter } from './rate-limiter';
export { WebSocketEventBus } from './event-bus';
export { webSocketInitializer } from './initializer';

// Instancia singleton del manager principal
import { RobustWebSocketManager } from './connection-manager';

/**
 * 🎯 INSTANCIA SINGLETON GLOBAL CON INICIALIZACIÓN LAZY
 * 
 * Esta es la instancia principal del WebSocket Manager que debe usarse
 * en toda la aplicación para mantener consistencia y evitar múltiples
 * managers compitiendo por las mismas conexiones.
 * 
 * IMPORTANTE: Esta instancia se inicializa solo cuando es necesaria,
 * evitando problemas durante el build de Next.js.
 */
let _webSocketManager: RobustWebSocketManager | null = null;

export function getWebSocketManager(): RobustWebSocketManager {
  if (!_webSocketManager) {
    _webSocketManager = new RobustWebSocketManager();
  }
  return _webSocketManager;
}

// Para compatibilidad con código existente
export const webSocketManager = {
  connect: (config: any) => getWebSocketManager().connect(config),
  disconnect: (connectionId: string) => getWebSocketManager().disconnect(connectionId),
  send: (connectionId: string, message: any, priority?: any) => getWebSocketManager().send(connectionId, message, priority),
  broadcast: (message: any, tags?: string[]) => getWebSocketManager().broadcast(message, tags),
  getConnection: (connectionId: string) => getWebSocketManager().getConnection(connectionId),
  getMetrics: () => getWebSocketManager().getMetrics(),
  getEventBus: () => getWebSocketManager().getEventBus(),
  healthCheck: (connectionId?: string) => getWebSocketManager().healthCheck(connectionId),
  // Limpieza completa de todas las conexiones; utilizado por webSocketInitializer
  destroy: () => getWebSocketManager().destroy(),
};

// Configuraciones predefinidas
export const DEFAULT_CONFIG = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  pingInterval: 30000,
  pongTimeout: 10000,
  messageQueueSize: 10000,
  rateLimitPerMinute: 60
};

export const SHELLY_CONFIG = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  pingInterval: 25000,
  pongTimeout: 8000,
  messageQueueSize: 5000,
  rateLimitPerMinute: 120
}; 