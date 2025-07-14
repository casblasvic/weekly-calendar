/**
 * 🔬 ENERGY INSIGHTS - SISTEMA INTELIGENTE DE ANÁLISIS DE ANOMALÍAS
 * ===================================================================
 * 
 * API avanzada para análisis de anomalías con sistema inteligente:
 * - Múltiples estrategias de cálculo con fallback automático
 * - Análisis de patrones por cliente y empleado
 * - Recomendaciones inteligentes contextuales
 * - Metadatos completos para futura integración con agente IA
 * 
 * 🤖 PREPARACIÓN PARA AGENTE IA:
 * - Contexto completo de cada anomalía detectada
 * - Metadatos de confianza y métodos de cálculo
 * - Patrones de comportamiento de clientes y empleados
 * - Recomendaciones estructuradas para aprendizaje automático
 * - Trazabilidad completa de decisiones algorítmicas
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation obligatorio
 * - includeAnalysis: Incluir análisis de patrones y recomendaciones
 * - calculationMethod: Método usado para cálculo de estimados
 * - fallbackUsed: Indica si se usó fallback de duración
 * - confidenceScore: Score 0-1 para evaluación de calidad de datos
 * 
 * @see docs/ENERGY_INSIGHTS_INTELLIGENT_ANALYSIS.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { prisma } from '@/lib/db'
import { calculateSystemConfidence, calculateContextualConfidence, CONFIDENCE_THRESHOLDS } from '@/lib/energy/confidence-calculator'

export async function GET(request: NextRequest) {
  try {
  const session = await auth()
  if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const clinicId = searchParams.get('clinicId')
    const employeeId = searchParams.get('employeeId')
    const clientId = searchParams.get('clientId')
    const serviceIds = searchParams.get('serviceIds')?.split(',').filter(Boolean)
    const status = searchParams.get('status')
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true'
    const confidenceThreshold = parseInt(searchParams.get('confidenceThreshold') || '10')

    // 🎯 CALCULAR CERTEZA GLOBAL DEL SISTEMA
    const systemConfidence = await calculateSystemConfidence(session.user.systemId)

    // 📊 FILTROS BASE OPTIMIZADOS
    const baseFilter = {
      systemId: session.user.systemId,
      ...(clinicId && { clinicId }),
      ...(from && to && {
        detectedAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      }),
      ...(status === 'pending' && { resolved: false }),
      ...(status === 'resolved' && { resolved: true }),
    }

    // 🔍 CONSULTA PRINCIPAL OPTIMIZADA - Con datos completos para IA
  const insights = await prisma.deviceUsageInsight.findMany({
      where: baseFilter,
      include: {
        appointment: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            professionalUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            clinic: {
              select: {
                id: true,
                name: true
              }
            },
            services: {
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
      },
    orderBy: { detectedAt: 'desc' },
      take: 100 // Limitar resultados para evitar sobrecarga
    })

    // 🎯 FILTROS ADICIONALES EN MEMORIA (más eficiente que en DB)
    let filteredInsights = insights

    if (employeeId) {
      filteredInsights = filteredInsights.filter(insight => 
        insight.appointment?.professionalUserId === employeeId
      )
    }

    if (clientId) {
      filteredInsights = filteredInsights.filter(insight => 
        insight.appointment?.person?.id === clientId
      )
    }

    if (serviceIds && serviceIds.length > 0) {
      filteredInsights = filteredInsights.filter(insight =>
        insight.appointment?.services.some(service => 
          serviceIds.includes(service.service.id)
        )
      )
    }

    // 📈 ANÁLISIS INTELIGENTE Y COMPLETO
    let analysis = null
    let clientAnalysisCache = new Map()
    let employeeAnalysisCache = new Map()

    if (includeAnalysis && filteredInsights.length > 0) {
      // 🚨 LÍMITE DE SEGURIDAD: Solo analizar si hay menos de 50 insights para evitar timeouts
      if (filteredInsights.length <= 50) {
        analysis = await generateIntelligentAnalysis(filteredInsights, session.user.systemId)
        
        // 🚀 PRE-CARGAR ANÁLISIS PARA EVITAR N+1 QUERIES Y TIMEOUTS
        const uniqueClientIds = new Set(
          filteredInsights.map(i => i.appointment?.person?.id).filter(Boolean)
        )
        const uniqueEmployeeIds = new Set(
          filteredInsights.map(i => i.appointment?.professionalUserId).filter(Boolean)
        )
        
        console.log(`🔄 [INSIGHTS] Pre-cargando análisis: ${uniqueClientIds.size} clientes, ${uniqueEmployeeIds.size} empleados`)
      
      // Cargar análisis de clientes secuencialmente para evitar timeouts
      for (const clientId of uniqueClientIds) {
        try {
          const clientAnalysis = await analyzeClientPattern(
            clientId as string, 
            session.user.systemId, 
            clinicId
          )
          clientAnalysisCache.set(clientId, clientAnalysis)
        } catch (error) {
          console.warn(`⚠️ [INSIGHTS] Error analizando cliente ${clientId}:`, error)
          clientAnalysisCache.set(clientId, null)
        }
      }
      
      // Cargar análisis de empleados secuencialmente para evitar timeouts
      for (const employeeId of uniqueEmployeeIds) {
        try {
          const employeeAnalysis = await analyzeEmployeePattern(
            employeeId as string, 
            session.user.systemId, 
            clinicId
          )
          employeeAnalysisCache.set(employeeId, employeeAnalysis)
        } catch (error) {
          console.warn(`⚠️ [INSIGHTS] Error analizando empleado ${employeeId}:`, error)
          employeeAnalysisCache.set(employeeId, null)
        }
      }
      } else {
        console.log(`⚠️ [INSIGHTS] Saltando análisis inteligente: ${filteredInsights.length} insights excede el límite de 50`)
      }
    }

    // 🎨 MAPEAR DATOS CON SISTEMA INTELIGENTE COMPLETO (SIN QUERIES ADICIONALES)
    const enhancedInsights = await Promise.all(
      filteredInsights.map(async (insight) => {
        const deviation = Math.abs(insight.deviationPct || 0)
        const severity = calculateSeverity(deviation)
        const severityColor = getSeverityColor(severity)
        
        // 🤖 ANÁLISIS CONTEXTUAL DESDE CACHE (SIN QUERIES ADICIONALES)
        const clientAnalysis = clientAnalysisCache.get(insight.appointment?.person?.id) || null
        const employeeAnalysis = employeeAnalysisCache.get(insight.appointment?.professionalUserId) || null
        
        // 🧠 RECOMENDACIONES INTELIGENTES RESTAURADAS
        const recommendations = generateIntelligentRecommendations(
          insight,
          clientAnalysis,
          employeeAnalysis,
          deviation,
          severity
        )

        // 🎯 CALCULAR CERTEZA CONTEXTUAL
        const contextualConfidence = await calculateContextualConfidence(
          insight,
          session.user.systemId
        )
        
        // 📊 METADATOS COMPLETOS PARA IA
        const detailJson = insight.detailJson as any // Cast seguro para acceder a propiedades IA
        const aiMetadata = {
          calculationMethod: detailJson?.calculationMethod || 'unknown',
          fallbackUsed: detailJson?.fallbackUsed || false,
          confidenceScore: detailJson?.confidenceScore || 0,
          dataQuality: detailJson?.dataQuality || {},
          contextMetadata: detailJson?.contextMetadata || {},
          analysisTimestamp: new Date().toISOString()
        }

        return {
          ...insight,
          severity,
          severityColor,
          recommendations,
          clientAnalysis,
          employeeAnalysis,
          contextualConfidence,
          aiMetadata,
          appointmentDetails: {
            clientName: `${insight.appointment?.person?.firstName || ''} ${insight.appointment?.person?.lastName || ''}`.trim(),
            employeeName: `${insight.appointment?.professionalUser?.firstName || ''} ${insight.appointment?.professionalUser?.lastName || ''}`.trim(),
            clinicName: insight.appointment?.clinic?.name || '',
            services: insight.appointment?.services.map(s => ({
              id: s.service.id,
              name: s.service.name,
              estimatedDuration: s.service.treatmentDurationMinutes || s.service.durationMinutes,
              configuredDuration: s.service.durationMinutes,
              treatmentDuration: s.service.treatmentDurationMinutes,
              // 🎯 COMPARACIÓN ESTIMADO VS REAL
              durationComparison: {
                estimated: s.service.treatmentDurationMinutes || s.service.durationMinutes,
                // Nota: actualDuration no está disponible en DeviceUsageInsight individual
                // Se calcula a nivel de cita completa
                deviationPct: insight.deviationPct
              }
            })) || [],
            appointmentDate: insight.appointment?.startTime,
            appointmentId: insight.appointment?.id || insight.appointmentId,
            // 🔋 ANÁLISIS ENERGÉTICO DETALLADO
            energyAnalysis: {
              estimatedKwh: insight.expectedKwh,
              actualKwh: insight.actualKwh,
              deviationKwh: insight.actualKwh - insight.expectedKwh,
              deviationPct: insight.deviationPct,
              efficiency: insight.expectedKwh > 0 ? 
                Math.round((insight.expectedKwh / insight.actualKwh) * 100) : 0
            }
          }
        }
      })
    )

    // 🎯 FILTRAR POR UMBRAL DE CERTEZA
    const filteredByConfidence = enhancedInsights.filter(insight => {
      const confidence = insight.contextualConfidence?.adjustedConfidence || 0
      return confidence >= confidenceThreshold
    })

    // 🎯 ESTADÍSTICAS DE CERTEZA
    const confidenceStats = {
      totalInsights: enhancedInsights.length,
      shownInsights: filteredByConfidence.length,
      hiddenByConfidence: enhancedInsights.length - filteredByConfidence.length,
      averageConfidence: enhancedInsights.length > 0 
        ? Math.round(enhancedInsights.reduce((sum, insight) => 
            sum + (insight.contextualConfidence?.adjustedConfidence || 0), 0) / enhancedInsights.length)
        : 0
    }

    return NextResponse.json({
      insights: filteredByConfidence,
      analysis,
      systemConfidence,
      confidenceStats,
      total: filteredByConfidence.length,
      filters: {
        from,
        to,
        clinicId,
        employeeId,
        clientId,
        serviceIds,
        status,
        confidenceThreshold
      },
      // 🤖 METADATOS GLOBALES PARA AGENTE IA
      aiGlobalMetadata: {
        totalAnomalies: enhancedInsights.length,
        severityDistribution: calculateSeverityDistribution(enhancedInsights),
        calculationMethodsUsed: extractCalculationMethods(enhancedInsights),
        averageConfidenceScore: calculateAverageConfidence(enhancedInsights),
        dataQualityMetrics: calculateDataQualityMetrics(enhancedInsights),
        analysisTimestamp: new Date().toISOString()
}
    })

  } catch (error) {
    console.error('Error en insights API:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id, resolved, notes } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Obtener insight actual para preservar detailJson existente
    const currentInsight = await prisma.deviceUsageInsight.findUnique({
      where: { id },
      select: { detailJson: true }
    })

  const insight = await prisma.deviceUsageInsight.update({
    where: { id },
    data: {
      resolved: resolved ?? true,
      resolvedByUserId: session.user.id,
      resolvedAt: new Date(),
        detailJson: notes ? { 
          ...(currentInsight?.detailJson as any || {}), 
          notes 
        } : currentInsight?.detailJson
    }
  })

  return NextResponse.json({ insight })

  } catch (error) {
    console.error('Error actualizando insight:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// 🧠 SISTEMA INTELIGENTE DE ANÁLISIS Y RECOMENDACIONES
// ============================================================================

/**
 * 🎯 ANÁLISIS INTELIGENTE COMPLETO
 * 
 * Genera análisis completo de patrones con contexto para agente IA:
 * - Patrones de clientes con análisis de riesgo
 * - Patrones de empleados con análisis de eficiencia
 * - Tendencias temporales y por servicio
 * - Recomendaciones estratégicas
 * 
 * @param insights - Lista de anomalías filtradas
 * @param systemId - ID del sistema para consultas adicionales
 * @returns Análisis completo con metadatos para IA
 */
