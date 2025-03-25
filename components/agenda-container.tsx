"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { AgendaNavBar } from "./agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import dynamic from "next/dynamic"

// Importaciones dinámicas para mejorar el rendimiento inicial
const WeeklyAgenda = dynamic(
  () => import("./weekly-agenda"), 
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="grid grid-cols-7 gap-1 w-full max-w-3xl">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
);

const DayView = dynamic(
  () => import("./day-view"), 
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="grid grid-cols-1 gap-1 w-full max-w-3xl">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
);

interface AgendaContainerProps {
  initialDate?: string
  initialView?: "week" | "day"
}

export default function AgendaContainer({
  initialDate = format(new Date(), "yyyy-MM-dd"),
  initialView = "week",
}: AgendaContainerProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Refs mejorados para controlar el flujo de actualizaciones
  const isFirstRender = useRef(true)
  const isUpdatingPath = useRef(false)
  const previousView = useRef<string | null>(null)
  const previousDateStr = useRef<string | null>(null)
  
  // Estado para las vistas - ahora mantenemos ambas montadas para evitar cargas completas
  const [view, setView] = useState<"week" | "day">(initialView)
  const [activeView, setActiveView] = useState<"week" | "day">(initialView)

  // Parsear la fecha inicial
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parse(initialDate, "yyyy-MM-dd", new Date())
    } catch (error) {
      console.error("Error parsing date:", error)
      return new Date()
    }
  })

  // Inicializar las referencias en el montaje inicial
  useEffect(() => {
    previousView.current = initialView
    previousDateStr.current = initialDate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Estado para almacenar las citas
  const [appointments, setAppointments] = useState<any[]>([])

  // Obtener la configuración de la clínica
  const { activeClinic } = useClinic()
  const clinicConfig = activeClinic?.config || {}
  
  // Memoizar la clínica para evitar re-renders
  const memoizedClinic = useMemo(() => ({
    id: activeClinic?.id,
    config: clinicConfig
  }), [activeClinic?.id, clinicConfig]);

  // Actualizar la vista de manera optimizada con transiciones suaves
  const updateView = useCallback((newView: "week" | "day") => {
    if (newView !== view) {
      // Primero activamos la nueva vista
      setActiveView(newView);
      // Actualizar estado principal inmediatamente
      setView(newView);
      previousView.current = newView;
    }
  }, [view]);

  // Actualizar la vista basada en la URL cuando cambia - versión optimizada
  useEffect(() => {
    // Evitar actualizaciones recursivas
    if (isUpdatingPath.current || isFirstRender.current) return;
    
    let newView: "week" | "day" = view;
    let shouldUpdateDate = false;
    let newDate = currentDate;
    let dateString = null;
    
    if (pathname.includes("/agenda/semana")) {
      newView = "week";
    } else if (pathname.includes("/agenda/dia")) {
      newView = "day";
    }

    // Extraer la fecha de la URL
    const dateMatch = pathname.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      dateString = dateMatch[0];
      try {
        newDate = parse(dateString, "yyyy-MM-dd", new Date());
        shouldUpdateDate = true;
      } catch (error) {
        console.error("Error parsing date from URL:", error);
      }
    }
    
    // Verificar si algo cambió realmente
    const dateChanged = shouldUpdateDate && dateString !== previousDateStr.current;
    const viewChanged = newView !== previousView.current;
    
    if (!dateChanged && !viewChanged) {
      return;
    }
    
    // Actualizar referencias
    if (dateString) {
      previousDateStr.current = dateString;
    }
    
    // Actualizar estados de manera optimizada
    if (viewChanged) {
      updateView(newView);
    }
    
    if (dateChanged) {
      setCurrentDate(newDate);
    }
  }, [pathname, view, currentDate, updateView]);

  // Escuchar cambios en la URL sin recargar la página - versión optimizada
  useEffect(() => {
    const handlePopState = () => {
      // Prevenir actualizaciones infinitas
      if (isUpdatingPath.current) return;
      
      // Extraer la vista y la fecha de la URL actual
      const currentPath = window.location.pathname;
      let newView: "week" | "day" = view;

      if (currentPath.includes("/agenda/semana")) {
        newView = "week";
      } else if (currentPath.includes("/agenda/dia")) {
        newView = "day";
      }

      const dateMatch = currentPath.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        try {
          const newDate = parse(dateMatch[0], "yyyy-MM-dd", new Date());
          // Solo actualizar si cambió la fecha
          if (format(newDate, "yyyy-MM-dd") !== format(currentDate, "yyyy-MM-dd")) {
            setCurrentDate(newDate);
          }
        } catch (error) {
          console.error("Error parsing date from URL:", error);
        }
      }

      // Solo actualizar la vista si cambió
      if (newView !== view) {
        updateView(newView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [view, currentDate, updateView]);

  // Función para obtener la clave del día en inglés a partir de una fecha
  const getDayKey = useCallback((date: Date) => {
    const day = format(date, "EEEE", { locale: es }).toLowerCase()
    // Mapear los nombres de días en español a las claves en inglés usadas en el objeto schedule
    const dayMap = {
      lunes: "monday",
      martes: "tuesday",
      miércoles: "wednesday",
      jueves: "thursday",
      viernes: "friday",
      sábado: "saturday",
      domingo: "sunday",
    }
    return dayMap[day] || day
  }, []);

  // Función para verificar si un día está activo en la configuración
  const isDayActive = useCallback((date: Date) => {
    const dayKey = getDayKey(date)
    // Usar aserciones de tipo para evitar errores de tipado
    const config = clinicConfig as any
    return config?.schedule?.[dayKey]?.isOpen ?? false
  }, [clinicConfig, getDayKey]);

  // Función optimizada para cambiar entre vistas y actualizar la URL
  const handleViewChange = useCallback((newView: "week" | "day", newDate?: Date) => {
    // Evitar actualizaciones si estamos en medio de una actualización
    if (isUpdatingPath.current) {
      return;
    }
    
    // Marcar que estamos actualizando para evitar cambios simultáneos
    isUpdatingPath.current = true;
    
    const dateToUse = newDate || currentDate
    const formattedDate = format(dateToUse, "yyyy-MM-dd")
    
    // Verificar si realmente hay un cambio significativo
    const isSameView = newView === view;
    const isSameDate = formattedDate === previousDateStr.current;
    
    if (isSameView && isSameDate) {
      isUpdatingPath.current = false;
      return;
    }

    // Guardar las citas en sessionStorage para que la vista diaria pueda acceder a ellas
    if (typeof window !== "undefined" && appointments.length > 0) {
      try {
        sessionStorage.setItem("weeklyAppointments", JSON.stringify(appointments));
      } catch (e) {
        // Ignorar errores de sessionStorage
      }
    }
    
    // Actualizar referencia inmediatamente
    previousDateStr.current = formattedDate;
    
    // Actualizar estados sin retrasos asíncronos para evitar parpadeos
    if (newDate) {
      setCurrentDate(dateToUse);
    }
    
    // Activar la nueva vista directamente
    setActiveView(newView);
    setView(newView);
    previousView.current = newView;
      
    // Actualizar la URL mediante ruta directa
    router.push(newView === "day" 
      ? `/agenda/dia/${formattedDate}` 
      : `/agenda/semana/${formattedDate}`
    );
      
    // Desbloquear actualizaciones después de un breve tiempo
    // para prevenir actualizaciones múltiples rápidas
    setTimeout(() => {
      isUpdatingPath.current = false;
      
      // Marcar que ya no es el primer renderizado
      if (isFirstRender.current) {
        isFirstRender.current = false;
      }
    }, 100);
  }, [view, currentDate, appointments.length, router]);

  // Título y subtítulo según la vista actual
  const getViewTitle = useCallback(() => {
    if (view === "week") {
      return "Agenda semanal"
    } else {
      return "Agenda diaria"
    }
  }, [view]);

  const getViewSubtitle = useCallback(() => {
    if (view === "week") {
      // Calcular el primer y último día de la semana
      const monday = new Date(currentDate)
      monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1))

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      return `${format(monday, "d 'de' MMMM", { locale: es })} - ${format(sunday, "d 'de' MMMM 'de' yyyy", { locale: es })}`
    } else {
      return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    }
  }, [view, currentDate]);

  // Generar claves memorizadas para evitar re-renderizados innecesarios
  const weekKey = useMemo(() => `week-${format(currentDate, "yyyy-MM-dd")}`, [currentDate]);
  const dayKey = useMemo(() => `day-${format(currentDate, "yyyy-MM-dd")}`, [currentDate]);
  
  // Formato de fecha para pasar a los componentes
  const formattedDate = useMemo(() => format(currentDate, "yyyy-MM-dd"), [currentDate]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Cabecera unificada */}
      <header className="px-4 py-3 z-30 relative bg-white border-b">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-medium mb-4">{getViewTitle()}</h1>
          <div className="text-sm text-gray-500">{getViewSubtitle()}</div>
        </div>

        {/* Barra de navegación unificada */}
        <AgendaNavBar
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          view={view}
          isDayActive={isDayActive}
          appointments={appointments}
          onViewChange={handleViewChange}
        />
      </header>

      {/* Contenido con transiciones simplificadas */}
      <div className="flex-1 overflow-auto relative">
        {/* Vista semanal - optimizada para reducir renderizados */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            display: activeView === "week" ? "block" : "none",
            // No usar transiciones CSS para evitar repintados innecesarios
            zIndex: activeView === "week" ? 10 : 1
          }}
        >
          <WeeklyAgenda
            key={weekKey}
            initialDate={formattedDate}
            onAppointmentsChange={setAppointments}
            containerMode={true}
            initialClinic={memoizedClinic}
          />
        </div>
        
        {/* Vista diaria - optimizada para reducir renderizados */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            display: activeView === "day" ? "block" : "none",
            // No usar transiciones CSS para evitar repintados innecesarios
            zIndex: activeView === "day" ? 10 : 1
          }}
        >
          <DayView
            key={dayKey}
            date={formattedDate}
            containerMode={true}
            appointments={appointments}
            onViewChange={(newView) => handleViewChange(newView === "weekly" ? "week" : "day")}
          />
        </div>
      </div>
    </div>
  )
}


