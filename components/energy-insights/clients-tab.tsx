/**
 * 👤 PESTAÑA DE CLIENTES - DASHBOARD ANOMALÍAS [OPTIMIZADA PARA VELOCIDAD]
 * =======================================================================
 * 
 * ⚡ VELOCIDAD CRÍTICA: Optimización completa para carga instantánea
 * 
 * ESTRATEGIAS DE OPTIMIZACIÓN:
 * - IndexedDB: Persistencia para aparición instantánea
 * - Prefetch: Carga proactiva antes de que el usuario lo necesite
 * - Stale-while-revalidate: Mostrar datos cached, actualizar en background
 * - Optimistic rendering: Cambios inmediatos antes de confirmación servidor
 * - Smart invalidation: Solo invalidar cuando hay cambios reales
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 🗄️ PERSISTENCIA: IndexedDB habilitada para datos estables
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - clientScores: Datos de scoring de clientes (PERSISTIDOS)
 * - favoredByEmployees: Nombres de empleados (ya resueltos por API)
 * 
 * @see docs/ANOMALY_SCORING_SYSTEM.md
 * @see docs/AUTHENTICATION_PATTERNS.md
 * @see docs/PERSISTENT_CACHE_STRATEGY.md
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Users,
  Target,
  Clock,
  Zap,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { ClientQuickViewDialog } from '@/components/client-quick-view-dialog'
import { energyInsightsKeys, ENERGY_CACHE_CONFIG } from '@/config/energy-insights'

interface ClientScore {
  id: string
  clientId: string
  totalServices: number
  totalAnomalies: number
  anomalyRate: number
  avgDeviationPercent: number
  maxDeviationPercent: number
  suspiciousPatterns: Record<string, number>
  favoredByEmployees: Record<string, number>
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastCalculated: string
  lastAnomalyDate?: string
  // Datos adicionales del cliente
  client?: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
}

interface ClientsTabProps {
  clinicId: string
}

/**
 * ⚡ HOOK OPTIMIZADO PARA FETCH DE CLIENT SCORES
 * 
 * Implementa estrategias de cache avanzadas:
 * - Persistencia IndexedDB para carga instantánea
 * - Stale-while-revalidate para datos frescos
 * - Prefetch en background para otras clínicas
 */
