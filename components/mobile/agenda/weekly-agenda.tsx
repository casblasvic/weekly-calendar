"use client"

import type React from "react"

import { useState, useLayoutEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react"
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

  const changeDate = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate)
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  // Renderizado simplificado para evitar problemas de hidratación
  return (
    <div className="flex flex-col h-full bg-white mobile-agenda-container" suppressHydrationWarning>
      {/* Header con logo y fecha actual */}
      <header className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div className="font-bold">LOGO</div>
          {onBackToWeekView && (
            <Button variant="outline" size="sm" onClick={onBackToWeekView} className="mb-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Vista semanal
            </Button>
          )}
          <div className="text-sm text-gray-500" suppressHydrationWarning>
            {isClient ? format(currentDate, "EEEE, d 'de' MMMM yyyy, HH:mm", { locale: es }) : "Cargando..."}
          </div>
        </div>
      </header>

      {/* Navegador de fechas */}
      <div className="flex items-center gap-2 p-2 bg-purple-600 text-white">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("prev")}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-center text-sm" suppressHydrationWarning>
          {isClient ? format(currentDate, "EEEE d 'de' MMMM", { locale: es }) : "Cargando..."}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("next")}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Cabecera de cabinas con tabla HTML para mayor compatibilidad */}
      <div className="overflow-x-auto w-full relative">
        {isClient ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-sm font-medium text-gray-500 border-r text-left w-20">Hora</th>
                {activeCabins.map((cabin) => (
                  <th
                    key={`cabin-header-${cabin.id}`}
                    className="text-white text-xs p-2 text-center font-medium border-r last:border-r-0"
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
                  <td className="p-2 text-sm text-purple-600 font-medium border-r" data-time={time}>
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

