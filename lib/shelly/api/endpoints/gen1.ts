/**
 * ========================================
 * PLUGIN SHELLY - DICCIONARIO COMPLETO PARA DISPOSITIVOS GEN 1
 * ========================================
 * 
 * 🔌 INTEGRACIÓN SHELLY CLOUD
 * Este plugin se integra con dispositivos Shelly a través de Shelly Cloud API.
 * NO utiliza conexiones directas a las IPs locales de los dispositivos.
 * 
 * 📡 CONFIGURACIÓN DE CONEXIÓN:
 * - Host API: Se obtiene del campo `apiHost` en la tabla `ShellyCredential`
 * - URL Base: Almacenada en `ShellyCredential.apiHost` (ej: "shelly-103-eu.shelly.cloud")
 * - Autenticación: Tokens OAuth2 almacenados en `ShellyCredential.accessToken`
 * 
 * 🆔 MAPEO DE DISPOSITIVOS:
 * - deviceId (BD): ID interno almacenado en `SmartPlugDevice.deviceId`
 * - cloudId: ID numérico de Shelly Cloud (se mapea automáticamente via WebSocket)
 * - Para WebSocket Commands: Usar cloudId mapeado, NO el deviceId de BD
 * - El mapeo se construye dinámicamente desde eventos WebSocket
 * 
 * 🏗️ ARQUITECTURA DEL PLUGIN:
 * 1. Credenciales → Tabla `ShellyCredential` (apiHost, tokens)
 * 2. Dispositivos → Tabla `SmartPlugDevice` (deviceId, credentialId)
 * 3. WebSocket Manager → Maneja conexiones y mapeo automático
 * 4. Control → Via WebSocket Commands usando cloudId mapeado
 * 
 * ⚠️ IMPORTANTE PARA GEN 1:
 * Los dispositivos Gen1 NO soportan WebSocket Commands.
 * Solo funcionan con HTTP REST API local.
 * Este diccionario está preparado para futuras mejoras de conectividad.
 * 
 * Modelos compatibles:
 * - Shelly Plug (SHPLG-1)
 * - Shelly Plug S (SHPLG-S) 
 * - Shelly Plug US (SHPLG-U1)
 * - Shelly 1, 1PM, 2.5, etc. (modelos originales)
 * 
 * PROTOCOLO: HTTP REST API
 * - NO soporta WebSocket Commands
 * - NO soporta RPC JSON
 * - Utiliza endpoints HTTP GET/POST simples
 * 
 * PRIORIDAD DE USO:
 * 1. HTTP REST API local (única opción disponible)
 * 2. Shelly Cloud API (como respaldo si local no está disponible)
 * 
 * DOCUMENTACIÓN BASADA EN:
 * - Tabla de funcionalidades por generación
 * - API oficial Shelly Gen1
 * - Pruebas realizadas en dispositivos reales
 */

/**
 * CONFIGURACIÓN DE DISPOSITIVO - OBTENER INFORMACIÓN BÁSICA
 * ========================================
 * Endpoint: GET http://<IP>/status
 * Descripción: Obtiene toda la información del dispositivo incluyendo MAC, firmware, estado
 */
export interface Gen1DeviceInfo {
  /** Dirección MAC del dispositivo */
  mac: string;
  /** Versión del firmware instalado */
  fw: string;
  /** Indica si hay actualización disponible */
  has_update: boolean;
  /** Timestamp Unix actual del dispositivo */
  unixtime: number;
  /** Tiempo formateado (HH:MM) */
  time: string;
  /** Segundos desde el último reinicio */
  uptime: number;
  /** Información de WiFi */
  wifi_sta: {
    connected: boolean;
    ssid: string;
    ip: string;
    rssi: number;
  };
  /** Estado de la nube Shelly */
  cloud: {
    enabled: boolean;
    connected: boolean;
  };
  /** Estado de relés (enchufes) */
  relays: Gen1RelayStatus[];
  /** Lecturas de energía */
  meters: Gen1MeterStatus[];
  /** Información de memoria */
  ram_total: number;
  ram_free: number;
  fs_size: number;
  fs_free: number;
}

/**
 * CONTROL DE RELÉ - ESTADO Y COMANDOS
 * ========================================
 * Endpoint: GET http://<IP>/relay/<channel>
 * Parámetros: turn=on|off|toggle, timer=<segundos>
 */
