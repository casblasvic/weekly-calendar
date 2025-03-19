"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, ArrowUpDown, ChevronUp, ChevronDown, AlertCircle, HelpCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useServicio } from "@/contexts/servicios-context"
import { useConsumoServicio } from "@/contexts/consumo-servicio-context"
import { HelpButton } from "@/components/ui/help-button"
import React from 'react'

// Interfaz para representar un consumo
interface Consumo {
  id: string
  servicioId: string
  productoId: string
  productoNombre: string
  cantidad: number
  orden: number
}

// Interfaz para representar un producto
interface Producto {
  id: string
  nombre: string
  codigo: string
  stock: number
}

// Generar ID único
const generateId = () => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Productos de ejemplo (temporales hasta que se implemente el contexto)
const productosEjemplo: Producto[] = [
  { id: "prod-1", nombre: "Gel frío", codigo: "GF001", stock: 100 },
  { id: "prod-2", nombre: "Crema hidratante", codigo: "CH002", stock: 50 },
  { id: "prod-3", nombre: "Gel conductor", codigo: "GC003", stock: 75 },
  { id: "prod-4", nombre: "Aceite esencial", codigo: "AE004", stock: 30 },
  { id: "prod-5", nombre: "Loción calmante", codigo: "LC005", stock: 45 },
];

