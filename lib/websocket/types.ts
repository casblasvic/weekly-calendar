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