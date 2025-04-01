"use client"

import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Printer, ChevronDown, Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subDays, addDays, getDay } from "date-fns"
import { useRouter } from "next/navigation"
import { useCallback, useState, useEffect, useRef } from "react"
import { DatePickerButton } from "./date-picker-button"
import { BlockScheduleModal } from "./block-schedule-modal"
import { useClinic } from "@/contexts/clinic-context"
import { useToast } from "@/hooks/use-toast"
import { convertCabinToRoom } from "@/types/fix-types"
import { es } from 'date-fns/locale'

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
  onViewChange?: (newView: "week" | "day", newDate?: Date) => void
}

export function AgendaNavBar({
  currentDate,
  setCurrentDate,
  view,
  isDayActive,
  appointments = [],
  onBlocksChanged,
  onViewChange,
}: AgendaNavBarProps) {
  const router = useRouter()
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const { activeClinic } = useClinic()
  const [clinicRooms, setClinicRooms] = useState<Room[]>([])
  const currentClinic = activeClinic // Declared currentClinic
  const { toast } = useToast()
  const [filterView, setFilterView] = useState("todos")
  const isUpdatingRef = useRef(false)

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

  // Actualizar URL sin recargar la página - versión simplificada
  const updatePathSilently = useCallback((path: string) => {
    if (typeof window !== 'undefined' && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      try {
        window.history.pushState({}, "", path);
      } finally {
        // Asegurar que se restablece la bandera incluso en caso de error
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, []);

  const changeWeek = useCallback(
    (direction: "next" | "prev") => {
      if (isUpdatingRef.current) return;
      
      // Marcar que estamos actualizando para evitar múltiples llamadas
      isUpdatingRef.current = true;
      
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
      
      // Si tenemos onViewChange, lo usamos para transición suave
      if (onViewChange) {
        // Usar requestAnimationFrame para evitar bloqueos de UI
        requestAnimationFrame(() => {
          onViewChange("week", newDate);
          // Desbloquear después del siguiente frame de animación
          requestAnimationFrame(() => {
            isUpdatingRef.current = false;
          });
        });
      } else {
        // Fallback al comportamiento anterior
        setCurrentDate(newDate);
        
        // Actualizar URL silenciosamente
        const formattedDate = format(newDate, "yyyy-MM-dd");
        updatePathSilently(`/agenda/semana/${formattedDate}`);
        
        // Desbloquear después de un breve retraso
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
    },
    [currentDate, setCurrentDate, updatePathSilently, onViewChange],
  );

  const changeMonth = useCallback(
    (direction: "next" | "prev") => {
      if (isUpdatingRef.current) return;
      
      // Marcar que estamos actualizando
      isUpdatingRef.current = true;
      
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      
      // Si tenemos onViewChange, lo usamos para transición suave
      if (onViewChange) {
        // Usar requestAnimationFrame para sincronizar con el ciclo de renderizado
        requestAnimationFrame(() => {
          onViewChange(view, newDate);
          // Desbloquear después del siguiente frame
          requestAnimationFrame(() => {
            isUpdatingRef.current = false;
          });
        });
      } else {
        // Fallback
        setCurrentDate(newDate);
        
        // Actualizar URL silenciosamente
        const formattedDate = format(newDate, "yyyy-MM-dd");
        const path = view === "day" 
          ? `/agenda/dia/${formattedDate}` 
          : `/agenda/semana/${formattedDate}`;
        updatePathSilently(path);
        
        // Desbloquear después de un breve retraso
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
    },
    [currentDate, setCurrentDate, updatePathSilently, view, onViewChange],
  );

  const changeDay = useCallback(
    (direction: "next" | "prev") => {
      if (isUpdatingRef.current) return;
      
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
      
      // Si tenemos onViewChange, lo usamos para transición suave
      if (onViewChange) {
        onViewChange("day", newDate);
      } else {
        // Fallback al comportamiento anterior
        setCurrentDate(newDate);
        
        // Actualizar URL silenciosamente
        const formattedDate = format(newDate, "yyyy-MM-dd");
        updatePathSilently(`/agenda/dia/${formattedDate}`);
      }
    },
    [currentDate, setCurrentDate, updatePathSilently, onViewChange],
  );

  const handlePrevDay = useCallback(() => {
    if (isUpdatingRef.current) return;
    
    let prevDay = subDays(currentDate, 1);
    // Buscar el día activo anterior
    while (!isDayActive(prevDay)) {
      prevDay = subDays(prevDay, 1);
    }
    
    // Si tenemos onViewChange, lo usamos para transición suave
    if (onViewChange) {
      onViewChange("day", prevDay);
    } else {
      // Fallback al comportamiento anterior
      setCurrentDate(prevDay);
      
      // Actualizar URL silenciosamente
      const formattedDate = format(prevDay, "yyyy-MM-dd");
      updatePathSilently(`/agenda/dia/${formattedDate}`);
    }
  }, [currentDate, setCurrentDate, isDayActive, updatePathSilently, onViewChange]);

  const handleNextDay = useCallback(() => {
    if (isUpdatingRef.current) return;
    
    let nextDay = addDays(currentDate, 1);
    // Buscar el día activo siguiente
    while (!isDayActive(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    
    // Si tenemos onViewChange, lo usamos para transición suave
    if (onViewChange) {
      onViewChange("day", nextDay);
    } else {
      // Fallback al comportamiento anterior
      setCurrentDate(nextDay);
      
      // Actualizar URL silenciosamente
      const formattedDate = format(nextDay, "yyyy-MM-dd");
      updatePathSilently(`/agenda/dia/${formattedDate}`);
    }
  }, [currentDate, setCurrentDate, isDayActive, updatePathSilently, onViewChange]);

  // Función para verificar si un día es activo en la configuración de la clínica
  const isActiveDayInClinic = (date: Date) => {
    // Obtener el día de la semana (0 = domingo, 1 = lunes, etc.)
    const dayOfWeek = getDay(date)
    // Aquí debes usar la configuración real de días activos de la clínica
    // Este es solo un ejemplo, reemplázalo con tu lógica real
    const activeDays = [1, 2, 3, 4, 5] // Lunes a viernes
    return activeDays.includes(dayOfWeek)
  }

  const handleGoToToday = () => {
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');

    // Determinar la URL base según la vista actual
    const basePath = view === 'week' ? '/agenda/semana/' : '/agenda/dia/';
    const targetUrl = `${basePath}${formattedDate}`;

    // Navegar usando el router
    router.push(targetUrl);

    // Opcional: Llamar a setCurrentDate para una actualización visual inmediata
    // del estado local, aunque la navegación eventualmente lo hará.
    // Podrías quitarlo si la navegación es suficientemente rápida.
    // setCurrentDate(today);
  };

  const handleDateChange = useCallback(
    (date: Date | null) => {
      if (!date || isUpdatingRef.current) return;
      
      // Si tenemos onViewChange, lo usamos para transición suave
      if (onViewChange) {
        onViewChange(view, date);
      } else {
        // Fallback al comportamiento anterior
        // Guardar las citas en sessionStorage para que la vista diaria pueda acceder a ellas
        if (typeof window !== "undefined" && appointments.length > 0) {
          sessionStorage.setItem("weeklyAppointments", JSON.stringify(appointments));
        }

        // Actualizar el estado con la nueva fecha
        setCurrentDate(date);

        // Actualizar URL silenciosamente
        const formattedDate = format(date, "yyyy-MM-dd");
        const path = view === "day" 
          ? `/agenda/dia/${formattedDate}` 
          : `/agenda/semana/${formattedDate}`;
        updatePathSilently(path);
      }
    },
    [setCurrentDate, updatePathSilently, view, appointments, onViewChange],
  );

  const handleFilterChange = useCallback((value: string) => {
    setFilterView(value);
  }, []);

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
        <Button variant="ghost" size="icon" onClick={handleGoToToday} className="text-purple-600">
          <CalendarDays className="w-4 h-4" />
        </Button>

        {/* Botón Vista Semanal (solo visible en vista diaria) */}
        {view === "day" && (
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => onViewChange ? onViewChange("week") : null}
            className="text-purple-600"
            title="Vista semanal"
          >
            <Calendar className="w-4 h-4" />
          </Button>
        )}

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

        <Button 
          variant="outline" 
          className="w-[180px] text-left justify-between"
        >
          <span>(Todos)</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </div>
      {isBlockModalOpen && (
        <BlockScheduleModal
          open={isBlockModalOpen}
          onOpenChange={setIsBlockModalOpen}
          clinicRooms={activeClinic?.config?.cabins?.map(cabin => convertCabinToRoom(cabin)) || []}
          clinicId={activeClinic?.id ? String(activeClinic.id) : ""}
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

