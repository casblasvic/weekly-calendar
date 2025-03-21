"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronDown, Pencil, Trash2, ShoppingCart, Package, User, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Wrench, ShoppingBag, SmilePlus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MockData } from "@/lib/mock-data"
import { useFamily } from "@/contexts/family-context"
import Link from "next/link"
import { useTarif } from "@/contexts/tarif-context"
import { Card, CardContent } from "@/components/ui/card"
import React from 'react'
import { useServicio } from "@/contexts/servicios-context"
import { useIVA } from "@/contexts/iva-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { getServiceImages, saveServiceImages, getServiceDocuments, saveServiceDocuments, deleteServiceImages, deleteServiceDocuments } from "@/mockData"

// Interfaces
interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
}

interface Servicio {
  id: string
  nombre: string
  codigo: string
  familia: string
  precio: number
  iva: string
  tipo: string
}

export interface TipoIVA {
  id: string;
  descripcion: string;
  porcentaje: number;
  tarifaId: string;
}

export default function ConfiguracionTarifa() {
  const router = useRouter()
  const params = useParams()
  // Extraer el id de forma segura
  const tarifaId = String(params?.id || "")
  
  const { families } = useFamily()
  const { getTarifaById, getFamiliasByTarifaId } = useTarif()
  const { getServiciosByTarifaId, eliminarServicio, getServicioById, actualizarServicio } = useServicio()
  const { getTiposIVAByTarifaId } = useIVA()
  
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [serviciosLista, setServiciosLista] = useState<Servicio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [familiaFiltro, setFamiliaFiltro] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)

  // Obtener las familias específicas de esta tarifa
  const tarifaFamilies = getFamiliasByTarifaId ? getFamiliasByTarifaId(tarifaId) : []

  // Obtener los tipos de IVA
  const tiposIVATarifa = useMemo(() => {
    return getTiposIVAByTarifaId(tarifaId);
  }, [tarifaId, getTiposIVAByTarifaId]);

  // Estado para el modal de confirmación de eliminación
  const [servicioAEliminar, setServicioAEliminar] = useState<string | null>(null);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [nombreServicioEliminar, setNombreServicioEliminar] = useState("");

  // Cargar datos de servicios y productos combinados
  useEffect(() => {
    // Obtener la tarifa
    const tarifaData = getTarifaById(tarifaId)
    setTarifa(tarifaData)
    
    // Obtener servicios reales del contexto
    const serviciosReales = getServiciosByTarifaId(tarifaId);
    
    // Log para depuración
    console.log("IVAs disponibles:", tiposIVATarifa);
    
    // Mapear los servicios con la información correcta
    const serviciosData = serviciosReales.map(s => {
      // Obtener información del IVA para mostrar el porcentaje
      const tipoIVA = tiposIVATarifa?.find(t => t.id === s.ivaId);
      
      // Crear una representación más robusta del IVA
      let ivaDisplay = "N/A";
      if (tipoIVA) {
        if (typeof tipoIVA.porcentaje === 'number') {
          ivaDisplay = `${tipoIVA.porcentaje}%`;
        } else if (tipoIVA.descripcion) {
          // Fallback a la descripción si no hay porcentaje
          ivaDisplay = tipoIVA.descripcion;
        }
      }
      
      return {
        id: s.id,
        nombre: s.nombre,
        codigo: s.codigo || '',
        familia: getFamiliaName(s.familiaId),
        precio: parseFloat(s.precioConIVA) || 0,
        iva: ivaDisplay,
        tipo: 'servicio'
      };
    });
    
    // Log para verificar el mapeo
    console.log("Servicios mapeados:", serviciosData);
    
    // Usar los productos mock mientras no exista el contexto de productos
    const mockProductos = MockData.productos || [];
    const productosData = mockProductos
      .filter(p => p.tarifaId === tarifaId)
      .map(p => ({
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo || '', // Incluir código del producto
        familia: getFamiliaName(p.familiaId),
        precio: p.precio,
        iva: p.iva,
        tipo: 'producto'
      }));
    
    const combinedData = [...serviciosData, ...productosData];
    setServiciosLista(combinedData);
    
    // Calcular el total de páginas
    setTotalPages(Math.ceil(combinedData.length / itemsPerPage));
  }, [tarifaId, itemsPerPage, getServiciosByTarifaId, tiposIVATarifa]);
  
  // Función para obtener el nombre de la familia
  const getFamiliaName = (familiaId: string) => {
    if (!familiaId) return "(Ninguna)";
    
    // Buscar en todas las familias disponibles (no solo en tarifaFamilies)
    const familia = families.find(f => f.id === familiaId);
    return familia ? (familia.name || familia.nombre) : "(Ninguna)";
  }

  // Funciones para manejar la creación de diferentes tipos
  const handleNuevoServicio = () => {
    console.log("Crear nuevo servicio")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`)
  }

  const handleNuevoProducto = () => {
    console.log("Crear nuevo producto")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-producto`)
  }

  const handleNuevoPaquete = () => {
    console.log("Crear nuevo paquete")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-paquete`)
  }

  // Navegación a las diferentes secciones
  const navegarATarifasPlanas = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/tarifas-planas`)
  }

  const navegarAFamilias = () => {
    router.push(`/configuracion/tarifas/familias`)
  }

  const navegarAHerencias = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/herencias`)
  }

  const navegarATiposIVA = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/iva`)
  }

  // Funciones para la paginación
  const goToFirstPage = () => setCurrentPage(1)
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const goToLastPage = () => setCurrentPage(totalPages)

  // Aplicar filtros y ordenación
  const serviciosFiltrados = useMemo(() => {
    let filteredItems = [...serviciosLista];
    
    // Filtro por término de búsqueda (en nombre o código)
    if (searchTerm) {
      filteredItems = filteredItems.filter(item => 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro por tipo
    if (tipoFiltro && tipoFiltro !== "all") {
      filteredItems = filteredItems.filter(item => 
        item.tipo === tipoFiltro
      );
    }
    
    // Filtro por familia
    if (familiaFiltro && familiaFiltro !== "all") {
      filteredItems = filteredItems.filter(item => 
        item.familia === familiaFiltro
      );
    }
    
    // Ordenación
    if (sortConfig) {
      filteredItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof typeof a];
        const valB = b[sortConfig.key as keyof typeof b];
        
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredItems;
  }, [serviciosLista, searchTerm, tipoFiltro, familiaFiltro, sortConfig]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = serviciosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  // Cambiar de página
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Función para solicitar ordenamiento
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };
  
  // Obtener icono de ordenación
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} />
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />
  }

  // Cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuRef])

  // En la sección de acciones de la tabla donde está el botón de editar
  const handleEditarServicio = (servicioId: string) => {
    // Añadir logs de depuración
    console.log(`Editando servicio con ID: ${servicioId} de la tarifa ${tarifaId}`);
    
    try {
      // Verificar que el servicio existe antes de navegar
      const servicioExistente = getServiciosByTarifaId(tarifaId).find(s => s.id === servicioId);
      
      if (servicioExistente) {
        console.log("Servicio encontrado:", servicioExistente);
        
        // Verificar que el tarifaId es correcto
        if (servicioExistente.tarifaId !== tarifaId) {
          console.warn(`El servicio tiene tarifaId ${servicioExistente.tarifaId} pero pertenece a la tarifa ${tarifaId}. Corrigiendo...`);
          
          // Corregir el tarifaId del servicio
          actualizarServicio(servicioId, { 
            ...servicioExistente, 
            tarifaId: tarifaId 
          });
          
          console.log("TarifaId del servicio corregido.");
        }
        
        // Verificar si tiene documento adjunto pero no está guardado correctamente
        const docs = getServiceDocuments(servicioId);
        console.log(`El servicio tiene ${docs.length} documentos adjuntos.`);
        
        // Navegar a la página de edición del servicio con el ID correcto
        const rutaEdicion = `/configuracion/tarifas/${tarifaId}/nuevo-servicio?servicioId=${servicioId}`;
        console.log("Navegando a:", rutaEdicion);
        router.push(rutaEdicion);
      } else {
        console.error(`Error: No se encontró el servicio con ID ${servicioId}`);
        toast({
          title: "Error",
          description: "No se pudo encontrar el servicio para editar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al editar servicio:", error);
      toast({
        title: "Error",
        description: "Se produjo un error al intentar editar el servicio",
        variant: "destructive",
      });
    }
  };

  // Función para manejar la eliminación de un servicio
  const handleEliminarServicio = (servicioId: string, nombre: string) => {
    setServicioAEliminar(servicioId);
    setNombreServicioEliminar(nombre);
    setConfirmEliminarOpen(true);
  };
  
  // Función para confirmar la eliminación
  const confirmarEliminacion = () => {
    if (servicioAEliminar) {
      try {
        // Obtener imágenes y documentos antes de eliminar el servicio
        const tieneImagenes = deleteServiceImages(servicioAEliminar);
        const tieneDocumentos = deleteServiceDocuments(servicioAEliminar);
        
        // Eliminar el servicio
        eliminarServicio(servicioAEliminar);
        
        // Actualizar la lista de servicios después de eliminar
        const nuevosServicios = serviciosLista.filter(s => s.id !== servicioAEliminar);
        setServiciosLista(nuevosServicios);
        
        // Calcular el total de páginas
        setTotalPages(Math.ceil(nuevosServicios.length / itemsPerPage));
        
        // Si la página actual ya no tiene elementos y no es la primera página,
        // volver a la página anterior
        if (currentItems.length <= 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
        
        // Preparar mensaje incluyendo info sobre archivos
        let mensaje = `El servicio "${nombreServicioEliminar}" ha sido eliminado correctamente.`;
        if (tieneImagenes || tieneDocumentos) {
          mensaje += ` También se han eliminado ${tieneImagenes ? 'imágenes' : ''}${tieneImagenes && tieneDocumentos ? ' y ' : ''}${tieneDocumentos ? 'documentos' : ''} asociados.`;
        }
        
        toast({
          title: "Servicio eliminado",
          description: mensaje,
        });
      } catch (error) {
        console.error("Error al eliminar servicio:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el servicio. Inténtelo de nuevo.",
          variant: "destructive",
        });
      } finally {
        setConfirmEliminarOpen(false);
        setServicioAEliminar(null);
        setNombreServicioEliminar("");
      }
    }
  };

  // Escuchar eventos de actualización de servicios
  useEffect(() => {
    const handleServiciosUpdated = (event: any) => {
      const { tarifaId: eventTarifaId, action } = event.detail;
      
      console.log(`Evento servicios-updated recibido: ${action} en tarifa ${eventTarifaId}`);
      
      // Si la actualización es para esta tarifa, recargar servicios
      if (eventTarifaId === tarifaId) {
        console.log("Recargando servicios para esta tarifa...");
        
        // Obtener servicios reales del contexto
        const serviciosReales = getServiciosByTarifaId(tarifaId);
        console.log("Servicios obtenidos después del evento:", serviciosReales);
        
        // Hacer el mapeo igual que en el efecto principal
        const serviciosData = serviciosReales.map(s => {
          const tipoIVA = tiposIVATarifa?.find(t => t.id === s.ivaId);
          
          let ivaDisplay = "N/A";
          if (tipoIVA) {
            if (typeof tipoIVA.porcentaje === 'number') {
              ivaDisplay = `${tipoIVA.porcentaje}%`;
            } else if (tipoIVA.descripcion) {
              ivaDisplay = tipoIVA.descripcion;
            }
          }
          
          return {
            id: s.id,
            nombre: s.nombre,
            codigo: s.codigo || '',
            familia: getFamiliaName(s.familiaId),
            precio: parseFloat(s.precioConIVA) || 0,
            iva: ivaDisplay,
            tipo: 'servicio'
          };
        });
        
        // Mantener los productos como estaban
        const productosExistentes = serviciosLista.filter(item => item.tipo === 'producto');
        
        // Actualizar la lista combinada
        const combinedData = [...serviciosData, ...productosExistentes];
        setServiciosLista(combinedData);
        setTotalPages(Math.ceil(combinedData.length / itemsPerPage));
      }
    };
    
    // Registrar el listener
    window.addEventListener('servicios-updated', handleServiciosUpdated);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('servicios-updated', handleServiciosUpdated);
    };
  }, [tarifaId, getServiciosByTarifaId, tiposIVATarifa, itemsPerPage, serviciosLista]);

  return (
    <div className="container mx-auto p-6 mt-16">
      {/* Card con buscador y botones de acciones */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda - Filtros de búsqueda */}
            <div className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <Input
                  id="nombre"
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <Select value={tipoFiltro || "all"} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todos)</SelectItem>
                    <SelectItem value="servicio">Servicios</SelectItem>
                    <SelectItem value="producto">Productos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="familia" className="block text-sm font-medium text-gray-700 mb-1">
                  Familia
                </label>
                <Select value={familiaFiltro || "all"} onValueChange={setFamiliaFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todas)</SelectItem>
                    {tarifaFamilies.map((familia) => (
                      <SelectItem key={familia.id} value={familia.name || familia.nombre}>
                        {familia.name || familia.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botones de Exportar y Buscar */}
              <div className="flex space-x-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  Exportar
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-purple-700 hover:bg-purple-800 flex-1"
                  onClick={() => {
                    // Reiniciar la página al buscar
                    setCurrentPage(1);
                  }}
                >
                  Buscar
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verProductosDeshabilitados"
                  checked={showDisabled}
                  onCheckedChange={(checked) => setShowDisabled(!!checked)}
                />
                <label htmlFor="verProductosDeshabilitados" className="text-sm">
                  Ver productos deshabilitados
                </label>
              </div>
            </div>

            {/* Columna derecha - Botones para añadir elementos */}
            <div className="space-y-4">
              {/* Botón Nuevo con menú desplegable */}
              <div className="relative" ref={menuRef}>
                <Button 
                  variant="default" 
                  className="w-full bg-purple-700 hover:bg-purple-800"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-full bg-white rounded-md shadow-lg z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoServicio}
                      >
                        <div className="flex items-center">
                          <SmilePlus className="mr-3 h-5 w-5 text-purple-600" />
                          Servicio
                        </div>
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoProducto}
                      >
                        <div className="flex items-center">
                          <ShoppingCart className="mr-3 h-5 w-5 text-blue-600" />
                          Producto
                        </div>
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoPaquete}
                      >
                        <div className="flex items-center">
                          <Package className="mr-3 h-5 w-5 text-green-600" />
                          Paquete
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={navegarATarifasPlanas}>
                  Tarifas planas
                </Button>
                <Button variant="outline" className="w-full" onClick={navegarAFamilias}>
                  Familias
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={navegarAHerencias}>
                  Herencias
                </Button>
                <Button variant="outline" className="w-full" onClick={navegarATiposIVA}>
                  Tipos de IVA
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de tabla con botones de exportar y buscar */}
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Listado de productos y servicios: {tarifa?.nombre || ""}</h2>
        </div>
        <div className="flex space-x-2">
          {/* Botones eliminados para evitar duplicidad */}
        </div>
      </div>

      {/* Selector de elementos por página */}
      <div className="flex justify-end mb-4 items-center space-x-2">
        <span className="text-sm text-gray-600">Mostrar</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="50" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">elementos por página</span>
      </div>

      {/* Tabla de servicios */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <span>Tipo</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('familia')}
              >
                <div className="flex items-center">
                  Familia
                  <span className="ml-1">{getSortIcon('familia')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('nombre')}
              >
                <div className="flex items-center">
                  Nombre
                  <span className="ml-1">{getSortIcon('nombre')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('codigo')}
              >
                <div className="flex items-center">
                  Código
                  <span className="ml-1">{getSortIcon('codigo')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('precio')}
              >
                <div className="flex items-center justify-end">
                  Precio
                  <span className="ml-1">{getSortIcon('precio')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('iva')}
              >
                <div className="flex items-center justify-end">
                  IVA
                  <span className="ml-1">{getSortIcon('iva')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((servicio) => (
              <tr 
                key={servicio.id} 
                className={`hover:bg-purple-100 transition-colors ${
                  servicio.tipo === 'servicio' ? 'bg-white' : 
                  servicio.tipo === 'producto' ? 'bg-blue-50' : 
                  'bg-green-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {servicio.tipo === 'servicio' ? (
                      <SmilePlus size={18} className="text-purple-600" />
                    ) : servicio.tipo === 'producto' ? (
                      <ShoppingCart size={18} className="text-blue-600" />
                    ) : (
                      <Package size={18} className="text-green-600" />
                    )}
                    <span className="ml-2 text-xs font-medium text-gray-500 uppercase">
                      {servicio.tipo}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{servicio.familia || "(Ninguna)"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{servicio.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{servicio.codigo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {typeof servicio.precio === 'number' ? servicio.precio.toFixed(2) : servicio.precio}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{servicio.iva}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditarServicio(servicio.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEliminarServicio(servicio.id, servicio.nombre)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-900 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron servicios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, serviciosFiltrados.length)} de {serviciosFiltrados.length} elementos
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToFirstPage} 
            disabled={currentPage === 1}
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPreviousPage} 
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="px-4 py-2 text-sm">
            Página {currentPage} de {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextPage} 
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToLastPage} 
            disabled={currentPage === totalPages}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        <Button variant="outline" onClick={() => router.push("/configuracion/tarifas")}>
          Volver
        </Button>
        <Button variant="outline">Ayuda</Button>
      </div>

      {/* Modal de confirmación para eliminar servicio */}
      <Dialog open={confirmEliminarOpen} onOpenChange={setConfirmEliminarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmar eliminación</DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar el servicio <span className="font-semibold">"{nombreServicioEliminar}"</span>?
              <p className="mt-2">
                Esta acción también eliminará todas las imágenes y documentos asociados al servicio.
              </p>
              <p className="mt-2 text-red-500 font-medium">
                Esta acción no se puede deshacer.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmEliminarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminacion}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

