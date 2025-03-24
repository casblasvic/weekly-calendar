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
  CheckCircle
} from "lucide-react"
import { useLastClient } from "@/contexts/last-client-context"
import { useRouter } from "next/navigation"

interface FloatingMenuProps {
  className?: string
}

export function FloatingMenu({ className }: FloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { lastClient } = useLastClient()
  const router = useRouter()

  // Función para cerrar el menú
  const closeMenu = useCallback(() => {
    setActiveMenu(null)
    setActiveSection(null)
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
  }

  // Contenido del menú de cliente
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
      icon: Calendar,
      href: "/clientes/[id]/historial"
    },
    {
      id: "mensajes",
      label: "Enviar mensaje",
      icon: MessageCircle,
      href: "/mensajes/app/[id]",
      isAction: true
    }
  ]

  // Contenido del menú de personal
  const staffMenuItems = [
    {
      id: "message",
      label: "Chat interno",
      icon: MessageCircle
    },
    {
      id: "checkIn",
      label: "Marcar entrada",
      icon: CheckCircle
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
        {/* Botón o flecha de expansión */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out flex items-center",
            isExpanded ? "translate-x-0" : "translate-x-[calc(100%-12px)]"
          )}
        >
          {isExpanded ? (
            // Botón principal cuando está expandido
            <div className="flex flex-col space-y-2">
              {/* Botón de cliente */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-12 h-12 rounded-md relative group shadow-lg",
                  activeMenu === "client" ? "bg-purple-700" : "bg-purple-600 hover:bg-purple-700",
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
                  activeMenu === "staff" ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700",
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
                  activeMenu === "favorites" ? "bg-amber-700" : "bg-amber-600 hover:bg-amber-700",
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
                  activeMenu === "notifications" ? "bg-green-700" : "bg-green-600 hover:bg-green-700",
                  "text-white"
                )}
                style={{
                  boxShadow: `0 4px 14px rgba(0, 0, 0, 0.15)`
                }}
                onClick={() => handleMenuSelect("notifications")}
                title="Notificaciones"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute w-2 h-2 bg-red-500 rounded-full top-2 right-2" />
              </Button>

              {/* Flecha de plegado */}
              <div 
                className={cn(
                  "absolute -right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full",
                  "bg-white shadow-sm flex items-center justify-center cursor-pointer",
                  "text-gray-600 hover:bg-gray-100"
                )}
                onClick={() => {
                  setIsExpanded(false)
                  closeMenu()
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            // Flecha de expansión cuando está plegado
            <div 
              className={cn(
                "w-8 h-12 -ml-2 flex items-center justify-center cursor-pointer shadow-md",
                "rounded-l-lg transition-colors",
                "bg-gray-800 hover:bg-gray-700 text-white"
              )}
              onClick={() => setIsExpanded(true)}
            >
              <ChevronLeft className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Contenido del menú - ajustado para aparecer a la izquierda */}
        {isExpanded && activeMenu && (
          <div 
            className="absolute overflow-hidden bg-white border rounded-md"
            style={{
              right: "60px",
              top: activeMenu === "notifications" ? "170px" : 
                   activeMenu === "favorites" ? "115px" : 
                   activeMenu === "staff" ? "60px" : "0",
              transform: "translateY(0)",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
              zIndex: 999999,
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
                      <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-purple-600 bg-purple-100 border-2 border-white rounded-full shadow-sm">
                        {lastClient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold leading-tight text-gray-800">{lastClient.name}</div>
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

              {/* Menú de personal */}
              {activeMenu === "staff" && (
                <div className="w-full">
                  <div className="p-2.5 border-b bg-gradient-to-r from-blue-50 to-white">
                    <div className="text-sm font-medium text-blue-600">Personal</div>
                  </div>
                  <div className="py-1 max-h-[300px] overflow-y-auto">
                    {staffMenuItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full px-2.5 py-1.5 justify-start hover:bg-blue-50 hover:text-blue-600 rounded-none border-l-2 border-transparent text-xs text-gray-700"
                        onClick={() => {
                          // Acción para personal
                          closeMenu()
                        }}
                      >
                        <div className="flex items-center w-4 h-4 mr-1.5 text-blue-500">
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
                    <h3 className="text-sm font-semibold">Notificaciones</h3>
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
      `}</style>
    </div>
  )
} 