async function generateIntelligentAnalysis(insights: any[], systemId: string) {
  const clientPatterns = new Map()
  const employeePatterns = new Map()
  const servicePatterns = new Map()
  const temporalPatterns = new Map()

  // 📊 ANÁLISIS DE PATRONES AVANZADO
  for (const insight of insights) {
    const clientId = insight.appointment?.person?.id
    const employeeId = insight.appointment?.professionalUserId
    const services = insight.appointment?.services || []
    const detectedAt = new Date(insight.detectedAt)
    const hourOfDay = detectedAt.getHours()
    const dayOfWeek = detectedAt.getDay()

    // 👤 PATRONES DE CLIENTE
    if (clientId) {
      if (!clientPatterns.has(clientId)) {
        clientPatterns.set(clientId, {
          clientId,
          clientName: `${insight.appointment?.person?.firstName} ${insight.appointment?.person?.lastName}`,
          anomalyCount: 0,
          totalDeviation: 0,
          avgDeviation: 0,
          severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
          mostCommonType: {},
          riskLevel: 'low',
          lastAnomalyDate: detectedAt,
          aiMetadata: {
            behaviorPattern: 'normal',
            fraudRisk: 0,
            loyaltyScore: 0
          }
        })
      }
      const pattern = clientPatterns.get(clientId)
      pattern.anomalyCount++
      pattern.totalDeviation += Math.abs(insight.deviationPct || 0)
      pattern.avgDeviation = pattern.totalDeviation / pattern.anomalyCount
      pattern.severityDistribution[insight.severity || 'low']++
      pattern.mostCommonType[insight.insightType] = (pattern.mostCommonType[insight.insightType] || 0) + 1
      pattern.lastAnomalyDate = detectedAt
    }

    // 💼 PATRONES DE EMPLEADO
    if (employeeId) {
      if (!employeePatterns.has(employeeId)) {
        employeePatterns.set(employeeId, {
          employeeId,
          employeeName: `${insight.appointment?.professionalUser?.firstName} ${insight.appointment?.professionalUser?.lastName}`,
          anomalyCount: 0,
          totalDeviation: 0,
          avgDeviation: 0,
          severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
          efficiencyScore: 100,
          performanceLevel: 'excellent',
          aiMetadata: {
            skillLevel: 'experienced',
            trainingNeeded: false,
            fraudRisk: 0
          }
        })
      }
      const pattern = employeePatterns.get(employeeId)
      pattern.anomalyCount++
      pattern.totalDeviation += Math.abs(insight.deviationPct || 0)
      pattern.avgDeviation = pattern.totalDeviation / pattern.anomalyCount
      pattern.severityDistribution[insight.severity || 'low']++
      pattern.efficiencyScore = Math.max(0, 100 - pattern.avgDeviation)
    }

    // 🔧 PATRONES DE SERVICIO
    services.forEach(service => {
      const serviceId = service.service.id
      if (!servicePatterns.has(serviceId)) {
        servicePatterns.set(serviceId, {
          serviceId,
          serviceName: service.service.name,
          anomalyCount: 0,
          avgDeviation: 0,
          mostCommonIssue: {}
        })
      }
      const pattern = servicePatterns.get(serviceId)
      pattern.anomalyCount++
      pattern.mostCommonIssue[insight.insightType] = (pattern.mostCommonIssue[insight.insightType] || 0) + 1
    })

    // ⏰ PATRONES TEMPORALES
    const timeKey = `${dayOfWeek}-${hourOfDay}`
    if (!temporalPatterns.has(timeKey)) {
      temporalPatterns.set(timeKey, {
        dayOfWeek,
        hourOfDay,
        anomalyCount: 0,
        avgDeviation: 0,
        dayName: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek]
      })
    }
    const temporalPattern = temporalPatterns.get(timeKey)
    temporalPattern.anomalyCount++
  }

  // 🎯 CALCULAR NIVELES DE RIESGO Y RECOMENDACIONES
  clientPatterns.forEach(pattern => {
    const anomalyRate = pattern.anomalyCount
    if (anomalyRate > 10) pattern.riskLevel = 'critical'
    else if (anomalyRate > 5) pattern.riskLevel = 'high'
    else if (anomalyRate > 2) pattern.riskLevel = 'medium'
    
    pattern.aiMetadata.fraudRisk = Math.min(100, anomalyRate * 10)
    pattern.aiMetadata.behaviorPattern = anomalyRate > 5 ? 'suspicious' : 'normal'
  })

  employeePatterns.forEach(pattern => {
    if (pattern.efficiencyScore < 50) pattern.performanceLevel = 'needs_improvement'
    else if (pattern.efficiencyScore < 70) pattern.performanceLevel = 'average'
    else if (pattern.efficiencyScore < 90) pattern.performanceLevel = 'good'
    
    pattern.aiMetadata.trainingNeeded = pattern.efficiencyScore < 70
    pattern.aiMetadata.skillLevel = pattern.efficiencyScore > 85 ? 'expert' : 
                                   pattern.efficiencyScore > 70 ? 'experienced' : 'novice'
  })

  return {
    clientPatterns: Array.from(clientPatterns.values())
      .sort((a, b) => b.anomalyCount - a.anomalyCount)
      .slice(0, 10),
    employeePatterns: Array.from(employeePatterns.values())
      .sort((a, b) => b.anomalyCount - a.anomalyCount)
      .slice(0, 10),
    servicePatterns: Array.from(servicePatterns.values())
      .sort((a, b) => b.anomalyCount - a.anomalyCount)
      .slice(0, 10),
    temporalPatterns: Array.from(temporalPatterns.values())
      .sort((a, b) => b.anomalyCount - a.anomalyCount)
      .slice(0, 24), // Top 24 horas
    summary: {
      totalAnomalies: insights.length,
      resolvedCount: insights.filter(i => i.resolved).length,
      pendingCount: insights.filter(i => !i.resolved).length,
      avgDeviation: insights.reduce((sum, i) => sum + Math.abs(i.deviationPct || 0), 0) / insights.length || 0,
      criticalCount: insights.filter(i => Math.abs(i.deviationPct || 0) > 100).length,
      highRiskClients: Array.from(clientPatterns.values()).filter(p => p.riskLevel === 'critical').length,
      underperformingEmployees: Array.from(employeePatterns.values()).filter(p => p.efficiencyScore < 70).length
    },
    // 🤖 METADATOS PARA AGENTE IA
    aiAnalysisMetadata: {
      analysisTimestamp: new Date().toISOString(),
      dataQuality: {
        totalInsights: insights.length,
        clientsCovered: clientPatterns.size,
        employeesCovered: employeePatterns.size,
        servicesCovered: servicePatterns.size
      },
      trendsDetected: {
        riskEscalation: Array.from(clientPatterns.values()).filter(p => p.riskLevel === 'critical').length > 0,
        performanceIssues: Array.from(employeePatterns.values()).filter(p => p.efficiencyScore < 70).length > 0,
        systemicProblems: Array.from(servicePatterns.values()).filter(p => p.anomalyCount > 5).length > 0
      }
    }
  }
}

