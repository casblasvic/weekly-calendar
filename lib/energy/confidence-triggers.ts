/**
 * 🔄 SISTEMA DE TRIGGERS AUTOMÁTICOS - ACTUALIZACIONES INCREMENTALES
 * ===================================================================
 * 
 * Sistema de triggers que actualiza automáticamente las métricas de certeza
 * cuando ocurren eventos relevantes en la aplicación:
 * - Triggers por eventos de citas completadas
 * - Triggers por creación/actualización de perfiles energéticos
 * - Triggers por detección de anomalías
 * - Triggers por muestras de energía añadidas
 * 
 * 🎯 INTEGRACIÓN CON SISTEMA HÍBRIDO:
 * - Usa algoritmo Welford para actualizaciones O(1)
 * - Mantiene sincronización con sistema incremental
 * - Evita recálculos completos innecesarios
 * - Proporciona actualizaciones en tiempo real
 * 
 * 🚀 TIPOS DE TRIGGERS:
 * 1. onAppointmentCompleted: Cuando se completa una cita
 * 2. onEnergyProfileCreated: Cuando se crea un perfil energético
 * 3. onEnergyProfileUpdated: Cuando se actualiza un perfil
 * 4. onAnomalyDetected: Cuando se detecta una anomalía
 * 5. onPowerSampleAdded: Cuando se añade muestra de energía
 * 
 * Variables críticas:
 * - systemId: Aislamiento multi-tenant
 * - appointmentId: ID de cita completada
 * - profileId: ID de perfil energético
 * - insightId: ID de insight/anomalía
 * - sampleId: ID de muestra de energía
 * 
 * @see docs/CONFIDENCE_SYSTEM_OPTIMIZATIONS.md
 * @see lib/energy/incremental-confidence-calculator.ts
 */

import { prisma } from '@/lib/db'
import { incrementalConfidenceCalculator } from './incremental-confidence-calculator'
import type { IncrementalUpdateData } from './incremental-confidence-calculator'

// ============================================================================
// 🎯 INTERFACES PARA TRIGGERS
// ============================================================================

/**
 * 📊 Datos de evento para triggers
 */
export interface TriggerEventData {
  systemId: string
  eventType: 'appointment_completed' | 'profile_created' | 'profile_updated' | 'anomaly_detected' | 'sample_added'
  entityId: string // ID de la entidad que disparó el evento
  metadata?: Record<string, any>
  timestamp?: Date
}

/**
 * 📈 Resultado de procesamiento de trigger
 */
export interface TriggerProcessingResult {
  success: boolean
  systemId: string
  eventType: string
  entityId: string
  processingTime: number
  updatedMetrics?: any
  error?: string
}

// ============================================================================
// 🔄 CLASE PRINCIPAL DE TRIGGERS
// ============================================================================

/**
 * 🎯 GESTOR DE TRIGGERS AUTOMÁTICOS
 * 
 * Procesa eventos de la aplicación y actualiza métricas incrementalmente:
 * - Escucha eventos relevantes del sistema
 * - Extrae datos necesarios para actualización
 * - Llama al calculador incremental
 * - Maneja errores y logging
 */
export class ConfidenceUpdateTriggers {
  
  private isEnabled = true
  private processingQueue = new Map<string, TriggerEventData[]>()
  private readonly MAX_QUEUE_SIZE = 100
  
