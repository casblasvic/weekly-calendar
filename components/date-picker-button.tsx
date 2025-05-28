"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfWeek, addDays, isToday, isSameDay, isSameMonth } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface DatePickerButtonProps {
  currentDate: Date | null
  setCurrentDate: (date: Date | null) => void
  view?: "week" | "day"
  isDayActive: (date: Date) => boolean
  isFormField?: boolean
  calendarWidth?: number
  buttonMaxWidth?: number
  buttonClassName?: string
}

export function DatePickerButton({
  currentDate,
  setCurrentDate,
  view = "day",
  isDayActive,
  isFormField = false,
  calendarWidth = 280,
  buttonMaxWidth,
  buttonClassName = "",
}: DatePickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(currentDate ? new Date(currentDate) : new Date())
  const [currentView, setCurrentView] = useState<"days" | "months" | "years">("days")
  const [selectedYear, setSelectedYear] = useState(currentDate ? currentDate.getFullYear() : new Date().getFullYear())
  const calendarRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Actualizar el mes actual cuando cambia la fecha seleccionada
  useEffect(() => {
    if (currentDate) {
      const newMonth = new Date(currentDate);
      // Solo sincronizar cuando currentDate cambie
      setCurrentMonth(newMonth);
      setSelectedYear(newMonth.getFullYear());
    }
  }, [currentDate]);

  // Cerrar el calendario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleDateSelect = (date: Date) => {
    if (!isDayActive(date)) return

    // Crear una nueva fecha con la hora exacta de la fecha actual para evitar problemas de zona horaria
    const selectedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      currentDate ? currentDate.getHours() : 0,
      currentDate ? currentDate.getMinutes() : 0,
      currentDate ? currentDate.getSeconds() : 0,
    )

    // Usar la fecha exacta
    setCurrentDate(selectedDate)
    setIsOpen(false)
  }

  const toggleCalendar = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setCurrentView("days")
      if (currentDate) {
        setCurrentMonth(new Date(currentDate))
      }
    }
  }

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + increment)
    setCurrentMonth(newMonth)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    if (isDayActive(today)) {
      handleDateSelect(today)
    }
  }

  const toggleMonthView = () => {
    setCurrentView(currentView === "months" ? "days" : "months")
  }

  const toggleYearView = () => {
    setCurrentView(currentView === "years" ? "days" : "years")
  }

  const renderDays = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)

    // Obtener el primer día de la semana (lunes)
    const startDate = new Date(monthStart)
    const day = startDate.getDay()
    startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1))

    const days = []
    const daysOfWeek = ["L", "M", "X", "J", "V", "S", "D"]

    // Renderizar los días de la semana
    days.push(
      <div key="weekdays" className="grid grid-cols-7 mb-1">
        {daysOfWeek.map((day, index) => (
          <div key={`weekday-${index}`} className="text-center text-xs font-medium py-1 text-gray-700">
            {day}
          </div>
        ))}
      </div>,
    )

    // Renderizar los días del mes
    const rows = []
    let cells = []
    let currentDateIter = new Date(startDate)

    // Crear 6 filas para asegurar que se muestran todos los días
    for (let i = 0; i < 42; i++) {
      const formattedDate = format(currentDateIter, "d")
      const isCurrentMonth = isSameMonth(currentDateIter, currentMonth)
      const isSelectedDay = currentDate && isSameDay(currentDateIter, currentDate)
      const isCurrentDay = isToday(currentDateIter)
      const isActive = isDayActive(currentDateIter)

      // Crear una copia de la fecha actual para evitar problemas de referencia
      const dateForClick = new Date(
        currentDateIter.getFullYear(),
        currentDateIter.getMonth(),
        currentDateIter.getDate(),
      )

      cells.push(
        <div
          key={`day-${i}`}
          className={cn(
            "relative h-7 w-7 p-0 text-center text-xs font-normal flex items-center justify-center",
            !isCurrentMonth && "text-gray-300",
            isCurrentDay && !isSelectedDay && "bg-purple-100 text-purple-900 rounded-full",
            isSelectedDay && "bg-purple-600 text-white rounded-full",
            !isActive
              ? "text-gray-300 cursor-not-allowed"
              : isCurrentMonth && !isSelectedDay && !isCurrentDay
                ? "cursor-pointer hover:bg-purple-50 rounded-full"
                : "",
          )}
          onClick={() => {
            if (isActive && isCurrentMonth) {
              handleDateSelect(dateForClick)
            }
          }}
        >
          {formattedDate}
        </div>,
      )

      // Avanzar al siguiente día
      currentDateIter = new Date(currentDateIter)
      currentDateIter.setDate(currentDateIter.getDate() + 1)

      if ((i + 1) % 7 === 0) {
        rows.push(
          <div key={`row-${i}`} className="grid grid-cols-7 gap-0">
            {cells}
          </div>,
        )
        cells = []
      }
    }

    return (
      <div>
        {days}
        <div className="space-y-1">{rows}</div>
      </div>
    )
  }

  const renderMonths = () => {
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]

    return (
      <div className="grid grid-cols-3 gap-1 p-1">
        {months.map((month, index) => {
          const isCurrentMonth = currentMonth.getMonth() === index && currentMonth.getFullYear() === selectedYear

          return (
            <div
              key={`month-${index}`}
              className={cn(
                "text-center py-2 px-1 rounded-md cursor-pointer text-xs",
                isCurrentMonth ? "bg-purple-600 text-white" : "hover:bg-purple-50 text-gray-700",
              )}
              onClick={() => {
                const newMonth = new Date(selectedYear, index, 1)
                setCurrentMonth(newMonth)
                setCurrentView("days")
              }}
            >
              {month}
            </div>
          )
        })}
      </div>
    )
  }

  const renderYears = () => {
    const currentYear = selectedYear
    const startYear = currentYear - 6
    const years = []

    for (let i = 0; i < 12; i++) {
      const year = startYear + i
      const isCurrentYear = currentMonth.getFullYear() === year

      years.push(
        <div
          key={`year-${i}`}
          className={cn(
            "text-center py-2 px-1 rounded-md cursor-pointer text-xs",
            isCurrentYear ? "bg-purple-600 text-white" : "hover:bg-purple-50 text-gray-700",
          )}
          onClick={() => {
            setSelectedYear(year)
            setCurrentMonth(new Date(year, currentMonth.getMonth(), 1))
            setCurrentView("months")
          }}
        >
          {year}
        </div>,
      )
    }

    return <div className="grid grid-cols-3 gap-1 p-1">{years}</div>
  }

  // Formatear la fecha para mostrar en el botón
  const getFormattedDate = () => {
    if (!currentDate) return "Seleccionar fecha"

    if (isFormField) {
      return format(currentDate, "dd/MM/yyyy")
    }

    if (view === "day") {
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: es })
    } else {
      // Calcular el primer día de la semana (lunes)
      const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 })
      // Calcular el último día de la semana (domingo)
      const endOfWeekDate = addDays(startOfWeekDate, 6)

      // Si ambas fechas están en el mismo mes
      if (startOfWeekDate.getMonth() === endOfWeekDate.getMonth()) {
        return `${format(startOfWeekDate, "d", { locale: es })}-${format(endOfWeekDate, "d 'de' MMMM", { locale: es })}`
      }
      // Si las fechas están en meses diferentes
      else {
        return `${format(startOfWeekDate, "d 'de' MMM", { locale: es })}-${format(endOfWeekDate, "d 'de' MMM", { locale: es })}`
      }
    }
  }

  return (
    <div className="relative" style={{ maxWidth: buttonMaxWidth ? `${buttonMaxWidth}px` : "none" }}>
      <Button
        ref={buttonRef}
        variant="outline"
        className={cn(
          "w-full justify-between text-left font-normal bg-white hover:bg-purple-50 border-purple-200 focus-visible:ring-purple-500 focus-visible:border-purple-500",
          isFormField ? "text-gray-900 h-10 px-3 py-2" : "text-purple-700",
          buttonClassName,
        )}
        onClick={toggleCalendar}
      >
        <span className="truncate">{getFormattedDate()}</span>
        <CalendarIcon className="h-4 w-4 opacity-70 flex-shrink-0" />
      </Button>

      {isOpen && (
        <div
          ref={calendarRef}
          className={`absolute mt-2 rounded-md shadow-lg bg-white ${view === 'day' ? 'z-[9999]' : 'z-50'}`}
          style={{ width: `${calendarWidth}px`, maxHeight: "350px" }}
        >
          <div className="p-2">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-purple-50 text-purple-600">
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex space-x-1">
                <button
                  onClick={toggleMonthView}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-md",
                    currentView === "months" ? "bg-purple-600 text-white" : "text-purple-900 hover:bg-purple-50",
                  )}
                >
                  {format(currentMonth, "MMMM", { locale: es })}
                </button>
                <button
                  onClick={toggleYearView}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-md",
                    currentView === "years" ? "bg-purple-600 text-white" : "text-purple-900 hover:bg-purple-50",
                  )}
                >
                  {format(currentMonth, "yyyy")}
                </button>
              </div>

              <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-purple-50 text-purple-600">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {currentView === "days" && renderDays()}
            {currentView === "months" && renderMonths()}
            {currentView === "years" && renderYears()}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
