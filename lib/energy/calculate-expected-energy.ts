/**
 * 🧠 ENERGY INSIGHTS - SISTEMA INTELIGENTE DE CÁLCULO DE ESTIMADOS
 * ==================================================================
 * 
 * Sistema avanzado para calcular energía esperada con múltiples estrategias:
 * 1. Análisis histórico por perfiles estadísticos
 * 2. Lógica de fallback para servicios sin treatmentDurationMinutes
 * 3. Validación estadística con mínimo de muestras
 * 4. Documentación completa para futura integración con agente IA
 * 
 * 🤖 PREPARACIÓN PARA AGENTE IA:
 * - Contexto completo de cada decisión algorítmica
 * - Metadatos de confianza y métodos de cálculo
 * - Trazabilidad de fuentes de datos y fallbacks
 * - Estructura de datos optimizada para aprendizaje automático
 * 
 * 📊 ALGORITMO DE WELFORD IMPLEMENTADO:
 * - Cálculo incremental de media y desviación estándar
 * - Validación estadística con mínimo 5 muestras
 * - Fallback al 10% del promedio si σ=0
 * 
 * 🔄 LÓGICA DE FALLBACK CRÍTICA:
 * - treatmentDurationMinutes (duración específica del dispositivo)
 * - durationMinutes (duración total de la cita) como fallback
 * - Documentación del método usado para análisis posterior
 * 
 * Variables críticas:
 * - systemId: Aislamiento multi-tenant
 * - equipmentId: Específico por tipo de equipo
 * - serviceId: Específico por tipo de servicio
 * - effectiveTreatmentTime: Duración real usada (con fallback)
 * - calculationMethod: Método usado para trazabilidad IA
 * 
 * @see docs/ENERGY_INSIGHTS_CALCULATION_ENGINE.md
 */

import { prisma } from '@/lib/db'
import type { AppointmentDeviceUsage, Prisma } from '@prisma/client'

export interface ExpectedEnergyResult {
  expectedKwh: number
  stdDevSum: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data'
  validProfiles: number
  totalProfiles: number
  // 🤖 NUEVOS CAMPOS PARA AGENTE IA
  calculationMethod: 'statistical_profile' | 'fallback_duration' | 'theoretical_estimate'
  fallbackUsed: boolean
  dataQuality: {
    minSamples: number
    avgSamples: number
    profileCoverage: number // % de servicios con perfil válido
    confidenceScore: number // 0-1 score para ML
  }
  contextMetadata: {
    servicesAnalyzed: Array<{
      serviceId: string
      serviceName?: string
      effectiveTreatmentTime: number
      hasStatisticalProfile: boolean
      sampleCount: number
      fallbackReason?: string
    }>
    equipmentId: string
    equipmentName?: string
    timestamp: string
  }
}

/**
 * 🎯 FUNCIÓN PRINCIPAL: Calcula energía esperada con sistema inteligente
 * 
 * Implementa múltiples estrategias de cálculo según disponibilidad de datos:
 * 1. Perfiles estadísticos (preferido)
 * 2. Fallback a duración configurada
 * 3. Estimación teórica básica
 * 
 * @param usage - Registro de uso del dispositivo
 * @returns Resultado completo con metadatos para IA
 */