/**
 * 🧠 RECOMENDACIONES INTELIGENTES CONTEXTUALES
 * 
 * Genera recomendaciones específicas basadas en contexto completo:
 * - Análisis de patrones de cliente y empleado
 * - Severidad y tipo de anomalía
 * - Historial y tendencias
 * - Preparado para integración con agente IA
 */
function generateIntelligentRecommendations(
  insight: any,
  clientAnalysis: any,
  employeeAnalysis: any,
  deviation: number,
  severity: string
): any[] {
  const recommendations: any[] = []

  // 🚨 RECOMENDACIONES CRÍTICAS (PRIORIDAD ALTA)
  if (severity === 'critical') {
    if (deviation > 200) {
      recommendations.push({
        type: 'critical_investigation',
        priority: 'critical',
        category: 'fraud_detection',
        message: 'Desviación extrema detectada (>200%). Investigar inmediatamente por posible fraude.',
        actionRequired: true,
        estimatedImpact: 'high',
        aiMetadata: {
          confidenceScore: 0.95,
          riskLevel: 'critical',
          recommendationType: 'fraud_investigation'
        }
      })
    } else {
      recommendations.push({
        type: 'equipment_check',
        priority: 'critical',
        category: 'technical_issue',
        message: 'Desviación crítica. Verificar calibración del equipo y funcionamiento.',
        actionRequired: true,
        estimatedImpact: 'high',
        aiMetadata: {
          confidenceScore: 0.8,
          riskLevel: 'critical',
          recommendationType: 'equipment_maintenance'
        }
      })
    }
  }

  // 👤 RECOMENDACIONES BASADAS EN PATRÓN DEL CLIENTE
  if (clientAnalysis?.riskLevel === 'critical' || clientAnalysis?.riskLevel === 'high') {
    recommendations.push({
      type: 'client_monitoring',
      priority: 'high',
      category: 'client_management',
      message: `Cliente con alta tasa de anomalías (${clientAnalysis.anomalyRate?.toFixed(1)}%). Considerar supervisión adicional.`,
      actionRequired: true,
      estimatedImpact: 'medium',
      aiMetadata: {
        confidenceScore: 0.75,
        riskLevel: clientAnalysis.riskLevel,
        recommendationType: 'client_supervision',
        clientRiskScore: clientAnalysis.anomalyRate || 0
      }
    })
  }

  // 💼 RECOMENDACIONES BASADAS EN PATRÓN DEL EMPLEADO
  if (employeeAnalysis?.avgEfficiency < 70) {
    recommendations.push({
      type: 'employee_training',
      priority: 'medium',
      category: 'human_resources',
      message: `Empleado con eficiencia baja (${employeeAnalysis.avgEfficiency?.toFixed(1)}%). Considerar entrenamiento adicional.`,
      actionRequired: false,
      estimatedImpact: 'medium',
      aiMetadata: {
        confidenceScore: 0.7,
        riskLevel: 'medium',
        recommendationType: 'training_program',
        efficiencyScore: employeeAnalysis.avgEfficiency || 0
      }
    })
  } else if (employeeAnalysis?.avgEfficiency > 95) {
    recommendations.push({
      type: 'employee_recognition',
      priority: 'low',
      category: 'human_resources',
      message: `Empleado con excelente eficiencia (${employeeAnalysis.avgEfficiency?.toFixed(1)}%). Considerar reconocimiento.`,
      actionRequired: false,
      estimatedImpact: 'low',
      aiMetadata: {
        confidenceScore: 0.6,
        riskLevel: 'low',
        recommendationType: 'positive_reinforcement',
        efficiencyScore: employeeAnalysis.avgEfficiency || 0
      }
    })
  }

  // 🔧 RECOMENDACIONES ESPECÍFICAS POR TIPO DE ANOMALÍA
  switch (insight.insightType) {
    case 'OVER_CONSUMPTION':
      recommendations.push({
        type: 'energy_optimization',
        priority: severity === 'critical' ? 'high' : 'medium',
        category: 'energy_management',
        message: 'Revisar configuración de potencia del equipo y técnica del empleado.',
        actionRequired: severity === 'critical',
        estimatedImpact: 'medium',
        aiMetadata: {
          confidenceScore: 0.8,
          riskLevel: severity,
          recommendationType: 'power_optimization'
        }
      })
      break
    case 'UNDER_CONSUMPTION':
      recommendations.push({
        type: 'equipment_maintenance',
        priority: 'high',
        category: 'technical_issue',
        message: 'Verificar conexión y funcionamiento del equipo. Posible mal funcionamiento.',
        actionRequired: true,
        estimatedImpact: 'high',
        aiMetadata: {
          confidenceScore: 0.85,
          riskLevel: 'high',
          recommendationType: 'equipment_repair'
        }
      })
      break
    case 'OVER_DURATION':
      recommendations.push({
        type: 'process_optimization',
        priority: 'medium',
        category: 'process_improvement',
        message: 'Revisar técnica del empleado y procedimientos del servicio.',
        actionRequired: false,
        estimatedImpact: 'medium',
        aiMetadata: {
          confidenceScore: 0.7,
          riskLevel: 'medium',
          recommendationType: 'process_training'
        }
      })
      break
  }

  // 🎯 RECOMENDACIÓN GENERAL SI NO HAY ESPECÍFICAS
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general_review',
      priority: 'low',
      category: 'general',
      message: 'Revisar los detalles de la cita para identificar la causa de la anomalía.',
      actionRequired: false,
      estimatedImpact: 'low',
      aiMetadata: {
        confidenceScore: 0.5,
        riskLevel: 'low',
        recommendationType: 'general_investigation'
      }
    })
  }

  return recommendations
}

