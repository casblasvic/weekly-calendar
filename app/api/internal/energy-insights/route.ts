/**
 * 🔬 ENERGY INSIGHTS - OPTIMIZED INSIGHTS API
 * ============================================
 * 
 * API optimizada para análisis de anomalías con consultas eficientes:
 * - Consultas simplificadas para evitar timeouts
 * - Análisis de patrones básico sin sobrecarga
 * - Sistema de severidad automático
 * - Filtros avanzados optimizados
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation obligatorio
 * - includeAnalysis: Incluir análisis básico de patrones
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { prisma } from '@/lib/db'

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

    // 🔍 CONSULTA PRINCIPAL OPTIMIZADA - Solo datos esenciales
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

    // 📈 ANÁLISIS BÁSICO Y EFICIENTE
    let analysis = null
    if (includeAnalysis && filteredInsights.length > 0) {
      // Análisis simple sin consultas adicionales pesadas
      const clientPatterns = new Map()
      const employeePatterns = new Map()

      filteredInsights.forEach(insight => {
        const clientId = insight.appointment?.person?.id
        const employeeId = insight.appointment?.professionalUserId

        if (clientId) {
          if (!clientPatterns.has(clientId)) {
            clientPatterns.set(clientId, {
              clientId,
              clientName: `${insight.appointment?.person?.firstName} ${insight.appointment?.person?.lastName}`,
              anomalyCount: 0,
              totalDeviation: 0,
              avgDeviation: 0
            })
          }
          const pattern = clientPatterns.get(clientId)
          pattern.anomalyCount++
          pattern.totalDeviation += Math.abs(insight.deviationPct || 0)
          pattern.avgDeviation = pattern.totalDeviation / pattern.anomalyCount
        }

        if (employeeId) {
          if (!employeePatterns.has(employeeId)) {
            employeePatterns.set(employeeId, {
              employeeId,
              employeeName: `${insight.appointment?.professionalUser?.firstName} ${insight.appointment?.professionalUser?.lastName}`,
              anomalyCount: 0,
              totalDeviation: 0,
              avgDeviation: 0
            })
          }
          const pattern = employeePatterns.get(employeeId)
          pattern.anomalyCount++
          pattern.totalDeviation += Math.abs(insight.deviationPct || 0)
          pattern.avgDeviation = pattern.totalDeviation / pattern.anomalyCount
        }
      })

      analysis = {
        clientPatterns: Array.from(clientPatterns.values())
          .sort((a, b) => b.anomalyCount - a.anomalyCount)
          .slice(0, 10), // Top 10
        employeePatterns: Array.from(employeePatterns.values())
          .sort((a, b) => b.anomalyCount - a.anomalyCount)
          .slice(0, 10), // Top 10
        summary: {
          totalAnomalies: filteredInsights.length,
          resolvedCount: filteredInsights.filter(i => i.resolved).length,
          pendingCount: filteredInsights.filter(i => !i.resolved).length,
          avgDeviation: filteredInsights.reduce((sum, i) => sum + Math.abs(i.deviationPct || 0), 0) / filteredInsights.length || 0
        }
      }
    }

    // 🎨 MAPEAR DATOS CON SEVERIDAD Y RECOMENDACIONES BÁSICAS
    const enhancedInsights = filteredInsights.map(insight => {
      const deviation = Math.abs(insight.deviationPct || 0)
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      let severityColor = 'blue'

      if (deviation > 100) {
        severity = 'critical'
        severityColor = 'red'
      } else if (deviation > 50) {
        severity = 'high'
        severityColor = 'orange'
      } else if (deviation > 20) {
        severity = 'medium'
        severityColor = 'yellow'
      }

      // Recomendación básica basada en tipo y severidad
      let recommendation = 'Revisar parámetros del servicio'
      if (insight.insightType === 'OVER_CONSUMPTION') {
        recommendation = severity === 'critical' 
          ? 'Verificar calibración del equipo urgentemente'
          : 'Revisar configuración de potencia'
      } else if (insight.insightType === 'UNDER_CONSUMPTION') {
        recommendation = 'Verificar conexión y funcionamiento del equipo'
      } else if (insight.insightType === 'OVER_DURATION') {
        recommendation = 'Revisar técnica del empleado'
      }

      return {
        ...insight,
        severity,
        severityColor,
        recommendation,
        appointmentDetails: {
          clientName: `${insight.appointment?.person?.firstName || ''} ${insight.appointment?.person?.lastName || ''}`.trim(),
          employeeName: `${insight.appointment?.professionalUser?.firstName || ''} ${insight.appointment?.professionalUser?.lastName || ''}`.trim(),
          clinicName: insight.appointment?.clinic?.name || '',
          services: insight.appointment?.services.map(s => ({
            name: s.service.name,
            estimatedDuration: s.service.treatmentDurationMinutes || s.service.durationMinutes,
            actualDuration: null // Campo no disponible en DeviceUsageInsight
          })) || [],
          appointmentDate: insight.appointment?.startTime,
          appointmentId: insight.appointment?.id || insight.appointmentId
        }
      }
    })

    return NextResponse.json({
      insights: enhancedInsights,
      analysis,
      total: enhancedInsights.length,
      filters: {
        from,
        to,
        clinicId,
        employeeId,
        clientId,
        serviceIds,
        status
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
  const filter: any = { systemId, personId: clientId }
  if (clinicId && clinicId !== 'all') {
    filter.clinicId = clinicId
  }

  const [totalAppointments, anomalyCount, anomalies] = await Promise.all([
    prisma.appointment.count({ where: filter }),
    prisma.appointment.count({
      where: {
        ...filter,
        deviceUsageInsights: { some: {} }
      }
    }),
    prisma.deviceUsageInsight.findMany({
      where: {
        appointment: filter
      },
      select: { insightType: true }
    })
  ])

  const anomalyRate = totalAppointments > 0 ? (anomalyCount / totalAppointments) * 100 : 0
  const mostCommonAnomalyType = getMostCommonType(anomalies)
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (anomalyRate > 50) riskLevel = 'critical'
  else if (anomalyRate > 30) riskLevel = 'high'
  else if (anomalyRate > 15) riskLevel = 'medium'

  return {
    totalAppointments,
    anomalyCount,
    anomalyRate,
    mostCommonAnomalyType,
    riskLevel
  }
}

async function analyzeEmployeePattern(
  employeeId: string, 
  systemId: string, 
  clinicId?: string
): Promise<any> {
  const filter: any = { systemId, professionalUserId: employeeId }
  if (clinicId && clinicId !== 'all') {
    filter.clinicId = clinicId
  }

  const [totalAppointments, anomalyCount] = await Promise.all([
    prisma.appointment.count({ where: filter }),
    prisma.appointment.count({
      where: {
        ...filter,
        deviceUsageInsights: { some: {} }
      }
    })
  ])

  const anomalyRate = totalAppointments > 0 ? (anomalyCount / totalAppointments) * 100 : 0
  const avgEfficiency = Math.max(0, 100 - anomalyRate)
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (avgEfficiency < 50) riskLevel = 'critical'
  else if (avgEfficiency < 70) riskLevel = 'high'
  else if (avgEfficiency < 85) riskLevel = 'medium'

  return {
    totalAppointments,
    anomalyCount,
    anomalyRate,
    avgEfficiency,
    riskLevel
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