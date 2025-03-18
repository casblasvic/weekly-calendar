"use client"

import type React from "react"

import { format, addDays } from "date-fns"
import { getDayBackgroundColor, getGridBorderColor } from "@/utils/day-colors"

interface WeeklyAgendaGridProps {
  startDate: Date
  startHour: number
  endHour: number
  hourHeight: number
  onCellClick: (date: Date, hour: number, minute: number) => void
}

const WeeklyAgendaGrid: React.FC<WeeklyAgendaGridProps> = ({
  startDate,
  startHour,
  endHour,
  hourHeight,
  onCellClick,
}) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  const borderColor = getGridBorderColor()

  return (
    <div className="relative w-full">
      <div className="flex">
        {days.map((day, index) => {
          const dayOfWeek = day.getDay()
          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={`flex-1 ${getDayBackgroundColor(dayOfWeek)} ${borderColor}`}
              style={{ borderRight: index < 6 ? `1px solid var(--purple-300)` : "none" }}
            >
              {/* Contenido de la columna del día */}
              {Array.from({ length: (endHour - startHour) * 4 }, (_, i) => {
                const hour = startHour + Math.floor(i / 4)
                const minute = (i % 4) * 15
                return (
                  <div
                    key={`cell-${dayOfWeek}-${hour}-${minute}`}
                    className="w-full cursor-pointer"
                    style={{
                      height: `${hourHeight / 4}px`,
                      borderTop: `1px solid var(--purple-200)`,
                    }}
                    onClick={() => onCellClick(day, hour, minute)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Time slots - líneas horizontales */}
      {Array.from({ length: endHour - startHour + 1 }, (_, i) => {
        const hour = startHour + i
        return (
          <div
            key={`time-${hour}`}
            className={`absolute w-full ${borderColor}`}
            style={{
              top: `${i * hourHeight}px`,
              borderTop: `1px solid var(--purple-300)`,
            }}
          />
        )
      })}
    </div>
  )
}

export default WeeklyAgendaGrid