export async function calculateExpectedEnergy(
  usage: AppointmentDeviceUsage
): Promise<ExpectedEnergyResult> {
  const deviceData = (usage.deviceData as Prisma.JsonValue) as any
  const systemId = usage.systemId
  const equipmentId = usage.equipmentId

  // 🔍 EXTRAER SERVICIOS CON VALIDACIÓN
  const services: { serviceId: string; durationMinutes: number }[] =
    deviceData?.servicesDetails ?? []

  if (!Array.isArray(services) || services.length === 0) {
    return createInsufficientDataResult('no_services_found', equipmentId)
  }

  // 🔍 OBTENER DATOS COMPLETOS DE SERVICIOS PARA FALLBACK
  const serviceIds = services.map(s => s.serviceId)
  const serviceDetails = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      treatmentDurationMinutes: true
    }
  })

  // 🔍 OBTENER PERFILES ESTADÍSTICOS
  const profiles = await prisma.serviceEnergyProfile.findMany({
    where: {
      systemId,
      serviceId: { in: serviceIds },
      equipmentId: equipmentId
    },
    include: {
      equipment: { select: { name: true } },
      service: { select: { name: true } }
    }
  })

  const profileMap = new Map<string, typeof profiles[0]>()
  profiles.forEach(p => profileMap.set(p.serviceId, p))

  // 🎯 ANÁLISIS INTELIGENTE POR SERVICIO
  let expectedKwh = 0
  let stdDevSum = 0
  let validProfiles = 0
  let totalSamples = 0
  let calculationMethod: ExpectedEnergyResult['calculationMethod'] = 'statistical_profile'
  let fallbackUsed = false
  
  const MIN_SAMPLES = 5
  const contextMetadata: ExpectedEnergyResult['contextMetadata'] = {
    servicesAnalyzed: [],
    equipmentId: equipmentId || 'unknown',
    equipmentName: profiles[0]?.equipment?.name || 'Desconocido',
    timestamp: new Date().toISOString()
  }

  // 🔄 PROCESAR CADA SERVICIO CON LÓGICA INTELIGENTE
  for (const svc of services) {
    const serviceDetail = serviceDetails.find(s => s.id === svc.serviceId)
    const profile = profileMap.get(svc.serviceId)
    
    // 🎯 CALCULAR DURACIÓN EFECTIVA CON FALLBACK
    const effectiveTreatmentTime = calculateEffectiveTreatmentTime(
      serviceDetail,
      svc.durationMinutes
    )
    
    let serviceAnalysis = {
      serviceId: svc.serviceId,
      serviceName: serviceDetail?.name || 'Desconocido',
      effectiveTreatmentTime,
      hasStatisticalProfile: false,
      sampleCount: 0,
      fallbackReason: undefined as string | undefined
    }

    // 🔍 ESTRATEGIA 1: USAR PERFIL ESTADÍSTICO SI DISPONIBLE
    if (profile && profile.sampleCount >= MIN_SAMPLES) {
      validProfiles++
      totalSamples += profile.sampleCount
      
      expectedKwh += effectiveTreatmentTime * profile.avgKwhPerMin
      
      // Manejo inteligente de stdDev = 0 (fallback al 10% del promedio)
      let effectiveStdDev = profile.stdDevKwhPerMin
      if (effectiveStdDev === 0 && profile.avgKwhPerMin > 0) {
        effectiveStdDev = profile.avgKwhPerMin * 0.1
        console.warn(`[ENERGY_AI] Perfil ${profile.serviceId} sin varianza, usando fallback σ: ${effectiveStdDev.toFixed(4)}`)
      }
      
      stdDevSum += effectiveTreatmentTime * effectiveStdDev
      
      serviceAnalysis.hasStatisticalProfile = true
      serviceAnalysis.sampleCount = profile.sampleCount
      
    } else {
      // 🔄 ESTRATEGIA 2: FALLBACK A ESTIMACIÓN TEÓRICA
      fallbackUsed = true
      calculationMethod = 'fallback_duration'
      
      // Estimación teórica básica: 3.5 kWh por hora para equipos láser
      const theoreticalKwhPerMin = 3.5 / 60 // ~0.058 kWh/min
      expectedKwh += effectiveTreatmentTime * theoreticalKwhPerMin
      stdDevSum += effectiveTreatmentTime * (theoreticalKwhPerMin * 0.2) // 20% de varianza
      
      serviceAnalysis.fallbackReason = profile 
        ? `Perfil con ${profile.sampleCount} muestras < ${MIN_SAMPLES} requeridas`
        : 'Sin perfil estadístico disponible'
      
      console.warn(`[ENERGY_AI] Fallback para servicio ${svc.serviceId}: ${serviceAnalysis.fallbackReason}`)
    }
    
    contextMetadata.servicesAnalyzed.push(serviceAnalysis)
  }

  // 🎯 DETERMINAR CONFIANZA INTELIGENTE
  const totalProfiles = services.length
  const profileCoverage = totalProfiles > 0 ? validProfiles / totalProfiles : 0
  
  let confidence: ExpectedEnergyResult['confidence']
  let confidenceScore: number
  
  if (validProfiles === 0) {
    confidence = 'insufficient_data'
    confidenceScore = 0.1
  } else if (profileCoverage >= 0.8) {
    confidence = 'high'
    confidenceScore = 0.9
  } else if (profileCoverage >= 0.5) {
    confidence = 'medium'
    confidenceScore = 0.6
  } else {
    confidence = 'low'
    confidenceScore = 0.3
  }

  // 🤖 PREPARAR RESULTADO COMPLETO PARA AGENTE IA
  return {
    expectedKwh,
    stdDevSum,
    confidence,
    validProfiles,
    totalProfiles,
    calculationMethod,
    fallbackUsed,
    dataQuality: {
      minSamples: MIN_SAMPLES,
      avgSamples: totalSamples > 0 ? Math.round(totalSamples / validProfiles) : 0,
      profileCoverage,
      confidenceScore
    },
    contextMetadata
  }
}

