/**
 * 🎯 DURATION UPDATE MODAL - OPTIMIZACIÓN BASADA EN DATOS REALES
 * ==============================================================
 * 
 * Modal inteligente para actualizar duraciones de servicio usando estadísticas
 * reales del algoritmo de Welford. Proporciona interfaz intuitiva con validación
 * automática y campos editables para ajustes manuales.
 * 
 * 🎯 FUNCIONALIDADES PRINCIPALES:
 * - Cálculo automático de duraciones propuestas
 * - Validación: treatmentDuration <= serviceDuration
 * - Campos editables para ajustes manuales
 * - Feedback visual de cambios e impacto
 * - Indicadores de confiabilidad de datos
 * 
 * Variables críticas:
 * - avgRealDurationMinutes: Duración real promedio (Welford)
 * - configuredDurationMinutes: Duración actual del servicio
 * - sampleCount: Número de muestras para confiabilidad
 * - proposedTreatmentDuration: Nueva duración de tratamiento
 * - proposedServiceDuration: Nueva duración de servicio (si necesario)
 * 
 * @see docs/ENERGY_INSIGHTS_VALIDATED_SERVICES.md
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Zap,
  Target,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

// 📋 INTERFACES
interface EquipmentVariabilityItem {
  equipmentId: string
  equipmentName: string
  serviceId: string
  serviceName: string
  avgRealDurationMinutes: number | null
  configuredDurationMinutes: number | null
  sampleCount: number
  durationSource: string
  durationVariabilityPct: number
  durationEfficiencyPct: number | null
}

interface DurationUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  equipmentData: EquipmentVariabilityItem | null
  onSuccess: (updatedData: any) => void
  onError?: (error: any) => void
}

interface ProposedDurations {
  treatmentDuration: number
  serviceDuration: number
  updateBoth: boolean
  reason: string
}

export function DurationUpdateModal({
  isOpen,
  onClose,
  equipmentData,
  onSuccess,
  onError
}: DurationUpdateModalProps) {
  
  // 🎯 ESTADOS DEL COMPONENTE
  const [proposedDurations, setProposedDurations] = useState<ProposedDurations | null>(null)
  const [editableTreatment, setEditableTreatment] = useState<number>(0)
  const [editableService, setEditableService] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [updateReason, setUpdateReason] = useState('')

  // 🧮 CALCULAR DURACIONES PROPUESTAS
  useEffect(() => {
    if (!equipmentData || !equipmentData.avgRealDurationMinutes) {
      setProposedDurations(null)
      return
    }

    const avgReal = Math.round(equipmentData.avgRealDurationMinutes)
    const currentService = equipmentData.configuredDurationMinutes || 0
    
    // 🎯 LÓGICA DE PROPUESTA INTELIGENTE MEJORADA
    let proposedTreatment = avgReal
    let proposedService = currentService
    let updateBoth = false
    let reason = ''
    
    // Calcular diferencia porcentual
    const difference = Math.abs(avgReal - currentService)
    const diffPercentage = currentService > 0 ? (difference / currentService) * 100 : 0
    
    // 🟢 CASO 1: CONFIGURACIÓN ÓPTIMA (Diferencia ≤ 5% Y hay margen de preparación)
    if (diffPercentage <= 5 && currentService > avgReal) {
      proposedTreatment = currentService // Mantener configuración actual
      proposedService = currentService
      updateBoth = false
      reason = `La configuración actual es óptima (diferencia: ${diffPercentage.toFixed(1)}%). Hay margen adecuado de preparación (${(currentService - avgReal).toFixed(1)} min).`
    }
    // 🟡 CASO 2: SIN MARGEN DE PREPARACIÓN (Real ≈ Configurado)
    else if (Math.abs(avgReal - currentService) <= 1) {
      const margin = Math.max(3, Math.round(avgReal * 0.15)) // Margen del 15% o mínimo 3 min
      proposedTreatment = avgReal
      proposedService = avgReal + margin
      updateBoth = true
      reason = `⚠️ Sin margen de preparación: La duración real (${avgReal} min) es igual a la duración de cita (${currentService} min). Se propone: ${avgReal} min tratamiento + ${margin} min preparación = ${avgReal + margin} min total.`
    }
    // 🔴 CASO 3: SOBREPASO CRÍTICO (Real > Configurado)
    else if (avgReal > currentService) {
      const margin = Math.max(2, Math.round(avgReal * 0.1)) // Margen del 10% o mínimo 2 min
      proposedTreatment = avgReal
      proposedService = avgReal + margin
      updateBoth = true
      reason = `🚨 CRÍTICO: La duración real (${avgReal} min) excede la configurada (${currentService} min). Riesgo de retrasos. Se propone: Tratamiento ${avgReal} min + ${margin} min de preparación.`
    }
    // 🟡 CASO 4: AJUSTE MENOR (Real < Configurado, diferencia 5-15%)
    else if (diffPercentage <= 15) {
      proposedTreatment = avgReal
      proposedService = currentService // Mantener duración de servicio
      updateBoth = false
      reason = `Optimización menor: Ajustar duración de tratamiento de ${currentService} min a ${avgReal} min (diferencia: ${diffPercentage.toFixed(1)}%). Mantener duración de servicio para preservar margen de preparación.`
    }
    // 🟠 CASO 5: SOBREDIMENSIONADO (Real << Configurado, diferencia > 15%)
    else {
      const margin = Math.max(3, Math.round(avgReal * 0.15)) // Margen del 15% o mínimo 3 min
      proposedTreatment = avgReal
      proposedService = avgReal + margin
      updateBoth = true
      reason = `Servicio sobredimensionado: La duración real (${avgReal} min) es ${diffPercentage.toFixed(1)}% menor que la configurada (${currentService} min). Se propone optimizar a ${avgReal + margin} min (${avgReal} min tratamiento + ${margin} min preparación).`
    }

    const proposed: ProposedDurations = {
      treatmentDuration: proposedTreatment,
      serviceDuration: proposedService,
      updateBoth,
      reason
    }

    setProposedDurations(proposed)
    setEditableTreatment(proposedTreatment)
    setEditableService(proposedService)
    setUpdateReason(updateBoth ? 'Optimización completa basada en datos reales' : 'Optimización de duración de tratamiento')

  }, [equipmentData])

  // 🎯 VALIDACIÓN EN TIEMPO REAL
  const validation = React.useMemo(() => {
    if (!equipmentData || editableTreatment <= 0 || editableService <= 0) {
      return { isValid: false, message: 'Las duraciones deben ser mayores a 0' }
    }

    if (editableTreatment > editableService) {
      return { 
        isValid: false, 
        message: 'La duración de tratamiento no puede ser mayor que la duración del servicio' 
      }
    }

    return { isValid: true, message: '' }
  }, [editableTreatment, editableService, equipmentData])

  // 🎨 OBTENER INDICADOR DE CONFIABILIDAD
  const getReliabilityInfo = (sampleCount: number) => {
    if (sampleCount >= 20) {
      return { 
        level: 'Alta', 
        color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        icon: <CheckCircle className="w-4 h-4" />
      }
    } else if (sampleCount >= 10) {
      return { 
        level: 'Media', 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: <BarChart3 className="w-4 h-4" />
      }
    } else {
      return { 
        level: 'Baja', 
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: <AlertTriangle className="w-4 h-4" />
      }
    }
  }

  // 🚀 EJECUTAR ACTUALIZACIÓN
  const handleUpdate = async () => {
    if (!equipmentData || !validation.isValid) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/services/${equipmentData.serviceId}/update-duration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedTreatmentDuration: editableTreatment,
          proposedServiceDuration: proposedDurations?.updateBoth ? editableService : undefined,
          avgRealDuration: equipmentData.avgRealDurationMinutes,
          sampleCount: equipmentData.sampleCount,
          updateReason
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error actualizando duraciones')
      }

      // ✅ ÉXITO: No mostrar toast aquí, se maneja en el componente padre
      onSuccess(result.data)
      onClose()

    } catch (error) {
      console.error('Error actualizando duraciones:', error)
      toast.error('Error actualizando duraciones', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!equipmentData || !proposedDurations) {
    return null
  }

  const reliability = getReliabilityInfo(equipmentData.sampleCount)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>Optimizar Duraciones del Servicio</span>
          </DialogTitle>
          <DialogDescription>
            Optimizar duraciones basándose en datos reales de tratamientos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[60vh] px-1">
          <div className="space-y-4">
            {/* 🏷️ INFORMACIÓN DEL SERVICIO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>{equipmentData.serviceName}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Equipo: {equipmentData.equipmentName}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 📊 ESTADÍSTICAS ACTUALES */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-900">
                      {equipmentData.configuredDurationMinutes || 'N/A'}
                    </div>
                    <div className="text-xs text-blue-700">Duración Actual</div>
                    <div className="text-xs text-blue-600">minutos</div>
                  </div>
                  
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-900">
                      {equipmentData.avgRealDurationMinutes?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-green-700">Promedio Real</div>
                    <div className="text-xs text-green-600">minutos</div>
                  </div>
                  
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-900">
                      {equipmentData.sampleCount}
                    </div>
                    <div className="text-xs text-purple-700">Muestras</div>
                    <div className="text-xs text-purple-600">datos reales</div>
                  </div>
                </div>

                {/* 🎯 CONFIABILIDAD */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confiabilidad de datos:</span>
                  <Badge className={`${reliability.color} flex items-center space-x-1`}>
                    {reliability.icon}
                    <span>{reliability.level}</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 🎯 PROPUESTA INTELIGENTE */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span>Propuesta de Optimización</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">{proposedDurations.reason}</p>
                </div>

                {/* 📝 CAMPOS EDITABLES */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="treatmentDuration" className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Duración de Tratamiento</span>
                    </Label>
                    <Input
                      id="treatmentDuration"
                      type="number"
                      min="1"
                      value={editableTreatment}
                      onChange={(e) => setEditableTreatment(Number(e.target.value))}
                      className="text-center"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tiempo real de uso del equipo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceDuration" className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Duración del Servicio</span>
                    </Label>
                    <Input
                      id="serviceDuration"
                      type="number"
                      min="1"
                      value={editableService}
                      onChange={(e) => setEditableService(Number(e.target.value))}
                      className="text-center"
                      disabled={!proposedDurations.updateBoth}
                    />
                    <p className="text-xs text-muted-foreground">
                      Duración total de la cita
                    </p>
                  </div>
                </div>

                {/* ⚠️ VALIDACIÓN */}
                {!validation.isValid && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800">{validation.message}</span>
                  </div>
                )}

                {/* 📝 RAZÓN DE ACTUALIZACIÓN */}
                <div className="space-y-2">
                  <Label htmlFor="updateReason">Razón de la actualización</Label>
                  <Input
                    id="updateReason"
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    placeholder="Describe el motivo de esta optimización..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* 📊 IMPACTO ESPERADO */}
            {validation.isValid && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <span>Impacto Esperado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Duración de Tratamiento:</span>
                      <div className="text-muted-foreground">
                        {equipmentData.configuredDurationMinutes || 'N/A'} min → {editableTreatment} min
                      </div>
                    </div>
                    {proposedDurations.updateBoth && (
                      <div>
                        <span className="font-medium">Duración del Servicio:</span>
                        <div className="text-muted-foreground">
                          {equipmentData.configuredDurationMinutes} min → {editableService} min
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={!validation.isValid || isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Actualizar Duraciones</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 