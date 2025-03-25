"use client"

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { format, parse, parseISO, isAfter, isBefore, getDay, getDate, isSameDay, addDays, subDays, set, addMinutes, isEqual } from "date-fns"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { AgendaNavBar } from "@/components/agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { ClientSearchDialog } from "./client-search-dialog"
import { AppointmentDialog } from "@/components/appointment-dialog"
import { NewClientDialog } from "@/components/new-client-dialog"
import { ResizableAppointment } from "./resizable-appointment"
import { DragDropContext, Droppable } from "react-beautiful-dnd"
import { Calendar } from "lucide-react"
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Search, Calendar as CalendarIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useSchedule } from "@/hooks/use-schedule"
import { Modal } from "@/components/ui/modal"
import { AppointmentDialog as AppointmentDialogType } from "@/components/appointment-dialog"
import { ResizableAppointment as ResizableAppointmentType } from "@/components/resizable-appointment"
import { CustomDatePicker } from "@/components/custom-date-picker"

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

interface Employee {
  id: string
  name: string
}

interface Cabin {
  id: string
  name: string
  code: string
  color: string
  isActive: boolean
  order: number
}

interface ClinicConfig {
  openTime: string
  closeTime: string
  slotDuration: number
  cabins: Cabin[]
  schedule: any
}

// Interfaz para bloques contiguos
interface ContiguousBlock {
  block: ScheduleBlock
  startTime: string
  endTime: string
  startIndex: number
  endIndex: number
  roomId: string
}

// Modificar la definición de props para incluir onViewChange:
interface DayViewProps {
  date: string
  containerMode?: boolean
  appointments?: any[]
  employees?: Employee[]
  cabins?: Cabin[]
  clinicConfig?: ClinicConfig
  onAddAppointment?: (startTime: Date, endTime: Date, cabinId: string) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onViewChange?: (view: "weekly" | "day") => void
}

