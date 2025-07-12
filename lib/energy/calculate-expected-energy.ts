import { prisma } from '@/lib/db'
import type { AppointmentDeviceUsage, Prisma } from '@prisma/client'

export interface ExpectedEnergyResult {
  expectedKwh: number
  stdDevSum: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data'
  validProfiles: number
  totalProfiles: number
}

/**
 * Calcula la energía esperada de un uso a partir de los perfiles
 * ServiceEnergyProfile almacenados.
 * 
 * Algoritmo con validación estadística:
 *   expected  = Σ (durMinServicio × avg_kwh_per_min) [solo perfiles válidos]
 *   stdDevSum = Σ (durMinServicio × std_dev_kwh_per_min) [con fallback si σ=0]
 * 
 * Validación:
 *   - Mínimo 5 muestras para considerar perfil válido
 *   - Si stdDev = 0, usar 10% del promedio como fallback
 *   - Confianza basada en % de perfiles válidos
 */
export async function calculateExpectedEnergy (
  usage: AppointmentDeviceUsage
): Promise<ExpectedEnergyResult> {
  const deviceData = (usage.deviceData as Prisma.JsonValue) as any
  const systemId = usage.systemId

  const services: { serviceId: string; durationMinutes: number }[] =
    deviceData?.servicesDetails ?? []

  if (!Array.isArray(services) || services.length === 0) {
    return { 
      expectedKwh: 0, 
      stdDevSum: 0, 
      confidence: 'insufficient_data',
      validProfiles: 0,
      totalProfiles: 0
    }
  }

  const serviceIds = services.map(s => s.serviceId)

  const profiles = await prisma.serviceEnergyProfile.findMany({
    where: {
      systemId,
      serviceId: { in: serviceIds },
      equipmentId: usage.equipmentId
    }
  })

  const profileMap = new Map<string, typeof profiles[0]>()
  profiles.forEach(p => profileMap.set(p.serviceId, p))

  let expected = 0
  let stdDev = 0
  let validProfiles = 0
  const totalProfiles = services.length

  const MIN_SAMPLES = 5

  for (const svc of services) {
    const p = profileMap.get(svc.serviceId)
    if (!p) continue

    // Validación estadística: mínimo de muestras
    if (p.sampleCount < MIN_SAMPLES) {
      console.warn(`[ENERGY] Perfil ${p.serviceId} tiene solo ${p.sampleCount} muestras (mín: ${MIN_SAMPLES})`)
      continue
    }

    validProfiles++
    expected += svc.durationMinutes * p.avgKwhPerMin

    // Manejo de stdDev = 0 (fallback al 10% del promedio)
    let effectiveStdDev = p.stdDevKwhPerMin
    if (effectiveStdDev === 0 && p.avgKwhPerMin > 0) {
      effectiveStdDev = p.avgKwhPerMin * 0.1
      console.warn(`[ENERGY] Perfil ${p.serviceId} sin varianza, usando fallback: ${effectiveStdDev.toFixed(4)}`)
    }

    stdDev += svc.durationMinutes * effectiveStdDev
  }

  // Determinar nivel de confianza
  let confidence: 'high' | 'medium' | 'low' | 'insufficient_data'
  const validPercentage = totalProfiles > 0 ? validProfiles / totalProfiles : 0

  if (validProfiles === 0) {
    confidence = 'insufficient_data'
  } else if (validPercentage >= 0.8) {
    confidence = 'high'
  } else if (validPercentage >= 0.5) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return { 
    expectedKwh: expected, 
    stdDevSum: stdDev,
    confidence,
    validProfiles,
    totalProfiles
  }
} 