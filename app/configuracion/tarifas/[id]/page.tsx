/**
 * 🔧 MODIFICACIONES REALIZADAS:
 * 
 * 1. COLUMNA CONDICIONAL "DURACIÓN TRATAMIENTO":
 *    - Se agregó la columna "Duración Tratamiento" que aparece solo cuando el módulo de Shelly está activo
 *    - Se utiliza el hook useIsShellyModuleActive() para verificar el estado del módulo
 *    - La columna se posiciona entre "Duración" y "Precio"
 * 
 * 2. OPTIMIZACIÓN DE DIMENSIONES:
 *    - Se ajustaron las dimensiones de todas las columnas para un mejor aprovechamiento del espacio
 *    - Columna "Código": reducida a 100px (antes era muy ancha para 4-5 caracteres)
 *    - Columna "Duración": reducida a 80px (optimizada para mostrar minutos)
 *    - Columna "Tipo": reducida a 80px (solo muestra íconos)
 *    - Columna "Familia": ajustada a 140px
 *    - Columna "Precio": reducida a 90px
 *    - Columna "IVA": reducida a 60px
 *    - Columna "Acciones": reducida a 100px
 * 
 * 3. ESTILOS CSS PERSONALIZADOS:
 *    - Se creó el archivo /styles/servicios-table.css con estilos optimizados
 *    - Se aplicó table-layout: fixed para un control preciso de anchos
 *    - Se agregaron estilos responsivos para pantallas pequeñas
 *    - Se mejoró la visualización de texto truncado con tooltips
 * 
 * 4. INTERFAZ DE DATOS:
 *    - Se extendió la interfaz ServicioFormateado para incluir:
 *      - duracion: number (duración normal del servicio)
 *      - duracionTratamiento?: number (duración del tratamiento para Shelly)
 * 
 * 5. IMPLEMENTACIÓN PENDIENTE:
 *    - ⚠️ IMPORTANTE: Necesita integración con el contexto real del módulo Shelly
 *    - Actualmente la columna está oculta (isShellyModuleActive = false)
 *    - Requiere implementar el hook/contexto real que controla el estado del módulo
 * 
 * @see /styles/servicios-table.css - Estilos CSS optimizados
 * @see docs/SMART_PLUGS_MODULE_ISOLATION.md - Documentación del módulo Shelly
 * @author Asistente AI - Modificaciones para optimización de tabla de servicios
 */

"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import "@/styles/servicios-table.css"
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

