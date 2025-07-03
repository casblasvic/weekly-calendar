/**
 * Utilidad de logging para WebSocket que permite controlar la verbosidad
 * con variables de entorno
 */

// Variable de entorno para controlar los logs de WebSocket
const WEBSOCKET_DEBUG = process.env.WEBSOCKET_DEBUG === 'true'
const WEBSOCKET_VERBOSE = process.env.WEBSOCKET_VERBOSE === 'true'

export const wsLogger = {
  // Logs de debug muy verbosos (🔍)
  debug: (...args: any[]) => {
    if (WEBSOCKET_DEBUG) {
      console.log(...args)
    }
  },

  // Logs de información importante pero verbosa (📡, 💾, 📤, 📝)
  verbose: (...args: any[]) => {
    if (WEBSOCKET_VERBOSE) {
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
 * Para habilitar los logs verbosos, establece estas variables de entorno:
 * 
 * WEBSOCKET_DEBUG=true    - Habilita logs de debug muy detallados
 * WEBSOCKET_VERBOSE=true  - Habilita logs de información verbosa
 * 
 * Ejemplo en .env.local:
 * WEBSOCKET_DEBUG=true
 * WEBSOCKET_VERBOSE=true
 */ 