  /**
   * 🎯 TRIGGER PRINCIPAL: Procesar evento automáticamente
   * 
   * @param eventData - Datos del evento a procesar
   * @returns Resultado del procesamiento
   */
  async processEvent(eventData: TriggerEventData): Promise<TriggerProcessingResult> {
    const startTime = Date.now()
    
    if (!this.isEnabled) {
      return {
        success: false,
        systemId: eventData.systemId,
        eventType: eventData.eventType,
        entityId: eventData.entityId,
        processingTime: 0,
        error: 'Triggers deshabilitados'
      }
    }
    
    try {
      console.log(`🔄 Procesando trigger: ${eventData.eventType} para ${eventData.entityId}`)
      
      // Procesar según tipo de evento
      let updatedMetrics
      switch (eventData.eventType) {
        case 'appointment_completed':
          updatedMetrics = await this.handleAppointmentCompleted(eventData)
          break
        case 'profile_created':
          updatedMetrics = await this.handleEnergyProfileCreated(eventData)
          break
        case 'profile_updated':
          updatedMetrics = await this.handleEnergyProfileUpdated(eventData)
          break
        case 'anomaly_detected':
          updatedMetrics = await this.handleAnomalyDetected(eventData)
          break
        case 'sample_added':
          updatedMetrics = await this.handlePowerSampleAdded(eventData)
          break
        default:
          throw new Error(`Tipo de evento no soportado: ${eventData.eventType}`)
      }
      
      const processingTime = Date.now() - startTime
      
      console.log(`✅ Trigger procesado exitosamente en ${processingTime}ms`)
      
      return {
        success: true,
        systemId: eventData.systemId,
        eventType: eventData.eventType,
        entityId: eventData.entityId,
        processingTime,
        updatedMetrics
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ Error procesando trigger:`, error)
      
      return {
        success: false,
        systemId: eventData.systemId,
        eventType: eventData.eventType,
        entityId: eventData.entityId,
        processingTime,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * 🔄 PROCESAR MÚLTIPLES EVENTOS EN LOTE
   * 
   * @param events - Array de eventos a procesar
   * @returns Array de resultados
   */
  async processBatchEvents(events: TriggerEventData[]): Promise<TriggerProcessingResult[]> {
    console.log(`🔄 Procesando lote de ${events.length} eventos`)
    
    const results: TriggerProcessingResult[] = []
    
    for (const event of events) {
      const result = await this.processEvent(event)
      results.push(result)
      
      // Pequeña pausa para evitar saturación
      if (events.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`✅ Lote procesado: ${successCount}/${events.length} exitosos`)
    
    return results
  }
  
  // ============================================================================
  // 🎯 HANDLERS ESPECÍFICOS POR TIPO DE EVENTO
  // ============================================================================
  
  /**
   * 🎯 HANDLER: Cita completada
   * 
   * Se ejecuta cuando se completa una cita con servicios que tienen equipos inteligentes
   */
  private async handleAppointmentCompleted(eventData: TriggerEventData): Promise<any> {
    try {
      // Obtener datos de la cita
      const appointment = await prisma.appointment.findUnique({
        where: { id: eventData.entityId },
        include: {
          services: {
            include: {
              service: true
            }
          },
          person: true,
          professionalUser: true
        }
      })
      
      if (!appointment) {
        throw new Error(`Cita no encontrada: ${eventData.entityId}`)
      }
      
      // Crear datos de actualización incremental
      const updateData: IncrementalUpdateData = {
        type: 'appointment_completed',
        serviceId: appointment.services[0]?.service?.id,
        timestamp: eventData.timestamp || new Date(),
        metadata: {
          appointmentId: appointment.id,
          personId: appointment.person?.id,
          professionalUserId: appointment.professionalUserId,
          serviceCount: appointment.services.length
        }
      }
      
      // Actualizar métricas incrementalmente
      const updatedMetrics = await incrementalConfidenceCalculator.updateSystemMetrics(
        eventData.systemId,
        updateData
      )
      
      return updatedMetrics
      
    } catch (error) {
      console.error('Error en handleAppointmentCompleted:', error)
      throw error
    }
  }
  
  /**
   * 🎯 HANDLER: Perfil energético creado
   * 
   * Se ejecuta cuando se crea un nuevo perfil energético para un servicio
   */
  private async handleEnergyProfileCreated(eventData: TriggerEventData): Promise<any> {
    try {
      // Obtener datos del perfil
      const profile = await prisma.serviceEnergyProfile.findUnique({
        where: { id: eventData.entityId },
        include: {
          service: true
        }
      })
      
      if (!profile) {
        throw new Error(`Perfil energético no encontrado: ${eventData.entityId}`)
      }
      
      // Determinar si es perfil maduro (>=20 muestras)
      const isMatureProfile = profile.sampleCount >= 20
      
      // Crear datos de actualización incremental
      const updateData: IncrementalUpdateData = {
        type: 'profile_created',
        serviceId: profile.service.id,
        profileId: profile.id,
        sampleCount: profile.sampleCount,
        isNewProfile: true,
        isMatureProfile,
        timestamp: eventData.timestamp || new Date(),
        metadata: {
          avgKwhPerMin: Number(profile.avgKwhPerMin),
          stdDevKwhPerMin: Number(profile.stdDevKwhPerMin),
          serviceName: profile.service.name
        }
      }
      
      // Actualizar métricas incrementalmente
      const updatedMetrics = await incrementalConfidenceCalculator.updateSystemMetrics(
        eventData.systemId,
        updateData
      )
      
      return updatedMetrics
      
    } catch (error) {
      console.error('Error en handleEnergyProfileCreated:', error)
      throw error
    }
  }
  
  /**
   * 🎯 HANDLER: Perfil energético actualizado
   * 
   * Se ejecuta cuando se actualiza un perfil energético existente
   */
  private async handleEnergyProfileUpdated(eventData: TriggerEventData): Promise<any> {
    try {
      // Obtener datos del perfil actualizado
      const profile = await prisma.serviceEnergyProfile.findUnique({
        where: { id: eventData.entityId },
        include: {
          service: true
        }
      })
      
      if (!profile) {
        throw new Error(`Perfil energético no encontrado: ${eventData.entityId}`)
      }
      
      // Verificar si se convirtió en maduro (alcanzó 20 muestras)
      const justBecameMature = profile.sampleCount === 20
      
      // Crear datos de actualización incremental
      const updateData: IncrementalUpdateData = {
        type: 'profile_updated',
        serviceId: profile.service.id,
        profileId: profile.id,
        sampleCount: profile.sampleCount,
        isNewProfile: false,
        isMatureProfile: justBecameMature,
        timestamp: eventData.timestamp || new Date(),
        metadata: {
          avgKwhPerMin: Number(profile.avgKwhPerMin),
          stdDevKwhPerMin: Number(profile.stdDevKwhPerMin),
          justBecameMature,
          serviceName: profile.service.name
        }
      }
      
      // Actualizar métricas incrementalmente
      const updatedMetrics = await incrementalConfidenceCalculator.updateSystemMetrics(
        eventData.systemId,
        updateData
      )
      
      return updatedMetrics
      
    } catch (error) {
      console.error('Error en handleEnergyProfileUpdated:', error)
      throw error
    }
  }
  
  /**
   * 🎯 HANDLER: Anomalía detectada
   * 
   * Se ejecuta cuando se detecta una anomalía energética
   */
  private async handleAnomalyDetected(eventData: TriggerEventData): Promise<any> {
    try {
      // Obtener datos del insight/anomalía
      const insight = await prisma.deviceUsageInsight.findUnique({
        where: { id: eventData.entityId },
        include: {
          appointment: {
            include: {
              services: {
                include: {
                  service: true
                }
              },
              person: true,
              professionalUser: true
            }
          }
        }
      })
      
      if (!insight) {
        throw new Error(`Insight no encontrado: ${eventData.entityId}`)
      }
      
      // Calcular certeza contextual para este insight
      const contextualConfidence = await incrementalConfidenceCalculator.calculateContextualConfidence?.(
        insight,
        eventData.systemId
      )
      
      // Usar certeza contextual o valor por defecto
      const confidence = contextualConfidence?.adjustedConfidence || 50
      
      // Crear datos de actualización incremental
      const updateData: IncrementalUpdateData = {
        type: 'anomaly_detected',
        confidence,
        serviceId: insight.appointment?.services[0]?.service?.id,
        timestamp: eventData.timestamp || insight.detectedAt,
        metadata: {
          insightId: insight.id,
          appointmentId: insight.appointmentId,
          anomalyType: insight.type,
          severity: insight.severity,
          description: insight.description
        }
      }
      
      // Actualizar métricas incrementalmente
      const updatedMetrics = await incrementalConfidenceCalculator.updateSystemMetrics(
        eventData.systemId,
        updateData
      )
      
      return updatedMetrics
      
    } catch (error) {
      console.error('Error en handleAnomalyDetected:', error)
      throw error
    }
  }
  
  /**
   * 🎯 HANDLER: Muestra de energía añadida
   * 
   * Se ejecuta cuando se añade una nueva muestra de energía
   */
  private async handlePowerSampleAdded(eventData: TriggerEventData): Promise<any> {
    try {
      // Obtener datos de la muestra
      const sample = await prisma.smartPlugPowerSample.findUnique({
        where: { id: eventData.entityId }
      })
      
      if (!sample) {
        throw new Error(`Muestra de energía no encontrada: ${eventData.entityId}`)
      }
      
      // Crear datos de actualización incremental
      const updateData: IncrementalUpdateData = {
        type: 'sample_added',
        timestamp: eventData.timestamp || sample.createdAt,
        metadata: {
          sampleId: sample.id,
          powerValue: Number(sample.power),
          deviceId: sample.deviceId
        }
      }
      
      // Actualizar métricas incrementalmente
      const updatedMetrics = await incrementalConfidenceCalculator.updateSystemMetrics(
        eventData.systemId,
        updateData
      )
      
      return updatedMetrics
      
    } catch (error) {
      console.error('Error en handlePowerSampleAdded:', error)
      throw error
    }
  }
  
  // ============================================================================
  // 🔧 MÉTODOS DE CONTROL Y GESTIÓN
  // ============================================================================
  
  /**
   * 🔧 HABILITAR/DESHABILITAR TRIGGERS
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    console.log(`${enabled ? '✅' : '❌'} Triggers de certeza ${enabled ? 'habilitados' : 'deshabilitados'}`)
  }
  
  /**
   * 📊 OBTENER ESTADO DE TRIGGERS
   */
  getStatus(): {
    enabled: boolean
    queueSize: number
    totalQueues: number
  } {
    return {
      enabled: this.isEnabled,
      queueSize: Array.from(this.processingQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      totalQueues: this.processingQueue.size
    }
  }
  
  /**
   * 🧹 LIMPIAR COLAS DE PROCESAMIENTO
   */
  clearQueues(): void {
    this.processingQueue.clear()
    console.log('🧹 Colas de triggers limpiadas')
  }
  
  /**
   * 📋 OBTENER ESTADÍSTICAS DE PROCESAMIENTO
   */
  getProcessingStats(): {
    totalProcessed: number
    successRate: number
    avgProcessingTime: number
  } {
    // TODO: Implementar estadísticas persistentes
    return {
      totalProcessed: 0,
      successRate: 0,
      avgProcessingTime: 0
    }
  }
}

// ============================================================================
// 🎯 FUNCIONES AUXILIARES PARA INTEGRACIÓN
// ============================================================================

/**
 * 🔄 TRIGGER PARA CITA COMPLETADA
 * 
 * Llamar desde el endpoint de completar cita
 */
export async function triggerAppointmentCompleted(
  systemId: string,
  appointmentId: string,
  metadata?: Record<string, any>
): Promise<TriggerProcessingResult> {
  const eventData: TriggerEventData = {
    systemId,
    eventType: 'appointment_completed',
    entityId: appointmentId,
    metadata,
    timestamp: new Date()
  }
  
  return confidenceUpdateTriggers.processEvent(eventData)
}

/**
 * 🔄 TRIGGER PARA PERFIL ENERGÉTICO CREADO
 * 
 * Llamar desde el endpoint de crear perfil energético
 */
export async function triggerEnergyProfileCreated(
  systemId: string,
  profileId: string,
  metadata?: Record<string, any>
): Promise<TriggerProcessingResult> {
  const eventData: TriggerEventData = {
    systemId,
    eventType: 'profile_created',
    entityId: profileId,
    metadata,
    timestamp: new Date()
  }
  
  return confidenceUpdateTriggers.processEvent(eventData)
}

/**
 * 🔄 TRIGGER PARA PERFIL ENERGÉTICO ACTUALIZADO
 * 
 * Llamar desde el endpoint de actualizar perfil energético
 */
export async function triggerEnergyProfileUpdated(
  systemId: string,
  profileId: string,
  metadata?: Record<string, any>
): Promise<TriggerProcessingResult> {
  const eventData: TriggerEventData = {
    systemId,
    eventType: 'profile_updated',
    entityId: profileId,
    metadata,
    timestamp: new Date()
  }
  
  return confidenceUpdateTriggers.processEvent(eventData)
}

/**
 * 🔄 TRIGGER PARA ANOMALÍA DETECTADA
 * 
 * Llamar desde el endpoint de detectar anomalía
 */
export async function triggerAnomalyDetected(
  systemId: string,
  insightId: string,
  metadata?: Record<string, any>
): Promise<TriggerProcessingResult> {
  const eventData: TriggerEventData = {
    systemId,
    eventType: 'anomaly_detected',
    entityId: insightId,
    metadata,
    timestamp: new Date()
  }
  
  return confidenceUpdateTriggers.processEvent(eventData)
}

/**
 * 🔄 TRIGGER PARA MUESTRA DE ENERGÍA AÑADIDA
 * 
 * Llamar desde el endpoint de añadir muestra de energía
 */
export async function triggerPowerSampleAdded(
  systemId: string,
  sampleId: string,
  metadata?: Record<string, any>
): Promise<TriggerProcessingResult> {
  const eventData: TriggerEventData = {
    systemId,
    eventType: 'sample_added',
    entityId: sampleId,
    metadata,
    timestamp: new Date()
  }
  
  return confidenceUpdateTriggers.processEvent(eventData)
}

// ============================================================================
// 🎯 INSTANCIA SINGLETON EXPORTADA
// ============================================================================

/**
 * 🎯 INSTANCIA SINGLETON DE TRIGGERS
 * Usar esta instancia en toda la aplicación
 */
export const confidenceUpdateTriggers = new ConfidenceUpdateTriggers()

// ============================================================================
// 🔧 FUNCIONES DE GESTIÓN GLOBAL
// ============================================================================

/**
 * 🔧 HABILITAR/DESHABILITAR TODOS LOS TRIGGERS
 */
export function setTriggersEnabled(enabled: boolean): void {
  confidenceUpdateTriggers.setEnabled(enabled)
}

/**
 * 📊 OBTENER ESTADO DE TRIGGERS
 */
export function getTriggersStatus() {
  return confidenceUpdateTriggers.getStatus()
}

/**
 * 🧹 LIMPIAR TODAS LAS COLAS
 */
export function clearAllTriggerQueues(): void {
  confidenceUpdateTriggers.clearQueues()
}

/**
 * 📋 OBTENER ESTADÍSTICAS DE PROCESAMIENTO
 */
export function getTriggerProcessingStats() {
  return confidenceUpdateTriggers.getProcessingStats()
} 