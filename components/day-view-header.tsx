"use client"

import { format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Printer } from "lucide-react"

interface DayViewHeaderProps {
  selectedDate: Date
  onPreviousDay: () => void
  onNextDay: () => void
  onToday: () => void
  onPrint?: () => void
}

export function DayViewHeader({ selectedDate, onPreviousDay, onNextDay, onToday, onPrint }: DayViewHeaderProps) {
  const isToday = isSameDay(selectedDate, new Date())

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onPreviousDay}>
          <ChevronLeft className="h-5 w-5 text-purple-600" />
        </Button>

        <div
          className={`px-6 py-2 rounded-md cursor-pointer group relative
            ${isToday ? "bg-purple-600 text-white" : "bg-purple-500 text-white"}
            transition-all duration-200 ease-in-out`}
        >
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium uppercase">{format(selectedDate, "EEEE", { locale: es })}</span>
            <span className="text-xl font-bold">{format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}</span>
          </div>

          {/* Indicador de hover - línea inferior */}
          <div className="absolute bottom-0 left-1/2 w-0 h-1 bg-white transform -translate-x-1/2 group-hover:w-full transition-all duration-200 ease-in-out"></div>

          {/* Efecto de hover - cambio de tono */}
          <div className="absolute inset-0 rounded-md bg-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -z-10"></div>
        </div>

        <Button variant="ghost" size="icon" onClick={onNextDay}>
          <ChevronRight className="h-5 w-5 text-purple-600" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className={`border-purple-500 ${isToday ? "bg-purple-100" : ""} text-purple-600 hover:bg-purple-50`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Hoy
        </Button>

        {onPrint && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        )}
      </div>
    </div>
  )
}

