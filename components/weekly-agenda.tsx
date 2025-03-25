"use client"

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react"

import { format, parse, addDays, startOfWeek, isSameDay, differenceInDays } from "date-fns"
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
import { ResizableAppointment } from "./resizable-appointment"
import { DragDropContext, Droppable } from "react-beautiful-dnd"
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock } from "lucide-react"
import { parseISO, isAfter, isBefore, getDay, getDate } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { WeekSchedule } from "@/types/schedule"

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

interface Appointment {
  id: string
  name: string
  service: string
  date: Date
  roomId: string
  startTime: string
  duration: number
  color: string
  completed?: boolean
  phone?: string
}

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
      const dayKey = (dayMap[day as DayMapKey] || day) as keyof WeekSchedule
      return clinicConfig.schedule?.[dayKey]?.isOpen ?? false
    },
    [clinicConfig.schedule],
  )

  // Función para verificar si un horario está disponible
  const isTimeSlotAvailable = useCallback(
    (date: Date, time: string) => {
      const day = format(date, "EEEE", { locale: es }).toLowerCase()
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
      const dayKey = (dayMap[day as DayMapKey] || day) as keyof WeekSchedule
      const daySchedule = clinicConfig.schedule?.[dayKey]

      if (!daySchedule?.isOpen) return false

      // Verificar si el horario está dentro de algún rango definido para ese día
      return daySchedule.ranges.some((range) => time >= range.start && time <= range.end)
    },
    [clinicConfig.schedule],
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
    setAppointments((prevAppointments) =>
      prevAppointments.map((a) => (a.id === id ? { ...a, duration: newDuration } : a)),
    )
    setIsAppointmentDialogOpen(false)
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

  // Modificar el return para omitir la cabecera en modo contenedor
  const renderWeeklyGrid = () => (
    <div className="flex-1 overflow-auto">
      <DragDropContext onDragEnd={onDragEnd}>
        <div 
          ref={agendaRef} 
          className="relative z-0" 
          style={{ 
            scrollBehavior: "smooth",
            willChange: "transform",
            transform: "translateZ(0)",
            // Añadir contain para optimizar renderizado
            contain: "paint layout style"
          }}
        >
          <div className="min-w-[800px] relative">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `auto repeat(${weekDays.length}, 1fr)`,
                minWidth: "800px",
                width: "100%",
                willChange: "contents", // Optimizar para cambios de contenido
                contain: "layout style paint" // Contener efectos visuales
              }}
            >
              {/* Columna de tiempo */}
              <div className="sticky top-0 z-20 bg-white border-b p-4 w-20">
                <div className="text-sm text-gray-500">Hora</div>
              </div>

              {/* Cabeceras de días */}
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={cn(
                    "sticky top-0 z-20 bg-white",
                    day.toDateString() === new Date().toDateString()
                      ? "border-2 border-purple-300"
                      : "border-b border-x border-gray-200",
                    !isDayActive(day) && "bg-gray-100",
                  )}
                >
                  <div
                    className={cn(
                      "p-4 relative transition-all duration-200",
                      isDayActive(day)
                        ? "cursor-pointer group border-b-2 border-transparent hover:border-purple-500 hover:bg-purple-50/30"
                        : "cursor-default border-b-2 border-transparent",
                      day.toDateString() === new Date().toDateString() && isDayActive(day) && "bg-purple-100/70",
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <div
                      className={cn(
                        "text-base font-medium capitalize",
                        isDayActive(day) ? "text-purple-600" : "text-gray-400",
                      )}
                    >
                      {format(day, "EEEE", { locale: es })}
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        day.toDateString() === new Date().toDateString() && isDayActive(day)
                          ? "text-purple-600 font-bold"
                          : isDayActive(day)
                            ? "text-gray-500"
                            : "text-gray-400",
                      )}
                    >
                      {format(day, "d/M/yyyy")}
                    </div>

                    {/* Línea indicadora de elemento clicable - solo para días activos */}
                    {isDayActive(day) && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                    )}
                  </div>
                  <div
                    className="grid border-t border-gray-200"
                    style={{
                      gridTemplateColumns: `repeat(${activeCabins.length}, 1fr)`,
                    }}
                  >
                    {activeCabins.map((cabin) => (
                      <div
                        key={cabin.id}
                        className={cn(
                          "text-white text-xs py-2 px-1 text-center font-medium",
                          !isDayActive(day) && "opacity-50",
                        )}
                        style={{ backgroundColor: cabin.color }}
                      >
                        {cabin.code}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Slots de tiempo y citas */}
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  <div
                    className="border-r border-b p-2 text-sm text-purple-600 sticky left-0 bg-white font-medium w-20"
                    data-time={time}
                  >
                    {time}
                  </div>
                  {weekDays.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={cn("border-r border-b border-gray-200", !isDayActive(day) && "bg-gray-100")}
                      data-time={time}
                      style={{ minWidth: "150px" }}
                    >
                      <div
                        className={`h-full ${
                          day.toDateString() === new Date().toDateString() && isDayActive(day)
                            ? "border-x-2 border-purple-300 bg-purple-50/50"
                            : "border-x border-gray-200"
                        }`}
                      >
                        <div
                          className="grid"
                          style={{
                            height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                            gridTemplateColumns: `repeat(${activeCabins.length}, 1fr)`,
                            transform: needsFullRerenderRef.current ? 'none' : 'translateZ(0)', // Activa hardware acceleration
                          }}
                        >
                          {activeCabins.map((cabin, cabinIndex) => {
                            const isAvailable = isTimeSlotAvailable(day, time)
                            return (
                              <Droppable
                                droppableId={`${dayIndex}-${cabin.id}-${time}`}
                                key={`${dayIndex}-${cabin.id}-${time}`}
                                type="appointment"
                                isDropDisabled={!isAvailable}
                                isCombineEnabled={false}
                                ignoreContainerClipping={false}
                              >
                                {(provided, snapshot) => {
                                  const cellBlock = findBlockForCell(
                                    format(day, "yyyy-MM-dd"),
                                    time,
                                    cabin.id.toString(),
                                  )
                                  const isBlocked = !!cellBlock

                                  return (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={cn(
                                        "relative cursor-pointer border-r last:border-r-0",
                                        isBlocked
                                          ? "hover:bg-pink-200"
                                          : isAvailable
                                            ? "hover:bg-purple-50"
                                            : "bg-black/20 cursor-not-allowed",
                                      )}
                                      style={{
                                        height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                                        backgroundColor: isBlocked
                                          ? "rgba(244, 114, 182, 0.2)" // Color rosa para bloques
                                          : snapshot.isDraggingOver
                                            ? "rgba(167, 139, 250, 0.1)"
                                            : isAvailable
                                              ? cabinIndex % 2 === 0
                                                ? ZEBRA_LIGHT
                                                : ZEBRA_DARK
                                              : "rgba(0, 0, 0, 0.2)",
                                      }}
                                      onClick={() => handleCellClick(day, time, cabin.id.toString())}
                                    >
                                      {isBlocked && (
                                        <div
                                          className="absolute inset-0 flex items-center justify-center p-0.5 bg-pink-100/80 border border-pink-300 rounded-sm m-0.5 overflow-hidden cursor-pointer group"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (cellBlock) {
                                              setSelectedBlock(cellBlock)
                                              setIsBlockModalOpen(true)
                                            }
                                          }}
                                          title={cellBlock?.description || "Bloqueado"}
                                        >
                                          <div className="flex items-center w-full h-full">
                                            <Lock className="h-3 w-3 min-w-[12px] text-pink-600 mr-0.5" />
                                            <span className="text-xs font-medium text-pink-800 truncate w-full">
                                              {cellBlock?.description || ""}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {appointments
                                        .filter(
                                          (apt) =>
                                            apt.date.toDateString() === day.toDateString() &&
                                            apt.startTime === time &&
                                            apt.roomId === cabin.id.toString(),
                                        )
                                        .map((apt, index) => (
                                          <ResizableAppointment
                                            key={apt.id}
                                            appointment={{
                                              ...apt,
                                              phone: apt.phone || ""
                                            }}
                                            index={index}
                                            onResize={handleAppointmentResize}
                                            onClick={(appointment) => {
                                              setSelectedClient({
                                                name: appointment.name,
                                                phone: appointment.phone || "",
                                              })
                                              setSelectedSlot({
                                                date: day,
                                                time: appointment.startTime,
                                                roomId: appointment.roomId,
                                              })
                                              setIsAppointmentDialogOpen(true)
                                            }}
                                          />
                                        ))}
                                      {provided.placeholder}
                                    </div>
                                  )
                                }}
                              </Droppable>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Indicador de tiempo actual */}
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
      </DragDropContext>
    </div>
  )

  // Modificar la función handleAppointmentAdd para ser más eficiente
  const handleAppointmentAdd = useCallback((appointment) => {
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

