"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Users, MessageCircle, Phone, Calendar, AlertCircle, 
  Clock, Settings, CheckCircle, XCircle, Coffee,
  Sun, Plane, BedDouble, ChevronLeft
} from "lucide-react"
import { FloatingMenuBase } from "@/components/ui/floating-menu-base"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { motion, AnimatePresence } from "framer-motion"
import { StaffActionCard } from "@/components/StaffActionCard"

// Datos de ejemplo del personal
const mockStaff = [
  {
    id: 1,
    name: "Ana García",
    role: "Doctora",
    isOnline: true,
    avatar: null,
    status: "available",
    absenceReason: null
  },
  {
    id: 2,
    name: "Carlos Ruiz",
    role: "Enfermero",
    isOnline: true,
    avatar: null,
    status: "busy",
    absenceReason: null
  },
  {
    id: 3,
    name: "María López",
    role: "Recepcionista",
    isOnline: false,
    avatar: null,
    status: "away",
    absenceReason: "vacation"
  },
  {
    id: 4,
    name: "Juan Pérez",
    role: "Fisioterapeuta",
    isOnline: false,
    avatar: null,
    status: "offline",
    absenceReason: "sick"
  }
]

const staffActionItems = [
  {
    id: "message",
    label: "Chat interno",
    icon: MessageCircle,
    action: (staffId: number) => console.log("Chat interno con", staffId),
    showWhenOffline: false
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: Phone,
    action: (staffId: number) => console.log("WhatsApp a", staffId),
    showWhenOffline: true
  },
  {
    id: "checkIn",
    label: "Marcar entrada",
    icon: CheckCircle,
    action: (staffId: number) => console.log("Marcar entrada de", staffId),
    showWhenOffline: true
  },
  {
    id: "late",
    label: "Registrar retraso",
    icon: Clock,
    action: (staffId: number) => console.log("Registrar retraso de", staffId),
    showWhenOffline: true
  },
  {
    id: "absence",
    label: "Marcar ausencia",
    icon: XCircle,
    action: (staffId: number) => console.log("Marcar ausencia de", staffId),
    showWhenOffline: true
  },
  {
    id: "vacation",
    label: "Solicitar vacaciones",
    icon: Sun,
    action: (staffId: number) => console.log("Solicitar vacaciones para", staffId),
    showWhenOffline: true
  }
]

const getStatusInfo = (status: string, absenceReason: string | null) => {
  const baseColors = {
    available: "border-green-500",
    busy: "border-red-500",
    away: "border-yellow-500",
    offline: "border-gray-400"
  }

  const dotColors = {
    available: "bg-green-500",
    busy: "bg-red-500",
    away: "bg-yellow-500",
    offline: "bg-gray-400"
  }

  const statusIcons = {
    vacation: Plane,
    sick: BedDouble,
    default: null
  }

  return {
    borderColor: baseColors[status as keyof typeof baseColors] || baseColors.offline,
    dotColor: dotColors[status as keyof typeof dotColors] || dotColors.offline,
    StatusIcon: absenceReason ? statusIcons[absenceReason as keyof typeof statusIcons] : statusIcons.default
  }
}

