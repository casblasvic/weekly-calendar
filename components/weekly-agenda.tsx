"use client"

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react"

import { format, parse, addDays, startOfWeek, isSameDay, differenceInDays, isToday, addWeeks, subWeeks, isSameMonth, parseISO, isBefore, isAfter, startOfDay, endOfDay, getDay, isWithinInterval } from "date-fns"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { AgendaNavBar } from "./agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { ClientSearchDialog } from "@/components/client-search-dialog"
import { AppointmentDialog } from "@/components/appointment-dialog"
import { NewClientDialog } from "@/components/new-client-dialog"
import { AppointmentItem } from "./appointment-item"
import { DragDropContext, Droppable } from "react-beautiful-dnd"
import { useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock, AlertTriangle, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { getDate } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule"
import { Calendar } from "lucide-react"
import { Appointment } from "@/types/appointments"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ClinicConfigAlert } from "@/components/clinic-config-alert"
import { 
  isBusinessDay as isBusinessDayBase, 
  getBusinessHours as getBusinessHoursBase,
} from "@/services/clinic-schedule-service"
import { Clinic, Cabin, ScheduleTemplateBlock, ClinicScheduleBlock } from '@prisma/client'
import type { CabinScheduleOverride } from '@prisma/client'

// Función para generar slots de tiempo
function getTimeSlots(startTime: string, endTime: string, interval = 15): string[] {
  const slots: string[] = []

  // Convertir startTime y endTime a minutos desde medianoche
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)

  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  // Generar slots de tiempo INCLUYENDO la hora de cierre
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += interval) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    slots.push(timeSlot)
  }

  return slots
}

// Constantes para el estilo cebrado profesional por COLUMNAS
const ZEBRA_LIGHT = "bg-purple-50/20"
const ZEBRA_DARK = "bg-white"

interface WeeklyAgendaProps {
  initialDate?: string
  containerMode?: boolean
  onAppointmentsChange?: (appointments: Appointment[]) => void
  appointments?: Appointment[]
  onAppointmentClick?: (appointmentId: string) => void
}

// Asegurar que el tipo Client incluye id
interface Client { 
  id: string; 
  name: string; 
  phone: string; 
}

