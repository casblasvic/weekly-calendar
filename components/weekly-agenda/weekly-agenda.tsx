"use client"

import { useState, useEffect } from "react"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Appointment } from "./appointment"
import { CurrentTimeIndicator } from "./current-time-indicator"
import { ClinicConfigAlert } from "./clinic-config-alert"
import { useClinicConfig } from "@/hooks/use-clinic-config"
import { useClinicData } from "@/hooks/use-clinic-data"

interface WeeklyAgendaProps {
  initialDate: Date
  onDateChange?: (date: Date) => void
  onDayClick?: (date: Date) => void
}

export function WeeklyAgenda({ initialDate, onDateChange, onDayClick }: WeeklyAgendaProps) {
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Inicializar con el inicio de la semana de la fecha inicial
    return startOfWeek(initialDate, { weekStartsOn: 1 }) // Semana comienza el lunes
  })

  // Efecto para actualizar weekStartDate cuando cambia initialDate
  useEffect(() => {
    setWeekStartDate(startOfWeek(initialDate, { weekStartsOn: 1 }))
  }, [initialDate])

  const { clinicConfig, isLoading: isLoadingConfig } = useClinicConfig()
  const { appointments, cabins, isLoading: isLoadingData } = useClinicData(weekStartDate)

  const startHour = clinicConfig?.startHour || 8
  const endHour = clinicConfig?.endHour || 20
  const hourHeight = 60 // Altura en píxeles por hora

  // Generar días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))

  // Generar horas del día
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  // Manejar clic en una celda
  const handleCellClick = (date: Date, hour: number, minute = 0) => {
    const selectedDateTime = new Date(date)
    selectedDateTime.setHours(hour, minute, 0, 0)

    // Aquí iría la lógica para abrir el modal de creación de cita
    console.log("Celda seleccionada:", format(selectedDateTime, "yyyy-MM-dd HH:mm"))

    // Si se proporciona un manejador de eventos onCellClick, llamarlo
    // onCellClick && onCellClick(selectedDateTime)
  }

  // Manejar clic en un día
  const handleDayClick = (date: Date) => {
    onDayClick && onDayClick(date)
  }

  if (isLoadingConfig || isLoadingData) {
    return <div className="p-4">Cargando agenda...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Alerta de configuración de la clínica */}
      <ClinicConfigAlert clinicConfig={clinicConfig} />

      {/* Cabecera con los días de la semana */}
      <div className="flex border-b border-purple-300">
        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={`flex-1 p-2 text-center cursor-pointer relative group 
                ${isToday ? "bg-purple-600 text-white" : "bg-purple-500 text-white"}
                transition-all duration-200 ease-in-out`}
              onClick={() => handleDayClick(day)}
            >
              <div className="text-sm font-medium uppercase">{format(day, "EEEE", { locale: es })}</div>
              <div className={`text-xl font-bold ${isToday ? "text-white" : "text-white/90"}`}>{format(day, "d")}</div>

              {/* Indicador de hover - línea inferior */}
              <div className="absolute bottom-0 left-1/2 w-0 h-1 bg-white transform -translate-x-1/2 group-hover:w-full transition-all duration-200 ease-in-out"></div>

              {/* Efecto de hover - cambio de tono */}
              <div className="absolute inset-0 bg-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -z-10"></div>
            </div>
          )
        })}
      </div>

      {/* Contenido principal de la agenda */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative">
          {/* Columnas para cada día */}
          {weekDays.map((day, dayIndex) => (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={`flex-1 relative border-r border-purple-300 ${dayIndex % 2 === 0 ? "bg-purple-100" : "bg-purple-50"}`}
            >
              {/* Celdas para cada hora */}
              {hours.map((hour) => (
                <div
                  key={`${format(day, "yyyy-MM-dd")}-${hour}`}
                  className="border-t border-purple-300"
                  style={{ height: `${hourHeight}px` }}
                  onClick={() => handleCellClick(day, hour)}
                >
                  {/* Celdas para cada cuarto de hora */}
                  {[0, 15, 30, 45].map((minute) => (
                    <div
                      key={`${format(day, "yyyy-MM-dd")}-${hour}-${minute}`}
                      className="h-1/4 border-t border-purple-200 cursor-pointer hover:bg-purple-200/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCellClick(day, hour, minute)
                      }}
                    />
                  ))}
                </div>
              ))}

              {/* Citas para este día */}
              {appointments
                .filter((apt) => isSameDay(new Date(apt.date), day))
                .map((appointment) => (
                  <Appointment
                    key={appointment.id}
                    appointment={appointment}
                    startHour={startHour}
                    hourHeight={hourHeight}
                  />
                ))}
            </div>
          ))}

          {/* Indicador de hora actual */}
          {clinicConfig && (
            <CurrentTimeIndicator
              startHour={startHour}
              endHour={endHour}
              hourHeight={hourHeight}
              weekStartDate={weekStartDate}
              clinicConfig={clinicConfig}
            />
          )}
        </div>
      </div>

      {/* Columna de horas (opcional) */}
      <div className="absolute left-0 top-[72px] w-12 border-r border-purple-300">
        {hours.map((hour) => (
          <div
            key={`hour-${hour}`}
            className="border-t border-purple-300 text-xs text-right pr-1"
            style={{ height: `${hourHeight}px` }}
          >
            {hour}:00
          </div>
        ))}
      </div>
    </div>
  )
}

