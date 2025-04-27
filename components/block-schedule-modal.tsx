"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePickerButton } from "./date-picker-button"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import { format, parseISO, addDays, startOfDay, endOfDay, isValid } from "date-fns"
import { useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import type { CabinScheduleOverride } from '@prisma/client'
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClinic } from "@/contexts/clinic-context"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { cn } from "@/lib/utils"

interface Room {
  id: string
  name: string
  color?: string
}

interface BlockScheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicRooms: Room[]
  blockToEdit?: CabinScheduleOverride | null
  clinicId: string
  onBlockSaved?: () => void
  clinicConfig?: {
    openTime?: string
    closeTime?: string
    slotDuration?: number
  }
}

export function BlockScheduleModal({
  open,
  onOpenChange,
  clinicRooms,
  blockToEdit = null,
  clinicId,
  onBlockSaved,
  clinicConfig = {},
}: BlockScheduleModalProps) {
  const { toast } = useToast()
  const { createCabinOverride, updateCabinOverride, deleteCabinOverride } = useScheduleBlocks()
  const [date, setDate] = useState<Date>(new Date())
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState<string>("09:00")
  const [endTime, setEndTime] = useState<string>("10:00")
  const [description, setDescription] = useState<string>("")
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [cabins, setCabins] = useState<Room[]>(clinicRooms)

  useEffect(() => {
    console.log("[BlockScheduleModal] useEffect - Open:", open, "BlockToEdit:", blockToEdit);
    if (open) {
      setCabins(clinicRooms)

      if (blockToEdit) {
        console.log("[BlockScheduleModal] Editing block:", blockToEdit);
        setDate(blockToEdit.startDate)
        setStartTime(blockToEdit.startTime)
        setEndTime(blockToEdit.endTime)
        setSelectedRooms(blockToEdit.cabinIds)
        setDescription(blockToEdit.description || "")
        setIsRecurring(blockToEdit.isRecurring)
        setSelectedDays(blockToEdit.daysOfWeek || [])
        setEndDate(blockToEdit.endDate)
        setRecurrenceEndDate(blockToEdit.recurrenceEndDate)
      } else {
        console.log("[BlockScheduleModal] Creating new block.");
        setDate(new Date())
        setStartTime("09:00")
        setEndTime("10:00")
        setSelectedRooms([])
        setDescription("")
        setIsRecurring(false)
        setSelectedDays([])
        setEndDate(null)
        setRecurrenceEndDate(addDays(new Date(), 30))
      }
    } else {
       console.log("[BlockScheduleModal] Modal closed.");
    }
  }, [open, blockToEdit, clinicRooms])

  useEffect(() => {
    // Ajustar fechas de fin si se vuelven inválidas respecto a la fecha de inicio
    if (endDate && endDate < date) {
      console.log(`[BlockScheduleModal] Adjusting endDate (${format(endDate, 'yyyy-MM-dd')}) to match new startDate (${format(date, 'yyyy-MM-dd')})`);
      setEndDate(date); // Ajustar fecha de fin a la nueva fecha de inicio
    }
    if (recurrenceEndDate && recurrenceEndDate < date) {
      console.log(`[BlockScheduleModal] Adjusting recurrenceEndDate (${format(recurrenceEndDate, 'yyyy-MM-dd')}) to match new startDate (${format(date, 'yyyy-MM-dd')})`);
      setRecurrenceEndDate(date); // Ajustar fecha de fin de recurrencia a la nueva fecha de inicio
    }
  }, [date, endDate, recurrenceEndDate]); // Ejecutar cuando cambien estas fechas

  // <<< Usar índice 0-6 (Dom-Sab) internamente para consistencia con date.getDay() >>>
  // <<< Y ajustar textos/orden para mostrar L-D >>>
  const weekDayMap = [{ abbr: "L", index: 1 }, { abbr: "M", index: 2 }, { abbr: "X", index: 3 }, { abbr: "J", index: 4 }, { abbr: "V", index: 5 }, { abbr: "S", index: 6 }, { abbr: "D", index: 0 }]
  const weekDaysDisplay = ["L", "M", "X", "J", "V", "S", "D"]

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) => (prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]))
    // console.log("Selected days:", selectedDays); // Log para depurar
  }

  const handleSelectAllRooms = () => {
    if (selectedRooms.length === cabins.length) {
      setSelectedRooms([])
    } else {
      setSelectedRooms(cabins.map((room) => room.id))
    }
  }

  const handleSelectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([])
    } else {
      // Seleccionar todos los índices de 0 a 6
      setSelectedDays([0, 1, 2, 3, 4, 5, 6])
    }
  }

  const isWeekendDay = useCallback((date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }, [])

  const availableHours = useMemo(() => {
    // Usar openTime/closeTime directamente, con fallbacks
    const startTimeStr = clinicConfig?.openTime || "09:00"; 
    const endTimeStr = clinicConfig?.closeTime || "20:00";

    // Validación básica del formato HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    let effectiveStartTime = startTimeStr;
    let effectiveEndTime = endTimeStr;

    if (!timeRegex.test(effectiveStartTime) || !timeRegex.test(effectiveEndTime)) {
        console.warn("[BlockScheduleModal] Invalid time format in clinicConfig, using defaults.", { startTimeStr, endTimeStr });
        effectiveStartTime = "09:00";
        effectiveEndTime = "20:00";
    }

    const [startHour, startMinute] = effectiveStartTime.split(":").map(Number);
    const [endHour, endMinute] = effectiveEndTime.split(":").map(Number);

    // Usar slotDuration de la config, fallback a 15
    const interval = clinicConfig?.slotDuration || 15; 

    const hours = [];
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    // Generar slots usando minutos totales y el intervalo
    for (let totalMinutes = startTotalMinutes; totalMinutes <= endTotalMinutes; totalMinutes += interval) {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        // Asegurarse de que la hora generada no exceda la hora final (por si el intervalo no encaja perfectamente)
        if (h > endHour || (h === endHour && m > endMinute)) {
            break; 
        }
        const hour = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        hours.push(hour);
    }

    // Podríamos necesitar añadir la hora de fin exacta si el intervalo no la incluye?
    // El loop con <= debería incluirla si es un múltiplo exacto del intervalo.

    return hours;
  }, [clinicConfig]); // Depender solo de clinicConfig

  const handleSave = async () => {
    if (!date || !startTime || !endTime || selectedRooms.length === 0) {
      toast({
        title: "Error de Validación",
        description: "Fecha, horas y al menos una cabina son requeridos.",
        variant: "destructive",
      })
      return
    }
    if (isRecurring && selectedDays.length === 0) {
      toast({
        title: "Error de Validación",
        description: "Seleccione los días de la semana para el bloqueo recurrente.",
        variant: "destructive",
      })
      return
    }
    if (isRecurring && !recurrenceEndDate) {
      toast({
        title: "Error de Validación",
        description: "Seleccione una fecha de fin para la recurrencia.",
        variant: "destructive",
      })
      return
    }
    if (endTime <= startTime) {
      toast({
        title: "Error de Validación",
        description: "La hora de fin debe ser posterior a la hora de inicio.",
        variant: "destructive",
      })
      return
    }
    if (isRecurring && recurrenceEndDate && recurrenceEndDate < date) {
      toast({
        title: "Error de Validación",
        description: "La fecha fin de recurrencia no puede ser anterior a la fecha de inicio.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    const normalizedStartDate = date ? startOfDay(date) : undefined
    let normalizedEndDate: Date | null = null
    if (isRecurring && endDate) {
      normalizedEndDate = startOfDay(endDate)
    }
    let normalizedRecurrenceEndDate: Date | null = null
    if (isRecurring && recurrenceEndDate) {
      normalizedRecurrenceEndDate = startOfDay(recurrenceEndDate)
    }

    const overrideData = {
      clinicId: clinicId,
      cabinIds: selectedRooms,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      startTime: startTime,
      endTime: endTime,
      description: description,
      isRecurring: isRecurring,
      daysOfWeek: isRecurring ? selectedDays : [], // Guardar 0-6
      recurrenceEndDate: normalizedRecurrenceEndDate,
    }

    console.log("[BlockScheduleModal] Saving data:", overrideData)

    try {
      let success = false
      if (blockToEdit) {
        console.log(`[BlockScheduleModal] Calling updateCabinOverride for ID: ${blockToEdit.id}`)
        const result = await updateCabinOverride(blockToEdit.id, overrideData)
        success = !!result
      } else {
        console.log("[BlockScheduleModal] Calling createCabinOverride")
        const result = await createCabinOverride(overrideData)
        success = !!result
      }

      if (success) {
        if (onBlockSaved) {
          onBlockSaved()
        }
        onOpenChange(false)
      } else {
        console.error("[BlockScheduleModal] Save operation failed (context reported error).")
      }
    } catch (error) {
      console.error("Error inesperado en handleSave:", error)
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un problema al guardar.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!blockToEdit) return

    setIsSaving(true)
    console.log(`[BlockScheduleModal] Deleting block ID: ${blockToEdit.id}`)

    try {
      const success = await deleteCabinOverride(blockToEdit.id)

      if (success) {
        if (onBlockSaved) {
          onBlockSaved()
        }
        onOpenChange(false)
      } else {
        console.error("[BlockScheduleModal] Delete operation failed (context reported error).")
      }
    } catch (error) {
      console.error("Error inesperado en handleDelete:", error)
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un problema al eliminar.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b"> 
          <DialogTitle>{blockToEdit ? "Editar Bloqueo" : "Nuevo Bloqueo"}</DialogTitle>
          <DialogDescription>
            {blockToEdit ? "Modifica los detalles del bloqueo." : "Define los detalles para bloquear horarios."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 pl-2 pr-4 -mr-4 overflow-y-auto custom-scrollbar"> 
          <div className="grid gap-6 px-6 py-4"> 
            {/* Bloque Fecha y Horas */}
            <div className="grid items-start grid-cols-3 gap-4"> 
              {/* Columna 1: Fecha Inicio */}
              <div> 
                <Label htmlFor="date" className="block mb-1 text-sm font-medium">Fecha Inicio</Label>
                <DatePickerButton currentDate={date} setCurrentDate={setDate} isDayActive={() => true} />
              </div>
              {/* Columna 2: Hora Inicio */}
              <div>
                <Label htmlFor="startTime" className="block mb-1 text-sm font-medium">Hora Inicio</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                   <SelectTrigger className="w-full"><SelectValue placeholder="Inicio" /></SelectTrigger>
                   <SelectContent>
                     {availableHours.map((hour) => ( 
                       <SelectItem key={`start-${hour}`} value={hour}>
                         {hour}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
              {/* Columna 3: Hora Fin */}
              <div>
                <Label htmlFor="endTime" className="block mb-1 text-sm font-medium">Hora Fin</Label>
                 <Select value={endTime} onValueChange={setEndTime}>
                   <SelectTrigger className="w-full"><SelectValue placeholder="Fin" /></SelectTrigger>
                   <SelectContent>
                     {availableHours.filter(h => h > startTime).map((hour) => ( 
                       <SelectItem key={`end-${hour}`} value={hour}>
                         {hour}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
            </div>

            {/* <<< ORDEN CORRECTO: Selección de Cabinas PRIMERO >>> */}
            <div>
              <Label className="block mb-1 text-sm font-medium">Cabinas</Label>
              <div className="p-4 space-y-3 border rounded-md">
                <div className="flex justify-end">
                  <Button variant="link" size="sm" onClick={handleSelectAllRooms} className="h-auto p-0">
                    {selectedRooms.length === cabins.length ? "Deseleccionar todas" : "Seleccionar todas"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {cabins.map((room) => (
                    <div key={room.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`room-${room.id}`}
                        checked={selectedRooms.includes(room.id)}
                        onCheckedChange={() => handleRoomToggle(room.id)}
                      />
                      <Label htmlFor={`room-${room.id}`} className="font-normal cursor-pointer">{room.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* <<< ORDEN CORRECTO: Descripción DESPUÉS >>> */}
            <div>
              <Label htmlFor="description" className="block mb-1 text-sm font-medium">Descripción</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="(Opcional)"
                className="w-full p-2 border rounded min-h-[60px] text-sm"
              />
            </div>

            {/* Recurrencia */}
            <div className="p-4 space-y-3 border rounded-md">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring" 
                  checked={isRecurring} 
                  onCheckedChange={(checked) => {
                    const isChecking = Boolean(checked);
                    setIsRecurring(isChecking);
                    // <<< Lógica de preselección >>>
                    if (isChecking && selectedDays.length === 0) {
                      const currentDayIndex = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
                      setSelectedDays([currentDayIndex]);
                      console.log(`Pre-selecting day ${currentDayIndex} based on start date.`);
                    }
                  }}
                />
                <label htmlFor="recurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Este bloqueo se repite semanalmente
                </label>
              </div>
            </div>

            {/* Selección de Días (si es recurrente) */}
            {isRecurring && (
              <div className="pt-4 pl-6 ml-3 space-y-3 border-l"> 
                 <div>
                   <Label className="block mb-1 text-sm font-medium">Días de Repetición</Label>
                    <div className="flex justify-end">
                      <Button variant="link" size="sm" onClick={handleSelectAllDays} className="h-auto p-0">
                        {selectedDays.length === 7 ? "Deseleccionar todos" : "Seleccionar todos"}
                      </Button>
                    </div>
                   <div className="flex space-x-1">
                     {weekDayMap.map(({ abbr, index }) => ( // Usar weekDayMap con índices 0-6
                       <Button
                         key={abbr}
                         variant={'outline'}
                         size="sm"
                         className={cn(
                            "flex-1",
                            selectedDays.includes(index) // <<< Usar índice 0-6
                              ? "bg-purple-600 hover:bg-purple-700 text-white" 
                              : "text-gray-700"
                         )}
                         onClick={() => handleDayToggle(index)} // <<< Usar índice 0-6
                       >
                         {abbr}
                       </Button>
                     ))}
                   </div>
                 </div>
                 {/* Fecha Fin Recurrencia */}
                 <div>
                    <Label htmlFor="recurrenceEndDate" className="block mb-1 text-sm font-medium">
                       Fin Recurrencia
                    </Label>
                    <DatePickerButton 
                      currentDate={recurrenceEndDate} 
                      setCurrentDate={setRecurrenceEndDate} 
                      isDayActive={() => true}
                    />
                 </div>
               </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            {blockToEdit && (
              <Button variant="destructive" onClick={handleDelete} disabled={isSaving} className="flex items-center">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Eliminar Bloqueo
              </Button>
            )}
            {!blockToEdit && <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {blockToEdit ? "Guardar Cambios" : "Guardar Bloqueo"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

