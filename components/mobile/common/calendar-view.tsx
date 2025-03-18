"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MobileCalendarViewProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  onClose: () => void
}

export function MobileCalendarView({ currentDate, onDateChange, onClose }: MobileCalendarViewProps) {
  const [view, setView] = useState<"date" | "month" | "year">("date")
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())

  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

  const years = Array.from({ length: 9 }, (_, i) => selectedYear - 4 + i)

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1)
    const days = []
    while (date.getMonth() === month) {
      days.push(new Date(date))
      date.setDate(date.getDate() + 1)
    }
    return days
  }

  const renderDateView = () => {
    const days = getDaysInMonth(selectedYear, selectedMonth)
    const firstDay = days[0].getDay()
    const blanks = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-purple-600 text-lg">
            {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: es })}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("month")} className="text-purple-600">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView("year")} className="text-purple-600">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
            <div key={day} className="text-center text-sm text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-10" />
          ))}
          {days.map((date) => {
            const isSelected = date.toDateString() === currentDate.toDateString()
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <Button
                key={date.toString()}
                variant="ghost"
                className={`h-10 w-full ${
                  isSelected ? "bg-purple-100 text-purple-600" : isToday ? "text-purple-600 font-bold" : ""
                }`}
                onClick={() => onDateChange(date)}
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
      <div className="text-purple-600 mb-4">
        <Button variant="link" onClick={() => setView("date")}>
          Volver
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {months.map((month, index) => (
          <Button
            key={month}
            variant="ghost"
            className={`h-12 ${index === selectedMonth ? "bg-purple-100 text-purple-600" : ""}`}
            onClick={() => {
              setSelectedMonth(index)
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
      <div className="text-purple-600 mb-4">
        <Button variant="link" onClick={() => setView("date")}>
          Volver
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {years.map((year) => (
          <Button
            key={year}
            variant="ghost"
            className={`h-12 ${year === selectedYear ? "bg-purple-100 text-purple-600" : ""}`}
            onClick={() => {
              setSelectedYear(year)
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
    <div className="bg-white rounded-t-lg">
      <div className="p-4 border-b flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="ghost" onClick={() => onDateChange(new Date())}>
          Hoy
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={onClose}>
          Aceptar
        </Button>
      </div>

      {view === "date" && renderDateView()}
      {view === "month" && renderMonthView()}
      {view === "year" && renderYearView()}
    </div>
  )
}

