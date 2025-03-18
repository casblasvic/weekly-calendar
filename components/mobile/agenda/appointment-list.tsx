"use client"

import { Check, Clock } from "lucide-react"

interface Appointment {
  id: string
  clientName: string
  clientNumber: string
  time: string
  status: "pending" | "completed" | "cancelled"
  services: Array<{
    name: string
    color: string
  }>
}

interface MobileAppointmentListProps {
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
}

export function MobileAppointmentList({ appointments, onAppointmentClick }: MobileAppointmentListProps) {
  return (
    <div className="space-y-2 px-4">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
          onClick={() => onAppointmentClick(appointment)}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center ${
              appointment.status === "completed" ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            {appointment.status === "completed" ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{appointment.clientName}</span>
              <span className="text-sm text-gray-500">#{appointment.clientNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{appointment.time}</span>
            </div>
          </div>

          <div className="flex gap-1">
            {appointment.services.map((service, index) => (
              <div key={index} className={`w-3 h-3 rounded-sm ${service.color}`} title={service.name} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

