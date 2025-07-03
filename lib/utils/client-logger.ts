/**
 * Utilidad de logging para el frontend (cliente) que permite controlar 
 * la verbosidad usando localStorage
 */

// Verificar si estamos en el cliente
const isClient = typeof window !== 'undefined'

// Función para verificar configuración de logs desde localStorage
const isVerboseEnabled = (): boolean => {
  if (!isClient) return false
  try {
    return localStorage.getItem('WEBSOCKET_VERBOSE') === 'true'
  } catch {
    return false
  }
}

const isDebugEnabled = (): boolean => {
  if (!isClient) return false
  try {
    return localStorage.getItem('WEBSOCKET_DEBUG') === 'true'
  } catch {
    return false
  }
}

export const clientLogger = {
  // Logs de debug muy verbosos (🔍)
  debug: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(...args)
    }
  },

  // Logs de información importante pero verbosa (📡, 💾, 📤, 📝, 📱, 📢)
  verbose: (...args: any[]) => {
    if (isVerboseEnabled()) {
      console.log(...args)
    }
  },

  // Logs importantes que siempre deben mostrarse (✅, ❌, ⚠️)
  info: (...args: any[]) => {
    console.log(...args)
  },

  // Logs de error que siempre deben mostrarse
  error: (...args: any[]) => {
    console.error(...args)
  },

  // Logs de advertencia que siempre deben mostrarse
  warn: (...args: any[]) => {
    console.warn(...args)
  }
}

/**
 * Funciones para controlar los logs desde la consola del navegador
 */
export const enableWebSocketLogs = () => {
  if (isClient) {
    localStorage.setItem('WEBSOCKET_VERBOSE', 'true')
    console.log('✅ Logs verbosos de WebSocket habilitados. Recarga la página para aplicar.')
  }
}

export const enableWebSocketDebug = () => {
  if (isClient) {
    localStorage.setItem('WEBSOCKET_DEBUG', 'true') 
    localStorage.setItem('WEBSOCKET_VERBOSE', 'true') // Debug incluye verbose
    console.log('✅ Logs de debug de WebSocket habilitados. Recarga la página para aplicar.')
  }
}

export const disableWebSocketLogs = () => {
  if (isClient) {
    localStorage.removeItem('WEBSOCKET_VERBOSE')
    localStorage.removeItem('WEBSOCKET_DEBUG')
    console.log('✅ Logs de WebSocket deshabilitados. Recarga la página para aplicar.')
  }
}

// Hacer las funciones globales para facilitar su uso en la consola del navegador
if (isClient) {
  // Extend window interface temporalmente para evitar errores de TypeScript
  const globalWindow = window as any
  globalWindow.enableWebSocketLogs = enableWebSocketLogs
  globalWindow.enableWebSocketDebug = enableWebSocketDebug
  globalWindow.disableWebSocketLogs = disableWebSocketLogs
  
  // Log para confirmar que las funciones están disponibles
  console.log('🎮 Funciones de control de logs disponibles:', {
    enableWebSocketLogs: typeof globalWindow.enableWebSocketLogs,
    enableWebSocketDebug: typeof globalWindow.enableWebSocketDebug,
    disableWebSocketLogs: typeof globalWindow.disableWebSocketLogs
  })
}

/**
 * Para habilitar los logs verbosos en el navegador:
 * 
 * 1. Abre la consola del navegador
 * 2. Ejecuta uno de estos comandos:
 *    - enableWebSocketLogs()     // Solo logs verbosos
 *    - enableWebSocketDebug()    // Logs verbosos + debug
 *    - disableWebSocketLogs()    // Deshabilitar todos
 * 3. Recarga la página
 * 
 * También puedes hacerlo manualmente:
 * localStorage.setItem('WEBSOCKET_VERBOSE', 'true')
 * localStorage.setItem('WEBSOCKET_DEBUG', 'true')
 */ 