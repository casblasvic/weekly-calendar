/* eslint-disable react-hooks/rules-of-hooks */

"use client"

import React, { useMemo } from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { format, parse, parseISO, isAfter, isBefore, getDay, getDate, isSameDay, addDays, subDays, set, addMinutes, isEqual } from "date-fns"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { useCabins } from "@/contexts/CabinContext"
import { AgendaNavBar } from "@/components/agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { ClientSearchDialog } from "./client-search-dialog"
import { AppointmentDialog } from "@/components/appointment-dialog"
import { NewClientDialog } from "@/components/new-client-dialog"
import { AppointmentItem } from "./appointment-item"
import { Calendar } from "lucide-react"
import { useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Search, Calendar as CalendarIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
// import { useSchedule } from "@/hooks/use-schedule"
// import { Modal } from "@/components/ui/modal"
import { AppointmentDialog as AppointmentDialogType } from "@/components/appointment-dialog"
import { AppointmentItem as AppointmentItemType } from "@/components/appointment-item"
import { CustomDatePicker } from "@/components/custom-date-picker"
import { Appointment } from "@/types/appointment"
import { Cabin, ScheduleTemplateBlock, ClinicScheduleBlock, CabinScheduleOverride } from '@prisma/client';
import { WeekSchedule, DaySchedule } from "@/types/schedule";
import { Loader2 } from "lucide-react"
import { isValid } from "date-fns"
import { convertCabinToRoom } from "@/types/fix-types"
import { useTheme } from "@/app/contexts/theme-context"

interface Clinica {
  // ... otras propiedades existentes ...
  weekendOpenTime?: string | null; // O el tipo que corresponda
  weekendCloseTime?: string | null; // O el tipo que corresponda
}

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

// Definir colores zebra si no están importados globalmente
const ZEBRA_LIGHT = "bg-gray-50"; // O un color púrpura muy claro: "bg-purple-50/20";
const ZEBRA_DARK = "bg-white";

interface Person { 
  id: string; 
  name: string; 
  phone: string; 
}

interface Employee {
  id: string
  name: string
}

interface DayViewProps {
  date: string
  containerMode?: boolean
  onAppointmentsChange?: (appointments: Appointment[]) => void
  appointments?: Appointment[]
  employees?: Employee[]
  rooms?: Room[]
  onAppointmentClick?: (appointmentId: string) => void
  onViewChange?: (view: "week" | "day", date?: Date) => void
}

// Definir tipo Room localmente si no está global
interface Room {
  id: string;
  name: string;
  color?: string;
}

// <<< REINCORPORAR HELPERS >>>
const getDayKey = (date: Date) => {
  if (!isValid(date)) { 
      console.warn("[DayView - getDayKey] Received invalid date:", date);
      return "";
  }
  const day = format(date, "EEEE", { locale: es }).toLowerCase();
  const dayMap = {
    lunes: "monday", martes: "tuesday", miércoles: "wednesday", jueves: "thursday",
    viernes: "friday", sábado: "saturday", domingo: "sunday",
  } as const;
  return dayMap[day as keyof typeof dayMap] || day;
};

const convertBlocksToWeekSchedule = (
    blocks: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null,
    defaultOpenTime: string,
    defaultCloseTime: string
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
        } else {
            console.warn(`[DayView - convertBlocksToWeekSchedule] Invalid dayKey derived: ${dayKey} for block:`, block);
        }
        return acc;
    }, initialSchedule);
    return weekSchedule;
};
// <<< FIN HELPERS >>>

