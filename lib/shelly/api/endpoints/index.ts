/**
 * Diccionario unificado de endpoints Shelly
 * Proporciona una interfaz común para todas las generaciones de dispositivos
 */

export * from './gen1';
export * from './gen2';
export * from './gen3';

import { gen1Endpoints, gen1Commands, Gen1DeviceStatus, Gen1RelayStatus, Gen1MeterStatus } from './gen1';
import { gen2Methods, Gen2DeviceInfo, Gen2DeviceStatus, Gen2SwitchStatus } from './gen2';
import { gen3Methods, Gen3DeviceInfo, Gen3DeviceStatus } from './gen3';

export type DeviceGeneration = 1 | 2 | 3;

/**
 * Detectar la generación del dispositivo basándose en su información
 */
export async function detectDeviceGeneration(deviceInfo: any): Promise<DeviceGeneration> {
  // Si tiene campo 'gen', es Gen 2 o Gen 3
  if (deviceInfo.gen !== undefined) {
    return deviceInfo.gen as DeviceGeneration;
  }
  
  // Si tiene métodos RPC, es Gen 2+
  if (deviceInfo.methods || deviceInfo.app) {
    return 2;
  }
  
  // Si tiene estructura Gen 1 (relays, meters arrays)
  if (Array.isArray(deviceInfo.relays) || Array.isArray(deviceInfo.meters)) {
    return 1;
  }
  
  // Por defecto asumir Gen 1
  return 1;
}

/**
 * Interfaz unificada para comandos básicos
 */
export interface UnifiedDeviceCommands {
  turnOn(deviceId: string, options?: { timer?: number }): Promise<boolean>;
  turnOff(deviceId: string, options?: { timer?: number }): Promise<boolean>;
  toggle(deviceId: string): Promise<boolean>;
  getStatus(deviceId: string): Promise<UnifiedDeviceStatus>;
  resetEnergyCounters(deviceId: string): Promise<boolean>;
  setDeviceName(deviceId: string, name: string): Promise<boolean>;
  setPowerLimit(deviceId: string, limitW: number): Promise<boolean>;
  setAutoOff(deviceId: string, enabled: boolean, delaySeconds?: number): Promise<boolean>;
  setAutoOn(deviceId: string, enabled: boolean, delaySeconds?: number): Promise<boolean>;
}

/**
 * Estado unificado del dispositivo
 */
export interface UnifiedDeviceStatus {
  generation: DeviceGeneration;
  deviceId: string;
  model?: string;
  name?: string;
  online: boolean;
  relay: {
    isOn: boolean;
    source: string;
    hasTimer: boolean;
    timerRemaining?: number;
  };
  power: {
    current: number; // Potencia actual en W
    voltage?: number; // Voltaje en V
    current_amps?: number; // Corriente en A
    total: number; // Energía total en kWh
    temperature?: number; // Temperatura en °C
  };
  wifi: {
    connected: boolean;
    ssid?: string;
    ip?: string;
    rssi?: number;
  };
  cloud: {
    connected: boolean;
  };
  lastUpdate: Date;
}

/**
 * Mapear respuestas específicas de cada generación al formato unificado
 */
