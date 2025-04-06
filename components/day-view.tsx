"use client"

import React, { useMemo } from "react"

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
import { AppointmentItem } from "./appointment-item"
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
// import { useSchedule } from "@/hooks/use-schedule"
// import { Modal } from "@/components/ui/modal"
import { AppointmentDialog as AppointmentDialogType } from "@/components/appointment-dialog"
import { AppointmentItem as AppointmentItemType } from "@/components/appointment-item"
import { CustomDatePicker } from "@/components/custom-date-picker"
import { Appointment } from "@/types/appointments"
import { Cabin } from '@prisma/client';
import { WeekSchedule } from "@/types/schedule";

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

// Interfaz para bloques contiguos
interface ContiguousBlock {
  block: ScheduleBlock
  startTime: string
  endTime: string
  startIndex: number
  endIndex: number
  roomId: string
}

interface DayViewProps {
  date: string
  containerMode?: boolean
  appointments?: Appointment[]
  employees?: Employee[]
  cabins?: Cabin[]
  onAddAppointment?: (startTime: Date, endTime: Date, cabinId: string) => void
  onAppointmentClick?: (appointmentId: string) => void
  onViewChange?: (view: "weekly" | "day") => void
}

export default function DayView({
  date,
  containerMode = false,
  appointments: initialAppointments = [],
  employees = [],
  cabins = [],
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

  // Derivar configuración del activeClinic
  const schedule = useMemo(() => activeClinic?.scheduleJson as unknown as WeekSchedule | null, [activeClinic?.scheduleJson]);
  const openTime = useMemo(() => activeClinic?.openTime ?? "09:00", [activeClinic?.openTime]);
  const closeTime = useMemo(() => activeClinic?.closeTime ?? "20:00", [activeClinic?.closeTime]);
  const slotDuration = useMemo(() => activeClinic?.slotDuration ?? 15, [activeClinic?.slotDuration]);

  // --- LOG: Configuración de horario derivada ---
  console.log("[DayView] Derived schedule config:", { openTime, closeTime, slotDuration, schedule });
  // ------------------------------------------

  // Usar la prop 'cabins' directamente (ya es del tipo Prisma y filtrada en el padre)
  const effectiveCabins = cabins;

  // Regenerar timeSlots si es necesario
  const timeSlots = useMemo(() => {
     const slots = [];
     let [h, m] = openTime.split(':').map(Number);
     const [endH, endM] = closeTime.split(':').map(Number);
     const endTotalMinutes = endH * 60 + endM;
     let currentTotalMinutes = h * 60 + m;

     // Asegurar un límite para evitar bucles infinitos si la configuración es inválida
     let safeGuard = 0;
     const maxSlots = (24 * 60) / slotDuration; // Máximo de slots en un día

     while (currentTotalMinutes <= endTotalMinutes && safeGuard < maxSlots * 2) {
       slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
       currentTotalMinutes += slotDuration;
       h = Math.floor(currentTotalMinutes / 60);
       m = currentTotalMinutes % 60;
       safeGuard++;
     }
     if (safeGuard >= maxSlots * 2) {
        console.warn("Posible bucle infinito detectado en la generación de timeSlots. Verifique la configuración openTime/closeTime/slotDuration.", { openTime, closeTime, slotDuration });
        return []; // Devolver array vacío en caso de problema
     }
     return slots;
  }, [openTime, closeTime, slotDuration]);

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
         isActive = schedule?.[dayKey as keyof WeekSchedule]?.isOpen ?? false;
         // --- LOG: Comprobación isDayActive ---
         console.log(`[DayView] isDayActive check for ${format(date, 'yyyy-MM-dd')} (key: ${dayKey}): ${isActive}`);
         // -----------------------------------
      } catch (error) {
         console.error("[DayView] Error in isDayActive:", error);
      }
      return isActive;
    },
    [schedule],
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
      } as const;
      const dayKey = dayMap[day as keyof typeof dayMap] || day;
      let isAvailable = false;
      try {
        const daySchedule = schedule?.[dayKey as keyof WeekSchedule];
        if (!daySchedule || !daySchedule.isOpen || !daySchedule.ranges) {
          isAvailable = false;
        } else {
          isAvailable = daySchedule.ranges.some((range) => time >= range.start && time < range.end);
        }
        // --- LOG: Comprobación isTimeSlotAvailable ---
        console.log(`[DayView] isTimeSlotAvailable check for ${format(date, 'yyyy-MM-dd')} ${time} (key: ${dayKey}): ${isAvailable}`);
        // -------------------------------------------
      } catch(error) {
         console.error("[DayView] Error in isTimeSlotAvailable:", error);
      }
      return isAvailable;
    },
    [schedule],
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
      blocks: number
      tags?: string[]
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
            duration: appointmentData.blocks || 2, // Usar la duración especificada o valor por defecto
            color: cabin.color, // Use cabin color
            phone: appointmentData.client.phone,
            tags: appointmentData.tags || [], // Incluir etiquetas
          }

          setAppointments((prev) => [...prev, newAppointment])
        }
      }
    },
    [selectedSlot, effectiveCabins],
  )

  const handleAppointmentResize = (id: string, newDuration: number) => {
    // Esta función ya no es necesaria con el nuevo componente sin redimensionamiento
    // Podemos mantenerla vacía o modificarla para cambiar la duración de otra manera
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
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

  // Añadir un estado para la cita seleccionada
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // Agregar un manejador para el clic en una cita existente
  const handleAppointmentClick = (appointment: Appointment) => {
    console.log("Cita seleccionada para edición:", appointment)
    setSelectedAppointment(appointment)
    
    // Configurar los datos necesarios para editar la cita
    const client = {
      name: appointment.name,
      phone: appointment.phone || ""
    }
    
    setSelectedClient(client)
    setSelectedSlot({
      date: appointment.date,
      time: appointment.startTime,
      roomId: appointment.roomId
    })
    
    // Abrir el diálogo de edición
    setIsAppointmentDialogOpen(true)
  }

  // Estructura corregida para el renderDayGrid
  const renderDayGrid = () => (
    <div className="bg-gray-100 relative p-1">
      <div ref={agendaRef} style={{ scrollBehavior: "smooth" }}>
        <div className="min-w-[800px] relative min-h-[400px]">
          <div
            className="grid bg-white"
            style={{
              gridTemplateColumns: `auto repeat(${effectiveCabins.length || 1}, minmax(100px, 1fr))`,
              width: "100%",
            }}
          >
            {/* ---- INICIO CABECERA FIJA ---- */}
            {/* Columna de tiempo */}
            <div className="sticky top-0 z-20 bg-white border-b border-r border-gray-300 p-2 w-20 flex items-center justify-center">
              <div className="text-xs font-medium text-gray-600">Hora</div>
            </div>

            {/* Cabeceras de Cabina */}
            {effectiveCabins.map((cabin) => (
              <div
                key={cabin.id}
                className="sticky top-0 z-20 border-b border-r border-gray-300 last:border-r-0 p-1 text-center"
                style={{ backgroundColor: cabin.color }}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className={cn(
                    "text-[10px] font-bold px-1 rounded",
                    isColorLight(cabin.color) ? "text-black" : "text-white"
                  )}>
                    {cabin.code || cabin.name.substring(0,3)}
                  </span>
                  <div className={cn(
                    "text-[10px] mt-0.5 truncate w-full",
                    isColorLight(cabin.color) ? "text-gray-700" : "text-gray-100"
                  )} title={cabin.name}>
                    {cabin.name}
                  </div>
                </div>
              </div>
            ))}
             {/* Placeholder si NO hay cabinas */}
             {effectiveCabins.length === 0 && (
                <div className="sticky top-0 z-20 bg-gray-50 border-b border-r border-gray-300 p-2 text-center text-gray-400 italic col-span-1">
                  (Sin cabinas activas)
                </div>
             )}
            {/* ---- FIN CABECERA FIJA ---- */}

            {/* ---- INICIO CUERPO CON COLUMNA DE TIEMPO FIJA ---- */}
            {timeSlots.map((time, timeIndex) => (
              <React.Fragment key={time}>
                {/* Columna de Tiempo */}
                <div
                  className="sticky left-0 z-10 border-r border-b border-gray-300 px-2 py-1 text-[10px] text-purple-700 bg-purple-50/50 font-medium w-20 flex items-center justify-center"
                  style={{ height: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}
                  data-time={time}
                >
                  {time}
                </div>
                {/* Celdas de Cabina */}
                {effectiveCabins.map((cabin, cabinIndex) => {
                  const isAvailable = isTimeSlotAvailable(currentDate, time);
                  const dayString = format(currentDate, "yyyy-MM-dd");
                  const blockForCell = findBlockForCell ? findBlockForCell(dayString, time, cabin.id.toString()) : null;
                  const isCellInteractive = isAvailable && !blockForCell;
                  const isCellClickable = isCellInteractive || !!blockForCell;

                  // Lógica para agrupar bloques
                  const prevTime = timeIndex > 0 ? timeSlots[timeIndex - 1] : null;
                  const blockForPrevCell = prevTime ? findBlockForCell(dayString, prevTime, cabin.id.toString()) : null;
                  const isStartOfBlock = blockForCell && (!blockForPrevCell || blockForPrevCell.id !== blockForCell.id);

                  // Calcular duración si es el inicio de un bloque
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
                    <div
                      key={`${cabin.id}-${time}`}
                      className={cn(
                        "relative border-b border-r border-gray-200 last:border-r-0",
                        !isAvailable && "bg-gray-300 dark:bg-gray-700 cursor-not-allowed",
                        isAvailable && [
                          blockForCell && "bg-rose-100 cursor-pointer",
                          isCellInteractive && "hover:bg-purple-100/50 cursor-pointer",
                          blockForCell && !isStartOfBlock && "border-t-0",
                        ]
                      )}
                      style={{
                        height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
                      }}
                      onClick={(e) => {
                        if (isCellInteractive) {
                          e.stopPropagation();
                          handleCellClick(currentDate, time, cabin.id.toString());
                        } else if (blockForCell) {
                          e.stopPropagation();
                          openBlockModal(blockForCell);
                        }
                      }}
                    >
                      {isStartOfBlock && blockForCell && (
                        <div
                          className="absolute inset-x-0 top-0 flex items-center justify-center p-1 bg-rose-200/80 border border-rose-300 rounded-sm m-px overflow-hidden z-10 pointer-events-none"
                          style={{
                            height: `calc(${blockDurationSlots * AGENDA_CONFIG.ROW_HEIGHT}px - 2px)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Lock className="h-3 w-3 text-rose-600 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Placeholder si NO hay cabinas */}
                {effectiveCabins.length === 0 && (
                   <div
                     className="border-b border-r border-gray-200 p-2 text-center text-gray-400 italic flex items-center justify-center"
                     style={{ height: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}
                   >
                     -
                   </div>
                )}
              </React.Fragment>
            ))}
            {/* ---- FIN CUERPO ---- */}
          </div>

          {/* Renderizar citas */}
          {appointments.map((appointment, index) => (
            <AppointmentItem
              key={appointment.id}
              appointment={appointment}
              index={index}
              onClick={handleAppointmentClick}
            />
          ))}

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
      </div>
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
          onClose={() => {
            setIsAppointmentDialogOpen(false)
            setSelectedAppointment(null)
          }}
          client={selectedClient}
          selectedTime={selectedSlot?.time}
          appointment={selectedAppointment}
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
          isEditing={!!selectedAppointment}
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
            openTime: openTime,
            closeTime: closeTime,
            weekendOpenTime: openTime,
            weekendCloseTime: closeTime,
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
            onViewChange={(newView) => {
              if (newView === "week") {
                onViewChange ? onViewChange("weekly") : router.push(`/agenda/semana/${format(currentDate, "yyyy-MM-dd")}`)
              }
            }}
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

