/**
 * 🎯 SERVICE DURATION UPDATE API - BASADO EN DATOS REALES
 * ========================================================
 * 
 * Endpoint para actualizar duraciones de servicio basándose en datos reales
 * de consumo energético. Permite optimizar treatmentDurationMinutes y 
 * durationMinutes usando estadísticas del algoritmo de Welford.
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * 🎯 LÓGICA DE VALIDACIÓN CRÍTICA:
 * - treatmentDurationMinutes NUNCA puede ser > durationMinutes
 * - Si avgRealDuration > durationMinutes actual: Actualizar ambos
 * - Si avgRealDuration <= durationMinutes actual: Solo treatmentDurationMinutes
 * - Validación exhaustiva de valores > 0
 * 
 * Variables críticas:
 * - serviceId: ID del servicio a actualizar
 * - proposedTreatmentDuration: Nueva duración de tratamiento propuesta
 * - proposedServiceDuration: Nueva duración de cita propuesta (opcional)
 * - avgRealDuration: Duración real promedio de referencia
 * - sampleCount: Número de muestras para validar confiabilidad
 * 
 * @see docs/ENERGY_INSIGHTS_VALIDATED_SERVICES.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 📋 ESQUEMA DE VALIDACIÓN
const updateDurationSchema = z.object({
  proposedTreatmentDuration: z.number().min(1, 'Duración de tratamiento debe ser > 0'),
  proposedServiceDuration: z.number().min(1, 'Duración de servicio debe ser > 0').optional(),
  avgRealDuration: z.number().min(0, 'Duración real promedio debe ser >= 0'),
  sampleCount: z.number().min(1, 'Debe haber al menos 1 muestra'),
  updateReason: z.string().optional()
})

type UpdateDurationBody = z.infer<typeof updateDurationSchema>

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 AUTENTICACIÓN OBLIGATORIA
    const session = await auth()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: serviceId } = await params
    console.log(`🎯 [UPDATE_DURATION] Iniciando actualización para serviceId: ${serviceId}`)

    // 📋 VALIDAR DATOS DE ENTRADA
    const body = await req.json()
    const validatedData = updateDurationSchema.parse(body)

    const {
      proposedTreatmentDuration,
      proposedServiceDuration,
      avgRealDuration,
      sampleCount,
      updateReason = 'Optimización basada en datos reales'
    } = validatedData

    // 🔍 OBTENER SERVICIO ACTUAL
    const currentService = await prisma.service.findUnique({
      where: { 
        id: serviceId,
        systemId: session.user.systemId // 🔐 Multi-tenant security
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        treatmentDurationMinutes: true,
        systemId: true
      }
    })

    if (!currentService) {
      return NextResponse.json({ 
        error: 'Servicio no encontrado o sin acceso' 
      }, { status: 404 })
    }

    console.log(`📊 [UPDATE_DURATION] Servicio actual:`, {
      name: currentService.name,
      currentDuration: currentService.durationMinutes,
      currentTreatment: currentService.treatmentDurationMinutes,
      avgRealDuration,
      sampleCount
    })

    // 🚨 VALIDACIÓN CRÍTICA: treatmentDuration <= serviceDuration
    const finalServiceDuration = proposedServiceDuration || currentService.durationMinutes
    
    if (proposedTreatmentDuration > finalServiceDuration) {
      return NextResponse.json({
        error: 'La duración de tratamiento no puede ser mayor que la duración del servicio',
        details: {
          proposedTreatmentDuration,
          maxAllowedTreatmentDuration: finalServiceDuration,
          currentServiceDuration: currentService.durationMinutes
        }
      }, { status: 400 })
    }

    // 🔍 VERIFICAR CONFIABILIDAD DE DATOS
    if (sampleCount < 5) {
      console.warn(`⚠️ [UPDATE_DURATION] Pocas muestras para actualización: ${sampleCount}`)
    }

    // 📝 PREPARAR DATOS DE ACTUALIZACIÓN
    const updateData: any = {
      treatmentDurationMinutes: proposedTreatmentDuration
    }

    // ✅ ACTUALIZAR DURACIÓN DE SERVICIO SI SE PROPORCIONA
    if (proposedServiceDuration && proposedServiceDuration !== currentService.durationMinutes) {
      updateData.durationMinutes = proposedServiceDuration
      console.log(`🔄 [UPDATE_DURATION] Actualizando ambas duraciones`)
    } else {
      console.log(`🔄 [UPDATE_DURATION] Actualizando solo duración de tratamiento`)
    }

    // 💾 EJECUTAR ACTUALIZACIÓN EN TRANSACCIÓN
    const updatedService = await prisma.$transaction(async (tx) => {
      // Actualizar servicio
      const service = await tx.service.update({
        where: { id: serviceId },
        data: updateData
      })

      // 📝 REGISTRAR CAMBIO EN LOG (opcional - para auditoría)
      try {
        await tx.entityChangeLog.create({
          data: {
            systemId: session.user.systemId,
            entityType: 'SERVICE',
            entityId: serviceId,
            action: 'UPDATE_DURATION',
            userId: session.user.id,
            details: {
              fieldName: proposedServiceDuration ? 'duration_and_treatment' : 'treatment_duration',
              oldValue: {
                durationMinutes: currentService.durationMinutes,
                treatmentDurationMinutes: currentService.treatmentDurationMinutes
              },
              newValue: {
                durationMinutes: service.durationMinutes,
                treatmentDurationMinutes: service.treatmentDurationMinutes
              },
              metadata: {
                reason: updateReason,
                avgRealDuration,
                sampleCount,
                source: 'energy_insights_optimization'
              }
            }
          }
        })
      } catch (logError) {
        console.warn('Error registrando cambio en log:', logError)
        // No fallar la transacción por error de log
      }

      return service
    })

    console.log(`✅ [UPDATE_DURATION] Servicio actualizado exitosamente:`, {
      serviceId,
      oldDuration: currentService.durationMinutes,
      newDuration: updatedService.durationMinutes,
      oldTreatment: currentService.treatmentDurationMinutes,
      newTreatment: updatedService.treatmentDurationMinutes
    })

    // 📊 CALCULAR IMPACTO DE LA ACTUALIZACIÓN
    const impactAnalysis = {
      treatmentDurationChange: {
        old: currentService.treatmentDurationMinutes,
        new: updatedService.treatmentDurationMinutes,
        changePercent: currentService.treatmentDurationMinutes > 0 ? 
          Math.round(((updatedService.treatmentDurationMinutes - currentService.treatmentDurationMinutes) / currentService.treatmentDurationMinutes) * 100) : null
      },
      serviceDurationChange: proposedServiceDuration ? {
        old: currentService.durationMinutes,
        new: updatedService.durationMinutes,
        changePercent: Math.round(((updatedService.durationMinutes - currentService.durationMinutes) / currentService.durationMinutes) * 100)
      } : null,
      dataQuality: {
        sampleCount,
        reliability: sampleCount >= 20 ? 'high' : sampleCount >= 10 ? 'medium' : 'low',
        avgRealDuration
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Duraciones actualizadas exitosamente',
      data: {
        service: {
          id: updatedService.id,
          name: currentService.name,
          durationMinutes: updatedService.durationMinutes,
          treatmentDurationMinutes: updatedService.treatmentDurationMinutes
        },
        changes: impactAnalysis,
        metadata: {
          updatedAt: new Date().toISOString(),
          updatedBy: session.user.id,
          reason: updateReason,
          source: 'energy_insights_table'
        }
      }
    })

  } catch (error) {
    console.error('❌ [UPDATE_DURATION] Error actualizando duraciones:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 