"use client"

import { useRouter } from "next/navigation"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { format, addDays, addMonths, isSameDay, subDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Check,
  Grid,
  Plus,
  Calendar,
  SkipForward,
  Home,
  Users,
  BarChart2,
  Menu,
  X,
  Flag,
  SkipBack,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// Actualizar importaciones
import { MobileBottomSheet } from "@/components/mobile/layout/bottom-sheet"
import { MobileClientSearch as MobileClientSearchComponent } from "@/components/mobile/client/client-search"
import { MobileAppointmentDialog } from "@/components/mobile/agenda/appointment-dialog"
import { MobileClientDetails } from "@/components/mobile/client/client-details"
import { MobileDatePickerSheet } from "@/components/mobile/common/date-picker-sheet"
import { MobileDrawerMenu } from "@/components/mobile/layout/drawer-menu"
import { useTheme } from "@/contexts/theme-context"
import { AGENDA_CONFIG, getTimeSlots, scrollToCurrentTime } from "@/config/agenda-config"
import { ClientCardWrapper } from "@/components/client-card-wrapper"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { useClinic } from "@/contexts/clinic-context"
import { getColorStyle } from "@/utils/color-utils"

interface Appointment {
  id: string
  clientName: string
  clientNumber: string
  time: string
  completed: boolean
  services: Array<{
    color: string
    name: string
  }>
}

interface ServiceRoom {
  id: string
  name: string
  color: string
  abbrev: string
}

interface Client {
  id: string
  name: string
  phone: string
  registrationDate?: string
}

export function MobileAgendaView() {
  const { activeClinic } = useClinic()
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [view, setView] = useState<"list" | "calendar">("calendar")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [bottomSheetContent, setBottomSheetContent] = useState<"search" | "clientDetails">("search")
  const [selectedSlot, setSelectedSlot] = useState<{ time: string } | null>(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen)

  // Función para detectar iOS
  const isIOS = () => {
    if (typeof window === "undefined") return false
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    )
  }

  const [isIOSDevice, setIsIOSDevice] = useState(isIOS())

  useEffect(() => {
    setIsIOSDevice(isIOS())
  }, [])

  // Sample appointments data
  const appointments: Appointment[] = [
    {
      id: "1",
      clientName: "Hasnaa Ghannour",
      clientNumber: "8692",
      time: "10:15",
      completed: false,
      services: [],
    },
    {
      id: "2",
      clientName: "rim bennani",
      clientNumber: "9562",
      time: "10:15",
      completed: true,
      services: [
        { color: "bg-green-500", name: "Service 1" },
        { color: "bg-purple-500", name: "Service 2" },
      ],
    },
  ]

  // Add console logging to debug cabin data
  useEffect(() => {
    console.log("Active Clinic Cabins:", activeClinic?.config?.cabins)
  }, [activeClinic])

  const serviceRooms: ServiceRoom[] =
    activeClinic?.config?.cabins
      ?.filter((cabin) => cabin.isActive)
      .sort((a, b) => a.order - b.order)
      .map((cabin) => ({
        id: cabin.id.toString(),
        name: cabin.name,
        // Usar el color tal cual, ya que ahora todos los colores están en formato hexadecimal completo
        color: cabin.color,
        abbrev: cabin.code || cabin.name.substring(0, 3),
      })) || []

  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Scroll to current time on mount
    scrollToCurrentTime(containerRef)
  }, [])

  const isDayAvailable = useCallback(
    (date: Date) => {
      if (!activeClinic || !activeClinic.config || !activeClinic.config.schedule) {
        return true
      }
      const dayOfWeek = date.getDay()
      const dayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek]
      const dayConfig = activeClinic.config.schedule[dayKey]
      return dayConfig && dayConfig.isOpen
    },
    [activeClinic],
  )

  const getNextAvailableDay = useCallback(
    (date: Date, direction: "forward" | "backward") => {
      let nextDate = direction === "forward" ? addDays(date, 1) : subDays(date, 1)
      while (!isDayAvailable(nextDate)) {
        nextDate = direction === "forward" ? addDays(nextDate, 1) : subDays(nextDate, 1)
      }
      return nextDate
    },
    [isDayAvailable],
  )

  useEffect(() => {
    if (currentDate === null && activeClinic) {
      const today = new Date()
      if (isDayAvailable(today)) {
        setCurrentDate(today)
      } else {
        setCurrentDate(getNextAvailableDay(today, "forward"))
      }
    }
  }, [activeClinic, isDayAvailable, getNextAvailableDay, currentDate])

  const handlePrevDay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentDate) {
      setCurrentDate(getNextAvailableDay(currentDate, "backward"))
    }
  }

  const handleNextDay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentDate) {
      setCurrentDate(getNextAvailableDay(currentDate, "forward"))
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsAppointmentDialogOpen(true)
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentDate) {
      setCurrentDate(addMonths(currentDate, -1))
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentDate) {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const handleClientSelect = (client: Client) => {
    router.push(`/clientes/${client.id}`)
    setIsSearchDialogOpen(false)
  }

  const handleCloseBottomSheet = () => {
    setIsSearchDialogOpen(false)
    setSelectedClient(null)
    setBottomSheetContent("search")
  }

  const renderListView = () => (
    <div className="flex-1 overflow-auto">
      <div className="space-y-4 p-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4"
            onClick={() => handleAppointmentClick(appointment)}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                appointment.completed ? "bg-green-100" : "border-2 border-gray-300",
              )}
            >
              {appointment.completed && <Check className="w-4 h-4 text-green-600" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{appointment.clientName}</span>
                <span className="text-sm text-gray-500">(nº {appointment.clientNumber})</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarIcon className="w-4 h-4" />
                <span>{appointment.time}h</span>
              </div>
            </div>

            {appointment.services.length > 0 && (
              <div className="flex gap-1">
                {appointment.services.map((service, index) => (
                  <div key={index} className={`w-4 h-4 rounded-sm ${service.color}`} title={service.name} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const handleCellClick = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedSlot({ time })
    setIsSearchDialogOpen(true)
  }

  const { colors } = useTheme()

  const timeSlots = getTimeSlots(activeClinic.config.openTime, activeClinic.config.closeTime)

  const timeSlotRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const setTimeSlotRef = useCallback((time: string, element: HTMLDivElement | null) => {
    timeSlotRefs.current[time] = element
  }, [])

  useEffect(() => {
    // Actualizar las posiciones de los time slots después del renderizado
    Object.entries(timeSlotRefs.current).forEach(([time, element]) => {
      if (element) {
        const topPosition = element.offsetTop
        element.setAttribute("data-position", topPosition.toString())
      }
    })
  }, [timeSlots]) // Dependencia de timeSlots para re-calcular si cambian los slots de tiempo

  // Update the header rendering to ensure colors are applied correctly
  const renderCalendarView = () => (
    <div className="flex-1 overflow-auto relative" style={{ paddingBottom: "60px" }}>
      <div className="min-w-fit">
        {/* Header row - fixed */}
        <div className="sticky top-0 z-20 bg-white">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `80px repeat(${serviceRooms.length}, 1fr)`,
              minWidth: "fit-content",
              height: "40px",
            }}
          >
            <div className="p-2 font-medium text-sm text-purple-600 border-r border-gray-200">Hora</div>
            {serviceRooms.map((room) => (
              <div
                key={room.id}
                className="text-white text-xs p-2 text-center font-medium border-r last:border-r-0"
                style={getColorStyle(room.color)}
              >
                {room.abbrev}
              </div>
            ))}
          </div>
        </div>

        {/* Grid Content */}
        <div className="relative">
          {timeSlots.map((time) => (
            <div
              key={time}
              className="grid border-b"
              style={{
                gridTemplateColumns: `80px repeat(${serviceRooms.length}, 1fr)`,
                minWidth: "fit-content",
                height: `${AGENDA_CONFIG.ROW_HEIGHT}px`,
              }}
            >
              <div
                ref={(el) => setTimeSlotRef(time, el)}
                className="p-2 text-sm text-purple-600 border-r bg-white flex items-center justify-between"
                style={{ position: "sticky", left: 0 }}
                data-time={time}
                // La posición se añadirá dinámicamente después del renderizado
              >
                {time}
                <Flag className="h-4 w-4 text-red-500" />
              </div>
              {serviceRooms.map((room) => (
                <div
                  key={`${time}-${room.id}`}
                  className="relative border-r last:border-r-0 hover:bg-gray-50"
                  onClick={() => currentDate && handleCellClick(currentDate, time)}
                >
                  {appointments
                    .filter((apt) => apt.time === time)
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="absolute inset-0 m-1 rounded bg-purple-600 text-white p-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAppointmentClick(apt)
                        }}
                      >
                        <div className="font-medium truncate">{apt.clientName}</div>
                        <div className="truncate">{apt.services.map((s) => s.name).join(", ")}</div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}

          <CurrentTimeIndicator
            timeSlots={timeSlots}
            rowHeight={AGENDA_CONFIG.ROW_HEIGHT}
            isMobile={true}
            className="z-50"
            agendaRef={containerRef}
          />
        </div>
      </div>
    </div>
  )

  // Update the table headers section
  const renderTableHeaders = () => (
    <div
      className="grid border-b sticky top-[112px] bg-white z-30"
      style={{
        gridTemplateColumns: `80px repeat(${serviceRooms.length}, 1fr)`,
        height: "40px",
        minWidth: "fit-content",
      }}
    >
      <div className="p-2 font-medium text-sm text-purple-600 border-r">Hora</div>
      {serviceRooms.map((room) => (
        <div
          key={room.id}
          className="text-white text-xs p-2 text-center font-medium border-r last:border-r-0"
          style={getColorStyle(room.color)}
        >
          {room.abbrev}
        </div>
      ))}
    </div>
  )

  if (currentDate === null) {
    return <div>Cargando...</div> // O cualquier otro indicador de carga
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header Principal */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleDrawer}>
            {isDrawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="flex flex-col">
            <div className="text-xl font-semibold">LOGO</div>
            <div className="text-xs text-purple-600">
              {format(new Date(), "EEEE, d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClientCardWrapper />
        </div>
      </header>

      {/* Subheader con fecha y controles */}
      <div className="fixed top-16 left-0 right-0 bg-white z-40">
        <div className="flex items-center justify-between px-3 py-1 border-b">
          <div className="flex-1 flex items-center gap-1">
            <div className="rounded-lg text-white bg-purple-600 flex items-center h-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:text-white"
                onClick={handlePrevMonth}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:text-white"
                onClick={handlePrevDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm" onClick={() => setIsDatePickerOpen(true)}>
                {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:text-white"
                onClick={handleNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:text-white"
                onClick={handleNextMonth}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 h-10 w-10 bg-purple-600 text-white hover:bg-purple-700"
            onClick={() => setIsDatePickerOpen(true)}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
        {/* Table Headers */}
        {renderTableHeaders()}
      </div>

      {/* Contenido principal */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto ios-scroll-container"
        style={{
          height: "calc(100vh - 112px - 64px - 48px - 40px)", // Subtract the header height
          paddingTop: "40px", // Add padding to account for the fixed header
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          position: "relative",
          background: "white",
        }}
      >
        {view === "list" ? renderListView() : renderCalendarView()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t grid grid-cols-4">
        <Button variant="ghost" className="flex flex-col items-center justify-center h-full">
          <Home className="h-5 w-5 text-purple-600" />
          <span className="text-xs mt-1">Inicio</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center justify-center h-full">
          <Calendar className="h-5 w-5 text-purple-600" />
          <span className="text-xs mt-1">Agenda</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center justify-center h-full">
          <Users className="h-5 w-5 text-purple-600" />
          <span className="text-xs mt-1">Clientes</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center justify-center h-full">
          <BarChart2 className="h-5 w-5 text-purple-600" />
          <span className="text-xs mt-1">Estadísticas</span>
        </Button>
      </div>

      {/* Action Buttons */}
      <div
        className="fixed bottom-16 left-0 right-0 grid grid-cols-3 gap-2 p-3 bg-white border-t"
        style={{ zIndex: 10 }}
      >
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 h-10"
          onClick={() => setView(view === "list" ? "calendar" : "list")}
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 h-10"
          onClick={() => setIsSearchDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 h-10"
          onClick={() => {
            const today = new Date()
            if (!isSameDay(currentDate, today)) {
              if (isDayAvailable(today)) {
                setCurrentDate(today)
              } else {
                setCurrentDate(getNextAvailableDay(today, "forward"))
              }
            }
          }}
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Modals and Sheets */}
      <MobileDatePickerSheet
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={currentDate}
        onDateSelect={(date) => {
          setCurrentDate(date)
          setIsDatePickerOpen(false)
        }}
      />

      <MobileBottomSheet
        isOpen={isSearchDialogOpen}
        onClose={() => setIsSearchDialogOpen(false)}
        title="Buscar cliente"
        height="full"
      >
        <MobileClientSearchComponent
          onClientSelect={(client) => {
            setSelectedClient(client)
            setIsSearchDialogOpen(false)
            setIsAppointmentDialogOpen(true)
          }}
          onClose={() => setIsSearchDialogOpen(false)}
        />
      </MobileBottomSheet>

      <MobileAppointmentDialog
        isOpen={isAppointmentDialogOpen}
        onClose={() => setIsAppointmentDialogOpen(false)}
        client={selectedClient}
        selectedDate={selectedDate}
        selectedTime={selectedSlot?.time}
        onSearchClick={() => {
          setIsAppointmentDialogOpen(false)
          setIsSearchDialogOpen(true)
        }}
        onNewClientClick={() => {
          setIsAppointmentDialogOpen(false)
        }}
        onSave={(appointmentData) => {
          setIsAppointmentDialogOpen(false)
        }}
      />

      <MobileBottomSheet
        isOpen={showClientDetails}
        onClose={() => setShowClientDetails(false)}
        title="Detalles del cliente"
        height="full"
      >
        {selectedClient && (
          <MobileClientDetails
            client={{
              ...selectedClient,
              registrationDate: "02/03/2021",
            }}
          />
        )}
      </MobileBottomSheet>
      <MobileDrawerMenu isOpen={isDrawerOpen} onClose={toggleDrawer} />
    </div>
  )
}

