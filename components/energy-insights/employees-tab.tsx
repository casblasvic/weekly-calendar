/**
 * 👨‍⚕️ PESTAÑA DE EMPLEADOS - DASHBOARD ANOMALÍAS [OPTIMIZADA PARA VELOCIDAD]
 * =========================================================================
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
 * - employeeScores: Datos de scoring de empleados (PERSISTIDOS)
 * - favoredClients: Nombres de clientes (ya resueltos por API)
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
  Award,
  Target,
  Clock,
  Users,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { ClientQuickViewDialog } from '@/components/client-quick-view-dialog'
import { energyInsightsKeys, ENERGY_CACHE_CONFIG } from '@/config/energy-insights'

interface EmployeeScore {
  id: string
  employeeId: string
  totalServices: number
  totalAnomalies: number
  anomalyRate: number
  avgEfficiency: number
  consistencyScore: number
  favoredClients: Record<string, number>
  fraudIndicators: Record<string, boolean>
  timePatterns: Record<string, number>
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastCalculated: string
  // Datos adicionales del empleado
  employee?: {
    firstName: string
    lastName: string
    email?: string
  }
}

interface EmployeesTabProps {
  clinicId: string
}

/**
 * ⚡ HOOK OPTIMIZADO PARA FETCH DE EMPLOYEE SCORES
 * 
 * Implementa estrategias de cache avanzadas:
 * - Persistencia IndexedDB para carga instantánea
 * - Stale-while-revalidate para datos frescos
 * - Prefetch en background para datos relacionados
 */