export default function DayView({
  date: dateString,
  containerMode = false,
  onAppointmentsChange,
  appointments: initialAppointments = [],
  employees = [],
  rooms = [],
  onAppointmentClick,
  onViewChange,
}: DayViewProps) {
  const router = useRouter()
  const { activeClinic, isLoading: isLoadingClinic } = useClinic()
  const { theme } = useTheme()
  const {
    createBlock, updateBlock, deleteBlock,
    createCabinOverride, updateCabinOverride, deleteCabinOverride,
    cabinOverrides, loadingOverrides,
    getBlocksByDateRange,
  } = useScheduleBlocks()
  
  const { toast } = useToast()

  // Parsear la fecha una vez
  const currentDate = useMemo(() => {
      try {
        return parse(dateString, 'yyyy-MM-dd', new Date());
      } catch (error) {
        console.error("[DayView] Error parsing date:", dateString, error);
        return new Date(); // Fallback a hoy
      }
  }, [dateString]);

  // Estado de carga combinado
  const isLoading = isLoadingClinic;

  if (isLoading) {
    console.log(`[DayView] Mostrando carga: isLoadingClinic=${isLoadingClinic}`);
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /> Cargando datos...</div>;
  }
  
  // Estados para diálogos y selección
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date
    time: string
    roomId: string
  } | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)

  // Dentro de la función DayView, añadir estos estados:
  const [selectedOverride, setSelectedOverride] = useState<CabinScheduleOverride | null>(null)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)

  // Añadir este estado cerca de los otros estados al inicio del componente
  const [updateKey, setUpdateKey] = useState(0)

  // Modificar el estado de appointments para usar los proporcionados en modo contenedor
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (initialAppointments.length > 0) {
      return initialAppointments
    }

    // Código original para cargar desde sessionStorage si no se proporcionan
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

  // Actualizar appointments cuando cambian initialAppointments
  useEffect(() => {
    if (initialAppointments && initialAppointments.length > 0) {
      // Verificar si realmente hay cambios antes de actualizar
      const currentIds = appointments.map(apt => apt.id).sort().join(',');
      const newIds = initialAppointments.map(apt => apt.id).sort().join(',');
      
      if (currentIds !== newIds) {
        setAppointments(initialAppointments)
      }
    }
  }, [initialAppointments, appointments])

  // <<< ADD useMemo to calculate correctSchedule >>>
  const correctSchedule = useMemo(() => {
    if (!activeClinic) return null;
    console.log("[DayView useMemo] Deriving correct schedule from activeClinic:", activeClinic);
    const templateBlocks = activeClinic.linkedScheduleTemplate?.blocks;
    const independentBlocks = activeClinic.independentScheduleBlocks;
    const defaultOpen = (activeClinic as any)?.openTime || "00:00";
    const defaultClose = (activeClinic as any)?.closeTime || "23:59";
    let blocksToUse: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null = null;
    if (templateBlocks && templateBlocks.length > 0) {
      console.log("[DayView useMemo] Using template blocks.");
      blocksToUse = templateBlocks;
    } else if (independentBlocks && independentBlocks.length > 0) {
      console.log("[DayView useMemo] Using independent blocks.");
      blocksToUse = independentBlocks;
    } else {
      console.log("[DayView useMemo] No blocks found.");
      return convertBlocksToWeekSchedule(null, defaultOpen, defaultClose);
    }
    return convertBlocksToWeekSchedule(blocksToUse, defaultOpen, defaultClose);
  }, [activeClinic]);

  // --- Derive general config and log --- 
  const openTime = useMemo(() => (activeClinic as any)?.openTime ?? "09:00", [activeClinic]);
  const closeTime = useMemo(() => (activeClinic as any)?.closeTime ?? "18:00", [activeClinic]);
  const slotDuration = useMemo(() => (activeClinic as any)?.slotDuration ?? 15, [activeClinic]);
  
  // <<< UPDATE this log to show correctSchedule >>>
  console.log("[DayView] Derived schedule config:", { openTime, closeTime, slotDuration, schedule: correctSchedule });
  // -----------------------------------------

  // <<< UPDATE timeSlots calculation to use correctSchedule >>>
  const timeSlots = useMemo(() => {
    if (!correctSchedule) {
      console.warn("[DayView] No correctSchedule available for timeSlots generation, using defaults.")
      return getTimeSlots(openTime, closeTime, slotDuration); // Fallback
    }

    const dayKey = getDayKey(currentDate);
    const daySchedule = correctSchedule[dayKey as keyof WeekSchedule];

    let dayStartTime = openTime; // Usar el openTime general como default
    let dayEndTime = closeTime; // Usar el closeTime general como default

    if (daySchedule?.isOpen && daySchedule.ranges.length > 0) {
      // Asegurarse de que los rangos están ordenados por hora de inicio
      const sortedRanges = [...daySchedule.ranges].sort((a, b) => a.start.localeCompare(b.start));
      // Tomar el inicio del primer rango y el fin del último rango del día
      dayStartTime = sortedRanges[0].start;
      dayEndTime = sortedRanges[sortedRanges.length - 1].end;
    } else if (!daySchedule?.isOpen) {
      // Si el día está explícitamente cerrado, no mostrar slots
      console.log(`[DayView] Day ${dayKey} is closed. Returning empty timeSlots.`);
      return [];
    } else {
        // Si está abierto pero no hay rangos (quizás configuración incompleta), 
        // usar el horario general de la clínica para ese día.
        console.log(`[DayView] Day ${dayKey} has no specific ranges or is not explicitly open, using clinic's general open/close times: ${openTime}-${closeTime}`);
        dayStartTime = openTime;
        dayEndTime = closeTime;
    }
    
    // --- LOG DETALLADO --- 
    console.log(`[DayView] Generating time slots for ${format(currentDate, 'yyyy-MM-dd')} (Day key: ${dayKey}). Final range: ${dayStartTime} - ${dayEndTime}`);
    
    // Validación final antes de generar slots
    if (!dayStartTime || !dayEndTime || dayEndTime <= dayStartTime) { 
        console.warn(`[DayView] Invalid final time range derived (${dayStartTime}-${dayEndTime}). Using default clinic times ${openTime}-${closeTime}.`);
        return getTimeSlots(openTime, closeTime, slotDuration); 
    } 

    return getTimeSlots(dayStartTime, dayEndTime, slotDuration);
  }, [correctSchedule, currentDate, openTime, closeTime, slotDuration]); // Dependencias correctas

  // Función para verificar si un día está activo en la configuración
  const isDayActive = useCallback(
    (date: Date) => {
      const day = format(date, "EEEE", { locale: es }).toLowerCase()
      const dayMap = {
        lunes: "monday",
        martes: "tuesday",
        miércoles: "wednesday",
        jueves: "thursday",
        viernes: "friday",
        sábado: "saturday",
        domingo: "sunday",
      } as const;
      const dayKey = dayMap[day as keyof typeof dayMap] || day;
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
         console.error("[DayView] Error in isDayActive:", error);
         return false;
      }
    },
    [correctSchedule],
  )

  // <<< UPDATE isTimeSlotAvailable to use correctSchedule >>>
  const isTimeSlotAvailable = useCallback((time: string) => {
    const dayKey = getDayKey(currentDate);
    let isAvailable = false;
    try {
      // <<< Use correctSchedule directly >>>
      const daySchedule = correctSchedule?.[dayKey as keyof WeekSchedule]; 
      if (!daySchedule || !daySchedule.isOpen || !daySchedule.ranges) {
        isAvailable = false;
      } else {
        isAvailable = daySchedule.ranges.some((range) => time >= range.start && time < range.end);
      }
      // console.log(`[DayView] isTimeSlotAvailable check for ${format(currentDate, 'yyyy-MM-dd')} ${time} (key: ${dayKey}): ${isAvailable}`); // Already commented
    } catch (error) {
      console.error("[DayView] Error in isTimeSlotAvailable:", error);
    }
    return isAvailable;
  }, [correctSchedule, currentDate, getDayKey]); // <<< Add correctSchedule and getDayKey to dependencies

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)

  // Función para centrar automáticamente la vista en la línea de tiempo actual
  const scrollToCurrentTime = useCallback(() => {
    if (!agendaRef.current) return;

    // El contenedor scrollable puede ser el padre del grid
    const container: HTMLElement | null = (agendaRef.current.parentElement as HTMLElement) || agendaRef.current;
    
    const indicator = agendaRef.current.querySelector<HTMLElement>(".current-time-indicator");
    if (!indicator || !container) return;
    
    const indicatorOffset = indicator.offsetTop;
    const containerHeight = container.clientHeight;
    
    const targetScroll = Math.max(0, indicatorOffset - containerHeight / 2);
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  // Centrar en la línea al cambiar de día o cuando los slots cambian (primera carga)
  useEffect(() => {
    // Pequeño retraso para garantizar que el DOM esté listo
    const timeout = setTimeout(scrollToCurrentTime, 50);
    return () => clearTimeout(timeout);
  }, [currentDate, timeSlots, scrollToCurrentTime]);

  // Filtrar citas para el día actual
  const dayAppointments = appointments.filter((apt) => apt.date.toDateString() === currentDate.toDateString())

  // Corregir: findOverrideForCell debe esperar string para cabinId
  const findOverrideForCell = (currentViewDate: Date, timeSlot: string, cabinId: string, overrides: CabinScheduleOverride[], clinicId?: string): CabinScheduleOverride | null => {
    if (!overrides || overrides.length === 0 || !clinicId) {
      return null;
    }
    const relevantOverrides = overrides.filter(ov => 
      ov.clinicId === clinicId &&
      ov.cabinIds.includes(cabinId) && // Usa cabinId (string)
      // Ajustar comparación de fechas para ignorar la hora
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

  // Funciones para manejar citas
  const handleCellClick = (date: Date, time: string, roomId: string) => {
    console.log(`Celda clickeada: ${format(date, 'yyyy-MM-dd')} ${time}, Cabina: ${roomId}`);
    const clinicIdStr = activeClinic?.id ? String(activeClinic.id) : undefined;

    // Verificar si la celda está bloqueada por un override
    // Asegurarse que roomId se pasa como string
    const override = findOverrideForCell(date, time, String(roomId), cabinOverrides, clinicIdStr);
    if (override) {
      console.log('Celda bloqueada por override, abriendo modal de edición:', override);
      openOverrideModal(override); // Abrir modal para editar el override existente
      return; // No hacer nada más si está bloqueado
    }

    // Si no está bloqueado, iniciar flujo de nueva cita
    console.log('Celda no bloqueada. Abriendo búsqueda de cliente para nueva cita.');
    setSelectedSlot({ date, time, roomId: String(roomId) }); // Guardar slot seleccionado
    setIsSearchDialogOpen(true); // Abrir modal de búsqueda de cliente
  }

  const handlePersonSelect = (person: Person) => {
    console.log("Persona seleccionada:", person)
    setSelectedPerson(person) // selectedPerson debe ser de tipo Person | null
    setIsSearchDialogOpen(false)
    setIsAppointmentDialogOpen(true)
  }

  const handleDeleteAppointment = useCallback(() => {
    if (selectedSlot) {
      setAppointments((prev) =>
        prev.filter(
          (apt) =>
            !(
              apt.date.toDateString() === selectedSlot?.date?.toDateString() &&
              apt.startTime === selectedSlot?.time &&
              apt.roomId === selectedSlot?.roomId
            ),
        ),
      )
    }
  }, [selectedSlot])

  const handleSaveAppointment = useCallback(
    (appointmentData: {
      person: { name: string; phone: string }
      services: { id: string; name: string; category: string }[]
      time: string
      comment?: string
      blocks: number
      tags?: string[]
    }) => {
      if (selectedSlot) {
        const targetRoomId = String(selectedSlot.roomId);
        const cabin = rooms.find(c => String(c.id) === targetRoomId);

        if (cabin) {
          const newAppointment: Appointment = {
            id: Math.random().toString(36).substr(2, 9),
            name: appointmentData.person.name,
            service: appointmentData.services.map((s) => s.name).join(", "),
            date: selectedSlot.date,
            roomId: targetRoomId, // Usar el ID string
            startTime: appointmentData.time,
            duration: appointmentData.blocks || 2, 
            color: cabin.color, 
            phone: appointmentData.person.phone,
            tags: appointmentData.tags || [], 
          };
          setAppointments((prev) => [...prev, newAppointment]);
          // Notificar al padre si existe el callback
          if (onAppointmentsChange) {
             onAppointmentsChange([...appointments, newAppointment]);
          }
        }
      }
    },
    [selectedSlot, rooms, setAppointments, onAppointmentsChange, appointments]
  );

  const handleAppointmentResize = (id: string, newDuration: number) => {
    // Esta función ya no es necesaria con el nuevo componente sin redimensionamiento
    // Podemos mantenerla vacía o modificarla para cambiar la duración de otra manera
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const updatedAppointments = Array.from(appointments);
    const [movedAppointment] = updatedAppointments.splice(source.index, 1);
    const [roomId, time] = destination.droppableId.split("-"); // roomId aquí es string
    const updatedAppointment = { ...movedAppointment, date: currentDate, roomId, startTime: time };
    updatedAppointments.push(updatedAppointment);
    setAppointments(updatedAppointments);
     // Notificar al padre si existe el callback
    if (onAppointmentsChange) {
        onAppointmentsChange(updatedAppointments);
    }
    setIsAppointmentDialogOpen(false);
  };

  // Añadir un estado para la cita seleccionada
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // Agregar un manejador para el clic en una cita existente
  const handleAppointmentClick = (appointment: Appointment) => {
    console.log("Cita seleccionada para edición:", appointment)
    setSelectedAppointment(appointment)
    
    // Configurar los datos necesarios para editar la cita
    const personForModal: Person = { 
        id: appointment.personId || "", // Asumir que Appointment tiene personId
        name: appointment.name, 
        phone: appointment.phone || "" 
    };
    setSelectedPerson(personForModal)
    setSelectedSlot({
      date: appointment.date,
      time: appointment.startTime,
      roomId: appointment.roomId
    })
    
    // Abrir el diálogo de edición
    setIsAppointmentDialogOpen(true)
  }

  // Crear clinicRooms con el formato correcto para BlockScheduleModal
  const clinicRoomsForModal: Room[] = useMemo(() => {
      return rooms.map(cabin => ({
          id: String(cabin.id), // Asegurar que es string
          name: cabin.name,
          color: cabin.color
      }));
  }, [rooms]);

  // Corregir renderDayGrid para usar String(cabin.id) en findOverrideForCell
  const renderDayGrid = () => {
      console.log("[DayView] renderDayGrid - valor de rooms:", JSON.stringify(rooms));
      const clinicIdStr = activeClinic?.id ? String(activeClinic.id) : undefined;
      return (
          <div className="flex-1 overflow-visible relative bg-white" ref={agendaRef}>
              {/* Cabecera de la tabla (fija) */}
              <div className="sticky top-0 z-30 grid bg-white border-b shadow-sm" 
                   style={{ gridTemplateColumns: `60px repeat(${rooms.length > 0 ? rooms.length : 1}, minmax(100px, 1fr))` }}> 
                  <div className="flex items-center justify-center h-12 px-2 py-1 text-xs font-semibold tracking-wide text-center text-gray-600 uppercase border-r bg-gray-50">Hora</div>
                  {rooms.length > 0 ? (
                    rooms.map((room) => (
                      <div key={room.id} className="flex items-center justify-center h-12 px-2 py-1 text-xs font-semibold tracking-wide text-center text-white border-r last:border-r-0" style={{ backgroundColor: room.color || '#ccc' }}>
                        {room.name}
                      </div>
                    ))
                  ) : (
                     <div className="flex items-center justify-center h-12 px-2 py-1 text-xs font-semibold tracking-wide text-center text-gray-500 border-r last:border-r-0 bg-gray-50">
                       (Sin cabinas activas)
                     </div>
                  )}
              </div>

              {/* Contenedor scrollable para slots */}
              <div className="relative">
                  {timeSlots.map((time, timeIndex) => (
                    <div key={time} className="grid border-b" 
                         data-time={time}
                         style={{ gridTemplateColumns: `60px repeat(${rooms.length > 0 ? rooms.length : 1}, minmax(100px, 1fr))`, minHeight: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}>
                      {/* Celda de Hora */}
                      <div 
                        data-time={time}
                        className="sticky left-0 z-10 p-2 text-sm font-medium text-purple-600 bg-white border-b border-r border-gray-300">
                        {time}
                      </div>
                      {/* Celdas de Cabinas */}
                      {rooms.length > 0 ? (
                        rooms.map((room) => {
                          const isAvailable = isTimeSlotAvailable(time);
                          const isBlocked = !!findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr);
                          
                          return (
                            <div
                              key={`${time}-${room.id}`}
                              data-time={time}
                              className={cn(
                                "relative border-r last:border-r-0 min-h-[40px] flex flex-col justify-start", // min-h y flex-col
                                timeIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK,
                                isAvailable && !isBlocked ? "cursor-pointer hover:bg-purple-100/50" : "",
                                !isAvailable && !isBlocked ? "bg-gray-100 cursor-not-allowed opacity-70" : "", // Estilo para no disponible
                                isBlocked ? "bg-rose-100/50 cursor-not-allowed" : "" // Estilo para bloqueado
                              )}
                              onClick={() => {
                                if (isAvailable && !isBlocked) {
                                  handleCellClick(currentDate, time, String(room.id));
                                } else if (isBlocked && findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr)) {
                                   console.log('Click en celda bloqueada, abriendo modal de edición:', findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr));
                                   openOverrideModal(findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr));
                                }
                              }}
                            >
                              {/* Renderizar citas */}
                              {dayAppointments
                                .filter((apt) => apt.startTime === time && String(apt.roomId) === String(room.id))
                                .map((apt, index) => (
                                  <AppointmentItem
                                    key={apt.id}
                                    appointment={apt}
                                    index={index}
                                    onClick={() => handleAppointmentClick(apt)}
                                  />
                                ))}
                              {/* Renderizar indicador de bloqueo */}
                              {isBlocked && renderBlockIndicator(findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr), time, String(room.id))}
                            </div>
                          );
                        })
                      ) : (
                          <div className={cn(
                              "relative border-r last:border-r-0 min-h-[40px] bg-gray-50", // Celda vacía si no hay cabinas
                              timeIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK
                          )}></div>
                      )}
                    </div>
                  ))}
                  {/* Indicador de hora actual */}
                  <CurrentTimeIndicator
                    config={AGENDA_CONFIG}
                    key={`indicator-${format(currentDate, 'yyyy-MM-dd')}`}
                    timeSlots={timeSlots}
                    rowHeight={AGENDA_CONFIG.ROW_HEIGHT}
                    isMobile={false}
                    className="z-20"
                    agendaRef={agendaRef}
                    clinicOpenTime={openTime}
                    clinicCloseTime={closeTime}
                  />
              </div>
          </div>
      )
  }

  // Función auxiliar para renderizar indicador de bloqueo (copiada de lógica anterior)
  const renderBlockIndicator = (override: CabinScheduleOverride | null, time: string, roomId: string) => {
      if (!override) return null;

      const prevTime = timeSlots[timeSlots.indexOf(time) - 1];
      const clinicIdStr = activeClinic?.id ? String(activeClinic.id) : undefined;
      const overrideForPrevCell = prevTime ? findOverrideForCell(currentDate, prevTime, roomId, cabinOverrides, clinicIdStr) : null;
      const isStartOfBlock = !overrideForPrevCell || overrideForPrevCell.id !== override.id;

      if (!isStartOfBlock) return null;

      let blockDurationSlots = 1;
      for (let i = timeSlots.indexOf(time) + 1; i < timeSlots.length; i++) {
        const nextTime = timeSlots[i];
        const overrideForNextCell = findOverrideForCell(currentDate, nextTime, roomId, cabinOverrides, clinicIdStr);
        if (overrideForNextCell && overrideForNextCell.id === override.id) {
          blockDurationSlots++;
        } else {
          break;
        }
      }

      return (
        <div 
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-center p-1 m-px overflow-hidden text-xs border rounded-sm pointer-events-none bg-rose-200/80 border-rose-300 text-rose-700"
          style={{ height: `calc(${blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT}px - 2px)` }}
          title={override.description || "Bloqueado"}
        >
          <Lock className="flex-shrink-0 w-3 h-3 mr-1" />
          <span className="truncate">{override.description || "Bloqueado"}</span>
        </div>
      );
  };

  // <<< REINCORPORAR openOverrideModal >>>
  const openOverrideModal = (override: CabinScheduleOverride | null = null) => {
    console.log('Abriendo modal de bloqueo/override:', override);
    setSelectedOverride(override); 
    setIsBlockModalOpen(true);
  };

  // Efecto para cargar bloques (si es necesario y se corrige)
  useEffect(() => {
    // COMENTAR la llamada a loadBlocks por ahora para evitar error de tipo
    // if (!containerMode) { // Solo cargar si no estamos en modo contenedor
    //  loadBlocks();
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, containerMode, updateKey]); // Dependencias

  // Implementar una función que renderice los modales para evitar duplicación
  const renderModals = () => {
    return (
      <>
        <ClientSearchDialog
          isOpen={isSearchDialogOpen}
          onClose={() => setIsSearchDialogOpen(false)}
          onPersonSelect={handlePersonSelect}
          selectedTime={selectedSlot?.time}
        />

        <AppointmentDialog
          isOpen={isAppointmentDialogOpen}
          onClose={() => {
            setIsAppointmentDialogOpen(false)
            setSelectedAppointment(null)
          }}
          person={selectedPerson}
          selectedTime={selectedSlot?.time}
          appointmentToEdit={selectedAppointment}
          onSearchClick={() => {
            setIsAppointmentDialogOpen(false)
            setIsSearchDialogOpen(true)
          }}
          onNewPersonClick={() => {
            setIsAppointmentDialogOpen(false)
            setIsNewClientDialogOpen(true)
          }}
          onDelete={handleDeleteAppointment}
          onSave={handleSaveAppointment}
          isEditing={!!selectedAppointment}
        />

        <NewClientDialog 
          isOpen={isNewClientDialogOpen} 
          onClose={() => setIsNewClientDialogOpen(false)} 
        />

        {/* Modal para bloqueos */}
        {activeClinic && (
          <BlockScheduleModal
            open={isBlockModalOpen}
            onOpenChange={setIsBlockModalOpen}
            clinicRooms={clinicRoomsForModal}
            blockToEdit={selectedOverride}
            clinicId={String(activeClinic.id)}
            onBlockSaved={() => {
                console.log("Bloqueo guardado/eliminado, modal cerrado.");
                setIsBlockModalOpen(false);
                toast({ title: "Bloqueo guardado", description: "El bloqueo de horario se ha guardado correctamente." });
                setUpdateKey(prev => prev + 1);
            }}
            clinicConfig={{ 
              openTime: (activeClinic as any)?.openTime, 
              closeTime: (activeClinic as any)?.closeTime,
              slotDuration: (activeClinic as any)?.slotDuration
            }}
          />
        )}
      </>
    );
  };

  if (containerMode) {
    return (
      <div className="flex flex-col h-full" style={{ transition: "opacity 0.2s ease", opacity: 1 }}>
        {/* Renderizar solo el contenido, sin la barra de navegación */}
        <div className="flex-1 overflow-auto">
          {renderDayGrid()}
        </div>
        
        {/* Modals */}
        {renderModals()}
      </div>
    )
  }

  // Return normal para cuando se usa de forma independiente
  return (
    <HydrationWrapper>
      {/* Renderizar directamente la cuadrícula y modales */}
      <div className="flex-1 overflow-visible h-full"> {/* Asegurar altura y overflow */} 
         {renderDayGrid()}
      </div>
      {renderModals()}
    </HydrationWrapper>
  )
}

// --- Funciones Auxiliares (Puedes ponerlas fuera del componente o en un archivo utils) ---

// Función simple para determinar si un color es claro u oscuro (ajusta los umbrales según necesidad)
function isColorLight(color: string): boolean {
  if (!color) return true;
  if (color.includes('white') || color.includes('yellow') || color.includes('lime') || color.includes('cyan') || color.includes('#f') || color.includes('#e') || color.includes('#d')) return true;
   // Colores claros comunes de Tailwind o hexadecimales
   if (['#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#fef2f2', '#fefce8', '#f0fdf4', '#ecfdf5', '#f0f9ff', '#f5f3ff'].includes(color.toLowerCase())) return true;
   if (color.startsWith('#') && parseInt(color.substring(1), 16) > 0xaaaaaa) return true; // Heurística simple para hexadecimales

  return false; // Asumir oscuro por defecto
}