export interface Gen1RelayStatus {
  /** Estado actual: true=encendido, false=apagado */
  ison: boolean;
  /** Si hay un timer activo */
  has_timer: boolean;
  /** Timestamp cuando se inició el timer */
  timer_started: number;
  /** Duración total del timer en segundos */
  timer_duration: number;
  /** Segundos restantes del timer */
  timer_remaining: number;
  /** Si está en estado de sobrepotencia */
  overpower: boolean;
  /** Fuente del último cambio: input, button, http, etc. */
  source: string;
}

/**
 * MEDICIÓN DE ENERGÍA
 * ========================================
 * Endpoint: GET http://<IP>/meter/<channel>
 */
export interface Gen1MeterStatus {
  /** Potencia instantánea en Watts */
  power: number;
  /** Límite de sobrepotencia configurado */
  overpower: number;
  /** Si la lectura es válida */
  is_valid: boolean;
  /** Timestamp de la lectura */
  timestamp: number;
  /** Consumo de los últimos 3 minutos en Watt-minuto */
  counters: number[];
  /** Energía total acumulada en Watt-minuto */
  total: number;
}

/**
 * CONFIGURACIÓN DEL DISPOSITIVO
 * ========================================
 * Endpoint: GET http://<IP>/settings
 * Permite obtener y modificar toda la configuración
 */
export interface Gen1DeviceSettings {
  /** Configuración del dispositivo */
  device: {
    /** Nombre del dispositivo */
    name: string;
    /** Tipo/modelo del dispositivo */
    type: string;
    /** Dirección MAC */
    mac: string;
    /** Hostname del dispositivo */
    hostname: string;
  };
  /** Configuración WiFi principal */
  wifi_sta: {
    enabled: boolean;
    ssid: string;
    ipv4_method: 'dhcp' | 'static';
    ip?: string;
    gw?: string;
    mask?: string;
    dns?: string;
  };
  /** Configuración WiFi secundaria (backup) */
  wifi_sta1: {
    enabled: boolean;
    ssid: string;
    ipv4_method: 'dhcp' | 'static';
    ip?: string;
    gw?: string;
    mask?: string;
    dns?: string;
  };
  /** Configuración del punto de acceso */
  wifi_ap: {
    enabled: boolean;
    ssid: string;
    key: string;
  };
  /** Configuración MQTT */
  mqtt: {
    enable: boolean;
    server: string;
    user: string;
    reconnect_timeout_max: number;
    reconnect_timeout_min: number;
    clean_session: boolean;
    keep_alive: number;
    will_topic: string;
    will_message: string;
    max_qos: number;
    retain: boolean;
    update_period: number;
  };
  /** Configuración de zona horaria */
  timezone: string;
  /** Latitud para cálculos de amanecer/atardecer */
  lat: number;
  /** Longitud para cálculos de amanecer/atardecer */
  lng: number;
  /** Auto-detección de zona horaria */
  tzautodetect: boolean;
  /** Configuración de relés */
  relays: Gen1RelayConfig[];
  /** Configuración de medidores */
  meters: Gen1MeterConfig[];
  /** Reglas de programación horaria */
  schedule_rules: string[];
  /** Si el programador está habilitado */
  schedule: boolean;
}

/**
 * CONFIGURACIÓN DE RELÉ
 */
export interface Gen1RelayConfig {
  /** Nombre del relé */
  name: string;
  /** Estado por defecto tras reinicio: off, on, last, switch */
  default_state: 'off' | 'on' | 'last' | 'switch';
  /** Auto-encendido en segundos (0 = deshabilitado) */
  auto_on: number;
  /** Auto-apagado en segundos (0 = deshabilitado) */
  auto_off: number;
  /** Límite de potencia en Watts */
  max_power: number;
}

/**
 * CONFIGURACIÓN DE MEDIDOR
 */
export interface Gen1MeterConfig {
  /** Límite de potencia para alarma */
  power: number;
  /** Si está habilitado */
  is_valid: boolean;
}

/**
 * ENDPOINTS HTTP PARA GEN 1
 * ========================================
 * Todos los endpoints utilizan HTTP GET/POST
 */
