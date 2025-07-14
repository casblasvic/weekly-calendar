"use client"

import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { useState } from "react"

interface CalendarDateRangePickerProps {
  dateRange?: DateRange | undefined
  setDateRange?: (dateRange: DateRange | undefined) => void
  className?: string
}

export function CalendarDateRangePicker({ 
  dateRange: externalDateRange, 
  setDateRange: externalSetDateRange,
  className 
}: CalendarDateRangePickerProps = {}) {
  const [internalDateRange, setInternalDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })

  // Usar props externas si están disponibles, sino usar estado interno
  const dateRange = externalDateRange !== undefined ? externalDateRange : internalDateRange
  const setDateRange = externalSetDateRange || setInternalDateRange

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={"outline"}
          className={cn("w-full justify-start text-left font-normal", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="block truncate">
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "d MMM, yyyy", { locale: es })} -{" "}
                  {format(dateRange.to, "d MMM, yyyy", { locale: es })}
                </>
              ) : (
                format(dateRange.from, "d MMM, yyyy", { locale: es })
              )
            ) : (
              "Selecciona un rango"
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={setDateRange}
          locale={es}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
} 