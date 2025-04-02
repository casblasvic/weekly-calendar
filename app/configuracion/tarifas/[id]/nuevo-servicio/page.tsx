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
import { ImageFile, DocumentFile } from "@/contexts/file-context"
import { useServicio } from "@/contexts/servicios-context"
import { useImages } from "@/contexts/image-context"
import { useDocuments } from "@/contexts/document-context"

// Función para generar IDs únicos sin dependencias externas
const generateId = () => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Consumo interface
interface Consumo {
  id: string
  cantidad: number
  tipoConsumo: string
}

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
  const router = useRouter()
  const params = useParams<PageParams>()
  const tarifaId = String(params?.id || "")
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');
  
  // Usar contextos especializados en lugar de interfaz directamente
  const { getTarifaById } = useTarif();
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
  
  // Crear estados para almacenar los datos
  const [tarifa, setTarifa] = useState<any>(null);
  const [tiposIVA, setTiposIVA] = useState<any[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  
  const [isSaving, setIsSaving] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajeAyuda, setMensajeAyuda] = useState("")
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<string | null>(null)
  
  // Estado para guardar el servicioId para navegación
  const [currentServicioId, setCurrentServicioId] = useState<string | null>(null);
  
  const [servicio, setServicio] = useState({
    id: "",
    nombre: "",
    codigo: "",
    tarifaId: tarifaId,
    tarifaBase: tarifa?.nombre || "Tarifa Base",
    familiaId: "",
    precioConIVA: "",
    ivaId: "",
    colorAgenda: "Rosa",
    duracion: 45, // Duración en minutos
    equipoId: "(Todos)",
    tipoComision: "Porcentaje",
    comision: "3",
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
    precioCoste: "0.00",
    tarifaPlanaId: "(Ninguna)",
    archivoAyuda: null as string | null,
  })

  // Variables para colores globales de la aplicación
  const colorPrimario = "bg-purple-600 hover:bg-purple-700 text-white";
  const colorSecundario = "bg-gray-200 hover:bg-gray-300 text-gray-800";
  const colorFoco = "focus:ring-2 focus:ring-purple-500 focus:ring-offset-2";
  const colorEncabezado = "text-purple-700";

  // Estilos comunes para botones
  const buttonPrimaryClass = `${colorPrimario} ${colorFoco} transition-all duration-200 ease-in-out transform hover:scale-105`;
  const buttonSecondaryClass = `${colorSecundario} ${colorFoco} transition-all duration-200`;
  const buttonNavClass = `text-sm rounded-md bg-gray-50 hover:bg-gray-100 border-gray-300 ${colorFoco} transition-all duration-200 hover:border-purple-300`;

  // Estilo para los desplegables (como en la barra lateral)
  const selectHoverClass = "hover:border-purple-400 focus:border-purple-500 focus:ring-purple-500";

  // Función para formatear la duración
  const formatearDuracion = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas > 0 ? horas + 'h ' : ''}${mins}min`;
  };

  // Mantener handleInputChange para inputs normales
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setServicio({
      ...servicio,
      [name]: type === 'number' ? Number(value) : value
    })
  }

  // Función específica para los componentes Select
  const handleSelectChange = (name: string, value: string) => {
    // Si recibimos "placeholder", lo convertimos a cadena vacía internamente
    const valueToStore = value === "placeholder" ? "" : value;
    
    setServicio({
      ...servicio,
      [name]: valueToStore
    })
  }

  // Manejar cambios en la duración
  const handleDuracionChange = (incremento: number) => {
    const nuevaDuracion = Math.max(5, servicio.duracion + incremento);
    setServicio({
      ...servicio,
      duracion: nuevaDuracion
    });
  }

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (id: string, checked: boolean) => {
    setServicio({
      ...servicio,
      [id]: checked
    })
  }
  
  // Estados para modales
  const [mostrarModalCamposObligatorios, setMostrarModalCamposObligatorios] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [rutaDestino, setRutaDestino] = useState<string | null>(null);
  
  // Agregar estados para imágenes y documentos
  const [serviceImages, setServiceImages] = useState<ImageFile[]>([]);
  const [serviceDocuments, setServiceDocuments] = useState<DocumentFile[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  
  // AHORA es seguro usar servicioActual
  const servicioGuardado = Boolean(servicioActual?.id);
  
  // Cargar los datos utilizando contextos especializados
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar tarifa
        const tarifaData = await getTarifaById(tarifaId);
        setTarifa(tarifaData);
        
        // Cargar tipos de IVA
        const ivaData = await getTiposIVAByTarifaId(tarifaId);
        setTiposIVA(ivaData);
        
        // Cargar familias
        const familiasData = await getRootFamilies();
        setFamilias(familiasData);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      }
    };
    
    if (tarifaId) {
      fetchData();
    }
  }, [tarifaId, getTarifaById, getTiposIVAByTarifaId, getRootFamilies]);
  
  // Cargar servicio si existe ID
  useEffect(() => {
    const fetchServicio = async () => {
      if (servicioId) {
        try {
          const servicioData = await getServicioById(servicioId);
          if (servicioData) {
            setCurrentServicioId(servicioId);
            setServicioActual(servicioData);
            
            // Formatear el servicio para el formulario
            const servicioFormateado = {
              ...servicioData,
              tarifaBase: tarifa?.nombre || "Tarifa Base",
              consumos: servicioData.consumos || [{
                id: generateId(),
                cantidad: 1,
                tipoConsumo: "Unidades"
              }],
              precioConIVA: servicioData.precioConIVA?.toString() || "",
              precioCoste: servicioData.precioCoste?.toString() || "",
              comision: servicioData.comision?.toString() || ""
            };
            
            setServicio(servicioFormateado);
            
            // Cargar imágenes
            const imagenes = await getImagesByEntity('service', servicioId);
            if (imagenes && imagenes.length > 0) {
              setServiceImages(imagenes as ImageFile[]);
            }
            
            // Cargar documentos
            const documentos = await getDocumentsByEntity('service', servicioId, 'default');
            if (documentos && documentos.length > 0) {
              setServiceDocuments(documentos as DocumentFile[]);
            }
          }
        } catch (error) {
          console.error("Error al cargar servicio:", error);
        }
      }
    };
    
    fetchServicio();
  }, [servicioId, getServicioById, getImagesByEntity, getDocumentsByEntity, tarifa]);

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
    const servicioId = servicioActual?.id || currentServicioId;
    
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
      setRutaDestino(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/${ruta}`);
      setMostrarModalConfirmacion(true);
      return;
    }
    
    // Si todo está completo y guardado, navegamos manteniendo el ID
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/${ruta}?servicioId=${servicioId}`);
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
  
  // Manejar el guardado del servicio
  const handleGuardar = async () => {
    // Validar campos obligatorios
    const resultado = validarCamposObligatorios();
    
    if (resultado.camposFaltantes.length > 0) {
      // Mostrar modal de campos faltantes (no el de confirmación)
      setCamposFaltantes(resultado.camposFaltantes);
      setMostrarModalCamposObligatorios(true);
      return;
    }
    
    // Indicar que estamos guardando
    setIsSaving(true);
    
    try {
      let servicioId: string;
      let esNuevo = false;
      
      if (servicioActual?.id) {
        // Actualizar servicio existente
        const servicioUpdated = actualizarServicio(servicioActual.id, servicio);
        servicioId = servicioActual.id;
        console.log("Servicio actualizado correctamente:", servicioUpdated);
      } else {
        // Crear nuevo servicio
        servicioId = crearServicio(servicio);
        esNuevo = true;
        console.log("Servicio creado correctamente con ID:", servicioId);
      }
      
      // Disparar evento para notificar el cambio en servicios
      if (typeof window !== 'undefined') {
        console.log(`Disparando evento servicios-updated para tarifa ${tarifaId}`);
        window.dispatchEvent(new CustomEvent("servicios-updated", {
          detail: { tarifaId: tarifaId, action: esNuevo ? 'create' : 'update' }
        }));
      }
      
      // Guardar imágenes
      if (serviceImages.length > 0) {
        console.log(`Guardando ${serviceImages.length} imágenes para servicio ID: ${servicioId}`);
        
        // Si es un nuevo servicio o las imágenes tienen entityId temporal, actualizarlo
        const updatedImages = serviceImages.map(img => ({
          ...img,
          entityId: servicioId,
          entityType: 'service' as 'service'  // Asegurar que el tipo sea el literal 'service'
        }));
        
        console.log("Imágenes a guardar:", updatedImages);
        
        // Guardar imágenes con el ID correcto
        const saveResult = uploadImage(updatedImages, 'service', servicioId, { isPrimary: serviceImages.length === 0 });
        console.log("Resultado de guardar imágenes:", saveResult);
        
        // También en localStorage directo como respaldo
        localStorage.setItem(`serviceImages_${servicioId}`, JSON.stringify(updatedImages));
        
        // Verificar que se guardaron correctamente
        const savedImages = getImagesByEntity(servicioId);
        console.log("Imágenes guardadas verificadas:", savedImages);
        
        // Notificar al sistema de archivos global
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('files-updated', { 
            detail: { entityType: 'service', entityId: servicioId }
          }));
        }
        
        setServiceImages(updatedImages);
      } else {
        console.log("No hay imágenes para guardar");
      }
      
      // Guardar documentos
      if (serviceDocuments.length > 0) {
        console.log(`Guardando ${serviceDocuments.length} documentos para servicio ID: ${servicioId}`);
        
        // Actualizar entityId en los documentos
        const updatedDocs = serviceDocuments.map(doc => ({
          ...doc,
          entityId: servicioId
        }));
        
        // Guardar documentos usando la función de MockData
        const saveResult = uploadDocument(updatedDocs, 'service', servicioId, 'help_documents');
        console.log("Resultado de guardar documentos:", saveResult);
        
        setServiceDocuments(updatedDocs);
      } else {
        console.log("No hay documentos para guardar");
      }
      
      // Actualizar el estado global
      const servicioGuardado = getServicioById(servicioId);
      if (servicioGuardado) {
        setServicioActual(servicioGuardado);
      }
      
      // Mostrar mensaje de éxito
      toast({
        title: esNuevo ? "Servicio creado" : "Servicio guardado",
        description: esNuevo 
          ? "El servicio se ha creado correctamente"
          : "El servicio se ha actualizado correctamente",
      });
      
      // Navegar a la página de destino después de guardar
      if (rutaDestino) {
        router.push(`${rutaDestino}?servicioId=${servicioId}`);
      } else {
        // Redirigir a la página de tarifa después de guardar
        redirigirATarifa();
      }
    } catch (error) {
      console.error("Error al guardar servicio:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el servicio",
        variant: "destructive",
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
        // Si ya existe, actualizamos
        actualizarServicio(servicioActual.id, nuevoServicio);
        servicioId = servicioActual.id;
        console.log("Servicio actualizado para navegación:", servicioId);
      } else {
        // Si no existe, creamos uno nuevo
        servicioId = crearServicio(nuevoServicio);
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
        
        // Guardar imágenes usando la función de mockData
        uploadImage(updatedImages, 'service', servicioId, { isPrimary: serviceImages.length === 0 });
        
        // También guardar en localStorage directo
        localStorage.setItem(`serviceImages_${servicioId}`, JSON.stringify(updatedImages));
        
        setServiceImages(updatedImages);
        
        // Verificar guardado
        const savedImages = getImagesByEntity(servicioId);
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
        
        // Guardar documentos usando la función de MockData
        uploadDocument(updatedDocs, 'service', servicioId, 'help_documents');
        console.log("Documentos guardados en localStorage:", updatedDocs);
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

  // Función para navegar a la página anterior
  const handleCancel = () => {
    router.push(`/configuracion/tarifas/${tarifaId}`);
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

  // Reemplazar la sección de "Archivo De Ayuda" por una sección de documentos
  const renderDocumentsSection = () => (
    <div className="mt-6">
      <label className="block mb-2 text-sm font-medium text-gray-700">
        Documentos de ayuda
      </label>
      {isLoadingAssets ? (
        <div className="flex items-center justify-center p-4 rounded-md bg-gray-50">
          <div className="inline-block w-6 h-6 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-500">Cargando documentos...</span>
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
    </div>
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
        const entityId = servicioActual?.id || 'temp-id';
        
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
          const newImage = await uploadImage(
            file, 
            'service', 
            entityId,
            servicio.tarifaId,
            { isPrimary: serviceImages.length === 0 && uploadedImages.length === 0 }
          );
          
          console.log("Imagen subida con éxito:", newImage);
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
      
      // Guardar explícitamente en localStorage
      if (servicioActual?.id) {
        console.log("Guardando imágenes para servicio ID:", servicioActual.id);
        const saveResult = uploadImage(updatedImages, 'service', servicioActual.id, { isPrimary: serviceImages.length === 0 });
        console.log("Resultado de guardar imágenes:", saveResult);
        
        // También guardar en localStorage directo como copia de seguridad
        localStorage.setItem(`serviceImages_${servicioActual.id}`, JSON.stringify(updatedImages));
        console.log("Imágenes guardadas en localStorage:", updatedImages);
        
        // Verificar que se guardaron correctamente
        const verificarImgs = getImagesByEntity(servicioActual.id);
        console.log("Imágenes verificadas después de guardar:", verificarImgs);
      } else {
        console.log("No se guardaron imágenes en localStorage porque no hay ID de servicio");
      }
      
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
      
      // Guardar en localStorage
      if (servicioActual?.id) {
        uploadImage(updatedImages, 'service', servicioActual.id, { isPrimary: serviceImages.length === 0 });
        localStorage.setItem(`serviceImages_${servicioActual.id}`, JSON.stringify(updatedImages));
      }
      
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
      
      // Guardar en localStorage
      if (servicioActual?.id) {
        uploadImage(updatedImages, 'service', servicioActual.id, { isPrimary: serviceImages.length === 0 });
        localStorage.setItem(`serviceImages_${servicioActual.id}`, JSON.stringify(updatedImages));
        
        // Notificar a la aplicación que se ha eliminado un archivo
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('file-deleted', { 
            detail: { 
              fileId: imageId,
              entityType: 'service', 
              entityId: servicioActual.id 
            }
          }));
        }
      }
      
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
      const uploadedDocs: DocumentFile[] = [];
      
      for (const file of files) {
        const entityId = servicioActual?.id || 'temp-id';
        console.log("Subiendo documento para entidad:", entityId, "tipo:", 'service', "tarifa:", servicio.tarifaId);
        
        try {
          const newDoc = await uploadDocument(
            file, 
            'service', 
            entityId,
            servicio.tarifaId,
            'help_documents'
          );
          console.log("Documento subido con éxito:", newDoc);
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
      
      // Guardar en almacenamiento persistente
      if (servicioActual?.id) {
        console.log("Guardando documentos para servicio ID:", servicioActual.id);
        const saveResult = uploadDocument(updatedDocs, 'service', servicioActual.id, 'help_documents');
        console.log("Resultado de guardar documentos:", saveResult);
        
        // También guardar en localStorage como respaldo
        localStorage.setItem(`service_docs_${servicioActual.id}_default`, JSON.stringify(updatedDocs));
        console.log("Documentos guardados en localStorage:", updatedDocs);
      } else {
        console.log("No se guardaron documentos en localStorage porque no hay ID de servicio");
      }
      
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
      setServiceDocuments(updatedDocs);
      
      // Si era el único o el primer documento, actualizar el estado principal
      if (serviceDocuments.length <= 1) {
        setServicio({
          ...servicio,
          archivoAyuda: null
        });
      }
      
      // Guardar los cambios en MockData
      if (servicioActual?.id) {
        console.log(`Guardando documentos actualizados después de eliminar para servicio ID: ${servicioActual.id}`);
        const saveResult = uploadDocument(updatedDocs, 'service', servicioActual.id, 'help_documents');
        console.log("Resultado de guardar documentos:", saveResult);
        
        // También guardar en localStorage directo como copia de seguridad
        localStorage.setItem(`service_docs_${servicioActual.id}_default`, JSON.stringify(updatedDocs));
        console.log("Documentos guardados en localStorage:", updatedDocs);
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

  // Efecto para actualizar la variable CSS del sidebar
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebar = document.querySelector('[data-sidebar]');
      if (sidebar) {
        const sidebarWidth = sidebar.getBoundingClientRect().width;
        document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
      } else {
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      }
    };

    // Actualizar inicialmente
    updateSidebarWidth();

    // Crear un observer para detectar cambios en el DOM
    const observer = new MutationObserver(updateSidebarWidth);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true 
    });

    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', updateSidebarWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSidebarWidth);
      document.documentElement.style.removeProperty('--sidebar-width');
    };
  }, []);

  // Redirigir a la página de tarifa después de guardar
  const redirigirATarifa = () => {
    // Insertar un parámetro 'updated' para forzar un refresco de la página en caso de que vuelva a ella 
    router.push(`/configuracion/tarifas/${Array.isArray(params.id) ? params.id[0] : params.id as string}?tab=servicios&updated=${Date.now()}`);
  };

  return (
    <div className="container mx-auto h-screen flex flex-col" style={{ marginLeft: 'var(--sidebar-width, 0px)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold">Datos del servicio</h1>
        
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Columna Izquierda */}
              <div>
                <div className="mb-4">
                  <div className="mb-1 text-sm text-gray-500">Tarifa</div>
                  <div className="text-sm font-medium">{servicio.tarifaBase}</div>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Imágenes del servicio
                  </label>
                  {isLoadingAssets ? (
                    <div className="flex items-center justify-center p-2 rounded-md bg-gray-50 h-28">
                      <div className="inline-block w-5 h-5 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
                      <span className="ml-2 text-xs text-gray-500">Cargando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <ImageGallery
                        images={serviceImages}
                        onAddImages={handleAddImages}
                        onSetPrimary={handleSetPrimaryImage}
                        onRemove={handleRemoveImage}
                        editable={true}
                        layout="carousel"
                      />
                    </div>
                  )}
                  {/* Texto explicativo */}
                  <p className="mt-1 text-xs text-gray-500 italic">
                    {serviceImages.length > 0 
                      ? `${serviceImages.length} ${serviceImages.length === 1 ? 'imagen cargada' : 'imágenes cargadas'}. Puedes añadir más.` 
                      : "Haz clic para subir imágenes (se permiten múltiples archivos)"}
                  </p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="nombre" className="block mb-1 text-sm font-medium text-gray-700">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={servicio.nombre}
                    onChange={handleInputChange}
                    placeholder="Nombre del servicio"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="codigo" className="block mb-1 text-sm font-medium text-gray-700">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="codigo"
                    name="codigo"
                    value={servicio.codigo}
                    onChange={handleInputChange}
                    placeholder="Ej: SRV001"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="familia" className="block text-sm font-medium text-gray-700">
                    Familia <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={servicio.familiaId || "placeholder"}
                    onValueChange={(value) => handleSelectChange('familiaId', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar familia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">Seleccionar...</SelectItem>
                      {familias.map((familia) => (
                        <SelectItem key={familia.id} value={familia.id}>
                          {familia.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="precioConIVA" className="block mb-1 text-sm font-medium text-gray-700">
                    Precio con IVA
                  </label>
                  <Input
                    id="precioConIVA"
                    name="precioConIVA"
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicio.precioConIVA}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="iva" className="block mb-1 text-sm font-medium text-gray-700">
                    IVA
                  </label>
                  <Select
                    value={servicio.ivaId}
                    onValueChange={(value) => handleSelectChange("ivaId", value)}
                  >
                    <SelectTrigger className="w-full focus:ring-indigo-500">
                      <SelectValue placeholder="Selecciona un IVA" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposIVA && tiposIVA.map((iva) => (
                        <SelectItem key={iva.id} value={iva.id}>
                          {iva.descripcion} ({iva.porcentaje}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Cuando el servicio o producto forma parte de un paquete:
                  </label>
                  <Select
                    value={servicio.tarifaPlanaId}
                    onValueChange={(value) => handleSelectChange("tarifaPlanaId", value)}
                  >
                    <SelectTrigger className="w-full focus:ring-indigo-500">
                      <SelectValue placeholder="Pertenece a la tarifa plana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="(Ninguna)">(Ninguna)</SelectItem>
                      {/* Aquí irían las tarifas planas disponibles */}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="consumo" className="block mb-1 text-sm font-medium text-gray-700">
                      Consumo
                    </label>
                    <Input
                      id="consumo"
                      name="consumo"
                      type="number"
                      min="1"
                      value={servicio.consumos[0].cantidad}
                      onChange={(e) => {
                        const consumos = [...servicio.consumos];
                        consumos[0].cantidad = Number(e.target.value);
                        setServicio({...servicio, consumos});
                      }}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="tipoConsumo" className="block mb-1 text-sm font-medium text-gray-700">
                      Tipo de consumo
                    </label>
                    <Select
                      value={servicio.consumos[0].tipoConsumo}
                      onValueChange={(value) => {
                        const consumos = [...servicio.consumos];
                        consumos[0].tipoConsumo = value;
                        setServicio({...servicio, consumos});
                      }}
                    >
                      <SelectTrigger className="w-full focus:ring-indigo-500">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposConsumo.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="precioCoste" className="block mb-1 text-sm font-medium text-gray-700">
                    Precio de coste
                  </label>
                  <Input
                    id="precioCoste"
                    name="precioCoste"
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicio.precioCoste}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              {/* Columna Derecha */}
              <div>
                <div className="mb-4">
                  <label htmlFor="colorAgenda" className="block mb-1 text-sm font-medium text-gray-700">
                    Color en agenda
                  </label>
                  <Select
                    value={servicio.colorAgenda}
                    onValueChange={(value) => handleSelectChange("colorAgenda", value)}
                  >
                    <SelectTrigger className="w-full focus:ring-indigo-500">
                      <SelectValue placeholder="Selecciona un color" />
                    </SelectTrigger>
                    <SelectContent>
                      {coloresAgenda.map((color) => (
                        <SelectItem key={color.id} value={color.id}>
                          <div className="flex items-center">
                            <div className={`w-4 h-4 mr-2 rounded-full ${color.clase}`}></div>
                            {color.nombre}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="duracion" className="block mb-1 text-sm font-medium text-gray-700">
                    Duración
                  </label>
                  <div className="flex rounded-md">
                    <div className="relative flex items-stretch flex-grow focus-within:z-10">
                      <Input
                        id="duracion"
                        name="duracion"
                        value={formatearDuracion(servicio.duracion)}
                        readOnly
                        placeholder="00:00 (hh:mm)"
                        className="border-gray-300 rounded-md rounded-r-none shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex flex-col">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center flex-1 px-1 text-gray-500 border border-transparent hover:text-gray-700"
                          onClick={() => handleDuracionChange(5)}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center flex-1 px-1 text-gray-500 border border-transparent hover:text-gray-700"
                          onClick={() => handleDuracionChange(-5)}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 text-sm text-gray-500 border border-l-0 border-gray-300 rounded-r-md bg-gray-50">
                      Minutos
                    </span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="equipo" className="block mb-1 text-sm font-medium text-gray-700">
                    Equipo
                  </label>
                  <Select
                    value={servicio.equipoId}
                    onValueChange={(value) => handleSelectChange("equipoId", value)}
                  >
                    <SelectTrigger className="w-full focus:ring-indigo-500">
                      <SelectValue placeholder="Selecciona un equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="(Todos)">(Todos)</SelectItem>
                      {/* Aquí irían los equipos disponibles */}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="tipoComision" className="block mb-1 text-sm font-medium text-gray-700">
                      Tipo de comisión
                    </label>
                    <Select
                      value={servicio.tipoComision}
                      onValueChange={(value) => handleSelectChange("tipoComision", value)}
                    >
                      <SelectTrigger className="w-full focus:ring-indigo-500">
                        <SelectValue placeholder="Tipo" />
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
                    <label htmlFor="comision" className="block mb-1 text-sm font-medium text-gray-700">
                      Comisión
                    </label>
                    <Input
                      id="comision"
                      name="comision"
                      type="number"
                      min="0"
                      step="0.01"
                      value={servicio.comision}
                      onChange={handleInputChange}
                      placeholder={servicio.tipoComision === "Porcentaje" ? "0" : "0.00"}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="mb-4 space-y-2">
                  <div className="flex items-center">
                    <Checkbox
                      id="requiereParametros"
                      checked={servicio.requiereParametros}
                      onCheckedChange={(checked) => handleCheckboxChange("requiereParametros", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="requiereParametros" className="ml-2 text-sm">Requiere parámetros</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="visitaValoracion"
                      checked={servicio.visitaValoracion}
                      onCheckedChange={(checked) => handleCheckboxChange("visitaValoracion", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="visitaValoracion" className="ml-2 text-sm">Visita de valoración</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="apareceEnApp"
                      checked={servicio.apareceEnApp}
                      onCheckedChange={(checked) => handleCheckboxChange("apareceEnApp", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="apareceEnApp" className="ml-2 text-sm">Aparece en App / Self</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="descuentosAutomaticos"
                      checked={servicio.descuentosAutomaticos}
                      onCheckedChange={(checked) => handleCheckboxChange("descuentosAutomaticos", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="descuentosAutomaticos" className="ml-2 text-sm">Descuentos automáticos</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="descuentosManuales"
                      checked={servicio.descuentosManuales}
                      onCheckedChange={(checked) => handleCheckboxChange("descuentosManuales", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="descuentosManuales" className="ml-2 text-sm">Descuentos manuales</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="aceptaPromociones"
                      checked={servicio.aceptaPromociones}
                      onCheckedChange={(checked) => handleCheckboxChange("aceptaPromociones", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="aceptaPromociones" className="ml-2 text-sm">Acepta promociones</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="aceptaEdicionPVP"
                      checked={servicio.aceptaEdicionPVP}
                      onCheckedChange={(checked) => handleCheckboxChange("aceptaEdicionPVP", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="aceptaEdicionPVP" className="ml-2 text-sm">Acepta edición PVP</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="afectaEstadisticas"
                      checked={servicio.afectaEstadisticas}
                      onCheckedChange={(checked) => handleCheckboxChange("afectaEstadisticas", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="afectaEstadisticas" className="ml-2 text-sm">Afecta estadísticas</label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="deshabilitado"
                      checked={servicio.deshabilitado}
                      onCheckedChange={(checked) => handleCheckboxChange("deshabilitado", !!checked)}
                      className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="deshabilitado" className="ml-2 text-sm">Deshabilitado</label>
                  </div>
                </div>
                
                {renderDocumentsSection()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botones de navegación y acción - Ahora fijos en la parte inferior del contenedor principal */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex justify-between items-center gap-2">
          {/* Menú desplegable para móvil */}
          <div className="block md:hidden">
            <Select
              onValueChange={(value) => {
                if (value === 'consumos') {
                  verificarCamposYNavegar(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/consumos`);
                } else {
                  handleNavigation(value);
                }
              }}
            >
              <SelectTrigger className="w-[130px] bg-gray-50">
                <SelectValue placeholder="Navegación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumos">Consumos</SelectItem>
                <SelectItem value="puntos">Puntos</SelectItem>
                <SelectItem value="bonos">Bonos</SelectItem>
                <SelectItem value="suscripciones">Suscripciones</SelectItem>
                <SelectItem value="datos-app">Datos App</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botones de navegación para desktop */}
          <div className="hidden md:flex space-x-2 overflow-x-auto">
            <Button 
              variant="outline" 
              size="sm"
              className={`${buttonNavClass} whitespace-nowrap text-xs`}
              onClick={() => verificarCamposYNavegar(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/consumos`)}
            >
              Consumos
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              className={`${buttonNavClass} whitespace-nowrap text-xs`}
              onClick={() => handleNavigation('puntos')}
            >
              Puntos
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              className={`${buttonNavClass} whitespace-nowrap text-xs`}
              onClick={() => handleNavigation('bonos')}
            >
              Bonos
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              className={`${buttonNavClass} whitespace-nowrap text-xs`}
              onClick={() => handleNavigation('suscripciones')}
            >
              Suscripciones
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              className={`${buttonNavClass} whitespace-nowrap text-xs`}
              onClick={() => handleNavigation('datos-app')}
            >
              Datos App
            </Button>
          </div>
          
          {/* Botones de acción (siempre visibles) */}
          <div className="flex space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className={`${buttonSecondaryClass} text-xs px-3 py-1`}
              onClick={handleCancel}
            >
              Volver
            </Button>
            <Button
              variant="default"
              size="sm"
              className={`${buttonPrimaryClass} text-xs px-3 py-1`}
              onClick={handleGuardar}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="mr-1 animate-spin">
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                  <span>Guardando...</span>
                </>
              ) : (
                "Guardar"
              )}
            </Button>
            <HelpButton content="Ayuda para la creación de servicios" />
          </div>
        </div>
      </div>

      {/* Modal de error para campos obligatorios - mejorado */}
      <Dialog
        open={mostrarModalCamposObligatorios}
        onOpenChange={setMostrarModalCamposObligatorios}
      >
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-center text-red-600">
              <AlertCircle className="w-6 h-6 mr-2" />
              Datos incompletos
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 text-sm text-muted-foreground">
              <span className="block mb-3">Debe completar los siguientes campos obligatorios:</span>
              <ul className="inline-block pl-5 mb-3 text-left list-disc">
                {camposFaltantes.map((campo, index) => (
                  <li key={index} className="text-red-600">{campo}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-gray-600">
                Estos campos son necesarios para poder guardar y continuar.
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-center pt-2">
            <Button
              className="w-32"
              onClick={() => setMostrarModalCamposObligatorios(false)}
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para guardar servicio */}
      <Dialog open={mostrarModalConfirmacion} onOpenChange={setMostrarModalConfirmacion}>
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <Save className="w-5 h-5 mr-2" />
              Guardar servicio
            </DialogTitle>
          </DialogHeader>
          <div className="px-2 py-4">
            <p className="mb-3 text-gray-700">
              El servicio no ha sido guardado. Se creará automáticamente para poder continuar.
            </p>
            <p className="font-medium text-gray-800">
              ¿Desea continuar?
            </p>
          </div>
          <DialogFooter className="pt-2 space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setMostrarModalConfirmacion(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="text-white bg-indigo-600 hover:bg-indigo-700"
              onClick={guardarServicioYNavegar}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar y continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
