"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { FileQuestion, Plus, Minus, ChevronUp, ChevronDown, MessageSquare, Users, HelpCircle, X, Send, ShoppingCart, AlertCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { HelpButton } from "@/components/ui/help-button"
import React from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import ImageGallery from "@/components/ui/image-gallery"
import DocumentList from "@/components/ui/document-list"
import FileUploader from "@/components/ui/file-uploader"

// Usar SOLO contextos especializados (no importar useInterfaz directamente)
import { useIVA } from "@/contexts/iva-context"
import { useFamily } from "@/contexts/family-context"
import { useTarif } from "@/contexts/tarif-context"
import { useServicio, Servicio } from "@/contexts/servicios-context"
import { useImages } from "@/contexts/image-context"
import { useDocuments } from "@/contexts/document-context"
import { useEquipment } from "@/contexts/equipment-context"
import { Consumo as ConsumoType, EntityImage, EntityDocument } from '@/services/data/models/interfaces'
import { ImageFile, BaseFile } from "@/contexts/file-context"

// Función para generar IDs únicos sin dependencias externas
const generateId = () => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Tipos de consumo según la especificación correcta
const tiposConsumo = [
  { id: "Unidades", nombre: "Unidades" },
  { id: "Sesiones", nombre: "Sesiones" },
  { id: "Minutos", nombre: "Minutos" },
  { id: "Disparos", nombre: "Disparos" }
];

// Lista de colores de agenda (actualizada para coincidir con los colores de cabinas)
const coloresAgenda = [
  { id: "Rosa", nombre: "Rosa", color: "#FF69B4", clase: "bg-pink-400" },
  { id: "Rojo", nombre: "Rojo", color: "#FF0000", clase: "bg-red-600" },
  { id: "Naranja", nombre: "Naranja", color: "#FFA500", clase: "bg-orange-500" },
  { id: "Amarillo", nombre: "Amarillo", color: "#FFD700", clase: "bg-yellow-400" },
  { id: "Verde", nombre: "Verde", color: "#32CD32", clase: "bg-green-500" },
  { id: "Turquesa", nombre: "Turquesa", color: "#40E0D0", clase: "bg-teal-400" },
  { id: "Azul", nombre: "Azul", color: "#1E90FF", clase: "bg-blue-500" },
  { id: "Morado", nombre: "Morado", color: "#8A2BE2", clase: "bg-purple-600" },
  { id: "Gris", nombre: "Gris", color: "#A9A9A9", clase: "bg-gray-400" }
];

// Tipos de comisión
const tiposComision = [
  { id: "Porcentaje", nombre: "Porcentaje" },
  { id: "Fijo", nombre: "Fijo" }
];

// Agentes de soporte (mock)
const agentesSoporte = [
  { id: "agent1", nombre: "Laura Sánchez", estado: "disponible", avatar: "/avatars/laura.png" },
  { id: "agent2", nombre: "Carlos Ruiz", estado: "disponible", avatar: "/avatars/carlos.png" },
  { id: "agent3", nombre: "María López", estado: "ocupado", avatar: "/avatars/maria.png" }
];

interface PageParams {
  id: string;
  [key: string]: string | string[];
}

