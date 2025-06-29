/**
 * ========================================
 * PLUGIN SHELLY - DICCIONARIO COMPLETO PARA DISPOSITIVOS GEN 2 (PLUS/PRO)
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
 * - Ejemplo: deviceId "b0b21c12dd94" → cloudId "194279021665684"
 * 
 * 🏗️ ARQUITECTURA DEL PLUGIN:
 * 1. Credenciales → Tabla `ShellyCredential` (apiHost, tokens)
 * 2. Dispositivos → Tabla `SmartPlugDevice` (deviceId, credentialId)
 * 3. WebSocket Manager → Maneja conexiones y mapeo automático
 * 4. Control → Via WebSocket Commands usando cloudId mapeado
 * 
 * ✅ VENTAJAS GEN 2:
 * - Soporte completo para WebSocket Commands (PRIORITARIO)
 * - RPC JSON-RPC 2.0 unificado
 * - Configuración avanzada via Shelly Cloud
 * - No requiere acceso a red local
 * 
 * Modelos compatibles:
 * - Shelly Plus Plug S (SNPL-00112EU, SNPL-00112US)
 * - Shelly Plus 1, Plus 1PM, Plus 2PM
 * - Shelly Pro 1, Pro 1PM, Pro 2, Pro 2PM, Pro 3, Pro 4PM
 * - Todos los modelos Shelly Plus y Pro
 * 
 * PROTOCOLO: RPC JSON-RPC 2.0
 * - ✅ Soporta WebSocket Commands (PRIORITARIO)
 * - ✅ Soporta HTTP RPC local
 * - ✅ Compatible con Shelly Cloud WebSocket
 * 
 * PRIORIDAD DE USO:
 * 1. WebSocket Commands vía Shelly Cloud (PREFERIDO)
 * 2. HTTP RPC local (si WebSocket no disponible)
 * 3. HTTP GET simplificado (compatibilidad)
 * 
 * DOCUMENTACIÓN BASADA EN:
 * - Tabla de funcionalidades por generación
 * - API oficial Shelly Gen2 RPC
 * - Documentación JSON-RPC 2.0
 * - Pruebas realizadas en dispositivos reales
 */

/**
 * MÉTODOS RPC DISPONIBLES EN GEN 2
 * ========================================
 * Todos los métodos utilizan JSON-RPC 2.0
 */
