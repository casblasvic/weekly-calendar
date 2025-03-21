"use client"

import { useState, useEffect } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { BlockScheduleModal } from "./block-schedule-modal"
import { NewClientModal } from "./new-client-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useMobileDetection } from "@/hooks/use-mobile-detection"

// Importar dinámicamente el componente MobileWeeklyAgenda
const MobileWeeklyAgenda = dynamic(() => import("../mobile-weekly-agenda"), { ssr: false })

interface WeeklyAgendaProps {
  rooms: Room[]
  blocks: ScheduleBlock[]
  clinicConfig: ClinicConfig
  onCreateBlock: (block: ScheduleBlock) => void
  onUpdateBlock: (block: ScheduleBlock) => void
  onDeleteBlock: (blockId: string) => void
  onDeleteAllBlocks: (blockId: string) => void
  onCreateClient: (client: Client) => void
}

interface Room {
  id: string
  name: string
  color: string
}

interface ClinicConfig {
  openTime: string
  closeTime: string
}

interface ScheduleBlock {
  id: string
  date: string
  startTime: string
  endTime: string
  roomId: string
  description: string
  isRecurring: boolean
  color: string
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
}

export function WeeklyAgenda({
  rooms,
  blocks,
  clinicConfig,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDeleteAllBlocks,
  onCreateClient,
}: WeeklyAgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [selectedCell, setSelectedCell] = useState<{
    date: string
    time: string
    roomId: string
  } | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { isMobile } = useMobileDetection()

  const getTimeSlots = (startTime: string, endTime: string, intervalMinutes: number): string[] => {
    const slots: string[] = []
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)

    let totalStartMinutes = startHour * 60 + startMinute
    const totalEndMinutes = endHour * 60 + endMinute

    while (totalStartMinutes < totalEndMinutes) {
      const currentHour = Math.floor(totalStartMinutes / 60)
      const currentMinute = totalStartMinutes % 60
      slots.push(`${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`)
      totalStartMinutes += intervalMinutes
    }

    return slots
  }

  const timeSlots = getTimeSlots(clinicConfig?.openTime || "09:00", clinicConfig?.closeTime || "20:00", 15)

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

  const handlePrevWeek = () => {
    setCurrentDate(addDays(currentDate, -7))
  }

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7))
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setIsCalendarOpen(false)
      setCurrentDate(date)
    }
  }

  const handleCellClick = (date: string, time: string, roomId: string) => {
    const block = findBlockForCell(date, time, roomId)
    if (block) {
      handleBlockClick(block)
    } else {
      setSelectedCell({ date, time, roomId })
      setIsBlockModalOpen(true)
    }
  }

  const handleBlockClick = (block: ScheduleBlock) => {
    console.log("Bloque seleccionado:", block) // Para depuración
    setSelectedBlock(block)
    setIsBlockModalOpen(true)
  }

  const handleCreateBlock = (block: ScheduleBlock) => {
    onCreateBlock(block)
    setIsBlockModalOpen(false)
    setSelectedCell(null)
    toast({
      title: "Bloque creado",
      description: "El bloque ha sido creado exitosamente.",
    })
  }

  const handleUpdateBlock = (block: ScheduleBlock) => {
    onUpdateBlock(block)
    setIsBlockModalOpen(false)
    setSelectedBlock(null)
    toast({
      title: "Bloque actualizado",
      description: "El bloque ha sido actualizado exitosamente.",
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    onDeleteBlock(blockId)
    setIsBlockModalOpen(false)
    setSelectedBlock(null)
    toast({
      title: "Bloque eliminado",
      description: "El bloque ha sido eliminado exitosamente.",
    })
  }

  const handleDeleteAllBlocks = (blockId: string) => {
    onDeleteAllBlocks(blockId)
    setIsBlockModalOpen(false)
    setSelectedBlock(null)
    toast({
      title: "Bloques eliminados",
      description: "Todos los bloques recurrentes han sido eliminados.",
    })
  }

  const handleCreateClient = (client: Client) => {
    onCreateClient(client)
    setIsNewClientDialogOpen(false)
    toast({
      title: "Cliente creado",
      description: "El cliente ha sido creado exitosamente.",
    })
  }

  const findBlockForCell = (date: string, time: string, roomId: string): ScheduleBlock | undefined => {
    return blocks.find((block) => {
      if (block.date !== date || block.roomId !== roomId) return false

      const blockStart = convertTimeToMinutes(block.startTime)
      const blockEnd = convertTimeToMinutes(block.endTime)
      const cellTime = convertTimeToMinutes(time)

      return cellTime >= blockStart && cellTime < blockEnd
    })
  }

  const convertTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const handleViewDayClick = (date: Date) => {
    router.push(`/day-view?date=${format(date, "yyyy-MM-dd")}`)
  }

  // Función para renderizar las celdas, modificada para agrupar visualmente bloques consecutivos
  const renderCell = (day: Date, time: string, roomId: string, index: number) => {
    const formattedDate = format(day, "yyyy-MM-dd")
    const block = findBlockForCell(formattedDate, time, roomId)

    if (block) {
      // Determinar si es parte de un bloque consecutivo
      const prevTime = index > 0 ? timeSlots[index - 1] : null
      const nextTime = index < timeSlots.length - 1 ? timeSlots[index + 1] : null

      const isPrevCellSameBlock = prevTime && findBlockForCell(formattedDate, prevTime, roomId)?.id === block.id
      const isNextCellSameBlock = nextTime && findBlockForCell(formattedDate, nextTime, roomId)?.id === block.id

      // Determinar la posición en el bloque y aplicar estilos correspondientes
      let cellStyle = `bg-${block.color}-100 cursor-pointer transition-colors`

      if (!isPrevCellSameBlock && isNextCellSameBlock) {
        // Primera celda del bloque
        cellStyle += " rounded-t-md border-t border-l border-r border-gray-300"
      } else if (isPrevCellSameBlock && isNextCellSameBlock) {
        // Celda intermedia
        cellStyle += " border-l border-r border-gray-300"
      } else if (isPrevCellSameBlock && !isNextCellSameBlock) {
        // Última celda del bloque
        cellStyle += " rounded-b-md border-b border-l border-r border-gray-300"
      } else {
        // Bloque de una sola celda
        cellStyle += " rounded-md border border-gray-300"
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full h-full">
              <div className={cellStyle} onClick={() => handleBlockClick(block)}>
                {/* Mostrar el candado y descripción solo en la primera celda o celda única */}
                {!isPrevCellSameBlock && (
                  <div className="flex items-center justify-center p-1 h-full">
                    <Lock className="h-3 w-3 text-gray-500 mr-1" />
                    <span className="text-xs truncate">{block.description}</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{block.description}</p>
              <p>
                {block.startTime} - {block.endTime}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <div
        className="border border-gray-200 h-6 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => handleCellClick(formattedDate, time, roomId)}
      />
    )
  }

  return (
    <div className="container mx-auto p-4">
      {!isMobile && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={handlePrevWeek} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={handleNextWeek} aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-100 w-20"></th>
                  {weekDays.map((day) => (
                    <th key={day.toString()} className="border border-gray-300 p-2 bg-gray-100">
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{format(day, "EEE", { locale: es })}</span>
                        <Button variant="link" className="p-0 h-auto" onClick={() => handleViewDayClick(day)}>
                          {format(day, "d/M")}
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-100"></th>
                  {weekDays.map((day, dayIndex) => (
                    <th key={`header-${dayIndex}`} className="border border-gray-300 p-1 bg-gray-100">
                      <div className="flex justify-around">
                        {rooms.map((room) => (
                          <div
                            key={`${dayIndex}-${room.id}`}
                            className={`w-16 text-center text-xs font-medium text-white p-1 bg-${room.color}-500 rounded`}
                          >
                            {room.name}
                          </div>
                        ))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, timeIndex) => (
                  <tr key={time}>
                    <td className="border border-gray-300 p-1 text-center text-sm">{time}</td>
                    {weekDays.map((day, dayIndex) => (
                      <td key={`${dayIndex}-${time}`} className="border border-gray-300 p-0">
                        <div className="flex justify-around">
                          {rooms.map((room) => (
                            <div key={`${dayIndex}-${time}-${room.id}`} className="w-16">
                              {renderCell(day, time, room.id, timeIndex)}
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isMobile && (
        <MobileWeeklyAgenda
          timeSlots={timeSlots}
          currentDate={currentDate}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onCellClick={handleCellClick}
          rooms={rooms}
          blocks={blocks}
          findBlockForCell={findBlockForCell}
        />
      )}

      <BlockScheduleModal
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false)
          setSelectedBlock(null)
          setSelectedCell(null)
        }}
        rooms={rooms}
        selectedBlock={selectedBlock}
        selectedCell={selectedCell}
        onCreateBlock={handleCreateBlock}
        onUpdateBlock={handleUpdateBlock}
        onDeleteBlock={handleDeleteBlock}
        onDeleteAllBlocks={handleDeleteAllBlocks}
        onNewClient={() => setIsNewClientDialogOpen(true)}
      />

      {isNewClientDialogOpen && (
        <NewClientModal
          isOpen={isNewClientDialogOpen}
          onClose={() => setIsNewClientDialogOpen(false)}
          onClientCreated={handleCreateClient}
        />
      )}
    </div>
  )
}

