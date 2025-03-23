"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Users, MessageCircle, Phone, Calendar, AlertCircle, 
  Clock, Settings, CheckCircle, XCircle, Coffee,
  Sun, Plane, BedDouble
} from "lucide-react"
import { FloatingMenuBase } from "@/components/ui/floating-menu-base"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { motion, AnimatePresence } from "framer-motion"

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
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.1 
      }}
    >
      <button
        className="relative group"
        onClick={onClick}
      >
        {/* Borde de color para el estado */}
        <div className={cn(
          "absolute -inset-0.5 rounded-full",
          "border-2",
          borderColor,
          "transition-colors duration-300"
        )} />

        {/* Avatar con fondo */}
        <div className={cn(
          "relative w-12 h-12 rounded-full",
          "bg-blue-50",
          "flex items-center justify-center",
          "transition-transform duration-300",
          "group-hover:scale-105 group-active:scale-95",
          "shadow-sm"
        )}>
          {person.avatar ? (
            <AvatarImage 
              src={person.avatar} 
              alt={person.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-medium text-blue-600">
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
            )}>
              {StatusIcon && (
                <StatusIcon className="w-2 h-2 text-white" />
              )}
            </div>
          </div>
        )}
      </button>
    </motion.div>
  )
}

interface StaffTooltipProps {
  person: typeof mockStaff[0]
  onSelect: (id: number) => void
  index: number
}

const StaffTooltip = ({ person, onSelect, index }: StaffTooltipProps) => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <StaffAvatar person={person} onClick={() => onSelect(person.id)} index={index} />
      </HoverCardTrigger>
      <HoverCardContent side="left" className="w-auto p-3 bg-white rounded-lg shadow-lg border">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{person.name}</span>
          <span className="text-xs text-gray-500">{person.role}</span>
          <span className="text-xs font-medium mt-1">
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
}

export function FloatingStaffMenu({ className, onOutsideClick, offsetY, autoCollapseTimeout }: FloatingStaffMenuProps) {
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuContent = selectedStaff ? (
    <div className="w-64 py-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50">
      {/* Encabezado con información del personal seleccionado */}
      <div className="px-3 mb-3 pb-2 border-b border-gray-100">
        {mockStaff.map(person => person.id === selectedStaff && (
          <div key={person.id} className="flex items-center space-x-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
              {person.avatar ? (
                <AvatarImage src={person.avatar} alt={person.name} />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {person.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-medium text-sm">{person.name}</div>
              <div className="text-xs text-gray-500">{person.role}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="px-2">
        <div className="grid grid-cols-2 gap-1.5">
          {staffActionItems
            .filter(item => {
              const staff = mockStaff.find(s => s.id === selectedStaff)
              return staff?.isOnline ? true : item.showWhenOffline
            })
            .map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs font-normal hover:bg-gray-100"
                onClick={() => {
                  item.action(selectedStaff)
                  setSelectedStaff(null) // Cerrar el menú después de la acción
                }}
              >
                <item.icon className="w-3.5 h-3.5 mr-2" />
                {item.label}
              </Button>
            ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {mockStaff.map((person, index) => (
          <StaffTooltip 
            key={person.id}
            person={person} 
            onSelect={setSelectedStaff}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  )

  return (
    <FloatingMenuBase
      className={className}
      onOutsideClick={() => {
        setSelectedStaff(null)
        setIsMenuOpen(false)
        onOutsideClick?.()
      }}
      icon={<Users className="w-6 h-6" />}
      color="blue"
      isVisible={true}
      label="Personal de la clínica"
      offsetY={offsetY}
      autoCollapseTimeout={autoCollapseTimeout}
    >
      {menuContent}
    </FloatingMenuBase>
  )
} 