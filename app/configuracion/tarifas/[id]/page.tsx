"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronDown, Pencil, Trash2, ShoppingCart, Package, User, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Wrench, ShoppingBag, SmilePlus, Plus, Edit3, Building2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFamily } from "@/contexts/family-context"
import Link from "next/link"
import { useTarif } from "@/contexts/tarif-context"
import { Card, CardContent } from "@/components/ui/card"
import React from 'react'
import { useServicio } from "@/contexts/servicios-context"
import { useIVA } from "@/contexts/iva-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useClinic } from "@/contexts/clinic-context"
import { Tarifa, FamiliaTarifa, Servicio } from "@/services/data/models/interfaces"

export default function ConfiguracionTarifa() {
  const router = useRouter()
  const params = useParams()
  // Extraer el id de forma segura
  const tarifaId = String(params?.id || "")
  
  const { families } = useFamily()
  const { getTarifaById, getFamiliasByTarifaId, updateTarifa } = useTarif()
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
  
  // Familias de la tarifa actual
  const [tarifaFamilies, setTarifaFamilies] = useState<FamiliaTarifa[]>([])

  // Estado para almacenar los servicios cargados
  const [serviciosTarifa, setServiciosTarifa] = useState<Servicio[]>([])
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)

  // Obtener los tipos de IVA
  const tiposIVATarifa = getTiposIVAByTarifaId ? getTiposIVAByTarifaId(tarifaId) : []

  // Interfaz para servicios formateados para la tabla
  interface ServicioFormateado {
    id: string;
    nombre: string;
    codigo: string;
    familia: string;
    precio: string | number;
    iva?: string;
    tipo: string;
    deshabilitado?: boolean;
  }
  
  // Estado para los servicios formateados
  const [serviciosFormateados, setServiciosFormateados] = useState<ServicioFormateado[]>([]);
  
  // Estado para el modal de confirmación de eliminación
  const [servicioAEliminar, setServicioAEliminar] = useState<string | null>(null);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [nombreServicioEliminar, setNombreServicioEliminar] = useState("");

  // Función para obtener el nombre de la familia
  const getFamiliaName = (familiaId: string) => {
    if (!familiaId) return "(Ninguna)";
    
    // Buscar en todas las familias disponibles (no solo en tarifaFamilies)
    const familia = families.find(f => f.id === familiaId);
    return familia ? (familia.name || familia.id) : "(Ninguna)";
  }

  // Cargar las familias asociadas a la tarifa
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        if (tarifaId) {
          console.log("Cargando familias para tarifa:", tarifaId);
          const familiesData = await getFamiliasByTarifaId(tarifaId);
          if (Array.isArray(familiesData)) {
            setTarifaFamilies(familiesData);
            console.log("Familias cargadas:", familiesData.length);
          } else {
            console.error("getFamiliasByTarifaId no devolvió un array:", familiesData);
            setTarifaFamilies([]);
          }
        }
      } catch (error) {
        console.error("Error al cargar familias de tarifa:", error);
        setTarifaFamilies([]);
      }
    };
    
    loadFamilies();
  }, [tarifaId, getFamiliasByTarifaId]);
  
  // Cargar los servicios asociados a la tarifa
  useEffect(() => {
    const loadServicios = async () => {
      try {
        if (tarifaId) {
          console.log("Cargando servicios para tarifa:", tarifaId);
          const serviciosData = await getServiciosByTarifaId(tarifaId);
          if (Array.isArray(serviciosData)) {
            setServiciosTarifa(serviciosData);
            console.log("Servicios cargados:", serviciosData.length);
            
            // Formatear para la vista de tabla
            const serviciosFormateados = serviciosData.map(servicio => ({
              id: String(servicio.id),
              nombre: servicio.nombre,
              codigo: servicio.codigo || '',
              familia: getFamiliaName(servicio.familiaId) || 'Sin familia',
              precio: servicio.precioConIVA || '0',
              iva: "N/A", // Valor por defecto para mantener compatibilidad
              tipo: 'Servicio',
              deshabilitado: servicio.deshabilitado || false
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
      }
    };
    
    loadServicios();
    // Quitar getFamiliaName de las dependencias para evitar el bucle infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarifaId, getServiciosByTarifaId, itemsPerPage]);

  // Efecto para resetear includeDisabledClinics cuando se abre el modal
  useEffect(() => {
    if (editingClinics) {
      setIncludeDisabledClinics(false);
    }
  }, [editingClinics]);

  // Cargar las clínicas disponibles
  useEffect(() => {
    // Cargar clínicas desde el contexto de clínicas
    if (clinics && clinics.length > 0) {
      console.log("Clínicas cargadas desde el contexto:", clinics.length);
    } else {
      console.log("Context no disponible o sin clínicas - usando clínicas hardcoded");
      
      // Hardcodear las clínicas que sabemos que existen en defaultClinics
      const clinicasHardcoded = [
        {
          id: 1,
          prefix: "000001",
          name: "Californie Multilaser - Organicare",
          city: "Casablanca",
          isActive: true
        },
        {
          id: 2,
          prefix: "Cafc",
          name: "Cafc Multilaser",
          city: "Casablanca",
          isActive: true
        },
        {
          id: 3,
          prefix: "TEST",
          name: "CENTRO TEST",
          city: "Casablanca",
          isActive: false
        }
      ];
      
      console.log("Cargadas clínicas hardcoded:", clinicasHardcoded.length);
    }
  }, [clinics]);

  // Cargar la tarifa completa al montar el componente
  useEffect(() => {
    const loadTarifa = async () => {
      try {
        if (tarifaId) {
          console.log("Cargando tarifa con ID:", tarifaId);
          const tarifaData = await getTarifaById(tarifaId);
          
          if (tarifaData) {
            // Preparar la tarifa para asegurar que tenga una estructura válida
            const tarifaPreparada = prepararTarifaConClinicas(tarifaData);
            console.log("Tarifa cargada:", tarifaPreparada);
            
            // Actualizar los estados
            setTarifa(tarifaPreparada);
            setTarifaEditada(tarifaPreparada);
          } else {
            console.error("No se encontró la tarifa con ID:", tarifaId);
            // Redirigir a la lista de tarifas si no existe
            router.push('/configuracion/tarifas');
          }
        }
      } catch (error) {
        console.error("Error al cargar la tarifa:", error);
      }
    };
    
    loadTarifa();
  }, [tarifaId, getTarifaById, router]);

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
      router.push(`/configuracion/tarifas/${tarifaId}/editar-servicio/${servicioId}`);
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
          nombre: servicio.nombre,
          codigo: servicio.codigo || '',
          familia: String(getFamiliaName(servicio.familiaId)),
          precio: parseFloat(servicio.precioConIVA) || 0,
          iva: "N/A",
          tipo: 'servicio'
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

  // Función para asegurar que la tarifa tenga clinicasIds correctamente
  const prepararTarifaConClinicas = (tarifaOriginal: any): Tarifa => {
    // Crear una copia para no modificar el original
    const tarifaFormateada = { ...tarifaOriginal };
    
    // Asegurar que exista clinicasIds y sea un array
    if (!tarifaFormateada.clinicasIds || !Array.isArray(tarifaFormateada.clinicasIds)) {
      // Si hay clinicaId, usarla como base para clinicasIds
      if (tarifaFormateada.clinicaId) {
        tarifaFormateada.clinicasIds = [tarifaFormateada.clinicaId];
      } else {
        // De lo contrario, inicializar como array vacío
        tarifaFormateada.clinicasIds = [];
      }
    }
    
    // Asegurar que clinicaId sea válido y esté en clinicasIds
    if (tarifaFormateada.clinicaId && tarifaFormateada.clinicasIds.length > 0) {
      // Si la clinicaId no está en clinicasIds, añadirla
      if (!tarifaFormateada.clinicasIds.includes(tarifaFormateada.clinicaId)) {
        tarifaFormateada.clinicasIds.push(tarifaFormateada.clinicaId);
      }
    } 
    // Si no hay clinicaId pero hay clinicasIds, establecer la primera como principal
    else if (!tarifaFormateada.clinicaId && tarifaFormateada.clinicasIds.length > 0) {
      tarifaFormateada.clinicaId = tarifaFormateada.clinicasIds[0];
    }
    
    // Asegurar que isActive exista (opuesto a deshabilitada si no existe)
    if (tarifaFormateada.isActive === undefined) {
      tarifaFormateada.isActive = !tarifaFormateada.deshabilitada;
    }
    
    console.log("Tarifa formateada:", tarifaFormateada);
    
    return tarifaFormateada as Tarifa;
  };

  // Función para obtener una tarifa directamente del contexto
  const getTarifaFromAllSources = async (tarifaId: string): Promise<Tarifa | null> => {
    console.log("Buscando tarifa con ID:", tarifaId);
    
    // Obtener desde el contexto de tarifas (única fuente de verdad)
    const tarifaFromContext = getTarifaById(tarifaId);
    if (tarifaFromContext) {
      console.log("Tarifa encontrada en el contexto");
      return prepararTarifaConClinicas(tarifaFromContext);
    }
    
    console.log("Tarifa no encontrada en el contexto");
    return null;
  };

  // Funciones específicas para la gestión de clínicas asociadas
  // Estas funciones facilitarán la migración a base de datos

  // Añadir una clínica a una tarifa
  const addClinicToTarifa = async (tarifaId: string, clinicaId: string, isPrimary: boolean = false): Promise<boolean> => {
    try {
      // Obtener la tarifa actual
      const tarifaActual = await getTarifaById(tarifaId);
      if (!tarifaActual) return false;
      
      // Clonar los arrays para evitar mutaciones
      const clinicasIds = [...(tarifaActual.clinicasIds || [])];
      
      // Verificar si la clínica ya está asociada
      if (clinicasIds.includes(clinicaId)) {
        console.log("La clínica ya está asociada a esta tarifa");
        
        // Si debe ser primaria pero no lo es, actualizamos
        if (isPrimary && tarifaActual.clinicaId !== clinicaId) {
          updateTarifa(tarifaId, { clinicaId });
          return true;
        }
        
        return true; // No hay cambios necesarios
      }
      
      // Añadir la clínica a la lista
      clinicasIds.push(clinicaId);
      
      // Actualizar datos
      const updateData: Partial<Tarifa> = { clinicasIds };
      
      // Si es primaria o no hay clínica primaria, establecerla como primaria
      if (isPrimary || !tarifaActual.clinicaId) {
        updateData.clinicaId = clinicaId;
      }
      
      // Guardar directamente en el contexto de tarifas
      updateTarifa(tarifaId, updateData);
      return true;
    } catch (error) {
      console.error("Error al añadir clínica a tarifa:", error);
      return false;
    }
  };

  // Eliminar una clínica de una tarifa
  const removeClinicFromTarifa = async (tarifaId: string, clinicaId: string): Promise<boolean> => {
    try {
      // Obtener la tarifa actual
      const tarifaActual = await getTarifaById(tarifaId);
      if (!tarifaActual) return false;
      
      // Clonar los arrays para evitar mutaciones
      const clinicasIds = [...(tarifaActual.clinicasIds || [])];
      
      // Verificar si la clínica está asociada
      if (!clinicasIds.includes(clinicaId)) {
        console.log("La clínica no está asociada a esta tarifa");
        return true; // No hay cambios necesarios
      }
      
      // Eliminar la clínica de la lista
      const newClinicasIds = clinicasIds.filter(id => id !== clinicaId);
      
      // Preparar datos para actualizar
      const updateData: Partial<Tarifa> = { clinicasIds: newClinicasIds };
      
      // Si era la clínica primaria, establecer otra como primaria
      if (tarifaActual.clinicaId === clinicaId) {
        if (newClinicasIds.length > 0) {
          // Usar la primera clínica disponible como principal
          updateData.clinicaId = newClinicasIds[0];
        } else {
          // Si no hay más clínicas, limpiar clinicaId
          updateData.clinicaId = "";
        }
      }
      
      // Guardar directamente en el contexto de tarifas
      updateTarifa(tarifaId, updateData);
      return true;
    } catch (error) {
      console.error("Error al eliminar clínica de tarifa:", error);
      return false;
    }
  };

  // Establecer una clínica como primaria para una tarifa
  const setPrimaryClinicForTarifa = async (tarifaId: string, clinicaId: string): Promise<boolean> => {
    try {
      // Obtener la tarifa actual
      const tarifaActual = await getTarifaById(tarifaId);
      if (!tarifaActual) return false;
      
      // Verificar si la clínica está asociada
      const clinicasIds = [...(tarifaActual.clinicasIds || [])];
      if (!clinicasIds.includes(clinicaId)) {
        // Si la clínica no está asociada, añadirla primero
        clinicasIds.push(clinicaId);
      }
      
      // Actualizar directamente en el contexto de tarifas
      updateTarifa(tarifaId, { 
        clinicaId,
        clinicasIds
      });
      return true;
    } catch (error) {
      console.error("Error al establecer clínica primaria:", error);
      return false;
    }
  };

  // Funciones simple para manejar eventos de servicio (evita el error)
  const handleServiciosUpdated = () => {
    console.log("Evento de actualización de servicios recibido");
  };

  return (
    <div className="container p-6 mx-auto mt-16">
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
                    {tarifaFamilies.map((familia) => (
                      <SelectItem key={familia.id} value={familia.name}>
                        {familia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botones de Exportar y Buscar */}
              <div className="flex mt-4 space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Exportar
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1 bg-purple-700 hover:bg-purple-800"
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
                  onClick={() => router.push(`/configuracion/tarifas/familias`)}
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
                  onClick={() => {
                    if (tarifa) {
                      setTarifaEditada(tarifa);
                      setEditingClinics(true);
                    } else {
                      console.error("No hay tarifa cargada para editar clínicas");
                      toast({
                        title: "Error",
                        description: "No se pudo cargar la tarifa para editar clínicas",
                        variant: "destructive"
                      });
                    }
                  }}
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
              
              {/* Mostrar clínicas asociadas */}
              {tarifa?.clinicasIds && tarifa.clinicasIds.length > 0 && (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-gray-500" />
                    <h3 className="text-sm font-medium">Clínicas asociadas ({tarifa.clinicasIds.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tarifa.clinicasIds.map((clinicaId) => {
                      const clinic = clinics.find(c => c.prefix === clinicaId);
                      const isPrimary = clinicaId === tarifa.clinicaId;
                      
                      return (
                        <div 
                          key={clinic?.prefix || clinicaId} 
                          className={`px-3 py-1.5 rounded-full flex items-center gap-1 text-sm ${
                            isPrimary 
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          <span>{clinic?.name || clinic?.prefix || clinicaId}</span>
                          {isPrimary && (
                            <span className="px-1.5 py-0.5 ml-1 text-xs rounded-full bg-indigo-200 text-indigo-800">
                              Principal
                            </span>
                          )}
                          {clinic?.isActive === false && (
                            <AlertCircle 
                              className="w-3 h-3 ml-1 text-amber-500" 
                              aria-label="Clínica deshabilitada"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingClinics(true)}
                            className="ml-1 text-indigo-500 hover:text-indigo-700"
                            title="Editar clínicas asociadas"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
      <div className="flex items-center justify-end mb-4 space-x-2">
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
          <thead className="table-header">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <span>Tipo</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer"
                onClick={() => requestSort('familia')}
              >
                <div className="flex items-center">
                  Familia
                  <span className="ml-1">{getSortIcon('familia')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer"
                onClick={() => requestSort('nombre')}
              >
                <div className="flex items-center">
                  Nombre
                  <span className="ml-1">{getSortIcon('nombre')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer"
                onClick={() => requestSort('codigo')}
              >
                <div className="flex items-center">
                  Código
                  <span className="ml-1">{getSortIcon('codigo')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase cursor-pointer"
                onClick={() => requestSort('precio')}
              >
                <div className="flex items-center justify-end">
                  Precio
                  <span className="ml-1">{getSortIcon('precio')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase cursor-pointer"
                onClick={() => requestSort('iva')}
              >
                <div className="flex items-center justify-end">
                  IVA
                  <span className="ml-1">{getSortIcon('iva')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((servicio) => (
              <tr 
                key={servicio.id} 
                className="table-row-hover"
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
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{servicio.familia || "(Ninguna)"}</td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{servicio.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{servicio.codigo}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap">
                  {typeof servicio.precio === 'number' ? servicio.precio.toFixed(2) : servicio.precio}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap">{servicio.iva}</td>
                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditarServicio(servicio.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleEliminarServicio(servicio.id, servicio.nombre)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron servicios o productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-between mt-4">
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
      <div className="fixed flex space-x-2 bottom-6 right-6">
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
              <p className="mt-2 font-medium text-red-500">
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

      {/* Modal de edición de clínicas asociadas */}
      <Dialog open={editingClinics} onOpenChange={setEditingClinics}>
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle>Clínicas asociadas</DialogTitle>
            <DialogDescription>
              Selecciona las clínicas a las que estará asociada esta tarifa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 space-y-4">
            {/* Checkbox para incluir clínicas deshabilitadas */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDisabledClinics"
                checked={includeDisabledClinics}
                onCheckedChange={(checked) => setIncludeDisabledClinics(!!checked)}
              />
              <label 
                htmlFor="includeDisabledClinics" 
                className="leading-none text-sm font-medium cursor-pointer"
              >
                Mostrar clínicas deshabilitadas
              </label>
            </div>
            
            {/* Selector de clínicas */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Añadir clínica</label>
              <Select
                onValueChange={async (value) => {
                  if (tarifaEditada && value) {
                    try {
                      // Determinar si es la primera clínica (será primaria)
                      const isPrimary = !tarifaEditada.clinicasIds || tarifaEditada.clinicasIds.length === 0;
                      
                      // Mostrar mensaje de procesamiento
                      toast({
                        title: "Añadiendo clínica",
                        description: "Procesando solicitud...",
                      });
                      
                      // Añadir la clínica directamente
                      const success = await addClinicToTarifa(tarifaId, value, isPrimary);
                      
                      if (success) {
                        // Actualizar la UI con la tarifa actualizada
                        try {
                          const updatedTarifaData = await getTarifaById(tarifaId);
                          if (updatedTarifaData) {
                            // Preparar la tarifa para asegurar que tenga una estructura válida
                            const updatedTarifa = prepararTarifaConClinicas(updatedTarifaData);
                            setTarifaEditada(updatedTarifa);
                            setTarifa(updatedTarifa);
                            
                            toast({
                              title: "Clínica añadida",
                              description: "La clínica se ha asociado correctamente a la tarifa.",
                            });
                          }
                        } catch (error) {
                          console.error("Error al obtener tarifa actualizada:", error);
                          toast({
                            title: "Error",
                            description: "Hubo un problema al actualizar la información.",
                            variant: "destructive"
                          });
                        }
                      } else {
                        toast({
                          title: "Error",
                          description: "No se pudo asociar la clínica a la tarifa.",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error("Error al añadir clínica:", error);
                      toast({
                        title: "Error",
                        description: "Ocurrió un problema al asociar la clínica.",
                        variant: "destructive"
                      });
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Seleccionar clínica" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {/* Filtrar clínicas disponibles */}
                  {clinics
                    .filter(c => {
                      // No mostrar clínicas ya seleccionadas
                      if (tarifaEditada?.clinicasIds?.includes(c.prefix)) {
                        return false;
                      }
                      // Mostrar todas si está marcado incluir deshabilitadas
                      if (includeDisabledClinics) {
                        return true;
                      }
                      // De lo contrario, solo mostrar activas
                      return c.isActive === true;
                    })
                    .map((clinic) => (
                      <SelectItem 
                        key={clinic.id} 
                        value={clinic.prefix}
                        className={!clinic.isActive ? "text-amber-600" : ""}
                      >
                        {clinic.prefix} - {clinic.name}
                        {!clinic.isActive && " (Deshabilitada)"}
                      </SelectItem>
                    ))}
                  
                  {clinics.filter(c => {
                    if (!tarifaEditada?.clinicasIds) return true;
                    if (tarifaEditada.clinicasIds.includes(c.prefix)) return false;
                    return includeDisabledClinics || c.isActive === true;
                  }).length === 0 && (
                    <div className="p-2 text-sm text-gray-500">
                      Todas las clínicas disponibles ya han sido seleccionadas
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Clínicas seleccionadas */}
            {tarifaEditada?.clinicasIds && tarifaEditada.clinicasIds.length > 0 ? (
              <div className="space-y-2">
                <label className="block mb-2 text-sm font-medium">
                  Clínicas seleccionadas ({tarifaEditada.clinicasIds.length})
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tarifaEditada.clinicasIds.map((clinicaId) => {
                    // Buscar la clínica por su ID (prefix) para mostrar su nombre
                    const clinic = clinics.find(c => c.prefix === clinicaId);
                    const isPrimary = clinicaId === tarifaEditada.clinicaId;
                    
                    return (
                      <div 
                        key={clinicaId} 
                        className={`px-3 py-1.5 rounded-full flex items-center gap-1 text-sm ${
                          isPrimary 
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        <span>{clinic?.name || clinicaId}</span>
                        {isPrimary && (
                          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                            Principal
                          </span>
                        )}
                        {clinic?.isActive === false && (
                          <AlertCircle 
                            className="ml-1 h-3 w-3 text-amber-500" 
                            aria-label="Clínica deshabilitada"
                          />
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              // Mostrar mensaje de procesamiento
                              toast({
                                title: "Eliminando clínica",
                                description: "Procesando solicitud...",
                              });
                              
                              // Eliminar la clínica directamente
                              const success = await removeClinicFromTarifa(tarifaId, clinicaId);
                              
                              if (success) {
                                // Actualizar la UI con la tarifa actualizada
                                const updatedTarifaData = await getTarifaById(tarifaId);
                                if (updatedTarifaData) {
                                  // Preparar la tarifa para asegurar que tenga una estructura válida
                                  const updatedTarifa = prepararTarifaConClinicas(updatedTarifaData);
                                  setTarifaEditada(updatedTarifa);
                                  setTarifa(updatedTarifa);
                                  
                                  toast({
                                    title: "Clínica eliminada",
                                    description: "La clínica se ha desasociado correctamente de la tarifa.",
                                  });
                                }
                              } else {
                                toast({
                                  title: "Error",
                                  description: "No se pudo eliminar la asociación de la clínica.",
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error("Error al eliminar clínica:", error);
                              toast({
                                title: "Error",
                                description: "Ocurrió un problema al eliminar la clínica.",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="ml-1 text-gray-500 hover:text-red-500"
                          title="Eliminar clínica"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18"></path>
                            <path d="M6 6l12 12"></path>
                          </svg>
                        </button>
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                // Mostrar mensaje de procesamiento
                                toast({
                                  title: "Actualizando clínica principal",
                                  description: "Procesando solicitud...",
                                });
                                
                                // Establecer como clínica principal directamente
                                const success = await setPrimaryClinicForTarifa(tarifaId, clinicaId);
                                
                                if (success) {
                                  // Actualizar la UI con la tarifa actualizada
                                  const updatedTarifaData = await getTarifaById(tarifaId);
                                  if (updatedTarifaData) {
                                    // Preparar la tarifa para asegurar que tenga una estructura válida
                                    const updatedTarifa = prepararTarifaConClinicas(updatedTarifaData);
                                    setTarifaEditada(updatedTarifa);
                                    setTarifa(updatedTarifa);
                                    
                                    toast({
                                      title: "Clínica principal actualizada",
                                      description: "La clínica se ha establecido como principal correctamente.",
                                    });
                                  }
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "No se pudo establecer la clínica como principal.",
                                    variant: "destructive"
                                  });
                                }
                              } catch (error) {
                                console.error("Error al establecer clínica principal:", error);
                                toast({
                                  title: "Error",
                                  description: "Ocurrió un problema al actualizar la clínica principal.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="ml-1 text-indigo-500 hover:text-indigo-700"
                            title="Establecer como clínica principal"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm border rounded-md bg-amber-50 text-amber-700">
                <p>No hay clínicas seleccionadas.</p>
                <p className="mt-2 font-medium">Esta tarifa no estará disponible en ninguna clínica hasta que asigne al menos una.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClinics(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

