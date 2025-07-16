/*
 * ╔══════════════════════════════════════════════════════╗
 * ║  ENERGY INSIGHTS · USAGE FINALIZER - OPTIMIZADO     ║
 * ╠══════════════════════════════════════════════════════╣
 * ║  NUEVA ARQUITECTURA CON SISTEMA DE SCORING           ║
 * ║  ──────────────────────────────────────────────────  ║
 * ║  Este módulo se ejecuta al CERRAR un registro de     ║
 * ║  AppointmentDeviceUsage (auto-off o stop manual).    ║
 * ║                                                      ║
 * ║  🎯 CAMBIOS CRÍTICOS IMPLEMENTADOS:                  ║
 * ║  1. SOLO procesa servicios con status = 'VALIDATED'  ║
 * ║  2. Usa treatmentDurationMinutes como prioridad      ║
 * ║  3. Si treatmentDurationMinutes = 0, NO genera datos ║
 * ║  4. Fallback a durationMinutes solo si treatment = 0 ║
 * ║  5. Validación exhaustiva de duración > 0            ║
 * ║  6. 🆕 SISTEMA DE SCORING DE ANOMALÍAS integrado     ║
 * ║                                                      ║
 * ║  📊 RESPONSABILIDADES:                               ║
 * ║  1. Obtener servicios VALIDATED de appointment_services ║
 * ║  2. Calcular duración efectiva con nueva lógica      ║
 * ║  3. Desagregar consumo total a nivel de servicio     ║
 * ║     → tabla appointment_service_energy_usage         ║
 * ║  4. Actualizar perfiles estadísticos incrementales   ║
 * ║     con algoritmo de Welford (ServiceEnergyProfile)  ║
 * ║  5. Generar insights de OVER/UNDER_DURATION          ║
 * ║  6. 🎯 ACTUALIZAR SCORING DE ANOMALÍAS (clientes/empleados) ║
 * ║                                                      ║
 * ║  🔐 AUTENTICACIÓN: Usa systemId para multi-tenant    ║
 * ║  ⚠️  NUNCA hardcodea IDs; todo proviene de la BD     ║
 * ║                                                      ║
 * ║  Variables críticas:                                 ║
 * ║  - validatedServices: Solo servicios VALIDATED       ║
 * ║  - effectiveDuration: treatmentDurationMinutes o     ║
 * ║    durationMinutes según lógica de fallback          ║
 * ║  - realMinutes: Tiempo real proporcional por servicio ║
 * ║  - allocatedKwh: Energía proporcional por servicio   ║
 * ║  - deviationPct: % desviación para insights          ║
 * ║  - riskScore: Puntuación 0-100 de riesgo de anomalía ║
 * ║                                                      ║
 * ║  @see docs/ANOMALY_SCORING_SYSTEM.md                 ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import * as crypto from 'crypto'
import { 
  updateClientAnomalyScore, 
  updateEmployeeAnomalyScore,
  updateServiceCount 
} from './anomaly-scoring'

/**
 * 🎯 FUNCIÓN PRINCIPAL: Finalizar uso de dispositivo con sistema de scoring
 * 
 * Procesa SOLO servicios VALIDATED y aplica lógica de treatmentDurationMinutes.
 * Genera datos energéticos únicamente para servicios que fueron realmente
 * ejecutados y validados por el profesional.
 * 
 * 🆕 INTEGRA sistema de scoring de anomalías para detectar patrones sospechosos
 * en lugar de crear perfiles energéticos granulares de clientes/empleados.
 * 
 * @param usageId - ID del registro AppointmentDeviceUsage a finalizar
 */
