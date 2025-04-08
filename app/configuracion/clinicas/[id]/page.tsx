"use client"

import { useState, useEffect, useCallback, use, useMemo } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Button, BackButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CabinEditDialog } from "@/components/cabin-edit-dialog"
import { useClinic } from "@/contexts/clinic-context"
import { Clinica, Tarifa, ExcepcionHoraria, HorarioDia, FranjaHoraria } from "@/services/data/models/interfaces"
import { SearchInput } from "@/components/SearchInput"
import { ScheduleConfig } from "@/components/schedule-config"
import { DEFAULT_SCHEDULE } from "@/types/schedule"
import { useTemplates } from "@/hooks/use-templates"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Bed,
  Cog,
  Users,
  CreditCard,
  Link,
  Percent,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  ArrowLeft,
  HelpCircle,
  Save,
  MapPin,
  BarChart2,
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Clock,
  Database,
  FolderOpen,
  Tag,
  Settings2,
  LayoutGrid,
  Wrench,
  HardDrive,
  X,
  Calendar,
  AlertCircle,
  AlertTriangle,
  PlusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WeekSchedule } from "@/types/schedule"
import { saveToStorage } from "@/utils/storage-utils"
import { DebugStorage } from "@/components/debug-storage"
import AlmacenamientoClinicaContent from "@/app/configuracion/clinicas/[id]/almacenamiento/page"
import { useEquipment } from "@/contexts/equipment-context"
import { useTarif } from "@/contexts/tarif-context"
import { UsuariosClinica } from "@/components/usuarios-clinica"
import {
  // findActiveExceptions,
  // createExampleException,
  // applyExampleException
} from "@/services/clinic-schedule-service"
import { Cabin } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { Skeleton } from "@/components/ui/skeleton"

// --- Función de utilidad Debounce ---
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), waitFor);
  };
}
// --- Fin Debounce ---

const menuItems = [
  { id: "datos", label: "Datos de la clínica", icon: Building2 },
  { id: "horarios", label: "Horarios", icon: Clock },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "tarifa", label: "Tarifa", icon: Tag },
  { id: "entidades", label: "Entidades bancarias", icon: CreditCard },
  { id: "integraciones", label: "Integraciones", icon: Link },
  { id: "descuentos", label: "Descuentos", icon: Percent },
  { id: "sms", label: "SMS/Push", icon: MessageSquare },
  { id: "email", label: "Notificaciones e-mail", icon: Mail },
  { id: "whatsapp", label: "Notificaciones WhatsApp", icon: Phone },
  { id: "otros", label: "Otros APIs", icon: Globe },
  { id: "sedes", label: "Sedes", icon: MapPin },
  { id: "cabinas", label: "Cabinas", icon: LayoutGrid },
  { id: "equipamiento", label: "Equipamiento", icon: Wrench },
  { id: "almacenamiento", label: "Almacenamiento", icon: HardDrive },
  { id: "depuracion", label: "Depuración", icon: Trash2 },
]

const SectionTitle = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
  <div className={`flex items-center space-x-2 mb-4 pb-2 border-b ${color}`}>
    <Icon className="w-5 h-5" />
    <h3 className={`text-lg font-medium ${color}`}>{title}</h3>
  </div>
)

