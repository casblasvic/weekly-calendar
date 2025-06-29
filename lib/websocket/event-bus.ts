import { EventEmitter } from 'events';
import { IEventBus, ConnectionEvents } from './types';

export class WebSocketEventBus implements IEventBus {
  private emitter: EventEmitter;
  private maxListeners: number;

  constructor(maxListeners: number = 100) {
    this.emitter = new EventEmitter();
    this.maxListeners = maxListeners;
    this.emitter.setMaxListeners(maxListeners);
  }

  emit<K extends keyof ConnectionEvents>(event: K, data: ConnectionEvents[K]): void {
    try {
      this.emitter.emit(event, data);
    } catch (error) {
      console.error(`Error emitting event ${event}:`, error);
    }
  }

  on<K extends keyof ConnectionEvents>(
    event: K, 
    listener: (data: ConnectionEvents[K]) => void
  ): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof ConnectionEvents>(
    event: K, 
    listener: (data: ConnectionEvents[K]) => void
  ): void {
    this.emitter.off(event, listener);
  }

  once<K extends keyof ConnectionEvents>(
    event: K, 
    listener: (data: ConnectionEvents[K]) => void
  ): void {
    this.emitter.once(event, listener);
  }

  removeAllListeners(event?: keyof ConnectionEvents): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  getListenerCount(event: keyof ConnectionEvents): number {
    return this.emitter.listenerCount(event);
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  setMaxListeners(maxListeners: number): void {
    this.maxListeners = maxListeners;
    this.emitter.setMaxListeners(maxListeners);
  }
} 