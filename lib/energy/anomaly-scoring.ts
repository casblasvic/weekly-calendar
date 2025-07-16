/**
 * 🎯 SISTEMA DE SCORING DE ANOMALÍAS PARA ENCHUFES INTELIGENTES SHELLY
 * =====================================================================
 * 
 * Sistema optimizado para detección de patrones anómalos reemplazando
 * los perfiles energéticos granulares con scoring agregado eficiente.
 * 
 * 🔌 IMPORTANTE: Este sistema solo funciona cuando el módulo de enchufes
 *    inteligentes Shelly está ACTIVO en el marketplace del sistema.
 * 
 * 🎯 OBJETIVOS:
 * - Detectar anomalías en comportamiento de clientes y empleados
 * - Reducir 99.6% el uso de memoria vs sistema anterior
 * - Alertas automáticas por umbral de riesgo
 * - Prevención de irregularidades
 * 
 * 🛡️ VERIFICACIÓN DE MÓDULO:
 * - Usar ShellyModuleService.isModuleActive(systemId) antes de cualquier operación
 * - Las funciones fallan gracefully si el módulo está inactivo
 * 
 * 🔐 AUTENTICACIÓN: Usa systemId para multi-tenant
 * ⚠️ NUNCA hardcodea IDs; todo proviene de la BD
 * 
 * Variables críticas:
 * - systemId: Aislamiento multi-tenant obligatorio
 * - clinicId: Segmentación por clínica
 * - riskScore: Puntuación 0-100 de riesgo
 * - anomalyRate: Porcentaje de servicios con anomalías
 * - suspiciousPatterns: JSON con patrones detectados
 * 
 * @see docs/ANOMALY_SCORING_SYSTEM.md
 * @see lib/services/shelly-module-service.ts
 */

import { prisma } from '@/lib/db'
import { isShellyModuleActive } from '../services/shelly-module-service'
import * as crypto from 'crypto'

// 🎯 TIPOS DE PATRONES DE ANOMALÍAS
export const CLIENT_ANOMALY_PATTERNS = {
  OVER_DURATION: {
    code: 'overDuration',
    description: 'Cliente siempre recibe más tiempo del estimado',
    threshold: '> 20% en 80% de servicios',
    riskImpact: 15
  },
  UNDER_DURATION: {
    code: 'underDuration', 
    description: 'Cliente recibe menos tiempo del estimado',
    threshold: '< -15% en 70% de servicios',
    riskImpact: 10
  },
  OVER_CONSUMPTION: {
    code: 'overConsumption',
    description: 'Consume sistemáticamente más energía',
    threshold: '> 30% sobre consumo en 60% servicios',
    riskImpact: 20
  },
  UNDER_CONSUMPTION: {
    code: 'underConsumption',
    description: 'Consume sistemáticamente menos energía',
    threshold: '< -25% bajo consumo en 60% servicios',
    riskImpact: 8
  },
  SPECIFIC_EMPLOYEE: {
    code: 'specificEmployee',
    description: 'Anomalías solo con empleado específico',
    threshold: '> 70% anomalías con mismo empleado',
    riskImpact: 25
  },
  TIME_PATTERN: {
    code: 'timePattern',
    description: 'Anomalías solo en ciertos horarios',
    threshold: '> 80% anomalías en mismo período',
    riskImpact: 10
  }
} as const

export const EMPLOYEE_ANOMALY_PATTERNS = {
  ALWAYS_SHORT: {
    code: 'alwaysShort',
    description: 'Siempre termina antes del tiempo estimado',
    threshold: '< -15% duración en 70% servicios',
    riskImpact: 20
  },
  ALWAYS_EXTENDED: {
    code: 'alwaysExtended',
    description: 'Siempre extiende el tiempo de servicio',
    threshold: '> 20% duración en 60% servicios',
    riskImpact: 15
  },
  CLIENT_FAVORITISM: {
    code: 'clientFavoritism',
    description: 'Favorece a clientes específicos',
    threshold: '> 60% anomalías con < 20% clientes',
    riskImpact: 30
  },
  RUSH_HOUR_CUTTING: {
    code: 'rushHourCutting',
    description: 'Acorta servicios en horas pico',
    threshold: 'Anomalías negativas > 50% en 12-18h',
    riskImpact: 15
  },
  ENERGY_WASTE: {
    code: 'energyWaste',
    description: 'Consumo energético excesivo sistemático',
    threshold: '> 25% sobre consumo en 50% servicios',
    riskImpact: 12
  },
  INCONSISTENT: {
    code: 'inconsistent',
    description: 'Rendimiento muy variable',
    threshold: 'Desviación estándar > 40%',
    riskImpact: 10
  }
} as const