export const gen2Methods = {
  /**
   * INFORMACIÓN DEL DISPOSITIVO
   * ========================================
   */
  device: {
    /** 
     * Obtener información básica del dispositivo
     * Retorna: id, mac, model, gen, fw_id, ver, app, auth_en, auth_domain
     */
    getInfo: 'Shelly.GetDeviceInfo',
    
    /** 
     * Obtener estado completo del dispositivo
     * Retorna: todos los componentes y su estado actual
     */
    getStatus: 'Shelly.GetStatus',
    
    /** 
     * Obtener configuración completa del dispositivo
     * Retorna: configuración de todos los componentes
     */
    getConfig: 'Shelly.GetConfig',
    
    /** 
     * Listar métodos RPC disponibles
     * Retorna: array de métodos soportados por el dispositivo
     */
    listMethods: 'Shelly.ListMethods',
    
    /** 
     * Reiniciar dispositivo
     * Parámetros: delay_ms (opcional, por defecto 1000ms)
     */
    reboot: 'Shelly.Reboot',
    
    /** 
     * Reset de fábrica
     * CUIDADO: Borra toda la configuración
     */
    factoryReset: 'Shelly.FactoryReset',
  },

  /**
   * CONFIGURACIÓN DEL SISTEMA
   * ========================================
   */
  system: {
    /** 
     * Obtener configuración del sistema
     * Retorna: device, location, debug, ui_data, rpc_udp, sntp, cfg_rev
     */
    getConfig: 'Sys.GetConfig',
    
    /** 
     * Configurar sistema (nombre, timezone, ubicación, etc.)
     * Parámetros: config object con device, location, debug, etc.
     */
    setConfig: 'Sys.SetConfig',
    
    /** 
     * Obtener estado del sistema
     * Retorna: mac, restart_required, time, unixtime, uptime, ram, fs, etc.
     */
    getStatus: 'Sys.GetStatus',
    
    /** 
     * Establecer hora del sistema
     * Parámetros: unixtime (timestamp Unix con fracciones de segundo)
     */
    setTime: 'Sys.SetTime',
  },

  /**
   * CONTROL DE INTERRUPTORES/RELÉS
   * ========================================
   */
  switch: {
    /** 
     * Encender/apagar interruptor
     * Parámetros: id (canal), on (boolean), toggle_after (opcional)
     */
    set: 'Switch.Set',
    
    /** 
     * Alternar estado del interruptor
     * Parámetros: id (canal)
     */
    toggle: 'Switch.Toggle',
    
    /** 
     * Obtener estado del interruptor
     * Parámetros: id (canal)
     */
    getStatus: 'Switch.GetStatus',
    
    /** 
     * Obtener configuración del interruptor
     * Parámetros: id (canal)
     */
    getConfig: 'Switch.GetConfig',
    
    /** 
     * Configurar interruptor (timers, límites, comportamiento)
     * Parámetros: id (canal), config object
     */
    setConfig: 'Switch.SetConfig',
    
    /** 
     * Resetear contadores de energía
     * Parámetros: id (canal), type (array de tipos a resetear)
     */
    resetCounters: 'Switch.ResetCounters',
  },

  /**
   * CONFIGURACIÓN WIFI
   * ========================================
   */
  wifi: {
    /** 
     * Obtener configuración WiFi
     * Retorna: ap, sta, sta1, roam
     */
    getConfig: 'WiFi.GetConfig',
    
    /** 
     * Configurar WiFi (principal, backup, AP)
     * Parámetros: config object con ap, sta, sta1, roam
     */
    setConfig: 'WiFi.SetConfig',
    
    /** 
     * Obtener estado WiFi
     * Retorna: sta_ip, status, ssid, rssi, ap_client_count
     */
    getStatus: 'WiFi.GetStatus',
    
    /** 
     * Escanear redes WiFi disponibles
     * Retorna: array de redes con ssid, bssid, auth, channel, rssi
     */
    scan: 'WiFi.Scan',
    
    /** 
     * Listar clientes conectados al AP
     * Retorna: lista de clientes con mac, ip, etc.
     */
    listAPClients: 'WiFi.ListAPClients',
  },

  /**
   * PROGRAMACIÓN HORARIA (SCHEDULES)
   * ========================================
   * Gen2 soporta hasta 20 tareas programadas con expresiones cron
   */
  schedule: {
    /** 
     * Listar todas las tareas programadas
     * Retorna: array de schedules con id, enable, timespec, calls
     */
    list: 'Schedule.List',
    
    /** 
     * Crear nueva tarea programada
     * Parámetros: enable, timespec (cron), calls (array de métodos RPC)
     */
    create: 'Schedule.Create',
    
    /** 
     * Actualizar tarea programada existente
     * Parámetros: id, enable, timespec, calls
     */
    update: 'Schedule.Update',
    
    /** 
     * Eliminar tarea programada
     * Parámetros: id
     */
    delete: 'Schedule.Delete',
    
    /** 
     * Eliminar todas las tareas programadas
     */
    deleteAll: 'Schedule.DeleteAll',
  },

  /**
   * ACTUALIZACIONES DE FIRMWARE
   * ========================================
   */
  update: {
    /** 
     * Verificar actualizaciones disponibles
     * Retorna: stable/beta objects con version y build_id si disponibles
     */
    check: 'Shelly.CheckForUpdate',
    
    /** 
     * Actualizar firmware
     * Parámetros: stage ('stable' o 'beta'), url (opcional)
     */
    update: 'Shelly.Update',
  },

  /**
   * CONFIGURACIÓN DE NUBE
   * ========================================
   */
  cloud: {
    /** 
     * Obtener configuración de nube
     */
    getConfig: 'Cloud.GetConfig',
    
    /** 
     * Configurar conexión a nube
     * Parámetros: config object
     */
    setConfig: 'Cloud.SetConfig',
    
    /** 
     * Obtener estado de conexión a nube
     */
    getStatus: 'Cloud.GetStatus',
  },

  /**
   * CONFIGURACIÓN MQTT
   * ========================================
   */
  mqtt: {
    /** 
     * Obtener configuración MQTT
     */
    getConfig: 'MQTT.GetConfig',
    
    /** 
     * Configurar MQTT
     * Parámetros: config object
     */
    setConfig: 'MQTT.SetConfig',
    
    /** 
     * Obtener estado MQTT
     */
    getStatus: 'MQTT.GetStatus',
  },
} as const;

