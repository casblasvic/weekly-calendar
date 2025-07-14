/**
 * 🔄 MIGRACIÓN A SISTEMA HÍBRIDO INCREMENTAL
 * ==========================================
 * 
 * Script para migrar datos existentes al nuevo sistema híbrido incremental:
 * - Calcula certeza completa para todos los sistemas activos
 * - Inicializa tabla system_confidence_metrics con datos base
 * - Configura métricas incrementales iniciales
 * - Prepara sistema para funcionamiento híbrido
 * 
 * 🎯 PROCESO DE MIGRACIÓN:
 * 1. Identificar todos los sistemas activos
 * 2. Calcular certeza completa para cada sistema
 * 3. Inicializar métricas incrementales
 * 4. Validar datos migrados
 * 5. Generar reporte de migración
 * 
 * ⚠️ IMPORTANTE:
 * - Ejecutar en horario de baja actividad
 * - Hacer backup antes de ejecutar
 * - Monitorear recursos durante ejecución
 * - Validar resultados después de migración
 * 
 * Variables críticas:
 * - systemId: ID único del sistema
 * - globalConfidence: Certeza global calculada
 * - profileCount: Número de perfiles energéticos
 * - matureProfileCount: Perfiles con >=20 muestras
 * 
 * @see docs/CONFIDENCE_SYSTEM_OPTIMIZATIONS.md
 */

import { prisma } from '../lib/db'
import { calculateSystemConfidence } from '../lib/energy/confidence-calculator'
import { incrementalConfidenceCalculator } from '../lib/energy/incremental-confidence-calculator'

// ============================================================================
// 🎯 INTERFACES PARA MIGRACIÓN
// ============================================================================

interface MigrationResult {
  systemId: string
  success: boolean
  globalConfidence: number
  profileCount: number
  matureProfileCount: number
  error?: string
  processingTime: number
}

interface MigrationSummary {
  totalSystems: number
  successfulMigrations: number
  failedMigrations: number
  totalProcessingTime: number
  averageConfidence: number
  errors: string[]
}

// ============================================================================
// 🔄 FUNCIONES DE MIGRACIÓN
// ============================================================================

/**
 * 🎯 FUNCIÓN PRINCIPAL DE MIGRACIÓN
 */
