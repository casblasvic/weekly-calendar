"use client"

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

interface DayViewAppointmentProps {
  appointment: Appointment
  rowHeight: number
}

export function DayViewAppointment({ appointment, rowHeight }: DayViewAppointmentProps) {
  const height = appointment.duration * rowHeight

  return (
    <div
      className={`absolute rounded-md p-1 overflow-hidden border border-purple-400 bg-purple-200 text-purple-900`}
      style={{
        top: 0,
        left: "0",
        width: "100%",
        height: `${height}px`,
      }}
    >
      <div className="font-medium">{appointment.name}</div>
      {appointment.phone && <div>{appointment.phone}</div>}
      <div className="text-white/90 mt-1 line-clamp-2">{appointment.service}</div>
    </div>
  )
}

