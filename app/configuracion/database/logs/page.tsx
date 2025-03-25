"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { History, Download, RefreshCw, AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"
import { useDatabase, DatabaseType } from "@/contexts/database-context"

// Definición de tipos para los registros
type LogLevel = "info" | "warning" | "error" | "success"

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  details?: string
  source: "local" | "supabase"
  operation: string
}

export default function DatabaseLogsPage() {
  const { toast } = useToast()
  const { databaseType, isConnected } = useDatabase()

  const [isLoading, setIsLoading] = useState(false)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Cargar logs al inicio
  useEffect(() => {
    if (isConnected) {
      loadLogs()
    }
  }, [isConnected])

  // Filtrar logs por nivel y búsqueda
  const filteredLogs = logEntries.filter(log => {
    // Filtrar por tab seleccionado
    if (activeTab !== 'all' && log.level !== activeTab) {
      return false
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      return (
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    return true
  })

  // Cargar los logs
  const loadLogs = async () => {
    setIsLoading(true)
    try {
      // Aquí se simula la carga de logs
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Datos simulados
      const mockLogs: LogEntry[] = [
        {
          id: "1",
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          level: "info",
          message: "Conexión establecida con éxito",
          source: databaseType === DatabaseType.LOCAL ? "local" : "supabase",
          operation: "connection",
        },
        {
          id: "2",
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          level: "success",
          message: "Datos cargados correctamente",
          details: "Se cargaron 156 registros",
          source: databaseType === DatabaseType.LOCAL ? "local" : "supabase",
          operation: "data_load",
        },
        {
          id: "3",
          timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
          level: "warning",
          message: "Tiempo de respuesta elevado",
          details: "El tiempo de respuesta fue superior a 500ms",
          source: databaseType === DatabaseType.LOCAL ? "local" : "supabase",
          operation: "performance",
        },
        {
          id: "4",
          timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
          level: "error",
          message: "Error al guardar cambios",
          details: "Se produjo un error de conexión",
          source: databaseType === DatabaseType.LOCAL ? "local" : "supabase",
          operation: "data_save",
        },
        {
          id: "5",
          timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
          level: "info",
          message: "Inicio de sesión",
          source: databaseType === DatabaseType.LOCAL ? "local" : "supabase",
          operation: "auth",
        },
        {
          id: "6",
          timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
          level: "success",
          message: "Respaldo automático creado",
          details: "Respaldo diario completado",
          source: databaseType === DatabaseType.LOCAL ? "local" : "supabase",
          operation: "backup",
        },
      ]
      
      setLogEntries(mockLogs)
      toast({
        title: "Registros cargados",
        description: `Se han cargado ${mockLogs.length} registros`
      })
    } catch (error) {
      console.error("Error al cargar logs:", error)
      toast({
        title: "Error al cargar registros",
        description: "No se pudieron obtener los registros de actividad",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Descargar los logs en formato CSV
  const downloadLogs = () => {
    try {
      const csvHeader = "ID,Fecha,Nivel,Mensaje,Detalles,Origen,Operación\n"
      const csvContent = logEntries.map(log => {
        return `"${log.id}","${new Date(log.timestamp).toLocaleString()}","${log.level}","${log.message}","${log.details || ""}","${log.source}","${log.operation}"`
      }).join("\n")
      
      const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `database-logs-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Registros descargados",
        description: "Se ha descargado el archivo CSV con los registros"
      })
    } catch (error) {
      console.error("Error al descargar logs:", error)
      toast({
        title: "Error al descargar",
        description: "No se pudo generar el archivo CSV",
        variant: "destructive"
      })
    }
  }

  // Renderizar el icono según el nivel del log
  const renderLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }
  
  // Renderizar el color de la badge según el nivel
  const getLevelBadgeClass = (level: LogLevel) => {
    switch (level) {
      case "info":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "error":
        return "bg-red-50 text-red-700 border-red-200"
      case "success":
        return "bg-green-50 text-green-700 border-green-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin conexión</AlertTitle>
          <AlertDescription>
            No hay una conexión activa a la base de datos. Por favor, configura la conexión primero.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <History className="w-8 h-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Registros de Base de Datos</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadLogs}
            disabled={logEntries.length === 0}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Descargar CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filtros y búsqueda</CardTitle>
          <CardDescription>
            Filtra los registros por nivel o utiliza la búsqueda para encontrar registros específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
                <TabsTrigger value="info" className="flex-1">
                  <Info className="w-4 h-4 mr-2" />
                  Info
                </TabsTrigger>
                <TabsTrigger value="success" className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Éxito
                </TabsTrigger>
                <TabsTrigger value="warning" className="flex-1">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Advertencia
                </TabsTrigger>
                <TabsTrigger value="error" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Error
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <Input
                placeholder="Buscar en registros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Fecha</TableHead>
              <TableHead className="w-[100px]">Nivel</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead className="w-[150px]">Operación</TableHead>
              <TableHead className="w-[100px]">Origen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getLevelBadgeClass(log.level)}>
                      <span className="flex items-center space-x-1">
                        {renderLevelIcon(log.level)}
                        <span className="ml-1 capitalize">{log.level}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{log.operation}</TableCell>
                  <TableCell className="capitalize">{log.source}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-gray-500">
                    <History className="w-8 h-8 text-gray-300" />
                    {isLoading ? (
                      <p>Cargando registros...</p>
                    ) : searchTerm ? (
                      <p>No se encontraron registros para "{searchTerm}"</p>
                    ) : (
                      <p>No hay registros para el filtro seleccionado</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between mt-4 text-sm text-gray-500">
        <div>
          Mostrando {filteredLogs.length} de {logEntries.length} registros
        </div>
        <div>
          Último registro: {logEntries.length > 0 ? new Date(logEntries[0].timestamp).toLocaleString() : "N/A"}
        </div>
      </div>
    </div>
  )
} 