async function migrateToIncrementalSystem(): Promise<MigrationSummary> {
  console.log('🔄 Iniciando migración a sistema híbrido incremental...')
  
  const startTime = Date.now()
  const results: MigrationResult[] = []
  const errors: string[] = []
  
  try {
    // 1. IDENTIFICAR SISTEMAS ACTIVOS
    console.log('📊 Identificando sistemas activos...')
    const activeSystems = await getActiveSystems()
    console.log(`✅ Encontrados ${activeSystems.length} sistemas activos`)
    
    // 2. MIGRAR CADA SISTEMA
    for (const systemId of activeSystems) {
      console.log(`🔄 Migrando sistema: ${systemId}`)
      
      try {
        const result = await migrateSystem(systemId)
        results.push(result)
        
        if (result.success) {
          console.log(`✅ Sistema ${systemId} migrado: ${result.globalConfidence}% certeza`)
        } else {
          console.error(`❌ Error migrando sistema ${systemId}: ${result.error}`)
          errors.push(`Sistema ${systemId}: ${result.error}`)
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.error(`❌ Error crítico migrando sistema ${systemId}:`, error)
        errors.push(`Sistema ${systemId}: ${errorMsg}`)
        
        results.push({
          systemId,
          success: false,
          globalConfidence: 0,
          profileCount: 0,
          matureProfileCount: 0,
          error: errorMsg,
          processingTime: 0
        })
      }
      
      // Pausa entre sistemas para evitar saturación
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 3. GENERAR RESUMEN
    const summary = generateMigrationSummary(results, errors, Date.now() - startTime)
    
    // 4. MOSTRAR RESULTADOS
    console.log('\n📊 RESUMEN DE MIGRACIÓN')
    console.log('========================')
    console.log(`Total de sistemas: ${summary.totalSystems}`)
    console.log(`Migraciones exitosas: ${summary.successfulMigrations}`)
    console.log(`Migraciones fallidas: ${summary.failedMigrations}`)
    console.log(`Tiempo total: ${(summary.totalProcessingTime / 1000).toFixed(1)}s`)
    console.log(`Certeza promedio: ${summary.averageConfidence.toFixed(1)}%`)
    
    if (summary.errors.length > 0) {
      console.log('\n❌ ERRORES:')
      summary.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    console.log('\n✅ Migración completada')
    return summary
    
  } catch (error) {
    console.error('❌ Error crítico en migración:', error)
    throw error
  }
}

/**
 * 🔍 OBTENER SISTEMAS ACTIVOS
 */
async function getActiveSystems(): Promise<string[]> {
  try {
    // Obtener sistemas únicos desde perfiles energéticos
    const profileSystems = await prisma.serviceEnergyProfile.findMany({
      select: { systemId: true },
      distinct: ['systemId']
    })
    
    // Obtener sistemas únicos desde insights
    const insightSystems = await prisma.deviceUsageInsight.findMany({
      select: { systemId: true },
      distinct: ['systemId']
    })
    
    // Combinar y deduplicar
    const allSystems = new Set([
      ...profileSystems.map(p => p.systemId),
      ...insightSystems.map(i => i.systemId)
    ])
    
    return Array.from(allSystems).filter(systemId => systemId && systemId.trim() !== '')
    
  } catch (error) {
    console.error('Error obteniendo sistemas activos:', error)
    return []
  }
}

/**
 * 🔄 MIGRAR SISTEMA INDIVIDUAL
 */
async function migrateSystem(systemId: string): Promise<MigrationResult> {
  const startTime = Date.now()
  
  try {
    // 1. VERIFICAR SI YA EXISTE
    const existingMetrics = await prisma.systemConfidenceMetrics.findUnique({
      where: { systemId }
    })
    
    if (existingMetrics) {
      console.log(`⚠️ Sistema ${systemId} ya tiene métricas, actualizando...`)
    }
    
    // 2. CALCULAR CERTEZA COMPLETA
    const systemConfidence = await calculateSystemConfidence(systemId)
    
    // 3. OBTENER DATOS ADICIONALES
    const [profiles, insights] = await Promise.all([
      prisma.serviceEnergyProfile.findMany({
        where: { systemId },
        select: { sampleCount: true, serviceId: true }
      }),
      prisma.deviceUsageInsight.count({
        where: { systemId }
      })
    ])
    
    // 4. CALCULAR MÉTRICAS INCREMENTALES INICIALES
    const profileCount = profiles.length
    const matureProfileCount = profiles.filter(p => p.sampleCount >= 20).length
    const totalSamples = profiles.reduce((sum, p) => sum + p.sampleCount, 0)
    
    // 5. INICIALIZAR/ACTUALIZAR MÉTRICAS
    const metricsData = {
      systemId,
      sampleCount: 1, // Inicializar con 1 muestra (la certeza calculada)
      confidenceMean: systemConfidence.globalConfidence,
      confidenceM2: 0, // Inicializar varianza en 0
      profileCount,
      matureProfileCount,
      totalSamples,
      variabilitySum: 0,
      temporalCoverageBits: 0n,
      serviceDistributionSum: profileCount > 0 ? new Set(profiles.map(p => p.serviceId)).size / profileCount : 0,
      improvementRate: 0,
      lastConfidence: systemConfidence.globalConfidence,
      trendDirection: 'stable',
      lastUpdated: new Date(),
      lastCalculation: new Date(),
      recalculationCount: 1,
      calculationMethod: 'full',
      confidenceHistory: JSON.stringify([systemConfidence.globalConfidence])
    }
    
    await prisma.systemConfidenceMetrics.upsert({
      where: { systemId },
      update: metricsData,
      create: metricsData
    })
    
    const processingTime = Date.now() - startTime
    
    return {
      systemId,
      success: true,
      globalConfidence: systemConfidence.globalConfidence,
      profileCount,
      matureProfileCount,
      processingTime
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
    
    return {
      systemId,
      success: false,
      globalConfidence: 0,
      profileCount: 0,
      matureProfileCount: 0,
      error: errorMsg,
      processingTime
    }
  }
}

/**
 * 📊 GENERAR RESUMEN DE MIGRACIÓN
 */
function generateMigrationSummary(
  results: MigrationResult[],
  errors: string[],
  totalTime: number
): MigrationSummary {
  const successfulResults = results.filter(r => r.success)
  const failedResults = results.filter(r => !r.success)
  
  const averageConfidence = successfulResults.length > 0 
    ? successfulResults.reduce((sum, r) => sum + r.globalConfidence, 0) / successfulResults.length
    : 0
  
  return {
    totalSystems: results.length,
    successfulMigrations: successfulResults.length,
    failedMigrations: failedResults.length,
    totalProcessingTime: totalTime,
    averageConfidence,
    errors
  }
}

/**
 * 🧪 VALIDAR MIGRACIÓN
 */
async function validateMigration(): Promise<{
  isValid: boolean
  issues: string[]
  systemsWithMetrics: number
  systemsWithoutMetrics: number
}> {
  console.log('🧪 Validando migración...')
  
  const issues: string[] = []
  
  try {
    // 1. Verificar que todos los sistemas activos tienen métricas
    const activeSystems = await getActiveSystems()
    const systemsWithMetrics = await prisma.systemConfidenceMetrics.count()
    const systemsWithoutMetrics = activeSystems.length - systemsWithMetrics
    
    if (systemsWithoutMetrics > 0) {
      issues.push(`${systemsWithoutMetrics} sistemas activos sin métricas`)
    }
    
    // 2. Verificar integridad de datos
    const invalidMetrics = await prisma.systemConfidenceMetrics.findMany({
      where: {
        OR: [
          { confidenceMean: { lt: 0 } },
          { confidenceMean: { gt: 100 } },
          { profileCount: { lt: 0 } },
          { matureProfileCount: { lt: 0 } }
        ]
      }
    })
    
    if (invalidMetrics.length > 0) {
      issues.push(`${invalidMetrics.length} sistemas con métricas inválidas`)
    }
    
    // 3. Verificar que el calculador incremental funciona
    if (activeSystems.length > 0) {
      try {
        await incrementalConfidenceCalculator.getSystemConfidence(activeSystems[0])
      } catch (error) {
        issues.push('Error probando calculador incremental')
      }
    }
    
    console.log(`✅ Validación completada: ${issues.length} problemas encontrados`)
    
    return {
      isValid: issues.length === 0,
      issues,
      systemsWithMetrics,
      systemsWithoutMetrics
    }
    
  } catch (error) {
    console.error('Error en validación:', error)
    return {
      isValid: false,
      issues: ['Error crítico en validación'],
      systemsWithMetrics: 0,
      systemsWithoutMetrics: 0
    }
  }
}

// ============================================================================
// 🚀 EJECUCIÓN PRINCIPAL
// ============================================================================

/**
 * 🎯 FUNCIÓN PRINCIPAL
 */
async function main() {
  console.log('🔄 MIGRACIÓN A SISTEMA HÍBRIDO INCREMENTAL')
  console.log('==========================================')
  
  try {
    // 1. EJECUTAR MIGRACIÓN
    const summary = await migrateToIncrementalSystem()
    
    // 2. VALIDAR RESULTADOS
    const validation = await validateMigration()
    
    // 3. REPORTE FINAL
    console.log('\n📋 REPORTE FINAL')
    console.log('================')
    console.log(`Migración: ${summary.successfulMigrations}/${summary.totalSystems} sistemas exitosos`)
    console.log(`Validación: ${validation.isValid ? '✅ VÁLIDA' : '❌ CON PROBLEMAS'}`)
    
    if (validation.issues.length > 0) {
      console.log('\n⚠️ PROBLEMAS ENCONTRADOS:')
      validation.issues.forEach(issue => console.log(`  - ${issue}`))
    }
    
    console.log('\n🎯 PRÓXIMOS PASOS:')
    console.log('1. Actualizar API de Energy Insights para usar sistema híbrido')
    console.log('2. Configurar cron de recálculo completo diario')
    console.log('3. Integrar triggers en endpoints relevantes')
    console.log('4. Monitorear rendimiento y precisión')
    
    if (validation.isValid && summary.successfulMigrations === summary.totalSystems) {
      console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE')
      process.exit(0)
    } else {
      console.log('\n⚠️ MIGRACIÓN COMPLETADA CON ADVERTENCIAS')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN MIGRACIÓN:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('Error ejecutando migración:', error)
    process.exit(1)
  })
}

export { migrateToIncrementalSystem, validateMigration } 