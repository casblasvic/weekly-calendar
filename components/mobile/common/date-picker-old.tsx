"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

type View = "date" | "month" | "year"

export function MobileDatePicker({ selectedDate, onDateSelect, onPrevMonth, onNextMonth }: DatePickerProps) {
  const [view, setView] = useState<View>("date")
  const [viewDate, setViewDate] = useState(selectedDate)

  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const currentYear = viewDate.getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i)

  const getDaysInMonth = () => {
    const start = startOfMonth(viewDate)
    const end = endOfMonth(viewDate)
    return eachDayOfInterval({ start, end })
  }

  const renderDateView = () => {
    const days = getDaysInMonth()
    const firstDay = days[0].getDay()
    const blanks = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="icon" onClick={onPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <button className="text-lg font-medium text-purple-600" onClick={() => setView("month")}>
              {format(viewDate, "MMMM", { locale: es })}
            </button>
            <button className="text-lg font-medium text-purple-600" onClick={() => setView("year")}>
              {viewDate.getFullYear()}
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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
            const isSelected = date.toDateString() === selectedDate.toDateString()
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <button
                key={date.toString()}
                className={`h-10 w-full rounded-full ${
                  isSelected ? "bg-purple-600 text-white" : isToday ? "text-purple-600 font-bold" : "hover:bg-gray-100"
                }`}
                onClick={() => onDateSelect(date)}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => (
    <div className="p-4">
      <button className="mb-4 text-purple-600" onClick={() => setView("date")}>
        Volver
      </button>
      <div className="grid grid-cols-3 gap-4">
        {months.map((month, index) => (
          <button
            key={month}
            className={`h-12 rounded-lg ${
              index === viewDate.getMonth() ? "bg-purple-600 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => {
              setViewDate(new Date(viewDate.setMonth(index)))
              setView("date")
            }}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  )

  const renderYearView = () => (
    <div className="p-4">
      <button className="mb-4 text-purple-600" onClick={() => setView("date")}>
        Volver
      </button>
      <div className="grid grid-cols-3 gap-4">
        {years.map((year) => (
          <button
            key={year}
            className={`h-12 rounded-lg ${
              year === viewDate.getFullYear() ? "bg-purple-600 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => {
              setViewDate(new Date(year, viewDate.getMonth()))
              setView("date")
            }}
          >
            {year}
          </button>
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

