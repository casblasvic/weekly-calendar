/**
 * 🔧 WEBSOCKET LOG MANAGER
 * Servicio para gestionar logs de WebSocket y dispositivos Shelly
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

export interface WebSocketLogConfig {
  liveSample: boolean
  webSocketRaw: boolean
  deviceStatusUpdate: boolean
  deviceUpdate: boolean
  socketJs: boolean
  apiCalls: boolean
}

export interface WebSocketLogSettings {
  enabled: boolean
  config: WebSocketLogConfig
  lastUpdated: string
}

class WebSocketLogManager {
  private static instance: WebSocketLogManager
  private config: WebSocketLogSettings = {
    enabled: true,
    config: {
      liveSample: false,
      webSocketRaw: false,
      deviceStatusUpdate: false,
      deviceUpdate: false,
      socketJs: false,
      apiCalls: false
    },
    lastUpdated: new Date().toISOString()
  }

  private constructor() {
    this.loadConfig()
  }

  static getInstance(): WebSocketLogManager {
    if (!WebSocketLogManager.instance) {
      WebSocketLogManager.instance = new WebSocketLogManager()
    }
    return WebSocketLogManager.instance
  }

  /**
   * Carga la configuración desde localStorage
   */
  private loadConfig(): void {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('websocket-log-config')
      if (savedConfig) {
        try {
          this.config = JSON.parse(savedConfig)
        } catch (error) {
          console.error('Error al cargar configuración de logs:', error)
        }
      }
    }
  }

  /**
   * Guarda la configuración en localStorage
   */
  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      this.config.lastUpdated = new Date().toISOString()
      localStorage.setItem('websocket-log-config', JSON.stringify(this.config))
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): WebSocketLogSettings {
    return { ...this.config }
  }

  /**
   * Actualiza la configuración completa
   */
  updateConfig(newConfig: Partial<WebSocketLogSettings>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      lastUpdated: new Date().toISOString()
    }
    this.saveConfig()
  }

  /**
   * Activa/desactiva un tipo específico de log
   */
  toggleLogType(logType: keyof WebSocketLogConfig, enabled: boolean): void {
    this.config.config[logType] = enabled
    this.saveConfig()
  }

  /**
   * Activa/desactiva todos los logs
   */
  toggleAllLogs(enabled: boolean): void {
    this.config.enabled = enabled
    this.saveConfig()
  }

  /**
   * Verifica si un tipo de log está activo
   */
  isLogTypeEnabled(logType: keyof WebSocketLogConfig): boolean {
    return this.config.enabled && this.config.config[logType]
  }

  /**
   * Verifica si los logs están activos en general
   */
  isLoggingEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Obtiene estadísticas de configuración
   */
  getStats(): {
    totalLogTypes: number
    enabledLogTypes: number
    disabledLogTypes: number
    lastUpdated: string
  } {
    const totalLogTypes = Object.keys(this.config.config).length
    const enabledLogTypes = Object.values(this.config.config).filter(Boolean).length
    
    return {
      totalLogTypes,
      enabledLogTypes,
      disabledLogTypes: totalLogTypes - enabledLogTypes,
      lastUpdated: this.config.lastUpdated
    }
  }

  /**
   * Resetea la configuración a valores por defecto
   */
  resetConfig(): void {
    this.config = {
      enabled: true,
      config: {
        liveSample: false,
        webSocketRaw: false,
        deviceStatusUpdate: false,
        deviceUpdate: false,
        socketJs: false,
        apiCalls: false
      },
      lastUpdated: new Date().toISOString()
    }
    this.saveConfig()
  }
}

export const webSocketLogManager = WebSocketLogManager.getInstance()

/**
 * Funciones helper para logs condicionales
 */
export const conditionalLog = {
  liveSample: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('liveSample')) {
      console.log(`[LIVE-SAMPLE] ${message}`, ...args)
    }
  },
  
  webSocketRaw: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('webSocketRaw')) {
      console.log(`🔍 [WebSocket RAW] ${message}`, ...args)
    }
  },
  
  deviceStatusUpdate: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('deviceStatusUpdate')) {
      console.log(`🎯 [handleDeviceStatusUpdate] ${message}`, ...args)
    }
  },
  
  deviceUpdate: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('deviceUpdate')) {
      console.log(`🔗 [onDeviceUpdate] ${message}`, ...args)
    }
  },
  
  socketJs: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('socketJs')) {
      console.log(`🎯 [SOCKET.JS] ${message}`, ...args)
    }
  },
  
  apiCalls: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('apiCalls')) {
      console.log(`📡 [API] ${message}`, ...args)
    }
  }
}

export default WebSocketLogManager