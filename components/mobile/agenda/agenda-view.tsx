"use client"

import { useRouter } from "next/navigation"

import React, { useMemo, useRef, useCallback } from "react"

import { useState, useEffect, ErrorInfo } from "react"
import { format, addDays, addMonths, isSameDay, subDays, parseISO, startOfWeek, isValid } from "date-fns"
import { es } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Check,
  Grid,
  Plus,
  Calendar,
  SkipForward,
  Home,
  Users,
  BarChart2,
  Menu,
  X,
  Flag,
  SkipBack,
  Clock,
  AlertTriangle,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// Actualizar importaciones
import { MobileBottomSheet } from "@/components/mobile/layout/bottom-sheet"
import { MobileClientSearch as MobileClientSearchComponent } from "@/components/mobile/client/client-search"
import { MobileAppointmentDialog } from "@/components/mobile/agenda/appointment-dialog"
import { MobileClientDetails } from "@/components/mobile/client/client-details"
import { MobileDatePickerSheet } from "@/components/mobile/common/date-picker-sheet"
import { MobileDrawerMenu } from "@/components/mobile/layout/drawer-menu"
import { MainSidebar } from "@/components/main-sidebar"
import { useTheme } from "@/contexts/theme"
import { AGENDA_CONFIG, getTimeSlots, scrollToCurrentTime } from "@/config/agenda-config"
import { ClientCardWrapper } from "@/components/client-card-wrapper"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { useClinic } from "@/contexts/clinic-context"
import type { WeekSchedule } from "@/types/schedule"
import { ScrollIndicator } from "@/components/ui/scroll-indicator"
import type { Appointment as AppointmentType } from "@/types/appointment"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import {
  getBusinessHours
} from "@/services/clinic-schedule-service"
import { useScheduleBlocks } from "@/contexts/schedule-blocks-context";
import { CabinScheduleOverride, ScheduleTemplateBlock, ClinicScheduleBlock } from "@prisma/client";
import { BlockScheduleModal } from "@/components/block-schedule-modal";
import { convertBlocksToWeekSchedule } from "@/utils/scheduleUtils";

// +++ Definir función para calcular altura +++
const calculateAppointmentHeight = (durationMinutes: number, slotDurationMinutes: number): number => {
  if (slotDurationMinutes <= 0) return AGENDA_CONFIG.ROW_HEIGHT; // Evitar división por cero
  const slots = durationMinutes / slotDurationMinutes;
  return Math.max(1, slots) * AGENDA_CONFIG.ROW_HEIGHT; // Altura mínima de 1 slot
};
// +++ Fin Definición +++

// --- Definir helpers ANTES de usarlos en useMemo ---
const getDayKey = (date: Date) => {
  if (!isValid(date)) { 
      console.warn("[MobileAgendaView - getDayKey] Received invalid date:", date);
      return "";
  }
  const day = format(date, "EEEE", { locale: es }).toLowerCase();
  const dayMap = {
    lunes: "monday", martes: "tuesday", miércoles: "wednesday", jueves: "thursday",
    viernes: "friday", sábado: "saturday", domingo: "sunday",
  } as const;
  return dayMap[day as keyof typeof dayMap] || day;
};

interface MobileAppointment {
  id: string
  clientName: string
  clientNumber: string
  time: string
  completed: boolean
  services: Array<{
    color: string
    name: string
  }>
}

interface ServiceRoom {
  id: string
  name: string
  color: string
  abbrev: string
}

interface Client {
  id: string
  name: string
  phone: string
  registrationDate?: string
}

// Agregar props al componente
interface MobileAgendaViewProps {
  showMainSidebar?: boolean
}

// Componente para manejar errores
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error en MobileAgendaView:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-red-800 bg-red-50">
          <h2 className="mb-2 text-xl font-bold">Ha ocurrido un error</h2>
          <p className="mb-4">{this.state.error?.message || "Error desconocido"}</p>
          <pre className="max-w-full p-2 overflow-auto text-xs bg-red-100 rounded">
            {this.state.error?.stack || "No hay stack trace disponible"}
          </pre>
          <button
            className="px-4 py-2 mt-4 text-white bg-red-600 rounded"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Intentar de nuevo
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function MobileAgendaView({ showMainSidebar = false }: MobileAgendaViewProps) {
  return (
    <ErrorBoundary fallback={<div>Error en la agenda móvil</div>}>
      <MobileAgendaViewContent showMainSidebar={showMainSidebar} />
    </ErrorBoundary>
  )
}

