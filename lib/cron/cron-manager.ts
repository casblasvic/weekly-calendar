/**
 * 🕐 GESTOR CENTRALIZADO DE CRONS - SISTEMA ORGANIZACIONAL
 * =========================================================
 * 
 * Sistema unificado para gestionar todos los trabajos programados (crons) de la aplicación:
 * - Registro centralizado de todos los crons
 * - Configuración unificada de horarios
 * - Monitoreo y logging de ejecuciones
 * - Gestión de errores y reintentos
 * - Documentación automática de trabajos
 * 
 * 🎯 OBJETIVOS:
 * - Tener TODOS los crons en un solo lugar
 * - Evitar duplicación de trabajos
 * - Facilitar mantenimiento y debugging
 * - Permitir activación/desactivación fácil
 * - Generar reportes de ejecución
 * 
 * 📋 CRONS REGISTRADOS:
 * 1. confidence-full-recalculation: Recálculo completo de certeza (24h)
 * 2. [FUTURO] energy-cleanup: Limpieza de datos energéticos antiguos
 * 3. [FUTURO] backup-metrics: Backup de métricas críticas
 * 4. [FUTURO] system-health-check: Verificación de salud del sistema
 * 
 * Variables críticas:
 * - cronId: Identificador único del cron
 * - schedule: Expresión cron (formato estándar)
 * - enabled: Estado activo/inactivo
 * - lastExecution: Última ejecución exitosa
 * - errorCount: Contador de errores consecutivos
 * - maxRetries: Máximo número de reintentos
 * 
 * @see docs/CRON_MANAGEMENT_STRATEGY.md
 */

import { prisma } from '@/lib/db'
import { incrementalConfidenceCalculator } from '@/lib/energy/incremental-confidence-calculator'
import { calculateSystemConfidence } from '@/lib/energy/confidence-calculator'

// ============================================================================
// 🎯 INTERFACES PARA GESTIÓN DE CRONS
// ============================================================================

/**
 * 📋 Configuración de un trabajo cron
 */
export interface CronJobConfig {
  id: string
  name: string
  description: string
  schedule: string // Expresión cron: "0 2 * * *" = 2:00 AM diario
  enabled: boolean
  category: 'confidence' | 'energy' | 'backup' | 'maintenance' | 'cleanup'
  priority: 'critical' | 'high' | 'medium' | 'low'
  maxRetries: number
  timeoutMinutes: number
  handler: () => Promise<void>
  
  // Metadatos
  createdAt: Date
  lastModified: Date
  author: string
  documentation: string
}

/**
 * 📊 Estado de ejecución de un cron
 */
export interface CronExecutionStatus {
  cronId: string
  lastExecution?: Date
  lastSuccess?: Date
  lastError?: Date
  errorCount: number
  totalExecutions: number
  avgExecutionTime: number
  isRunning: boolean
  nextExecution?: Date
}

/**
 * 📈 Reporte de ejecución
 */
export interface CronExecutionReport {
  cronId: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'running' | 'success' | 'error' | 'timeout'
  errorMessage?: string
  metadata?: Record<string, any>
}

// ============================================================================
// 🎯 GESTOR CENTRALIZADO DE CRONS
// ============================================================================

/**
 * 🕐 CLASE PRINCIPAL: Gestor Centralizado de Crons
 * 
 * Administra todos los trabajos programados de la aplicación:
 * - Registro y configuración de crons
 * - Ejecución controlada con timeouts
 * - Monitoreo y logging automático
 * - Gestión de errores y reintentos
 * - Reportes de estado y rendimiento
 */
export class CronManager {
  
  private jobs = new Map<string, CronJobConfig>()
  private executionStatus = new Map<string, CronExecutionStatus>()
  private runningJobs = new Set<string>()
  
  constructor() {
    this.initializeDefaultJobs()
  }
  
