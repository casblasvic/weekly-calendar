import { wsLogger } from '@/lib/utils/websocket-logger';

/**
 * ⏱️ Tiempo máximo SIN recibir mensajes antes de considerar un dispositivo offline.
 * Definido en un único lugar para poder cambiarlo fácilmente.
 */
export const DEVICE_STATE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos

/**
 * CONTROL ADAPTATIVO DE CONSUMO
 * ---------------------------------------------------------------
 * Calculamos el timeout por dispositivo usando el promedio móvil
 * de los últimos `AVG_WINDOW` intervalos reales (entre mensajes).
 *   timeout = max(MIN_TIMEOUT, avgInterval * FACTOR + SAFETY_MS)
 * De esta forma nos adaptamos a Shelly Gen-1 (4-5 s) o Gen-2 (≈10 s)
 * e incluso a redes lentas sin hardcodear un único valor.
 */
const AVG_WINDOW = 6;              // Nº de intervalos a promediar
const MIN_TIMEOUT_MS = 8_000;      // Nunca bajar de 8 s
const FACTOR = 1.4;                // Holgura 40 %
const SAFETY_MS = 1_000;           // Margen fijo 1 s

/**
 * 🏷️ Flag global para activar o desactivar el timer interno de comprobación.
 * En producción lo desactivamos para basarnos SOLO en los triggers que ya suceden.
 */
const USE_STATE_CHECK_TIMER = false;

export interface OfflineUpdate {
  deviceId: string;
  deviceName?: string;
  online: boolean;
  reason: 'timeout' | 'websocket_disconnected' | 'manual' | 'websocket_reconnected' | 'websocket_message_received' | 'consumption_timeout' | 'state_timeout';
  updateBD: boolean; // Si debe actualizar la base de datos
  timestamp: number;
  // Datos adicionales del dispositivo
  deviceData?: {
    relayOn?: boolean;
    currentPower?: number | null; // null = sin dato válido (timeout)
    voltage?: number;
    temperature?: number;
    totalEnergy?: number;
    cloudId?: string;
    hasValidConsumption?: boolean; // Si el consumo es válido o timeout
  };
}

export type OfflineCallback = (updates: OfflineUpdate[]) => void;

/**
 * 🎯 MANAGER CENTRALIZADO - ESTRATEGIA DE DOS NIVELES
 * 
 * NIVEL 1 - CONSUMOS (5 segundos): Datos críticos, limpieza rápida
 * NIVEL 2 - ESTADOS (3 minutos): Datos informativos, timeout conservador
 * 
 * PRIORIDAD ABSOLUTA: UI INMEDIATA → BD DESPUÉS
 * 
 * Flujo:
 * 1. Mensaje WebSocket → UI INMEDIATA + programar timeouts
 * 2. Timeout consumo (5s) → UI INMEDIATA (limpiar consumo) + BD
 * 3. Timeout estado (3min) → UI INMEDIATA (offline) + BD
 * 4. WebSocket desconectado → UI INMEDIATA (todos offline) + BD
 */
class DeviceOfflineManager {
  private callbacks = new Set<OfflineCallback>();
  private isWebSocketConnected = false;
  
  // NIVEL 1: Tracking de consumos (5 segundos)
  private deviceConsumptions = new Map<string, {
    watts: number;
    timestamp: number;
    timeoutId: NodeJS.Timeout;
    intervals: number[]; // Últimos Δt
  }>();
  
  // NIVEL 2: Tracking de estados (3 minutos)  
  private deviceStates = new Map<string, {
    online: boolean;
    lastSeenAt: number;
  }>();
  
  // Timer global para verificar estados (cada 30s)
  private stateCheckInterval: NodeJS.Timeout | null = null;
  
  private static instance: DeviceOfflineManager | null = null;
  
  /**
   * Singleton - una sola instancia global
   */
  static getInstance(): DeviceOfflineManager {
    if (!DeviceOfflineManager.instance) {
      DeviceOfflineManager.instance = new DeviceOfflineManager();
    }
    return DeviceOfflineManager.instance;
  }
  
