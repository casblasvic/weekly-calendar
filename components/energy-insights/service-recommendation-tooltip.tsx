/**
 * 🎯 SERVICE RECOMMENDATION TOOLTIP - RECOMENDACIONES INDIVIDUALES POR SERVICIO
 * =============================================================================
 * 
 * Tooltip card que analiza la situación específica de cada servicio y proporciona
 * recomendaciones personalizadas basadas en datos reales vs configurados.
 * 
 * Características:
 * - Análisis específico por servicio individual
 * - Recomendaciones personalizadas según situación
 * - Explicaciones formativas y educativas
 * - Códigos de color según prioridad
 * - Acciones recomendadas específicas
 * 
 * Casos analizados:
 * - Configuración óptima
 * - Sobrepaso crítico (real > configurado)
 * - Ajuste menor necesario
 * - Servicio sobredimensionado
 * - Falta de datos
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Target,
  Info,
  BarChart3
} from 'lucide-react'

interface ServiceData {
  serviceName: string
  equipmentName: string
  configuredDurationMinutes: number | null
  avgRealDurationMinutes: number | null
  sampleCount: number
  variabilityPct: number
}

interface ServiceRecommendationTooltipProps {
  service: ServiceData
  children: React.ReactNode
  className?: string
}

interface RecommendationAnalysis {
  status: 'optimal' | 'critical' | 'minor_adjustment' | 'oversized' | 'insufficient_data'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  action: string
  color: string
  icon: React.ReactNode
  diffPercentage?: number
}

function analyzeService(service: ServiceData): RecommendationAnalysis {
  const { configuredDurationMinutes, avgRealDurationMinutes, sampleCount } = service
  
  // Caso: Datos insuficientes
  if (!avgRealDurationMinutes || avgRealDurationMinutes <= 0 || sampleCount < 3) {
    return {
      status: 'insufficient_data',
      priority: 'low',
      title: '📊 Datos Insuficientes',
      description: `Solo ${sampleCount} muestras disponibles. Se necesitan al menos 3 tratamientos para análisis confiable.`,
      recommendation: 'Continuar recopilando datos de tratamientos reales para obtener recomendaciones precisas.',
      action: 'Esperar más datos',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: <BarChart3 className="w-4 h-4 text-gray-600" />
    }
  }

  if (!configuredDurationMinutes || configuredDurationMinutes <= 0) {
    return {
      status: 'insufficient_data',
      priority: 'medium',
      title: '⚙️ Configuración Pendiente',
      description: 'El servicio no tiene duración configurada.',
      recommendation: 'Configurar duración inicial basándose en los datos reales disponibles.',
      action: 'Configurar duración',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: <Target className="w-4 h-4 text-blue-600" />
    }
  }

  const avgReal = Math.round(avgRealDurationMinutes)
  const configured = configuredDurationMinutes
  const difference = Math.abs(avgReal - configured)
  const diffPercentage = (difference / configured) * 100

  // 🟢 CASO 1: CONFIGURACIÓN ÓPTIMA
  if (diffPercentage <= 5) {
    return {
      status: 'optimal',
      priority: 'low',
      title: '✅ Configuración Óptima',
      description: `La duración configurada (${configured} min) coincide con la realidad (${avgReal} min). Diferencia: ${diffPercentage.toFixed(1)}%.`,
      recommendation: 'La configuración actual es excelente. Mantener la duración actual y continuar monitoreando.',
      action: 'Mantener configuración',
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      diffPercentage
    }
  }

  // 🔴 CASO 2: SOBREPASO CRÍTICO
  if (avgReal > configured) {
    return {
      status: 'critical',
      priority: 'critical',
      title: '🚨 Sobrepaso Crítico',
      description: `El tiempo real (${avgReal} min) supera la duración configurada (${configured} min). Esto causa retrasos en la agenda.`,
      recommendation: `Aumentar la duración del servicio a ${avgReal + 2} min (${avgReal} min tratamiento + 2 min preparación) para evitar retrasos y mejorar la experiencia del cliente.`,
      action: 'Actualizar duración urgente',
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
      diffPercentage
    }
  }

  // 🟡 CASO 3: AJUSTE MENOR
  if (diffPercentage <= 15) {
    return {
      status: 'minor_adjustment',
      priority: 'medium',
      title: '🔧 Ajuste Recomendado',
      description: `Pequeña diferencia entre configurado (${configured} min) y real (${avgReal} min). Diferencia: ${diffPercentage.toFixed(1)}%.`,
      recommendation: `Ajustar la duración de tratamiento a ${avgReal} min para optimizar la precisión, manteniendo margen de preparación.`,
      action: 'Optimizar duración',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: <TrendingUp className="w-4 h-4 text-yellow-600" />,
      diffPercentage
    }
  }

  // 🟠 CASO 4: SOBREDIMENSIONADO
  return {
    status: 'oversized',
    priority: 'medium',
    title: '📉 Servicio Sobredimensionado',
    description: `La duración configurada (${configured} min) es ${diffPercentage.toFixed(1)}% mayor que la realidad (${avgReal} min).`,
    recommendation: `Reducir la duración a ${avgReal + 3} min (${avgReal} min tratamiento + 3 min preparación) para optimizar la agenda sin comprometer la calidad.`,
    action: 'Optimizar duración',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: <TrendingDown className="w-4 h-4 text-orange-600" />,
    diffPercentage
  }
}

export function ServiceRecommendationTooltip({ 
  service, 
  children, 
  className = "" 
}: ServiceRecommendationTooltipProps) {
  
  const analysis = analyzeService(service)

  return (
    <HoverCard openDelay={400} closeDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="p-0 bg-white rounded-lg shadow-xl border z-[999999] w-auto overflow-hidden"
        style={{
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.12)",
          minWidth: "300px",
          maxWidth: "400px",
          animation: "serviceTooltipAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        <style jsx global>{`
          @keyframes serviceTooltipAppear {
            0% { 
              opacity: 0; 
              transform: translateY(6px) scale(0.96);
            }
            100% { 
              opacity: 1; 
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
        
        {/* Header con información del servicio */}
        <div className="px-4 pt-3 pb-2 bg-gradient-to-r to-gray-50 border-b from-slate-50">
          <div className="flex items-center mb-1 space-x-2">
            <div className="p-1 rounded bg-slate-100">
              <Target className="w-3 h-3 text-slate-600" />
            </div>
            <div className="text-sm font-semibold text-gray-900 truncate">
              {service.serviceName}
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Equipo: {service.equipmentName} • {service.sampleCount} muestras
          </div>
        </div>

        {/* Análisis y estado */}
        <div className="p-4 space-y-3">
          {/* Estado del servicio */}
          <div className="flex items-center space-x-2">
            {analysis.icon}
            <div className="flex-1">
              <Badge className={`${analysis.color} text-xs font-medium`}>
                {analysis.title}
              </Badge>
            </div>
          </div>

          {/* Descripción de la situación */}
          <div className="text-xs leading-relaxed text-gray-700">
            {analysis.description}
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200"></div>

          {/* Recomendación */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1">
              <Lightbulb className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-blue-800">Recomendación</span>
            </div>
            <div className="text-xs leading-relaxed text-gray-700">
              {analysis.recommendation}
            </div>
          </div>

          {/* Acción recomendada */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">Acción:</span>
              <Badge variant="outline" className="text-xs">
                {analysis.action}
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer con contexto educativo */}
        <div className="px-4 py-2 border-t bg-slate-50">
          <div className="flex items-center space-x-1">
            <Info className="w-3 h-3 text-slate-500" />
            <div className="text-xs text-slate-600">
              {analysis.status === 'optimal' ? 
                'La duración incluye tiempo de tratamiento + preparación' :
                'Recuerda incluir tiempo de preparación del paciente'
              }
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
} 