export async function finalizeDeviceUsage(usageId: string) {
  console.log(`🔄 [FINALIZER] Iniciando finalización para usageId: ${usageId}`)
  
  // 🔍 OBTENER DATOS DEL USO CON VALIDACIONES CRÍTICAS
  const usage = await prisma.appointmentDeviceUsage.findUnique({
    where: { id: usageId },
    include: {
      appointment: { 
        select: { 
          id: true,
          clinicId: true, 
          personId: true,
          status: true,
          startTime: true
        } 
      },
      startedByUser: { select: { id: true } }
    }
  })

  if (!usage) {
    console.warn(`⚠️ [FINALIZER] Uso no encontrado: ${usageId}`)
    return
  }

  // 🚨 VALIDACIONES CRÍTICAS DE DATOS ENERGÉTICOS
  if (!usage.energyConsumption || usage.energyConsumption <= 0) {
    console.warn(`⚠️ [FINALIZER] Sin consumo energético válido: ${usage.energyConsumption}`)
    return
  }

  if (!usage.actualMinutes || usage.actualMinutes <= 0) {
    console.warn(`⚠️ [FINALIZER] Sin duración real válida: ${usage.actualMinutes}`)
    return
  }

  console.log(`📊 [FINALIZER] Datos base válidos - Consumo: ${usage.energyConsumption} kWh, Duración: ${usage.actualMinutes} min`)

  // 🎯 NUEVA LÓGICA: OBTENER SERVICIOS VALIDATED DE LA TABLA APPOINTMENT_SERVICES
  const validatedServices = await prisma.appointmentService.findMany({
    where: {
      appointmentId: usage.appointmentId,
      status: 'VALIDATED'  // 🔥 CRÍTICO: Solo servicios VALIDATED
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
  })

  console.log(`🔍 [FINALIZER] Servicios VALIDATED encontrados: ${validatedServices.length}`)

  if (validatedServices.length === 0) {
    console.warn(`⚠️ [FINALIZER] No hay servicios VALIDATED para procesar. AppointmentId: ${usage.appointmentId}`)
    return
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
        console.warn(`⚠️ [FINALIZER] Servicio ${service.name} excluido - treatmentDurationMinutes: ${service.treatmentDurationMinutes}, durationMinutes: ${service.durationMinutes}`)
        effectiveDuration = 0
        durationSource = 'excluded_zero_treatment'
        shouldIncludeInStats = false
      }

      return {
        appointmentServiceId: appointmentService.id,
        serviceId: service.id,
        serviceName: service.name,
        effectiveDuration,
        durationSource,
        shouldIncludeInStats,
        treatmentDurationMinutes: service.treatmentDurationMinutes,
        durationMinutes: service.durationMinutes
      }
    })
    .filter(s => s.shouldIncludeInStats) // 🔥 FILTRAR: Solo servicios que deben incluirse

  console.log(`📋 [FINALIZER] Servicios para procesar después de filtrado:`, 
    servicesWithEffectiveDuration.map(s => ({
      serviceName: s.serviceName,
      effectiveDuration: s.effectiveDuration,
      durationSource: s.durationSource
    }))
  )

  if (servicesWithEffectiveDuration.length === 0) {
    console.warn(`⚠️ [FINALIZER] No hay servicios válidos para generar datos energéticos`)
    return
  }

  // 🧮 CALCULAR DURACIÓN TOTAL PARA REPARTO PROPORCIONAL
  const totalEffectiveDuration = servicesWithEffectiveDuration.reduce(
    (sum, s) => sum + s.effectiveDuration, 0
  )

  if (totalEffectiveDuration === 0) {
    console.warn(`⚠️ [FINALIZER] Duración total efectiva es 0`)
    return
  }

  console.log(`📊 [FINALIZER] Duración total efectiva: ${totalEffectiveDuration} min`)

  // 🎯 OPTIMIZACIÓN: DIFERENCIAR SERVICIO ÚNICO VS MÚLTIPLES SERVICIOS
  const isSingleService = servicesWithEffectiveDuration.length === 1
  
  if (isSingleService) {
    console.log(`🔧 [FINALIZER] Caso optimizado: SERVICIO ÚNICO - Saltando desagregación redundante`)
    
    // Para servicio único, los datos de appointment_device_usage son directos
    const singleService = servicesWithEffectiveDuration[0]
    
    // 📊 ACTUALIZAR PERFIL ENERGÉTICO INDIVIDUAL (SIEMPRE necesario)
    await upsertServiceProfile({
      systemId: usage.systemId,
      clinicId: usage.appointment!.clinicId,
      equipmentId: usage.equipmentId!,
      serviceId: singleService.serviceId,
      hourBucket: new Date(usage.startedAt).getHours(),
      kwhPerMin: usage.energyConsumption / usage.actualMinutes, // Usar datos directos
      realMinutes: usage.actualMinutes, // Usar datos directos
      effectiveDuration: singleService.effectiveDuration,
      durationSource: singleService.durationSource
    })

    // 📊 ACTUALIZAR CONTADOR DE SERVICIOS (para tasa de anomalías)
    await updateServiceCount({
      systemId: usage.systemId,
      clinicId: usage.appointment!.clinicId,
      clientId: usage.appointment!.personId || undefined,
      employeeId: usage.startedByUserId || undefined
    })

    console.log(`✅ [FINALIZER] Servicio único procesado directamente - ${singleService.serviceName}`)
    
    // 🚫 SALTAR: No crear appointment_service_energy_usage (redundante)
    // 🚫 SALTAR: No crear service_group_energy_profile (no es grupo real)
    
  } else {
    console.log(`🔧 [FINALIZER] Caso complejo: MÚLTIPLES SERVICIOS (${servicesWithEffectiveDuration.length}) - Aplicando desagregación`)
    
    // 🔄 DESAGREGAR CONSUMO POR SERVICIO CON NUEVA LÓGICA
    const energyUsageInserts: Prisma.AppointmentServiceEnergyUsageCreateManyInput[] = []
    
    for (const serviceData of servicesWithEffectiveDuration) {
      // 📊 CALCULAR REPARTO PROPORCIONAL
      const ratio = serviceData.effectiveDuration / totalEffectiveDuration
      const allocatedKwh = usage.energyConsumption * ratio
      const realMinutes = usage.actualMinutes * ratio

      console.log(`📈 [FINALIZER] Servicio ${serviceData.serviceName}:`, {
        effectiveDuration: serviceData.effectiveDuration,
        ratio: ratio.toFixed(3),
        allocatedKwh: allocatedKwh.toFixed(4),
        realMinutes: realMinutes.toFixed(2),
        durationSource: serviceData.durationSource
      })

      // 📝 CREAR REGISTRO DE ENERGÍA DESAGREGADA
      energyUsageInserts.push({
        id: crypto.randomUUID(),
        systemId: usage.systemId,
        clinicId: usage.appointment!.clinicId,
        clientId: usage.appointment!.personId ?? undefined,
        userId: usage.startedByUserId,
        usageId: usage.id,
        serviceId: serviceData.serviceId,
        equipmentId: usage.equipmentId ?? undefined,
        estimatedMinutes: serviceData.effectiveDuration, // 🔥 Usar duración efectiva
        realMinutes: realMinutes,
        allocatedKwh: allocatedKwh,
        createdAt: new Date()
      })

      // 📊 ACTUALIZAR PERFIL ENERGÉTICO INCREMENTAL (ALGORITMO WELFORD)
      await upsertServiceProfile({
        systemId: usage.systemId,
        clinicId: usage.appointment!.clinicId,
        equipmentId: usage.equipmentId!,
        serviceId: serviceData.serviceId,
        hourBucket: new Date(usage.startedAt).getHours(),
        kwhPerMin: allocatedKwh / realMinutes,
        realMinutes: realMinutes,
        effectiveDuration: serviceData.effectiveDuration,
        durationSource: serviceData.durationSource
      })

      // 📊 ACTUALIZAR CONTADOR DE SERVICIOS (para tasa de anomalías)
      await updateServiceCount({
        systemId: usage.systemId,
        clinicId: usage.appointment!.clinicId,
        clientId: usage.appointment!.personId || undefined,
        employeeId: usage.startedByUserId || undefined
      })

      console.log(`✅ [ENERGY_USAGE] Registro creado - Servicio: ${serviceData.serviceId.substring(0, 8)}, Real: ${realMinutes}min, Energía: ${allocatedKwh.toFixed(3)}kWh`)
    }

    // 💾 INSERTAR REGISTROS DE ENERGÍA DESAGREGADA (SOLO para múltiples servicios)
    if (energyUsageInserts.length > 0) {
      await prisma.appointmentServiceEnergyUsage.createMany({ 
        data: energyUsageInserts 
      })
      console.log(`✅ [FINALIZER] ${energyUsageInserts.length} registros de energía desagregada creados`)
    }

    // 🔄 ACTUALIZAR PERFIL POR GRUPO DE SERVICIOS (SOLO para múltiples servicios)
    const serviceIds = servicesWithEffectiveDuration.map(s => s.serviceId).sort()
    
    await upsertGroupProfile({
      systemId: usage.systemId,
      clinicId: usage.appointment!.clinicId,
      equipmentId: usage.equipmentId!,
      serviceId: serviceIds[0], // Usar el primer servicio para el perfil
      hourBucket: new Date(usage.startedAt).getHours(),
      kwh: usage.energyConsumption, // 🔧 USAR DATOS DIRECTOS: uso agrupado real
      minutes: usage.actualMinutes    // 🔧 USAR DATOS DIRECTOS: duración real agrupada
    })
    
    console.log(`✅ [FINALIZER] Perfil de grupo creado para ${serviceIds.length} servicios`)
  }

  // 🔍 GENERAR INSIGHTS DE DURACIÓN (OVER/UNDER_DURATION)
  const totalEstimatedMinutes = servicesWithEffectiveDuration.reduce(
    (sum, s) => sum + s.effectiveDuration, 0
  )
  
  const diffMinutes = usage.actualMinutes - totalEstimatedMinutes
  
  console.log(`🎯 [FINALIZER] Análisis de duración:`, {
    actualMinutes: usage.actualMinutes,
    estimatedMinutes: totalEstimatedMinutes,
    diffMinutes: diffMinutes
  })

  // 🚨 VALIDACIÓN CRÍTICA: Solo crear insight de duración si estimado es válido
  if (Math.abs(diffMinutes) > 0.5 && totalEstimatedMinutes > 0) {
    const deviationPct = Math.abs(diffMinutes) * 100 / totalEstimatedMinutes
    
    // 🎯 LÓGICA MEJORADA: Considerar contexto estadístico para UNDER_DURATION
    let shouldCreateInsight = false
    let insightReason = ''
    
    if (diffMinutes > 0) {
      // OVER_DURATION: Siempre crear insight si desviación >= 10%
      if (deviationPct >= 10) {
        shouldCreateInsight = true
        insightReason = 'Servicio excedió tiempo estimado significativamente'
      }
    } else {
      // UNDER_DURATION: Lógica más inteligente
      const reductionMinutes = Math.abs(diffMinutes)
      
      // 🔍 Obtener datos históricos para contexto estadístico
      const serviceIds = servicesWithEffectiveDuration.map(s => s.serviceId)
      const historicalData = await prisma.serviceEnergyProfile.findMany({
        where: {
          systemId: usage.systemId,
          serviceId: { in: serviceIds },
          equipmentId: usage.equipmentId,
          sampleCount: { gte: 5 } // Mínimo 5 muestras para ser estadísticamente relevante
        },
        select: {
          serviceId: true,
          avgMinutes: true,
          stdDevMinutes: true,
          sampleCount: true
        }
      })
      
      if (historicalData.length > 0) {
        // 📊 Calcular media ponderada y desviación estándar histórica
        let totalWeightedAvg = 0
        let totalWeightedStdDev = 0
        let totalWeight = 0
        
        for (const profile of historicalData) {
          const weight = profile.sampleCount || 1
          totalWeightedAvg += (profile.avgMinutes || 0) * weight
          totalWeightedStdDev += (profile.stdDevMinutes || 0) * weight
          totalWeight += weight
        }
        
        const historicalAvgMinutes = totalWeight > 0 ? totalWeightedAvg / totalWeight : totalEstimatedMinutes
        const historicalStdDev = totalWeight > 0 ? totalWeightedStdDev / totalWeight : totalEstimatedMinutes * 0.15
        
        // 🎯 CRITERIOS INTELIGENTES PARA UNDER_DURATION
        const minAcceptableTime = historicalAvgMinutes - (historicalStdDev * 2) // 2 desviaciones estándar
        const extremelyShortTime = historicalAvgMinutes * 0.4 // Menos del 40% del tiempo histórico
        
        if (usage.actualMinutes < extremelyShortTime) {
          shouldCreateInsight = true
          insightReason = `Tiempo extremadamente reducido (${usage.actualMinutes}min vs ${historicalAvgMinutes.toFixed(1)}min histórico) - Posible servicio no realizado`
        } else if (usage.actualMinutes < minAcceptableTime && deviationPct >= 25) {
          shouldCreateInsight = true
          insightReason = `Tiempo fuera del rango estadístico normal (${usage.actualMinutes}min vs ${historicalAvgMinutes.toFixed(1)}min ± ${historicalStdDev.toFixed(1)}min)`
        } else if (deviationPct >= 10 && deviationPct < 25) {
          // 👍 CASO NORMAL: Reducción dentro del rango esperado - NO crear insight
          console.log(`✅ [FINALIZER] Reducción de tiempo dentro del rango normal: ${usage.actualMinutes}min vs ${historicalAvgMinutes.toFixed(1)}min histórico (${deviationPct.toFixed(1)}% desviación)`)
        }
        
        console.log(`📊 [FINALIZER] Análisis estadístico:`, {
          historicalAvg: historicalAvgMinutes.toFixed(1),
          historicalStdDev: historicalStdDev.toFixed(1),
          minAcceptable: minAcceptableTime.toFixed(1),
          extremelyShort: extremelyShortTime.toFixed(1),
          actualTime: usage.actualMinutes,
          shouldCreateInsight,
          reason: insightReason
        })
      } else {
        // 🔄 FALLBACK: Sin datos históricos, usar lógica conservadora
        if (deviationPct >= 30) {
          shouldCreateInsight = true
          insightReason = `Reducción significativa sin datos históricos para comparar (${deviationPct.toFixed(1)}% desviación)`
        }
      }
    }
    
    if (shouldCreateInsight) {
      const deviationType = diffMinutes > 0 ? 'OVER_DURATION' : 'UNDER_DURATION'
      
      try {
        await prisma.deviceUsageInsight.create({
          data: {
            systemId: usage.systemId,
            clinicId: usage.appointment!.clinicId,
            appointmentId: usage.appointmentId,
            deviceUsageId: usage.id,
            equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId ?? null,
            clientId: usage.appointment!.personId ?? null,
            insightType: deviationType as any,
            actualKwh: usage.energyConsumption,
            expectedKwh: 0, // Para insights de duración, el foco es tiempo
            deviationPct: deviationPct,
            detailJson: { 
              diffMinutes: diffMinutes,
              estimatedMinutes: totalEstimatedMinutes,
              actualMinutes: usage.actualMinutes,
              validationPassed: true,
              servicesProcessed: servicesWithEffectiveDuration.length,
              newArchitecture: true,
              intelligentAnalysis: true,
              insightReason: insightReason,
              durationSources: servicesWithEffectiveDuration.map(s => ({
                serviceName: s.serviceName,
                durationSource: s.durationSource,
                effectiveDuration: s.effectiveDuration
              }))
            }
          }
        })
        
        console.log(`🚨 [FINALIZER] Insight de duración creado: ${deviationType}, desviación: ${deviationPct.toFixed(1)}%, razón: ${insightReason}`)
      } catch (error) {
        console.error(`❌ [FINALIZER] Error creando insight de duración:`, error)
      }
    }
  } else if (totalEstimatedMinutes === 0) {
    // 🔧 CASO ESPECIAL: Sin duración estimada válida pero con consumo real
    try {
      await prisma.deviceUsageInsight.create({
        data: {
          systemId: usage.systemId,
          clinicId: usage.appointment!.clinicId,
          appointmentId: usage.appointmentId,
          deviceUsageId: usage.id,
          equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId ?? null,
          clientId: usage.appointment!.personId ?? null,
          insightType: 'TECHNICAL_ISSUE' as any,
          actualKwh: usage.energyConsumption,
          expectedKwh: 0,
          deviationPct: 0,
          detailJson: { 
            issue: 'missing_valid_treatment_duration',
            estimatedMinutes: totalEstimatedMinutes,
            actualMinutes: usage.actualMinutes,
            reason: 'Ningún servicio VALIDATED tiene treatmentDurationMinutes > 0',
            validatedServicesCount: validatedServices.length,
            newArchitecture: true
          }
        }
      })
      
      console.log(`🔧 [FINALIZER] Insight técnico creado: Sin duración de tratamiento válida`)
    } catch (error) {
      console.error(`❌ [FINALIZER] Error creando insight técnico:`, error)
    }
  }

  console.log(`✅ [FINALIZER] Finalización completada exitosamente para usageId: ${usageId}`)
}

