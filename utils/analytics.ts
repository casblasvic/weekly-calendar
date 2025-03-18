import { isBrowser } from "./client-utils"

// Tipos de eventos para el análisis
export type AnalyticsEventType =
  | "page_view"
  | "cookie_operation"
  | "cache_operation"
  | "api_request"
  | "error"
  | "user_action"

// Interfaz para los eventos de análisis
export interface AnalyticsEvent {
  type: AnalyticsEventType
  name: string
  properties?: Record<string, any>
  timestamp: number
}

// Cola de eventos para enviar por lotes
const eventQueue: AnalyticsEvent[] = []
let isProcessingQueue = false

// Configuración
const BATCH_SIZE = 10
const FLUSH_INTERVAL = 30000 // 30 segundos

/**
 * Registra un evento de análisis
 */
export function trackEvent(type: AnalyticsEventType, name: string, properties?: Record<string, any>) {
  if (!isBrowser) return

  const event: AnalyticsEvent = {
    type,
    name,
    properties,
    timestamp: Date.now(),
  }

  // Añadir a la cola
  eventQueue.push(event)

  // Procesar la cola si es necesario
  if (eventQueue.length >= BATCH_SIZE && !isProcessingQueue) {
    processEventQueue()
  }

  // Para desarrollo, también registrar en la consola
  if (process.env.NODE_ENV !== "production") {
    console.log("Analytics Event:", JSON.stringify(event))
  }
}

/**
 * Registra una operación de cookie
 */
export function trackCookieOperation(
  action: "read" | "write" | "delete",
  key: string,
  success: boolean,
  details?: Record<string, any>,
) {
  trackEvent("cookie_operation", "cookie_" + action, {
    key,
    success,
    ...details,
  })
}

/**
 * Registra una operación de caché
 */
export function trackCacheOperation(
  action: "read" | "write" | "delete" | "clear",
  key: string,
  success: boolean,
  details?: Record<string, any>,
) {
  trackEvent("cache_operation", "cache_" + action, {
    key,
    success,
    ...details,
  })
}

/**
 * Registra una solicitud API
 */
export function trackApiRequest(
  endpoint: string,
  method: string,
  status: number,
  duration: number,
  details?: Record<string, any>,
) {
  trackEvent("api_request", "api_" + method.toLowerCase(), {
    endpoint,
    method,
    status,
    duration,
    ...details,
  })
}

/**
 * Registra un error
 */
export function trackError(errorType: string, message: string, stack?: string, details?: Record<string, any>) {
  trackEvent("error", errorType, {
    message,
    stack,
    ...details,
  })
}

/**
 * Procesa la cola de eventos y los envía al servidor
 */
async function processEventQueue() {
  if (!isBrowser || isProcessingQueue || eventQueue.length === 0) return

  isProcessingQueue = true

  try {
    // Tomar eventos de la cola (hasta BATCH_SIZE)
    const events = eventQueue.splice(0, BATCH_SIZE)

    // En un entorno real, enviarías estos eventos a tu servidor de análisis
    // Por ahora, solo simulamos el envío
    if (process.env.NODE_ENV === "production") {
      // Aquí iría el código para enviar los eventos al servidor
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events })
      // });
      console.log("Enviando " + events.length + " eventos de análisis al servidor")
    }
  } catch (error) {
    console.error("Error processing analytics queue:", error)
  } finally {
    isProcessingQueue = false

    // Si quedan eventos en la cola, procesar el siguiente lote
    if (eventQueue.length > 0) {
      setTimeout(processEventQueue, 100)
    }
  }
}

/**
 * Configura un intervalo para vaciar la cola periódicamente
 */
if (isBrowser) {
  setInterval(() => {
    if (eventQueue.length > 0 && !isProcessingQueue) {
      processEventQueue()
    }
  }, FLUSH_INTERVAL)

  // También vaciar la cola cuando la página se descarga
  window.addEventListener("beforeunload", () => {
    if (eventQueue.length > 0) {
      processEventQueue()
    }
  })
}

