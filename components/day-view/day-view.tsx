"use client"

import { useState } from "react"
import { DayViewHeader } from "../day-view-header"
import { DayViewGrid } from "./day-view-grid"
import { useDayViewNavigation } from "@/hooks/use-day-view-navigation"
import { useDayViewAppointments } from "@/hooks/use-day-view-appointments"
import { useEmployeeFilter } from "@/hooks/use-employee-filter"
import { usePrintDayView } from "@/hooks/use-print-day-view"
import { CreateAppointmentModal } from "../create-appointment-modal"

interface DayViewProps {
  initialDate: Date
  onDateChange?: (date: Date) => void
}

export function DayView({ initialDate, onDateChange }: DayViewProps) {
  const { selectedDate, goToNextDay, goToPreviousDay, goToToday } = useDayViewNavigation(initialDate, onDateChange)
  const { appointments, isLoading, cabins, timeSlots } = useDayViewAppointments(selectedDate)
  const { selectedEmployees, toggleEmployee, employeeOptions } = useEmployeeFilter()
  const { printDayView, isPrinting } = usePrintDayView()

  // Estado para el modal de creación de citas
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTime, setSelectedTime] = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")

  // Configuración de la cuadrícula
  const startHour = 8
  const endHour = 20
  const hourHeight = 60 // Altura en píxeles por hora
  const totalHeight = (endHour - startHour) * hourHeight

  // Función para calcular la posición vertical basada en la hora
  const calculateTopPosition = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number)
    return (hours - startHour) * hourHeight + (minutes / 60) * hourHeight
  }

  // Manejar el clic en una celda
  const handleCellClick = (time: string, roomId: string) => {
    console.log("Celda seleccionada:", time, roomId)
    setSelectedTime(time)
    setSelectedRoom(roomId)
    setIsModalOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <DayViewHeader
        selectedDate={selectedDate}
        onPreviousDay={goToPreviousDay}
        onNextDay={goToNextDay}
        onToday={goToToday}
        onPrint={printDayView}
      />

      <div className="flex-1 overflow-auto">
        <DayViewGrid
          timeSlots={timeSlots}
          appointments={appointments}
          cabins={cabins}
          onCellClick={handleCellClick}
          rowHeight={15}
          selectedDate={selectedDate}
          totalHeight={totalHeight}
          hourHeight={hourHeight}
          calculateTopPosition={calculateTopPosition}
        />
      </div>

      {/* Modal para crear cita */}
      {isModalOpen && (
        <CreateAppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialDate={selectedDate}
          initialTime={selectedTime}
          initialRoomId={selectedRoom}
          onSave={(appointmentData) => {
            console.log("Appointment created:", appointmentData)
            setIsModalOpen(false)
            // Aquí iría la lógica para guardar la cita
          }}
        />
      )}
    </div>
  )
}

