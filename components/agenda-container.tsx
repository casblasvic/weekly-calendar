"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { AgendaNavBar } from "./agenda-nav-bar"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import WeeklyAgenda from "./weekly-agenda"
import DayView from "./day-view"

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

  // Determinar la vista actual basada en la URL
  const [view, setView] = useState<"week" | "day">(initialView)

  // Parsear la fecha inicial
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parse(initialDate, "yyyy-MM-dd", new Date())
    } catch (error) {
      console.error("Error parsing date:", error)
      return new Date()
    }
  })

  // Estado para almacenar las citas
  const [appointments, setAppointments] = useState<any[]>([])

  // Obtener la configuración de la clínica
  const { activeClinic } = useClinic()
  const clinicConfig = activeClinic?.config || {}

  // Actualizar la vista basada en la URL cuando cambia
  useEffect(() => {
    if (pathname.includes("/agenda/semana")) {
      setView("week")
    } else if (pathname.includes("/agenda/dia")) {
      setView("day")
    }

    // Extraer la fecha de la URL
    const dateMatch = pathname.match(/\d{4}-\d{2}-\d{2}/)
    if (dateMatch) {
      try {
        const newDate = parse(dateMatch[0], "yyyy-MM-dd", new Date())
        setCurrentDate(newDate)
      } catch (error) {
        console.error("Error parsing date from URL:", error)
      }
    }
  }, [pathname])

  // Escuchar cambios en la URL sin recargar la página
  useEffect(() => {
    const handlePopState = () => {
      // Extraer la vista y la fecha de la URL actual
      const currentPath = window.location.pathname
      let newView: "week" | "day" = view

      if (currentPath.includes("/agenda/semana")) {
        newView = "week"
      } else if (currentPath.includes("/agenda/dia")) {
        newView = "day"
      }

      const dateMatch = currentPath.match(/\d{4}-\d{2}-\d{2}/)
      if (dateMatch) {
        try {
          const newDate = parse(dateMatch[0], "yyyy-MM-dd", new Date())
          setCurrentDate(newDate)
        } catch (error) {
          console.error("Error parsing date from URL:", error)
        }
      }

      setView(newView)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [view])

  // Función para obtener la clave del día en inglés a partir de una fecha
  const getDayKey = (date: Date) => {
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
  }

  // Función para verificar si un día está activo en la configuración
  const isDayActive = (date: Date) => {
    const dayKey = getDayKey(date)
    return clinicConfig.schedule?.[dayKey]?.isOpen ?? false
  }

  // Función para cambiar entre vistas y actualizar la URL
  const handleViewChange = (newView: "week" | "day", newDate?: Date) => {
    const dateToUse = newDate || currentDate
    const formattedDate = format(dateToUse, "yyyy-MM-dd")

    // Guardar las citas en sessionStorage para que la vista diaria pueda acceder a ellas
    if (typeof window !== "undefined" && appointments.length > 0) {
      sessionStorage.setItem("weeklyAppointments", JSON.stringify(appointments))
    }

    if (newView === "day") {
      router.push(`/agenda/dia/${formattedDate}`)
    } else {
      router.push(`/agenda/semana/${formattedDate}`)
    }

    setView(newView)
    setCurrentDate(dateToUse)
  }

  // Título y subtítulo según la vista actual
  const getViewTitle = () => {
    if (view === "week") {
      return "Agenda semanal"
    } else {
      return "Agenda diaria"
    }
  }

  const getViewSubtitle = () => {
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
  }

  // Actualizar las citas cuando cambia la vista
  useEffect(() => {
    // Si estamos en la vista diaria, intentar cargar las citas desde sessionStorage
    if (view === "day" && typeof window !== "undefined") {
      const storedAppointments = sessionStorage.getItem("weeklyAppointments")
      if (storedAppointments) {
        try {
          const parsedAppointments = JSON.parse(storedAppointments)

          // Convertir las fechas de string a objetos Date
          const processedAppointments = parsedAppointments.map((apt: any) => ({
            ...apt,
            date: new Date(apt.date),
          }))

          setAppointments(processedAppointments)
        } catch (error) {
          console.error("Error parsing appointments:", error)
        }
      }
    }
  }, [view])

  return (
    <HydrationWrapper fallback={<div>Cargando agenda...</div>}>
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
          />
        </header>

        {/* Contenido condicional según la vista */}
        <div className="flex-1 overflow-auto">
          {view === "week" ? (
            <WeeklyAgenda
              initialDate={format(currentDate, "yyyy-MM-dd")}
              onAppointmentsChange={setAppointments}
              containerMode={true}
            />
          ) : (
            <DayView
              date={format(currentDate, "yyyy-MM-dd")}
              containerMode={true}
              appointments={appointments}
              onViewChange={handleViewChange}
            />
          )}
        </div>
      </div>
    </HydrationWrapper>
  )
}

