"use client"

import { useRouter } from "next/navigation"

import React, { useMemo, useRef, useCallback } from "react"

import { useState, useEffect, ErrorInfo } from "react"
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
  Clock,
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
import { MainSidebar } from "@/components/main-sidebar"
import { useTheme } from "@/contexts/theme"
import { AGENDA_CONFIG, getTimeSlots, scrollToCurrentTime } from "@/config/agenda-config"
import { ClientCardWrapper } from "@/components/client-card-wrapper"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { useClinic } from "@/contexts/clinic-context"
import type { WeekSchedule } from "@/types/schedule"
import { ScrollIndicator } from "@/components/ui/scroll-indicator"

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

// Agregar props al componente
interface MobileAgendaViewProps {
  showMainSidebar?: boolean
}

// Componente para manejar errores
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error en MobileAgendaView:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-red-800 bg-red-50">
          <h2 className="mb-2 text-xl font-bold">Ha ocurrido un error</h2>
          <p className="mb-4">{this.state.error?.message || "Error desconocido"}</p>
          <pre className="max-w-full p-2 overflow-auto text-xs bg-red-100 rounded">
            {this.state.error?.stack || "No hay stack trace disponible"}
          </pre>
          <button
            className="px-4 py-2 mt-4 text-white bg-red-600 rounded"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Intentar de nuevo
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function MobileAgendaView({ showMainSidebar = false }: MobileAgendaViewProps) {
  return (
    <ErrorBoundary fallback={<div>Error en la agenda móvil</div>}>
      <MobileAgendaViewContent showMainSidebar={showMainSidebar} />
    </ErrorBoundary>
  )
}

