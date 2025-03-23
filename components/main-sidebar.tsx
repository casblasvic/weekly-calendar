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
import { useTheme } from "@/contexts/theme"
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

// Restaurar la función useMenuState a su implementación original
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

// Reemplazar completamente la implementación del MenuItemComponent
const MenuItemComponent = ({
  item,
  depth = 0,
  isCollapsed = false,
  openMenus,
  toggleMenu,
  closeAllMenus,
  isMobile = false,
  onToggle,
  onMenuHover,
}: {
  item: MenuItem
  depth?: number
  isCollapsed?: boolean
  openMenus: Set<string>
  toggleMenu: (id: string) => void
  closeAllMenus: () => void
  isMobile?: boolean
  onToggle?: () => void
  onMenuHover?: (hasSubmenu: boolean) => void
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isActive = pathname === item.href
  const isOpen = openMenus.has(item.id)
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  // Optimización del handleClick para manejar todos los casos
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // CASO 1: Ítem con submenú - solo toggle del menú, no cerrar barra
    if (hasSubmenu) {
      // Simplemente alternamos la apertura/cierre del submenú
      toggleMenu(item.id);
      return;
    }
    
    // CASO 2: Ítem final con ruta - navegar a la ruta
    if (item.href) {
      // Cerrar todos los menús antes de navegar
      closeAllMenus();
      
      // Emitimos el evento route-change directamente
      const mainSidebar = document.getElementById('main-sidebar');
      if (mainSidebar) {
        const routeChangeEvent = new CustomEvent('route-change', {
          detail: { 
            path: item.href,
            // Forzar colapso de la barra lateral en submenús
            forced: depth > 0 
          }
        });
        mainSidebar.dispatchEvent(routeChangeEvent);
      }
      
      // Navegar a la ruta usando el router
      router.push(item.href);
    }
  };

  // Efecto para cerrar submenús cuando cambia el estado de la barra lateral
  useEffect(() => {
    // Si la barra está colapsada y no está hovered, ocultar el submenú
    if (isCollapsed && !isHovered && submenuRef.current) {
      submenuRef.current.style.display = 'none';
      submenuRef.current.style.visibility = 'hidden'; 
      submenuRef.current.style.opacity = '0';
    }
  }, [isCollapsed, isHovered]);

  // Efecto para posicionar y mostrar el submenú cuando está abierto o con hover
  useEffect(() => {
    if ((isOpen || (isHovered && hasSubmenu)) && submenuRef.current && menuRef.current) {
      try {
        const rect = menuRef.current.getBoundingClientRect();
        submenuRef.current.style.display = "block";
        submenuRef.current.style.position = "fixed";
        submenuRef.current.style.left = `${rect.right}px`;
        submenuRef.current.style.top = item.id === "configuracion" 
          ? "calc(100vh - 450px)"
          : `${rect.top}px`;
        submenuRef.current.style.zIndex = "99999";
        submenuRef.current.style.backgroundColor = "white";
        submenuRef.current.style.border = "1px solid #e5e7eb";
        submenuRef.current.style.borderRadius = "0.375rem";
        submenuRef.current.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        submenuRef.current.style.minWidth = "16rem";
        submenuRef.current.style.maxHeight = item.id === "configuracion" ? "450px" : "400px";
        submenuRef.current.style.overflowY = "auto";
        submenuRef.current.style.visibility = "visible";
        submenuRef.current.style.opacity = "1";
      } catch (error) {
        console.error("Error al actualizar el estilo del submenú:", error);
      }
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu, item.id]);

  return (
    <div 
      ref={menuRef} 
      className="relative my-1"
      onMouseEnter={() => {
        setIsHovered(true);
        // Notificar que este elemento tiene hover
        if (onMenuHover) {
          onMenuHover(hasSubmenu);
        }
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start",
          isActive && "bg-purple-50 text-purple-600",
          "hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
          depth > 0 && "pl-4",
          isCollapsed && "px-2",
        )}
        onClick={handleClick}
      >
        <div className="relative">
          {item.icon && <item.icon className={cn(
            "text-purple-600 transition-all duration-200", 
            isCollapsed 
              ? "h-5 w-5 mx-auto" 
              : "h-4 w-4 mr-2"
          )} />}
          {/* Pequeño triángulo indicador para ítems con submenú */}
          {hasSubmenu && isCollapsed && (
            <div 
              className="absolute -right-0.5 -bottom-0.5 w-0 h-0 border-solid" 
              style={{
                borderWidth: '0 0 5px 5px',
                borderColor: 'transparent transparent #9333ea transparent',
                transform: 'rotate(0deg)'
              }}
            />
          )}
        </div>
        {(!isCollapsed || depth > 0) && <span className="flex-1 text-left">{item.label}</span>}
        {(!isCollapsed || depth > 0) && item.badge && (
          <span className="px-2 py-1 ml-2 text-xs text-white bg-red-500 rounded-full">{item.badge}</span>
        )}
        {(!isCollapsed || depth > 0) && hasSubmenu && (
          <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
        )}
        {/* Indicador visual para submenús cuando NO está colapsado */}
        {!isCollapsed && hasSubmenu && depth === 0 && !isOpen && (
          <div className="absolute top-1 right-9 w-1 h-1 rounded-full bg-purple-600"></div>
        )}
      </Button>
      
      {/* Submenú con visualización al hover siempre */}
      {hasSubmenu && (isOpen || (isHovered && hasSubmenu)) && (
        <div 
          ref={submenuRef} 
          className="submenu"
          style={{ 
            position: "fixed",
            left: (menuRef.current?.getBoundingClientRect().right || 0) + "px",
            top: item.id === "configuracion" 
              ? "calc(100vh - 450px)"
              : (menuRef.current?.getBoundingClientRect().top || 0) + "px",
            zIndex: 99999,
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            minWidth: "16rem",
            display: isCollapsed && !isHovered && !isOpen ? "none" : "block",
            visibility: isCollapsed && !isHovered && !isOpen ? "hidden" : "visible",
            opacity: isCollapsed && !isHovered && !isOpen ? 0 : 1,
            maxHeight: item.id === "configuracion" ? "450px" : "400px",
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
              closeAllMenus={closeAllMenus}
              isMobile={isMobile}
              // Pasar el onToggle también a los elementos de submenú
              onToggle={onToggle}
              onMenuHover={onMenuHover}
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
  
  // Restauramos esta línea para evitar errores
  const { activeClinic, setActiveClinic, clinics } = useClinic()
  
  // Función ultra simple para la hamburguesa
  const handleHamburgerClick = (e: React.MouseEvent) => {
    console.log("Hamburger clicked");
    
    if (onToggle) {
      // Llamamos directamente a la función onToggle
      onToggle();
    }
  };
  
  // Restauramos la función de manejo de menús
  const handleMenuClick = (menuId: string) => {
    // Cerrar otros menús desplegables si están abiertos
    setIsUserMenuOpen(false)
    setShowNotifications(false)
    setIsClinicSelectorOpen(false)
    
    // Abrir o cerrar el menú seleccionado
    toggleMenu(menuId)
  }

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
    
    // Plegar la barra si no está en modo móvil
    if (!forceMobileView && !isCollapsed && onToggle) {
      onToggle()
    }
  }

  const filteredClinics = useMemo(() => {
    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase()) ||
        clinic.prefix.toLowerCase().includes(clinicSearchTerm.toLowerCase()),
    )
  }, [clinics, clinicSearchTerm])

  // Aplicar búsqueda solo a las clínicas activas
  const filteredActiveClinics = useMemo(() => {
    return activeClinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase()) ||
        clinic.prefix.toLowerCase().includes(clinicSearchTerm.toLowerCase()),
    )
  }, [activeClinics, clinicSearchTerm])

  // Asegurarse de que el menú de usuario se cierre cuando se hace clic en el contenido principal
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const handleMainContentClick = () => {
      setIsUserMenuOpen(false);
    };

    mainContent.addEventListener('click', handleMainContentClick);
    
    // Función para manejar clics en cualquier lugar del documento
    const handleGlobalClick = (e: MouseEvent) => {
      // No cerramos si el clic es dentro del menú o dentro del botón
      if (
        (menuRef.current && menuRef.current.contains(e.target as Node)) ||
        (avatarRef.current && avatarRef.current.contains(e.target as Node))
      ) {
        return;
      }
      
      // Si el clic es fuera, cerrar el menú
      setIsUserMenuOpen(false);
    };
    
    // Agregamos el listener con un pequeño retraso para evitar que el mismo
    // clic que abre el menú lo cierre inmediatamente
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleGlobalClick);
    }, 100);
    
    return () => {
      mainContent.removeEventListener('click', handleMainContentClick);
      document.removeEventListener('mousedown', handleGlobalClick);
      clearTimeout(timerId);
    };
  }, [isUserMenuOpen]);

  // Cerrar el menú de usuario cuando cambia la ruta
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [pathname]);

  // Posicionar correctamente el menú de usuario
  useEffect(() => {
    if (isUserMenuOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      const menuElement = document.querySelector('.user-menu') as HTMLElement;
      if (menuElement) {
        const viewportHeight = window.innerHeight;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        
        if (forceMobileView) {
          // En móvil, posicionar en la parte superior
          menuElement.style.position = "fixed";
          menuElement.style.left = "0px";
          menuElement.style.top = isIOS ? "50px" : "0px"; // En iOS dar un margen superior
          menuElement.style.width = "100%";
          menuElement.style.maxHeight = isIOS ? "90vh" : "100vh";
          menuElement.style.height = "auto";
          menuElement.style.overflowY = "auto";
          // Mejorar scroll en iOS con propiedad vendor prefixed
          (menuElement.style as any).WebkitOverflowScrolling = "touch";
          
          // Para iPhone/iOS, asegurar que esté en el viewport
          if (isIOS) {
            menuElement.style.transform = "translateZ(0)"; // Activar hardware acceleration
            setTimeout(() => {
              window.scrollTo(0, 0); // Asegurar scroll al inicio
            }, 100);
          }
        } else {
          // En escritorio, posicionar al lado del menú lateral
          const sidebarWidth = isCollapsed ? 56 : 256;
          menuElement.style.left = `${sidebarWidth}px`;
          menuElement.style.top = "auto";
          
          // Ajustar para que quede a la altura del botón de usuario
          const buttonBottom = rect.bottom;
          const menuHeight = Math.min(350, viewportHeight - 100);
          const topPosition = buttonBottom - menuHeight + 10;
          
          menuElement.style.top = `${topPosition > 10 ? topPosition : 10}px`;
          menuElement.style.maxHeight = `${menuHeight}px`;
          menuElement.style.width = "280px";
          menuElement.style.position = "fixed";
        }
        
        // Asegurarse de que sea visible
        menuElement.style.zIndex = "99999"; // Mayor z-index
        menuElement.style.overflowY = "auto";
        menuElement.style.visibility = "visible";
        menuElement.style.opacity = "1";
      }
    }
  }, [isUserMenuOpen, isCollapsed, forceMobileView]);

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

  // Limpiar todos los menús cuando cambie la barra
  useEffect(() => {
    // Solo cerrar menús, no afectar la barra
    closeAllMenus();
    setIsUserMenuOpen(false);
    setShowNotifications(false);
    setIsClinicSelectorOpen(false);
    
    // Ocultar explícitamente todos los submenús cuando la barra se colapsa
    if (isCollapsed) {
      const submenus = document.querySelectorAll('.submenu');
      submenus.forEach(submenu => {
        if (submenu instanceof HTMLElement) {
          submenu.style.display = 'none';
          submenu.style.visibility = 'hidden';
          submenu.style.opacity = '0';
        }
      });
    }
  }, [isCollapsed, closeAllMenus]);
  
  // Escuchar el evento de cambio de ruta para cerrar todos los menús
  useEffect(() => {
    const handleRouteChange = (event: Event) => {
      // Cerrar todos los menús desplegables
      closeAllMenus();
      setIsUserMenuOpen(false);
      setShowNotifications(false);
      setIsClinicSelectorOpen(false);
      setIsClinicHovered(false);
      setHoveredMenu(null);
      
      // Forzar que desaparezcan todos los submenús visibles
      const submenus = document.querySelectorAll('.submenu');
      submenus.forEach(submenu => {
        if (submenu instanceof HTMLElement) {
          submenu.style.display = 'none';
          submenu.style.visibility = 'hidden';
          submenu.style.opacity = '0';
        }
      });
      
      // Si el evento tiene el flag forced, asegurarnos de colapsar la barra si no estamos en móvil
      if (
        !forceMobileView && 
        !isCollapsed && 
        onToggle && 
        (event as CustomEvent)?.detail?.forced
      ) {
        // Pequeño timeout para permitir que la navegación ocurra primero
        setTimeout(() => {
          if (onToggle) onToggle();
        }, 50);
      }
    };
    
    const sidebarElement = document.getElementById("main-sidebar");
    if (sidebarElement) {
      sidebarElement.addEventListener("route-change", handleRouteChange);
      return () => {
        sidebarElement.removeEventListener("route-change", handleRouteChange);
      };
    }
  }, [closeAllMenus, isCollapsed, forceMobileView, onToggle]);
  
  // Limpiar cuando el ratón sale del sidebar - eliminar o modificar
  useEffect(() => {
    const handleMouseLeave = () => {
      // Solo cerrar menús, no afectar la barra
      if (isCollapsed) {
        closeAllMenus();
        setHoveredMenu(null);
      }
    };
    
    const sidebarElement = document.getElementById("main-sidebar");
    if (sidebarElement) {
      sidebarElement.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        sidebarElement.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [isCollapsed, closeAllMenus]);

  // Posicionar correctamente el menú de notificaciones
  useEffect(() => {
    if (showNotifications) {
      const buttonElement = document.getElementById('notifications-button');
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const menuElement = document.querySelector('.notifications-menu') as HTMLElement;
        if (menuElement) {
          const viewportHeight = window.innerHeight;
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
          
          // En móvil, posicionar debajo o arriba según el espacio disponible
          if (forceMobileView) {
            // En iOS, dar más margen y usar hardware acceleration
            if (isIOS) {
              menuElement.style.position = "fixed";
              menuElement.style.left = "0px";
              menuElement.style.top = "50px";
              menuElement.style.width = "100%";
              menuElement.style.maxHeight = "80vh";
              menuElement.style.transform = "translateZ(0)";
              (menuElement.style as any).WebkitOverflowScrolling = "touch";
            } else {
              const menuHeight = 320; // Altura aproximada del menú
              
              // Si no hay suficiente espacio abajo, posicionarlo arriba
              if (rect.bottom + menuHeight > viewportHeight) {
                menuElement.style.bottom = `${viewportHeight - rect.top}px`;
                menuElement.style.top = "auto";
                menuElement.style.maxHeight = `${rect.top - 10}px`;
              } else {
                // Hay espacio abajo, mostrar debajo
                menuElement.style.top = `${rect.bottom + 5}px`;
                menuElement.style.bottom = "auto";
                menuElement.style.maxHeight = `${viewportHeight - rect.bottom - 15}px`;
              }
              menuElement.style.left = "0px";
              menuElement.style.width = "100%";
            }
          } else {
            // En escritorio, a la derecha alineado con los otros menús
            menuElement.style.left = `${rect.right}px`;
            menuElement.style.top = `${rect.top}px`;
            menuElement.style.maxHeight = "80vh";
          }
          
          // Asegurarse de que sea visible
          menuElement.style.zIndex = "99999";
          menuElement.style.overflowY = "auto";
        }
      }
    }
  }, [showNotifications, isCollapsed, forceMobileView]);

  // Posicionar correctamente el selector de clínicas
  useEffect(() => {
    if ((isClinicSelectorOpen || isClinicHovered) && clinicRef.current) {
      const rect = clinicRef.current.getBoundingClientRect();
      const menuElement = document.querySelector('.clinic-selector-menu') as HTMLElement;
      if (menuElement) {
        const viewportHeight = window.innerHeight;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        
        // En móvil, posicionar el menú
        if (forceMobileView) {
          // En iOS, dar más margen y usar hardware acceleration
          if (isIOS) {
            menuElement.style.position = "fixed";
            menuElement.style.left = "0px";
            menuElement.style.top = "50px";
            menuElement.style.width = "100%";
            menuElement.style.maxHeight = "80vh";
            menuElement.style.transform = "translateZ(0)";
            (menuElement.style as any).WebkitOverflowScrolling = "touch";
          } else {
            const menuHeight = 300; // Altura aproximada del menú
            
            // Si no hay suficiente espacio abajo, posicionarlo arriba
            if (rect.bottom + menuHeight > viewportHeight) {
              menuElement.style.bottom = `${viewportHeight - rect.top}px`;
              menuElement.style.top = "auto";
              menuElement.style.maxHeight = `${rect.top - 10}px`;
            } else {
              menuElement.style.top = `${rect.bottom + 5}px`;
              menuElement.style.bottom = "auto";
              menuElement.style.maxHeight = `${viewportHeight - rect.bottom - 15}px`;
            }
            menuElement.style.left = "0px";
            menuElement.style.width = "100%";
          }
        } else {
          // En escritorio, a la derecha alineado con los otros menús
          menuElement.style.left = `${rect.right}px`;
          menuElement.style.top = `${rect.top}px`;
          menuElement.style.maxHeight = "80vh";
        }
        
        // Asegurarse de que sea visible
        menuElement.style.zIndex = "99999";
        menuElement.style.overflowY = "auto";
        menuElement.style.visibility = "visible";
        menuElement.style.opacity = "1";
      }
    }
  }, [isClinicSelectorOpen, isClinicHovered, isCollapsed, forceMobileView]);

  // Efecto para evitar problemas de scroll en iOS cuando hay un menú abierto
  useEffect(() => {
    // Comprobar si es un dispositivo iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Solo aplicar en iOS y en modo móvil
    if (isIOS && forceMobileView) {
      const isAnyMenuOpen = isUserMenuOpen || showNotifications || isClinicSelectorOpen;
      const body = document.body;
      
      if (isAnyMenuOpen) {
        // Guardar la posición actual del scroll
        const scrollPos = window.scrollY;
        body.style.position = 'fixed';
        body.style.top = `-${scrollPos}px`;
        body.style.width = '100%';
        body.style.height = '100%';
        body.style.overflow = 'hidden';
        
        // Guardar la posición del scroll como atributo de datos
        body.dataset.scrollPos = scrollPos.toString();
      } else {
        // Restaurar la posición del scroll
        if (body.style.position === 'fixed') {
          body.style.position = '';
          body.style.top = '';
          body.style.width = '';
          body.style.height = '';
          body.style.overflow = '';
          
          // Recuperar la posición del scroll guardada
          const scrollPos = parseInt(body.dataset.scrollPos || '0', 10);
          window.scrollTo(0, scrollPos);
        }
      }
    }
    
    return () => {
      // Limpiar en el desmontaje
      if (isIOS && forceMobileView) {
        const body = document.body;
        if (body.style.position === 'fixed') {
          const scrollPos = parseInt(body.dataset.scrollPos || '0', 10);
          body.style.position = '';
          body.style.top = '';
          body.style.width = '';
          body.style.height = '';
          body.style.overflow = '';
          window.scrollTo(0, scrollPos);
        }
      }
    };
  }, [isUserMenuOpen, showNotifications, isClinicSelectorOpen, forceMobileView]);

  return (
    <div
      id="main-sidebar"
      className={cn(
        "bg-white border-r flex flex-col h-screen", 
        !forceMobileView && "fixed left-0",
        isCollapsed ? "w-14" : "w-64",
        "transition-all duration-300 ease-in-out z-40",
        className,
      )}
      style={{ 
        top: 0,
        bottom: forceMobileView ? undefined : 0,
        overflowY: "auto",
      }}
    >
      {/* Header con botón hamburguesa */}
      <div className="p-2 overflow-hidden text-white bg-purple-600 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center w-full">
            {/* Botón hamburguesa completamente nuevo */}
            <div
              onClick={() => {
                console.log("TOGGLE BUTTON CLICKED");
                if (onToggle) {
                  onToggle();
                }
              }}
              className="inline-flex items-center justify-center p-1.5 mr-2 text-white rounded-md cursor-pointer hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </div>
            
            {/* Logo optimizado para ser visible colapsado y expandido */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-center">
                {hasMounted && theme?.logoUrl && !logoError ? (
                  <img 
                    src={theme.logoUrl} 
                    alt="Logo" 
                    className={cn(
                      "object-contain transition-all duration-300", 
                      isCollapsed ? "h-5 max-w-[20px]" : "h-8 max-w-[120px]"
                    )}
                    style={{
                      imageRendering: '-webkit-optimize-contrast',
                      backfaceVisibility: 'hidden'
                    }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className={cn(
                    "font-semibold truncate transition-all duration-300", 
                    isCollapsed ? "text-sm w-4" : "text-lg"
                  )}>
                    {isCollapsed ? "•" : "LOGO"}
                  </div>
                )}
              </div>
              
              {/* Mostrar fecha en dos líneas si no está colapsado */}
              {!isCollapsed && (
                <div className="text-xs truncate text-white/90 text-center">{currentDate}</div>
              )}
            </div>
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
            onMouseEnter={() => !isMobile && setShowNotifications(true)}
            onMouseLeave={() => !isMobile && setTimeout(() => setShowNotifications(false), 800)}
          >
            <button
              id="notifications-button"
              className={cn(
                "relative rounded-full hover:bg-purple-100 transition-all duration-300",
                isCollapsed ? "p-2.5" : "p-2"
              )}
              style={{
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                willChange: 'transform'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Cerrar otros menús
                setIsUserMenuOpen(false);
                setIsClinicSelectorOpen(false);
                // Alternar este menú
                setShowNotifications(!showNotifications);
              }}
              onMouseEnter={() => setShowNotifications(true)}
              onMouseLeave={() => setTimeout(() => setShowNotifications(false), 800)}
            >
              <Bell className={cn(
                "text-purple-600 transition-all duration-300",
                isCollapsed ? "w-5 h-5" : "w-5 h-5"
              )} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {showNotifications && (
              <div 
                className="fixed mt-2 w-80 bg-white rounded-md shadow-lg border overflow-hidden notifications-menu"
                style={{
                  position: "fixed", 
                  left: "auto",
                  top: "auto",
                  zIndex: 99999,
                  display: "block",
                  visibility: "visible",
                  opacity: 1,
                  maxHeight: "calc(100vh - 100px)",
                  overflowY: "auto",
                  transform: 'translate3d(0,0,0)',
                  backfaceVisibility: 'hidden',
                  willChange: 'transform',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setShowNotifications(true)}
                onMouseLeave={() => setTimeout(() => setShowNotifications(false), 800)}
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
        style={{ 
          isolation: 'isolate',
          position: 'relative',
          zIndex: 50 // Aseguramos que el contenedor tenga un z-index base
        }}
      >
        <div
          className={cn(
            "flex items-center rounded-md cursor-pointer app-sidebar-item hover:app-sidebar-hover transition-all duration-300",
            isCollapsed ? "p-3 justify-center" : "p-2"
          )}
          style={{
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            position: 'relative',
            zIndex: 50
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Cerrar otros menús
            setIsUserMenuOpen(false);
            setShowNotifications(false);
            // Alternar este menú
            setIsClinicSelectorOpen(!isClinicSelectorOpen);
          }}
          onMouseEnter={() => {
            if (!isMobile) {
              // Cerrar cualquier menú abierto antes de mostrar el selector de clínicas
              closeAllMenus();
              setIsClinicHovered(true);
            }
          }}
          onMouseLeave={() => !isMobile && setIsClinicHovered(false)}
        >
          <div className={cn(
            "flex items-center justify-center flex-shrink-0 bg-purple-100 rounded-full transition-all duration-300",
            isCollapsed ? "w-9 h-9" : "w-8 h-8"
          )}>
            <span className={cn(
              "font-medium text-purple-800 transition-all duration-300",
              isCollapsed ? "text-sm" : "text-sm"
            )}>
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

        {/* Menú selector de clínicas */}
        {(isClinicSelectorOpen || isClinicHovered) && (
          <div 
            ref={clinicMenuRef} 
            className="fixed w-80 rounded-md border bg-white shadow-lg clinic-selector-menu"
            style={{
              position: "fixed", 
              left: "auto",
              top: "auto",
              zIndex: 99999,
              display: "block",
              visibility: "visible",
              opacity: 1,
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
              transform: 'translate3d(0,0,0)',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              pointerEvents: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => !isMobile && setIsClinicHovered(true)}
            onMouseLeave={() => !isMobile && setIsClinicHovered(false)}
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
                {filteredClinics.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No hay clínicas activas</div>
                ) : (
                  filteredClinics.map((clinic) => (
                    <Button
                      key={clinic.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start px-3 py-2",
                        activeClinic?.id === clinic.id ? "bg-green-50" : "hover:bg-purple-50",
                      )}
                      onClick={() => handleClinicSelect(clinic)}
                      style={{ isolation: 'isolate' }}
                    >
                      <div className="flex items-center w-full gap-3">
                        <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg">
                          {getClinicInitials(clinic.name)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{clinic.name}</div>
                          <div className="text-xs text-gray-500">{clinic.prefix}</div>
                        </div>
                        {activeClinic?.id === clinic.id && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu items - con scroll automático e indicador solo para dispositivos táctiles */}
      <div 
        ref={sidebarMenusRef} 
        className={cn(
          "flex-1 overflow-y-auto relative",
          "py-1", // Reducido el padding vertical
          "[&>div]:mb-0.5" // Reducir el espacio entre elementos
        )}
        style={{
          // Ocultar scrollbar en webkit pero mantener funcionalidad
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.2) transparent',
          position: 'relative',
          zIndex: 40 // Menor que el selector de clínicas
        }}
      >
        {menuItems.map((item) => (
          <div 
            key={item.id} 
            className={cn(
              isCollapsed && "flex justify-center"
            )}
            style={{ position: 'relative', zIndex: 40 }}
          >
            <MenuItemComponent
              item={item}
              isCollapsed={isCollapsed}
              openMenus={openMenus}
              toggleMenu={handleMenuClick}
              closeAllMenus={closeAllMenus}
              isMobile={forceMobileView}
              onToggle={onToggle}
              onMenuHover={(hasSubmenu) => {
                // Si el elemento tiene submenú y hay hover, cerrar otros menús
                if (hasSubmenu) {
                  setShowNotifications(false);
                  setIsClinicSelectorOpen(false);
                }
              }}
            />
          </div>
        ))}
        
        {/* ScrollIndicator solo para dispositivos móviles/táctiles */}
        {forceMobileView && (
          <ScrollIndicator 
            containerRef={sidebarMenusRef}
            position="left"
            offset={{ 
              left: isCollapsed ? 32 : 128, 
              top: 20, 
              bottom: 20 
            }}
            scrollAmount={200}
            className="z-[40]"
          />
        )}
      </div>

      {/* User menu */}
      <div className="pt-2 pb-4 border-t">
        <div 
          className="relative" 
          ref={avatarRef}
        >
          <Button
            variant="ghost"
            className={cn("w-full justify-start app-sidebar-item hover:app-sidebar-hover user-menu-button", isUserMenuOpen && "bg-purple-50")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Cerrar otros menús desplegables si están abiertos
              setShowNotifications(false);
              setIsClinicSelectorOpen(false);
              // Alternar este menú
              setIsUserMenuOpen(!isUserMenuOpen);
            }}
            onMouseEnter={() => !isMobile && setIsUserMenuOpen(true)}
            onMouseLeave={() => !isMobile && setTimeout(() => setIsUserMenuOpen(false), 1500)}
          >
            <Avatar className={cn("mr-2", isCollapsed ? "w-7 h-7" : "w-8 h-8")}>
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
              className="fixed user-menu rounded-md border bg-white shadow-lg z-[99999] visible"
              style={{ 
                position: "fixed", 
                left: forceMobileView ? "0" : "auto",
                top: "auto",
                bottom: "auto",
                width: forceMobileView ? "100%" : "280px",
                display: "block",
                visibility: "visible" as const,
                opacity: 1,
                pointerEvents: "auto" as const,
                overflowY: "auto",
                maxHeight: "calc(100vh - 150px)",
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                borderRadius: '0.375rem',
                transformOrigin: 'bottom center'
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => !forceMobileView && setIsUserMenuOpen(true)}
              onMouseLeave={() => !forceMobileView && setTimeout(() => setIsUserMenuOpen(false), 1500)}
            >
              <div className="flex flex-col">
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
                        "flex items-center px-4 py-2.5 text-sm hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
                        pathname === item.href && "bg-purple-50 text-purple-600",
                      )}
                      onClick={(e) => {
                        e.stopPropagation(); // Evitar propagación del clic
                      }}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-purple-600" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="py-1 border-t">
                  <button 
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation(); // Evitar propagación
                      // Lógica de desconexión
                      console.log("Desconectando usuario");
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

