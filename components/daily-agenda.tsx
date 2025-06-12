"use client"

import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Lock, Printer, Settings, SkipBack, SkipForward } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import React, { useCallback } from "react"
import { PersonSearchDialog } from "./client-search-dialog"
import { AppointmentDialog } from "./appointment-dialog"
import { NewClientDialog } from "./new-client-dialog"
import { DragDropContext, Droppable } from "react-beautiful-dnd"
import { AppointmentItem } from "./appointment-item"
import { Appointment } from "@/types/appointments"

interface ServiceRoom {
  id: string
  name: string
  color: string
  abbrev: string
}

interface DailyAgendaProps {
  date: Date
  onViewChange?: (view: "week" | "day", date: Date) => void
  onDateChange?: (newDate: Date) => void
  isToday?: boolean
  appointments: Appointment[]
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>
}

export default function DailyAgenda({
  date,
  onViewChange,
  onDateChange,
  isToday = false,
  appointments,
  setAppointments,
}: DailyAgendaProps) {
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = React.useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = React.useState(false)
  const [selectedSlot, setSelectedSlot] = React.useState<{
    date: Date
    time: string
    roomId: string
  } | null>(null)
  const [selectedClient, setSelectedClient] = React.useState<{
    id: string
    name: string
    phone: string
  } | null>(null)

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 4) + 10
    const minutes = (i % 4) * 15
    return `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  })

  const serviceRooms: ServiceRoom[] = [
    { id: "lun", name: "Lundis", color: "bg-green-600", abbrev: "Lun" },
    { id: "for", name: "Forte/Bal", color: "bg-blue-200", abbrev: "For" },
    { id: "sp", name: "Sp", color: "bg-purple-600", abbrev: "Sp" },
    { id: "we", name: "WE", color: "bg-orange-500", abbrev: "WE" },
    { id: "ws", name: "WS", color: "bg-emerald-500", abbrev: "WS" },
    { id: "eme", name: "Emerald", color: "bg-teal-700", abbrev: "Eme" },
  ]

  const handleDeleteAppointment = useCallback(() => {
    if (selectedSlot) {
      setAppointments((prev) =>
        prev.filter((apt) => !(apt.startTime === selectedSlot.time && apt.roomId === selectedSlot.roomId)),
      )
    }
  }, [selectedSlot, setAppointments])

  const handleSaveAppointment = useCallback(
    (appointmentData: {
      client: { name: string; phone: string }
      services: { id: string; name: string; category: string }[]
      time: string
      comment?: string
    }) => {
      if (selectedSlot) {
        const newAppointment: Appointment = {
          id: Math.random().toString(36).substr(2, 9),
          name: appointmentData.client.name,
          phone: appointmentData.client.phone,
          service: appointmentData.services.map((s) => s.name).join(", "),
          color: "bg-purple-600",
          roomId: selectedSlot.roomId,
          startTime: appointmentData.time,
          duration: 2,
          date: new Date(selectedSlot.date),
          completed: false,
        }

        setAppointments((prev) => [...prev, newAppointment])
      }
    },
    [selectedSlot, setAppointments],
  )

  const handleViewChange = () => {
    if (onViewChange) {
      onViewChange("week", date)
    }
  }

  const changeDay = useCallback(
    (direction: "next" | "prev") => {
      const newDate = new Date(date)
      newDate.setDate(date.getDate() + (direction === "next" ? 1 : -1))
      if (onDateChange) {
        onDateChange(newDate)
      }
    },
    [date, onDateChange],
  )

  const changeMonth = useCallback(
    (direction: "next" | "prev") => {
      const newDate = new Date(date)
      newDate.setMonth(date.getMonth() + (direction === "next" ? 1 : -1))
      if (onDateChange) {
        onDateChange(newDate)
      }
    },
    [date, onDateChange],
  )

  // Modificar la función handleCellClick para añadir logs de consola
  const handleCellClick = (time: string, roomId: string) => {
    console.log("📆 DailyAgenda - handleCellClick:", { date, time, roomId })
    setSelectedSlot({ date, time, roomId })
    setIsSearchDialogOpen(true)
    console.log("📆 DailyAgenda - Abriendo diálogo de búsqueda")
  }

  // Modificar la función handleClientSelect para añadir logs
  const handleClientSelect = (client: { name: string; phone: string }) => {
    console.log("📆 DailyAgenda - Cliente seleccionado:", client)
    setSelectedClient(client)
    setIsSearchDialogOpen(false)
    setIsAppointmentDialogOpen(true)
    console.log("📆 DailyAgenda - Abriendo diálogo de cita")
  }

  const dayName = date.toLocaleDateString("es-ES", { weekday: "long" })
  const formattedDate = date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })

  const handleAppointmentResize = (id: string, newDuration: number) => {
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return
    }

    const { source, destination } = result
    const updatedAppointments = Array.from(appointments)
    const [movedAppointment] = updatedAppointments.splice(source.index, 1)

    // Calculate new time and room based on destination
    const [newRoom, newTime] = destination.droppableId.split("-")

    const updatedAppointment = {
      ...movedAppointment,
      roomId: newRoom,
      startTime: newTime,
    }

    // Ensure the appointment stays within the bounds of the day
    const endTime = new Date(date)
    endTime.setHours(23, 59, 59)
    const appointmentEndTime = new Date(date)
    appointmentEndTime.setHours(
      Number.parseInt(newTime.split(":")[0]),
      Number.parseInt(newTime.split(":")[1]) + updatedAppointment.duration * 15,
    )

    if (appointmentEndTime > endTime) {
      const availableMinutes = (endTime.getTime() - appointmentEndTime.getTime()) / (1000 * 60)
      updatedAppointment.duration = Math.floor(availableMinutes / 15)
    }

    // Check for conflicts with existing appointments
    const conflictingAppointments = updatedAppointments.filter(
      (apt) => apt.roomId === updatedAppointment.roomId && apt.startTime === updatedAppointment.startTime,
    )

    if (conflictingAppointments.length > 0) {
      // If there's a conflict, find the next available time slot
      const nextAvailableTime = new Date(date)
      nextAvailableTime.setHours(Number.parseInt(newTime.split(":")[0]), Number.parseInt(newTime.split(":")[1]))

      while (
        conflictingAppointments.some(
          (apt) =>
            apt.startTime ===
            nextAvailableTime.getHours().toString().padStart(2, "0") +
              ":" +
              nextAvailableTime.getMinutes().toString().padStart(2, "0"),
        )
      ) {
        nextAvailableTime.setMinutes(nextAvailableTime.getMinutes() + 15)
      }

      updatedAppointment.startTime =
        nextAvailableTime.getHours().toString().padStart(2, "0") +
        ":" +
        nextAvailableTime.getMinutes().toString().padStart(2, "0")
    }

    // Insert the moved appointment
    updatedAppointments.push(updatedAppointment)

    // Sort appointments by time
    updatedAppointments.sort((a, b) => a.startTime.localeCompare(b.startTime))

    setAppointments(updatedAppointments)

    // Evitar que se abra el diálogo de edición
    setIsAppointmentDialogOpen(false)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-screen bg-white">
        <header className="px-4 py-3">
          <h1 className="mb-4 text-2xl font-medium">Agenda diaria</h1>
          <div className="flex items-center gap-3 pb-3 border-b">
            <Button variant="ghost" size="icon" onClick={() => changeMonth("prev")}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => changeDay("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500">Anterior</span>
            <Button variant="ghost" size="icon" onClick={handleViewChange} className="text-purple-600">
              <Calendar className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500">Siguiente</span>
            <Button variant="ghost" size="icon" onClick={() => changeDay("next")}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => changeMonth("next")}>
              <SkipForward className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-purple-600">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Lock className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Printer className="w-4 h-4" />
            </Button>
            <Select defaultValue="todos">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="(Todos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">(Todos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[auto_1fr]">
              {/* Header */}
              <div className="sticky top-0 z-20 p-4 bg-white border-b">
                <div className="text-sm text-purple-600">Hora</div>
              </div>
              <div className="sticky top-0 z-20 p-4 bg-white border-b">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl capitalize">{dayName}</h2>
                  <button onClick={handleViewChange} className="text-sm text-purple-600 hover:underline">
                    (Ver semana completa)
                  </button>
                </div>
                <div className="text-gray-500">{formattedDate}</div>
                <div className="grid grid-cols-6 mt-2">
                  {serviceRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`h-6 ${room.color} text-white text-xs flex items-center justify-center`}
                    >
                      {room.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  <div className="p-2 text-sm text-purple-600 border-b border-r">{time}</div>
                  <div className="border-b">
                    <div className="grid h-16 grid-cols-6">
                      {serviceRooms.map((room) => (
                        <Droppable droppableId={`${room.id}-${time}`} key={`${room.id}-${time}`} type="appointment">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="relative border-r cursor-pointer bg-gray-50/50 hover:bg-purple-50"
                              style={{
                                minHeight: "4rem",
                                height: "100%",
                                position: "relative",
                                backgroundColor: snapshot.isDraggingOver ? "rgba(167, 139, 250, 0.1)" : undefined,
                              }}
                              onClick={() => handleCellClick(time, room.id)}
                            >
                              {appointments
                                .filter((apt) => apt.startTime === time && apt.roomId === room.id)
                                .map((apt, index) => (
                                  <AppointmentItem
                                    key={apt.id}
                                    appointment={apt}
                                    index={index}
                                    onClick={(appointment) => {
                                      setSelectedClient({ name: appointment.name, phone: appointment.phone || "" })
                                      setSelectedSlot({ date, time: appointment.startTime, roomId: appointment.roomId })
                                      setIsAppointmentDialogOpen(true)
                                    }}
                                  />
                                ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 right-4">
          <Button className="text-white bg-black rounded-full hover:bg-gray-800">Ayuda</Button>
        </div>

        {/* Diálogos - Asegurarnos de que estén correctamente renderizados */}
        <PersonSearchDialog
          isOpen={isSearchDialogOpen}
          onClose={() => {
            console.log("📆 DailyAgenda - Cerrando diálogo de búsqueda")
            setIsSearchDialogOpen(false)
          }}
          onPersonSelect={handleClientSelect}
          selectedTime={selectedSlot?.time}
        />

        {selectedClient && selectedSlot && (
          <AppointmentDialog
            isOpen={isAppointmentDialogOpen}
            onClose={() => {
              console.log("📆 DailyAgenda - Cerrando diálogo de cita")
              setIsAppointmentDialogOpen(false)
            }}
            client={selectedClient}
            selectedTime={selectedSlot?.time}
            onSearchClick={() => {
              console.log("📆 DailyAgenda - Volviendo a búsqueda")
              setIsAppointmentDialogOpen(false)
              setIsSearchDialogOpen(true)
            }}
            onNewClientClick={() => {
              console.log("📆 DailyAgenda - Abriendo diálogo de nuevo cliente")
              setIsAppointmentDialogOpen(false)
              setIsNewClientDialogOpen(true)
            }}
            onDelete={handleDeleteAppointment}
            onSave={handleSaveAppointment}
          />
        )}

        <NewClientDialog
          isOpen={isNewClientDialogOpen}
          onClose={() => {
            console.log("📆 DailyAgenda - Cerrando diálogo de nuevo cliente")
            setIsNewClientDialogOpen(false)
          }}
        />
      </div>
    </DragDropContext>
  )
}

