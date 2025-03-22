"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, Search, User, LogOut, Settings, CreditCard, Receipt, Menu, Bell, Calendar, MoreVertical, ClipboardList } from "lucide-react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { menuItems, type MenuItem } from "@/config/menu-structure"
import { Input } from "@/components/ui/input"
import { useClinic } from "@/contexts/clinic-context"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "@/app/contexts/theme-context"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ClientCardWrapper } from "@/components/client-card-wrapper"
import { ScrollIndicator } from "@/components/ui/scroll-indicator"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onToggle?: () => void
  forceMobileView?: boolean
  allowHoverEffects?: boolean
  showUserMenu?: boolean
}

// Definir el tipo de Clinic para usar localmente en este componente,
// pero asegurándose de que sea compatible con el usado en el contexto
interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
  config?: {
    cabins?: Array<{
      id: number
      isActive: boolean
      [key: string]: any
    }>
    [key: string]: any
  }
}

// Define user menu items with proper routes
const userMenuItems = [
  {
    id: "personal-data",
    label: "Editar datos personales",
    href: "/perfil/datos-personales",
    icon: User,
  },
  {
    id: "subscription",
    label: "Mi suscripción",
    href: "/perfil/suscripcion",
    icon: Settings,
  },
  {
    id: "billing-data",
    label: "Datos de facturación",
    href: "/perfil/facturacion",
    icon: CreditCard,
  },
  {
    id: "services",
    label: "Servicios contratados",
    href: "/perfil/servicios",
    icon: Settings,
  },
  {
    id: "invoices",
    label: "Facturas",
    href: "/perfil/facturas",
    icon: Receipt,
  },
]

// Modificar la función useMenuState para simplificarla como en la versión anterior
const useMenuState = () => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set())

  const toggleMenu = useCallback((menuId: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(menuId)) {
        next.delete(menuId)
      } else {
        next.clear() // Cerrar todos los menús abiertos
        next.add(menuId)
      }
      return next
    })
  }, [])

  const closeAllMenus = useCallback(() => {
    setOpenMenus(new Set())
  }, [])

  return { openMenus, toggleMenu, closeAllMenus }
}

