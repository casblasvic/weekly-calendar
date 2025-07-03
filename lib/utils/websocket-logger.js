/**
 * Utilidad de logging para WebSocket que permite controlar la verbosidad
 * con variables de entorno (versión JavaScript)
 */

// Variable de entorno para controlar los logs de WebSocket
const WEBSOCKET_DEBUG = process.env.WEBSOCKET_DEBUG === 'true'
const WEBSOCKET_VERBOSE = process.env.WEBSOCKET_VERBOSE === 'true'

export const wsLogger = {
  // Logs de debug muy verbosos (🔍)
  debug: (...args) => {
    if (WEBSOCKET_DEBUG) {
      console.log(...args)
    }
  },

  // Logs de información importante pero verbosa (📡, 💾, 📤, 📝)
  verbose: (...args) => {
    if (WEBSOCKET_VERBOSE) {
      console.log(...args)
    }
  },

  // Logs importantes que siempre deben mostrarse (✅, ❌, ⚠️)
  info: (...args) => {
    console.log(...args)
  },

  // Logs de error que siempre deben mostrarse
  error: (...args) => {
    console.error(...args)
  },

  // Logs de advertencia que siempre deben mostrarse
  warn: (...args) => {
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