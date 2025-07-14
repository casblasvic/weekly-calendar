import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 📊 ENERGY INSIGHTS DASHBOARD STATS - NUEVA ARQUITECTURA
 * =========================================================
 * 
 * Sistema refactorizado para obtener KPIs y estadísticas del dashboard
 * basado en servicios VALIDATED y datos directos de ServiceEnergyProfile.
 * 
 * ✅ NUEVA ARQUITECTURA IMPLEMENTADA:
 * 1. Lee directamente de ServiceEnergyProfile (datos ya calculados)
 * 2. Usa algoritmo de Welford para estadísticas precisas
 * 3. Elimina dependencia de datos desagregados
 * 4. Mantiene coherencia con finalizador y recálculo refactorizados
 * 5. Proporciona métricas de duración real vs configurada
 * 
 * 🎯 CAMBIOS CRÍTICOS:
 * - equipmentVariability usa ServiceEnergyProfile directamente
 * - Incluye avgMinutes y stdDevMinutes del algoritmo Welford
 * - Calcula variabilidad de duración además de energía
 * - Muestra durationMinutes (cita total) en tabla, usa treatmentDurationMinutes para cálculos
 * - Proporciona contexto completo para análisis
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation obligatorio
 * - avgKwhPerMin: Media de consumo por minuto (Welford)
 * - stdDevKwhPerMin: Desviación estándar de consumo (Welford)
 * - avgMinutes: Media de duración real (Welford)
 * - stdDevMinutes: Desviación estándar de duración (Welford)
 * - sampleCount: Número de muestras procesadas
 * - variabilityPct: Porcentaje de variabilidad energética
 * - durationVariabilityPct: Porcentaje de variabilidad de duración
 * 
 * Query params:
 * - clinicId?: string - Filtrar por clínica específica
 * - dateFrom?: string - Fecha inicio (ISO)
 * - dateTo?: string - Fecha fin (ISO)
 * 
 * @see docs/ENERGY_INSIGHTS_VALIDATED_SERVICES.md
 * @see lib/energy/usage-finalizer.ts
 */
