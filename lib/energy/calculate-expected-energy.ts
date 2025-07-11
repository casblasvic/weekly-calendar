import { prisma } from '@/lib/db'
import type { AppointmentDeviceUsage, Prisma } from '@prisma/client'

export interface ExpectedEnergyResult {
  expectedKwh: number
  stdDevSum: number
}

/**
 * Calcula la energía esperada de un uso a partir de los perfiles
 * ServiceEnergyProfile almacenados.
 * 
 * Algoritmo simplificado:
 *   expected  = Σ (durMinServicio × avg_kwh_per_min)
 *   stdDevSum = Σ (durMinServicio × std_dev_kwh_per_min)
 * 
 * Si algún servicio no tiene perfil, se ignora y no contribuye.
 */
export async function calculateExpectedEnergy (
  usage: AppointmentDeviceUsage
): Promise<ExpectedEnergyResult> {
  const deviceData = (usage.deviceData as Prisma.JsonValue) as any
  const systemId = usage.systemId

  const services: { serviceId: string; durationMinutes: number }[] =
    deviceData?.servicesDetails ?? []

  if (!Array.isArray(services) || services.length === 0) {
    return { expectedKwh: 0, stdDevSum: 0 }
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

  for (const svc of services) {
    const p = profileMap.get(svc.serviceId)
    if (!p) continue

    expected += svc.durationMinutes * p.avgKwhPerMin
    stdDev   += svc.durationMinutes * p.stdDevKwhPerMin
  }

  return { expectedKwh: expected, stdDevSum: stdDev }
} 