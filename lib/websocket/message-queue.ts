import { IMessageQueue, MessageEnvelope, MessagePriority } from './types';

export class PriorityMessageQueue implements IMessageQueue {
  private queues: Map<MessagePriority, MessageEnvelope[]> = new Map();
  private maxSize: number;
  private totalSize: number = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    
    // Inicializar colas por prioridad
    Object.values(MessagePriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.queues.set(priority, []);
      }
    });
  }

  async enqueue(message: MessageEnvelope): Promise<void> {
    if (this.totalSize >= this.maxSize) {
      // Si la cola está llena, eliminar mensajes de baja prioridad
      await this.evictLowPriorityMessages();
      
      // Si aún está llena, rechazar el mensaje
      if (this.totalSize >= this.maxSize) {
        throw new Error('Message queue is full');
      }
    }

    const queue = this.queues.get(message.priority);
    if (!queue) {
      throw new Error(`Invalid priority: ${message.priority}`);
    }

    queue.push(message);
    this.totalSize++;
  }

  async dequeue(): Promise<MessageEnvelope | null> {
    // Procesar por orden de prioridad (CRITICAL → HIGH → NORMAL → LOW)
    const priorities = [
      MessagePriority.CRITICAL,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        const message = queue.shift();
        if (message) {
          this.totalSize--;
          return message;
        }
      }
    }

    return null;
  }

  size(): number {
    return this.totalSize;
  }

  clear(): void {
    this.queues.forEach(queue => queue.length = 0);
    this.totalSize = 0;
  }

  // Obtener estadísticas por prioridad
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.queues.forEach((queue, priority) => {
      const priorityName = MessagePriority[priority].toLowerCase();
      stats[priorityName] = queue.length;
    });
    
    stats.total = this.totalSize;
    return stats;
  }

  // Eliminar mensajes antiguos de baja prioridad
  private async evictLowPriorityMessages(): Promise<void> {
    const lowPriorityQueue = this.queues.get(MessagePriority.LOW);
    const normalPriorityQueue = this.queues.get(MessagePriority.NORMAL);
    
    // Eliminar hasta 10% de mensajes de baja prioridad
    const toEvict = Math.floor(this.maxSize * 0.1);
    let evicted = 0;
    
    // Primero eliminar mensajes LOW
    while (lowPriorityQueue && lowPriorityQueue.length > 0 && evicted < toEvict) {
      lowPriorityQueue.shift();
      this.totalSize--;
      evicted++;
    }
    
    // Si no es suficiente, eliminar algunos NORMAL
    while (normalPriorityQueue && normalPriorityQueue.length > 0 && evicted < toEvict) {
      normalPriorityQueue.shift();
      this.totalSize--;
      evicted++;
    }
  }

  // Obtener mensajes por conexión específica
  getMessagesByConnection(connectionId: string): MessageEnvelope[] {
    const messages: MessageEnvelope[] = [];
    
    this.queues.forEach(queue => {
      messages.push(...queue.filter(msg => msg.connectionId === connectionId));
    });
    
    return messages.sort((a, b) => b.priority - a.priority);
  }

  // Eliminar mensajes de una conexión específica
  removeMessagesByConnection(connectionId: string): number {
    let removed = 0;
    
    this.queues.forEach(queue => {
      const initialLength = queue.length;
      const filtered = queue.filter(msg => msg.connectionId !== connectionId);
      queue.length = 0;
      queue.push(...filtered);
      removed += initialLength - filtered.length;
    });
    
    this.totalSize -= removed;
    return removed;
  }

  // Obtener el siguiente mensaje sin eliminarlo
  peek(): MessageEnvelope | null {
    const priorities = [
      MessagePriority.CRITICAL,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }

    return null;
  }

  // Verificar si la cola está vacía
  isEmpty(): boolean {
    return this.totalSize === 0;
  }

  // Verificar si la cola está llena
  isFull(): boolean {
    return this.totalSize >= this.maxSize;
  }
} 