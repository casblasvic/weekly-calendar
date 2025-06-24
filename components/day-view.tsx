/* eslint-disable react-hooks/rules-of-hooks */

"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { format, parse, parseISO, isAfter, isBefore, getDay, getDate, isSameDay, addDays, subDays, set, addMinutes, isEqual, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { toZonedTime } from 'date-fns-tz'
import { useClinic } from "@/contexts/clinic-context"
import { useCabins } from "@/contexts/CabinContext"
import { AgendaNavBar } from "@/components/agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { useTranslation } from "react-i18next"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { PersonSearchDialog } from "./client-search-dialog"
import { AppointmentDialog } from "@/components/appointment-dialog"
import type { Person } from "@/components/appointment-dialog"
import { NewClientDialog } from "@/components/new-client-dialog"
import { AppointmentItem } from "./appointment-item"
import { Calendar } from "lucide-react"
import { ClientQuickViewDialog } from "@/components/client-quick-view-dialog"
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
import { Appointment } from "@/types/appointments"
import { Cabin, ScheduleTemplateBlock, ClinicScheduleBlock, CabinScheduleOverride } from '@prisma/client';
import { WeekSchedule, DaySchedule } from "@/types/schedule";
import { Loader2 } from "lucide-react"
import { isValid } from "date-fns"
import { convertCabinToRoom } from "@/types/fix-types"
import { useTheme } from "@/app/contexts/theme-context"
import OptimizedHoverableCell from '@/components/agenda/optimized-hoverable-cell'
import { useGranularity } from '@/lib/drag-drop/granularity-context'
import { useOptimizedDragAndDrop } from "@/lib/drag-drop/optimized-hooks"
import { DragTimeProvider } from "@/lib/drag-drop/drag-time-context"
import { DragItem } from "@/lib/drag-drop/types"
import { getAppointmentDuration } from "@/lib/drag-drop/utils"
import { utcToClinicTime } from "@/lib/timezone-utils"
import { useWeeklyAgendaData } from '@/lib/hooks/use-weekly-agenda-data'
import { useMoveAppointment } from "@/contexts/move-appointment-context"

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
  const { t } = useTranslation()
  const { activeClinic, isLoading: isLoadingClinic, activeClinicCabins, isInitialized } = useClinic()
  const { theme } = useTheme()
  const {
    createBlock, updateBlock, deleteBlock,
    createCabinOverride, updateCabinOverride, deleteCabinOverride,
    cabinOverrides, loadingOverrides,
    getBlocksByDateRange,
  } = useScheduleBlocks()
  
  const { toast } = useToast()

  // Log inicial para depuración
  // console.log('[DayView] Component rendering with:', { dateString, containerMode, initialAppointmentsLength: initialAppointments.length, activeClinicId: activeClinic?.id, isLoadingClinic }); // Log optimizado

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
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /> Cargando datos...</div>;
  }
  
  // Verificar si no hay clínica activa
  if (!activeClinic) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-700">
            {t('agenda.noActiveClinic')}
          </h3>
        </div>
      </div>
    );
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
  const [showClientDetailsOnOpen, setShowClientDetailsOnOpen] = useState(false)
  const [isClientQuickViewOpen, setIsClientQuickViewOpen] = useState(false)
  const [selectedClientForQuickView, setSelectedClientForQuickView] = useState<Person | null>(null)

  // Dentro de la función DayView, añadir estos estados:
  const [selectedOverride, setSelectedOverride] = useState<CabinScheduleOverride | null>(null)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)

  // Añadir este estado cerca de los otros estados al inicio del componente
  const [updateKey, setUpdateKey] = useState(0)

  // ✅ Hook para datos de agenda con funciones optimistas
  const {
    appointments: cachedAppointments,
    fetchAppointments,
    addOptimisticAppointment,
    updateOptimisticAppointment,
    deleteOptimisticAppointment,
    updateOptimisticTags,
    invalidateCache,
    isDataStable
  } = useWeeklyAgendaData(currentDate);

  // ✅ Hook para mover citas
  const { startMovingAppointment, appointmentInMovement, isMovingAppointment, registerOptimisticFunctions, unregisterOptimisticFunctions } = useMoveAppointment();

  // ✅ REGISTRAR FUNCIONES OPTIMISTAS CON EL CONTEXTO
  useEffect(() => {
    registerOptimisticFunctions({
      updateOptimisticAppointment,
      invalidateCache
    });

    // Cleanup: desregistrar al desmontar
    return () => {
      unregisterOptimisticFunctions();
    };
  }, [registerOptimisticFunctions, unregisterOptimisticFunctions, updateOptimisticAppointment, invalidateCache]);

  // ✅ CALLBACK PARA MOVIMIENTO OPTIMISTA DE CITAS
  const handleMoveComplete = useCallback(async (
    originalAppointment: any,
    newDate: Date,
    newTime: string,
    newRoomId: string
  ): Promise<boolean> => {
    console.log('[DayView] 🚀 Movimiento de cita confirmado:', {
      appointmentId: originalAppointment.id,
      from: { date: originalAppointment.date, time: originalAppointment.startTime, roomId: originalAppointment.roomId },
      to: { date: newDate, time: newTime, roomId: newRoomId }
    });

    try {
      // ✅ RENDERIZADO OPTIMISTA INMEDIATO
      const [hours, minutes] = newTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + originalAppointment.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      updateOptimisticAppointment(originalAppointment.id, {
        date: newDate,
        startTime: newTime,
        endTime: newEndTime,
        roomId: newRoomId
      });

      console.log('[DayView] ✅ Cita movida optimísticamente');
      return true;

    } catch (error) {
      console.error('[DayView] ❌ Error en movimiento optimista:', error);
      return false;
    }
  }, [updateOptimisticAppointment]);

  // ✅ CREAR activeCabins IGUAL QUE WEEKLY-AGENDA para acceso a colores
  const activeCabins = useMemo(() => {
    if (!activeClinicCabins || activeClinicCabins.length === 0) {
      console.log("[DayView] No hay cabinas activas disponibles");
      return [];
    }
    const sortedCabins = activeClinicCabins
      .filter((cabin) => cabin.isActive)
      .sort((a, b) => a.order - b.order);
    // console.log("[DayView] activeCabins calculadas:", sortedCabins.length); // Log optimizado
    return sortedCabins;
  }, [activeClinicCabins]);

  // Filtrar citas para el día actual del cache
  const appointments = useMemo(() => {
    if (!cachedAppointments) return [];
    
    return cachedAppointments.filter((apt) => {
      const isValid = apt.date instanceof Date && !isNaN(apt.date.getTime());
      const matches = isValid && isSameDay(apt.date, currentDate);
      if (!isValid) {
        console.warn('[DayView] Invalid date for appointment:', apt.id, apt.date);
      }
      return matches;
    });
  }, [cachedAppointments, currentDate]);



  // ✅ MEMOIZAR initialAppointmentsLength para evitar re-renders innecesarios
  const initialAppointmentsLength = useMemo(() => initialAppointments.length, [initialAppointments.length]);
  
  // ✅ MEMOIZAR activeClinicId para evitar re-renders por cambios de referencia
  const activeClinicId = useMemo(() => activeClinic?.id, [activeClinic?.id]);

  useEffect(() => {
    // console.log('[DayView] useEffect triggered:', { // Log optimizado
    //   containerMode,
    //   initialAppointmentsLength,
    //   shouldFetch: !containerMode || initialAppointmentsLength === 0,
    //   activeClinicId,
    //   currentDate: currentDate?.toISOString()
    // });
    
    // Solo cargar desde la API si no estamos en modo contenedor
    if (!containerMode || initialAppointmentsLength === 0) {
      fetchAppointments(); // ✅ Sistema de cache no necesita argumentos
    }
  }, [fetchAppointments, containerMode, initialAppointmentsLength, activeClinicId, currentDate]); // ✅ Dependencias estables

  // En modo contenedor, las citas vienen de initialAppointments, no necesitamos setAppointments
  // porque usamos useWeeklyAgendaData que maneja el estado automáticamente

  // <<< ADD useMemo to calculate correctSchedule >>>
  const correctSchedule = useMemo(() => {
    if (!activeClinic) return null;
    // console.log("[DayView useMemo] Deriving correct schedule from activeClinic:", activeClinic); // Log optimizado
    const templateBlocks = activeClinic.linkedScheduleTemplate?.blocks;
    const independentBlocks = activeClinic.independentScheduleBlocks;
    const defaultOpen = (activeClinic as any)?.openTime || "00:00";
    const defaultClose = (activeClinic as any)?.closeTime || "23:59";
    let blocksToUse: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null = null;
    if (templateBlocks && templateBlocks.length > 0) {
      // console.log("[DayView useMemo] Using template blocks."); // Log optimizado
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
  const { openTime, closeTime } = useMemo(() => {
    if (!correctSchedule) {
      return { openTime: null, closeTime: null }; // Sin valores por defecto
    }
    
    // Obtener el día actual
    const dayKey = getDayKey(currentDate);
    const daySchedule = correctSchedule[dayKey as keyof typeof correctSchedule];
    
    if (!daySchedule || !daySchedule.isOpen || daySchedule.ranges.length === 0) {
      // Si el día no tiene horario específico, retornar null
      return { openTime: null, closeTime: null };
    }
    
    // Usar el primer rango del día para determinar apertura y cierre
    const firstRange = daySchedule.ranges[0];
    const lastRange = daySchedule.ranges[daySchedule.ranges.length - 1];
    
    return {
      openTime: firstRange.start,
      closeTime: lastRange.end
    };
  }, [correctSchedule, currentDate]);
  
  // Obtener slotDuration usando la misma lógica que weekly-agenda
  const slotDuration = useMemo(() => {
    if (!activeClinic) return 30; // Default si no hay clínica
    
    // Intentar obtener de la plantilla vinculada
    const templateDuration = (activeClinic as any).linkedScheduleTemplate?.slotDuration;
    if (templateDuration !== undefined && templateDuration !== null) {
      // console.log("[DayView] Using template slotDuration:", Number(templateDuration)); // Log optimizado
      return Number(templateDuration);
    }
    
    // Intentar obtener del horario independiente
    const independentDuration = (activeClinic as any).independentSchedule?.slotDuration;
    if (independentDuration !== undefined && independentDuration !== null) {
      console.log("[DayView] Using independent slotDuration:", Number(independentDuration));
      return Number(independentDuration);
    }
    
    // Fallback
    console.log("[DayView] Using fallback slotDuration: 30");
    return 30;
  }, [activeClinic]);
  
  // <<< UPDATE this log to show correctSchedule >>>
  // console.log("[DayView] Derived schedule config:", { openTime, closeTime, slotDuration, schedule: correctSchedule }); // Log optimizado
  // -----------------------------------------

  // <<< UPDATE timeSlots calculation to use correctSchedule >>>
  const timeSlots = useMemo(() => {
    if (!correctSchedule || !openTime || !closeTime) {
      console.warn("[DayView] No correctSchedule or schedule times available for timeSlots generation.")
      return []; // Sin valores por defecto
    }

    const dayKey = getDayKey(currentDate);
    const daySchedule = correctSchedule[dayKey as keyof WeekSchedule];

    let dayStartTime = openTime;
    let dayEndTime = closeTime;

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
        // Si está abierto pero no hay rangos, retornar vacío
        console.log(`[DayView] Day ${dayKey} has no specific ranges or is not explicitly open`);
        return [];
    }
    
    // --- LOG DETALLADO --- 
    // console.log(`[DayView] Generating time slots for ${format(currentDate, 'yyyy-MM-dd')} (Day key: ${dayKey}). Final range: ${dayStartTime} - ${dayEndTime}`); // Log optimizado
    
    // Validación final antes de generar slots
    if (!dayStartTime || !dayEndTime || dayEndTime <= dayStartTime) { 
        console.warn(`[DayView] Invalid final time range derived (${dayStartTime}-${dayEndTime}).`);
        return []; 
    } 

    return getTimeSlots(dayStartTime, dayEndTime, slotDuration);
  }, [correctSchedule, currentDate, openTime, closeTime, slotDuration]); // Dependencias correctas

  // ✅ ESPERAR A QUE LA INICIALIZACIÓN ESTÉ COMPLETA
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-2">Inicializando clínicas...</span>
      </div>
    );
  }

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
  }, [correctSchedule, currentDate]); // getDayKey es una función estable, no necesita dependencia

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)

  // Filtrar citas para el día actual
  const dayAppointments = appointments.filter((apt) => {
    const isValid = apt.date instanceof Date && !isNaN(apt.date.getTime());
    const matches = isValid && apt.date.toDateString() === currentDate.toDateString();
    if (!isValid) {
      console.warn('[DayView] Invalid date for appointment:', apt.id, apt.date);
    }
    return matches;
  });

  // ✅ AUTO-SCROLL SIMPLE Y DIRECTO - SIN COMPLEJIDAD INNECESARIA
  const hasAutoScrolledRef = useRef(false);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const positionToCurrentTime = useCallback(() => {
    if (!agendaRef.current) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Verificar si estamos en horario de clínica
    if (timeSlots.length === 0) {
      console.log('[DayView] No hay timeSlots configurados, no posicionar');
      hasAutoScrolledRef.current = true;
      return;
    }
    
    const clinicOpenTime = timeSlots[0];
    const clinicCloseTime = timeSlots[timeSlots.length - 1];
    
    if (currentTimeString < clinicOpenTime || currentTimeString > clinicCloseTime) {
      console.log('[DayView] Fuera de horario de clínica, no posicionar');
      hasAutoScrolledRef.current = true;
      return;
    }

    // ✅ BUSCAR HORA ACTUAL CON PRECISIÓN DE 15 MINUTOS
    const roundedMinute = Math.floor(currentMinute / 15) * 15;
    const targetTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
    const targetElement = agendaRef.current.querySelector(`[data-time="${targetTime}"]`);
    
    if (targetElement) {
      // ✅ POSICIONAMIENTO DIRECTO SIN ANIMACIÓN para máxima estabilidad
      targetElement.scrollIntoView({ 
        behavior: 'auto',    // ✅ Sin animación - posicionamiento inmediato
        block: 'center',     // ✅ Centrar verticalmente para mejor UX
        inline: 'nearest'    // ✅ Sin scroll horizontal
      });
     
      console.log('[DayView] 📍 AUTO-SCROLL DIRECTO en:', targetTime);
    } else {
      // ✅ FALLBACK: Buscar la hora más cercana
      const hourElements = Array.from(agendaRef.current.querySelectorAll('[data-time]'));
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      let closestElement: Element | null = null;
      let closestDiff = Infinity;
      
      for (const element of hourElements) {
        const timeAttribute = element.getAttribute('data-time');
        if (!timeAttribute) continue;
        
        const [elementHour, elementMinute] = timeAttribute.split(':').map(Number);
        const elementTotalMinutes = elementHour * 60 + elementMinute;
        const diff = Math.abs(elementTotalMinutes - currentTotalMinutes);
        
        if (diff < closestDiff) {
          closestDiff = diff;
          closestElement = element;
        }
      }
      
      if (closestElement) {
        closestElement.scrollIntoView({ 
          behavior: 'auto', 
          block: 'center', 
          inline: 'nearest' 
        });
        console.log('[DayView] 📍 AUTO-SCROLL DIRECTO en hora más cercana');
      }
    }
    
    // ✅ MARCAR COMO COMPLETADO
    hasAutoScrolledRef.current = true;
  }, [timeSlots]);

  // ✅ CÁLCULO DE POSICIÓN INICIAL PARA RENDERIZADO DIRECTO
  const calculateInitialScrollPosition = useCallback(() => {
    if (timeSlots.length === 0) return 0;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const clinicOpenTime = timeSlots[0];
    const clinicCloseTime = timeSlots[timeSlots.length - 1];
    
    // Si está fuera de horario, posicionar al inicio
    if (currentTimeString < clinicOpenTime || currentTimeString > clinicCloseTime) {
      return 0;
    }

    // Calcular posición basada en la hora actual
    const roundedMinute = Math.floor(currentMinute / 15) * 15;
    const targetTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
    
    // Encontrar el índice del slot de tiempo objetivo
    const targetIndex = timeSlots.findIndex(slot => slot === targetTime);
    
    if (targetIndex !== -1) {
      // Calcular posición aproximada (altura de fila * índice) - centrar en viewport
      const rowHeight = 40; // Altura estándar de fila
      const targetPosition = targetIndex * rowHeight;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
      
      // Centrar la posición objetivo en el viewport
      return Math.max(0, targetPosition - (viewportHeight / 2));
    }
    
    return 0;
  }, [timeSlots]);

  // ✅ POSICIONAMIENTO INICIAL DIRECTO - SIN DELAY NI AUTO-SCROLL POSTERIOR
  useEffect(() => {
    if (!timeSlots.length || hasAutoScrolledRef.current) return;
    
    // ✅ POSICIONAMIENTO INMEDIATO EN EL PRIMER RENDERIZADO
    const initialPosition = calculateInitialScrollPosition();
    
    if (agendaRef.current && initialPosition > 0) {
      // ✅ ESTABLECER POSICIÓN INICIAL INMEDIATAMENTE SIN ANIMACIÓN
      agendaRef.current.scrollTop = initialPosition;
      console.log('[DayView] 📍 POSICIONAMIENTO INICIAL DIRECTO en posición:', initialPosition);
    }
    
    // ✅ SI NECESITAMOS PRECISIÓN PERFECTA, USAMOS requestAnimationFrame PARA EL SIGUIENTE FRAME
    requestAnimationFrame(() => {
      if (agendaRef.current && !hasAutoScrolledRef.current) {
        positionToCurrentTime();
      }
    });
    
    hasAutoScrolledRef.current = true;
  }, [currentDate, activeClinic?.id, timeSlots, calculateInitialScrollPosition, positionToCurrentTime]);
  
  // ✅ RESETEAR auto-scroll cuando cambie la clínica o el día
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [activeClinic?.id, currentDate]);

  // console.log('[DayView] Filtering appointments:', { // Log optimizado
  //   currentDate: currentDate,
  //   currentDateString: currentDate.toDateString(),
  //   currentDateISO: currentDate.toISOString(),
  //   totalAppointments: appointments.length,
  //   filteredAppointments: dayAppointments.length,
  //   appointmentDates: appointments.map(apt => ({
  //     id: apt.id,
  //     date: apt.date,
  //     dateType: typeof apt.date,
  //     isValidDate: apt.date instanceof Date,
  //     dateString: apt.date instanceof Date ? apt.date.toDateString() : 'INVALID',
  //     matches: apt.date instanceof Date ? apt.date.toDateString() === currentDate.toDateString() : false
  //   }))
  // });

  // Corregir: findOverrideForCell debe esperar string para cabinId
  const findOverrideForCell = (currentViewDate: Date, timeSlot: string, cabinId: string, overrides: CabinScheduleOverride[], clinicId?: string): CabinScheduleOverride | null => {
    if (!overrides || overrides.length === 0 || !clinicId) {
      return null;
    }
    
    return overrides.find(override => {
      const overrideDate = new Date(override.startDate);
      return isSameDay(overrideDate, currentViewDate) &&
        override.startTime <= timeSlot &&
        override.endTime > timeSlot &&
        String(override.clinicId) === clinicId &&
        override.cabinIds.includes(cabinId);
    }) || null;
  };

  // Función helper para encontrar la siguiente cita en la misma sala
  const findNextAppointmentInRoom = (currentAppointment: any, roomId: string): { startTime: string; startMinutes: number } | null => {
    const [currentHour, currentMinute] = currentAppointment.startTime.split(':').map(Number);
    const currentStartMinutes = currentHour * 60 + currentMinute;
    
    // Filtrar citas de la misma sala que empiecen después de la actual
    const laterAppointments = dayAppointments.filter(apt => 
      apt.id !== currentAppointment.id && 
      String(apt.roomId) === String(roomId)
    ).map(apt => {
      const [aptHour, aptMinute] = apt.startTime.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      return { ...apt, startMinutes: aptStartMinutes };
    }).filter(apt => apt.startMinutes > currentStartMinutes);
    
    // Ordenar por hora de inicio y devolver la primera (más cercana)
    if (laterAppointments.length > 0) {
      laterAppointments.sort((a, b) => a.startMinutes - b.startMinutes);
      return {
        startTime: laterAppointments[0].startTime,
        startMinutes: laterAppointments[0].startMinutes
      };
    }
    
    return null;
  };

  // Agregar un manejador para el clic en una cita existente
  const handleAppointmentClick = (appointment: Appointment) => {
    console.log("Cita seleccionada para edición:", appointment)
    
    setSelectedAppointment(appointment)
    
    // Configurar los datos necesarios para editar la cita
    const personForModal: Person = { 
        id: appointment.personId || "", // Asumir que Appointment tiene personId
        firstName: appointment.name.split(' ')[0],
        lastName: appointment.name.split(' ').slice(1).join(' '),
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

  // Handler para cuando se hace click en el nombre del cliente en el tooltip
  const handleClientNameClick = (appointment: Appointment) => {
    console.log("Click en nombre del cliente, abriendo resumen:", appointment)
    
    // Crear el objeto Person con los datos del appointment
    const personForQuickView: Person = { 
        id: appointment.personId || "",
        firstName: appointment.name.split(' ')[0],
        lastName: appointment.name.split(' ').slice(1).join(' '),
        phone: appointment.phone || "",
        email: null,
        address: null,
        city: null,
        postalCode: null
    };
    
    // Configurar el cliente para el quick view
    setSelectedClientForQuickView(personForQuickView)
    
    // Abrir solo el ClientQuickViewDialog
    setIsClientQuickViewOpen(true)
  }

  // Funciones para manejar citas
  const handleCellClick = (date: Date, time: string, roomId: string) => {
    console.log(`Celda clickeada: ${format(date, 'yyyy-MM-dd')} ${time}, Cabina: ${roomId}`);
    
    // Verificar si estamos en proceso de resize para evitar abrir el modal
    if (document.body.dataset.resizing === 'true') {
      console.log('Evitando apertura de modal durante resize');
      return;
    }
    
    // ✅ BLOQUEAR CREACIÓN DE NUEVAS CITAS SI HAY UNA CITA EN MOVIMIENTO
    if (appointmentInMovement) {
      console.log('[DayView] 🚫 Bloqueando creación de nueva cita - hay una cita en movimiento');
      return;
    }
    
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

  const handleSaveAppointment = useCallback(
    async (appointmentData: {
      id?: string; 
      clinicId: string;
      professionalId: string;
      personId: string;
      date: string;
      startTime: string;
      endTime: string;
      services: string[];
      selectedServicesData?: any[]; // ✅ AÑADIR selectedServicesData para renderizado optimista
      notes?: string;
      roomId: string;
      tags?: string[];
      estimatedDurationMinutes: number;
      durationMinutes: number;
      hasExtension: boolean;
      extensionMinutes: number;
    }) => {
      const isUpdate = !!appointmentData.id;
      
      try {
        // ✅ RENDERIZADO OPTIMISTA INMEDIATO ANTES DE API - SINCRONIZADO CON WEEKLY-AGENDA
        if (!isUpdate) {
          // ✅ NUEVA CITA: RENDERIZADO OPTIMISTA GLOBAL INMEDIATO - ANTES de llamar API
          console.log('[DayView] 🚀 RENDERIZADO OPTIMISTA GLOBAL - Creando cita inmediatamente');
          
          // ✅ CREAR CITA OPTIMISTA CON DATOS REALES DEL MODAL (misma lógica que weekly-agenda)
          const tempId = `temp-${Date.now()}`;
          
          // ✅ OBTENER NOMBRE DEL CLIENTE CORRECTAMENTE
          let clientName = 'Cliente'; // Fallback por defecto
          
          if (selectedPerson) {
            clientName = `${selectedPerson.firstName} ${selectedPerson.lastName}`;
            console.log('[DayView] 👤 Cliente desde estado:', clientName);
          }
          
          // Crear fechas desde los datos del modal
          const appointmentDate = new Date(appointmentData.date);
          const [startHours, startMinutes] = appointmentData.startTime.split(':').map(Number);
          const [endHours, endMinutes] = appointmentData.endTime.split(':').map(Number);
          
          const startDateTime = new Date(appointmentDate);
          startDateTime.setHours(startHours, startMinutes, 0, 0);
          
          const endDateTime = new Date(appointmentDate);
          endDateTime.setHours(endHours, endMinutes, 0, 0);
          
          // ✅ USAR SERVICIOS REALES del modal para color optimista
          const realServicesData = appointmentData.selectedServicesData || [];
          console.log('[DayView] 🎨 Servicios para color optimista:', realServicesData);
          
          // ✅ CONVERTIR SERVICIOS CON ESTRUCTURA IDÉNTICA A LA API FINAL
          const optimisticServices = realServicesData.map((service: any) => ({
            id: `temp-service-${Date.now()}-${service.id}`,
            appointmentId: tempId,
            serviceId: service.id,
            quantity: 1,
            status: 'SCHEDULED',
            service: {
              id: service.id,
              name: service.name,
              colorCode: service.color || '#8B5CF6',
              categoryId: service.category || 'default',
              durationMinutes: service.duration || 15,
              price: service.price || 0
            }
          }));
          
          // ✅ CALCULAR COLOR REAL (misma lógica que weekly-agenda)
          let appointmentColor = '#9CA3AF';
          if (optimisticServices.length > 0) {
            const serviceTypes = new Set(optimisticServices.map((s: any) => s.service?.categoryId));
            const uniqueColors = new Set(optimisticServices.map((s: any) => s.service?.colorCode).filter(Boolean));
            
            if (serviceTypes.size === 1 && uniqueColors.size === 1) {
              const firstColor = Array.from(uniqueColors)[0] as string;
              appointmentColor = firstColor || appointmentColor;
            } else {
              const cabin = activeCabins.find(c => c.id === appointmentData.roomId);
              appointmentColor = cabin?.color || appointmentColor;
            }
          } else {
            // Sin servicios - usar color de cabina
            const cabin = activeCabins.find(c => c.id === appointmentData.roomId);
            if (cabin?.color) {
              appointmentColor = cabin.color;
              console.log('[DayView] 🎨 Optimista - Color de cabina (sin servicios):', appointmentColor);
            }
          }
          
          // ✅ CREAR CITA OPTIMISTA COMPLETA
          const optimisticAppointment = {
            id: tempId,
            name: clientName,
            service: optimisticServices.map((s: any) => s.service?.name).filter(Boolean).join(", ") || realServicesData.map((s: any) => s.name).join(", ") || 'Servicios seleccionados',
            date: startDateTime,
            roomId: appointmentData.roomId,
            startTime: format(startDateTime, 'HH:mm'),
            endTime: format(endDateTime, 'HH:mm'),
            duration: Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)),
            color: appointmentColor,
            phone: selectedPerson?.phone || '',
            services: optimisticServices,
            tags: appointmentData.tags || [],
            notes: appointmentData.notes || '',
            personId: appointmentData.personId || selectedPerson?.id || '',
          };
          
          console.log('[DayView] 🎨 Cita optimista completa creada:', {
            id: optimisticAppointment.id,
            name: optimisticAppointment.name,
            service: optimisticAppointment.service,
            color: optimisticAppointment.color,
            duration: optimisticAppointment.duration
          });
          
          // ✅ USAR SISTEMA OPTIMISTA GLOBAL - VISIBLE EN AMBAS VISTAS
          addOptimisticAppointment(optimisticAppointment);
          console.log('[DayView] ✅ Cita optimista añadida al CACHE GLOBAL');
          
        } else if (isUpdate) {
          console.log('[DayView] 🚀 RENDERIZADO OPTIMISTA INMEDIATO - Actualizando cita antes de API');
          
          if (appointmentData.id) {
            // Buscar la cita actual en appointments para preservar datos
            const currentAppointment = appointments.find(apt => apt.id === appointmentData.id);
            if (currentAppointment) {
              // ✅ DETERMINAR QUÉ CAMPOS ACTUALIZAR SEGÚN LO QUE CAMBIÓ (misma lógica que weekly-agenda)
              const updateFields: any = {};
              
              // ✅ DEBUG (solo si es necesario):
              // console.log('[DayView] 🔍 Datos del modal para optimista:', appointmentData);
              // console.log('[DayView] 🔍 Cita actual en cache:', currentAppointment);
              
              // ✅ SIEMPRE actualizar tags si están presentes
              if (appointmentData.tags !== undefined) {
                updateFields.tags = appointmentData.tags;
              }
              
              // ✅ SIMPLIFICAR RENDERIZADO OPTIMISTA DE DURACIÓN - LÓGICA DIRECTA Y CONFIABLE
              console.log('[DayView] 🔧 Analizando cambios para renderizado optimista:', {
                hasServices: appointmentData.services && appointmentData.services.length > 0,
                hasDurationMinutes: !!appointmentData.durationMinutes,
                hasEndTime: !!appointmentData.endTime,
                durationMinutes: appointmentData.durationMinutes,
                endTime: appointmentData.endTime
              });
              
              // ✅ PRIORIDAD 1: CAMBIOS DE SERVICIOS (calcular duración desde servicios)
              const servicesChanged = appointmentData.services && appointmentData.services.length > 0;
              
              // ✅ DEBUG: Verificar renderizado optimista (logs removidos)
              
              if (servicesChanged) {
                console.log('[DayView] 🔧 CAMBIOS DE SERVICIOS - Calculando duración optimista');
                
                // ✅ OBTENER DATOS COMPLETOS DE SERVICIOS desde selectedServicesData
                const realServicesData = appointmentData.selectedServicesData || [];
                
                // ✅ CONVERTIR SERVICIOS CON ESTRUCTURA IDÉNTICA A LA API FINAL
                const optimisticServices = realServicesData.map((service: any) => ({
                  id: `temp-service-${Date.now()}-${service.id}`,
                  appointmentId: currentAppointment.id,
                  serviceId: service.id,
                  quantity: 1,
                  status: 'SCHEDULED',
                  service: {
                    id: service.id,
                    name: service.name,
                    colorCode: service.color || '#8B5CF6',
                    categoryId: service.category || 'default',
                    durationMinutes: service.duration || 15,
                    price: service.price || 0
                  }
                }));
                
                // ✅ CALCULAR NUEVA DURACIÓN TOTAL desde servicios reales
                const newTotalDuration = optimisticServices.reduce((total: number, service: any) => {
                  const serviceDuration = service.service?.durationMinutes || 15;
                  return total + serviceDuration;
                }, 0);
                
                // ✅ CALCULAR COLOR REAL
                let newColor = '#9CA3AF';
                if (optimisticServices.length > 0) {
                  const serviceTypes = new Set(optimisticServices.map((s: any) => s.service?.categoryId));
                  const uniqueColors = new Set(optimisticServices.map((s: any) => s.service?.colorCode).filter(Boolean));
                  
                  if (serviceTypes.size === 1 && uniqueColors.size === 1) {
                    const firstColor = Array.from(uniqueColors)[0] as string;
                    newColor = firstColor || newColor;
                  } else {
                    const cabin = activeCabins.find(c => c.id === currentAppointment.roomId);
                    newColor = cabin?.color || newColor;
                  }
                }
                
                // ✅ TEXTO REAL con nombres de servicios
                const newServiceText = optimisticServices.map((s: any) => s.service?.name).filter(Boolean).join(", ") || 'Sin servicio';
                
                // ✅ RECALCULAR ENDTIME basándose en nueva duración
                const currentStartTime = currentAppointment.startTime;
                const [startHours, startMinutes] = currentStartTime.split(':').map(Number);
                const startTotalMinutes = startHours * 60 + startMinutes;
                const endTotalMinutes = startTotalMinutes + newTotalDuration;
                const endHours = Math.floor(endTotalMinutes / 60);
                const endMins = endTotalMinutes % 60;
                const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                
                // ✅ ACTUALIZAR CAMPOS INMEDIATAMENTE
                updateFields.services = optimisticServices;
                updateFields.service = newServiceText;
                updateFields.color = newColor;
                updateFields.durationMinutes = newTotalDuration; // ✅ CORREGIDO: durationMinutes para useWeeklyAgendaData
                updateFields.duration = newTotalDuration; // ✅ CRÍTICO: Nueva duración para altura visual
                updateFields.endTime = newEndTime;
                
                console.log('[DayView] ✅ SERVICIOS: Duración actualizada optimísticamente:', {
                  oldDuration: currentAppointment.duration,
                  newDuration: newTotalDuration,
                  oldEndTime: currentAppointment.endTime,
                  newEndTime: newEndTime
                });
              }
              // ✅ PRIORIDAD 2: CAMBIOS DIRECTOS DE DURACIÓN (modal de edición sin cambios de servicios)
              else if (appointmentData.durationMinutes || appointmentData.endTime) {
                console.log('[DayView] 🕐 CAMBIOS DE DURACIÓN - Actualizando desde modal');
                
                if (appointmentData.durationMinutes) {
                  // ✅ USAR DURACIÓN DIRECTA DEL MODAL
                  updateFields.durationMinutes = appointmentData.durationMinutes; // ✅ CORREGIDO: durationMinutes para useWeeklyAgendaData
                  updateFields.duration = appointmentData.durationMinutes;
                  
                  // ✅ RECALCULAR ENDTIME desde duración
                  if (appointmentData.endTime) {
                    updateFields.endTime = appointmentData.endTime;
                  } else {
                    const currentStartTime = currentAppointment.startTime;
                    const [startHours, startMinutes] = currentStartTime.split(':').map(Number);
                    const startTotalMinutes = startHours * 60 + startMinutes;
                    const endTotalMinutes = startTotalMinutes + appointmentData.durationMinutes;
                    const endHours = Math.floor(endTotalMinutes / 60);
                    const endMins = endTotalMinutes % 60;
                    const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                    updateFields.endTime = newEndTime;
                  }
                  
                  console.log('[DayView] ✅ DURACIÓN: Actualizada optimísticamente:', {
                    oldDuration: currentAppointment.duration,
                    newDuration: appointmentData.durationMinutes,
                    oldEndTime: currentAppointment.endTime,
                    newEndTime: updateFields.endTime
                  });
                } else if (appointmentData.endTime && appointmentData.endTime !== currentAppointment.endTime) {
                  // ✅ CALCULAR DURACIÓN desde endTime
                  const currentStartTime = currentAppointment.startTime;
                  const [startHours, startMinutes] = currentStartTime.split(':').map(Number);
                  const [endHours, endMinutes] = appointmentData.endTime.split(':').map(Number);
                  const startTotalMinutes = startHours * 60 + startMinutes;
                  const endTotalMinutes = endHours * 60 + endMinutes;
                  const calculatedDuration = endTotalMinutes - startTotalMinutes;
                  
                  updateFields.durationMinutes = calculatedDuration > 0 ? calculatedDuration : currentAppointment.duration; // ✅ CORREGIDO: durationMinutes para useWeeklyAgendaData
                  updateFields.duration = calculatedDuration > 0 ? calculatedDuration : currentAppointment.duration;
                  updateFields.endTime = appointmentData.endTime;
                  
                  console.log('[DayView] ✅ ENDTIME: Duración calculada optimísticamente:', {
                    oldDuration: currentAppointment.duration,
                    newDuration: updateFields.duration,
                    oldEndTime: currentAppointment.endTime,
                    newEndTime: appointmentData.endTime
                  });
                }
              }
              
              // ✅ PROTECCIÓN: NO actualizar startTime ni date - preservar campos críticos
              // Estos campos son críticos para el procesamiento de fechas en use-weekly-agenda-data.ts
              // Solo actualizar campos que realmente sabemos que han cambiado correctamente
              
              // ✅ APLICAR SOLO LOS CAMPOS QUE REALMENTE CAMBIARON
              if (Object.keys(updateFields).length > 0) {
                updateOptimisticAppointment(appointmentData.id, updateFields);
                
                console.log('[DayView] ✅ Cambios optimistas aplicados inmediatamente:', {
                  appointmentId: appointmentData.id,
                  fieldsUpdated: Object.keys(updateFields),
                  tags: appointmentData.tags,
                  durationChanged: !!updateFields.duration,
                  durationMinutesInUpdateFields: (updateFields as any).durationMinutes, // ✅ AÑADIR NUEVO CAMPO
                  updateFields: updateFields
                });
              } else {
                console.log('[DayView] ⚠️ No hay campos para actualizar, saltando renderizado optimista');
              }
            }
          }
        }

        let response;
        
        if (isUpdate) {
          // ✅ PARA UPDATE: Transformar datos al formato de API PUT
          console.log('[DayView] 🔄 Actualizando cita existente:', appointmentData.id);
          
          // Buscar la cita original para preservar campos necesarios
          const originalAppointment = appointments.find(apt => apt.id === appointmentData.id);
          if (!originalAppointment) {
            throw new Error('No se encontró la cita original para actualizar');
          }
          
          // Construir payload para API PUT usando datos correctos del modal
          const updatePayload = {
            id: appointmentData.id,
            date: appointmentData.date,
            startTime: appointmentData.startTime,
            endTime: appointmentData.endTime,
            roomId: appointmentData.roomId,
            durationMinutes: appointmentData.durationMinutes,
            services: appointmentData.services || [],
            tags: appointmentData.tags || [],
            notes: appointmentData.notes || ''
          };
          
          console.log('[DayView] 📤 Enviando a API PUT:', updatePayload);
          
          response = await fetch('/api/appointments', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          });
        } else {
          // ✅ PARA CREATE: Usar datos originales del modal
          console.log('[DayView] ➕ Creando nueva cita');
          
          response = await fetch('/api/appointments', {
            method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentData),
        });
        }

        if (!response.ok) {
          let errorDetails: any = {};
          try {
            errorDetails = await response.json();
          } catch (parseError) {
            errorDetails = { 
              status: response.status, 
              statusText: response.statusText,
              message: 'Error parsing API response' 
            };
          }
          
          console.error('[DayView] ❌ API ERROR:', {
            status: response.status,
            statusText: response.statusText,
            errorDetails,
            appointmentId: appointmentData.id,
            isUpdate
          });
          
          // ✅ REVERTIR CAMBIOS OPTIMISTAS EN CASO DE ERROR
          if (isUpdate && appointmentData.id) {
            console.log('[DayView] 🔄 Revirtiendo cambios optimistas debido a error API');
            await invalidateCache(); // Restaurar estado real
          }
          
          // Crear mensaje de error más descriptivo
          const errorMessage = errorDetails.message || errorDetails.error || 
                              `Error ${response.status}: ${response.statusText}`;
          
          throw new Error(`${isUpdate ? 'Error updating' : 'Error creating'} appointment: ${errorMessage}`);
        }

        const savedAppointment = await response.json();
        
        console.log('[DayView] ✅ API Response recibida exitosamente:', savedAppointment);
        
        // ✅ ACTUALIZAR CACHE CON DATOS REALES DE LA API (tanto CREATE como UPDATE)
        const startTime = new Date(savedAppointment.startTime);
        
        // Determinar el color basado en los servicios reales
        let appointmentColor = '#9CA3AF'; // Color por defecto
        if (savedAppointment.services && savedAppointment.services.length > 0) {
          const serviceTypes = new Set(savedAppointment.services.map((s: any) => s.service?.categoryId));
          const uniqueColors = new Set(savedAppointment.services.map((s: any) => s.service?.colorCode).filter(Boolean));
          
          if (serviceTypes.size === 1 && uniqueColors.size === 1) {
            const firstColor = Array.from(uniqueColors)[0];
            appointmentColor = (typeof firstColor === 'string' ? firstColor : null) || appointmentColor;
          } else if (savedAppointment.equipment?.color) {
            appointmentColor = savedAppointment.equipment.color;
          }
        }
        
        // Obtener los IDs de las etiquetas de la respuesta
        const tagIds = savedAppointment.tags?.map((tagRelation: any) => tagRelation.tagId) || [];
        
        // ✅ CONVERTIR DATOS REALES AL FORMATO ESPERADO
        const realAppointmentData = {
          id: savedAppointment.id,
          name: `${savedAppointment.person.firstName} ${savedAppointment.person.lastName}`,
          service: savedAppointment.services.map((s: any) => s.service.name).join(", ") || 'Sin servicio',
          startTime: format(startTime, 'HH:mm'),
          endTime: format(new Date(savedAppointment.endTime), 'HH:mm'),
          date: startTime,
          duration: Math.ceil((new Date(savedAppointment.endTime).getTime() - startTime.getTime()) / (1000 * 60)),
          roomId: savedAppointment.roomId || savedAppointment.equipment?.id || selectedSlot?.roomId || 'default',
          color: appointmentColor,
          phone: savedAppointment.person.phone || '',
          services: savedAppointment.services || [],
          tags: tagIds,
          personId: savedAppointment.person.id || ''
        };
        
        if (isUpdate) {
          // ✅ ACTUALIZAR CON DATOS REALES DE LA API
          console.log('[DayView] 🔄 Actualizando cache con datos reales de la API:', realAppointmentData);
          updateOptimisticAppointment(savedAppointment.id, realAppointmentData);
        } else {
          // ✅ CREAR CON DATOS REALES DE LA API
          console.log('[DayView] ➕ Añadiendo nueva cita con datos reales de la API:', realAppointmentData);
          addOptimisticAppointment(realAppointmentData);
        }
        
        console.log('[DayView handleSaveAppointment] ✅ Cita guardada y actualizada con datos reales');
        
      } catch (error) {
        console.error('[DayView] Error al guardar cita:', error);
        
        // ✅ REVERTIR CAMBIOS OPTIMISTAS EN CASO DE ERROR
        if (isUpdate && appointmentData.id) {
          console.log('[DayView] ❌ Error API - Revirtiendo cambios optimistas');
          await invalidateCache(); // Restaurar estado real
        }
        
        // TODO: Mostrar mensaje de error al usuario
        // ✅ Solo en caso de error, invalidar para restaurar estado correcto
        await invalidateCache();
      }
    },
    [addOptimisticAppointment, updateOptimisticAppointment, invalidateCache, selectedSlot, appointments]
  );

  const handleAppointmentResize = (id: string, newDuration: number) => {
    // Esta función ya no es necesaria con el nuevo componente sin redimensionamiento
    // Podemos mantenerla vacía o modificarla para cambiar la duración de otra manera
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
  }

  // Helper para convertir Date a timestamp en zona horaria de la clínica
  const formatDateForAPI = useCallback((date: Date, clinicTimezone?: string) => {
    const timezone = clinicTimezone || 
                    (activeClinic as any)?.countryInfo?.timezone || 
                    (activeClinic as any)?.country?.timezone || 
                    Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Crear formatter con zona horaria de la clínica
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Formatear y convertir a ISO con zona horaria
    const parts = formatter.formatToParts(date);
    const formattedDate = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    const formattedTime = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    
    // Construir timestamp en zona horaria local de clínica
    const localDateTime = new Date(`${formattedDate}T${formattedTime}`);
    return localDateTime.toISOString(); // Ahora sí representa la hora local de la clínica
  }, [activeClinic]);

  // Función para detectar conflictos con otras citas
  const findAvailableSlot = useCallback((
    targetDate: Date,
    targetTime: string,
    duration: number,
    roomId: string,
    excludeAppointmentId?: string
  ) => {
    // Filtrar citas del mismo día y sala
    const roomAppointments = dayAppointments.filter(apt => 
      apt.id !== excludeAppointmentId && 
      String(apt.roomId) === String(roomId)
    ).sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Convertir tiempo objetivo a minutos
    const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
    let targetStartMinutes = targetHours * 60 + targetMinutes;
    let targetEndMinutes = targetStartMinutes + duration;

    // Buscar conflictos
    let hasConflict = false;
    let suggestedTime = targetTime;
    
    for (const apt of roomAppointments) {
      const [aptHours, aptMinutes] = apt.startTime.split(':').map(Number);
      const aptStartMinutes = aptHours * 60 + aptMinutes;
      const aptEndMinutes = aptStartMinutes + apt.duration;

      // Verificar si hay solapamiento
      if (targetStartMinutes < aptEndMinutes && targetEndMinutes > aptStartMinutes) {
        hasConflict = true;
        
        // Sugerir el final de la cita conflictiva
        const newStartMinutes = aptEndMinutes;
        const newHours = Math.floor(newStartMinutes / 60);
        const newMinutes = newStartMinutes % 60;
        
        // Ajustar a la granularidad (15 minutos por defecto)
        const granularity = 15;
        const adjustedMinutes = Math.ceil(newMinutes / granularity) * granularity;
        
        if (adjustedMinutes === 60) {
          suggestedTime = `${String(newHours + 1).padStart(2, '0')}:00`;
        } else {
          suggestedTime = `${String(newHours).padStart(2, '0')}:${String(adjustedMinutes).padStart(2, '0')}`;
        }
        
        // Actualizar el tiempo objetivo para la siguiente iteración
        const [newTargetHours, newTargetMinutes] = suggestedTime.split(':').map(Number);
        targetStartMinutes = newTargetHours * 60 + newTargetMinutes;
        targetEndMinutes = targetStartMinutes + duration;
      }
    }

    return {
      hasConflict,
      suggestedTime,
      originalTime: targetTime
    };
  }, [dayAppointments]);

  const handleAppointmentDrop = useCallback(async (appointmentId: string, changes: any) => {
    console.log('[DayView handleAppointmentDrop] Iniciando drop:', { appointmentId, changes });
    
    try {
      // Buscar la cita actual
      const appointmentToUpdate = appointments.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[DayView handleAppointmentDrop] No se encontró la cita:', appointmentId);
        return;
      }
      
      console.log('[DayView handleAppointmentDrop] Cita encontrada:', appointmentToUpdate);
      
      // SIMPLIFICACIÓN: Usar SIEMPRE la duración REAL de la cita (incluyendo extensiones)
      const finalDuration = appointmentToUpdate.duration;
      console.log('[DayView handleAppointmentDrop] Usando duración REAL de la cita:', finalDuration);
      
      // Transformar los cambios al formato esperado por Appointment
      const transformedChanges: Partial<Appointment> = {};
      
      if (changes.startTime) {
        // Convertir Date a string HH:mm para mostrar
        const newStartTime = new Date(changes.startTime);
        const newStartTimeStr = `${newStartTime.getHours().toString().padStart(2, '0')}:${newStartTime.getMinutes().toString().padStart(2, '0')}`;
        transformedChanges.startTime = newStartTimeStr;
        
        // IMPORTANTE: Calcular y actualizar endTime basándose en la nueva startTime + duración
        const newEndDate = new Date(newStartTime.getTime() + (finalDuration * 60 * 1000));
        const newEndTime = `${newEndDate.getHours().toString().padStart(2, '0')}:${newEndDate.getMinutes().toString().padStart(2, '0')}`;
        transformedChanges.endTime = newEndTime;
        
        console.log('[DayView handleAppointmentDrop] Calculando nuevo endTime:', {
          newStartTimeStr,
          finalDuration,
          newEndTime
        });
      }
      
      if (changes.roomId) {
        // Mapear roomId directamente
        transformedChanges.roomId = changes.roomId;
      }
      
      console.log('[DayView handleAppointmentDrop] Cambios transformados:', transformedChanges);
      
      // Crear una copia actualizada de la cita con los cambios transformados
      const updatedAppointment = {
        ...appointmentToUpdate,
        ...transformedChanges
      };
      
      console.log('[DayView handleAppointmentDrop] Cita actualizada:', updatedAppointment);
      
      // ✅ RENDERIZADO OPTIMISTA GLOBAL - Visible inmediatamente en AMBAS vistas  
      console.log('[DayView handleAppointmentDrop] 🚀 Aplicando cambio optimista global...', {
        appointmentId,
        appointmentCompleto: updatedAppointment
      });
      
      // ✅ PASAR LA CITA COMPLETA CON CAMBIOS en lugar de solo los cambios
      updateOptimisticAppointment(appointmentId, updatedAppointment);
      
      // Preparar datos para la API
      const apiData = {
        id: appointmentToUpdate.id, // Añadir el ID de la cita
        date: format(appointmentToUpdate.date, 'yyyy-MM-dd'), // Convertir Date a string YYYY-MM-DD
        startTime: changes.startTime || formatDateForAPI(appointmentToUpdate.date), // Usar zona horaria de clínica
        endTime: changes.endTime || formatDateForAPI(new Date(appointmentToUpdate.date.getTime() + (appointmentToUpdate.duration * 60 * 1000))), // Usar zona horaria de clínica
        roomId: changes.roomId || appointmentToUpdate.roomId, // IMPORTANTE: Usar el nuevo roomId si existe
        durationMinutes: changes.durationMinutes || appointmentToUpdate.duration
      };
      
      console.log('[DayView handleAppointmentDrop] Enviando a API:', apiData);
      console.log('[DayView handleAppointmentDrop] Detalles de la cita original:', {
        id: appointmentToUpdate.id,
        date: appointmentToUpdate.date,
        startTime: appointmentToUpdate.startTime,
        duration: appointmentToUpdate.duration,
        roomId: appointmentToUpdate.roomId
      });
      
      // Hacer la llamada a la API para actualizar la cita
      const response = await fetch(
        `/api/appointments`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: appointmentId,
            ...apiData
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al mover la cita');
      }

      console.log('[DayView handleAppointmentDrop] Cita guardada en BD correctamente');
      
      toast({
        title: "Cita actualizada",
        description: "La cita se ha movido correctamente",
      });
    } catch (error) {
      console.error('Error moving appointment:', error);
      
      // Si hay error, invalidar cache para refrescar
      await invalidateCache();
      
      toast({
        title: "Error",
        description: "No se pudo mover la cita",
        variant: "destructive",
      });
    }
  }, [appointments, formatDateForAPI, invalidateCache, toast, updateOptimisticAppointment]);

  const { minuteGranularity } = useGranularity();

  const handleDurationChange = useCallback(async (appointmentId: string, newDuration: number) => {
    console.log('[DayView handleDurationChange] Cambiando duración:', { appointmentId, newDuration });
    
    try {
      // Buscar la cita en el estado local
      const appointmentToUpdate = appointments.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[DayView handleDurationChange] No se encontró la cita:', appointmentId);
        return;
      }

      // Verificar si la nueva duración causa conflictos
      const availableSlot = findAvailableSlot(
        appointmentToUpdate.date,
        appointmentToUpdate.startTime,
        newDuration,
        appointmentToUpdate.roomId,
        appointmentId
      );

      // Si hay conflicto, ajustar la duración para que termine justo antes del conflicto
      let finalDuration = newDuration;
      if (availableSlot.hasConflict) {
        // Calcular la duración máxima permitida
        const [startHours, startMinutes] = appointmentToUpdate.startTime.split(':').map(Number);
        const [conflictHours, conflictMinutes] = availableSlot.suggestedTime.split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const conflictTotalMinutes = conflictHours * 60 + conflictMinutes;
        
        // La duración máxima es hasta el inicio del conflicto
        const maxDuration = conflictTotalMinutes - startTotalMinutes;
        
        if (maxDuration <= 0) {
          // No hay espacio, mantener la duración original
          toast({
            title: "No hay espacio disponible",
            description: "No se puede extender la cita debido a conflictos con otras citas",
            variant: "destructive",
          });
          return;
        }
        
        finalDuration = Math.min(newDuration, maxDuration);
        
        if (finalDuration < newDuration) {
          toast({
            title: "Duración ajustada",
            description: `La cita se limitó a ${finalDuration} minutos para evitar solapamiento`,
            duration: 3000,
          });
        }
      }

      // Calcular la nueva hora de fin basándose en la duración final
      const [hours, minutes] = appointmentToUpdate.startTime.split(':').map(Number);
      const startDate = new Date(appointmentToUpdate.date);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + finalDuration);
      
      const newEndTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      // ✅ RENDERIZADO OPTIMISTA INMEDIATO (igual que WeeklyAgenda)
      console.log('[DayView handleDurationChange] 🚀 Aplicando cambio optimista...');
      updateOptimisticAppointment(appointmentId, {
        durationMinutes: finalDuration, // ✅ CORREGIDO: durationMinutes para useWeeklyAgendaData
        duration: finalDuration,
        endTime: newEndTime
      });

      // Preparar datos para la API
      const apiData = {
        date: format(appointmentToUpdate.date, 'yyyy-MM-dd'), // Convertir Date a string YYYY-MM-DD
        startTime: formatDateForAPI(appointmentToUpdate.date), // Usar zona horaria de clínica
        endTime: formatDateForAPI(new Date(appointmentToUpdate.date.getTime() + (finalDuration * 60 * 1000))), // Usar zona horaria de clínica
        roomId: appointmentToUpdate.roomId,
        durationMinutes: finalDuration
      };

      console.log('[DayView handleDurationChange] Enviando a API:', apiData);

      // Actualizar en la base de datos
      const response = await fetch(
        `/api/appointments`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: appointmentId,
            ...apiData
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al actualizar la duración de la cita');
      }

      console.log('[DayView handleDurationChange] Duración actualizada correctamente');
      
      if (!availableSlot.hasConflict) {
        toast({
          title: "Duración actualizada",
          description: `La cita ahora dura ${finalDuration} minutos`,
        });
      }
      
    } catch (error) {
      console.error('[DayView handleDurationChange] Error:', error);
      
      // Si hay error, invalidar cache para refrescar
      await invalidateCache();
      
      toast({
        title: "Error",
        description: "No se pudo actualizar la duración de la cita",
        variant: "destructive",
      });
    }
  }, [appointments, formatDateForAPI, findAvailableSlot, invalidateCache, toast, updateOptimisticAppointment]);

  const handleTimeAdjust = useCallback(async (appointmentId: string, direction: 'up' | 'down') => {
    console.log('[DayView handleTimeAdjust] Ajustando hora:', { appointmentId, direction, minuteGranularity });
    
    try {
      // Buscar la cita en el estado local
      const appointmentToUpdate = appointments.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[DayView handleTimeAdjust] No se encontró la cita:', appointmentId);
        return;
      }

      // Calcular el nuevo horario basándose en la granularidad
      const [hours, minutes] = appointmentToUpdate.startTime.split(':').map(Number);
      const startDate = new Date(appointmentToUpdate.date);
      startDate.setHours(hours, minutes, 0, 0);
      
      // Ajustar según la dirección y granularidad
      const adjustMinutes = direction === 'up' ? -minuteGranularity : minuteGranularity;
      const newStartDate = new Date(startDate.getTime() + adjustMinutes * 60 * 1000);
      
      // Validar que no se salga del horario de la clínica
      const newHours = newStartDate.getHours();
      const newMinutes = newStartDate.getMinutes();
      const newStartTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;

      // ✅ No hacer update optimista, confiar en la invalidación

      // Preparar datos para la API
      const apiData = {
        date: format(newStartDate, 'yyyy-MM-dd'),
        startTime: formatDateForAPI(newStartDate),
        endTime: formatDateForAPI(new Date(newStartDate.getTime() + (appointmentToUpdate.duration * 60 * 1000))),
        roomId: appointmentToUpdate.roomId,
        durationMinutes: appointmentToUpdate.duration
      };

      console.log('[DayView handleTimeAdjust] Enviando a API:', apiData);

      // Actualizar en la base de datos
      const response = await fetch(
        `/api/appointments`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: appointmentId,
            ...apiData
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al ajustar la hora de la cita');
      }

      console.log('[DayView handleTimeAdjust] Hora ajustada correctamente');
      
      toast({
        title: "Hora ajustada",
        description: `La cita se movió ${direction === 'up' ? 'hacia arriba' : 'hacia abajo'} ${minuteGranularity} minutos`,
      });
      
    } catch (error) {
      console.error('[DayView handleTimeAdjust] Error:', error);
      
      // Revertir el cambio en caso de error
      await invalidateCache();
      
      toast({
        title: "Error",
        description: "No se pudo ajustar la hora de la cita",
        variant: "destructive",
      });
    }
  }, [appointments, formatDateForAPI, invalidateCache, toast, minuteGranularity]);

  // Hook de drag & drop optimizado
  const {
    dragState: localDragState,
    handleDragStart,
    handleDragEnd,
    updateMousePosition,
    updateCurrentPosition,
    updateDragDirection
  } = useOptimizedDragAndDrop(handleAppointmentDrop);

  // Handlers para el drag en las celdas
  const handleCellDragOver = useCallback((
    e: React.DragEvent,
    day: Date,
    time: string,
    roomId: string
  ) => {
    e.preventDefault();
    
    // Si hay una cita siendo arrastrada, verificar conflictos
    if (localDragState.draggedItem) {
      const availableSlot = findAvailableSlot(
        day,
        time,
        localDragState.draggedItem.duration || 60,
        roomId,
        localDragState.draggedItem.id
      );
      
      // Usar el tiempo ajustado para la preview
      const adjustedTime = availableSlot.hasConflict ? availableSlot.suggestedTime : time;
      updateCurrentPosition(day, adjustedTime, roomId);
    } else {
      updateCurrentPosition(day, time, roomId);
    }
  }, [updateCurrentPosition, localDragState.draggedItem, findAvailableSlot]);

  const handleCellDrop = useCallback((
    e: React.DragEvent,
    day: Date,
    time: string,
    roomId: string
  ) => {
    e.preventDefault();
    
    if (!localDragState.draggedItem || !localDragState.originalPosition) return;
    
    // Verificar si hay conflictos y obtener el slot disponible
    const availableSlot = findAvailableSlot(
      day,
      time,
      localDragState.draggedItem.duration || 60, // Duración por defecto 60 minutos
      roomId,
      localDragState.draggedItem.id
    );
    
    // Usar el tiempo sugerido si hay conflicto
    const finalTime = availableSlot.hasConflict ? availableSlot.suggestedTime : time;
    
    // Verificar si algo cambió
    const hasChanged = 
      localDragState.originalPosition.date.toDateString() !== day.toDateString() ||
      localDragState.originalPosition.time !== finalTime ||
      localDragState.originalPosition.roomId !== roomId;
    
    if (hasChanged) {
      const changes: any = {};
      
      if (localDragState.originalPosition.date.toDateString() !== day.toDateString() || 
          localDragState.originalPosition.time !== finalTime) {
        const [hours, minutes] = finalTime.split(':').map(Number);
        const newStartTime = new Date(day);
        newStartTime.setHours(hours, minutes, 0, 0);
        changes.startTime = newStartTime.toISOString(); // Convertir Date a ISO string para timestamptz
      }
      
      if (localDragState.originalPosition.roomId !== roomId) {
        changes.roomId = roomId; // SIEMPRE usar roomId para cabinas, nunca equipmentId
      }
      
      // Si hubo conflicto, mostrar un toast informativo
      if (availableSlot.hasConflict) {
        toast({
          title: "Cita ajustada automáticamente",
          description: `La cita se movió a las ${finalTime} para evitar solapamiento`,
          duration: 3000,
        });
      }
      
      handleAppointmentDrop(localDragState.draggedItem.id, changes);
    }
    
    handleDragEnd();
  }, [localDragState, handleAppointmentDrop, handleDragEnd, findAvailableSlot, toast]);

  // Handler para cuando se empieza a arrastrar una cita
  const handleAppointmentDragStart = useCallback((
    e: React.DragEvent,
    appointment: Appointment,
    initialOffsetMinutes?: number
  ) => {
    console.log('[DayView handleAppointmentDragStart] Iniciando drag:', appointment);
    e.dataTransfer.effectAllowed = 'move';
    
    // Calcular endTime a partir de startTime y duration
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    const startDate = new Date(appointment.date);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + appointment.duration);
    
    const endTime = endDate.toISOString(); // Convertir Date a ISO string para timestamptz

    const dragItem: DragItem = {
      id: appointment.id,
      title: appointment.name,
      startTime: appointment.date.toISOString(), // Convertir Date a ISO string para timestamptz
      endTime: endTime,
      duration: appointment.duration,
      roomId: appointment.roomId,
      color: appointment.color || '#3B82F6',
      personId: appointment.personId || '',
      currentDate: appointment.date,
      services: appointment.service ? [{ name: appointment.service }] : []
    };
    
    console.log('[DayView handleAppointmentDragStart] DragItem creado:', dragItem);
    handleDragStart(e, dragItem, initialOffsetMinutes);
    console.log('[DayView handleAppointmentDragStart] handleDragStart llamado');
  }, [handleDragStart]);

  // Función para obtener las citas de una celda específica
  const getAppointmentsForCell = useCallback((day: Date, time: string, roomId: string) => {
    // ✅ NUEVO: Solo mostrar citas cuando los datos estén estables para evitar "flash" de citas incorrectas
    if (!isDataStable) {
      return []; // Devolver array vacío hasta que los datos estén completamente estables
    }
    
    return dayAppointments.filter(apt => {
      // Comparar si la cita empieza dentro de este slot de tiempo
      const [slotHours, slotMinutes] = time.split(':').map(Number);
      const slotStartMinutes = slotHours * 60 + slotMinutes;
      const slotEndMinutes = slotStartMinutes + slotDuration;
      
      const [aptHours, aptMinutes] = apt.startTime.split(':').map(Number);
      const aptStartMinutes = aptHours * 60 + aptMinutes;
      
      // La cita pertenece a este slot si:
      // 1. Empieza dentro del slot
      // 2. O si ya empezó antes pero continúa en este slot
      const startsInSlot = aptStartMinutes >= slotStartMinutes && aptStartMinutes < slotEndMinutes;
      const continuesInSlot = aptStartMinutes < slotStartMinutes && aptStartMinutes + apt.duration > slotStartMinutes;
      
      const timeMatches = startsInSlot || continuesInSlot;
      const roomMatches = String(apt.roomId) === roomId;
      
      return timeMatches && roomMatches;
    });
  }, [dayAppointments, slotDuration, isDataStable]);

  // Añadir un estado para la cita seleccionada
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  
  // Verificar si no hay horario configurado
  if (timeSlots.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-700">
            {t('agenda.noScheduleConfigured.title')}
          </h3>
          <p className="mb-4 text-gray-500">
            {t('agenda.noScheduleConfigured.description')}
          </p>
          <Button
            onClick={() => router.push(`/configuracion/clinicas/${activeClinic.id}?tab=horarios`)}
            className="text-white bg-purple-600 hover:bg-purple-700"
          >
            {t('agenda.noScheduleConfigured.action')}
          </Button>
        </div>
      </div>
    );
  }
  
  // Verificar si no hay cabinas configuradas
  if (!activeCabins || activeCabins.length === 0 || rooms.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-700">
            {t('agenda.noCabinsConfigured.title')}
          </h3>
          <p className="mb-4 text-gray-500">
            {t('agenda.noCabinsConfigured.description')}
          </p>
          <Button
            onClick={() => router.push(`/configuracion/clinicas/${activeClinic.id}?tab=cabinas`)}
            className="text-white bg-purple-600 hover:bg-purple-700"
          >
            {t('agenda.noCabinsConfigured.action')}
          </Button>
        </div>
      </div>
    );
  }

  // Handler para actualizar etiquetas de forma optimista
  const handleTagsUpdate = useCallback(async (appointmentId: string, tagIds: string[]) => {
    console.log('[DayView handleTagsUpdate] 🏷️ Actualizando etiquetas:', { appointmentId, tagIds });
    
    try {
      // ✅ RENDERIZADO OPTIMISTA INMEDIATO - Visible en AMBAS vistas
      console.log('[DayView handleTagsUpdate] 🚀 Aplicando cambio optimista...');
      updateOptimisticTags(appointmentId, tagIds);

      // Llamar a la API para actualizar las etiquetas
      const response = await fetch(`/api/appointments/${appointmentId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagIds })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar etiquetas');
      }

      console.log('[DayView handleTagsUpdate] ✅ Etiquetas actualizadas en API - datos optimistas se actualizarán automáticamente');
      
      // ✅ NO INVALIDAR: Permitir que sistema optimista maneje la transición
      // await invalidateCache(); // ❌ COMENTADO: Esto destruía el efecto optimista inmediato
      
    } catch (error) {
      console.error('[DayView handleTagsUpdate] ❌ Error:', error);
      // ✅ SOLO REVERTIR EN CASO DE ERROR
      await invalidateCache();
    }
  }, [updateOptimisticTags, invalidateCache]);

  const handleMoveAppointment = useCallback((appointmentId: string) => {
    console.log('[DayView] 🚀 Iniciando movimiento de cita:', appointmentId);
    
    // Buscar la cita en el estado local
    const appointmentToMove = dayAppointments.find(app => app.id === appointmentId);
    if (!appointmentToMove) {
      console.error('[DayView] ❌ Cita no encontrada para mover:', appointmentId);
      return;
    }

    console.log('[DayView] ✅ Cita encontrada para mover:', appointmentToMove.name);
    
    // ✅ USAR CONTEXTO DE MOVIMIENTO REAL
    startMovingAppointment({
      ...appointmentToMove,
      color: appointmentToMove.color || '#3B82F6' // Asegurar que color esté presente
    });
    
    console.log('[DayView] 📋 Cita puesta en modo movimiento:', {
      id: appointmentToMove.id,
      name: appointmentToMove.name,
      date: appointmentToMove.date,
      time: appointmentToMove.startTime,
      room: appointmentToMove.roomId,
      duration: appointmentToMove.duration,
      service: appointmentToMove.service
    });
  }, [dayAppointments, startMovingAppointment]);

  const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
    console.log('[handleDeleteAppointment] Eliminar cita:', appointmentId);
    
    try {
      // Confirmar con el usuario
      if (!confirm('¿Está seguro de que desea eliminar esta cita?')) {
        return;
      }

      // Llamar a la API para eliminar
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la cita');
      }

      // ✅ RENDERIZADO OPTIMISTA - Eliminar inmediatamente de AMBAS vistas
      console.log('[DayView handleDeleteAppointment] 🚀 Eliminando de forma optimista...');
      deleteOptimisticAppointment(appointmentId);

      console.log('[DayView handleDeleteAppointment] ✅ Cita eliminada correctamente - refrescando cache...');
      
      // Refrescar cache para sincronizar con API
      await invalidateCache();
    } catch (error) {
      console.error('[handleDeleteAppointment] Error:', error);
      
      // Si hay error, invalidar cache para refrescar
      await invalidateCache();
      
      alert(error instanceof Error ? error.message : 'Error al eliminar la cita');
    }
  }, [deleteOptimisticAppointment, invalidateCache]);

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
      // console.log("[DayView] renderDayGrid - valor de rooms:", JSON.stringify(rooms)); // Log optimizado
      const clinicIdStr = activeClinic?.id ? String(activeClinic.id) : undefined;
      return (
          <div className="overflow-visible relative flex-1 bg-white">
              {/* Cabecera de la tabla (fija) - z-40 para estar sobre granularidades */}
              <div className="grid sticky top-0 z-40 bg-white border-b shadow-sm" 
                   style={{ gridTemplateColumns: `80px repeat(${rooms.length > 0 ? rooms.length : 1}, minmax(100px, 1fr))` }}> 
                  <div className="sticky left-0 z-40 p-2 w-20 text-sm font-medium text-purple-600 bg-white border-r border-b border-gray-200 hour-column">
                    Hora
                  </div>
                  {rooms.length > 0 ? (
                    rooms.map((room) => (
                      <div key={room.id} className="flex justify-center items-center px-2 py-1 h-12 text-xs font-semibold tracking-wide text-center text-white border-r last:border-r-0" style={{ backgroundColor: room.color || '#ccc' }}>
                        {room.name}
                      </div>
                    ))
                  ) : (
                     <div className="flex justify-center items-center px-2 py-1 h-12 text-xs font-semibold tracking-wide text-center text-gray-500 bg-gray-50 border-r last:border-r-0">
                       (Sin cabinas activas)
                     </div>
                  )}
              </div>

              {/* Contenedor scrollable para slots */}
              <div className="relative" ref={agendaRef}>
                  {timeSlots.map((time, timeIndex) => (
                    <div key={time} className="grid border-b" 
                         data-time={time}
                         style={{ gridTemplateColumns: `80px repeat(${rooms.length > 0 ? rooms.length : 1}, minmax(100px, 1fr))`, minHeight: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}>
                      {/* Celda de Hora */}
                      <div 
                        data-time={time}
                        className="sticky left-0 z-20 p-2 w-20 text-sm font-medium text-purple-600 bg-white border-t border-r border-gray-200 hour-column">
                        {time}
                      </div>
                      {/* Celdas de Cabinas */}
                      {rooms.length > 0 ? (
                        rooms.map((room) => {
                          const isAvailable = isTimeSlotAvailable(time);
                          const isBlocked = !!findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr);
                          
                          return (
                            <OptimizedHoverableCell
                              key={`${time}-${room.id}`}
                              day={currentDate}
                              time={time}
                              cabinId={String(room.id)}
                              isAvailable={isAvailable}
                              isInteractive={isAvailable && !isBlocked}
                              isClickable={isAvailable || isBlocked}
                              isStartOfBlock={isBlocked}
                              blockDurationSlots={1}
                              overrideForCell={isBlocked ? findOverrideForCell(currentDate, time, String(room.id), cabinOverrides, clinicIdStr) : null}
                              onCellClick={handleCellClick}
                              onDragOver={handleCellDragOver}
                              onDrop={handleCellDrop}
                              appointments={!isDataStable ? [] : dayAppointments.filter(apt => {
                                // ✅ NUEVO: Solo mostrar citas cuando los datos estén estables para evitar "flash" de citas incorrectas
                                
                                // Verificar si la cita empieza dentro de este slot de tiempo
                                const [slotHours, slotMinutes] = time.split(':').map(Number);
                                const slotStartMinutes = slotHours * 60 + slotMinutes;
                                const slotEndMinutes = slotStartMinutes + slotDuration;
                                
                                const [aptHours, aptMinutes] = apt.startTime.split(':').map(Number);
                                const aptStartMinutes = aptHours * 60 + aptMinutes;
                                const aptEndMinutes = aptStartMinutes + apt.duration;
                                
                                // IMPORTANTE: Solo mostrar la cita en el slot donde EMPIEZA
                                // Esto evita duplicados en slots de continuación
                                const startsInSlot = aptStartMinutes >= slotStartMinutes && aptStartMinutes < slotEndMinutes;
                                const roomMatches = String(apt.roomId) === String(room.id);
                                
                                return startsInSlot && roomMatches;
                              }).map(apt => {
                                // Calcular el offset y la altura visible para toda la cita
                                const [slotHours, slotMinutes] = time.split(':').map(Number);
                                const slotStartMinutes = slotHours * 60 + slotMinutes;
                                
                                const [aptHours, aptMinutes] = apt.startTime.split(':').map(Number);
                                const aptStartMinutes = aptHours * 60 + aptMinutes;
                                
                                // El offset es la diferencia entre el inicio de la cita y el inicio del slot
                                const offsetMinutes = aptStartMinutes - slotStartMinutes;
                                
                                // Encontrar la siguiente cita en la misma sala
                                const nextAppointment = findNextAppointmentInRoom(apt, room.id);
                                
                                // La duración visible es toda la duración de la cita
                                // AppointmentItem se encargará de renderizarla correctamente
                                // incluso si cruza a otros slots
                                return {
                                  ...apt,
                                  offsetMinutes,
                                  visibleDuration: apt.duration, // Duración completa
                                  isContinuation: false,
                                  nextAppointmentInRoom: nextAppointment
                                };
                              })}
                              slotDuration={slotDuration}
                              minuteGranularity={minuteGranularity}
                              moveGranularity={1}
                              active={true}
                              today={isSameDay(currentDate, new Date())}
                              cabinIndex={rooms.indexOf(room)}
                              setSelectedOverride={setSelectedOverride}
                              setIsOverrideModalOpen={setIsBlockModalOpen}
                              hasAppointmentAtPosition={(date, time, roomId, minuteOffset) => {
                                const [hours, minutes] = time.split(':').map(Number)
                                const totalMinutes = hours * 60 + minutes + minuteOffset
                                const checkHours = Math.floor(totalMinutes / 60)
                                const checkMinutes = totalMinutes % 60
                                
                                // Buscar TODAS las citas del día en esa cabina
                                return dayAppointments.some(apt => {
                                  // ✅ EXCLUIR la cita que está siendo arrastrada actualmente
                                  if (localDragState.draggedItem && apt.id === localDragState.draggedItem.id) {
                                    return false; // No contar la cita que se está arrastrando
                                  }
                                  
                                  if (String(apt.roomId) !== roomId) return false
                                  
                                  const aptStart = apt.startTime
                                  const [aptHours, aptMinutes] = aptStart.split(':').map(Number)
                                  const aptStartMinutes = aptHours * 60 + aptMinutes
                                  const aptEndMinutes = aptStartMinutes + apt.duration
                                  
                                  const checkTotalMinutes = checkHours * 60 + checkMinutes
                                  
                                  // Verificar si el punto está dentro del rango de la cita
                                  return checkTotalMinutes >= aptStartMinutes && checkTotalMinutes < aptEndMinutes
                                })
                              }}
                              handleAppointmentClick={handleAppointmentClick}
                              handleAppointmentDragStart={(appointment: any, e?: React.DragEvent, initialOffsetMinutes?: number) => {
                                console.log('[DayView] Drag start triggered:', { appointment, e });
                                if (e) {
                                  handleAppointmentDragStart(e, appointment, initialOffsetMinutes);
                                } else {
                                  console.warn('[DayView] No event provided to drag start');
                                }
                              }}
                              handleDragEnd={handleDragEnd}
                              dragState={localDragState}
                              globalDragState={localDragState}
                              updateCurrentPosition={updateCurrentPosition}
                              updateDragDirection={updateDragDirection}
                              cellHeight={AGENDA_CONFIG.ROW_HEIGHT}
                              isDaily={true}
                              handleAppointmentDrop={handleAppointmentDrop}
                              onDurationChange={handleDurationChange}
                              onTagsUpdate={handleTagsUpdate}
                              onMoveAppointment={handleMoveAppointment}
                              onTimeAdjust={handleTimeAdjust}
                              onClientNameClick={handleClientNameClick}
                            />
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
                  {openTime && closeTime && (
                  <CurrentTimeIndicator
                    key={`indicator-${format(currentDate, 'yyyy-MM-dd')}`}
                    timeSlots={timeSlots}
                    isMobile={false}
                      className="z-30"
                    agendaRef={agendaRef}
                    clinicOpenTime={openTime}
                    clinicCloseTime={closeTime}
                  />
                  )}
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
          className="flex overflow-hidden absolute inset-x-0 top-0 z-20 justify-center items-center p-1 m-px text-xs text-rose-700 rounded-sm border border-rose-300 pointer-events-none bg-rose-200/80"
          style={{ height: `calc(${blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT}px - 2px)` }}
          title={override.description || "Bloqueado"}
        >
          <Lock className="flex-shrink-0 mr-1 w-3 h-3" />
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
        <PersonSearchDialog
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
            setSelectedPerson(null)
            setSelectedSlot(null)
            setShowClientDetailsOnOpen(false)
          }}
          date={selectedSlot?.date || new Date()}
          initialClient={selectedPerson}
          selectedTime={selectedSlot?.time}
          roomId={selectedSlot?.roomId}
          isEditing={!!selectedAppointment}
          existingAppointment={selectedAppointment}
          clinic={{ id: activeClinic?.id?.toString() || '', name: activeClinic?.name || '' }}
          professional={{ id: '', name: '' }}
          onSearchClick={() => {
            setIsAppointmentDialogOpen(false)
            setIsSearchDialogOpen(true)
          }}
          onNewClientClick={() => {
            setIsAppointmentDialogOpen(false)
            setIsNewClientDialogOpen(true)
          }}
          onSaveAppointment={handleSaveAppointment}
          onMoveAppointment={() => {
            // Usar el ID de la cita que se está editando
            if (selectedAppointment?.id) {
              handleMoveAppointment(selectedAppointment.id);
            } else {
              console.error('[DayView] No hay cita seleccionada para mover');
            }
          }}
          showClientDetailsOnOpen={showClientDetailsOnOpen}
        />

        <NewClientDialog 
          isOpen={isNewClientDialogOpen} 
          onClose={() => setIsNewClientDialogOpen(false)} 
        />

        <ClientQuickViewDialog 
          isOpen={isClientQuickViewOpen} 
          onOpenChange={setIsClientQuickViewOpen} 
          client={selectedClientForQuickView} 
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
                toast({
                  title: "Bloqueo guardado",
                  description: "El bloqueo de horario se ha guardado correctamente.",
                  variant: "default",
                });
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
      <DragTimeProvider>
      <div className="flex flex-col h-full" style={{ transition: "opacity 0.2s ease", opacity: 1 }}>
        {/* Renderizar solo el contenido, sin la barra de navegación */}
          <div className="overflow-auto flex-1">
          {renderDayGrid()}
        </div>
        
        {/* Modals */}
        {renderModals()}
      </div>
      </DragTimeProvider>
    )
  }

  // Return normal para cuando se usa de forma independiente
  return (
    <DragTimeProvider>
    <HydrationWrapper>
      {/* Renderizar directamente la cuadrícula y modales */}
      <div 
          className="overflow-visible flex-1 h-full"
        onDragOver={(e) => {
          e.preventDefault();
          updateMousePosition(e.clientX, e.clientY);
        }}
      > 
         {renderDayGrid()}
      </div>
      
      {/* DragPreview eliminado para mejorar rendimiento */}
      {/* La hora dinámica ahora se muestra directamente en la cita arrastrada */}
      
      {renderModals()}
    </HydrationWrapper>
    </DragTimeProvider>
  )
}