// ============================================================================
// 🤖 FUNCIONES DE METADATOS PARA AGENTE IA
// ============================================================================

function calculateSeverityDistribution(insights: any[]) {
  const distribution = { low: 0, medium: 0, high: 0, critical: 0 }
  insights.forEach(insight => {
    distribution[insight.severity || 'low']++
  })
  return distribution
}

function extractCalculationMethods(insights: any[]) {
  const methods = new Set()
  insights.forEach(insight => {
    if (insight.aiMetadata?.calculationMethod) {
      methods.add(insight.aiMetadata.calculationMethod)
    }
  })
  return Array.from(methods)
}

function calculateAverageConfidence(insights: any[]) {
  const scores = insights
    .map(insight => insight.aiMetadata?.confidenceScore || 0)
    .filter(score => score > 0)
  
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

function calculateDataQualityMetrics(insights: any[]) {
  const fallbackUsed = insights.filter(insight => insight.aiMetadata?.fallbackUsed).length
  const statisticalProfiles = insights.filter(insight => 
    insight.aiMetadata?.calculationMethod === 'statistical_profile'
  ).length
  
  return {
    totalInsights: insights.length,
    statisticalProfilesUsed: statisticalProfiles,
    fallbackUsed,
    dataQualityScore: insights.length > 0 ? statisticalProfiles / insights.length : 0,
    averageConfidence: calculateAverageConfidence(insights)
  }
}

// ============================================================================
// FUNCIONES DE ANÁLISIS INTELIGENTE
// ============================================================================

function calculateSeverity(insight: any): 'low' | 'medium' | 'high' | 'critical' {
  const deviation = Math.abs(insight.deviationPct)
  
  if (deviation >= 100) return 'critical'
  if (deviation >= 50) return 'high'
  if (deviation >= 20) return 'medium'
  return 'low'
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 border-red-500 text-red-700'
    case 'high': return 'bg-orange-100 border-orange-500 text-orange-700'
    case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700'
    case 'low': return 'bg-blue-100 border-blue-500 text-blue-700'
    default: return 'bg-gray-100 border-gray-500 text-gray-700'
  }
}

