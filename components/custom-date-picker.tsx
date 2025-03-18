"use client"

import React from "react"
import DatePicker from "react-datepicker"
import { es } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import "react-datepicker/dist/react-datepicker.css"

interface CustomDatePickerProps {
  onChange: (date: Date | null) => void
  onBlur: () => void
  value: Date | null
  name: string
  onDateSelect?: (date: Date | null) => void
}

export const CustomDatePicker = React.forwardRef<any, CustomDatePickerProps>(
  ({ onChange, onBlur, value, name, onDateSelect }, ref) => {
    const [key, setKey] = React.useState(0)

    const handleChange = (date: Date | null) => {
      onChange(date)
      if (onDateSelect) {
        onDateSelect(date)
      }
    }

    return (
      <div className="relative">
        <DatePicker
          key={key}
          selected={value}
          onChange={handleChange}
          onBlur={onBlur}
          dateFormat="dd/MM/yyyy"
          locale={es}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          isClearable={false}
          placeholderText="Seleccione una fecha"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          calendarClassName="date-picker-custom"
          renderCustomHeader={({
            date,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div>
              <div className="flex justify-between px-4 pt-2">
                <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button" className="p-1">
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <div className="flex gap-2">
                  <select
                    value={date.getMonth()}
                    onChange={({ target: { value } }) => changeMonth(Number.parseInt(value, 10))}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {es.localize?.month(i)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={date.getFullYear()}
                    onChange={({ target: { value } }) => changeYear(Number.parseInt(value, 10))}
                  >
                    {Array.from({ length: 100 }, (_, i) => (
                      <option key={i} value={date.getFullYear() - 50 + i}>
                        {date.getFullYear() - 50 + i}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button" className="p-1">
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}
        >
          <div className="datepicker-footer">
            <button
              onClick={(e) => {
                e.preventDefault()
                handleChange(null)
                setKey((prev) => prev + 1)
              }}
              type="button"
            >
              BORRAR
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                handleChange(new Date())
                setKey((prev) => prev + 1)
              }}
              type="button"
            >
              HOY
            </button>
          </div>
        </DatePicker>
        <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      </div>
    )
  },
)

CustomDatePicker.displayName = "CustomDatePicker"

