"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  User, 
  Users, 
  Star, 
  Calendar, 
  MessageCircle, 
  CheckCircle,
  ClipboardList,
  FileText,
  Gift,
  Receipt,
  Camera,
  File,
  CreditCard,
  Phone,
  Clock,
  XCircle,
  Sun,
  Plane,
  BedDouble
} from "lucide-react"
import { useLastClient } from "@/contexts/last-client-context"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface FloatingMenuProps {
  className?: string
}

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

// Acciones para el personal
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

export function FloatingMenu({ className }: FloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { lastClient } = useLastClient()
  const router = useRouter()

  // Función para cerrar el menú
  const closeMenu = useCallback(() => {
    setActiveMenu(null)
    setActiveSection(null)
    setSelectedStaff(null)
  }, [])

  // Efecto para cerrar el menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [closeMenu])

  // Efecto para auto-colapsar el menú después de un tiempo
  useEffect(() => {
    const autoCollapseTimeout = 8000 // 8 segundos
    
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current)
    }
    
    if (isExpanded) {
      autoCollapseTimerRef.current = setTimeout(() => {
        setIsExpanded(false)
        closeMenu()
      }, autoCollapseTimeout)
    }
    
    return () => {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current)
      }
    }
  }, [isExpanded, closeMenu])

  // Manejador para seleccionar un menú
  const handleMenuSelect = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId)
    setSelectedStaff(null)
  }

  // Función para alternar la expansión del menú
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      // Si estamos expandiendo, no necesitamos cerrar el menú
    } else {
      // Si estamos colapsando, cerramos cualquier menú abierto
      closeMenu()
    }
  }

  // Contenido del menú de cliente (completo)
  const clientMenuItems = [
    {
      id: "datos",
      label: "Datos del cliente",
      icon: User,
      href: "/clientes/[id]"
    },
    {
      id: "historial",
      label: "Historial",
      icon: ClipboardList,
      href: "/clientes/[id]/historial"
    },
    {
      id: "consentimientos",
      label: "Consentimientos",
      icon: FileText,
      href: "/clientes/[id]/consentimientos"
    },
    {
      id: "aplazado",
      label: "Aplazado",
      icon: Calendar,
      href: "/clientes/[id]/aplazado"
    },
    {
      id: "mensajes-app",
      label: "Enviar mensaje App",
      icon: MessageCircle,
      href: "/mensajes/app/[id]",
      isAction: true
    },
    {
      id: "bonos",
      label: "Bonos",
      icon: Gift,
      href: "/clientes/[id]/bonos"
    },
    {
      id: "whatsapp",
      label: "Enviar mensaje WhatsApp",
      icon: MessageCircle,
      href: "/mensajes/whatsapp/[id]",
      isAction: true
    },
    {
      id: "suscripciones",
      label: "Suscripciones",
      icon: Users,
      href: "/clientes/[id]/suscripciones"
    },
    {
      id: "recibos",
      label: "Recibos pendientes",
      icon: Receipt,
      href: "/clientes/[id]/recibos"
    },
    {
      id: "fotos",
      label: "Fotografías",
      icon: Camera,
      href: "/clientes/[id]/fotografias"
    },
    {
      id: "documentos",
      label: "Documentos",
      icon: File,
      href: "/clientes/[id]/documentos"
    },
    {
      id: "avisos",
      label: "Avisos",
      icon: Bell,
      href: "/clientes/[id]/avisos"
    },
    {
      id: "facturacion",
      label: "Facturación",
      icon: CreditCard,
      href: "/clientes/[id]/facturacion"
    }
  ]

  // Contenido del menú de notificaciones
  const notificationItems = [
    {
      title: "Recordatorio: Cita con Lina Sadaoui",
      description: "Mañana a las 10:15h",
      time: "Hace 5 minutos",
      icon: Calendar,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Nuevo cliente registrado",
      description: "Se ha añadido un nuevo cliente",
      time: "Ayer",
      icon: User,
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    }
  ]

  // Contenido del menú de favoritos (ejemplo)
  const favoriteItems = [
    {
      id: "agenda",
      label: "Agenda",
      href: "/agenda"
    },
    {
      id: "clientes",
      label: "Clientes",
      href: "/clientes"
    }
  ]

  // Función para manejar el clic en un ítem del menú de cliente
  const handleClientItemClick = (item: typeof clientMenuItems[0]) => {
    if (lastClient) {
      const url = item.href.replace('[id]', lastClient.id)
      router.push(url)
      closeMenu()
    }
  }

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

  // Función para renderizar la tarjeta de acciones de personal
  const renderStaffActionCard = (person: typeof mockStaff[0]) => {
    // Filtrar acciones según el estado (online/offline)
    const availableActions = staffActionItems.filter(
      item => person.isOnline || item.showWhenOffline
    );

    return (
      <div 
        className="w-[170px] bg-white rounded-lg shadow-lg overflow-hidden"
        style={{ 
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
          animation: "cardSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        {/* Encabezado con información del empleado */}
        <div className="p-2.5 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full shadow-sm",
              "bg-blue-100 text-blue-600 text-sm font-medium"
            )}>
              {person.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="font-medium text-xs leading-tight">{person.name}</div>
              <div className="text-[10px] text-gray-500">{person.role}</div>
            </div>
          </div>
        </div>
        
        {/* Lista de acciones rápidas */}
        <div className="py-1">
          {availableActions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start px-2.5 py-1 h-auto text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-none"
              onClick={(e) => {
                e.stopPropagation();
                action.action(person.id);
                closeMenu();
              }}
            >
              <action.icon className="w-3.5 h-3.5 mr-2 text-blue-500" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={menuRef}
      className={cn(
        "fixed right-0 z-[9999] transition-all duration-300 ease-in-out",
        "floating-menu",
        className
      )}
      style={{
        top: "4px",
        right: "2px"
      }}
    >
      <div className="relative flex items-center">
        {/* Botón o flecha de expansión/pliegue - Posición fija */}
        <div 
          className={cn(
            "fixed transition-all duration-300 ease-in-out",
            "right-0 top-4 z-[9999]"
          )}
        >
          {/* Botón de despliegue/pliegue */}
          <div 
            className={cn(
              "w-6 h-12 flex items-center justify-center cursor-pointer shadow-md",
              "rounded-l-lg transition-colors",
              "bg-purple-600/80 hover:bg-purple-700/90 text-white"
            )}
            onClick={toggleExpansion}
          >
            {isExpanded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </div>
        </div>

        {/* Botones del menú cuando está expandido */}
        {isExpanded && (
          <div 
            className="fixed z-[9999] flex flex-col space-y-2 transition-all duration-300 ease-in-out"
            style={{
              right: "8px",
              top: "60px"
            }}
          >
            {/* Botón de cliente */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-12 h-12 rounded-md relative group shadow-lg",
                activeMenu === "client" ? "bg-purple-700" : "bg-purple-600/90 hover:bg-purple-700",
                "text-white"
              )}
              style={{
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.15)`
              }}
              onClick={() => handleMenuSelect("client")}
              title="Cliente activo"
            >
              <User className="w-6 h-6" />
            </Button>

            {/* Botón de personal */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-12 h-12 rounded-md relative group shadow-lg",
                activeMenu === "staff" ? "bg-blue-700" : "bg-blue-600/90 hover:bg-blue-700",
                "text-white"
              )}
              style={{
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.15)`
              }}
              onClick={() => handleMenuSelect("staff")}
              title="Personal"
            >
              <Users className="w-6 h-6" />
            </Button>

            {/* Botón de favoritos */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-12 h-12 rounded-md relative group shadow-lg",
                activeMenu === "favorites" ? "bg-amber-700" : "bg-amber-600/90 hover:bg-amber-700",
                "text-white"
              )}
              style={{
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.15)`
              }}
              onClick={() => handleMenuSelect("favorites")}
              title="Favoritos"
            >
              <Star className="w-6 h-6" />
            </Button>

            {/* Botón de notificaciones */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-12 h-12 rounded-md relative group shadow-lg",
                activeMenu === "notifications" ? "bg-green-700" : "bg-green-600/90 hover:bg-green-700",
                "text-white"
              )}
              style={{
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.15)`
              }}
              onClick={() => handleMenuSelect("notifications")}
              title="Notificaciones"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </div>
        )}

        {/* Contenido del menú - ajustado para aparecer verticalmente debajo de cada botón */}
        {isExpanded && activeMenu && activeMenu !== "staff" && (
          <div 
            className="fixed overflow-hidden bg-white rounded-md border z-[999999]"
            style={{
              right: "60px",
              top: activeMenu === "client" ? "60px" : 
                   activeMenu === "favorites" ? "180px" : "240px",
              transform: "translateY(0)",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
              minWidth: "220px",
              maxWidth: "220px",
              maxHeight: "calc(100vh - 20px)"
            }}
          >
            <div className="menu-content-appear">
              {/* Menú de cliente */}
              {activeMenu === "client" && lastClient && (
                <div className="w-full">
                  {/* Encabezado con información del cliente */}
                  <div className="p-2.5 border-b bg-gradient-to-r from-purple-50 to-white">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-purple-600 bg-purple-100 rounded-full border-2 border-white shadow-sm">
                        {lastClient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-gray-800 leading-tight">{lastClient.name}</div>
                        {lastClient.clientNumber && (
                          <div className="text-[10px] text-gray-500 flex items-center">
                            <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full mr-1"></span>
                            #{lastClient.clientNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Opciones del cliente */}
                  <div className="py-1 max-h-[300px] overflow-y-auto">
                    {clientMenuItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={cn(
                          "w-full px-2.5 py-1.5 justify-start hover:bg-purple-50 hover:text-purple-600 rounded-none border-l-2 border-transparent text-xs",
                          activeSection === item.id 
                            ? "bg-purple-50 text-purple-600 border-l-2 border-purple-500" 
                            : "text-gray-700"
                        )}
                        onClick={() => handleClientItemClick(item)}
                      >
                        <div className="flex items-center w-4 h-4 mr-1.5 text-purple-500">
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Menú de favoritos */}
              {activeMenu === "favorites" && (
                <div className="w-full">
                  <div className="p-2.5 border-b bg-gradient-to-r from-amber-50 to-white">
                    <div className="text-sm font-medium text-amber-600">Favoritos</div>
                  </div>
                  <div className="py-1 max-h-[300px] overflow-y-auto">
                    {favoriteItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full px-2.5 py-1.5 justify-start hover:bg-amber-50 hover:text-amber-600 rounded-none border-l-2 border-transparent text-xs text-gray-700"
                        onClick={() => {
                          router.push(item.href)
                          closeMenu()
                        }}
                      >
                        <div className="flex items-center w-4 h-4 mr-1.5 text-amber-500">
                          <Star className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Menú de notificaciones */}
              {activeMenu === "notifications" && (
                <div className="w-full">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold text-sm">Notificaciones</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        // Marcar como leídas
                        closeMenu()
                      }}
                    >
                      Marcar todas como leídas
                    </Button>
                  </div>
                  <div className="divide-y max-h-[300px] overflow-y-auto">
                    {notificationItems.map((notification, index) => (
                      <div key={index} className="p-3 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className={`flex items-center justify-center flex-shrink-0 w-8 h-8 ${notification.iconBg} rounded-full`}>
                            <notification.icon className={`w-4 h-4 ${notification.iconColor}`} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{notification.title}:</span> {notification.description}
                            </p>
                            <p className="text-xs text-gray-500">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 text-center bg-gray-50">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-center w-full text-green-600"
                      onClick={() => {
                        router.push("/notificaciones")
                        closeMenu()
                      }}
                    >
                      Ver todas las notificaciones
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Avatares flotantes de personal - Posición ajustada */}
        {isExpanded && activeMenu === "staff" && (
          <>
            {mockStaff.map((person, index) => {
              const { borderColor, dotColor, StatusIcon } = getStatusInfo(person.status, person.absenceReason);
              
              // Colores para cada avatar en el mismo orden que la captura
              const avatarColors = [
                "bg-blue-600 text-white", // Azul para el primer avatar
                "bg-green-500 text-white", // Verde para el segundo avatar
                "bg-red-500 text-white",   // Rojo para el tercer avatar
                "bg-amber-400 text-white"  // Amarillo para el cuarto avatar
              ];
              
              // Si la persona está fuera de línea, usar gris
              const avatarColor = person.status === "offline" && !person.absenceReason
                ? "bg-gray-300 text-gray-600"
                : avatarColors[index];
                
              // Definir el color del borde según el estado de la persona
              const borderColorClasses = {
                available: "ring-green-500",
                busy: "ring-red-500",
                away: "ring-yellow-500",
                offline: "ring-gray-400"
              };
              
              const statusRing = borderColorClasses[person.status as keyof typeof borderColorClasses] || borderColorClasses.offline;
                
              return (
                <div 
                  key={person.id} 
                  className="fixed z-[9998]"
                  style={{
                    right: "80px",
                    top: `${80 + index * 65}px`
                  }}
                >
                  {selectedStaff === person.id && (
                    <div className="absolute right-[62px] top-0 z-[99999]">
                      {renderStaffActionCard(person)}
                    </div>
                  )}
                  <button
                    className={cn(
                      "flex items-center justify-center",
                      "transition-all duration-200",
                      selectedStaff === person.id ? "scale-110" : "hover:scale-105"
                    )}
                    onClick={() => setSelectedStaff(selectedStaff === person.id ? null : person.id)}
                  >
                    <div className={cn(
                      "relative flex items-center justify-center w-12 h-12 rounded-full",
                      "shadow-lg transition-transform duration-300",
                      avatarColor,
                      "ring-2", statusRing,
                      selectedStaff === person.id ? "shadow-xl" : ""
                    )}>
                      {/* Contenido del Avatar */}
                      <span className="text-lg font-medium">
                        {person.name.split(" ").map(n => n[0]).join("")}
                      </span>
                      
                      {/* Indicador de estado */}
                      {(person.status !== "offline" || person.absenceReason) && (
                        <div className="absolute -bottom-1 -right-1">
                          <div className={cn(
                            "w-4 h-4 rounded-full",
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
                    </div>
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes floatingMenuAppear {
          0% { 
            opacity: 0; 
            transform: translateX(10px) scale(0.96);
          }
          100% { 
            opacity: 1; 
            transform: translateX(0) scale(1);
          }
        }
        
        .menu-content-appear {
          animation: floatingMenuAppear 0.25s cubic-bezier(0.15, 1.15, 0.6, 1.0) forwards;
        }
        
        @keyframes cardSlideIn {
          0% { 
            opacity: 0; 
            transform: translateX(-10px);
          }
          100% { 
            opacity: 1; 
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
} 