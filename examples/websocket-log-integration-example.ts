/**
 * 🔧 EJEMPLO DE INTEGRACIÓN DE LOGS WEBSOCKET
 * Ejemplo de cómo integrar el sistema de logs condicionales en código existente
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

import { conditionalLog } from '@/lib/websocket/log-manager'

// ============================================================================
// EJEMPLO 1: REEMPLAZO DE LOGS EXISTENTES
// ============================================================================

// ANTES (logs que aparecían en el terminal original)
function handleDeviceUpdateOld(deviceId: string, data: any) {
  console.log('[LIVE-SAMPLE] ---- Nueva llamada recibida ----')
  console.log(`[LIVE-SAMPLE] Payload: ${JSON.stringify(data)}`)
  
  console.log('🔍 [WebSocket RAW] Credencial cmd3ejaiq0001y2uxvvtyrip8 - Mensaje recibido:', data)
  
  console.log(`🎯 [handleDeviceStatusUpdate] LLAMADO para deviceId=${deviceId}`)
  console.log(`📊 [handleDeviceStatusUpdate] Datos extraídos:`, data)
  
  console.log(`🔗 [onDeviceUpdate] EJECUTANDO callback para deviceId=${deviceId}`)
  console.log(`🎯 [SOCKET.JS] onDeviceUpdate CALLBACK EJECUTADO para deviceId=${deviceId}`)
  
  console.log(`📡 [SOCKET.JS] Recibido update de dispositivo ${deviceId}:`, data)
  console.log(`🎯 [SOCKET.JS] Procesando appointment device usage...`)
  console.log(`✅ [SOCKET.JS] processAppointmentDeviceUsageUpdate completado`)
  
  console.log(`📤 [SOCKET.JS] Enviando WebSocket update a 0 clientes locales`)
  console.log(`✅ [SOCKET.JS] device-update EMITIDO al sistema`)
}

// DESPUÉS (usando el sistema de logs condicionales)
function handleDeviceUpdateNew(deviceId: string, data: any) {
  conditionalLog.liveSample('---- Nueva llamada recibida ----')
  conditionalLog.liveSample(`Payload: ${JSON.stringify(data)}`)
  
  conditionalLog.webSocketRaw(`Credencial cmd3ejaiq0001y2uxvvtyrip8 - Mensaje recibido:`, data)
  
  conditionalLog.deviceStatusUpdate(`LLAMADO para deviceId=${deviceId}`)
  conditionalLog.deviceStatusUpdate(`Datos extraídos:`, data)
  
  conditionalLog.deviceUpdate(`EJECUTANDO callback para deviceId=${deviceId}`)
  conditionalLog.socketJs(`onDeviceUpdate CALLBACK EJECUTADO para deviceId=${deviceId}`)
  
  conditionalLog.socketJs(`Recibido update de dispositivo ${deviceId}:`, data)
  conditionalLog.socketJs(`Procesando appointment device usage...`)
  conditionalLog.socketJs(`processAppointmentDeviceUsageUpdate completado`)
  
  conditionalLog.socketJs(`Enviando WebSocket update a 0 clientes locales`)
  conditionalLog.socketJs(`device-update EMITIDO al sistema`)
}

// ============================================================================
// EJEMPLO 2: PROCESAMIENTO DE MENSAJES WEBSOCKET
// ============================================================================

interface WebSocketMessage {
  event: string
  method?: string
  deviceId: string
  hasStatus: boolean
  hasSwitch: boolean
  hasRelay: boolean
  timestamp: string
}

class WebSocketMessageProcessor {
  processMessage(message: WebSocketMessage): void {
    // Log del mensaje raw recibido
    conditionalLog.webSocketRaw(`Mensaje recibido:`, message)
    
    // Procesar según el tipo de evento
    switch (message.event) {
      case 'Shelly:StatusOnChange':
        this.handleStatusChange(message)
        break
      default:
        conditionalLog.webSocketRaw(`Evento desconocido: ${message.event}`)
    }
  }
  
  private handleStatusChange(message: WebSocketMessage): void {
    conditionalLog.deviceStatusUpdate(`Procesando cambio de estado para dispositivo ${message.deviceId}`)
    
    // Extraer datos del dispositivo
    const deviceData = this.extractDeviceData(message)
    conditionalLog.deviceStatusUpdate(`Datos extraídos:`, deviceData)
    
    // Ejecutar callback
    this.executeDeviceUpdateCallback(message.deviceId, deviceData)
  }
  
  private extractDeviceData(message: WebSocketMessage): any {
    // Simular extracción de datos
    return {
      deviceId: message.deviceId,
      online: true,
      relayOn: message.hasRelay,
      currentPower: Math.random() * 100
    }
  }
  
  private executeDeviceUpdateCallback(deviceId: string, data: any): void {
    conditionalLog.deviceUpdate(`EJECUTANDO callback para deviceId=${deviceId}`)
    
    // Simular procesamiento
    this.processAppointmentDeviceUsage(deviceId, data)
    this.createSocketUpdate(deviceId, data)
    this.emitToClients(deviceId, data)
    
    conditionalLog.deviceUpdate(`Callback ejecutado exitosamente para deviceId=${deviceId}`)
  }
  
  private processAppointmentDeviceUsage(deviceId: string, data: any): void {
    conditionalLog.socketJs(`Procesando appointment device usage para ${deviceId}...`)
    
    // Lógica de procesamiento...
    
    conditionalLog.socketJs(`processAppointmentDeviceUsageUpdate completado para ${deviceId}`)
  }
  
  private createSocketUpdate(deviceId: string, data: any): void {
    conditionalLog.socketJs(`Creando update para Socket.io para ${deviceId}...`)
    
    const update = {
      deviceId,
      shellyDeviceId: data.deviceId,
      online: data.online,
      relayOn: data.relayOn,
      currentPower: data.currentPower,
      timestamp: Date.now()
    }
    
    conditionalLog.socketJs(`Update creado:`, update)
  }
  
  private emitToClients(deviceId: string, data: any): void {
    const clientCount = 0 // Simular conteo de clientes
    
    conditionalLog.socketJs(`Enviando WebSocket update para ${deviceId} a ${clientCount} clientes locales`)
    
    // Simular envío a clientes...
    
    conditionalLog.socketJs(`device-update EMITIDO para ${deviceId} al sistema`)
  }
}

// ============================================================================
// EJEMPLO 3: LLAMADAS A API CON LOGS
// ============================================================================

class ApiClient {
  async makeApiCall(endpoint: string, data?: any): Promise<any> {
    conditionalLog.apiCalls(`Llamando a ${endpoint}`, data)
    
    try {
      const response = await fetch(endpoint, {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      })
      
      if (!response.ok) {
        conditionalLog.apiCalls(`Error ${response.status} en ${endpoint}`)
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      conditionalLog.apiCalls(`Respuesta exitosa de ${endpoint}:`, result)
      
      return result
    } catch (error) {
      conditionalLog.apiCalls(`Error en llamada a ${endpoint}:`, error)
      throw error
    }
  }
  
  async liveSampleApi(deviceId: string, data: any): Promise<void> {
    conditionalLog.liveSample(`Enviando live sample para ${deviceId}:`, data)
    
    try {
      await this.makeApiCall('/api/internal/device-usage/live-sample', {
        deviceId,
        currentPower: data.currentPower,
        relayOn: data.relayOn
      })
      
      conditionalLog.liveSample(`Live sample enviado exitosamente para ${deviceId}`)
    } catch (error) {
      conditionalLog.liveSample(`Error enviando live sample para ${deviceId}:`, error)
    }
  }
}

// ============================================================================
// EJEMPLO 4: USO DEL SISTEMA EN COMPONENTES REACT
// ============================================================================

/*
// En un componente React
import { useEffect } from 'react'
import { useWebSocketLogs } from '@/lib/hooks/use-websocket-logs'
import { conditionalLog } from '@/lib/websocket/log-manager'

export function DeviceMonitor() {
  const { isLogTypeEnabled } = useWebSocketLogs()
  
  useEffect(() => {
    // Solo configurar listeners si los logs están activos
    if (isLogTypeEnabled('webSocketRaw')) {
      const websocket = new WebSocket('ws://localhost:3000')
      
      websocket.onmessage = (event) => {
        conditionalLog.webSocketRaw('Mensaje WebSocket recibido:', event.data)
      }
      
      websocket.onopen = () => {
        conditionalLog.webSocketRaw('Conexión WebSocket establecida')
      }
      
      websocket.onclose = () => {
        conditionalLog.webSocketRaw('Conexión WebSocket cerrada')
      }
      
      return () => {
        websocket.close()
      }
    }
  }, [isLogTypeEnabled])
  
  return (
    <div>
      <h2>Monitor de Dispositivos</h2>
      <p>Revisa la consola para ver los logs (si están activos)</p>
    </div>
  )
}
*/

