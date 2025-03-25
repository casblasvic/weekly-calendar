"use client"

import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePickerButton } from "./date-picker-button"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import { format, parseISO, addDays, startOfDay, endOfDay, isValid } from "date-fns"
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClinic } from "@/contexts/clinic-context"
import { useInterfaz } from "@/contexts/interfaz-Context"

interface Room {
  id: string
  name: string
  color?: string
}

interface BlockScheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicRooms: Room[]
  blockToEdit?: ScheduleBlock | null
  clinicId?: string
  onBlockSaved?: () => void
  clinicConfig?: {
    openTime?: string
    closeTime?: string
    weekendOpenTime?: string
    weekendCloseTime?: string
  }
}

export function BlockScheduleModal({
  open,
  onOpenChange,
  clinicRooms,
  blockToEdit = null,
  clinicId = "",
  onBlockSaved,
  clinicConfig = {},
}: BlockScheduleModalProps) {
  const { toast } = useToast()
  const { createBlock, updateBlock, deleteBlock } = useScheduleBlocks()
  const [date, setDate] = useState<Date>(new Date())
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState<string>("09:00")
  const [endTime, setEndTime] = useState<string>("10:00")
  const [description, setDescription] = useState<string>("")
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [cabins, setCabins] = useState<any[]>(clinicRooms)
  const [selectedCabins, setSelectedCabins] = useState<string[]>([])
  const [repeat, setRepeat] = useState<boolean>(false)
  const [untilDate, setUntilDate] = useState<Date | null>(null)

  // Inicializar los valores del formulario cuando se abre el modal o cambia blockToEdit
  useEffect(() => {
    if (open) {
      setCabins(clinicRooms)

      if (blockToEdit) {
        // Si estamos editando un bloque existente
        setDate(parseISO(blockToEdit.date))
        setStartTime(blockToEdit.startTime)
        setEndTime(blockToEdit.endTime)
        setSelectedRooms(blockToEdit.roomIds)
        setDescription(blockToEdit.description)
        setIsRecurring(blockToEdit.recurring)

        if (blockToEdit.recurring && blockToEdit.recurrencePattern) {
          setSelectedDays(blockToEdit.recurrencePattern.daysOfWeek || [])
          if (blockToEdit.recurrencePattern.endDate) {
            setEndDate(parseISO(blockToEdit.recurrencePattern.endDate))
          }
        }
      } else {
        // Valores por defecto para un nuevo bloque
        setDate(new Date())
        setStartTime("09:00")
        setEndTime("10:00")
        setSelectedRooms([])
        setSelectedDays([])
        setEndDate(addDays(new Date(), 30))
        setDescription("")
        setIsRecurring(false)
      }
    }
  }, [open, blockToEdit, clinicRooms])

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"]

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) => (prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]))
  }

  const handleSelectAllRooms = () => {
    if (selectedRooms.length === clinicRooms.length) {
      setSelectedRooms([])
    } else {
      setSelectedRooms(clinicRooms.map((room) => room.id))
    }
  }

  const handleSelectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([])
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6])
    }
  }

  // Determinar si la fecha seleccionada es fin de semana
  const isWeekendDay = useCallback((date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6 // 0 es domingo, 6 es sábado
  }, [])

  // Determinar las horas disponibles según el día
  const availableHours = useMemo(() => {
    const weekend = isWeekendDay(date)

    const startTimeStr = weekend ? clinicConfig.weekendOpenTime || "09:00" : clinicConfig.openTime || "09:00"

    const endTimeStr = weekend ? clinicConfig.weekendCloseTime || "14:00" : clinicConfig.closeTime || "20:00"

    // Convertir a horas enteras para simplificar
    const startHour = Number.parseInt(startTimeStr.split(":")[0], 10)
    const endHour = Number.parseInt(endTimeStr.split(":")[0], 10)
    const startMinute = Number.parseInt(startTimeStr.split(":")[1], 10)
    const endMinute = Number.parseInt(endTimeStr.split(":")[1], 10)

    const hours = []
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += 15) {
        // Si es la hora de inicio, empezar desde el minuto correspondiente
        if (h === startHour && m < startMinute) continue

        // Si es la hora de fin, no pasar del minuto correspondiente
        if (h === endHour && m > endMinute) continue

        const hour = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
        hours.push(hour)
      }
    }

    return hours
  }, [date, clinicConfig, isWeekendDay])

  const handleSave = async () => {
    if (!date || !startTime || !endTime || selectedRooms.length === 0) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const blockData = {
        clinicId: String(clinicId),
        date: format(date, "yyyy-MM-dd"),
        startTime,
        endTime,
        roomIds: selectedRooms,
        description,
        recurring: isRecurring,
        recurrencePattern: isRecurring
          ? {
              frequency: "weekly" as const,
              daysOfWeek: selectedDays,
              endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
            }
          : undefined,
        createdAt: new Date().toISOString(),
      }

      if (blockToEdit) {
        // Actualizar bloque existente
        await updateBlock(String(blockToEdit.id), blockData)
        toast({
          title: "Bloque actualizado",
          description: "El bloque se ha actualizado correctamente",
        })
      } else {
        // Crear nuevo bloque
        await createBlock(blockData)
        toast({
          title: "Bloque creado",
          description: "El bloque se ha creado correctamente",
        })
      }

      // Llamar al callback si existe
      if (onBlockSaved) {
        onBlockSaved()
      }

      // Cerrar el modal
      onOpenChange(false)
    } catch (error) {
      console.error("Error al guardar el bloque:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al guardar el bloque",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!blockToEdit) return

    setIsSaving(true)

    try {
      // Eliminar bloque
      await deleteBlock(String(blockToEdit.id))
      
      toast({
        title: "Bloque eliminado",
        description: "El bloque se ha eliminado correctamente",
      })

      // Llamar al callback si existe
      if (onBlockSaved) {
        onBlockSaved()
      }

      // Cerrar el modal
      onOpenChange(false)
    } catch (error) {
      console.error("Error al eliminar el bloque:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al eliminar el bloque",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onClose = () => {
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Si se está cerrando el modal, forzar actualización
        if (!isOpen && onBlockSaved) {
          onBlockSaved()
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-2xl font-bold mb-4">
          {blockToEdit ? "Editar bloqueo" : "Bloquear agenda"}
        </DialogTitle>
        <div className="flex flex-col space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Label htmlFor="date" className="text-base font-medium">
                Fecha
              </Label>
              <div className="mt-1">
                <DatePickerButton
                  currentDate={date}
                  setCurrentDate={setDate}
                  buttonMaxWidth={140}
                  calendarWidth={240}
                  isDayActive={() => true}
                  isFormField={true}
                  buttonClassName="w-full"
                />
              </div>
            </div>
            <div className="col-span-1">
              <Label htmlFor="startTime" className="text-base font-medium">
                Hora Inicio
              </Label>
              <div className="mt-1">
                <Select 
                  value={startTime} 
                  onValueChange={(value) => {
                    if (value !== startTime) {
                      setStartTime(value);
                    }
                  }}
                  defaultValue={startTime}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHours.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-1">
              <Label htmlFor="endTime" className="text-base font-medium">
                Hora Fin
              </Label>
              <div className="mt-1">
                <Select 
                  value={endTime} 
                  onValueChange={(value) => {
                    if (value !== endTime) {
                      setEndTime(value);
                    }
                  }}
                  defaultValue={endTime}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHours
                      .filter((hour) => hour > startTime)
                      .map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {cabins.map((cabin) => (
                <div key={cabin.id} className="flex items-center">
                  <Checkbox
                    id={`cabin-${cabin.id}`}
                    checked={selectedRooms.includes(cabin.id.toString())}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRooms([...selectedRooms, cabin.id.toString()])
                      } else {
                        setSelectedRooms(selectedRooms.filter((id) => id !== cabin.id.toString()))
                      }
                    }}
                    className="mr-2 h-4 w-4"
                  />
                  <Label htmlFor={`cabin-${cabin.id}`} className="text-sm cursor-pointer">
                    {cabin.name}
                  </Label>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center">
                <Checkbox
                  id="all-cabins"
                  checked={selectedRooms.length === cabins.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRooms(cabins.map((cabin) => cabin.id.toString()))
                    } else {
                      setSelectedRooms([])
                    }
                  }}
                  className="mr-2 h-4 w-4"
                />
                <Label htmlFor="all-cabins" className="text-sm cursor-pointer">
                  (Todas las cabinas)
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="repeat"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
              className="h-5 w-5"
            />
            <Label htmlFor="repeat" className="text-base font-medium cursor-pointer">
              Repetición
            </Label>
          </div>

          {isRecurring && (
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
                  <div key={day} className="flex flex-col items-center">
                    <span className="text-sm mb-1">{day}</span>
                    <Checkbox
                      id={`day-${index}`}
                      checked={selectedDays.includes(index)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDays([...selectedDays, index])
                        } else {
                          setSelectedDays(selectedDays.filter((d) => d !== index))
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center pt-3 border-t mb-4">
                <Checkbox
                  id="all-days"
                  checked={selectedDays.length === 7}
                  onCheckedChange={handleSelectAllDays}
                  className="mr-2 h-4 w-4"
                />
                <Label htmlFor="all-days" className="text-sm cursor-pointer">
                  (Todos)
                </Label>
              </div>
              <div className="flex items-center pt-3 border-t">
                <Label htmlFor="until" className="text-sm font-medium mr-4">
                  Hasta
                </Label>
                <div className="flex-1">
                  <DatePickerButton
                    currentDate={endDate || addDays(new Date(), 30)}
                    setCurrentDate={setEndDate}
                    buttonMaxWidth={160}
                    calendarWidth={240}
                    isDayActive={() => true}
                    isFormField={true}
                    buttonClassName="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="description" className="text-base font-medium">
              Descripción
            </Label>
            <div className="mt-1 relative">
              <style jsx global>{`
                .custom-textarea {
                  min-height: 100px;
                  width: 100%;
                  resize: none;
                  border: 2px solid #e9d5ff;
                  border-radius: 0.375rem;
                  padding: 0.5rem;
                  color: #374151;
                }
                
                .custom-textarea::placeholder {
                  color: #9ca3af;
                }
                
                .custom-textarea:focus {
                  outline: none;
                  border-color: #a855f7;
                  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
                }
              `}</style>
              <textarea
                id="description"
                placeholder="Añade una descripción para este bloqueo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="custom-textarea"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between w-full">
          <div>
            {blockToEdit && (
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDelete} size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Borrar
                </Button>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4"
              disabled={isSaving}
              type="button"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : blockToEdit ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

