/**
 * 🎯 ENERGY INSIGHTS - INDICADOR DE CERTEZA INTELIGENTE
 * ======================================================
 * 
 * Componente para mostrar certeza del sistema y contextual con:
 * - Indicadores visuales de certeza global y por insight
 * - Animaciones según estado de madurez del sistema
 * - Tooltips explicativos con factores de ajuste
 * - Controles de usuario para umbrales personalizables
 * 
 * 🤖 PREPARACIÓN PARA AGENTE IA:
 * - Visualización clara de metadatos de confianza
 * - Explicaciones de factores contextuales
 * - Feedback visual para aprendizaje del sistema
 * 
 * Variables críticas:
 * - confidence: Porcentaje de certeza (0-100)
 * - maturityLevel: Nivel de madurez del sistema
 * - contextualFactors: Factores que afectan la certeza
 * - showDetails: Mostrar información detallada
 * 
 * @see docs/CONFIDENCE_UI_COMPONENTS.md
 */

'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Settings,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  User,
  Wrench
} from 'lucide-react'
import { SystemMaturityLevel, type SystemConfidence, type ContextualConfidence } from '@/lib/energy/confidence-calculator'

// ============================================================================
// 🎯 INTERFACES DEL COMPONENTE
// ============================================================================

interface ConfidenceIndicatorProps {
  systemConfidence?: SystemConfidence
  contextualConfidence?: ContextualConfidence
  variant?: 'system' | 'insight' | 'compact'
  showDetails?: boolean
  onToggleDetails?: () => void
  className?: string
}

interface SystemConfidenceDashboardProps {
  confidence: SystemConfidence
  showControls?: boolean
  onThresholdChange?: (threshold: number) => void
}

interface ContextualConfidenceCardProps {
  confidence: ContextualConfidence
  insightId: string
  compact?: boolean
}

// ============================================================================
// 🎯 COMPONENTE PRINCIPAL - INDICADOR DE CERTEZA
// ============================================================================

export function ConfidenceIndicator({
  systemConfidence,
  contextualConfidence,
  variant = 'system',
  showDetails = false,
  onToggleDetails,
  className = ''
}: ConfidenceIndicatorProps) {
  
  if (variant === 'system' && systemConfidence) {
    return (
      <SystemConfidenceDashboard 
        confidence={systemConfidence}
        showControls={showDetails}
      />
    )
  }
  
  if (variant === 'insight' && contextualConfidence) {
    return (
      <ContextualConfidenceCard 
        confidence={contextualConfidence}
        insightId="current"
        compact={!showDetails}
      />
    )
  }
  
  if (variant === 'compact') {
    return (
      <CompactConfidenceIndicator 
        systemConfidence={systemConfidence}
        contextualConfidence={contextualConfidence}
        className={className}
      />
    )
  }
  
  return null
}

// ============================================================================
// 🎯 DASHBOARD DE CERTEZA DEL SISTEMA
// ============================================================================

