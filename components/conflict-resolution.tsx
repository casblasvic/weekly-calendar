"use client"

import { useState, useEffect } from "react"
import { 
  ConflictoHorario,
  TipoConflicto,
  EstadisticasConflictos,
  generarEstadisticasConflictos
} from "@/services/exceptions-conflict-service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Clock, Filter, User, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useEmployees } from "@/contexts/employee-context"
import { traducirDia } from "@/utils/format-utils"

interface ConflictResolutionProps {
  conflicts: ConflictoHorario[]
  onResolveConflict: (conflictId: string, solution: string) => void
  onResolveAll: (solutionType: string) => void
}

export function ConflictResolution({ conflicts, onResolveConflict, onResolveAll }: ConflictResolutionProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictoHorario | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filter, setFilter] = useState("all")
  const [sortBy, setSortBy] = useState("day")
  const [statistics, setStatistics] = useState<EstadisticasConflictos | null>(null)
  const { empleados } = useEmployees()
  
  // Calcular estadísticas cuando cambian los conflictos
  useEffect(() => {
    if (conflicts.length > 0) {
      setStatistics(generarEstadisticasConflictos(conflicts))
    } else {
      setStatistics(null)
    }
  }, [conflicts])

  // Filtrar y ordenar conflictos
  const filteredConflicts = conflicts.filter(conflict => {
    if (filter === "all") return true
    if (filter === "resolved") return conflict.resuelto
    if (filter === "pending") return !conflict.resuelto
    if (filter.startsWith("tipo-")) {
      const tipo = filter.replace("tipo-", "") as TipoConflicto
      return conflict.tipo === tipo
    }
    if (filter.startsWith("dia-")) {
      const dia = filter.replace("dia-", "")
      return conflict.dia === dia
    }
    if (filter.startsWith("usuario-")) {
      const usuarioId = filter.replace("usuario-", "")
      return conflict.usuarioId === usuarioId
    }
    return true
  })

  // Ordenar conflictos
  const sortedConflicts = [...filteredConflicts].sort((a, b) => {
    if (sortBy === "day") {
      const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
      return dias.indexOf(a.dia) - dias.indexOf(b.dia)
    }
    if (sortBy === "type") {
      return a.tipo.localeCompare(b.tipo)
    }
    if (sortBy === "user") {
      return a.usuarioId.localeCompare(b.usuarioId)
    }
    if (sortBy === "status") {
      return (a.resuelto ? 1 : 0) - (b.resuelto ? 1 : 0)
    }
    return 0
  })

  // Obtener nombres de usuario a partir de IDs
  const getUserName = (userId: string): string => {
    const empleado = empleados.find(e => e.id === userId);
    return empleado ? `${empleado.firstName} ${empleado.lastName}` : `Usuario #${userId}`;
  }

  // Obtener color de tipo de conflicto
  const getConflictTypeColor = (tipo: TipoConflicto): string => {
    switch (tipo) {
      case TipoConflicto.FUERA_DE_HORARIO:
        return "text-red-600 bg-red-100"
      case TipoConflicto.SOLAPAMIENTO_PARCIAL:
        return "text-amber-600 bg-amber-100"
      case TipoConflicto.DIA_INACTIVO:
        return "text-blue-600 bg-blue-100"
      case TipoConflicto.SIN_FRANJAS:
        return "text-purple-600 bg-purple-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  // Obtener icono de tipo de conflicto
  const getConflictTypeIcon = (tipo: TipoConflicto) => {
    switch (tipo) {
      case TipoConflicto.FUERA_DE_HORARIO:
        return <AlertTriangle className="w-4 h-4" />
      case TipoConflicto.SOLAPAMIENTO_PARCIAL:
        return <AlertCircle className="w-4 h-4" />
      case TipoConflicto.DIA_INACTIVO:
        return <Calendar className="w-4 h-4" />
      case TipoConflicto.SIN_FRANJAS:
        return <Clock className="w-4 h-4" />
      default:
        return null
    }
  }

  // Texto legible para tipo de conflicto
  const getConflictTypeText = (tipo: TipoConflicto): string => {
    switch (tipo) {
      case TipoConflicto.FUERA_DE_HORARIO:
        return "Fuera de horario"
      case TipoConflicto.SOLAPAMIENTO_PARCIAL:
        return "Solapamiento parcial"
      case TipoConflicto.DIA_INACTIVO:
        return "Día inactivo"
      case TipoConflicto.SIN_FRANJAS:
        return "Sin franjas definidas"
      default:
        return tipo
    }
  }

  return (
    <div className="space-y-4">
      {/* Panel de estadísticas */}
      {statistics && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Resumen de conflictos
            </CardTitle>
            <CardDescription>
              Se encontraron {statistics.total} conflictos potenciales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-500">Total</div>
                <div className="mt-1 text-2xl font-semibold">{statistics.total}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <div className="text-sm font-medium text-green-600">Resueltos</div>
                <div className="mt-1 text-2xl font-semibold">{statistics.resueltos}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <div className="text-sm font-medium text-red-600">Pendientes</div>
                <div className="mt-1 text-2xl font-semibold">{statistics.pendientes}</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <div className="text-sm font-medium text-blue-600">Usuarios afectados</div>
                <div className="mt-1 text-2xl font-semibold">{Object.keys(statistics.porUsuario).length}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Progreso de resolución</div>
                <div className="text-sm text-slate-500">
                  {Math.round((statistics.resueltos / statistics.total) * 100)}%
                </div>
              </div>
              <Progress 
                value={(statistics.resueltos / statistics.total) * 100} 
                className="h-2"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium">Por tipo de conflicto</h4>
                <div className="space-y-1">
                  {Object.entries(statistics.porTipo)
                    .filter(([_, count]) => count > 0)
                    .sort(([_, countA], [__, countB]) => countB - countA)
                    .map(([tipo, count]) => (
                      <div key={tipo} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge 
                            variant="outline" 
                            className={getConflictTypeColor(tipo as TipoConflicto)}
                          >
                            {getConflictTypeText(tipo as TipoConflicto)}
                          </Badge>
                        </div>
                        <span className="text-sm">{count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              
              <div>
                <h4 className="mb-2 text-sm font-medium">Por día</h4>
                <div className="space-y-1">
                  {Object.entries(statistics.porDia)
                    .sort(([diaA, _], [diaB, __]) => {
                      const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
                      return dias.indexOf(diaA) - dias.indexOf(diaB)
                    })
                    .map(([dia, count]) => (
                      <div key={dia} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{traducirDia(dia)}</span>
                        <span className="text-sm">{count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveAll("restrictive")}
                disabled={statistics.pendientes === 0}
              >
                Resolver todos de forma restrictiva
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveAll("adaptive")}
                disabled={statistics.pendientes === 0}
              >
                Resolver todos adaptativamente
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Filtros y ordenación */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <Label className="mr-2 text-sm">Filtrar:</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Filtrar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los conflictos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="resolved">Resueltos</SelectItem>
                
                <Separator className="my-1" />
                <Label className="px-2 py-1 text-xs text-slate-500">Por tipo</Label>
                {Object.values(TipoConflicto).map(tipo => (
                  <SelectItem key={tipo} value={`tipo-${tipo}`}>
                    {getConflictTypeText(tipo)}
                  </SelectItem>
                ))}
                
                <Separator className="my-1" />
                <Label className="px-2 py-1 text-xs text-slate-500">Por día</Label>
                {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].map(dia => (
                  <SelectItem key={dia} value={`dia-${dia}`}>
                    {traducirDia(dia)}
                  </SelectItem>
                ))}
                
                {empleados.length > 0 && statistics?.porUsuario && Object.keys(statistics.porUsuario).length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <Label className="px-2 py-1 text-xs text-slate-500">Por usuario</Label>
                    {Object.entries(statistics.porUsuario)
                      .filter(([_, count]) => count > 0)
                      .sort(([userIdA], [userIdB]) => getUserName(userIdA).localeCompare(getUserName(userIdB)))
                      .map(([userId, count]) => (
                        <SelectItem key={userId} value={`usuario-${userId}`}>
                          {getUserName(userId)} ({count})
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-400" />
            <Label className="mr-2 text-sm">Ordenar:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Por día</SelectItem>
                <SelectItem value="type">Por tipo</SelectItem>
                <SelectItem value="user">Por usuario</SelectItem>
                <SelectItem value="status">Por estado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Badge variant="outline" className="text-slate-600 bg-slate-50">
            {filteredConflicts.length} conflictos
          </Badge>
        </div>
      </div>

      {/* Lista de conflictos */}
      {sortedConflicts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sortedConflicts.map(conflict => (
            <Card 
              key={conflict.id} 
              className={`overflow-hidden transition-all ${conflict.resuelto ? 'border-green-300 bg-green-50/30' : 'hover:shadow-md'}`}
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex justify-between">
                  <Badge
                    variant="outline"
                    className={getConflictTypeColor(conflict.tipo)}
                  >
                    <div className="flex items-center gap-1">
                      {getConflictTypeIcon(conflict.tipo)}
                      <span>{getConflictTypeText(conflict.tipo)}</span>
                    </div>
                  </Badge>
                  
                  {conflict.resuelto ? (
                    <Badge variant="outline" className="text-green-600 bg-green-100 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> Resuelto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 bg-amber-100 border-amber-200">
                      <Clock className="w-3 h-3 mr-1" /> Pendiente
                    </Badge>
                  )}
                </div>
                
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{getUserName(conflict.usuarioId)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="capitalize">{traducirDia(conflict.dia)}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-slate-600">{conflict.mensaje}</p>
                
                {conflict.resuelto && conflict.solucionAplicada && (
                  <div className="p-2 mt-2 text-xs border rounded bg-green-50/50 text-green-700 border-green-200">
                    <span className="font-medium">Solución: </span>
                    {conflict.solucionAplicada}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="p-2 pt-0">
                <div className="flex justify-end w-full gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setSelectedConflict(conflict)
                      setShowDetails(true)
                    }}
                  >
                    {conflict.resuelto ? 'Ver detalles' : 'Resolver'}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <h3 className="text-lg font-medium">No hay conflictos</h3>
            <p className="text-sm text-slate-500">
              {conflicts.length > 0 
                ? 'No hay conflictos que coincidan con los filtros seleccionados'
                : 'No se encontraron conflictos horarios para esta excepción'
              }
            </p>
          </div>
        </Card>
      )}

      {/* Modal de detalle/resolución */}
      {selectedConflict && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedConflict.resuelto ? 'Detalles del conflicto' : 'Resolver conflicto horario'}
              </DialogTitle>
              <DialogDescription>
                {selectedConflict.resuelto 
                  ? 'Este conflicto ya ha sido resuelto'
                  : 'Seleccione cómo resolver este conflicto horario'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Usuario</p>
                    <p className="text-sm">{getUserName(selectedConflict.usuarioId)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Día</p>
                    <p className="text-sm capitalize">{traducirDia(selectedConflict.dia)}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700">Tipo de conflicto</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getConflictTypeColor(selectedConflict.tipo)}`}
                  >
                    {getConflictTypeText(selectedConflict.tipo)}
                  </Badge>
                </div>
                
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700">Descripción</p>
                  <p className="mt-1 text-sm">{selectedConflict.mensaje}</p>
                </div>
                
                {selectedConflict.franjaUsuarioConflicto && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700">Horario del usuario</p>
                    <Badge variant="outline" className="mt-1 text-blue-600 bg-blue-50">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {selectedConflict.franjaUsuarioConflicto.inicio} - {selectedConflict.franjaUsuarioConflicto.fin}
                    </Badge>
                  </div>
                )}
                
                {selectedConflict.franjaExcepcionConflicto && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700">Horario de la excepción</p>
                    <Badge variant="outline" className="mt-1 text-purple-600 bg-purple-50">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {selectedConflict.franjaExcepcionConflicto.inicio} - {selectedConflict.franjaExcepcionConflicto.fin}
                    </Badge>
                  </div>
                )}
                
                {selectedConflict.resuelto && selectedConflict.solucionAplicada && (
                  <div className="p-2 mt-3 text-sm border rounded bg-green-50 text-green-700 border-green-200">
                    <p className="font-medium">Solución aplicada:</p>
                    <p>{selectedConflict.solucionAplicada}</p>
                  </div>
                )}
              </div>
              
              {!selectedConflict.resuelto && (
                <div>
                  <RadioGroup defaultValue="restrict">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="restrict" id="r1" />
                        <Label htmlFor="r1" className="cursor-pointer">Recortar al horario de la excepción</Label>
                      </div>
                      <div className="pl-6 text-xs text-slate-500">
                        El horario del usuario se ajustará para estar dentro del horario de la excepción.
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="remove" id="r2" />
                        <Label htmlFor="r2" className="cursor-pointer">Eliminar franja horaria</Label>
                      </div>
                      <div className="pl-6 text-xs text-slate-500">
                        Esta franja horaria se eliminará del horario del usuario durante este período.
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ignore" id="r3" />
                        <Label htmlFor="r3" className="cursor-pointer">Ignorar conflicto</Label>
                      </div>
                      <div className="pl-6 text-xs text-slate-500">
                        Mantener el horario del usuario tal como está, ignorando la excepción.
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetails(false)
                  setSelectedConflict(null)
                }}
              >
                {selectedConflict.resuelto ? 'Cerrar' : 'Cancelar'}
              </Button>
              
              {!selectedConflict.resuelto && (
                <Button
                  onClick={() => {
                    onResolveConflict(selectedConflict.id, "restrict")
                    setShowDetails(false)
                    setSelectedConflict(null)
                  }}
                >
                  Aplicar solución
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 