/**
 * Utilidad para manejar eventos de configuración de la clínica
 * Este archivo exporta funciones para notificar a otros componentes
 * cuando la configuración de la clínica ha cambiado
 */

// Nombre del evento personalizado para notificar cambios en la configuración
export const CLINIC_CONFIG_UPDATED_EVENT = "clinic-config-updated"

/**
 * Notifica a todos los componentes que la configuración de la clínica ha cambiado
 * @param clinicId ID de la clínica cuya configuración ha cambiado
 */
export function notifyClinicConfigUpdated(clinicId: number | string) {
  console.log("🔄 Dispatching clinic-config-updated event from utility", { clinicId })

  // Crear y disparar un evento personalizado
  const event = new CustomEvent(CLINIC_CONFIG_UPDATED_EVENT, {
    detail: {
      clinicId,
      timestamp: Date.now(),
    },
  })

  window.dispatchEvent(event)
}

