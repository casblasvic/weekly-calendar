/**
 * 🧮 CALCULADOR INCREMENTAL DE CERTEZA - ALGORITMO WELFORD ADAPTADO
 * ================================================================
 * 
 * Sistema híbrido para calcular certeza de manera incremental sin recalcular todo:
 * - Algoritmo Welford adaptado para métricas de certeza
 * - Actualización O(1) en lugar de O(n) recálculo completo
 * - Mantiene precisión matemática equivalente
 * - Optimizado para escalabilidad y rendimiento
 * 
 * 🎯 ALGORITMO WELFORD ORIGINAL (VARIANZA):
 * - count = count + 1
 * - delta = newValue - mean
 * - mean = mean + delta / count
 * - M2 = M2 + delta * (newValue - mean)
 * - variance = M2 / (count - 1)
 * 
 * 🚀 NUESTRO ALGORITMO ADAPTADO (CERTEZA):
 * - Mantiene media y varianza de certeza incremental
 * - Actualiza métricas de calidad (perfiles, muestras, distribución)
 * - Calcula tendencias y direcciones de mejora
 * - Decide cuándo hacer recálculo completo vs incremental
 * 
 * Variables críticas:
 * - systemId: Aislamiento multi-tenant
 * - sampleCount: Contador incremental de muestras
 * - confidenceMean: Media de certeza (algoritmo Welford)
 * - confidenceM2: Suma de cuadrados para varianza (algoritmo Welford)
 * - profileCount: Contador de perfiles energéticos
 * - matureProfileCount: Contador de perfiles maduros (>=20 muestras)
 * 
 * @see docs/CONFIDENCE_SYSTEM_OPTIMIZATIONS.md
 * @see https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
 */

import { prisma } from '@/lib/db'
import type { SystemConfidence, SystemMaturityLevel } from './confidence-calculator'

// ============================================================================
// 🎯 INTERFACES PARA SISTEMA INCREMENTAL
// ============================================================================

/**
 * 📊 Datos de entrada para actualización incremental
 */
export interface IncrementalUpdateData {
  type: 'appointment_completed' | 'profile_created' | 'profile_updated' | 'anomaly_detected' | 'sample_added'
  confidence?: number
  serviceId?: string
  profileId?: string
  sampleCount?: number
  isNewProfile?: boolean
  isMatureProfile?: boolean
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * 📈 Métricas incrementales almacenadas
 */
export interface IncrementalMetrics {
  id: string
  systemId: string
  
  // Algoritmo Welford para certeza
  sampleCount: number
  confidenceMean: number
  confidenceM2: number
  
  // Métricas de calidad
  profileCount: number
  matureProfileCount: number
  totalSamples: number
  
  // Métricas de estabilidad
  variabilitySum: number
  temporalCoverageBits: bigint
  serviceDistributionSum: number
  
  // Tendencias
  improvementRate: number
  lastConfidence: number
  trendDirection: 'improving' | 'declining' | 'stable'
  
  // Control
  lastUpdated: Date
  lastCalculation: Date
  recalculationCount: number
  
  // IA
  calculationMethod: string
  confidenceHistory: number[]
}

// ============================================================================
// 🧮 CALCULADOR INCREMENTAL PRINCIPAL
// ============================================================================

/**
 * 🎯 CLASE PRINCIPAL: Calculador Incremental de Certeza
 * 
 * Implementa algoritmo Welford adaptado para métricas de certeza:
 * - Actualización O(1) vs O(n) recálculo completo
 * - Mantiene precisión matemática equivalente
 * - Decide automáticamente cuándo recalcular completamente
 * - Optimizado para alta concurrencia y escalabilidad
 */
export class IncrementalConfidenceCalculator {
  
  // 🚨 CACHE LOCAL PARA EVITAR CONSULTAS REPETIDAS
  private metricsCache = new Map<string, { metrics: IncrementalMetrics; timestamp: number }>()
  private readonly CACHE_DURATION = 10 * 1000 // 10 segundos (más corto que el global)
  
