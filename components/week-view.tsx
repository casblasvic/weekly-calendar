"use client"

import React, { useState, useEffect, useMemo } from "react"
import { format, parseISO, addDays, subDays, isToday, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
// import DailyAgenda from "./daily-agenda"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { ChevronLeft, ChevronRight, CalendarDays, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import { ScheduleBlock, useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { useClinic } from "@/contexts/clinic-context"
import type { WeekSchedule } from "@/types/schedule"
import type { ScheduleBlock as ScheduleBlockType } from "@/contexts/schedule-blocks-context"

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
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlockType[]>([])

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

  // <<< Generar timeSlots (mover lógica aquí si no está ya) >>>
  // Asumimos que openTime, closeTime, slotDuration están disponibles aquí
  const openTime = activeClinic?.openTime || "09:00"
  const closeTime = activeClinic?.closeTime || "20:00" // Usar 20:00 como en el modal
  const slotDuration = activeClinic?.slotDuration || 15
  const timeSlots = useMemo(() => {
    // Reutilizar la lógica de getTimeSlots (asumiendo que existe globalmente o importada)
    // O copiar la lógica de cálculo de availableHours del modal (simplificada)
    const startTotalMinutes = parseInt(openTime.split(':')[0]) * 60 + parseInt(openTime.split(':')[1]);
    const endTotalMinutes = parseInt(closeTime.split(':')[0]) * 60 + parseInt(closeTime.split(':')[1]);
    const hours = [];
    for (let totalMinutes = startTotalMinutes; totalMinutes <= endTotalMinutes; totalMinutes += slotDuration) {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if (h > parseInt(closeTime.split(':')[0]) || (h === parseInt(closeTime.split(':')[0]) && m > parseInt(closeTime.split(':')[1]))) break;
      hours.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
    return hours;
  }, [openTime, closeTime, slotDuration]);

  const startOfCurrentWeek = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]); // Memoizar cálculo
  const daysToDisplay = useMemo(() => Array.from({ length: daysToShow }, (_, i) => addDays(startOfCurrentWeek, i)), [daysToShow, startOfCurrentWeek]);

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
            String(activeClinic.id),
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
    <Card className="bg-white border rounded-lg shadow-none flex flex-col h-full">
      {showNavigation && (
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => changeWeek("next")}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="text-sm font-medium">
            {format(selectedDate, "MMMM yyyy", { locale: es })}
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setDaysToShow(daysToShow === 7 ? 14 : 7)}>
                <CalendarDays className="w-4 h-4 mr-1" />
                {daysToShow === 7 ? "Semana" : "2 Semanas"}
                <ArrowLeftRight className="w-3 h-3 ml-1" />
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
      <div className="flex-1 overflow-auto">
        <div 
          className="grid relative"
          style={{ 
             gridTemplateColumns: `auto repeat(${daysToShow}, minmax(150px, 1fr))`,
             minWidth: 'fit-content'
             }}
        >
          <div className="sticky top-0 z-20 col-span-1 row-span-1">
            <div className="p-2 text-xs font-medium text-center text-gray-600 border-b border-r bg-gray-50 h-12 flex items-center justify-center">Hora</div>
          </div>
          {daysToDisplay.map((day, i) => (
             <div key={`header-${i}`} className="sticky top-0 z-20 col-span-1 row-span-1">
               <div className="p-2 text-xs font-semibold text-center border-b border-r bg-gray-50 h-12 flex items-center justify-center">
                 {format(day, 'EEE dd/MM', { locale: es })}
               </div>
             </div>
          ))}

          <div className="col-start-1 row-start-2"> 
             {timeSlots.map((time) => (
               <div key={time} className="h-10 p-1 text-[10px] text-center border-r border-b bg-gray-50 flex items-center justify-center">
                 {time}
               </div>
             ))}
          </div>

          {daysToDisplay.map((day, i) => {
            const dayBlocks = scheduleBlocks.filter(block => {
              const blockDate = block.date === format(day, "yyyy-MM-dd");
              const isRecurring = block.recurring && 
                block.recurrencePattern?.daysOfWeek?.includes(day.getDay());
              return blockDate || isRecurring;
            });
            
            return (
              <div key={i} className={`col-start-${i + 2} row-start-2`}> 
                 {timeSlots.map((time, timeIndex) => (
                   <div key={timeIndex} className="h-10 border-r border-b p-1 relative">
                      {dayBlocks
                        .filter(b => time >= b.startTime && time < b.endTime)
                        .map(b => <div key={b.id} className="text-[9px] bg-red-100 rounded px-0.5">{b.description || 'Bloqueo'}</div>)
                      }
                   </div>
                 ))}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  )
} 