export const gen1Endpoints = {
  /**
   * OBTENER INFORMACIÓN DEL DISPOSITIVO
   * Endpoint: GET http://<IP>/status
   * Retorna: Gen1DeviceInfo
   */
  getDeviceInfo: (deviceIp: string): string => 
    `http://${deviceIp}/status`,

  /**
   * OBTENER CONFIGURACIÓN COMPLETA
   * Endpoint: GET http://<IP>/settings
   */
  getDeviceSettings: (deviceIp: string): string => 
    `http://${deviceIp}/settings`,

  /**
   * CONTROL DE RELÉ
   * Endpoint: GET http://<IP>/relay/<channel>?turn=<action>&timer=<seconds>
   */
  relay: {
    /** Obtener estado del relé */
    getStatus: (deviceIp: string, channel: number = 0): string => 
      `http://${deviceIp}/relay/${channel}`,
    
    /** Controlar relé con parámetros */
    control: (deviceIp: string, channel: number = 0): string => 
      `http://${deviceIp}/relay/${channel}`,
  },

  /**
   * MEDICIÓN DE ENERGÍA
   * Endpoint: GET http://<IP>/meter/<channel>
   */
  meter: {
    /** Obtener lecturas de energía */
    getStatus: (deviceIp: string, channel: number = 0): string => 
      `http://${deviceIp}/meter/${channel}`,
    
    /** Resetear contadores de energía */
    reset: (deviceIp: string, channel: number = 0): string => 
      `http://${deviceIp}/meter/${channel}?reset=true`,
  },

  /**
   * CONFIGURACIÓN DE DISPOSITIVO
   */
  settings: {
    /** Obtener configuración */
    get: (deviceIp: string): string => 
      `http://${deviceIp}/settings`,
    
    /** Actualizar configuración (usar POST con parámetros) */
    update: (deviceIp: string): string => 
      `http://${deviceIp}/settings`,
  },

  /**
   * ACTUALIZACIÓN DE FIRMWARE
   */
  ota: {
    /** Verificar actualizaciones disponibles */
    check: (deviceIp: string): string => 
      `http://${deviceIp}/ota/check`,
    
    /** Iniciar actualización */
    update: (deviceIp: string): string => 
      `http://${deviceIp}/ota?update=1`,
  },

  /**
   * REINICIO DEL DISPOSITIVO
   */
  reboot: (deviceIp: string): string => 
    `http://${deviceIp}/reboot`,
};

/**
 * COMANDOS ESPECÍFICOS POR FUNCIONALIDAD
 * ========================================
 * Basados en la tabla de funcionalidades
 */