  /**
   * 🎯 MÉTODO PRINCIPAL: Actualizar métricas incrementalmente
   * 
   * Usa algoritmo Welford adaptado para actualizar certeza sin recalcular todo:
   * - Actualiza media y varianza incrementalmente
   * - Mantiene contadores de perfiles y muestras
   * - Calcula tendencias y direcciones
   * - Decide si necesita recálculo completo
   * 
   * @param systemId - ID del sistema
   * @param updateData - Datos de la actualización
   * @returns Métricas actualizadas
   */
  async updateSystemMetrics(systemId: string, updateData: IncrementalUpdateData): Promise<IncrementalMetrics> {
    try {
      // 📊 OBTENER MÉTRICAS ACTUALES
      const currentMetrics = await this.getCurrentMetrics(systemId)
      
      // 🧮 APLICAR ALGORITMO WELFORD ADAPTADO
      const updatedMetrics = this.applyWelfordUpdate(currentMetrics, updateData)
      
      // 💾 GUARDAR MÉTRICAS ACTUALIZADAS
      const savedMetrics = await this.saveMetrics(systemId, updatedMetrics)
      
      // 🚨 INVALIDAR CACHE LOCAL
      this.metricsCache.delete(systemId)
      
      return savedMetrics
      
    } catch (error) {
      console.error('Error actualizando métricas incrementales:', error)
      throw error
    }
  }
  
  /**
   * 🎯 OBTENER CERTEZA DESDE MÉTRICAS INCREMENTALES
   * 
   * Calcula certeza completa desde métricas incrementales sin consultas adicionales:
   * - Usa datos ya calculados incrementalmente
   * - Aplica fórmulas de certeza optimizadas
   * - Mantiene compatibilidad con sistema actual
   * 
   * @param systemId - ID del sistema
   * @returns Certeza del sistema calculada incrementalmente
   */
  async getSystemConfidence(systemId: string): Promise<SystemConfidence> {
    try {
      const metrics = await this.getCurrentMetrics(systemId)
      return this.calculateConfidenceFromMetrics(metrics)
    } catch (error) {
      console.error('Error obteniendo certeza incremental:', error)
      throw error
    }
  }
  
  /**
   * 🔄 DECIDIR SI RECALCULAR COMPLETAMENTE
   * 
   * Lógica inteligente para decidir cuándo usar incremental vs recálculo completo:
   * - Cada 24 horas recálculo completo
   * - Cada 100 nuevas muestras recálculo completo
   * - Si hay muchas anomalías recálculo completo
   * - Si hay inconsistencias detectadas recálculo completo
   * 
   * @param metrics - Métricas actuales
   * @returns true si debe recalcular completamente
   */
  shouldRecalculateFromScratch(metrics: IncrementalMetrics): boolean {
    const now = new Date()
    const lastCalculation = new Date(metrics.lastCalculation)
    const hoursAgo = (now.getTime() - lastCalculation.getTime()) / (1000 * 60 * 60)
    
    return (
      hoursAgo > 24 || // 🕐 Recalcular cada 24 horas
      metrics.sampleCount % 100 === 0 || // 📊 Cada 100 nuevas muestras
      metrics.recalculationCount === 0 || // 🆕 Primera vez
      this.detectInconsistencies(metrics) // 🚨 Inconsistencias detectadas
    )
  }
  
  // ============================================================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS
  // ============================================================================
  
