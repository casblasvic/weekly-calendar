"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Activity, 
  RefreshCw, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  Eye
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface WebhookLog {
  id: string
  timestamp: Date
  method: string
  statusCode: number
  sourceIp: string
  userAgent: string
  headers: any
  body: any
  responseBody: any
  responseTime: number
  wasProcessed: boolean
  validationErrors: string[]
  processingErrors: string[]
}

interface WebhookLogsModalProps {
  webhook: {
    id: string
    name: string
    url: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WebhookLogsModal({ webhook, open, onOpenChange }: WebhookLogsModalProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadLogs = useCallback(async () => {
    if (!webhook.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/internal/webhooks/${webhook.id}/logs`)
      if (!response.ok) {
        throw new Error('Error loading logs')
      }
      
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Error loading logs:', error)
      toast.error("Error al cargar los logs")
    } finally {
      setLoading(false)
    }
  }, [webhook.id])

  useEffect(() => {
    if (open) {
      loadLogs()
    }
  }, [open, webhook.id, loadLogs])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh && open) {
      interval = setInterval(loadLogs, 5000)
    }
    return () => clearInterval(interval)
  }, [autoRefresh, open, loadLogs])

  const filteredLogs = logs.filter(log => {
    const matchesFilter = 
      filter === "all" || 
      (filter === "success" && log.statusCode >= 200 && log.statusCode < 300) ||
      (filter === "error" && (log.statusCode >= 400 || log.processingErrors.length > 0))
    
    const matchesSearch = !searchQuery || 
      log.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sourceIp?.includes(searchQuery) ||
      log.statusCode.toString().includes(searchQuery)
    
    return matchesFilter && matchesSearch
  })

  const getStatusIcon = (log: WebhookLog) => {
    if (log.statusCode >= 200 && log.statusCode < 300 && log.processingErrors.length === 0) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (log.statusCode >= 400 || log.processingErrors.length > 0) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "text-green-600"
    if (statusCode >= 400) return "text-red-600"
    return "text-yellow-600"
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `webhook-logs-${webhook.name}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Logs exportados correctamente")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs de Webhook: {webhook.name}
          </DialogTitle>
        </DialogHeader>

        {/* Controles */}
        <div className="flex-shrink-0 space-y-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refrescar
              </Button>
              
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Auto-refresh {autoRefresh && "(5s)"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredLogs.length} de {logs.length} logs
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtros */}
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Exitosos</SelectItem>
                <SelectItem value="error">Errores</SelectItem>
              </SelectContent>
            </Select>

            {/* Búsqueda */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por método, IP, código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Lista de logs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="list" className="h-full">
            <TabsList>
              <TabsTrigger value="list">Lista</TabsTrigger>
              <TabsTrigger value="details">Detalle</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="h-full mt-4">
              <div className="h-full overflow-auto space-y-2">
                {loading && logs.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2" />
                    <p>No hay logs disponibles</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <Card 
                      key={log.id} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedLog?.id === log.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedLog(log)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(log)}
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {log.method}
                                </Badge>
                                <span className={cn(
                                  "font-mono text-sm font-medium",
                                  getStatusColor(log.statusCode)
                                )}>
                                  {log.statusCode}
                                </span>
                                {log.responseTime && (
                                  <span className="text-xs text-muted-foreground">
                                    {log.responseTime}ms
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{log.sourceIp}</span>
                                <span>•</span>
                                <span>{format(new Date(log.timestamp), "HH:mm:ss dd/MM/yyyy")}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(log.timestamp), { locale: es, addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>

                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>

                        {log.processingErrors.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Errores:</strong> {log.processingErrors.join(", ")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="h-full mt-4">
              {selectedLog ? (
                <div className="h-full overflow-auto space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información del Request</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm font-medium">Método</span>
                          <p className="font-mono">{selectedLog.method}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Estado</span>
                          <p className={cn("font-mono", getStatusColor(selectedLog.statusCode))}>
                            {selectedLog.statusCode}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">IP Origen</span>
                          <p className="font-mono text-sm">{selectedLog.sourceIp}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Tiempo</span>
                          <p>{selectedLog.responseTime}ms</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium">User Agent</span>
                        <p className="text-sm text-muted-foreground break-all">{selectedLog.userAgent}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Headers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                          {JSON.stringify(selectedLog.headers, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Body</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                          {JSON.stringify(selectedLog.body, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                          {JSON.stringify(selectedLog.responseBody, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    {(selectedLog.validationErrors.length > 0 || selectedLog.processingErrors.length > 0) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base text-red-600">Errores</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {selectedLog.validationErrors.map((error, index) => (
                            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Validación:</strong> {error}
                            </div>
                          ))}
                          {selectedLog.processingErrors.map((error, index) => (
                            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Procesamiento:</strong> {error}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecciona un log para ver los detalles</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
} 