// ============================================================================
// EJEMPLO 5: CONFIGURACIÓN PROGRAMÁTICA
// ============================================================================

export function configureLogsForDebugging(): void {
  const { webSocketLogManager } = require('@/lib/websocket/log-manager')
  
  // Activar logs específicos para debugging
  webSocketLogManager.toggleLogType('deviceStatusUpdate', true)
  webSocketLogManager.toggleLogType('deviceUpdate', true)
  webSocketLogManager.toggleLogType('webSocketRaw', true)
  
  console.log('✅ Logs de debugging activados')
  console.log('🔍 Reproduce el problema y revisa los logs en consola')
  console.log('❌ Recuerda desactivar los logs cuando termines')
}

export function disableAllLogs(): void {
  const { webSocketLogManager } = require('@/lib/websocket/log-manager')
  
  webSocketLogManager.toggleAllLogs(false)
  console.log('✅ Todos los logs desactivados')
}

// ============================================================================
// EJEMPLO 6: MONITOREO DE PERFORMANCE
// ============================================================================

export class PerformanceMonitor {
  private apiCallTimes: Map<string, number> = new Map()
  
  startApiCall(endpoint: string): void {
    this.apiCallTimes.set(endpoint, Date.now())
    conditionalLog.apiCalls(`🟡 Iniciando llamada a ${endpoint}`)
  }
  