function SystemConfidenceDashboard({ 
  confidence, 
  showControls = false 
}: SystemConfidenceDashboardProps) {
  
  const getMaturityIcon = (level: SystemMaturityLevel) => {
    switch (level) {
      case SystemMaturityLevel.LEARNING: return <Brain className="w-6 h-6 text-blue-500 animate-pulse" />
      case SystemMaturityLevel.TRAINING: return <BarChart3 className="w-6 h-6 text-orange-500 animate-bounce" />
      case SystemMaturityLevel.OPERATIONAL: return <CheckCircle className="w-6 h-6 text-green-500 animate-pulse" />
      case SystemMaturityLevel.MATURE: return <TrendingUp className="w-6 h-6 text-emerald-500" />
    }
  }
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (confidence >= 50) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 25) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-orange-600 bg-orange-50 border-orange-200'
  }
  
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-3">
            {getMaturityIcon(confidence.maturityLevel)}
            <div>
              <div className="text-lg font-bold">{confidence.systemStatus.title}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {confidence.systemStatus.subtitle}
              </div>
            </div>
          </CardTitle>
          
          <div className={`px-4 py-2 rounded-lg border-2 ${getConfidenceColor(confidence.globalConfidence)}`}>
            <div className="text-2xl font-bold">{confidence.globalConfidence}%</div>
            <div className="text-xs opacity-75">Certeza Global</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mensaje principal del sistema */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <p className="mb-2 text-sm font-medium text-blue-900">
            {confidence.systemStatus.message}
          </p>
          <p className="text-xs text-blue-700">
            {confidence.systemStatus.progress}
          </p>
          {confidence.systemStatus.estimatedTimeToNext && (
            <p className="mt-1 text-xs text-blue-600">
              Próximo nivel estimado: {confidence.systemStatus.estimatedTimeToNext}
            </p>
          )}
        </div>
        
        {/* Métricas de madurez */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-3 text-center bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {confidence.dataMaturity.matureProfiles}
            </div>
            <div className="text-xs text-gray-600">Perfiles Maduros</div>
            <div className="text-xs text-gray-500">
              de {confidence.dataMaturity.totalProfiles} totales
            </div>
          </div>
          
          <div className="p-3 text-center bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {confidence.dataMaturity.coveragePercentage}%
            </div>
            <div className="text-xs text-gray-600">Cobertura</div>
            <div className="text-xs text-gray-500">de servicios</div>
          </div>
          
          <div className="p-3 text-center bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {confidence.dataMaturity.avgSamplesPerProfile}
            </div>
            <div className="text-xs text-gray-600">Muestras</div>
            <div className="text-xs text-gray-500">promedio/perfil</div>
          </div>
          
          <div className="p-3 text-center bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(confidence.aiMetadata.improvementRate)}%
            </div>
            <div className="text-xs text-gray-600">Mejora</div>
            <div className="text-xs text-gray-500">semanal</div>
          </div>
        </div>
        
        {/* Progreso hacia siguiente nivel */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progreso hacia siguiente nivel</span>
            <span className="text-xs text-gray-500">
              {confidence.globalConfidence}% / {getNextLevelThreshold(confidence.maturityLevel)}%
            </span>
          </div>
          <Progress 
            value={getProgressToNextLevel(confidence.globalConfidence, confidence.maturityLevel)} 
            className="h-2"
          />
        </div>
        
        {/* Métricas de calidad */}
        {showControls && (
          <div className="pt-4 space-y-4 border-t">
            <h4 className="flex items-center text-sm font-semibold">
              <Settings className="mr-2 w-4 h-4" />
              Métricas de Calidad
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-2 text-center bg-blue-50 rounded cursor-help" title="Estabilidad de variabilidad en lecturas">
                <div className="text-lg font-bold text-blue-900">
                  {confidence.qualityMetrics.variabilityStability}
                </div>
                <div className="text-xs text-blue-700">Estabilidad</div>
              </div>
              
              <div className="p-2 text-center bg-green-50 rounded cursor-help" title="Cobertura de horarios de trabajo">
                <div className="text-lg font-bold text-green-900">
                  {confidence.qualityMetrics.temporalCoverage}
                </div>
                <div className="text-xs text-green-700">Temporal</div>
              </div>
              
              <div className="p-2 text-center bg-purple-50 rounded cursor-help" title="Distribución equitativa entre servicios">
                <div className="text-lg font-bold text-purple-900">
                  {confidence.qualityMetrics.serviceDistribution}
                </div>
                <div className="text-xs text-purple-700">Distribución</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 🎯 TARJETA DE CERTEZA CONTEXTUAL
// ============================================================================

function ContextualConfidenceCard({ 
  confidence, 
  insightId, 
  compact = false 
}: ContextualConfidenceCardProps) {
  
  const getConfidenceColor = (conf: number) => {
    if (conf >= 75) return 'bg-emerald-100 border-emerald-500 text-emerald-700'
    if (conf >= 50) return 'bg-green-100 border-green-500 text-green-700'
    if (conf >= 25) return 'bg-yellow-100 border-yellow-500 text-yellow-700'
    return 'bg-orange-100 border-orange-500 text-orange-700'
  }
  
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center px-2 py-1 rounded border-l-4 ${getConfidenceColor(confidence.adjustedConfidence)} cursor-help`}
        title={`Certeza: ${confidence.adjustedConfidence}% - ${confidence.adjustmentReason}`}
      >
        <Brain className="mr-1 w-3 h-3" />
        <span className="text-xs font-medium">
          {confidence.adjustedConfidence}%
        </span>
      </div>
    )
  }
  
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>Certeza del Análisis</span>
          </div>
          <Badge variant="outline" className={getConfidenceColor(confidence.adjustedConfidence)}>
            {confidence.adjustedConfidence}%
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Explicación del ajuste */}
        <div className="p-2 text-xs bg-blue-50 rounded border border-blue-200">
          <p className="mb-1 font-medium text-blue-900">Análisis contextual:</p>
          <p className="text-blue-700">{confidence.adjustmentReason}</p>
        </div>
        
        {/* Factores contextuales */}
        <div className="grid grid-cols-2 gap-2">
          <FactorIndicator 
            icon={<BarChart3 className="w-3 h-3" />}
            label="Datos"
            value={confidence.factors.dataAvailability}
          />
          <FactorIndicator 
            icon={<User className="w-3 h-3" />}
            label="Empleado"
            value={confidence.factors.employeeExperience}
          />
          <FactorIndicator 
            icon={<Clock className="w-3 h-3" />}
            label="Cliente"
            value={confidence.factors.clientHistory}
          />
          <FactorIndicator 
            icon={<Wrench className="w-3 h-3" />}
            label="Servicio"
            value={confidence.factors.serviceMaturity}
          />
        </div>
        
        {/* Factores de riesgo y fortaleza */}
        {(confidence.riskFactors.length > 0 || confidence.strengthFactors.length > 0) && (
          <div className="space-y-2">
            {confidence.riskFactors.length > 0 && (
              <div className="text-xs">
                <div className="flex items-center mb-1">
                  <AlertTriangle className="mr-1 w-3 h-3 text-orange-500" />
                  <span className="font-medium text-orange-700">Factores de riesgo:</span>
                </div>
                <ul className="ml-4 list-disc list-inside text-orange-600">
                  {confidence.riskFactors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {confidence.strengthFactors.length > 0 && (
              <div className="text-xs">
                <div className="flex items-center mb-1">
                  <CheckCircle className="mr-1 w-3 h-3 text-green-500" />
                  <span className="font-medium text-green-700">Factores de fortaleza:</span>
                </div>
                <ul className="ml-4 list-disc list-inside text-green-600">
                  {confidence.strengthFactors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 🎯 INDICADOR COMPACTO DE CERTEZA
// ============================================================================

function CompactConfidenceIndicator({ 
  systemConfidence, 
  contextualConfidence, 
  className 
}: {
  systemConfidence?: SystemConfidence
  contextualConfidence?: ContextualConfidence
  className?: string
}) {
  
  const confidence = contextualConfidence?.adjustedConfidence || systemConfidence?.globalConfidence || 0
  const level = systemConfidence?.maturityLevel || SystemMaturityLevel.LEARNING
  
  const getIcon = () => {
    if (confidence >= 75) return <CheckCircle className="w-4 h-4 text-emerald-500" />
    if (confidence >= 50) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (confidence >= 25) return <BarChart3 className="w-4 h-4 text-yellow-500" />
    return <Brain className="w-4 h-4 text-orange-500 animate-pulse" />
  }
  
  const getColor = () => {
    if (confidence >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (confidence >= 50) return 'text-green-700 bg-green-50 border-green-200'
    if (confidence >= 25) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-orange-700 bg-orange-50 border-orange-200'
  }
  
  const tooltipText = systemConfidence?.systemStatus.title + 
    (contextualConfidence ? ` - ${contextualConfidence.adjustmentReason}` : '')

  return (
    <div 
      className={`inline-flex items-center px-3 py-1 rounded-full border cursor-help ${getColor()} ${className}`}
      title={tooltipText}
    >
      {getIcon()}
      <span className="ml-2 text-sm font-medium">
        {confidence}% certeza
      </span>
    </div>
  )
}

// ============================================================================
// 🎯 COMPONENTE AUXILIAR - INDICADOR DE FACTOR
// ============================================================================

function FactorIndicator({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode
  label: string
  value: number 
}) {
  
  const getColor = (val: number) => {
    if (val >= 0.8) return 'text-emerald-600 bg-emerald-50'
    if (val >= 0.6) return 'text-green-600 bg-green-50'
    if (val >= 0.4) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }
  
  return (
    <div className={`p-2 text-center rounded ${getColor(value)}`}>
      <div className="flex justify-center items-center mb-1">
        {icon}
      </div>
      <div className="text-xs font-medium">{Math.round(value * 100)}%</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  )
}

// ============================================================================
// 🔧 FUNCIONES AUXILIARES
// ============================================================================

function getNextLevelThreshold(level: SystemMaturityLevel): number {
  switch (level) {
    case SystemMaturityLevel.LEARNING: return 25
    case SystemMaturityLevel.TRAINING: return 50
    case SystemMaturityLevel.OPERATIONAL: return 75
    case SystemMaturityLevel.MATURE: return 100
  }
}

function getProgressToNextLevel(confidence: number, level: SystemMaturityLevel): number {
  const current = confidence
  const next = getNextLevelThreshold(level)
  const previous = level === SystemMaturityLevel.LEARNING ? 0 :
                  level === SystemMaturityLevel.TRAINING ? 25 :
                  level === SystemMaturityLevel.OPERATIONAL ? 50 : 75
  
  if (current >= next) return 100
  
  return ((current - previous) / (next - previous)) * 100
} 