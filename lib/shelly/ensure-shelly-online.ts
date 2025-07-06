import { deviceOfflineManager } from '@/lib/shelly/device-offline-manager'

export class ShellyOfflineError extends Error {
  constructor() {
    super('Shelly WebSocket offline')
    this.name = 'ShellyOfflineError'
  }
}

/**
 * Lanza ShellyOfflineError si el WebSocket no está conectado.
 * Se usa en los endpoints API antes de enviar comandos.
 */
export function ensureShellyOnline() {
  const stats = deviceOfflineManager.getStats()
  if (!stats.isWebSocketConnected) {
    throw new ShellyOfflineError()
  }
} 