export async function GET(req: NextRequest) {
  // 🚨 FEATURE FLAG: Solo si está activo el plugin Shelly
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }
  
  // 🔐 AUTENTICACIÓN OBLIGATORIA
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  const systemId = session.user.systemId
  const { searchParams } = new URL(req.url)
  const clinicId = searchParams.get('clinicId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  console.log(`📊 [STATS] Generando estadísticas para systemId: ${systemId}`)

  try {
    // 🎯 FILTROS BASE PARA INSIGHTS
    const whereInsights: any = { systemId }
    
    // Filtro por clínica - directo gracias al campo clinicId
    if (clinicId) {
      whereInsights.clinicId = clinicId
    }
    
    if (dateFrom) {
      whereInsights.detectedAt = { gte: new Date(dateFrom) }
    }
    
    if (dateTo) {
      whereInsights.detectedAt = { ...(whereInsights.detectedAt || {}), lte: new Date(dateTo) }
    }

    // 1️⃣ KPIs PRINCIPALES DE INSIGHTS (consultas simples y eficientes)
    const [totalInsights, openInsights, resolvedInsights] = await Promise.all([
      prisma.deviceUsageInsight.count({ where: whereInsights }),
      prisma.deviceUsageInsight.count({ where: { ...whereInsights, resolved: false } }),
      prisma.deviceUsageInsight.count({ where: { ...whereInsights, resolved: true } })
    ])

    console.log(`📈 [STATS] KPIs de insights:`, { totalInsights, openInsights, resolvedInsights })

    // 2️⃣ ANOMALÍAS POR TIPO
    const insightsByType = await prisma.deviceUsageInsight.groupBy({
      by: ['insightType'],
      where: whereInsights,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })

    // 3️⃣ EQUIPOS CON VARIABILIDAD - LECTURA DIRECTA DE ServiceEnergyProfile
    // ✅ NUEVA ARQUITECTURA: Lee directamente de la tabla de perfiles calculados
    const equipmentVariability = await prisma.serviceEnergyProfile.findMany({
      where: {
        systemId,
        sampleCount: { gte: 5 }, // Mínimo de muestras para estadísticas confiables
        stdDevKwhPerMin: { gt: 0 } // Solo perfiles con variabilidad
      },
      include: {
        equipment: { 
          select: { 
            id: true,
            name: true 
          } 
        },
        service: { 
          select: { 
            id: true,
            name: true, 
            durationMinutes: true,
            treatmentDurationMinutes: true
          } 
        }
      },
      orderBy: [
        { stdDevKwhPerMin: 'desc' }, // Ordenar por variabilidad energética
        { sampleCount: 'desc' }      // Luego por número de muestras
      ],
      take: 20 // Aumentar límite para más datos
    })

    console.log(`🔧 [STATS] Perfiles de equipamiento encontrados: ${equipmentVariability.length}`)

    // 📊 PROCESAR DATOS DE EQUIPAMIENTO CON NUEVA LÓGICA
    const processedEquipmentVariability = equipmentVariability.map(profile => {
      // 🧮 CALCULAR MÉTRICAS DE VARIABILIDAD ENERGÉTICA
      const variabilityPct = profile.avgKwhPerMin > 0 ? 
        Math.round((profile.stdDevKwhPerMin / profile.avgKwhPerMin) * 100) : 0

      // ⏱️ CALCULAR MÉTRICAS DE VARIABILIDAD DE DURACIÓN
      const durationVariabilityPct = profile.avgMinutes > 0 && profile.stdDevMinutes > 0 ? 
        Math.round((profile.stdDevMinutes / profile.avgMinutes) * 100) : 0

      // 🎯 DETERMINAR DURACIÓN CONFIGURADA PARA MOSTRAR EN TABLA
      // Para la tabla mostramos durationMinutes (duración total de cita)
      // treatmentDurationMinutes se usa solo para cálculos internos
      const configuredDurationMinutes = profile.service?.durationMinutes || null

      // 📈 CALCULAR EFICIENCIA DE DURACIÓN (real vs configurado)
      let durationEfficiencyPct = null
      if (configuredDurationMinutes && configuredDurationMinutes > 0 && profile.avgMinutes > 0) {
        // Eficiencia: menor duración real = mayor eficiencia
        durationEfficiencyPct = Math.round((configuredDurationMinutes / profile.avgMinutes) * 100)
      }

      // 🎨 FORMATEAR NÚMEROS PARA MEJOR LEGIBILIDAD
      const formattedAvgKwhPerMin = Math.round(profile.avgKwhPerMin * 10000) / 10000
      const formattedStdDevKwhPerMin = Math.round(profile.stdDevKwhPerMin * 10000) / 10000
      const formattedAvgMinutes = profile.avgMinutes ? Math.round(profile.avgMinutes * 100) / 100 : null
      const formattedStdDevMinutes = profile.stdDevMinutes ? Math.round(profile.stdDevMinutes * 100) / 100 : null

      return {
        // 🏭 INFORMACIÓN DEL EQUIPAMIENTO
        equipmentId: profile.equipment?.id || 'unknown',
        equipmentName: profile.equipment?.name || 'Equipo Desconocido',
        
        // 🔧 INFORMACIÓN DEL SERVICIO
        serviceId: profile.service?.id || 'unknown',
        serviceName: profile.service?.name || 'Servicio Desconocido',
        
        // ⚡ MÉTRICAS ENERGÉTICAS (ALGORITMO WELFORD)
        avgKwhPerMin: formattedAvgKwhPerMin,
        stdDevKwhPerMin: formattedStdDevKwhPerMin,
        variabilityPct: variabilityPct,
        
        // ⏱️ MÉTRICAS DE DURACIÓN (ALGORITMO WELFORD)
        configuredDurationMinutes: configuredDurationMinutes,
        avgRealDurationMinutes: formattedAvgMinutes,
        stdDevRealDurationMinutes: formattedStdDevMinutes,
        durationVariabilityPct: durationVariabilityPct,
        durationEfficiencyPct: durationEfficiencyPct,
        
        // 📊 MÉTRICAS DE CALIDAD DE DATOS
        sampleCount: profile.sampleCount,
        
        // 🎯 METADATOS PARA ANÁLISIS
        durationSource: profile.service?.durationMinutes ? 'durationMinutes' : 'unknown',
        
        // 🚨 INDICADORES DE ALERTA
        highEnergyVariability: variabilityPct > 30,
        highDurationVariability: durationVariabilityPct > 20,
        lowEfficiency: durationEfficiencyPct !== null && durationEfficiencyPct < 80,
        
        // 📈 TENDENCIAS
        isStable: variabilityPct < 15 && durationVariabilityPct < 15,
        needsAttention: variabilityPct > 50 || durationVariabilityPct > 40,
        
        // 🤖 METADATOS PARA IA
        aiMetadata: {
          profileMaturity: profile.sampleCount >= 20 ? 'mature' : 
                          profile.sampleCount >= 10 ? 'developing' : 'initial',
          dataQuality: profile.sampleCount >= 10 && variabilityPct < 30 ? 'high' : 
                      profile.sampleCount >= 5 ? 'medium' : 'low',
          recommendedAction: variabilityPct > 50 ? 'investigate_equipment' :
                           durationVariabilityPct > 40 ? 'review_procedures' :
                           'monitor'
        }
      }
    })

    console.log(`✅ [STATS] Datos de equipamiento procesados: ${processedEquipmentVariability.length} perfiles`)

    // 📊 ESTADÍSTICAS AGREGADAS DE EQUIPAMIENTO
    const equipmentStats = {
      totalProfiles: processedEquipmentVariability.length,
      highVariabilityCount: processedEquipmentVariability.filter(e => e.highEnergyVariability).length,
      stableProfilesCount: processedEquipmentVariability.filter(e => e.isStable).length,
      needsAttentionCount: processedEquipmentVariability.filter(e => e.needsAttention).length,
      avgSampleCount: processedEquipmentVariability.length > 0 ? 
        Math.round(processedEquipmentVariability.reduce((sum, e) => sum + e.sampleCount, 0) / processedEquipmentVariability.length) : 0,
      avgVariabilityPct: processedEquipmentVariability.length > 0 ?
        Math.round(processedEquipmentVariability.reduce((sum, e) => sum + e.variabilityPct, 0) / processedEquipmentVariability.length) : 0
    }

    console.log(`📈 [STATS] Estadísticas agregadas:`, equipmentStats)

    return NextResponse.json({
      success: true,
      data: {
        // 📊 KPIs PRINCIPALES
        insights: {
          total: totalInsights,
          open: openInsights,
          resolved: resolvedInsights,
          resolutionRate: totalInsights > 0 ? Math.round((resolvedInsights / totalInsights) * 100) : 0
        },
        
        // 📈 DISTRIBUCIÓN POR TIPO
        anomaliesByType: insightsByType.map(item => ({
          type: item.insightType,
          count: item._count.id
        })),
        
        // 🔧 EQUIPAMIENTO CON DATOS COMPLETOS (NUEVA ARQUITECTURA)
        equipmentVariability: processedEquipmentVariability,
        
        // 📊 ESTADÍSTICAS AGREGADAS
        equipmentStats: equipmentStats,
        
        // 📈 RANKINGS PROBLEMÁTICOS (pendiente de implementación)
        topProblematicServices: [],
        topProblematicClients: [],
        topProblematicEmployees: [],
        
        // 📊 EVOLUCIÓN TEMPORAL (pendiente de implementación)
        weeklyEvolution: [],
        
        // 🎯 DISTRIBUCIÓN DE CONFIANZA (pendiente de implementación)
        confidenceDistribution: [],
        
        // 🤖 METADATOS DEL SISTEMA
        systemMetadata: {
          architecture: 'validated_services',
          dataSource: 'ServiceEnergyProfile',
          algorithm: 'welford_incremental',
          lastUpdated: new Date().toISOString(),
          profilesAnalyzed: processedEquipmentVariability.length,
          totalSamples: processedEquipmentVariability.reduce((sum, e) => sum + e.sampleCount, 0)
        },
        
        // 📅 METADATOS DE FILTROS
        filters: {
          clinicId,
          dateFrom,
          dateTo,
          systemId: systemId.substring(0, 8) + '...' // Partial para logs
        },
        
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ [STATS] Error generando estadísticas:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 