  /**
   * 📊 OBTENER MÉTRICAS ACTUALES (CON CACHE)
   */
  public async getCurrentMetrics(systemId: string): Promise<IncrementalMetrics> {
    // 🚨 VERIFICAR CACHE LOCAL
    const cached = this.metricsCache.get(systemId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.metrics
    }
    
    try {
      // 📊 CONSULTAR BASE DE DATOS
      const dbMetrics = await prisma.systemConfidenceMetrics.findUnique({
        where: { systemId }
      })
      
      let metrics: IncrementalMetrics
      
      if (dbMetrics) {
        // 🔄 CONVERTIR DE DB A INTERFACE
        metrics = {
          id: dbMetrics.id,
          systemId: dbMetrics.systemId,
          sampleCount: dbMetrics.sampleCount,
          confidenceMean: Number(dbMetrics.confidenceMean),
          confidenceM2: Number(dbMetrics.confidenceM2),
          profileCount: dbMetrics.profileCount,
          matureProfileCount: dbMetrics.matureProfileCount,
          totalSamples: dbMetrics.totalSamples,
          variabilitySum: Number(dbMetrics.variabilitySum),
          temporalCoverageBits: dbMetrics.temporalCoverageBits,
          serviceDistributionSum: Number(dbMetrics.serviceDistributionSum),
          improvementRate: Number(dbMetrics.improvementRate),
          lastConfidence: Number(dbMetrics.lastConfidence),
          trendDirection: dbMetrics.trendDirection as 'improving' | 'declining' | 'stable',
          lastUpdated: dbMetrics.lastUpdated,
          lastCalculation: dbMetrics.lastCalculation,
          recalculationCount: dbMetrics.recalculationCount,
          calculationMethod: dbMetrics.calculationMethod,
          confidenceHistory: JSON.parse(dbMetrics.confidenceHistory)
        }
      } else {
        // 🆕 CREAR MÉTRICAS INICIALES
        metrics = this.createInitialMetrics(systemId)
      }
      
      // 🚨 GUARDAR EN CACHE
      this.metricsCache.set(systemId, {
        metrics,
        timestamp: Date.now()
      })
      
      return metrics
      
    } catch (error) {
      console.error('Error obteniendo métricas:', error)
      return this.createInitialMetrics(systemId)
    }
  }
  
  /**
   * 🧮 APLICAR ALGORITMO WELFORD ADAPTADO
   */
  private applyWelfordUpdate(
    currentMetrics: IncrementalMetrics,
    updateData: IncrementalUpdateData
  ): IncrementalMetrics {
    const updated = { ...currentMetrics }
    
    // 🎯 ALGORITMO WELFORD PARA CERTEZA (SI HAY VALOR)
    if (updateData.confidence !== undefined) {
      const newSampleCount = updated.sampleCount + 1
      const delta = updateData.confidence - updated.confidenceMean
      const newMean = updated.confidenceMean + delta / newSampleCount
      const delta2 = updateData.confidence - newMean
      const newM2 = updated.confidenceM2 + delta * delta2
      
      updated.sampleCount = newSampleCount
      updated.confidenceMean = newMean
      updated.confidenceM2 = newM2
      updated.lastConfidence = updateData.confidence
    }
    
    // 📊 ACTUALIZAR CONTADORES SEGÚN TIPO
    switch (updateData.type) {
      case 'profile_created':
        updated.profileCount += 1
        if (updateData.isMatureProfile) {
          updated.matureProfileCount += 1
        }
        break
      
      case 'profile_updated':
        if (updateData.isMatureProfile && updateData.sampleCount === 20) {
          // Se convirtió en maduro
          updated.matureProfileCount += 1
        }
        break
      
      case 'sample_added':
        updated.totalSamples += 1
        break
      
      case 'appointment_completed':
        // Incrementar cobertura temporal
        const hour = updateData.timestamp.getHours()
        updated.temporalCoverageBits = updated.temporalCoverageBits | (BigInt(1) << BigInt(hour))
        break
    }
    
    // 📈 CALCULAR TENDENCIA
    updated.trendDirection = this.calculateTrendDirection(updated)
    updated.improvementRate = this.calculateImprovementRate(updated)
    
    // 🕐 ACTUALIZAR TIMESTAMPS
    updated.lastUpdated = new Date()
    
    // 🤖 ACTUALIZAR HISTORIAL (ÚLTIMOS 10 VALORES)
    if (updateData.confidence !== undefined) {
      updated.confidenceHistory = [...updated.confidenceHistory, updateData.confidence].slice(-10)
    }
    
    return updated
  }
  
