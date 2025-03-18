"use client"

import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DayViewAppointment } from "./day-view-appointment"
import { getDayBackgroundColor, getGridBorderColor } from "@/utils/day-colors"

interface Appointment {
  id: string
  name: string
  service: string
  date: Date
  roomId: string
  startTime: string
  duration: number
  color: string
  completed?: boolean
  phone?: string
}

interface Cabin {
  id: number | string
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

interface DayViewGridProps {
  timeSlots: string[]
  appointments: Appointment[]
  cabins: Cabin[]
  onCellClick: (time: string, roomId: string) => void
  rowHeight: number
  selectedDate: Date
  totalHeight: number
  hourHeight: number
  calculateTopPosition: (time: string) => number
}

export function DayViewGrid({
  timeSlots,
  appointments,
  cabins,
  onCellClick,
  rowHeight,
  selectedDate,
  totalHeight,
  hourHeight,
  calculateTopPosition,
}: DayViewGridProps) {
  const today = new Date()
  const isToday = format(today, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
  const dayOfWeek = selectedDate.getDay()
  const borderColor = getGridBorderColor()

  // Función para verificar si hay una cita en una celda específica
  const getAppointmentForCell = (time: string, roomId: string | number) => {
    return appointments.find(
      (appointment) => appointment.roomId === roomId.toString() && appointment.startTime === time,
    )
  }

  // Función para manejar el clic en una celda
  const handleCellClick = (time: string, roomId: string) => {
    console.log("Celda clickeada:", time, roomId)
    // Llamar a la función onCellClick pasada como prop
    onCellClick(time, roomId)
  }

  return (
    <div
      className={`relative ${getDayBackgroundColor(dayOfWeek)} rounded-md overflow-hidden h-full`}
      style={{
        height: `${totalHeight}px`,
        border: `1px solid var(--purple-300)`,
      }}
    >
      {/* Grid de cabinas */}
      <div className="flex h-full">
        {cabins.map((cabin) => (
          <div
            key={cabin.id}
            className={`flex-1 relative ${cabin.isActive ? "" : "bg-gray-100"}`}
            style={{
              borderRight: `1px solid var(--purple-300)`,
            }}
          >
            {/* Renderizar celdas clickeables para cada intervalo de tiempo */}
            {timeSlots.map((time, index) => {
              const appointment = getAppointmentForCell(time, cabin.id)
              return (
                <div
                  key={`${cabin.id}-${time}`}
                  className={cn(
                    "absolute w-full cursor-pointer",
                    appointment ? "pointer-events-none" : "hover:bg-purple-100/50",
                  )}
                  style={{
                    top: `${calculateTopPosition(time)}px`,
                    height: `${rowHeight}px`,
                    borderTop: index > 0 ? `1px solid var(--purple-200)` : "none",
                  }}
                  onClick={() => {
                    if (!appointment) {
                      console.log("Celda clickeada en DayViewGrid:", time, cabin.id.toString())
                      handleCellClick(time, cabin.id.toString())
                    }
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Líneas de hora */}
      {timeSlots.map((time, index) => (
        <div
          key={`line-${time}`}
          className="absolute w-full"
          style={{
            top: `${calculateTopPosition(time)}px`,
            borderTop: `1px solid var(--purple-300)`,
          }}
        >
          <div className="text-xs text-gray-600 pl-1">{time}</div>
        </div>
      ))}

      {/* Renderizar las citas */}
      {appointments.map((appointment) => (
        <DayViewAppointment
          key={appointment.id}
          appointment={appointment}
          calculateTopPosition={calculateTopPosition}
          hourHeight={hourHeight}
        />
      ))}
    </div>
  )
}

