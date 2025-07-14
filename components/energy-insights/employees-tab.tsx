/**
 * 👨‍⚕️ PESTAÑA DE EMPLEADOS - DASHBOARD ANOMALÍAS
 * =============================================
 * 
 * Pestaña dedicada al análisis de anomalías por empleados.
 * Muestra scores de riesgo, eficiencia y patrones de comportamiento.
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - employeeScores: Datos de scoring de empleados
 * 
 * @see docs/ANOMALY_SCORING_SYSTEM.md
 */

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

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

export function EmployeesTab({ clinicId }: EmployeesTabProps) {
  const { data: session } = useSession()
  const [employeeScores, setEmployeeScores] = useState<EmployeeScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'riskScore' | 'anomalyRate' | 'efficiency'>('riskScore')
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (session?.user?.systemId) {
      fetchEmployeeScores()
    }
  }, [session?.user?.systemId, clinicId])

  const fetchEmployeeScores = async () => {
    try {
      setIsLoading(true)
      
      // 🚨 DATOS REALES desde API - NO más mock data
      const params = new URLSearchParams()
      if (clinicId) params.append('clinicId', clinicId)
      
      const response = await fetch(`/api/internal/energy-insights/employee-scores?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setEmployeeScores(data.employeeScores || [])
      } else {
        console.warn('API employee-scores no disponible')
        // Solo usar datos vacíos si no hay API - NUNCA mock data
        setEmployeeScores([])
        toast.info('No hay datos de empleados disponibles')
      }
    } catch (error) {
      console.error('Error fetching employee scores:', error)
      setEmployeeScores([]) // Solo datos vacíos, no mock
      toast.error('Error al cargar datos de empleados')
    } finally {
      setIsLoading(false)
    }
  }

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

  const filteredAndSortedEmployees = employeeScores
    .filter(emp => filterLevel === 'all' || emp.riskLevel === filterLevel)
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
      {/* Header de Empleados */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <Users className="mr-2 w-6 h-6 text-green-600" />
            Análisis por Empleados
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
        </div>
      </div>

      {/* Estadísticas Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{employeeScores.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Riesgo Alto/Crítico</p>
                <p className="text-2xl font-bold text-red-600">
                  {employeeScores.filter(e => ['high', 'critical'].includes(e.riskLevel)).length}
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
                  {(employeeScores.reduce((sum, e) => sum + e.avgEfficiency, 0) / employeeScores.length).toFixed(1)}%
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
                <p className="text-sm text-muted-foreground">Con Indicadores</p>
                <p className="text-2xl font-bold text-orange-600">
                  {employeeScores.filter(e => Object.keys(e.fraudIndicators).some(key => e.fraudIndicators[key])).length}
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
        ) : (
          filteredAndSortedEmployees.map((employee) => {
            const isExpanded = expandedEmployees[employee.employeeId]
            const fraudIndicatorCount = Object.keys(employee.fraudIndicators).filter(key => employee.fraudIndicators[key]).length
            
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
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div>
                          <CardTitle className="text-lg">
                            {employee.employee ? `${employee.employee.firstName} ${employee.employee.lastName}` : `Empleado ${employee.employeeId}`}
                          </CardTitle>
                          <div className="flex items-center mt-1 space-x-4 text-sm text-muted-foreground">
                            <span>{employee.totalServices} servicios</span>
                            <span>{employee.totalAnomalies} anomalías</span>
                            <span>{employee.anomalyRate.toFixed(1)}% tasa</span>
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
                            <div className="flex items-center space-x-2">
                              <Progress value={employee.consistencyScore} className="w-20 h-2" />
                              <span className="text-sm font-medium">{employee.consistencyScore.toFixed(1)}%</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Tasa de Anomalías</span>
                            <span className="text-sm font-medium text-red-600">
                              {employee.anomalyRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Patrones y Alertas */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Patrones y Alertas</h4>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Clientes Favorecidos</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(employee.favoredClients).map(([clientId, count]) => (
                                <Badge key={clientId} variant="outline" className="text-xs">
                                  {clientId}: {count}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
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
                                  {period}: {count}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
} 