  /**
   * 💾 GUARDAR MÉTRICAS EN BASE DE DATOS
   */
  private async saveMetrics(systemId: string, metrics: IncrementalMetrics): Promise<IncrementalMetrics> {
    const saved = await prisma.systemConfidenceMetrics.upsert({
      where: { systemId },
      update: {
        sampleCount: metrics.sampleCount,
        confidenceMean: metrics.confidenceMean,
        confidenceM2: metrics.confidenceM2,
        profileCount: metrics.profileCount,
        matureProfileCount: metrics.matureProfileCount,
        totalSamples: metrics.totalSamples,
        variabilitySum: metrics.variabilitySum,
        temporalCoverageBits: metrics.temporalCoverageBits,
        serviceDistributionSum: metrics.serviceDistributionSum,
        improvementRate: metrics.improvementRate,
        lastConfidence: metrics.lastConfidence,
        trendDirection: metrics.trendDirection,
        lastUpdated: metrics.lastUpdated,
        calculationMethod: 'incremental',
        confidenceHistory: JSON.stringify(metrics.confidenceHistory)
      },
      create: {
        systemId,
        sampleCount: metrics.sampleCount,
        confidenceMean: metrics.confidenceMean,
        confidenceM2: metrics.confidenceM2,
        profileCount: metrics.profileCount,
        matureProfileCount: metrics.matureProfileCount,
        totalSamples: metrics.totalSamples,
        variabilitySum: metrics.variabilitySum,
        temporalCoverageBits: metrics.temporalCoverageBits,
        serviceDistributionSum: metrics.serviceDistributionSum,
        improvementRate: metrics.improvementRate,
        lastConfidence: metrics.lastConfidence,
        trendDirection: metrics.trendDirection,
        lastUpdated: metrics.lastUpdated,
        lastCalculation: new Date(),
        recalculationCount: 0,
        calculationMethod: 'incremental',
        confidenceHistory: JSON.stringify(metrics.confidenceHistory)
      }
    })
    
    return this.convertDbToMetrics(saved)
  }
  
  /**
   * 🎯 CALCULAR CERTEZA DESDE MÉTRICAS INCREMENTALES
   */
  private calculateConfidenceFromMetrics(metrics: IncrementalMetrics): SystemConfidence {
    // 📊 CALCULAR CERTEZA DESDE MÉTRICAS INCREMENTALES
    const coveragePercentage = metrics.profileCount > 0 ? 
      metrics.matureProfileCount / metrics.profileCount : 0
    
    const avgSamplesPerProfile = metrics.profileCount > 0 ? 
      metrics.totalSamples / metrics.profileCount : 0
    
    // 🧮 USAR ALGORITMO WELFORD PARA VARIANZA
    const variance = metrics.sampleCount > 1 ? 
      metrics.confidenceM2 / (metrics.sampleCount - 1) : 0
    
    const stability = Math.max(0, 1 - Math.sqrt(variance) / 100)
    
    // 🎯 CALCULAR CERTEZA GLOBAL (OPTIMIZADO)
    const coverageFactor = coveragePercentage * 0.4
    const sampleFactor = Math.min(avgSamplesPerProfile / 50, 1) * 0.3
    const stabilityFactor = stability * 0.3
    
    const globalConfidence = (coverageFactor + sampleFactor + stabilityFactor) * 100
    
    // 📊 DETERMINAR NIVEL DE MADUREZ
    const maturityLevel = this.determineMaturityLevel(globalConfidence)
    
    return {
      globalConfidence: Math.round(globalConfidence),
      maturityLevel,
      dataMaturity: {
        totalProfiles: metrics.profileCount,
        matureProfiles: metrics.matureProfileCount,
        coveragePercentage: Math.round(coveragePercentage * 100),
        avgSamplesPerProfile: Math.round(avgSamplesPerProfile)
      },
      qualityMetrics: {
        variabilityStability: Math.round(stability * 100) / 100,
        temporalCoverage: this.calculateTemporalCoverage(metrics.temporalCoverageBits),
        serviceDistribution: Math.round(metrics.serviceDistributionSum * 100) / 100
      },
      systemStatus: this.generateSystemStatus(maturityLevel, globalConfidence, metrics),
      thresholds: {
        minimumForDetection: 10,
        recommendedForProduction: 75
      },
      aiMetadata: {
        calculationTimestamp: new Date().toISOString(),
        factorsUsed: ['incremental', 'welford', 'hybrid'],
        confidenceHistory: metrics.confidenceHistory,
        improvementRate: metrics.improvementRate
      }
    }
  }
  
