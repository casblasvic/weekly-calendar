"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Clock, 
  Home,
  Cog,
  Bug,
  Play,
  Trash2,
  RotateCcw,
  Database,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Terminal,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAgendaDiagnostics } from "@/lib/hooks/use-agenda-diagnostics"
import { useClinic } from "@/contexts/clinic-context"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AgendaConfigPanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentDate: Date
}

export function AgendaConfigPanel({ 
  isOpen, 
  onOpenChange, 
  currentDate 
}: AgendaConfigPanelProps) {
  const { toast } = useToast()
  const { activeClinic, activeClinicCabins } = useClinic()
  const [activeTab, setActiveTab] = useState("debug")
  const [isExecutingCommand, setIsExecutingCommand] = useState<string | null>(null)
  
  // Hook de diagnóstico
  const { 
    diagnostics, 
    isEnabled: isDiagnosticsEnabled, 
    runDiagnostics, 
    clearIndexedDB, 
    toggleDiagnostics 
  } = useAgendaDiagnostics(currentDate, activeClinic?.id)

  // Estados para switches
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(isDiagnosticsEnabled)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Sincronizar estado del hook con el switch
  useEffect(() => {
    setDiagnosticsEnabled(isDiagnosticsEnabled)
  }, [isDiagnosticsEnabled])

  // Función para ejecutar comandos con feedback visual
  const executeCommand = useCallback(async (command: string, fn: () => Promise<void> | void) => {
    if (isExecutingCommand) return
    
    setIsExecutingCommand(command)
    
    try {
      await fn()
      toast({
        title: "Comando ejecutado",
        description: `${command} completado exitosamente`,
        duration: 3000
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Error al ejecutar ${command}`,
        variant: "destructive"
      })
    } finally {
      setIsExecutingCommand(null)
    }
  }, [isExecutingCommand, toast])

  // Manejadores para los comandos
  const handleToggleDiagnostics = useCallback((enabled: boolean) => {
    setDiagnosticsEnabled(enabled)
    toggleDiagnostics(enabled)
    
    toast({
      title: enabled ? "Diagnósticos activados" : "Diagnósticos desactivados",
      description: enabled 
        ? "Los diagnósticos automáticos están ahora activos" 
        : "Los diagnósticos automáticos están desactivados",
      duration: 2000
    })
  }, [toggleDiagnostics, toast])

  const handleRunDiagnostics = useCallback(() => {
    executeCommand("Diagnóstico completo", async () => {
      await runDiagnostics()
    })
  }, [executeCommand, runDiagnostics])

  const handleClearCache = useCallback(() => {
    executeCommand("Limpieza de cache", async () => {
      await clearIndexedDB()
    })
  }, [executeCommand, clearIndexedDB])

  const handleClearIndexedDB = useCallback(() => {
    executeCommand("Limpieza de IndexedDB", async () => {
      if (typeof window !== 'undefined' && (window as any).clearIndexedDB) {
        (window as any).clearIndexedDB()
      }
    })
  }, [executeCommand])

  const formattedDate = format(currentDate, "PPPP", { locale: es })
  const activeCabinsCount = activeClinicCabins?.filter(c => c.isActive).length || 0

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full">
        <SheetHeader className="sr-only">
          <SheetTitle>Configuración de la agenda</SheetTitle>
        </SheetHeader>
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Configuración de Agenda</h2>
              <p className="text-sm text-gray-600">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-hidden flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="justify-start p-0 w-full h-11 bg-gray-50 rounded-none border-b">
              <TabsTrigger 
                value="horario" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Horario
              </TabsTrigger>
              <TabsTrigger 
                value="cabinas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Cabinas
              </TabsTrigger>
              <TabsTrigger 
                value="configuracion"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <Cog className="h-3.5 w-3.5 mr-1.5" />
                Configuración
              </TabsTrigger>
              <TabsTrigger 
                value="debug"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <Bug className="h-3.5 w-3.5 mr-1.5" />
                Debug
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto flex-1">
              <TabsContent value="horario" className="p-6 mt-0 space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Configuración de horario</h3>
                  <div className="p-4 text-sm text-center text-gray-500 rounded-lg border">
                    Próximamente: Configuración de horarios de trabajo
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cabinas" className="p-6 mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Cabinas activas</h3>
                    <Badge variant="secondary" className="text-xs">
                      {activeCabinsCount} activas
                    </Badge>
                  </div>
                  
                  {activeClinicCabins && activeClinicCabins.length > 0 ? (
                    <div className="space-y-2">
                      {activeClinicCabins
                        .filter(c => c.isActive)
                        .sort((a, b) => a.order - b.order)
                        .map(cabin => (
                          <div key={cabin.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <Home className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{cabin.name}</p>
                                <p className="text-xs text-gray-500">Orden: {cabin.order}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Activa
                            </Badge>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-center text-gray-500 rounded-lg border">
                      No hay cabinas activas configuradas
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="configuracion" className="p-6 mt-0 space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Configuración general</h3>
                  <div className="p-4 text-sm text-center text-gray-500 rounded-lg border">
                    Próximamente: Configuración general de la agenda
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="debug" className="p-6 mt-0 space-y-6">
                {/* Estado de diagnósticos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Sistema de diagnósticos</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={diagnosticsEnabled}
                        onCheckedChange={handleToggleDiagnostics}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <span className="text-xs text-gray-500">
                        {diagnosticsEnabled ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                  
                  {diagnosticsEnabled && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">
                          Los diagnósticos automáticos están activos
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comandos de diagnóstico */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Comandos de diagnóstico</h4>
                  
                  <div className="space-y-3">
                    {/* Ejecutar diagnóstico */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Ejecutar diagnóstico completo</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Compara datos entre IndexedDB y React Query
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleRunDiagnostics}
                        disabled={isExecutingCommand === "Diagnóstico completo"}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isExecutingCommand === "Diagnóstico completo" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Limpiar cache */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Limpiar cache</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Limpia React Query cache inmediatamente
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearCache}
                        disabled={isExecutingCommand === "Limpieza de cache"}
                      >
                        {isExecutingCommand === "Limpieza de cache" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Limpiar IndexedDB */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Limpiar IndexedDB</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Marca IndexedDB para limpieza en próximo reinicio
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearIndexedDB}
                        disabled={isExecutingCommand === "Limpieza de IndexedDB"}
                      >
                        {isExecutingCommand === "Limpieza de IndexedDB" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Database className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Guía de uso */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Guía de uso</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    >
                      {showAdvancedOptions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-blue-900">
                        Para resolver problemas actuales:
                      </h5>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Activa los diagnósticos usando el switch superior</li>
                        <li>Navega a la semana problemática y observa los logs</li>
                        <li>Si hay inconsistencias, usa "Limpiar cache"</li>
                        <li>Si el problema persiste, usa "Limpiar IndexedDB" y reinicia el servidor</li>
                      </ol>
                    </div>
                  </div>

                  {showAdvancedOptions && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Comandos de consola (avanzado):
                      </h5>
                      <div className="space-y-2">
                        <div className="p-2 bg-black rounded text-green-400 text-xs font-mono">
                          <Terminal className="w-3 h-3 inline mr-1" />
                          window.agendaDiagnostics.toggle(true)
                        </div>
                        <div className="p-2 bg-black rounded text-green-400 text-xs font-mono">
                          <Terminal className="w-3 h-3 inline mr-1" />
                          window.agendaDiagnostics.run()
                        </div>
                        <div className="p-2 bg-black rounded text-green-400 text-xs font-mono">
                          <Terminal className="w-3 h-3 inline mr-1" />
                          window.agendaDiagnostics.clear()
                        </div>
                        <div className="p-2 bg-black rounded text-green-400 text-xs font-mono">
                          <Terminal className="w-3 h-3 inline mr-1" />
                          window.clearIndexedDB()
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Información adicional */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Para debugging futuro</h4>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-yellow-800">
                          Los logs muestran si datos vienen de IndexedDB (óptimo) o API (lento)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          El sistema detecta automáticamente citas faltantes o duplicadas
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-yellow-800">
                          Tienes herramientas para limpiar cache corrupto cuando sea necesario
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-4 h-9 text-sm hover:bg-gray-100 hover:text-gray-900"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 