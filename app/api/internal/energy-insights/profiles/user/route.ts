import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 📊 ENERGY INSIGHTS USER PROFILES
 * 
 * Endpoint para consultar perfiles energéticos por empleado/usuario.
 * Crítico para detectar empleados con patrones ineficientes,
 * posibles fraudes o necesidades de capacitación.
 * 
 * Query params:
 * - clinicId?: string - Filtrar por clínica específica
 * - userId?: string - Filtrar por empleado específico
 * - serviceId?: string - Filtrar por servicio específico
 * - hourBucket?: number - Filtrar por hora del día (0-23)
 * - minSamples?: number - Mínimo de muestras (default: 5)
 * - performanceThreshold?: number - Umbral de eficiencia para detectar problemas (default: 20%)
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
  const userId = searchParams.get('userId')
  const serviceId = searchParams.get('serviceId')
  const hourBucket = searchParams.get('hourBucket') ? parseInt(searchParams.get('hourBucket')!) : undefined
  const minSamples = parseInt(searchParams.get('minSamples') || '5')
  const performanceThreshold = parseFloat(searchParams.get('performanceThreshold') || '20')

  try {
    // Construir filtros
    const where: any = {
      systemId,
      samples: { gte: minSamples }
    }
    
    if (clinicId) {
      where.clinicId = clinicId
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (serviceId) {
      where.serviceId = serviceId
    }
    
    if (hourBucket !== undefined) {
      where.hourBucket = hourBucket
    }

    // Consultar perfiles de usuario con relaciones
    const profiles = await prisma.userServiceEnergyProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
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

    // Calcular benchmarks globales para comparación
    const globalBenchmarks = await prisma.$queryRaw`
      SELECT 
        "serviceId",
        AVG("meanKwh")::float as "benchmarkMeanKwh",
        AVG("meanMinutes")::float as "benchmarkMeanMinutes",
        STDDEV("meanKwh")::float as "benchmarkStdDevKwh",
        STDDEV("meanMinutes")::float as "benchmarkStdDevMinutes",
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "meanKwh")::float as "q1Kwh",
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "meanKwh")::float as "q3Kwh",
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "meanMinutes")::float as "q1Minutes",
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "meanMinutes")::float as "q3Minutes"
      FROM "smart_plug_user_service_energy_profile"
      WHERE "systemId" = ${systemId}
        AND "samples" >= ${minSamples}
        ${serviceId ? `AND "serviceId" = ${serviceId}` : ''}
      GROUP BY "serviceId"
    ` as Array<{
      serviceId: string
      benchmarkMeanKwh: number
      benchmarkMeanMinutes: number
      benchmarkStdDevKwh: number
      benchmarkStdDevMinutes: number
      q1Kwh: number
      q3Kwh: number
      q1Minutes: number
      q3Minutes: number
    }>

    const benchmarkMap = Object.fromEntries(globalBenchmarks.map(b => [b.serviceId, b]))

    // Enriquecer perfiles con análisis de rendimiento
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

      const confidenceLevel = profile.samples >= 20 ? 'high' 
        : profile.samples >= 10 ? 'medium' 
        : 'low'

      // Análisis de rendimiento vs benchmarks
      const benchmark = benchmarkMap[profile.serviceId]
      let performanceFlags: string[] = []
      let performanceScore = 0

      if (benchmark) {
        // Comparar eficiencia energética
        const energyEfficiency = benchmark.benchmarkMeanKwh > 0 
          ? ((benchmark.benchmarkMeanKwh - profile.meanKwh) / benchmark.benchmarkMeanKwh) * 100
          : 0

        // Comparar velocidad de servicio
        const timeEfficiency = benchmark.benchmarkMeanMinutes > 0
          ? ((benchmark.benchmarkMeanMinutes - profile.meanMinutes) / benchmark.benchmarkMeanMinutes) * 100
          : 0

        // Detectar outliers usando cuartiles (método IQR)
        const iqrKwh = benchmark.q3Kwh - benchmark.q1Kwh
        const isKwhOutlier = profile.meanKwh > benchmark.q3Kwh + (1.5 * iqrKwh) || 
                            profile.meanKwh < benchmark.q1Kwh - (1.5 * iqrKwh)

        const iqrMinutes = benchmark.q3Minutes - benchmark.q1Minutes
        const isTimeOutlier = profile.meanMinutes > benchmark.q3Minutes + (1.5 * iqrMinutes) || 
                             profile.meanMinutes < benchmark.q1Minutes - (1.5 * iqrMinutes)

        // Evaluar rendimiento
        if (energyEfficiency < -performanceThreshold) {
          performanceFlags.push('HIGH_ENERGY_USAGE')
          performanceScore += Math.abs(energyEfficiency)
        } else if (energyEfficiency > performanceThreshold) {
          performanceFlags.push('ENERGY_EFFICIENT')
        }

        if (timeEfficiency < -performanceThreshold) {
          performanceFlags.push('SLOW_SERVICE')
          performanceScore += Math.abs(timeEfficiency)
        } else if (timeEfficiency > performanceThreshold) {
          performanceFlags.push('FAST_SERVICE')
        }

        if (variabilityKwh > performanceThreshold) {
          performanceFlags.push('INCONSISTENT_ENERGY')
          performanceScore += variabilityKwh
        }

        if (variabilityTime > performanceThreshold) {
          performanceFlags.push('INCONSISTENT_TIME')
          performanceScore += variabilityTime
        }

        if (isKwhOutlier) {
          performanceFlags.push('ENERGY_OUTLIER')
          performanceScore += 25
        }

        if (isTimeOutlier) {
          performanceFlags.push('TIME_OUTLIER')
          performanceScore += 25
        }
      }

      const performanceLevel = performanceScore > 80 ? 'poor' 
        : performanceScore > 40 ? 'below_average' 
        : performanceScore > 20 ? 'average' 
        : 'good'

      const needsTraining = performanceFlags.some(flag => 
        ['HIGH_ENERGY_USAGE', 'SLOW_SERVICE', 'INCONSISTENT_ENERGY', 'INCONSISTENT_TIME'].includes(flag)
      )

      return {
        id: profile.id,
        userId: profile.userId,
        serviceId: profile.serviceId,
        clinicId: profile.clinicId,
        hourBucket: profile.hourBucket,
        
        // Datos del empleado
        user: {
          name: `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim() || 'Desconocido',
          email: profile.user?.email || null,
          isActive: profile.user?.isActive || false
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
          benchmarkComparison: benchmark ? {
            benchmarkMean: Math.round(benchmark.benchmarkMeanKwh * 1000) / 1000,
            efficiency: benchmark.benchmarkMeanKwh > 0 
              ? Math.round(((benchmark.benchmarkMeanKwh - profile.meanKwh) / benchmark.benchmarkMeanKwh) * 100)
              : 0,
            quartilePosition: profile.meanKwh <= benchmark.q1Kwh ? 'Q1' :
                             profile.meanKwh <= benchmark.benchmarkMeanKwh ? 'Q2' :
                             profile.meanKwh <= benchmark.q3Kwh ? 'Q3' : 'Q4'
          } : null
        },
        
        // Métricas de tiempo
        time: {
          meanMinutes: Math.round(profile.meanMinutes * 100) / 100,
          stdDevMinutes: Math.round(profile.stdDevMinutes * 100) / 100,
          variabilityPct: variabilityTime,
          hourOfDay: profile.hourBucket,
          benchmarkComparison: benchmark ? {
            benchmarkMean: Math.round(benchmark.benchmarkMeanMinutes * 100) / 100,
            efficiency: benchmark.benchmarkMeanMinutes > 0
              ? Math.round(((benchmark.benchmarkMeanMinutes - profile.meanMinutes) / benchmark.benchmarkMeanMinutes) * 100)
              : 0,
            quartilePosition: profile.meanMinutes <= benchmark.q1Minutes ? 'Q1' :
                             profile.meanMinutes <= benchmark.benchmarkMeanMinutes ? 'Q2' :
                             profile.meanMinutes <= benchmark.q3Minutes ? 'Q3' : 'Q4'
          } : null
        },
        
        // Análisis de rendimiento
        performance: {
          level: performanceLevel,
          score: Math.round(performanceScore),
          flags: performanceFlags,
          needsTraining,
          isOutlier: performanceFlags.some(flag => flag.includes('OUTLIER'))
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
    const poorPerformers = enrichedProfiles.filter(p => p.performance.level === 'poor').length
    const needTraining = enrichedProfiles.filter(p => p.performance.needsTraining).length
    
    const topPerformers = enrichedProfiles
      .filter(p => p.performance.level === 'good')
      .sort((a, b) => a.performance.score - b.performance.score)
      .slice(0, 5)
      .map(p => ({
        userId: p.userId,
        userName: p.user.name,
        serviceName: p.service.name,
        performanceScore: p.performance.score,
        energyEfficiency: p.energy.benchmarkComparison?.efficiency || 0,
        timeEfficiency: p.time.benchmarkComparison?.efficiency || 0
      }))

    const poorPerformersList = enrichedProfiles
      .filter(p => p.performance.level === 'poor')
      .sort((a, b) => b.performance.score - a.performance.score)
      .slice(0, 10)
      .map(p => ({
        userId: p.userId,
        userName: p.user.name,
        serviceName: p.service.name,
        performanceScore: p.performance.score,
        performanceFlags: p.performance.flags,
        needsTraining: p.performance.needsTraining
      }))

    return NextResponse.json({
      success: true,
      data: {
        profiles: enrichedProfiles,
        
        // Metadatos y estadísticas de rendimiento
        metadata: {
          totalProfiles,
          poorPerformers,
          needTraining,
          performanceDistribution: {
            good: enrichedProfiles.filter(p => p.performance.level === 'good').length,
            average: enrichedProfiles.filter(p => p.performance.level === 'average').length,
            below_average: enrichedProfiles.filter(p => p.performance.level === 'below_average').length,
            poor: poorPerformers
          },
          topPerformers,
          poorPerformersList,
          filters: {
            clinicId,
            userId,
            serviceId,
            hourBucket,
            minSamples,
            performanceThreshold
          }
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo perfiles de usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 