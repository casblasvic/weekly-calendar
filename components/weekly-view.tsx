"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { format, addDays, startOfWeek, parse, isToday } from "date-fns"
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
import { Calendar } from "lucide-react"
import { Lock } from "lucide-react"
import { parseISO, isAfter, isBefore, getDay, getDate, isSameDay } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import type { Appointment } from "@/types/appointment"
import type { Cabin } from "@prisma/client"
import { 
  isBusinessDay, 
  isTimeSlotAvailable as checkTimeSlotAvailable,
  applyScheduleExceptions
} from "@/services/clinic-schedule-service"
import { AgendaWeeklySkeleton } from "@/components/skeletons/agenda-weekly-skeleton"

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
  date: string
}

interface WeeklyViewProps {
  date: string
  containerMode?: boolean
  appointments?: any[]
  employees?: Employee[]
  cabins?: Cabin[]
  onAddAppointment?: (startTime: Date, endTime: Date, cabinId: string) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onViewChange?: (view: "weekly" | "daily", date?: string) => void
}

export default function WeeklyView({
  date,
  containerMode = false,
  appointments: initialAppointments = [],
  employees = [],
  cabins: propCabins = [],
  onAddAppointment,
  onAppointmentClick,
  onViewChange,
}: WeeklyViewProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parse(date, "yyyy-MM-dd", new Date())
    } catch (error) {
      return new Date()
    }
  })

  // Añadir un efecto para actualizar currentDate cuando cambia la prop date
  useEffect(() => {
    try {
      const parsedDate = parse(date, "yyyy-MM-dd", new Date())
      setCurrentDate(parsedDate)
    } catch (error) {
      // Error silencioso
    }
  }, [date])

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

  // Dentro de la función WeeklyView, añadir estos estados:
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
    if (initialAppointments.length > 0) {
      setAppointments(initialAppointments)
    }
  }, [initialAppointments])

  const { activeClinic, activeClinicCabins, isLoading: isLoadingClinic } = useClinic()
  const { getBlocksByDateRange, loading: isLoadingBlocks } = useScheduleBlocks()

  // Crear un estado de carga combinado
  const isLoading = isLoadingClinic || isLoadingBlocks;

  // Añadir este efecto para cargar los bloqueos:
  useEffect(() => {
    const loadBlocks = async () => {
      if (activeClinic?.id) {
        try {
          // Calcular las fechas de inicio y fin de semana
          const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
          const endDate = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
          
          // Cargar bloques usando el contexto especializado
          const blocks = await getBlocksByDateRange(
            String(activeClinic.id),
            startDate,
            endDate
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
      }
    };
    
    loadBlocks();
  }, [activeClinic?.id, currentDate, getBlocksByDateRange]);

  // Obtener configuración de horarios
  const openTime = activeClinic?.openTime || "09:00"
  const closeTime = activeClinic?.closeTime || "18:00"
  const slotDuration = activeClinic?.slotDuration || 15
  const schedule = activeClinic?.scheduleJson

  // Obtener cabinas activas
  const cabinsToUse = useMemo(() => {
    if (propCabins && propCabins.length > 0) {
      return propCabins.filter(c => c.isActive).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (activeClinicCabins && activeClinicCabins.length > 0) {
      return activeClinicCabins;
    }
    return [];
  }, [propCabins, activeClinicCabins]);
  
  const activeCabins = cabinsToUse;

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

  // Calcular días de la semana
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }) // Lunes como inicio de semana
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i))

  // Función para verificar si un día está activo en la configuración
  const isDayActive = useCallback(
    (date: Date) => {
      if (!activeClinic) return false;
      return isBusinessDay(date, activeClinic);
    },
    [activeClinic],
  )

  // Función para verificar si un horario está disponible
  const isTimeSlotAvailable = useCallback(
    (date: Date, time: string) => {
      if (!activeClinic) return false;
      return checkTimeSlotAvailable(date, time, activeClinic);
    },
    [activeClinic],
  )

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)

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
            date,
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
          date,
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
          date,
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
    const dayString = format(date, "yyyy-MM-dd")
    const blockForCell = findBlockForCell(dayString, time, roomId)

    if (blockForCell) {
      setTimeout(() => { openBlockModal(blockForCell) }, 0)
      return
    }

    if (!isTimeSlotAvailable(date, time)) return 

    const cabin = activeCabins.find((c) => String(c.id) === roomId)

    if (cabin || activeCabins.length > 0) {
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
        const cabin = activeCabins[0]

        if (cabin) {
          const newAppointment: Appointment = {
            id: Math.random().toString(36).substr(2, 9),
            name: appointmentData.client.name,
            service: appointmentData.services.map((s) => s.name).join(", "),
            date: selectedSlot.date,
            roomId: selectedSlot.roomId,
            startTime: appointmentData.time,
            duration: appointmentData.blocks || 2,
            color: cabin.color,
            phone: appointmentData.client.phone,
            tags: appointmentData.tags || [],
          }

          setAppointments((prev) => [...prev, newAppointment])
        }
      }
    },
    [selectedSlot, activeCabins],
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

    const [roomId, time, dateStr] = destination.droppableId.split("-")
    const date = new Date(dateStr)

    const updatedAppointment = {
      ...movedAppointment,
      date,
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
        className="absolute inset-0 z-10 flex items-center bg-pink-100/80 border border-pink-300 rounded-sm m-0.5 overflow-hidden cursor-pointer group"
        style={{
          height: `${height}px`,
          top: "0px",
          left: "0px",
          right: "0px",
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
  const renderWeeklyGrid = () => (
    <div className="agenda-container">
      {/* Cabecera fija */}
      <div className="sticky top-0 z-50 bg-white agenda-header">
        <div className="grid" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
          <div className="p-2 grid-header-cell">Hora</div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-2 grid-header-cell">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-medium capitalize">{format(day, "EEEE", { locale: es })}</div>
                  <div className="text-sm text-gray-500">{format(day, "d/M/yyyy")}</div>
                </div>
                <button
                  onClick={() => handleDayClick(day)}
                  className="p-1 transition-colors rounded-full hover:bg-gray-100"
                  title="Ir a vista diaria"
                >
                  <Calendar className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Cuerpo del grid con desplazamiento */}
      <div className="overflow-auto agenda-body">
        <div className="grid-container" style={{ display: "grid", gridTemplateColumns: "auto repeat(7, 1fr)" }}>
          {/* Columna de horas */}
          <div className="hours-column">
            {timeSlots.map((time) => (
              <div key={time} className="h-40 p-2 font-medium text-center grid-cell bg-gray-50">
                {time}
              </div>
            ))}
          </div>
          
          {/* Columnas para cada día */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="day-column">
              {timeSlots.map((time, timeIndex) => (
                <div 
                  key={`${dayIndex}-${timeIndex}`} 
                  className="relative grid-cell"
                  onClick={() => handleCellClick(day, time, String(activeCabins[0]?.id || "1"))}
                />
              ))}
            </div>
          ))}
          
          {/* Citas y eventos superpuestos */}
          {appointments.map((appointment, index) => (
            <AppointmentItem
              key={appointment.id}
              appointment={appointment}
              index={index}
              onClick={handleAppointmentClick}
            />
          ))}
          
          {/* Indicador de hora actual */}
          <div 
            className="current-time-indicator"
            style={{ top: calculateCurrentTimePosition() }}
          />
        </div>
      </div>
    </div>
  )

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

  // Función para manejar el clic en un día
  const handleDayClick = (day: Date) => {
    if (onViewChange) {
      onViewChange("daily", format(day, "yyyy-MM-dd"));
    }
  }

  // Función para calcular la posición del indicador de hora actual
  const calculateCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    const openTimeParts = openTime.split(':').map(Number);
    const openTimeInMinutes = openTimeParts[0] * 60 + openTimeParts[1];
    
    if (currentTimeInMinutes < openTimeInMinutes) {
      return 0;
    }
    
    const totalMinutesInDay = timeSlots.length * slotDuration;
    const minutesSinceOpen = currentTimeInMinutes - openTimeInMinutes;
    const percentOfDay = minutesSinceOpen / totalMinutesInDay;
    
    return percentOfDay * (timeSlots.length * AGENDA_CONFIG.ROW_HEIGHT);
  };

  if (containerMode) {
    return (
      <HydrationWrapper fallback={<AgendaWeeklySkeleton />}>
        <div className="flex flex-col h-full bg-white">
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

          <NewClientDialog isOpen={isNewClientDialogOpen} onClose={() => setIsNewClientDialogOpen(false)} />

          <BlockScheduleModal
            open={isBlockModalOpen}
            onOpenChange={(open) => {
              setIsBlockModalOpen(open)
              if (!open && activeClinic?.id) {
                const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
                const endDate = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
                
                getBlocksByDateRange(
                  String(activeClinic.id),
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
            clinicId={String(activeClinic?.id || "1")}
            clinicConfig={{
              openTime: openTime,
              closeTime: closeTime,
              weekendOpenTime: openTime,
              weekendCloseTime: closeTime,
            }}
          />
        </div>
      </HydrationWrapper>
    )
  }

  // Return original para cuando se usa de forma independiente
  return (
    <HydrationWrapper fallback={<AgendaWeeklySkeleton />}>
      <div className="flex flex-col h-screen bg-white">
        <header className="relative z-30 px-4 py-3 bg-white border-b">
          <div className="px-4 py-3">
            <h1 className="mb-4 text-2xl font-medium">Agenda semanal</h1>
            <div className="text-sm text-gray-500">
              {format(startOfCurrentWeek, "d 'de' MMMM", { locale: es })} -{" "}
              {format(addDays(startOfCurrentWeek, 6), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </div>
          </div>

          {/* Usar el componente compartido AgendaNavBar */}
          <AgendaNavBar
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            view="week"
            isDayActive={isDayActive}
            appointments={appointments}
            onBlocksChanged={() => {
              if (activeClinic?.id) {
                const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
                const endDate = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
                
                getBlocksByDateRange(
                  String(activeClinic.id),
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
        </header>

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

        <NewClientDialog isOpen={isNewClientDialogOpen} onClose={() => setIsNewClientDialogOpen(false)} />

        <BlockScheduleModal
          open={isBlockModalOpen}
          onOpenChange={(open) => {
            setIsBlockModalOpen(open)
            if (!open && activeClinic?.id) {
              const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
              const endDate = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
              
              getBlocksByDateRange(
                String(activeClinic.id),
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
          clinicId={String(activeClinic?.id || "1")}
          clinicConfig={{
            openTime: openTime,
            closeTime: closeTime,
            weekendOpenTime: openTime,
            weekendCloseTime: closeTime,
          }}
        />
      </div>
    </HydrationWrapper>
  )
}