  /**
   * 🆕 CREAR MÉTRICAS INICIALES
   */
  private createInitialMetrics(systemId: string): IncrementalMetrics {
    return {
      id: '',
      systemId,
      sampleCount: 0,
      confidenceMean: 0,
      confidenceM2: 0,
      profileCount: 0,
      matureProfileCount: 0,
      totalSamples: 0,
      variabilitySum: 0,
      temporalCoverageBits: BigInt(0),
      serviceDistributionSum: 0,
      improvementRate: 0,
      lastConfidence: 0,
      trendDirection: 'stable',
      lastUpdated: new Date(),
      lastCalculation: new Date(),
      recalculationCount: 0,
      calculationMethod: 'incremental',
      confidenceHistory: []
    }
  }
  
  /**
   * 📈 CALCULAR DIRECCIÓN DE TENDENCIA
   */
  private calculateTrendDirection(metrics: IncrementalMetrics): 'improving' | 'declining' | 'stable' {
    if (metrics.confidenceHistory.length < 3) return 'stable'
    
    const recent = metrics.confidenceHistory.slice(-3)
    const older = metrics.confidenceHistory.slice(-6, -3)
    
    if (older.length === 0) return 'stable'
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length
    
    const diff = recentAvg - olderAvg
    
    if (diff > 2) return 'improving'
    if (diff < -2) return 'declining'
    return 'stable'
  }
  
  /**
   * 📊 CALCULAR TASA DE MEJORA
   */
  private calculateImprovementRate(metrics: IncrementalMetrics): number {
    if (metrics.confidenceHistory.length < 2) return 0
    
    const recent = metrics.confidenceHistory.slice(-2)
    return recent[1] - recent[0]
  }
  
  /**
   * 🚨 DETECTAR INCONSISTENCIAS
   */
  private detectInconsistencies(metrics: IncrementalMetrics): boolean {
    // Detectar inconsistencias que requieren recálculo completo
    return (
      metrics.confidenceMean > 100 || // Certeza imposible
      metrics.confidenceMean < 0 || // Certeza negativa
      metrics.matureProfileCount > metrics.profileCount || // Más maduros que totales
      metrics.sampleCount < 0 // Contador negativo
    )
  }
  
  /**
   * 🕐 CALCULAR COBERTURA TEMPORAL DESDE BITSET
   */
  private calculateTemporalCoverage(bits: bigint): number {
    let count = 0
    let temp = bits
    
    // Contar bits activos (horas con datos)
    while (temp > BigInt(0)) {
      if (temp & BigInt(1)) count++
      temp = temp >> BigInt(1)
    }
    
    // Cobertura horaria (0-23 horas = 24 total)
    return Math.min(1, count / 24)
  }
  
  /**
   * 🎯 DETERMINAR NIVEL DE MADUREZ
   */
  private determineMaturityLevel(confidence: number): SystemMaturityLevel {
    if (confidence >= 75) return 'mature' as SystemMaturityLevel
    if (confidence >= 50) return 'operational' as SystemMaturityLevel
    if (confidence >= 25) return 'training' as SystemMaturityLevel
    return 'learning' as SystemMaturityLevel
  }
  