async function analyzeClientPattern(
  clientId: string, 
  systemId: string, 
  clinicId?: string
): Promise<any> {
  try {
    const filter: any = { systemId, clientId }
    if (clinicId && clinicId !== 'all') {
      filter.clinicId = clinicId
    }

    // 🚀 CONSULTA OPTIMIZADA: Usar nueva tabla de scores de anomalías de clientes
    const clientScore = await prisma.clientAnomalyScore.findFirst({
      where: filter,
      select: {
        totalServices: true,
        totalAnomalies: true,
        anomalyRate: true,
        riskLevel: true,
        riskScore: true,
        avgDeviationPercent: true,
        maxDeviationPercent: true
      }
    })

    if (!clientScore) {
      return {
        totalAppointments: 0,
        anomalyCount: 0,
        anomalyRate: 0,
        mostCommonAnomalyType: 'unknown',
        riskLevel: 'low'
      }
    }

    // 📊 USAR MÉTRICAS DIRECTAS DE LA TABLA DE SCORES
    return {
      totalAppointments: clientScore.totalServices,
      anomalyCount: clientScore.totalAnomalies,
      anomalyRate: Number(clientScore.anomalyRate),
      mostCommonAnomalyType: 'energy_variability',
      riskLevel: clientScore.riskLevel as 'low' | 'medium' | 'high' | 'critical'
    }
  } catch (error) {
    console.error(`❌ [INSIGHTS] Error en analyzeClientPattern para cliente ${clientId}:`, error)
    return {
      totalAppointments: 0,
      anomalyCount: 0,
      anomalyRate: 0,
      mostCommonAnomalyType: 'unknown',
      riskLevel: 'low'
    }
  }
}

