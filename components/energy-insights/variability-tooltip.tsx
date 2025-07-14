/**
 * 🔮 TOOLTIP CARD DE VARIABILIDAD FUTURA - ESTÉTICO PROFESIONAL
 * =============================================================
 * 
 * Componente de tooltip card estético que explica el sistema de predicción de variabilidad
 * y proporciona recomendaciones específicas para optimizar la configuración de duraciones.
 * 
 * Características:
 * - Card tooltip profesional con HoverCard (similar a las citas)
 * - Gradientes y sombras estéticas
 * - Iconos descriptivos y códigos de color
 * - Recomendaciones formativas detalladas
 * - Animaciones suaves de aparición
 * - Multiidioma compatible
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

import React from 'react'
import { HelpCircle, CheckCircle, AlertTriangle, Clock, Lightbulb, TrendingUp, Activity } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface VariabilityTooltipProps {
  className?: string
}

export function VariabilityTooltip({ className = "w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" }: VariabilityTooltipProps) {
  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className={className}>
          <HelpCircle className="w-full h-full transition-colors hover:text-blue-500" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="p-0 bg-white rounded-lg shadow-xl border w-auto overflow-hidden"
        style={{
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          minWidth: "320px",
          maxWidth: "380px",
          animation: "tooltipAppear 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          zIndex: 999999
        }}
      >
        <style jsx global>{`
          @keyframes tooltipAppear {
            0% { 
              opacity: 0; 
              transform: translateY(8px) scale(0.95);
            }
            100% { 
              opacity: 1; 
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
        
        {/* Header con gradiente */}
        <div className="pt-4 pb-3 px-4 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-b">
          <div className="flex items-center space-x-2 mb-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="font-semibold text-sm text-gray-900">Predicción de Variabilidad</div>
          </div>
          <div className="text-xs text-gray-600">
            Análisis inteligente basado en datos reales de tratamientos
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-4 space-y-4">
          {/* Estados de variabilidad con iconos */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-700 mb-2 flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              Estados de Variabilidad
            </div>
            
            {/* Verde - Estable */}
            <div className="flex items-start space-x-3 p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-green-800">🟢 Estable</div>
                <div className="text-xs text-green-700 mt-0.5">
                  Diferencia &lt; 10% entre duración real y estimada
                </div>
              </div>
            </div>

            {/* Amarillo - Moderado */}
            <div className="flex items-start space-x-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-yellow-800">🟡 Moderado</div>
                <div className="text-xs text-yellow-700 mt-0.5">
                  Diferencia 10-25% o tiempo real ≈ duración cita
                </div>
              </div>
            </div>

            {/* Rojo - Variable */}
            <div className="flex items-start space-x-3 p-2 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-red-800">🔴 Variable</div>
                <div className="text-xs text-red-700 mt-0.5">
                  Diferencia &gt; 25% o tiempo real &gt; duración cita
                </div>
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200"></div>

          {/* Recomendación principal */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-blue-800 mb-1">💡 Recomendación Clave</div>
                <div className="text-xs text-blue-700 leading-relaxed">
                  La duración de cita debe incluir <strong>tiempo de preparación</strong> (5-10 min) 
                  además del tratamiento real para evitar retrasos y optimizar la experiencia del cliente.
                </div>
              </div>
            </div>
          </div>

          {/* Tips adicionales */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700 flex items-center">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full mr-2"></div>
              Tips de Optimización
            </div>
            <div className="space-y-1.5 ml-4">
              <div className="text-xs text-gray-600">
                • <strong>Verde:</strong> Configuración óptima, mantener
              </div>
              <div className="text-xs text-gray-600">
                • <strong>Amarillo:</strong> Revisar y ajustar gradualmente
              </div>
              <div className="text-xs text-gray-600">
                • <strong>Rojo:</strong> Requiere atención inmediata
              </div>
            </div>
          </div>
        </div>

        {/* Footer con nota técnica */}
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="text-xs text-gray-500 text-center">
            Basado en algoritmo Welford de análisis de datos reales
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
} 