// Reemplazar la lógica del componente MenuItemComponent con una versión mejorada
const MenuItemComponent = ({
  item,
  depth = 0,
  isCollapsed = false,
  openMenus,
  toggleMenu,
  isMobile = false,
}: {
  item: MenuItem
  depth?: number
  isCollapsed?: boolean
  openMenus: Set<string>
  toggleMenu: (id: string) => void
  isMobile?: boolean
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isActive = pathname === item.href
  const isOpen = openMenus.has(item.id)
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  // Nuevo manejador de click que fuerza la visibilidad del submenú
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasSubmenu) {
      // Toggle submenu
      toggleMenu(item.id);
    } else if (item.href) {
      try {
        router.push(item.href);
        toggleMenu(""); // Close all menus when navigating
      } catch (error) {
        // Silenciar errores en producción, registrar solo en desarrollo
        if (process.env.NODE_ENV !== 'production') {
          console.warn("Error al navegar:", error);
        }
      }
    }
  };

  // Efecto para posicionar y mostrar el submenú cuando está abierto o con hover
  useEffect(() => {
    if ((isOpen || (isHovered && isCollapsed && hasSubmenu)) && submenuRef.current && menuRef.current) {
      try {
        submenuRef.current.style.display = "block";
        submenuRef.current.style.position = "fixed";
        submenuRef.current.style.left = (menuRef.current?.getBoundingClientRect().right || 0) + "px";
        submenuRef.current.style.zIndex = "99999";
        submenuRef.current.style.backgroundColor = "white";
        submenuRef.current.style.border = "1px solid #e5e7eb";
        submenuRef.current.style.borderRadius = "0.375rem";
        submenuRef.current.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        submenuRef.current.style.minWidth = "16rem";
        submenuRef.current.style.visibility = "visible";
        submenuRef.current.style.opacity = "1";
        
        // Ajustar posición top dependiendo del menú
        if (item.id === "configuracion") {
          // Para el menú de configuración, usamos siempre la misma posición fija
          // tanto para hover como para clic, y tanto con barra plegada como desplegada
          submenuRef.current.style.top = "calc(100vh - 450px)";
          
          // Establecer altura para el menú de configuración
          const maxMenuHeight = "450px"; // Aumentar la altura máxima
          submenuRef.current.style.maxHeight = maxMenuHeight;
          
          // Añadir indicador de scroll si es necesario
          setTimeout(() => {
            if (submenuRef.current) {
              // Comprobamos si el contenido excede el tamaño visible
              const hasOverflow = submenuRef.current.scrollHeight > submenuRef.current.clientHeight;
              if (hasOverflow) {
                // Si hay overflow, añadimos el indicador visual de scroll
                const scrollIndicator = document.createElement("div");
                scrollIndicator.className = "scroll-indicator";
                scrollIndicator.style.position = "absolute";
                scrollIndicator.style.bottom = "10px";
                scrollIndicator.style.left = "50%";
                scrollIndicator.style.transform = "translateX(-50%)";
                scrollIndicator.style.width = "30px";
                scrollIndicator.style.height = "30px";
                scrollIndicator.style.backgroundColor = "rgba(147, 51, 234, 0.7)"; // Color púrpura con opacidad
                scrollIndicator.style.borderRadius = "50%";
                scrollIndicator.style.display = "flex";
                scrollIndicator.style.justifyContent = "center";
                scrollIndicator.style.alignItems = "center";
                scrollIndicator.style.zIndex = "999999";
                scrollIndicator.style.cursor = "pointer";
                scrollIndicator.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><path d="m6 9 6 6 6-6"/></svg>';
                
                // Eliminar indicador existente si ya hay uno
                const existingIndicator = submenuRef.current.querySelector(".scroll-indicator");
                if (existingIndicator) {
                  existingIndicator.remove();
                }
                
                // Añadir el indicador al menú
                submenuRef.current.appendChild(scrollIndicator);
                
                // Añadir evento para hacer scroll al hacer clic en el indicador
                scrollIndicator.addEventListener("click", () => {
                  if (submenuRef.current) {
                    submenuRef.current.scrollTop += 100; // Desplaza 100px hacia abajo
                  }
                });
                
                // Ocultar el indicador después de scroll
                submenuRef.current.addEventListener("scroll", () => {
                  // Si ya hemos hecho scroll hasta casi el final, ocultar el indicador
                  if (submenuRef.current && scrollIndicator) {
                    const isNearBottom = submenuRef.current.scrollHeight - submenuRef.current.scrollTop - submenuRef.current.clientHeight < 50;
                    scrollIndicator.style.opacity = isNearBottom ? "0" : "1";
                    scrollIndicator.style.transition = "opacity 0.3s";
                  }
                });
              }
            }
          }, 100); // Pequeño retraso para asegurar que el DOM está listo
        } else {
          // Posición estándar para otros menús
          submenuRef.current.style.top = (menuRef.current?.getBoundingClientRect().top || 0) + "px";
          submenuRef.current.style.maxHeight = "400px";
          submenuRef.current.style.overflowY = "auto";
        }
      } catch (error) {
        console.error("Error al actualizar el estilo del submenú:", error);
      }
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu, item.id]);

  return (
    <div 
      ref={menuRef} 
      className="relative my-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant="ghost"
        id={item.id === "sistema" ? "submenu-item-sistema" : `submenu-item-${item.id}`}
        className={cn(
          "w-full justify-start",
          isActive && "bg-purple-50 text-purple-600",
          "hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
          depth > 0 && "pl-4",
          isCollapsed && "px-2",
        )}
        onClick={handleClick}
      >
        {item.icon && <item.icon className={cn("mr-2 h-4 w-4 text-purple-600", isCollapsed && "mr-0")} />}
        {(!isCollapsed || depth > 0) && <span className="flex-1 text-left">{item.label}</span>}
        {(!isCollapsed || depth > 0) && item.badge && (
          <span className="px-2 py-1 ml-2 text-xs text-white bg-red-500 rounded-full">{item.badge}</span>
        )}
        {(!isCollapsed || depth > 0) && hasSubmenu && (
          <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
        )}
      </Button>
      
      {/* Submenú con visualización al hover cuando está colapsado */}
      {hasSubmenu && (isOpen || (isHovered && isCollapsed)) && (
        <div
          ref={submenuRef}
          id={`submenu-${item.id}`}
          className="submenu"
          style={{
            position: "fixed",
            left: (menuRef.current?.getBoundingClientRect().right || 0) + "px",
            // Posición forzada a la parte inferior de la pantalla
            top: item.id === "configuracion" 
              ? "calc(100vh - 450px)" // Valor fijo muy bajo para que aparezca cerca del final de la pantalla
              : (menuRef.current?.getBoundingClientRect().top || 0) + "px",
            zIndex: 99999,
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            minWidth: "16rem",
            display: "block",
            visibility: "visible",
            opacity: 1,
            // Establecer altura máxima dependiendo del tipo de menú
            maxHeight: item.id === "configuracion" 
              ? "450px" // Mayor altura para el menú de configuración
              : "400px", // Altura estándar para otros menús
            // overflowY no se fuerza a "auto", sino que se deja como "auto" para que solo muestre scroll cuando sea necesario
            overflowY: "auto"
          }}
        >
          {item.submenu!.map((subItem) => (
            <MenuItemComponent
              key={subItem.id}
              item={subItem}
              depth={depth + 1}
              isCollapsed={false}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const getClinicInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function MainSidebar({ className, isCollapsed, onToggle, forceMobileView = false, allowHoverEffects = true, showUserMenu: initialShowUserMenu = true }: SidebarProps) {
  const { openMenus, toggleMenu, closeAllMenus } = useMenuState()
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const clinicRef = useRef<HTMLDivElement>(null)
  const clinicMenuRef = useRef<HTMLDivElement>(null)
  const sidebarMenusRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [currentDate, setCurrentDate] = useState<string>("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()
  const { theme } = useTheme()
  const [hasMounted, setHasMounted] = useState(false)
  const [isClinicSelectorOpen, setIsClinicSelectorOpen] = useState(false)
  const [isClinicHovered, setIsClinicHovered] = useState(false)
  const [clinicSearchTerm, setClinicSearchTerm] = useState("")

  const { activeClinic, setActiveClinic, clinics } = useClinic()
  
  // Manejar la acción de clic en un menú
  const handleMenuClick = useCallback((menuId: string) => {
    // Cerrar otros menús desplegables si están abiertos
    setIsUserMenuOpen(false)
    setShowNotifications(false)
    setIsClinicSelectorOpen(false)
    
    // Abrir o cerrar el menú seleccionado
    toggleMenu(menuId)
  }, [toggleMenu])

  // Verificar si el componente se ha montado en el cliente
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Actualizar la fecha/hora
  useEffect(() => {
    if (hasMounted) {
      // Formato corto para la hora
      const timeFormat = format(new Date(), "HH:mm", { locale: es });
      // Formato para día y fecha
      const dateFormat = format(new Date(), "EEEE, d MMM", { locale: es });
      
      // Capitalizar la primera letra del día
      const formattedDate = dateFormat.charAt(0).toUpperCase() + dateFormat.slice(1);
      
      setCurrentDate(`${formattedDate} · ${timeFormat}`);
      
      const intervalId = setInterval(() => {
        const newTime = format(new Date(), "HH:mm", { locale: es });
        const newDate = format(new Date(), "EEEE, d MMM", { locale: es });
        const newFormattedDate = newDate.charAt(0).toUpperCase() + newDate.slice(1);
        
        setCurrentDate(`${newFormattedDate} · ${newTime}`);
      }, 60000);
      
      return () => clearInterval(intervalId);
    }
  }, [hasMounted]);

  // Filtrar clínicas por disponibilidad
  const activeClinics = useMemo(() => {
    // Obtenemos todas las clínicas y asumimos que todas deben mostrarse a menos que decidamos lo contrario
    return clinics
  }, [clinics])

  // Para asegurarnos de que el manejo es tipo-seguro
  const handleClinicSelect = (clinic: any) => {
    // @ts-ignore - Ignoramos los problemas de tipo porque sabemos que la función setActiveClinic espera este objeto
    setActiveClinic(clinic)
    setIsClinicSelectorOpen(false)
    setIsClinicHovered(false)
    setClinicSearchTerm("")
  }

  const filteredClinics = useMemo(() => {
    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase()) ||
        clinic.prefix.toLowerCase().includes(clinicSearchTerm.toLowerCase()),
    )
  }, [clinics, clinicSearchTerm])

  useEffect(() => {
    const handleMouseLeave = () => {
      closeAllMenus()
      setHoveredMenu(null)
    }

    document.getElementById("main-sidebar")?.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.getElementById("main-sidebar")?.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [closeAllMenus])

  // Handle clicks outside the user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as Node
        const sidebarElement = document.getElementById("main-sidebar")
        if (sidebarElement && !sidebarElement.contains(target)) {
          setIsUserMenuOpen(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isUserMenuOpen])

  // Handle clicks outside the clinic menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClinicSelectorOpen || isClinicHovered) {
        const target = event.target as Node
        const sidebarElement = document.getElementById("main-sidebar")
        if (sidebarElement && !sidebarElement.contains(target)) {
          setIsClinicSelectorOpen(false)
          setIsClinicHovered(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isClinicSelectorOpen, isClinicHovered])

  // Close clinic menu when another menu is opened
  useEffect(() => {
    if (openMenus.size > 0 || isUserMenuOpen) {
      setIsClinicSelectorOpen(false)
      setIsClinicHovered(false)
    }
  }, [openMenus, isUserMenuOpen])

  // Position the user menu when it's shown
  useEffect(() => {
    if (isUserMenuOpen && menuRef.current && avatarRef.current) {
      const avatarRect = avatarRef.current.getBoundingClientRect()
      const menuHeight = menuRef.current.offsetHeight

      // Calcular el extremo superior de la ventana y el menú de configuración (si existe)
      const configMenuBottom = document.querySelector('.app-sidebar-config-menu')?.getBoundingClientRect().bottom || 0
      
      // Posicionar para evitar sobreposición con menú de configuración
      const avatarBottom = avatarRect.bottom
      const spaceForMenu = Math.max(100, window.innerHeight - avatarBottom - 100)
      
      if (menuHeight > spaceForMenu) {
        // Si no hay suficiente espacio debajo, mostrar arriba
        menuRef.current.style.top = "auto"
        menuRef.current.style.bottom = `${window.innerHeight - avatarRect.top + 10}px`
      } else {
        // Si hay espacio suficiente, mostrar abajo
        menuRef.current.style.bottom = "auto"
        menuRef.current.style.top = `${avatarRect.bottom + 5}px`
      }

      // Ajustar posición horizontal
      if (isCollapsed) {
        menuRef.current.style.left = "16px"
      } else {
        menuRef.current.style.left = "64px"
      }
    }
  }, [isUserMenuOpen, isCollapsed])

  // Position the clinic menu when it's shown
  useEffect(() => {
    // No posicionamos el menú en dispositivos móviles, usamos el despliegue vertical nativo
    if (!isMobile && (isClinicSelectorOpen || isClinicHovered) && clinicMenuRef.current && clinicRef.current) {
      const clinicRect = clinicRef.current.getBoundingClientRect()
      const menuHeight = clinicMenuRef.current.offsetHeight

      // Calculate position that ensures the menu is fully visible
      const windowHeight = window.innerHeight
      const spaceBelow = windowHeight - clinicRect.bottom

      // Position the menu to the right of the clinic selector
      if (menuHeight <= spaceBelow) {
        // If there's enough space below, position it there
        clinicMenuRef.current.style.top = `${clinicRect.top}px`
      } else {
        // If not enough space below, position it so it doesn't go off screen
        const topPosition = Math.max(0, windowHeight - menuHeight - 10)
        clinicMenuRef.current.style.top = `${topPosition}px`
      }

      // Adjust horizontal position based on sidebar state
      if (isCollapsed) {
        clinicMenuRef.current.style.left = "16px" // Closer to collapsed sidebar
      } else {
        clinicMenuRef.current.style.left = "64px" // Normal position for expanded sidebar
      }
    }
  }, [isClinicSelectorOpen, isClinicHovered, isCollapsed, isMobile])

  // Aplicar búsqueda solo a las clínicas activas
  const filteredActiveClinics = useMemo(() => {
    return activeClinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase()) ||
        clinic.prefix.toLowerCase().includes(clinicSearchTerm.toLowerCase()),
    )
  }, [activeClinics, clinicSearchTerm])

  // Mejorar el cierre de menús cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutsideSidebar = (event: MouseEvent) => {
      const target = event.target as Node
      const sidebarElement = document.getElementById("main-sidebar")
      
      // Si el clic es fuera de la barra lateral, cerrar todos los menús
      if (sidebarElement && !sidebarElement.contains(target)) {
        closeAllMenus()
        setIsUserMenuOpen(false)
        setIsClinicSelectorOpen(false)
        setIsClinicHovered(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutsideSidebar)
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSidebar)
    }
  }, [closeAllMenus])

  // Cierre global de menús cuando se navega
  useEffect(() => {
    const handleRouteChange = () => {
      closeAllMenus()
      setIsUserMenuOpen(false)
      setIsClinicSelectorOpen(false)
      setIsClinicHovered(false)
    }

    window.addEventListener("popstate", handleRouteChange)
    return () => {
      window.removeEventListener("popstate", handleRouteChange)
    }
  }, [closeAllMenus])

  // Cerrar todos los menús cuando se colapsa o expande la barra lateral
  useEffect(() => {
    closeAllMenus();
    setIsUserMenuOpen(false);
    setShowNotifications(false);
    setIsClinicSelectorOpen(false);
  }, [isCollapsed, closeAllMenus]);

  return (
    <div
      id="main-sidebar"
      className={cn(
        "bg-white border-r flex flex-col h-screen", 
        !forceMobileView && "fixed left-0", // Sólo fijar posición si no es modo móvil forzado
        isCollapsed ? "w-16" : "w-64",
        "transition-all duration-300 ease-in-out z-40",
        className,
      )}
      style={{ 
        top: 0,
        bottom: forceMobileView ? undefined : 0, // Sólo fijar bottom si no es modo móvil forzado
        overflowY: "auto",
      }}
    >
      {/* Header integrado en barra lateral */}
      <div className="p-2 overflow-hidden text-white bg-purple-600 border-b">
        <div className="flex items-center justify-between">
          {/* Logo y menú hamburguesa */}
          <div className="flex items-center w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "hover:bg-white/10 mr-2 flex-shrink-0",
                isCollapsed ? "text-white" : "text-white"
              )}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {/* Logo optimizado para ser visible colapsado y expandido */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center">
                {hasMounted && theme?.logoUrl && !logoError ? (
                  <img 
                    src={theme.logoUrl} 
                    alt="Logo" 
                    className={cn(
                      "h-8 object-contain", 
                      isCollapsed ? "max-w-[30px]" : "max-w-[100px]"
                    )}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className={cn(
                    "font-semibold truncate", 
                    isCollapsed ? "text-base w-6" : "text-lg"
                  )}>
                    {isCollapsed ? "L" : "LOGO"}
                  </div>
                )}
              </div>
              
              {/* Mostrar fecha en dos líneas si no está colapsado */}
              {!isCollapsed && (
                <div className="text-xs truncate text-white/90">{currentDate}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta del último cliente - sección destacada */}
      <div className="p-2 overflow-hidden border-b bg-purple-50">
        <div className="flex items-center justify-between">
          <div className={cn(
            "text-sm font-medium w-full", 
            isCollapsed ? "mx-auto text-center" : ""
          )}>
            {isCollapsed ? (
              <div className="flex flex-col items-center">
                <ClientCardWrapper isCompact={true} />
              </div>
            ) : (
              <div className="w-full overflow-hidden">
                <div className="mb-1 text-xs text-purple-700 truncate">Último cliente</div>
                <ClientCardWrapper isCompact={false} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="p-2 overflow-hidden border-b">
        <div className={cn(
          "flex", 
          isCollapsed ? "justify-center" : "justify-between items-center"
        )}>
          {!isCollapsed && <span className="text-sm text-gray-500 truncate">Notificaciones</span>}
          
          <div 
            className="relative flex-shrink-0"
            onMouseEnter={() => setShowNotifications(true)}
            onMouseLeave={() => setTimeout(() => setShowNotifications(false), 300)}
          >
            <button
              id="notifications-button"
              className="relative p-2 rounded-full hover:bg-purple-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Cerrar otros menús
                setIsUserMenuOpen(false);
                setIsClinicSelectorOpen(false);
                // Alternar este menú
                setShowNotifications(!showNotifications);
              }}
            >
              <Bell className="w-5 h-5 text-purple-600" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {showNotifications && (
              <div 
                className="fixed mt-2 w-80 bg-white rounded-md shadow-lg border overflow-hidden z-[999999] notifications-menu"
                style={{
                  top: "50px", // Posición fija desde arriba
                  left: isCollapsed ? "70px" : "270px", // Cambiado de right a left para alinearlo con la barra lateral
                  maxHeight: "calc(100vh - 100px)",
                  overflowY: "auto",
                  display: "block",
                  visibility: "visible" as const,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold">Notificaciones</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Marcando todas las notificaciones como leídas");
                      // Aquí iría la lógica para marcar como leídas
                      // Por ahora solo cerramos el menú
                      setShowNotifications(false);
                    }}
                  >
                    Marcar todas como leídas
                  </Button>
                </div>
                <div className="divide-y">
                  {/* Notificaciones recientes */}
                  <div className="p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Recordatorio:</span> Cita con Lina Sadaoui mañana a las 10:15h
                        </p>
                        <p className="text-xs text-gray-500">Hace 5 minutos</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-green-100 rounded-full">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Nuevo cliente:</span> Se ha registrado un nuevo cliente
                        </p>
                        <p className="text-xs text-gray-500">Ayer</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 text-center bg-gray-50">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="justify-center w-full text-purple-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Ver todas las notificaciones");
                      setShowNotifications(false);
                      router.push("/notificaciones");
                    }}
                  >
                    Ver todas las notificaciones
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clinic selector */}
      <div
        ref={clinicRef}
        className="relative p-2 border-b"
        onMouseEnter={() => setIsClinicHovered(true)}
        onMouseLeave={() => setIsClinicHovered(false)}
      >
        <div
          className="flex items-center p-2 rounded-md cursor-pointer app-sidebar-item hover:app-sidebar-hover"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Cerrar otros menús
            setIsUserMenuOpen(false);
            setShowNotifications(false);
            // Alternar este menú
            setIsClinicSelectorOpen(!isClinicSelectorOpen);
          }}
        >
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full">
            <span className="text-sm font-medium text-purple-800">
              {getClinicInitials(activeClinic?.name || "Clínica")}
            </span>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 ml-3 truncate">
                <div className="font-medium truncate">{activeClinic?.name || "Selecciona clínica"}</div>
                <div className="text-xs text-gray-500">{activeClinic?.city || ""}</div>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 ml-2 transition-transform",
                isClinicSelectorOpen && "rotate-90"
              )} />
            </>
          )}
        </div>

        {/* Menú selector de clínicas - siempre horizontal */}
        {(isClinicSelectorOpen || isClinicHovered) && (
          <div 
            ref={clinicMenuRef} 
            className="fixed z-[999999] w-80 rounded-md border bg-white shadow-lg clinic-selector-menu"
            style={{
              position: "fixed", 
              left: isCollapsed ? "70px" : "270px", 
              top: "150px",
              display: "block",
              visibility: "visible" as const,
              opacity: 1,
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto"
            }}
          >
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  placeholder="Buscar centros..."
                  value={clinicSearchTerm}
                  onChange={(e) => setClinicSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {filteredActiveClinics.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No hay clínicas activas</div>
                ) : (
                  filteredActiveClinics.map((clinic) => (
                    <Button
                      key={clinic.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start px-3 py-2",
                        activeClinic.id === clinic.id ? "bg-green-50" : "hover:bg-purple-50",
                      )}
                      onClick={() => handleClinicSelect(clinic)}
                    >
                      <div className="flex items-center w-full gap-3">
                        <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg">
                          {getClinicInitials(clinic.name)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{clinic.name}</div>
                          <div className="text-xs text-gray-500">{clinic.prefix}</div>
                        </div>
                        {activeClinic.id === clinic.id && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu items - con scroll automático e indicador */}
      <div 
        ref={sidebarMenusRef} 
        className="flex-1 py-2 overflow-y-auto relative"
      >
        {menuItems.map((item) => (
          <div key={item.id} className="my-1">
            <MenuItemComponent
              item={item}
              isCollapsed={isCollapsed}
              openMenus={openMenus}
              toggleMenu={handleMenuClick}
              isMobile={forceMobileView}
            />
          </div>
        ))}
        
        {/* Reemplazar indicadores manuales con el componente ScrollIndicator */}
        <ScrollIndicator 
          containerRef={sidebarMenusRef}
          position="left"
          offset={{ 
            left: isCollapsed ? 32 : 128, 
            top: forceMobileView ? 60 : 20, 
            bottom: forceMobileView ? 60 : 20 
          }}
          scrollAmount={200}
          className="z-[9999]"
        />
      </div>

      {/* User menu */}
      <div className="pt-2 pb-4 border-t">
        <div 
          className="relative" 
          ref={avatarRef}
          onMouseEnter={() => !isMobile && setIsUserMenuOpen(true)}
          onMouseLeave={() => !isMobile && setTimeout(() => setIsUserMenuOpen(false), 300)}
        >
          <Button
            variant="ghost"
            className={cn("w-full justify-start app-sidebar-item hover:app-sidebar-hover", isUserMenuOpen && "bg-purple-50")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Cerrar otros menús
              setShowNotifications(false);
              setIsClinicSelectorOpen(false);
              // Alternar este menú
              setIsUserMenuOpen(!isUserMenuOpen);
            }}
          >
            <Avatar className="w-8 h-8 mr-2">
              <AvatarFallback>RA</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Squad Chafiki</span>
                <span className="text-xs text-gray-500">usuario@example.com</span>
              </div>
            )}
          </Button>

          {isUserMenuOpen && (
            <div
              ref={menuRef}
              className="fixed rounded-md border bg-white shadow-lg z-[999999] w-64 visible"
              style={{ 
                position: "fixed", 
                left: isCollapsed ? "60px" : "260px", 
                top: "auto", 
                bottom: "80px",
                display: "block",
                visibility: "visible" as const,
                opacity: 1,
                pointerEvents: "auto" as const,
                maxHeight: "calc(100vh - 100px)",
                overflowY: "auto"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-3 border-b">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>RA</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Squad Chafiki</span>
                  <span className="text-xs text-muted-foreground">usuario@example.com</span>
                </div>
              </div>
              <div className="py-1">
                {userMenuItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
                      pathname === item.href && "bg-purple-50 text-purple-600",
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2 text-purple-600" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="py-1 border-t">
                <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Desconectar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

