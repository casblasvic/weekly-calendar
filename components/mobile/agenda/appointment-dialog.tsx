"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Search, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
// Actualizar importaciones
import { MobileTimePicker } from "@/components/mobile/common/time-picker"
import { MobileDatePickerSheet } from "@/components/mobile/common/date-picker-sheet"
import { MobileBottomSheet } from "@/components/mobile/layout/bottom-sheet"

interface Client {
  name: string
  phone: string
}

interface AppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  selectedDate: Date
  selectedTime?: string
  onSearchClick: () => void
  onNewClientClick: () => void
  onDelete?: () => void
  onSave?: (appointment: {
    client: Client
    services: { id: string; name: string; category: string }[]
    date: Date
    time: string
    duration: number
    professional: string
    comment?: string
  }) => void
}

export function MobileAppointmentDialog({
  isOpen,
  onClose,
  client,
  selectedDate: initialSelectedDate,
  selectedTime,
  onSearchClick,
  onNewClientClick,
  onDelete,
  onSave,
}: AppointmentDialogProps) {
  const [activeTab, setActiveTab] = useState("sin-parametros")
  const [selectedServices, setSelectedServices] = useState<{ id: string; name: string; category: string }[]>([])
  const [appointmentTime, setAppointmentTime] = useState(selectedTime || format(new Date(), "HH:mm"))
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate || new Date())
  const [duration, setDuration] = useState(1)
  const [professional, setProfessional] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (selectedTime) {
      setAppointmentTime(selectedTime)
    }
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate)
    }
  }, [selectedTime, initialSelectedDate])

  const handleSave = () => {
    if (onSave && client) {
      onSave({
        client,
        services: selectedServices,
        date: selectedDate,
        time: appointmentTime,
        duration,
        professional,
      })
    }
    onClose()
  }

  const services = {
    "Sin parámetros": [
      { id: "s1", name: "Consulta General", category: "General" },
      { id: "s2", name: "Limpieza Dental", category: "Dental" },
      { id: "s3", name: "Revisión Anual", category: "General" },
      { id: "s4", name: "Vacunación", category: "Prevención" },
    ],
    "Con parámetros": [
      { id: "p1", name: "Tratamiento Facial", category: "Estética" },
      { id: "p2", name: "Masaje Terapéutico", category: "Terapia" },
      { id: "p3", name: "Depilación Láser", category: "Estética" },
      { id: "p4", name: "Manicura", category: "Belleza" },
    ],
    Paquetes: [
      { id: "pack1", name: "Pack Básico", category: "Estética" },
      { id: "pack2", name: "Pack Premium", category: "Salud" },
      { id: "pack3", name: "Pack Completo", category: "Bienestar" },
    ],
  }

  const filteredServices = Object.entries(services).reduce(
    (acc, [key, value]) => {
      acc[key] = value.filter(
        (service) =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      return acc
    },
    {} as typeof services,
  )

  if (!isOpen) return null

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Nueva Cita" height="auto">
      <div className="sr-only" id="mobile-appointment-description">
        Formulario para crear o editar una cita en la versión móvil, incluyendo selección de cliente, fecha, hora y
        servicios
      </div>
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto p-4 space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-purple-600">Cliente</h2>
              <Button variant="outline" onClick={onSearchClick} className="text-purple-600 hover:text-purple-700">
                Buscar
              </Button>
            </div>
            {client && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-purple-600">{client.name}</h3>
                <p className="text-sm text-gray-600">{client.phone}</p>
              </div>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-purple-600">Fecha y Hora</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  value={format(selectedDate, "dd/MM/yyyy", { locale: es })}
                  readOnly
                  className="pl-4 pr-10 cursor-pointer bg-white"
                  onClick={() => setIsDatePickerOpen(true)}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600 pointer-events-none" />
              </div>
              <div className="relative">
                <Input
                  value={appointmentTime}
                  readOnly
                  className="pl-4 pr-10 cursor-pointer bg-white"
                  onClick={() => setIsTimePickerOpen(true)}
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-purple-600">Duración (módulos)</h2>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDuration(Math.max(1, duration - 1))}
                className="h-8 w-8 text-purple-600 border-purple-600"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium">{duration}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDuration(duration + 1)}
                className="h-8 w-8 text-purple-600 border-purple-600"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Servicios */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-purple-600">Servicios</h2>
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 rounded-lg bg-purple-100 p-1">
                <TabsTrigger
                  value="sin-parametros"
                  className={cn(
                    "rounded-md transition-colors",
                    "data-[state=active]:bg-purple-600 data-[state=active]:text-white",
                  )}
                >
                  Sin parámetros
                </TabsTrigger>
                <TabsTrigger
                  value="con-parametros"
                  className={cn(
                    "rounded-md transition-colors",
                    "data-[state=active]:bg-purple-600 data-[state=active]:text-white",
                  )}
                >
                  Con parámetros
                </TabsTrigger>
                <TabsTrigger
                  value="paquetes"
                  className={cn(
                    "rounded-md transition-colors",
                    "data-[state=active]:bg-purple-600 data-[state=active]:text-white",
                  )}
                >
                  Paquetes
                </TabsTrigger>
              </TabsList>
              {Object.entries(filteredServices).map(([tabKey, tabServices]) => (
                <TabsContent
                  key={tabKey}
                  value={tabKey.toLowerCase().replace(" ", "-")}
                  className="mt-4 space-y-2 max-h-60 overflow-y-auto"
                >
                  {tabServices.map((service) => (
                    <label key={service.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                      <input
                        type="checkbox"
                        checked={selectedServices.some((s) => s.id === service.id)}
                        onChange={() => {
                          setSelectedServices((prev) =>
                            prev.some((s) => s.id === service.id)
                              ? prev.filter((s) => s.id !== service.id)
                              : [...prev, service],
                          )
                        }}
                        className="h-5 w-5 rounded border-purple-300 text-purple-600 focus:ring-purple-600"
                      />
                      <span className="text-base flex-1">{service.name}</span>
                      <span className="text-sm text-gray-500">{service.category}</span>
                    </label>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Profesional */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-purple-600">Profesional</h2>
            <Select value={professional} onValueChange={setProfessional}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prof1">Profesional 1</SelectItem>
                <SelectItem value="prof2">Profesional 2</SelectItem>
                <SelectItem value="prof3">Profesional 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 border-t bg-white">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              Guardar
            </Button>
          </div>
        </div>
      </div>

      <MobileDatePickerSheet
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date)
          setIsDatePickerOpen(false)
        }}
      />

      <MobileTimePicker
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        value={appointmentTime}
        onChange={(time) => {
          setAppointmentTime(time)
          setIsTimePickerOpen(false)
        }}
      />
    </MobileBottomSheet>
  )
}

