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