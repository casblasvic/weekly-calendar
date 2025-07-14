/**
 * ⚡ ENERGY INSIGHTS CONFIGURATION
 * 
 * Configuración central para el sistema de análisis energético.
 * Define umbrales, validaciones y parámetros estadísticos.
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

export interface EnergyInsightsConfig {
  // Umbrales de detección de anomalías
  thresholds: {
    deviationPct: number          // % desviación para considerar anomalía
    sigmaMultiplier: number       // Multiplicador de desviación estándar
    minSamples: number           // Mínimo de muestras para perfil válido
    confidenceThreshold: number  // Umbral de confianza estadística
  }
  
  // Configuración de retención de datos
  retention: {
    rawSamplesDays: number           // Días de retención para muestras crudas
    disaggregatedYears: number       // Años de retención para datos desagregados
    downsampleAfterDays: number      // Días antes de hacer down-sampling
  }
  
  // Parámetros estadísticos
  statistics: {
    welfordMinSamples: number        // Mínimo para algoritmo de Welford
    outlierIqrMultiplier: number     // Multiplicador IQR para detección de outliers
    fallbackStdDevPct: number       // % fallback cuando stdDev = 0
    performanceThresholdPct: number  // Umbral de rendimiento para empleados
  }
  
  // Configuración de procesamiento
  processing: {
    batchSize: number               // Tamaño de lote para operaciones masivas
    maxProcessingTimeMs: number     // Tiempo máximo de procesamiento
    sampleIntervalSeconds: number   // Intervalo esperado entre muestras
  }
}

/**
 * Configuración por defecto del sistema Energy Insights
 */
export const ENERGY_INSIGHT_CFG: EnergyInsightsConfig = {
  thresholds: {
    deviationPct: 0.25,           // 25% de desviación
    sigmaMultiplier: 2.0,         // 2 sigmas para anomalías
    minSamples: 5,                // Mínimo 5 muestras para validez
    confidenceThreshold: 0.8      // 80% de confianza mínima
  },
  
  retention: {
    rawSamplesDays: 90,           // 3 meses de muestras crudas
    disaggregatedYears: 3,        // 3 años de datos desagregados
    downsampleAfterDays: 30       // Down-sample después de 30 días
  },
  
  statistics: {
    welfordMinSamples: 2,         // Mínimo para Welford (2 para calcular varianza)
    outlierIqrMultiplier: 1.5,    // Estándar para detección de outliers
    fallbackStdDevPct: 0.1,       // 10% como fallback de stdDev
    performanceThresholdPct: 20   // 20% umbral de rendimiento
  },
  
  processing: {
    batchSize: 1000,              // Lotes de 1000 registros
    maxProcessingTimeMs: 30 * 60 * 1000, // 30 minutos máximo
    sampleIntervalSeconds: 8      // Muestras cada 8 segundos
  }
}

/**
 * Configuraciones predefinidas para diferentes entornos
 */
export const ENERGY_CONFIGS = {
  // Configuración conservadora (más sensible a anomalías)
  conservative: {
    ...ENERGY_INSIGHT_CFG,
    thresholds: {
      ...ENERGY_INSIGHT_CFG.thresholds,
      deviationPct: 0.15,         // 15% más estricto
      sigmaMultiplier: 1.5,       // 1.5 sigmas más sensible
      minSamples: 10              // Más muestras para mayor confianza
    }
  },
  
  // Configuración relajada (menos falsos positivos)
  relaxed: {
    ...ENERGY_INSIGHT_CFG,
    thresholds: {
      ...ENERGY_INSIGHT_CFG.thresholds,
      deviationPct: 0.35,         // 35% más tolerante
      sigmaMultiplier: 2.5,       // 2.5 sigmas menos sensible
      minSamples: 3               // Menos muestras requeridas
    }
  },
  
  // Configuración para desarrollo/testing
  development: {
    ...ENERGY_INSIGHT_CFG,
    retention: {
      ...ENERGY_INSIGHT_CFG.retention,
      rawSamplesDays: 7,          // Solo 1 semana en desarrollo
      disaggregatedYears: 1,      // 1 año en desarrollo
      downsampleAfterDays: 3      // Down-sample rápido
    },
    processing: {
      ...ENERGY_INSIGHT_CFG.processing,
      batchSize: 100,             // Lotes más pequeños
      maxProcessingTimeMs: 5 * 60 * 1000 // 5 minutos máximo
    }
  }
} as const

