// Tipos e interfaces
export * from './types';

// Componentes principales
export { RobustWebSocketManager } from './connection-manager';
export { WebSocketEventBus } from './event-bus';
export { PriorityMessageQueue } from './message-queue';
export { TokenBucketRateLimiter } from './rate-limiter';

// Instancia singleton del manager principal
import { RobustWebSocketManager } from './connection-manager';
export const webSocketManager = new RobustWebSocketManager();

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