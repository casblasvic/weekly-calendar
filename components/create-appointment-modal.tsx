"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate: Date
  initialTime: string
  initialRoomId: string
  onSave: (appointmentData: any) => void
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  initialRoomId,
  onSave,
}: CreateAppointmentModalProps) {
  const [appointmentData, setAppointmentData] = useState({
    name: "",
    phone: "",
    service: "",
    duration: 30,
    date: format(initialDate, "yyyy-MM-dd"),
    time: initialTime,
    roomId: initialRoomId,
  })

  const handleChange = (field: string, value: string | number) => {
    setAppointmentData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(appointmentData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear nueva cita</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear una nueva cita con los detalles del paciente, servicio y horario
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={appointmentData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Teléfono
              </Label>
              <Input
                id="phone"
                value={appointmentData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="service" className="text-right">
                Servicio
              </Label>
              <Select value={appointmentData.service} onValueChange={(value) => handleChange("service", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="tratamiento">Tratamiento</SelectItem>
                  <SelectItem value="revision">Revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duración (min)
              </Label>
              <Select
                value={appointmentData.duration.toString()}
                onValueChange={(value) => handleChange("duration", Number.parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Duración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha y hora</Label>
              <div className="col-span-3 text-sm">
                {format(initialDate, "EEEE d 'de' MMMM", { locale: es })} a las {initialTime}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Cabina</Label>
              <div className="col-span-3 text-sm">Cabina {initialRoomId}</div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cita</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

