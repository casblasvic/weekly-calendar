"use client"

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react"

import { format, parse, addDays, startOfWeek, isSameDay, differenceInDays, isToday, addWeeks, subWeeks, isSameMonth, parseISO, isBefore, isAfter, startOfDay, endOfDay, getDay, isWithinInterval } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { AgendaNavBar } from "./agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { PersonSearchDialog } from "@/components/client-search-dialog"
import { AppointmentDialog, type Person } from "@/components/appointment-dialog"
import { NewClientDialog } from "@/components/new-client-dialog"
import { AppointmentItem } from "./appointment-item"
import { useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock, AlertTriangle, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { getDate } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule"
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
// Añadir hooks de precarga para servicios, bonos y paquetes
import { useServicesQuery, useBonosQuery, usePackagesQuery } from "@/lib/hooks/use-api-query"

// Importar nuevos módulos de drag & drop
import { useOptimizedDragAndDrop } from "@/lib/drag-drop/optimized-hooks"
import OptimizedHoverableCell from "@/components/agenda/optimized-hoverable-cell"
import { DragPreview } from "@/components/drag-drop/drag-preview"
import { DragItem } from "@/lib/drag-drop/types"
import { getAppointmentDuration } from "@/lib/drag-drop/utils"
import { useGranularity } from "@/lib/drag-drop/granularity-context"

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
  
  // Precarga de datos para el modal de citas - ejecutar siempre para tenerlos en caché
  useServicesQuery({ enabled: true })
  useBonosQuery({ enabled: true })
  usePackagesQuery({ enabled: true })
  
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

  // Estado para cargar citas
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Función para obtener citas de la BD
  const fetchAppointments = useCallback(async () => {
    console.log('[WeeklyAgenda] fetchAppointments called - activeClinic:', activeClinic?.id);
    if (!activeClinic?.id) {
      console.log('[WeeklyAgenda] No activeClinic ID, skipping fetch');
      return;
    }
    
    setLoadingAppointments(true);
    try {
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const endDate = addDays(startDate, 6);
      
      const url = `/api/appointments?clinicId=${activeClinic.id}&startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`;
      console.log('[WeeklyAgenda] Fetching appointments from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Error fetching appointments');
      
      const data = await response.json();
      console.log('[WeeklyAgenda] Received appointments:', data);
      
      // Procesar las citas para el formato esperado por la agenda
      const processedAppointments = data.map((apt: any) => {
        const clinicTz = (activeClinic as any)?.countryInfo?.timezone || (activeClinic as any)?.country?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const startUtc = parseISO(apt.startTime);
        const endUtc = parseISO(apt.endTime);
        const startTime = toZonedTime(startUtc, clinicTz);
        const endTime = toZonedTime(endUtc, clinicTz);
        
        // Determinar el color basado en los servicios
        let appointmentColor = '#9CA3AF'; // Color por defecto (gris)
        
        if (apt.services && apt.services.length > 0) {
          // Si todos los servicios son del mismo tipo, usar ese color
          const serviceTypes = new Set(apt.services.map((s: any) => s.service?.categoryId));
          const uniqueColors = new Set(apt.services.map((s: any) => s.service?.colorCode).filter(Boolean));
          
          if (serviceTypes.size === 1 && uniqueColors.size === 1) {
            // Todos los servicios del mismo tipo - usar el color del servicio
            const firstColor = Array.from(uniqueColors)[0];
            appointmentColor = (typeof firstColor === 'string' ? firstColor : null) || appointmentColor;
          } else if (apt.equipment?.color) {
            // Múltiples tipos de servicios - usar el color de la cabina
            appointmentColor = apt.equipment.color;
          }
        }
        
        return {
          id: apt.id,
          name: `${apt.person.firstName} ${apt.person.lastName}`,
          service: apt.services?.map((s: any) => s.service?.name).filter(Boolean).join(", ") || 'Sin servicio',
          date: startTime,
          roomId: apt.equipment?.id || apt.roomId || apt.equipmentId || (activeClinicCabins?.[0]?.id ?? 'default'),
          startTime: format(startTime, 'HH:mm'),
          duration: Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
          color: appointmentColor,
          phone: apt.person.phone,
          services: apt.services || [],
          tags: apt.tags || [],
          // Información adicional para la vista detallada
          notes: apt.notes,
        };
      }) as Appointment[];
      
      const dedupedAppointments = Array.from(new Map(processedAppointments.map((a: Appointment) => [a.id, a])).values());
      
      setAppointments(dedupedAppointments);
      console.log('[WeeklyAgenda] Processed appointments:', dedupedAppointments);
    } catch (error) {
      console.error('[WeeklyAgenda] Error fetching appointments:', error);
      // Podríamos mostrar un toast de error aquí
    } finally {
      setLoadingAppointments(false);
    }
  }, [activeClinic?.id, currentDate]);
  
  // Fetch appointments cuando cambia la clínica o la semana
  useEffect(() => {
    console.log('[WeeklyAgenda] useEffect triggered - activeClinic:', activeClinic?.id, 'currentDate:', currentDate);
    fetchAppointments();
  }, [fetchAppointments]);

  // Estados para diálogos y selección
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date
    time: string
    roomId: string
  } | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Manejar clic sobre una cita existente para abrir el modal de edición
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    // Guardar la cita seleccionada
    setSelectedAppointment(appointment);

    // Construir objeto Person a partir del nombre telefóno, etc.
    const [firstName, ...rest] = appointment.name.split(' ');
    const personForModal: Person = {
      id: appointment.personId || '',
      firstName: firstName || appointment.name,
      lastName: rest.join(' ') || '',
      phone: appointment.phone || '',
    };

    // Actualizar estados necesarios para AppointmentDialog
    setSelectedClient(personForModal);
    setSelectedSlot({
      date: appointment.date,
      time: appointment.startTime,
      roomId: appointment.roomId,
    });

    setIsAppointmentDialogOpen(true);
  }, []);
  const [selectedClient, setSelectedClient] = useState<Person | null>(null)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)

  // Nueva función para manejar el click de nuevo cliente
  const handleNewClientClick = useCallback(() => {
    setIsNewClientDialogOpen(true);
  }, []);

  // NUEVO: Estado para CabinScheduleOverride seleccionado
  const [selectedOverride, setSelectedOverride] = useState<CabinScheduleOverride | null>(null);
  // NUEVO: Estado para controlar la visibilidad del modal de bloqueo/override
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Obtener configuración de granularidad desde el contexto
  const { minuteGranularity, slotDuration, moveGranularity } = useGranularity();

  // Efecto para notificar al componente padre sobre el cambio en las citas
  useEffect(() => {
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
      
      // Obtener slotDuration del contexto useGranularity
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
    // Usar la hora exacta del hover si está disponible, sino usar la hora del slot
    // const exactTime = hoveredCell && 
    //                   hoveredCell.day.getTime() === day.getTime() && 
    //                   hoveredCell.cabinId === roomId 
    //                   ? hoveredCell.exactTime 
    //                   : time;
    
    console.log("[WeeklyAgenda] handleCellClick called with:", { day, time, roomId });
    
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
      console.log("[WeeklyAgenda] Setting selectedSlot and opening search dialog");
      setSelectedSlot({ date: day, time, roomId })
      setIsSearchDialogOpen(true)
    }
  }

  // --- Modificar handleClientSelect para aceptar tipo Person --- 
  const handleClientSelect = (person: any) => { 
    console.log("[WeeklyAgenda] Person selected:", person);
    console.log("[WeeklyAgenda] Current selectedSlot:", selectedSlot);
    
    // Convertir Person a formato Person esperado por AppointmentDialog
    const client: Person = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      phone: person.phone || '',
      email: person.email,
      address: person.address || '',
      city: person.city,
      postalCode: person.postalCode,
      countryIsoCode: person.countryIsoCode
    };
    
    console.log("[WeeklyAgenda] Setting selectedClient and opening appointment dialog");
    setSelectedClient(client);
    setIsSearchDialogOpen(false);
    setIsAppointmentDialogOpen(true); // Abrir el modal de citas después de seleccionar el cliente
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
     async (appointmentData: { 
       id?: string; // ID opcional para cuando es edición
       client: { name: string; phone: string };
       services: any[]; // Ajustar tipo según sea necesario
       time: string;
       comment?: string;
       tags?: string[]; // Añadir etiquetas al tipo
     }) => {
      if (selectedSlot) {
        const isUpdate = !!appointmentData.id;
        
        try {
          const method = isUpdate ? 'PUT' : 'POST';
          
          // Los datos ya vienen en el formato correcto del modal
          const response = await fetch('/api/appointments', {
            method: method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData),
          });

          if (!response.ok) {
            throw new Error(isUpdate ? 'Error updating appointment' : 'Error creating appointment');
          }

          const savedAppointment = await response.json();
          
          // Convertir las fechas string a objetos Date
          const startTime = new Date(savedAppointment.startTime);
          const endTime = new Date(savedAppointment.endTime);
          
          // Determinar el color basado en los servicios creados
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
          
          // Convertir la cita creada al formato esperado por la agenda
          const newAppointment: Appointment = {
            id: savedAppointment.id,
            name: `${savedAppointment.person.firstName} ${savedAppointment.person.lastName}`,
            service: savedAppointment.services.map((s: any) => s.service.name).join(", "),
            date: startTime, // Date object
            roomId: savedAppointment.roomId || savedAppointment.equipment?.id || selectedSlot?.roomId || 'default',
            startTime: startTime.toTimeString().slice(0, 5), // string HH:MM
            duration: Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)), // Duración en minutos
            color: appointmentColor,
            phone: savedAppointment.person.phone,
            services: savedAppointment.services || [],
            tags: tagIds, // Añadir las etiquetas
          };
          
          if (isUpdate) {
            // Si es actualización, reemplazar la cita existente
            setAppointments((prev) => 
              prev.map(apt => apt.id === newAppointment.id ? newAppointment : apt)
            );
          } else {
            // Si es nueva, agregarla
            setAppointments((prev) => [...prev, newAppointment]);
          }
          
          // Refrescar todas las citas para asegurar sincronización completa
          await fetchAppointments();
          
          // Cerrar modal
          setIsAppointmentDialogOpen(false);
          
          // Limpiar selección
          setSelectedClient(null);
        } catch (error) {
          console.error(`Error ${isUpdate ? 'updating' : 'creating'} appointment:`, error);
          // Mostrar mensaje de error contextual
          alert(`Error al ${isUpdate ? 'actualizar' : 'crear'} la cita. Por favor, inténtalo de nuevo.`);
        }
      }
    },
    [selectedSlot, activeCabins, setAppointments] // Añadir setAppointments a dependencias
  );

  const handleAppointmentResize = (id: string, newDuration: number) => {
    // Esta función ya no es necesaria con el nuevo componente sin redimensionamiento
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
  }

  // Usar el nuevo hook modular de drag & drop
  const handleAppointmentDrop = useCallback(async (appointmentId: string, changes: any) => {
    console.log('[handleAppointmentDrop] Iniciando drop:', { appointmentId, changes });
    
    try {
      // Buscar la cita actual
      const appointmentToUpdate = appointments.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[handleAppointmentDrop] No se encontró la cita:', appointmentId);
        return;
      }
      
      console.log('[handleAppointmentDrop] Cita encontrada:', appointmentToUpdate);
      
      // Transformar los cambios al formato esperado por Appointment
      const transformedChanges: Partial<Appointment> = {};
      
      if (changes.startTime) {
        // Enviar formato HH:mm
        transformedChanges.startTime = `${changes.startTime.getHours().toString().padStart(2, '0')}:${changes.startTime.getMinutes().toString().padStart(2, '0')}`;
        // Enviar la nueva fecha
        transformedChanges.date = changes.startTime;
      }
      
      if (changes.equipmentId) {
        // Enviar roomId, no equipmentId
        transformedChanges.roomId = changes.equipmentId;
      }
      
      console.log('[handleAppointmentDrop] Cambios transformados:', transformedChanges);
      
      // Crear una copia actualizada de la cita con los cambios transformados
      const updatedAppointment = {
        ...appointmentToUpdate,
        ...transformedChanges
      };
      
      console.log('[handleAppointmentDrop] Cita actualizada:', updatedAppointment);
      
      // Actualizar el estado local inmediatamente para renderizado instantáneo
      setAppointments(prevAppointments => {
        const newAppointments = prevAppointments.map(app => 
          app.id === appointmentId ? updatedAppointment : app
        );
        console.log('[handleAppointmentDrop] Nuevo estado de citas:', newAppointments);
        return newAppointments;
      });
      
      // Preparar datos para la API
      const apiData: any = {
        id: appointmentId,
        roomId: transformedChanges.roomId || appointmentToUpdate.roomId
      };
      
      // Si cambió la hora, construir las fechas completas en formato ISO
      if (changes.startTime) {
        const newStartDateTime = changes.startTime;
        const duration = appointmentToUpdate.duration || 30; // duración en minutos
        const newEndDateTime = new Date(newStartDateTime.getTime() + duration * 60000);
        
        // Formatear las fechas en ISO para la API
        apiData.startTime = newStartDateTime.toISOString();
        apiData.endTime = newEndDateTime.toISOString();
        
        // NO enviar el campo date cuando ya tenemos fechas ISO completas
      }
      
      console.log('[handleAppointmentDrop] Enviando a API:', apiData);
      
      // Hacer la llamada a la API en segundo plano
      const response = await fetch(`/api/appointments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        throw new Error('Error al mover la cita');
      }
      
      console.log('[handleAppointmentDrop] Cita guardada en BD correctamente');
      
      toast({
        title: "Cita actualizada",
        description: "La cita se ha movido correctamente",
      });
    } catch (error) {
      console.error('Error moving appointment:', error);
      
      // Si hay error, revertir los cambios refrescando desde la API
      await fetchAppointments();
      
      toast({
        title: "Error",
        description: "No se pudo mover la cita",
        variant: "destructive",
      });
    }
  }, [appointments, fetchAppointments, toast]);

  const {
    dragState: localDragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    updateMousePosition,
    updateCurrentPosition
  } = useOptimizedDragAndDrop(handleAppointmentDrop, 60, 15);
  
  // Rastrear el movimiento del mouse durante el drag
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (localDragState.isActive) {
        updateMousePosition(e.clientX, e.clientY);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (localDragState.isActive) {
        updateMousePosition(e.clientX, e.clientY);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('dragover', handleDragOver);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [localDragState.isActive, updateMousePosition]);
  
  // Ref para el contenedor de la agenda
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleAppointmentDragStart = useCallback((appointment: any, e?: React.DragEvent) => {
    console.log('[WeeklyAgenda] Appointment drag start:', appointment);
    
    if (!e) return;
    
    // Convertir el appointment al formato DragItem esperado por el hook optimizado
    const dragItem = {
      id: appointment.id,
      title: appointment.title || appointment.name,
      startTime: appointment.startTime,
      endTime: '', // Se calculará en el hook si es necesario
      duration: appointment.duration,
      roomId: appointment.roomId,
      currentDate: appointment.date,
      color: appointment.color || '#9CA3AF',
      personId: appointment.personId || ''
    };
    
    // Llamar al handleDragStart del hook optimizado con la firma correcta
    handleDragStart(e, dragItem);
  }, [handleDragStart]);

  const handleCellDragOver = useCallback((e: React.DragEvent, date: Date, time: string, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handleDragOver(e);
  }, [handleDragOver]);

  const handleCellDrop = useCallback((e: React.DragEvent, date: Date, time: string, roomId: string) => {
    e.preventDefault();
    handleDrop(e, date, time, roomId);
  }, [handleDrop]);

  const onDragEnd = () => {
    handleDragEnd();
  }

  const handleDayClick = (date: Date) => {
    // Solo permitir clic en días activos
    if (isDayActive(date)) {
      router.push(`/agenda/dia/${format(date, "yyyy-MM-dd")}`)
    }
  }

  // Función auxiliar para filtrar citas de una celda específica
  const getAppointmentsForCell = useCallback((day: Date, time: string, cabinId: string) => {
    const cellAppointments: Array<Appointment & { offsetMinutes: number }> = [];
    
    appointments.forEach(appointment => {
      // Verificar que la fecha coincida
      const appointmentDate = appointment.date;
      if (!isSameDay(appointmentDate, day)) return;
      
      // Verificar que la cabina coincida
      if (appointment.roomId !== cabinId) return;
      
      // Parsear hora de inicio de la cita - asegurar que sea string
      const startTimeStr = typeof appointment.startTime === 'string' 
        ? appointment.startTime 
        : '00:00'; // Valor por defecto si no es string
      const [appointmentHours, appointmentMinutes] = startTimeStr.split(':').map(Number);
      const appointmentStartMinutes = appointmentHours * 60 + appointmentMinutes;
      
      // Parsear hora del slot
      const [slotHours, slotMinutes] = time.split(':').map(Number);
      const slotStartMinutes = slotHours * 60 + slotMinutes;
      const slotEndMinutes = slotStartMinutes + slotDuration;
      
      // Verificar si la cita empieza dentro de este slot
      if (appointmentStartMinutes >= slotStartMinutes && appointmentStartMinutes < slotEndMinutes) {
        // Calcular el offset en minutos dentro del slot
        const offsetMinutes = appointmentStartMinutes - slotStartMinutes;
        cellAppointments.push({
          ...appointment,
          offsetMinutes
        });
      }
    });
    
    return cellAppointments;
  }, [appointments, slotDuration]);

  // Estructura corregida para el renderWeeklyGrid
  const renderWeeklyGrid = () => {
    // --- DEBUG LOG --- 
    // Verificar el valor justo antes de usarlo en el JSX
    console.log("[WeeklyAgenda] renderWeeklyGrid - valor de activeCabins:", JSON.stringify(activeCabins));
    // --- FIN DEBUG LOG ---

    return (
      <div className="relative z-0" style={{ scrollBehavior: "smooth" }}>
        <div className="min-w-[1200px] relative">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `auto repeat(7, 1fr)`,
              width: "100%",
            }}
          >
            {/* Columna de tiempo - Fija - z-30 */}
            <div className="sticky left-0 z-10 w-20 p-4 bg-white border-b border-r border-gray-300 hour-header" style={{ zIndex: 999 }}>
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
                            <OptimizedHoverableCell
                              key={`${cabin.id}-${time}`}
                              day={day}
                              time={time}
                              cabinId={cabin.id.toString()}
                              isAvailable={isAvailable}
                              isInteractive={isCellInteractive}
                              isClickable={isCellClickable}
                              isStartOfBlock={isStartOfBlock}
                              blockDurationSlots={blockDurationSlots}
                              overrideForCell={overrideForCell}
                              onCellClick={handleCellClick}
                              onDragOver={handleCellDragOver}
                              onDrop={handleCellDrop}
                              appointments={getAppointmentsForCell(day, time, cabin.id.toString())}
                              slotDuration={slotDuration}
                              minuteGranularity={minuteGranularity}
                              moveGranularity={moveGranularity}
                              active={active}
                              today={today}
                              cabinIndex={cabinIndex}
                              setSelectedOverride={setSelectedOverride}
                              setIsOverrideModalOpen={setIsOverrideModalOpen}
                              hasAppointmentAtPosition={hasAppointmentAtPosition}
                              handleAppointmentClick={handleAppointmentClick}
                              handleAppointmentDragStart={handleAppointmentDragStart}
                              handleDragEnd={handleDragEnd}
                              dragState={localDragState}
                              cellHeight={AGENDA_CONFIG.ROW_HEIGHT}
                              isDaily={false}
                              globalDragState={localDragState}
                              updateCurrentPosition={updateCurrentPosition}
                            />
                          );
                          // ***** FIN INTEGRACIÓN EN REND *****
                        }) : (
                          <div className="flex items-center justify-center h-full p-1 text-xs italic text-center text-gray-400 border-t border-r border-gray-200 last:border-r-0" style={{ height: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}>
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

          {/* Indicador de tiempo actual */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              top: '100px', // Compensar por la altura de la cabecera fija
              overflow: 'hidden',
              zIndex: 50 // Aumentar z-index para estar por encima de todo (citas tienen z-10)
            }}
          >
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
      </div>
    )
  }

  // Función para verificar si hay una cita en una posición específica
  const hasAppointmentAtPosition = (day: Date, time: string, cabinId: string, offsetMinutes: number): boolean => {
    const [hours, minutes] = time.split(':').map(Number);
    const hoverTimeInMinutes = hours * 60 + minutes + offsetMinutes;
    
    // Buscar TODAS las citas del día y cabina, no solo las del slot actual
    return appointments.some(apt => {
      // Verificar que sea el mismo día
      if (!isSameDay(apt.date, day)) return false;
      
      // Verificar que sea la misma cabina
      if (apt.roomId !== cabinId) return false;
      
      // Obtener hora de inicio y fin de la cita
      const aptStartTime = typeof apt.startTime === 'string' ? apt.startTime : '00:00';
      const [aptHours, aptMinutes] = aptStartTime.split(':').map(Number);
      const aptStartMinutes = aptHours * 60 + aptMinutes;
      const aptEndMinutes = aptStartMinutes + apt.duration;
      
      // Verificar si el punto del hover está dentro del rango de la cita
      return hoverTimeInMinutes >= aptStartMinutes && hoverTimeInMinutes < aptEndMinutes;
    });
  };

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
                 // --- Lógica Recurrente ---
                 const effectiveEndDate = recurrenceEndDate ? endOfDay(recurrenceEndDate) : endOfDay(overrideEndDate);
                 const overrideStartDateStart = startOfDay(overrideStartDate);

                 // ¿Está la fecha de la celda DENTRO del rango de fechas de la recurrencia?
                 const isWithinDateRange = isWithinInterval(startOfDay(day), { start: overrideStartDateStart, end: effectiveEndDate });

                 // ¿Coincide el DÍA DE LA SEMANA?
                 const isDayOfWeekMatch = daysOfWeek && daysOfWeek.includes(getDay(day));

                 if (isWithinDateRange && isDayOfWeekMatch) {
                    return override; // ¡Coincidencia de bloqueo recurrente!
                 }
                 // --- Fin Lógica Recurrente ---

             } else {
                 // --- Lógica No Recurrente (Un solo día) ---
                 const overrideStartDateStart = startOfDay(overrideStartDate);

                 // ¿Es la fecha de la celda EXACTAMENTE la fecha de inicio del bloqueo?
                 if (isSameDay(startOfDay(day), overrideStartDateStart)) {
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
            {/* Asegurarse de que CurrentTimeIndicator esté relacionado con este div si usa refs */}
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
        <div ref={gridContainerRef} className="relative flex-1 overflow-auto">
            {renderWeeklyGrid()}
            {/* Asegurarse de que CurrentTimeIndicator esté relacionado con este div si usa refs */}
        </div>
        
        {/* Renderizar el preview si está activo */}
        {localDragState.isActive && localDragState.draggedItem && localDragState.currentPosition && (
          <DragPreview
            preview={{
              x: localDragState.mouseX,
              y: localDragState.mouseY,
              date: localDragState.currentPosition.date,
              time: localDragState.currentPosition.time,
              roomId: localDragState.currentPosition.roomId
            }}
            duration={localDragState.draggedItem.duration}
            color={localDragState.draggedItem.color}
            title={localDragState.draggedItem.title}
            slotDuration={slotDuration}
            slotHeight={AGENDA_CONFIG.ROW_HEIGHT}
            roomName={activeCabins.find(c => c.id.toString() === localDragState.currentPosition?.roomId)?.name}
            clientName={(localDragState.draggedItem as any).clientName}
            clientPhone={(localDragState.draggedItem as any).clientPhone}
            services={(localDragState.draggedItem as any).services}
          />
        )}
        
        {/* Renderizar diálogos aquí, no afectan el layout principal */}
        {selectedSlot && selectedClient && (
          <AppointmentDialog 
            isOpen={isAppointmentDialogOpen}
            onClose={() => {
              console.log('[WeeklyAgenda] AppointmentDialog onClose called')
              console.log('[WeeklyAgenda] Current selectedSlot:', selectedSlot)
              console.log('[WeeklyAgenda] Current selectedClient:', selectedClient)
              setIsAppointmentDialogOpen(false);
              setSelectedClient(null); // Limpiar cliente al cerrar
              setSelectedSlot(null);
              setSelectedAppointment(null); // Limpiar cita seleccionada
            }}
            date={selectedSlot.date}
            initialClient={selectedClient}
            selectedTime={selectedSlot.time}
            roomId={selectedSlot.roomId}
            isEditing={!!selectedAppointment}
            existingAppointment={selectedAppointment}
            clinic={{ id: activeClinic?.id?.toString() || '', name: activeClinic?.name || '' }}
            professional={{ id: '', name: '' }} // TODO: implementar selección de profesional
            onSearchClick={() => { 
              setIsAppointmentDialogOpen(false); 
              setIsSearchDialogOpen(true); 
            }}
            onNewClientClick={handleNewClientClick}
            onMoveAppointment={async () => {
              // Refrescar las citas después de eliminar o validar
              await fetchAppointments();
            }}
            onSaveAppointment={async (appointmentData) => {
              const isUpdate = !!appointmentData.id;
              
              try {
                const method = isUpdate ? 'PUT' : 'POST';
                
                // Los datos ya vienen en el formato correcto del modal
                const response = await fetch('/api/appointments', {
                  method: method,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(appointmentData),
                });

                if (!response.ok) {
                  throw new Error(isUpdate ? 'Error updating appointment' : 'Error creating appointment');
                }

                const savedAppointment = await response.json();
                
                // Convertir las fechas string a objetos Date
                const startTime = new Date(savedAppointment.startTime);
                const endTime = new Date(savedAppointment.endTime);
                
                // Determinar el color basado en los servicios creados
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
                
                // Convertir la cita creada al formato esperado por la agenda
                const newAppointment: Appointment = {
                  id: savedAppointment.id,
                  name: `${savedAppointment.person.firstName} ${savedAppointment.person.lastName}`,
                  service: savedAppointment.services.map((s: any) => s.service.name).join(", "),
                  date: startTime, // Date object
                  roomId: savedAppointment.roomId || savedAppointment.equipment?.id || selectedSlot?.roomId || 'default',
                  startTime: startTime.toTimeString().slice(0, 5), // string HH:MM
                  duration: Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)), // Duración en minutos
                  color: appointmentColor,
                  phone: savedAppointment.person.phone,
                  services: savedAppointment.services || [],
                  tags: tagIds, // Añadir las etiquetas
                };
                
                // Agregar la nueva cita a la lista de appointments
                setAppointments((prev) => [...prev, newAppointment]);
                
                // Opcional: Refrescar todas las citas para asegurar sincronización
                // await fetchAppointments();
                
                // Cerrar modal
                setIsAppointmentDialogOpen(false);
                
                // Limpiar selección
                setSelectedClient(null);
              } catch (error) {
                console.error(`Error ${isUpdate ? 'updating' : 'creating'} appointment:`, error);
                // Mostrar mensaje de error contextual
                alert(`Error al ${isUpdate ? 'actualizar' : 'crear'} la cita. Por favor, inténtalo de nuevo.`);
              }
            }}
          />
        )}
        
        {/* MODAL DE BLOQUEO/OVERRIDE (fuera del contenedor flex principal) */} 
        <BlockScheduleModal
          open={isOverrideModalOpen}
          onOpenChange={(isOpen) => setIsOverrideModalOpen(isOpen)}
          clinicRooms={activeCabins.map(cabin => ({
            ...cabin,
            id: cabin.id.toString()
          }))}
          blockToEdit={selectedOverride}
          clinicId={String(activeClinic?.id)}
          clinicConfig={{
            // Pass calculated times if available, otherwise safe defaults
            openTime: timeSlots.length > 0 ? timeSlots[0] : "09:00", 
            closeTime: timeSlots.length > 0 ? timeSlots[timeSlots.length - 1] : "20:00",
          }}
        />
        
        {/* MODAL DE BÚSQUEDA DE PERSONAS */}
        {isSearchDialogOpen && (
          <PersonSearchDialog
            isOpen={isSearchDialogOpen}
            onClose={() => setIsSearchDialogOpen(false)}
            onPersonSelect={handleClientSelect}
          />
        )}
        
        {/* MODAL DE NUEVO CLIENTE */}
        {isNewClientDialogOpen && (
          <NewClientDialog 
            isOpen={isNewClientDialogOpen} 
            onClose={() => setIsNewClientDialogOpen(false)} 
          />
        )}
      </div>
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
