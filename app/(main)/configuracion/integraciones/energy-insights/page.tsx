"use client"

/**
 * 📊 ENERGY INSIGHTS - DASHBOARD REAL
 * ===================================
 * 
 * Dashboard de análisis energético basado únicamente en datos reales.
 * Muestra insights, anomalías y estadísticas reales sin datos simulados.
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 
 * Variables críticas para futuros desarrolladores:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - dateRange: Rango temporal de análisis
 * 
 * APIs consumidas:
 * - GET /api/internal/energy-insights/stats - KPIs principales reales
 * - GET /api/internal/energy-insights - Lista de insights
 * 
 * Precauciones:
 * - Verificar feature flag SHELLY antes de renderizar
 * - Solo mostrar datos reales de la base de datos
 * - No hardcodear valores ni simular datos
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  Target,
  Award,
  BarChart3,
  Activity,
  Eye,
  Download,
  RefreshCw,
  Building2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useIntegrationModules } from '@/hooks/use-integration-modules'
import { DateRange } from 'react-day-picker'
import { addDays, format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================================================
// TIPOS E INTERFACES (basados en APIs reales)
// ============================================================================

interface DashboardStats {
  insights: {
    total: number
    open: number
    resolved: number
    resolutionRate: number
  }
  anomaliesByType: Array<{type: string, count: number}>
  topProblematicServices: Array<{serviceName: string, anomalyCount: number, avgDeviation: number}>
  topProblematicClients: Array<{clientName: string, anomalyCount: number, avgDeviation: number}>
  topProblematicEmployees: Array<{employeeName: string, anomalyCount: number, avgTimeDeviation: number}>
  weeklyEvolution: Array<{week: string, anomalyCount: number, avgDeviation: number}>
  equipmentVariability: Array<{equipmentName: string, serviceName: string, avgKwhPerMin: number, stdDevKwhPerMin: number, variabilityPct: number, sampleCount: number}>
  confidenceDistribution: Array<{confidence: string, count: number}>
}

interface DeviceUsageInsight {
  id: string
  appointmentId: string
  insightType: string
  actualKwh: number
  expectedKwh: number
  deviationPct: number
  resolved: boolean
  detectedAt: string
  resolvedAt?: string
  detailJson: any
}

interface Clinic {
  id: string
  name: string
  address?: string
  isActive: boolean
  city?: string
  phone?: string
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function EnergyInsightsDashboard() {
  // Estados principales
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [insights, setInsights] = useState<DeviceUsageInsight[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filtros
  const [selectedClinic, setSelectedClinic] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  
  // Hooks
  const { data: session } = useSession()
  const { isShellyActive } = useIntegrationModules()

  // ============================================================================
  // FUNCIONES DE CARGA DE DATOS REALES
  // ============================================================================

  const fetchDashboardStats = useCallback(async () => {
    if (!session?.user?.systemId) return

    try {
      const params = new URLSearchParams()
      if (selectedClinic && selectedClinic !== 'all') params.append('clinicId', selectedClinic)
      if (dateRange?.from) params.append('dateFrom', dateRange.from.toISOString())
      if (dateRange?.to) params.append('dateTo', dateRange.to.toISOString())

      const response = await fetch(`/api/internal/energy-insights/stats?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      setDashboardStats(data.data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      toast.error(`Error cargando estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [session?.user?.systemId, selectedClinic, dateRange])

  const fetchInsights = useCallback(async () => {
    if (!session?.user?.systemId) return

    try {
      const params = new URLSearchParams()
      if (selectedClinic && selectedClinic !== 'all') params.append('clinicId', selectedClinic)
      if (dateRange?.from) params.append('from', dateRange.from.toISOString())
      if (dateRange?.to) params.append('to', dateRange.to.toISOString())

      const response = await fetch(`/api/internal/energy-insights?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      setInsights(data.insights || [])
    } catch (error) {
      console.error('Error fetching insights:', error)
      toast.error(`Error cargando insights: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [session?.user?.systemId, selectedClinic, dateRange])

  const fetchClinics = useCallback(async () => {
    if (!session?.user?.systemId) return

    try {
      const response = await fetch('/api/internal/energy-insights/clinics')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      setClinics(data.data.clinics || [])
    } catch (error) {
      console.error('Error fetching clinics:', error)
      toast.error(`Error cargando clínicas: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }, [session?.user?.systemId])

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    if (isShellyActive && session?.user?.systemId) {
      setLoading(true)
      Promise.all([
        fetchDashboardStats(),
        fetchInsights(),
        fetchClinics()
      ]).finally(() => setLoading(false))
    }
  }, [isShellyActive, session?.user?.systemId, fetchDashboardStats, fetchInsights, fetchClinics])

  // Efecto adicional para recargar datos cuando cambie la clínica seleccionada
  useEffect(() => {
    if (isShellyActive && session?.user?.systemId && selectedClinic) {
      Promise.all([
        fetchDashboardStats(),
        fetchInsights()
      ])
    }
  }, [selectedClinic, isShellyActive, session?.user?.systemId, fetchDashboardStats, fetchInsights])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchDashboardStats(),
      fetchInsights(),
      fetchClinics()
    ])
    setRefreshing(false)
    toast.success('Dashboard actualizado')
  }

  const handleResolveInsight = async (insightId: string) => {
    try {
      const response = await fetch('/api/internal/energy-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: insightId, resolved: true })
      })
      
      if (!response.ok) throw new Error('Error resolviendo insight')
      
      toast.success('Insight marcado como resuelto')
      await fetchInsights()
      await fetchDashboardStats()
    } catch (error) {
      console.error('Error resolving insight:', error)
      toast.error('Error resolviendo insight')
    }
  }

  const handleExportReport = () => {
    toast.info('Funcionalidad de exportación en desarrollo')
  }

  // ============================================================================
  // RENDERIZADO CONDICIONAL
  // ============================================================================

  if (!isShellyActive) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md text-center">
          <CardContent>
            <Zap className="mx-auto mb-4 w-16 h-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold">Módulo Shelly Inactivo</h3>
            <p className="text-muted-foreground">
              Activa el módulo de enchufes inteligentes para acceder al análisis energético.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="mb-2 w-64 h-8" />
            <Skeleton className="w-96 h-4" />
          </div>
          <Skeleton className="w-32 h-10" />
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-2 w-24 h-4" />
                <Skeleton className="mb-2 w-16 h-8" />
                <Skeleton className="w-32 h-3" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="w-48 h-6" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-64" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="p-6 mx-auto space-y-6 max-w-7xl">
      {/* Header del Dashboard */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            Energy Insights
          </h1>
          <p className="mt-1 text-muted-foreground">
            Análisis de eficiencia energética y detección de anomalías
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <CalendarDateRangePicker />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="mr-2 w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las clínicas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Todas las clínicas</span>
                  </div>
                </SelectItem>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    <div className="flex items-center space-x-2">
                      {clinic.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={clinic.isActive ? '' : 'text-muted-foreground'}>
                        {clinic.name}
                      </span>
                      {!clinic.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Badge variant="secondary" className="ml-auto">
            <Activity className="mr-1 w-3 h-3" />
            {dashboardStats ? `${dashboardStats.insights.total} insights detectados` : 'Cargando...'}
          </Badge>
        </div>
      </Card>

      {/* Navegación del Dashboard */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Anomalías</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Análisis</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            {/* KPIs Principales */}
            {dashboardStats && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="overflow-hidden relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Insights</p>
                        <p className="text-3xl font-bold">{dashboardStats.insights.total}</p>
                        <div className="flex items-center mt-1">
                          <Activity className="mr-1 w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-600">Detectados</span>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Anomalías Abiertas</p>
                        <p className="text-3xl font-bold text-orange-600">{dashboardStats.insights.open}</p>
                        <div className="flex items-center mt-1">
                          <AlertTriangle className="mr-1 w-4 h-4 text-orange-500" />
                          <span className="text-sm text-orange-600">Pendientes</span>
                        </div>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-full">
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                      </div>
                    </div>
                    <Progress value={(dashboardStats.insights.open / Math.max(dashboardStats.insights.total, 1)) * 100} className="mt-3" />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Resueltas</p>
                        <p className="text-3xl font-bold text-green-600">{dashboardStats.insights.resolved}</p>
                        <div className="flex items-center mt-1">
                          <CheckCircle className="mr-1 w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Completadas</span>
                        </div>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tasa de Resolución</p>
                        <p className="text-3xl font-bold text-purple-600">{Math.round(dashboardStats.insights.resolutionRate)}%</p>
                        <div className="flex items-center mt-1">
                          <Target className="mr-1 w-4 h-4 text-purple-500" />
                          <span className="text-sm text-purple-600">Eficiencia</span>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <Target className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Distribución por Tipo */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Tipos de Anomalías</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.anomaliesByType && dashboardStats.anomaliesByType.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardStats.anomaliesByType.map((anomaly) => (
                        <div key={anomaly.type} className="flex items-center space-x-4">
                          <Badge variant="outline" className="justify-center w-40">
                            {anomaly.type.replace('_', ' ')}
                          </Badge>
                          <div className="flex-1">
                            <Progress value={(anomaly.count / Math.max(dashboardStats.insights.total, 1)) * 100} className="h-2" />
                          </div>
                          <span className="w-12 text-sm font-medium text-right">{anomaly.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32 text-muted-foreground">
                      <AlertTriangle className="mr-2 w-8 h-8" />
                      <span>No se han detectado anomalías</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Evolución Semanal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.weeklyEvolution && dashboardStats.weeklyEvolution.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardStats.weeklyEvolution.slice(-6).map((week, index) => (
                        <div key={week.week} className="flex items-center space-x-4">
                          <div className="w-20 text-sm text-muted-foreground">
                            {format(new Date(week.week), 'dd MMM', { locale: es })}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{week.anomalyCount} anomalías</span>
                              <span className="text-sm text-muted-foreground">{week.avgDeviation.toFixed(1)}% desv.</span>
                            </div>
                            <Progress value={Math.min(100, (week.anomalyCount / 10) * 100)} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32 text-muted-foreground">
                      <Activity className="mr-2 w-8 h-8" />
                      <span>No hay datos suficientes para mostrar tendencias</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Lista de Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Anomalías Detectadas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.slice(0, 20).map((insight) => (
                      <div key={insight.id} className={`p-4 border rounded-lg ${insight.resolved ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={insight.resolved ? 'default' : 'destructive'}>
                              {insight.insightType.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(insight.detectedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {insight.resolved ? (
                              <Badge className="text-white bg-green-600">
                                <CheckCircle className="mr-1 w-3 h-3" />
                                Resuelto
                              </Badge>
                            ) : (
                              <Button size="sm" onClick={() => handleResolveInsight(insight.id)}>
                                <CheckCircle className="mr-1 w-4 h-4" />
                                Resolver
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Consumo Real</p>
                            <p className="font-medium">{insight.actualKwh.toFixed(3)} kWh</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Consumo Esperado</p>
                            <p className="font-medium">{insight.expectedKwh.toFixed(3)} kWh</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Desviación</p>
                            <p className={`font-medium ${insight.deviationPct > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {insight.deviationPct > 0 ? '+' : ''}{insight.deviationPct.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {insight.detailJson?.confidence && (
                          <div className="mt-2">
                            <Badge variant="outline">
                              Confianza: {insight.detailJson.confidence}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="mx-auto mb-2 w-12 h-12 opacity-50" />
                    <p>No hay anomalías detectadas</p>
                    <p className="mt-1 text-sm">El sistema está funcionando normalmente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Análisis de Servicios Problemáticos */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Servicios con Más Anomalías</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.topProblematicServices && dashboardStats.topProblematicServices.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardStats.topProblematicServices.map((service) => (
                        <div key={service.serviceName} className="p-3 rounded-lg border">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium">{service.serviceName}</p>
                            <Badge variant="outline">
                              {service.anomalyCount} anomalías
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>Desviación promedio:</span>
                            <span className="font-medium text-orange-600">{service.avgDeviation.toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(100, service.avgDeviation)} className="mt-2 h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Target className="mx-auto mb-2 w-12 h-12 opacity-50" />
                      <p>No hay datos de servicios disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Clientes con Anomalías</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats?.topProblematicClients && dashboardStats.topProblematicClients.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardStats.topProblematicClients.map((client) => (
                        <div key={client.clientName} className="p-3 rounded-lg border">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium">{client.clientName}</p>
                            <Badge variant="outline">
                              {client.anomalyCount} anomalías
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>Desviación promedio:</span>
                            <span className="font-medium text-orange-600">{client.avgDeviation.toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(100, client.avgDeviation)} className="mt-2 h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 w-12 h-12 opacity-50" />
                      <p>No hay datos de clientes disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Variabilidad de Equipos */}
            {dashboardStats?.equipmentVariability && dashboardStats.equipmentVariability.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Variabilidad por Equipo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardStats.equipmentVariability.slice(0, 8).map((equipment) => (
                      <div key={`${equipment.equipmentName}-${equipment.serviceName}`} className="p-3 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="font-medium">{equipment.equipmentName}</p>
                            <p className="text-sm text-muted-foreground">{equipment.serviceName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{equipment.variabilityPct}% variabilidad</p>
                            <p className="text-xs text-muted-foreground">{equipment.sampleCount} muestras</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>Consumo promedio:</span>
                            <span className="font-medium">{equipment.avgKwhPerMin.toFixed(4)} kWh/min</span>
                          </div>
                          <Progress 
                            value={Math.min(100, equipment.variabilityPct)} 
                            className={`h-2 ${
                              equipment.variabilityPct >= 30 ? 'bg-red-100' : 
                              equipment.variabilityPct >= 15 ? 'bg-yellow-100' : 'bg-green-100'
                            }`}
                          />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Consistente</span>
                            <span>Variable</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
} 