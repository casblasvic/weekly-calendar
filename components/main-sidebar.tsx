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
        const parentRect = menuRef.current.getBoundingClientRect();
        const submenuElement = submenuRef.current;
        const windowHeight = window.innerHeight;
        const buffer = 10; // Margen para evitar tocar los bordes

        // Estimar altura del submenú (ajustar si es necesario)
        // Podemos hacerlo más dinámico si contamos los items, pero una estimación suele bastar.
        const estimatedSubmenuHeight = Math.min(450, submenuElement.scrollHeight > 0 ? submenuElement.scrollHeight : 450);

        // Calcular espacio disponible arriba y abajo
        const spaceBelow = windowHeight - parentRect.bottom - buffer;
        const spaceAbove = parentRect.top - buffer;

        // Determinar posición vertical
        let topPosition;
        if (spaceBelow >= estimatedSubmenuHeight) {
          // Cabe debajo: alinear con el top del padre
          topPosition = parentRect.top;
        } else if (spaceAbove >= estimatedSubmenuHeight) {
          // No cabe abajo pero sí arriba: alinear con el bottom del padre hacia arriba
          topPosition = parentRect.bottom - estimatedSubmenuHeight;
        } else {
          // No cabe bien en ningún lado: intentar centrar o ponerlo donde más quepa
          // Opción: Posicionar arriba y limitar altura máxima
          topPosition = buffer;
          // (La altura máxima se ajustará después)
        }

        // Asegurar que no se salga por arriba
        topPosition = Math.max(buffer, topPosition);

        // Calcular altura máxima permitida
        const maxHeight = windowHeight - topPosition - buffer;

        // Aplicar estilos
        submenuElement.style.display = "block";
        submenuElement.style.position = "fixed";
        submenuElement.style.left = `${parentRect.right + 4}px`; // Añadir pequeño espacio
        submenuElement.style.top = `${topPosition}px`;
        submenuElement.style.maxHeight = `${maxHeight}px`;
        submenuElement.style.overflowY = "auto";
        submenuElement.style.zIndex = "99999";
        submenuElement.style.backgroundColor = "white";
        submenuElement.style.border = "1px solid #e5e7eb";
        submenuElement.style.borderRadius = "0.375rem";
        submenuElement.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        submenuElement.style.minWidth = "16rem";
        submenuElement.style.visibility = "visible";
        submenuElement.style.opacity = "1";

      } catch (error) {
        console.error("Error al actualizar el estilo del submenú:", error);
      }
    } else if (submenuRef.current && !(isOpen || (isHovered && hasSubmenu))) {
      // Ocultar si no está abierto ni hovered
      submenuRef.current.style.display = 'none';
      submenuRef.current.style.visibility = 'hidden';
      submenuRef.current.style.opacity = '0';
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
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()
  const { theme } = useTheme()
  const [hasMounted, setHasMounted] = useState(false)
  const [isClinicSelectorOpen, setIsClinicSelectorOpen] = useState(false)
  const [isClinicHovered, setIsClinicHovered] = useState(false)
  const clinicHoverTimerRef = useRef<NodeJS.Timeout | null>(null)
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
  
  // Mejorar la función de manejo de menús para cerrar también el selector de clínicas
  const handleMenuClick = (menuId: string) => {
    // Cerrar otros menús desplegables si están abiertos
    setIsUserMenuOpen(false)
    setIsClinicSelectorOpen(false)
    setIsClinicHovered(false)
    
    // Abrir o cerrar el menú seleccionado
    toggleMenu(menuId)
  }

  // Mejorar el manejo de hover en los menús
  const handleMenuHover = (hasSubmenu: boolean) => {
    // Si el elemento tiene submenú, cerrar otros menús como el selector de clínicas
    if (hasSubmenu) {
      setIsClinicSelectorOpen(false)
      setIsClinicHovered(false)
    }
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
    // Filtrar para mostrar solo clínicas activas
    return clinics.filter(clinic => clinic.isActive === true);
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
    // Usar activeClinics en lugar de clinics para mostrar solo las activas
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
    if ((isClinicSelectorOpen || isClinicHovered) && clinicRef.current) {
      const rect = clinicRef.current.getBoundingClientRect();
      const menuElement = document.querySelector('.clinic-selector-menu') as HTMLElement;
      if (menuElement) {
        const viewportHeight = window.innerHeight;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        
        // En móvil, posicionar el menú de manera más compacta y sin ocupar toda la pantalla
        if (forceMobileView) {
          // Posicionamiento mejorado para móvil
          menuElement.style.position = "fixed";
          menuElement.style.left = "auto";
          menuElement.style.right = "10px"; // Alinear a la derecha
          menuElement.style.top = `${rect.bottom + 5}px`;
          menuElement.style.width = "85%"; // No ocupar toda la pantalla
          menuElement.style.maxHeight = "60vh";
          menuElement.style.transform = "none";
        } else {
          // En escritorio, a la derecha alineado con los otros menús
          menuElement.style.left = `${rect.right}px`;
          menuElement.style.top = `${rect.top}px`;
          menuElement.style.maxHeight = "80vh";
        }
        
        // Asegurarse de que sea visible
        menuElement.style.zIndex = "99";
        menuElement.style.overflowY = "auto";
        menuElement.style.visibility = "visible";
        menuElement.style.opacity = "1";
      }
    }
  }, [isClinicSelectorOpen, isClinicHovered, isCollapsed, forceMobileView]);

  // Limpiar todos los menús cuando cambie la barra
  useEffect(() => {
    // Solo cerrar menús, no afectar la barra
    closeAllMenus();
    setIsUserMenuOpen(false);
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

  // Efecto para evitar problemas de scroll en iOS cuando hay un menú abierto
  useEffect(() => {
    // Comprobar si es un dispositivo iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Solo aplicar en iOS y en modo móvil
    if (isIOS && forceMobileView) {
      const isAnyMenuOpen = isUserMenuOpen || isClinicSelectorOpen;
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
  }, [isUserMenuOpen, isClinicSelectorOpen, forceMobileView]);

  // Manejar el cambio de visibilidad de la barra lateral en móvil
  const toggleMobileSidebar = () => {
    // Esta función ahora debería comunicarse con el componente padre
    if (onToggle) {
      onToggle();
    }
    console.log("Toggle mobile sidebar");
    
    // Para iOS, forzar reflow y restablecer posición
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      // Forzar reflow y mejorar posicionamiento
      document.body.style.webkitTransform = 'scale(1)';
      setTimeout(() => {
        document.body.style.webkitTransform = '';
      }, 0);
    }
  }

  // Función mejorada para manejar el fin del hover con delay
  const handleClinicMouseLeave = () => {
    if (!isMobile) {
      // Limpiar cualquier timer existente
      if (clinicHoverTimerRef.current) {
        clearTimeout(clinicHoverTimerRef.current)
      }
      
      // Cerrar el menú inmediatamente para evitar que interfiera con otros menús
      setIsClinicHovered(false)
      
      // Si hay un clic explícito (selector abierto), cerrar con un pequeño retraso
      if (isClinicSelectorOpen) {
        clinicHoverTimerRef.current = setTimeout(() => {
          setIsClinicSelectorOpen(false)
        }, 300)
      }
    }
  }

  // Función para cancelar el timer de hover al volver a entrar
  const handleClinicMouseEnter = () => {
    if (!isMobile) {
      // Limpiar cualquier timer existente
      if (clinicHoverTimerRef.current) {
        clearTimeout(clinicHoverTimerRef.current)
      }
      
      setIsClinicHovered(true)
    }
  }

  // Efecto para cerrar el menú de clínicas cuando se hace clic fuera
  useEffect(() => {
    if (!isClinicSelectorOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      // No cerramos si el clic es dentro del menú o dentro del botón
      if (
        (clinicMenuRef.current && clinicMenuRef.current.contains(e.target as Node)) ||
        (clinicRef.current && clinicRef.current.contains(e.target as Node))
      ) {
        return;
      }
      
      // Si el clic es fuera, cerrar el menú y el estado hover
      setIsClinicSelectorOpen(false);
      setIsClinicHovered(false);
    };
    
    // Agregamos el listener con un pequeño retraso para evitar conflictos
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      clearTimeout(timerId);
    };
  }, [isClinicSelectorOpen]);

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
                    alt="Logo de la clínica" 
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

      {/* Clinic selector */}
      <div
        ref={clinicRef}
        className="relative p-2 border-b"
        style={{ 
          isolation: 'isolate',
          position: 'relative',
          zIndex: 50 // Aseguramos que el contenedor tenga un z-index base
        }}
        onMouseEnter={handleClinicMouseEnter}
        onMouseLeave={handleClinicMouseLeave}
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
            // Alternar este menú
            setIsClinicSelectorOpen(!isClinicSelectorOpen);
          }}
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
            className="fixed mt-2 w-80 bg-white rounded-md shadow-lg border overflow-hidden clinic-selector-menu"
            style={{
              position: "fixed", 
              left: "auto",
              top: "auto",
              zIndex: 99999,
              display: "block",
              visibility: "visible",
              opacity: 1
            }}
            onClick={(e) => {
              // Detener la propagación del clic, pero permitir que el menú se cierre
              // cuando se hace clic fuera
              e.stopPropagation()
            }}
            onMouseEnter={handleClinicMouseEnter}
            onMouseLeave={handleClinicMouseLeave}
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
              onMenuHover={handleMenuHover}
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

