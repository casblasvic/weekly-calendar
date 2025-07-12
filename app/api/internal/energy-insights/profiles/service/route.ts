import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 📊 ENERGY INSIGHTS SERVICE PROFILES
 * 
 * Endpoint para consultar perfiles energéticos por servicio individual.
 * Proporciona estadísticas de consumo y duración para cada servicio.
 * 
 * Query params:
 * - equipmentId?: string - Filtrar por equipo específico
 * - serviceId?: string - Filtrar por servicio específico
 * - minSamples?: number - Mínimo de muestras (default: 5)
 * - orderBy?: 'variance' | 'samples' | 'consumption' - Ordenar por (default: variance)
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
  const equipmentId = searchParams.get('equipmentId')
  const serviceId = searchParams.get('serviceId')
  const minSamples = parseInt(searchParams.get('minSamples') || '5')
  const orderBy = searchParams.get('orderBy') || 'variance'

  try {
    // Construir filtros
    const where: any = {
      systemId,
      sampleCount: { gte: minSamples }
    }
    
    if (equipmentId) {
      where.equipmentId = equipmentId
    }
    
    if (serviceId) {
      where.serviceId = serviceId
    }

    // Construir ordenamiento
    let orderByClause: any
    switch (orderBy) {
      case 'samples':
        orderByClause = { sampleCount: 'desc' }
        break
      case 'consumption':
        orderByClause = { avgKwhPerMin: 'desc' }
        break
      case 'variance':
      default:
        orderByClause = { stdDevKwhPerMin: 'desc' }
        break
    }

    // Consultar perfiles con relaciones
    const profiles = await prisma.serviceEnergyProfile.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            modelNumber: true
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
        }
      },
      orderBy: orderByClause,
      take: 100 // Límite para evitar sobrecarga
    })

    // Calcular estadísticas adicionales
    const enrichedProfiles = profiles.map(profile => {
      const variabilityPct = profile.avgKwhPerMin > 0 
        ? Math.round((profile.stdDevKwhPerMin / profile.avgKwhPerMin) * 100) 
        : 0

      const timeVariabilityPct = profile.avgMinutes > 0
        ? Math.round((profile.stdDevMinutes / profile.avgMinutes) * 100)
        : 0

      const efficiency = profile.service?.treatmentDurationMinutes && profile.avgMinutes > 0
        ? Math.round((profile.service.treatmentDurationMinutes / profile.avgMinutes) * 100)
        : null

      const confidenceLevel = profile.sampleCount >= 20 ? 'high' 
        : profile.sampleCount >= 10 ? 'medium' 
        : 'low'

      return {
        id: profile.id,
        equipmentId: profile.equipmentId,
        serviceId: profile.serviceId,
        
        // Datos del equipo
        equipment: {
          name: profile.equipment?.name || 'Desconocido',
          model: profile.equipment?.modelNumber || null
        },
        
        // Datos del servicio
        service: {
          name: profile.service?.name || 'Desconocido',
          description: profile.service?.description || null,
          estimatedDuration: profile.service?.durationMinutes || null,
          treatmentDuration: profile.service?.treatmentDurationMinutes || null
        },
        
        // Métricas de energía
        energy: {
          avgKwhPerMin: Math.round(profile.avgKwhPerMin * 10000) / 10000,
          stdDevKwhPerMin: Math.round(profile.stdDevKwhPerMin * 10000) / 10000,
          variabilityPct,
          totalKwhEstimated: profile.service?.treatmentDurationMinutes 
            ? Math.round(profile.avgKwhPerMin * profile.service.treatmentDurationMinutes * 1000) / 1000
            : null
        },
        
        // Métricas de tiempo
        time: {
          avgMinutes: Math.round(profile.avgMinutes * 100) / 100,
          stdDevMinutes: Math.round(profile.stdDevMinutes * 100) / 100,
          timeVariabilityPct,
          efficiency
        },
        
        // Métricas de calidad
        quality: {
          sampleCount: profile.sampleCount,
          confidenceLevel,
          lastUpdated: profile.updatedAt.toISOString()
        }
      }
    })

    // Estadísticas generales
    const totalProfiles = enrichedProfiles.length
    const avgVariability = totalProfiles > 0 
      ? Math.round(enrichedProfiles.reduce((sum, p) => sum + p.energy.variabilityPct, 0) / totalProfiles)
      : 0
    const highVariabilityCount = enrichedProfiles.filter(p => p.energy.variabilityPct > 20).length

    return NextResponse.json({
      success: true,
      data: {
        profiles: enrichedProfiles,
        
        // Metadatos
        metadata: {
          totalProfiles,
          filters: {
            equipmentId,
            serviceId,
            minSamples,
            orderBy
          },
          statistics: {
            avgVariability,
            highVariabilityCount,
            highVariabilityPct: totalProfiles > 0 
              ? Math.round((highVariabilityCount / totalProfiles) * 100) 
              : 0
          }
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo perfiles de servicio:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 