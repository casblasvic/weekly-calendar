"use client"

import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Printer } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subDays, addDays, getDay } from "date-fns"
import { useRouter } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { DatePickerButton } from "./date-picker-button"
import { BlockScheduleModal } from "./block-schedule-modal"
import { useClinic } from "@/contexts/clinic-context"
import { useToast } from "@/hooks/use-toast"
import { convertCabinToRoom } from "@/types/fix-types"

interface Room {
  id: string
  name: string
}

interface AgendaNavBarProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  view: "week" | "day"
  isDayActive: (date: Date) => boolean
  appointments?: any[]
  onBlocksChanged?: () => void
}

export function AgendaNavBar({
  currentDate,
  setCurrentDate,
  view,
  isDayActive,
  appointments = [],
  onBlocksChanged,
}: AgendaNavBarProps) {
  const router = useRouter()
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const { activeClinic } = useClinic()
  const [clinicRooms, setClinicRooms] = useState<Room[]>([])
  const currentClinic = activeClinic // Declared currentClinic
  const { toast } = useToast()

  // Efecto para obtener las cabinas de la clínica activa
  useEffect(() => {
    if (activeClinic?.config?.cabins) {
      // Filtrar y ordenar las cabinas activas
      const rooms = activeClinic.config.cabins
        .filter((cabin) => cabin.isActive)
        .sort((a, b) => a.order - b.order)
        .map((cabin) => ({
          id: cabin.id.toString(),
          name: cabin.name,
        }))

      setClinicRooms(rooms)
      console.log("AgendaNavBar - Cabinas activas cargadas:", rooms)
    } else {
      setClinicRooms([])
      console.log("AgendaNavBar - No hay cabinas configuradas para esta clínica")
    }
  }, [activeClinic])

  // Función para actualizar la URL sin recargar la página - modificada para evitar cambios durante el renderizado
  const updateUrl = useCallback((newDate: Date, currentView: "week" | "day") => {
    // No hacemos nada directamente aquí, solo preparamos la información
    return {
      formattedDate: format(newDate, "yyyy-MM-dd"),
      view: currentView
    }
  }, [])

  // Estado para almacenar la última actualización de URL pendiente
  const [pendingUrlUpdate, setPendingUrlUpdate] = useState<{formattedDate: string, view: "week" | "day"} | null>(null)

  // Efecto para aplicar la actualización de URL después del renderizado
  useEffect(() => {
    if (pendingUrlUpdate) {
      const path = pendingUrlUpdate.view === "day" 
        ? `/agenda/dia/${pendingUrlUpdate.formattedDate}` 
        : `/agenda/semana/${pendingUrlUpdate.formattedDate}`
      
      // Usar history.pushState para actualizar la URL sin recargar
      window.history.pushState({}, "", path)
      
      // Limpiar la actualización pendiente
      setPendingUrlUpdate(null)
    }
  }, [pendingUrlUpdate])

  const changeWeek = useCallback(
    (direction: "next" | "prev") => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
      
      // En lugar de actualizar directamente, programamos la actualización para después del renderizado
      const urlInfo = updateUrl(newDate, view);
      setPendingUrlUpdate(urlInfo);
      
      setCurrentDate(newDate);
    },
    [currentDate, setCurrentDate, updateUrl, view],
  )

  const changeMonth = useCallback(
    (direction: "next" | "prev") => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      
      // En lugar de actualizar directamente, programamos la actualización para después del renderizado
      const urlInfo = updateUrl(newDate, view);
      setPendingUrlUpdate(urlInfo);
      
      setCurrentDate(newDate);
    },
    [currentDate, setCurrentDate, updateUrl, view],
  )

  const changeDay = useCallback(
    (direction: "next" | "prev") => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
      
      // En lugar de actualizar directamente, programamos la actualización para después del renderizado
      const urlInfo = updateUrl(newDate, view);
      setPendingUrlUpdate(urlInfo);
      
      setCurrentDate(newDate);
    },
    [currentDate, setCurrentDate, updateUrl, view],
  )

  const handlePrevDay = useCallback(() => {
    let prevDay = subDays(currentDate, 1)
    // Buscar el día activo anterior
    while (!isDayActive(prevDay)) {
      prevDay = subDays(prevDay, 1)
    }
    setCurrentDate(prevDay)
    
    // Actualizar URL sin recargar
    const urlInfo = updateUrl(prevDay, "day")
    setPendingUrlUpdate(urlInfo)
  }, [currentDate, setCurrentDate, updateUrl, isDayActive])

  const handleNextDay = useCallback(() => {
    let nextDay = addDays(currentDate, 1)
    // Buscar el día activo siguiente
    while (!isDayActive(nextDay)) {
      nextDay = addDays(nextDay, 1)
    }
    setCurrentDate(nextDay)
    
    // Actualizar URL sin recargar
    const urlInfo = updateUrl(nextDay, "day")
    setPendingUrlUpdate(urlInfo)
  }, [currentDate, setCurrentDate, updateUrl, isDayActive])

  // Función para verificar si un día es activo en la configuración de la clínica
  const isActiveDayInClinic = (date: Date) => {
    // Obtener el día de la semana (0 = domingo, 1 = lunes, etc.)
    const dayOfWeek = getDay(date)
    // Aquí debes usar la configuración real de días activos de la clínica
    // Este es solo un ejemplo, reemplázalo con tu lógica real
    const activeDays = [1, 2, 3, 4, 5] // Lunes a viernes
    return activeDays.includes(dayOfWeek)
  }

  const goToToday = useCallback(() => {
    const today = new Date()

    // Actualizar el estado con la fecha de hoy
    setCurrentDate(today)

    // Actualizar URL sin recargar
    updateUrl(today, view)

    // Guardar las citas en sessionStorage si es necesario
    if (typeof window !== "undefined" && appointments.length > 0) {
      sessionStorage.setItem("weeklyAppointments", JSON.stringify(appointments))
    }
  }, [setCurrentDate, updateUrl, view, appointments])

  const handleDateChange = useCallback(
    (date: Date | null) => {
      if (!date) return; // Si date es null, no hacemos nada
      
      // Guardar las citas en sessionStorage para que la vista diaria pueda acceder a ellas
      if (typeof window !== "undefined" && appointments.length > 0) {
        sessionStorage.setItem("weeklyAppointments", JSON.stringify(appointments))
      }

      // Actualizar el estado con la nueva fecha
      setCurrentDate(date)

      // Actualizar URL sin recargar la página
      updateUrl(date, view)
    },
    [setCurrentDate, updateUrl, view, appointments],
  )

  return (
    <div className="flex items-center gap-3 pb-3 border-b">
      <div className="flex items-center gap-2">
        {/* Botones de navegación por meses */}
        <Button variant="ghost" size="icon" onClick={() => changeMonth("prev")} className="text-purple-600">
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Botones de navegación por semanas/días */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (view === "week" ? changeWeek("prev") : handlePrevDay())}
          className="text-purple-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Componente personalizado de selector de fechas */}
        <DatePickerButton
          currentDate={currentDate}
          setCurrentDate={handleDateChange}
          view={view}
          isDayActive={isDayActive}
          buttonMaxWidth={200}
          calendarWidth={240}
        />

        {/* Botón de hoy */}
        <Button variant="ghost" size="icon" onClick={goToToday} className="text-purple-600">
          <CalendarDays className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => (view === "week" ? changeWeek("next") : handleNextDay())}
          className="text-purple-600"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => changeMonth("next")} className="text-purple-600">
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-purple-600"
          onClick={() => {
            if (!currentClinic || !currentClinic.config?.cabins || currentClinic.config.cabins.length === 0) {
              toast({
                title: "Error",
                description: "No hay cabinas configuradas para esta clínica",
                variant: "destructive",
              })
              return
            }
            setIsBlockModalOpen(true)
          }}
          disabled={!currentClinic || !currentClinic.config?.cabins || currentClinic.config.cabins.length === 0}
        >
          <Lock className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" className="text-purple-600" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
        </Button>

        <Select defaultValue="todos">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="(Todos)" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="todos">(Todos)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isBlockModalOpen && (
        <BlockScheduleModal
          open={isBlockModalOpen}
          onOpenChange={setIsBlockModalOpen}
          clinicRooms={activeClinic?.config?.cabins?.map(cabin => convertCabinToRoom(cabin)) || []}
          clinicId={activeClinic?.id || 1}
          onBlockSaved={() => {
            if (onBlocksChanged) {
              onBlocksChanged()
            }
          }}
        />
      )}
    </div>
  )
}