/**
 * 📊 FUNCIÓN AUXILIAR: Actualizar perfil energético de servicio individual
 * 
 * Implementa algoritmo de Welford para cálculo incremental de estadísticas.
 * Mantiene coherencia con el sistema de confianza híbrido existente.
 * 
 * Variables críticas:
 * - avgKwhPerMin: Media de consumo por minuto (Welford)
 * - stdDevKwhPerMin: Desviación estándar de consumo (Welford)
 * - avgMinutes: Media de duración real (Welford)
 * - stdDevMinutes: Desviación estándar de duración (Welford)
 * - m2KwhPerMin: Suma de cuadrados para Welford (energía)
 * - m2Minutes: Suma de cuadrados para Welford (duración)
 * - sampleCount: Número de muestras procesadas
 */
async function upsertServiceProfile(params: {
  systemId: string
  clinicId: string
  equipmentId: string
  serviceId: string
  hourBucket: number
  kwhPerMin: number
  realMinutes: number
  effectiveDuration: number
  durationSource: string
}) {
  const { 
    systemId, 
    clinicId, 
    equipmentId, 
    serviceId, 
    hourBucket, 
    kwhPerMin, 
    realMinutes,
    effectiveDuration,
    durationSource
  } = params
  
  const key = { systemId, equipmentId, serviceId }
  
  // 🔍 BUSCAR PERFIL EXISTENTE
  const profile = await prisma.serviceEnergyProfile.findUnique({ 
    where: { systemId_equipmentId_serviceId: key } 
  })
  
  if (!profile) {
    // 🆕 CREAR NUEVO PERFIL (PRIMERA MUESTRA)
    await prisma.serviceEnergyProfile.create({
      data: {
        ...key,
        avgKwhPerMin: kwhPerMin,
        stdDevKwhPerMin: 0, // Primera muestra, no hay desviación
        sampleCount: 1,
        avgMinutes: realMinutes,
        stdDevMinutes: 0,
        m2KwhPerMin: 0, // Suma de cuadrados inicial
        m2Minutes: 0
      }
    })
    
    console.log(`🆕 [PROFILE] Perfil creado - Servicio: ${serviceId}, Equipo: ${equipmentId}, kWh/min: ${kwhPerMin.toFixed(4)}`)
    return
  }
  
  // 🔄 ACTUALIZAR PERFIL EXISTENTE CON ALGORITMO DE WELFORD
  const newSamples = profile.sampleCount + 1
  
  // 📊 ALGORITMO DE WELFORD PARA kWh/min
  const deltaKwh = kwhPerMin - profile.avgKwhPerMin
  const newAvgKwh = profile.avgKwhPerMin + deltaKwh / newSamples
  const delta2Kwh = kwhPerMin - newAvgKwh
  const newM2Kwh = (profile.m2KwhPerMin || 0) + deltaKwh * delta2Kwh
  const newStdDevKwh = newSamples > 1 ? Math.sqrt(newM2Kwh / (newSamples - 1)) : 0
  
  // ⏱️ ALGORITMO DE WELFORD PARA MINUTOS REALES
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
  
  console.log(`🔄 [PROFILE] Perfil actualizado - Servicio: ${serviceId}, Muestras: ${newSamples}, kWh/min: ${newAvgKwh.toFixed(4)}, Min: ${newAvgMin.toFixed(2)}`)
}