const StaffAvatar = ({ person, onClick, index }: { 
  person: typeof mockStaff[0]
  onClick: () => void
  index: number
}) => {
  const { borderColor, dotColor, StatusIcon } = getStatusInfo(person.status, person.absenceReason)
  
  return (
    <button
      className="relative group"
      onClick={onClick}
      style={{
        filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
        transform: "translateZ(0)",
        willChange: "transform, filter"
      }}
    >
      {/* Borde de color para el estado */}
      <div className={cn(
        "absolute -inset-0.5 rounded-full",
        "border-2",
        borderColor,
        "transition-colors duration-300",
      )} />

      {/* Avatar con fondo */}
      <div className={cn(
        "relative w-11 h-11 rounded-full",
        "bg-blue-50",
        "flex items-center justify-center",
        "transition-all duration-300",
        "group-hover:scale-110 group-active:scale-95",
        "shadow-md"
      )}
      style={{
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
      }}
      >
        {person.avatar ? (
          <AvatarImage 
            src={person.avatar} 
            alt={person.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-base font-medium text-blue-600">
            {person.name.split(" ").map(n => n[0]).join("")}
          </span>
        )}
      </div>

      {/* Indicador de estado */}
      {(person.status !== "offline" || person.absenceReason) && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <div className={cn(
            "w-3.5 h-3.5 rounded-full",
            "border-2 border-white",
            "flex items-center justify-center",
            dotColor,
            "shadow-sm"
          )}
          style={{
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}
          >
            {StatusIcon && (
              <StatusIcon className="w-2 h-2 text-white" />
            )}
          </div>
        </div>
      )}
    </button>
  )
}

interface StaffTooltipProps {
  person: typeof mockStaff[0]
  onSelect: (id: number) => void
  index: number
}

const StaffTooltip = ({ person, onSelect, index }: StaffTooltipProps) => {
  const { dotColor } = getStatusInfo(person.status, person.absenceReason);
  
  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <StaffAvatar person={person} onClick={() => onSelect(person.id)} index={index} />
      </HoverCardTrigger>
      <HoverCardContent 
        side="left" 
        align="center" 
        className="p-0 bg-white rounded-lg shadow-lg border z-[999999] w-auto overflow-hidden"
        style={{
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
          minWidth: "150px",
          maxWidth: "200px",
          animation: "tooltipAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        <style jsx global>{`
          @keyframes tooltipAppear {
            0% { 
              opacity: 0; 
              transform: translateY(4px);
            }
            100% { 
              opacity: 1; 
              transform: translateY(0);
            }
          }
        `}</style>
        <div className="pt-3 pb-1 px-3 bg-gradient-to-r from-blue-50 to-white border-b">
          <div className="font-medium text-sm">{person.name}</div>
          <div className="text-xs text-gray-500 mb-1">{person.role}</div>
        </div>
        <div className="px-3 py-2 flex items-center">
          <div className={cn("h-2 w-2 rounded-full mr-2", dotColor)}></div>
          <span className="text-xs font-medium">
            {person.absenceReason === "vacation" && "De vacaciones"}
            {person.absenceReason === "sick" && "Baja por enfermedad"}
            {!person.absenceReason && person.status === "available" && "Disponible"}
            {!person.absenceReason && person.status === "busy" && "Ocupado"}
            {!person.absenceReason && person.status === "away" && "Ausente"}
            {!person.absenceReason && person.status === "offline" && "Desconectado"}
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

interface FloatingStaffMenuProps {
  className?: string
  onOutsideClick?: () => void
  offsetY?: number
  autoCollapseTimeout?: number
  onMenuToggle?: () => void
}

export function FloatingStaffMenu({ className, onOutsideClick, offsetY, autoCollapseTimeout, onMenuToggle }: FloatingStaffMenuProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)
  const [hoveredStaffId, setHoveredStaffId] = useState<number | null>(null)
  const staffContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  
  // Detectar si es dispositivo móvil (táctil)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleStaffSelect = (staffId: number) => {
    // Si ya está seleccionado, deseleccionar
    if (selectedStaffId === staffId) {
      setSelectedStaffId(null)
    } else {
      setSelectedStaffId(staffId)
    }
  }

  const handleStaffHover = (staffId: number | null) => {
    // Solo activar hover en dispositivos no táctiles
    if (!isTouchDevice) {
      setHoveredStaffId(staffId)
    }
  }

  const handleCloseActionCard = () => {
    setSelectedStaffId(null)
  }

  // Obtener el empleado seleccionado/hover (si existe)
  const activeStaffId = selectedStaffId || hoveredStaffId
  const activeStaff = activeStaffId !== null
    ? mockStaff.find(s => s.id === activeStaffId)
    : null

  // Función para manejar el toggle del menú principal
  const handleMenuToggle = useCallback((isOpen?: boolean) => {
    // Si el menú se cierra, cerrar también la tarjeta de acciones
    if (isOpen === false) {
      setSelectedStaffId(null)
      setHoveredStaffId(null)
    }
    
    // Propagar el evento al callback original
    if (onMenuToggle) {
      onMenuToggle()
    }
  }, [onMenuToggle])

  // Calcular la posición de la tarjeta basada en el empleado seleccionado
  const getCardPosition = (staffId: number) => {
    // Encontrar el índice del empleado en la lista
    const staffIndex = mockStaff.findIndex(s => s.id === staffId)
    if (staffIndex === -1) return { top: 72 }
    
    // Obtener el elemento DOM del avatar actual si es posible
    const avatarElement = document.querySelector(`[data-staff-id="${staffId}"]`)
    if (avatarElement) {
      const rect = avatarElement.getBoundingClientRect()
      // Alinear verticalmente con el centro del avatar
      return { top: rect.top + window.scrollY + (rect.height / 2) - 20 }
    }
    
    // Fallback si no podemos obtener la posición exacta del elemento
    const baseOffset = offsetY ? offsetY + 50 : 62
    const itemHeight = 46 // Altura aproximada de un elemento de avatar con espacio
    const verticalPosition = baseOffset + (staffIndex * itemHeight)
    
    return { top: verticalPosition }
  }

  // Posición de la tarjeta activa
  const activeCardPosition = activeStaffId ? getCardPosition(activeStaffId) : { top: 72 }

  return (
    <>
      <FloatingMenuBase
        className={className}
        onOutsideClick={() => {
          setSelectedStaffId(null)
          setHoveredStaffId(null)
          onOutsideClick?.()
        }}
        icon={<Users className="w-6 h-6" />}
        color="blue"
        isVisible={true}
        label="Personal"
        offsetY={offsetY}
        autoCollapseTimeout={autoCollapseTimeout}
        onMenuToggle={handleMenuToggle}
      >
        <div 
          ref={staffContainerRef}
          className="py-2 flex flex-col items-center space-y-4" 
          style={{ 
            paddingTop: "4px", 
            paddingBottom: "4px", 
            background: "transparent", 
            border: "none",
            maxHeight: "400px", // Altura máxima antes de mostrar scroll
            overflowY: "auto", // Añadir scroll cuando sea necesario
            scrollbarWidth: "thin", // Scroll más delgado en Firefox
            msOverflowStyle: "none" // Ocultar scrollbar en IE/Edge
          }}
        >
          <style jsx global>{`
            /* Estilo para scrollbar delgado en Chrome/Safari */
            div::-webkit-scrollbar {
              width: 4px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
            }
            div::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.2);
              border-radius: 10px;
            }
          `}</style>
          
          {mockStaff.map((person, index) => (
            <div 
              key={person.id}
              className={cn(
                "transition-all duration-200 ease-in-out",
                (selectedStaffId === person.id || hoveredStaffId === person.id) ? "scale-110" : ""
              )}
              style={{ 
                filter: (selectedStaffId === person.id || hoveredStaffId === person.id) ? 
                  "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))" : "",
                marginBottom: "4px"
              }}
              onMouseEnter={() => handleStaffHover(person.id)}
              onMouseLeave={() => handleStaffHover(null)}
              data-staff-id={person.id}
            >
              <StaffTooltip 
                person={person} 
                onSelect={handleStaffSelect}
                index={index}
              />
            </div>
          ))}
        </div>
      </FloatingMenuBase>
      
      {/* Tarjeta de acciones - aparece a la izquierda del avatar seleccionado con animación */}
      <AnimatePresence>
        {activeStaff && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[99999]"
            style={{ 
              right: "95px", // Más separado de los avatares para facilitar navegación
              top: `${activeCardPosition.top}px`,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)"
            }}
            onMouseEnter={() => handleStaffHover(activeStaff.id)}
            onMouseLeave={() => handleStaffHover(null)}
          >
            {/* Puente invisible para evitar que se cierre la tarjeta al mover el cursor */}
            <div 
              className="absolute"
              style={{
                right: "-25px",
                top: "-10px",
                width: "30px",
                height: "calc(100% + 20px)",
                background: "transparent",
                zIndex: 10
              }}
              onMouseEnter={() => handleStaffHover(activeStaff.id)}
            />
            
            {/* Indicador triangular que apunta hacia la derecha */}
            <div className="absolute top-6 -right-[6px] z-10">
              <div 
                className="w-3 h-3 rotate-45 bg-white border-r border-t"
                style={{
                  boxShadow: "2px -1px 2px rgba(0, 0, 0, 0.03)"
                }}
              ></div>
            </div>
            <StaffActionCard 
              person={activeStaff} 
              onClose={handleCloseActionCard} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
} 