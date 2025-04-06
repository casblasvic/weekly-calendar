"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronDown, Pencil, Trash2, ShoppingCart, Package, User, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Wrench, ShoppingBag, SmilePlus, Plus, Edit3, Building2, AlertCircle, X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFamily } from "@/contexts/family-context"
import Link from "next/link"
import { useTarif } from "@/contexts/tarif-context"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import React from 'react'
import { useServicio } from "@/contexts/servicios-context"
import { useIVA } from "@/contexts/iva-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useClinic } from "@/contexts/clinic-context"
import { Tarifa, Servicio } from "@/services/data/models/interfaces"
import { toast as sonnerToast } from "sonner"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { VATType, Category } from '@prisma/client'

// Interfaz para el formato esperado por la tabla de servicios (ajustada)
interface ServicioFormateado {
  id: string;
  nombre: string;       // Usar 'nombre' para display si quieres, pero mapear desde 'name'
  codigo: string;
  familia: string;      // Ahora contendrá el categoryId o nombre de categoría global
  precio: number;      // Usar 'precio' numérico
  iva: string;         // Esto puede necesitar recalcularse o venir de la API
  tipo: 'Servicio';
  deshabilitado: boolean;
}

export default function ConfiguracionTarifa() {
  const router = useRouter()
  const params = useParams()
  const tarifaId = params.id as string
  
  const { families } = useFamily()
  const { getTarifaById, updateTarifa, isLoading } = useTarif()
  const { getServiciosByTarifaId, eliminarServicio, getServicioById, actualizarServicio, getServiceImages, saveServiceImages, getServiceDocuments, saveServiceDocuments, deleteServiceImages, deleteServiceDocuments } = useServicio()
  const { getTiposIVAByTarifaId } = useIVA()
  const { clinics } = useClinic()
  
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [serviciosLista, setServiciosLista] = useState<Servicio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [familiaFiltro, setFamiliaFiltro] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  
  // Estado para editar la tarifa
  const [editingTarifa, setEditingTarifa] = useState(false)
  const [tarifaEditada, setTarifaEditada] = useState<Tarifa | null>(null)
  
  // Estado para controlar el modal de edición de clínicas
  const [editingClinics, setEditingClinics] = useState(false)
  const [includeDisabledClinics, setIncludeDisabledClinics] = useState(false)
  
  // Estado para almacenar los servicios cargados
  const [serviciosTarifa, setServiciosTarifa] = useState<Servicio[]>([])
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)

  // Obtener los tipos de IVA
  const tiposIVATarifa = getTiposIVAByTarifaId ? getTiposIVAByTarifaId(tarifaId) : []

  // Estado para los servicios formateados
  const [serviciosFormateados, setServiciosFormateados] = useState<ServicioFormateado[]>([]);
  
  // Estado para el modal de confirmación de eliminación
  const [servicioAEliminar, setServicioAEliminar] = useState<string | null>(null);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [nombreServicioEliminar, setNombreServicioEliminar] = useState("");

  // Cargar datos iniciales de la tarifa (Esto está bien)
  useEffect(() => {
    const loadTarifa = async () => {
      if (tarifaId) {
        const tarifaData = await getTarifaById(tarifaId);
        if (tarifaData) {
          setTarifa(tarifaData);
          setTarifaEditada(tarifaData);
        } else {
          sonnerToast.error("Tarifa no encontrada"); 
          router.push("/configuracion/tarifas");
        }
      }
    };
    loadTarifa();
  }, [tarifaId, getTarifaById, router]);

  // Detectar cambios (Esto está bien)
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (!tarifaEditada || !tarifa) return;
    const hasChanged = JSON.stringify(tarifa) !== JSON.stringify(tarifaEditada);
    setIsDirty(hasChanged);
  }, [tarifa, tarifaEditada]);

  // Cargar y formatear servicios
  useEffect(() => {
    const loadServicios = async () => {
      try {
        if (tarifaId) {
          console.log("Cargando servicios para tarifa:", tarifaId);
          // Usar la función del contexto
          const serviciosData = await getServiciosByTarifaId(tarifaId); 
          if (Array.isArray(serviciosData)) {
            setServiciosTarifa(serviciosData);
            console.log("Servicios cargados:", serviciosData.length);
            
            // Formatear para la vista de tabla (CORREGIDO)
            const serviciosFormateados = serviciosData.map(servicio => ({
              id: String(servicio.id),
              nombre: servicio.name, // Usar name
              codigo: servicio.code || '', // Usar code
              familia: servicio.categoryId || '(Sin categoría)', // Usar categoryId directamente o buscar nombre global
              precio: servicio.price || 0, // Usar price
              iva: "N/A", // TODO: Calcular o obtener IVA correcto
              tipo: 'Servicio',
              deshabilitado: !servicio.isActive // Usar isActive negado
            })) as ServicioFormateado[];
            
            setServiciosFormateados(serviciosFormateados);
            setTotalPages(Math.ceil(serviciosFormateados.length / itemsPerPage));
          } else {
            console.error("getServiciosByTarifaId no devolvió un array:", serviciosData);
            setServiciosTarifa([]);
            setServiciosFormateados([]);
          }
        }
      } catch (error) {
        console.error("Error al cargar servicios:", error);
        setServiciosTarifa([]);
        setServiciosFormateados([]);
        sonnerToast.error("Error al cargar los servicios de la tarifa."); 
      }
    };
    
    if (tarifa) {
      loadServicios();
    }
  }, [tarifaId, getServiciosByTarifaId, itemsPerPage, tarifa]);

  // Efecto para resetear includeDisabledClinics cuando se abre el modal
  useEffect(() => {
    if (editingClinics) {
      setIncludeDisabledClinics(false);
    }
  }, [editingClinics]);

  // Cargar la tarifa completa al montar el componente y CUANDO los datos estén listos
  useEffect(() => {
    const loadTarifaCompleta = async () => {
      try {
        if (!tarifa) {
          console.log("Esperando a que se cargue la tarifa...");
          return;
        }
        if (tarifaId) {
          const tarifaData = await getTarifaById(tarifaId);
          if (tarifaData) {
            console.log("Tarifa cargada (datos listos):");
            setTarifa(tarifaData);
            setTarifaEditada(tarifaData);
          } else {
            console.error("No se encontró la tarifa con ID:", tarifaId);
            router.push('/configuracion/tarifas');
          }
        }
      } catch (error) {
        console.error("Error al cargar la tarifa completa:", error);
      }
    };
    loadTarifaCompleta();
  }, [tarifaId, getTarifaById, router, tarifa]);

  // Funciones para manejar la creación de diferentes tipos
  const handleNuevoServicio = () => {
    console.log("Crear nuevo servicio")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/servicio/nuevo`)
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
    if (tarifaId) {
      router.push(`/configuracion/tarifas/${tarifaId}/familias`)
    } else {
      console.error("No se puede navegar a familias sin un ID de tarifa.")
      sonnerToast("Error: No se ha cargado una tarifa.", { 
          description: "No se puede acceder a la gestión de familias sin una tarifa seleccionada.",
          action: { label: 'Cerrar', onClick: () => {} }
      });
    }
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
    let filteredItems = [...serviciosFormateados];
    
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
  }, [serviciosFormateados, searchTerm, tipoFiltro, familiaFiltro, sortConfig]);

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

  // Función para editar un servicio
  const handleEditarServicio = (servicioId: string) => {
    try {
      router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}`);
    } catch (error) {
      console.error("Error al navegar a edición de servicio:", error);
    }
  };

  // Función para manejar la eliminación de un servicio
  const handleEliminarServicio = (servicioId: string, nombre: string) => {
    setServicioAEliminar(servicioId);
    setNombreServicioEliminar(nombre);
    setConfirmEliminarOpen(true);
  };
  
  // Confirmar eliminación de servicio
  const confirmarEliminacion = async () => {
    if (!servicioAEliminar) return;
    
    try {
      console.log("Eliminando servicio:", servicioAEliminar);
      
      // Eliminar imágenes del servicio
      const imagenes = await getServiceImages(servicioAEliminar);
      if (imagenes && imagenes.length > 0) {
        await deleteServiceImages(servicioAEliminar);
      }
      
      // Eliminar documentos del servicio
      const documentos = await getServiceDocuments(servicioAEliminar);
      if (documentos && documentos.length > 0) {
        await deleteServiceDocuments('servicio', servicioAEliminar);
      }
      
      // Eliminar el servicio
      const resultado = await eliminarServicio(servicioAEliminar);
      
      if (resultado) {
        // Actualizar la lista de servicios
        const nuevoServiciosTarifa = await getServiciosByTarifaId(tarifaId);
        setServiciosTarifa(nuevoServiciosTarifa);
        
        // Actualizar la vista de tabla
        const serviciosActualizados = nuevoServiciosTarifa.map(servicio => ({
          id: String(servicio.id),
          nombre: servicio.name,
          codigo: servicio.code || '',
          familia: servicio.categoryId || '(Sin categoría)',
          precio: servicio.price || 0,
          iva: "N/A",
          tipo: 'Servicio',
          deshabilitado: !servicio.isActive
        })) as ServicioFormateado[];
        
        setServiciosFormateados(serviciosActualizados);
        setTotalPages(Math.ceil(serviciosActualizados.length / itemsPerPage));
        
        // Mostrar notificación
        toast({
          title: "Servicio eliminado",
          description: `El servicio "${nombreServicioEliminar}" ha sido eliminado correctamente.`,
        });
      } else {
        console.error("No se pudo eliminar el servicio:", servicioAEliminar);
        toast({
          title: "Error",
          description: "No se pudo eliminar el servicio.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al eliminar servicio:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el servicio.",
        variant: "destructive",
      });
    } finally {
      // Limpiar estado y cerrar modal
      setServicioAEliminar(null);
      setNombreServicioEliminar("");
      setConfirmEliminarOpen(false);
    }
  };

  // Funciones simple para manejar eventos de servicio (evita el error)
  const handleServiciosUpdated = () => {
    console.log("Evento de actualización de servicios recibido");
  };

  return (
    <div className="flex flex-col p-4 py-8">
      {/* Contenedor del título y acciones */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold">{tarifa ? tarifa.name : 'Cargando Tarifa...'}</h1>
          {tarifa && (
            <Button variant="ghost" size="icon" onClick={() => setEditingTarifa(true)} className="text-gray-500 hover:text-purple-600">
              <Edit3 className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.back()} className="bg-white">
            Volver
          </Button>
        </div>
      </div>

      {/* Card con buscador y botones de acciones */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Columna izquierda - Filtros de búsqueda */}
            <div className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block mb-1 text-sm font-medium text-gray-700">
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
                <label htmlFor="tipo" className="block mb-1 text-sm font-medium text-gray-700">
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
                <label htmlFor="familia" className="block mb-1 text-sm font-medium text-gray-700">
                  Familia
                </label>
                <Select value={familiaFiltro || "all"} onValueChange={setFamiliaFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todas)</SelectItem>
                    {families.map((familia) => (
                      <SelectItem key={familia.id} value={familia.name}>
                        {familia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Eliminamos el div anterior y colocamos uno nuevo sin mt-4 */}
              <div className="flex space-x-2"> {/* Sin margen superior explícito */}
                <Button variant="outline" size="sm">
                  Exportar
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-purple-700 hover:bg-purple-800"
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

            {/* Columna derecha - Botones de acción */}
            <div className="space-y-4">
              {/* Botón Nuevo con menú desplegable */}
              <div className="relative" ref={menuRef}>
                <Button 
                  variant="default" 
                  className="w-full bg-purple-700 hover:bg-purple-800"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 w-full mt-2 bg-white rounded-md shadow-lg">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <button
                        className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoServicio}
                      >
                        <div className="flex items-center">
                          <SmilePlus className="w-5 h-5 mr-3 text-purple-600" />
                          Servicio
                        </div>
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoProducto}
                      >
                        <div className="flex items-center">
                          <ShoppingCart className="w-5 h-5 mr-3 text-blue-600" />
                          Producto
                        </div>
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoPaquete}
                      >
                        <div className="flex items-center">
                          <Package className="w-5 h-5 mr-3 text-green-600" />
                          Paquete
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones adicionales en horizontal */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="justify-start w-full text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                  onClick={navegarAFamilias}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  <span>Familias</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start w-full text-pink-600 border-pink-600 hover:bg-pink-50"
                  onClick={() => router.push(`/configuracion/tarifas/${tarifaId}/iva`)}
                >
                  <Wrench className="w-5 h-5 mr-2" />
                  <span>Tipos de IVA</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start w-full text-purple-600 border-purple-600 hover:bg-purple-50"
                  onClick={() => sonnerToast.info("Funcionalidad de clínicas asociadas en revisión.")}
                  disabled
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  <span>Clínicas asociadas</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start w-full text-lime-600 border-lime-600 hover:bg-lime-50"
                  onClick={() => router.push(`/configuracion/tarifas/${tarifaId}/tarifas-planas`)}
                >
                  <User className="w-5 h-5 mr-2" />
                  <span>Tarifas planas</span>
                </Button>
              </div>
              
              {/* Mostrar clínicas asociadas - COMENTADO TEMPORALMENTE */}
              {/* 
              {tarifa?.clinicasIds && tarifa.clinicasIds.length > 0 && (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-gray-500" />
                    <h3 className="text-sm font-medium">Clínicas asociadas ({tarifa.clinicasIds.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tarifa.clinicasIds.map((clinicaId) => {
                      const clinic = clinics.find(c => String(c.id) === String(clinicaId)); 
                      const isPrimary = String(clinicaId) === String(tarifa.clinicaId);
                      return (
                        <div 
                          key={clinic?.id || clinicaId} 
                          className={`px-3 py-1.5 rounded-full flex items-center gap-1 text-sm ${isPrimary ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}
                        >
                          <span>{clinic?.name || clinicaId}</span> 
                          {isPrimary && <span className="px-1.5 py-0.5 ml-1 text-xs rounded-full bg-indigo-200 text-indigo-800">Principal</span>}
                          {clinic?.isActive === false && <AlertCircle className="w-3 h-3 ml-1 text-amber-500" aria-label="Clínica deshabilitada"/>}
                          <button type="button" onClick={() => setEditingClinics(true)} className="ml-1 text-indigo-500 hover:text-indigo-700" title="Editar clínicas asociadas">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- SECCIÓN TABLA SERVICIOS - COMPLETA Y VERIFICADA --- */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Listado de Servicios ({serviciosFiltrados.length})</h2>
      </div>

      <div className="flex items-center justify-end mb-4 space-x-2">
        <span className="text-sm text-gray-600">Mostrar</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">elementos</span>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase">Tipo</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('familia')}><div className="flex items-center">Familia{getSortIcon('familia')}</div></th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('nombre')}><div className="flex items-center">Nombre{getSortIcon('nombre')}</div></th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('codigo')}><div className="flex items-center">Código{getSortIcon('codigo')}</div></th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase cursor-pointer" onClick={() => requestSort('precio')}><div className="flex items-center justify-end">Precio{getSortIcon('precio')}</div></th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase">IVA</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Verificar que currentItems tenga datos antes de mapear */}
            {currentItems && currentItems.length > 0 ? (
               currentItems.map((servicio) => (
                 <tr key={servicio.id} className={`table-row-hover ${servicio.deshabilitado ? 'opacity-50' : ''}`}>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center">
                       {servicio.tipo === 'Servicio' ? <SmilePlus size={18} className="text-purple-600" />
                        : servicio.tipo === 'Producto' ? <ShoppingCart size={18} className="text-blue-600" />
                        : servicio.tipo === 'Paquete' ? <Package size={18} className="text-green-600" />
                        : <SmilePlus size={18} className="text-gray-400" />} 
                       <span className="ml-2 text-xs font-medium text-gray-500 uppercase">{servicio.tipo}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{servicio.familia}</td>
                   <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{servicio.nombre}</td>
                   <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{servicio.codigo}</td>
                   <td className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap">
                      {typeof servicio.precio === 'number' ? servicio.precio.toFixed(2) : servicio.precio}
                   </td>
                   <td className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap">{servicio.iva}</td>
                   <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                     <div className="flex justify-end space-x-2">
                       <Button variant="ghost" size="icon" onClick={() => handleEditarServicio(servicio.id)} className="w-8 h-8 p-0 text-indigo-600 hover:text-indigo-900" title="Editar"><Edit3 size={16} /></Button>
                       <Button variant="ghost" size="icon" onClick={() => handleEliminarServicio(servicio.id, servicio.nombre)} className="w-8 h-8 p-0 text-red-600 hover:text-red-900" title="Eliminar"><Trash2 size={16} /></Button>
                     </div>
                   </td>
                 </tr>
               ))
             ) : (
               <tr>
                 <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                   {serviciosFormateados.length > 0 ? "No hay servicios en esta página" : "No se encontraron servicios que coincidan con los filtros."}
                 </td>
               </tr>
             )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Mostrando {serviciosFiltrados.length > 0 ? indexOfFirstItem + 1 : 0} a {Math.min(indexOfLastItem, serviciosFiltrados.length)} de {serviciosFiltrados.length} servicios
        </div>
        {totalPages > 1 && (
           <div className="flex space-x-1">
             <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1}><ChevronsLeft size={16} /></Button>
             <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
             <span className="px-4 py-1.5 text-sm">Página {currentPage} / {totalPages}</span>
             <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
             <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages}><ChevronsRight size={16} /></Button>
           </div>
        )}
      </div>

      {/* --- MODALES --- */}
      <Dialog open={confirmEliminarOpen} onOpenChange={setConfirmEliminarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmar eliminación</DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar el servicio <span className="font-semibold">"{nombreServicioEliminar}"</span>?
              <div className="mt-2">Esta acción también eliminará todas las imágenes y documentos asociados al servicio.</div>
              <div className="mt-2 font-medium text-red-500">Esta acción no se puede deshacer.</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmEliminarOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarEliminacion}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Clínicas Asociadas - COMENTADO TEMPORALMENTE */}
      {/*
      <Dialog open={editingClinics} onOpenChange={setEditingClinics}>
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle>Clínicas asociadas (En Revisión)</DialogTitle>
            <DialogDescription>La gestión de clínicas asociadas está siendo refactorizada.</DialogDescription>
          </DialogHeader>
          
          <div className="my-4 space-y-4">
            {/* ... (Contenido del modal basado en tarifaEditada.clinicasIds / clinicaId) ... * /}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingClinics(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}

    </div>
  );
}