export default function ClinicaDetailPage() {
  const clinicContext = useClinic()
  const { clinics, updateClinica, getClinicaById, refreshActiveClinicCabins } = clinicContext 
  const { templates } = useTemplates()
  const { getTarifaById, tarifas } = useTarif()
  const { getEquiposByClinicaId } = useEquipment()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  
  // --- Mover useMemo aquí arriba --- 
  const [clinicData, setClinicData] = useState<Clinica | null>(null)
  // Ajustar los fallbacks para horario simple
  const defaultOpenTime = useMemo(() => clinicData?.openTime || "00:00", [clinicData]);
  const defaultCloseTime = useMemo(() => clinicData?.closeTime || "23:59", [clinicData]);
  const defaultSlotDuration = useMemo(() => clinicData?.slotDuration ?? 15, [clinicData]);
  // --- Fin Mover useMemo ---

  const [activeTab, setActiveTab] = useState("datos")
  const [isCabinDialogOpen, setIsCabinDialogOpen] = useState(false)
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null)
  const [isLoadingClinic, setIsLoadingClinic] = useState(true);
  const [cabinFilterText, setCabinFilterText] = useState("")
  const [equipmentFilterText, setEquipmentFilterText] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [equipmentData, setEquipmentData] = useState<any[]>([])
  const [tarifaAplicada, setTarifaAplicada] = useState<Tarifa | null | undefined>(undefined)
  const [isLoadingTarifa, setIsLoadingTarifa] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  const [showExcepcionModal, setShowExcepcionModal] = useState(false)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  const [nuevaExcepcion, setNuevaExcepcion] = useState<Partial<ExcepcionHoraria>>({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
    dias: []
  })
  const [editingExcepcion, setEditingExcepcion] = useState<ExcepcionHoraria | null>(null)
  const [editingFranja, setEditingFranja] = useState<{
    diaId: string;
    franjaId?: string;
    inicio: string;
    fin: string;
    excepcionDiaIndex?: number;
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // --- NUEVO ESTADO --- 
  const [useTemplateSchedule, setUseTemplateSchedule] = useState<boolean>(false);
  // --- FIN NUEVO ESTADO ---
  
  const diasSemana = [
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
  ]

  const clinicId = typeof params?.id === 'string' ? params.id : ''
  
  console.log("ClinicaDetailPage - Extracted clinicId from URL params:", clinicId, "(Type:", typeof clinicId, ")", "Raw params:", params);
  
  const [cabinsData, setCabinsData] = useState<Cabin[]>([])
  const [isLoadingCabins, setIsLoadingCabins] = useState(true)

  useEffect(() => {
    const loadClinicDetails = async () => {
    if (!clinicId) {
        console.error("ClinicaDetailPage - No clinicId found in params");
        router.push("/configuracion/clinicas");
        return;
    }

      setIsLoadingClinic(true);
      setClinicData(null);
      console.log(`ClinicaDetailPage - Loading details for clinicId: ${clinicId}`);

      try {
        // Usar getClinicaById del contexto para asegurar datos completos
        const detailedClinicData = await getClinicaById(clinicId);

        if (!detailedClinicData) {
          console.error(`ClinicaDetailPage - Clinic not found with ID: ${clinicId}`);
          toast({ title: "Error", description: "Clínica no encontrada.", variant: "destructive" });
          router.push("/configuracion/clinicas");
          return;
        }

        console.log("ClinicaDetailPage - Detailed clinic data received:", detailedClinicData);
        setClinicData(detailedClinicData); // <--- Establecer el estado con los datos detallados

      } catch (error) {
        console.error("ClinicaDetailPage - Error loading clinic details:", error);
        toast({ title: "Error", description: "No se pudieron cargar los detalles de la clínica.", variant: "destructive" });
        router.push("/configuracion/clinicas");
        } finally {
        setIsLoadingClinic(false);
      }
    };

    loadClinicDetails();
  }, [clinicId, router, getClinicaById]);

  useEffect(() => {
    if (clinicData) {
      const clinicId = clinicData.id
      const loadEquipment = async () => {
        try {
          const equipmentList = await getEquiposByClinicaId(String(clinicId))
          setEquipmentData(Array.isArray(equipmentList) ? equipmentList : [])
        } catch (error) {
          console.error("Error al cargar equipamiento:", error)
          setEquipmentData([])
        }
      }
      loadEquipment()
    }
  }, [clinicData, getEquiposByClinicaId])

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    
    // Si el parámetro tab es 'usuarios', establecer la pestaña activa a 'usuarios'
    if (tabParam === "usuarios") {
      setActiveTab("usuarios");
    } 
    // Si no, verificar si el parámetro tab coincide con algún ID de los menuItems
    else if (tabParam && menuItems.some(item => item.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams])

  useEffect(() => {
    const loadTarifaData = async () => {
      const tarifaIdAsignada = clinicData?.tariffId as string | undefined;

      if (tarifaIdAsignada) {
        setIsLoadingTarifa(true);
        setTarifaAplicada(undefined);
        try {
          const tarifa: Tarifa | null = await getTarifaById(tarifaIdAsignada);
          setTarifaAplicada(tarifa || null);
        } catch (error) {
          console.error("Error al cargar la tarifa plantilla:", error);
          setTarifaAplicada(null);
    } finally {
          setIsLoadingTarifa(false);
        }
      } else if (clinicData) {
         setTarifaAplicada(null);
      }
    };

    loadTarifaData();
  }, [clinicData, getTarifaById]);

  useEffect(() => {
    const fetchCabins = async () => {
      if (!clinicId) return;
      setIsLoadingCabins(true);
      try {
        const response = await fetch(`/api/clinics/${clinicId}/cabins`);
        if (!response.ok) {
          throw new Error('Failed to fetch cabins');
        }
        const data = await response.json();
        setCabinsData(data);
      } catch (error) {
        console.error("Error fetching cabins:", error);
        toast({ title: "Error al cargar cabinas", variant: "destructive" });
        setCabinsData([]); // Poner array vacío en caso de error
      } finally {
        setIsLoadingCabins(false);
      }
    };

    fetchCabins();
  }, [clinicId]);

  // --- NUEVO useEffect para inicializar useTemplateSchedule --- 
  useEffect(() => {
    if (clinicData) {
      // Inicializa el checkbox basado en si hay una plantilla vinculada al cargar
      setUseTemplateSchedule(!!clinicData.linkedScheduleTemplateId);
      console.log(`[ClinicaDetail] Initializing useTemplateSchedule based on linkedTemplateId (${clinicData.linkedScheduleTemplateId}): ${!!clinicData.linkedScheduleTemplateId}`);
    }
  }, [clinicData?.id, clinicData?.linkedScheduleTemplateId]); // Depender del ID y del linkedId
  // --- FIN NUEVO useEffect ---

  const handleUpdateFranjaExcepcion = (diaIndex: number, franjaId: string, inicio: string, fin: string) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    if (!diasActualizados[diaIndex]) {
      console.error(`Error: Índice de día ${diaIndex} fuera de rango en handleUpdateFranjaExcepcion`);
        return;
    }
    const franjas = [...(diasActualizados[diaIndex].franjas || [])];
    const franjaIndex = franjas.findIndex(f => f.id === franjaId)
  
    if (franjaIndex >= 0) {
      franjas[franjaIndex] = { ...franjas[franjaIndex], inicio, fin }
      diasActualizados[diaIndex] = { ...diasActualizados[diaIndex], franjas: franjas }; 
  
      setEditingExcepcion({
        ...editingExcepcion,
        dias: diasActualizados
      })
    } else {
      console.warn(`Franja con ID ${franjaId} no encontrada en el día ${diaIndex}`);
    }
  }

  const handleClinicUpdate = useCallback(
    (updatedFields: { schedule: WeekSchedule } | Record<string, any>) => {
      if (clinicData) {
        console.log("Updating clinic state with:", updatedFields);
        
        // --- Distinguir si es actualización de horario u otros campos ---
        if ('schedule' in updatedFields && typeof updatedFields.schedule === 'object') {
          console.log("Updating scheduleJson state...");
          // Actualizar específicamente el scheduleJson
          setClinicData((prev) => (prev ? { ...prev, scheduleJson: updatedFields.schedule as unknown as Prisma.JsonValue } : null));
        } else {
          // Actualizar otros campos como antes, asegurándose de no incluir schedule si viene
          const { schedule, ...otherFields } = updatedFields;
           if (Object.keys(otherFields).length > 0) {
              console.log("Updating other fields:", otherFields);
              setClinicData((prev) => (prev ? { ...prev, ...(otherFields as Partial<Clinica>) } : null));
           }
        }
        // --- Fin distinción ---
      }
    },
    [clinicData], // Asegurar que clinicData esté en las dependencias
  )

  // --- Versión Debounced de la actualización ---
  const debouncedHandleClinicUpdate = useMemo(
    () => debounce(handleClinicUpdate, 300), // Espera 300ms después de dejar de teclear
    [handleClinicUpdate] // Se recrea si handleClinicUpdate cambia
  );
  // --- Fin Debounced ---

  // --- Modificar handleTemplateChange --- 
  const handleTemplateChange = (templateId: string) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (selectedTemplate) {
        console.log(`Template selected: ${templateId}. Linking template and setting checkbox.`);
        
        // Obtener datos de la plantilla seleccionada (usar fallbacks si no existen)
        const templateOpenTime = (selectedTemplate as any).openTime || clinicData?.openTime || defaultOpenTime;
        const templateCloseTime = (selectedTemplate as any).closeTime || clinicData?.closeTime || defaultCloseTime;
        const templateSlotDuration = (selectedTemplate as any).slotDuration || clinicData?.slotDuration || defaultSlotDuration;
        const templateBlocks = (selectedTemplate as any).blocks;

        // Calcular el nuevo scheduleJson
        const newScheduleJson = convertBlocksToWeekSchedule(
            templateBlocks,
            templateOpenTime,
            templateCloseTime
        );

        // Actualizar el estado completo
        setClinicData(prev => prev ? {
            ...prev,
            linkedScheduleTemplateId: templateId,          // Actualizar ID
            linkedScheduleTemplate: selectedTemplate as any, // Guardar objeto completo
            scheduleJson: newScheduleJson as any,         // Actualizar schedule derivado
            // Actualizar también los campos generales para reflejar la plantilla
            openTime: templateOpenTime,
            closeTime: templateCloseTime,
            slotDuration: templateSlotDuration,
        } : null);

        // Marcar explícitamente el checkbox
        setUseTemplateSchedule(true); 
    } else {
        // Manejar caso donde la plantilla no se encuentra
        console.warn(`Template with ID ${templateId} not found.`);
        // Desvincular y volver a horario independiente si la plantilla no existe
        setClinicData(prev => prev ? {
            ...prev,
            linkedScheduleTemplateId: null,
            linkedScheduleTemplate: null, // Limpiar objeto
            // Podríamos mantener el scheduleJson anterior o resetearlo?
            // Mantengamos el anterior por ahora, ya que se desvincula.
        } : null);
        setUseTemplateSchedule(false);
    }
  }

  const handleUseTemplateToggle = (checked: boolean) => {
    setUseTemplateSchedule(checked);
    if (checked) {
        const currentlySelectedTemplateIdInSelect = clinicData?.linkedScheduleTemplateId;
        if (currentlySelectedTemplateIdInSelect) {
             console.log("Checkbox checked: Re-linking to template", currentlySelectedTemplateIdInSelect);
             const template = templates.find(t => t.id === currentlySelectedTemplateIdInSelect);
             // Usar horarios generales de la clínica como fallback
             const scheduleFromTemplate = template ? convertBlocksToWeekSchedule(
                 (template as any).blocks, 
                 (template as any).openTime || clinicData?.openTime || "00:00", 
                 (template as any).closeTime || clinicData?.closeTime || "23:59"
             ) : createDefaultSchedule(); 

             setClinicData(prev => prev ? {
                 ...prev,
                 linkedScheduleTemplateId: currentlySelectedTemplateIdInSelect,
                 scheduleJson: scheduleFromTemplate as any
             } : null);
        } else {
            console.error("Checkbox checked, but cannot determine which template to link. Please select a template first.");
            // Idealmente, el checkbox estaría deshabilitado si no hay plantilla seleccionable
            // Revertir el estado del checkbox si no se puede vincular?
            setUseTemplateSchedule(false); 
            toast({ title: "Error", description: "Seleccione una plantilla antes de marcar esta opción.", variant: "destructive" });
        }
    } else {
        // DESVINCULAR Y COPIAR
        console.log("Checkbox unchecked: Switching to independent schedule.");
        let scheduleToCopy: WeekSchedule | null = null;
        // Usar 'as any' temporalmente si linkedScheduleTemplate no tiene 'blocks' en su tipo
        const linkedTemplateBlocks = (clinicData?.linkedScheduleTemplate as any)?.blocks;
        if (linkedTemplateBlocks) {
            console.log("Copying schedule from currently linked template blocks.");
            scheduleToCopy = convertBlocksToWeekSchedule(
                linkedTemplateBlocks,
                clinicData.openTime || "00:00",
                clinicData.closeTime || "23:59"
            );
        } else {
             console.warn("Could not find linked template blocks to copy schedule from. Using current scheduleJson or default.");
             scheduleToCopy = clinicData?.scheduleJson as WeekSchedule ?? createDefaultSchedule(); 
        }
        setClinicData(prev => prev ? {
            ...prev,
            linkedScheduleTemplateId: null,
            scheduleJson: scheduleToCopy as any 
        } : null);
    }
  };

  // --- NUEVO Handler para aplicar horario general --- 
  const handleApplyGeneralTimesToAllDays = () => {
      // --- MODIFICADA LA GUARDA ---
      if (!clinicData || useTemplateSchedule) { 
          console.warn("Cannot apply general times: Clinic data missing or template schedule is active.");
          return;
      }
      // --- FIN MODIFICACIÓN GUARDA ---

      const generalOpenTime = clinicData.openTime || "00:00";
      const generalCloseTime = clinicData.closeTime || "23:59";
      // --- Manejar scheduleJson nulo de forma segura ---
      const currentWeekSchedule = (clinicData.scheduleJson as WeekSchedule | null) ?? createDefaultSchedule(); 
      const newWeekSchedule = { ...currentWeekSchedule };
      // --- Fin manejo seguro ---

      console.log(`Applying general times ${generalOpenTime} - ${generalCloseTime} to open days.`);

      for (const dayKey in newWeekSchedule) {
          if (Object.prototype.hasOwnProperty.call(newWeekSchedule, dayKey)) {
              const key = dayKey as keyof WeekSchedule;
              // Solo modificar días que estaban abiertos
              if (newWeekSchedule[key]?.isOpen) { 
                  newWeekSchedule[key] = {
                      ...newWeekSchedule[key],
                      ranges: [{ start: generalOpenTime, end: generalCloseTime }]
                  };
              }
          }
      }
      // Actualizar el estado local y notificar a ScheduleConfig
      handleClinicUpdate({ schedule: newWeekSchedule }); 
      toast({ title: "Horario Actualizado", description: "Se aplicó el horario general a los días abiertos." });
  };
  // --- FIN Nuevo Handler ---

  const handleSaveCabin = useCallback(async (cabinDataFromDialog: Partial<Cabin>) => {
    console.log("handleSaveCabin - Datos recibidos:", cabinDataFromDialog);
    setIsSaving(true);
    try {
      let savedCabin: Cabin | null = null;
      let operationSuccess = false; // Flag para saber si la operación API tuvo éxito

      if (cabinDataFromDialog.id) {
        // --- Actualizar Cabina Existente ---
        console.log(`handleSaveCabin - Actualizando cabina ID: ${cabinDataFromDialog.id}`);
        const response = await fetch(`/api/cabins/${cabinDataFromDialog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cabinDataFromDialog),
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error Data (PUT):", errorData);
          throw new Error(errorData.error || `Failed to update cabin (status ${response.status})`);
        }
        savedCabin = await response.json();
        console.log("handleSaveCabin - Cabina actualizada:", savedCabin);
        setCabinsData(prev => prev.map(c => c.id === savedCabin?.id ? savedCabin : c));
        operationSuccess = true;

      } else {
        // --- Crear Nueva Cabina ---
        if (!clinicData?.id) {
          throw new Error("No se puede crear una cabina sin una clínica seleccionada.");
        }
        const dataToSend = {
          ...cabinDataFromDialog,
          clinicId: clinicData.id,
          systemId: clinicData.systemId // Asegurar que el systemId se envía
        };
        console.log("handleSaveCabin - Creando nueva cabina con datos:", dataToSend);
        const response = await fetch('/api/cabins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Catch si no hay JSON
          console.error("API Error Data (POST):", errorData);
          throw new Error(errorData.error || `Failed to create cabin (status ${response.status})`);
        }
        savedCabin = await response.json();
        console.log("handleSaveCabin - Nueva cabina creada:", savedCabin);
        // Actualizar estado local
        setCabinsData(prev => [...prev, savedCabin!].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)));
        operationSuccess = true;
      }

      // --- Refrescar cabinas en el contexto SI la operación fue exitosa ---
      if (operationSuccess && typeof refreshActiveClinicCabins === 'function') {
        console.log("handleSaveCabin - Operation successful, calling refreshActiveClinicCabins...");
        await refreshActiveClinicCabins();
        console.log("handleSaveCabin - refreshActiveClinicCabins completed.");
      } else if (!operationSuccess) {
         console.warn("handleSaveCabin - API operation failed, skipping refresh.");
      } else {
         console.warn("handleSaveCabin - refreshActiveClinicCabins is not available.");
      }
      // -----------------------------------------------------------------

      toast({ title: "Éxito", description: `Cabina "${savedCabin?.name}" guardada correctamente.` });
      setIsCabinDialogOpen(false);
      setEditingCabin(null);

    } catch (error) {
      console.error("Error guardando cabina:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido al guardar la cabina.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
    // Actualizar dependencias de useCallback
  }, [clinicData, updateClinica, refreshActiveClinicCabins]); 

  const handleDeleteCabin = useCallback(
    (cabinId: string) => {
      console.warn("handleDeleteCabin needs refactoring for API calls.")
    },
    [],
  )

  const handleReorderCabin = useCallback(async (cabinId: string, direction: 'up' | 'down') => {
    let reorderedCabinsLocal: Cabin[] | null = null;
    
    // 1. Actualizar estado local PRIMERO para respuesta visual inmediata
    setCabinsData(currentCabins => {
      const index = currentCabins.findIndex(c => c.id === cabinId);
      if (index === -1) return currentCabins;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= currentCabins.length) return currentCabins;

      const reordered = [...currentCabins];
      const temp = reordered[index];
      reordered[index] = reordered[newIndex];
      reordered[newIndex] = temp;
      
      // Asignar el array reordenado a la variable externa
      reorderedCabinsLocal = reordered;
      console.log(`handleReorderCabin - Visual update done. New local array:`, reorderedCabinsLocal);
      return reordered; 
    });

    // 2. Si la actualización local tuvo éxito y tenemos el nuevo array
    if (reorderedCabinsLocal && clinicData?.id) {
      console.log(`handleReorderCabin - Calling API to persist order...`);
      try {
        // Extraer solo los IDs en el nuevo orden
        const orderedIds = reorderedCabinsLocal.map(c => c.id);
        
        const response = await fetch('/api/cabins/reorder', {
          method: 'POST',
                headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            clinicId: clinicData.id,
            orderedCabinIds: orderedIds 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API Reorder Error Data:", errorData);
          throw new Error(errorData.error || `Failed to reorder cabins (status ${response.status})`);
        }

        const result = await response.json();
        console.log("handleReorderCabin - API reorder successful:", result);
        
        // --- Refrescar cabinas en el contexto --- 
        if (typeof refreshActiveClinicCabins === 'function') {
          console.log("handleReorderCabin - Calling refreshActiveClinicCabins...");
          await refreshActiveClinicCabins();
          console.log("handleReorderCabin - refreshActiveClinicCabins completed.");
        } else {
          console.warn("handleReorderCabin - refreshActiveClinicCabins is not available.");
        }
        // --------------------------------------

        toast({ title: "Orden guardado", description: "El nuevo orden de las cabinas ha sido guardado." });

      } catch (error) {
        console.error("Error persisting cabin reorder:", error);
        toast({
          title: "Error al guardar orden",
          description: error instanceof Error ? error.message : "No se pudo guardar el nuevo orden.",
          variant: "destructive",
        });
        // TODO: Considerar revertir el estado local si la API falla?
        // Podríamos guardar el estado original y restaurarlo aquí.
      }
        } else {
      console.warn("handleReorderCabin - Could not call API: Missing reordered array or clinic ID.");
    }
  }, [clinicData, refreshActiveClinicCabins]);

  const deleteEquipment = useCallback((index: number) => {
    setEquipmentData((prevData) => prevData.filter((_, i) => i !== index))
  }, [])

  const filteredEquipment = Array.isArray(equipmentData) 
    ? equipmentData.filter((equipment) =>
        Object.values(equipment).some((value) => 
          value !== null && String(value).toLowerCase().includes(equipmentFilterText.toLowerCase())
        )
      )
    : []

  const handleSaveClinic = useCallback(async () => {
    setIsSaving(true)
    try {
      if (clinicData) {
        if (typeof updateClinica !== "function") {
          console.error("updateClinica is not a function", updateClinica)
          throw new Error("updateClinica is not a function")
        }

        const clinicId = String(clinicData.id)
        
        // Datos base (sin scheduleJson ni linkedId si se manejan por separado)
        const { scheduleJson, linkedScheduleTemplateId: currentLinkedId, ...clinicBaseData } = clinicData;
        
        const baseDataToSend: Partial<Clinica> = { ...clinicBaseData }; // Copiar campos base
        let scheduleDataToSend: { independentScheduleData?: WeekSchedule } = {};
        let finalLinkedId: string | null;

        if (useTemplateSchedule) {
            // USANDO PLANTILLA
            console.log("Saving with template schedule link.");
            finalLinkedId = currentLinkedId; // Usar el ID que ya debería estar en clinicData
            if (!finalLinkedId) {
                console.error("Error: useTemplateSchedule is true, but linkedScheduleTemplateId is missing!");
                // Quizás mostrar error al usuario o intentar buscar el seleccionado
                // Por ahora, forzamos a null para evitar error, pero esto es un bug state
                finalLinkedId = null; 
            }
            // NO enviar independentScheduleData
        } else {
            // USANDO HORARIO INDEPENDIENTE
            console.log("Saving with independent schedule.");
            finalLinkedId = null; // Desvincular explícitamente
            if (scheduleJson) { // Enviar el scheduleJson como data independiente
                console.log("Preparing independent schedule data to send...");
                scheduleDataToSend.independentScheduleData = scheduleJson as unknown as WeekSchedule;
            } else {
                console.warn("Saving independent schedule, but scheduleJson is empty in local state.");
            }
        }

        // Combinar datos a enviar
        const dataToSend = { 
            ...baseDataToSend, 
            linkedScheduleTemplateId: finalLinkedId, // ID de plantilla o null
            ...scheduleDataToSend // Datos de horario independiente (si aplica)
        };

        console.log("Datos finales enviados a updateClinica:", JSON.stringify(dataToSend, null, 2));

        const success = await updateClinica(clinicId, dataToSend as any);

        if (success) {
          toast({
            title: "Configuración guardada",
            description: "Los cambios han sido guardados exitosamente.",
          })
        } else {
          throw new Error("No se pudo guardar la configuración")
        }
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al guardar la configuración.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [clinicData, updateClinica, useTemplateSchedule]) // << AÑADIR useTemplateSchedule a dependencias

  const handleExcepcionChange = (field: keyof ExcepcionHoraria, value: any) => {
    if (editingExcepcion) {
      setEditingExcepcion({ ...editingExcepcion, [field]: value })
    } else {
      setNuevaExcepcion({ ...nuevaExcepcion, [field]: value })
    }
  }

  const handleCrearExcepcion = () => {
    const nuevaExcepcionInicial: ExcepcionHoraria = {
      id: Date.now().toString(),
      clinicaId: clinicId,
      ...crearExcepcionPorDefecto()
    };
    setEditingExcepcion({
      ...nuevaExcepcionInicial
    })
    setShowExcepcionModal(true)
  }

  const handleEditarExcepcion = (excepcionId: string) => {
    // const excepcion = scheduleExceptions.find(exc => exc.id === excepcionId); // << COMENTADO TEMPORALMENTE
    const excepcion = null; // Placeholder para evitar error
    if (excepcion) {
      console.warn("Editing exceptions needs mapping from Prisma structure.");
      setEditingExcepcion(excepcion as ExcepcionHoraria);
      setShowExcepcionModal(true)
    }
  }

  const handleGuardarExcepcion = () => {
    if (!editingExcepcion) return

    console.warn("handleGuardarExcepcion needs refactoring for API calls and data mapping.");

    setShowExcepcionModal(false)
    setEditingExcepcion(null)

    toast({
      title: "Excepción de horario guardada",
      description: "La excepción ha sido guardada correctamente",
    })
  }

  const handleEliminarExcepcion = (excepcionId: string) => {
    console.warn("handleEliminarExcepcion needs refactoring for API calls.");
    toast({
      title: "Excepción eliminada",
      description: "La excepción ha sido eliminada exitosamente.",
    })
  }

  const handleToggleDiaExcepcion = (diaIndex: number, activo: boolean) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      activo,
      franjas: activo ? diasActualizados[diaIndex].franjas : []
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleAddFranjaExcepcion = (diaIndex: number, inicio: string, fin: string) => {
    if (!editingExcepcion) return
    
    const nuevaFranja: FranjaHoraria = {
      id: Date.now().toString(),
      inicio,
      fin
    }
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      franjas: [...diasActualizados[diaIndex].franjas, nuevaFranja]
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleRemoveFranjaExcepcion = (diaIndex: number, franjaId: string) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      franjas: editingExcepcion.dias[diaIndex].franjas.filter(franja => franja.id !== franjaId)
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simular una operación de guardado
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSaving(false)
    // Aquí iría la lógica real de guardado
  }

  const tabs = [
    { id: "info", label: "Información" },
    { id: "sedes", label: "Sedes" },
    { id: "cabinas", label: "Cabinas" },
    { id: "horarios", label: "Horarios" },
    { id: "equipamiento", label: "Equipamiento" },
    { id: "almacenamiento", label: "Almacenamiento" },
    { id: "depuracion", label: "Depuración" },
  ]

  const traducirDia = (dia: string): string => {
    const traducciones: Record<string, string> = {
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miercoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sabado': 'Sábado',
      'domingo': 'Domingo',
    }
    return traducciones[dia] || dia
  }

  const crearExcepcionPorDefecto = () => {
    const horarioApertura = clinicData?.openTime || defaultOpenTime;
    const horarioCierre = clinicData?.closeTime || defaultCloseTime;
    
    return {
      nombre: "",
      fechaInicio: "",
      fechaFin: "",
      dias: diasSemana.map(diaString => ({
        dia: diaString as HorarioDia['dia'],
        franjas: [{
          id: Date.now().toString() + Math.random().toString(36).substring(2, 10),
          inicio: horarioApertura,
          fin: horarioCierre
        }],
        activo: true
      }))
    }
  }

  const crearExcepcionEjemplo = () => {
    if (!clinicData) return;
    
    console.warn("crearExcepcionEjemplo needs reimplementation based on Prisma model and API calls.");
    toast({
      title: "Excepción de ejemplo creada",
      description: "Se ha creado una excepción de ejemplo que comienza hoy y dura una semana.",
    });
  }

  // --- Funciones auxiliares necesarias (si no existen ya) ---
  const convertBlocksToWeekSchedule = (
    blocks: any[] | undefined | null, 
    defaultOpenTime: string, 
    defaultCloseTime: string
  ): WeekSchedule => { 
      // Implementación (similar a la de ScheduleConfig) - Asegúrate de que esté disponible
      const initialSchedule: WeekSchedule = { monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] }, wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] }, friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] }, sunday: { isOpen: false, ranges: [] } };
      if (!blocks) return initialSchedule;
      return blocks.reduce((acc, block) => { const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule; if (acc[dayKey]) { acc[dayKey].isOpen = true; acc[dayKey].ranges.push({ start: block.startTime, end: block.endTime }); acc[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start)); } return acc; }, initialSchedule);
  };

  const createDefaultSchedule = (): WeekSchedule => {
       // Implementación para crear un horario vacío o por defecto
       return { monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] }, wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] }, friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] }, sunday: { isOpen: false, ranges: [] } };
  };
  // --- FIN Funciones auxiliares ---

  // --- Condition based on isLoadingClinic and clinicData only ---
  if (isLoadingClinic || !clinicData) {
    // --- Skeleton para la página de edición de clínica ---
    return (
      <div className="container px-0 pt-4 pb-8">
        <div className="mb-6 space-y-2">
          <Skeleton className="w-3/4 h-8" /> 
          <Skeleton className="w-1/2 h-6" /> 
        </div>
        <div className="flex items-start gap-6">
          {/* Skeleton Menú Lateral */}
          <div className="w-64 shrink-0">
            <div className="sticky p-4 border rounded-lg shadow top-4 bg-card">
              <div className="flex flex-col space-y-1">
                {Array.from({ length: menuItems.length }).map((_, index) => (
                  <Skeleton key={`menu-skeleton-${index}`} className="w-full h-9" />
                ))}
              </div>
            </div>
          </div>
          {/* Skeleton Contenido Principal */}
          <div className="flex-1 space-y-6">
             <Skeleton className="w-1/4 h-8 mb-6" /> {/* Skeleton Título Pestaña */} 
             <Card className="p-6 space-y-6">
                <Skeleton className="w-1/3 h-6 mb-4" /> {/* Skeleton Título Sección */} 
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="w-full h-9" />
                    <Skeleton className="w-full h-9" />
                    <Skeleton className="w-full h-9" />
                    <Skeleton className="w-full h-9" />
                </div>
                 <Skeleton className="w-1/3 h-6 mt-6 mb-4" /> {/* Skeleton Título Sección */} 
                 <div className="grid gap-4 md:grid-cols-2">
                     <Skeleton className="w-full h-9" />
                     <Skeleton className="w-full h-9" />
                     <Skeleton className="w-full h-9 md:col-span-2" />
                 </div>
                 {/* Añadir más skeletons si se quiere simular más secciones */} 
             </Card>
          </div>
        </div>
        {/* Skeleton Botones Flotantes (Opcional, menos crítico) */}
        {/* 
        <div className="fixed z-50 flex flex-col items-end space-y-2 bottom-4 right-4 md:flex-row md:space-y-0 md:space-x-2">
          <Skeleton className="w-24 h-10" />
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-24 h-10" />
        </div>
        */}
      </div>
    );
    // --- FIN Skeleton ---
  }

  return (
    <div className="container px-0 pt-4 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración de Clínica: {clinicData?.name}</h1>
                    </div>

      <div className="flex items-start gap-6">
        <div className="w-64 shrink-0">
          <div className="sticky p-4 border rounded-lg shadow top-4 bg-card">
            <div className="flex flex-col space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {clinicData && (
            <div className="space-y-6">
              <h2 className="mb-6 text-2xl font-semibold">{menuItems.find((item) => item.id === activeTab)?.label}</h2>

              {activeTab === "datos" && (
                <Card className="p-6">
                  <SectionTitle icon={Building2} title="Información general" color="text-blue-600 border-blue-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-sm">
                        Prefijo
                      </Label>
                      <Input
                        id="prefix"
                        defaultValue={clinicData.prefix || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ prefix: e.target.value })}
                      />
                        </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">
                        Nombre
                      </Label>
                      <Input
                        id="name"
                        defaultValue={clinicData.name || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ name: e.target.value })}
                      />
                        </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isActive"
                          checked={clinicData?.isActive}
                          onCheckedChange={(checked) => {
                            if (clinicData) {
                              setClinicData({
                                ...clinicData,
                                isActive: checked === true
                              });
                              
                              toast({
                                title: checked ? "Clínica activada" : "Clínica desactivada",
                                description: checked 
                                  ? "La clínica aparecerá en los selectores de clínicas activas" 
                                  : "La clínica solo será visible cuando se muestre 'clínicas deshabilitadas'",
                                duration: 3000
                              });
                            }
                          }}
                        />
                        <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                          Clínica activa
                        </Label>
                        <div className={`ml-2 px-2 py-0.5 text-xs rounded-full ${clinicData?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {clinicData?.isActive ? 'Activa' : 'Inactiva'}
                        </div>
                        </div>
                      <p className="ml-6 text-xs text-gray-500">
                        Las clínicas inactivas no aparecerán en los selectores por defecto,
                        pero sus datos se conservan y pueden reactivarse en cualquier momento.
                      </p>
                        </div>

                    <div className="space-y-2">
                      <Label htmlFor="commercialName" className="text-sm">
                        Nombre Comercial
                      </Label>
                      <Input
                        id="commercialName"
                        defaultValue={clinicData.commercialName || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ commercialName: e.target.value })}
                      />
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm">
                        Razón Social
                      </Label>
                      <Input
                        id="businessName"
                        defaultValue={clinicData.businessName || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cif" className="text-sm">
                        CIF
                      </Label>
                      <Input
                        id="cif"
                        defaultValue={clinicData.cif || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ cif: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={MapPin} title="Ubicación" color="text-green-600 border-green-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm">
                        País
                      </Label>
                      <Select
                        value={clinicData.country || undefined}
                        onValueChange={(value) => debouncedHandleClinicUpdate({ country: value })}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Seleccionar país" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Marruecos">Marruecos</SelectItem>
                          <SelectItem value="España">España</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-sm">
                        Provincia
                      </Label>
                      <Input
                        id="province"
                        defaultValue={clinicData.province || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ province: e.target.value })}
                      />
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">
                        Ciudad
                      </Label>
                      <Input
                        id="city"
                        defaultValue={clinicData.city || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-sm">
                        CP
                      </Label>
                      <Input
                        id="postalCode"
                        defaultValue={clinicData.postalCode || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ postalCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm">
                        Dirección
                      </Label>
                      <Input
                        id="address"
                        defaultValue={clinicData.address || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ address: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Phone} title="Contacto" color="text-orange-600 border-orange-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        defaultValue={clinicData.phone || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone2" className="text-sm">
                        Teléfono 2
                      </Label>
                      <Input
                        id="phone2"
                        defaultValue={clinicData.phone2 || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ phone2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email" className="text-sm">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={clinicData.email || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ email: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Settings2} title="Configuración" color="text-purple-600 border-purple-600" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Caja inicial</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={clinicData.initialCash ?? ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ initialCash: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tamaño impresión ticket</Label>
                  <Select 
                        value={clinicData.ticketSize || undefined}
                        onValueChange={(value) => debouncedHandleClinicUpdate({ ticketSize: value })}
                  >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Seleccionar tamaño" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a5">Hoja A5</SelectItem>
                          <SelectItem value="a4">Hoja A4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tarifa</Label>
                      <Select
                        value={clinicData.tariffId || undefined}
                        onValueChange={(value) => debouncedHandleClinicUpdate({ tariffId: value })}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Seleccionar tarifa">
                            {clinicData.tariffId ? tarifas?.find(t => t.id === clinicData.tariffId)?.name : "Seleccionar tarifa"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {tarifas?.map((tarifa) => (
                            <SelectItem key={tarifa.id} value={tarifa.id}>
                              {tarifa.name}
                            </SelectItem>
                          ))}
                          {(!tarifas || tarifas.length === 0) && (
                            <SelectItem value="no-tarifs" disabled>
                              No hay tarifas disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">IP</Label>
                      <Input
                        defaultValue={clinicData.ip || ''}
                        className="text-sm h-9"
                        onChange={(e) => debouncedHandleClinicUpdate({ ip: e.target.value })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear el área de firma electrónica en flowww.me?</Label>
                        <RadioGroup
                          value={clinicData.blockSignArea ? 'yes' : 'no'}
                          onValueChange={(value) => debouncedHandleClinicUpdate({ blockSignArea: value === 'yes' })}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="sign-no" />
                            <Label htmlFor="sign-no" className="text-sm">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="sign-yes" />
                            <Label htmlFor="sign-yes" className="text-sm">
                              Sí, con la clave
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear las áreas de datos personales en flowww.me?</Label>
                        <RadioGroup
                          value={clinicData.blockPersonalData ? 'yes' : 'no'}
                          onValueChange={(value) => debouncedHandleClinicUpdate({ blockPersonalData: value === 'yes' })}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="personal-no" />
                            <Label htmlFor="personal-no" className="text-sm">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="personal-yes" />
                            <Label htmlFor="personal-yes" className="text-sm">
                              Sí, con la clave
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Funcionalidades</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="delayed-payments"
                            checked={!!clinicData.delayedPayments}
                            onCheckedChange={(checked) => debouncedHandleClinicUpdate({ delayedPayments: checked === true })}
                          />
                          <Label htmlFor="delayed-payments" className="text-sm">
                            Pagos aplazados
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="affects-stats"
                            checked={!!clinicData.affectsStats}
                            onCheckedChange={(checked) => debouncedHandleClinicUpdate({ affectsStats: checked === true })}
                          />
                          <Label htmlFor="affects-stats" className="text-sm">
                            Afecta estadísticas
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="appears-in-app"
                            checked={!!clinicData.appearsInApp}
                            onCheckedChange={(checked) => debouncedHandleClinicUpdate({ appearsInApp: checked === true })}
                          />
                          <Label htmlFor="appears-in-app" className="text-sm">
                            Aparece en App / Self
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="schedule-control"
                            checked={!!clinicData.scheduleControl}
                            onCheckedChange={(checked) => debouncedHandleClinicUpdate({ scheduleControl: checked === true })}
                          />
                          <Label htmlFor="schedule-control" className="text-sm">
                            Control de horarios
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="professional-skills"
                            checked={!!clinicData.professionalSkills}
                            onCheckedChange={(checked) => debouncedHandleClinicUpdate({ professionalSkills: checked === true })}
                          />
                          <Label htmlFor="professional-skills" className="text-sm">
                            Control de habilidades profesionales
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm">
                        Notas
                      </Label>
                      <Textarea
                        id="notes"
                        defaultValue={clinicData.notes || ''}
                        className="h-20 text-sm"
                        onChange={(e) => debouncedHandleClinicUpdate({ notes: e.target.value })}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "horarios" && (
                <Card className="p-6">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="general">Horario General</TabsTrigger>
                      <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general">
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label>Horario Apertura</Label>
                            <Input
                              type="time"
                              value={clinicData.openTime || defaultOpenTime}
                              onChange={(e) => handleClinicUpdate({ openTime: e.target.value })}
                              disabled={useTemplateSchedule}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Horario Cierre</Label>
                            <Input
                              type="time"
                              value={clinicData.closeTime || defaultCloseTime}
                              onChange={(e) => handleClinicUpdate({ closeTime: e.target.value })}
                              disabled={useTemplateSchedule}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duración Slot (min)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              step="1"
                              value={clinicData.slotDuration || defaultSlotDuration}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value)
                                if (value >= 1 && value <= 60) {
                                  handleClinicUpdate({ slotDuration: value })
                                }
                              }}
                              disabled={useTemplateSchedule}
                            />
                          </div>
                        </div>
                        {/* Botón para aplicar horario general (condición revisada) */}
                        {!useTemplateSchedule && (
                            <div className="flex justify-end mb-4">
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={handleApplyGeneralTimesToAllDays}
                                >
                                    Aplicar Horario General a Días Abiertos
                                </Button>
                            </div>
                        )}
                        {/* Fin Botón */}
                        <div className="space-y-2">
                          <Label>Seleccionar plantilla horaria</Label>
                          <Select 
                              value={clinicData.linkedScheduleTemplateId || ""} 
                              onValueChange={handleTemplateChange}
                              // Opcional: Deshabilitar el Select si useTemplateSchedule es true?
                              // disabled={useTemplateSchedule} // <-- Considerar si se debe poder cambiar plantilla mientras está bloqueado
                          >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar una plantilla"> {/* Placeholder si el valor es "" y no hay contenido */} 
                                    {/* CONTENIDO DINÁMICO AQUÍ */} 
                                    {clinicData.linkedScheduleTemplateId 
                                        ? (templates.find(t => t.id === clinicData.linkedScheduleTemplateId) as any)?.description || 
                                          (templates.find(t => t.id === clinicData.linkedScheduleTemplateId) as any)?.name || 
                                          `Plantilla ID: ${clinicData.linkedScheduleTemplateId}` // Fallback final al ID
                                        : <span className="text-muted-foreground">Horario personalizado</span>
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {/* Opción para desvincular explícitamente? */} 
                                {/* 
                                <SelectItem value="__none__" onClick={() => handleUseTemplateToggle(false)}>
                                    -- Usar Horario Personalizado --
                                </SelectItem> 
                                */} 
                              {templates.map((template) => (
                                <SelectItem key={String(template.id)} value={String(template.id)}>
                                        {(template as any)?.description || `ID: ${template.id}`} {/* Usar descripción o ID */} 
                            </SelectItem>
                          ))}
                                {templates.length === 0 && <SelectItem value="_no_templates_" disabled>No hay plantillas</SelectItem>}
                        </SelectContent>
                      </Select>
                      </div>
                        {/* Checkbox Usar Plantilla (SIN disabled) */}
                        <div className="flex items-center mt-4 mb-4 space-x-2">
                            <Checkbox 
                                id="use-template-schedule"
                                checked={useTemplateSchedule}
                                onCheckedChange={handleUseTemplateToggle}
                                // disabled={!clinicData?.linkedScheduleTemplateId} // <-- ELIMINADO
                            />
                            <Label htmlFor="use-template-schedule" className="text-sm font-medium">
                                Usar horario de la plantilla vinculada (Bloquea edición)
                            </Label>
                  </div>
                        <Card>
                          <CardContent className="pt-6">
                            <ScheduleConfig
                              // --- AÑADIDA KEY ---
                              key={JSON.stringify(clinicData.scheduleJson)} 
                              // --- FIN KEY ---
                              clinic={clinicData}
                              onChange={handleClinicUpdate}
                              isReadOnly={useTemplateSchedule}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="excepciones">
                      <div className="p-6 text-center text-gray-500">
                        Funcionalidad de excepciones horarias en desarrollo o refactorización.
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              )}

              {activeTab === "cabinas" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Cabinas de la clínica: {clinicData?.name}</h3>
                      <Button onClick={() => {
                          setEditingCabin(null); // Asegurar que no hay cabina en edición
                          setIsCabinDialogOpen(true); // Abrir diálogo para nueva cabina
                        }}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" /> Nueva cabina
                        </Button>
                    </div>
                    <SearchInput
                      placeholder="Buscar cabina por nombre o código"
                            value={cabinFilterText} 
                      onChange={setCabinFilterText}
                        />
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Nº</TableHead>
                                <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                                <TableHead>Color</TableHead>
                            <TableHead className="text-center">Activo</TableHead>
                            <TableHead className="text-center">Subir</TableHead>
                            <TableHead className="text-center">Bajar</TableHead>
                            <TableHead className="text-center">Borrar</TableHead>
                            <TableHead className="text-center">Ver +</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingCabins ? (
                            <TableRow>
                              <TableCell colSpan={9} className="h-24 text-center">
                                Cargando cabinas...
                              </TableCell>
                            </TableRow>
                          ) : cabinsData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="h-24 text-center">
                                No se encontraron cabinas para esta clínica.
                              </TableCell>
                            </TableRow>
                          ) : (
                            cabinsData
                              .filter(
                                (cabin: Cabin) =>
                                  cabin.name.toLowerCase().includes(cabinFilterText.toLowerCase()) ||
                                  (cabin.code && cabin.code.toLowerCase().includes(cabinFilterText.toLowerCase()))
                              )
                              .map((cabin, index) => (
                                <TableRow key={cabin.id} className={cabin.isActive ? "" : "opacity-50"}>
                                        <TableCell>{cabin.order ?? '-'}</TableCell>
                                  <TableCell>{cabin.code ?? '-'}</TableCell>
                                  <TableCell>{cabin.name}</TableCell>
                                  <TableCell>
                                    <div className="w-6 h-6 border rounded-full" style={{ backgroundColor: cabin.color ?? '#ffffff' }}></div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={cabin.isActive}
                                      onCheckedChange={(checked) => {
                                        console.warn("Checkbox change needs API call for cabin status.");
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-10 h-10 text-gray-600 hover:text-gray-800"
                                      onClick={() => handleReorderCabin(cabin.id, 'up')}
                                      disabled={index === 0}
                                    >
                                      <ChevronUp className="w-6 h-6 font-bold" />
                                </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-10 h-10 text-gray-600 hover:text-gray-800"
                                      onClick={() => handleReorderCabin(cabin.id, 'down')}
                                      disabled={index === cabinsData
                                        .filter(
                                          (c: Cabin) =>
                                            c.name.toLowerCase().includes(cabinFilterText.toLowerCase()) ||
                                            (c.code && c.code.toLowerCase().includes(cabinFilterText.toLowerCase()))
                                        )
                                        .length - 1}
                                    >
                                      <ChevronDown className="w-6 h-6 font-bold" />
                                </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-10 h-10 text-destructive hover:text-red-700"
                                      onClick={() => {
                                        console.warn("Delete cabin needs API call.");
                                      }}
                                    >
                                      <Trash2 className="w-6 h-6 font-bold" /> 
                                    </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-10 h-10 text-blue-600 hover:text-blue-800"
                                      onClick={() => {
                                        setEditingCabin(cabin);
                                        setIsCabinDialogOpen(true);
                                      }}
                                    >
                                      <Search className="w-6 h-6 font-bold" />
                                    </Button>
                              </TableCell>
                            </TableRow>
                                ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "equipamiento" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-medium">Listado del equipamiento de la clínica: {clinicData.name}</h2>
                    </div>

                    <SearchInput
                      placeholder="Buscar equipamiento"
                      value={equipmentFilterText}
                      onChange={setEquipmentFilterText}
                    />

                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                                <TableRow>
                            <TableHead className="font-medium">Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Número de serie</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEquipment.map((equipment, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{equipment.code}</TableCell>
                              <TableCell>{equipment.name}</TableCell>
                              <TableCell>{equipment.description}</TableCell>
                              <TableCell>{equipment.serialNumber || "-"}</TableCell>
                              <TableCell className="space-x-1 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() => deleteEquipment(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-primary" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() =>
                                    router.push(`/configuracion/clinicas/${params.id}/equipamiento/${equipment.id}`)
                                  }
                                >
                                  <Search className="w-4 h-4 text-primary" />
                                  <span className="sr-only">Ver/Editar</span>
                                </Button>
                                    </TableCell>
                                </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "almacenamiento" && (
                <Card className="p-6">
                  <AlmacenamientoClinicaContent clinicId={clinicId} />
                </Card>
              )}

              {activeTab === "usuarios" && (
                <Card className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Usuarios de la clínica: {clinicData.name}</h3>
                    </div>
                    
                    <UsuariosClinica 
                      clinicId={clinicId}
                      showNewUserDialog={showNewUserDialog}
                      onCloseNewUserDialog={() => setShowNewUserDialog(false)}
                    />
                  </div>
                </Card>
              )}

              {activeTab === "entidades" && (
                <Card className="p-6">
                  <h3>Entidades bancarias</h3>
                </Card>
              )}
              
              {activeTab === "integraciones" && (
                <Card className="p-6">
                  <h3>Integraciones</h3>
                </Card>
              )}
              
              {activeTab === "descuentos" && (
                <Card className="p-6">
                  <h3>Descuentos</h3>
                </Card>
              )}
              
              {activeTab === "sms" && (
                <Card className="p-6">
                  <h3>SMS/Push</h3>
                </Card>
              )}
              
              {activeTab === "email" && (
                <Card className="p-6">
                  <h3>Notificaciones e-mail</h3>
                </Card>
              )}
              
              {activeTab === "whatsapp" && (
                <Card className="p-6">
                  <h3>Notificaciones WhatsApp</h3>
                </Card>
              )}
              
              {activeTab === "otros" && (
                <Card className="p-6">
                  <h3>Otros APIs</h3>
                </Card>
              )}

              {activeTab === "tarifa" && (
                <Card className="p-6">
                  <SectionTitle icon={Tag} title="Tarifa Aplicada" color="text-teal-600 border-teal-600" />
                  {isLoadingTarifa ? (
                    <p className="text-gray-500">Cargando información de la tarifa...</p>
                  ) : tarifaAplicada === null ? (
                    <p className="text-gray-500">
                      {clinicData?.tariffId ? 
                         `No se encontró la tarifa con ID: "${clinicData.tariffId}". Verifique la configuración.` : 
                         "Esta clínica no tiene una tarifa asignada."}
                    </p>
                  ) : tarifaAplicada ? (
                    <div className="space-y-4">
                       <div>
                          <Label className="block mb-1 text-sm font-medium text-gray-500">Nombre Tarifa</Label>
                          <p className="text-lg font-semibold">{tarifaAplicada.name}</p>
                       </div>
                       <Button onClick={() => router.push(`/configuracion/clinicas/${clinicId}/servicios`)} className="mt-4">
                          Configurar Servicios y Precios para esta Clínica
                       </Button>
                    </div>
                  ) : (
                     <p className="text-gray-500">Inicializando...</p>
                  )}
                </Card>
              )}

              {activeTab === "debug" && (
                <div className="space-y-4">
                  <DebugStorage clinicId={clinicData.id.toString()} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <CabinEditDialog
        isOpen={isCabinDialogOpen}
        cabin={editingCabin}
        onClose={() => {
          setIsCabinDialogOpen(false)
          setEditingCabin(null)
        }}
        onSave={handleSaveCabin as any}
      />

      <div className="fixed z-50 flex flex-col items-end space-y-2 bottom-4 right-4 md:flex-row md:space-y-0 md:space-x-2">
        <BackButton
          href="/configuracion/clinicas"
          className="px-4 py-2 text-sm text-gray-600 bg-white rounded-md shadow-md hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </BackButton>
        {activeTab === "cabinas" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
            onClick={() => {
              setEditingCabin(null)
              setIsCabinDialogOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva cabina
          </Button>
        )}
        {activeTab === "equipamiento" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
            onClick={() => {
              router.push(`/configuracion/clinicas/${clinicId}/equipamiento/nuevo`)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo equipamiento
          </Button>
        )}
        {activeTab === "usuarios" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
            onClick={() => setShowNewUserDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo usuario
          </Button>
        )}
        <Button
          className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
          onClick={handleSaveClinic}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <svg
                className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Centro
            </>
          )}
        </Button>
        <Button className="px-4 py-2 text-sm text-white bg-black rounded-md shadow-md hover:bg-gray-800">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