export default function NuevoServicio() {
  console.log("--- Renderizando NuevoServicio ---"); // Log inicio render
  const router = useRouter()
  const params = useParams<PageParams>()
  const tarifaId = String(params?.id || "")
  const servicioIdParam = String(params?.servicioId || "")
  const isNew = servicioIdParam === "nuevo"
  const servicioId = isNew ? null : servicioIdParam

  // Usar contextos especializados en lugar de interfaz directamente
  const { getTarifaById, getFamiliasByTarifaId } = useTarif();
  const { getTiposIVAByTarifaId } = useIVA();
  const { getRootFamilies } = useFamily();
  const { 
    getServicioById, 
    crearServicio, 
    actualizarServicio, 
    servicioActual, 
    setServicioActual,
    validarCamposObligatorios
  } = useServicio();
  
  // Obtener funcionalidades de imágenes y documentos
  const { 
    uploadImage, 
    getImagesByEntity, 
    setPrimaryImage 
  } = useImages();
  
  const { 
    uploadDocument, 
    getDocumentsByEntity, 
    categorizeDocument 
  } = useDocuments();
  
  // Obtener equipos del contexto
  const { getEquiposByClinicaId } = useEquipment();
  
  // Crear estados para almacenar los datos
  const [tarifa, setTarifa] = useState<any>(null);
  const [tiposIVA, setTiposIVA] = useState<any[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([]);
  
  const [isSaving, setIsSaving] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajeAyuda, setMensajeAyuda] = useState("")
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<string | null>(null)
  const [currentServicioId, setCurrentServicioId] = useState<string | null>(null);
  
  // Restaurar estados y tipos correctos para imágenes/documentos
  const [serviceImages, setServiceImages] = useState<ImageFile[]>([]); 
  const [serviceDocuments, setServiceDocuments] = useState<BaseFile[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Revertir precios/comisión a string en el estado inicial
  const [servicio, setServicio] = useState({
    id: "",
    nombre: "",
    codigo: "",
    tarifaId: tarifaId,
    tarifaBase: tarifa?.nombre || "Tarifa Base",
    familiaId: "", 
    precioConIVA: "0", // Volver a string
    ivaId: "", 
    colorAgenda: "Rosa",
    duracion: 45, 
    equipoId: "", // Mantener vacío
    tipoComision: "Porcentaje",
    comision: "0", // Volver a string
    requiereParametros: false,
    visitaValoracion: false,
    apareceEnApp: false,
    descuentosAutomaticos: false,
    descuentosManuales: true,
    aceptaPromociones: true,
    aceptaEdicionPVP: false,
    afectaEstadisticas: true,
    deshabilitado: false,
    consumos: [{
      id: generateId(),
      cantidad: 1,
      tipoConsumo: "Unidades"
    }],
    precioCoste: "0", // Volver a string
    tarifaPlanaId: "", // Mantener vacío
    archivoAyuda: null as string | null,
  });

  // Restaurar variables de estilo y funciones auxiliares
  const colorPrimario = "bg-purple-600 hover:bg-purple-700 text-white";
  const colorSecundario = "bg-gray-200 hover:bg-gray-300 text-gray-800";
  const colorFoco = "focus:ring-2 focus:ring-purple-500 focus:ring-offset-2";
  const colorEncabezado = "text-purple-700";
  const buttonPrimaryClass = `${colorPrimario} ${colorFoco} transition-all duration-200 ease-in-out transform hover:scale-105`;
  const buttonSecondaryClass = `${colorSecundario} ${colorFoco} transition-all duration-200`;
  const buttonNavClass = `text-sm rounded-md bg-gray-50 hover:bg-gray-100 border-gray-300 ${colorFoco} transition-all duration-200 hover:border-purple-300`;
  const selectHoverClass = "hover:border-purple-400 focus:border-purple-500 focus:ring-purple-500";
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const { name, value, type } = e.target;
      // Convertir a número si el tipo es number
      const processedValue = type === 'number' ? Number(value) : value;
      setServicio(prev => ({ // Usar función de actualización para evitar problemas de estado obsoleto
        ...prev,
        [name]: processedValue
      }));
  }; 
  const handleSelectChange = (name: string, value: string) => { 
      const valueToStore = value === "placeholder" ? "" : value;
      setServicio(prev => ({ // Usar función de actualización
        ...prev,
        [name]: valueToStore
      }));
  }; 
  const handleCheckboxChange = (id: string, checked: boolean) => { 
      setServicio(prev => ({ // Usar función de actualización
        ...prev,
        [id]: checked
      }));
  }; 

  // Restaurar estados para modales
  const [mostrarModalCamposObligatorios, setMostrarModalCamposObligatorios] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [rutaDestino, setRutaDestino] = useState<string | null>(null);

  // AHORA es seguro usar servicioActual
  const servicioGuardado = Boolean(servicioActual?.id);

  // Cargar los datos utilizando contextos especializados
  useEffect(() => {
    console.log("[useEffect DatosIniciales] Ejecutando...");
    const fetchData = async () => {
      try {
        console.log("[useEffect DatosIniciales] Intentando cargar tarifa...");
        const tarifaData = await getTarifaById(tarifaId);
        console.log("[useEffect DatosIniciales] Tarifa cargada:", !!tarifaData);
        setTarifa(tarifaData);
        
        console.log("[useEffect DatosIniciales] Intentando cargar IVA...");
        const ivaData = await getTiposIVAByTarifaId(tarifaId);
        console.log("[useEffect DatosIniciales] IVA cargado:", ivaData?.length);
        setTiposIVA(ivaData);
        
        console.log("[useEffect DatosIniciales] Intentando cargar Familias...");
        const familiasData = await getFamiliasByTarifaId(tarifaId);
        console.log("[useEffect DatosIniciales] Familias cargadas:", familiasData?.length);
        setFamilias(Array.isArray(familiasData) ? familiasData : []);
      } catch (error) {
        console.error("[useEffect DatosIniciales] Error:", error);
      } finally {
        console.log("[useEffect DatosIniciales] Finalizado.");
      }
    };

    fetchData();
  }, [tarifaId, getTarifaById, getTiposIVAByTarifaId, getFamiliasByTarifaId]);
  
  // useEffect para filtrar equipos cuando la tarifa o los equipos globales cambien
  useEffect(() => {
    console.log("[useEffect Equipos] Ejecutando...");
    const cargarEquiposClinica = async () => {
      if (tarifa && tarifa.clinicaId) {
        try {
          console.log(`[useEffect Equipos] Intentando cargar equipos para clínica ID: ${tarifa.clinicaId}`);
          const equiposClinica = await getEquiposByClinicaId(tarifa.clinicaId);
          console.log(`[useEffect Equipos] Equipos recibidos: ${equiposClinica?.length}`);
          setEquiposDisponibles(Array.isArray(equiposClinica) ? equiposClinica : []);
        } catch (error) {
          console.error("[useEffect Equipos] Error:", error);
          setEquiposDisponibles([]);
        }
      } else {
        console.log("[useEffect Equipos] No hay tarifa o clinicaId, limpiando equipos.");
        setEquiposDisponibles([]);
      }
    };

    cargarEquiposClinica();
    console.log("[useEffect Equipos] Finalizado.");
  }, [tarifa, getEquiposByClinicaId]);
  
  // Cargar servicio si existe ID
  useEffect(() => {
    console.log(`[useEffect CargarServicio] Ejecutando para servicioId: ${servicioId}`);
    const fetchServicio = async () => {
      if (servicioId) {
        try {
          console.log(`[useEffect CargarServicio] Intentando cargar servicio ${servicioId}...`);
          const servicioData = await getServicioById(servicioId);
          console.log(`[useEffect CargarServicio] Servicio cargado:`, !!servicioData);

          if (servicioData) {
            setCurrentServicioId(servicioId);
            console.log(`[useEffect CargarServicio] Actualizando servicioActual...`);
            setServicioActual(servicioData);
            
            // Formatear el servicio para el formulario
            const servicioFormateado = {
              ...servicioData,
              id: servicioData.id,
              tarifaBase: tarifa?.nombre || "Tarifa Base",
              consumos: servicioData.consumos || [{
                id: generateId(),
                cantidad: 1,
                tipoConsumo: "Unidades"
              }],
              precioConIVA: String(servicioData.precioConIVA || ""),
              precioCoste: String(servicioData.precioCoste || ""),
              comision: String(servicioData.comision || "")
            };
            
            console.log(`[useEffect CargarServicio] Actualizando estado 'servicio'...`);
            setServicio(servicioFormateado as any);
            
            console.log(`[useEffect CargarServicio] Intentando cargar imágenes...`);
            const imagenesData = await getImagesByEntity('service', servicioId);
            console.log(`[useEffect CargarServicio] Imágenes cargadas: ${imagenesData?.length}`);
            if (imagenesData && imagenesData.length > 0) {
              const imagenesAdaptadas: ImageFile[] = imagenesData.map((img, index) => ({
                ...img, 
                position: index, 
                fileName: img.url?.split('/').pop() || `imagen-${img.id || index}`, 
                fileSize: 0, 
                mimeType: 'image/jpeg', 
                width: 0, 
                height: 0,
                thumbnailUrl: img.url, 
                categories: [], 
                tags: [], 
                entityType: 'service',
                entityId: servicioId, 
                clinicId: tarifa?.clinicaId || '', 
                storageProvider: 'local', 
                createdAt: new Date().toISOString(), 
                updatedAt: new Date().toISOString(), 
                createdBy: 'system', 
                isDeleted: false, 
                isPublic: false, 
                metadata: {}, 
                path: img.path || '' 
              }));
              console.log(`[useEffect CargarServicio] Actualizando estado 'serviceImages'...`);
              setServiceImages(imagenesAdaptadas);
            }
            
            console.log(`[useEffect CargarServicio] Intentando cargar documentos...`);
            const documentosData = await getDocumentsByEntity('service', servicioId, 'default'); 
            console.log(`[useEffect CargarServicio] Documentos cargados: ${documentosData?.length}`);
            if (documentosData && documentosData.length > 0) {
               const documentosAdaptados: BaseFile[] = documentosData.map((doc, index) => ({
                 ...doc, 
                 thumbnailUrl: undefined, 
                 categories: doc.category ? [doc.category] : [], 
                 tags: [], 
                 clinicId: tarifa?.clinicaId || '', 
                 storageProvider: 'local', 
                 updatedAt: doc.updatedAt || doc.createdAt, 
                 createdBy: 'system', 
                 isDeleted: false, 
                 isPublic: false, 
                 metadata: {}, 
                 path: doc.path || '',
                 entityType: 'service'
               }));
              console.log(`[useEffect CargarServicio] Actualizando estado 'serviceDocuments'...`);
              setServiceDocuments(documentosAdaptados);
            }
          } else {
             console.warn(`[useEffect CargarServicio] No se encontró servicio con ID ${servicioId}`);
          }
        } catch (error) {
          console.error("[useEffect CargarServicio] Error:", error);
        } finally {
           console.log("[useEffect CargarServicio] Finalizado.");
        }
      } else {
         console.log("[useEffect CargarServicio] No hay servicioId, omitiendo carga.");
      }
    };
    
    fetchServicio();
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  // QUITAR DEPENDENCIAS DE FUNCIONES: Solo re-ejecutar si servicioId cambia 
  // para evitar bucle infinito si las funciones del contexto no están memoizadas.
  }, [servicioId]);

  // Añadir depuración de familias
  useEffect(() => {
    if (familias && familias.length > 0) {
      console.log("Familias disponibles:", familias);
      console.log("Primera familia:", familias[0]);
      // Comprueba si las familias tienen la propiedad name
      console.log("Nombre de la familia:", familias[0].name);
    }
  }, [familias]);

  // Función para navegar manteniendo el ID del servicio
  const handleNavigation = (ruta: string) => {
    const servicioIdActual = servicioActual?.id || currentServicioId;
    
    // Verificar campos obligatorios antes de navegar
    const camposFaltantes = verificarCamposObligatoriosLocal();
    
    console.log("Campos faltantes:", camposFaltantes);
    
    // Si faltan campos obligatorios, mostramos el modal de aviso
    if (camposFaltantes.length > 0) {
      setCamposFaltantes(camposFaltantes);
      setMostrarModalCamposObligatorios(true);
      return;
    }
    
    // Solo si todos los campos obligatorios están completos,
    // comprobamos si el servicio está guardado
    if (!servicioGuardado) {
      setRutaDestino(`/configuracion/tarifas/${tarifaId}/servicio/${ruta}`);
      setMostrarModalConfirmacion(true);
      return;
    }
    
    // Si todo está completo y guardado, navegamos manteniendo el ID
    router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioIdActual}/${ruta}`);
  };
  
  // Función verificarCamposYNavegar actualizada
  const verificarCamposYNavegar = (ruta: string) => {
    // Verificar primero si tenemos los campos obligatorios
    const camposFaltantes = verificarCamposObligatoriosLocal();
    console.log("Verificando campos obligatorios para navegación:", camposFaltantes);
    
    // Si faltan campos obligatorios, mostramos el modal de aviso
    if (camposFaltantes.length > 0) {
      setCamposFaltantes(camposFaltantes);
      setMostrarModalCamposObligatorios(true);
      return;
    }
    
    // Solo si todos los campos obligatorios están completos,
    // comprobamos si el servicio está guardado
    if (!servicioGuardado) {
      // Guardar la ruta de destino para usarla después de guardar
      setRutaDestino(ruta);
      // Mostrar la confirmación para guardar antes de navegar
      setMostrarModalConfirmacion(true);
      return;
    }
    
    // Si todo está completo y guardado, navegamos directamente incluyendo el ID
    const servicioId = servicioActual?.id || currentServicioId;
    if (servicioId) {
      router.push(`${ruta}?servicioId=${servicioId}`);
    } else {
      router.push(ruta);
    }
  };
  
  // Manejar el guardado del servicio (sin conversiones String() explícitas)
  const handleGuardar = async () => {
    setIsSaving(true);
    
    try {
      // Validar campos obligatorios
      const { valido, camposFaltantes } = validarCamposObligatorios();
      
      if (!valido) {
        console.error("Campos obligatorios faltantes:", camposFaltantes);
        setCamposFaltantes(camposFaltantes);
        setMostrarModalCamposObligatorios(true);
        return;
      }
      
      // Preparar el servicio para guardar (datos ya son string donde se necesita)
      const servicioParaGuardar: Partial<Servicio> = {
        // Copiar campos del estado actual
        nombre: servicio.nombre,
        codigo: servicio.codigo,
        tarifaId: tarifaId,
        familiaId: servicio.familiaId,
        ivaId: servicio.ivaId,
        colorAgenda: servicio.colorAgenda,
        duracion: servicio.duracion, 
        equipoId: servicio.equipoId,
        tipoComision: servicio.tipoComision,
        requiereParametros: servicio.requiereParametros,
        visitaValoracion: servicio.visitaValoracion,
        apareceEnApp: servicio.apareceEnApp,
        descuentosAutomaticos: servicio.descuentosAutomaticos,
        descuentosManuales: servicio.descuentosManuales,
        aceptaPromociones: servicio.aceptaPromociones,
        aceptaEdicionPVP: servicio.aceptaEdicionPVP,
        afectaEstadisticas: servicio.afectaEstadisticas,
        deshabilitado: servicio.deshabilitado,
        tarifaPlanaId: servicio.tarifaPlanaId,
        archivoAyuda: servicio.archivoAyuda,
        
        // Los precios y comisión ya son string desde el estado
        precioConIVA: servicio.precioConIVA || "0", 
        precioCoste: servicio.precioCoste || "0",
        comision: servicio.comision || "0",
      };
      
      // Guardar servicio
      let savedServicioId: string;
      let esNuevo = false;
      
      if (servicioId) {
        // Actualizar servicio existente
        await actualizarServicio(String(servicioId), servicioParaGuardar);
        savedServicioId = servicioId;
      } else {
        // Crear un nuevo servicio
        const { id, ...servicioSinId } = servicioParaGuardar;
        const servicioCompletoParaCrear = { ...servicioSinId, consumos: [] };
        savedServicioId = await crearServicio(servicioCompletoParaCrear as Omit<Servicio, 'id'>);
        esNuevo = true;
      }
      
      // Actualizar estado y mostrar mensaje
      setCurrentServicioId(savedServicioId);
      
      // Obtener el servicio actualizado
      const servicioActualizado = await getServicioById(savedServicioId);
      if (servicioActualizado) {
        setServicioActual(servicioActualizado);
      }
      
      // Disparar evento para notificar el cambio
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent("servicios-updated", {
          detail: { tarifaId: tarifaId, action: esNuevo ? 'create' : 'update' }
        }));
      }
      
      // Mostrar mensaje de éxito
      toast({
        title: esNuevo ? "Servicio creado" : "Servicio actualizado",
        description: `El servicio "${servicio.nombre}" ha sido ${esNuevo ? 'creado' : 'actualizado'} correctamente.`,
      });
      
      // Si es un servicio nuevo, redirigir a la página de edición
      if (esNuevo) {
        router.push(`/configuracion/tarifas/${tarifaId}/servicio/${savedServicioId}`);
      }
      
    } catch (error) {
      console.error("Error al guardar servicio:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el servicio. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Función para renderizar el agente con tooltip
  const renderAgente = (agente: typeof agentesSoporte[0]) => {
    return (
      <div key={agente.id} className="relative">
        <TooltipProvider>
          <Tooltip
            content={
              <div>
                <p>{agente.nombre}</p>
                <p className="text-xs">{agente.estado === 'disponible' ? 'Disponible' : 'Ocupado'}</p>
              </div>
            }
          >
            <Avatar 
              className={`cursor-pointer ${agenteSeleccionado === agente.id ? 'ring-2 ring-purple-500' : ''} ${agente.estado === 'disponible' ? '' : 'opacity-50'}`}
              onClick={() => agente.estado === 'disponible' && setAgenteSeleccionado(agente.id)}
            >
              <AvatarImage src={agente.avatar} alt={agente.nombre} />
              <AvatarFallback>{agente.nombre.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  // Estado para controlar el panel lateral
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  // Función para guardar el servicio en el contexto y navegar
  const guardarServicioYNavegar = async () => {
    // Mostrar estado de guardado
    setIsSaving(true);
    
    try {
      console.log("Guardando servicio para navegación a:", rutaDestino);
      
      // Validar una vez más por si acaso
      const camposFaltantes = verificarCamposObligatoriosLocal();
      if (camposFaltantes.length > 0) {
        setMostrarModalConfirmacion(false);
        setCamposFaltantes(camposFaltantes);
        setMostrarModalCamposObligatorios(true);
        return;
      }
      
      // Preparamos los datos del servicio para guardarlo
      const nuevoServicio = {
        ...servicio,
        tarifaId,
      };
      
      // Crear o actualizar el servicio en el contexto
      let servicioId: string;
      let esNuevo = false;
      
      if (servicioActual?.id) {
        // Si ya existe, actualizamos (asegurando que el ID es string y quitando consumos)
        const { consumos, ...servicioParaActualizar } = nuevoServicio;
        actualizarServicio(String(servicioActual.id), servicioParaActualizar);
        servicioId = String(servicioActual.id);
        console.log("Servicio actualizado para navegación:", servicioId);
      } else {
        // Si no existe, creamos uno nuevo (quitando consumos pero añadiendo array vacío)
        const { consumos, ...servicioParaCrear } = nuevoServicio;
        servicioId = await crearServicio({ ...servicioParaCrear, consumos: [] } as Omit<Servicio, 'id'>);
        esNuevo = true;
        console.log("Servicio creado para navegación:", servicioId);
      }
      
      // Disparar evento para notificar el cambio en servicios
      if (typeof window !== 'undefined') {
        console.log(`Disparando evento servicios-updated para tarifa ${tarifaId}`);
        window.dispatchEvent(new CustomEvent("servicios-updated", {
          detail: { tarifaId: tarifaId, action: esNuevo ? 'create' : 'update' }
        }));
      }
      
      // Guardar imágenes si hay
      if (serviceImages.length > 0) {
        console.log(`Guardando ${serviceImages.length} imágenes para servicio ${servicioId}`);
        
        // Si es un nuevo servicio, actualizar entityId en imágenes
        const updatedImages = serviceImages.map(img => ({
          ...img,
          entityId: servicioId,
          entityType: 'service' as 'service'  // Asegurar que el tipo sea el literal 'service'
        }));
        
        // No intentar usar uploadImage con un array completo
        // uploadImage(updatedImages, 'service', servicioId, { isPrimary: serviceImages.length === 0 });
        
        // En su lugar, simplemente guardar en localStorage directo
        localStorage.setItem(`serviceImages_${servicioId}`, JSON.stringify(updatedImages));
        
        setServiceImages(updatedImages);
        
        // Verificar guardado (con ambos argumentos)
        const savedImages = getImagesByEntity('service', servicioId);
        console.log("Imágenes guardadas verificadas:", savedImages);
        
        // Notificar al sistema de archivos global
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('files-updated', { 
            detail: { entityType: 'service', entityId: servicioId }
          }));
        }
      }
      
      // Guardar documentos si hay
      if (serviceDocuments.length > 0) {
        console.log(`Guardando ${serviceDocuments.length} documentos para servicio ${servicioId}`);
        
        // Actualizar documentos con el nuevo ID
        const updatedDocs = serviceDocuments.map(doc => ({
          ...doc,
          entityId: servicioId
        }));
        
        setServiceDocuments(updatedDocs);
        
        // Guardar en almacenamiento persistente
        if (servicioActual?.id) {
          console.log("Guardando documentos para servicio ID:", servicioActual.id);
          
          // No intentar usar uploadDocument con un array completo
          // const saveResult = uploadDocument(updatedDocs, 'service', servicioActual.id, 'help_documents');
          
          // En su lugar, simplemente guardar en localStorage
          localStorage.setItem(`service_docs_${servicioActual.id}_default`, JSON.stringify(updatedDocs));
          console.log("Documentos guardados en localStorage:", updatedDocs);
        } else {
          console.log("No se guardaron documentos en localStorage porque no hay ID de servicio");
        }
      }
      
      // Mostrar mensaje de éxito
      toast({
        title: esNuevo ? "Servicio creado" : "Servicio actualizado",
        description: "El servicio se ha guardado correctamente. Redirigiendo...",
      });
      
      // Navegar a la ruta de destino incluyendo tanto el ID de tarifa como el ID de servicio
      setTimeout(() => {
        if (rutaDestino) {
          const rutaCompleta = rutaDestino.includes('?') 
            ? `${rutaDestino}&servicioId=${servicioId}` 
            : `${rutaDestino}?servicioId=${servicioId}`;
          
          router.push(rutaCompleta);
        }
      }, 500); // Breve retardo para permitir que el toast se muestre
    } catch (error) {
      console.error("Error al guardar el servicio:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el servicio. Inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setMostrarModalConfirmacion(false);
    }
  };

  // Función para navegar a la página anterior - reemplazo completo
  const handleCancel = () => {
    // Eliminar todo dato relacionado con este servicio del localStorage
    // para prevenir cualquier interferencia futura
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (
            key.includes('temp-id') || 
            key.includes('service_docs_') ||
            key.includes('serviceImages_') ||
            (servicioId && key.includes(servicioId))
          ) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error("Error al limpiar localStorage:", e);
      }
    }

    // Abortar cualquier solicitud pendiente
    if (typeof window !== 'undefined' && 'AbortController' in window) {
      try {
        const controller = new AbortController();
        controller.abort();
      } catch (e) {
        console.error("Error al abortar solicitudes:", e);
      }
    }

    // Forzar navegación directa sin pasar por React Router
    window.location.href = `/configuracion/tarifas/${tarifaId}`;
  };
  
  // Agregar la función handleFileUpload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Para simplicidad, solo guardamos el nombre del archivo
      setServicio({
        ...servicio,
        archivoAyuda: file.name
      });
    }
  };
  
  // Referencia para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // renderDocumentsSection sigue devolviendo solo la lista o el estado de carga
  const renderDocumentsSection = () => (
    <>
      {isLoadingAssets ? (
        <div className="flex items-center justify-center p-4 rounded-md bg-gray-50 h-20">
          <div className="inline-block w-5 h-5 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-500">Cargando...</span>
        </div>
      ) : (
        <DocumentList
          documents={serviceDocuments}
          onAddDocuments={handleAddDocuments}
          onRemove={handleRemoveDocument}
          onView={handleViewDocument}
          editable={true}
          compact={true}
        />
      )}
    </>
  );

  // Funciones para manejar imágenes
  const handleAddImages = async (files: File[]) => {
    if (!servicio.tarifaId) {
      toast({
        title: "Error",
        description: "Por favor, primero asegúrate de tener una tarifa seleccionada",
        variant: "destructive",
      });
      return;
    }
    
    // Indicar que estamos cargando
    setIsLoadingAssets(true);
    
    try {
      console.log("Archivos seleccionados para subir:", files.map(f => ({nombre: f.name, tipo: f.type, tamaño: f.size})));
      const uploadedImages: ImageFile[] = [];
      
      for (const file of files) {
        // Asegurar que tenemos un ID válido para la entidad
        const entityId = String(servicioActual?.id || 'temp-id');
        
        console.log("Subiendo imagen para entidad:", entityId, "tipo:", 'service', "tarifa:", servicio.tarifaId);
        console.log("Archivo a subir:", file.name, file.type, file.size);
        
        // Verificar que el archivo sea realmente una imagen
        if (!file.type.startsWith('image/')) {
          console.error("El archivo no es una imagen:", file.type);
          toast({
            title: "Error de archivo",
            description: `El archivo ${file.name} no es una imagen válida`,
            variant: "destructive",
          });
          continue; // Pasar al siguiente archivo
        }
        
        try {
          const newImageEntity: EntityImage = await uploadImage(
            file, 
            'service', 
            entityId,
            servicio.tarifaId,
            { isPrimary: serviceImages.length === 0 && uploadedImages.length === 0 }
          );

          // Adaptar a ImageFile
          const newImage: ImageFile = {
              ...newImageEntity,
              position: serviceImages.length + uploadedImages.length,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              width: 0,
              height: 0,
              thumbnailUrl: newImageEntity.url,
              categories: [],
              tags: [],
              entityType: 'service',
              entityId: entityId,
              clinicId: tarifa?.clinicaId || '',
              storageProvider: 'local',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'user',
              isDeleted: false,
              isPublic: false,
              metadata: {},
              path: newImageEntity.path || ''
          };
          
          console.log("Imagen adaptada para UI:", newImage);
          uploadedImages.push(newImage);
        } catch (uploadError) {
          console.error("Error al subir imagen individual:", uploadError);
        }
      }
      
      console.log(`Se subieron ${uploadedImages.length} imágenes con éxito`);
      
      if (uploadedImages.length === 0) {
        toast({
          title: "Advertencia",
          description: "No se pudo subir ninguna imagen. Verifica los formatos de archivo.",
          variant: "destructive",
        });
        // Finalizar el estado de carga
        setIsLoadingAssets(false);
        return;
      }
      
      // Actualizar estado local
      const updatedImages = [...serviceImages, ...uploadedImages];
      setServiceImages(updatedImages);
      
      toast({
        title: "Imágenes subidas",
        description: `${uploadedImages.length} imagen(es) subida(s) correctamente`,
      });
    } catch (error) {
      console.error("Error al subir imágenes:", error);
      toast({
        title: "Error",
        description: "No se pudieron subir las imágenes. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      // Asegurarse de desactivar el estado de carga
      setIsLoadingAssets(false);
    }
  };

  // Función para establecer una imagen como principal
  const handleSetPrimaryImage = async (imageId: string) => {
    try {
      await setPrimaryImage(imageId);
      
      // Actualizar estado local
      const updatedImages = serviceImages.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      }));
      
      setServiceImages(updatedImages);
      
      toast({
        title: "Imagen actualizada",
        description: "Imagen principal establecida correctamente",
      });
    } catch (error) {
      console.error("Error al establecer imagen principal:", error);
      toast({
        title: "Error",
        description: "No se pudo establecer la imagen principal",
        variant: "destructive",
      });
    }
  };
  
  // Función para eliminar una imagen
  const handleRemoveImage = async (imageId: string) => {
    try {
      // Eliminar del estado local
      const updatedImages = serviceImages.filter(img => img.id !== imageId);
      setServiceImages(updatedImages);
      
      toast({
        title: "Imagen eliminada",
        description: "Imagen eliminada correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la imagen",
        variant: "destructive",
      });
    }
  };
  
  // Función para agregar documentos
  const handleAddDocuments = async (files: File[]) => {
    if (!servicio.tarifaId) {
      toast({
        title: "Error",
        description: "Por favor, primero asegúrate de tener una tarifa seleccionada",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Documentos seleccionados para subir:", files.map(f => ({nombre: f.name, tipo: f.type, tamaño: f.size})));
      const uploadedDocs: BaseFile[] = [];
      
      for (const file of files) {
        const entityId = String(servicioActual?.id || 'temp-id');
        console.log("Subiendo documento para entidad:", entityId, "tipo:", 'service', "tarifa:", servicio.tarifaId);
        
        try {
          const newDocEntity: EntityDocument = await uploadDocument(
            file, 
            'service', 
            entityId,
            servicio.tarifaId,
            'help_documents'
          );

          // Adaptar a DocumentFile (BaseFile)
          const newDoc: BaseFile = {
            ...newDocEntity,
            thumbnailUrl: undefined,
            categories: newDocEntity.category ? [newDocEntity.category] : ['help_documents'],
            tags: [],
            clinicId: tarifa?.clinicaId || '',
            storageProvider: 'local',
            updatedAt: newDocEntity.updatedAt || newDocEntity.createdAt,
            createdBy: 'user',
            isDeleted: false,
            isPublic: false,
            metadata: {},
            path: newDocEntity.path || '',
            entityType: 'service'
          };

          console.log("Documento adaptado para UI:", newDoc);
          uploadedDocs.push(newDoc);
        } catch (uploadError) {
          console.error("Error al subir documento individual:", uploadError);
        }
      }
      
      console.log(`Se subieron ${uploadedDocs.length} documentos con éxito`);
      
      if (uploadedDocs.length === 0) {
        toast({
          title: "Advertencia",
          description: "No se pudo subir ningún documento. Verifica los formatos de archivo.",
          variant: "destructive",
        });
        return;
      }
      
      // Actualizar estado local
      const updatedDocs = [...serviceDocuments, ...uploadedDocs];
      setServiceDocuments(updatedDocs);
      
      // Actualizar también el nombre del archivo de ayuda en el estado principal
      if (uploadedDocs.length > 0) {
        setServicio({
          ...servicio,
          archivoAyuda: uploadedDocs[0].fileName
        });
      }
      
      toast({
        title: "Documentos subidos",
        description: `${uploadedDocs.length} documento(s) subido(s) correctamente`,
      });
    } catch (error) {
      console.error("Error al subir documentos:", error);
      toast({
        title: "Error",
        description: "No se pudieron subir los documentos. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };
  
  // Función para eliminar un documento
  const handleRemoveDocument = async (docId: string) => {
    try {
      // Eliminar del estado local
      const updatedDocs = serviceDocuments.filter(doc => doc.id !== docId);
      setServiceDocuments(updatedDocs as any);
      
      // Si era el único o el primer documento, actualizar el estado principal
      if (serviceDocuments.length <= 1) {
        setServicio({
          ...servicio,
          archivoAyuda: null
        });
      }
      
      toast({
        title: "Documento eliminado",
        description: "Documento eliminado correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  // Función para verificar campos obligatorios localmente
  const verificarCamposObligatoriosLocal = () => {
    const camposFaltantes = [];
    
    // Verificar campos obligatorios
    if (!servicio.nombre || servicio.nombre.trim() === '') {
      camposFaltantes.push('Nombre');
    }
    
    if (!servicio.codigo || servicio.codigo.trim() === '') {
      camposFaltantes.push('Código');
    }
    
    if (!servicio.familiaId || servicio.familiaId === '') {
      camposFaltantes.push('Familia');
    }
    
    return camposFaltantes;
  };

  const handleViewDocument = (doc: any) => {
    window.open(doc.url, '_blank');
  };

  // Redirigir a la página de tarifa después de guardar
  const redirigirATarifa = () => {
    // Insertar un parámetro 'updated' para forzar un refresco de la página en caso de que vuelva a ella 
    router.push(`/configuracion/tarifas/${Array.isArray(params.id) ? params.id[0] : params.id as string}?tab=servicios&updated=${Date.now()}`);
  };

  // Restaurar handleDuracionChange para los botones
  const handleDuracionChange = (incremento: number) => { 
      const nuevaDuracion = Math.max(1, (servicio.duracion || 0) + incremento); // Min 1
      setServicio(prev => ({ // Usar función de actualización
        ...prev,
        duracion: nuevaDuracion
      }));
  }; 

  return (
    // 1. Contenedor Principal: h-screen, flex-col, overflow-hidden
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* 2. Área de Contenido Scrolleable: flex-grow, overflow-auto, min-h-0 */}
      <div className="flex-grow overflow-y-auto min-h-0">
        {/* Contenedor interno para padding y centrado. Padding inferior aumentado (pb-12) */} 
        <div className="container mx-auto px-4 py-6 pb-12">
          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className={`text-lg font-semibold mb-4 ${colorEncabezado}`}>Información Básica</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio *</label>
                      <Input id="nombre" name="nombre" value={servicio.nombre} onChange={handleInputChange} required className={selectHoverClass} />
                    </div>
                    <div>
                      <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                      <Input id="codigo" name="codigo" value={servicio.codigo} onChange={handleInputChange} required className={selectHoverClass} />
                    </div>
                  </div>
                   <div>
                      <label htmlFor="familiaId" className="block text-sm font-medium text-gray-700 mb-1">Familia *</label>
                      <Select name="familiaId" value={servicio.familiaId} onValueChange={(value) => handleSelectChange('familiaId', value)}>
                        <SelectTrigger className={cn("w-full", selectHoverClass)}>
                          <SelectValue placeholder="Selecciona una familia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder" disabled>Selecciona una familia</SelectItem>
                          {familias.map((familia) => (
                            <SelectItem key={familia.id} value={familia.id}>
                              {familia.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div>
                      <label htmlFor="tarifaBase" className="block text-sm font-medium text-gray-700 mb-1">Tarifa Base</label>
                      <Input id="tarifaBase" name="tarifaBase" value={tarifa?.nombre || 'Cargando...'} readOnly disabled className="bg-gray-100" />
                    </div>
                    <div>
                      <label htmlFor="ivaId" className="block text-sm font-medium text-gray-700 mb-1">Tipo de IVA *</label>
                       <Select name="ivaId" value={servicio.ivaId} onValueChange={(value) => handleSelectChange('ivaId', value)}>
                          <SelectTrigger className={cn("w-full", selectHoverClass)}>
                            <SelectValue placeholder="Selecciona un tipo de IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placeholder" disabled>Selecciona un tipo de IVA</SelectItem>
                            {tiposIVA.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                {tipo.descripcion} ({tipo.porcentaje}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </CardContent>
              </Card>
               <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className={`text-lg font-semibold mb-4 ${colorEncabezado}`}>Configuración y Precios</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                        <label htmlFor="duracion" className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos) *</label>
                        <div className="flex items-center">
                          <Button variant="outline" size="icon" onClick={() => handleDuracionChange(-1)} className="rounded-r-none h-10 w-10">
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="duracion"
                            name="duracion"
                            type="number"
                            value={servicio.duracion}
                            onChange={handleInputChange}
                            min="1"
                            step="1"
                            required
                            className={cn("w-20 text-center rounded-none h-10 hide-number-arrows", selectHoverClass)}
                          />
                          <Button variant="outline" size="icon" onClick={() => handleDuracionChange(1)} className="rounded-l-none h-10 w-10">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                     </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="colorAgenda" className="block text-sm font-medium text-gray-700 mb-1">Color Agenda *</label>
                      <Select name="colorAgenda" value={servicio.colorAgenda} onValueChange={(value) => handleSelectChange('colorAgenda', value)}>
                        <SelectTrigger className={cn("w-full", selectHoverClass)}>
                          <SelectValue placeholder="Selecciona un color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder" disabled>Selecciona un color</SelectItem>
                          {coloresAgenda.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center">
                                <span className={`w-4 h-4 rounded-full mr-2 ${color.clase}`}></span>
                                {color.nombre}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="precioConIVA" className="block text-sm font-medium text-gray-700 mb-1">Precio Venta (IVA Incl.) *</label>
                        <Input id="precioConIVA" name="precioConIVA" type="number" step="0.01" value={servicio.precioConIVA} onChange={handleInputChange} required className={selectHoverClass} />
                    </div>
                    <div>
                      <label htmlFor="equipoId" className="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
                       <Select name="equipoId" value={servicio.equipoId} onValueChange={(value) => handleSelectChange('equipoId', value)}>
                          <SelectTrigger className={cn("w-full", selectHoverClass)}>
                            <SelectValue placeholder="Selecciona un equipo (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placeholder">Sin equipo específico</SelectItem>
                            {equiposDisponibles.map((equipo) => (
                              <SelectItem key={equipo.id} value={equipo.id}>
                                {equipo.name} ({equipo.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tipoComision" className="block text-sm font-medium text-gray-700 mb-1">Tipo Comisión</label>
                      <Select name="tipoComision" value={servicio.tipoComision} onValueChange={(value) => handleSelectChange('tipoComision', value)}>
                        <SelectTrigger className={cn("w-full", selectHoverClass)}>
                          <SelectValue placeholder="Selecciona tipo comisión" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposComision.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div>
                      <label htmlFor="comision" className="block text-sm font-medium text-gray-700 mb-1">Comisión</label>
                      <Input id="comision" name="comision" type="number" step="0.01" value={servicio.comision} onChange={handleInputChange} className={selectHoverClass} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna Derecha */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className={`text-lg font-semibold mb-4 ${colorEncabezado}`}>Imágenes</h2>
                  <ImageGallery
                    images={serviceImages}
                    onAddImages={handleAddImages}
                    onRemove={handleRemoveImage}
                    onSetPrimary={handleSetPrimaryImage}
                    editable={true}
                    layout='carousel'
                  />
                </CardContent>
              </Card>

              {/* Sección: Documentos (Ultra-compacta, sin Card, sin wrapper, sin label) */}
              {renderDocumentsSection()}

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className={`text-lg font-semibold mb-4 ${colorEncabezado}`}>Opciones Avanzadas</h2>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="requiereParametros" checked={servicio.requiereParametros} onCheckedChange={(checked) => handleCheckboxChange('requiereParametros', !!checked)} />
                        <label htmlFor="requiereParametros" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Requiere Parámetros
                        </label>
                      </div>
                       <div className="flex items-center space-x-2">
                        <Checkbox id="visitaValoracion" checked={servicio.visitaValoracion} onCheckedChange={(checked) => handleCheckboxChange('visitaValoracion', !!checked)} />
                        <label htmlFor="visitaValoracion" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Visita de Valoración
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="apareceEnApp" checked={servicio.apareceEnApp} onCheckedChange={(checked) => handleCheckboxChange('apareceEnApp', !!checked)} />
                        <label htmlFor="apareceEnApp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Aparece en APP/WEB
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Checkbox id="descuentosAutomaticos" checked={servicio.descuentosAutomaticos} onCheckedChange={(checked) => handleCheckboxChange('descuentosAutomaticos', !!checked)} />
                          <label htmlFor="descuentosAutomaticos" className="text-sm font-medium">Permite Desc. Automáticos</label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Checkbox id="descuentosManuales" checked={servicio.descuentosManuales} onCheckedChange={(checked) => handleCheckboxChange('descuentosManuales', !!checked)} />
                          <label htmlFor="descuentosManuales" className="text-sm font-medium">Permite Desc. Manuales</label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <Checkbox id="aceptaPromociones" checked={servicio.aceptaPromociones} onCheckedChange={(checked) => handleCheckboxChange('aceptaPromociones', !!checked)} />
                          <label htmlFor="aceptaPromociones" className="text-sm font-medium">Acepta Promociones</label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <Checkbox id="aceptaEdicionPVP" checked={servicio.aceptaEdicionPVP} onCheckedChange={(checked) => handleCheckboxChange('aceptaEdicionPVP', !!checked)} />
                          <label htmlFor="aceptaEdicionPVP" className="text-sm font-medium">Permite Editar PVP</label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <Checkbox id="afectaEstadisticas" checked={servicio.afectaEstadisticas} onCheckedChange={(checked) => handleCheckboxChange('afectaEstadisticas', !!checked)} />
                          <label htmlFor="afectaEstadisticas" className="text-sm font-medium">Afecta Estadísticas</label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <Checkbox id="deshabilitado" checked={servicio.deshabilitado} onCheckedChange={(checked) => handleCheckboxChange('deshabilitado', !!checked)} />
                          <label htmlFor="deshabilitado" className="text-sm font-medium text-red-600">Servicio Deshabilitado</label>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div> {/* Fin container mx-auto px-4 py-6 pb-12 */}
      </div> {/* Fin Área de Contenido Scrolleable */}

      {/* 3. Barra de Botones Fija: flex-shrink-0 */}
      <div className="flex-shrink-0 border-t bg-white shadow-md">
        {/* Contenedor interno para alinear botones */}
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex space-x-1 overflow-x-auto">
                <Button variant="ghost" size="sm" className={buttonNavClass} onClick={() => verificarCamposYNavegar(`/configuracion/tarifas/${tarifaId}/servicio/${currentServicioId}/consumos`)}>Consumos</Button>
                <Button variant="ghost" size="sm" className={buttonNavClass} onClick={() => handleNavigation('puntos')}>Puntos</Button>
                <Button variant="ghost" size="sm" className={buttonNavClass} onClick={() => handleNavigation('bonos')}>Bonos</Button>
                <Button variant="ghost" size="sm" className={buttonNavClass} onClick={() => handleNavigation('recursos')}>Recursos</Button>
                <Button variant="ghost" size="sm" className={buttonNavClass} onClick={() => handleNavigation('parametros')}>Parámetros</Button>
                <Button variant="ghost" size="sm" className={buttonNavClass} onClick={() => handleNavigation('avanzado')}>Avanzado</Button>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <Button variant="outline" onClick={handleCancel} className={buttonSecondaryClass}>
                    Volver
                </Button>
                <Button
                    onClick={handleGuardar}
                    disabled={isSaving}
                    className={buttonPrimaryClass}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Guardando..." : (isNew ? "Crear Servicio" : "Guardar Cambios")}
                </Button>
                 <HelpButton content="Ayuda contextual para la edición del servicio." />
            </div>
          </div>
        </div>
      </div>

      {/* Modales (sin cambios) */}
      {/* Modal Campos Obligatorios */}
      <Dialog open={mostrarModalCamposObligatorios} onOpenChange={setMostrarModalCamposObligatorios}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="text-red-500 mr-2" />
              Campos Obligatorios Faltantes
            </DialogTitle>
            <DialogDescription>
              Por favor, completa los siguientes campos antes de guardar:
              <ul className="list-disc list-inside mt-2 text-red-600">
                {camposFaltantes.map((campo, index) => (
                  <li key={index}>{campo}</li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setMostrarModalCamposObligatorios(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación Navegación */}
      <Dialog open={mostrarModalConfirmacion} onOpenChange={setMostrarModalConfirmacion}>
       <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="text-yellow-500 mr-2" />
              Confirmar Navegación
              </DialogTitle>
            <DialogDescription>
              Tienes cambios sin guardar. ¿Estás seguro de que quieres salir sin guardar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
             <Button variant="outline" onClick={() => setMostrarModalConfirmacion(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={guardarServicioYNavegar}>Salir sin Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div> // Fin Contenedor principal
  )
}

// Estilos CSS necesarios (pueden ir en un archivo CSS global o en un <style jsx>)
// Asegúrate de tener esta regla CSS en algún lugar accesible globalmente
/*
.hide-number-arrows::-webkit-outer-spin-button,
.hide-number-arrows::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.hide-number-arrows[type=number] {
  -moz-appearance: textfield; // Firefox
}
*/