/**
 * COMANDOS ESPECÍFICOS POR FUNCIONALIDAD
 * ========================================
 * Implementación de los comandos según la tabla de funcionalidades
 */
export const gen2Commands = {
  /**
   * OBTENER INFORMACIÓN DEL DISPOSITIVO
   * Comando: Shelly.GetDeviceInfo
   * Retorna: MAC, modelo, versión firmware, etc.
   */
  getDeviceInfo: {
    method: gen2Methods.device.getInfo,
    params: undefined,
    description: 'Obtiene información básica del dispositivo (MAC, modelo, firmware)',
  },

  /**
   * CAMBIAR NOMBRE DEL DISPOSITIVO
   * Comando: Sys.SetConfig con device.name
   * Ejemplo: {"config":{"device":{"name":"Mi Enchufe"}}}
   */
  setDeviceName: (name: string) => ({
    method: gen2Methods.system.setConfig,
    params: {
      config: {
        device: { name }
      }
    },
    description: `Cambiar nombre del dispositivo a: ${name}`,
  }),

  /**
   * CONFIGURAR ZONA HORARIA
   * Comando: Sys.SetConfig con location.tz
   * Ejemplo: {"config":{"location":{"tz":"Europe/Madrid","lat":40.4168,"lon":-3.7038}}}
   */
  setTimezone: (timezone: string, lat?: number, lon?: number) => ({
    method: gen2Methods.system.setConfig,
    params: {
      config: {
        location: {
          tz: timezone,
          ...(lat !== undefined && { lat }),
          ...(lon !== undefined && { lon }),
        }
      }
    },
    description: `Configurar zona horaria: ${timezone}`,
  }),

  /**
   * CONFIGURAR ESTADO TRAS REINICIO
   * Comando: Switch.SetConfig con initial_state
   * Estados: "off", "on", "restore_last", "match_input"
   */
  setDefaultState: (channel: number, state: 'off' | 'on' | 'restore_last' | 'match_input') => ({
    method: gen2Methods.switch.setConfig,
    params: {
      id: channel,
      config: { initial_state: state }
    },
    description: `Configurar estado por defecto del canal ${channel}: ${state}`,
  }),

  /**
   * CONFIGURAR AUTO-ENCENDIDO
   * Comando: Switch.SetConfig con auto_on y auto_on_delay
   * Ejemplo: {"id":0,"config":{"auto_on":true,"auto_on_delay":30}}
   */
  setAutoOn: (channel: number, enabled: boolean, delaySeconds: number) => ({
    method: gen2Methods.switch.setConfig,
    params: {
      id: channel,
      config: {
        auto_on: enabled,
        auto_on_delay: delaySeconds
      }
    },
    description: `Auto-encendido canal ${channel}: ${enabled ? `${delaySeconds}s` : 'deshabilitado'}`,
  }),

  /**
   * CONFIGURAR AUTO-APAGADO
   * Comando: Switch.SetConfig con auto_off y auto_off_delay
   * Ejemplo: {"id":0,"config":{"auto_off":true,"auto_off_delay":60}}
   */
  setAutoOff: (channel: number, enabled: boolean, delaySeconds: number) => ({
    method: gen2Methods.switch.setConfig,
    params: {
      id: channel,
      config: {
        auto_off: enabled,
        auto_off_delay: delaySeconds
      }
    },
    description: `Auto-apagado canal ${channel}: ${enabled ? `${delaySeconds}s` : 'deshabilitado'}`,
  }),

  /**
   * CONTROL BÁSICO DE INTERRUPTOR
   */
  switch: {
    /** Encender canal */
    turnOn: (channel: number = 0, timer?: number) => ({
      method: gen2Methods.switch.set,
      params: {
        id: channel,
        on: true,
        ...(timer && { toggle_after: timer })
      },
      description: `Encender canal ${channel}${timer ? ` por ${timer}s` : ''}`,
    }),

    /** Apagar canal */
    turnOff: (channel: number = 0, timer?: number) => ({
      method: gen2Methods.switch.set,
      params: {
        id: channel,
        on: false,
        ...(timer && { toggle_after: timer })
      },
      description: `Apagar canal ${channel}${timer ? ` por ${timer}s` : ''}`,
    }),

    /** Alternar estado del canal */
    toggle: (channel: number = 0) => ({
      method: gen2Methods.switch.toggle,
      params: { id: channel },
      description: `Alternar estado del canal ${channel}`,
    }),

    /** Obtener estado del canal */
    getStatus: (channel: number = 0) => ({
      method: gen2Methods.switch.getStatus,
      params: { id: channel },
      description: `Obtener estado del canal ${channel}`,
    }),
  },

  /**
   * RESETEAR CONTADORES DE ENERGÍA
   * Comando: Switch.ResetCounters
   */
  resetEnergyCounters: (channel: number = 0, types: string[] = ['aenergy']) => ({
    method: gen2Methods.switch.resetCounters,
    params: {
      id: channel,
      type: types
    },
    description: `Resetear contadores de energía del canal ${channel}`,
  }),

  /**
   * VERIFICAR Y APLICAR ACTUALIZACIONES
   */
  checkUpdates: () => ({
    method: gen2Methods.update.check,
    params: undefined,
    description: 'Verificar actualizaciones de firmware disponibles',
  }),

  performUpdate: (stage: 'stable' | 'beta' = 'stable') => ({
    method: gen2Methods.update.update,
    params: { stage },
    description: `Actualizar firmware a versión ${stage}`,
  }),
} as const;