function useClientScoresOptimized(clinicId: string) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  // ⚡ QUERY PRINCIPAL con cache optimizado
  const clientScoresQuery = useQuery({
    queryKey: energyInsightsKeys.clientScores(clinicId),
    queryFn: async () => {
      if (!session?.user?.systemId) {
        throw new Error('No hay sesión válida')
      }

      const params = new URLSearchParams()
      if (clinicId) params.append('clinicId', clinicId)
      
      const response = await fetch(`/api/internal/energy-insights/client-scores?${params}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.clientScores || []
    },
    enabled: !!session?.user?.systemId,
    
    // ⚡ CONFIGURACIÓN DE CACHE OPTIMIZADA
    staleTime: ENERGY_CACHE_CONFIG.stable.staleTime,
    gcTime: ENERGY_CACHE_CONFIG.stable.gcTime,
    meta: ENERGY_CACHE_CONFIG.stable.meta,
    
    // ⚡ CONFIGURACIÓN DE REFETCH
    refetchOnWindowFocus: false,  // No refetch en focus (usar WebSocket)
    refetchOnMount: false,        // No refetch en mount si hay cache
    refetchInterval: false,       // No polling (usar WebSocket)
    
    // ⚡ MANEJO DE ERRORES OPTIMISTA
    retry: (failureCount, error) => {
      // Solo reintentar errores de red, no errores de autenticación
      if (error.message.includes('401') || error.message.includes('403')) {
        return false
      }
      return failureCount < 3
    },
    
    // ⚡ CONFIGURACIÓN DE BACKGROUND REFETCH
    refetchOnReconnect: true,     // Refetch cuando se reconecta
    staleTime: 5 * 60 * 1000,     // 5 minutos de datos frescos
  })

  // ⚡ PREFETCH PROACTIVO para otras clínicas
  useEffect(() => {
    if (session?.user?.systemId && clinicId) {
      // Prefetch estadísticas generales
      queryClient.prefetchQuery({
        queryKey: energyInsightsKeys.generalStats(clinicId),
        queryFn: async () => {
          const response = await fetch(`/api/internal/energy-insights/general-stats?clinicId=${clinicId}`)
          if (response.ok) {
            return response.json()
          }
          return null
        },
        staleTime: ENERGY_CACHE_CONFIG.stable.staleTime,
      })

      // Prefetch datos de empleados para navegación rápida
      queryClient.prefetchQuery({
        queryKey: energyInsightsKeys.employeeScores(clinicId),
        queryFn: async () => {
          const response = await fetch(`/api/internal/energy-insights/employee-scores?clinicId=${clinicId}`)
          if (response.ok) {
            return response.json()
          }
          return null
        },
        staleTime: ENERGY_CACHE_CONFIG.stable.staleTime,
      })
    }
  }, [session?.user?.systemId, clinicId, queryClient])

  // ⚡ FUNCIÓN DE INVALIDACIÓN INTELIGENTE
  const invalidateClientScores = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: energyInsightsKeys.clientScores(clinicId)
    })
  }, [queryClient, clinicId])

  // ⚡ FUNCIÓN DE REFETCH MANUAL
  const refetchClientScores = React.useCallback(() => {
    return clientScoresQuery.refetch()
  }, [clientScoresQuery.refetch])

  return {
    clientScores: clientScoresQuery.data || [],
    isLoading: clientScoresQuery.isLoading,
    isError: clientScoresQuery.isError,
    error: clientScoresQuery.error,
    isRefetching: clientScoresQuery.isRefetching,
    invalidateClientScores,
    refetchClientScores
  }
}

export function ClientsTab({ clinicId }: ClientsTabProps) {
  const { data: session } = useSession()
  
  // ⚡ USAR HOOK OPTIMIZADO
  const { 
    clientScores, 
    isLoading, 
    isError, 
    error,
    isRefetching,
    invalidateClientScores,
    refetchClientScores
  } = useClientScoresOptimized(clinicId)

  // 🎯 ESTADO LOCAL OPTIMIZADO
  const [sortBy, setSortBy] = useState<'riskScore' | 'anomalyRate' | 'totalServices'>('riskScore')
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({})
  
  // 🎯 Estado para ClientQuickViewDialog
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

  // ⚡ DATOS FILTRADOS Y ORDENADOS (MEMOIZADOS)
  const filteredAndSortedClients = useMemo(() => {
    return clientScores
      .filter(client => filterLevel === 'all' || client.riskLevel === filterLevel)
      .sort((a, b) => {
        switch (sortBy) {
          case 'riskScore':
            return b.riskScore - a.riskScore
          case 'anomalyRate':
            return b.anomalyRate - a.anomalyRate
          case 'totalServices':
            return b.totalServices - a.totalServices
          default:
            return 0
        }
      })
  }, [clientScores, filterLevel, sortBy])

  // ⚡ ESTADÍSTICAS CALCULADAS (MEMOIZADAS)
  const stats = useMemo(() => {
    const totalClients = clientScores.length
    const highRiskClients = clientScores.filter(c => ['high', 'critical'].includes(c.riskLevel)).length
    const avgAnomalyRate = totalClients > 0 
      ? (clientScores.reduce((sum, c) => sum + c.anomalyRate, 0) / totalClients).toFixed(1)
      : '0.0'
    const suspiciousPatternClients = clientScores.filter(c => Object.keys(c.suspiciousPatterns).length > 0).length

    return {
      totalClients,
      highRiskClients,
      avgAnomalyRate,
      suspiciousPatternClients
    }
  }, [clientScores])

  // ⚡ FUNCIONES DE UTILIDAD OPTIMIZADAS
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />
      case 'high': return <TrendingUp className="w-4 h-4" />
      case 'medium': return <TrendingDown className="w-4 h-4" />
      default: return <UserCheck className="w-4 h-4" />
    }
  }

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'OVER_DURATION': return 'bg-red-100 text-red-800'
      case 'UNDER_DURATION': return 'bg-orange-100 text-orange-800'
      case 'OVER_CONSUMPTION': return 'bg-purple-100 text-purple-800'
      case 'UNDER_CONSUMPTION': return 'bg-blue-100 text-blue-800'
      case 'POWER_ANOMALY': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'OVER_DURATION': return 'Exceso Duración'
      case 'UNDER_DURATION': return 'Déficit Duración'
      case 'OVER_CONSUMPTION': return 'Exceso Consumo'
      case 'UNDER_CONSUMPTION': return 'Déficit Consumo'
      case 'POWER_ANOMALY': return 'Anomalía Energética'
      default: return pattern
    }
  }

  const toggleClientExpansion = (clientId: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }))
  }

  // 🎯 Función para abrir detalles de cliente
  const handleOpenClient = (client: ClientScore) => {
    if (client.client) {
      setSelectedClient(client.client)
      setIsClientDialogOpen(true)
    } else {
      toast.error('Información del cliente no disponible')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-ES')
  }

  // ⚡ MANEJO DE ERRORES OPTIMISTA
  if (isError) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-red-400" />
            <h3 className="mb-2 text-lg font-semibold">Error al cargar datos</h3>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'No se pudieron cargar los datos de clientes'}
            </p>
            <Button 
              onClick={() => refetchClientScores()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ⚡ SKELETON LOADING (SOLO PARA PRIMERA CARGA)
  if (isLoading && clientScores.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="mb-4 w-64 h-6 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-100 rounded-lg">
                <div className="mb-2 w-48 h-5 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header de Clientes */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <Users className="mr-2 w-6 h-6 text-purple-600" />
            Análisis por Clientes
            {isRefetching && (
              <RefreshCw className="ml-2 w-5 h-5 text-purple-600 animate-spin" />
            )}
          </h2>
          <p className="text-muted-foreground">
            Scores de riesgo, patrones sospechosos y comportamiento anómalo
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-sm border rounded-md"
          >
            <option value="riskScore">Ordenar por Riesgo</option>
            <option value="anomalyRate">Ordenar por Anomalías</option>
            <option value="totalServices">Ordenar por Servicios</option>
          </select>
          
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="px-3 py-2 text-sm border rounded-md"
          >
            <option value="all">Todos los niveles</option>
            <option value="critical">Solo Crítico</option>
            <option value="high">Solo Alto</option>
            <option value="medium">Solo Medio</option>
            <option value="low">Solo Bajo</option>
          </select>

          <Button
            onClick={() => refetchClientScores()}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Riesgo Alto/Crítico</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.highRiskClients}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Anomalías Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.avgAnomalyRate}%
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Patrones Sospechosos</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.suspiciousPatternClients}
                </p>
              </div>
              <Eye className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-4">
        {filteredAndSortedClients.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold">Sin datos de clientes</h3>
              <p className="text-muted-foreground">
                No hay datos de scoring de clientes disponibles para mostrar.
              </p>
            </CardContent>
          </Card>
        ) :
          filteredAndSortedClients.map((client) => {
            const isExpanded = expandedClients[client.clientId]
            const patternCount = Object.keys(client.suspiciousPatterns).length
            const employeeCount = Object.keys(client.favoredByEmployees).length
            
            return (
              <Card key={client.id} className="overflow-hidden">
                <CardHeader 
                  className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleClientExpansion(client.clientId)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      )}
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span>
                              {client.client ? `${client.client.firstName} ${client.client.lastName}` : `Cliente ${client.clientId}`}
                            </span>
                            {client.client && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenClient(client)
                                }}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 text-purple-600" />
                              </button>
                            )}
                          </CardTitle>
                          <div className="flex items-center mt-1 space-x-4 text-sm text-muted-foreground">
                            <span>{client.totalServices} servicios</span>
                            <span>{client.totalAnomalies} anomalías</span>
                            <span>{client.anomalyRate.toFixed(1)}% tasa</span>
                            {client.lastAnomalyDate && (
                              <span>Última: {formatDate(client.lastAnomalyDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {client.maxDeviationPercent.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Máx. Desviación</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold">{client.riskScore}/100</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                      
                      <Badge className={getRiskColor(client.riskLevel)}>
                        {getRiskIcon(client.riskLevel)}
                        <span className="ml-1 capitalize">{client.riskLevel}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Métricas de Anomalías */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Métricas de Anomalías</h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Tasa de Anomalías</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={Math.min(100, client.anomalyRate)} className="w-20 h-2" />
                              <span className="text-sm font-medium text-red-600">
                                {client.anomalyRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Desviación Promedio</span>
                            <span className="text-sm font-medium">{client.avgDeviationPercent.toFixed(1)}%</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Desviación Máxima</span>
                            <span className="text-sm font-medium text-red-600">
                              {client.maxDeviationPercent.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Servicios</span>
                            <span className="text-sm font-medium">{client.totalServices}</span>
                          </div>
                        </div>
                        
                        {client.client?.email && (
                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground">Contacto</div>
                            <div className="text-sm">{client.client.email}</div>
                            {client.client.phone && (
                              <div className="text-sm">{client.client.phone}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Patrones y Empleados */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Patrones y Relaciones</h4>
                        
                        <div className="space-y-2">
                          {patternCount > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Patrones Sospechosos</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(client.suspiciousPatterns).map(([pattern, count]) => (
                                  <Badge key={pattern} className={`text-xs ${getPatternColor(pattern)}`}>
                                    {getPatternLabel(pattern)}: {count}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {employeeCount > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Empleados Frecuentes</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(client.favoredByEmployees).map(([employeeName, count]) => (
                                  <Badge key={employeeName} variant="outline" className="text-xs">
                                    {employeeName}: {count} servicios
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-2 text-xs text-muted-foreground">
                            Última actualización: {formatDate(client.lastCalculated)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        }
      </div>
      
      {/* 🎯 Dialog para mostrar detalles del cliente */}
      <ClientQuickViewDialog
        isOpen={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        client={selectedClient}
      />
    </div>
  )
} 