function MobileAgendaViewContent({ showMainSidebar = false }: MobileAgendaViewProps) {
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
  const [hasInternalError, setHasInternalError] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  // Verificar si tenemos datos de clínica válidos
  useEffect(() => {
    try {
      console.log("Verificando datos de clínica:", activeClinic)
      
      if (!activeClinic) {
        console.error("No hay clínica activa")
        setHasInternalError(true)
        setErrorDetails("No se han encontrado datos de la clínica activa.")
        return
      }
      
      if (!activeClinic.config) {
        console.error("La clínica activa no tiene configuración")
        setHasInternalError(true)
        setErrorDetails("La configuración de la clínica no está disponible.")
        return
      }

      if (!activeClinic.config.cabins || !Array.isArray(activeClinic.config.cabins)) {
        console.error("No hay cabinas configuradas o el formato es incorrecto")
        setHasInternalError(true)
        setErrorDetails("La configuración de cabinas no es válida.")
        return
      }

      // Si llegamos aquí, los datos son válidos
      setHasInternalError(false)
      setErrorDetails(null)
    } catch (error) {
      console.error("Error al verificar datos de clínica:", error)
      setHasInternalError(true)
      setErrorDetails("Error inesperado al cargar la configuración.")
    }
  }, [activeClinic])

  // Si hay un error interno, mostrar un mensaje amigable
  if (hasInternalError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-red-50">
        <h2 className="mb-3 text-xl font-bold text-red-800">Error en la configuración</h2>
        <p className="mb-4 text-center text-red-700">{errorDetails || "Ha ocurrido un error inesperado."}</p>
        <p className="mb-6 text-sm text-center text-red-600">Intenta recargar la página o contacta con soporte si el problema persiste.</p>
        <button
          className="px-4 py-2 text-white bg-red-600 rounded shadow hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Recargar la página
        </button>
      </div>
    )
  }

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
    try {
      console.log("Active Clinic Cabins:", activeClinic?.config?.cabins)
    } catch (error) {
      console.error("Error al acceder a los datos de cabinas:", error)
    }
  }, [activeClinic])

  // Wrap serviceRooms calculation in try-catch to prevent unhandled errors
  const serviceRooms: ServiceRoom[] = useMemo(() => {
    try {
      return activeClinic?.config?.cabins
        ?.filter((cabin) => cabin.isActive)
        .sort((a, b) => a.order - b.order)
        .map((cabin) => ({
          id: cabin.id.toString(),
          name: cabin.name,
          // Usar el color tal cual, ya que ahora todos los colores están en formato hexadecimal completo
          color: cabin.color,
          abbrev: cabin.code || cabin.name.substring(0, 3),
        })) || []
    } catch (error) {
      console.error("Error al procesar cabinas:", error)
      return []
    }
  }, [activeClinic])

  const router = useRouter()
  // Creamos la referencia al contenedor una sola vez
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Función que envuelve la referencia al contenedor para que sea compatible con CurrentTimeIndicator
  const getCompatibleAgendaRef = useCallback(() => {
    // Devuelve un objeto compatible con RefObject<HTMLDivElement>
    return containerRef as React.RefObject<HTMLDivElement>
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Scroll to current time on mount
    if (containerRef.current) {
      scrollToCurrentTime(containerRef)
    }
  }, [])

  const isDayAvailable = useCallback(
    (date: Date) => {
      if (!activeClinic || !activeClinic.config || !activeClinic.config.schedule) {
        return true
      }
      const dayOfWeek = date.getDay()
      // Usamos un switch statement para obtener la clave correcta basada en el día de la semana
      let dayKey: keyof WeekSchedule;
      switch (dayOfWeek) {
        case 0: dayKey = "sunday"; break;
        case 1: dayKey = "monday"; break;
        case 2: dayKey = "tuesday"; break;
        case 3: dayKey = "wednesday"; break;
        case 4: dayKey = "thursday"; break;
        case 5: dayKey = "friday"; break;
        case 6: dayKey = "saturday"; break;
        default: dayKey = "monday"; // Por defecto, usar lunes
      }
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
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al día anterior:", currentDate)
        const newDate = getNextAvailableDay(currentDate, "backward")
        console.log("Nueva fecha calculada:", newDate)
        setCurrentDate(newDate)
      } catch (error) {
        console.error("Error en handlePrevDay:", error)
      }
    }
  }

  const handleNextDay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al día siguiente:", currentDate)
        const newDate = getNextAvailableDay(currentDate, "forward")
        console.log("Nueva fecha calculada:", newDate)
        setCurrentDate(newDate)
      } catch (error) {
        console.error("Error en handleNextDay:", error)
      }
    }
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al mes anterior:", currentDate)
        setCurrentDate(addMonths(currentDate, -1))
      } catch (error) {
        console.error("Error en handlePrevMonth:", error)
      }
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentDate) {
      try {
        console.log("Navegando al mes siguiente:", currentDate)
        setCurrentDate(addMonths(currentDate, 1))
      } catch (error) {
        console.error("Error en handleNextMonth:", error)
      }
    }
  }

  const handleAppointmentClick = (appointment: Appointment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log("Cita seleccionada:", appointment);
      setSelectedAppointment(appointment);
      
      // Usar setTimeout para evitar problemas de renderizado
      setTimeout(() => {
        setIsAppointmentDialogOpen(true);
      }, 10);
    } catch (error) {
      console.error("Error al hacer clic en cita:", error);
    }
  }

  const handleClientSelect = (client: Client) => {
    try {
      console.log("Cliente seleccionado:", client)
      // Almacenar el cliente seleccionado
      setSelectedClient(client)
      
      // Cerrar el diálogo de búsqueda primero
      setIsSearchDialogOpen(false)
      
      // Esperar un pequeño retraso antes de abrir el diálogo de cita
      // para asegurar que el primero se ha cerrado completamente
      console.log("Preparando para mostrar diálogo de cita")
      
      // Usar requestAnimationFrame en lugar de setTimeout para mejor rendimiento
      requestAnimationFrame(() => {
        console.log("Abriendo diálogo de cita después de seleccionar cliente")
        setIsAppointmentDialogOpen(true)
      })
    } catch (error) {
      console.error("Error al seleccionar cliente:", error)
      // En caso de error, mantener la interfaz en un estado consistente
      setIsSearchDialogOpen(false)
      setSelectedClient(null)
      // Informar al usuario
      alert("Ha ocurrido un error al seleccionar el cliente. Por favor, inténtalo de nuevo.")
    }
  }

  const handleCloseBottomSheet = () => {
    try {
      console.log("Cerrando bottom sheet de búsqueda");
      
      // Primero cerrar el diálogo
      setIsSearchDialogOpen(false);
      
      // Luego reiniciar el estado con un pequeño retraso
      requestAnimationFrame(() => {
        // Solo limpiar el cliente si no estamos en proceso de crear una cita
        if (!isAppointmentDialogOpen) {
          setSelectedClient(null);
        }
        setBottomSheetContent("search");
      });
    } catch (error) {
      console.error("Error al cerrar bottom sheet:", error);
      // Forzar un estado consistente
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      setShowClientDetails(false);
    }
  }

  const handleAppointmentSave = (appointmentData: any) => {
    console.log("Guardando cita:", appointmentData)
    // Aquí iría la lógica para guardar la cita
    
    // Cerrar el modal
    setIsAppointmentDialogOpen(false)
    
    // Opcional: Mostrar un toast o notificación
    alert("Cita guardada correctamente")
  }

  const renderListView = () => (
    <div className="flex-1 overflow-auto">
      <div className="p-4 space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm"
            onClick={(e) => handleAppointmentClick(appointment, e)}
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
                  <div 
                    key={index} 
                    className="w-4 h-4 rounded-sm" 
                    style={{ backgroundColor: appColors.primary }}
                    title={service.name} 
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const handleCellClick = (date: Date, time: string) => {
    try {
      console.log("Celda seleccionada:", { date, time });
      
      // Almacenar los datos en estado de forma segura
      setSelectedDate(date);
      setSelectedSlot({ time });
      
      // Limpiar cliente seleccionado si hubiera uno anterior
      if (selectedClient) {
        setSelectedClient(null);
      }
      
      // Mostrar bottom sheet para búsqueda de cliente con un pequeño retraso
      // para asegurar que los estados se hayan actualizado
      console.log("Preparando para mostrar diálogo de búsqueda");
      requestAnimationFrame(() => {
        openSearchDialog();
      });
    } catch (error) {
      console.error("Error en handleCellClick:", error);
      alert("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    }
  }

  // Manejador mejorado para el botón de añadir cita
  const handleAddAppointment = () => {
    try {
      if (!currentDate) {
        console.error("No hay fecha seleccionada para añadir cita");
        alert("Por favor, selecciona una fecha primero.");
        return;
      }
      
      console.log("Añadiendo nueva cita en:", currentDate);
      
      // Usar hora actual formateada
      const currentTimeStr = format(new Date(), "HH:mm");
      
      // Almacenar datos en estado
      setSelectedDate(currentDate);
      setSelectedSlot({ time: currentTimeStr });
      
      // Limpiar cliente seleccionado si hubiera uno anterior
      if (selectedClient) {
        setSelectedClient(null);
      }
      
      // Abrir diálogo de búsqueda con pequeño retraso
      console.log("Preparando para mostrar diálogo de búsqueda desde botón");
      requestAnimationFrame(() => {
        openSearchDialog();
      });
    } catch (error) {
      console.error("Error en handleAddAppointment:", error);
      alert("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    }
  }

  // Actualizado para manejar mejor los clicks en celdas
  const handleCellClickEvent = (e: React.MouseEvent, date: Date | null, time: string, room: ServiceRoom) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!date) {
      console.error("Error: Se intentó hacer clic en una celda sin fecha válida");
      return;
    }
    
    try {
      console.log("Celda clickeada:", { date, time, room: room.name });
      
      // Almacenar los datos en estado de forma segura
      setSelectedDate(date);
      setSelectedSlot({ time });
      
      // Verificar si el cliente ya está seleccionado para evitar problemas
      if (!selectedClient) {
        // No usar setTimeout para evitar problemas de sincronización
        console.log("Abriendo diálogo de búsqueda de cliente");
        setIsSearchDialogOpen(true);
      } else {
        // Si ya hay un cliente seleccionado, abrir directamente el diálogo de cita
        console.log("Cliente ya seleccionado, abriendo diálogo de cita");
        setIsAppointmentDialogOpen(true);
      }
    } catch (error) {
      console.error("Error al hacer clic en celda:", error);
      // En caso de error, mostrar un mensaje al usuario
      alert("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    }
  }

  // Cargar colores del tema
  const { theme } = useTheme()

  // Asegurar que los colores se actualicen cuando cambie el tema
  const appColors = useMemo(() => {
    console.log("Actualizando colores con el tema:", theme);
    return {
      primary: theme?.primaryColor || '#7c3aed',
      secondary: theme?.secondaryColor || '#8b5cf6',
      accent: theme?.accentColor || '#a78bfa',
      text: theme?.textColor || '#111827',
      background: theme?.backgroundColor || '#ffffff',
      headerBg: theme?.headerBackgroundColor || '#7c3aed',
      sidebarBg: theme?.sidebarBackgroundColor || '#f9fafb',
    }
  }, [theme])

  // Manejo seguro de los slots de tiempo
  const timeSlots = useMemo(() => {
    if (!activeClinic?.config?.openTime || !activeClinic?.config?.closeTime) {
      console.error("Horarios de apertura/cierre no disponibles:", {
        openTime: activeClinic?.config?.openTime,
        closeTime: activeClinic?.config?.closeTime,
      });
      // Valores predeterminados en caso de error
      return getTimeSlots("09:00", "18:00");
    }
    
    try {
      console.log("Generando slots de tiempo:", {
        openTime: activeClinic.config.openTime,
        closeTime: activeClinic.config.closeTime,
      });
      return getTimeSlots(activeClinic.config.openTime, activeClinic.config.closeTime);
    } catch (error) {
      console.error("Error al generar slots de tiempo:", error);
      // Fallback en caso de error
      return getTimeSlots("09:00", "18:00");
    }
  }, [activeClinic?.config?.openTime, activeClinic?.config?.closeTime]);

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

  // Modificar renderTableHeaders para agregar indicador de scroll horizontal
  const tableHeadersRef = useRef<HTMLDivElement>(null);
  
  // Función para manejar scroll horizontal de las cabinas
  const handleScrollCabins = useCallback((direction: 'left' | 'right') => {
    if (!tableHeadersRef.current) return;
    
    const scrollAmount = direction === 'left' ? -100 : 100;
    tableHeadersRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);
  
  // Componente para indicadores de scroll horizontal
  const HorizontalScrollIndicator = ({ direction }: { direction: 'left' | 'right' }) => {
    return (
      <div 
        className={`absolute top-1/2 -translate-y-1/2 z-50 bg-purple-600 bg-opacity-70 rounded-full w-8 h-8 
                   flex items-center justify-center cursor-pointer shadow-md ${direction === 'left' ? 'left-0' : 'right-0'}`}
        style={{ opacity: 0.8 }}
        onClick={() => handleScrollCabins(direction)}
      >
        {direction === 'left' ? (
          <ChevronLeft className="w-5 h-5 text-white" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white" />
        )}
      </div>
    );
  };

  const renderTableHeaders = () => (
    <div className="relative">
      {/* Indicadores de scroll horizontal */}
      <HorizontalScrollIndicator direction="left" />
      <HorizontalScrollIndicator direction="right" />
      
      <div
        ref={tableHeadersRef}
        className="grid border-b sticky top-[112px] bg-white z-30 overflow-x-auto"
        style={{
          gridTemplateColumns: `80px repeat(${serviceRooms.length}, 1fr)`,
          height: "40px",
          minWidth: "fit-content",
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
      >
        <div className="p-2 text-sm font-medium border-r" style={{ color: appColors.primary }}>Hora</div>
        {serviceRooms.map((room) => (
          <div
            key={room.id}
            className="p-2 text-xs font-medium text-center text-white border-r last:border-r-0"
            style={{ backgroundColor: room.color }}
          >
            {room.abbrev}
          </div>
        ))}
      </div>
    </div>
  )

  // Contenedor de la vista de calendario con mejor manejo de errores
  const renderCalendarView = () => (
    <div className="relative flex-1 overflow-auto" style={{ paddingBottom: "60px" }}>
      <div className="min-w-fit">
        {/* Mantener el contenido de la cuadrícula */}
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
                className="flex items-center justify-between p-2 text-sm bg-white border-r"
                style={{ position: "sticky", left: 0, color: appColors.primary }}
                data-time={time}
              >
                {time}
                <Flag className="w-4 h-4 text-red-500" />
              </div>
              {serviceRooms.map((room) => (
                <div
                  key={`${time}-${room.id}`}
                  className="relative border-r last:border-r-0 hover:bg-gray-50"
                  onClick={(e) => {
                    handleCellClickEvent(e, currentDate, time, room)
                  }}
                >
                  {/* Mantener el contenido de las celdas */}
                  {appointments
                    .filter((apt) => apt.time === time)
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="absolute inset-0 p-2 m-1 text-xs text-white rounded"
                        style={{ backgroundColor: appColors.primary }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAppointmentClick(apt);
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

          {/* Indicador de hora actual */}
          {containerRef.current && (
            <CurrentTimeIndicator
              timeSlots={timeSlots}
              rowHeight={AGENDA_CONFIG.ROW_HEIGHT}
              isMobile={true}
              className="z-50"
              agendaRef={getCompatibleAgendaRef()}
            />
          )}
        </div>
      </div>
    </div>
  )

  // Manejo de los bottom sheets de forma más segura
  const openSearchDialog = () => {
    try {
      console.log("Abriendo diálogo de búsqueda de cliente");
      
      // Cerrar otros diálogos primero para evitar conflictos
      setIsAppointmentDialogOpen(false);
      setShowClientDetails(false);
      
      // Esperar un frame para asegurar que los otros diálogos se han cerrado
      requestAnimationFrame(() => {
        // Abrir el bottom sheet de búsqueda
        setIsSearchDialogOpen(true);
      });
    } catch (error) {
      console.error("Error al abrir diálogo de búsqueda:", error);
    }
  }
  
  const openAppointmentDialog = () => {
    try {
      console.log("Abriendo diálogo de cita");
      
      // Cerrar otros diálogos primero para evitar conflictos
      setIsSearchDialogOpen(false);
      setShowClientDetails(false);
      
      // Esperar un frame para asegurar que los otros diálogos se han cerrado
      requestAnimationFrame(() => {
        // Abrir el bottom sheet de cita
        setIsAppointmentDialogOpen(true);
      });
    } catch (error) {
      console.error("Error al abrir diálogo de cita:", error);
    }
  }
  
  const openClientDetailsDialog = () => {
    try {
      console.log("Abriendo diálogo de detalles del cliente");
      
      // Cerrar otros diálogos primero para evitar conflictos
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      
      // Esperar un frame para asegurar que los otros diálogos se han cerrado
      requestAnimationFrame(() => {
        // Abrir el bottom sheet de detalles del cliente
        setShowClientDetails(true);
      });
    } catch (error) {
      console.error("Error al abrir diálogo de detalles del cliente:", error);
    }
  }

  if (currentDate === null) {
    return <div>Cargando...</div> // O cualquier otro indicador de carga
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Eliminar el header hardcodeado que está causando problemas */}
      {/* <header className="flex items-center justify-between px-4 py-2 text-white bg-purple-600">
        <button 
          className="p-2 text-white" 
          onClick={toggleDrawer}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-2">
          // Botones de notificaciones, etc.
        </div>
      </header> */}
      
      {/* Contenido principal sin el header adicional */}
      <main className="flex-1 overflow-auto">
        {/* Contenido de la agenda móvil */}
        <div className="flex w-full h-screen overflow-hidden">
          {/* IMPORTANTE: Eliminar el margen izquierdo que estaba desplazando el contenido */}
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* Cabecera con fecha */}
            <div className="sticky top-0 z-40 bg-white border-b">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center flex-1 gap-1">
                  {/* Eliminar el botón de hamburguesa que está causando problemas */}
                  
                  <div className="flex items-center h-10 rounded-lg">
                    {/* Añadir botón para mes anterior */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handlePrevMonth}
                      style={{ color: appColors.primary }}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handlePrevDay}
                      style={{ color: appColors.primary }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span 
                      className="px-2 text-sm cursor-pointer" 
                      onClick={() => setIsDatePickerOpen(true)}
                      style={{ color: appColors.primary, fontWeight: 500 }}
                    >
                      {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handleNextDay}
                      style={{ color: appColors.primary }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    
                    {/* Añadir botón para mes siguiente */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={handleNextMonth}
                      style={{ color: appColors.primary }}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 ml-1"
                  onClick={() => setIsDatePickerOpen(true)}
                  style={{ 
                    borderColor: appColors.primary,
                    color: appColors.primary
                  }}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Mantener las cabeceras de tabla (fijas) aquí */}
              {renderTableHeaders()}
            </div>

            {/* Contenido principal */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto ios-scroll-container"
              style={{
                height: "calc(100vh - 120px)", // Solo considerar altura del header
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                position: "relative",
                background: "white",
                paddingBottom: "0" // Eliminar padding inferior
              }}
            >
              {view === "list" ? renderListView() : renderCalendarView()}
              
              {/* Agregar indicador de scroll para el contenedor principal */}
              <ScrollIndicator 
                containerRef={containerRef} 
                position="right"
                offset={{ right: 15, bottom: 80, top: 15 }}
                scrollAmount={300}
              />
            </div>

            {/* Floating action button para añadir cita */}
            <div className="fixed z-50 right-4 bottom-4 md:hidden">
              <Button
                size="icon"
                className="rounded-full shadow-lg h-14 w-14"
                style={{ backgroundColor: appColors.primary }}
                onClick={handleAddAppointment}
              >
                <Plus className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>

          {/* Mantener modales necesarios */}
          <MobileDatePickerSheet
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            selectedDate={currentDate || new Date()}
            onDateSelect={(date) => {
              setCurrentDate(date)
              setIsDatePickerOpen(false)
            }}
          />

          {/* Añadir diálogos para búsqueda y detalles de cliente */}
          <MobileBottomSheet
            isOpen={isSearchDialogOpen}
            onClose={handleCloseBottomSheet}
            title="Buscar cliente"
          >
            <div className="py-2">
              <MobileClientSearchComponent 
                onClientSelect={handleClientSelect} 
                onClose={handleCloseBottomSheet}
              />
            </div>
          </MobileBottomSheet>

          {showClientDetails && selectedClient && (
            <MobileClientDetails
              client={{
                id: selectedClient.id,
                name: selectedClient.name,
                email: "",
                phone: selectedClient.phone,
                clientNumber: "",
                clinic: "",
                registrationDate: selectedClient.registrationDate || ""
              }}
            />
          )}

          {selectedClient && (
            <MobileAppointmentDialog
              client={selectedClient}
              selectedDate={selectedDate || new Date()}
              selectedTime={selectedSlot?.time || format(new Date(), 'HH:mm')}
              onClose={() => setIsAppointmentDialogOpen(false)}
              onSearchClick={() => {
                setIsAppointmentDialogOpen(false);
                setTimeout(() => setIsSearchDialogOpen(true), 100);
              }}
              onNewClientClick={() => {
                // Implementación de creación de nuevo cliente
                console.log("Crear nuevo cliente");
              }}
              onSave={handleAppointmentSave}
            />
          )}
        </div>
      </main>
      
      {/* Drawer menu que se abre desde el lateral */}
      <MobileDrawerMenu isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  )
}