  endApiCall(endpoint: string): void {
    const startTime = this.apiCallTimes.get(endpoint)
    if (startTime) {
      const duration = Date.now() - startTime
      conditionalLog.apiCalls(`✅ Llamada a ${endpoint} completada en ${duration}ms`)
      this.apiCallTimes.delete(endpoint)
    }
  }
  
  logDevicePerformance(deviceId: string, operations: number): void {
    conditionalLog.deviceUpdate(`📊 Dispositivo ${deviceId}: ${operations} operaciones procesadas`)
  }
}

// ============================================================================
// EXPORTS PARA USAR EN OTROS ARCHIVOS
// ============================================================================

export {
  WebSocketMessageProcessor,
  ApiClient,
  PerformanceMonitor,
  configureLogsForDebugging,
  disableAllLogs
}

// ============================================================================
// COMENTARIOS SOBRE MIGRACIÓN
// ============================================================================

/*
PASOS PARA MIGRAR LOGS EXISTENTES:

1. Identificar todos los console.log que contengan patrones como:
   - [LIVE-SAMPLE]
   - [WebSocket RAW]
   - [handleDeviceStatusUpdate]
   - [onDeviceUpdate]
   - [SOCKET.JS]

2. Importar el sistema de logs condicionales:
   import { conditionalLog } from '@/lib/websocket/log-manager'

3. Reemplazar cada console.log por su equivalente condicional:
   console.log('[LIVE-SAMPLE] mensaje') → conditionalLog.liveSample('mensaje')
   console.log('🔍 [WebSocket RAW] mensaje') → conditionalLog.webSocketRaw('mensaje')
   console.log('🎯 [handleDeviceStatusUpdate] mensaje') → conditionalLog.deviceStatusUpdate('mensaje')
   console.log('🔗 [onDeviceUpdate] mensaje') → conditionalLog.deviceUpdate('mensaje')
   console.log('🎯 [SOCKET.JS] mensaje') → conditionalLog.socketJs('mensaje')

4. Añadir header de documentación al archivo:
   /**
    * 🔧 WEBSOCKET LOG MANAGEMENT
    * Este archivo usa el sistema de logs condicionales
    * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
    */

5. Probar que los logs se activan/desactivan correctamente desde la UI

ARCHIVOS DONDE BUSCAR LOGS PARA MIGRAR:
- lib/shelly/**/*.ts
- lib/websocket/**/*.ts
- app/api/**/route.ts (especialmente internal/device-usage/live-sample)
- components/shelly/**/*.tsx
- contexts/**/*.tsx (relacionados con WebSocket)

BÚSQUEDA CON REGEX:
- console\.log\('\[LIVE-SAMPLE\].*?\)
- console\.log\('🔍.*?\)
- console\.log\('🎯.*?\)
- console\.log\('🔗.*?\)
- console\.log\('📡.*?\)
*/