/**
 * TIPOS DE RESPUESTA GEN 2
 * ========================================
 */
export interface Gen2DeviceInfo {
  /** ID único del dispositivo */
  id: string;
  /** Dirección MAC */
  mac: string;
  /** Modelo del dispositivo */
  model: string;
  /** Generación (2) */
  gen: number;
  /** ID del firmware */
  fw_id: string;
  /** Versión del firmware */
  ver: string;
  /** Nombre de la aplicación */
  app: string;
  /** Si la autenticación está habilitada */
  auth_en: boolean;
  /** Dominio de autenticación */
  auth_domain: string;
}

export interface Gen2SwitchStatus {
  /** ID del canal */
  id: number;
  /** Fuente del último cambio */
  source: string;
  /** Estado actual (true=encendido, false=apagado) */
  output: boolean;
  /** Potencia activa en Watts */
  apower: number;
  /** Voltaje en Volts */
  voltage: number;
  /** Corriente en Amperes */
  current: number;
  /** Información de energía */
  aenergy: {
    /** Energía total en Wh */
    total: number;
    /** Energía por minuto (últimos 3) */
    by_minute: number[];
    /** Timestamp del minuto actual */
    minute_ts: number;
  };
  /** Temperatura del dispositivo */
  temperature: {
    /** Temperatura en Celsius */
    tC: number;
    /** Temperatura en Fahrenheit */
    tF: number;
  };
}

/**
 * ESTRUCTURA DE MENSAJE RPC
 * ========================================
 */
export interface Gen2RPCMessage {
  /** ID único del mensaje */
  id: number;
  /** Método RPC a ejecutar */
  method: string;
  /** Parámetros del método (opcional) */
  params?: any;
}

export interface Gen2RPCResponse {
  /** ID del mensaje original */
  id: number;
  /** Resultado exitoso */
  result?: any;
  /** Error si falló */
  error?: {
    code: number;
    message: string;
  };
}

/**
 * UTILIDADES PARA GEN 2
 * ========================================
 */
export const gen2Utils = {
  /**
   * Construir mensaje RPC
   */
  buildRPCMessage: (id: number, method: string, params?: any): Gen2RPCMessage => ({
    id,
    method,
    ...(params && { params }),
  }),

  /**
   * Construir URL para HTTP RPC local
   */
  buildHTTPRPCUrl: (deviceIp: string, method: string): string => 
    `http://${deviceIp}/rpc/${method}`,

  /**
   * Validar respuesta RPC
   */
  isValidRPCResponse: (response: Gen2RPCResponse): boolean => 
    response && 
    typeof response === 'object' && 
    response.id !== undefined && 
    (response.result !== undefined || response.error !== undefined),

  /**
   * Extraer resultado o lanzar error
   */
  extractResult: (response: Gen2RPCResponse): any => {
    if (response.error) {
      throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
    }
    return response.result;
  },

  /**
   * Verificar si un dispositivo es Gen2 basado en la respuesta
   */
  isGen2Device: (deviceInfo: any): boolean => 
    deviceInfo && 
    deviceInfo.gen === 2 && 
    typeof deviceInfo.model === 'string' &&
    (deviceInfo.model.includes('Plus') || deviceInfo.model.includes('Pro')),
}; 