/**
 * Validador de configuración de Energy Insights
 */
export class EnergyConfigValidator {
  /**
   * Valida una configuración de Energy Insights
   */
  static validate(config: EnergyInsightsConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validar umbrales
    if (config.thresholds.deviationPct <= 0 || config.thresholds.deviationPct > 1) {
      errors.push('deviationPct debe estar entre 0 y 1')
    }
    
    if (config.thresholds.sigmaMultiplier <= 0 || config.thresholds.sigmaMultiplier > 5) {
      errors.push('sigmaMultiplier debe estar entre 0 y 5')
    }
    
    if (config.thresholds.minSamples < 1 || config.thresholds.minSamples > 100) {
      errors.push('minSamples debe estar entre 1 y 100')
    }
    
    if (config.thresholds.confidenceThreshold <= 0 || config.thresholds.confidenceThreshold > 1) {
      errors.push('confidenceThreshold debe estar entre 0 y 1')
    }
    
    // Validar retención
    if (config.retention.rawSamplesDays < 1 || config.retention.rawSamplesDays > 365) {
      errors.push('rawSamplesDays debe estar entre 1 y 365')
    }
    
    if (config.retention.disaggregatedYears < 1 || config.retention.disaggregatedYears > 10) {
      errors.push('disaggregatedYears debe estar entre 1 y 10')
    }
    
    if (config.retention.downsampleAfterDays < 1 || 
        config.retention.downsampleAfterDays >= config.retention.rawSamplesDays) {
      errors.push('downsampleAfterDays debe ser menor que rawSamplesDays')
    }
    
    // Validar estadísticas
    if (config.statistics.welfordMinSamples < 2) {
      errors.push('welfordMinSamples debe ser al menos 2')
    }
    
    if (config.statistics.outlierIqrMultiplier <= 0 || config.statistics.outlierIqrMultiplier > 3) {
      errors.push('outlierIqrMultiplier debe estar entre 0 y 3')
    }
    
    if (config.statistics.fallbackStdDevPct <= 0 || config.statistics.fallbackStdDevPct > 0.5) {
      errors.push('fallbackStdDevPct debe estar entre 0 y 0.5')
    }
    
    if (config.statistics.performanceThresholdPct <= 0 || config.statistics.performanceThresholdPct > 100) {
      errors.push('performanceThresholdPct debe estar entre 0 y 100')
    }
    
    // Validar procesamiento
    if (config.processing.batchSize < 10 || config.processing.batchSize > 10000) {
      errors.push('batchSize debe estar entre 10 y 10000')
    }
    
    if (config.processing.maxProcessingTimeMs < 60000 || config.processing.maxProcessingTimeMs > 3600000) {
      errors.push('maxProcessingTimeMs debe estar entre 1 minuto y 1 hora')
    }
    
    if (config.processing.sampleIntervalSeconds < 1 || config.processing.sampleIntervalSeconds > 300) {
      errors.push('sampleIntervalSeconds debe estar entre 1 y 300')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Obtiene una configuración validada
   */
  static getValidatedConfig(configName?: keyof typeof ENERGY_CONFIGS): EnergyInsightsConfig {
    const baseConfig = configName ? ENERGY_CONFIGS[configName] : ENERGY_INSIGHT_CFG
    const validation = this.validate(baseConfig)
    
    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`)
    }
    
    return baseConfig
  }

  /**
   * Obtiene configuración desde variables de entorno
   */
  static fromEnvironment(): EnergyInsightsConfig {
    const envConfig: EnergyInsightsConfig = {
      thresholds: {
        deviationPct: parseFloat(process.env.ENERGY_DEVIATION_PCT || '0.25'),
        sigmaMultiplier: parseFloat(process.env.ENERGY_SIGMA_MULTIPLIER || '2.0'),
        minSamples: parseInt(process.env.ENERGY_MIN_SAMPLES || '5'),
        confidenceThreshold: parseFloat(process.env.ENERGY_CONFIDENCE_THRESHOLD || '0.8')
      },
      retention: {
        rawSamplesDays: parseInt(process.env.RETENTION_RAW_DAYS || '90'),
        disaggregatedYears: parseInt(process.env.RETENTION_DISAGGREGATED_YEARS || '3'),
        downsampleAfterDays: parseInt(process.env.RETENTION_DOWNSAMPLE_AFTER_DAYS || '30')
      },
      statistics: {
        welfordMinSamples: parseInt(process.env.ENERGY_WELFORD_MIN_SAMPLES || '2'),
        outlierIqrMultiplier: parseFloat(process.env.ENERGY_OUTLIER_IQR_MULTIPLIER || '1.5'),
        fallbackStdDevPct: parseFloat(process.env.ENERGY_FALLBACK_STDDEV_PCT || '0.1'),
        performanceThresholdPct: parseFloat(process.env.ENERGY_PERFORMANCE_THRESHOLD_PCT || '20')
      },
      processing: {
        batchSize: parseInt(process.env.ENERGY_BATCH_SIZE || '1000'),
        maxProcessingTimeMs: parseInt(process.env.ENERGY_MAX_PROCESSING_TIME_MS || '1800000'),
        sampleIntervalSeconds: parseInt(process.env.ENERGY_SAMPLE_INTERVAL_SECONDS || '8')
      }
    }
    
    const validation = this.validate(envConfig)
    if (!validation.valid) {
      console.warn('⚠️ Configuración de entorno inválida, usando valores por defecto:', validation.errors)
      return ENERGY_INSIGHT_CFG
    }
    
    return envConfig
  }
}

  /**
 * Obtiene la configuración activa basada en el entorno
 */
export function getActiveEnergyConfig(): EnergyInsightsConfig {
  const environment = process.env.NODE_ENV || 'development'
  
  // Intentar cargar desde variables de entorno primero
  try {
    return EnergyConfigValidator.fromEnvironment()
  } catch (error) {
    console.warn('⚠️ Error cargando configuración de entorno, usando predefinida')
  }
  
  // Usar configuración predefinida según entorno
  switch (environment) {
    case 'production':
      return EnergyConfigValidator.getValidatedConfig()
    case 'development':
    case 'test':
      return EnergyConfigValidator.getValidatedConfig('development')
    default:
      return EnergyConfigValidator.getValidatedConfig()
  }
}

/**
 * Configuración activa del sistema
 */
export const ACTIVE_ENERGY_CONFIG = getActiveEnergyConfig()

/**
 * Utilitarios para trabajar con la configuración
 */
export const EnergyConfigUtils = {
  /**
   * Calcula el umbral de anomalía para un valor dado
   */
  calculateAnomalyThreshold(mean: number, stdDev: number, config = ACTIVE_ENERGY_CONFIG): number {
    const fallbackStdDev = stdDev > 0 ? stdDev : mean * config.statistics.fallbackStdDevPct
    return mean + (fallbackStdDev * config.thresholds.sigmaMultiplier)
  },
  
  /**
   * Determina si una muestra es outlier usando IQR
   */
  isOutlier(value: number, q1: number, q3: number, config = ACTIVE_ENERGY_CONFIG): boolean {
    const iqr = q3 - q1
    const lowerBound = q1 - (config.statistics.outlierIqrMultiplier * iqr)
    const upperBound = q3 + (config.statistics.outlierIqrMultiplier * iqr)
    return value < lowerBound || value > upperBound
  },
  
  /**
   * Calcula el nivel de confianza estadística
   */
  calculateConfidenceLevel(sampleCount: number, validProfiles: number, totalProfiles: number): 'high' | 'medium' | 'low' | 'insufficient_data' {
    if (validProfiles === 0) return 'insufficient_data'
    
    const validPercentage = validProfiles / totalProfiles
    const sampleConfidence = sampleCount >= 20 ? 1 : sampleCount >= 10 ? 0.8 : sampleCount >= 5 ? 0.6 : 0.3
    const overallConfidence = validPercentage * sampleConfidence
    
    if (overallConfidence >= 0.8) return 'high'
    if (overallConfidence >= 0.6) return 'medium'
    if (overallConfidence >= 0.3) return 'low'
    return 'insufficient_data'
  }
} 