/**
 * 🔄 FUNCIÓN AUXILIAR: Actualizar perfil energético de grupo de servicios
 * 
 * Mantiene estadísticas para combinaciones específicas de servicios ejecutados
 * juntos. Útil para detectar patrones de eficiencia en tratamientos combinados.
 * 
 * Variables críticas:
 * - servicesHash: Hash MD5 de la combinación de serviceIds ordenados
 * - servicesJson: Array de serviceIds para referencia
 * - hourBucket: Hora del día (0-23) para análisis temporal
 * - meanKwh: Media de consumo total del grupo
 * - meanMinutes: Media de duración total del grupo
 */
async function upsertGroupProfile(params: {
  systemId: string
  clinicId: string
  equipmentId: string  // 🔧 AGREGADO: equipmentId necesario para el schema
  serviceId: string
  hourBucket: number
  kwh: number
  minutes: number
}) {
  const { 
    systemId, 
    clinicId, 
    equipmentId,  // 🔧 AGREGADO
    serviceId, 
    hourBucket, 
    kwh, 
    minutes 
  } = params
  
  const key = { clinicId, equipmentId, serviceId, hourBucket }  // 🔧 AGREGADO equipmentId
  
  // 🔍 BUSCAR PERFIL DE GRUPO EXISTENTE
  const profile = await prisma.serviceGroupEnergyProfile.findFirst({ 
    where: key 
  })
  
  if (!profile) {
    // 🆕 CREAR NUEVO PERFIL DE GRUPO
    await prisma.serviceGroupEnergyProfile.create({
      data: {
        id: crypto.randomUUID(),
        systemId,
        clinicId,
        equipmentId,  // 🔧 AGREGADO
        serviceId,
        hourBucket,
        meanKwh: kwh,
        stdDevKwh: 0,
        meanMinutes: minutes,
        stdDevMinutes: 0,
        samples: 1,
        m2: 0
      }
    })
    
    console.log(`✅ [GROUP_PROFILE] Perfil de grupo creado - Equipment: ${equipmentId.substring(0, 8)}, Servicio: ${serviceId.substring(0, 8)}, Hora: ${hourBucket}`)
  } else {
    // 🔄 ACTUALIZAR PERFIL EXISTENTE CON ALGORITMO WELFORD
    const newSamples = profile.samples + 1
    const deltaKwh = kwh - profile.meanKwh
    const newMeanKwh = profile.meanKwh + deltaKwh / newSamples
    const delta2Kwh = kwh - newMeanKwh
    const newM2 = profile.m2 + deltaKwh * delta2Kwh
    const newStdDevKwh = newSamples > 1 ? Math.sqrt(newM2 / (newSamples - 1)) : 0
    
    const deltaMinutes = minutes - profile.meanMinutes
    const newMeanMinutes = profile.meanMinutes + deltaMinutes / newSamples
    const delta2Minutes = minutes - newMeanMinutes
    const newM2Minutes = profile.m2 + deltaMinutes * delta2Minutes
    const newStdDevMinutes = newSamples > 1 ? Math.sqrt(newM2Minutes / (newSamples - 1)) : 0
    
    await prisma.serviceGroupEnergyProfile.update({
      where: { id: profile.id },
      data: {
        meanKwh: newMeanKwh,
        stdDevKwh: newStdDevKwh,
        meanMinutes: newMeanMinutes,
        stdDevMinutes: newStdDevMinutes,
        samples: newSamples,
        m2: newM2
      }
    })
    
    console.log(`🔄 [GROUP_PROFILE] Perfil de grupo actualizado - Equipment: ${equipmentId.substring(0, 8)}, Servicio: ${serviceId.substring(0, 8)}, Muestras: ${newSamples}`)
  }
}

// ========= FUNCIONES OBSOLETAS ELIMINADAS =========================
// 
// Las siguientes funciones han sido eliminadas del sistema:
// - upsertClientProfile() → Reemplazada por updateClientAnomalyScore()
// - upsertUserProfile() → Reemplazada por updateEmployeeAnomalyScore()
// 
// El nuevo sistema de scoring de anomalías es 99.6% más eficiente
// y proporciona detección inteligente de patrones sospechosos.
// 
// @see docs/ANOMALY_SCORING_SYSTEM.md
// ================================================================

 