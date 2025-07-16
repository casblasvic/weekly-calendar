/**
 * 📊 PESTAÑA DE SERVICIOS - DASHBOARD ANOMALÍAS [OPTIMIZADA CON PAGINACIÓN]
 * =====================================================================
 * 
 * Pestaña dedicada al análisis de anomalías por servicios.
 * Muestra equipamiento, variabilidad y configuraciones de duración EN FORMATO TABLA.
 * 
 * ✅ CARACTERÍSTICAS IMPLEMENTADAS:
 * - Tres duraciones: servicio completo, tratamiento estimado, tratamiento real
 * - Filtro por equipamiento
 * - Paginación con 15 elementos por defecto
 * - Tabla optimizada para grandes volúmenes de datos
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - equipmentVariability: Datos de variabilidad por equipamiento
 * - durationMinutes: Duración de la cita íntegra
 * - treatmentDurationMinutes: Duración estimada del tratamiento
 * - avgRealDurationMinutes: Duración real del tratamiento (uso de máquina)
 * 
 * @see docs/ENERGY_INSIGHTS.md
 * @see components/pagination-controls.tsx
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Wrench,
  Activity,
  Clock,
  Zap,
  CheckCircle,
  Package,
  ArrowUpDown,
  Filter,
  Search,
  Timer,
  PlayCircle,
  StopCircle,
  Target,
  BarChart3,
  Lightbulb
} from 'lucide-react'
import { PaginationControls, PageSizeSelector } from '@/components/pagination-controls'

interface ServicesTabProps {
  equipmentVariability: Array<{
    equipmentName: string
    serviceId: string
    serviceName: string
    avgKwhPerMin: number
    stdDevKwhPerMin: number
    variabilityPct: number
    sampleCount: number
    configuredDurationMinutes: number | null
    avgRealDurationMinutes: number | null
    durationVariabilityPct: number
    durationSource: string
    // 🆕 NUEVOS CAMPOS REQUERIDOS
    durationMinutes?: number | null // Duración del servicio (cita íntegra)
    treatmentDurationMinutes?: number | null // Duración estimada del tratamiento
  }>
  expandedEquipment: Record<string, boolean>
  selectedServices: Record<string, boolean>
  onToggleEquipmentExpansion: (equipmentName: string) => void
  onToggleServiceSelection: (serviceKey: string) => void
  onExpandAllEquipment: () => void
  onCollapseAllEquipment: () => void
  onSelectAllServices: () => void
  onClearServiceSelection: () => void
  onOpenDurationUpdateModal: (equipmentData: any) => void
  onApplyBulkUpdates: () => void
  getSelectedServicesData: () => any[]
  getApplicableServicesCount: () => number
  formatNumber: (num: number) => string
  isLoading?: boolean
  onNavigateToServiceConfig: (serviceId: string) => void
}

export function ServicesTab({
  equipmentVariability,
  expandedEquipment,
  selectedServices,
  onToggleEquipmentExpansion,
  onToggleServiceSelection,
  onExpandAllEquipment,
  onCollapseAllEquipment,
  onSelectAllServices,
  onClearServiceSelection,
  onOpenDurationUpdateModal,
  onApplyBulkUpdates,
  getSelectedServicesData,
  getApplicableServicesCount,
  formatNumber,
  isLoading = false,
  onNavigateToServiceConfig
}: ServicesTabProps) {

  // 🎯 ESTADO PARA FILTROS Y PAGINACIÓN
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // 🎯 OBTENER EQUIPAMIENTOS ÚNICOS PARA FILTRO
  const uniqueEquipments = useMemo(() => {
    const equipments = [...new Set(equipmentVariability.map(item => item.equipmentName))]
    return equipments.sort()
  }, [equipmentVariability])

  // 🎯 DATOS FILTRADOS
  const filteredData = useMemo(() => {
    return equipmentVariability.filter(service => {
      const matchesEquipment = equipmentFilter === 'all' || !equipmentFilter || service.equipmentName === equipmentFilter
      const matchesSearch = !searchQuery || 
        service.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesEquipment && matchesSearch
    })
  }, [equipmentVariability, equipmentFilter, searchQuery])

  // 🎯 DATOS PAGINADOS
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, pageSize])

  // 🎯 CÁLCULOS DE PAGINACIÓN
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const totalCount = filteredData.length

  // 🎯 RESETEAR PÁGINA AL CAMBIAR FILTROS
  React.useEffect(() => {
    setCurrentPage(1)
  }, [equipmentFilter, searchQuery, pageSize])

  const getVariabilityColor = (variability: number) => {
    if (variability > 40) return 'text-red-600'
    if (variability > 25) return 'text-orange-500'
    if (variability > 15) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getVariabilityIcon = (variability: number) => {
    if (variability > 40) return <AlertTriangle className="w-4 h-4 text-red-600" />
    if (variability > 25) return <TrendingUp className="w-4 h-4 text-orange-500" />
    if (variability > 15) return <TrendingDown className="w-4 h-4 text-yellow-600" />
    return <Activity className="w-4 h-4 text-green-600" />
  }

  const getVariabilityBadge = (variability: number) => {
    if (variability > 40) return <Badge variant="destructive">Crítica</Badge>
    if (variability > 25) return <Badge variant="secondary" className="text-orange-800 bg-orange-100">Alta</Badge>
    if (variability > 15) return <Badge variant="secondary" className="text-yellow-800 bg-yellow-100">Media</Badge>
    return <Badge variant="default" className="text-green-800 bg-green-100">Baja</Badge>
  }

  // 🎯 LÓGICA DE ANÁLISIS DE DURACIÓN (NUEVA)
  const analyzeDurationStatus = (service: any) => {
    const configured = service.durationMinutes || service.configuredDurationMinutes
    const real = service.avgRealDurationMinutes
    
    if (!real || !configured || service.sampleCount < 3) {
      return {
        status: 'insufficient_data',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <BarChart3 className="w-3 h-3 text-gray-500" />,
        badge: <Badge variant="outline" className="text-xs">Datos insuficientes</Badge>,
        tooltip: 'Se necesitan al menos 3 muestras para análisis confiable'
      }
    }

    const difference = Math.abs(real - configured)
    const diffPercentage = (difference / configured) * 100

    // 🟢 CONFIGURACIÓN ÓPTIMA
    if (diffPercentage <= 5) {
      return {
        status: 'optimal',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="w-3 h-3 text-green-600" />,
        badge: <Badge variant="default" className="text-xs text-green-800 bg-green-100">Óptimo</Badge>,
        tooltip: `Configuración óptima: ${diffPercentage.toFixed(1)}% diferencia`
      }
    }

    // 🔴 SOBREPASO CRÍTICO
    if (real > configured) {
      return {
        status: 'critical',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <AlertTriangle className="w-3 h-3 text-red-600" />,
        badge: <Badge variant="destructive" className="text-xs">Crítico</Badge>,
        tooltip: `CRÍTICO: Real (${Math.round(real)} min) > Configurado (${configured} min)`
      }
    }

    // 🟡 AJUSTE MENOR
    if (diffPercentage <= 15) {
      return {
        status: 'minor_adjustment',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: <TrendingUp className="w-3 h-3 text-yellow-600" />,
        badge: <Badge variant="secondary" className="text-xs text-yellow-800 bg-yellow-100">Ajuste menor</Badge>,
        tooltip: `Ajuste recomendado: ${diffPercentage.toFixed(1)}% diferencia`
      }
    }

    // 🟠 SOBREDIMENSIONADO
    return {
      status: 'oversized',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: <TrendingDown className="w-3 h-3 text-orange-600" />,
      badge: <Badge variant="secondary" className="text-xs text-orange-800 bg-orange-100">Sobredimensionado</Badge>,
      tooltip: `Sobredimensionado: ${diffPercentage.toFixed(1)}% mayor que necesario`
    }
  }

  const selectedServicesData = getSelectedServicesData()
  const applicableServicesCount = getApplicableServicesCount()

  if (isLoading) {
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
      {/* 🎯 HEADER CON ESTADÍSTICAS */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <BarChart3 className="mr-2 w-6 h-6 text-blue-600" />
            Análisis de Servicios por Equipamiento
          </h2>
          <p className="text-muted-foreground">
            Variabilidad energética y configuración de duraciones por equipo y servicio
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onSelectAllServices}>
            <CheckCircle className="mr-1 w-4 h-4" />
            Seleccionar Todos
          </Button>
          <Button variant="outline" size="sm" onClick={onClearServiceSelection}>
            Limpiar Selección
          </Button>
        </div>
      </div>

      {/* 🎯 CONTROLES DE FILTROS */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Filtro por equipamiento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipamiento</label>
              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por equipamiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <Filter className="mr-2 w-4 h-4" />
                      Todos los equipamientos
                    </div>
                  </SelectItem>
                  {uniqueEquipments.map(equipment => (
                    <SelectItem key={equipment} value={equipment}>
                      <div className="flex items-center">
                        <Wrench className="mr-2 w-4 h-4 text-blue-600" />
                        {equipment}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buscador */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-500 transform -translate-y-1/2" />
                <Input
                  placeholder="Buscar servicios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Acciones de selección */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Acciones</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAllServices}
                  className="flex items-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Seleccionar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearServiceSelection}
                  className="flex items-center space-x-1"
                >
                  <span>Limpiar</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🎯 RESUMEN DE FILTROS APLICADOS */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>
          Mostrando {paginatedData.length} de {totalCount} servicios
          {equipmentFilter !== 'all' && ` (equipamiento: ${equipmentFilter})`}
          {searchQuery && ` (búsqueda: "${searchQuery}")`}
        </span>
      </div>

      {/* 🎯 TABLA PRINCIPAL */}
      <Card>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold">
                {equipmentFilter !== 'all' || searchQuery ? 'Sin resultados' : 'Sin datos de servicios'}
              </h3>
              <p className="text-muted-foreground">
                {equipmentFilter !== 'all' || searchQuery 
                  ? 'No hay servicios que coincidan con los filtros aplicados.'
                  : 'No hay datos de variabilidad energética disponibles para mostrar.'
                }
              </p>
              {(equipmentFilter !== 'all' || searchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEquipmentFilter('all')
                    setSearchQuery('')
                  }}
                  className="mt-3"
                >
                  Limpiar Filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Vista Desktop */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedData.length > 0 && paginatedData.every(service => {
                            const serviceKey = `${service.equipmentName}-${service.serviceId}`
                            return selectedServices[serviceKey]
                          })}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              paginatedData.forEach(service => {
                                const serviceKey = `${service.equipmentName}-${service.serviceId}`
                                onToggleServiceSelection(serviceKey)
                              })
                            } else {
                              paginatedData.forEach(service => {
                                const serviceKey = `${service.equipmentName}-${service.serviceId}`
                                if (selectedServices[serviceKey]) {
                                  onToggleServiceSelection(serviceKey)
                                }
                              })
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Equipamiento</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-center">
                        <div className="flex justify-center items-center">
                          <Zap className="mr-1 w-4 h-4" />
                          Consumo kWh/min
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex justify-center items-center">
                          <TrendingUp className="mr-1 w-4 h-4" />
                          Variabilidad
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex justify-center items-center">
                          <Clock className="mr-1 w-4 h-4" />
                          Dur. Servicio
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex justify-center items-center">
                          <Timer className="mr-1 w-4 h-4" />
                          Trat. Est.
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex justify-center items-center">
                          <Activity className="mr-1 w-4 h-4" />
                          Trat. Real
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Muestras</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((service) => {
                      const serviceKey = `${service.equipmentName}-${service.serviceId}`
                      const isSelected = selectedServices[serviceKey]
                      
                      // 🔧 LÓGICA CORREGIDA: Usar los campos correctos de la API
                      const hasServiceDuration = service.durationMinutes !== null && service.durationMinutes !== undefined && service.durationMinutes > 0
                      
                      // Si treatmentDurationMinutes es 0 o null, usar durationMinutes como fallback
                      const effectiveTreatmentDuration = service.treatmentDurationMinutes && service.treatmentDurationMinutes > 0 
                        ? service.treatmentDurationMinutes 
                        : service.durationMinutes
                      
                      const hasTreatmentDuration = effectiveTreatmentDuration !== null && effectiveTreatmentDuration !== undefined && effectiveTreatmentDuration > 0
                      const hasRealDuration = service.avgRealDurationMinutes !== null
                      const canUpdate = hasRealDuration && service.sampleCount >= 3

                      // 🎯 ANÁLISIS DE ESTADO DE DURACIÓN CON COLORES LÓGICOS
                      const durationAnalysis = analyzeDurationStatus(service)

                      // 🎨 COLORES LÓGICOS PARA DURACIÓN REAL
                      const getRealDurationColor = () => {
                        if (!hasRealDuration || !hasTreatmentDuration) return 'text-gray-400'
                        
                        const realDuration = service.avgRealDurationMinutes!
                        const configuredDuration = effectiveTreatmentDuration!
                        const diffPercentage = ((realDuration - configuredDuration) / configuredDuration) * 100
                        
                        if (Math.abs(diffPercentage) <= 5) return 'text-green-600' // Verde: óptimo
                        if (diffPercentage > 0) return 'text-red-600' // Rojo: exceso (dura más)
                        return 'text-orange-600' // Naranja: defecto (dura menos)
                      }

                      return (
                        <TableRow 
                          key={serviceKey}
                          className={`${isSelected ? 'bg-blue-50 border-blue-200' : ''} hover:bg-gray-50 ${durationAnalysis.bgColor} ${durationAnalysis.borderColor}`}
                        >
                          <TableCell className="py-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleServiceSelection(serviceKey)}
                            />
                          </TableCell>

                          <TableCell className="py-2 font-medium">
                            <div className="flex items-center space-x-2">
                              <Wrench className="flex-shrink-0 w-4 h-4 text-blue-600" />
                              <span>{service.equipmentName}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-2">
                            <div className="font-medium">{service.serviceName}</div>
                            <div className="text-xs text-muted-foreground">
                              Fuente: {service.durationSource}
                            </div>
                          </TableCell>

                          <TableCell className="py-2 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-sm font-medium">
                                {formatNumber(service.avgKwhPerMin)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ±{formatNumber(service.stdDevKwhPerMin)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-2 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-sm font-medium">
                                {formatNumber(service.variabilityPct)}%
                              </span>
                              <Progress 
                                value={Math.min(service.variabilityPct, 100)} 
                                className="w-16 h-2"
                              />
                            </div>
                          </TableCell>

                          {/* 🕐 DURACIÓN DEL SERVICIO (CITA ÍNTEGRA) */}
                          <TableCell className="py-2 text-center">
                            {hasServiceDuration ? (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-sm font-medium text-blue-600">
                                  {service.durationMinutes} min
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Completo
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-gray-400">—</span>
                                <span className="text-xs text-muted-foreground">
                                  No config.
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* ⏱️ DURACIÓN ESTIMADA DEL TRATAMIENTO */}
                          <TableCell className="py-2 text-center">
                            {hasTreatmentDuration ? (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-sm font-medium text-purple-600">
                                  {effectiveTreatmentDuration} min
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {service.treatmentDurationMinutes && service.treatmentDurationMinutes > 0 ? 'Tratamiento' : 'Fallback'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-gray-400">—</span>
                                <span className="text-xs text-muted-foreground">
                                  No config.
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* 📊 DURACIÓN REAL DEL TRATAMIENTO CON COLORES LÓGICOS */}
                          <TableCell className="py-2 text-center">
                            {hasRealDuration ? (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="flex flex-col items-center space-y-1 cursor-pointer">
                                    <span className={`text-sm font-medium ${getRealDurationColor()}`}>
                                      {formatNumber(service.avgRealDurationMinutes!)} min
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      {durationAnalysis.icon}
                                      <span className="text-xs text-muted-foreground">
                                        {durationAnalysis.status}
                                      </span>
                                    </div>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold">Análisis de Duración</h4>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span>Duración Real:</span>
                                        <span className={`font-medium ${getRealDurationColor()}`}>
                                          {formatNumber(service.avgRealDurationMinutes!)} min
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Duración Configurada:</span>
                                        <span className="font-medium">{effectiveTreatmentDuration || 'N/A'} min</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Variabilidad:</span>
                                        <span className="font-medium">{formatNumber(service.durationVariabilityPct)}%</span>
                                      </div>
                                      {hasTreatmentDuration && hasRealDuration && (
                                        <div className="flex justify-between">
                                          <span>Diferencia:</span>
                                          <span className={`font-medium ${getRealDurationColor()}`}>
                                            {((service.avgRealDurationMinutes! - effectiveTreatmentDuration!) / effectiveTreatmentDuration! * 100).toFixed(1)}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="pt-2 border-t">
                                      <p className="text-xs text-muted-foreground">
                                        {durationAnalysis.tooltip}
                                      </p>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-gray-400">—</span>
                                <span className="text-xs text-muted-foreground">
                                  Sin datos
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-2 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-sm font-medium">{service.sampleCount}</span>
                              <span className="text-xs text-muted-foreground">
                                {service.sampleCount >= 3 ? 'Suficientes' : 'Insuficientes'}
                              </span>
                            </div>
                          </TableCell>

                          {/* 🏷️ ESTADO CON TOOLTIP RESTAURADO */}
                          <TableCell className="py-2 text-center">
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="cursor-help">
                                  {durationAnalysis.badge}
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    {durationAnalysis.icon}
                                    <h4 className="text-sm font-semibold">Análisis de Estado</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {durationAnalysis.tooltip}
                                  </p>
                                  {hasRealDuration && hasTreatmentDuration && (
                                    <div className="pt-2 text-xs border-t">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <span className="text-muted-foreground">Configurado:</span>
                                          <div className="font-medium">{effectiveTreatmentDuration} min</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Real promedio:</span>
                                          <div className={`font-medium ${getRealDurationColor()}`}>
                                            {Math.round(service.avgRealDurationMinutes!)} min
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </TableCell>

                          <TableCell className="py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onNavigateToServiceConfig(service.serviceId)}
                              className="p-0 w-8 h-8"
                            >
                              <Settings className="w-4 h-4 text-purple-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Vista Mobile/Tablet - Cards */}
              <div className="p-4 space-y-4 lg:hidden">
                {paginatedData.map((service) => {
                  const serviceKey = `${service.equipmentName}-${service.serviceId}`
                  const isSelected = selectedServices[serviceKey]
                  
                  // 🔧 LÓGICA CORREGIDA: Usar los campos correctos de la API
                  const hasServiceDuration = service.durationMinutes !== null && service.durationMinutes !== undefined && service.durationMinutes > 0
                  
                  // Si treatmentDurationMinutes es 0 o null, usar durationMinutes como fallback
                  const effectiveTreatmentDuration = service.treatmentDurationMinutes && service.treatmentDurationMinutes > 0 
                    ? service.treatmentDurationMinutes 
                    : service.durationMinutes
                  
                  const hasTreatmentDuration = effectiveTreatmentDuration !== null && effectiveTreatmentDuration !== undefined && effectiveTreatmentDuration > 0
                  const hasRealDuration = service.avgRealDurationMinutes !== null

                  // 🎯 ANÁLISIS DE ESTADO DE DURACIÓN CON COLORES LÓGICOS
                  const durationAnalysis = analyzeDurationStatus(service)

                  // 🎨 COLORES LÓGICOS PARA DURACIÓN REAL
                  const getRealDurationColor = () => {
                    if (!hasRealDuration || !hasTreatmentDuration) return 'text-gray-400'
                    
                    const realDuration = service.avgRealDurationMinutes!
                    const configuredDuration = effectiveTreatmentDuration!
                    const diffPercentage = ((realDuration - configuredDuration) / configuredDuration) * 100
                    
                    if (Math.abs(diffPercentage) <= 5) return 'text-green-600' // Verde: óptimo
                    if (diffPercentage > 0) return 'text-red-600' // Rojo: exceso (dura más)
                    return 'text-orange-600' // Naranja: defecto (dura menos)
                  }

                  return (
                    <Card key={serviceKey} className={`${isSelected ? 'bg-blue-50 border-blue-200' : ''} ${durationAnalysis.bgColor} ${durationAnalysis.borderColor}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleServiceSelection(serviceKey)}
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <Wrench className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">{service.equipmentName}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">{service.serviceName}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {durationAnalysis.badge}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onNavigateToServiceConfig(service.serviceId)}
                              className="p-0 w-8 h-8"
                            >
                              <Settings className="w-4 h-4 text-purple-600" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Consumo kWh/min</div>
                            <div className="font-medium">{formatNumber(service.avgKwhPerMin)} ±{formatNumber(service.stdDevKwhPerMin)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Variabilidad</div>
                            <div className="font-medium">{formatNumber(service.variabilityPct)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Dur. Servicio</div>
                            <div className="font-medium text-blue-600">
                              {hasServiceDuration ? `${service.durationMinutes} min` : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Trat. Estimado</div>
                            <div className="font-medium text-purple-600">
                              {hasTreatmentDuration ? `${effectiveTreatmentDuration} min` : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Trat. Real</div>
                            <div className={`font-medium ${getRealDurationColor()}`}>
                              {hasRealDuration ? `${formatNumber(service.avgRealDurationMinutes!)} min` : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Muestras</div>
                            <div className="font-medium">{service.sampleCount}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 🎯 PAGINACIÓN */}
      <div className="flex justify-between items-center">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalCount={totalCount}
        />
        <PageSizeSelector
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          itemType="servicios"
        />
      </div>
    </div>
  )
} 