  private constructor() {
    wsLogger.verbose('🎯 [OfflineManager] Inicializado - ESTRATEGIA DOS NIVELES (Consumos 5s, Estados 3min)');
    if (USE_STATE_CHECK_TIMER) {
      this.startStateMonitoring();
    }
  }

  /**
   * 🟢 REGISTRAR ACTIVIDAD - Llamado desde WebSocket Manager
   * ESTRATEGIA DOS NIVELES: UI INMEDIATA + Timeouts inteligentes
   */
  trackActivity(deviceId: string, deviceName?: string, deviceData?: any, onlineState: boolean = true): void {
    const now = Date.now();
    wsLogger.debug(`🔄 [OfflineManager] Dispositivo activo: ${deviceName || deviceId}`);
    
    // 🎯 NIVEL 1: GESTIONAR CONSUMOS (5 segundos)
    this.handleConsumptionData(deviceId, deviceData?.currentPower, now);
    
    // 🎯 NIVEL 2: GESTIONAR ESTADO (3 minutos)
    this.handleDeviceState(deviceId, onlineState, now);

    // ✅ NUEVO: Evaluar estados obsoletos SIN timers
    const stale = this.evaluateStaleStates(now);
    if (stale.length > 0) {
      this.notifyCallbacks(stale);
    }
    
    // 🚀 UI INMEDIATA: Notificar online + datos al instante
    this.notifyCallbacks([{
      deviceId,
      deviceName,
      online: onlineState,
      reason: 'websocket_message_received',
      updateBD: true, // Mensaje recibido = actualizar BD después de UI
      timestamp: now,
      deviceData: deviceData ? {
        relayOn: deviceData.relayOn,
        currentPower: deviceData.currentPower,
        voltage: deviceData.voltage,
        temperature: deviceData.temperature,
        totalEnergy: deviceData.totalEnergy,
        cloudId: deviceData.cloudId,
        hasValidConsumption: true // Dato fresco
      } : undefined
    }]);
  }

  /**
   * 🎯 NIVEL 1: GESTIONAR DATOS DE CONSUMO (5 segundos)
   */
  private handleConsumptionData(deviceId: string, currentPower?: number, timestamp?: number): void {
    const now = timestamp || Date.now();
    
    // Limpiar timeout anterior si existe
    const existing = this.deviceConsumptions.get(deviceId);
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }
    
    // Registrar sólo si recibimos potencia numérica (puede ser 0 si relay on pero sin consumo)
    if (typeof currentPower === 'number') {
      wsLogger.debug(`⚡ [OfflineManager] Consumo registrado: ${deviceId} = ${currentPower}W`);

      // Calcular nuevo intervalo si existía timestamp previo
      let intervals: number[] = existing?.intervals || [];
      if (existing) {
        const delta = now - existing.timestamp;
        if (delta > 200) { // ignorar artefactos <200 ms
          intervals = [...intervals, delta].slice(-AVG_WINDOW);
        }
      }

      // Calcular timeout dinámico
      let dynamicTimeout = MIN_TIMEOUT_MS;
      if (intervals.length >= 2) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        dynamicTimeout = Math.max(MIN_TIMEOUT_MS, Math.round(avg * FACTOR + SAFETY_MS));
      }
      
      const timeoutId = setTimeout(() => {
        this.clearConsumptionData(deviceId);
      }, dynamicTimeout);
      
      this.deviceConsumptions.set(deviceId, {
        watts: currentPower,
        timestamp: now,
        timeoutId,
        intervals
      });

