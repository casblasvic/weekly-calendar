"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from "lucide-react"
import { toast } from "sonner"

interface WebhookLogsPanelProps {
  webhookId: string
}

interface WebhookLog {
  id: string
  method: string
  url: string
  statusCode?: number
  timestamp: string
  wasProcessed: boolean
  sourceIp?: string
  userAgent?: string
  responseTime?: number
  body?: any
  responseBody?: any
  validationErrors?: string[]
  processingErrors?: string[]
}

export function WebhookLogsPanel({ webhookId }: WebhookLogsPanelProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<"all" | "success" | "error">("all")
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadLogs = useCallback(async () => {
    if (!webhookId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/internal/webhooks/${webhookId}/logs`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      } else if (response.status === 401) {
        // Deshabilitar auto-refresh en caso de error de autenticación
        setAutoRefresh(false)
        console.error("❌ Error 401: No autorizado para obtener logs")
        toast.error("No autorizado para obtener logs del webhook")
      } else {
        console.error(`❌ Error ${response.status} al cargar logs`)
        toast.error(`Error al cargar los logs: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading logs:', error)
      setAutoRefresh(false) // Deshabilitar auto-refresh en caso de error
      toast.error("Error al cargar los logs")
    } finally {
      setIsLoading(false)
    }
  }, [webhookId])

  useEffect(() => {
    loadLogs()
  }, [webhookId, loadLogs])

  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(loadLogs, 5000) // Refrescar cada 5 segundos
    return () => clearInterval(interval)
  }, [autoRefresh, webhookId, loadLogs])

  const getStatusIcon = (log: WebhookLog) => {
    if (!log.statusCode) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    }
    if (log.statusCode >= 200 && log.statusCode < 300) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (log: WebhookLog) => {
    if (!log.statusCode) {
      return <Badge variant="outline">Sin respuesta</Badge>
    }
    if (log.statusCode >= 200 && log.statusCode < 300) {
      return <Badge variant="default">{log.statusCode}</Badge>
    }
    return <Badge variant="destructive">{log.statusCode}</Badge>
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true
    if (filter === "success") return log.statusCode && log.statusCode >= 200 && log.statusCode < 300
    if (filter === "error") return !log.statusCode || log.statusCode >= 400
    return true
  })

  const getStats = () => {
    const total = logs.length
    const success = logs.filter(log => log.statusCode && log.statusCode >= 200 && log.statusCode < 300).length
    const errors = logs.filter(log => !log.statusCode || log.statusCode >= 400).length
    
    return { total, success, errors }
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      {/* Estadísticas y controles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-xs text-muted-foreground">Exitosos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <div className="text-xs text-muted-foreground">Errores</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {logs.length > 0 ? `${Math.round(logs.reduce((acc, log) => acc + (log.responseTime || 0), 0) / logs.length)}ms` : "0ms"}
                </div>
                <div className="text-xs text-muted-foreground">Tiempo promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs del Webhook
              </CardTitle>
              <CardDescription>
                Historial de requests recibidos por este webhook
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-1">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={filter === "success" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("success")}
                >
                  Exitosos
                </Button>
                <Button
                  variant={filter === "error" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("error")}
                >
                  Errores
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-green-50 text-green-700" : ""}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay logs disponibles</h3>
              <p className="text-muted-foreground">
                {logs.length === 0 
                  ? "Este webhook aún no ha recibido ningún request" 
                  : "No hay logs que coincidan con el filtro seleccionado"
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-3">
                    {/* Header del log */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log)}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {log.method}
                            </Badge>
                            {getStatusBadge(log)}
                            {log.wasProcessed && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                Procesado
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(log.timestamp)}
                            {log.responseTime && ` • ${log.responseTime}ms`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        {log.sourceIp && (
                          <div>IP: {log.sourceIp}</div>
                        )}
                      </div>
                    </div>

                    {/* Request body (si existe) */}
                    {log.body && (
                      <div>
                        <div className="text-xs font-medium mb-1">Request Body:</div>
                        <div className="bg-muted/20 p-2 rounded text-xs">
                          <pre className="overflow-auto max-h-32">
                            {JSON.stringify(log.body, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Response body (si existe) */}
                    {log.responseBody && (
                      <div>
                        <div className="text-xs font-medium mb-1">Response Body:</div>
                        <div className="bg-muted/20 p-2 rounded text-xs">
                          <pre className="overflow-auto max-h-32">
                            {JSON.stringify(log.responseBody, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Errores (si existen) */}
                    {(log.validationErrors?.length || log.processingErrors?.length) && (
                      <div>
                        <div className="text-xs font-medium mb-1 text-red-600">Errores:</div>
                        <div className="space-y-1">
                          {log.validationErrors?.map((error, index) => (
                            <div key={index} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                              Validación: {error}
                            </div>
                          ))}
                          {log.processingErrors?.map((error, index) => (
                            <div key={index} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                              Procesamiento: {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User Agent (si existe) */}
                    {log.userAgent && (
                      <div className="text-xs text-muted-foreground">
                        User-Agent: {log.userAgent}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Información de Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Estados de Response</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• <Badge variant="default" className="text-xs mr-2">2xx</Badge> Exitoso</li>
                <li>• <Badge variant="destructive" className="text-xs mr-2">4xx</Badge> Error del cliente</li>
                <li>• <Badge variant="destructive" className="text-xs mr-2">5xx</Badge> Error del servidor</li>
                <li>• <Badge variant="outline" className="text-xs mr-2">-</Badge> Sin respuesta/timeout</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Información de Logs</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Los logs se almacenan por 30 días</li>
                <li>• Actualización automática cada 5 segundos</li>
                <li>• Filtros por estado de respuesta</li>
                <li>• Información de IP y User-Agent</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 