export const gen1Commands = {
  /**
   * CAMBIAR NOMBRE DEL DISPOSITIVO
   * Endpoint: GET http://<IP>/settings?name=<NuevoNombre>
   */
  setDeviceName: (deviceIp: string, name: string): string => 
    `http://${deviceIp}/settings?name=${encodeURIComponent(name)}`,

  /**
   * CONFIGURAR ZONA HORARIA
   * Endpoint: GET http://<IP>/settings?tzautodetect=false&timezone=<tz>&lat=<lat>&lng=<lng>
   * 
   * NOTA: Gen1 detecta zona horaria automáticamente por defecto.
   * Para fijarla manualmente, primero deshabilitar auto-detección.
   */
  setTimezone: (deviceIp: string, timezone: string, lat?: number, lng?: number): string => {
    let url = `http://${deviceIp}/settings?tzautodetect=false&timezone=${encodeURIComponent(timezone)}`;
    if (lat !== undefined && lng !== undefined) {
      url += `&lat=${lat}&lng=${lng}`;
    }
    return url;
  },

  /**
   * CONFIGURAR ESTADO TRAS REINICIO
   * Endpoint: GET http://<IP>/settings/relay/<channel>?default_state=<state>
   * Estados: off, on, last, switch
   */
  setDefaultState: (deviceIp: string, channel: number, state: 'off' | 'on' | 'last' | 'switch'): string => 
    `http://${deviceIp}/settings/relay/${channel}?default_state=${state}`,

  /**
   * CONFIGURAR AUTO-ENCENDIDO
   * Endpoint: GET http://<IP>/settings/relay/<channel>?auto_on=<seconds>
   * Parámetro: segundos (0 = deshabilitado)
   */
  setAutoOn: (deviceIp: string, channel: number, seconds: number): string => 
    `http://${deviceIp}/settings/relay/${channel}?auto_on=${seconds}`,

  /**
   * CONFIGURAR AUTO-APAGADO
   * Endpoint: GET http://<IP>/settings/relay/<channel>?auto_off=<seconds>
   * Parámetro: segundos (0 = deshabilitado)
   */
  setAutoOff: (deviceIp: string, channel: number, seconds: number): string => 
    `http://${deviceIp}/settings/relay/${channel}?auto_off=${seconds}`,

  /**
   * PROGRAMAR HORARIOS SEMANALES
   * Endpoint: GET http://<IP>/settings?schedule=1&schedule_rules[]=<regla>
   * Formato de regla: HHMM-DÍAS-ACCIÓN
   * Ejemplo: 0730-12345-on (07:30, lunes a viernes, encender)
   * Días: 0=Domingo, 1=Lunes, ..., 6=Sábado
   */
  setScheduleRule: (deviceIp: string, rules: string[]): string => {
    const baseUrl = `http://${deviceIp}/settings?schedule=1`;
    const rulesParams = rules.map((rule, index) => 
      `schedule_rules[${index}]=${encodeURIComponent(rule)}`
    ).join('&');
    return `${baseUrl}&${rulesParams}`;
  },

  /**
   * CONFIGURAR WIFI PRINCIPAL
   * Endpoint: GET http://<IP>/settings?wifi_sta.ssid=<ssid>&wifi_sta.key=<password>&wifi_sta.enabled=true
   */
  setWiFiSTA: (deviceIp: string, ssid: string, password: string): string => 
    `http://${deviceIp}/settings?wifi_sta.ssid=${encodeURIComponent(ssid)}&wifi_sta.key=${encodeURIComponent(password)}&wifi_sta.enabled=true`,

  /**
   * CONFIGURAR WIFI SECUNDARIO (BACKUP)
   * Endpoint: GET http://<IP>/settings?wifi_sta1.ssid=<ssid>&wifi_sta1.key=<password>&wifi_sta1.enabled=true
   */
  setWiFiSTA1: (deviceIp: string, ssid: string, password: string): string => 
    `http://${deviceIp}/settings?wifi_sta1.ssid=${encodeURIComponent(ssid)}&wifi_sta1.key=${encodeURIComponent(password)}&wifi_sta1.enabled=true`,

  /**
   * CONTROL BÁSICO DE RELÉ
   */
  relay: {
    /** Encender relé */
    turnOn: (deviceIp: string, channel: number = 0, timer?: number): string => {
      let url = `http://${deviceIp}/relay/${channel}?turn=on`;
      if (timer) url += `&timer=${timer}`;
      return url;
    },

    /** Apagar relé */
    turnOff: (deviceIp: string, channel: number = 0, timer?: number): string => {
      let url = `http://${deviceIp}/relay/${channel}?turn=off`;
      if (timer) url += `&timer=${timer}`;
      return url;
    },

    /** Alternar estado del relé */
    toggle: (deviceIp: string, channel: number = 0, timer?: number): string => {
      let url = `http://${deviceIp}/relay/${channel}?turn=toggle`;
      if (timer) url += `&timer=${timer}`;
      return url;
    },
  },
};

/**
 * UTILIDADES PARA GEN 1
 * ========================================
 */
export const gen1Utils = {
  /**
   * Convertir Watt-minuto a kWh
   * Gen1 reporta energía en Watt-minuto, necesitamos convertir a kWh
   */
  wattMinuteToKwh: (wattMinute: number): number => {
    return wattMinute / 60000; // 1 kWh = 60,000 Watt-minuto
  },

  /**
   * Construir URL con parámetros de consulta
   */
  buildUrlWithParams: (baseUrl: string, params: Record<string, any>): string => {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  },

  /**
   * Validar respuesta de API Gen1
   */
  isValidResponse: (response: any): boolean => {
    return response && typeof response === 'object' && !response.error;
  },

  /**
   * Formatear regla de programación horaria
   * @param hour Hora (0-23)
   * @param minute Minuto (0-59)
   * @param days Array de días de la semana (0=Domingo, 1=Lunes, etc.)
   * @param action 'on' o 'off'
   */
  formatScheduleRule: (hour: number, minute: number, days: number[], action: 'on' | 'off'): string => {
    const timeStr = `${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}`;
    const daysStr = days.join('');
    return `${timeStr}-${daysStr}-${action}`;
  },

  /**
   * Parsear regla de programación horaria
   */
  parseScheduleRule: (rule: string): { hour: number; minute: number; days: number[]; action: 'on' | 'off' } | null => {
    const match = rule.match(/^(\d{4})-(\d+)-(on|off)$/);
    if (!match) return null;

    const [, time, daysStr, action] = match;
    const hour = parseInt(time.substring(0, 2));
    const minute = parseInt(time.substring(2, 4));
    const days = daysStr.split('').map(d => parseInt(d));

    return {
      hour,
      minute,
      days,
      action: action as 'on' | 'off'
    };
  },

  /**
   * Verificar si un dispositivo es Gen1 basado en la respuesta
   */
  isGen1Device: (deviceInfo: any): boolean => {
    return deviceInfo && 
           typeof deviceInfo.fw === 'string' && 
           !deviceInfo.gen && // Gen1 no tiene campo 'gen'
           Array.isArray(deviceInfo.relays);
  },
};