  /**
   * 🎯 REGISTRAR NUEVO TRABAJO CRON
   * 
   * @param config - Configuración del trabajo cron
   */
  registerJob(config: CronJobConfig): void {
    if (this.jobs.has(config.id)) {
      console.warn(`⚠️ Cron job '${config.id}' ya existe. Sobrescribiendo...`)
    }
    
    this.jobs.set(config.id, {
      ...config,
      createdAt: config.createdAt || new Date(),
      lastModified: new Date()
    })
    
    // Inicializar estado de ejecución
    if (!this.executionStatus.has(config.id)) {
      this.executionStatus.set(config.id, {
        cronId: config.id,
        errorCount: 0,
        totalExecutions: 0,
        avgExecutionTime: 0,
        isRunning: false
      })
    }
    
    console.log(`✅ Cron job '${config.id}' registrado exitosamente`)
  }
  
  /**
   * 🚀 EJECUTAR TRABAJO CRON
   * 
   * @param cronId - ID del trabajo a ejecutar
   * @param force - Forzar ejecución aunque esté deshabilitado
   */
  async executeJob(cronId: string, force: boolean = false): Promise<CronExecutionReport> {
    const job = this.jobs.get(cronId)
    const status = this.executionStatus.get(cronId)
    
    if (!job) {
      throw new Error(`Cron job '${cronId}' no encontrado`)
    }
    
    if (!job.enabled && !force) {
      throw new Error(`Cron job '${cronId}' está deshabilitado`)
    }
    
    if (status?.isRunning) {
      throw new Error(`Cron job '${cronId}' ya está ejecutándose`)
    }
    
    // Iniciar ejecución
    const report: CronExecutionReport = {
      cronId,
      startTime: new Date(),
      status: 'running'
    }
    
    this.runningJobs.add(cronId)
    if (status) {
      status.isRunning = true
      status.totalExecutions += 1
    }
    
    try {
      console.log(`🚀 Iniciando cron job '${cronId}' - ${job.name}`)
      
      // Ejecutar con timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), job.timeoutMinutes * 60 * 1000)
      })
      
      await Promise.race([
        job.handler(),
        timeoutPromise
      ])
      
      // Ejecución exitosa
      report.endTime = new Date()
      report.duration = report.endTime.getTime() - report.startTime.getTime()
      report.status = 'success'
      
      if (status) {
        status.lastSuccess = report.endTime
        status.lastExecution = report.endTime
        status.errorCount = 0 // Reset contador de errores
        status.avgExecutionTime = this.calculateAvgExecutionTime(status, report.duration)
      }
      