      wsLogger.debug(`⏲️  [OfflineManager] Timeout dinámico ${deviceId} = ${dynamicTimeout} ms (intervals=${intervals.length})`);
    }
  }

  /**
   * 🎯 NIVEL 2: GESTIONAR ESTADO ONLINE/OFFLINE (3 minutos)
   */
  private handleDeviceState(deviceId: string, online: boolean, timestamp?: number): void {
    const now = timestamp || Date.now();
    
    this.deviceStates.set(deviceId, {
      online,
      lastSeenAt: now
    });
    
    wsLogger.debug(`📊 [OfflineManager] Estado actualizado: ${deviceId} = ${online ? 'online' : 'offline'}`);
  }

  /**
   * ⏰ INICIAR MONITOREO DE ESTADOS (cada 30 segundos)
   */
  private startStateMonitoring(): void {
    if (this.stateCheckInterval) return;
    
    wsLogger.verbose('⏰ [OfflineManager] Iniciando monitoreo de estados (cada 30s, umbral 3min)');
    
    this.stateCheckInterval = setInterval(() => {
      if (!this.isWebSocketConnected) return;
      this.checkStaleStates();
    }, 30 * 1000); // 30 segundos
  }

  /**
   * 🛑 DETENER MONITOREO DE ESTADOS
   */
  private stopStateMonitoring(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
      wsLogger.verbose('🛑 [OfflineManager] Monitoreo de estados detenido');
    }
  }

  /**
   * 🔍 VERIFICAR ESTADOS OBSOLETOS (>3 minutos)
   */
  private async checkStaleStates(): Promise<void> {
    const now = Date.now();
    const STATE_TIMEOUT = DEVICE_STATE_TIMEOUT_MS; // Usar constante centralizada
    const staleUpdates: OfflineUpdate[] = [];

    try {
      // Verificar dispositivos con estado obsoleto
      for (const [deviceId, state] of this.deviceStates.entries()) {
        const timeSinceLastSeen = now - state.lastSeenAt;
        
        if (state.online && timeSinceLastSeen > STATE_TIMEOUT) {
          wsLogger.debug(`🔴 [OfflineManager] Estado obsoleto: ${deviceId} (${Math.round(timeSinceLastSeen/1000)}s)`);
          
          // Actualizar estado local
          state.online = false;
          
          staleUpdates.push({
            deviceId,
            online: false,
            reason: 'state_timeout',
            updateBD: true,
            timestamp: now
          });
        }
      }

      if (staleUpdates.length > 0) {
        wsLogger.verbose(`📤 [OfflineManager] Estados obsoletos: ${staleUpdates.length} dispositivos → offline`);
        // 🚀 UI INMEDIATA: Notificar offline al instante
        this.notifyCallbacks(staleUpdates);
      }

    } catch (error) {
      wsLogger.error('❌ [OfflineManager] Error verificando estados obsoletos:', error);
    }
  }

  /**
   * 🧹 LIMPIAR DATOS DE CONSUMO (timeout 5 segundos)
   */
  private clearConsumptionData(deviceId: string): void {
    const consumption = this.deviceConsumptions.get(deviceId);
    if (!consumption) return;
    
    // Guardar antes de borrar para referencia
    const lastWatts = consumption.watts;
    
    // Limpiar del tracking
    this.deviceConsumptions.delete(deviceId);
    
    // 🚀 UI INMEDIATA: Solo notificar si el dispositivo sigue online PERO relayOn===true
    const onlineState = this.deviceStates.get(deviceId)?.online ?? false;

    if (onlineState) {
    this.notifyCallbacks([{
      deviceId,
            online: onlineState,
      reason: 'consumption_timeout',
      updateBD: true,
      timestamp: Date.now(),
      deviceData: {
          currentPower: lastWatts,
        hasValidConsumption: false
      }
    }]);
    }
  }

  /**
   * 🌐 ESTADO WEBSOCKET - Notificar conexión/desconexión
   */
  setWebSocketConnected(connected: boolean): void {
    const wasConnected = this.isWebSocketConnected;
    this.isWebSocketConnected = connected;
    
    if (connected && !wasConnected) {
      wsLogger.verbose('🟢 [OfflineManager] WebSocket conectado - reiniciando monitoreo');
      this.startStateMonitoring();
      
      // Ya no marcamos todos ONLINE; cada dispositivo recibirá su estado
      // mediante refreshAllDeviceStatuses() que envía updates individuales.
      wsLogger.verbose('🟢 [OfflineManager] WebSocket conectado - estados individuales se refrescarán');
      
    } else if (!connected && wasConnected) {
      wsLogger.verbose('🔴 [OfflineManager] WebSocket desconectado - todos offline');
      this.stopStateMonitoring();
      this.clearAllData();
      this.markAllOfflineImmediate();
    }
  }

  /**
   * 🔴 MARCAR TODOS OFFLINE INMEDIATO (WebSocket desconectado)
   */
  private markAllOfflineImmediate(): void {
    // 🚀 UI INMEDIATA: Todos offline
    this.notifyCallbacks([{
      deviceId: 'ALL',
      online: false,
      reason: 'websocket_disconnected',
      updateBD: true, // WebSocket desconectado = dispositivos realmente offline
      timestamp: Date.now(),
      deviceData: {
        currentPower: null,
        hasValidConsumption: false
      }
    }]);
  }

  /**
   * 🧹 LIMPIAR TODOS LOS DATOS
   */
  private clearAllData(): void {
    // Limpiar timeouts de consumos
    for (const consumption of this.deviceConsumptions.values()) {
      if (consumption.timeoutId) {
        clearTimeout(consumption.timeoutId);
      }
    }
    
    this.deviceConsumptions.clear();
    this.deviceStates.clear();
    wsLogger.debug('🧹 [OfflineManager] Todos los datos limpiados');
  }

  /**
   * 📢 NOTIFICAR CALLBACKS
   */
  private notifyCallbacks(updates: OfflineUpdate[]): void {
    if (updates.length === 0) return;
    
    wsLogger.verbose(`📢 Notificando a ${this.callbacks.size} suscriptores`);
    
    this.callbacks.forEach(callback => {
      try {
        callback(updates);
      } catch (error) {
        wsLogger.error('❌ [OfflineManager] Error en callback:', error);
      }
    });
  }

  /**
   * 📝 SUSCRIBIR CALLBACK
   */
  subscribe(callback: OfflineCallback): () => void {
    this.callbacks.add(callback);
    wsLogger.debug(`📝 [OfflineManager] Nuevo callback suscrito. Total: ${this.callbacks.size}`);
    
    return () => {
      this.callbacks.delete(callback);
      wsLogger.debug(`📝 [OfflineManager] Callback desuscrito. Total: ${this.callbacks.size}`);
    };
  }

  /**
   * 🛑 DESTRUIR MANAGER
   */
  destroy(): void {
    this.stopStateMonitoring();
    this.clearAllData();
    this.callbacks.clear();
    DeviceOfflineManager.instance = null;
    wsLogger.verbose('🛑 [OfflineManager] Destruido');
  }

  /**
   * 📊 STATS PARA DEBUG  
   */
  getStats(): {
    isWebSocketConnected: boolean;
    callbacks: number;
    consumptions: number;
    states: number;
  } {
    return {
      isWebSocketConnected: this.isWebSocketConnected,
      callbacks: this.callbacks.size,
      consumptions: this.deviceConsumptions.size,
      states: this.deviceStates.size
    };
  }

  /**
   * 🧮 EVALUAR ESTADOS OBSOLETOS SIN USAR TIMER
   * Reutiliza la misma lógica que checkStaleStates pero se invoca bajo demanda
   * p.e. cada vez que llega un nuevo mensaje de cualquier dispositivo.
   */
  private evaluateStaleStates(now: number): OfflineUpdate[] {
    const staleUpdates: OfflineUpdate[] = [];

    for (const [deviceId, state] of this.deviceStates.entries()) {
      const timeSinceLastSeen = now - state.lastSeenAt;

      if (state.online && timeSinceLastSeen > DEVICE_STATE_TIMEOUT_MS) {
        wsLogger.debug(`🔴 [OfflineManager] Estado obsoleto: ${deviceId} (${Math.round(timeSinceLastSeen/1000)}s)`);

        // Actualizar estado local
        state.online = false;

        staleUpdates.push({
          deviceId,
          online: false,
          reason: 'state_timeout',
          updateBD: true,
          timestamp: now
        });
      }
    }

    return staleUpdates;
  }
}

// Export singleton instance
export const deviceOfflineManager = DeviceOfflineManager.getInstance(); 