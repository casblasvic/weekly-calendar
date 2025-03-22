"use client"

import type React from "react"

import { useState, useLayoutEffect, useEffect } from "react"
import { format, addDays, addMonths, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Calendar } from "lucide-react"
import { getColorStyle } from "@/utils/color-utils"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"

// Modificar la interfaz de props para incluir selectedDate y onBackToWeekView
interface MobileWeeklyAgendaProps {
  cabins: any[]
  timeSlots: string[]
  selectedDate?: Date
  onBackToWeekView?: () => void
}

interface Cabin {
  id: string
  code: string
  color: string
  isActive: boolean
  order: number
}

// Asegurarse de que el componente use estos nuevos props
export function MobileWeeklyAgenda({ cabins, timeSlots, selectedDate, onBackToWeekView }: MobileWeeklyAgendaProps) {
  // Si se proporciona una fecha seleccionada, usarla como fecha inicial
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date())
  const [activeCabins, setActiveCabins] = useState<Cabin[]>([])
  const [isClient, setIsClient] = useState(false)
  const [containerRef, setContainerRef] = useState<React.RefObject<HTMLDivElement> | null>(null)
  const clinicOpenTime = "08:00"
  const clinicCloseTime = "20:00"

  // Inicializar la referencia al contenedor
  useLayoutEffect(() => {
    setContainerRef({ current: document.querySelector(".mobile-agenda-container") as HTMLDivElement })
  }, [])

  // Usar useLayoutEffect para aplicar cambios antes de que el navegador pinte
  useLayoutEffect(() => {
    setIsClient(true)

    if (cabins && cabins.length > 0) {
      // Filtrar y ordenar cabinas activas
      const sortedActiveCabins = cabins.filter((cabin) => cabin.isActive).sort((a, b) => a.order - b.order)

      setActiveCabins(sortedActiveCabins)
    } else {
      setActiveCabins([])
    }
  }, [cabins])

  // Función para navegar por días sin actualizar router durante renderizado
  const changeDate = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate)
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  // Función para navegar por semanas
  const changeWeek = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate)
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
      return newDate
    })
  }

  // Función para navegar por meses
  const changeMonth = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate)
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  // Calcular el inicio y fin de la semana actual para mostrar el rango
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekRange = `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM", { locale: es })}`

  // Renderizado simplificado para evitar problemas de hidratación
  return (
    <div className="flex flex-col h-full bg-white mobile-agenda-container" suppressHydrationWarning>
      {/* Header con logo y fecha actual */}
      <header className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div className="font-bold">LOGO</div>
          {onBackToWeekView && (
            <Button variant="outline" size="sm" onClick={onBackToWeekView} className="mb-2">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Vista semanal
            </Button>
          )}
          <div className="text-sm text-gray-500" suppressHydrationWarning>
            {isClient ? format(currentDate, "EEEE, d 'de' MMMM", { locale: es }) : "Cargando..."}
          </div>
        </div>
        
        {/* Barra de navegación mejorada y más responsive */}
        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8" 
              onClick={() => changeMonth("prev")}
              aria-label="Mes anterior"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8" 
              onClick={() => changeWeek("prev")}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          
          <span className="text-sm font-medium">{weekRange}</span>
          
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8" 
              onClick={() => changeWeek("next")}
              aria-label="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8" 
              onClick={() => changeMonth("next")}
              aria-label="Mes siguiente"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="relative w-full overflow-x-auto">
        {isClient ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-20 p-2 text-sm font-medium text-left text-gray-500 border-r">Hora</th>
                {activeCabins.map((cabin) => (
                  <th
                    key={`cabin-header-${cabin.id}`}
                    className="p-2 text-xs font-medium text-center text-white border-r last:border-r-0"
                    style={getColorStyle(cabin.color)}
                  >
                    {cabin.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time} className="border-b">
                  <td className="p-2 text-sm font-medium text-purple-600 border-r" data-time={time}>
                    {time}
                  </td>
                  {activeCabins.map((cabin) => (
                    <td key={`${time}-${cabin.id}`} className="p-2 border-r last:border-r-0"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center">Cargando agenda...</div>
        )}

        {/* Indicador de tiempo actual */}
        {containerRef && (
          <CurrentTimeIndicator
            timeSlots={timeSlots}
            rowHeight={40} // Altura estándar para móvil
            isMobile={true}
            className="z-10"
            agendaRef={containerRef}
            clinicOpenTime={clinicOpenTime}
            clinicCloseTime={clinicCloseTime}
          />
        )}
      </div>
    </div>
  )
}

