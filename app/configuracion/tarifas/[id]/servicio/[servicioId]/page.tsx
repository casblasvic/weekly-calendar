"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { FileQuestion, Plus, Minus, ChevronUp, ChevronDown, MessageSquare, Users, HelpCircle, X, Send, ShoppingCart, AlertCircle, Save, AlertTriangle, Star, Ticket } from "lucide-react"
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
import { normalizeString } from "@/lib/utils" // Asumiendo que tienes una función así o créala

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
  { id: "Rosa", nombre: "Rosa", clase: "bg-pink-500" },
  { id: "Azul", nombre: "Azul", clase: "bg-blue-500" },
  { id: "Verde", nombre: "Verde", clase: "bg-green-500" },
  { id: "Amarillo", nombre: "Amarillo", clase: "bg-yellow-500" },
  { id: "Morado", nombre: "Morado", clase: "bg-purple-500" },
  { id: "Naranja", nombre: "Naranja", clase: "bg-orange-500" },
  { id: "Gris", nombre: "Gris", clase: "bg-gray-500" },
];

// Tipos de comisión - Añadir Global
const tiposComision = [
  { id: "Global", nombre: "Global" }, // Nueva opción
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
    validarCamposObligatorios,
    getAllServicios // O alguna función similar
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
  const [currentServicioId, setCurrentServicioId] = useState<string | null>(servicioId);
  
  // Restaurar estados y tipos correctos para imágenes/documentos
  const [serviceImages, setServiceImages] = useState<ImageFile[]>([]); 
  const [serviceDocuments, setServiceDocuments] = useState<BaseFile[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Estados para el servicio actual - Inicializar precios a "0.00"
  const [servicio, setServicio] = useState<Partial<Servicio>>({
    nombre: "",
    codigo: "",
    tarifaId: tarifaId,
    familiaId: "",
    precioConIVA: "0.00", // Default a "0.00"
    ivaId: "",
    colorAgenda: coloresAgenda[0]?.id || "", // Default primer color
    duracion: 45,
    equipoId: "",
    tipoComision: "Global", // Default a "Global"
    comision: "0.00", // Default a "0.00"
    requiereParametros: false,
    visitaValoracion: false,
    apareceEnApp: true, // Default sensible
    descuentosAutomaticos: true, // Default sensible
    descuentosManuales: true, // Default sensible
    aceptaPromociones: true, // Default sensible
    aceptaEdicionPVP: false,
    afectaEstadisticas: true,
    deshabilitado: false,
    consumos: [], // Empezar vacío
    precioCoste: "0.00", // Default a "0.00"
    tarifaPlanaId: "",
    archivoAyuda: null,
  });

  // Estados para detectar cambios y estado inicial
  const [initialServicio, setInitialServicio] = useState<string>('');
  const [hayCambios, setHayCambios] = useState(false);

  // Restaurar variables de estilo y funciones auxiliares
  const colorPrimario = "bg-purple-600 hover:bg-purple-700 text-white";
  const colorSecundario = "bg-gray-200 hover:bg-gray-300 text-gray-800";
  const colorFoco = "focus:ring-2 focus:ring-purple-500 focus:ring-offset-2";
  const colorEncabezado = "text-purple-700";
  const buttonPrimaryClass = `${colorPrimario} ${colorFoco} transition-all duration-200 ease-in-out transform hover:scale-105`;
  const buttonSecondaryClass = `${colorSecundario} ${colorFoco} transition-all duration-200`;
  const buttonNavClass = `text-sm rounded-md bg-gray-50 hover:bg-gray-100 border-gray-300 ${colorFoco} transition-all duration-200 hover:border-purple-300`;
  const selectHoverClass = "hover:border-purple-400 focus:border-purple-500 focus:ring-purple-500";
  
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [allExistingCodes, setAllExistingCodes] = useState<Set<string>>(new Set());

  // Cargar todos los códigos existentes al montar
  useEffect(() => {
    const fetchExistingCodes = async () => {
      try {
        const servicios = await getAllServicios(); // Asumiendo que devuelve Servicio[]
        const codesSet = new Set<string>(); // Inicializar Set<string> vacío
        servicios.forEach(s => {
          // Añadir solo si el código es un string válido y no vacío
          if (typeof s.codigo === 'string' && s.codigo.length > 0) {
            codesSet.add(s.codigo);
          }
        });
        setAllExistingCodes(codesSet); // Pasar el Set<string> directamente
        console.log("[useEffect Codes] Códigos existentes cargados:", codesSet);
      } catch (error) {
        console.error("Error cargando códigos existentes:", error);
      }
    };
    fetchExistingCodes();
  }, [getAllServicios]);

  // Modificar handleInputChange para detectar edición manual del código
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let processedValue: string | boolean | number = value; // Tipo más general inicial

    if (type === 'checkbox') {
        processedValue = checked;
    } else if (type === 'number') {
        // Mantener como string para precios/comisión según la lógica de onBlur
        // Para duración, podríamos convertir a número aquí si se prefiere
        processedValue = value; 
    } else {
        // Para inputs de texto (nombre, codigo, etc.)
        processedValue = value;
        if (name === 'codigo') {
            setIsCodeManuallyEdited(true);
        }
    }

    setServicio(prev => ({ ...prev, [name]: processedValue }));
    setHayCambios(true);
  }; 
  const handleSelectChange = (name: string, value: string) => { 
      const valueToStore = value === "placeholder" ? "" : value;
      setServicio(prev => ({ ...prev, [name]: valueToStore }));
      setHayCambios(true);
  }; 
  const handleCheckboxChange = (id: string, checked: boolean) => { 
      setServicio(prev => ({ ...prev, [id]: checked }));
      setHayCambios(true);
  }; 

  // Restaurar estados para modales
  const [mostrarModalCamposObligatorios, setMostrarModalCamposObligatorios] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [rutaDestino, setRutaDestino] = useState<string | null>(null);
  const [mostrarModalConfirmacionSinPrecioIVA, setMostrarModalConfirmacionSinPrecioIVA] = useState(false);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');
  const [showSaveToContinueModal, setShowSaveToContinueModal] = useState(false);
  const [pendingSubSection, setPendingSubSection] = useState<string | null>(null);
  const [subSectionDisplayName, setSubSectionDisplayName] = useState<string>(''); // Para el mensaje del modal

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
  
  // Cargar servicio si existe ID y establecer estado inicial
  useEffect(() => {
    const fetchServicio = async () => {
      if (servicioId) {
        try {
          console.log(`[useEffect FetchServicio] Intentando cargar servicio ID: ${servicioId}`);
          const servicioData = await getServicioById(servicioId);
          // LOG: Qué se carga al entrar/refrescar
          console.log("[useEffect FetchServicio] Datos cargados:", JSON.parse(JSON.stringify(servicioData)));
          
          if (servicioData) {
            // Formatear valores numéricos a string con dos decimales para el estado
            const servicioParaEstado = {
              ...servicioData,
              precioConIVA: (servicioData.precioConIVA != null ? Number(servicioData.precioConIVA).toFixed(2) : "0.00"),
              precioCoste: (servicioData.precioCoste != null ? Number(servicioData.precioCoste).toFixed(2) : "0.00"),
              comision: (servicioData.comision != null ? Number(servicioData.comision).toFixed(2) : "0.00"),
              duracion: Number(servicioData.duracion || 0)
            };
            setServicio(servicioParaEstado);
            setInitialServicio(JSON.stringify(servicioParaEstado));
            setHayCambios(false);
            setCurrentServicioId(servicioId);
            // Cargar imágenes y documentos asociados
            // ... (lógica existente para cargar assets) ...
          } else {
             // Manejar caso: servicio no encontrado
             console.error(`Servicio con ID ${servicioId} no encontrado.`);
             toast({ title: "Error", description: "Servicio no encontrado.", variant: "destructive" });
             router.push(`/configuracion/tarifas/${tarifaId}?tab=servicios`);
          }
        } catch (error) {
          console.error("Error al cargar el servicio:", error);
          toast({ title: "Error", description: "No se pudo cargar el servicio.", variant: "destructive" });
        } finally {
           // setIsLoading(false); // Si tienes un estado de carga general
        }
      } else {
         // Es un servicio nuevo, establecer estado inicial con "0.00"
         const estadoInicialNuevo = {
             tarifaId: tarifaId,
             nombre: "",
             codigo: "",
             familiaId: "",
             precioConIVA: "0.00",
             ivaId: "",
             colorAgenda: "", 
             duracion: 45,
             equipoId: "",
             tipoComision: "Global",
             comision: "0.00",
             requiereParametros: false,
             visitaValoracion: false,
             apareceEnApp: true,
             descuentosAutomaticos: true,
             descuentosManuales: true,
             aceptaPromociones: true,
             aceptaEdicionPVP: false,
             afectaEstadisticas: true,
             deshabilitado: false,
             consumos: [],
             precioCoste: "0.00",
             tarifaPlanaId: "",
             archivoAyuda: null,
         };
         setServicio(estadoInicialNuevo);
         setInitialServicio(JSON.stringify(estadoInicialNuevo));
         setHayCambios(false);
      }
    };
    fetchServicio();
  }, [servicioId, tarifaId, getServicioById, router]); // Dependencias

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
  
  // Handler específico para inputs numéricos (precios, comisión) para formatear a dos decimales
  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Intentar parsear y formatear solo si no está vacío
    if (value.trim() !== '') {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        // No formatear aquí para permitir la edición fluida
        // formattedValue = parsedValue.toFixed(2);
      } else {
         // Si no es un número válido, quizás no actualizar o limpiar?
         // Por ahora, dejamos que el estado refleje lo que escribe el usuario
         // La validación/formateo final ocurrirá al guardar o en onBlur
      }
    }
    
    setServicio(prev => ({ ...prev, [name]: formattedValue }));
    setHayCambios(true);
  };
  
  // Handler para onBlur en campos numéricos para formatear
  const handleNumericInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      let formattedValue = "0.00"; // Default si está vacío o inválido
      if (value.trim() !== '') {
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue)) {
              formattedValue = parsedValue.toFixed(2);
          } else {
             // Si al salir el valor no es un número, lo reseteamos a 0.00
             // Podrías querer otra lógica aquí, como mostrar un error
          }
      }
      setServicio(prev => ({ ...prev, [name]: formattedValue }));
      // No marcar hayCambios aquí necesariamente, onBlur ocurre incluso sin cambios reales
  };

  // Verificar campos obligatorios - Quitar colorAgenda
  const verificarCamposObligatoriosLocal = () => {
      const faltantes = [];
      if (!servicio.nombre?.trim()) faltantes.push('Nombre');
      if (!servicio.codigo?.trim()) faltantes.push('Código');
      if (!servicio.familiaId) faltantes.push('Familia');
      if (!servicio.duracion || Number(servicio.duracion) <= 0) faltantes.push('Duración (debe ser mayor que 0)');
      return faltantes;
  };

  // Nueva función para realizar el guardado
  const guardarServicioReal = async (navigateToSubSection: string | null = null) => {
    console.log(`[guardarServicioReal] Iniciando guardado. Navegar después a: ${navigateToSubSection}`);
    setIsSaving(true);
    setShowSaveToContinueModal(false); // Cerrar modal si veníamos de él
    setMostrarModalConfirmacionSinPrecioIVA(false);
    let savedServicioId: string | null = currentServicioId; // Mantener ID si ya existe
    let esNuevoGuardado = false;

    try {
      // Formatear y validar precios/comisión antes de preparar el objeto
      const formatAndValidateNumeric = (value: string | number | undefined | null): string | undefined => {
          if (value === null || value === undefined || String(value).trim() === '') return undefined;
          const parsed = parseFloat(String(value));
          if (isNaN(parsed)) return undefined; 
          return parsed.toFixed(2); 
      };
      
      const precioConIVAFormatted = formatAndValidateNumeric(servicio.precioConIVA);
      const precioCosteFormatted = formatAndValidateNumeric(servicio.precioCoste);
      const comisionFormatted = formatAndValidateNumeric(servicio.comision);
      
      // Si la validación indica que un campo requerido ahora es undefined, podríamos parar aquí
      // if (!precioConIVAFormatted && /* alguna lógica que lo requiera */ ) { ... }

      const servicioParaGuardar: Partial<Servicio> = {
        ...servicio,
        tarifaId: tarifaId,
        duracion: Number(servicio.duracion || 0),
        // Usar los valores formateados/validados
        precioConIVA: precioConIVAFormatted,
        precioCoste: precioCosteFormatted,
        comision: comisionFormatted,
        // Asegurar que los campos opcionales sean undefined si están vacíos
        ivaId: servicio.ivaId || undefined,
        equipoId: servicio.equipoId || undefined,
        tarifaPlanaId: servicio.tarifaPlanaId || undefined,
        // Asegurar que los booleanos sean booleanos
        requiereParametros: Boolean(servicio.requiereParametros),
        visitaValoracion: Boolean(servicio.visitaValoracion),
        apareceEnApp: Boolean(servicio.apareceEnApp),
        descuentosAutomaticos: Boolean(servicio.descuentosAutomaticos),
        descuentosManuales: Boolean(servicio.descuentosManuales),
        aceptaPromociones: Boolean(servicio.aceptaPromociones),
        aceptaEdicionPVP: Boolean(servicio.aceptaEdicionPVP),
        afectaEstadisticas: Boolean(servicio.afectaEstadisticas),
        deshabilitado: Boolean(servicio.deshabilitado),
        colorAgenda: servicio.colorAgenda || coloresAgenda[0]?.id, // Asegurar un valor por defecto
      };
      
      // Eliminar propiedades undefined si la API lo prefiere
      Object.keys(servicioParaGuardar).forEach(key => 
         servicioParaGuardar[key] === undefined && delete servicioParaGuardar[key]
      );

      // LOG: Qué se va a guardar
      console.log("[guardarServicioReal] Datos a guardar:", JSON.parse(JSON.stringify(servicioParaGuardar)));

      if (currentServicioId) { 
        console.log(`[guardarServicioReal] Llamando a actualizarServicio para ID: ${currentServicioId}`);
        await actualizarServicio(currentServicioId, servicioParaGuardar);
        savedServicioId = currentServicioId;
      } else {
        console.log(`[guardarServicioReal] Llamando a crearServicio...`);
        const { id, ...servicioSinId } = servicioParaGuardar;
        const servicioCompletoParaCrear = { ...servicioSinId, consumos: servicio.consumos || [] };
        savedServicioId = await crearServicio(servicioCompletoParaCrear as Omit<Servicio, 'id'>);
        esNuevoGuardado = true;
        setCurrentServicioId(savedServicioId); // MUY IMPORTANTE: Actualizar ID actual
        console.log(`[guardarServicioReal] Servicio creado con ID: ${savedServicioId}`);
      }

      console.log(`[guardarServicioReal] Obteniendo servicio actualizado ID: ${savedServicioId}`);
      const servicioActualizado = await getServicioById(savedServicioId!);
      // LOG: Qué se obtuvo después de guardar
      console.log("[guardarServicioReal] Servicio obtenido post-guardado:", JSON.parse(JSON.stringify(servicioActualizado)));

      if (servicioActualizado) {
         // Formatear para el estado antes de actualizar
         const servicioParaEstado = {
            ...servicioActualizado,
            precioConIVA: (servicioActualizado.precioConIVA != null ? Number(servicioActualizado.precioConIVA).toFixed(2) : "0.00"),
            precioCoste: (servicioActualizado.precioCoste != null ? Number(servicioActualizado.precioCoste).toFixed(2) : "0.00"),
            comision: (servicioActualizado.comision != null ? Number(servicioActualizado.comision).toFixed(2) : "0.00"),
            duracion: Number(servicioActualizado.duracion || 0)
         };
         console.log("[guardarServicioReal] Actualizando estado local y estado inicial.");
         setServicio(servicioParaEstado);
         setInitialServicio(JSON.stringify(servicioParaEstado));
         setHayCambios(false);
         
         // Disparar evento ANTES de navegar
         if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("servicios-updated", {
              detail: { tarifaId: tarifaId, action: esNuevoGuardado ? 'create' : 'update' }
            }));
          }

         // Navegación PENDIENTE a subsección (si aplica)
         if (navigateToSubSection && savedServicioId) {
            console.log(`[guardarServicioReal] Guardado exitoso, navegando a subsección pendiente: ${navigateToSubSection}`);
            router.push(`/configuracion/tarifas/${tarifaId}/servicio/${savedServicioId}/${navigateToSubSection}`);
            setPendingSubSection(null); // Limpiar estado
            // ¡IMPORTANTE! Salir aquí para evitar la lógica de toast/redirección estándar de abajo
            setIsSaving(false); // Asegurarse de quitar el estado saving
            return; 
         }
         
         // Toast de éxito (solo si no navegamos a subsección)
         toast({
            title: esNuevoGuardado ? "Servicio creado" : "Servicio actualizado",
            description: `El servicio "${servicioActualizado.nombre || 'Nuevo Servicio'}" ha sido ${esNuevoGuardado ? 'creado' : 'actualizado'} correctamente.`,
          });

         // Redirección estándar si era NUEVO y NO navegamos a subsección
         if (esNuevoGuardado) {
           console.log("[guardarServicioReal] Servicio nuevo creado, redirigiendo a su página.");
           // Ya estamos en la página correcta si se creó, no hace falta redirigir
           // router.push(`/configuracion/tarifas/${tarifaId}/servicio/${savedServicioId}`);
         }

      } else {
         console.warn("[guardarServicioReal] No se pudo obtener el servicio actualizado post-guardado.");
         toast({ title: "Error", description: "Se guardó el servicio, pero hubo un problema al recargar los datos.", variant: "destructive" });
      }

    } catch (error) {
       console.error("Error al guardar servicio:", error);
       toast({
         title: "Error al guardar",
         description: "No se pudo guardar el servicio. Por favor, inténtalo de nuevo.",
         variant: "destructive"
       });
       // Si el error fue al crear, resetear currentServicioId podría ser útil
       if (esNuevoGuardado) setCurrentServicioId(null);
    } finally {
      // Asegurarse de quitar el estado saving solo si no hubo return temprano
      setIsSaving(false);
    }
  };

  // handleGuardar ahora puede recibir el destino opcional
  const handleGuardar = async (navigateToSubSection: string | null = null) => {
    // 1. Validar campos base obligatorios
    const camposBaseFaltantes = verificarCamposObligatoriosLocal(); 
    if (camposBaseFaltantes.length > 0) {
        setCamposFaltantes(camposBaseFaltantes);
        setMostrarModalCamposObligatorios(true);
        return;
    }

    // Parsear precio a número, tratando null/undefined/''/NaN como 0 para la lógica de validación
    const precioString = String(servicio.precioConIVA || '0').trim();
    const precioNumerico = parseFloat(precioString);
    const precioEsValidoYMayorQueCero = !isNaN(precioNumerico) && precioNumerico > 0;
    
    const tieneIVA = servicio.ivaId && servicio.ivaId.trim() !== '';

    // 2. Si precio > 0 pero no IVA -> Error
    if (precioEsValidoYMayorQueCero && !tieneIVA) {
        setCamposFaltantes(['Tipo de IVA (obligatorio si precio > 0)']);
        setMostrarModalCamposObligatorios(true);
        return;
    }

    // 3. Si precio <= 0 -> Mostrar modal de confirmación (mensaje simplificado)
    if (!precioEsValidoYMayorQueCero) { 
        // Mensaje único sin importar si tiene IVA o no
        const mensajeConfirm = 'El servicio se guardará sin precio indicado.';
        setMensajeConfirmacion(mensajeConfirm + ' ¿Deseas continuar?');
        setMostrarModalConfirmacionSinPrecioIVA(true);
        return; 
    }

    // 4. Si precio > 0 y tiene IVA -> Guardar directamente
    await guardarServicioReal(navigateToSubSection); 
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
    console.log("[guardarServicioYNavegar] Intentando guardar antes de salir a:", rutaDestino);
    setIsSaving(true); 
    setMostrarModalConfirmacion(false); // Cerrar modal de navegación
    try {
        // Validar campos base
        const camposBaseFaltantes = verificarCamposObligatoriosLocal();
        if (camposBaseFaltantes.length > 0) {
            setCamposFaltantes(camposBaseFaltantes);
            setMostrarModalCamposObligatorios(true);
            setIsSaving(false);
            return; // No salir si faltan campos base
        }
        
        // Validar Precio/IVA
        const precioString = String(servicio.precioConIVA || '0').trim();
        const precioNumerico = parseFloat(precioString);
        const precioEsValidoYMayorQueCero = !isNaN(precioNumerico) && precioNumerico > 0;
        const tieneIVA = servicio.ivaId && servicio.ivaId.trim() !== '';
        if (precioEsValidoYMayorQueCero && !tieneIVA) {
            setCamposFaltantes(['Tipo de IVA (obligatorio si precio > 0)']);
            setMostrarModalCamposObligatorios(true);
            setIsSaving(false);
            return; // No salir si falta IVA con precio > 0
        }
        
        // Si el precio es <= 0, NO preguntamos de nuevo aquí, simplemente guardamos.
        // Llamamos a guardarServicioReal directamente, sin pasar destino de subsección
        await guardarServicioReal(null); 
        
        // Si guardarServicioReal no lanzó error, asumimos que fue bien.
        // Navegar a destino original (o a la tarifa)
        const destinoFinal = rutaDestino || `/configuracion/tarifas/${tarifaId}?tab=servicios&updated=${Date.now()}`;
        console.log("[guardarServicioYNavegar] Guardado OK (o no requerido preguntar), navegando a destino final:", destinoFinal);
        router.push(destinoFinal); 
        setRutaDestino(null); // Limpiar ruta

    } catch (error) {
        // guardarServicioReal ya muestra toast de error
        console.error("Error durante el proceso de guardar y navegar (salir):", error);
    } finally {
        // setIsSaving ya lo gestiona guardarServicioReal
    }
};

  // Función para navegar a la página anterior - usar router.push
  const handleCancel = () => {
    console.log(`[handleCancel] Navegando a: /configuracion/tarifas/${tarifaId}?tab=servicios`);
    router.push(`/configuracion/tarifas/${tarifaId}?tab=servicios&updated=${Date.now()}`);
    // Ya no es necesaria la limpieza de localStorage ni abortar requests 
    // si usamos navegación client-side y el componente se desmonta correctamente.
    // Tampoco window.location.href
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
      const nuevaDuracion = Math.max(1, (Number(servicio.duracion) || 0) + incremento); // Min 1, asegurar número
      setServicio(prev => ({ 
        ...prev,
        duracion: nuevaDuracion
      }));
      setHayCambios(true); // Marcar cambio aquí también
  }; 

  // Navegación a subsecciones (Consumos, Puntos, Bonos, etc.)
  const handleSubSectionNavigation = (targetSection: string, displayName: string) => {
     console.log(`[handleSubSectionNavigation] Intentando navegar a: ${targetSection}`);
     if (currentServicioId) {
         // Servicio existente: navegar directamente
         console.log(`[handleSubSectionNavigation] Servicio existente (${currentServicioId}), navegando directamente.`);
         router.push(`/configuracion/tarifas/${tarifaId}/servicio/${currentServicioId}/${targetSection}`);
     } else {
         // Servicio nuevo: validar y mostrar modal para guardar
         console.log("[handleSubSectionNavigation] Servicio nuevo, validando campos esenciales...");
         const camposEsencialesFaltantes = verificarCamposObligatoriosLocal();
         if (camposEsencialesFaltantes.length > 0) {
             console.log("[handleSubSectionNavigation] Faltan campos esenciales:", camposEsencialesFaltantes);
             setCamposFaltantes(camposEsencialesFaltantes);
             setMostrarModalCamposObligatorios(true);
         } else {
             console.log("[handleSubSectionNavigation] Campos esenciales OK. Mostrando modal 'Guardar para Continuar'.");
             setPendingSubSection(targetSection); // Guardar destino
             setSubSectionDisplayName(displayName); // Guardar nombre para el mensaje
             setShowSaveToContinueModal(true);
         }
     }
  };

  // Función llamada por el modal "Guardar para Continuar"
  const handleSaveAndNavigateToSubSection = async () => {
      console.log("[handleSaveAndNavigateToSubSection] Confirmado. Llamando a handleGuardar para guardar y luego navegar a:", pendingSubSection);
      setShowSaveToContinueModal(false);
      // Llamar a handleGuardar pasando la subsección pendiente
      // handleGuardar se encargará de llamar a guardarServicioReal con este destino
      if (pendingSubSection) {
         await handleGuardar(pendingSubSection); 
      }
      // pendingSubSection se limpiará dentro de guardarServicioReal si tiene éxito
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* NO hay barra superior aquí */}
      
      {/* Área de Contenido Scrolleable */}
      <div className="flex-grow overflow-y-auto min-h-0">
        <div className="container mx-auto px-4 py-6 pb-12">
          {/* Título dentro del contenido */}
           <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            {isNew ? "Nuevo Servicio" : "Editar Servicio"}
          </h1>
          
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
                        <Input id="precioConIVA" name="precioConIVA" type="number" step="0.01" value={servicio.precioConIVA} onChange={handleNumericInputChange} onBlur={handleNumericInputBlur} required className={selectHoverClass} />
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
                      <Input id="comision" name="comision" type="number" step="0.01" value={servicio.comision} onChange={handleNumericInputChange} onBlur={handleNumericInputBlur} className={selectHoverClass} />
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

      {/* Barra de Acciones Inferior Original (Fija) - Actualizada */}
      <div className="flex-shrink-0 border-t bg-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-start"> {/* Cambiado a items-start para alinear texto abajo */} 
            {/* Contenedor para botones de navegación y texto explicativo */} 
            <div className="flex flex-col items-start"> {/* Apilar botones y texto */} 
              {/* Fila de botones de Navegación Interna - Estilo outline, desactivados si es nuevo */} 
              <div className="flex space-x-1 overflow-x-auto scrollbar-hide py-1">
                  {/* Cambiar variant a "outline" */}
                  <Button variant="outline" size="sm" className={buttonNavClass} onClick={() => handleSubSectionNavigation('consumos', 'Consumos')} disabled={!currentServicioId}>Consumos</Button>
                  <Button variant="outline" size="sm" className={buttonNavClass} onClick={() => handleSubSectionNavigation('puntos', 'Puntos')} disabled={!currentServicioId}>Puntos</Button>
                  <Button variant="outline" size="sm" className={buttonNavClass} onClick={() => handleSubSectionNavigation('bonos', 'Bonos')} disabled={!currentServicioId}>Bonos</Button>
                  <Button variant="outline" size="sm" className={buttonNavClass} onClick={() => handleSubSectionNavigation('recursos', 'Recursos')} disabled={!currentServicioId}>Recursos</Button>
                  <Button variant="outline" size="sm" className={buttonNavClass} onClick={() => handleSubSectionNavigation('parametros', 'Parámetros')} disabled={!currentServicioId}>Parámetros</Button>
                  <Button variant="outline" size="sm" className={buttonNavClass} onClick={() => handleSubSectionNavigation('avanzado', 'Avanzado')} disabled={!currentServicioId}>Avanzado</Button>
              </div>
              {/* Texto explicativo si es nuevo servicio - Ahora debajo y alineado izquierda */} 
              {!currentServicioId && (
                <div className="text-xs text-gray-500 italic mt-1"> {/* Quitado text-center, añadido mt-1 */} 
                  Guarda el servicio para activar estas opciones
                </div>
              )}
            </div>
            {/* Botones Volver/Guardar (Alineados arriba por items-start del contenedor padre) */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <Button variant="outline" onClick={handleCancel} className={buttonSecondaryClass}>
                    Volver
                </Button>
                <Button
                    onClick={() => handleGuardar(null)} 
                    disabled={isSaving || !hayCambios} 
                    className={buttonPrimaryClass}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Guardando..." : (isNew ? "Crear Servicio" : "Guardar Cambios")}
                </Button>
                 <HelpButton content="Ayuda contextual para la edición del servicio." />
            </div>
          </div>
          {/* Ya no necesitamos el div extra para el texto aquí abajo */} 
        </div>
      </div>

      {/* NO hay barra inferior de iconos duplicada */}

      {/* Modales con Estética Revisada */} 
      {/* Modal Campos Obligatorios */} 
      <Dialog open={mostrarModalCamposObligatorios} onOpenChange={setMostrarModalCamposObligatorios}>
        {/* Confiar en padding p-6 por defecto de DialogContent */} 
        <DialogContent className="sm:max-w-lg border"> 
          {/* Quitar padding específico, solo borde */} 
          <DialogHeader className="border-b"> 
            <DialogTitle className="flex items-center">
              <AlertCircle className="text-red-500 mr-2" /> 
              Campos Obligatorios Faltantes
            </DialogTitle>
            {/* Padding top para separar del título */} 
            <DialogDescription className="pt-4"> 
              <div> 
                Por favor, completa los siguientes campos antes de guardar:
                {/* Quitar margen izquierdo específico */} 
                <ul className="list-disc list-inside mt-2 text-red-600"> 
                  {camposFaltantes.map((campo, index) => (
                    <li key={index}>{campo}</li>
                  ))}
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          {/* Sin Footer */} 
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación Navegación */} 
      <Dialog open={mostrarModalConfirmacion} onOpenChange={setMostrarModalConfirmacion}>
       <DialogContent className="sm:max-w-lg border"> 
          {/* Quitar padding específico */} 
          <DialogHeader className="border-b"> 
            <DialogTitle className="flex items-center">
              <AlertCircle className="text-yellow-500 mr-2" /> 
              Confirmar Navegación
              </DialogTitle>
            {/* Padding general (py-4) y centrado */} 
            <DialogDescription className="py-4 text-center"> 
              Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?
            </DialogDescription>
          </DialogHeader>
          {/* Quitar padding específico, añadir alineación y gap */} 
          <DialogFooter className="border-t pt-6 sm:justify-end gap-2"> 
             <Button variant="outline" onClick={() => setMostrarModalConfirmacion(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={guardarServicioYNavegar} disabled={isSaving}>
                 {isSaving ? 'Guardando...' : 'Salir y Descartar Cambios'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmación Guardar sin Precio/IVA */} 
      <Dialog open={mostrarModalConfirmacionSinPrecioIVA} onOpenChange={setMostrarModalConfirmacionSinPrecioIVA}>
        <DialogContent className="sm:max-w-lg border"> 
          {/* Quitar padding específico */} 
          <DialogHeader className="border-b"> 
            <DialogTitle className="flex items-center">
              <AlertTriangle className="text-yellow-500 mr-2" /> 
              Confirmar Guardado
            </DialogTitle>
            {/* Padding general (py-4) y centrado */} 
            <DialogDescription className="py-4 text-center"> 
              {mensajeConfirmacion}
            </DialogDescription>
          </DialogHeader>
          {/* Quitar padding específico, añadir alineación y gap */} 
          <DialogFooter className="border-t pt-6 sm:justify-end gap-2"> 
            <Button variant="outline" onClick={() => setMostrarModalConfirmacionSinPrecioIVA(false)}>Cancelar</Button>
            <Button onClick={() => guardarServicioReal(null)} disabled={isSaving}> 
              {isSaving ? 'Guardando...' : 'Confirmar y Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NUEVO Modal: Guardar para Continuar a Subsección */} 
      <Dialog open={showSaveToContinueModal} onOpenChange={setShowSaveToContinueModal}>
        <DialogContent className="sm:max-w-lg border"> 
          <DialogHeader className="border-b"> 
            <DialogTitle className="flex items-center">
              <Save className="text-blue-500 mr-2" /> {/* Icono de guardar */} 
              Guardar Servicio para Continuar
            </DialogTitle>
            <DialogDescription className="py-4 text-center"> 
              {`Para poder configurar '${subSectionDisplayName}', primero es necesario guardar el servicio.`}
              <br />
              ¿Deseas guardarlo ahora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t pt-6 sm:justify-end gap-2"> 
            <Button variant="outline" onClick={() => { setShowSaveToContinueModal(false); setPendingSubSection(null); }}>Cancelar</Button>
            <Button onClick={handleSaveAndNavigateToSubSection} disabled={isSaving}> 
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
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

