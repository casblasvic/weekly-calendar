/**
 * 📊 PESTAÑA DE SERVICIOS - DASHBOARD ANOMALÍAS
 * ============================================
 * 
 * Pestaña dedicada al análisis de anomalías por servicios.
 * Muestra equipamiento, variabilidad y configuraciones de duración EN FORMATO TABLA.
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - equipmentVariability: Datos de variabilidad por equipamiento
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  ArrowUpDown
} from 'lucide-react'

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
  isLoading = false
}: ServicesTabProps) {

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
    if (variability > 25) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Alta</Badge>
    if (variability > 15) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Media</Badge>
    return <Badge variant="default" className="bg-green-100 text-green-800">Baja</Badge>
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
      {/* Header con controles */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <Wrench className="mr-2 w-6 h-6 text-blue-600" />
            Análisis de Servicios por Equipamiento
          </h2>
          <p className="text-muted-foreground">
            Variabilidad energética y configuración de duraciones por equipo y servicio
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onExpandAllEquipment}>
            <ChevronDown className="w-4 h-4 mr-1" />
            Expandir Todo
          </Button>
          <Button variant="outline" size="sm" onClick={onCollapseAllEquipment}>
            <ChevronUp className="w-4 h-4 mr-1" />
            Colapsar Todo
          </Button>
          {Object.keys(selectedServices).filter(key => selectedServices[key]).length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={onClearServiceSelection}>
                Limpiar ({Object.keys(selectedServices).filter(key => selectedServices[key]).length})
              </Button>
              {applicableServicesCount > 0 && (
                <Button size="sm" onClick={onApplyBulkUpdates}>
                  <Settings className="w-4 h-4 mr-1" />
                  Actualizar Seleccionados ({applicableServicesCount})
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={onSelectAllServices}>
            Seleccionar Todo
          </Button>
        </div>
      </div>

      {/* Tabla principal de equipamiento y servicios */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Equipamiento y Servicios ({equipmentVariability.length} servicios)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {equipmentVariability.length === 0 ? (
            <div className="py-8 text-center">
              <Zap className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold">Sin datos de servicios</h3>
              <p className="text-muted-foreground">
                No hay datos de variabilidad energética disponibles para mostrar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={Object.keys(selectedServices).filter(key => selectedServices[key]).length === equipmentVariability.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onSelectAllServices()
                          } else {
                            onClearServiceSelection()
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Equipamiento</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center">
                        <Zap className="w-4 h-4 mr-1" />
                        Consumo kWh/min
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Variabilidad
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Duración Config.
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center">
                        <Activity className="w-4 h-4 mr-1" />
                        Duración Real
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Muestras</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentVariability.map((service) => {
                    const serviceKey = `${service.equipmentName}-${service.serviceId}`
                    const isSelected = selectedServices[serviceKey]
                    const hasConfiguredDuration = service.configuredDurationMinutes !== null
                    const hasRealDuration = service.avgRealDurationMinutes !== null
                    const canUpdate = hasRealDuration && service.sampleCount >= 3

                    return (
                      <TableRow 
                        key={serviceKey}
                        className={`${isSelected ? 'bg-blue-50 border-blue-200' : ''} hover:bg-gray-50`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleServiceSelection(serviceKey)}
                          />
                        </TableCell>

                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Wrench className="w-4 h-4 text-blue-600" />
                            <span>{service.equipmentName}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">{service.serviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            Fuente: {service.durationSource}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <span className="font-medium">
                              {formatNumber(service.avgKwhPerMin)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ±{formatNumber(service.stdDevKwhPerMin)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <div className="flex items-center space-x-1">
                              {getVariabilityIcon(service.variabilityPct)}
                              <span className={`font-medium ${getVariabilityColor(service.variabilityPct)}`}>
                                {formatNumber(service.variabilityPct)}%
                              </span>
                            </div>
                            {getVariabilityBadge(service.variabilityPct)}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Clock className="w-3 h-3 mr-1 text-blue-500" />
                            <span className="font-medium">
                              {hasConfiguredDuration ? `${service.configuredDurationMinutes} min` : 'No config.'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center">
                              <Activity className="w-3 h-3 mr-1 text-green-500" />
                              <span className="font-medium">
                                {hasRealDuration ? `${formatNumber(service.avgRealDurationMinutes!)} min` : 'Sin datos'}
                              </span>
                            </div>
                            {service.durationVariabilityPct > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ±{formatNumber(service.durationVariabilityPct)}%
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {service.sampleCount}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center space-y-1">
                            {canUpdate && (
                              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Actualizable
                              </Badge>
                            )}
                            {service.variabilityPct > 40 && (
                              <Badge variant="destructive" className="text-xs">
                                Revisar
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenDurationUpdateModal(service)}
                            disabled={!hasRealDuration}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Configurar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de selección */}
      {selectedServicesData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {selectedServicesData.length} servicios seleccionados
                </span>
                <span className="text-sm text-muted-foreground">
                  {applicableServicesCount} aplicables para actualización
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onClearServiceSelection}>
                  Limpiar Selección
                </Button>
                {applicableServicesCount > 0 && (
                  <Button size="sm" onClick={onApplyBulkUpdates}>
                    <Settings className="w-4 h-4 mr-1" />
                    Actualizar Masivamente ({applicableServicesCount})
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 