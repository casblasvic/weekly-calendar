"use client"

import React from "react"
import { useState, useEffect } from "react"
import { format, parseISO, addDays, subDays, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { DayOfWeek } from "./day-of-week"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { ChevronLeft, ChevronRight, CalendarDays, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { useClinic } from "@/contexts/clinic-context"

interface WeekViewProps {
  startDate: string
  linkFormat?: "day" | "date"
  showNavigation?: boolean
  showFullDate?: boolean
  onDateChange?: (date: string) => void
  maxDays?: number
  defaultDaysToShow?: number
}

export function WeekView({
  startDate,
  linkFormat = "day",
  showNavigation = true,
  showFullDate = false,
  onDateChange,
  maxDays = 14,
  defaultDaysToShow = 7,
}: WeekViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return parseISO(startDate)
    } catch (error) {
      return new Date()
    }
  })
  
  const { getBlocksByDateRange } = useScheduleBlocks()
  const { activeClinic } = useClinic()
  const [daysToShow, setDaysToShow] = useState(defaultDaysToShow)
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])

  // Actualizar la fecha seleccionada cuando cambia el prop startDate
  useEffect(() => {
    try {
      setSelectedDate(parseISO(startDate))
    } catch (error) {
      // Error silencioso
    }
  }, [startDate])

  // Función para cambiar la semana hacia adelante o atrás
  const changeWeek = (direction: "next" | "prev") => {
    const newDate = direction === "next" ? addDays(selectedDate, 7) : subDays(selectedDate, 7)
    setSelectedDate(newDate)
    const formattedDate = format(newDate, "yyyy-MM-dd")
    if (onDateChange) {
      onDateChange(formattedDate)
    }
  }

  // Generar array de fechas para mostrar
  const daysToDisplay = Array.from({ length: daysToShow }, (_, i) => addDays(selectedDate, i))

  // Alternar entre vista semanal y quincenal
  const toggleView = () => {
    setDaysToShow(daysToShow === 7 ? 14 : 7)
  }

  // Cargar bloques de horario
  useEffect(() => {
    const loadBlocks = async () => {
      if (activeClinic?.id) {
        try {
          // Calcular el rango de fechas
          const startDateStr = format(selectedDate, "yyyy-MM-dd")
          const endDateStr = format(addDays(selectedDate, daysToShow - 1), "yyyy-MM-dd")
          
          // Usar el contexto especializado para obtener bloques
          const blocks = await getBlocksByDateRange(
            Number(activeClinic.id),
            startDateStr,
            endDateStr
          )
          
          if (Array.isArray(blocks)) {
            setScheduleBlocks(blocks)
          } else {
            console.error("Los bloques devueltos no son un array:", blocks)
            setScheduleBlocks([])
          }
        } catch (error) {
          console.error("Error al cargar bloques de agenda:", error)
          setScheduleBlocks([])
        }
      }
    }
    
    loadBlocks()
  }, [selectedDate, daysToShow, activeClinic?.id, getBlocksByDateRange])

  return (
    <Card className="shadow-none border rounded-lg bg-white">
      {showNavigation && (
        <div className="flex justify-between p-4 items-center border-b">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => changeWeek("next")}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="text-sm font-medium">
            {format(selectedDate, "MMMM yyyy", { locale: es })}
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm" onClick={toggleView}>
                <CalendarDays className="h-4 w-4 mr-1" />
                {daysToShow === 7 ? "Semana" : "2 Semanas"}
                <ArrowLeftRight className="h-3 w-3 ml-1" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" className="w-52">
              <p className="text-xs text-gray-500">
                Cambia entre vista semanal y quincenal
              </p>
            </HoverCardContent>
          </HoverCard>
        </div>
      )}
      <CardContent className="p-0">
        <div className="grid grid-cols-7 divide-x" style={daysToShow > 7 ? { gridTemplateColumns: `repeat(${daysToShow}, 1fr)` } : {}}>
          {daysToDisplay.map((day, i) => {
            // Filtrar bloques para esta fecha
            const dayBlocks = scheduleBlocks.filter(block => {
              const blockDate = block.date === format(day, "yyyy-MM-dd");
              // Incluir bloques recurrentes
              const isRecurring = block.recurring && 
                block.recurrencePattern?.daysOfWeek?.includes(day.getDay());
              return blockDate || isRecurring;
            });
            
            return (
              <DayOfWeek
                key={i}
                date={day}
                blocks={dayBlocks}
                isToday={isToday(day)}
                linkFormat={linkFormat}
                showFullDate={showFullDate}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
} 