/**
 * CLASE HELPER PARA MANEJAR DISPOSITIVOS GEN1
 * ========================================
 * Proporciona una interfaz unificada para todas las operaciones
 */
export class Gen1DeviceManager {
  constructor(private deviceIp: string) {}

  /**
   * Obtener información completa del dispositivo
   */
  async getDeviceInfo(): Promise<Gen1DeviceInfo> {
    const response = await fetch(gen1Endpoints.getDeviceInfo(this.deviceIp));
    if (!response.ok) throw new Error('Failed to get device info');
    return response.json();
  }

  /**
   * Obtener configuración completa del dispositivo
   */
  async getDeviceSettings(): Promise<Gen1DeviceSettings> {
    const response = await fetch(gen1Endpoints.getDeviceSettings(this.deviceIp));
    if (!response.ok) throw new Error('Failed to get device settings');
    return response.json();
  }

  /**
   * Cambiar nombre del dispositivo
   */
  async setDeviceName(name: string): Promise<void> {
    const response = await fetch(gen1Commands.setDeviceName(this.deviceIp, name));
    if (!response.ok) throw new Error('Failed to set device name');
  }

  /**
   * Configurar zona horaria
   */
  async setTimezone(timezone: string, lat?: number, lng?: number): Promise<void> {
    const response = await fetch(gen1Commands.setTimezone(this.deviceIp, timezone, lat, lng));
    if (!response.ok) throw new Error('Failed to set timezone');
  }

  /**
   * Configurar estado por defecto tras reinicio
   */
  async setDefaultState(channel: number, state: 'off' | 'on' | 'last' | 'switch'): Promise<void> {
    const response = await fetch(gen1Commands.setDefaultState(this.deviceIp, channel, state));
    if (!response.ok) throw new Error('Failed to set default state');
  }

  /**
   * Configurar auto-encendido
   */
  async setAutoOn(channel: number, seconds: number): Promise<void> {
    const response = await fetch(gen1Commands.setAutoOn(this.deviceIp, channel, seconds));
    if (!response.ok) throw new Error('Failed to set auto-on');
  }

  /**
   * Configurar auto-apagado
   */
  async setAutoOff(channel: number, seconds: number): Promise<void> {
    const response = await fetch(gen1Commands.setAutoOff(this.deviceIp, channel, seconds));
    if (!response.ok) throw new Error('Failed to set auto-off');
  }

  /**
   * Control básico del relé
   */
  async turnOn(channel: number = 0, timer?: number): Promise<void> {
    const response = await fetch(gen1Commands.relay.turnOn(this.deviceIp, channel, timer));
    if (!response.ok) throw new Error('Failed to turn on relay');
  }

  async turnOff(channel: number = 0, timer?: number): Promise<void> {
    const response = await fetch(gen1Commands.relay.turnOff(this.deviceIp, channel, timer));
    if (!response.ok) throw new Error('Failed to turn off relay');
  }

  async toggle(channel: number = 0, timer?: number): Promise<void> {
    const response = await fetch(gen1Commands.relay.toggle(this.deviceIp, channel, timer));
    if (!response.ok) throw new Error('Failed to toggle relay');
  }

  /**
   * Resetear contadores de energía
   */
  async resetEnergyCounters(channel: number = 0): Promise<void> {
    const response = await fetch(gen1Endpoints.meter.reset(this.deviceIp, channel));
    if (!response.ok) throw new Error('Failed to reset energy counters');
  }

  /**
   * Verificar y aplicar actualizaciones
   */
  async checkForUpdates(): Promise<{ has_update: boolean; new_version?: string }> {
    const response = await fetch(gen1Endpoints.ota.check(this.deviceIp));
    if (!response.ok) throw new Error('Failed to check for updates');
    return response.json();
  }

  async performUpdate(): Promise<void> {
    const response = await fetch(gen1Endpoints.ota.update(this.deviceIp), { method: 'POST' });
    if (!response.ok) throw new Error('Failed to perform update');
  }

  /**
   * Reiniciar dispositivo
   */
  async reboot(): Promise<void> {
    const response = await fetch(gen1Endpoints.reboot(this.deviceIp), { method: 'POST' });
    if (!response.ok) throw new Error('Failed to reboot device');
  }
} 