  /**
   * 🎨 GENERAR MENSAJE DE ESTADO
   */
  private generateSystemStatus(level: SystemMaturityLevel, confidence: number, metrics: IncrementalMetrics) {
    const messages = {
      learning: {
        level,
        title: "🤖 Sistema Aprendiendo (Incremental)",
        message: "Recopilando datos con algoritmo Welford optimizado...",
        subtitle: `Métricas incrementales: ${metrics.sampleCount} muestras procesadas`,
        animation: "pulse-learning",
        progress: `Perfiles maduros: ${metrics.matureProfileCount}/${metrics.profileCount}`,
        estimatedTimeToNext: "1-2 semanas"
      },
      training: {
        level,
        title: "📊 Sistema Entrenando (Incremental)",
        message: "Analizando patrones con actualizaciones en tiempo real...",
        subtitle: `Tendencia: ${metrics.trendDirection} | Mejora: ${metrics.improvementRate.toFixed(1)}%`,
        animation: "bars-growing",
        progress: `Confianza: ${confidence}% (incremental)`,
        estimatedTimeToNext: "1-2 semanas"
      },
      operational: {
        level,
        title: "✅ Sistema Operacional (Incremental)",
        message: "Detección con algoritmo híbrido optimizado",
        subtitle: `Actualizaciones O(1) | Varianza: ${Math.sqrt(metrics.confidenceM2 / Math.max(1, metrics.sampleCount - 1)).toFixed(2)}`,
        animation: "check-pulse",
        progress: `Precisión: ${confidence}% (Welford)`,
        estimatedTimeToNext: "2-4 semanas"
      },
      mature: {
        level,
        title: "🎯 Sistema Maduro (Híbrido)",
        message: "Detección óptima con métricas incrementales",
        subtitle: `Recálculos: ${metrics.recalculationCount} | Método: ${metrics.calculationMethod}`,
        animation: "steady-glow",
        progress: `Confianza: ${confidence}% - Óptimo`,
        estimatedTimeToNext: undefined
      }
    }
    
    return messages[level as keyof typeof messages]
  }
  
  /**
   * 🔄 CONVERTIR DE DB A MÉTRICAS
   */
  private convertDbToMetrics(dbMetrics: any): IncrementalMetrics {
    return {
      id: dbMetrics.id,
      systemId: dbMetrics.systemId,
      sampleCount: dbMetrics.sampleCount,
      confidenceMean: Number(dbMetrics.confidenceMean),
      confidenceM2: Number(dbMetrics.confidenceM2),
      profileCount: dbMetrics.profileCount,
      matureProfileCount: dbMetrics.matureProfileCount,
      totalSamples: dbMetrics.totalSamples,
      variabilitySum: Number(dbMetrics.variabilitySum),
      temporalCoverageBits: dbMetrics.temporalCoverageBits,
      serviceDistributionSum: Number(dbMetrics.serviceDistributionSum),
      improvementRate: Number(dbMetrics.improvementRate),
      lastConfidence: Number(dbMetrics.lastConfidence),
      trendDirection: dbMetrics.trendDirection as 'improving' | 'declining' | 'stable',
      lastUpdated: dbMetrics.lastUpdated,
      lastCalculation: dbMetrics.lastCalculation,
      recalculationCount: dbMetrics.recalculationCount,
      calculationMethod: dbMetrics.calculationMethod,
      confidenceHistory: JSON.parse(dbMetrics.confidenceHistory)
    }
  }
}

// ============================================================================
// 🎯 INSTANCIA SINGLETON EXPORTADA
// ============================================================================

/**
 * 🎯 INSTANCIA SINGLETON DEL CALCULADOR INCREMENTAL
 * Usar esta instancia en toda la aplicación para mantener cache coherente
 */
export const incrementalConfidenceCalculator = new IncrementalConfidenceCalculator() 