export default function WeeklyAgenda({
  initialDate = format(new Date(), "yyyy-MM-dd"),
  containerMode = false,
  onAppointmentsChange,
  appointments: initialAppointments = [],
  onAppointmentClick,
}: WeeklyAgendaProps) {
  console.log(`[WeeklyAgenda] Component Mounted/Rendered. Initial Date: ${initialDate}`);
  const router = useRouter()
  const { activeClinic, activeClinicCabins, isLoading: isLoadingClinic, isLoadingCabinsContext } = useClinic()
  const { cabinOverrides, loadingOverrides, fetchOverridesByDateRange } = useScheduleBlocks()
  
  // --- LOG: Clínica activa recibida del contexto ---
  console.log("[WeeklyAgenda] activeClinic from context:", activeClinic);
  // ---------------------------------------------
  
  // Añadir state para controlar transiciones
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  
  // Resto de estados existentes
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parse(initialDate, "yyyy-MM-dd", new Date())
    } catch (error) {
      return new Date()
    }
  })

  // Usar initialClinic si se proporciona, de lo contrario usar activeClinic del contexto
  // Esto es crucial para evitar ciclos de renderizado cuando cambia activeClinic,
  // ya que podemos recibir una versión estable a través de props
  const effectiveClinic = activeClinic;

  // Añadir una nueva optimización para reducir renderizados innecesarios
  // Cerca del inicio del componente, justo después de las referencias al useClinic
  const prevDateRef = useRef<string | null>(null);
  const needsFullRerenderRef = useRef(false);

  // Optimizar el efecto para actualizar la fecha cuando cambia initialDate
  useEffect(() => {
    try {
      // Si ya estamos en transición, no iniciar otra para evitar parpadeos
      if (isTransitioning) return;

      const parsedDate = parse(initialDate, "yyyy-MM-dd", new Date());
      const initialDateStr = format(parsedDate, "yyyy-MM-dd");
      
      // Solo actualizar si la fecha realmente cambió para evitar re-renderizados innecesarios
      if (!isSameDay(parsedDate, currentDate)) {
        // Actualizar referencia sin transición visual
        prevDateRef.current = initialDateStr;
        
        // Actualizar fecha directamente, sin animaciones ni efectos visuales
        // Esto es más rápido y evita parpadeos al navegar entre semanas
        setCurrentDate(parsedDate);
      }
    } catch (error) {
      // Error silencioso
    }
  }, [initialDate, currentDate, isTransitioning]);

  // Estados para diálogos y selección
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date
    time: string
    roomId: string
  } | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)

  // Nueva función para manejar el click de nuevo cliente
  const handleNewClientClick = useCallback(() => {
    setIsNewClientDialogOpen(true);
  }, []);

  // Estado para almacenar las citas
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (initialAppointments && initialAppointments.length > 0) {
      // Convertir fechas si es necesario (si initialAppointments viene de API)
       return initialAppointments.map((apt: any) => ({
         ...apt,
         date: typeof apt.date === 'string' ? parseISO(apt.date) : apt.date, 
         startTime: typeof apt.startTime === 'string' ? parseISO(apt.startTime) : apt.startTime,
         endTime: typeof apt.endTime === 'string' ? parseISO(apt.endTime) : apt.endTime,
       }));
    }
    if (typeof window !== "undefined") {
      const storedAppointments = sessionStorage.getItem("weeklyAppointments")
      if (storedAppointments) {
        try {
          const parsedAppointments = JSON.parse(storedAppointments)

          // Convertir las fechas de string a objetos Date
          return parsedAppointments.map((apt: any) => ({
            ...apt,
            date: new Date(apt.date),
          }))
        } catch (error) {
          // Error silencioso
        }
      }
    }
    return []
  })

  // NUEVO: Estado para CabinScheduleOverride seleccionado
  const [selectedOverride, setSelectedOverride] = useState<CabinScheduleOverride | null>(null);
  // NUEVO: Estado para controlar la visibilidad del modal de bloqueo/override
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Efecto para guardar las citas en sessionStorage cuando cambian
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("weeklyAppointments", JSON.stringify(appointments))
    }

    // Notificar al componente padre sobre el cambio en las citas
    if (onAppointmentsChange) {
      onAppointmentsChange(appointments)
    }
  }, [appointments, onAppointmentsChange])

  // --- Derive CORRECT schedule and related config --- 
  const correctSchedule = useMemo(() => {
      if (!activeClinic) return null;
      
      console.log("[WeeklyAgenda useMemo] Deriving correct schedule from activeClinic:", activeClinic);
      
      const templateBlocks = activeClinic.linkedScheduleTemplate?.blocks;
      const independentBlocks = activeClinic.independentScheduleBlocks;
      
      let blocksToUse: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null = null;
      
      if (templateBlocks && templateBlocks.length > 0) {
          console.log("[WeeklyAgenda useMemo] Using template blocks.");
          blocksToUse = templateBlocks;
      } else if (independentBlocks && independentBlocks.length > 0) {
          console.log("[WeeklyAgenda useMemo] Using independent blocks.");
          blocksToUse = independentBlocks;
      } else {
          console.log("[WeeklyAgenda useMemo] No blocks found, returning empty schedule.");
          // No need for defaultOpen/Close here, converter handles null blocks
          return convertBlocksToWeekSchedule(null); // Pass only blocks
      }
      
      return convertBlocksToWeekSchedule(blocksToUse); // Pass only blocks
      
  }, [activeClinic]); // Depend on the whole activeClinic object

  // REMOVE const schedule = useMemo(() => activeClinic?.scheduleJson as unknown as WeekSchedule | null, [activeClinic?.scheduleJson]);
  
  // Obtener slotDuration de la plantilla o horario independiente, con fallback
  const slotDuration = useMemo(() => {
    if (!activeClinic) return 15; // Default si no hay clínica
    // Intentar obtener de la plantilla vinculada
    const templateDuration = (activeClinic as any).linkedScheduleTemplate?.slotDuration;
    if (templateDuration !== undefined && templateDuration !== null) {
      return Number(templateDuration);
    }
    // Intentar obtener del horario independiente
    const independentDuration = (activeClinic as any).independentSchedule?.slotDuration;
    if (independentDuration !== undefined && independentDuration !== null) {
      return Number(independentDuration);
    }
    // Fallback
    return 15;
  }, [activeClinic]); // Depender de activeClinic completo
  
  // REMOVED useMemo for openTime and closeTime as they are derived dynamically for timeSlots
  
  // Adjust console log
  console.log("[WeeklyAgenda] Correct derived schedule:", correctSchedule);
  console.log("[WeeklyAgenda] Using slot duration:", slotDuration);

  // --- Time Slot Generation using useMemo (adjust loop) --- 
  const timeSlots = useMemo(() => {
      if (!activeClinic || !correctSchedule) {
          console.log("[WeeklyAgenda timeSlots] No active clinic or no derived schedule, returning empty slots.");
          return []; 
      }

      // Inicializar con valores extremos para asegurar que el primer rango válido los reemplace
      let overallEarliestStart = "23:59"; 
      let overallLatestEnd = "00:00";
      let hasAnyRange = false;
      console.log(`[WeeklyAgenda timeSlots] Initial extreme times: ${overallEarliestStart} - ${overallLatestEnd}`);

      // Usar el horario derivado (puede ser de plantilla o independiente)
      const scheduleToUse = correctSchedule; // Ya calculado en useMemo anterior
      
      console.log("[WeeklyAgenda timeSlots] Checking ranges in schedule:", JSON.stringify(scheduleToUse, null, 2));
      Object.values(scheduleToUse).forEach(day => {
          const daySchedule = day as DaySchedule; 
          if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
              daySchedule.ranges.forEach(range => {
                  // Solo procesar rangos válidos
                  if (range.start && range.end && range.start < range.end) {
                      hasAnyRange = true; // Marcar que encontramos al menos un rango válido
                      // Comparar con los encontrados hasta ahora
                      if (range.start < overallEarliestStart) {
                          console.log(`[WeeklyAgenda timeSlots] Found earlier start range: ${range.start} < ${overallEarliestStart}`);
                          overallEarliestStart = range.start;
                      }
                      if (range.end > overallLatestEnd) {
                          console.log(`[WeeklyAgenda timeSlots] Found later end range: ${range.end} > ${overallLatestEnd}`);
                          overallLatestEnd = range.end;
                      }
                  }
              });
          }
      });
      
      // Si NO se encontraron rangos VÁLIDOS después de revisar el schedule, retornar vacío
      if (!hasAnyRange) {
           console.warn("[WeeklyAgenda timeSlots] No valid time ranges found in the schedule. Returning empty slots.");
           return [];
      }

      console.log(`[WeeklyAgenda timeSlots] Final calculated range for slots: ${overallEarliestStart} to ${overallLatestEnd}`);
      
      // Asegurar que latestEnd es realmente más tarde que earliestStart (esto debería ser cierto si hasAnyRange es true)
      if (overallLatestEnd <= overallEarliestStart) {
          console.error(`[WeeklyAgenda timeSlots] Inconsistent range: latestEnd (${overallLatestEnd}) <= earliestStart (${overallEarliestStart}). Returning empty slots.`);
          // Esto indica un problema lógico o datos inconsistentes en el schedule
           return [];
      }

      // Obtener slotDuration del activeClinic si existe, o usar el default
      const currentSlotDuration = slotDuration;

      // Generar slots con el rango calculado final y la duración correcta
      return getTimeSlots(overallEarliestStart, overallLatestEnd, currentSlotDuration);

  }, [correctSchedule, slotDuration]); // Depender solo de correctSchedule y slotDuration
  // --- End Time Slot Generation Adjustment ---

  // Obtener cabinas activas directamente de activeClinicCabins del contexto useClinic
  const activeCabins = useMemo(() => {
    // Asegurar que activeClinicCabins no sea null/undefined
    console.log("[WeeklyAgenda] useMemo - Recalculando activeCabins. Valor de activeClinicCabins:", JSON.stringify(activeClinicCabins));
    return activeClinicCabins?.filter(cabin => cabin.isActive).sort((a, b) => a.order - b.order) ?? []; 
  }, [activeClinicCabins]);

  // Considerar el estado de carga de la clínica Y de las cabinas del contexto
  if (isLoadingClinic || isLoadingCabinsContext) { 
      console.log(`[WeeklyAgenda] Mostrando carga: isLoadingClinic=${isLoadingClinic}, isLoadingCabinsContext=${isLoadingCabinsContext}`);
      return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /> Cargando datos de clínica/cabinas...</div>;
  }
  
  // Añadir una comprobación explícita por si activeClinicCabins es null/undefined después de la carga (error inesperado)
  if (!activeClinicCabins) {
      console.error("[WeeklyAgenda] Error: activeClinicCabins es null/undefined después de la carga.");
      return <div className="flex items-center justify-center h-full text-red-600">Error al cargar la configuración de cabinas.</div>;
  }

  // Función para verificar si un día está activo en la configuración
  const getDayKey = useCallback((date: Date) => {
    const day = format(date, "EEEE", { locale: es }).toLowerCase();
    const dayMap = {
      lunes: "monday",
      martes: "tuesday",
      miércoles: "wednesday",
      jueves: "thursday",
      viernes: "friday",
      sábado: "saturday",
      domingo: "sunday",
    } as const;
    return dayMap[day as keyof typeof dayMap] || day;
  }, []);

  const isDayActive = useCallback((date: Date) => {
    const dayKey = getDayKey(date);
    let isActive = false;
    try {
      const daySchedule = correctSchedule?.[dayKey as keyof WeekSchedule];
      
      // Si no hay configuración para ese día, no está activo
      if (!daySchedule) return false;
      
      // Si está explícitamente marcado como isOpen: true, está activo
      if (daySchedule.isOpen === true) return true;
      
      // Si tiene rangos configurados y al menos uno válido, está activo
      if (daySchedule.ranges && daySchedule.ranges.length > 0) {
        // Comprobar que al menos un rango tenga horas válidas
        return daySchedule.ranges.some(range => range.start && range.end);
      }
      
      // En cualquier otro caso, no está activo
      return false;
    } catch (error) {
      console.error("[WeeklyAgenda] Error in isDayActive:", error);
      return false;
    }
  }, [correctSchedule, getDayKey]);

  // Función para verificar si un horario está disponible
  const isTimeSlotAvailable = useCallback((date: Date, time: string) => {
    const dayKey = getDayKey(date);
    let isAvailable = false;
    try {
      const daySchedule = correctSchedule?.[dayKey as keyof WeekSchedule];
      if (!daySchedule || !daySchedule.isOpen || !daySchedule.ranges) {
        isAvailable = false;
      } else {
        isAvailable = daySchedule.ranges.some((range) => time >= range.start && time < range.end);
      }
      // console.log(`[WeeklyAgenda] isTimeSlotAvailable check for ${format(date, 'yyyy-MM-dd')} ${time} (key: ${dayKey}): ${isAvailable}`);
    } catch (error) {
      console.error("[WeeklyAgenda] Error in isTimeSlotAvailable:", error);
    }
    return isAvailable;
  }, [correctSchedule, getDayKey]);

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)

  // Calcular los días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const monday = startOfWeek(currentDate, { weekStartsOn: 1 })
    return addDays(monday, i)
  })

  const { toast } = useToast()

  // Añadir este estado cerca de los otros estados al inicio del componente
  const [updateKey, setUpdateKey] = useState(0)

  // Efecto para realizar limpieza cuando el componente se desmonta o cambia de clínica
  useEffect(() => {
    console.log("[WeeklyAgenda] Inicializado con clínica:", effectiveClinic?.id);
    
    // Esta función se ejecutará al desmontar el componente o cuando cambie effectiveClinic
    return () => {
      console.log("[WeeklyAgenda] Limpiando recursos para clínica:", effectiveClinic?.id);
      
      // Limpiar todos los estados con datos específicos de la clínica
      setSelectedOverride(null);
      setIsOverrideModalOpen(false);
      setSelectedSlot(null);
      setSelectedClient(null);
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      setIsNewClientDialogOpen(false);
      
      // Reiniciar otros estados sensibles a la clínica
      
      // Forzar limpieza de memory heap
      if (typeof window !== 'undefined') {
        try {
          // Sugerir al garbage collector que se ejecute (solo es una sugerencia)
          if (window.gc) {
            window.gc();
          }
        } catch (e) {
          // Ignorar errores - gc() no está disponible en todos los navegadores
        }
      }
    };
  }, [effectiveClinic?.id]);

  // --- NUEVO useEffect para cargar overrides --- 
  useEffect(() => {
    if (effectiveClinic?.id) {
      console.log("[WeeklyAgenda] useEffect - Fetching overrides for week starting:", format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);
      const startDate = format(monday, "yyyy-MM-dd");
      const endDate = format(sunday, "yyyy-MM-dd");
      fetchOverridesByDateRange(String(effectiveClinic.id), startDate, endDate);
    } else {
      console.log("[WeeklyAgenda] useEffect - Cannot fetch overrides, no effectiveClinic.id");
    }
    // Depender de currentDate y effectiveClinic.id para recargar al cambiar semana o clínica
  }, [currentDate, effectiveClinic?.id, fetchOverridesByDateRange]);
  // --- FIN NUEVO useEffect ---

  // Funciones para manejar citas
  const handleCellClick = (day: Date, time: string, roomId: string) => {
    // Verificar si la celda está bloqueada por un override
    const dayString = format(day, "yyyy-MM-dd")
    const overrideForCell = findOverrideForCell(day, time, roomId); // Usar la nueva función

    if (overrideForCell) { // Check if the clicked cell itself is blocked
      // Si está bloqueada, abrimos el modal de bloqueo con los datos
      setSelectedOverride(overrideForCell); // Pass the actual override data
      setIsOverrideModalOpen(true); // Open the correct modal for overrides
      return // No continuar con la lógica de creación de cita
    }

    // Código original para abrir el modal de cita (solo si no está bloqueada y es disponible)
    if (!isTimeSlotAvailable(day, time)) return

    const cabin = activeCabins.find((c) => {
      const cabinId = String(c.id)
      const targetId = String(roomId)
      return cabinId === targetId
    })

    if (cabin && cabin.isActive) {
      setSelectedSlot({ date: day, time, roomId })
      setIsSearchDialogOpen(true)
    }
  }

  // --- Modificar handleClientSelect para aceptar tipo Client --- 
  const handleClientSelect = (client: Client) => { 
    console.log("[WeeklyAgenda] Client selected:", client);
    setSelectedClient(client);
    setIsSearchDialogOpen(false);
    setIsAppointmentDialogOpen(true); 
  };

  const handleDeleteAppointment = useCallback(() => {
    if (selectedSlot) {
      setAppointments((prev) =>
        prev.filter(
          (apt) =>
            !(
              apt.date.toDateString() === selectedSlot.date.toDateString() &&
              apt.startTime === selectedSlot.time &&
              apt.roomId === selectedSlot.roomId
            ),
        ),
      )
    }
  }, [selectedSlot])

  const handleSaveAppointment = useCallback(
     (appointmentData: { // Definir tipo esperado para appointmentData si es necesario
       client: { name: string; phone: string };
       services: any[]; // Ajustar tipo según sea necesario
       time: string;
       comment?: string;
     }) => {
      if (selectedSlot) {
        const cabin = activeCabins.find((c) => String(c.id) === selectedSlot.roomId) || activeCabins[0];
        if (cabin) {
          const newAppointment: Appointment = {
            id: Math.random().toString(36).substr(2, 9), // ID temporal
            name: appointmentData.client.name,
            service: appointmentData.services.map((s) => s.name).join(", "),
            date: selectedSlot.date,
            roomId: selectedSlot.roomId,
            startTime: format(selectedSlot.date, 'yyyy-MM-dd') + 'T' + appointmentData.time + ':00Z', // Añadir segundos y Z para formato ISO
            duration: 2,
            color: cabin.color ?? '#d1d5db',
            phone: appointmentData.client.phone,
          };
          setAppointments((prev) => [...prev, newAppointment]);
        }
      }
       setIsAppointmentDialogOpen(false); // Cerrar diálogo después de guardar
    },
    [selectedSlot, activeCabins, setAppointments] // Añadir setAppointments a dependencias
  );

  const handleAppointmentResize = (id: string, newDuration: number) => {
    // Esta función ya no es necesaria con el nuevo componente sin redimensionamiento
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return
    }

    const { source, destination } = result
    const updatedAppointments = Array.from(appointments)
    const [movedAppointment] = updatedAppointments.splice(source.index, 1)

    const [dayIndex, roomId, time] = destination.droppableId.split("-")

    const updatedAppointment = {
      ...movedAppointment,
      date: weekDays[Number.parseInt(dayIndex)],
      roomId,
      startTime: time,
    }

    updatedAppointments.push(updatedAppointment)
    setAppointments(updatedAppointments)
    setIsAppointmentDialogOpen(false)
  }

  const handleDayClick = (date: Date) => {
    // Solo permitir clic en días activos
    if (isDayActive(date)) {
      router.push(`/agenda/dia/${format(date, "yyyy-MM-dd")}`)
    }
  }

  // Estructura corregida para el renderWeeklyGrid
  const renderWeeklyGrid = () => {
    // --- DEBUG LOG --- 
    // Verificar el valor justo antes de usarlo en el JSX
    console.log("[WeeklyAgenda] renderWeeklyGrid - valor de activeCabins:", JSON.stringify(activeCabins));
    // --- FIN DEBUG LOG ---

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div ref={agendaRef} className="relative z-0" style={{ scrollBehavior: "smooth" }}>
          <div className="min-w-[1200px] relative">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `auto repeat(7, 1fr)`,
                width: "100%",
              }}
            >
              {/* Columna de tiempo - Fija - z-30 */}
              <div className="sticky top-0 left-0 w-20 p-4 bg-white border-b border-r border-gray-300 hour-header" style={{ zIndex: 999 }}>
                <div className="text-sm text-gray-500">Hora</div>
              </div>

              {/* Cabeceras de días - Fijas - z-30 */}
              {weekDays.map((day, index) => {
                const today = isToday(day);
                const active = isDayActive(day);
                return (
                  <div key={index} className={cn(
                    "sticky top-0 bg-white border-b border-gray-300 day-header",
                    today ? "border-l-2 border-r-2 border-purple-300" : "border-l border-r border-gray-300",
                    !active && "bg-gray-100"
                  )} style={{ zIndex: 20 }}>
                    <div
                      className={cn(
                        "p-4 border-b border-gray-300",
                        active ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-70",
                        today && "bg-purple-50/10",
                      )}
                      onClick={() => active && handleDayClick(day)}
                      title={active ? "Ir a vista diaria" : "Día no activo"}
                    >
                      <div className="flex items-center justify-start gap-2">
                        <div>
                          <div className="text-base font-medium capitalize">{format(day, "EEEE", { locale: es })}</div>
                          <div className={cn("text-sm", today ? "text-purple-600 font-bold" : "text-gray-500")}>
                            {format(day, "d/M/yyyy")}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: `repeat(${activeCabins.length || 1}, 1fr)` }}
                    >
                      {activeCabins.map((cabin) => (
                        <div
                          key={cabin.id}
                          className={cn(
                            "text-white text-xs py-1 px-1 text-center font-medium border-r border-gray-300 last:border-r-0",
                            !active && "opacity-70"
                          )}
                          style={{ backgroundColor: cabin.color }}
                          title={cabin.name}
                        >
                          {cabin.code || cabin.name}
                        </div>
                      ))}
                      {activeCabins.length === 0 && (
                        <div className="px-1 py-1 text-xs italic text-center text-gray-400">
                          Sin cabinas
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Filas de Slots de Tiempo */}
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  {/* Celda de Hora - CORREGIDO: Añadido z-index */}
                  <div
                    className="sticky left-0 z-10 w-20 p-2 text-sm font-medium text-purple-600 bg-white border-b border-r border-gray-300 hour-column"
                    data-time={time}
                  >
                    {time}
                  </div>
                  {/* Celdas de Día/Cabina */}
                  {weekDays.map((day, dayIndex) => {
                    const today = isToday(day);
                    const active = isDayActive(day);
                    return (
                      <div
                        key={`${dayIndex}-${time}`}
                        className={cn(
                          "border-b border-gray-200 relative",
                          today ? "border-l-2 border-r-2 border-purple-300" : "border-l border-r border-gray-300",
                          today && "bg-purple-50/10",
                          !active && !today && "bg-gray-100"
                        )}
                        data-time={time}
                        style={{ minWidth: `${activeCabins.length * 80}px` }}
                      >
                        <div
                          className="grid h-full"
                          style={{ gridTemplateColumns: `repeat(${activeCabins.length || 1}, 1fr)` }}
                        >
                          {activeCabins.length > 0 ? activeCabins.map((cabin, cabinIndex) => {
                            // ***** INTEGRACIÓN EN REND *****
                            const isAvailable = isTimeSlotAvailable(day, time);
                            const dayString = format(day, "yyyy-MM-dd");
                            // Usar la nueva función para encontrar override
                            const overrideForCell = findOverrideForCell(day, time, cabin.id.toString());
                            // blockForCell ya no es necesario, usamos overrideForCell

                            // La celda es interactiva si está activa, disponible Y *NO* está bloqueada
                            const isCellInteractive = active && isAvailable && !overrideForCell;
                            // La celda es clickeable si es interactiva O si está bloqueada (para abrir modal de bloqueo)
                            const isCellClickable = isCellInteractive || (overrideForCell && active);

                            const timeIndex = timeSlots.indexOf(time);
                            const prevTime = timeIndex > 0 ? timeSlots[timeIndex - 1] : null;
                            // Encontrar override para la celda anterior
                            const overrideForPrevCell = prevTime ? findOverrideForCell(day, prevTime, cabin.id.toString()) : null;
                            // blockForPrevCell ya no es necesario

                            // Determinar si esta celda es el inicio de un bloque visual
                            const isStartOfBlock = overrideForCell && (!overrideForPrevCell || overrideForPrevCell.id !== overrideForCell.id);

                            // Calcular cuántos slots ocupa el bloque visualmente
                            let blockDurationSlots = 0;
                            if (isStartOfBlock && overrideForCell) {
                              blockDurationSlots = 1; // Empieza con 1 (la celda actual)
                              // Buscar hacia adelante en los timeSlots del mismo día/cabina
                              for (let i = timeIndex + 1; i < timeSlots.length; i++) {
                                const nextTime = timeSlots[i];
                                const overrideForNextCell = findOverrideForCell(day, nextTime, cabin.id.toString());
                                // Si la siguiente celda pertenece al *mismo* override, incrementar duración
                                if (overrideForNextCell && overrideForNextCell.id === overrideForCell.id) {
                                  blockDurationSlots++;
                                } else {
                                  break; // Termina el bloque (o no hay más slots)
                                }
                              }
                            }
                            // ***** FIN CÁLCULO DURACIÓN BLOQUE *****

                            return (
                              <Droppable
                                droppableId={`${dayIndex}-${cabin.id}-${time}`}
                                key={`${cabin.id}-${time}`}
                                type="appointment"
                                // Deshabilitar drop si la celda no es interactiva O si está bloqueada
                                isDropDisabled={!isCellInteractive || !!overrideForCell}
                                isCombineEnabled={false}
                                ignoreContainerClipping={false}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    // ***** AJUSTE DE CLASES CSS *****
                                    className={cn(
                                      "relative h-full", // Base

                                      // --- Prioridad 1: Día Inactivo ---
                                      !active && "opacity-70 bg-gray-100 cursor-not-allowed border border-gray-200",

                                      // --- Prioridad 2: Slot Inactivo (dentro de día activo, SIN override) ---
                                      active && !isAvailable && !overrideForCell && [
                                        "bg-gray-300 dark:bg-gray-700 cursor-not-allowed",
                                        "border border-white/50 dark:border-white/30",
                                      ],
                                      
                                      // --- Prioridad 3: Slot Bloqueado/Override (dentro de día activo) ---
                                      active && overrideForCell && [
                                         "bg-rose-100 dark:bg-rose-900/30", // Fondo distintivo
                                         "cursor-pointer", // Clickeable para ver/editar
                                         // Bordes condicionales para visualización del bloque
                                         "border-r border-gray-200 dark:border-gray-700 last:border-r-0", // Borde derecho siempre (excepto último)
                                         !isStartOfBlock && "border-t-0", // Sin borde superior si es continuación
                                         isStartOfBlock && "border-t border-gray-200 dark:border-gray-700", // Borde superior si es inicio
                                      ],

                                      // --- Prioridad 4: Celda Activa y Disponible (SIN override) ---
                                      active && isAvailable && !overrideForCell && [
                                        "border-r border-gray-200 dark:border-gray-700 last:border-r-0",
                                        "border-t border-gray-200 dark:border-gray-700", // Bordes estándar
                                        // Estilos Hover y Zebra
                                        "hover:bg-purple-100/50 dark:hover:bg-purple-900/30 cursor-pointer",
                                        !today && (cabinIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK), // Zebra (ajustar colores dark si es necesario)
                                      ]
                                    )}
                                    // ***** FIN AJUSTE CLASES CSS *****
                                    style={{
                                      height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                                      // Estilo visual para drop (si es posible)
                                      backgroundColor: snapshot.isDraggingOver && isCellInteractive && !overrideForCell
                                        ? "rgba(167, 139, 250, 0.2)" // Color Púrpura semi-transparente
                                        : undefined, // Usa el fondo definido en className
                                    }}
                                    // ***** AJUSTE onClick *****
                                    onClick={(e) => {
                                      // Si está bloqueada (y día activo), abrir modal de bloqueo
                                      if (overrideForCell && active) {
                                        e.stopPropagation();
                                        setSelectedOverride(overrideForCell); // Guardar el override seleccionado
                                        setIsOverrideModalOpen(true); // Abrir el modal
                                      } 
                                      // Si es interactiva (activa, disponible, no bloqueada), iniciar flujo de cita
                                      else if (isCellInteractive) { 
                                        e.stopPropagation();
                                        handleCellClick(day, time, cabin.id.toString());
                                      }
                                      // No hacer nada si el día está inactivo o el slot no está disponible (y no es un override)
                                    }}
                                    // ***** FIN AJUSTE onClick *****
                                  >
                                    {/* ***** VISUALIZACIÓN DEL BLOQUE ***** */}
                                    {isStartOfBlock && active && overrideForCell && (
                                      <div
                                        className="absolute inset-x-0 top-0 z-10 flex items-center justify-center p-1 m-px overflow-hidden text-xs rounded-sm pointer-events-none bg-rose-200/80 border-rose-300 text-rose-700 dark:bg-rose-800/50 dark:border-rose-600 dark:text-rose-200"
                                        style={{
                                          height: `calc(${blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT}px - 2px)`, // Ocupa altura calculada
                                        }}
                                        title={overrideForCell.description || "Bloqueado"} // Tooltip con el motivo (CORREGIDO: usar description)
                                      >
                                         {/* Contenido del bloque: Icono y motivo si cabe */}
                                         <div className="flex flex-col items-center justify-center w-full h-full text-center">
                                           <Lock className="flex-shrink-0 w-3 h-3 mb-1 text-rose-600 dark:text-rose-300" />
                                           {/* Mostrar motivo solo si el bloque es suficientemente alto */}
                                           {blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT > 30 && ( 
                                             <span className="leading-tight break-words line-clamp-2">
                                               {overrideForCell.description || "Bloqueado"} {/* (CORREGIDO: usar description) */}
                                             </span>
                                           )}
                                         </div>
                                      </div>
                                    )}
                                    {/* Placeholder para react-beautiful-dnd, solo si no es continuación de bloque */}
                                    {!(overrideForCell && !isStartOfBlock) && provided.placeholder}
                                    {/* ***** FIN VISUALIZACIÓN DEL BLOQUE ***** */}
                                  </div>
                                )}
                              </Droppable>
                            );
                            // ***** FIN INTEGRACIÓN EN REND *****
                          }) : (
                            <div className="flex items-center justify-center h-full p-1 text-xs italic text-gray-400 border-t border-r border-gray-200 last:border-r-0" style={{ height: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}>
                              Sin cabinas activas
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Renderizar citas */}
            {appointments.map((appointment, index) => (
              <AppointmentItem
                key={appointment.id}
                appointment={appointment}
                index={index}
                onClick={undefined}
              />
            ))}

            {/* Indicador de tiempo actual RENDERIZADO AQUÍ */}
            <CurrentTimeIndicator
              key="desktop-week-indicator"
              timeSlots={timeSlots}
              rowHeight={AGENDA_CONFIG.ROW_HEIGHT}
              isMobile={false}
              className="current-time-indicator"
              agendaRef={agendaRef}
              // Pass calculated earliest/latest times if available, otherwise defaults
              clinicOpenTime={timeSlots.length > 0 ? timeSlots[0] : "09:00"} 
              clinicCloseTime={timeSlots.length > 0 ? timeSlots[timeSlots.length - 1] : "20:00"}
              config={{ slotDuration: slotDuration }}
            />
          </div>
        </div>
      </DragDropContext>
    )
  }

  // Modificar la función handleAppointmentAdd para ser más eficiente
  const handleAppointmentAdd = useCallback((appointment: Appointment) => {
    // Usar un callback para evitar que React tenga que recrear todo el array
    setAppointments(prevAppointments => {
      // Si la cita ya existe, reemplazarla
      const exists = prevAppointments.some(apt => apt.id === appointment.id);
      if (exists) {
        return prevAppointments.map(apt => 
          apt.id === appointment.id ? appointment : apt
        );
      }
      // Si no existe, añadirla
      return [...prevAppointments, appointment];
    });
  }, []);

  // Mejorar la función de setCurrentDateWithTransition para hacerla más eficiente
  const setCurrentDateWithTransition = useCallback((newDate: Date) => {
    // Si ya estamos en transición, actualizar directamente sin efectos
    if (isTransitioning) {
      setCurrentDate(newDate);
      return;
    }
    
    // Determinar dirección de la transición
    const direction = newDate > currentDate ? 'left' : 'right';
    
    // Aplicar un enfoque más directo para minimizar parpadeos
    setIsTransitioning(true);
    setTransitionDirection(direction);
    
    // Actualizar la fecha inmediatamente
    setCurrentDate(newDate);
    
    // Terminar transición después de un tiempo breve
    // Sin usar requestAnimationFrame adicionales para evitar un ciclo extra de renderizado
    setTimeout(() => {
      setIsTransitioning(false);
      setTransitionDirection(null);
    }, 100);
  }, [currentDate, isTransitioning]);

  // Optimizar los estilos de transición para minimizar el efecto visual
  const transitionStyles = useMemo(() => ({
    transition: isTransitioning ? 'opacity 100ms ease-out' : 'none',
    opacity: isTransitioning ? 0.98 : 1, // Casi imperceptible para evitar parpadeo
    // No usar transform para evitar forzar repintados innecesarios
    willChange: isTransitioning ? 'opacity' : 'auto'
  }), [isTransitioning]);

  // Efecto para centrar el indicador de tiempo actual sólo cuando sea necesario
  useEffect(() => {
    // Solo ejecutar si no estamos en transición y el componente está montado
    if (isTransitioning || !agendaRef.current) return;
    
    // Crear un ID único para este intento de scroll
    const scrollId = Symbol('timeIndicatorScroll');
    let scrollCancelled = false;
    
    // Usar una función específica para este scroll
    const scrollToTimeIndicator = () => {
      // No ejecutar si se ha cancelado o el componente se ha desmontado
      if (scrollCancelled || !agendaRef.current) return;
      
      // Buscar el indicador de tiempo actual - sin logging para evitar renders adicionales
      const timeIndicator = agendaRef.current.querySelector('.current-time-indicator');
      
      // Si encontramos el indicador, hacer scroll hasta él
      if (timeIndicator) {
        const indicatorPosition = (timeIndicator as HTMLElement).offsetTop;
        const agendaHeight = agendaRef.current.clientHeight;
        
        // Calcular la posición para centrar la línea en la pantalla
        const scrollPosition = Math.max(0, indicatorPosition - (agendaHeight / 2));
        
        // Hacer scroll sin animación para evitar parpadeos
        agendaRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        });
      }
    };
    
    // Esperar a que el DOM se estabilice, pero no usar setTimeout que puede causar parpadeos
    // En su lugar, usar requestAnimationFrame para sincronizar con el ciclo de pintado
    let frameId: number;
    
    // Usar dos frames para asegurar que el DOM está completamente actualizado
    frameId = requestAnimationFrame(() => {
      if (scrollCancelled) return;
      
      frameId = requestAnimationFrame(() => {
        if (scrollCancelled) return;
        scrollToTimeIndicator();
      });
    });
    
    // Limpiar para evitar scrolls múltiples o después del desmontaje
    return () => {
      scrollCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [isTransitioning]); // Solo depender de isTransitioning para evitar múltiples ejecuciones

  // ***** NUEVA FUNCIÓN HELPER *****
  // Añadir esta función dentro del componente WeeklyAgenda
  const findOverrideForCell = useCallback(
    (day: Date, timeSlot: string, roomId: string): CabinScheduleOverride | null => {
      if (!cabinOverrides || cabinOverrides.length === 0) {
        return null;
      }

      // Iterar sobre cada override para ver si aplica a la celda actual
      for (const override of cabinOverrides) {
        // Comprobación de cabina (ya corregida)
        const appliesToAllCabins = !override.cabinIds || override.cabinIds.length === 0;
        if (!appliesToAllCabins && !override.cabinIds.includes(roomId)) {
          continue;
        }

        try {
            // Parsear fechas y horas necesarias del override y la celda
            // CORREGIDO: Manejar tanto string como Date para las fechas
            const overrideStartDate = typeof override.startDate === 'string' 
                ? parseISO(override.startDate) 
                : override.startDate;
            const overrideEndDate = typeof override.endDate === 'string' 
                ? parseISO(override.endDate) 
                : override.endDate;

            const overrideStartTime = override.startTime; // HH:mm
            const overrideEndTime = override.endTime;     // HH:mm
            const isRecurring = override.isRecurring;
            const daysOfWeek = override.daysOfWeek; // number[] [0-6]
            
            // Parsear recurrenceEndDate opcional, manejando string/Date
            let recurrenceEndDate: Date | null = null;
            if (override.recurrenceEndDate) {
                recurrenceEndDate = typeof override.recurrenceEndDate === 'string'
                    ? parseISO(override.recurrenceEndDate)
                    : override.recurrenceEndDate;
            }

             // Verificar si las fechas son válidas después del parseo/asignación
             /* OLD CHECK:
             if (isNaN(overrideStartDate?.getTime()) || isNaN(overrideEndDate?.getTime()) || (recurrenceEndDate && isNaN(recurrenceEndDate.getTime()))) {
                 console.warn("Skipping override due to invalid date objects:", override);
                 continue; 
             }
             */

             // --- Date Validation --- 
             let isValid = !isNaN(overrideStartDate?.getTime()); // Start date MUST be valid

             if (isRecurring) {
                 // For recurring, we need EITHER a valid recurrenceEndDate OR a valid endDate
                 const isRecurrenceEndDateValid = recurrenceEndDate && !isNaN(recurrenceEndDate.getTime());
                 const isEndDateValid = overrideEndDate && !isNaN(overrideEndDate.getTime());
                 
                 // If recurrenceEndDate exists, it MUST be valid.
                 if (recurrenceEndDate) {
                      isValid = isValid && isRecurrenceEndDateValid;
                 } 
                 // If recurrenceEndDate does NOT exist, then the regular endDate MUST be valid.
                 else {
                      isValid = isValid && isEndDateValid; 
                 }

             } else {
                 // For non-recurring, endDate might be null. 
                 // We only need startDate for the logic.
                 // We only invalidate if endDate exists AND is invalid.
                 if (overrideEndDate && isNaN(overrideEndDate.getTime())) {
                      isValid = false; 
                 }
                 // If overrideEndDate is null, isValid remains based on overrideStartDate validity.
             }

             if (!isValid) {
                 // Log more details including potentially parsed/converted dates
                 console.warn("Skipping override due to invalid date objects:", {
                     ...override, // Spread original data
                     _parsedStartDate: overrideStartDate, 
                     _parsedEndDate: overrideEndDate, 
                     _parsedRecurrenceEndDate: recurrenceEndDate
                 }); 
                 continue;
             }
             // --- End Date Validation ---

            const cellDate = day; // La fecha de la celda actual
            const cellTime = timeSlot; // La hora de la celda actual HH:mm
            const cellDayOfWeek = getDay(cellDate); // 0 = Domingo, 1 = Lunes,...

            // Combinar fecha y hora de la celda para comparación precisa
            let cellDateTime: Date;
            try {
                 const dateTimeString = `${format(cellDate, "yyyy-MM-dd")}T${cellTime}:00`;
                 cellDateTime = parseISO(dateTimeString);
                 if (isNaN(cellDateTime.getTime())) {
                     // Fallback por si parseISO falla con solo HH:mm
                     cellDateTime = parse(dateTimeString.substring(0, 16), "yyyy-MM-dd'T'HH:mm", new Date());
                 }
                 if (isNaN(cellDateTime.getTime())) continue; // Saltar si la hora de la celda no es válida
            } catch (e) { continue; }

            // Combinar la FECHA de la celda con las HORAS del override para definir límites
             let overrideStartDateTimeOnCellDay: Date;
             let overrideEndDateTimeOnCellDay: Date;
             try {
                overrideStartDateTimeOnCellDay = parse(`${format(cellDate, "yyyy-MM-dd")}T${overrideStartTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
                overrideEndDateTimeOnCellDay = parse(`${format(cellDate, "yyyy-MM-dd")}T${overrideEndTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
                if (isNaN(overrideStartDateTimeOnCellDay.getTime()) || isNaN(overrideEndDateTimeOnCellDay.getTime())) continue; // Saltar si las horas del override son inválidas
             } catch(e) { continue; }


            // --- Comprobación Principal --- 

            // 1. ¿La HORA de la celda cae dentro del rango de horas del override?
            const isTimeMatch = !isBefore(cellDateTime, overrideStartDateTimeOnCellDay) &&
                                isBefore(cellDateTime, overrideEndDateTimeOnCellDay);
            
            if (!isTimeMatch) {
                continue; // Si la hora no coincide, no puede ser este bloqueo
            }

            // 2. La HORA coincide, ahora comprobar FECHAS y RECURRENCIA

            const cellDateStart = startOfDay(cellDate); // Normalizar a inicio del día para comparaciones

            if (isRecurring) {
                // --- Lógica Recurrente ---
                const effectiveEndDate = recurrenceEndDate ? endOfDay(recurrenceEndDate) : endOfDay(overrideEndDate);
                const overrideStartDateStart = startOfDay(overrideStartDate);

                // ¿Está la fecha de la celda DENTRO del rango de fechas de la recurrencia?
                const isWithinDateRange = isWithinInterval(cellDateStart, { start: overrideStartDateStart, end: effectiveEndDate });

                // ¿Coincide el DÍA DE LA SEMANA?
                const isDayOfWeekMatch = daysOfWeek && daysOfWeek.includes(cellDayOfWeek);

                if (isWithinDateRange && isDayOfWeekMatch) {
                    return override; // ¡Coincidencia de bloqueo recurrente!
                }
                // --- Fin Lógica Recurrente ---

            } else {
                // --- Lógica No Recurrente (Un solo día) ---
                const overrideStartDateStart = startOfDay(overrideStartDate);

                // ¿Es la fecha de la celda EXACTAMENTE la fecha de inicio del bloqueo?
                if (isSameDay(cellDateStart, overrideStartDateStart)) {
                    return override; // ¡Coincidencia de bloqueo de un solo día!
                }
                // --- Fin Lógica No Recurrente ---
            }

        } catch (error) {
            console.error("Error processing override:", override, error);
            continue; // Saltar este override si hay un error inesperado
        }
      }

      // Si el bucle termina sin encontrar coincidencia
      return null;
    },
    [cabinOverrides, loadingOverrides] // Añadir loadingOverrides a las dependencias
  );
  // ***** FIN NUEVA FUNCIÓN HELPER *****

  if (containerMode) {
    return (
      <div className="h-full" style={transitionStyles}>
        <HydrationWrapper fallback={<div>Cargando agenda semanal...</div>}>
          <div className="flex flex-col h-full bg-white">
            {/* En modo contenedor, no mostramos el encabezado ni la barra de navegación
               ya que estos serán proporcionados por el AgendaContainer padre */}
            {renderWeeklyGrid()}

            {/* Diálogos y modales */}
            {isSearchDialogOpen && (
              <ClientSearchDialog
                isOpen={isSearchDialogOpen}
                onClose={() => setIsSearchDialogOpen(false)}
                onClientSelect={handleClientSelect}
              />
            )}

            {isAppointmentDialogOpen && selectedSlot && (
              <AppointmentDialog
                isOpen={isAppointmentDialogOpen}
                onClose={() => {
                  setIsAppointmentDialogOpen(false);
                  setSelectedClient(null); // Limpiar cliente al cerrar
                  setSelectedSlot(null);
                }}
                client={selectedClient}
                selectedTime={selectedSlot.time}
                onSearchClick={() => { 
                  setIsAppointmentDialogOpen(false); 
                  setIsSearchDialogOpen(true); 
                }}
                onNewClientClick={handleNewClientClick}
                onSave={handleSaveAppointment}
                onDelete={handleDeleteAppointment}
                isEditing={false}
              />
            )}

            {isNewClientDialogOpen && (
              <NewClientDialog 
                isOpen={isNewClientDialogOpen} 
                onClose={() => setIsNewClientDialogOpen(false)} 
              />
            )}

            {isOverrideModalOpen && (
              <BlockScheduleModal
                open={isOverrideModalOpen}
                onOpenChange={(isOpen) => setIsOverrideModalOpen(isOpen)}
                clinicRooms={activeCabins.map(cabin => ({
                  name: cabin.name,
                  id: cabin.id.toString()
                }))}
                blockToEdit={selectedOverride}
                clinicId={String(effectiveClinic?.id)}
                clinicConfig={{
                  // Pass calculated times if available, otherwise safe defaults
                  openTime: timeSlots.length > 0 ? timeSlots[0] : "09:00", 
                  closeTime: timeSlots.length > 0 ? timeSlots[timeSlots.length - 1] : "20:00",
                }}
              />
            )}
          </div>
        </HydrationWrapper>
      </div>
    )
  }

  // Return original para cuando se usa de forma independiente
  return (
    <HydrationWrapper>
      {/* Asegurar que el contenedor principal sea flex y ocupe toda la altura */}
      <div className="flex flex-col h-full" style={transitionStyles}>
        {/* El bloque de AgendaNavBar eliminado completamente */}

        {/* Contenedor de la rejilla que debe tener scroll */}
        <div className="relative flex-1 overflow-auto">
            {renderWeeklyGrid()}
            {/* Asegurarse de que CurrentTimeIndicator esté relacionado con este div si usa refs */}
        </div>
        
        {/* Renderizar diálogos aquí, no afectan el layout principal */}
        {isSearchDialogOpen && (
          <ClientSearchDialog
            isOpen={isSearchDialogOpen}
            onClose={() => setIsSearchDialogOpen(false)}
            onClientSelect={handleClientSelect}
          />
        )}

        {isAppointmentDialogOpen && selectedSlot && (
          <AppointmentDialog
            isOpen={isAppointmentDialogOpen}
            onClose={() => {
              setIsAppointmentDialogOpen(false);
              setSelectedClient(null); // Limpiar cliente al cerrar
              setSelectedSlot(null);
            }}
            client={selectedClient}
            selectedTime={selectedSlot.time}
            onSearchClick={() => { 
              setIsAppointmentDialogOpen(false); 
              setIsSearchDialogOpen(true); 
            }}
            onNewClientClick={handleNewClientClick}
            onSave={handleSaveAppointment}
            onDelete={handleDeleteAppointment}
            isEditing={false}
          />
        )}

        {isNewClientDialogOpen && (
          <NewClientDialog 
            isOpen={isNewClientDialogOpen} 
            onClose={() => setIsNewClientDialogOpen(false)} 
          />
        )}
      </div>
      
      {/* MODAL DE BLOQUEO/OVERRIDE (fuera del contenedor flex principal) */} 
      <BlockScheduleModal
        open={isOverrideModalOpen}
        onOpenChange={(isOpen) => setIsOverrideModalOpen(isOpen)}
        clinicRooms={activeCabins.map(cabin => ({
          ...cabin,
          id: cabin.id.toString()
        }))}
        blockToEdit={selectedOverride}
        clinicId={String(effectiveClinic?.id)}
        clinicConfig={{
          // Pass calculated times if available, otherwise safe defaults
          openTime: timeSlots.length > 0 ? timeSlots[0] : "09:00", 
          closeTime: timeSlots.length > 0 ? timeSlots[timeSlots.length - 1] : "20:00",
        }}
      />
    </HydrationWrapper>
  )
}

// <<< RESTAURAR FUNCIÓN HELPER >>>
const convertBlocksToWeekSchedule = (
    blocks: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null
): WeekSchedule => {
    const initialSchedule: WeekSchedule = {
        monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] },
        wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] },
        friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] },
        sunday: { isOpen: false, ranges: [] },
    };
    if (!blocks || blocks.length === 0) { 
        return initialSchedule; 
    }
    const weekSchedule = blocks.reduce((acc, block) => {
        const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;
        if (acc[dayKey]) { 
            acc[dayKey].isOpen = true;
            acc[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
            acc[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
        }
        return acc;
    }, initialSchedule);
    return weekSchedule;
};
// -------------------------------------