async function analyzeEmployeePattern(
  employeeId: string, 
  systemId: string, 
  clinicId?: string
): Promise<any> {
  try {
    const filter: any = { systemId, employeeId }
    if (clinicId && clinicId !== 'all') {
      filter.clinicId = clinicId
    }

    // 🚀 CONSULTA OPTIMIZADA: Usar nueva tabla de scores de anomalías de empleados
    const employeeScore = await prisma.employeeAnomalyScore.findFirst({
      where: filter,
      select: {
        totalServices: true,
        totalAnomalies: true,
        anomalyRate: true,
        avgEfficiency: true,
        consistencyScore: true,
        performanceLevel: true
      }
    })

    if (!employeeScore) {
      return {
        totalAppointments: 0,
        anomalyCount: 0,
        anomalyRate: 0,
        avgEfficiency: 100,
        riskLevel: 'low'
      }
    }

    // 📊 USAR MÉTRICAS DIRECTAS DE LA TABLA DE SCORES
    return {
      totalAppointments: employeeScore.totalServices,
      anomalyCount: employeeScore.totalAnomalies,
      anomalyRate: Number(employeeScore.anomalyRate),
      avgEfficiency: Number(employeeScore.avgEfficiency),
      riskLevel: employeeScore.riskLevel as 'low' | 'medium' | 'high' | 'critical'
    }
  } catch (error) {
    console.error(`❌ [INSIGHTS] Error en analyzeEmployeePattern para empleado ${employeeId}:`, error)
    return {
      totalAppointments: 0,
      anomalyCount: 0,
      anomalyRate: 0,
      avgEfficiency: 100,
      riskLevel: 'low'
    }
  }
}

