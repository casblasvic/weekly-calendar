"use client"

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react"

import { format, parse, addDays, startOfWeek, isSameDay, differenceInDays, isToday, addWeeks, subWeeks, isSameMonth, parseISO, isBefore, isAfter } from "date-fns"
import { es } from "date-fns/locale"
import { useClinic, type ClinicConfig } from "@/contexts/clinic-context"
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
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock, AlertTriangle } from "lucide-react"
import { getDay, getDate } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { WeekSchedule } from "@/types/schedule"
import { Calendar } from "lucide-react"
import { Appointment } from "@/types/appointments"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ClinicConfigAlert } from "@/components/clinic-config-alert"
import { 
  isBusinessDay, 
  findActiveExceptions,
  applyScheduleExceptions
} from "@/services/clinic-schedule-service"
import { Clinica } from "@/services/data/models/interfaces"

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
  initialClinic?: {
    id: string | number
    config?: any
  }
}

export default function WeeklyAgenda({
  initialDate = format(new Date(), "yyyy-MM-dd"),
  containerMode = false,
  onAppointmentsChange,
  initialClinic,
}: WeeklyAgendaProps) {
  const router = useRouter()
  const { activeClinic } = useClinic()
  const { getBlocksByDateRange } = useScheduleBlocks()
  
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
  const effectiveClinic = useMemo(() => initialClinic || activeClinic, [initialClinic, activeClinic]);

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
  const [selectedClient, setSelectedClient] = useState<{
    name: string
    phone: string
  } | null>(null)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)

  // Estado para almacenar las citas
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
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

  const clinicConfig = effectiveClinic?.config || {
    openTime: "09:00",
    closeTime: "18:00",
    slotDuration: 15,
    cabins: [],
    schedule: {},
    weekendOpenTime: "10:00",
    weekendCloseTime: "14:00"
  };

  // Obtener configuración de horarios
  const openTime = clinicConfig.openTime || "09:00"
  const closeTime = clinicConfig.closeTime || "18:00"
  const slotDuration = clinicConfig.slotDuration || 15

  // Obtener cabinas activas
  const { cabins = [] } = clinicConfig
  const activeCabins = cabins.filter((cabin) => cabin.isActive).sort((a, b) => a.order - b.order)

  // Generar slots de tiempo
  const [timeSlots, setTimeSlots] = useState<string[]>([])

  useEffect(() => {
    if (openTime && closeTime) {
      const newTimeSlots = getTimeSlots(openTime, closeTime, slotDuration)
      setTimeSlots(newTimeSlots)
    } else {
      setTimeSlots([])
    }
  }, [openTime, closeTime, slotDuration])

  // Función para verificar si un día está activo en la configuración
  const isDayActive = useCallback(
    (date: Date) => {
      // Crear objeto compatible con Clinica
      if (effectiveClinic) {
        const clinicData: Partial<Clinica> = {
          id: effectiveClinic.id,
          config: effectiveClinic.config,
          // Añadir campos mínimos necesarios
          name: '',
          prefix: '',
          city: '',
          isActive: true
        };
        
        // Usar nuestro servicio de excepciones para verificar si el día está activo
        return isBusinessDay(date, clinicData as Clinica);
      }
      return true;
    },
    [effectiveClinic],
  );

  // Función para verificar si un horario está disponible
  const isTimeSlotAvailable = useCallback(
    (date: Date, time: string) => {
      const day = format(date, "EEEE", { locale: es }).toLowerCase()
      // Mapear los nombres de días en español a las claves en inglés usadas en el objeto schedule
      const dayMap = {
        lunes: "monday",
        martes: "tuesday",
        miércoles: "wednesday",
        jueves: "thursday",
        viernes: "friday",
        sábado: "saturday",
        domingo: "sunday",
      } as const
      
      type DayMapKey = keyof typeof dayMap
      
      // Aplicar excepciones si las hay
      const effectiveSchedule = effectiveClinic ? 
        applyScheduleExceptions(
          effectiveClinic.config?.schedule || clinicConfig.schedule || {},
          {
            id: effectiveClinic.id,
            config: effectiveClinic.config,
            name: '',
            prefix: '',
            city: '',
            isActive: true
          } as Clinica,
          date
        ) : 
        clinicConfig.schedule || {};
      
      const dayKey = (dayMap[day as DayMapKey] || day) as keyof typeof effectiveSchedule
      const daySchedule = effectiveSchedule[dayKey]

      if (!daySchedule?.isOpen) return false

      // Verificar si el horario está dentro de algún rango definido para ese día
      return daySchedule.ranges.some((range) => time >= range.start && time <= range.end)
    },
    [clinicConfig.schedule, effectiveClinic],
  )

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)

  // Calcular los días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const monday = startOfWeek(currentDate, { weekStartsOn: 1 })
    return addDays(monday, i)
  })

  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
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
      setScheduleBlocks([]);
      setSelectedBlock(null);
      setIsBlockModalOpen(false);
      setSelectedSlot(null);
      setSelectedClient(null);
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      setIsNewClientDialogOpen(false);
      
      // Reiniciar otros estados sensibles a la clínica
      setTimeSlots([]);
      
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

  // Efecto adicional de limpieza
  useEffect(() => {
    // Función para limpiar
    const cleanupResources = () => {
      // Código de limpieza (si es necesario)
      console.log("[WeeklyAgenda] Limpiando recursos");
    };
    
    // Devolver función de limpieza para ejecutar al desmontar
    return () => {
      cleanupResources();
    };
  }, []);

  // En el efecto donde se obtienen los bloques de horario
  // Asegurar que solo se actualizan cuando hay cambios reales
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        if (!effectiveClinic?.id) return;
        
        // Calcular fechas para el rango
        const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
        const sunday = addDays(monday, 6);
        
        // Formatear fechas para la llamada a la API
        const startDate = format(monday, "yyyy-MM-dd");
        const endDate = format(sunday, "yyyy-MM-dd");
        
        // Usar el ID de la clínica desde la propiedad o contexto
        const clinicId = String(effectiveClinic.id);
        
        // Obtener bloques de horario
        const blocks = await getBlocksByDateRange(clinicId, startDate, endDate);
        
        // Verificar si hay cambios antes de actualizar el estado
        const currentBlockIds = scheduleBlocks.map(block => block.id).sort().join(',');
        const newBlockIds = blocks.map(block => block.id).sort().join(',');
        
        if (currentBlockIds !== newBlockIds) {
          setScheduleBlocks(blocks);
          // Forzar actualización de la vista
          setUpdateKey(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error al obtener bloques de horario:", error);
      }
    };
    
    fetchBlocks();
  }, [effectiveClinic?.id, currentDate, getBlocksByDateRange]);

  // Corregir la función findBlockForCell
  const findBlockForCell = (date: string, time: string, roomId: string): ScheduleBlock | null => {
    return (
      scheduleBlocks.find((block) => {
        // Verificar fecha
        if (block.date !== date && !isRecurringBlockApplicable(block, date)) {
          return false
        }

        // Verificar hora
        if (time < block.startTime || time > block.endTime) {
          return false
        }

        // Verificar cabina
        return block.roomIds.includes(roomId) || block.roomIds.includes("all") || block.roomIds.length === 0
      }) || null
    )
  }

  // Función auxiliar para bloques recurrentes
  const isRecurringBlockApplicable = (block: ScheduleBlock, date: string): boolean => {
    if (!block.recurring || !block.recurrencePattern) return false

    const blockDate = parseISO(block.date)
    const targetDate = parseISO(date)

    // Si la fecha objetivo es anterior a la fecha del bloqueo
    if (isBefore(targetDate, blockDate)) return false

    // Si existe fecha de fin y la fecha objetivo es posterior
    if (block.recurrencePattern.endDate && isAfter(targetDate, parseISO(block.recurrencePattern.endDate))) {
      return false
    }

    const dayOfWeek = getDay(targetDate) // 0 = domingo, 1 = lunes, etc.

    if (block.recurrencePattern.frequency === "daily") {
      return true
    } else if (block.recurrencePattern.frequency === "weekly") {
      // Si hay días específicos definidos, verificar si corresponde
      if (block.recurrencePattern.daysOfWeek && block.recurrencePattern.daysOfWeek.length > 0) {
        return block.recurrencePattern.daysOfWeek.includes(dayOfWeek)
      }
      // Si no hay días específicos, compara con el día de la semana del bloqueo original
      return getDay(blockDate) === dayOfWeek
    } else if (block.recurrencePattern.frequency === "monthly") {
      return getDate(blockDate) === getDate(targetDate)
    }

    return false
  }

  // Funciones para manejar citas
  const handleCellClick = (day: Date, time: string, roomId: string) => {
    // Verificar si la celda está bloqueada
    const dayString = format(day, "yyyy-MM-dd")
    const blockForCell = findBlockForCell(dayString, time, roomId)

    if (blockForCell) {
      // Si está bloqueada, abrimos el modal de bloqueo con los datos
      setSelectedBlock(blockForCell)
      setIsBlockModalOpen(true)
      return
    }

    // Código original para abrir el modal de cita
    if (!isTimeSlotAvailable(day, time)) return

    const cabin = cabins.find((c) => {
      const cabinId = String(c.id)
      const targetId = String(roomId)
      return cabinId === targetId
    })

    if (cabin && cabin.isActive) {
      setSelectedSlot({ date: day, time, roomId })
      setIsSearchDialogOpen(true)
    }
  }

  // Modificar la función handleClientSelect para añadir logs
  const handleClientSelect = (client: { name: string; phone: string }) => {
    setSelectedClient(client)
    setIsSearchDialogOpen(false)
    setIsAppointmentDialogOpen(true)
  }

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
    (appointmentData: {
      client: { name: string; phone: string }
      services: { id: string; name: string; category: string }[]
      time: string
      comment?: string
    }) => {
      if (selectedSlot) {
        const cabin =
          cabins.find(
            (c) =>
              String(c.id) === selectedSlot.roomId
          ) || cabins[0]

        if (cabin) {
          const newAppointment: Appointment = {
            id: Math.random().toString(36).substr(2, 9),
            name: appointmentData.client.name,
            service: appointmentData.services.map((s) => s.name).join(", "),
            date: selectedSlot.date,
            roomId: selectedSlot.roomId,
            startTime: appointmentData.time,
            duration: 2, // Default duration
            color: cabin.color, // Use cabin color
            phone: appointmentData.client.phone,
          }

          setAppointments((prev) => [...prev, newAppointment])
        }
      }
    },
    [selectedSlot, cabins],
  )

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
  const renderWeeklyGrid = () => (
    <div className="flex-1 overflow-auto">
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
              {/* Columna de tiempo - Fija */}
              <div className="sticky top-0 z-20 w-20 p-4 bg-white border-b border-r border-gray-300">
                <div className="text-sm text-gray-500">Hora</div>
              </div>

              {/* Cabeceras de días - Fijas */}
              {weekDays.map((day, index) => {
                const today = isToday(day);
                const active = isDayActive(day);
                return (
                  <div key={index} className={cn(
                    "sticky top-0 z-20 bg-white border-b border-gray-300",
                    today ? "border-l-2 border-r-2 border-purple-300" : "border-l border-r border-gray-300",
                    !active && "bg-gray-100"
                  )}>
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
                  {/* Celda de Hora */}
                  <div
                    className="sticky left-0 z-10 w-20 p-2 text-sm font-medium text-purple-600 bg-white border-b border-r border-gray-300"
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
                            const isAvailable = isTimeSlotAvailable(day, time);
                            const dayString = format(day, "yyyy-MM-dd");
                            const blockForCell = findBlockForCell(dayString, time, cabin.id.toString());
                            const isCellInteractive = active && isAvailable && !blockForCell;
                            const isCellClickable = isCellInteractive || (blockForCell && active);

                            const timeIndex = timeSlots.indexOf(time);
                            const prevTime = timeIndex > 0 ? timeSlots[timeIndex - 1] : null;
                            const blockForPrevCell = prevTime ? findBlockForCell(dayString, prevTime, cabin.id.toString()) : null;
                            const isStartOfBlock = blockForCell && (!blockForPrevCell || blockForPrevCell.id !== blockForCell.id);

                            let blockDurationSlots = 0;
                            if (isStartOfBlock && blockForCell) {
                              blockDurationSlots = 1;
                              for (let i = timeIndex + 1; i < timeSlots.length; i++) {
                                const nextTime = timeSlots[i];
                                const blockForNextCell = findBlockForCell(dayString, nextTime, cabin.id.toString());
                                if (blockForNextCell && blockForNextCell.id === blockForCell.id) {
                                  blockDurationSlots++;
                                } else {
                                  break;
                                }
                              }
                            }

                            return (
                              <Droppable
                                droppableId={`${dayIndex}-${cabin.id}-${time}`}
                                key={`${cabin.id}-${time}`}
                                type="appointment"
                                isDropDisabled={!isCellInteractive}
                                isCombineEnabled={false}
                                ignoreContainerClipping={false}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={cn(
                                      "relative h-full", // Base

                                      // --- Prioridad 1: Día Inactivo ---
                                      !active && "opacity-70 bg-gray-100 cursor-not-allowed border border-gray-200",

                                      // --- Prioridad 2: Slot Inactivo (dentro de un día activo) ---
                                      active && !isAvailable && [
                                        "bg-gray-300 dark:bg-gray-700 cursor-not-allowed",
                                        // Cambiado: Bordes blancos para mejor contraste sobre gris
                                        "border border-white/50 dark:border-white/30",
                                      ],

                                      // --- Prioridad 3: Celda Activa y Disponible ---
                                      active && isAvailable && [
                                        // Aplicar borde derecho por defecto (excepto el último)
                                        "border-r border-gray-200 last:border-r-0",
                                        // Aplicar borde superior solo si NO es una celda de continuación de bloque
                                        !(blockForCell && !isStartOfBlock) && "border-t border-gray-200",
                                        // Estilos si está bloqueada (el fondo)
                                        blockForCell && "bg-rose-100 cursor-pointer",
                                        // Estilos si es interactiva (hover, zebra)
                                        isCellInteractive && [
                                          "hover:bg-purple-100/50 cursor-pointer",
                                          !today && (cabinIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK), // Zebra
                                        ],
                                      ]
                                    )}
                                    style={{
                                      height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                                      backgroundColor: snapshot.isDraggingOver && isCellInteractive
                                        ? "rgba(167, 139, 250, 0.2)"
                                        : undefined,
                                    }}
                                    onClick={(e) => {
                                      if (isCellInteractive) {
                                        e.stopPropagation();
                                        handleCellClick(day, time, cabin.id.toString());
                                      } else if (blockForCell && active) {
                                        e.stopPropagation();
                                        openBlockModal(blockForCell);
                                      }
                                    }}
                                  >
                                    {isStartOfBlock && active && blockForCell && (
                                      <div
                                        className="absolute inset-x-0 top-0 z-10 flex items-center justify-center p-1 m-px overflow-hidden border rounded-sm pointer-events-none bg-rose-200/80 border-rose-300"
                                        style={{
                                          height: `calc(${blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT}px - 2px)`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        <Lock className="flex-shrink-0 w-3 h-3 text-rose-600" />
                                      </div>
                                    )}
                                    {!(blockForCell && !isStartOfBlock) && provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            );
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
              timeSlots={timeSlots}
              rowHeight={AGENDA_CONFIG.ROW_HEIGHT}
              isMobile={false}
              className="current-time-indicator"
              agendaRef={agendaRef}
              clinicOpenTime={openTime}
              clinicCloseTime={closeTime}
            />

          </div>
        </div>
      </DragDropContext>
    </div>
  )

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

  // Asegúrate que la función openBlockModal esté definida en este componente si la usas en onClick
  const openBlockModal = (block: ScheduleBlock) => {
    setSelectedBlock(block);
    setIsBlockModalOpen(true);
  };

  // Agregar al componente WeeklyAgenda
  const activeExceptions = useMemo(() => {
    if (!effectiveClinic) return [];
    
    // Convertir effectiveClinic a un objeto compatible con Clinica
    const clinicData: Partial<Clinica> = {
      id: effectiveClinic.id,
      config: effectiveClinic.config,
      // Añadir campos mínimos necesarios
      name: '',
      prefix: '',
      city: '',
      isActive: true
    };
    
    // Comprobar excepciones activas para cada día de la semana actual
    return weekDays.map(date => {
      const exception = findActiveExceptions(date, clinicData as Clinica);
      return {
        date,
        exception
      };
    }).filter(item => item.exception);
  }, [effectiveClinic, weekDays]);

  // Verificar si hay alguna excepción activa esta semana
  const hasActiveExceptions = activeExceptions.length > 0;

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
                selectedTime={selectedSlot?.time}
              />
            )}

            {isAppointmentDialogOpen && selectedSlot && (
              <AppointmentDialog
                isOpen={isAppointmentDialogOpen}
                onClose={() => setIsAppointmentDialogOpen(false)}
                client={selectedClient}
                selectedTime={selectedSlot?.time}
                onSearchClick={() => {
                  setIsAppointmentDialogOpen(false)
                  setIsSearchDialogOpen(true)
                }}
                onNewClientClick={() => {
                  setIsAppointmentDialogOpen(false)
                  setIsNewClientDialogOpen(true)
                }}
                onDelete={handleDeleteAppointment}
                onSave={handleSaveAppointment}
                isEditing={!!selectedSlot}
              />
            )}

            {isNewClientDialogOpen && (
              <NewClientDialog 
                isOpen={isNewClientDialogOpen} 
                onClose={() => setIsNewClientDialogOpen(false)} 
              />
            )}

            {isBlockModalOpen && selectedBlock && (
              <BlockScheduleModal
                open={isBlockModalOpen}
                onOpenChange={setIsBlockModalOpen}
                clinicRooms={activeCabins.map(cabin => ({
                  name: cabin.name,
                  id: cabin.id.toString()
                }))}
                blockToEdit={selectedBlock}
                clinicId={effectiveClinic?.id ? String(effectiveClinic.id) : ""}
                onBlockSaved={() => {
                  // Recargar los bloques
                  if (effectiveClinic?.id) {
                    // Usar el contexto especializado para obtener bloques
                    const startDate = format(weekDays[0], "yyyy-MM-dd");
                    const endDate = format(weekDays[6], "yyyy-MM-dd");
                    
                    getBlocksByDateRange(
                      String(effectiveClinic.id),
                      startDate,
                      endDate
                    ).then(blocks => {
                      if (Array.isArray(blocks)) {
                        setScheduleBlocks(blocks);
                      }
                      setUpdateKey((prev) => prev + 1);
                    }).catch(error => {
                      console.error("Error al cargar bloques:", error);
                    });
                  }
                }}
                clinicConfig={{
                  openTime: clinicConfig.openTime || "09:00",
                  closeTime: clinicConfig.closeTime || "20:00",
                  weekendOpenTime: clinicConfig.weekendOpenTime || "09:00",
                  weekendCloseTime: clinicConfig.weekendCloseTime || "14:00",
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
      <div style={transitionStyles}>
        <AgendaNavBar
          currentDate={currentDate}
          setCurrentDate={setCurrentDateWithTransition}
          view="week"
          isDayActive={isDayActive}
          appointments={appointments}
          onBlocksChanged={() => {
            if (effectiveClinic?.id) {
              // Usar el contexto especializado para obtener bloques
              const startDate = format(weekDays[0], "yyyy-MM-dd");
              const endDate = format(weekDays[6], "yyyy-MM-dd");
              
              getBlocksByDateRange(
                String(effectiveClinic.id),
                startDate,
                endDate
              ).then(blocks => {
                if (Array.isArray(blocks)) {
                  setScheduleBlocks(blocks);
                }
                setUpdateKey((prev) => prev + 1);
              }).catch(error => {
                console.error("Error al cargar bloques:", error);
              });
            }
          }}
        />
        
        {hasActiveExceptions && (
          <div className="px-4 py-2 bg-amber-50 border-y border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Horario especial activo
              </p>
              <p className="text-xs text-amber-700">
                Hay excepciones al horario general configuradas para {activeExceptions.length === 1 ? 'el día' : 'los días'} {activeExceptions.map(e => format(e.date, "d 'de' MMMM", { locale: es })).join(', ')}.
              </p>
            </div>
          </div>
        )}

        {renderWeeklyGrid()}

        {/* Dialogs */}
        <ClientSearchDialog
          isOpen={isSearchDialogOpen}
          onClose={() => setIsSearchDialogOpen(false)}
          onClientSelect={handleClientSelect}
          selectedTime={selectedSlot?.time}
        />

        <AppointmentDialog
          isOpen={isAppointmentDialogOpen}
          onClose={() => setIsAppointmentDialogOpen(false)}
          client={selectedClient}
          selectedTime={selectedSlot?.time}
          onSearchClick={() => {
            setIsAppointmentDialogOpen(false)
            setIsSearchDialogOpen(true)
          }}
          onNewClientClick={() => {
            setIsAppointmentDialogOpen(false)
            setIsNewClientDialogOpen(true)
          }}
          onDelete={handleDeleteAppointment}
          onSave={handleSaveAppointment}
          isEditing={!!selectedSlot}
        />

        <NewClientDialog isOpen={isNewClientDialogOpen} onClose={() => setIsNewClientDialogOpen(false)} />
      </div>
      <BlockScheduleModal
        open={isBlockModalOpen}
        onOpenChange={(open) => {
          setIsBlockModalOpen(open)
          // Si se cierra el modal, recargar los bloques para actualizar la UI
          if (!open && effectiveClinic?.id) {
            // Usar el contexto especializado para obtener bloques
            const startDate = format(weekDays[0], "yyyy-MM-dd");
            const endDate = format(weekDays[6], "yyyy-MM-dd");
            
            getBlocksByDateRange(
              String(effectiveClinic.id),
              startDate,
              endDate
            ).then(blocks => {
              if (Array.isArray(blocks)) {
                setScheduleBlocks(blocks);
              }
              setUpdateKey((prev) => prev + 1);
            }).catch(error => {
              console.error("Error al cargar bloques:", error);
            });
          }
        }}
        clinicRooms={activeCabins.map(cabin => ({
          ...cabin,
          id: cabin.id.toString()
        }))}
        blockToEdit={selectedBlock}
        clinicId={effectiveClinic?.id ? String(effectiveClinic.id) : ""}
        onBlockSaved={() => {
          // Recargar los bloques
          if (effectiveClinic?.id) {
            // Usar el contexto especializado para obtener bloques
            const startDate = format(weekDays[0], "yyyy-MM-dd");
            const endDate = format(weekDays[6], "yyyy-MM-dd");
            
            getBlocksByDateRange(
              String(effectiveClinic.id),
              startDate,
              endDate
            ).then(blocks => {
              if (Array.isArray(blocks)) {
                setScheduleBlocks(blocks);
              }
              setUpdateKey((prev) => prev + 1);
            }).catch(error => {
              console.error("Error al cargar bloques:", error);
            });
          }
        }}
        clinicConfig={{
          openTime: clinicConfig.openTime || "09:00",
          closeTime: clinicConfig.closeTime || "20:00",
          weekendOpenTime: clinicConfig.weekendOpenTime || "09:00",
          weekendCloseTime: clinicConfig.weekendCloseTime || "14:00",
        }}
      />
    </HydrationWrapper>
  )
}

