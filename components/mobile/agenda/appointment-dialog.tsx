"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Search, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useTheme } from "@/app/contexts/theme-context"
// Actualizar importaciones
import { MobileTimePicker } from "@/components/mobile/common/time-picker"
import { MobileDatePickerSheet } from "@/components/mobile/common/date-picker-sheet"
import { MobileBottomSheet } from "@/components/mobile/layout/bottom-sheet"

interface Client {
  name: string
  phone: string
}

interface AppointmentDialogProps {
  client: Client | null
  selectedDate: Date
  selectedTime?: string
  onClose: () => void
  onSearchClick: () => void
  onNewClientClick: () => void
  onDelete?: () => void
  onSave?: (appointment: {
    client: Client | null
    services: { id: string; name: string; category: string }[]
    date: Date
    time: string
    duration: number
    professional: string
    comment?: string
  }) => void
}

export function MobileAppointmentDialog({
  client,
  selectedDate: initialSelectedDate,
  selectedTime,
  onClose,
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

  const { theme } = useTheme()
  
  const appColors = useMemo(() => {
    return {
      primary: theme?.primaryColor || '#7c3aed',
      secondary: theme?.secondaryColor || '#8b5cf6',
      accent: theme?.accentColor || '#a78bfa',
      text: theme?.textColor || '#111827',
      background: theme?.backgroundColor || '#ffffff',
      headerBg: theme?.headerBackgroundColor || '#7c3aed',
      buttonBg: theme?.buttonPrimaryColor || '#7c3aed',
    }
  }, [theme])

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

  if (!client) return null

  return (
    <MobileBottomSheet isOpen={!!client} onClose={onClose} title="Nueva cita" height="full">
      <div className="p-4 space-y-6">
        {/* Sección de Cliente */}
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: appColors.primary }}>Cliente</label>
          <div className="p-4 border rounded-md flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{client.name}</h3>
              <p className="text-sm text-gray-500">{client.phone}</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onSearchClick} 
              style={{ color: appColors.primary }}
            >
              Cambiar
            </Button>
          </div>
        </div>

        {/* Sección de Fecha y Hora */}
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: appColors.primary }}>Fecha y hora</label>
          <div className="grid grid-cols-2 gap-2">
            <div 
              className="p-4 bg-gray-50 rounded-md flex items-center cursor-pointer"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <Calendar className="h-5 w-5 mr-2" style={{ color: appColors.primary }} />
              <div>
                <div className="text-sm text-gray-500">Fecha</div>
                <div className="font-medium">
                  {selectedDate
                    ? format(selectedDate, "EEE d MMM", { locale: es })
                    : "Selecciona una fecha"}
                </div>
              </div>
            </div>
            <div 
              className="p-4 bg-gray-50 rounded-md flex items-center cursor-pointer"
              onClick={() => setIsTimePickerOpen(true)}
            >
              <Clock className="h-5 w-5 mr-2" style={{ color: appColors.primary }} />
              <div>
                <div className="text-sm text-gray-500">Hora</div>
                <div className="font-medium">
                  {appointmentTime || "Seleccionar"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Duración */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold" style={{ color: appColors.primary }}>Duración (módulos)</h2>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDuration(Math.max(1, duration - 1))}
              className="h-8 w-8 border"
              style={{ color: appColors.primary, borderColor: appColors.primary }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium">{duration}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDuration(duration + 1)}
              className="h-8 w-8 border"
              style={{ color: appColors.primary, borderColor: appColors.primary }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Servicios */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold" style={{ color: appColors.primary }}>Servicios</h2>
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
            <TabsList className="grid w-full grid-cols-3 rounded-lg p-1" style={{ backgroundColor: `${appColors.primary}20` }}>
              <TabsTrigger
                value="sin-parametros"
                className={cn(
                  "rounded-md transition-colors",
                  "data-[state=active]:text-white"
                )}
                style={{
                  ["--tw-ring-color" as any]: appColors.primary
                }}
              >
                <div 
                  className="w-full h-full" 
                  style={{ 
                    backgroundColor: activeTab === "sin-parametros" ? appColors.primary : "transparent" 
                  }}
                >
                  Sin parámetros
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="con-parametros"
                className={cn(
                  "rounded-md transition-colors",
                  "data-[state=active]:text-white"
                )}
                style={{
                  ["--tw-ring-color" as any]: appColors.primary
                }}
              >
                <div 
                  className="w-full h-full" 
                  style={{ 
                    backgroundColor: activeTab === "con-parametros" ? appColors.primary : "transparent" 
                  }}
                >
                  Con parámetros
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="paquetes"
                className={cn(
                  "rounded-md transition-colors",
                  "data-[state=active]:text-white"
                )}
                style={{
                  ["--tw-ring-color" as any]: appColors.primary
                }}
              >
                <div 
                  className="w-full h-full" 
                  style={{ 
                    backgroundColor: activeTab === "paquetes" ? appColors.primary : "transparent" 
                  }}
                >
                  Paquetes
                </div>
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
                      className="h-5 w-5 rounded border"
                      style={{ 
                        borderColor: `${appColors.primary}60`,
                        color: appColors.primary,
                        ["--tw-ring-color" as any]: appColors.primary
                      }}
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
          <h2 className="text-lg font-semibold" style={{ color: appColors.primary }}>Profesional</h2>
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

        {/* Botones de guardar y cancelar */}
        <div className="pt-4 space-y-2">
          <Button 
            className="w-full text-white" 
            style={{ backgroundColor: appColors.buttonBg }}
            onClick={handleSave}
          >
            Guardar cita
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onClose}
          >
            Cancelar
          </Button>
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