function useEmployeeScoresOptimized(clinicId: string) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  // ⚡ QUERY PRINCIPAL con cache optimizado
  const employeeScoresQuery = useQuery({
    queryKey: energyInsightsKeys.employeeScores(clinicId),
    queryFn: async () => {
      if (!session?.user?.systemId) {
        throw new Error('No hay sesión válida')
      }

      const params = new URLSearchParams()
      if (clinicId) params.append('clinicId', clinicId)
      
      const response = await fetch(`/api/internal/energy-insights/employee-scores?${params}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.employeeScores || []
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
  })

  // ⚡ PREFETCH PROACTIVO para datos relacionados
  useEffect(() => {
    if (session?.user?.systemId && clinicId) {
      // Prefetch datos de clientes para navegación rápida
      queryClient.prefetchQuery({
        queryKey: energyInsightsKeys.clientScores(clinicId),
        queryFn: async () => {
          const response = await fetch(`/api/internal/energy-insights/client-scores?clinicId=${clinicId}`)
          if (response.ok) {
            return response.json()
          }
          return null
        },
        staleTime: ENERGY_CACHE_CONFIG.stable.staleTime,
      })

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

      // Prefetch datos de servicios para navegación rápida
      queryClient.prefetchQuery({
        queryKey: energyInsightsKeys.serviceVariability(clinicId),
        queryFn: async () => {
          const response = await fetch(`/api/internal/energy-insights/service-variability?clinicId=${clinicId}`)
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
  const invalidateEmployeeScores = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: energyInsightsKeys.employeeScores(clinicId)
    })
  }, [queryClient, clinicId])

  // ⚡ FUNCIÓN DE REFETCH MANUAL
  const refetchEmployeeScores = React.useCallback(() => {
    return employeeScoresQuery.refetch()
  }, [employeeScoresQuery])

  return {
    employeeScores: employeeScoresQuery.data || [],
    isLoading: employeeScoresQuery.isLoading,
    isError: employeeScoresQuery.isError,
    error: employeeScoresQuery.error,
    isRefetching: employeeScoresQuery.isRefetching,
    invalidateEmployeeScores,
    refetchEmployeeScores
  }
}

export function EmployeesTab({ clinicId }: EmployeesTabProps) {
  const { data: session } = useSession()
  
  // ⚡ USAR HOOK OPTIMIZADO
  const { 
    employeeScores, 
    isLoading, 
    isError, 
    error,
    isRefetching,
    invalidateEmployeeScores,
    refetchEmployeeScores
  } = useEmployeeScoresOptimized(clinicId)

  // 🎯 ESTADO LOCAL OPTIMIZADO
  const [sortBy, setSortBy] = useState<'riskScore' | 'anomalyRate' | 'efficiency'>('riskScore')
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({})
  
  // 🎯 Estado para ClientQuickViewDialog
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

  // ⚡ DATOS FILTRADOS Y ORDENADOS (MEMOIZADOS)
  const filteredAndSortedEmployees = useMemo(() => {
    return employeeScores
      .filter(employee => filterLevel === 'all' || employee.riskLevel === filterLevel)
      .sort((a, b) => {
        switch (sortBy) {
          case 'riskScore':
            return b.riskScore - a.riskScore
          case 'anomalyRate':
            return b.anomalyRate - a.anomalyRate
          case 'efficiency':
            return b.avgEfficiency - a.avgEfficiency
          default:
            return 0
        }
      })
  }, [employeeScores, filterLevel, sortBy])

  // ⚡ ESTADÍSTICAS CALCULADAS (MEMOIZADAS)
  const stats = useMemo(() => {
    const totalEmployees = employeeScores.length
    const highRiskEmployees = employeeScores.filter(e => ['high', 'critical'].includes(e.riskLevel)).length
    const avgEfficiency = totalEmployees > 0 
      ? (employeeScores.reduce((sum, e) => sum + e.avgEfficiency, 0) / totalEmployees).toFixed(1)
      : '0.0'
    const fraudIndicatorEmployees = employeeScores.filter(e => 
      Object.values(e.fraudIndicators).some(indicator => indicator)
    ).length

    return {
      totalEmployees,
      highRiskEmployees,
      avgEfficiency,
      fraudIndicatorEmployees
    }
  }, [employeeScores])

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
      default: return <Award className="w-4 h-4" />
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600'
    if (efficiency >= 80) return 'text-yellow-600'
    if (efficiency >= 70) return 'text-orange-500'
    return 'text-red-600'
  }

  const toggleEmployeeExpansion = (employeeId: string) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }))
  }

  // 🎯 Función para abrir el dialog de cliente
  const handleOpenClient = (clientName: string) => {
    // Buscar el cliente por nombre en la base de datos
    // Por ahora, creamos un objeto básico con el nombre
    const clientData = {
      id: `client-${clientName}`,
      firstName: clientName.split(' ')[0] || clientName,
      lastName: clientName.split(' ').slice(1).join(' ') || '',
      email: null,
      phone: null
    }
    
    setSelectedClient(clientData)
    setIsClientDialogOpen(true)
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
              {error?.message || 'No se pudieron cargar los datos de empleados'}
            </p>
            <Button 
              onClick={() => refetchEmployeeScores()}
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
  if (isLoading && employeeScores.length === 0) {
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
      {/* Header de Empleados */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <Users className="mr-2 w-6 h-6 text-purple-600" />
            Análisis por Empleados
            {isRefetching && (
              <RefreshCw className="ml-2 w-5 h-5 text-purple-600 animate-spin" />
            )}
          </h2>
          <p className="text-muted-foreground">
            Scores de riesgo, eficiencia y patrones de comportamiento
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
            <option value="efficiency">Ordenar por Eficiencia</option>
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
            onClick={() => refetchEmployeeScores()}
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
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
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
                  {stats.highRiskEmployees}
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
                <p className="text-sm text-muted-foreground">Eficiencia Promedio</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.avgEfficiency}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Indicadores Riesgo</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.fraudIndicatorEmployees}
                </p>
              </div>
              <Eye className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Empleados */}
      <div className="space-y-4">
        {filteredAndSortedEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold">Sin datos de empleados</h3>
              <p className="text-muted-foreground">
                No hay datos de scoring de empleados disponibles para mostrar.
              </p>
            </CardContent>
          </Card>
        ) :
          filteredAndSortedEmployees.map((employee) => {
            const isExpanded = expandedEmployees[employee.employeeId]
            const clientCount = Object.keys(employee.favoredClients).length
            const fraudIndicatorCount = Object.values(employee.fraudIndicators).filter(Boolean).length
            
            return (
              <Card key={employee.id} className="overflow-hidden">
                <CardHeader 
                  className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleEmployeeExpansion(employee.employeeId)}
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
                          <CardTitle className="text-lg">
                            {employee.employee 
                              ? `${employee.employee.firstName} ${employee.employee.lastName}` 
                              : `Empleado ${employee.employeeId}`
                            }
                          </CardTitle>
                          <div className="flex items-center mt-1 space-x-4 text-sm text-muted-foreground">
                            <span>{employee.totalServices} servicios</span>
                            <span>{employee.totalAnomalies} anomalías</span>
                            <span>{employee.anomalyRate.toFixed(1)}% tasa</span>
                            <span className={getEfficiencyColor(employee.avgEfficiency)}>
                              {employee.avgEfficiency.toFixed(1)}% eficiencia
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getEfficiencyColor(employee.avgEfficiency)}`}>
                          {employee.avgEfficiency.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Eficiencia</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold">{employee.riskScore}/100</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                      
                      <Badge className={getRiskColor(employee.riskLevel)}>
                        {getRiskIcon(employee.riskLevel)}
                        <span className="ml-1 capitalize">{employee.riskLevel}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Métricas de Rendimiento */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Métricas de Rendimiento</h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Eficiencia Promedio</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={employee.avgEfficiency} className="w-20 h-2" />
                              <span className={`text-sm font-medium ${getEfficiencyColor(employee.avgEfficiency)}`}>
                                {employee.avgEfficiency.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Consistencia</span>
                            <span className="text-sm font-medium">{employee.consistencyScore.toFixed(1)}%</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Tasa de Anomalías</span>
                            <span className="text-sm font-medium text-red-600">
                              {employee.anomalyRate.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Servicios</span>
                            <span className="text-sm font-medium">{employee.totalServices}</span>
                          </div>
                        </div>
                        
                        {employee.employee?.email && (
                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground">Contacto</div>
                            <div className="text-sm">{employee.employee.email}</div>
                          </div>
                        )}
                      </div>

                      {/* Clientes y Patrones */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Clientes y Patrones</h4>
                        
                        <div className="space-y-2">
                          {clientCount > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Clientes Frecuentes</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(employee.favoredClients).map(([clientName, count]) => (
                                  <div key={clientName} className="flex items-center">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs mr-1"
                                    >
                                      {clientName}: {Number(count)}
                                    </Badge>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenClient(clientName)
                                      }}
                                      className="p-1 hover:bg-purple-100 rounded transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3 text-purple-600" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {fraudIndicatorCount > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Indicadores de Riesgo</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(employee.fraudIndicators)
                                  .filter(([_, value]) => value)
                                  .map(([indicator, _]) => (
                                    <Badge key={indicator} variant="destructive" className="text-xs">
                                      {indicator}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-sm text-muted-foreground">Patrones Temporales</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(employee.timePatterns).map(([period, count]) => (
                                <Badge key={period} variant="secondary" className="text-xs">
                                  {period}: {Number(count)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-2 text-xs text-muted-foreground">
                            Última actualización: {formatDate(employee.lastCalculated)}
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