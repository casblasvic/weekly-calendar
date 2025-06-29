/**
 * ========================================
 * PLUGIN SHELLY - DICCIONARIO COMPLETO PARA DISPOSITIVOS GEN 3
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
 * ✨ FUNCIONALIDADES EXCLUSIVAS GEN 3:
 * - Control de LED RGB multicolor (PLUGS_UI)
 * - Configuraciones predefinidas para clínicas
 * - Indicadores visuales de estado de equipos
 * - Modo nocturno automático
 * 
 * ✅ VENTAJAS GEN 3:
 * - Hereda TODAS las funcionalidades de Gen2
 * - Soporte completo para WebSocket Commands
 * - Funcionalidades LED exclusivas
 * - Mejor integración con equipos médicos
 * 
 * Modelos compatibles:
 * - Shelly Plug S Gen3 (MTR)
 * - Shelly Plus Mini PM Gen3
 * - Todos los dispositivos de tercera generación
 * 
 * PROTOCOLO: RPC JSON-RPC 2.0 (IGUAL QUE GEN 2)
 * - ✅ Soporta WebSocket Commands (PRIORITARIO)
 * - ✅ Soporta HTTP RPC local
 * - ✅ Compatible con Shelly Cloud WebSocket
 * - ✅ Funcionalidades adicionales específicas de Gen3
 * 
 * PRIORIDAD DE USO:
 * 1. WebSocket Commands vía Shelly Cloud (PREFERIDO)
 * 2. HTTP RPC local (si WebSocket no disponible)
 * 3. HTTP GET simplificado (compatibilidad)
 * 
 * NOTA IMPORTANTE:
 * Gen3 utiliza la MISMA interfaz RPC que Gen2, con funcionalidades adicionales.
 * Según la tabla: "Igual que Gen 2" para todas las funcionalidades básicas.
 * 
 * DOCUMENTACIÓN BASADA EN:
 * - Tabla de funcionalidades por generación
 * - API oficial Shelly Gen3 RPC
 * - Documentación JSON-RPC 2.0
 * - Pruebas realizadas en dispositivos reales
 */

// Importar todos los tipos y métodos de Gen2
import { 
  gen2Methods, 
  gen2Commands, 
  gen2Utils,
  Gen2DeviceInfo,
  Gen2SwitchStatus,
  Gen2RPCMessage,
  Gen2RPCResponse
} from './gen2';

/**
 * MÉTODOS RPC PARA GEN 3
 * ========================================
 * Gen3 hereda TODOS los métodos de Gen2 + funcionalidades adicionales
 */
export const gen3Methods = {
  // Heredar todos los métodos de Gen2
  ...gen2Methods,
  
  /**
   * CONTROL DE LED MULTICOLOR (EXCLUSIVO GEN 3)
   * Solo disponible en modelos con LED RGB como Plug S Gen3
   */
  plugsUI: {
    /** 
     * Obtener configuración de LEDs
     * Retorna: configuración de modo, colores, modo nocturno
     */
    getConfig: 'PLUGS_UI.GetConfig',
    
    /** 
     * Configurar LEDs (modo, colores, brillo)
     * Parámetros: config object con leds.mode, colors, night_mode
     */
    setConfig: 'PLUGS_UI.SetConfig',
    
    /** 
     * Obtener estado actual de LEDs
     * Retorna: estado actual de LEDs y configuración activa
     */
    getStatus: 'PLUGS_UI.GetStatus',
  },
} as const;

/**
 * COMANDOS ESPECÍFICOS PARA GEN 3
 * ========================================
 * Gen3 hereda TODOS los comandos de Gen2 + comandos adicionales
 */
export const gen3Commands = {
  // Heredar todos los comandos de Gen2
  ...gen2Commands,
  
  /**
   * CONFIGURAR LED EN MODO INTERRUPTOR
   * El LED cambia de color según el estado del interruptor
   * Comando: PLUGS_UI.SetConfig con mode="switch"
   */
  setLEDSwitchMode: (onColor: RGBColor, offColor: RGBColor) => ({
    method: gen3Methods.plugsUI.setConfig,
    params: {
      config: {
        leds: {
          mode: 'switch',
          colors: {
            'switch:0': {
              on: onColor,
              off: offColor,
            },
          },
        },
      },
    },
    description: `Configurar LED en modo interruptor`,
  }),

  /**
   * APAGAR LED COMPLETAMENTE
   * Comando: PLUGS_UI.SetConfig con mode="off"
   */
  setLEDOff: () => ({
    method: gen3Methods.plugsUI.setConfig,
    params: {
      config: {
        leds: {
          mode: 'off',
        },
      },
    },
    description: 'Apagar LED completamente',
  }),
} as const;

/**
 * TIPOS ESPECÍFICOS DE GEN 3
 * ========================================
 */

/** Información del dispositivo Gen3 (extiende Gen2) */
export interface Gen3DeviceInfo extends Gen2DeviceInfo {
  /** Generación (3) */
  gen: 3;
}

/** Color RGB con brillo */
export interface RGBColor {
  /** Valores RGB de 0-100 para R, G, B */
  rgb: [number, number, number];
  /** Brillo de 0-100 */
  brightness: number;
}

/** Modos de LED disponibles */
export type LEDMode = 'off' | 'switch' | 'power';

/**
 * CONFIGURACIONES PREDEFINIDAS DE LED
 * ========================================
 * Configuraciones comunes para uso en clínicas
 */
export const gen3LEDPresets = {
  /**
   * MODO CLÍNICA: Verde = Disponible, Rojo = Ocupado
   * Ideal para indicar disponibilidad de equipos
   */
  clinicAvailability: {
    mode: 'switch' as LEDMode,
    colors: {
      'switch:0': {
        on: { rgb: [0, 100, 0] as [number, number, number], brightness: 60 }, // Verde: Disponible
        off: { rgb: [100, 0, 0] as [number, number, number], brightness: 40 }, // Rojo: Ocupado
      },
    },
  },

  /**
   * LED COMPLETAMENTE APAGADO
   */
  ledOff: {
    mode: 'off' as LEDMode,
  },
};

/**
 * UTILIDADES ESPECÍFICAS PARA GEN 3
 * ========================================
 */
export const gen3Utils = {
  // Heredar todas las utilidades de Gen2
  ...gen2Utils,

  /**
   * Verificar si un dispositivo es Gen3
   */
  isGen3Device: (deviceInfo: any): boolean => 
    deviceInfo && 
    deviceInfo.gen === 3 && 
    typeof deviceInfo.model === 'string',

  /**
   * Validar color RGB
   */
  isValidRGBColor: (color: RGBColor): boolean => 
    color.rgb.every(v => v >= 0 && v <= 100) && 
    color.brightness >= 0 && color.brightness <= 100,
}; 