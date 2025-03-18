export interface ClinicConfig {
  openTime?: string
  closeTime?: string
}

export function getClinicHours(clinicConfig: ClinicConfig) {
  return {
    openTime: clinicConfig.openTime || "00:00",
    closeTime: clinicConfig.closeTime || "23:59",
  }
}