      console.log(`✅ Cron job '${cronId}' completado exitosamente en ${report.duration}ms`)
      
    } catch (error) {
      // Error en ejecución
      report.endTime = new Date()
      report.duration = report.endTime.getTime() - report.startTime.getTime()
      report.status = error instanceof Error && error.message === 'Timeout' ? 'timeout' : 'error'
      report.errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      if (status) {
        status.lastError = report.endTime
        status.lastExecution = report.endTime
        status.errorCount += 1
      }
      
      console.error(`❌ Error en cron job '${cronId}':`, error)
      
      // Intentar reintento si está configurado
      if (status && status.errorCount < job.maxRetries) {
        console.log(`🔄 Reintentando cron job '${cronId}' (intento ${status.errorCount + 1}/${job.maxRetries})`)
        // Programar reintento en 5 minutos
        setTimeout(() => {
          this.executeJob(cronId, true).catch(console.error)
        }, 5 * 60 * 1000)
      }
      
    } finally {
      // Limpiar estado
      this.runningJobs.delete(cronId)
      if (status) {
        status.isRunning = false
      }
    }
    
    // Guardar reporte en base de datos
    await this.saveExecutionReport(report)
    
    return report
  }
  
  /**
   * 📊 OBTENER ESTADO DE TODOS LOS CRONS
   */
  getAllJobsStatus(): Array<CronJobConfig & CronExecutionStatus> {
    const results: Array<CronJobConfig & CronExecutionStatus> = []
    
    for (const [cronId, job] of this.jobs) {
      const status = this.executionStatus.get(cronId)
      results.push({
        ...job,
        ...(status || {
          cronId,
          errorCount: 0,
          totalExecutions: 0,
          avgExecutionTime: 0,
          isRunning: false
        })
      })
    }
    
    return results.sort((a, b) => {
      // Ordenar por prioridad y luego por categoría
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      return a.category.localeCompare(b.category)
    })
  }
  
  /**
   * 🔧 HABILITAR/DESHABILITAR TRABAJO CRON
   */
  setJobEnabled(cronId: string, enabled: boolean): void {
    const job = this.jobs.get(cronId)
    if (!job) {
      throw new Error(`Cron job '${cronId}' no encontrado`)
    }
    
    job.enabled = enabled
    job.lastModified = new Date()
    
    console.log(`${enabled ? '✅' : '❌'} Cron job '${cronId}' ${enabled ? 'habilitado' : 'deshabilitado'}`)
  }
  
  /**
   * 📋 GENERAR REPORTE DE CRONS
   */
  generateReport(): {
    summary: {
      totalJobs: number
      enabledJobs: number
      runningJobs: number
      errorJobs: number
    }
    jobs: Array<CronJobConfig & CronExecutionStatus>
  } {
    const jobs = this.getAllJobsStatus()
    
    return {
      summary: {
        totalJobs: jobs.length,
        enabledJobs: jobs.filter(j => j.enabled).length,
        runningJobs: jobs.filter(j => j.isRunning).length,
        errorJobs: jobs.filter(j => j.errorCount > 0).length
      },
      jobs
    }
  }
  
  // ============================================================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS
  // ============================================================================
  
  /**
   * 🆕 INICIALIZAR TRABAJOS CRON POR DEFECTO
   */
  private initializeDefaultJobs(): void {
    
    // 🎯 CRON #1: RECÁLCULO COMPLETO DE CERTEZA (24 HORAS)
    this.registerJob({
      id: 'confidence-full-recalculation',
      name: 'Recálculo Completo de Certeza',
      description: 'Recalcula completamente las métricas de certeza del sistema para mantener precisión',
      schedule: '0 2 * * *', // 2:00 AM todos los días
      enabled: true,
      category: 'confidence',
      priority: 'high',
      maxRetries: 3,
      timeoutMinutes: 30,
      handler: this.handleConfidenceRecalculation.bind(this),
      createdAt: new Date(),
      lastModified: new Date(),
      author: 'Sistema Híbrido Incremental',
      documentation: `
        🎯 RECÁLCULO COMPLETO DE CERTEZA - CRON DIARIO
        
        Este cron es CRÍTICO para el sistema híbrido incremental:
        - Se ejecuta cada 24 horas a las 2:00 AM
        - Recalcula completamente las métricas de certeza
        - Corrige posibles derivas incrementales
        - Actualiza métricas de todos los sistemas
        
        ⚠️ IMPORTANTE:
        - NO modificar sin revisar sistema incremental
        - Coordinar con actualizaciones de algoritmo Welford
        - Monitorear rendimiento en sistemas grandes
        
        📊 MÉTRICAS ACTUALIZADAS:
        - Certeza global del sistema
        - Métricas de calidad y estabilidad
        - Contadores de perfiles y muestras
        - Historial de tendencias
        
        🔄 PROCESO:
        1. Obtener todos los sistemas activos
        2. Recalcular certeza completa para cada sistema
        3. Comparar con métricas incrementales
        4. Actualizar tabla system_confidence_metrics
        5. Marcar como recálculo completo
        
        ⏱️ TIEMPO ESTIMADO: 5-15 minutos según volumen de datos
      `
    })
    
    // 🎯 CRON #2: LIMPIEZA DE DATOS ENERGÉTICOS (SEMANAL)
    this.registerJob({
      id: 'energy-data-cleanup',
      name: 'Limpieza de Datos Energéticos',
      description: 'Limpia datos energéticos antiguos para optimizar rendimiento',
      schedule: '0 3 * * 0', // 3:00 AM todos los domingos
      enabled: false, // Deshabilitado por defecto hasta implementar
      category: 'cleanup',
      priority: 'medium',
      maxRetries: 2,
      timeoutMinutes: 60,
      handler: this.handleEnergyDataCleanup.bind(this),
      createdAt: new Date(),
      lastModified: new Date(),
      author: 'Sistema de Limpieza',
      documentation: `
        🧹 LIMPIEZA DE DATOS ENERGÉTICOS - CRON SEMANAL
        
        [PENDIENTE DE IMPLEMENTACIÓN]
        
        Este cron optimizará el rendimiento:
        - Elimina muestras de energía > 90 días
        - Consolida datos históricos
        - Optimiza índices de base de datos
        - Genera reportes de limpieza
      `
    })
    
    // 🎯 CRON #3: BACKUP DE MÉTRICAS CRÍTICAS (DIARIO)
    this.registerJob({
      id: 'critical-metrics-backup',
      name: 'Backup de Métricas Críticas',
      description: 'Respalda métricas críticas del sistema para recuperación',
      schedule: '0 4 * * *', // 4:00 AM todos los días
      enabled: false, // Deshabilitado por defecto hasta implementar
      category: 'backup',
      priority: 'high',
      maxRetries: 3,
      timeoutMinutes: 20,
      handler: this.handleCriticalMetricsBackup.bind(this),
      createdAt: new Date(),
      lastModified: new Date(),
      author: 'Sistema de Backup',
      documentation: `
        💾 BACKUP DE MÉTRICAS CRÍTICAS - CRON DIARIO
        
        [PENDIENTE DE IMPLEMENTACIÓN]
        
        Este cron protege datos críticos:
        - Backup de system_confidence_metrics
        - Backup de perfiles energéticos
        - Backup de configuraciones críticas
        - Verificación de integridad de backups
      `
    })
    
    console.log(`🎯 Cron Manager inicializado con ${this.jobs.size} trabajos`)
  }
  
  /**
   * 🎯 HANDLER: Recálculo Completo de Certeza
   * 
   * ⚠️ CRON CRÍTICO - EJECUTA CADA 24 HORAS
   * Este es el cron más importante del sistema híbrido incremental
   */
  private async handleConfidenceRecalculation(): Promise<void> {
    console.log('🎯 Iniciando recálculo completo de certeza...')
    
    try {
      // 1. Obtener todos los sistemas activos
      const systems = await prisma.systemConfidenceMetrics.findMany({
        select: { systemId: true },
        distinct: ['systemId']
      })
      
      console.log(`📊 Encontrados ${systems.length} sistemas para recalcular`)
      
      let processedSystems = 0
      let errors = 0
      
      // 2. Procesar cada sistema
      for (const system of systems) {
        try {
          console.log(`🔄 Recalculando sistema: ${system.systemId}`)
          
          // Recálculo completo usando sistema original
          const fullConfidence = await calculateSystemConfidence(system.systemId)
          
          // Obtener métricas incrementales actuales para el historial
          const currentMetrics = await incrementalConfidenceCalculator.getCurrentMetrics(system.systemId)
          
          // Actualizar métricas con recálculo completo
          await prisma.systemConfidenceMetrics.update({
            where: { systemId: system.systemId },
            data: {
              // Actualizar con datos del recálculo completo
              confidenceMean: fullConfidence.globalConfidence,
              lastCalculation: new Date(),
              recalculationCount: { increment: 1 },
              calculationMethod: 'full',
              
              // Mantener datos incrementales existentes
              lastUpdated: new Date(),
              
              // Actualizar historial con nuevo valor
              confidenceHistory: JSON.stringify([
                ...currentMetrics.confidenceHistory,
                fullConfidence.globalConfidence
              ].slice(-10))
            }
          })
          
          processedSystems++
          
        } catch (error) {
          console.error(`❌ Error recalculando sistema ${system.systemId}:`, error)
          errors++
        }
      }
      
      console.log(`✅ Recálculo completo finalizado: ${processedSystems} sistemas procesados, ${errors} errores`)
      
    } catch (error) {
      console.error('❌ Error en recálculo completo de certeza:', error)
      throw error
    }
  }
  
  /**
   * 🧹 HANDLER: Limpieza de Datos Energéticos (FUTURO)
   */
  private async handleEnergyDataCleanup(): Promise<void> {
    console.log('🧹 Iniciando limpieza de datos energéticos...')
    
    // TODO: Implementar limpieza de datos energéticos
    // - Eliminar muestras > 90 días
    // - Consolidar datos históricos
    // - Optimizar índices
    
    throw new Error('Limpieza de datos energéticos no implementada aún')
  }
  
  /**
   * 💾 HANDLER: Backup de Métricas Críticas (FUTURO)
   */
  private async handleCriticalMetricsBackup(): Promise<void> {
    console.log('💾 Iniciando backup de métricas críticas...')
    
    // TODO: Implementar backup de métricas críticas
    // - Backup de system_confidence_metrics
    // - Backup de perfiles energéticos
    // - Verificación de integridad
    
    throw new Error('Backup de métricas críticas no implementado aún')
  }
  
  /**
   * 📊 CALCULAR TIEMPO PROMEDIO DE EJECUCIÓN
   */
  private calculateAvgExecutionTime(status: CronExecutionStatus, newDuration: number): number {
    if (status.totalExecutions <= 1) return newDuration
    
    const totalTime = status.avgExecutionTime * (status.totalExecutions - 1) + newDuration
    return Math.round(totalTime / status.totalExecutions)
  }
  
  /**
   * 💾 GUARDAR REPORTE DE EJECUCIÓN
   */
  private async saveExecutionReport(report: CronExecutionReport): Promise<void> {
    try {
      // TODO: Implementar tabla de reportes de ejecución si es necesario
      // Por ahora solo loggeamos
      console.log(`📊 Reporte de ejecución guardado para ${report.cronId}:`, {
        duration: report.duration,
        status: report.status,
        error: report.errorMessage
      })
    } catch (error) {
      console.error('Error guardando reporte de ejecución:', error)
    }
  }
}

// ============================================================================
// 🎯 INSTANCIA SINGLETON EXPORTADA
// ============================================================================

/**
 * 🎯 INSTANCIA SINGLETON DEL GESTOR DE CRONS
 * Usar esta instancia en toda la aplicación para gestión centralizada
 */
export const cronManager = new CronManager()

// ============================================================================
// 🔧 FUNCIONES AUXILIARES PARA INTEGRACIÓN
// ============================================================================

/**
 * 🚀 EJECUTAR CRON POR ID (PARA APIS O TESTING)
 */
export async function executeCronJob(cronId: string, force: boolean = false): Promise<CronExecutionReport> {
  return cronManager.executeJob(cronId, force)
}

/**
 * 📊 OBTENER ESTADO DE TODOS LOS CRONS
 */
export function getAllCronJobsStatus() {
  return cronManager.getAllJobsStatus()
}

/**
 * 🔧 HABILITAR/DESHABILITAR CRON
 */
export function setCronJobEnabled(cronId: string, enabled: boolean): void {
  cronManager.setJobEnabled(cronId, enabled)
}

/**
 * 📋 GENERAR REPORTE COMPLETO DE CRONS
 */
export function generateCronReport() {
  return cronManager.generateReport()
} 