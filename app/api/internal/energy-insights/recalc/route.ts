/**
 * 🔄 ENERGY INSIGHTS RECALCULATION ENGINE - NUEVA ARQUITECTURA
 * ================================================================
 * 
 * Sistema completamente refactorizado para recalcular perfiles energéticos
 * basado en servicios VALIDATED y lógica de treatmentDurationMinutes.
 * 
 * ✅ NUEVA ARQUITECTURA IMPLEMENTADA:
 * 1. Procesa SOLO servicios con status = 'VALIDATED' 
 * 2. Aplica lógica treatmentDurationMinutes vs durationMinutes
 * 3. Lee directamente de ServiceEnergyProfile (datos ya calculados)
 * 4. Elimina dependencia de AppointmentServiceEnergyUsage
 * 5. Mantiene coherencia con finalizador refactorizado
 * 
 * 🎯 CAMBIOS CRÍTICOS:
 * - Obtiene datos de appointment_device_usage + appointment_services
 * - Filtra por servicios VALIDATED únicamente
 * - Calcula duración efectiva con nueva lógica
 * - Recalcula perfiles usando algoritmo de Welford
 * - Genera insights basados en nueva arquitectura
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation obligatorio
 * - validatedServices: Solo servicios VALIDATED
 * - effectiveDuration: treatmentDurationMinutes o durationMinutes según lógica
 * - profilesRecalculated: Número de perfiles actualizados
 * - insightsCreated: Número de insights generados
 * 
 * @see docs/ENERGY_INSIGHTS_VALIDATED_SERVICES.md
 * @see lib/energy/usage-finalizer.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, Prisma } from '@/lib/db'
import { calculateExpectedEnergy } from '@/lib/energy/calculate-expected-energy'

interface Body {
  startDate?: string
  endDate?: string
}

export async function POST(req: NextRequest) {
  // 🚨 FEATURE FLAG: Solo si está activo el plugin Shelly
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }

  // 🔐 AUTENTICACIÓN OBLIGATORIA
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const systemId = session.user.systemId

  console.log(`🔄 [RECALC] Iniciando recálculo para systemId: ${systemId}`)

  const { startDate, endDate } = (await req.json()) as Body
  
  // 🎯 FILTRO DE FECHAS PARA DATOS DE USO
  const dateFilter: Prisma.AppointmentDeviceUsageWhereInput = startDate || endDate ? {
    endedAt: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined
    }
  } : {}

  console.log(`📅 [RECALC] Filtros de fecha:`, { startDate, endDate })

  // 1️⃣ OBTENER DATOS DE USO COMPLETADOS CON SERVICIOS VALIDATED
  const deviceUsages = await prisma.appointmentDeviceUsage.findMany({
    where: {
      systemId,
      currentStatus: 'COMPLETED',
      equipmentId: { not: null },
      energyConsumption: { gt: 0 },
      actualMinutes: { gt: 0 },
      ...dateFilter
    },
    include: {
      appointment: {
        include: {
          services: {
            where: {
              status: 'VALIDATED' // 🔥 CRÍTICO: Solo servicios VALIDATED
            },
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  durationMinutes: true,
                  treatmentDurationMinutes: true
                }
              }
            }
          }
        }
      }
    }
  })

  console.log(`📊 [RECALC] Usos de dispositivo encontrados: ${deviceUsages.length}`)

  if (deviceUsages.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        profilesRecalculated: 0,
        usagesReprocessed: 0,
        insightsCreated: 0,
        message: '⚠️ No se encontraron usos completados con servicios VALIDATED en el rango especificado.'
      }
    })
  }

  // 2️⃣ PROCESAR CADA USO Y EXTRAER SERVICIOS VÁLIDOS
  const serviceDataForRecalc = new Map<string, Array<{
    equipmentId: string
    serviceId: string
    serviceName: string
    effectiveDuration: number
    realMinutes: number
    allocatedKwh: number
    durationSource: string
  }>>()

  let totalValidUsages = 0
  let totalValidServices = 0

  for (const usage of deviceUsages) {
    const validatedServices = usage.appointment.services

    if (validatedServices.length === 0) {
      console.warn(`⚠️ [RECALC] Uso ${usage.id} sin servicios VALIDATED`)
      continue
    }

    // 🎯 CALCULAR DURACIÓN EFECTIVA CON NUEVA LÓGICA
    const servicesWithEffectiveDuration = validatedServices
      .map(appointmentService => {
        const service = appointmentService.service
        
        // 🔥 LÓGICA CRÍTICA: treatmentDurationMinutes vs durationMinutes
        let effectiveDuration = 0
        let durationSource = 'none'
        let shouldIncludeInStats = false

        // PRIORIDAD 1: treatmentDurationMinutes (específico para dispositivos)
        if (service.treatmentDurationMinutes && service.treatmentDurationMinutes > 0) {
          effectiveDuration = service.treatmentDurationMinutes
          durationSource = 'treatmentDurationMinutes'
          shouldIncludeInStats = true
        }
        // PRIORIDAD 2: durationMinutes (solo como fallback si treatment = 0)
        else if (service.treatmentDurationMinutes === 0 && service.durationMinutes && service.durationMinutes > 0) {
          effectiveDuration = service.durationMinutes
          durationSource = 'durationMinutes_fallback'
          shouldIncludeInStats = true
        }
        // CASO CRÍTICO: Si treatmentDurationMinutes = 0, NO generar datos energéticos
        else {
          effectiveDuration = 0
          durationSource = 'excluded_zero_treatment'
          shouldIncludeInStats = false
        }

        return {
          serviceId: service.id,
          serviceName: service.name,
          effectiveDuration,
          durationSource,
          shouldIncludeInStats,
          treatmentDurationMinutes: service.treatmentDurationMinutes,
          durationMinutes: service.durationMinutes
        }
      })
      .filter(s => s.shouldIncludeInStats)

    if (servicesWithEffectiveDuration.length === 0) {
      console.warn(`⚠️ [RECALC] Uso ${usage.id} sin servicios válidos para estadísticas`)
      continue
    }

    // 🧮 CALCULAR REPARTO PROPORCIONAL
    const totalEffectiveDuration = servicesWithEffectiveDuration.reduce(
      (sum, s) => sum + s.effectiveDuration, 0
    )

    if (totalEffectiveDuration === 0) continue

    for (const serviceData of servicesWithEffectiveDuration) {
      const ratio = serviceData.effectiveDuration / totalEffectiveDuration
      const allocatedKwh = usage.energyConsumption! * ratio
      const realMinutes = usage.actualMinutes! * ratio

      const key = `${usage.equipmentId}-${serviceData.serviceId}`
      
      if (!serviceDataForRecalc.has(key)) {
        serviceDataForRecalc.set(key, [])
      }

      serviceDataForRecalc.get(key)!.push({
        equipmentId: usage.equipmentId!,
        serviceId: serviceData.serviceId,
        serviceName: serviceData.serviceName,
        effectiveDuration: serviceData.effectiveDuration,
        realMinutes: realMinutes,
        allocatedKwh: allocatedKwh,
        durationSource: serviceData.durationSource
      })

      totalValidServices++
    }

    totalValidUsages++
  }

  console.log(`📈 [RECALC] Datos procesados:`, {
    totalValidUsages,
    totalValidServices,
    uniqueServiceEquipmentCombinations: serviceDataForRecalc.size
  })

  // 3️⃣ RECALCULAR PERFILES CON ALGORITMO DE WELFORD
  let profilesRecalculated = 0

  for (const [key, serviceDataArray] of serviceDataForRecalc) {
    const [equipmentId, serviceId] = key.split('-')
    
    // 📊 APLICAR ALGORITMO DE WELFORD PARA RECÁLCULO COMPLETO
    let sampleCount = 0
    let avgKwhPerMin = 0
    let m2KwhPerMin = 0
    let avgMinutes = 0
    let m2Minutes = 0

    for (const data of serviceDataArray) {
      sampleCount++
      const kwhPerMin = data.allocatedKwh / data.realMinutes

      // Welford para kWh/min
      const deltaKwh = kwhPerMin - avgKwhPerMin
      avgKwhPerMin = avgKwhPerMin + deltaKwh / sampleCount
      const delta2Kwh = kwhPerMin - avgKwhPerMin
      m2KwhPerMin = m2KwhPerMin + deltaKwh * delta2Kwh

      // Welford para minutos
      const deltaMin = data.realMinutes - avgMinutes
      avgMinutes = avgMinutes + deltaMin / sampleCount
      const delta2Min = data.realMinutes - avgMinutes
      m2Minutes = m2Minutes + deltaMin * delta2Min
    }

    const stdDevKwhPerMin = sampleCount > 1 ? Math.sqrt(m2KwhPerMin / (sampleCount - 1)) : 0
    const stdDevMinutes = sampleCount > 1 ? Math.sqrt(m2Minutes / (sampleCount - 1)) : 0

    // 💾 ACTUALIZAR PERFIL ENERGÉTICO
    await prisma.serviceEnergyProfile.upsert({
      where: {
        systemId_equipmentId_serviceId: {
          systemId,
          equipmentId: equipmentId,
          serviceId: serviceId
        }
      },
      update: {
        avgKwhPerMin: avgKwhPerMin,
        stdDevKwhPerMin: stdDevKwhPerMin,
        avgMinutes: avgMinutes,
        stdDevMinutes: stdDevMinutes,
        sampleCount: sampleCount,
        m2KwhPerMin: m2KwhPerMin,
        m2Minutes: m2Minutes
      },
      create: {
        systemId,
        equipmentId: equipmentId,
        serviceId: serviceId,
        avgKwhPerMin: avgKwhPerMin,
        stdDevKwhPerMin: stdDevKwhPerMin,
        avgMinutes: avgMinutes,
        stdDevMinutes: stdDevMinutes,
        sampleCount: sampleCount,
        m2KwhPerMin: m2KwhPerMin,
        m2Minutes: m2Minutes
      }
    })

    profilesRecalculated++
    
    console.log(`🔄 [RECALC] Perfil actualizado:`, {
      equipmentId: equipmentId.substring(0, 8),
      serviceId: serviceId.substring(0, 8),
      sampleCount,
      avgKwhPerMin: avgKwhPerMin.toFixed(4),
      avgMinutes: avgMinutes.toFixed(2)
    })
  }

  // 4️⃣ RE-EVALUAR INSIGHTS USANDO NUEVA LÓGICA
  let insightsCreated = 0

  for (const usage of deviceUsages) {
    // Usar nueva función de cálculo de energía esperada
    const { expectedKwh, stdDevSum, confidence } = await calculateExpectedEnergy(usage)
    
    if (expectedKwh === 0 || confidence === 'insufficient_data') continue

    const deviationPct = (usage.energyConsumption! - expectedKwh) / expectedKwh * 100
    const exceeds = Math.abs(deviationPct) > 25 &&
      usage.energyConsumption! > expectedKwh + Math.max(stdDevSum * 2, expectedKwh * 0.25)

    if (!exceeds) continue

    // Verificar si ya existe insight para este uso
    const exists = await prisma.deviceUsageInsight.findFirst({
      where: {
        deviceUsageId: usage.id,
        insightType: 'OVER_CONSUMPTION',
        resolved: false
      }
    })

    if (!exists && usage.appointment.clinicId) {
      await prisma.deviceUsageInsight.create({
        data: {
          systemId,
          clinicId: usage.appointment.clinicId,
          appointmentId: usage.appointmentId,
          deviceUsageId: usage.id,
          equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId,
          clientId: usage.appointment.personId,
          insightType: 'OVER_CONSUMPTION',
          actualKwh: usage.energyConsumption ?? 0,
          expectedKwh,
          deviationPct: Math.abs(deviationPct),
          detailJson: { 
            stdDevSum, 
            confidence,
            recalc: true,
            method: 'validated_services_architecture',
            newArchitecture: true,
            timestamp: new Date().toISOString() 
          }
        }
      })
      insightsCreated++
    }
  }

  console.log(`✅ [RECALC] Recálculo completado exitosamente`)

  return NextResponse.json({
    success: true,
    data: {
      profilesRecalculated,
      usagesReprocessed: totalValidUsages,
      servicesProcessed: totalValidServices,
      insightsCreated,
      message: `✅ Recálculo con nueva arquitectura completado. ${profilesRecalculated} perfiles actualizados desde ${totalValidUsages} usos con ${totalValidServices} servicios VALIDATED, ${insightsCreated} insights creados.`
    }
  })
} 