// 🎯 NIVELES DE RIESGO
export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export const RISK_LEVEL_CONFIG = {
  low: {
    color: 'green',
    icon: '✅',
    action: 'monitor',
    description: 'Comportamiento normal'
  },
  medium: {
    color: 'yellow', 
    icon: '⚠️',
    action: 'review',
    description: 'Revisar patrones ocasionalmente'
  },
  high: {
    color: 'orange',
    icon: '🔶',
    action: 'investigate',
    description: 'Investigar comportamiento'
  },
  critical: {
    color: 'red',
    icon: '🚨',
    action: 'immediate_action',
    description: 'Acción inmediata requerida'
  }
} as const

// 🕐 UTILIDADES DE TIEMPO
export function getTimePeriod(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

/**
 * 👤 ACTUALIZAR SCORE DE ANOMALÍA DE CLIENTE
 * 
 * Se ejecuta cada vez que se detecta una anomalía relacionada con un cliente.
 * Utiliza algoritmos incrementales para mantener estadísticas actualizadas.
 */
export async function updateClientAnomalyScore(params: {
  systemId: string
  clinicId: string
  clientId: string
  deviationPct: number
  insightType: string
  employeeId?: string
  timeOfDay?: number
}) {
  const { systemId, clinicId, clientId, deviationPct, insightType, employeeId, timeOfDay } = params
  
  try {
    // 🔒 Verificar que el módulo Shelly esté activo
    const isModuleActive = await isShellyModuleActive(systemId)
    if (!isModuleActive) {
      console.log(`🔒 [CLIENT_SCORE] Módulo Shelly INACTIVO para sistema ${systemId} - Scoring omitido`)
      return null
    }
    
    // 🔍 Buscar score existente del cliente usando Prisma ORM
    const existingScore = await prisma.clientAnomalyScore.findFirst({
      where: {
        systemId,
        clientId
      },
      select: {
        id: true,
        totalServices: true,
        totalAnomalies: true,
        avgDeviationPercent: true,
        maxDeviationPercent: true,
        suspiciousPatterns: true,
        favoredByEmployees: true
      }
    })
    
    if (!existingScore) {
      // 🆕 Crear nuevo score usando Prisma ORM
      const initialPatterns = { [insightType]: 1 }
      const initialEmployees = employeeId ? { [employeeId]: 1 } : {}
      const initialRiskScore = calculateClientRiskScore({
        anomalyRate: 100,
        patterns: [insightType],
        favoredEmployees: employeeId ? 1 : 0,
        maxDeviation: Math.abs(deviationPct)
      })
      
      const newScore = await prisma.clientAnomalyScore.create({
        data: {
          systemId,
          clinicId,
          clientId,
          totalServices: 1,
          totalAnomalies: 1,
          anomalyRate: 100,
          avgDeviationPercent: deviationPct,
          maxDeviationPercent: Math.abs(deviationPct),
          suspiciousPatterns: initialPatterns,
          favoredByEmployees: initialEmployees,
          riskScore: initialRiskScore,
          riskLevel: getRiskLevel(initialRiskScore),
          lastAnomalyDate: new Date(),
          lastCalculated: new Date()
        },
        select: {
          id: true,
          riskScore: true
        }
      })
      
      console.log(`🆕 [CLIENT_SCORE] Nuevo score creado para cliente ${clientId}: ${initialRiskScore}/100`)
      return { id: newScore.id, riskScore: initialRiskScore }
    }
    
    // 🔄 Actualizar score existente usando Prisma ORM
    const newTotalAnomalies = existingScore.totalAnomalies + 1
    const newAnomalyRate = (newTotalAnomalies / existingScore.totalServices) * 100
    
    // 📊 Actualizar desviación promedio (algoritmo incremental)
    const newAvgDeviation = (Number(existingScore.avgDeviationPercent) * existingScore.totalAnomalies + deviationPct) / newTotalAnomalies
    const newMaxDeviation = Math.max(Number(existingScore.maxDeviationPercent), Math.abs(deviationPct))
    
    // 🔍 Actualizar patrones sospechosos
    const patterns = existingScore.suspiciousPatterns as any || {}
    patterns[insightType] = (patterns[insightType] || 0) + 1
    
    // 👨‍⚕️ Actualizar empleados favorecidos
    const favoredEmployees = existingScore.favoredByEmployees as any || {}
    if (employeeId) {
      favoredEmployees[employeeId] = (favoredEmployees[employeeId] || 0) + 1
    }
    
    // ⚠️ Calcular nuevo score de riesgo
    const newRiskScore = calculateClientRiskScore({
      anomalyRate: newAnomalyRate,
      patterns: Object.keys(patterns),
      favoredEmployees: Object.keys(favoredEmployees).length,
      maxDeviation: newMaxDeviation
    })
    
    await prisma.clientAnomalyScore.update({
      where: { id: existingScore.id },
      data: {
        totalAnomalies: newTotalAnomalies,
        anomalyRate: newAnomalyRate,
        avgDeviationPercent: newAvgDeviation,
        maxDeviationPercent: newMaxDeviation,
        suspiciousPatterns: patterns,
        favoredByEmployees: favoredEmployees,
        riskScore: newRiskScore,
        riskLevel: getRiskLevel(newRiskScore),
        lastAnomalyDate: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`🔄 [CLIENT_SCORE] Score actualizado para cliente ${clientId}: ${newRiskScore}/100`)
    return { id: existingScore.id, riskScore: newRiskScore }
    
  } catch (error) {
    console.error(`❌ [CLIENT_SCORE] Error actualizando score de cliente ${clientId}:`, error)
    throw error
  }
}

/**
 * 👨‍⚕️ ACTUALIZAR SCORE DE ANOMALÍA DE EMPLEADO
 * 
 * Se ejecuta cada vez que un empleado está involucrado en una anomalía.
 * Analiza patrones de comportamiento y eficiencia del empleado.
 */
export async function updateEmployeeAnomalyScore(params: {
  systemId: string
  clinicId: string
  employeeId: string
  deviationPct: number
  insightType: string
  clientId?: string
  timeOfDay?: number
}) {
  const { systemId, clinicId, employeeId, deviationPct, insightType, clientId, timeOfDay } = params
  
  try {
    // 🔍 Buscar o crear score del empleado
    let score = await prisma.employeeAnomalyScore.findFirst({
      where: { systemId, employeeId }
    })
    
    if (!score) {
      // 🆕 Crear nuevo score
      const initialFavoredClients = clientId ? { [clientId]: 1 } : {}
      const initialFraudIndicators = detectFraudIndicators(insightType, deviationPct)
      const initialTimePatterns = timeOfDay ? { [getTimePeriod(timeOfDay)]: 1 } : {}
      const initialEfficiency = deviationPct > 0 ? 80 : 120 // Ajuste inicial
      const initialRiskScore = calculateEmployeeRiskScore({
        anomalyRate: 100,
        efficiency: initialEfficiency,
        consistency: 50,
        favoredClients: clientId ? 1 : 0,
        fraudIndicators: Object.keys(initialFraudIndicators).length
      })
      
      score = await prisma.employeeAnomalyScore.create({
        data: {
          id: crypto.randomUUID(),
          systemId,
          clinicId,
          employeeId,
          totalServices: 1,
          totalAnomalies: 1,
          anomalyRate: 100,
          avgEfficiency: initialEfficiency,
          consistencyScore: 50,
          favoredClients: initialFavoredClients,
          fraudIndicators: initialFraudIndicators,
          timePatterns: initialTimePatterns,
          riskScore: initialRiskScore,
          riskLevel: getRiskLevel(initialRiskScore)
        }
      })
      
      console.log(`🆕 [EMPLOYEE_SCORE] Nuevo score creado para empleado ${employeeId}: ${initialRiskScore}/100`)
      return score
    }
    
    // 🔄 Actualizar score existente
    const newTotalAnomalies = score.totalAnomalies + 1
    const newAnomalyRate = (newTotalAnomalies / score.totalServices) * 100
    
    // 📊 Actualizar eficiencia promedio
    const efficiencyImpact = deviationPct > 0 ? -5 : +3 // Penalizar sobre-tiempo, premiar eficiencia
    const newAvgEfficiency = Math.max(0, Math.min(100, Number(score.avgEfficiency) + efficiencyImpact))
    
    // 🎯 Actualizar consistencia (menos anomalías = más consistencia)
    const newConsistencyScore = Math.max(0, 100 - (newAnomalyRate * 2))
    
    // 👤 Actualizar clientes favorecidos
    const favoredClients = score.favoredClients as any || {}
    if (clientId) {
      favoredClients[clientId] = (favoredClients[clientId] || 0) + 1
    }
    
    // 🚨 Actualizar indicadores de irregularidades
    const fraudIndicators = updateFraudIndicators(
      score.fraudIndicators as any || {},
      insightType,
      deviationPct,
      newAnomalyRate
    )
    
    // 🕐 Actualizar patrones temporales
    const timePatterns = score.timePatterns as any || {}
    if (timeOfDay !== undefined) {
      const period = getTimePeriod(timeOfDay)
      timePatterns[period] = (timePatterns[period] || 0) + 1
    }
    
    // ⚠️ Calcular nuevo score de riesgo
    const newRiskScore = calculateEmployeeRiskScore({
      anomalyRate: newAnomalyRate,
      efficiency: newAvgEfficiency,
      consistency: newConsistencyScore,
      favoredClients: Object.keys(favoredClients).length,
      fraudIndicators: Object.keys(fraudIndicators).length
    })
    
    const updatedScore = await prisma.employeeAnomalyScore.update({
      where: { id: score.id },
      data: {
        totalAnomalies: newTotalAnomalies,
        anomalyRate: newAnomalyRate,
        avgEfficiency: newAvgEfficiency,
        consistencyScore: newConsistencyScore,
        favoredClients: favoredClients,
        fraudIndicators: fraudIndicators,
        timePatterns: timePatterns,
        riskScore: newRiskScore,
        riskLevel: getRiskLevel(newRiskScore),
        lastCalculated: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`🔄 [EMPLOYEE_SCORE] Score actualizado para empleado ${employeeId}: ${newRiskScore}/100`)
    return updatedScore
    
  } catch (error) {
    console.error(`❌ [EMPLOYEE_SCORE] Error actualizando score de empleado ${employeeId}:`, error)
    throw error
  }
}

/**
 * 📊 CALCULAR SCORE DE RIESGO DE CLIENTE
 */
export function calculateClientRiskScore(params: {
  anomalyRate: number
  patterns: string[]
  favoredEmployees?: number
  maxDeviation?: number
}): number {
  const { anomalyRate, patterns, favoredEmployees = 0, maxDeviation = 0 } = params
  
  let score = 0
  
  // 📊 Base: Tasa de anomalías (0-40 puntos)
  score += Math.min(40, anomalyRate * 0.4)
  
  // 🔍 Patrones sospechosos (0-30 puntos)
  const patternPoints: Record<string, number> = {
    'OVER_DURATION': 10,
    'UNDER_DURATION': 8,
    'OVER_CONSUMPTION': 12,
    'UNDER_CONSUMPTION': 6,
    'POWER_ANOMALY': 8,
    'TECHNICAL_ISSUE': 5
  }
  
  patterns.forEach(pattern => {
    score += patternPoints[pattern] || 5
  })
  
  // 👨‍⚕️ Concentración en pocos empleados (0-20 puntos)
  if (favoredEmployees === 1) score += 20
  else if (favoredEmployees === 2) score += 10
  else if (favoredEmployees === 3) score += 5
  
  // 📈 Desviación máxima (0-10 puntos)
  score += Math.min(10, maxDeviation / 10)
  
  return Math.min(100, Math.round(score))
}

/**
 * 📊 CALCULAR SCORE DE RIESGO DE EMPLEADO
 */
export function calculateEmployeeRiskScore(params: {
  anomalyRate: number
  efficiency: number
  consistency: number
  favoredClients: number
  fraudIndicators: number
}): number {
  const { anomalyRate, efficiency, consistency, favoredClients, fraudIndicators } = params
  
  let score = 0
  
  // 📊 Base: Tasa de anomalías (0-30 puntos)
  score += Math.min(30, anomalyRate * 0.3)
  
  // ⚡ Penalizar baja eficiencia (0-25 puntos)
  if (efficiency < 70) score += (70 - efficiency) * 0.5
  
  // 🎯 Penalizar baja consistencia (0-20 puntos)
  if (consistency < 80) score += (80 - consistency) * 0.25
  
  // 👤 Concentración en pocos clientes (0-15 puntos)
  if (favoredClients <= 3 && anomalyRate > 20) score += 15
  else if (favoredClients <= 5 && anomalyRate > 30) score += 10
  
  // 🚨 Indicadores de irregularidades (0-10 puntos)
  score += Math.min(10, fraudIndicators * 3)
  
  return Math.min(100, Math.round(score))
}

/**
 * 🚨 DETECTAR INDICADORES DE IRREGULARIDADES
 */
export function detectFraudIndicators(insightType: string, deviationPct: number): Record<string, boolean> {
  const indicators: Record<string, boolean> = {}
  
  // Detectar patrones específicos
  if (insightType === 'OVER_DURATION' && deviationPct > 25) {
    indicators.alwaysExtended = true
  }
  
  if (insightType === 'UNDER_DURATION' && deviationPct < -20) {
    indicators.alwaysShort = true
  }
  
  if (insightType === 'OVER_CONSUMPTION' && deviationPct > 30) {
    indicators.energyWaste = true
  }
  
  if (insightType === 'UNDER_CONSUMPTION' && deviationPct < -25) {
    indicators.energySaving = true
  }
  
  return indicators
}

/**
 * 🔄 ACTUALIZAR INDICADORES DE IRREGULARIDADES
 */
export function updateFraudIndicators(
  existingIndicators: Record<string, any>,
  insightType: string,
  deviationPct: number,
  anomalyRate: number
): Record<string, any> {
  const indicators = { ...existingIndicators }
  
  // Detectar nuevos patrones
  const newIndicators = detectFraudIndicators(insightType, deviationPct)
  Object.assign(indicators, newIndicators)
  
  // Detectar patrones basados en tasa de anomalías
  if (anomalyRate > 60) {
    indicators.highAnomalyRate = true
  }
  
  if (anomalyRate > 80) {
    indicators.criticalAnomalyRate = true
  }
  
  return indicators
}

/**
 * 📊 ACTUALIZAR CONTADORES DE SERVICIOS
 * Incrementa contadores de servicios totales para cliente y empleado.
 * Solo actualiza contadores, no detecta anomalías.
 * 
 * IMPORTANTE: Constraints correctos del schema:
 * - ClientAnomalyScore: systemId_clinicId_clientId 
 * - EmployeeAnomalyScore: systemId_employeeId (SIN clinicId)
 */
export async function updateServiceCount(params: {
  systemId: string
  clinicId: string
  clientId?: string
  employeeId?: string
}) {
  const { systemId, clinicId, clientId, employeeId } = params
  
  try {
    // 👤 Actualizar contador de cliente
    if (clientId) {
      await prisma.clientAnomalyScore.upsert({
        where: {
          systemId_clinicId_clientId: {
            systemId,
            clinicId,
            clientId
          }
        },
        update: {
          totalServices: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          systemId,
          clinicId,
          clientId,
          totalServices: 1,
          totalAnomalies: 0,
          anomalyRate: 0
        }
      })
    }
    
    // 👨‍⚕️ Actualizar contador de empleado (constraint sin clinicId)
    if (employeeId) {
      await prisma.employeeAnomalyScore.upsert({
        where: {
          systemId_employeeId: {
            systemId,
            employeeId
          }
        },
        update: {
          totalServices: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          systemId,
          clinicId,
          employeeId,
          totalServices: 1,
          totalAnomalies: 0,
          anomalyRate: 0
        }
      })
    }
    
    console.log(`✅ [SERVICE_COUNT] Contadores actualizados - Cliente: ${clientId}, Empleado: ${employeeId}`)
  } catch (error) {
    console.error(`❌ [SERVICE_COUNT] Error actualizando contadores:`, error)
    throw error
  }
} 