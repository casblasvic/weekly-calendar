"use client"

import { useState, useMemo } from "react"
import { format, parse, addMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, CalendarIcon, Lock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"

interface Block {
  id: string
  date: string
  startTime: string
  endTime: string
  description: string
  color: string
  isRecurring: boolean
  recurringDays?: string[]
}

interface Cabin {
  id: string
  name: string
  color: string
}

interface ClinicConfig {
  openTime: string
  closeTime: string
}

interface DailyAgendaProps {
  blocks: Block[]
  cabins: Cabin[]
  clinicConfig: ClinicConfig
  onCreateBlock: (block: Omit<Block, "id">) => void
  onUpdateBlock: (block: Block) => void
  onDeleteBlock: (blockId: string) => void
  onDeleteAllBlocks: (blockId: string) => void
}

export default function DailyAgenda({
  blocks,
  cabins,
  clinicConfig,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDeleteAllBlocks,
}: DailyAgendaProps) {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (dateParam) {
      try {
        return new Date(dateParam)
      } catch (e) {
        return new Date()
      }
    }
    return new Date()
  })

  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [isBlockDetailsOpen, setIsBlockDetailsOpen] = useState(false)
  const [isNewBlockDialogOpen, setIsNewBlockDialogOpen] = useState(false)
  const [newBlock, setNewBlock] = useState<Omit<Block, "id">>({
    date: "",
    startTime: "",
    endTime: "",
    description: "",
    color: "",
    isRecurring: false,
    recurringDays: [],
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDate)
  const [selectedCabin, setSelectedCabin] = useState<string>("")
  const [selectedStartTime, setSelectedStartTime] = useState<string>("")
  const [selectedEndTime, setSelectedEndTime] = useState<string>("")

  const timeSlots = useMemo(() => {
    const slots = []
    const openHour = Number.parseInt(clinicConfig.openTime.split(":")[0])
    const openMinute = Number.parseInt(clinicConfig.openTime.split(":")[1])
    const closeHour = Number.parseInt(clinicConfig.closeTime.split(":")[0])
    const closeMinute = Number.parseInt(clinicConfig.closeTime.split(":")[1])

    const startTime = new Date()
    startTime.setHours(openHour, openMinute, 0, 0)

    const endTime = new Date()
    endTime.setHours(closeHour, closeMinute, 0, 0)

    let currentTime = startTime

    while (currentTime < endTime) {
      slots.push(format(currentTime, "HH:mm"))
      currentTime = addMinutes(currentTime, 15)
    }

    return slots
  }, [clinicConfig])

  const handlePrevDay = () => {
    const prevDay = new Date(currentDate)
    prevDay.setDate(prevDay.getDate() - 1)
    setCurrentDate(prevDay)
  }

  const handleNextDay = () => {
    const nextDay = new Date(currentDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setCurrentDate(nextDay)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setCurrentDate(date)
    }
  }

  const findBlockForCell = (timeSlot: string, cabin: Cabin): Block | null => {
    const dayStr = format(currentDate, "yyyy-MM-dd")
    const timeDate = parse(timeSlot, "HH:mm", new Date())

    const matchingBlocks = blocks.filter((block) => {
      // Check if the block is for this cabin
      if (block.color !== cabin.id) return false

      // Check if the block is for this day
      const blockDate = block.date
      const isRecurringOnThisDay =
        block.isRecurring && block.recurringDays?.includes(format(currentDate, "EEEE", { locale: es }))

      if (blockDate !== dayStr && !isRecurringOnThisDay) return false

      // Check if the block covers this time slot
      const blockStart = parse(block.startTime, "HH:mm", new Date())
      const blockEnd = parse(block.endTime, "HH:mm", new Date())

      return timeDate >= blockStart && timeDate <= blockEnd
    })

    return matchingBlocks.length > 0 ? matchingBlocks[0] : null
  }

  const isFirstTimeSlotInBlock = (timeSlot: string, cabin: Cabin, block: Block): boolean => {
    const prevTimeSlot = getPreviousTimeSlot(timeSlot)
    if (!prevTimeSlot) return true

    const prevBlock = findBlockForCell(prevTimeSlot, cabin)
    return !prevBlock || prevBlock.id !== block.id
  }

  const isLastTimeSlotInBlock = (timeSlot: string, cabin: Cabin, block: Block): boolean => {
    const nextTimeSlot = getNextTimeSlot(timeSlot)
    if (!nextTimeSlot) return true

    const nextBlock = findBlockForCell(nextTimeSlot, cabin)
    return !nextBlock || nextBlock.id !== block.id
  }

  const getPreviousTimeSlot = (timeSlot: string): string | null => {
    const index = timeSlots.indexOf(timeSlot)
    if (index <= 0) return null
    return timeSlots[index - 1]
  }

  const getNextTimeSlot = (timeSlot: string): string | null => {
    const index = timeSlots.indexOf(timeSlot)
    if (index === -1 || index === timeSlots.length - 1) return null
    return timeSlots[index + 1]
  }

  const handleCellClick = (timeSlot: string, cabin: Cabin) => {
    const block = findBlockForCell(timeSlot, cabin)

    if (block) {
      // If there's a block, open the block details dialog
      setSelectedBlock(block)
      setIsBlockDetailsOpen(true)
    } else {
      // If there's no block, open the new block dialog
      const dayStr = format(currentDate, "yyyy-MM-dd")
      const endTimeSlot = getNextTimeSlot(timeSlot) || timeSlot

      setNewBlock({
        date: dayStr,
        startTime: timeSlot,
        endTime: endTimeSlot,
        description: "",
        color: cabin.id,
        isRecurring: false,
        recurringDays: [],
      })

      setSelectedDate(currentDate)
      setSelectedCabin(cabin.id)
      setSelectedStartTime(timeSlot)
      setSelectedEndTime(endTimeSlot)

      setIsNewBlockDialogOpen(true)
    }
  }

  const handleCreateBlock = () => {
    // Validate times
    const startTime = parse(newBlock.startTime, "HH:mm", new Date())
    const endTime = parse(newBlock.endTime, "HH:mm", new Date())
    const openTime = parse(clinicConfig.openTime, "HH:mm", new Date())
    const closeTime = parse(clinicConfig.closeTime, "HH:mm", new Date())

    if (startTime >= endTime) {
      toast({
        title: "Error",
        description: "La hora de inicio debe ser anterior a la hora de fin",
        variant: "destructive",
      })
      return
    }

    if (startTime < openTime || endTime > closeTime) {
      toast({
        title: "Error",
        description: `El horario debe estar entre ${clinicConfig.openTime} y ${clinicConfig.closeTime}`,
        variant: "destructive",
      })
      return
    }

    onCreateBlock(newBlock)
    setIsNewBlockDialogOpen(false)
    setNewBlock({
      date: "",
      startTime: "",
      endTime: "",
      description: "",
      color: "",
      isRecurring: false,
      recurringDays: [],
    })
  }

  const handleUpdateBlock = () => {
    if (selectedBlock) {
      onUpdateBlock(selectedBlock)
      setIsBlockDetailsOpen(false)
      setSelectedBlock(null)
    }
  }

  const handleDeleteBlock = () => {
    if (selectedBlock) {
      onDeleteBlock(selectedBlock.id)
      setIsBlockDetailsOpen(false)
      setSelectedBlock(null)
    }
  }

  const handleDeleteAllBlocks = () => {
    if (selectedBlock) {
      onDeleteAllBlocks(selectedBlock.id)
      setIsBlockDetailsOpen(false)
      setSelectedBlock(null)
    }
  }

  const handleRecurringChange = (checked: boolean) => {
    setNewBlock((prev) => ({
      ...prev,
      isRecurring: checked,
      recurringDays: checked ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] : [],
    }))
  }

  const handleRecurringDayChange = (day: string, checked: boolean) => {
    setNewBlock((prev) => ({
      ...prev,
      recurringDays: checked
        ? [...(prev.recurringDays || []), day]
        : (prev.recurringDays || []).filter((d) => d !== day),
    }))
  }

  const handleViewWeeklyAgenda = () => {
    router.push("/weekly-agenda")
  }

  const renderCell = (timeSlot: string, cabin: Cabin) => {
    const block = findBlockForCell(timeSlot, cabin)

    if (block) {
      const isFirstSlot = isFirstTimeSlotInBlock(timeSlot, cabin, block)
      const isLastSlot = isLastTimeSlotInBlock(timeSlot, cabin, block)

      // Determine cell styling based on position in block
      let cellStyle = "relative h-8 border border-gray-200 bg-pink-100 cursor-pointer"

      if (isFirstSlot && isLastSlot) {
        // Single cell block
        cellStyle = "relative h-8 border border-gray-200 bg-pink-100 rounded-md cursor-pointer"
      } else if (isFirstSlot) {
        // First cell in block
        cellStyle =
          "relative h-8 border-l border-r border-t border-gray-200 bg-pink-100 rounded-t-md border-b-0 cursor-pointer"
      } else if (isLastSlot) {
        // Last cell in block
        cellStyle =
          "relative h-8 border-l border-r border-b border-gray-200 bg-pink-100 rounded-b-md border-t-0 cursor-pointer"
      } else {
        // Middle cell in block
        cellStyle = "relative h-8 border-l border-r border-gray-200 bg-pink-100 border-t-0 border-b-0 cursor-pointer"
      }

      return (
        <div
          className={cellStyle} 
          onClick={() => handleCellClick(timeSlot, cabin)}
        >
          {isFirstSlot && (
            <>
              <Lock className="h-3 w-3 absolute top-1 right-1" />
              <div className="text-xs px-1 truncate">{block.description}</div>
            </>
          )}
        </div>
      )
    }

    return (
      <div className="h-8 border border-gray-200 cursor-pointer" onClick={() => handleCellClick(timeSlot, cabin)} />
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => handlePrevDay()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => handleToday()}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleNextDay()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">{format(currentDate, "EEEE, d MMMM yyyy", { locale: es })}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Popover>
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
        </div>
      </div>

      <div className="agenda-container">
        {/* Cabecera fija */}
        <div className="agenda-header sticky top-0 z-50 bg-white">
          <table className="w-full">
            <thead>
              <tr>
                <th className="grid-header-cell w-20 p-2">Hora</th>
                {cabins.map((cabin, index) => (
                  <th
                    key={index}
                    className="grid-header-cell p-2 text-center"
                    style={{ backgroundColor: cabin.color === "Con" ? "red" : cabin.color === "Lun" ? "blue" : "green" }}
                  >
                    {cabin.name}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        
        {/* Cuerpo del grid con desplazamiento */}
        <div className="agenda-body overflow-auto">
          <table className="agenda-grid w-full">
            <tbody>
              {timeSlots.map((timeSlot, timeIndex) => (
                <tr key={timeIndex}>
                  <td className="grid-cell p-2 bg-gray-50 text-center font-medium w-20">{timeSlot}</td>
                  {cabins.map((cabin, cabinIndex) => (
                    <td key={cabinIndex} className="grid-cell p-0 relative">
                      {renderCell(timeSlot, cabin)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Aquí irían los elementos superpuestos como citas o eventos */}
          {blocks.map((appointment) => (
            <div 
              key={appointment.id}
              className="agenda-event"
              style={{
                top: calculateAppointmentTop(appointment),
                left: calculateAppointmentLeft(appointment),
                width: calculateAppointmentWidth(appointment),
                height: calculateAppointmentHeight(appointment),
                backgroundColor: appointment.color || '#3b82f6'
              }}
            >
              {appointment.description}
            </div>
          ))}
          
          {/* Indicador de hora actual */}
          <div 
            className="current-time-indicator"
            style={{ top: calculateCurrentTimePosition() }}
          />
        </div>
      </div>

      {/* Block Details Dialog */}
      <Dialog open={isBlockDetailsOpen} onOpenChange={setIsBlockDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del bloque</DialogTitle>
          </DialogHeader>
          {selectedBlock && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="block-date" className="text-right">
                    Fecha
                  </Label>
                  <Input id="block-date" value={selectedBlock.date} className="col-span-3" readOnly />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="block-start-time" className="text-right">
                    Hora inicio
                  </Label>
                  <Input id="block-start-time" value={selectedBlock.startTime} className="col-span-3" readOnly />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="block-end-time" className="text-right">
                    Hora fin
                  </Label>
                  <Input id="block-end-time" value={selectedBlock.endTime} className="col-span-3" readOnly />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="block-description" className="text-right">
                    Descripción
                  </Label>
                  <Input
                    id="block-description"
                    value={selectedBlock.description}
                    onChange={(e) => setSelectedBlock({ ...selectedBlock, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="block-recurring" className="text-right">
                    Recurrente
                  </Label>
                  <div className="col-span-3">{selectedBlock.isRecurring ? "Sí" : "No"}</div>
                </div>
                {selectedBlock.isRecurring && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Días</Label>
                    <div className="col-span-3">{selectedBlock.recurringDays?.join(", ")}</div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBlockDetailsOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteBlock}>
                  Eliminar
                </Button>
                <Button variant="destructive" onClick={handleDeleteAllBlocks}>
                  Eliminar todos
                </Button>
                <Button onClick={handleUpdateBlock}>Guardar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Block Dialog */}
      <Dialog open={isNewBlockDialogOpen} onOpenChange={setIsNewBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo bloque</DialogTitle>
            <DialogDescription>Rellena los detalles para crear un nuevo bloque en la agenda.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-block-date" className="text-right">
                Fecha
              </Label>
              <div className="col-span-3">{format(currentDate, "PPP", { locale: es })}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-block-cabin" className="text-right">
                Cabina
              </Label>
              <Select
                value={selectedCabin}
                onValueChange={(value) => {
                  setSelectedCabin(value)
                  setNewBlock((prev) => ({ ...prev, color: value }))
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar cabina" />
                </SelectTrigger>
                <SelectContent>
                  {cabins.map((cabin) => (
                    <SelectItem key={cabin.id} value={cabin.id}>
                      {cabin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-block-start-time" className="text-right">
                Hora inicio
              </Label>
              <Select
                value={selectedStartTime}
                onValueChange={(value) => {
                  setSelectedStartTime(value)
                  setNewBlock((prev) => ({ ...prev, startTime: value }))
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar hora inicio" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-block-end-time" className="text-right">
                Hora fin
              </Label>
              <Select
                value={selectedEndTime}
                onValueChange={(value) => {
                  setSelectedEndTime(value)
                  setNewBlock((prev) => ({ ...prev, endTime: value }))
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar hora fin" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-block-description" className="text-right">
                Descripción
              </Label>
              <Input
                id="new-block-description"
                value={newBlock.description}
                onChange={(e) => setNewBlock({ ...newBlock, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-block-recurring" className="text-right">
                Recurrente
              </Label>
              <Checkbox
                id="new-block-recurring"
                checked={newBlock.isRecurring}
                onCheckedChange={handleRecurringChange}
              />
            </div>
            {newBlock.isRecurring && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Días</Label>
                <div className="col-span-3 space-y-2">
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={newBlock.recurringDays?.includes(day) || false}
                        onCheckedChange={(checked) => handleRecurringDayChange(day, checked === true)}
                      />
                      <Label htmlFor={`day-${day}`}>{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewBlockDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBlock}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