// TODO: Importar el contexto/hook real del módulo Shelly
// const useIsShellyModuleActive = () => {
//   // Implementación real del contexto SmartPlugsProvider
//   return false // Placeholder hasta encontrar la implementación real
// }

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
  
  // Verificar si el módulo de Shelly está activo
  // const isShellyModuleActive = useIsShellyModuleActive()
  const isShellyModuleActive = false // Placeholder hasta encontrar la implementación real
  
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
    precio: number;
    iva: string;
    tipo: string;
    duracion: number; // Duración en minutos
    duracionTratamiento?: number; // Duración del tratamiento (opcional, para Shelly)
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
              id: servicio.id,
              nombre: servicio.nombre,
              codigo: servicio.codigo || '',
              familia: getFamiliaName(servicio.familiaId),
              precio: parseFloat(servicio.precioConIVA) || 0,
              iva: "N/A",
              tipo: 'servicio',
              duracion: servicio.duracion || 0, // Duración normal del servicio
              duracionTratamiento: servicio.duracionTratamiento || servicio.estimatedTreatmentDuration || 0 // Duración del tratamiento para Shelly
            }));
            
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
  }, [tarifaId, getServiciosByTarifaId, itemsPerPage, getFamiliaName]);

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
        // Eliminar imágenes y documentos antes de eliminar el servicio
        const tieneImagenes = deleteServiceImages(servicioAEliminar);
        const tieneDocumentos = deleteServiceDocuments(servicioAEliminar);
        
        // Eliminar el servicio
        eliminarServicio(servicioAEliminar);
        
        // Actualizar la lista de servicios después de eliminar
        const nuevosServicios = serviciosFormateados.filter(s => s.id !== servicioAEliminar);
        setServiciosFormateados(nuevosServicios);
        
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
      const tarifaActual = getTarifaById(tarifaId);
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
      const tarifaActual = getTarifaById(tarifaId);
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
      const tarifaActual = getTarifaById(tarifaId);
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
    <div className="container mx-auto p-6 mt-16">
      {/* TODO: Implementar verificación real del módulo Shelly */}

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
                      <SelectItem key={familia.id} value={familia.name}>
                        {familia.name}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 w-full justify-start"
                  onClick={navegarAFamilias}
                >
                  <User className="mr-2 h-5 w-5" />
                  <span>Familias</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-pink-600 text-pink-600 hover:bg-pink-50 w-full justify-start"
                  onClick={navegarATiposIVA}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  <span>Tipos de IVA</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-lime-600 text-lime-600 hover:bg-lime-50 w-full justify-start"
                  onClick={navegarAHerencias}
                >
                  <Wrench className="mr-2 h-5 w-5" />
                  <span>Herencia</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50 w-full justify-start"
                  onClick={() => setEditingClinics(true)}
                >
                  <Building2 className="mr-2 h-5 w-5" />
                  <span>Clínicas asociadas</span>
                </Button>
              </div>
              
              {/* Mostrar clínicas asociadas */}
              {tarifa?.clinicasIds && tarifa.clinicasIds.length > 0 && (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5 text-gray-500" />
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
                            <span className="ml-1 text-xs bg-indigo-200 px-1.5 py-0.5 rounded-full text-indigo-800">
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
                            onClick={() => setEditingClinics(true)}
                            className="text-indigo-500 hover:text-indigo-700 ml-1"
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
        <table className="servicios-table min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th
                scope="col"
                className="col-tipo px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center justify-center">
                  <span>Tipo</span>
                </div>
              </th>
              <th
                scope="col"
                className="col-familia px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('familia')}
              >
                <div className="flex items-center">
                  Familia
                  <span className="ml-1">{getSortIcon('familia')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="col-nombre px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('nombre')}
              >
                <div className="flex items-center">
                  Nombre
                  <span className="ml-1">{getSortIcon('nombre')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="col-codigo px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('codigo')}
              >
                <div className="flex items-center">
                  Código
                  <span className="ml-1">{getSortIcon('codigo')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="col-duracion px-3 py-3 text-center text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center justify-center">
                  Duración
                </div>
              </th>
              {isShellyModuleActive && (
                <th
                  scope="col"
                  className="col-duracion-tratamiento px-3 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  <div className="flex items-center justify-center">
                    Duración Tratamiento
                  </div>
                </th>
              )}
              <th
                scope="col"
                className="col-precio px-3 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('precio')}
              >
                <div className="flex items-center justify-end">
                  Precio
                  <span className="ml-1">{getSortIcon('precio')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="col-iva px-3 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('iva')}
              >
                <div className="flex items-center justify-end">
                  IVA
                  <span className="ml-1">{getSortIcon('iva')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="col-acciones px-3 py-3 text-right text-xs font-medium uppercase tracking-wider"
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
                <td className="col-tipo px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    {servicio.tipo === 'servicio' ? (
                      <SmilePlus size={16} className="text-purple-600" />
                    ) : servicio.tipo === 'producto' ? (
                      <ShoppingCart size={16} className="text-blue-600" />
                    ) : (
                      <Package size={16} className="text-green-600" />
                    )}
                  </div>
                </td>
                <td className="col-familia px-3 py-4 whitespace-nowrap text-sm text-gray-900 truncate truncate-tooltip" title={servicio.familia || "(Ninguna)"}>
                  {servicio.familia || "(Ninguna)"}
                </td>
                <td className="col-nombre px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {servicio.nombre}
                </td>
                <td className="col-codigo px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {servicio.codigo}
                </td>
                <td className="col-duracion px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {servicio.duracion > 0 ? `${servicio.duracion}min` : '-'}
                </td>
                {isShellyModuleActive && (
                  <td className="col-duracion-tratamiento px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {servicio.duracionTratamiento && servicio.duracionTratamiento > 0 ? `${servicio.duracionTratamiento}min` : '-'}
                  </td>
                )}
                <td className="col-precio px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {typeof servicio.precio === 'number' ? servicio.precio.toFixed(2) : servicio.precio}
                </td>
                <td className="col-iva px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {servicio.iva}
                </td>
                <td className="col-acciones px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex justify-end space-x-1">
                    <button
                      onClick={() => handleEditarServicio(servicio.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Editar servicio"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminarServicio(servicio.id, servicio.nombre)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar servicio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={isShellyModuleActive ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron servicios o productos.
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

      {/* Modal de edición de clínicas asociadas */}
      <Dialog open={editingClinics} onOpenChange={setEditingClinics}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Clínicas asociadas</DialogTitle>
            <DialogDescription>
              Selecciona las clínicas a las que estará asociada esta tarifa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {/* Checkbox para incluir clínicas deshabilitadas */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDisabledClinics"
                checked={includeDisabledClinics}
                onCheckedChange={(checked) => setIncludeDisabledClinics(!!checked)}
              />
              <label 
                htmlFor="includeDisabledClinics" 
                className="text-sm font-medium leading-none cursor-pointer"
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
                    // Determinar si es la primera clínica (será primaria)
                    const isPrimary = !tarifaEditada.clinicasIds || tarifaEditada.clinicasIds.length === 0;
                    
                    // Añadir la clínica directamente
                    await addClinicToTarifa(tarifaId, value, isPrimary);
                    
                    // Actualizar la UI con la tarifa actualizada
                    const updatedTarifa = getTarifaById(tarifaId);
                    if (updatedTarifa) {
                      setTarifaEditada(updatedTarifa);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full border-gray-300 bg-white">
                  <SelectValue placeholder="Seleccionar clínica" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {/* Debugging - información simple */}
                  <div className="p-2 text-xs text-gray-500">
                    Clínicas disponibles: {clinics.length} | Filtrar deshabilitadas: {includeDisabledClinics ? "Sí" : "No"}
                  </div>
                  
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
                      >
                        {clinic.prefix} - {clinic.name}
                        {clinic.isActive === false && " (Deshabilitada)"}
                      </SelectItem>
                    ))}
                  
                  {clinics.filter(c => {
                    if (tarifaEditada?.clinicasIds?.includes(c.prefix)) return false;
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
                <label className="text-sm font-medium mb-2 block">Clínicas seleccionadas ({tarifaEditada.clinicasIds.length})</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tarifaEditada.clinicasIds.map((clinicaId) => {
                    const clinic = clinics.find(c => c.prefix === clinicaId);
                    const isPrimary = clinicaId === tarifaEditada.clinicaId;
                    
                    return clinic || clinicaId ? (
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
                          <span className="ml-1 text-xs bg-indigo-200 px-1.5 py-0.5 rounded-full text-indigo-800">
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
                            // Eliminar la clínica directamente
                            await removeClinicFromTarifa(tarifaId, clinicaId);
                            
                            // Actualizar la UI con la tarifa actualizada 
                            const updatedTarifa = getTarifaById(tarifaId);
                            if (updatedTarifa) {
                              setTarifaEditada(updatedTarifa);
                            }
                          }}
                          className="text-gray-500 hover:text-red-500 ml-1"
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
                              // Establecer como clínica principal directamente
                              await setPrimaryClinicForTarifa(tarifaId, clinicaId);
                              
                              // Actualizar la UI con la tarifa actualizada
                              const updatedTarifa = getTarifaById(tarifaId);
                              if (updatedTarifa) {
                                setTarifaEditada(updatedTarifa);
                              }
                            }}
                            className="text-indigo-500 hover:text-indigo-700 ml-1"
                            title="Establecer como clínica principal"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-md bg-amber-50 text-amber-700 text-sm">
                <p>No hay clínicas seleccionadas.</p>
                <p className="mt-2 font-medium">Esta tarifa no estará disponible en ninguna clínica hasta que asigne al menos una.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClinics(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                try {
                  // Cerrar el modal antes para evitar la sensación de bloqueo
                  setEditingClinics(false);
                  
                  // Mostrar mensaje de procesamiento
                  toast({
                    title: "Guardando cambios",
                    description: "Actualizando clínicas asociadas...",
                  });
                  
                  // Los cambios ya se han guardado directamente en el contexto
                  // a través de las funciones addClinicToTarifa, removeClinicFromTarifa 
                  // y setPrimaryClinicForTarifa que usan directamente updateTarifa
                  
                  // Solo necesitamos actualizar la UI
                  const updatedTarifa = getTarifaById(tarifaId);
                  if (updatedTarifa) {
                    setTarifa(updatedTarifa);
                    setTarifaEditada(updatedTarifa);
                    
                    // Notificar éxito
                    toast({
                      title: "Clínicas actualizadas",
                      description: "Las clínicas asociadas se han actualizado correctamente.",
                    });
                  } else {
                    console.error("No se pudo obtener la tarifa del contexto");
                    throw new Error("Error al obtener datos");
                  }
                } catch (error) {
                  console.error("Error al finalizar actualización de clínicas:", error);
                  toast({
                    title: "Error",
                    description: "Ocurrió un problema al finalizar los cambios.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

