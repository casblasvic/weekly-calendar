"use client"
import { useState, useCallback } from "react"
import type React from "react"

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useClinic } from "@/contexts/clinic-context"

interface MobileDatePickerProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onClose: () => void
}

type View = "date" | "month" | "year"

export function MobileDatePicker({ selectedDate, onDateSelect, onClose }: MobileDatePickerProps) {
  const [view, setView] = useState<View>("date")
  const [viewDate, setViewDate] = useState(selectedDate || new Date())
  const { activeClinic } = useClinic()

  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const currentYear = viewDate.getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i)

  const getDaysInMonth = () => {
    const start = startOfMonth(viewDate)
    const end = endOfMonth(viewDate)
    return eachDayOfInterval({ start, end })
  }

  const goToToday = () => {
    const today = new Date()
    setViewDate(today)
    onDateSelect(today)
  }

  const handlePrevMonth = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate((prevDate) => addMonths(prevDate, -1))
  }, [])

  const handleNextMonth = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate((prevDate) => addMonths(prevDate, 1))
  }, [])

  const isDayAvailable = useCallback(
    (date: Date) => {
      if (!activeClinic || !activeClinic.config || !activeClinic.config.schedule) {
        return true // Si no hay configuración, consideramos todos los días como disponibles
      }

      const dayOfWeek = date.getDay()
      const dayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek]

      const dayConfig = activeClinic.config.schedule[dayKey]
      return dayConfig && dayConfig.isOpen
    },
    [activeClinic],
  )

  const renderDateView = () => {
    const days = getDaysInMonth()
    const firstDay = days[0].getDay()
    const blanks = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <button
              className="text-lg font-medium text-purple-600 hover:text-purple-700"
              onClick={() => setView("month")}
            >
              {format(viewDate, "MMMM", { locale: es })}
            </button>
            <button
              className="text-lg font-medium text-purple-600 hover:text-purple-700"
              onClick={() => setView("year")}
            >
              {viewDate.getFullYear()}
            </button>
            <button
              className="ml-2 px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
              onClick={goToToday}
            >
              Hoy
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
            <div key={day} className="text-center text-sm text-gray-500 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-10" />
          ))}
          {days.map((date) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isToday = isSameDay(date, new Date())
            const isCurrentMonth = isSameMonth(date, viewDate)
            const isAvailable = isDayAvailable(date)

            return (
              <Button
                key={date.toString()}
                variant="ghost"
                className={cn(
                  "h-10 w-full rounded-full",
                  isSelected && isAvailable && "bg-purple-600 text-white hover:bg-purple-700",
                  isToday && !isSelected && isAvailable && "text-purple-600 font-bold border-2 border-purple-600",
                  !isCurrentMonth && "text-gray-300",
                  !isAvailable && "text-gray-300 cursor-not-allowed opacity-50",
                  !isSelected && !isToday && isCurrentMonth && isAvailable && "hover:bg-purple-50",
                  isCurrentMonth && !isAvailable && "bg-gray-100",
                )}
                onClick={() => {
                  if (isAvailable && isCurrentMonth) {
                    onDateSelect(date)
                    onClose()
                  }
                }}
                disabled={!isCurrentMonth || !isAvailable}
              >
                {date.getDate()}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => (
    <div className="p-4">
      <button className="mb-4 text-purple-600 hover:text-purple-700 font-medium" onClick={() => setView("date")}>
        Volver
      </button>
      <div className="grid grid-cols-3 gap-4">
        {months.map((month, index) => (
          <Button
            key={month}
            variant="ghost"
            className={cn(
              "h-12 rounded-lg",
              index === viewDate.getMonth()
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "hover:bg-purple-50 text-gray-700",
            )}
            onClick={() => {
              const newDate = new Date(viewDate)
              newDate.setMonth(index)
              setViewDate(newDate)
              setView("date")
            }}
          >
            {month}
          </Button>
        ))}
      </div>
    </div>
  )

  const renderYearView = () => (
    <div className="p-4">
      <button className="mb-4 text-purple-600 hover:text-purple-700 font-medium" onClick={() => setView("date")}>
        Volver
      </button>
      <div className="grid grid-cols-3 gap-4">
        {years.map((year) => (
          <Button
            key={year}
            variant="ghost"
            className={cn(
              "h-12 rounded-lg",
              year === viewDate.getFullYear()
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "hover:bg-purple-50 text-gray-700",
            )}
            onClick={() => {
              const newDate = new Date(viewDate)
              newDate.setFullYear(year)
              setViewDate(newDate)
              setView("date")
            }}
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-white">
      {view === "date" && renderDateView()}
      {view === "month" && renderMonthView()}
      {view === "year" && renderYearView()}
    </div>
  )
}