export default function ConsumosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Usar searchParams para obtener el ID del servicio
  const servicioId = searchParams.get('servicioId')
  
  // Obtener datos del servicio desde el contexto
  const { servicioActual, guardarServicio, validarCamposObligatorios, setServicioActual, getServicioById } = useServicio()
  const { consumos, agregarConsumo, eliminarConsumo, actualizarConsumo, reordenarConsumos } = useConsumoServicio()
  
  // Función temporal para obtener productos por tarifa
  const getProductosByTarifaId = (tarifaId: string) => {
    // En una implementación real, esta función filtraría productos por tarifaId
    return productosEjemplo;
  }
  
  // Obtener productos de la tarifa actual
  const tarifaId = params.id
  const productosDisponibles = getProductosByTarifaId(tarifaId)
  
  // Estados
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentConsumo, setCurrentConsumo] = useState<Partial<Consumo>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [alternativas, setAlternativas] = useState<Array<{productoId: string, cantidad: number}>>([])
  
  // Modales de validación
  const [showCamposObligatoriosModal, setShowCamposObligatoriosModal] = useState(false)
  const [showConfirmacionGuardarModal, setShowConfirmacionGuardarModal] = useState(false)
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([])
  
  // Obtener nombre del servicio del contexto
  const nombreServicio = servicioActual?.nombre || "Servicio sin nombre"
  
  // Estilos para botones
  const buttonPrimaryClass = "bg-purple-600 hover:bg-purple-700 text-white"
  
  // Función para solicitar ordenamiento
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Obtener el ícono de ordenación para la columna
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };
  
  // Ordenar consumos
  const sortedConsumos = [...(consumos || [])].sort((a, b) => {
    if (!sortConfig) return a.orden - b.orden;
    
    const key = sortConfig.key as keyof Consumo;
    
    if (a[key] < b[key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[key] > b[key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
  
  // Manejar click en "Volver"
  const handleVolver = () => {
    // Si tenemos un ID de servicio, volvemos a la edición de ese servicio
    if (servicioActual?.id) {
      router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio?servicioId=${servicioActual.id}`);
    } else if (servicioId) {
      router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio?servicioId=${servicioId}`);
    } else {
      // En caso de que no haya ID (caso poco probable), volvemos a la página de nuevo servicio
      router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`);
    }
  }
  
  // Verificar datos obligatorios antes de permitir añadir consumos
  const verificarDatosObligatorios = () => {
    const { valido, camposFaltantes } = validarCamposObligatorios();
    
    if (!valido) {
      setCamposFaltantes(camposFaltantes);
      setShowCamposObligatoriosModal(true);
      return false;
    }
    
    if (!servicioActual?.id) {
      setShowConfirmacionGuardarModal(true);
      return false;
    }
    
    return true;
  }
  
  // Confirmar creación automática del servicio
  const confirmarCreacionServicio = () => {
    guardarServicio();
    setShowConfirmacionGuardarModal(false);
    // Abrir el diálogo para añadir consumo después de guardar
    setIsEditing(false);
    setCurrentConsumo({});
    setAlternativas([]);
    setIsDialogOpen(true);
  }
  
  // Abrir modal para nuevo consumo
  const handleNuevoConsumo = () => {
    if (!verificarDatosObligatorios()) return;
    
    setIsEditing(false);
    setCurrentConsumo({});
    setAlternativas([]);
    setIsDialogOpen(true);
  }
  
  // Abrir modal para editar consumo
  const handleEditarConsumo = (consumo: Consumo) => {
    setIsEditing(true);
    setCurrentConsumo(consumo);
    setAlternativas([]);
    setIsDialogOpen(true);
  }
  
  // Añadir alternativa en el modal
  const handleAnadirAlternativa = () => {
    setAlternativas([...alternativas, { productoId: "", cantidad: 1 }]);
  }
  
  // Eliminar alternativa del modal
  const handleEliminarAlternativa = (index: number) => {
    const nuevasAlternativas = [...alternativas];
    nuevasAlternativas.splice(index, 1);
    setAlternativas(nuevasAlternativas);
  }
  
  // Actualizar alternativa
  const handleAlternativaChange = (index: number, field: 'productoId' | 'cantidad', value: string | number) => {
    const nuevasAlternativas = [...alternativas] as Array<{productoId: string, cantidad: number}>;
    if (field === 'productoId') {
      nuevasAlternativas[index].productoId = value as string;
    } else {
      nuevasAlternativas[index].cantidad = value as number;  
    }
    setAlternativas(nuevasAlternativas);
  }
  
  // Guardar consumo
  const handleGuardarConsumo = () => {
    if (!currentConsumo.productoId || !currentConsumo.cantidad) return;
    
    const productoSeleccionado = productosDisponibles.find(p => p.id === currentConsumo.productoId);
    
    const consumoCompleto: Consumo = {
      id: currentConsumo.id || generateId(),
      servicioId: servicioActual?.id || "",
      productoId: currentConsumo.productoId,
      productoNombre: productoSeleccionado?.nombre || "Producto desconocido",
      cantidad: Number(currentConsumo.cantidad),
      orden: currentConsumo.orden || (consumos?.length || 0) + 1
    };
    
    if (isEditing) {
      // Actualizar consumo existente
      actualizarConsumo(consumoCompleto);
    } else {
      // Añadir nuevo consumo
      agregarConsumo(consumoCompleto);
    }
    
    setIsDialogOpen(false);
  }
  
  // Eliminar consumo
  const handleEliminarConsumo = (id: string) => {
    eliminarConsumo(id);
  }
  
  // Cambiar orden hacia arriba
  const handleMoverArriba = (id: string) => {
    reordenarConsumos(id, 'arriba');
  }
  
  // Cambiar orden hacia abajo
  const handleMoverAbajo = (id: string) => {
    reordenarConsumos(id, 'abajo');
  }

  useEffect(() => {
    // Si el servicio no está cargado pero tenemos un ID, intentar cargarlo
    if (servicioId && (!servicioActual || servicioActual.id !== servicioId)) {
      const servicio = getServicioById(servicioId);
      if (servicio) {
        setServicioActual(servicio);
      }
    }
  }, [servicioId, servicioActual]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 pb-24 relative min-h-screen">
      <h1 className="text-xl font-semibold mb-2">Control de consumo</h1>
      <div className="flex items-center mb-6">
        <p className="text-gray-500 mr-2">Listado de consumos:</p>
        <span className="text-purple-700 font-medium">{nombreServicio}</span>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-medium">Productos consumidos</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="w-12 cursor-pointer"
                    onClick={() => requestSort('orden')}
                  >
                    <div className="flex items-center">
                      Orden
                      <span className="ml-1">{getSortIcon('orden')}</span>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => requestSort('productoNombre')}
                  >
                    <div className="flex items-center">
                      Producto
                      <span className="ml-1">{getSortIcon('productoNombre')}</span>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-right"
                    onClick={() => requestSort('cantidad')}
                  >
                    <div className="flex items-center justify-end">
                      Cantidad
                      <span className="ml-1">{getSortIcon('cantidad')}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedConsumos.map((consumo, index) => (
                  <TableRow key={consumo.id} className="hover:bg-purple-50/50">
                    <TableCell className="font-medium">{consumo.orden}</TableCell>
                    <TableCell>{consumo.productoNombre}</TableCell>
                    <TableCell className="text-right">{consumo.cantidad}</TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoverArriba(consumo.id)}
                          disabled={index === 0}
                          className="h-8 w-8 text-gray-600 hover:text-purple-600"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoverAbajo(consumo.id)}
                          disabled={index === (consumos?.length || 0) - 1}
                          className="h-8 w-8 text-gray-600 hover:text-purple-600"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditarConsumo(consumo)}
                          className="h-8 w-8 text-purple-600 hover:text-purple-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminarConsumo(consumo.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!consumos || consumos.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                      No hay consumos configurados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Botones fijos en la parte inferior */}
      <div className="fixed bottom-0 right-0 p-6 flex justify-end gap-3">
        <Button
          variant="outline"
          className="bg-white border border-gray-300"
          onClick={handleVolver}
        >
          Volver
        </Button>
        <Button
          variant="default"
          className={buttonPrimaryClass}
          onClick={handleNuevoConsumo}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Consumo
        </Button>
        <HelpButton content="Ayuda para la gestión de consumos" />
      </div>
      
      {/* Modal para añadir/editar consumo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar consumo" : "Añadir nuevo consumo"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <Select
                  value={currentConsumo.productoId}
                  onValueChange={(value) => setCurrentConsumo({...currentConsumo, productoId: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productosDisponibles.map(producto => (
                      <SelectItem key={producto.id} value={producto.id}>
                        {producto.nombre} ({producto.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <Input
                  type="number"
                  min="1"
                  value={currentConsumo.cantidad || ""}
                  onChange={(e) => setCurrentConsumo({...currentConsumo, cantidad: Number(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Alternativas</h3>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleAnadirAlternativa}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Añadir alternativa
                </Button>
              </div>
              
              {alternativas.length > 0 ? (
                <div className="space-y-3">
                  {alternativas.map((alt, idx) => (
                    <div key={idx} className="flex items-end space-x-2 border p-2 rounded-md">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Producto alternativo
                        </label>
                        <Select
                          value={alt.productoId}
                          onValueChange={(value) => handleAlternativaChange(idx, 'productoId', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {productosDisponibles.map(producto => (
                              <SelectItem key={producto.id} value={producto.id}>
                                {producto.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Cantidad
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={alt.cantidad}
                          onChange={(e) => handleAlternativaChange(idx, 'cantidad', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarAlternativa(idx)}
                        className="h-8 w-8 text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 border rounded-md p-3 bg-gray-50">
                  No hay alternativas configuradas
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className={buttonPrimaryClass}
              onClick={handleGuardarConsumo}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de error para campos obligatorios */}
      <Dialog open={showCamposObligatoriosModal} onOpenChange={setShowCamposObligatoriosModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Datos incompletos
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="mb-2">Debe completar los siguientes campos obligatorios antes de añadir consumos:</p>
            <ul className="list-disc pl-5 mb-4">
              {camposFaltantes.map((campo, index) => (
                <li key={index} className="text-red-600">{campo}</li>
              ))}
            </ul>
            <p>Por favor, complete estos campos en la pantalla de creación del servicio.</p>
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => setShowCamposObligatoriosModal(false)}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmación para creación automática */}
      <Dialog open={showConfirmacionGuardarModal} onOpenChange={setShowConfirmacionGuardarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Guardar servicio
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p>El servicio no ha sido guardado. Se creará automáticamente para poder asociar consumos.</p>
            <p className="mt-2 font-medium">¿Desea continuar?</p>
          </DialogDescription>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setShowConfirmacionGuardarModal(false)}>
              Cancelar
            </Button>
            <Button 
              className={buttonPrimaryClass}
              onClick={confirmarCreacionServicio}
            >
              Guardar y continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}