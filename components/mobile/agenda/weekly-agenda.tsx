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
    <div className="agenda-container">
      {/* Cabecera fija */}
      <div className="agenda-header">
        <table className="w-full">
          <thead>
            <tr>
              <th className="grid-header-cell w-20 p-2 text-sm font-medium text-left text-gray-500">Hora</th>
              {activeCabins.map((cabin) => (
                <th
                  key={`cabin-header-${cabin.id}`}
                  className="grid-header-cell p-2 text-xs font-medium text-center text-white"
                  style={getColorStyle(cabin.color)}
                >
                  {cabin.code}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      
      {/* Cuerpo del grid con desplazamiento */}
      <div className="agenda-body">
        <table className="agenda-grid">
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time} className="border-b">
                <td className="grid-cell p-2 text-sm font-medium text-purple-600">{time}</td>
                {activeCabins.map((cabin) => (
                  <td key={`${time}-${cabin.id}`} className="grid-cell p-0 relative"></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Indicador de hora actual */}
        <div 
          className="current-time-indicator"
          style={{ top: calculateCurrentTimePosition(timeSlots, clinicOpenTime, clinicCloseTime) }}
        />
      </div>
    </div>
  )
}