export const statusMappers = {
  gen1ToUnified: (status: Gen1DeviceStatus, deviceId: string): UnifiedDeviceStatus => {
    const relay = status.relays?.[0] || {} as Gen1RelayStatus;
    const meter = status.meters?.[0] || {} as Gen1MeterStatus;
    
    return {
      generation: 1,
      deviceId,
      model: status.mac,
      name: undefined, // Gen 1 no tiene nombre en el dispositivo
      online: status.wifi_sta?.connected || false,
      relay: {
        isOn: relay.ison || false,
        source: relay.source || 'unknown',
        hasTimer: relay.has_timer || false,
        timerRemaining: relay.timer_remaining,
      },
      power: {
        current: meter.power || 0,
        voltage: undefined, // Gen 1 no reporta voltaje
        current_amps: undefined, // Gen 1 no reporta corriente
        total: (meter.total || 0) / 60000, // Convertir de Watt-minuto a kWh
        temperature: undefined, // Gen 1 no reporta temperatura interna
      },
      wifi: {
        connected: status.wifi_sta?.connected || false,
        ssid: status.wifi_sta?.ssid,
        ip: status.wifi_sta?.ip,
        rssi: status.wifi_sta?.rssi,
      },
      cloud: {
        connected: status.cloud?.connected || false,
      },
      lastUpdate: new Date(),
    };
  },
  
  gen2ToUnified: (status: Gen2DeviceStatus, deviceInfo: Gen2DeviceInfo): UnifiedDeviceStatus => {
    const switchStatus = status['switch:0'] || {} as Gen2SwitchStatus;
    
    return {
      generation: 2,
      deviceId: deviceInfo.id,
      model: deviceInfo.model,
      name: status.sys?.mac, // Puede ser configurado con Sys.SetConfig
      online: status.wifi?.status === 'got ip',
      relay: {
        isOn: switchStatus.output || false,
        source: switchStatus.source || 'unknown',
        hasTimer: false, // Gen 2 maneja timers diferente
        timerRemaining: undefined,
      },
      power: {
        current: switchStatus.apower || 0,
        voltage: switchStatus.voltage,
        current_amps: switchStatus.current,
        total: (switchStatus.aenergy?.total || 0) / 1000, // Convertir de Wh a kWh
        temperature: switchStatus.temperature?.tC,
      },
      wifi: {
        connected: status.wifi?.status === 'got ip',
        ssid: status.wifi?.ssid,
        ip: status.wifi?.sta_ip,
        rssi: status.wifi?.rssi,
      },
      cloud: {
        connected: status.cloud?.connected || false,
      },
      lastUpdate: new Date(),
    };
  },
  
  gen3ToUnified: (status: Gen3DeviceStatus, deviceInfo: Gen3DeviceInfo): UnifiedDeviceStatus => {
    // Gen 3 usa el mismo formato que Gen 2 para la mayoría de datos
    return statusMappers.gen2ToUnified(status, deviceInfo);
  },
};

/**
 * Comandos específicos para control de fraude y validación de citas
 */
export interface AppointmentControlCommands {
  // Validar que existe una cita activa antes de encender
  validateAndTurnOn(deviceId: string, appointmentId: string, serviceId: string): Promise<{
    success: boolean;
    deviceUsageId?: string;
    error?: string;
  }>;
  
  // Apagar y registrar el fin del uso
  turnOffAndRecord(deviceId: string, deviceUsageId: string): Promise<{
    success: boolean;
    energyConsumed?: number;
    duration?: number;
  }>;
  
  // Resetear contador al iniciar servicio
  resetCounterForService(deviceId: string): Promise<{
    success: boolean;
    previousTotal?: number;
  }>;
  
  // Verificar si el tiempo de uso excede la duración de la cita
  checkUsageCompliance(deviceUsageId: string): Promise<{
    compliant: boolean;
    appointmentDuration: number;
    actualUsage: number;
    exceedBy?: number;
  }>;
}

/**
 * Utilidades para manejo de errores
 */
export const errorHandlers = {
  isAuthError: (error: any): boolean => {
    return error.code === 401 || 
           error.message?.includes('auth') || 
           error.message?.includes('unauthorized');
  },
  
  isNetworkError: (error: any): boolean => {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' ||
           error.message?.includes('network');
  },
  
  isDeviceOffline: (error: any): boolean => {
    return error.message?.includes('offline') ||
           error.message?.includes('unreachable');
  },
  
  formatError: (error: any, context: string): string => {
    if (errorHandlers.isAuthError(error)) {
      return `Error de autenticación en ${context}. Verifique las credenciales.`;
    }
    if (errorHandlers.isNetworkError(error)) {
      return `Error de red en ${context}. Verifique la conexión.`;
    }
    if (errorHandlers.isDeviceOffline(error)) {
      return `El dispositivo está fuera de línea.`;
    }
    return `Error en ${context}: ${error.message || 'Error desconocido'}`;
  },
}; 