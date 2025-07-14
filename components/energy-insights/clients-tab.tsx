/**
 * 👤 PESTAÑA DE CLIENTES - DASHBOARD ANOMALÍAS
 * ===========================================
 * 
 * Pestaña dedicada al análisis de anomalías por clientes.
 * Muestra scores de riesgo, patrones sospechosos y comportamiento anómalo.
 * 
 * 🔐 AUTENTICACIÓN: useSession de next-auth/react
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro por clínica específica
 * - clientScores: Datos de scoring de clientes
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
  Users,
  Target,
  Clock,
  Zap,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX
} from 'lucide-react'
import { toast } from 'sonner'

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

export function ClientsTab({ clinicId }: ClientsTabProps) {
  const { data: session } = useSession()
  const [clientScores, setClientScores] = useState<ClientScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'riskScore' | 'anomalyRate' | 'totalServices'>('riskScore')
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (session?.user?.systemId) {
      fetchClientScores()
    }
  }, [session?.user?.systemId, clinicId])

  const fetchClientScores = async () => {
    try {
      setIsLoading(true)
      
      // 🚨 DATOS REALES desde API - NO más mock data  
      const params = new URLSearchParams()
      if (clinicId) params.append('clinicId', clinicId)
      
      const response = await fetch(`/api/internal/energy-insights/client-scores?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setClientScores(data.clientScores || [])
      } else {
        console.warn('API client-scores no disponible')
        // Solo usar datos vacíos si no hay API - NUNCA mock data
        setClientScores([])
        toast.info('No hay datos de clientes disponibles')
      }
    } catch (error) {
      console.error('Error fetching client scores:', error)
      setClientScores([]) // Solo datos vacíos, no mock
      toast.error('Error al cargar datos de clientes')
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

  const filteredAndSortedClients = clientScores
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
      {/* Header de Clientes */}
      <div className="flex flex-col justify-between items-start space-y-4 lg:flex-row lg:items-center lg:space-y-0">
        <div>
          <h2 className="flex items-center text-2xl font-bold">
            <Users className="mr-2 w-6 h-6 text-purple-600" />
            Análisis por Clientes
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
        </div>
      </div>

      {/* Estadísticas Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{clientScores.length}</p>
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
                  {clientScores.filter(c => ['high', 'critical'].includes(c.riskLevel)).length}
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
                  {(clientScores.reduce((sum, c) => sum + c.anomalyRate, 0) / clientScores.length).toFixed(1)}%
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
                  {clientScores.filter(c => Object.keys(c.suspiciousPatterns).length > 0).length}
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
        ) : (
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
                          <CardTitle className="text-lg">
                            {client.client ? `${client.client.firstName} ${client.client.lastName}` : `Cliente ${client.clientId}`}
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
                                {Object.entries(client.favoredByEmployees).map(([empId, count]) => (
                                  <Badge key={empId} variant="outline" className="text-xs">
                                    {empId}: {count} servicios
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
        )}
      </div>
    </div>
  )
} 