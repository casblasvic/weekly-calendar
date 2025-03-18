"use client"

import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Lock, Printer, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

interface DayViewHeaderProps {
  selectedDate: Date
  onPrevDay: () => void
  onNextDay: () => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onDateSelect: (date: Date) => void
  onToday: () => void
  onPrint: () => void
  onBackToWeekView: () => void
  employees: { id: string; name: string }[]
  selectedEmployee: string
  onEmployeeChange: (employeeId: string) => void
}

export function DayViewHeader({
  selectedDate,
  onPrevDay,
  onNextDay,
  onPrevMonth,
  onNextMonth,
  onDateSelect,
  onToday,
  onPrint,
  onBackToWeekView,
  employees,
  selectedEmployee,
  onEmployeeChange,
}: DayViewHeaderProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <header className="px-4 py-3 z-30 relative bg-white border-b">
      <div className="px-4 py-3">
        <h1 className="text-2xl font-medium mb-4">Agenda diaria</h1>
        <div className="text-sm text-gray-500">
          {format(selectedDate, "EEEE", { locale: es })} {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
        </div>
      </div>

      <div className="flex items-center gap-3 border-b pb-3">
        <Button variant="outline" size="sm" onClick={onBackToWeekView}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Vista semanal
        </Button>

        {/* Botones de navegación por meses */}
        <Button variant="ghost" size="icon" onClick={onPrevMonth} className="text-purple-600">
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Botones de navegación por días */}
        <Button variant="ghost" size="icon" onClick={onPrevDay} className="text-purple-600">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              {format(selectedDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateSelect(date)
                  setIsCalendarOpen(false)
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={onNextDay} className="text-purple-600">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onNextMonth} className="text-purple-600">
          <ChevronsRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={onToday}>
          <Calendar className="h-4 w-4 mr-2" />
          Hoy
        </Button>

        <Button variant="ghost" size="icon" className="ml-2 text-purple-600">
          <Lock className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onPrint} className="text-purple-600">
          <Printer className="h-4 w-4" />
        </Button>

        <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
          <SelectTrigger className="w-[180px] ml-2">
            <SelectValue placeholder="(Todos)" />
          </SelectTrigger>
          <SelectContent className="z-50">
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  )
}