/**
 * 🎯 FUNCIÓN CRÍTICA: Calcula duración efectiva con fallback inteligente
 * 
 * Implementa la lógica central para resolver el problema de estimados = 0:
 * 1. Usar treatmentDurationMinutes si > 0 (duración específica del dispositivo)
 * 2. Fallback a durationMinutes (duración total de la cita)
 * 3. Fallback final a duración del servicio en deviceData
 * 
 * @param serviceDetail - Detalles del servicio desde BD
 * @param fallbackDuration - Duración desde deviceData como último recurso
 * @returns Duración efectiva en minutos
 */
function calculateEffectiveTreatmentTime(
  serviceDetail: any,
  fallbackDuration: number
): number {
  // 🎯 PRIORIDAD 1: treatmentDurationMinutes (específico para dispositivos)
  if (serviceDetail?.treatmentDurationMinutes && serviceDetail.treatmentDurationMinutes > 0) {
    return serviceDetail.treatmentDurationMinutes
  }
  
  // 🔄 PRIORIDAD 2: durationMinutes (duración total de la cita)
  if (serviceDetail?.durationMinutes && serviceDetail.durationMinutes > 0) {
    return serviceDetail.durationMinutes
  }
  
  // 🔄 PRIORIDAD 3: Duración desde deviceData
  if (fallbackDuration && fallbackDuration > 0) {
    return fallbackDuration
  }
  
  // 🔄 FALLBACK FINAL: 15 minutos por defecto
  console.warn('[ENERGY_AI] Usando duración por defecto de 15 minutos')
  return 15
}

/**
 * 🤖 FUNCIÓN AUXILIAR: Crea resultado para casos sin datos suficientes
 */
function createInsufficientDataResult(
  reason: string,
  equipmentId: string | null
): ExpectedEnergyResult {
  return {
    expectedKwh: 0,
    stdDevSum: 0,
    confidence: 'insufficient_data',
    validProfiles: 0,
    totalProfiles: 0,
    calculationMethod: 'theoretical_estimate',
    fallbackUsed: true,
    dataQuality: {
      minSamples: 5,
      avgSamples: 0,
      profileCoverage: 0,
      confidenceScore: 0
    },
    contextMetadata: {
      servicesAnalyzed: [],
      equipmentId: equipmentId || 'unknown',
      equipmentName: 'Desconocido',
      timestamp: new Date().toISOString()
    }
  }
} 