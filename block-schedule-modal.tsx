"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BlockScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBlock: ScheduleBlock | null
  selectedCell: { date: string; time: string; roomId: string } | null
  rooms: Room[]
  clinicConfig: ClinicConfig
  onCreateBlock: (block: ScheduleBlock) => void
  onUpdateBlock: (block: ScheduleBlock) => void
  onDeleteBlock: (blockId: string) => void
  onDeleteAllBlocks: (blockId: string) => void
  onOpenNewClientDialog: () => void
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

export function BlockScheduleModal({
  isOpen,
  onClose,
  selectedBlock,
  selectedCell,
  rooms,
  clinicConfig,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDeleteAllBlocks,
  onOpenNewClientDialog,
}: BlockScheduleModalProps) {
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [roomId, setRoomId] = useState("")
  const [description, setDescription] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [color, setColor] = useState("")

  useEffect(() => {
    if (selectedBlock) {
      setDate(selectedBlock.date)
      setStartTime(selectedBlock.startTime)
      setEndTime(selectedBlock.endTime)
      setRoomId(selectedBlock.roomId)
      setDescription(selectedBlock.description)
      setIsRecurring(selectedBlock.isRecurring)
      setColor(selectedBlock.color)
    } else if (selectedCell) {
      setDate(selectedCell.date)
      setStartTime(selectedCell.time)

      // Calcular la hora de fin (15 minutos después)
      const [hours, minutes] = selectedCell.time.split(":").map(Number)
      let newMinutes = minutes + 15
      let newHours = hours

      if (newMinutes >= 60) {
        newMinutes -= 60
        newHours += 1
      }

      const endTimeStr = `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`
      setEndTime(endTimeStr)

      setRoomId(selectedCell.roomId)
      setDescription("")
      setIsRecurring(false)

      // Establecer el color basado en la cabina seleccionada
      const selectedRoom = rooms.find((room) => room.id === selectedCell.roomId)
      setColor(selectedRoom?.color || "gray")
    }
  }, [selectedBlock, selectedCell, rooms])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const block: ScheduleBlock = {
      id: selectedBlock?.id || Date.now().toString(),
      date,
      startTime,
      endTime,
      roomId,
      description,
      isRecurring,
      color,
    }

    if (selectedBlock) {
      onUpdateBlock(block)
    } else {
      onCreateBlock(block)
    }
  }

  // Función para obtener las opciones de tiempo disponibles según la configuración de la clínica
  const getAvailableTimeOptions = () => {
    // Usar la configuración de la clínica
    const openTime = clinicConfig?.openTime || "09:00"
    const closeTime = clinicConfig?.closeTime || "20:00"

    return getTimeSlots(openTime, closeTime, 15).map((time) => ({
      value: time,
      label: time,
    }))
  }

  const getTimeSlots = (startTime: string, endTime: string, intervalMinutes: number): string[] => {
    const slots: string[] = []
    let currentMinutes = convertTimeToMinutes(startTime)
    const endMinutes = convertTimeToMinutes(endTime)

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60)
      const minutes = currentMinutes % 60
      slots.push(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`)
      currentMinutes += intervalMinutes
    }

    return slots
  }

  const convertTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const timeOptions = getAvailableTimeOptions()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{selectedBlock ? "Editar bloque" : "Crear bloque"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Select value={startTime} onValueChange={setStartTime} required>
                <SelectTrigger id="startTime">
                  <SelectValue placeholder="Seleccionar hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de fin</Label>
              <Select value={endTime} onValueChange={setEndTime} required>
                <SelectTrigger id="endTime">
                  <SelectValue placeholder="Seleccionar hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Cabina</Label>
            <Select value={roomId} onValueChange={setRoomId} required>
              <SelectTrigger id="room">
                <SelectValue placeholder="Seleccionar cabina" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
            />
            <Label htmlFor="isRecurring">Repetir semanalmente</Label>
          </div>
          <div className="flex justify-between">
            <div>
              {selectedBlock && (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDeleteBlock(selectedBlock.id)}
                    className="mr-2"
                  >
                    Eliminar
                  </Button>
                  {selectedBlock.isRecurring && (
                    <Button type="button" variant="destructive" onClick={() => onDeleteAllBlocks(selectedBlock.id)}>
                      Eliminar todos
                    </Button>
                  )}
                </>
              )}
            </div>
            <div>
              <Button type="button" variant="outline" onClick={onClose} className="mr-2">
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

