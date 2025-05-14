"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { FileQuestion, Plus, Minus, ChevronUp, ChevronDown, MessageSquare, Users, HelpCircle, X, Send, ShoppingCart, AlertCircle, Save, AlertTriangle, Star, Ticket, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

// Usar SOLO contextos especializados (no importar useInterfaz directamente)
import { useIVA } from "@/contexts/iva-context"
import { useFamily, FamilyContext, FamilyContextType } from "@/contexts/family-context"
import { useTarif } from "@/contexts/tarif-context"
import { useServicio, Servicio } from "@/contexts/servicios-context"
import { useImages } from "@/contexts/image-context"
import { useDocuments } from "@/contexts/document-context"
import { useEquipment } from "@/contexts/equipment-context"
import { EntityImage, EntityDocument, EntityType, Service as PrismaService } from '@prisma/client'

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

// Helper para mapear EntityImage a ImageFileLike
const mapEntityImageToImageFileLike = (img: EntityImage): ImageFileLike => ({
  id: img.id,
  name: img.name,
  url: img.url,
  size: img.size,
  isPrimary: img.isPrimary,
  order: img.order,
  entityId: img.entityId,
  entityType: img.entityType,
  createdAt: img.createdAt,
});

// Helper para mapear EntityDocument a DocumentFileLike
const mapEntityDocumentToDocumentFileLike = (doc: EntityDocument): DocumentFileLike => ({
  id: doc.id,
  name: doc.name,
  url: doc.url,
  size: doc.size,
  type: doc.type,
  entityId: doc.entityId,
  entityType: doc.entityType,
  createdAt: doc.createdAt,
});

