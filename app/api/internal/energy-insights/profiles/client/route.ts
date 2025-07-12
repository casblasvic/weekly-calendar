import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 📊 ENERGY INSIGHTS CLIENT PROFILES
 * 
 * Endpoint para consultar perfiles energéticos por cliente.
 * Crítico para detectar clientes con patrones de consumo anómalos,
 * posibles fraudes o comportamientos inusuales.
 * 
 * Query params:
 * - clinicId?: string - Filtrar por clínica específica
 * - clientId?: string - Filtrar por cliente específico
 * - serviceId?: string - Filtrar por servicio específico
 * - hourBucket?: number - Filtrar por hora del día (0-23)
 * - minSamples?: number - Mínimo de muestras (default: 3)
 * - anomalyThreshold?: number - Umbral de variabilidad para detectar anomalías (default: 30%)
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
  const clientId = searchParams.get('clientId')
  const serviceId = searchParams.get('serviceId')
  const hourBucket = searchParams.get('hourBucket') ? parseInt(searchParams.get('hourBucket')!) : undefined
  const minSamples = parseInt(searchParams.get('minSamples') || '3')
  const anomalyThreshold = parseFloat(searchParams.get('anomalyThreshold') || '30')

  try {
    // Construir filtros
    const where: any = {
      systemId,
      samples: { gte: minSamples }
    }
    
    if (clinicId) {
      where.clinicId = clinicId
    }
    
    if (clientId) {
      where.clientId = clientId
    }
    
    if (serviceId) {
      where.serviceId = serviceId
    }
    
    if (hourBucket !== undefined) {
      where.hourBucket = hourBucket
    }

    // Consultar perfiles de cliente con relaciones
    const profiles = await prisma.clientServiceEnergyProfile.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            treatmentDurationMinutes: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { stdDevKwh: 'desc' }, // Ordenar por variabilidad
        { samples: 'desc' }
      ],
      take: 100
    })

    // Calcular promedios globales para comparación
    const globalStats = await prisma.$queryRaw`
      SELECT 
        "serviceId",
        AVG("meanKwh")::float as "globalMeanKwh",
        AVG("meanMinutes")::float as "globalMeanMinutes",
        STDDEV("meanKwh")::float as "globalStdDevKwh",
        STDDEV("meanMinutes")::float as "globalStdDevMinutes"
      FROM "smart_plug_client_service_energy_profile"
      WHERE "systemId" = ${systemId}
        AND "samples" >= ${minSamples}
        ${serviceId ? `AND "serviceId" = ${serviceId}` : ''}
      GROUP BY "serviceId"
    ` as Array<{
      serviceId: string
      globalMeanKwh: number
      globalMeanMinutes: number
      globalStdDevKwh: number
      globalStdDevMinutes: number
    }>

    const globalStatsMap = Object.fromEntries(globalStats.map(s => [s.serviceId, s]))

    // Enriquecer perfiles con análisis de anomalías
    const enrichedProfiles = profiles.map(profile => {
      const variabilityKwh = profile.meanKwh > 0 
        ? Math.round((profile.stdDevKwh / profile.meanKwh) * 100) 
        : 0

      const variabilityTime = profile.meanMinutes > 0
        ? Math.round((profile.stdDevMinutes / profile.meanMinutes) * 100)
        : 0

      const efficiency = profile.meanKwh > 0 && profile.meanMinutes > 0
        ? Math.round((profile.meanKwh / profile.meanMinutes) * 10000) / 10000
        : 0

      const confidenceLevel = profile.samples >= 10 ? 'high' 
        : profile.samples >= 5 ? 'medium' 
        : 'low'

      // Análisis de anomalías vs promedios globales
      const globalStat = globalStatsMap[profile.serviceId]
      let anomalyFlags: string[] = []
      let anomalyScore = 0

      if (globalStat) {
        // Comparar consumo energético
        const energyDeviation = globalStat.globalMeanKwh > 0 
          ? Math.abs((profile.meanKwh - globalStat.globalMeanKwh) / globalStat.globalMeanKwh) * 100
          : 0

        // Comparar duración
        const timeDeviation = globalStat.globalMeanMinutes > 0
          ? Math.abs((profile.meanMinutes - globalStat.globalMeanMinutes) / globalStat.globalMeanMinutes) * 100
          : 0

        if (energyDeviation > anomalyThreshold) {
          anomalyFlags.push(profile.meanKwh > globalStat.globalMeanKwh ? 'HIGH_ENERGY' : 'LOW_ENERGY')
          anomalyScore += energyDeviation
        }

        if (timeDeviation > anomalyThreshold) {
          anomalyFlags.push(profile.meanMinutes > globalStat.globalMeanMinutes ? 'SLOW_SERVICE' : 'FAST_SERVICE')
          anomalyScore += timeDeviation
        }

        if (variabilityKwh > anomalyThreshold) {
          anomalyFlags.push('INCONSISTENT_ENERGY')
          anomalyScore += variabilityKwh
        }

        if (variabilityTime > anomalyThreshold) {
          anomalyFlags.push('INCONSISTENT_TIME')
          anomalyScore += variabilityTime
        }
      }

      const riskLevel = anomalyScore > 100 ? 'high' 
        : anomalyScore > 50 ? 'medium' 
        : anomalyScore > 20 ? 'low' 
        : 'normal'

      return {
        id: profile.id,
        clientId: profile.clientId,
        serviceId: profile.serviceId,
        clinicId: profile.clinicId,
        hourBucket: profile.hourBucket,
        
        // Datos del cliente
        client: {
          name: `${profile.client?.firstName || ''} ${profile.client?.lastName || ''}`.trim() || 'Desconocido',
          email: profile.client?.email || null,
          phone: profile.client?.phone || null
        },
        
        // Datos del servicio
        service: {
          name: profile.service?.name || 'Desconocido',
          description: profile.service?.description || null,
          estimatedDuration: profile.service?.durationMinutes || null,
          treatmentDuration: profile.service?.treatmentDurationMinutes || null
        },
        
        // Datos de la clínica
        clinic: {
          name: profile.clinic?.name || 'Desconocida'
        },
        
        // Métricas de energía
        energy: {
          meanKwh: Math.round(profile.meanKwh * 1000) / 1000,
          stdDevKwh: Math.round(profile.stdDevKwh * 1000) / 1000,
          variabilityPct: variabilityKwh,
          efficiency,
          globalComparison: globalStat ? {
            globalMean: Math.round(globalStat.globalMeanKwh * 1000) / 1000,
            deviation: globalStat.globalMeanKwh > 0 
              ? Math.round(((profile.meanKwh - globalStat.globalMeanKwh) / globalStat.globalMeanKwh) * 100)
              : 0
          } : null
        },
        
        // Métricas de tiempo
        time: {
          meanMinutes: Math.round(profile.meanMinutes * 100) / 100,
          stdDevMinutes: Math.round(profile.stdDevMinutes * 100) / 100,
          variabilityPct: variabilityTime,
          hourOfDay: profile.hourBucket,
          globalComparison: globalStat ? {
            globalMean: Math.round(globalStat.globalMeanMinutes * 100) / 100,
            deviation: globalStat.globalMeanMinutes > 0
              ? Math.round(((profile.meanMinutes - globalStat.globalMeanMinutes) / globalStat.globalMeanMinutes) * 100)
              : 0
          } : null
        },
        
        // Análisis de riesgo
        risk: {
          level: riskLevel,
          score: Math.round(anomalyScore),
          flags: anomalyFlags,
          isAnomalous: anomalyFlags.length > 0
        },
        
        // Métricas de calidad
        quality: {
          samples: profile.samples,
          confidenceLevel,
          lastUpdated: profile.updatedAt.toISOString()
        }
      }
    })

    // Estadísticas generales
    const totalProfiles = enrichedProfiles.length
    const anomalousProfiles = enrichedProfiles.filter(p => p.risk.isAnomalous).length
    const highRiskClients = enrichedProfiles.filter(p => p.risk.level === 'high').length
    
    const topRiskClients = enrichedProfiles
      .filter(p => p.risk.isAnomalous)
      .sort((a, b) => b.risk.score - a.risk.score)
      .slice(0, 10)
      .map(p => ({
        clientId: p.clientId,
        clientName: p.client.name,
        riskScore: p.risk.score,
        riskFlags: p.risk.flags,
        anomalousServices: 1 // Se puede agregar conteo si es necesario
      }))

    return NextResponse.json({
      success: true,
      data: {
        profiles: enrichedProfiles,
        
        // Metadatos y estadísticas de riesgo
        metadata: {
          totalProfiles,
          anomalousProfiles,
          anomalyRate: totalProfiles > 0 ? Math.round((anomalousProfiles / totalProfiles) * 100) : 0,
          highRiskClients,
          topRiskClients,
          filters: {
            clinicId,
            clientId,
            serviceId,
            hourBucket,
            minSamples,
            anomalyThreshold
          }
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo perfiles de cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 