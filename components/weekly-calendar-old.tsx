"use client"

import { useRef, useState, useEffect } from "react"
import { CurrentTimeIndicator } from "./current-time-indicator"

export function WeeklyCalendar() {
  const calendarContainerRef = useRef<HTMLDivElement>(null)
  const [hourHeight, setHourHeight] = useState(60) // Altura predeterminada por hora
  const [isMobile, setIsMobile] = useState(false)

  // Configuración de la clínica
  const clinicStartHour = 8 // 8:00 AM
  const clinicEndHour = 18 // 6:00 PM

  useEffect(() => {
    // Detectar si es móvil
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Calcular altura de hora basada en el contenedor
    const calculateHourHeight = () => {
      if (calendarContainerRef.current) {
        // Ejemplo: ajustar la altura según el contenedor
        // Esto es solo un ejemplo, ajusta según tu lógica real
        const containerHeight = calendarContainerRef.current.clientHeight
        const visibleHours = clinicEndHour - clinicStartHour
        const newHourHeight = containerHeight / visibleHours
        setHourHeight(newHourHeight)
      }
    }

    // Inicializar
    checkIfMobile()
    calculateHourHeight()

    // Actualizar en resize
    window.addEventListener("resize", () => {
      checkIfMobile()
      calculateHourHeight()
    })

    return () => {
      window.removeEventListener("resize", checkIfMobile)
      window.removeEventListener("resize", calculateHourHeight)
    }
  }, [clinicStartHour, clinicEndHour])

  return (
    <div className="relative h-[600px]" ref={calendarContainerRef}>
      {/* Aquí iría el contenido del calendario */}

      {/* Indicador de hora actual */}
      <CurrentTimeIndicator
        containerRef={calendarContainerRef}
        hourHeight={hourHeight}
        startHour={clinicStartHour}
        endHour={clinicEndHour}
      />

      {/* Versión móvil si es necesario */}
      {isMobile && (
        <CurrentTimeIndicator
          containerRef={calendarContainerRef}
          hourHeight={hourHeight}
          isMobile={true}
          startHour={clinicStartHour}
          endHour={clinicEndHour}
        />
      )}
    </div>
  )
}

