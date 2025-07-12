import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 📊 ENERGY INSIGHTS DASHBOARD STATS
 * 
 * Endpoint principal para obtener KPIs y estadísticas del dashboard.
 * Proporciona métricas agregadas para toma de decisiones.
 * 
 * Query params:
 * - clinicId?: string - Filtrar por clínica específica
 * - dateFrom?: string - Fecha inicio (ISO)
 * - dateTo?: string - Fecha fin (ISO)
 */
export async function GET(req: NextRequest) {
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }
  
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  const systemId = session.user.systemId
  const { searchParams } = new URL(req.url)
  const clinicId = searchParams.get('clinicId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  try {
    // Filtros base
    const whereInsights: any = { systemId }
    
    // Filtro por clínica - ahora directo gracias al campo clinicId
    if (clinicId) {
      whereInsights.clinicId = clinicId
    }
    
    if (dateFrom) {
      whereInsights.detectedAt = { gte: new Date(dateFrom) }
    }
    
    if (dateTo) {
      whereInsights.detectedAt = { ...(whereInsights.detectedAt || {}), lte: new Date(dateTo) }
    }

    // 1. KPIs principales de insights (consultas simples)
    const [totalInsights, openInsights, resolvedInsights] = await Promise.all([
      prisma.deviceUsageInsight.count({ where: whereInsights }),
      prisma.deviceUsageInsight.count({ where: { ...whereInsights, resolved: false } }),
      prisma.deviceUsageInsight.count({ where: { ...whereInsights, resolved: true } })
    ])

    // 2. Anomalías por tipo
    const insightsByType = await prisma.deviceUsageInsight.groupBy({
      by: ['insightType'],
      where: whereInsights,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    // 3. Equipos con mayor variabilidad (consulta simple)
    const equipmentVariability = await prisma.serviceEnergyProfile.findMany({
      where: {
        systemId,
        sampleCount: { gte: 5 },
        stdDevKwhPerMin: { gt: 0 }
      },
      include: {
        equipment: { select: { name: true } },
        service: { select: { name: true } }
      },
      orderBy: { stdDevKwhPerMin: 'desc' },
      take: 5
    })

    return NextResponse.json({
      success: true,
      data: {
        // KPIs principales
        insights: {
          total: totalInsights,
          open: openInsights,
          resolved: resolvedInsights,
          resolutionRate: totalInsights > 0 ? (resolvedInsights / totalInsights * 100) : 0
        },
        
        // Distribución por tipo
        anomaliesByType: insightsByType.map(item => ({
          type: item.insightType,
          count: item._count.id
        })),
        
        // Rankings problemáticos (vacíos por ahora)
        topProblematicServices: [],
        topProblematicClients: [],
        topProblematicEmployees: [],
        
        // Evolución temporal (vacía por ahora)
        weeklyEvolution: [],
        
        // Equipamiento
        equipmentVariability: equipmentVariability.map(item => ({
          equipmentName: item.equipment?.name || 'Desconocido',
          serviceName: item.service?.name || 'Desconocido',
          avgKwhPerMin: Math.round(item.avgKwhPerMin * 10000) / 10000,
          stdDevKwhPerMin: Math.round(item.stdDevKwhPerMin * 10000) / 10000,
          variabilityPct: item.avgKwhPerMin > 0 ? Math.round((item.stdDevKwhPerMin / item.avgKwhPerMin) * 100) : 0,
          sampleCount: item.sampleCount
        })),
        
        // Confianza estadística (vacía por ahora)
        confidenceDistribution: [],
        
        // Metadatos
        filters: {
          clinicId,
          dateFrom,
          dateTo
        },
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error obteniendo estadísticas energy insights:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
      },
      { status: 500 }
    )
  }
} 