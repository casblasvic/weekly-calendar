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
  XCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Briefcase,
  Clock,
  ExternalLink,
  Info,
  Lightbulb,
  Settings
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
  // 🆕 NUEVOS CAMPOS PARA ANÁLISIS INTELIGENTE
  appointment?: {
    id: string
    startTime: string
    endTime: string
    durationMinutes: number
    person?: {
      id: string
      firstName: string
      lastName: string
      email?: string
    }
    professionalUser?: {
      id: string
      firstName: string
      lastName: string
    }
    clinic?: {
      id: string
      name: string
    }
    appointmentServices?: Array<{
      id: string
      service: {
        id: string
        name: string
        durationMinutes: number
      }
    }>
    services?: Array<{
      id: string
      service: {
        id: string
        name: string
        durationMinutes: number
      }
    }>
    actualUsageMinutes?: number
  }
  // 🆕 ANÁLISIS DE PATRONES
  clientPatternAnalysis?: {
    totalAppointments: number
    anomalyCount: number
    anomalyRate: number
    mostCommonAnomalyType: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  employeePatternAnalysis?: {
    totalAppointments: number
    anomalyCount: number
    anomalyRate: number
    avgEfficiency: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  // 🆕 RECOMENDACIONES INTELIGENTES
  recommendations?: Array<{
    type: 'review_appointment' | 'check_equipment' | 'monitor_client' | 'train_employee' | 'investigate_fraud'
    priority: 'low' | 'medium' | 'high' | 'critical'
    message: string
    actionRequired: boolean
  }>
  // 🆕 SEVERIDAD CALCULADA
  severity: 'low' | 'medium' | 'high' | 'critical'
  severityColor: string
}

interface Clinic {
  id: string
  name: string
  isActive: boolean
}

// 🆕 NUEVAS INTERFACES PARA FILTROS AVANZADOS
interface FilterOptions {
  employees: Array<{
    id: string
    firstName: string
    lastName: string
    appointmentCount: number
  }>
  clients: Array<{
    id: string
    firstName: string
    lastName: string
    anomalyCount: number
  }>
  services: Array<{
    id: string
    name: string
    appointmentCount: number
  }>
}

interface AdvancedFilters {
  clinicId: string
  employeeIds: string[]
  clientIds: string[]
  serviceIds: string[]
  resolutionStatus: 'all' | 'pending' | 'resolved'
  severityLevels: string[]
  anomalyTypes: string[]
  dateFrom?: Date
  dateTo?: Date
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
  
  // Filtros básicos
  const [selectedClinic, setSelectedClinic] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  
  // 🆕 FILTROS AVANZADOS
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    employees: [],
    clients: [],
    services: []
  })
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    clinicId: 'all',
    employeeIds: [],
    clientIds: [],
    serviceIds: [],
    resolutionStatus: 'all',
    severityLevels: [],
    anomalyTypes: []
  })
  
  // 🆕 ESTADOS PARA DETALLES EXPANDIBLES Y SELECCIÓN MÚLTIPLE
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set())
  const [selectedInsights, setSelectedInsights] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  
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
      
      // Filtros básicos
      if (advancedFilters.clinicId !== 'all') {
        params.append('clinicId', advancedFilters.clinicId)
      }
      
      if (dateRange?.from) {
        params.append('from', dateRange.from.toISOString())
      }
      
      if (dateRange?.to) {
        params.append('to', dateRange.to.toISOString())
      }
      
      // 🆕 FILTROS AVANZADOS
      if (advancedFilters.employeeIds.length > 0) {
        params.append('employeeIds', advancedFilters.employeeIds.join(','))
      }
      
      if (advancedFilters.clientIds.length > 0) {
        params.append('clientIds', advancedFilters.clientIds.join(','))
      }
      
      if (advancedFilters.serviceIds.length > 0) {
        params.append('serviceIds', advancedFilters.serviceIds.join(','))
      }
      
      if (advancedFilters.resolutionStatus !== 'all') {
        params.append('resolved', advancedFilters.resolutionStatus === 'resolved' ? 'true' : 'false')
      }
      
      if (advancedFilters.severityLevels.length > 0) {
        params.append('severityLevels', advancedFilters.severityLevels.join(','))
      }
      
      if (advancedFilters.anomalyTypes.length > 0) {
        params.append('anomalyTypes', advancedFilters.anomalyTypes.join(','))
      }
      
      // Incluir análisis inteligente
      params.append('includeAnalysis', 'true')

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
  }, [session?.user?.systemId, advancedFilters, dateRange])

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

  // Efecto adicional para recargar datos cuando cambien los filtros
  useEffect(() => {
    if (isShellyActive && session?.user?.systemId) {
      Promise.all([
        fetchDashboardStats(),
        fetchInsights()
      ])
    }
  }, [advancedFilters, dateRange, isShellyActive, session?.user?.systemId, fetchDashboardStats, fetchInsights])

  // ============================================================================
  // HANDLERS Y FUNCIONES AVANZADAS
  // ============================================================================

  // 🆕 FUNCIONES PARA FILTROS AVANZADOS Y ANÁLISIS INTELIGENTE
  const loadFilterOptions = useCallback(async () => {
    if (!session?.user?.systemId) return
    
    try {
      const params = new URLSearchParams({
        systemId: session.user.systemId
      })
      
      if (selectedClinic !== 'all') {
        params.append('clinicId', selectedClinic)
      }
      
      const response = await fetch(`/api/internal/energy-insights/filter-options?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(data)
      }
    } catch (error) {
      console.error('Error cargando opciones de filtros:', error)
    }
  }, [session?.user?.systemId, selectedClinic])

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

  // 🆕 Efecto para cargar opciones de filtros
  useEffect(() => {
    if (isShellyActive && session?.user?.systemId) {
      loadFilterOptions()
    }
  }, [isShellyActive, session?.user?.systemId, selectedClinic, loadFilterOptions])

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev)
      if (newSet.has(insightId)) {
        newSet.delete(insightId)
      } else {
        newSet.add(insightId)
      }
      return newSet
    })
  }

  const toggleInsightSelection = (insightId: string) => {
    setSelectedInsights(prev => {
      const newSet = new Set(prev)
      if (newSet.has(insightId)) {
        newSet.delete(insightId)
      } else {
        newSet.add(insightId)
      }
      return newSet
    })
  }

  const selectAllInsights = () => {
    const unresolvedInsights = insights.filter(insight => !insight.resolved).map(insight => insight.id)
    setSelectedInsights(new Set(unresolvedInsights))
  }

  const clearSelection = () => {
    setSelectedInsights(new Set())
  }

  const handleBulkResolve = async () => {
    if (selectedInsights.size === 0) return

    try {
      setRefreshing(true)
      
      // Resolver todas las anomalías seleccionadas
      const promises = Array.from(selectedInsights).map(insightId =>
        fetch('/api/internal/energy-insights', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: insightId, 
            resolved: true,
            notes: 'Resuelto en lote'
          })
        })
      )

      await Promise.all(promises)
      
      // Limpiar selección y recargar datos
      setSelectedInsights(new Set())
      await fetchInsights()
      await fetchDashboardStats()
      
      toast.success(`${selectedInsights.size} anomalías marcadas como resueltas`)
      
    } catch (error) {
      console.error('Error resolviendo anomalías en lote:', error)
      toast.error('Error al resolver anomalías en lote')
    } finally {
      setRefreshing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700'
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-700'
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700'
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-700'
      default: return 'bg-gray-100 border-gray-500 text-gray-700'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <Eye className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const navigateToAppointment = (appointmentId: string, startTime: string) => {
    // Navegar a la agenda en la fecha de la cita
    const appointmentDate = new Date(startTime)
    const dateString = format(appointmentDate, 'yyyy-MM-dd')
    
    // Abrir en nueva pestaña la agenda en esa fecha
    window.open(`/agenda?date=${dateString}&appointmentId=${appointmentId}`, '_blank')
    toast.success('Navegando a la cita en la agenda')
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

      {/* Filtros Unificados - Diseño Compacto y Profesional */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Fila principal de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Selector de Clínicas */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                <Building2 className="w-3 h-3 inline mr-1" />
                Clínica
              </label>
              <Select 
                value={selectedClinic} 
                onValueChange={(value) => {
                  setSelectedClinic(value)
                  setAdvancedFilters(prev => ({ ...prev, clinicId: value }))
                }}
              >
                <SelectTrigger className="h-9">
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

            {/* Filtro por Empleados */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                <User className="w-3 h-3 inline mr-1" />
                Empleado
              </label>
              <Select
                value={advancedFilters.employeeIds.length > 0 ? advancedFilters.employeeIds[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setAdvancedFilters(prev => ({ ...prev, employeeIds: [] }))
                  } else {
                    setAdvancedFilters(prev => ({ ...prev, employeeIds: [value] }))
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {filterOptions.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{employee.firstName} {employee.lastName}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {employee.appointmentCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Clientes */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                <Users className="w-3 h-3 inline mr-1" />
                Cliente
              </label>
              <Select
                value={advancedFilters.clientIds.length > 0 ? advancedFilters.clientIds[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setAdvancedFilters(prev => ({ ...prev, clientIds: [] }))
                  } else {
                    setAdvancedFilters(prev => ({ ...prev, clientIds: [value] }))
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {filterOptions.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{client.firstName} {client.lastName}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {client.anomalyCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Servicios */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                <Briefcase className="w-3 h-3 inline mr-1" />
                Servicio
              </label>
              <Select
                value={advancedFilters.serviceIds.length > 0 ? advancedFilters.serviceIds[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setAdvancedFilters(prev => ({ ...prev, serviceIds: [] }))
                  } else {
                    setAdvancedFilters(prev => ({ ...prev, serviceIds: [value] }))
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {filterOptions.services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{service.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {service.appointmentCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Estado
              </label>
              <Select
                value={advancedFilters.resolutionStatus}
                onValueChange={(value) => {
                  setAdvancedFilters(prev => ({ ...prev, resolutionStatus: value as any }))
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="resolved">Resueltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Indicadores de filtros activos y estadísticas */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-4">
              {/* Indicadores de filtros activos */}
              {(advancedFilters.employeeIds.length > 0 || 
                advancedFilters.clientIds.length > 0 || 
                advancedFilters.serviceIds.length > 0 || 
                advancedFilters.resolutionStatus !== 'all') && (
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-600 font-medium">Filtros activos</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setAdvancedFilters({
                        clinicId: selectedClinic,
                        employeeIds: [],
                        clientIds: [],
                        serviceIds: [],
                        resolutionStatus: 'all',
                        severityLevels: [],
                        anomalyTypes: []
                      })
                    }}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Limpiar
                  </Button>
                </div>
              )}
            </div>

            {/* Estadísticas compactas */}
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>{dashboardStats ? `${dashboardStats.insights.total} insights` : 'Cargando...'}</span>
              </Badge>
              
              {dashboardStats && dashboardStats.insights.open > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{dashboardStats.insights.open} pendientes</span>
                </Badge>
              )}
            </div>
          </div>
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
            {/* 🆕 LISTA MEJORADA DE INSIGHTS - DISEÑO COMPACTO */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Anomalías Detectadas</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {insights.length} anomalías
                    </Badge>
                    
                    {/* Controles de selección múltiple */}
                    {insights.some(insight => !insight.resolved) && (
                      <div className="flex items-center space-x-2">
                        {selectedInsights.size > 0 && (
                          <>
                            <Badge variant="outline" className="text-blue-600">
                              {selectedInsights.size} seleccionadas
                            </Badge>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleBulkResolve}
                              disabled={refreshing}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolver seleccionadas
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={clearSelection}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Limpiar
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={selectedInsights.size === insights.filter(i => !i.resolved).length ? clearSelection : selectAllInsights}
                        >
                          {selectedInsights.size === insights.filter(i => !i.resolved).length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {insights.length > 0 ? (
                  <div className="space-y-2">
                    {insights.slice(0, 20).map((insight) => (
                      <div 
                        key={insight.id} 
                        className={`border rounded-lg transition-all duration-200 ${
                          insight.resolved 
                            ? 'bg-green-50 border-green-200' 
                            : getSeverityColor(insight.severity || 'medium')
                        } ${selectedInsights.has(insight.id) ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        {/* Header compacto de la anomalía */}
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            {/* Información básica en una línea */}
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {/* Checkbox para selección múltiple */}
                              {!insight.resolved && (
                                <input
                                  type="checkbox"
                                  checked={selectedInsights.has(insight.id)}
                                  onChange={() => toggleInsightSelection(insight.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              )}
                              
                              {/* Icono de severidad */}
                              {getSeverityIcon(insight.severity || 'medium')}
                              
                              {/* Información principal */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge variant={insight.resolved ? 'default' : 'destructive'} className="text-xs">
                                    {insight.insightType.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {insight.severity || 'medium'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(insight.detectedAt), 'dd/MM HH:mm', { locale: es })}
                                  </span>
                                </div>
                                
                                {/* Información de la cita en línea compacta */}
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate max-w-24">
                                      {insight.appointment?.clinic?.name || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <User className="w-3 h-3" />
                                    <span className="truncate max-w-32">
                                      {insight.appointment?.person?.firstName} {insight.appointment?.person?.lastName}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Briefcase className="w-3 h-3" />
                                    <span className="truncate max-w-32">
                                      {insight.appointment?.professionalUser?.firstName} {insight.appointment?.professionalUser?.lastName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Métricas y acciones */}
                            <div className="flex items-center space-x-3">
                              {/* Desviación destacada */}
                              <div className="text-right">
                                <div className={`text-sm font-bold ${Math.abs(insight.deviationPct) > 50 ? 'text-red-600' : 'text-orange-600'}`}>
                                  {insight.deviationPct > 0 ? '+' : ''}{insight.deviationPct.toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground">desviación</div>
                              </div>
                              
                              {/* Botones de acción */}
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleInsightExpansion(insight.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  {expandedInsights.has(insight.id) ? 
                                    <ChevronUp className="w-4 h-4" /> : 
                                    <ChevronDown className="w-4 h-4" />
                                  }
                                </Button>
                                
                                {!insight.resolved && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleResolveInsight(insight.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 🆕 DETALLES EXPANDIBLES REDISEÑADOS */}
                        {expandedInsights.has(insight.id) && (
                          <div className="border-t bg-white/30 p-4 space-y-4">
                            {/* Servicios y Comparación Estimado vs Real */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Servicios de la cita */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center space-x-2">
                                  <Briefcase className="w-4 h-4" />
                                  <span>Servicios Realizados</span>
                                </h4>
                                
                                {insight.appointment?.services && insight.appointment.services.length > 0 ? (
                                  <div className="space-y-2">
                                    {insight.appointment.services.map((appointmentService) => (
                                      <div key={appointmentService.id} className="flex items-center justify-between p-2 bg-white/50 rounded border">
                                        <span className="text-sm font-medium">{appointmentService.service.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {appointmentService.service.durationMinutes} min
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No hay servicios registrados</p>
                                )}
                              </div>

                              {/* Comparación Estimado vs Real */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center space-x-2">
                                  <BarChart3 className="w-4 h-4" />
                                  <span>Estimado vs Real</span>
                                </h4>
                                
                                <div className="space-y-3">
                                  {/* Comparación de Tiempo */}
                                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-blue-800">Duración</span>
                                      <Clock className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Estimado:</span>
                                        <span className="ml-2 font-medium">{insight.appointment?.durationMinutes || 0} min</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Real:</span>
                                        <span className="ml-2 font-medium">{insight.appointment?.actualUsageMinutes || insight.appointment?.durationMinutes || 0} min</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Comparación de Energía */}
                                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-orange-800">Consumo Energético</span>
                                      <Zap className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Estimado:</span>
                                        <span className="ml-2 font-medium">{insight.expectedKwh.toFixed(3)} kWh</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Real:</span>
                                        <span className="ml-2 font-medium">{insight.actualKwh.toFixed(3)} kWh</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-orange-300">
                                      <span className="text-xs text-muted-foreground">Desviación:</span>
                                      <span className={`ml-2 text-sm font-bold ${Math.abs(insight.deviationPct) > 50 ? 'text-red-600' : 'text-orange-600'}`}>
                                        {insight.deviationPct > 0 ? '+' : ''}{insight.deviationPct.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Información adicional de la cita */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                              <div className="space-y-2">
                                <h5 className="font-medium text-sm">Detalles de la Cita</h5>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fecha:</span>
                                    <span>{format(new Date(insight.detectedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Clínica:</span>
                                    <span className="font-medium">{insight.appointment?.clinic?.name}</span>
                                  </div>
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigateToAppointment(insight.appointmentId, insight.appointment?.startTime || '')}
                                  className="w-full mt-2"
                                >
                                  <ExternalLink className="mr-2 w-4 h-4" />
                                  Ver en agenda
                                </Button>
                              </div>

                              {/* Análisis inteligente compacto */}
                              {(insight.clientPatternAnalysis || insight.employeePatternAnalysis || insight.recommendations) && (
                                <div className="space-y-2">
                                  <h5 className="font-medium text-sm">Análisis Inteligente</h5>
                                  
                                  {insight.clientPatternAnalysis && (
                                    <div className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                                      <span className="font-medium text-blue-800">Cliente:</span>
                                      <span className="ml-1">{insight.clientPatternAnalysis.anomalyRate.toFixed(1)}% tasa anomalías</span>
                                    </div>
                                  )}
                                  
                                  {insight.employeePatternAnalysis && (
                                    <div className="text-xs p-2 bg-green-50 rounded border border-green-200">
                                      <span className="font-medium text-green-800">Empleado:</span>
                                      <span className="ml-1">{insight.employeePatternAnalysis.avgEfficiency.toFixed(1)}% eficiencia</span>
                                    </div>
                                  )}
                                  
                                  {insight.recommendations && insight.recommendations.length > 0 && (
                                    <div className="text-xs p-2 bg-yellow-50 rounded border border-yellow-200">
                                      <span className="font-medium text-yellow-800">Recomendación:</span>
                                      <span className="ml-1">{insight.recommendations[0].message}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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