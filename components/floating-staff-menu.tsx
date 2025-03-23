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
import { StaffActionCardMobile } from "@/components/StaffActionCardMobile"

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
  const [isMobileView, setIsMobileView] = useState(false)
  const [showScrollUp, setShowScrollUp] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const staffMenuRef = useRef<HTMLDivElement>(null)
  
  // Detectar si es dispositivo móvil (táctil)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  // Detector de dispositivo móvil basado en tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768
      setIsMobileView(isMobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Comprobar si se necesitan los botones de scroll
  useEffect(() => {
    if (staffMenuRef.current && isMobileView) {
      const checkScrollButtons = () => {
        const container = staffMenuRef.current
        if (container) {
          setShowScrollUp(container.scrollTop > 20)
          setShowScrollDown(container.scrollTop < (container.scrollHeight - container.clientHeight - 20))
        }
      }
      
      const container = staffMenuRef.current
      container.addEventListener('scroll', checkScrollButtons)
      checkScrollButtons()
      
      return () => {
        container.removeEventListener('scroll', checkScrollButtons)
      }
    }
  }, [isMobileView])

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
    // Si estamos en móvil, la tarjeta se mostrará debajo del avatar en el menú desplegable
    if (isMobileView) {
      return { position: 'relative', top: 0, right: 0 }
    }
    
    // Encontrar el índice del empleado en la lista
    const staffIndex = mockStaff.findIndex(s => s.id === staffId)
    if (staffIndex === -1) return { position: 'fixed', top: 72, right: 87 }
    
    // Ajustar la posición vertical según el índice para alinear con el avatar correspondiente
    const baseOffset = offsetY ? offsetY + 50 : 62
    const itemHeight = 40 // Altura aproximada de un elemento de avatar con espacio
    const verticalPosition = baseOffset + (staffIndex * itemHeight)
    
    return { position: 'fixed', top: verticalPosition, right: 87 }
  }

  // Posición de la tarjeta activa
  const activeCardPosition = activeStaffId ? getCardPosition(activeStaffId) : { position: 'fixed', top: 72, right: 87 }

  // Funciones para manejar el scroll
  const handleScrollUp = () => {
    if (staffMenuRef.current) {
      staffMenuRef.current.scrollTop -= 100
    }
  }
  
  const handleScrollDown = () => {
    if (staffMenuRef.current) {
      staffMenuRef.current.scrollTop += 100
    }
  }

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
        isMobileView={isMobileView}
      >
        {isMobileView ? (
          // Versión móvil - despliegue vertical con scroll
          <div 
            ref={staffMenuRef}
            className="relative py-2 flex flex-col items-center space-y-4 mobile-staff-menu"
            style={{ 
              maxHeight: "60vh",
              overflowY: "auto",
              scrollBehavior: "smooth",
              width: "100%",
              background: "#fff",
              borderRadius: "0 0 8px 8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              paddingBottom: "16px"
            }}
          >
            {showScrollUp && (
              <button
                className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-10"
                onClick={handleScrollUp}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6"/>
                </svg>
              </button>
            )}
            
            {mockStaff.map((person, index) => (
              <div key={person.id} className="w-full px-4 py-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div 
                    className={cn(
                      "transition-all duration-200 ease-in-out flex items-center",
                      selectedStaffId === person.id ? "scale-105" : ""
                    )}
                    data-staff-id={person.id}
                    onClick={() => handleStaffSelect(person.id)}
                  >
                    <StaffAvatar 
                      person={person} 
                      onClick={() => handleStaffSelect(person.id)} 
                      index={index} 
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium">{person.name}</div>
                      <div className="text-xs text-gray-500">{person.role}</div>
                    </div>
                  </div>
                  
                  <button 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      selectedStaffId === person.id ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-blue-600"
                    )}
                    onClick={() => handleStaffSelect(person.id)}
                  >
                    {selectedStaffId === person.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Acciones desplegadas verticalmente bajo cada persona */}
                {selectedStaffId === person.id && (
                  <div className="mt-2 pl-12 pr-2 py-2 bg-gray-50 rounded-md">
                    <StaffActionCardMobile 
                      person={person} 
                      onClose={handleCloseActionCard} 
                    />
                  </div>
                )}
              </div>
            ))}
            
            {showScrollDown && (
              <button
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-10"
                onClick={handleScrollDown}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
            )}
          </div>
        ) : (
          // Versión desktop - avatares flotantes vertical
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
        )}
      </FloatingMenuBase>
      
      {/* Tarjeta de acciones - solo para desktop */}
      {!isMobileView && activeStaff && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[99999]"
            style={{ 
              right: "87px", // Acercada más a los avatares
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
        </AnimatePresence>
      )}
    </>
  )
} 