/**
 * 📊 INSIGHTS TAB - GESTIÓN AVANZADA DE ANOMALÍAS ENERGÉTICAS
 * ============================================================
 * 
 * Componente principal para gestionar insights de anomalías con:
 * - Agrupación por Cliente, Empleado o Clínica
 * - Filtros por estado (todos/pendientes/resueltos) y rango de fechas
 * - Formato tabla expandible con detalles completos
 * - Navegación correcta a la agenda
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - insights: Lista de anomalías agrupadas
 * - groupBy: Tipo de agrupación (client/employee/clinic)
 * - status: Filtro de estado (all/pending/resolved)
 * - dateRange: Rango de fechas para filtrar
 * 
 * Funcionalidades:
 * - Agrupación dinámica con contadores
 * - Tabla expandible por grupo
 * - Filtros avanzados con date-range-picker
 * - Detalles completos de cada insight
 * - Navegación correcta a agenda
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Users, 
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Lightbulb,
  Download,
  Filter,
  Eye,
  TrendingUp,
  TrendingDown,
  Bug
} from 'lucide-react'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

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
  severity: 'low' | 'medium' | 'high' | 'critical'
  severityColor: string
  appointment?: {
    id: string
    startTime: string
    endTime: string
    durationMinutes: number
    actualUsageMinutes?: number
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
    services?: Array<{
      id: string
      service: {
        id: string
        name: string
        durationMinutes: number
        treatmentDurationMinutes?: number
      }
    }>
  }
  recommendations?: Array<{
    type: string
    priority: string
    category: string
    message: string
    actionRequired: boolean
  }>
  detailJson?: {
    actualMinutes?: number;
    realMinutes?: number;
  };
  appointmentDetails?: {
    timeAnalysis?: {
      hasTimeDeviation: boolean;
      timeDeviationPct: number;
      timeDeviationType: 'OVER_DURATION' | 'UNDER_DURATION';
    };
  };
}

interface GroupedInsight {
  groupKey: string
  groupName: string
  groupType: 'client' | 'employee' | 'clinic'
  insights: DeviceUsageInsight[]
  totalCount: number
  pendingCount: number
  resolvedCount: number
  avgDeviation: number
  lastActivity: string
}

interface InsightsTabProps {
  insights: DeviceUsageInsight[]
  onResolveInsight: (insightId: string) => Promise<void>
  onBulkResolve: (insightIds: string[]) => Promise<void>
  onExportReport: () => void
  formatNumber: (num: number) => string
  formatConsumption: (kwh: number) => string
  getSeverityColor: (severity: string) => string
  getSeverityIcon: (severity: string) => React.ReactNode
  getConfidenceColor: (confidence: number) => string
  getConfidenceLabel: (confidence: number) => string
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function InsightsTab({
  insights,
  onResolveInsight,
  onBulkResolve,
  onExportReport,
  formatNumber,
  formatConsumption,
  getSeverityColor,
  getSeverityIcon,
  getConfidenceColor,
  getConfidenceLabel
}: InsightsTabProps) {
  
  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================
  
  const [groupBy, setGroupBy] = useState<'client' | 'employee' | 'clinic'>('client')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [selectedInsights, setSelectedInsights] = useState<Record<string, boolean>>({})

  // ============================================================================
  // FUNCIONES DE UTILIDAD
  // ============================================================================

  const navigateToAppointment = (appointmentId: string, startTime: string) => {
    const date = new Date(startTime)
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // ✅ NAVEGACIÓN CORRECTA: Usar formato correcto para abrir en agenda
    // La agenda maneja los modals internamente, solo necesitamos navegar a la fecha correcta
    const url = `/agenda/dia/${dateStr}`
    window.open(url, '_blank')
    
    // TODO: Implementar selección automática de la cita específica una vez en la agenda
    // Esto podría requerir modificaciones en el componente de agenda para aceptar appointmentId como parámetro
    toast.info(`Navegando a agenda del ${format(date, 'd MMM yyyy', { locale: es })}`)
  }

  // ============================================================================
  // PROCESAMIENTO DE DATOS Y FILTROS
  // ============================================================================

  const filteredInsights = useMemo(() => {
    let filtered = insights

    // Filtro por estado
    if (statusFilter === 'pending') {
      filtered = filtered.filter(insight => !insight.resolved)
    } else if (statusFilter === 'resolved') {
      filtered = filtered.filter(insight => insight.resolved)
    }

    // Filtro por rango de fechas
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(insight => {
        const insightDate = parseISO(insight.detectedAt)
        return isWithinInterval(insightDate, {
          start: dateRange.from!,
          end: dateRange.to!
        })
      })
    }

    return filtered
  }, [insights, statusFilter, dateRange])

  const groupedInsights = useMemo((): GroupedInsight[] => {
    const groups: Record<string, GroupedInsight> = {}

    filteredInsights.forEach(insight => {
      let groupKey: string
      let groupName: string

      switch (groupBy) {
        case 'client':
          groupKey = insight.appointment?.person?.id || 'unknown'
          groupName = insight.appointment?.person 
            ? `${insight.appointment.person.firstName} ${insight.appointment.person.lastName}`
            : 'Cliente Desconocido'
          break
        case 'employee':
          groupKey = insight.appointment?.professionalUser?.id || 'unknown'
          groupName = insight.appointment?.professionalUser
            ? `${insight.appointment.professionalUser.firstName} ${insight.appointment.professionalUser.lastName}`
            : 'Empleado Desconocido'
          break
        case 'clinic':
          groupKey = insight.appointment?.clinic?.id || 'unknown'
          groupName = insight.appointment?.clinic?.name || 'Clínica Desconocida'
          break
        default:
          groupKey = 'unknown'
          groupName = 'Desconocido'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          groupName,
          groupType: groupBy,
          insights: [],
          totalCount: 0,
          pendingCount: 0,
          resolvedCount: 0,
          avgDeviation: 0,
          lastActivity: ''
        }
      }

      groups[groupKey].insights.push(insight)
    })

    // Calcular estadísticas para cada grupo
    Object.values(groups).forEach(group => {
      group.totalCount = group.insights.length
      group.pendingCount = group.insights.filter(i => !i.resolved).length
      group.resolvedCount = group.insights.filter(i => i.resolved).length
      group.avgDeviation = group.insights.reduce((sum, i) => sum + Math.abs(i.deviationPct), 0) / group.totalCount
      group.lastActivity = group.insights
        .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())[0]?.detectedAt || ''
    })

    return Object.values(groups).sort((a, b) => b.pendingCount - a.pendingCount)
  }, [filteredInsights, groupBy])

  // ============================================================================
  // HANDLERS DE EVENTOS
  // ============================================================================

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  const toggleInsightSelection = (insightId: string) => {
    setSelectedInsights(prev => ({
      ...prev,
      [insightId]: !prev[insightId]
    }))
  }

  const selectAllInGroup = (groupKey: string) => {
    const group = groupedInsights.find(g => g.groupKey === groupKey)
    if (!group) return

    const newSelections = { ...selectedInsights }
    group.insights.forEach(insight => {
      newSelections[insight.id] = true
    })
    setSelectedInsights(newSelections)
  }

  const clearSelection = () => {
    setSelectedInsights({})
  }

  const handleBulkResolve = async () => {
    const selectedIds = Object.keys(selectedInsights).filter(id => selectedInsights[id])
    
    if (selectedIds.length === 0) {
      toast.error('No hay insights seleccionados')
      return
    }
    
    try {
      await onBulkResolve(selectedIds)
      clearSelection()
      toast.success(`${selectedIds.length} insights resueltos`)
    } catch (error) {
      toast.error('Error en resolución masiva')
    }
  }

  const getGroupIcon = (groupType: string) => {
    switch (groupType) {
      case 'client': return <User className="w-4 h-4" />
      case 'employee': return <Users className="w-4 h-4" />
      case 'clinic': return <Building2 className="w-4 h-4" />
      default: return <Bug className="w-4 h-4" />
    }
  }

  const getRiskBadgeVariant = (pendingCount: number, totalCount: number) => {
    const riskRatio = pendingCount / totalCount
    if (riskRatio >= 0.5) return 'destructive'
    if (riskRatio >= 0.3) return 'secondary'
    return 'default'
  }

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <Bug className="mr-2 w-6 h-6 text-red-600" />
            Insights de Anomalías
          </h2>
          <p className="text-muted-foreground">
            Citas con comportamiento energético anómalo agrupadas para análisis
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {Object.keys(selectedInsights).filter(id => selectedInsights[id]).length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpiar ({Object.keys(selectedInsights).filter(id => selectedInsights[id]).length})
              </Button>
              <Button size="sm" onClick={handleBulkResolve}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Resolver Seleccionados
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onExportReport}>
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Controles de filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Agrupar por */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Agrupar por</label>
              <Select value={groupBy} onValueChange={(value: 'client' | 'employee' | 'clinic') => setGroupBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Cliente
                    </div>
                  </SelectItem>
                  <SelectItem value="employee">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Empleado
                    </div>
                  </SelectItem>
                  <SelectItem value="clinic">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Clínica
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'resolved') => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <Filter className="w-4 h-4 mr-2" />
                      Todos
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                      Sin resolver
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Resueltos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rango de fechas */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Período</label>
              <CalendarDateRangePicker 
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de filtros aplicados */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>
          Mostrando {filteredInsights.length} insights agrupados por {
            groupBy === 'client' ? 'cliente' : 
            groupBy === 'employee' ? 'empleado' : 'clínica'
          }
          {statusFilter !== 'all' && ` (${statusFilter === 'pending' ? 'sin resolver' : 'resueltos'})`}
          {dateRange?.from && dateRange?.to && 
            ` del ${format(dateRange.from, 'd MMM', { locale: es })} al ${format(dateRange.to, 'd MMM yyyy', { locale: es })}`
          }
        </span>
      </div>

      {/* Tabla de grupos */}
      <Card>
        <CardContent className="p-0">
          {groupedInsights.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto mb-4 w-12 h-12 text-green-400" />
              <h3 className="mb-2 text-lg font-semibold">¡No hay insights para mostrar!</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'pending' 
                  ? 'No hay anomalías pendientes con los filtros aplicados.'
                  : 'No se encontraron insights con los criterios seleccionados.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>
                    {groupBy === 'client' ? 'Cliente' : 
                     groupBy === 'employee' ? 'Empleado' : 'Clínica'}
                  </TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pendientes</TableHead>
                  <TableHead className="text-center">Resueltos</TableHead>
                  <TableHead className="text-center">Desviación Promedio</TableHead>
                  <TableHead className="text-center">Última Actividad</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedInsights.map((group) => (
                  <React.Fragment key={group.groupKey}>
                    {/* Fila del grupo */}
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleGroupExpansion(group.groupKey)}
                    >
                      <TableCell>
                        {expandedGroups[group.groupKey] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getGroupIcon(group.groupType)}
                          <span className="font-medium">{group.groupName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{group.totalCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {group.pendingCount > 0 && (
                          <Badge variant={getRiskBadgeVariant(group.pendingCount, group.totalCount)}>
                            {group.pendingCount}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.resolvedCount > 0 && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {group.resolvedCount}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={group.avgDeviation > 20 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                          {formatNumber(group.avgDeviation)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {group.lastActivity && format(new Date(group.lastActivity), 'd MMM', { locale: es })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllInGroup(group.groupKey)
                          }}
                        >
                          Seleccionar todo
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Filas expandidas - insights del grupo */}
                    {expandedGroups[group.groupKey] && group.insights.map((insight) => (
                      <TableRow key={insight.id} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={7}>
                          <div className="pl-4 py-2">
                            <Card className="border-l-4 border-l-blue-500">
                              <CardContent className="p-3">
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                  {/* Información básica del insight */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={selectedInsights[insight.id] || false}
                                          onCheckedChange={() => toggleInsightSelection(insight.id)}
                                        />
                                        <div className="flex items-center space-x-2">
                                          {getSeverityIcon(insight.severity)}
                                          <Badge variant="outline" className={getSeverityColor(insight.severity)}>
                                            {insight.severity.toUpperCase()}
                                          </Badge>
                                          <Badge variant="secondary">
                                            {insight.insightType.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      {insight.resolved ? (
                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Resuelto
                                        </Badge>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => onResolveInsight(insight.id)}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Resolver
                                        </Button>
                                      )}
                                    </div>

                                    {/* Tiempos de tratamiento - CORREGIDO */}
                                    <div className="grid grid-cols-2 gap-3 text-xs border rounded p-2 bg-gray-50">
                                      <div>
                                        <span className="text-muted-foreground">Tratamiento Estimado:</span>
                                        <div className="font-medium text-blue-600">
                                          {insight.appointment?.services?.[0]?.service?.treatmentDurationMinutes || 'N/A'} min
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Tratamiento Real:</span>
                                        <div className="font-medium text-purple-600">
                                          {/* Buscar en detailJson si está disponible la duración real del dispositivo */}
                                          {insight.detailJson?.actualMinutes || 
                                           insight.detailJson?.realMinutes || 
                                           insight.appointment?.actualUsageMinutes || 
                                           'N/A'} min
                                        </div>
                                      </div>
                                    </div>

                                    {/* ⏱️ ANÁLISIS DE DESVIACIÓN DE TIEMPO */}
                                    {insight.appointmentDetails?.timeAnalysis && insight.appointmentDetails.timeAnalysis.hasTimeDeviation && (
                                      <div className="grid grid-cols-2 gap-3 text-xs border rounded p-2 bg-yellow-50">
                                        <div>
                                          <span className="text-muted-foreground">Desviación Tiempo:</span>
                                          <div className="font-medium text-orange-600">
                                            {insight.appointmentDetails.timeAnalysis.timeDeviationPct}%
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Tipo:</span>
                                          <div className="font-medium text-orange-600">
                                            {insight.appointmentDetails.timeAnalysis.timeDeviationType === 'OVER_DURATION' ? 'Exceso' : 'Defecto'}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Consumos energéticos */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Consumo Real:</span>
                                        <div className="font-medium">{formatConsumption(insight.actualKwh)}</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Consumo Esperado:</span>
                                        <div className="font-medium">{formatConsumption(insight.expectedKwh)}</div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Desviación:</span>
                                        <span className={`ml-1 font-medium ${insight.deviationPct > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {insight.deviationPct > 0 ? '+' : ''}{formatNumber(insight.deviationPct)}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Detectado:</span>
                                        <span className="ml-1 font-medium">
                                          {format(new Date(insight.detectedAt), 'd MMM HH:mm', { locale: es })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Detalles de la cita - compactado */}
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-gray-900 text-sm">Detalles de la Cita</h4>
                                    
                                    {insight.appointment && (
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Fecha:</span>
                                          <span className="font-medium">
                                            {format(new Date(insight.appointment.startTime), 'd MMM yyyy HH:mm', { locale: es })}
                                          </span>
                                        </div>

                                        {/* 🏥 INFORMACIÓN DE CLÍNICA */}
                                        {insight.appointment.clinic && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Clínica:</span>
                                            <span className="font-medium text-blue-600">
                                              {insight.appointment.clinic.name}
                                            </span>
                                          </div>
                                        )}

                                        {/* 👨‍⚕️ INFORMACIÓN DE EMPLEADO */}
                                        {insight.appointment.professionalUser && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Empleado:</span>
                                            <span className="font-medium text-green-600">
                                              {`${insight.appointment.professionalUser.firstName || ''} ${insight.appointment.professionalUser.lastName || ''}`.trim()}
                                            </span>
                                          </div>
                                        )}

                                        {/* Servicios realizados - compactado */}
                                        {insight.appointment.services && insight.appointment.services.length > 0 && (
                                          <div className="mt-2">
                                            <h5 className="font-medium text-gray-900 mb-1 text-xs">Servicios</h5>
                                            <div className="space-y-1">
                                              {insight.appointment.services.map((service, index) => (
                                                <div key={index} className="p-1 bg-gray-100 rounded text-xs">
                                                  <div className="font-medium">{service.service.name}</div>
                                                  <div className="text-muted-foreground text-xs">
                                                    Configurado: {service.service.durationMinutes} min
                                                    {service.service.treatmentDurationMinutes && (
                                                      <span className="ml-2">
                                                        | Tratamiento: {service.service.treatmentDurationMinutes} min
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Recomendaciones - compactadas */}
                                        {insight.recommendations && insight.recommendations.length > 0 && (
                                          <div className="mt-2">
                                            <h5 className="font-medium text-gray-900 mb-1 text-xs">Recomendaciones</h5>
                                            <div className="space-y-1">
                                              {insight.recommendations.slice(0, 2).map((rec, index) => (
                                                <div key={index} className="flex items-start space-x-1 text-xs">
                                                  <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                                  <span className="text-muted-foreground">{rec.message}</span>
                                                </div>
                                              ))}
                                              {insight.recommendations.length > 2 && (
                                                <div className="text-xs text-muted-foreground">
                                                  +{insight.recommendations.length - 2} más...
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Navegación a agenda */}
                                        <div className="pt-1 border-t">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigateToAppointment(insight.appointmentId, insight.appointment!.startTime)}
                                            className="w-full h-7 text-xs"
                                          >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            Ver en Agenda
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 