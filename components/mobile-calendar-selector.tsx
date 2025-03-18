"use client"

import { Calendar } from "@/components/ui/calendar"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface MobileCalendarSelectorProps {
  currentDate: Date
  onDateSelect: (date: Date | undefined) => void
  isDayActive: (date: Date) => boolean
  className?: string
}

export function MobileCalendarSelector({
  currentDate,
  onDateSelect,
  isDayActive,
  className,
}: MobileCalendarSelectorProps) {
  return (
    <div className={cn("p-4 bg-white rounded-lg", className)}>
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={onDateSelect}
        initialFocus
        disabled={(date) => !isDayActive(date)}
        className="border-none"
        classNames={{
          day_disabled: "text-gray-300 cursor-not-allowed bg-gray-50",
          day_selected: "bg-purple-600 text-white hover:bg-purple-700",
          day_today: "bg-purple-100 text-purple-900 font-bold",
          day: "hover:bg-purple-50 focus:bg-purple-100",
          head_cell: "text-purple-900 font-semibold",
          caption: "text-purple-900 font-semibold",
          nav_button: "text-purple-600 hover:bg-purple-50",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          cell: "text-center p-0 relative",
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        }}
        locale={es}
      />
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
          <span>Días no disponibles</span>
        </div>
      </div>
    </div>
  )
}