// Modificar la firma de la función para aceptar props
export default function DayView({
  date,
  containerMode = false,
  appointments: initialAppointments = [],
  employees = [],
  cabins = [],
  clinicConfig = {},
  onAddAppointment,
  onAppointmentClick,
  onViewChange,
}: DayViewProps) {
  const router = useRouter()
  const { activeClinic } = useClinic()
  const { getBlocksByDateRange, createBlock, updateBlock, deleteBlock } = useScheduleBlocks()
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parseISO(date)
    } catch (error) {
      console.error("Error al parsear fecha:", error)
      return new Date()
    }
  })

  // Añadir un efecto para actualizar currentDate cuando cambia la prop date
  useEffect(() => {
    try {
      const parsedDate = parse(date, "yyyy-MM-dd", new Date())
      // Solo actualizar si la fecha realmente cambió
      if (!isSameDay(parsedDate, currentDate)) {
        setCurrentDate(parsedDate)
      }
    } catch (error) {
      // Error silencioso
    }
  }, [date, currentDate])

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

  // Dentro de la función DayView, añadir estos estados:
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const { toast } = useToast()

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

  // Usar la configuración de la clínica activa o los valores proporcionados como props
  const effectiveClinicConfig: ClinicConfig = {
    openTime: activeClinic?.config?.openTime || clinicConfig?.openTime || "09:00",
    closeTime: activeClinic?.config?.closeTime || clinicConfig?.closeTime || "20:00",
    slotDuration: activeClinic?.config?.slotDuration || clinicConfig?.slotDuration || 15,
    cabins: activeClinic?.config?.cabins || clinicConfig?.cabins || [],
    schedule: activeClinic?.config?.schedule || clinicConfig?.schedule || {}
  };
  
  // Reemplazar todas las referencias a clinicConfigContext por effectiveClinicConfig
  const openTime = effectiveClinicConfig.openTime;
  const closeTime = effectiveClinicConfig.closeTime;
  const slotDuration = effectiveClinicConfig.slotDuration;
  
  // Obtener cabinas de la configuración efectiva
  const effectiveCabins = cabins.length > 0 ? cabins : effectiveClinicConfig.cabins;

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
      }
      const dayKey = dayMap[day] || day
      return effectiveClinicConfig.schedule?.[dayKey]?.isOpen ?? false
    },
    [effectiveClinicConfig.schedule],
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
      }
      const dayKey = dayMap[day] || day
      const daySchedule = effectiveClinicConfig.schedule?.[dayKey]

      if (!daySchedule?.isOpen) return false

      // Verificar si el horario está dentro de algún rango definido para ese día
      return daySchedule.ranges.some((range) => time >= range.start && time <= range.end)
    },
    [effectiveClinicConfig.schedule],
  )

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)

  // Efecto para centrar automáticamente en la línea de tiempo actual al cargar
  useEffect(() => {
    if (agendaRef.current) {
      // Dar tiempo para que se complete el renderizado
      const timeoutId = setTimeout(() => {
        // Buscar el indicador de tiempo actual
        const timeIndicator = agendaRef.current.querySelector('.current-time-indicator');
        
        // Si encontramos el indicador, hacer scroll hasta él
        if (timeIndicator) {
          const indicatorPosition = (timeIndicator as HTMLElement).offsetTop;
          const agendaHeight = agendaRef.current.clientHeight;
          
          // Calcular la posición para centrar la línea en la pantalla
          const scrollPosition = Math.max(0, indicatorPosition - (agendaHeight / 2));
          
          // Hacer scroll
          agendaRef.current.scrollTo({
            top: scrollPosition,
            behavior: 'auto'
          });
        }
      }, 300); // Dar tiempo para que se renderice todo
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Filtrar citas para el día actual
  const dayAppointments = appointments.filter((apt) => apt.date.toDateString() === currentDate.toDateString())

  // Corregir la función findBlockForCell
  const findBlockForCell = (date: string, time: string, roomId: string): ScheduleBlock | null => {
    return (
      scheduleBlocks.find((block) => {
        // Verificar fecha
        if (block.date !== date && !isRecurringBlockApplicable(block, date)) {
          return false
        }

        // Verificar hora
        if (time < block.startTime || time >= block.endTime) {
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

  // Nueva función para identificar bloques contiguos
  const findContiguousBlocks = (date: string, roomId: string): ContiguousBlock[] => {
    const contiguousBlocks: ContiguousBlock[] = []

    if (timeSlots.length === 0) return contiguousBlocks

    let currentBlock: ScheduleBlock | null = null
    let startTime = ""
    let startIndex = -1

    // Recorrer todos los slots de tiempo para encontrar bloques contiguos
    timeSlots.forEach((time, index) => {
      const blockForCell = findBlockForCell(date, time, roomId)

      // Si encontramos un bloque y no teníamos uno antes, o si es un bloque diferente
      if (blockForCell && (currentBlock === null || blockForCell.id !== currentBlock.id)) {
        // Si ya teníamos un bloque en curso, lo finalizamos
        if (currentBlock !== null && startIndex !== -1) {
          contiguousBlocks.push({
            block: currentBlock,
            startTime,
            endTime: timeSlots[index - 1],
            startIndex,
            endIndex: index - 1,
            roomId,
          })
        }

        // Iniciamos un nuevo bloque
        currentBlock = blockForCell
        startTime = time
        startIndex = index
      }
      // Si no hay bloque en esta celda pero teníamos uno en curso
      else if (!blockForCell && currentBlock !== null) {
        // Finalizamos el bloque actual
        contiguousBlocks.push({
          block: currentBlock,
          startTime,
          endTime: timeSlots[index - 1],
          startIndex,
          endIndex: index - 1,
          roomId,
        })

        // Reiniciamos
        currentBlock = null
        startTime = ""
        startIndex = -1
      }

      // Si llegamos al final y tenemos un bloque en curso, lo finalizamos
      if (index === timeSlots.length - 1 && currentBlock !== null) {
        contiguousBlocks.push({
          block: currentBlock,
          startTime,
          endTime: time,
          startIndex,
          endIndex: index,
          roomId,
        })
      }
    })

    return contiguousBlocks
  }

  // Función para abrir el modal de bloqueo directamente
  const openBlockModal = (block: ScheduleBlock) => {
    console.log("Abriendo modal para bloque:", block)
    setSelectedBlock(block)
    setIsBlockModalOpen(true)
  }

  // Funciones para manejar citas
  const handleCellClick = (date: Date, time: string, roomId: string) => {
    // Verificar si la celda está bloqueada
    const dayString = format(date, "yyyy-MM-dd")
    const blockForCell = findBlockForCell(dayString, time, roomId)

    if (blockForCell) {
      // Si está bloqueada, abrimos el modal de bloqueo con los datos
      console.log("Celda bloqueada: ", blockForCell)
      // Usar setTimeout para asegurar que el estado se actualice correctamente
      setTimeout(() => {
        openBlockModal(blockForCell)
      }, 0)
      return // Importante añadir este return
    }

    // Solo si no está bloqueada, continuar con la lógica original
    if (!isTimeSlotAvailable(date, time)) return

    // Intentar diferentes formas de comparación para encontrar la cabina
    const cabin = effectiveCabins.find((c) => {
      return c.id === roomId || c.id.toString() === roomId || String(c.id) === roomId
    })

    // Si encontramos una cabina, o si forzamos la apertura del diálogo
    if (cabin || effectiveCabins.length > 0) {
      setSelectedSlot({ date, time, roomId })
      setIsSearchDialogOpen(true)
    }
  }

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
      client: { name: string; phone: string }
      services: { id: string; name: string; category: string }[]
      time: string
      comment?: string
    }) => {
      if (selectedSlot) {
        // Modificar esta parte para usar la primera cabina activa si no se encuentra la específica
        const cabin =
          effectiveCabins.find(
            (c) =>
              c.id === selectedSlot.roomId ||
              c.id.toString() === selectedSlot.roomId ||
              String(c.id) === selectedSlot.roomId,
          ) || effectiveCabins[0]

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
    [selectedSlot, effectiveCabins],
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

    const [roomId, time] = destination.droppableId.split("-")

    const updatedAppointment = {
      ...movedAppointment,
      date: currentDate,
      roomId,
      startTime: time,
    }

    updatedAppointments.push(updatedAppointment)
    setAppointments(updatedAppointments)
    setIsAppointmentDialogOpen(false)
  }

  // Componente para renderizar un bloque contiguo
  const ContiguousBlockComponent = ({ contiguousBlock }: { contiguousBlock: ContiguousBlock }) => {
    const { block, startIndex, endIndex } = contiguousBlock
    const height = (endIndex - startIndex + 1) * AGENDA_CONFIG.ROW_HEIGHT

    return (
      <div
        className="absolute left-0 right-0 z-10 flex items-center bg-pink-100/80 border border-pink-300 rounded-sm m-0.5 overflow-hidden cursor-pointer group"
        style={{
          top: 0,
          height: `${height}px`,
        }}
        onClick={(e) => {
          e.stopPropagation()
          openBlockModal(block)
        }}
        title={block?.description || "Bloqueado"}
      >
        <div className="flex items-center w-full h-full p-1">
          <Lock className="h-3 w-3 min-w-[12px] flex-shrink-0 text-pink-600 mr-1" />
          <span className="text-xs font-medium text-pink-800 truncate text-ellipsis max-w-[calc(100%-20px)]">
            {block?.description || ""}
          </span>
        </div>
      </div>
    )
  }

  // Modificar el return para omitir la cabecera en modo contenedor
  const renderDayGrid = () => (
    <div className="flex-1 overflow-auto">
      <DragDropContext onDragEnd={onDragEnd}>
        <div ref={agendaRef} className="relative z-0" style={{ scrollBehavior: "smooth" }}>
          <div className="min-w-[800px] relative">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `auto repeat(1, 1fr)`,
                minWidth: "800px",
                width: "100%",
              }}
            >
              {/* Columna de tiempo */}
              <div className="sticky top-0 z-20 bg-white border-b p-4 w-20">
                <div className="text-sm text-gray-500">Hora</div>
              </div>

              {/* Cabecera del día */}
              <div className="sticky top-0 z-20 bg-white border-b border-x border-gray-200">
                <div className={cn("p-4", currentDate.toDateString() === new Date().toDateString() && "bg-blue-50/50")}>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-medium capitalize">
                      {format(currentDate, "EEEE", { locale: es })}
                    </div>
                    <button
                      onClick={() => {
                        // Obtener la fecha de hoy
                        const today = new Date()
                        const formattedToday = format(today, "yyyy-MM-dd")

                        if (onViewChange) {
                          onViewChange("weekly")
                        } else {
                          // Navegar a la vista semanal con la fecha de hoy
                          router.push(`/agenda/semana/${formattedToday}`)
                        }
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      title="Ir a vista semanal (hoy)"
                    >
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </button>
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      currentDate.toDateString() === new Date().toDateString()
                        ? "text-purple-600 font-bold"
                        : "text-gray-500",
                    )}
                  >
                    {format(currentDate, "d/M/yyyy")}
                  </div>
                </div>
                <div
                  className="grid border-t border-gray-200"
                  style={{
                    gridTemplateColumns: `repeat(${effectiveCabins.length}, 1fr)`,
                  }}
                >
                  {effectiveCabins.map((cabin) => (
                    <div
                      key={cabin.id}
                      className="text-white text-xs py-2 px-1 text-center font-medium"
                      style={{ backgroundColor: cabin.color }}
                    >
                      {cabin.code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Slots de tiempo y citas */}
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  <div
                    className="border-r border-b p-2 text-sm text-purple-600 sticky left-0 bg-white font-medium w-20"
                    data-time={time}
                  >
                    {time}
                  </div>
                  <div className="border-r border-b border-gray-200" data-time={time} style={{ minWidth: "150px" }}>
                    <div
                      className={`h-full ${
                        currentDate.toDateString() === new Date().toDateString()
                          ? "border-x-2 border-blue-300 bg-blue-50/50"
                          : "border-x border-gray-200"
                      }`}
                    >
                      <div
                        className="grid"
                        style={{
                          height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                          gridTemplateColumns: `repeat(${effectiveCabins.length}, 1fr)`,
                        }}
                      >
                        {effectiveCabins.map((cabin, cabinIndex) => {
                          const isAvailable = isTimeSlotAvailable(currentDate, time)
                          const dayString = format(currentDate, "yyyy-MM-dd")

                          // Encontrar todos los bloques contiguos para esta cabina
                          const contiguousBlocks = findContiguousBlocks(dayString, cabin.id.toString())

                          // Determinar si esta celda es parte de un bloque contiguo
                          const timeIndex = timeSlots.indexOf(time)
                          const contiguousBlock = contiguousBlocks.find(
                            (block) => timeIndex >= block.startIndex && timeIndex <= block.endIndex,
                          )

                          // Determinar si esta celda es el inicio de un bloque contiguo
                          const isStartOfBlock = contiguousBlock && timeIndex === contiguousBlock.startIndex

                          return (
                            <Droppable
                              droppableId={`${cabin.id}-${time}`}
                              key={`${cabin.id}-${time}`}
                              type="appointment"
                              isDropDisabled={!isAvailable}
                              isCombineEnabled={false}
                              ignoreContainerClipping={false}
                            >
                              {(provided, snapshot) => {
                                const cellBlock = findBlockForCell(
                                  format(currentDate, "yyyy-MM-dd"),
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
                                    onClick={() => handleCellClick(currentDate, time, cabin.id.toString())}
                                  >
                                    {/* Renderizar el bloque contiguo solo en la primera celda del bloque */}
                                    {isStartOfBlock && contiguousBlock && (
                                      <ContiguousBlockComponent contiguousBlock={contiguousBlock} />
                                    )}

                                    {/* No mostrar el bloque individual si es parte de un bloque contiguo */}
                                    {isBlocked && !contiguousBlock && (
                                      <div
                                        className="absolute inset-0 flex items-center p-1 bg-pink-100/80 border border-pink-300 rounded-sm m-0.5 overflow-hidden cursor-pointer group"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (cellBlock) {
                                            console.log("Celda bloqueada clickeada:", cellBlock)
                                            // Usar la función directa para abrir el modal
                                            openBlockModal(cellBlock)
                                          }
                                        }}
                                        title={cellBlock?.description || "Bloqueado"}
                                      >
                                        <div className="flex items-center w-full h-full">
                                          <Lock className="h-3 w-3 min-w-[12px] flex-shrink-0 text-pink-600 mr-1" />
                                          <span className="text-xs font-medium text-pink-800 truncate text-ellipsis max-w-[calc(100%-20px)]">
                                            {cellBlock?.description || ""}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {appointments
                                      .filter(
                                        (apt) =>
                                          apt.date.toDateString() === currentDate.toDateString() &&
                                          apt.startTime === time &&
                                          apt.roomId === cabin.id.toString(),
                                      )
                                      .map((apt, index) => (
                                        <ResizableAppointment
                                          key={apt.id}
                                          appointment={apt}
                                          index={index}
                                          onResize={handleAppointmentResize}
                                          onClick={(appointment) => {
                                            setSelectedClient({
                                              name: appointment.name,
                                              phone: appointment.phone || "",
                                            })
                                            setSelectedSlot({
                                              date: currentDate,
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

  // Añadir este efecto para cargar los bloqueos:
  useEffect(() => {
    const loadBlocks = async () => {
      if (!activeClinic?.id) return;
      
      try {
        // Obtener la fecha formateada
        const dateStr = format(currentDate, "yyyy-MM-dd");
        
        // Usar el contexto especializado para obtener bloques
        const blocks = await getBlocksByDateRange(
          String(activeClinic.id),
          dateStr,
          dateStr
        );
        
        if (Array.isArray(blocks)) {
          setScheduleBlocks(blocks);
        } else {
          console.error("Los bloques devueltos no son un array:", blocks);
          setScheduleBlocks([]);
        }
      } catch (error) {
        console.error("Error al cargar bloques de agenda:", error);
        setScheduleBlocks([]);
      }
    };
    
    loadBlocks();
  }, [activeClinic?.id, currentDate, getBlocksByDateRange, updateKey]);

  // Implementar una función que renderice los modales para evitar duplicación
  const renderModals = () => {
    return (
      <>
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

        <NewClientDialog 
          isOpen={isNewClientDialogOpen} 
          onClose={() => setIsNewClientDialogOpen(false)} 
        />

        <BlockScheduleModal
          open={isBlockModalOpen}
          onOpenChange={(open) => {
            setIsBlockModalOpen(open)
            // Si se cierra el modal, recargar los bloques para actualizar la UI
            if (!open && activeClinic?.id) {
              // Recargar bloques usando la interfaz
              const formattedDate = format(currentDate, "yyyy-MM-dd");
              getBlocksByDateRange(
                String(activeClinic.id),
                formattedDate,
                formattedDate
              ).then(blocks => {
                if (Array.isArray(blocks)) {
                  setScheduleBlocks(blocks);
                }
                setUpdateKey((prev) => prev + 1);
              }).catch(error => {
                console.error("Error al recargar bloques:", error);
              });
            }
          }}
          clinicRooms={effectiveCabins}
          blockToEdit={selectedBlock}
          clinicId={activeClinic?.id ? String(activeClinic.id) : ""}
          onBlockSaved={() => {
            // Recargar los bloques
            if (activeClinic?.id) {
              // Recargar bloques usando la interfaz
              const formattedDate = format(currentDate, "yyyy-MM-dd");
              getBlocksByDateRange(
                String(activeClinic.id),
                formattedDate,
                formattedDate
              ).then(blocks => {
                if (Array.isArray(blocks)) {
                  setScheduleBlocks(blocks);
                }
                setUpdateKey((prev) => prev + 1);
              }).catch(error => {
                console.error("Error al recargar bloques después de guardar:", error);
              });
            }
          }}
          clinicConfig={{
            openTime: effectiveClinicConfig.openTime || "09:00",
            closeTime: effectiveClinicConfig.closeTime || "20:00",
            weekendOpenTime: effectiveClinicConfig.openTime || "09:00",
            weekendCloseTime: effectiveClinicConfig.closeTime || "14:00",
          }}
        />
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
      <div className="flex flex-col h-screen">
        {/* Encabezado */}
        <header className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Agenda Diaria</h1>
              <p className="text-gray-500 capitalize">
                {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onViewChange ? onViewChange("weekly") : router.push(`/agenda/semana/${format(currentDate, "yyyy-MM-dd")}`)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Vista Semanal
            </Button>
          </div>
          
          {/* Barra de navegación */}
          <AgendaNavBar
            currentDate={currentDate}
            setCurrentDate={(date) => {
              setCurrentDate(date)
              router.push(`/agenda/dia/${format(date, "yyyy-MM-dd")}`)
            }}
            view="day"
            isDayActive={isDayActive}
            appointments={appointments}
          />
        </header>
        
        {/* Contenido */}
        <div className="flex-1 overflow-auto">
          {renderDayGrid()}
        </div>
        
        {/* Modals */}
        {renderModals()}
      </div>
    </HydrationWrapper>
  )
}