function MobileAgendaViewContent({ showMainSidebar = false }: MobileAgendaViewProps) {
  const { activeClinic, isLoading } = useClinic()
  const { cabinOverrides } = useScheduleBlocks();
  const { activeClinicCabins, isLoadingCabinsContext } = useClinic();
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [view, setView] = useState<"list" | "calendar">("calendar")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentType | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [bottomSheetContent, setBottomSheetContent] = useState<"search" | "clientDetails">("search")
  const [selectedSlot, setSelectedSlot] = useState<{ time: string } | null>(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [hasInternalError, setHasInternalError] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const { theme } = useTheme()
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const timeSlotRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const tableHeadersRef = useRef<HTMLDivElement>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [blockToEdit, setBlockToEdit] = useState<CabinScheduleOverride | null>(null)
  
  // <<< ESTADO DE CITAS VACÍO PARA SOLUCIONAR LINTER ERRORS >>>
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  
  // <<< FUNCIONES RELACIONADAS VACÍAS/PLACEHOLDERS >>>
  const fetchAppointments = async () => {
    console.log('[MobileAgendaView] fetchAppointments called - activeClinic:', activeClinic?.id, 'currentDate:', currentDate);
    
    if (!activeClinic?.id || !currentDate) {
      console.log('[MobileAgendaView] Missing activeClinic ID or currentDate, skipping fetch');
      return;
    }
    
    setIsLoadingAppointments(true);
    setAppointmentError(null);
    
    try {
      // Para la vista móvil, solo cargamos las citas del día actual
      const url = `/api/appointments?clinicId=${activeClinic.id}&startDate=${format(currentDate, 'yyyy-MM-dd')}&endDate=${format(currentDate, 'yyyy-MM-dd')}`;
      console.log('[MobileAgendaView] Fetching appointments from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching appointments: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[MobileAgendaView] Received appointments:', data);
      
      // Procesar las citas para el formato esperado
      const processedAppointments = data.map((apt: any) => ({
        id: apt.id,
        name: apt.person?.name || 'Sin nombre',
        service: apt.services?.map((s: any) => s.service?.name).filter(Boolean).join(', ') || 'Sin servicio',
        date: new Date(apt.startTime),
        roomId: apt.equipment?.id || apt.roomId || 'default',
        startTime: format(new Date(apt.startTime), 'HH:mm'),
        duration: apt.duration || 30, // duración en minutos
        color: (() => {
          // Lógica de color como en WeeklyAgenda
          if (apt.services && apt.services.length > 0) {
            const uniqueServiceTypes = [...new Set(apt.services.map((s: any) => s.serviceId))];
            if (uniqueServiceTypes.length === 1 && apt.services[0].service?.colorCode) {
              return apt.services[0].service.colorCode;
            }
          }
          return '#6B7280'; // Color por defecto (gris)
        })(),
        completed: apt.status === 'COMPLETED',
        phone: apt.person?.phone,
        personId: apt.personId,
        serviceIds: apt.services?.map((s: any) => s.serviceId) || []
      }));
      
      setAppointments(processedAppointments);
      console.log('[MobileAgendaView] Processed appointments:', processedAppointments);
    } catch (error) {
      console.error('[MobileAgendaView] Error fetching appointments:', error);
      setAppointmentError('Error al cargar las citas');
      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  };
  const getAppointmentBgColor = (appointment: AppointmentType, theme: string): string => "bg-gray-200";
  const getAppointmentTextColor = (appointment: AppointmentType, theme: string): string => "text-gray-800";
  const getAppointmentTop = (appointment: AppointmentType, timeSlots: string[]): number => 0;
  const getAppointmentHeight = (appointment: AppointmentType, /* slotDuration ya no es necesario aquí */): number => {
    // Usar el slotDuration del useMemo principal
    // const durationMinutes = (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / (1000 * 60); <-- Obsoleto: Usa endTime
    // +++ Usar appointment.duration y la nueva función helper +++
    return calculateAppointmentHeight(appointment.duration, slotDuration); // Pasar slotDuration efectivo
  };
  const getCompatibleAgendaRef = useCallback(() => {
    // Devuelve un objeto compatible con RefObject<HTMLDivElement>
    return containerRef as React.RefObject<HTMLDivElement>
  }, []);
  // <<< FIN PLACEHOLDERS >>>

  // <<< Leer configuración horaria desde la nueva estructura >>>
  const scheduleConfig = useMemo(() => {
    if (!activeClinic) return { openTime: "09:00", closeTime: "18:00", slotDuration: 15 }; // Fallback inicial
    
    // Prioridad 1: Horario independiente
    if (activeClinic.independentSchedule) {
       console.log("[MobileAgendaView Config] Using independent schedule config");
       return {
          openTime: activeClinic.independentSchedule.openTime || "09:00",
          closeTime: activeClinic.independentSchedule.closeTime || "18:00",
          slotDuration: activeClinic.independentSchedule.slotDuration || 15,
       }
    }
    // Prioridad 2: Plantilla vinculada
    if (activeClinic.linkedScheduleTemplate) {
       console.log("[MobileAgendaView Config] Using linked template config");
       return {
         openTime: activeClinic.linkedScheduleTemplate.openTime || "09:00",
         closeTime: activeClinic.linkedScheduleTemplate.closeTime || "18:00",
         slotDuration: activeClinic.linkedScheduleTemplate.slotDuration || 15,
       }
    }
    // Fallback final si no hay ninguno
    console.log("[MobileAgendaView Config] Using fallback config");
    return { openTime: "09:00", closeTime: "18:00", slotDuration: 15 };
    
  }, [activeClinic]);

  const { 
      openTime: effectiveOpenTime, 
      closeTime: effectiveCloseTime, 
      slotDuration 
  } = scheduleConfig;
  // <<< FIN LECTURA CONFIGURACIÓN >>>

  const correctSchedule = useMemo(() => {
    if (!activeClinic) return null; 
    // ... (lógica existente para obtener templateBlocks o independentBlocks) ...
    
    let blocksToUse: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null = null;
    
    if (activeClinic.independentScheduleBlocks && activeClinic.independentScheduleBlocks.length > 0) {
      console.log("[MobileAgendaView Schedule] Using independent blocks.");
      blocksToUse = activeClinic.independentScheduleBlocks;
    } else if (activeClinic.linkedScheduleTemplate?.blocks && activeClinic.linkedScheduleTemplate.blocks.length > 0) {
      console.log("[MobileAgendaView Schedule] Using template blocks.");
      blocksToUse = activeClinic.linkedScheduleTemplate.blocks;
    } else {
      console.log("[MobileAgendaView Schedule] No blocks found.");
    }
    
    // Usar openTime/closeTime efectivos obtenidos de scheduleConfig
    const resultingSchedule = convertBlocksToWeekSchedule(blocksToUse, effectiveOpenTime, effectiveCloseTime);
    console.log("[MobileAgendaView Schedule] Resulting correctSchedule:", JSON.stringify(resultingSchedule));
    return resultingSchedule;
  }, [activeClinic, effectiveOpenTime, effectiveCloseTime]); // <-- Añadir dependencias

  const serviceRooms: ServiceRoom[] = useMemo(() => {
    try {
      return activeClinicCabins
        ?.filter((cabin) => cabin.isActive)
        .sort((a, b) => a.order - b.order)
        .map((cabin) => ({
          id: String(cabin.id),
          name: cabin.name,
          color: cabin.color,
          abbrev: cabin.code || cabin.name.substring(0, 3),
        })) || []
    } catch (error) {
      console.error("Error al procesar cabinas:", error)
      return []
    }
  }, [activeClinicCabins]);

  const appColors = useMemo(() => {
    console.log("Actualizando colores con el tema:", theme);
    return {
      primary: theme?.primaryColor || '#7c3aed',
      secondary: theme?.secondaryColor || '#8b5cf6',
      accent: theme?.accentColor || '#a78bfa',
      text: theme?.textColor || '#111827',
      background: theme?.backgroundColor || '#ffffff',
      headerBg: theme?.headerBackgroundColor || '#7c3aed',
      sidebarBg: theme?.sidebarBackgroundColor || '#f9fafb',
    }
  }, [theme])

  const timeSlots = useMemo(() => {
    console.log(`[MobileAgendaView timeSlots] Generating slots with effectiveOpenTime: ${effectiveOpenTime}, effectiveCloseTime: ${effectiveCloseTime}, slotDuration: ${slotDuration}`);
    return getTimeSlots(effectiveOpenTime, effectiveCloseTime, slotDuration); // Usar valores efectivos
  }, [effectiveOpenTime, effectiveCloseTime, slotDuration]);

  // Efecto para cargar servicios o manejar errores
  useEffect(() => {
    if (isLoading) {
      console.info("Cargando datos de clínica...");
      return;
    }
    
    if (!activeClinic) {
      console.info("No hay clínica activa seleccionada");
      // Mostrar una interfaz reducida en lugar de un error completo
      setHasInternalError(false);
      setErrorDetails("No se ha seleccionado una clínica activa.");
      return;
    }

    // Continuar con la lógica normal...
  }, [isLoading, activeClinic, currentDate]);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen)

  // Función para detectar iOS
  const isIOS = () => {
    if (typeof window === "undefined") return false
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    )
  }

  useEffect(() => {
    setIsIOSDevice(isIOS())
  }, [])

  // Fetch de citas
  useEffect(() => {
    if (activeClinic?.id && currentDate) {
      fetchAppointments();
    } else {
      setAppointments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClinic?.id, currentDate]);

  // Temporizador para la línea roja
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Scroll to current time on mount
    if (containerRef.current) {
      scrollToCurrentTime(containerRef)
    }
  }, [])

  const isDayAvailable = useCallback(
    (date: Date) => {
      // <<< LOG INICIO >>>
      // console.log("[MobileAgendaView - isDayAvailable] Checking date:", date);
      
      if (!isValid(date)) { 
          console.warn("[MobileAgendaView - isDayAvailable] Invalid date received, returning false.");
          return false; 
      }

      // <<< MODIFICACIÓN: Si no hay horario definido, el día SE CONSIDERA DISPONIBLE >>>
      if (!correctSchedule) {
        console.log("[MobileAgendaView - isDayAvailable] No correctSchedule defined, considering day AVAILABLE by default.");
        return true; 
      }
      // <<< FIN MODIFICACIÓN >>>
      
      // console.log("[MobileAgendaView - isDayAvailable] Using correctSchedule:", correctSchedule);
      const dayKey = getDayKey(date);
      if (!dayKey) {
        console.warn(`[MobileAgendaView - isDayAvailable] Could not derive dayKey for date: ${date}`);
        return false; // No se pudo obtener clave del día
      }
      
      const daySchedule = correctSchedule[dayKey as keyof WeekSchedule];
      // console.log(`[MobileAgendaView - isDayAvailable] Schedule for ${dayKey}:`, daySchedule);
      
      if (!daySchedule) { 
          // console.log(`[MobileAgendaView - isDayAvailable] No schedule config for ${dayKey}, returning false.`);
          return false; // No hay configuración para el día
      }
      
      // El día está disponible si está abierto y tiene al menos un rango válido
      const isAvailable = daySchedule.isOpen && 
                          daySchedule.ranges && 
                          daySchedule.ranges.length > 0 && 
                          daySchedule.ranges.some(range => range.start && range.end && range.start < range.end);
                          
      // console.log(`[MobileAgendaView - isDayAvailable] Day ${dayKey} is available: ${isAvailable}`);
      return isAvailable;
    },
    [correctSchedule], // Dependencia principal
  )

  const getNextAvailableDay = useCallback((startDate: Date, direction: "forward" | "backward") => {
    let nextDate = startDate;
    let iterations = 0;
    const maxIterations = 365; // Límite para evitar bucles infinitos

    console.log(`[MobileAgendaView - getNextAvailableDay] Starting search from: ${startDate} Direction: ${direction}`); // <<< LOG INICIO >>>

    while (iterations < maxIterations) {
      iterations++;
      // <<< LOG DENTRO DEL BUCLE >>>
      const dateStr = format(nextDate, 'yyyy-MM-dd');
      const isAvailableResult = isDayAvailable(nextDate);
      console.log(`[MobileAgendaView - getNextAvailableDay] Iteration ${iterations}: Checking ${dateStr}. Is available? ${isAvailableResult}`);
      
      if (isValid(nextDate) && isAvailableResult) {
        console.log(`[MobileAgendaView - getNextAvailableDay] Found available day: ${dateStr}`); // <<< LOG ENCONTRADO >>>
        return nextDate; // Devuelve el primer día válido encontrado
      }
      
      // Incrementar/Decrementar día
      nextDate = direction === "forward" ? addDays(nextDate, 1) : subDays(nextDate, 1);
      
      // <<< LOG ANTES DE SIGUIENTE ITERACIÓN >>>
      // console.log(`[MobileAgendaView - getNextAvailableDay] Next date to check: ${format(nextDate, 'yyyy-MM-dd')}`);
    }

    // Cambiado a console.warn ya que gestionamos el caso de "ningún día disponible"
    console.warn(`[MobileAgendaView - getNextAvailableDay] Loop exceeded maximum iterations (${maxIterations}). Breaking.`);
    return startDate; // Devuelve la fecha original si no se encuentra nada después de X iteraciones
  }, [isDayAvailable]);

  useEffect(() => {
    // <<< LOG AL INICIO DEL useEffect >>>
    console.log("[MobileAgendaView - useEffect] Initializing date check. activeClinic:", activeClinic ? activeClinic.id : 'null', "correctSchedule:", correctSchedule ? 'Exists' : 'null');

    if (!activeClinic || !correctSchedule) {
      console.log("[MobileAgendaView - useEffect] Waiting for activeClinic and correctSchedule to load before setting initial date.");
      return; // Esperar a que la clínica y el horario estén cargados
    }

    const today = new Date();
    const todayIsValid = isValid(today);
    // <<< LOG ANTES DE isDayAvailable >>>
    console.log(`[MobileAgendaView - useEffect] Initializing date. Today: ${today} Is valid: ${todayIsValid}`);
    console.log(`[MobileAgendaView - useEffect] Using correctSchedule:`, JSON.stringify(correctSchedule));

    if (todayIsValid && isDayAvailable(today)) {
      setCurrentDate(today);
      // <<< LOG FECHA ACTUAL ESTABLECIDA >>>
      console.log(`[MobileAgendaView - useEffect] Today is available. Set current date to: ${format(today, 'yyyy-MM-dd')}`);
    } else if (todayIsValid) {
      // Comprobar si ALGÚN día de la semana está abierto en el horario
      const isAnyDayOpen = Object.values(correctSchedule).some(day => day.isOpen);
      
      if (isAnyDayOpen) {
        // <<< LOG BUSCANDO PRÓXIMO DÍA >>>
        console.log("[MobileAgendaView - useEffect] Today is not available, but other days might be. Finding next available day...");
        const nextAvailable = getNextAvailableDay(today, "forward");
        setCurrentDate(nextAvailable);
        // <<< LOG PRÓXIMA FECHA ESTABLECIDA >>>
        console.log(`[MobileAgendaView - useEffect] Found next available day. Set current date to: ${format(nextAvailable, 'yyyy-MM-dd')}`);
      } else {
        // Si ningún día está abierto, simplemente usa la fecha de hoy
        console.log("[MobileAgendaView - useEffect] Today is not available, and NO day in the schedule is open. Setting current date to today.");
        setCurrentDate(today);
      }
    } else {
       // Si 'today' no es válido por alguna razón, nos quedamos con la fecha actual (podría ser la anterior)
       console.warn("[MobileAgendaView - useEffect] Today's date is invalid. Keeping current date.")
    }
    // Quitar activeClinic de las dependencias si causa bucles, mantener solo correctSchedule
  }, [correctSchedule, isDayAvailable, getNextAvailableDay]); // Dependencias clave

  const handlePrevDay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al día anterior:", currentDate)
        const newDate = getNextAvailableDay(currentDate, "backward")
        console.log("Nueva fecha calculada:", newDate)
        setCurrentDate(newDate)
      } catch (error) {
        console.error("Error en handlePrevDay:", error)
      }
    }
  }

  const handleNextDay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al día siguiente:", currentDate)
        const newDate = getNextAvailableDay(currentDate, "forward")
        console.log("Nueva fecha calculada:", newDate)
        setCurrentDate(newDate)
      } catch (error) {
        console.error("Error en handleNextDay:", error)
      }
    }
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al mes anterior:", currentDate)
        setCurrentDate(addMonths(currentDate, -1))
      } catch (error) {
        console.error("Error en handlePrevMonth:", error)
      }
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al mes siguiente:", currentDate)
        setCurrentDate(addMonths(currentDate, 1))
      } catch (error) {
        console.error("Error en handleNextMonth:", error)
      }
    }
  }

  const handleAppointmentClick = (appointment: AppointmentType, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log("Cita seleccionada:", appointment);
      setSelectedAppointment(appointment);
      
      // Usar setTimeout para evitar problemas de renderizado
      setTimeout(() => {
        setIsAppointmentDialogOpen(true);
      }, 10);
    } catch (error) {
      console.error("Error al hacer clic en cita:", error);
    }
  }

  const handleClientSelect = (client: Client) => {
    try {
      console.log("Cliente seleccionado:", client)
      // Almacenar el cliente seleccionado
      setSelectedClient(client)
      
      // Cerrar el diálogo de búsqueda primero
      setIsSearchDialogOpen(false)
      
      // Esperar un pequeño retraso antes de abrir el diálogo de cita
      // para asegurar que el primero se ha cerrado completamente
      console.log("Preparando para mostrar diálogo de cita")
      
      // Usar requestAnimationFrame en lugar de setTimeout para mejor rendimiento
      requestAnimationFrame(() => {
        console.log("Abriendo diálogo de cita después de seleccionar cliente")
        setIsAppointmentDialogOpen(true)
      })
    } catch (error) {
      console.error("Error al seleccionar cliente:", error)
      // En caso de error, mantener la interfaz en un estado consistente
      setIsSearchDialogOpen(false)
      setSelectedClient(null)
      // Informar al usuario
      alert("Ha ocurrido un error al seleccionar el cliente. Por favor, inténtalo de nuevo.")
    }
  }

  const handleCloseBottomSheet = () => {
    try {
      console.log("Cerrando bottom sheet de búsqueda");
      
      // Primero cerrar el diálogo
      setIsSearchDialogOpen(false);
      
      // Luego reiniciar el estado con un pequeño retraso
      requestAnimationFrame(() => {
        // Solo limpiar el cliente si no estamos en proceso de crear una cita
        if (!isAppointmentDialogOpen) {
          setSelectedClient(null);
        }
        setBottomSheetContent("search");
      });
    } catch (error) {
      console.error("Error al cerrar bottom sheet:", error);
      // Forzar un estado consistente
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      setShowClientDetails(false);
    }
  }

  const handleAppointmentSave = (appointmentData: any) => {
    console.log("Guardando cita:", appointmentData)
    // Aquí iría la lógica para guardar la cita
    
    // Cerrar el modal
    setIsAppointmentDialogOpen(false)
    
    // Opcional: Mostrar un toast o notificación
    alert("Cita guardada correctamente")
  }

  const handleCellClick = (date: Date, time: string) => {
    try {
      console.log("Celda seleccionada:", { date, time });
      
      // Almacenar los datos en estado de forma segura
      setSelectedDate(date);
      setSelectedSlot({ time });
      
      // Limpiar cliente seleccionado si hubiera uno anterior
      if (selectedClient) {
        setSelectedClient(null);
      }
      
      // Mostrar bottom sheet para búsqueda de cliente con un pequeño retraso
      // para asegurar que los estados se hayan actualizado
      console.log("Preparando para mostrar diálogo de búsqueda");
      requestAnimationFrame(() => {
        openSearchDialog();
      });
    } catch (error) {
      console.error("Error en handleCellClick:", error);
      alert("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    }
  }

  // Manejador mejorado para el botón de añadir cita
  const handleAddAppointment = () => {
    try {
      if (!currentDate) {
        console.error("No hay fecha seleccionada para añadir cita");
        alert("Por favor, selecciona una fecha primero.");
        return;
      }
      
      console.log("Añadiendo nueva cita en:", currentDate);
      
      // Usar hora actual formateada
      const currentTimeStr = format(new Date(), "HH:mm");
      
      // Almacenar datos en estado
      setSelectedDate(currentDate);
      setSelectedSlot({ time: currentTimeStr });
      
      // Limpiar cliente seleccionado si hubiera uno anterior
      if (selectedClient) {
        setSelectedClient(null);
      }
      
      // Abrir diálogo de búsqueda con pequeño retraso
      console.log("Preparando para mostrar diálogo de búsqueda desde botón");
      requestAnimationFrame(() => {
        openSearchDialog();
      });
    } catch (error) {
      console.error("Error en handleAddAppointment:", error);
      alert("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    }
  }

  // Actualizado para manejar mejor los clicks en celdas
  const handleCellClickEvent = (e: React.MouseEvent, date: Date | null, time: string, room: ServiceRoom) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!date) {
      console.error("Error: Se intentó hacer clic en una celda sin fecha válida");
      return;
    }
    
    try {
      console.log("Celda clickeada:", { date, time, room: room.name });
      
      // Almacenar los datos en estado de forma segura
      setSelectedDate(date);
      setSelectedSlot({ time });
      
      // Verificar si el cliente ya está seleccionado para evitar problemas
      if (!selectedClient) {
        // No usar setTimeout para evitar problemas de sincronización
        console.log("Abriendo diálogo de búsqueda de cliente");
        setIsSearchDialogOpen(true);
      } else {
        // Si ya hay un cliente seleccionado, abrir directamente el diálogo de cita
        console.log("Cliente ya seleccionado, abriendo diálogo de cita");
        setIsAppointmentDialogOpen(true);
      }
    } catch (error) {
      console.error("Error al hacer clic en celda:", error);
      // En caso de error, mostrar un mensaje al usuario
      alert("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    }
  }

  const setTimeSlotRef = useCallback((time: string, element: HTMLDivElement | null) => {
    timeSlotRefs.current[time] = element
  }, [])

  useEffect(() => {
    // Actualizar las posiciones de los time slots después del renderizado
    Object.entries(timeSlotRefs.current).forEach(([time, element]) => {
      if (element) {
        const topPosition = element.offsetTop
        element.setAttribute("data-position", topPosition.toString())
      }
    })
  }, [timeSlots]) // Dependencia de timeSlots para re-calcular si cambian los slots de tiempo

  // Modificar renderTableHeaders para agregar indicador de scroll horizontal
  const renderTableHeaders = () => (
    <div className="relative">
      {/* Indicadores de scroll horizontal */}
      <HorizontalScrollIndicator direction="left" />
      <HorizontalScrollIndicator direction="right" />
      
      <div
        ref={tableHeadersRef}
        className="grid border-b sticky top-[112px] bg-white z-30 overflow-x-auto"
        style={{
          gridTemplateColumns: `80px repeat(${serviceRooms.length}, 1fr)`,
          height: "40px",
          minWidth: "fit-content",
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
      >
        <div className="p-2 text-sm font-medium border-r" style={{ color: appColors.primary }}>Hora</div>
        {serviceRooms.map((room) => (
          <div
            key={room.id}
            className="p-2 text-xs font-medium text-center text-white border-r last:border-r-0"
            style={{ backgroundColor: room.color }}
          >
            {room.abbrev}
          </div>
        ))}
      </div>
    </div>
  )

  // Contenedor de la vista de calendario con mejor manejo de errores
  const renderCalendarView = () => {
      // <<< LOG PARA VER TIMESLOTS USADOS >>>
      console.log("[MobileAgendaView - renderCalendarView] Rendering with timeSlots:", timeSlots);
      return (
        <div className="relative flex-1 overflow-auto" style={{ paddingBottom: "60px" }}>
          <div className="min-w-fit">
            {/* Mantener el contenido de la cuadrícula */}
            <div className="relative">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="grid border-b"
                  style={{
                    gridTemplateColumns: `80px repeat(${serviceRooms.length}, 1fr)`,
                    minWidth: "fit-content",
                    height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                  }}
                >
                  <div
                    ref={(el) => setTimeSlotRef(time, el)}
                    className="flex items-center justify-between p-2 text-sm bg-white border-r"
                    style={{ position: "sticky", left: 0, color: appColors.primary }}
                    data-time={time}
                  >
                    {time}
                    <Flag className="w-4 h-4 text-red-500" />
                  </div>
                  {serviceRooms.map((room) => {
                      // Comprobar si la celda está bloqueada
                      const isBlocked = !!findOverrideForCell(
                        currentDate,
                        time,
                        room.id,
                        cabinOverrides,
                        activeClinic?.id ? String(activeClinic.id) : undefined
                      );

                      return (
                        <div
                          key={`${time}-${room.id}`}
                          className={cn(
                            "relative border-r last:border-r-0",
                            isBlocked ? "bg-gray-200 cursor-not-allowed" : "hover:bg-gray-50"
                          )}
                          onClick={(e) => {
                            if (isBlocked) {
                              const override = findOverrideForCell(currentDate, time, room.id, cabinOverrides, activeClinic?.id ? String(activeClinic.id) : undefined);
                              if (override) {
                                openOverrideModal(override);
                              }
                            } else {
                              handleCellClickEvent(e, currentDate, time, room)
                            }
                          }}
                        >
                          {!isBlocked && appointments
                            .filter((apt) => {
                              // Verificar si la cita corresponde a este slot de tiempo
                              const aptStartTime = typeof apt.startTime === 'string' ? apt.startTime : format(apt.startTime, 'HH:mm');
                              // Verificar si la cita está en esta cabina
                              const isInRoom = apt.roomId === room.id;
                              // La cita debe comenzar en este tiempo y estar en esta cabina
                              return aptStartTime === time && isInRoom;
                            })
                            .map((apt) => {
                              // Calcular la altura basada en la duración
                              const height = calculateAppointmentHeight(apt.duration, slotDuration);
                              
                              // Usar el color de la cita (que viene del servicio o cabina)
                              const bgColor = apt.color || '#6B7280'; // Color por defecto si no hay color
                              
                              return (
                                <div
                                  key={apt.id}
                                  className="absolute left-0 right-0 top-0 z-10 p-1 m-0.5 text-xs text-white rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                  style={{ 
                                    backgroundColor: bgColor,
                                    height: `${height - 4}px`, // -4px para el margen
                                    opacity: apt.completed ? 0.7 : 1
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAppointmentClick(apt);
                                  }}
                                >
                                  <div className="font-medium truncate">{apt.name}</div>
                                  <div className="text-[10px] truncate opacity-90">
                                    {apt.service}
                                  </div>
                                  {apt.completed && (
                                    <div className="text-[10px] font-semibold">✓</div>
                                  )}
                                </div>
                              );
                            })}
                          {(() => { // IIFE para lógica compleja
                            if (!isBlocked) return null; // Solo si está bloqueado

                            // Lógica copiada/adaptada de DayView
                            const override = findOverrideForCell(currentDate, time, room.id, cabinOverrides, activeClinic?.id ? String(activeClinic.id) : undefined);
                            if (!override) return null; // Seguridad

                            const prevTime = timeSlots[timeSlots.indexOf(time) - 1];
                            const overrideForPrevCell = prevTime ? findOverrideForCell(currentDate, prevTime, room.id, cabinOverrides, activeClinic?.id ? String(activeClinic.id) : undefined) : null;
                            const isStartOfBlock = !overrideForPrevCell || overrideForPrevCell.id !== override.id;

                            if (!isStartOfBlock) return null; // Solo renderizar en el inicio

                            let blockDurationSlots = 1;
                            for (let i = timeSlots.indexOf(time) + 1; i < timeSlots.length; i++) {
                              const nextTime = timeSlots[i];
                              const overrideForNextCell = findOverrideForCell(currentDate, nextTime, room.id, cabinOverrides, activeClinic?.id ? String(activeClinic.id) : undefined);
                              if (overrideForNextCell && overrideForNextCell.id === override.id) {
                                blockDurationSlots++;
                              } else {
                                break;
                              }
                            }

                            return (
                              <div
                                className="absolute inset-x-0 top-0 z-20 flex items-center justify-center p-1 m-px overflow-hidden border rounded-sm pointer-events-none bg-rose-200/80 border-rose-300"
                                style={{
                                  height: `calc(${blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT}px - 2px)`,
                                }}
                                title={override.description || "Bloqueado"}
                              >
                                <Lock className="flex-shrink-0 w-4 h-4 text-rose-600" />
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                </div>
              ))}

              {/* Indicador de hora actual */}
              {containerRef.current && (
                <CurrentTimeIndicator
                  config={{
                    slotDuration: slotDuration,
                  }}
                  key="mobile-indicator"
                  timeSlots={timeSlots}
                  rowHeight={AGENDA_CONFIG.ROW_HEIGHT}
                  isMobile={true}
                  className="z-50"
                  agendaRef={getCompatibleAgendaRef()}
                />
              )}
            </div>
          </div>
        </div>
      )
    }

  // Manejo de los bottom sheets de forma más segura
  const openSearchDialog = () => {
    try {
      console.log("Abriendo diálogo de búsqueda de cliente");
      
      // Cerrar otros diálogos primero para evitar conflictos
      setIsAppointmentDialogOpen(false);
      setShowClientDetails(false);
      
      // Esperar un frame para asegurar que los otros diálogos se han cerrado
      requestAnimationFrame(() => {
        // Abrir el bottom sheet de búsqueda
        setIsSearchDialogOpen(true);
      });
    } catch (error) {
      console.error("Error al abrir diálogo de búsqueda:", error);
    }
  }
  
  const openAppointmentDialog = () => {
    try {
      console.log("Abriendo diálogo de cita");
      
      // Cerrar otros diálogos primero para evitar conflictos
      setIsSearchDialogOpen(false);
      setShowClientDetails(false);
      
      // Esperar un frame para asegurar que los otros diálogos se han cerrado
      requestAnimationFrame(() => {
        // Abrir el bottom sheet de cita
        setIsAppointmentDialogOpen(true);
      });
    } catch (error) {
      console.error("Error al abrir diálogo de cita:", error);
    }
  }
  
  const openClientDetailsDialog = () => {
    try {
      console.log("Abriendo diálogo de detalles del cliente");
      
      // Cerrar otros diálogos primero para evitar conflictos
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      
      // Esperar un frame para asegurar que los otros diálogos se han cerrado
      requestAnimationFrame(() => {
        // Abrir el bottom sheet de detalles del cliente
        setShowClientDetails(true);
      });
    } catch (error) {
      console.error("Error al abrir diálogo de detalles del cliente:", error);
    }
  }

  // Añadir función findOverrideForCell (adaptada de DayView)
  const findOverrideForCell = (currentViewDate: Date, timeSlot: string, cabinId: string | number, overrides: CabinScheduleOverride[], clinicId?: string): CabinScheduleOverride | null => {
    // Convertir cabinId a string al inicio para asegurar tipo
    const targetCabinId = String(cabinId);

    if (!overrides || overrides.length === 0 || !clinicId || !currentViewDate) {
      return null;
    }

    const relevantOverrides = overrides.filter(ov =>
      ov.clinicId === clinicId &&
      ov.cabinIds.includes(targetCabinId) && // Usar el ID convertido a string
      isSameDay(ov.startDate, currentViewDate)
    );

    for (const override of relevantOverrides) {
        // Comparación de tiempo robusta
        if (timeSlot >= override.startTime && timeSlot < override.endTime) {
            return override;
        }
    }
    return null;
  }

  // Componente para indicadores de scroll horizontal
  const HorizontalScrollIndicator = ({ direction }: { direction: 'left' | 'right' }) => {
    return (
      <div 
        className={`absolute top-1/2 -translate-y-1/2 z-50 bg-purple-600 bg-opacity-70 rounded-full w-8 h-8 
                   flex items-center justify-center cursor-pointer shadow-md ${direction === 'left' ? 'left-0' : 'right-0'}`}
        style={{ opacity: 0.8 }}
        onClick={() => handleScrollCabins(direction)}
      >
        {direction === 'left' ? (
          <ChevronLeft className="w-5 h-5 text-white" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white" />
        )}
      </div>
    );
  };

  // Función para manejar scroll horizontal de las cabinas
  const handleScrollCabins = useCallback((direction: 'left' | 'right') => {
    if (!tableHeadersRef.current) return;
    
    const scrollAmount = direction === 'left' ? -100 : 100;
    tableHeadersRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // <<< Función para abrir modal de bloqueo >>>
  const openOverrideModal = (override: CabinScheduleOverride | null = null) => {
    console.log("Abriendo modal para override (móvil):", override)
    setBlockToEdit(override)
    setIsBlockModalOpen(true)
  }

  if (currentDate === null || isLoadingCabinsContext) {
    return <div>Cargando...</div> // O un skeleton más elaborado
  }

  // Modificar renderListView para que devuelva null y evitar errores de sintaxis
  const renderListView = () => null;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Eliminar el header hardcodeado que está causando problemas */}
      {/* <header className="flex items-center justify-between px-4 py-2 text-white bg-purple-600">
        <button 
          className="p-2 text-white" 
          onClick={toggleDrawer}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-2">
          // Botones de notificaciones, etc.
        </div>
      </header> */}
      
      {/* Contenido principal sin el header adicional */}
      <main className="flex-1 overflow-auto">
        {/* Contenido de la agenda móvil */}
        <div className="flex w-full h-screen overflow-hidden">
          {/* IMPORTANTE: Eliminar el margen izquierdo que estaba desplazando el contenido */}
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* Cabecera con fecha */}
            <div className="sticky top-0 z-40 bg-white border-b">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center flex-1 gap-1">
                  {/* Eliminar el botón de hamburguesa que está causando problemas */}
                  
                  <div className="flex items-center h-10 rounded-lg">
                    {/* Añadir botón para mes anterior */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handlePrevMonth}
                      style={{ color: appColors.primary }}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handlePrevDay}
                      style={{ color: appColors.primary }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span 
                      className="px-2 text-sm cursor-pointer" 
                      onClick={() => setIsDatePickerOpen(true)}
                      style={{ color: appColors.primary, fontWeight: 500 }}
                    >
                      {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handleNextDay}
                      style={{ color: appColors.primary }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    
                    {/* Añadir botón para mes siguiente */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handleNextMonth}
                      style={{ color: appColors.primary }}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 ml-1"
                  onClick={() => setIsDatePickerOpen(true)}
                  style={{ 
                    borderColor: appColors.primary,
                    color: appColors.primary
                  }}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Mantener las cabeceras de tabla (fijas) aquí */}
              {renderTableHeaders()}
            </div>

            {/* Contenido principal */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto ios-scroll-container"
              style={{
                height: "calc(100vh - 120px)", // Solo considerar altura del header
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                position: "relative",
                background: "white",
                paddingBottom: "0" // Eliminar padding inferior
              }}
            >
              {view === "list" ? renderListView() : renderCalendarView()}
              
              {/* Agregar indicador de scroll para el contenedor principal */}
              <ScrollIndicator 
                containerRef={containerRef} 
                position="right"
                offset={{ right: 15, bottom: 80, top: 15 }}
                scrollAmount={300}
              />
            </div>

            {/* Floating action button para añadir cita */}
            <div className="fixed z-50 right-4 bottom-4 md:hidden">
              <Button
                size="icon"
                className="rounded-full shadow-lg h-14 w-14"
                style={{ backgroundColor: appColors.primary }}
                onClick={handleAddAppointment}
              >
                <Plus className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>

          {/* Mantener modales necesarios */}
          <MobileDatePickerSheet
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            selectedDate={currentDate || new Date()}
            onDateSelect={(date) => {
              setCurrentDate(date)
              setIsDatePickerOpen(false)
            }}
          />

          {/* Añadir diálogos para búsqueda y detalles de cliente */}
          <MobileBottomSheet
            isOpen={isSearchDialogOpen}
            onClose={handleCloseBottomSheet}
            title="Buscar cliente"
          >
            <div className="py-2">
              <MobileClientSearchComponent 
                onClientSelect={handleClientSelect} 
                onClose={handleCloseBottomSheet}
              />
            </div>
          </MobileBottomSheet>

          {showClientDetails && selectedClient && (
            <MobileClientDetails
              client={{
                id: selectedClient.id,
                name: selectedClient.name,
                email: "",
                phone: selectedClient.phone,
                clientNumber: "",
                clinic: "",
                registrationDate: selectedClient.registrationDate || ""
              }}
            />
          )}

          {selectedClient && (
            <MobileAppointmentDialog
              client={selectedClient}
              selectedDate={selectedDate || new Date()}
              selectedTime={selectedSlot?.time || format(new Date(), 'HH:mm')}
              onClose={() => setIsAppointmentDialogOpen(false)}
              onSearchClick={() => {
                setIsAppointmentDialogOpen(false);
                setTimeout(() => setIsSearchDialogOpen(true), 100);
              }}
              onNewClientClick={() => {
                // Implementación de creación de nuevo cliente
                console.log("Crear nuevo cliente");
              }}
              onSave={handleAppointmentSave}
            />
          )}

          {/* <<< Modal directo para editar bloqueos >>> */}
          {activeClinic && (
            <BlockScheduleModal
              open={isBlockModalOpen} // Control directo del modal
              onOpenChange={setIsBlockModalOpen} // Sincronizar cierre
              clinicRooms={serviceRooms} // Usar las cabinas procesadas
              blockToEdit={blockToEdit} 
              clinicId={String(activeClinic.id)}
              onBlockSaved={() => { // Acción al guardar/eliminar
                setIsBlockModalOpen(false); // Cerrar modal
                // Refrescar overrides si es necesario
              }}
              // Pasar configuración de horarios
              clinicConfig={{
                  openTime: effectiveOpenTime, 
                  closeTime: effectiveCloseTime,
              }}
            />
          )}
        </div>
      </main>
      
      {/* Drawer menu que se abre desde el lateral */}
      <MobileDrawerMenu isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  )
}