function getMostCommonType(anomalies: { insightType: string }[]): string {
  const counts: Record<string, number> = {}
  anomalies.forEach(a => {
    counts[a.insightType] = (counts[a.insightType] || 0) + 1
  })
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'UNKNOWN'
}

function generateRecommendations(
  insight: any,
  clientAnalysis?: any,
  employeeAnalysis?: any
): any[] {
  const recommendations: any[] = []
  
  // Recomendaciones basadas en severidad
  if (insight.severity === 'critical') {
    recommendations.push({
      type: 'investigate_fraud',
      priority: 'critical',
      message: 'Desviación crítica detectada. Revisar inmediatamente la cita y verificar posible fraude.',
      actionRequired: true
    })
  }

  // Recomendaciones basadas en patrón del cliente
  if (clientAnalysis?.riskLevel === 'high' || clientAnalysis?.riskLevel === 'critical') {
    recommendations.push({
      type: 'monitor_client',
      priority: 'high',
      message: `Cliente con alta tasa de anomalías (${clientAnalysis.anomalyRate.toFixed(1)}%). Considerar supervisión adicional.`,
      actionRequired: true
    })
  }

  // Recomendaciones basadas en patrón del empleado
  if (employeeAnalysis?.avgEfficiency < 70) {
    recommendations.push({
      type: 'train_employee',
      priority: 'medium',
      message: `Empleado con eficiencia baja (${employeeAnalysis.avgEfficiency.toFixed(1)}%). Considerar entrenamiento adicional.`,
      actionRequired: false
    })
  }

  // Recomendación general
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'review_appointment',
      priority: 'low',
      message: 'Revisar los detalles de la cita para identificar la causa de la anomalía.',
      actionRequired: false
    })
  }

  return recommendations
} 