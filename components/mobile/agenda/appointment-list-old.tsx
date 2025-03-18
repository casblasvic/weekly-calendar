"use client"

import { motion } from "framer-motion"

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

interface MobileAppointmentListProps {
  appointments: Appointment[]
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
}

export function MobileAppointmentList({ appointments, currentDate, onAppointmentClick }: MobileAppointmentListProps) {
  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - currentDate.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const filteredAppointments = appointments.filter((apt) => apt.date >= weekStart && apt.date <= weekEnd)

  return (
    <div className="space-y-2">
      {filteredAppointments.map((appointment) => (
        <motion.div
          key={appointment.id}
          className="bg-white p-3 rounded-lg shadow-md relative overflow-hidden"
          onClick={() => onAppointmentClick(appointment)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="text-sm font-medium text-purple-600">{appointment.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            {appointment.date.toLocaleDateString("es-ES", { weekday: "short" })} {appointment.startTime} -{" "}
            {appointment.service}
          </div>
          <div
            className={`absolute top-0 left-0 w-1 h-full ${appointment.color.replace("bg-", "bg-opacity-75 ")}`}
          ></div>
        </motion.div>
      ))}
    </div>
  )
}

