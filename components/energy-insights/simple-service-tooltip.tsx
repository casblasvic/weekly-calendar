/**
 * 🎯 SIMPLE SERVICE TOOLTIP - SIN PROBLEMAS DE HIDRATACIÓN
 * =======================================================
 * 
 * Tooltip CSS puro que no causa errores de hidratación HTML.
 * Se posiciona correctamente cerca de la píldora de variabilidad futura.
 * 
 * Características:
 * - Tooltip CSS puro (no HoverCard)
 * - Sin problemas de hidratación
 * - Posicionamiento preciso
 * - Animaciones suaves
 * - Contenido formativo
 * 
 * @see docs/ENERGY_INSIGHTS_CASOS_RECOMENDACIONES_FINALES.md
 */

import React, { useState, useRef, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Clock, Lightbulb, TrendingUp } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ServiceData {
  serviceName: string
  equipmentName: string
  configuredDurationMinutes: number | null
  avgRealDurationMinutes: number | null
  sampleCount: number
  variabilityPct: number
}

interface SimpleServiceTooltipProps {
  service: ServiceData
  children: React.ReactNode
  futureStatus: 'optimal' | 'improved' | 'urgent'
  futureText: string
}

interface RecommendationAnalysis {
  status: 'optimal' | 'improved' | 'urgent'
  title: string
  description: string
  recommendation: string
  action: string
  color: string
  icon: React.ReactNode
  diffPercentage?: number
}

function analyzeServiceFuture(service: ServiceData, futureStatus: 'optimal' | 'improved' | 'urgent'): RecommendationAnalysis {
  const configured = service.configuredDurationMinutes || 0
  const avgReal = service.avgRealDurationMinutes || 0
  const diffPct = configured > 0 ? Math.abs((avgReal - configured) / configured) * 100 : 0

  switch (futureStatus) {
    case 'optimal':
      return {
        status: 'optimal',
        title: '✅ Configuración Óptima',
        description: `La duración configurada (${configured} min) coincide con la realidad (${avgReal} min).`,
        recommendation: 'Esta configuración permite un flujo operativo eficiente. Mantén esta duración para asegurar un margen adecuado de preparación entre citas y evitar retrasos en la agenda.',
        action: 'Mantener configuración actual',
        color: 'bg-green-50 border-green-200',
        icon: <CheckCircle className="w-4 h-4 text-green-600" />
      }
    case 'improved':
      return {
        status: 'improved',
        title: '⚡ Optimización Disponible',
        description: `Diferencia del ${diffPct.toFixed(1)}% entre configurado (${configured} min) y real (${avgReal} min).`,
        recommendation: 'Pequeños ajustes en la duración del tratamiento optimizarán la agenda sin comprometer la calidad. Esto mejorará la puntualidad de las citas posteriores y la experiencia del cliente.',
        action: 'Aplicar optimización recomendada',
        color: 'bg-yellow-50 border-yellow-200',
        icon: <TrendingUp className="w-4 h-4 text-yellow-600" />
      }
    case 'urgent':
      return {
        status: 'urgent',
        title: '🚨 Intervención Urgente',
        description: avgReal > configured 
          ? `CRÍTICO: La duración real (${avgReal} min) excede la configurada (${configured} min).`
          : `DESPERDICIO: Se está asignando ${diffPct.toFixed(1)}% más tiempo del necesario.`,
        recommendation: avgReal > configured
          ? 'Situación crítica que causa retrasos en cadena y afecta la experiencia del cliente. Es fundamental ajustar inmediatamente la duración para evitar colapsos en la agenda.'
          : 'Se está desperdiciando tiempo valioso que podría utilizarse para más citas. Optimizar la duración mejorará la rentabilidad y reducirá tiempos de espera.',
        action: 'Corrección inmediata requerida',
        color: 'bg-red-50 border-red-200',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />
      }
    default:
      return {
        status: 'improved',
        title: '⚡ Optimización Disponible',
        description: `Diferencia del ${diffPct.toFixed(1)}% detectada.`,
        recommendation: 'Se recomienda revisar y ajustar la configuración para optimizar el flujo operativo.',
        action: 'Revisar configuración',
        color: 'bg-yellow-50 border-yellow-200',
        icon: <Clock className="w-4 h-4 text-yellow-600" />
      }
  }
}

export function SimpleServiceTooltip({ 
  service, 
  children, 
  futureStatus,
  futureText 
}: SimpleServiceTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLElement>(null)
  const analysis = analyzeServiceFuture(service, futureStatus)

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + (rect.width / 2) - 160 // 160 = half of tooltip width (320px)
      })
    }
  }, [isVisible])

  const handleMouseEnter = () => {
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  // Asegurar que el children sea un elemento React válido
  if (!React.isValidElement(children)) {
    console.warn('SimpleServiceTooltip: children debe ser un elemento React válido')
    return <>{children}</>
  }

  // Clonamos el children y le añadimos los event handlers
  const clonedChildren = React.cloneElement(children as React.ReactElement<any>, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    style: { 
      cursor: 'help',
      ...((children as any)?.props?.style || {})
    }
  })

  const tooltipContent = isVisible ? (
    <div 
      className="fixed z-[9999] w-80 p-4 bg-white rounded-lg shadow-xl border pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
        animation: "fadeIn 0.2s ease-out"
      }}
    >
      {/* Header con gradiente */}
      <div className={`p-3 rounded-t-lg ${analysis.color} border-b`}>
        <div className="flex items-center space-x-2">
          {analysis.icon}
          <h3 className="text-sm font-semibold">{analysis.title}</h3>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-3 space-y-3">
        {/* Descripción */}
        <p className="text-sm text-gray-700">
          {analysis.description}
        </p>

        {/* Datos del servicio */}
        <div className="p-3 space-y-2 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Servicio:</span>
            <span className="font-medium">{service.serviceName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Equipo:</span>
            <span className="font-medium">{service.equipmentName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Muestras:</span>
            <span className="font-medium">{service.sampleCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Estado Futuro:</span>
            <span className="font-medium text-blue-600">{futureText}</span>
          </div>
        </div>

        {/* Recomendación */}
        <div className="flex items-start space-x-2">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-800">Recomendación:</p>
            <p className="text-xs text-gray-600">{analysis.recommendation}</p>
          </div>
        </div>

        {/* Acción */}
        <div className="pt-2 text-center border-t">
          <span className="text-xs font-medium text-blue-600">
            {analysis.action}
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  ) : null

  return (
    <>
      {clonedChildren}
      {typeof document !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  )
} 