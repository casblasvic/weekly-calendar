/*
 * ╔══════════════════════════════════════════════════════╗
 * ║  ENERGY INSIGHTS · USAGE FINALIZER                   ║
 * ╠══════════════════════════════════════════════════════╣
 * ║  Contexto                                           ║
 * ║  ─────────                                          ║
 * ║  Este módulo se ejecuta al CERRAR un registro de    ║
 * ║  AppointmentDeviceUsage (auto-off o stop manual).   ║
 * ║                                                    ║
 * ║  Responsabilidades:                                ║
 * ║  1. Desagregar el consumo total a nivel de servicio║
 * ║     → tabla appointment_service_energy_usage.      ║
 * ║  2. Actualizar perfiles estadísticos incrementales ║
 * ║     para cada servicio (ServiceEnergyProfile).      ║
 * ║  3. Insertar insights de OVER/UNDER_DURATION        ║
 * ║     (energía se gestiona en live-sample).          ║
 * ║                                                    ║
 * ║  ⚠️  Nunca hardcodea IDs; todo proviene de la BD.   ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import crypto from 'crypto'

export async function finalizeDeviceUsage (usageId: string) {
  const usage = await prisma.appointmentDeviceUsage.findUnique({
    where: { id: usageId },
    include: {
      appointment: { select: { clinicId: true, personId: true } },
      startedByUser: { select: { id: true } }
    }
  })
  if (!usage) return
  if (!usage.energyConsumption || !usage.actualMinutes || usage.actualMinutes <= 0) return

  const deviceData = (usage.deviceData as Prisma.JsonValue) as any
  const services: { serviceId: string; durationMinutes: number }[] =
    deviceData?.servicesDetails ?? []
  if (!Array.isArray(services) || services.length === 0) return

  const totalDur = services.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
  if (totalDur === 0) return

  // Desagregar por servicio
  const inserts: Prisma.AppointmentServiceEnergyUsageCreateManyInput[] = []
  for (const s of services) {
    const ratio = s.durationMinutes / totalDur
    const allocatedKwh = usage.energyConsumption * ratio
    const realMinutes  = usage.actualMinutes * ratio

    inserts.push({
      id: crypto.randomUUID(),
      systemId: usage.systemId,
      clinicId: usage.appointment!.clinicId,
      clientId: usage.appointment!.personId ?? undefined,
      userId: usage.startedByUserId,
      usageId: usage.id,
      serviceId: s.serviceId,
      equipmentId: usage.equipmentId ?? undefined,
      estimatedMinutes: s.durationMinutes,
      realMinutes: realMinutes,
      allocatedKwh: allocatedKwh,
      createdAt: new Date()
    })

    // Update profile – Servicio individual
    await upsertServiceProfile({
      systemId: usage.systemId,
      clinicId: usage.appointment!.clinicId,
      equipmentId: usage.equipmentId!,
      serviceId: s.serviceId,
      hourBucket: new Date(usage.startedAt).getHours(),
      kwhPerMin: allocatedKwh / realMinutes,
      realMinutes
    })
  }

  if (inserts.length) {
    await prisma.appointmentServiceEnergyUsage.createMany({ data: inserts })
  }

  // Perfil por grupo de servicios (hash)
  const hash = crypto.createHash('md5').update(
    services.map(s => s.serviceId).sort().join('+')
  ).digest('hex')

  await upsertGroupProfile({
    systemId: usage.systemId,
    clinicId: usage.appointment!.clinicId,
    equipmentId: usage.equipmentId!,
    servicesHash: hash,
    servicesJson: services.map(s => s.serviceId),
    hourBucket: new Date(usage.startedAt).getHours(),
    kwh: usage.energyConsumption,
    minutes: usage.actualMinutes
  })

  // Insight de DURACIÓN (over/under)
  const diffMin = usage.actualMinutes - usage.estimatedMinutes
  if (Math.abs(diffMin) > 0.5) {
    const deviationType = diffMin > 0 ? 'OVER_DURATION' : 'UNDER_DURATION'
    await prisma.deviceUsageInsight.create({
      data: {
        systemId: usage.systemId,
        appointmentId: usage.appointmentId,
        deviceUsageId: usage.id,
        equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId ?? null,
        clientId: usage.appointment!.personId ?? null,
        insightType: deviationType as any,
        actualKwh: usage.energyConsumption,
        expectedKwh: 0,
        deviationPct: Math.abs(diffMin) * 100 / usage.estimatedMinutes,
        detailJson: { diffMinutes: diffMin }
      }
    }).catch(() => {})
  }
}

async function upsertServiceProfile (params: {
  systemId: string
  clinicId: string
  equipmentId: string
  serviceId: string
  hourBucket: number
  kwhPerMin: number
  realMinutes: number
}) {
  const { systemId, clinicId, equipmentId, serviceId, hourBucket, kwhPerMin, realMinutes } = params
  const key = { systemId, equipmentId, serviceId }
  const profile = await prisma.serviceEnergyProfile.findUnique({ where: { systemId_equipmentId_serviceId: key } })
  
  if (!profile) {
    await prisma.serviceEnergyProfile.create({
      data: {
        ...key,
        avgKwhPerMin: kwhPerMin,
        stdDevKwhPerMin: 0, // Primera muestra, no hay desviación
        sampleCount: 1,
        avgMinutes: realMinutes,
        stdDevMinutes: 0
      }
    })
    return
  }
  
  const newSamples = profile.sampleCount + 1
  
  // Algoritmo de Welford para kWh/min
  const deltaKwh = kwhPerMin - profile.avgKwhPerMin
  const newAvgKwh = profile.avgKwhPerMin + deltaKwh / newSamples
  const delta2Kwh = kwhPerMin - newAvgKwh
  const newM2Kwh = (profile.m2KwhPerMin || 0) + deltaKwh * delta2Kwh
  const newStdDevKwh = newSamples > 1 ? Math.sqrt(newM2Kwh / (newSamples - 1)) : 0
  
  // Algoritmo de Welford para minutos
  const deltaMin = realMinutes - profile.avgMinutes
  const newAvgMin = profile.avgMinutes + deltaMin / newSamples
  const delta2Min = realMinutes - newAvgMin
  const newM2Min = (profile.m2Minutes || 0) + deltaMin * delta2Min
  const newStdDevMin = newSamples > 1 ? Math.sqrt(newM2Min / (newSamples - 1)) : 0
  
  await prisma.serviceEnergyProfile.update({
    where: { systemId_equipmentId_serviceId: key },
    data: {
      avgKwhPerMin: newAvgKwh,
      stdDevKwhPerMin: newStdDevKwh,
      sampleCount: newSamples,
      avgMinutes: newAvgMin,
      stdDevMinutes: newStdDevMin,
      m2KwhPerMin: newM2Kwh,
      m2Minutes: newM2Min
    }
  })
}

async function upsertGroupProfile (params: {
  systemId: string
  clinicId: string
  equipmentId: string
  servicesHash: string
  servicesJson: string[]
  hourBucket: number
  kwh: number
  minutes: number
}) {
  const { systemId, clinicId, equipmentId, servicesHash, servicesJson, hourBucket, kwh, minutes } = params
  const key = { clinicId, equipmentId, servicesHash, hourBucket }
  const profile = await prisma.serviceGroupEnergyProfile.findFirst({ where: key })
  if (!profile) {
    await prisma.serviceGroupEnergyProfile.create({
      data: {
        id: crypto.randomUUID(),
        systemId,
        clinicId,
        equipmentId,
        servicesHash,
        services: servicesJson as any,
        hourBucket,
        meanKwh: kwh,
        stdDevKwh: 0,
        meanMinutes: minutes,
        stdDevMinutes: 0,
        samples: 1,
        m2: 0
      }
    })
    return
  }
  const newSamples = profile.samples + 1
  const newMeanKwh = (profile.meanKwh * profile.samples + kwh) / newSamples
  const newMeanMin = (profile.meanMinutes * profile.samples + minutes) / newSamples
  await prisma.serviceGroupEnergyProfile.update({
    where: { id: profile.id },
    data: {
      meanKwh: newMeanKwh,
      meanMinutes: newMeanMin,
      samples: newSamples
    }
  })
} 