export default function NuevoServicio() {
  console.log("--- Renderizando NuevoServicio ---"); // Log inicio render
  const router = useRouter()
  const params = useParams<PageParams>()
  const tarifaId = String(params?.id || "")
  const servicioIdParam = String(params?.servicioId || "")
  const isNew = servicioIdParam === "nuevo"
  const servicioId = isNew ? null : servicioIdParam

  // Usar contextos especializados en lugar de interfaz directamente
  const { getTarifaById } = useTarif();
  const { getTiposIVAByTarifaId } = useIVA();
  const { getRootFamilies, getFamiliasByTarifaId } = useFamily();
  const { 
    getServicioById, 
    crearServicio, 
    actualizarServicio, 
    servicioActual, 
    setServicioActual,
    validarCamposObligatorios,
    getAllServicios // Sigue aquí por ahora
  } = useServicio();
  
  // Obtener funcionalidades de imágenes y documentos
  const { 
    uploadImage, 
    getImagesByEntity, 
    setProfilePic // Cambiado de setPrimaryImage
  } = useImages();
  
  const { 
    uploadDocument, 
    getDocumentsByEntity, 
    categorizeDocument 
  } = useDocuments();
  
  // Obtener equipos del contexto
  const { getClinicEquipos } = useEquipment();
  
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
  
  // Usar tipos de Prisma para estados de assets
  const [serviceImages, setServiceImages] = useState<EntityImage[]>([]);
  const [serviceDocuments, setServiceDocuments] = useState<EntityDocument[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Estados para el servicio actual - Inicializar precios a "0.00"
  const [servicio, setServicio] = useState<Partial<PrismaService>>({
    name: "",
    code: "",
    categoryId: null,
    price: 0.00,
    vatTypeId: null,
    colorCode: coloresAgenda[0]?.id || null,
    durationMinutes: 45,
    requiresMedicalSignOff: false,
    isActive: true,
    pointsAwarded: 0,
    description: null,
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
        const servicios = await getAllServicios(); // Mantenemos esta llamada
        const codesSet = new Set<string>();
        servicios.forEach(s => {
          // Usar el campo 'code' del tipo PrismaService
          if (typeof s.code === 'string' && s.code.length > 0) {
            codesSet.add(s.code);
          }
        });
        setAllExistingCodes(codesSet);
        console.log("[useEffect Codes] Códigos existentes cargados:", codesSet);
      } catch (error) {
        console.error("Error cargando códigos existentes:", error);
      }
    };
    fetchExistingCodes();
  }, []); // <<< CAMBIO AQUÍ: Array de dependencias vacío

  // Modificar handleInputChange para usar campos Prisma y normalizeString
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let processedValue: string | boolean | number | null = value;

    if (type === 'checkbox') {
      processedValue = checked;
      // Mapeo especial para isActive (inverso de deshabilitado)
      if (name === 'isActive') {
        setServicio(prev => ({ ...prev, isActive: checked }));
        setHayCambios(true);
        return; // Evitar que se procese dos veces
      } else if (name === 'requiresMedicalSignOff') {
        processedValue = checked;
      }
      // Ignorar otros checkboxes que no mapean directamente por ahora
      else {
         console.warn(`Checkbox ${name} no mapeado a PrismaService, ignorando.`);
         return;
      }
    } else if (type === 'number') {
        // Para durationMinutes, convertir a número entero
        if (name === 'durationMinutes') {
           processedValue = parseInt(value, 10) || 0;
        }
        // Para price, mantener como string para formato, convertir al guardar
        else if (name === 'price') {
           processedValue = value; // Mantener string
        }
        // Ignorar otros numéricos no mapeados (ej: comision)
        else {
            console.warn(`Input numérico ${name} no mapeado a PrismaService, ignorando.`);
            return;
        }
    } else {
        processedValue = value;
        if (name === 'code') {
            setIsCodeManuallyEdited(true);
            // Opcional: Normalizar código al escribir
            // processedValue = normalizeString(value);
        } else if (name === 'name') {
           // Generar código automáticamente si no se ha editado manualmente
           if (!isCodeManuallyEdited && !servicio.code) {
              const autoCode = normalizeString(value);
              // Verificar si el código auto-generado ya existe
              if (!allExistingCodes.has(autoCode)) {
                 setServicio(prev => ({ ...prev, name: value, code: autoCode }));
                 setHayCambios(true);
                 return; // Salir para no sobrescribir el código auto-generado
              }
           }
        }
    }

    setServicio(prev => ({ ...prev, [name]: processedValue }));
    setHayCambios(true);
  };

  const handleSelectChange = (name: string, value: string) => {
      const valueToStore = value === "placeholder" ? "" : value;
      // Campos relevantes: categoryId, vatTypeId, colorCode
      if (['categoryId', 'vatTypeId', 'colorCode'].includes(name)) {
          setServicio(prev => ({ ...prev, [name]: valueToStore || null })); // Usar null si es vacío?
          setHayCambios(true);
      } else {
          console.warn(`Select ${name} no mapeado a PrismaService, ignorando.`);
      }
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
      // Mapear solo los checkboxes relevantes a PrismaService
      if (id === 'isActive') {
        setServicio(prev => ({ ...prev, isActive: !!checked }));
        setHayCambios(true);
      } else if (id === 'requiresMedicalSignOff') {
        setServicio(prev => ({ ...prev, requiresMedicalSignOff: !!checked }));
        setHayCambios(true);
      }
      // Otros checkboxes (deshabilitado, etc.) se manejan en handleInputChange o se ignoran
      else {
          console.warn(`Checkbox ${id} no mapeado directamente, ignorando.`);
      }
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
  const [subSectionDisplayName, setSubSectionDisplayName] = useState<string>('');

  // AHORA es seguro usar servicioActual (que debería ser de tipo PrismaService | null)
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
        setTiposIVA(ivaData || []); // Asegurar array
        
        console.log("[useEffect DatosIniciales] Intentando cargar Familias...");
        const familiasData = await getFamiliasByTarifaId(tarifaId);
        console.log("[useEffect DatosIniciales] Familias cargadas:", familiasData?.length);
        setFamilias(Array.isArray(familiasData) ? familiasData : []);
      } catch (error) {
        console.error("[useEffect DatosIniciales] Error:", error);
        setFamilias([]); // Limpiar en caso de error
        setTiposIVA([]);
      } finally {
        console.log("[useEffect DatosIniciales] Finalizado.");
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [tarifaId]); // <<< ELIMINAR getTarifaById, getTiposIVAByTarifaId, getFamiliasByTarifaId
  
  // useEffect para filtrar equipos cuando la tarifa o los equipos globales cambien
  useEffect(() => {
    console.log("[useEffect Equipos] Ejecutando...");
    const cargarEquiposClinica = async () => {
      // Asumiendo que tarifa tiene la estructura correcta con clinicId
      const clinicId = (tarifa as any)?.clinicId; // Usar any temporalmente
      if (clinicId) {
        try {
          console.log(`[useEffect Equipos] Intentando cargar equipos para clínica ID: ${clinicId}`);
          // Usar la función correcta importada de useEquipment
          const equiposClinica = await getClinicEquipos(String(clinicId)); // Asegurar string
          console.log(`[useEffect Equipos] Equipos recibidos: ${equiposClinica?.length}`);
          setEquiposDisponibles(Array.isArray(equiposClinica) ? equiposClinica : []);
        } catch (error) {
          console.error("[useEffect Equipos] Error:", error);
          setEquiposDisponibles([]);
        }
      } else {
        console.log("[useEffect Equipos] No hay tarifa o clinicaId válido, limpiando equipos.");
        setEquiposDisponibles([]);
      }
    };

    cargarEquiposClinica();
    console.log("[useEffect Equipos] Finalizado.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarifa]); // <<< ELIMINAR getClinicEquipos
  
  // Cargar servicio si existe ID y establecer estado inicial
  useEffect(() => {
    const fetchServicio = async () => {
      if (servicioId) {
        try {
          console.log(`[useEffect FetchServicio] Intentando cargar servicio ID: ${servicioId}`);
          const servicioData = await getServicioById(servicioId);
          console.log("[useEffect FetchServicio] Datos cargados:", JSON.parse(JSON.stringify(servicioData)));
          
          if (servicioData) {
            // MAPEO INICIAL a Partial<PrismaService>
            const servicioParaEstado: Partial<PrismaService> = {
              id: servicioData.id,
              name: servicioData.name || "",
              code: servicioData.code || "",
              categoryId: servicioData.categoryId || null,
              price: servicioData.price ?? 0.00,
              vatTypeId: servicioData.vatTypeId || null,
              colorCode: servicioData.colorCode || coloresAgenda[0]?.id || null,
              durationMinutes: servicioData.durationMinutes || 0,
              description: servicioData.description || null,
              requiresMedicalSignOff: servicioData.requiresMedicalSignOff ?? false,
              pointsAwarded: servicioData.pointsAwarded ?? 0,
              isActive: servicioData.isActive ?? true,
            };

            setServicio(servicioParaEstado);
            setInitialServicio(JSON.stringify(servicioParaEstado));
            setHayCambios(false);
            setCurrentServicioId(servicioId);

            // --- RESTAURAR CARGA DE ASSETS ---
            setIsLoadingAssets(true);
             Promise.all([
                getImagesByEntity(EntityType.SERVICE, servicioId),
                getDocumentsByEntity(EntityType.SERVICE, servicioId)
             ]).then(([images, documents]) => {
                 setServiceImages(images || []);
                 setServiceDocuments(documents || []);
             }).catch(err => {
                 console.error("Error cargando assets del servicio:", err);
                 toast({ title: "Error", description: "No se pudieron cargar imágenes/documentos.", variant: "destructive" });
             }).finally(() => setIsLoadingAssets(false));
            // --- FIN RESTAURACIÓN ---

          } else {
             console.error(`Servicio con ID ${servicioId} no encontrado.`);
             toast({ title: "Error", description: "Servicio no encontrado.", variant: "destructive" });
             router.push(`/configuracion/tarifas/${tarifaId}?tab=servicios`);
          }
        } catch (error) {
          console.error("Error al cargar el servicio:", error);
          toast({ title: "Error", description: "No se pudo cargar el servicio.", variant: "destructive" });
        }
      } else {
         // Es un servicio nuevo, usar estado inicial ya definido con Partial<PrismaService>
         const estadoInicialNuevo: Partial<PrismaService> = {
             name: "",
             code: "",
             categoryId: null,
             price: 0.00,
             vatTypeId: null,
             colorCode: coloresAgenda[0]?.id || null,
             durationMinutes: 45,
             isActive: true,
             requiresMedicalSignOff: false,
             pointsAwarded: 0,
             description: null,
         };
         setServicio(estadoInicialNuevo);
         setInitialServicio(JSON.stringify(estadoInicialNuevo));
         setHayCambios(false);
         setCurrentServicioId(null);
      }
    };
    fetchServicio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId, tarifaId, router]); // <<< ELIMINAR getServicioById, getImagesByEntity, getDocumentsByEntity

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
    if (hayCambios) {
      setRutaDestino(ruta);
      setMostrarModalConfirmacion(true);
    } else {
      router.push(ruta);
    }
  };
  
  // Función verificarCamposYNavegar actualizada
  const verificarCamposYNavegar = (ruta: string) => {
    if (hayCambios) {
      // Verificar campos obligatorios antes de mostrar el modal de guardar
      const camposBaseFaltantes = verificarCamposObligatoriosLocal();
      if (camposBaseFaltantes.length > 0) {
          setCamposFaltantes(camposBaseFaltantes);
          setMostrarModalCamposObligatorios(true);
          return; // Detener si faltan campos
      }

      // Si campos OK, preguntar si guardar antes de navegar
      const mensaje = `Hay cambios sin guardar en el servicio. ¿Deseas guardarlos antes de ${ruta === 'volver' ? 'volver' : 'continuar'}?`;
      setMensajeConfirmacion(mensaje);
      setRutaDestino(ruta === 'volver' ? `/configuracion/tarifas/${tarifaId}?tab=servicios` : ruta);
      setMostrarModalConfirmacion(true);
    } else {
      // Navegar directamente si no hay cambios
      if (ruta === 'volver') {
          router.push(`/configuracion/tarifas/${tarifaId}?tab=servicios`);
      } else {
          // Lógica para otras rutas si es necesario
          console.log("Navegación sin cambios a ruta:", ruta);
          // router.push(ruta); // Implementar si es necesario
      }
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
      if (!servicio.name?.trim()) faltantes.push('Nombre');
      if (!servicio.code?.trim()) faltantes.push('Código');
      if (!servicio.categoryId) faltantes.push('Familia');
      if (!servicio.durationMinutes || Number(servicio.durationMinutes) <= 0) faltantes.push('Duración (debe ser > 0)');

      const precioNum = parseFloat(String(servicio.price ?? '0')); // Usar ??
      if (!isNaN(precioNum) && precioNum > 0 && !servicio.vatTypeId) {
           faltantes.push('Tipo de IVA (si Precio > 0)');
      }
      return faltantes;
  };

  // Nueva función para realizar el guardado
  const guardarServicioReal = async (navigateToSubSection: string | null = null) => {
    console.log(`[guardarServicioReal] Iniciando guardado. Navegar después a: ${navigateToSubSection}`);
    setIsSaving(true);
    setShowSaveToContinueModal(false);
    setMostrarModalConfirmacionSinPrecioIVA(false);
    let savedServicioId: string | null = currentServicioId;
    let esNuevoGuardado = !currentServicioId;

    try {
      const camposFaltantesValidacion = verificarCamposObligatoriosLocal();
      if (camposFaltantesValidacion.length > 0) {
          setCamposFaltantes(camposFaltantesValidacion);
          setMostrarModalCamposObligatorios(true);
          setIsSaving(false);
          return;
      }

      // Formatear price a número antes de guardar
      const priceToSave = parseFloat(String(servicio.price ?? '0'));
      if (isNaN(priceToSave)) {
          throw new Error("El formato del precio no es válido.");
      }

      // Construir el objeto para guardar
      const servicioParaGuardar: Omit<PrismaService, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> = {
        name: servicio.name!.trim(),
        code: servicio.code!.trim(),
        categoryId: servicio.categoryId || null,
        price: priceToSave,
        vatTypeId: servicio.vatTypeId || null,
        colorCode: servicio.colorCode || null,
        durationMinutes: servicio.durationMinutes || 0,
        description: servicio.description || null,
        isActive: servicio.isActive ?? true,
        requiresMedicalSignOff: servicio.requiresMedicalSignOff ?? false,
        pointsAwarded: servicio.pointsAwarded ?? 0,
      };

      console.log("[guardarServicioReal] Datos a guardar (Prisma mapeado):", JSON.parse(JSON.stringify(servicioParaGuardar)));

      if (currentServicioId) {
        console.log(`[guardarServicioReal] Llamando a actualizarServicio para ID: ${currentServicioId}`);
        await actualizarServicio(currentServicioId, servicioParaGuardar);
      } else {
        console.log(`[guardarServicioReal] Llamando a crearServicio...`);
        savedServicioId = await crearServicio(servicioParaGuardar as any);
        setCurrentServicioId(savedServicioId);
        console.log(`[guardarServicioReal] Servicio creado con ID: ${savedServicioId}`);
      }

      if (!savedServicioId) {
        throw new Error("No se obtuvo ID del servicio guardado/creado.");
      }

      console.log(`[guardarServicioReal] Obteniendo servicio actualizado ID: ${savedServicioId}`);
      const servicioActualizado = await getServicioById(savedServicioId);
      console.log("[guardarServicioReal] Servicio obtenido post-guardado:", JSON.parse(JSON.stringify(servicioActualizado)));

      if (servicioActualizado) {
         // Mapear de nuevo al estado local
         const servicioParaEstado: Partial<PrismaService> = {
             id: servicioActualizado.id,
             name: servicioActualizado.name || "",
             code: servicioActualizado.code || "",
             categoryId: servicioActualizado.categoryId || null,
             price: servicioActualizado.price ?? 0.00,
             vatTypeId: servicioActualizado.vatTypeId || null,
             colorCode: servicioActualizado.colorCode || null,
             durationMinutes: servicioActualizado.durationMinutes || 0,
             description: servicioActualizado.description || null,
             isActive: servicioActualizado.isActive ?? true,
             requiresMedicalSignOff: servicioActualizado.requiresMedicalSignOff ?? false,
             pointsAwarded: servicioActualizado.pointsAwarded ?? 0,
         };
         console.log("[guardarServicioReal] Actualizando estado local y estado inicial.");
         setServicio(servicioParaEstado);
         setInitialServicio(JSON.stringify(servicioParaEstado));
         setHayCambios(false);

         // Disparar evento ANTES de navegar
         if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("servicios-updated", {
              detail: { categoryId: servicioActualizado.categoryId, action: esNuevoGuardado ? 'create' : 'update' }
            }));
          }

         if (navigateToSubSection && savedServicioId) {
            console.log(`[guardarServicioReal] Guardado exitoso, navegando a subsección pendiente: ${navigateToSubSection}`);
            router.push(`/configuracion/tarifas/${tarifaId}/servicio/${savedServicioId}/${navigateToSubSection}`);
            setPendingSubSection(null);
            setIsSaving(false);
            return;
         }

         toast({
            title: esNuevoGuardado ? "Servicio creado" : "Servicio actualizado",
            description: `El servicio "${servicioActualizado.name || 'Nuevo Servicio'}" ha sido ${esNuevoGuardado ? 'creado' : 'actualizado'} correctamente.`,
          });

      } else {
         console.warn("[guardarServicioReal] No se pudo obtener el servicio actualizado post-guardado.");
         toast({ title: "Error", description: "Se guardó el servicio, pero hubo un problema al recargar los datos.", variant: "destructive" });
      }

    } catch (error) {
       console.error("Error al guardar servicio:", error);
       toast({
         title: "Error al guardar",
         description: "No se pudo guardar el servicio. Revisa los campos o contacta soporte.",
         variant: "destructive"
       });
       if (esNuevoGuardado) setCurrentServicioId(null);
    } finally {
      setIsSaving(false);
    }
  };

  // handleGuardar - Adaptado a PrismaService
  const handleGuardar = async (navigateToSubSection: string | null = null) => {
    const camposBaseFaltantes = verificarCamposObligatoriosLocal();
    if (camposBaseFaltantes.length > 0) {
        setCamposFaltantes(camposBaseFaltantes);
        setMostrarModalCamposObligatorios(true);
        return;
    }

    const precioNumerico = parseFloat(String(servicio.price ?? '0'));
    const precioEsValidoYMayorQueCero = !isNaN(precioNumerico) && precioNumerico > 0;
    const tieneIVA = servicio.vatTypeId && servicio.vatTypeId.trim() !== '';

    // Validación de IVA si precio > 0 ya está en verificarCamposObligatoriosLocal

    // Si precio <= 0 -> Mostrar modal
    if (!precioEsValidoYMayorQueCero) {
        const mensajeConfirm = 'El servicio se guardará sin precio indicado. ¿Deseas continuar?';
        setMensajeConfirmacion(mensajeConfirm);
        setMostrarModalConfirmacionSinPrecioIVA(true);
        return;
    }

    // Si precio > 0 y tiene IVA (o no es necesario), guardar
    await guardarServicioReal(navigateToSubSection);
  };

  // Función para renderizar el agente con tooltip
  const renderAgente = (agente: typeof agentesSoporte[0]) => (
    <div key={agente.id} className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-md cursor-pointer" onClick={() => setAgenteSeleccionado(agente.id)}>
      <div className="flex items-center">
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={agente.avatar} alt={agente.nombre} />
          <AvatarFallback>{agente.nombre.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-gray-800">{agente.nombre}</span>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${agente.estado === "disponible" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
        {agente.estado}
      </span>
    </div>
  );

  // Estado para controlar el panel lateral
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  // Función para guardar el servicio en el contexto y navegar
  const guardarServicioYNavegar = async () => {
    console.log("[guardarServicioYNavegar] Intentando guardar antes de salir a:", rutaDestino);
    setIsSaving(true);
    setMostrarModalConfirmacion(false);
    try {
        const camposBaseFaltantes = verificarCamposObligatoriosLocal();
        if (camposBaseFaltantes.length > 0) {
            setCamposFaltantes(camposBaseFaltantes);
            setMostrarModalCamposObligatorios(true);
            setIsSaving(false);
            return;
        }

        await guardarServicioReal(null); // Llamar a guardar

        // Si guardarServicioReal no lanzó error, navegar
        const destinoFinal = rutaDestino || `/configuracion/tarifas/${tarifaId}?tab=servicios&updated=${Date.now()}`;
        console.log("[guardarServicioYNavegar] Guardado OK, navegando a destino final:", destinoFinal);
        router.push(destinoFinal);
        setRutaDestino(null);

    } catch (error) {
        console.error("Error durante el proceso de guardar y navegar (salir):", error);
    } finally {
       // setIsSaving gestionado por guardarServicioReal
    }
};

  // Función para navegar a la página anterior - usar router.push
  const handleCancel = () => {
     verificarCamposYNavegar('volver');
  };
  
  // Agregar la función handleFileUpload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      // Determinar si son imágenes o documentos basado en el primer archivo (o hacer lógica más compleja)
      if (fileList[0].type.startsWith('image/')) {
          handleAddImages(fileList);
      } else {
          handleAddDocuments(fileList);
      }
    }
    // Resetear el input para permitir subir el mismo archivo de nuevo
    if (e.target) {
      e.target.value = '';
    }
  };
  
  // Referencia para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // renderDocumentsSection - Usar mapeo helper
  const renderDocumentsSection = () => (
    <DocumentList
      documents={serviceDocuments.map(mapEntityDocumentToDocumentFileLike)}
      editable={true}
      onAddDocuments={handleAddDocuments}
      onRemove={handleRemoveDocument}
      onView={handleViewDocument}
      className="mt-4"
      compact={false}
    />
  );

  // Funciones para manejar imágenes - Adaptadas para usar EntityImage
  const handleAddImages = async (files: File[]) => {
    const currentClinicId = (tarifa as any)?.clinicId;
    if (!currentClinicId) {
      toast({ title: "Error", description: "ID de clínica no encontrado en la tarifa.", variant: "destructive" });
      return;
    }
    const entityIdForUpload = currentServicioId || `temp_${generateId()}`;

    setIsLoadingAssets(true);
    try {
      const uploadedImages: EntityImage[] = []; // Usar EntityImage
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          console.error("El archivo no es una imagen:", file.type);
          toast({ title: "Error de archivo", description: `El archivo ${file.name} no es una imagen válida`, variant: "destructive" });
          continue;
        }
        try {
          // uploadImage devuelve Promise<ImageFile>, que es Promise<EntityImage>
          const newImageEntity = await uploadImage(
            file,
            EntityType.SERVICE,
            entityIdForUpload,
            currentClinicId,
            { isProfilePic: serviceImages.length === 0 && uploadedImages.length === 0 }
          );
          uploadedImages.push(newImageEntity);
        } catch (uploadError) {
          console.error("Error al subir imagen individual:", uploadError);
        }
      }

      if (uploadedImages.length > 0) {
         setServiceImages(prev => [...prev, ...uploadedImages]);
         setHayCambios(true);
         toast({ title: "Imágenes subidas", description: `${uploadedImages.length} imagen(es) subida(s). Guarda para confirmar.` });
      } else {
         toast({ title: "Advertencia", description: "No se pudo subir ninguna imagen.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error al subir imágenes:", error);
      toast({ title: "Error", description: "No se pudieron subir las imágenes.", variant: "destructive" });
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Función para establecer una imagen como principal - Adaptada
  const handleSetPrimaryImage = async (imageId: string) => {
      if (!currentServicioId) {
          toast({ title: "Error", description: "Guarda el servicio antes de establecer la imagen principal.", variant: "destructive" });
          return;
      }
      try {
          const success = await setProfilePic(imageId, EntityType.SERVICE, currentServicioId);
          if (success) {
              // EntityImage tiene isProfilePic
              const updatedImages = serviceImages.map(img => ({ ...img, isProfilePic: img.id === imageId }));
              setServiceImages(updatedImages);
              setHayCambios(true);
              toast({ title: "Imagen actualizada", description: "Imagen principal establecida. Guarda para confirmar." });
          } else {
               throw new Error("La función setProfilePic devolvió false.");
          }
      } catch (error) {
          console.error("Error al establecer imagen principal:", error);
          toast({ title: "Error", description: "No se pudo establecer la imagen principal.", variant: "destructive" });
      }
  };

  // Función para eliminar una imagen - Adaptada (solo local)
  const handleRemoveImage = async (imageId: string) => {
    try {
      const updatedImages = serviceImages.filter(img => img.id !== imageId);
      if (!updatedImages.some(img => img.isProfilePic) && updatedImages.length > 0) {
          updatedImages[0].isProfilePic = true;
      }
      setServiceImages(updatedImages);
      setHayCambios(true);
      toast({ title: "Imagen eliminada", description: "Imagen eliminada de la lista (guardar para confirmar)." });
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      toast({ title: "Error", description: "No se pudo quitar la imagen de la lista.", variant: "destructive" });
    }
  };

  // Función para agregar documentos - Adaptada para usar EntityDocument
  const handleAddDocuments = async (files: File[]) => {
     const currentClinicId = (tarifa as any)?.clinicId;
     if (!currentClinicId) {
       toast({ title: "Error", description: "ID de clínica no encontrado.", variant: "destructive" });
       return;
     }
     const currentTariffId = tarifaId;
     if (!currentTariffId) {
        toast({ title: "Error", description: "ID de tarifa no disponible.", variant: "destructive" });
        return;
     }
     const entityIdForUpload = currentServicioId || `temp_${generateId()}`;

     setIsLoadingAssets(true);
     try {
       const uploadedDocs: EntityDocument[] = [];
       for (const file of files) {
         try {
           const newDocEntity = await uploadDocument(
             file,
             EntityType.SERVICE,
             entityIdForUpload,
             currentClinicId,
             'default'
           );
           uploadedDocs.push(newDocEntity);
         } catch (uploadError) {
           console.error("Error al subir documento individual:", uploadError);
         }
       }

       if (uploadedDocs.length > 0) {
          setServiceDocuments(prev => [...prev, ...uploadedDocs]);
          setHayCambios(true);
          toast({ title: "Documentos subidos", description: `${uploadedDocs.length} documento(s) subidos. Guarda para confirmar.` });
       } else {
           toast({ title: "Advertencia", description: "No se pudo subir ningún documento.", variant: "destructive" });
       }
     } catch (error) {
       console.error("Error al subir documentos:", error);
       toast({ title: "Error", description: "No se pudieron subir los documentos.", variant: "destructive" });
     } finally {
       setIsLoadingAssets(false);
     }
  };

  // Función para eliminar un documento - Adaptada (solo local)
  const handleRemoveDocument = async (docId: string) => {
     try {
        const updatedDocs = serviceDocuments.filter(doc => doc.id !== docId);
        setServiceDocuments(updatedDocs);
        setHayCambios(true);
        toast({ title: "Documento eliminado", description: "Documento eliminado de la lista (guardar para confirmar)." });
     } catch (error) {
       console.error("Error al eliminar documento:", error);
       toast({ title: "Error", description: "No se pudo quitar el documento de la lista.", variant: "destructive" });
     }
  };

  // handleViewDocument - Adaptado para EntityDocument
  const handleViewDocument = (doc: { url?: string | null }) => { // Espera objeto con url
    if (doc && doc.url) window.open(doc.url, '_blank');
  };

  // Redirigir a la página de tarifa después de guardar
  const redirigirATarifa = () => {
    router.push(`/configuracion/tarifas/${tarifaId}?tab=servicios`);
  };

  // Restaurar handleDuracionChange para los botones
  const handleDuracionChange = (incremento: number) => { 
      const nuevaDuracion = Math.max(1, (Number(servicio.durationMinutes) || 0) + incremento); // Min 1, asegurar número
      setServicio(prev => ({
        ...prev,
        durationMinutes: nuevaDuracion
      }));
      setHayCambios(true); // Marcar cambio aquí también
  }; 

  // Navegación a subsecciones (Consumos, Puntos, Bonos, etc.)
  const handleSubSectionNavigation = (targetSection: string, displayName: string) => {
    if (!currentServicioId) {
        // Si el servicio es nuevo, preguntar si guardar para continuar
        setPendingSubSection(targetSection);
        setSubSectionDisplayName(displayName);
        setShowSaveToContinueModal(true);
    } else {
        // Si el servicio existe, verificar cambios antes de navegar
        if (hayCambios) {
            setPendingSubSection(targetSection);
            setSubSectionDisplayName(displayName);
            setShowSaveToContinueModal(true); // Usar el mismo modal para guardar cambios
        } else {
            // Navegar directamente a la subsección si no hay cambios
            router.push(`/configuracion/tarifas/${tarifaId}/servicio/${currentServicioId}/${targetSection}`);
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
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio *</label>
                      <Input id="name" name="name" value={servicio.name || ''} onChange={handleInputChange} required className={selectHoverClass} />
                    </div>
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                      <Input id="code" name="code" value={servicio.code || ''} onChange={handleInputChange} required className={selectHoverClass} />
                    </div>
                  </div>
                   <div>
                      <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">Familia *</label>
                      <Select name="categoryId" value={servicio.categoryId || ''} onValueChange={(value) => handleSelectChange('categoryId', value)}>
                        <SelectTrigger className={cn("w-full", selectHoverClass)}>
                          <SelectValue placeholder="Selecciona una familia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" disabled>Selecciona una familia</SelectItem>
                          {familias.map((familia: any) => (
                            <SelectItem key={familia.id} value={familia.id}>
                              {familia.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div>
                      <label htmlFor="tarifaBase" className="block text-sm font-medium text-gray-700 mb-1">Tarifa Base</label>
                      <Input id="tarifaBase" name="tarifaBase" value={(tarifa as any)?.name || 'Cargando...'} readOnly disabled className="bg-gray-100" />
                    </div>
                    <div>
                      <label htmlFor="vatTypeId" className="block text-sm font-medium text-gray-700 mb-1">Tipo de IVA *</label>
                       <Select name="vatTypeId" value={servicio.vatTypeId || ''} onValueChange={(value) => handleSelectChange('vatTypeId', value)}>
                          <SelectTrigger className={cn("w-full", selectHoverClass)}>
                            <SelectValue placeholder="Selecciona un tipo de IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" disabled>Selecciona un tipo de IVA</SelectItem>
                            {tiposIVA.map((tipo: any) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                {tipo.name} ({tipo.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                     <div>
                         <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                         <Input id="description" name="description" value={servicio.description || ''} onChange={handleInputChange} className={selectHoverClass} />
                     </div>
                </CardContent>
              </Card>
               <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className={`text-lg font-semibold mb-4 ${colorEncabezado}`}>Configuración y Precios</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-1">
                        <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos) *</label>
                        <div className="flex items-center">
                          <Button variant="outline" size="icon" onClick={() => handleDuracionChange(-1)} className="rounded-r-none h-10 w-10">
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="durationMinutes"
                            name="durationMinutes"
                            type="number"
                            value={servicio.durationMinutes || 0}
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
                      <label htmlFor="colorCode" className="block text-sm font-medium text-gray-700 mb-1">Color Agenda</label>
                      <Select name="colorCode" value={servicio.colorCode || ''} onValueChange={(value) => handleSelectChange('colorCode', value)}>
                        <SelectTrigger className={cn("w-full", selectHoverClass)}>
                          <SelectValue placeholder="Selecciona un color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" disabled>Selecciona un color</SelectItem>
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
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Precio Venta (Base)</label>
                        <Input id="price" name="price" type="text" // Usar text para formato
                               value={typeof servicio.price === 'number' ? servicio.price.toFixed(2) : String(servicio.price || '0.00')} // Mostrar formato
                               onChange={handleInputChange} // Usar handleInputChange genérico
                               onBlur={handleNumericInputBlur} // Formatear al perder foco
                               required={false} // No estrictamente requerido si puede ser 0
                               className={selectHoverClass} />
                        <p className="text-xs text-gray-500 mt-1">El precio final incluirá IVA.</p>
                    </div>
                    {/* Sección Equipo eliminada */}
                  </div>
                  {/* Sección Comisión eliminada */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                       <div className="flex items-center space-x-2">
                         <Checkbox id="requiresMedicalSignOff" name="requiresMedicalSignOff" checked={!!servicio.requiresMedicalSignOff} onCheckedChange={(checked) => handleCheckboxChange('requiresMedicalSignOff', !!checked)} />
                         <label htmlFor="requiresMedicalSignOff" className="text-sm font-medium">Requiere Firma Médica</label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox id="isActive" name="isActive" checked={!!servicio.isActive} onCheckedChange={(checked) => handleCheckboxChange('isActive', !!checked)} />
                         <label htmlFor="isActive" className="text-sm font-medium">Servicio Activo</label>
                       </div>
                       {/* Añadir campo para pointsAwarded si es necesario */}                       
                   </div>
                </CardContent>
              </Card>
               <Card>
                 <CardHeader>
                   <CardTitle className={`text-lg font-semibold ${colorEncabezado}`}>Consumos Asociados (Próximamente)</CardTitle>
                   <CardDescription>Define qué productos se consumen al realizar este servicio.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     {/* Placeholder para la gestión de ServiceConsumption */}
                     <p className="text-sm text-gray-500 italic">Funcionalidad pendiente de implementación.</p>
                 </CardContent>
               </Card>
            </div>

            {/* Columna Derecha */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className={`text-lg font-semibold mb-4 ${colorEncabezado}`}>Imágenes</h2>
                  <ImageGallery
                    images={serviceImages.map(mapEntityImageToImageFileLike)}
                    onAddImages={handleAddImages}
                    onSetPrimary={handleSetPrimaryImage}
                    onRemove={handleRemoveImage}
                    editable={true}
                    layout="carousel"
                  />
                </CardContent>
              </Card>

              {renderDocumentsSection()}

              {/* Tooltips */}
              <HoverCard openDelay={100} closeDelay={50}>
                <HoverCardTrigger asChild>
                  <Button variant="ghost_destructive_table" size="icon_table" onClick={() => console.log('Eliminar consumos')} >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent><p>Eliminar Consumos</p></HoverCardContent>
              </HoverCard>
              
              <HoverCard openDelay={100} closeDelay={50}>
                <HoverCardTrigger asChild>
                  <Button variant="ghost_table" size="icon_table" onClick={() => handleSubSectionNavigation('bonos', 'Bonos')} >
                    <Ticket className="w-4 h-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent><p>Configurar Bonos</p></HoverCardContent>
              </HoverCard>
              
              <HoverCard openDelay={100} closeDelay={50}>
                <HoverCardTrigger asChild>
                  <Button variant="ghost_table" size="icon_table" onClick={() => handleSubSectionNavigation('puntos', 'Puntos')} >
                    <Star className="w-4 h-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent><p>Configurar Puntos</p></HoverCardContent>
              </HoverCard>
            </div>
          </div>
        </div> {/* Fin container mx-auto px-4 py-6 pb-12 */}
      </div> {/* Fin Área de Contenido Scrolleable */}

      {/* Barra de Acciones Inferior Original (Fija) */}
      <div className="flex-shrink-0 border-t bg-white shadow-md dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="outline" onClick={handleCancel} className={buttonSecondaryClass}>Cancelar</Button>
          <div className="flex space-x-2">
              {/* Botones para subsecciones si el servicio está guardado */}
              {servicioGuardado && (
                  <>
                      <HoverCard openDelay={100} closeDelay={50}>
                          <HoverCardTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => handleSubSectionNavigation('consumos', 'Consumos')} className={buttonNavClass}>
                                  <ShoppingCart className="h-4 w-4" />
                              </Button>
                          </HoverCardTrigger>
                          <HoverCardContent><p>Gestionar Consumos</p></HoverCardContent>
                      </HoverCard>
                      <HoverCard openDelay={100} closeDelay={50}>
                          <HoverCardTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => handleSubSectionNavigation('bonos', 'Bonos')} className={buttonNavClass}>
                                  <Ticket className="h-4 w-4" />
                              </Button>
                          </HoverCardTrigger>
                          <HoverCardContent><p>Configurar Bonos</p></HoverCardContent>
                      </HoverCard>
                      <HoverCard openDelay={100} closeDelay={50}>
                          <HoverCardTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => handleSubSectionNavigation('puntos', 'Puntos')} className={buttonNavClass}>
                                  <Star className="h-4 w-4" />
                              </Button>
                          </HoverCardTrigger>
                          <HoverCardContent><p>Configurar Puntos</p></HoverCardContent>
                      </HoverCard>
                      {/* Separador visual */}
                      <div className="border-l border-gray-300 h-6 my-auto mx-2"></div>
                  </>
              )}
             <Button onClick={() => handleGuardar()} disabled={isSaving || !hayCambios} className={buttonPrimaryClass}>
              {isSaving ? "Guardando..." : (hayCambios ? "Guardar Cambios" : "Guardado")}
              {!isSaving && <Save className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Modales (sin cambios) */}
      <Dialog open={mostrarModalCamposObligatorios} onOpenChange={setMostrarModalCamposObligatorios}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center"><AlertTriangle className="text-red-500 mr-2" /> Campos Obligatorios Faltantes</DialogTitle>
                  <DialogDescription>
                      Por favor, completa los siguientes campos antes de guardar:
                      <ul className="list-disc pl-5 mt-2 text-red-600">
                          {camposFaltantes.map(campo => <li key={campo}>{campo}</li>)}
                      </ul>
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button onClick={() => setMostrarModalCamposObligatorios(false)}>Entendido</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={mostrarModalConfirmacion} onOpenChange={setMostrarModalConfirmacion}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center"><AlertCircle className="text-yellow-500 mr-2" /> Cambios sin Guardar</DialogTitle>
                  <DialogDescription>{mensajeConfirmacion}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => {
                      setMostrarModalConfirmacion(false);
                      if (rutaDestino) router.push(rutaDestino);
                      setRutaDestino(null);
                      setHayCambios(false); // Resetear cambios al descartar
                      // Recargar el servicio inicial si existía
                      if (initialServicio) setServicio(JSON.parse(initialServicio));
                  }}>Descartar Cambios</Button>
                  <Button onClick={guardarServicioYNavegar} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar y Continuar"}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={mostrarModalConfirmacionSinPrecioIVA} onOpenChange={setMostrarModalConfirmacionSinPrecioIVA}>
           <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center"><AlertCircle className="text-yellow-500 mr-2" /> Confirmar Guardado sin Precio</DialogTitle>
                  <DialogDescription>{mensajeConfirmacion}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setMostrarModalConfirmacionSinPrecioIVA(false)}>Cancelar</Button>
                  <Button onClick={() => guardarServicioReal()} disabled={isSaving}>{isSaving ? "Guardando..." : "Sí, guardar sin precio"}</Button>
              </DialogFooter>
           </DialogContent>
       </Dialog>

       <Dialog open={showSaveToContinueModal} onOpenChange={setShowSaveToContinueModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center"><Save className="text-blue-500 mr-2"/> Guardar para Continuar</DialogTitle>
              <DialogDescription>
                {currentServicioId
                  ? `Hay cambios sin guardar. ¿Deseas guardarlos antes de ir a la sección "${subSectionDisplayName}"?`
                  : `Debes guardar el servicio nuevo antes de configurar "${subSectionDisplayName}".`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveToContinueModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveAndNavigateToSubSection} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar y Continuar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Input oculto para subida */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" // Ajustar accept según necesidad
        multiple
      />

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

// Definición de normalizeString fuera del componente
const normalizeString = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD") // Separa acento de letra
    .replace(/\u0300-\u036f/g, "") // Quita acentos (nuevo método compatible)
    .replace(/[^a-z0-9\s_\-]/g, '') // Quita caracteres especiales excepto espacio, guión bajo, guión
    .trim() // Quita espacios al inicio/final
    .replace(/\s+/g, '-'); // Reemplaza espacios con guiones (o ajustar según necesidad)
};

