import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

/**
 * 📊 ENERGY INSIGHTS GROUP PROFILES
 * 
 * Endpoint para consultar perfiles energéticos por combinación de servicios.
 * Analiza patrones de consumo cuando se realizan múltiples servicios juntos.
 * 
 * Query params:
 * - equipmentId?: string - Filtrar por equipo específico
 * - servicesHash?: string - Filtrar por hash específico
 * - hourBucket?: number - Filtrar por hora del día (0-23)
 * - minSamples?: number - Mínimo de muestras (default: 3)
 * - decode?: boolean - Incluir nombres de servicios decodificados (default: true)
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
  const servicesHash = searchParams.get('servicesHash')
  const hourBucket = searchParams.get('hourBucket') ? parseInt(searchParams.get('hourBucket')!) : undefined
  const minSamples = parseInt(searchParams.get('minSamples') || '3')
  const decode = searchParams.get('decode') !== 'false'

  try {
    // Construir filtros
    const where: any = {
      systemId,
      samples: { gte: minSamples }
    }
    
    if (equipmentId) {
      where.equipmentId = equipmentId
    }
    
    if (servicesHash) {
      where.servicesHash = servicesHash
    }
    
    if (hourBucket !== undefined) {
      where.hourBucket = hourBucket
    }

    // Consultar perfiles de grupo
    const profiles = await prisma.serviceGroupEnergyProfile.findMany({
      where,
      orderBy: [
        { samples: 'desc' },
        { meanKwh: 'desc' }
      ],
      take: 50 // Límite para evitar sobrecarga
    })

    // Decodificar servicios si se solicita
    let serviceNames: Record<string, string> = {}
    if (decode && profiles.length > 0) {
      // Extraer todos los IDs de servicios únicos
      const allServiceIds = new Set<string>()
      profiles.forEach(profile => {
        if (Array.isArray(profile.services)) {
          profile.services.forEach((serviceId: string) => allServiceIds.add(serviceId))
        }
      })

      // Obtener nombres de servicios
      if (allServiceIds.size > 0) {
        const services = await prisma.service.findMany({
          where: {
            id: { in: Array.from(allServiceIds) },
            systemId
          },
          select: {
            id: true,
            name: true
          }
        })
        
        serviceNames = Object.fromEntries(services.map(s => [s.id, s.name]))
      }
    }

    // Enriquecer perfiles con estadísticas
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

      // Decodificar servicios
      const servicesList = Array.isArray(profile.services) ? profile.services as string[] : []
      const servicesDecoded = decode ? servicesList.map(id => ({
        id,
        name: serviceNames[id] || 'Desconocido'
      })) : servicesList.map(id => ({ id, name: null }))

      return {
        id: profile.id,
        equipmentId: profile.equipmentId,
        servicesHash: profile.servicesHash,
        hourBucket: profile.hourBucket,
        
        // Servicios incluidos
        services: {
          count: servicesList.length,
          ids: servicesList,
          decoded: servicesDecoded,
          hashVerification: crypto.createHash('md5').update(servicesList.sort().join('+')).digest('hex')
        },
        
        // Métricas de energía
        energy: {
          meanKwh: Math.round(profile.meanKwh * 1000) / 1000,
          stdDevKwh: Math.round(profile.stdDevKwh * 1000) / 1000,
          variabilityPct: variabilityKwh,
          efficiency: efficiency
        },
        
        // Métricas de tiempo
        time: {
          meanMinutes: Math.round(profile.meanMinutes * 100) / 100,
          stdDevMinutes: Math.round(profile.stdDevMinutes * 100) / 100,
          variabilityPct: variabilityTime,
          hourOfDay: profile.hourBucket
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
    const avgServicesPerGroup = totalProfiles > 0 
      ? Math.round(enrichedProfiles.reduce((sum, p) => sum + p.services.count, 0) / totalProfiles * 100) / 100
      : 0
    const mostCommonHour = totalProfiles > 0 
      ? enrichedProfiles.reduce((acc, p) => {
          acc[p.hourBucket] = (acc[p.hourBucket] || 0) + 1
          return acc
        }, {} as Record<number, number>)
      : {}

    const peakHour = Object.entries(mostCommonHour).reduce((a, b) => 
      mostCommonHour[parseInt(a[0])] > mostCommonHour[parseInt(b[0])] ? a : b, ['0', 0]
    )[0]

    return NextResponse.json({
      success: true,
      data: {
        profiles: enrichedProfiles,
        
        // Metadatos
        metadata: {
          totalProfiles,
          filters: {
            equipmentId,
            servicesHash,
            hourBucket,
            minSamples,
            decode
          },
          statistics: {
            avgServicesPerGroup,
            peakHour: parseInt(peakHour),
            peakHourCount: mostCommonHour[parseInt(peakHour)] || 0,
            hourDistribution: mostCommonHour
          }
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo perfiles de grupo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * 🔍 DECODE HASH ENDPOINT
 * 
 * Endpoint auxiliar para decodificar un hash de servicios específico.
 * Útil para debugging y análisis manual.
 */
export async function POST(req: NextRequest) {
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }
  
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  const systemId = session.user.systemId
  
  try {
    const { servicesHash, serviceIds } = await req.json()
    
    if (servicesHash) {
      // Buscar perfil por hash para obtener IDs
      const profile = await prisma.serviceGroupEnergyProfile.findFirst({
        where: {
          systemId,
          servicesHash
        },
        select: {
          services: true,
          servicesHash: true
        }
      })
      
      if (!profile || !Array.isArray(profile.services)) {
        return NextResponse.json({ error: 'Hash no encontrado' }, { status: 404 })
      }
      
      const servicesList = profile.services as string[]
      
      // Obtener nombres de servicios
      const services = await prisma.service.findMany({
        where: {
          id: { in: servicesList },
          systemId
        },
        select: {
          id: true,
          name: true,
          description: true
        }
      })
      
      return NextResponse.json({
        success: true,
        data: {
          hash: servicesHash,
          serviceIds: servicesList,
          services,
          hashVerification: crypto.createHash('md5').update(servicesList.sort().join('+')).digest('hex')
        }
      })
    }
    
    if (serviceIds && Array.isArray(serviceIds)) {
      // Generar hash para IDs dados
      const hash = crypto.createHash('md5').update(serviceIds.sort().join('+')).digest('hex')
      
      // Obtener nombres de servicios
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          systemId
        },
        select: {
          id: true,
          name: true,
          description: true
        }
      })
      
      return NextResponse.json({
        success: true,
        data: {
          hash,
          serviceIds,
          services,
          hashVerification: hash
        }
      })
    }
    
    return NextResponse.json({ error: 'Se requiere servicesHash o serviceIds' }, { status: 400 })
    
  } catch (error) {
    console.error('Error decodificando hash:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 