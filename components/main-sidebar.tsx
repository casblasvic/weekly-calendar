"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, Search, User, LogOut, Settings, CreditCard, Receipt, Menu, Bell, Calendar, MoreVertical, ClipboardList, LogIn } from "lucide-react"
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
import { useSession, signIn, signOut } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"

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
    if ((isOpen || (isHovered && hasSubmenu && openMenus.size === 0 && depth === 0)) && submenuRef.current && menuRef.current) {
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
    } else if (submenuRef.current && !(isOpen || (isHovered && hasSubmenu && openMenus.size === 0 && depth === 0))) {
      // Ocultar si no está abierto ni hovered
      submenuRef.current.style.display = 'none';
      submenuRef.current.style.visibility = 'hidden';
      submenuRef.current.style.opacity = '0';
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu, item.id, openMenus.size, depth]);

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
      
      {/* Submenú - Condición modificada para evitar mostrar al hover si otro menú está abierto por clic */}
      {hasSubmenu && (isOpen || (isHovered && hasSubmenu && openMenus.size === 0 && depth === 0)) && (
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

// --- Inicio: Funciones Helper para Avatar --- 
const getUserInitials = (firstName?: string, lastName?: string): string => {
  const firstInitial = firstName?.[0] ?? "";
  const lastInitial = lastName?.[0] ?? "";
  return `${firstInitial}${lastInitial}`.toUpperCase() || "U"; // "U" como fallback
};

const getUserFullName = (firstName?: string, lastName?: string): string => {
  return `${firstName ?? "Usuario"} ${lastName ?? "Desconocido"}`.trim();
};
// --- Fin: Funciones Helper para Avatar --- 

export function MainSidebar({ className, isCollapsed, onToggle, forceMobileView = false, allowHoverEffects = true, showUserMenu: initialShowUserMenu = true }: SidebarProps) {
  const [isHovering, setIsHovering] = useState(false);
  const { data: session, status } = useSession(); // Obtener estado de sesión
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
  const { activeClinic, setActiveClinic, clinics } = useClinic()
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const userMenuHoverTimeout = useRef<NodeJS.Timeout | null>(null); // Timer para el hover del menú de usuario
  
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

  // --- Inicio: Cálculo de iniciales y nombre completo del usuario --- 
  const userInitials = useMemo(() => {
    if (status === "authenticated" && session.user) {
      return getUserInitials(session.user.firstName, session.user.lastName);
    }
    return ".."; // Placeholder mientras carga o no autenticado
  }, [session, status]);

  const userFullName = useMemo(() => {
      if (status === "authenticated" && session.user) {
        return getUserFullName(session.user.firstName, session.user.lastName);
      }
      return "Usuario Desconectado";
  }, [session, status]);
  
  const userEmail = useMemo(() => {
      if (status === "authenticated" && session.user) {
        return session.user.email ?? "";
      }
      return "";
  }, [session, status]);
  // --- Fin: Cálculo de iniciales y nombre completo del usuario --- 

  // Posicionar correctamente el menú de usuario (Lógica Mejorada)
  useEffect(() => {
    if (status === "authenticated" && isUserMenuOpen && avatarRef.current && menuRef.current) {
      const buttonRect = avatarRef.current.getBoundingClientRect();
      const menuElement = menuRef.current;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const buffer = 10; // Margen para evitar tocar bordes

      // Estilos base
      menuElement.style.position = "fixed";
      menuElement.style.zIndex = "99999";
      menuElement.style.width = "280px"; // Ancho fijo del menú
      menuElement.style.visibility = "visible";
      menuElement.style.opacity = "1";
      menuElement.style.overflowY = "auto";

      // Calcular Posición Horizontal
      const sidebarRight = buttonRect.right; // Borde derecho del botón (o del sidebar si está colapsado)
      const spaceRight = viewportWidth - sidebarRight - buffer;
      
      if (spaceRight >= 280) {
        // Cabe a la derecha
        menuElement.style.left = `${sidebarRight + 4}px`; // Pequeño margen
        menuElement.style.right = "auto";
      } else {
        // No cabe, posicionar a la izquierda del botón/sidebar
        menuElement.style.left = "auto";
        menuElement.style.right = `${viewportWidth - buttonRect.left + 4}px`;
      }

      // Calcular Posición Vertical y Altura Máxima
      const menuHeightEstimate = Math.min(350, viewportHeight - (2 * buffer)); // Estimar altura o usar scrollHeight si es fiable
      const spaceBelow = viewportHeight - buttonRect.top - buffer;
      const spaceAbove = buttonRect.bottom - buffer;
      
      let topPosition;
      let maxHeight;
      
      if (spaceBelow >= menuHeightEstimate) {
        // Cabe debajo alineado con el top del botón
        topPosition = buttonRect.top;
        maxHeight = spaceBelow;
      } else if (spaceAbove >= menuHeightEstimate) {
        // Cabe arriba alineado con el bottom del botón
        topPosition = buttonRect.bottom - menuHeightEstimate; // Estimación inicial
        maxHeight = spaceAbove;
      } else {
        // No cabe bien, poner arriba con altura máxima
        topPosition = buffer;
        maxHeight = viewportHeight - (2 * buffer);
      }
      
      // Ajustar topPosition si se sale por arriba
      topPosition = Math.max(buffer, topPosition);
      
      // Ajustar maxHeight final basado en topPosition
      maxHeight = Math.min(maxHeight, viewportHeight - topPosition - buffer);

      menuElement.style.top = `${topPosition}px`;
      menuElement.style.maxHeight = `${maxHeight}px`;
      menuElement.style.bottom = "auto"; // Asegurar que bottom no interfiera

    } else if (menuRef.current) {
        // Ocultar si no debe mostrarse
        menuRef.current.style.visibility = "hidden";
        menuRef.current.style.opacity = "0";
    }
  }, [status, isUserMenuOpen, isCollapsed, forceMobileView]); // Dependencias clave

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

  // --- Funciones Hover/Click Clínica (MEJORADAS) ---
  const handleClinicMouseEnter = useCallback(() => {
    if (clinicHoverTimerRef.current) {
      clearTimeout(clinicHoverTimerRef.current);
      clinicHoverTimerRef.current = null;
    }
    // Abrir con hover solo si no hay otro menú principal abierto
    if (!forceMobileView && openMenus.size === 0) { 
      setIsClinicHovered(true);
    }
  }, [forceMobileView, openMenus.size]);

  const handleClinicMouseLeave = useCallback(() => {
    // Cerrar con retraso
    if (!forceMobileView) { 
      clinicHoverTimerRef.current = setTimeout(() => {
        setIsClinicHovered(false);
        // No cerrar si está abierto por clic
        // setIsClinicSelectorOpen(false); 
      }, 300); 
    }
  }, [forceMobileView]);

  const handleClinicClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Cerrar otros menús
    setIsUserMenuOpen(false);
    closeAllMenus(); 
    // Limpiar timer de hover por si acaso
    if (clinicHoverTimerRef.current) {
      clearTimeout(clinicHoverTimerRef.current);
      clinicHoverTimerRef.current = null;
    }
    // Alternar estado de clic y asegurar hover desactivado
    setIsClinicSelectorOpen(prev => !prev);
    setIsClinicHovered(false); 
  }, [closeAllMenus]);
  // --- Fin Funciones Clínica ---

  // --- useEffect para Posicionar Menú Clínica (Vertical Ajustado) ---
  useEffect(() => {
    const clinicButton = clinicRef.current;
    const clinicMenu = clinicMenuRef.current;
    const shouldShow = isClinicSelectorOpen || (isClinicHovered && openMenus.size === 0);

    if (shouldShow && clinicButton && clinicMenu) {
      const buttonRect = clinicButton.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const buffer = 10;

      // Posición Horizontal (sin cambios)
      const sidebarRight = buttonRect.right;
      const spaceRight = viewportWidth - sidebarRight - buffer;
      const menuWidth = 320;
      let leftPosition;
      if (spaceRight >= menuWidth || isCollapsed) {
        leftPosition = `${sidebarRight + 4}px`;
      } else {
        leftPosition = `${viewportWidth - menuWidth - buffer}px`; 
      }
      
      // --- RECALCULAR Posición Vertical (Alinear con top del botón) --- 
      const menuHeightEstimate = Math.min(viewportHeight * 0.7, 500); 
      const spaceBelow = viewportHeight - buttonRect.top - buffer; // Espacio desde el top del botón hacia abajo
      const spaceAbove = buttonRect.bottom - buffer; // Espacio desde el bottom del botón hacia arriba
      let topPosition;
      let maxHeight;

      if (spaceBelow >= menuHeightEstimate) {
        // Cabe debajo, alinear top con top
        topPosition = buttonRect.top;
        maxHeight = spaceBelow;
      } else if (spaceAbove >= menuHeightEstimate) {
        // Cabe arriba, alinear bottom del menú con bottom del botón
        topPosition = buttonRect.bottom - menuHeightEstimate;
        maxHeight = spaceAbove;
      } else {
        // No cabe bien, posicionar arriba y limitar altura
        topPosition = buffer;
        maxHeight = viewportHeight - (2 * buffer);
      }

      topPosition = Math.max(buffer, topPosition); // Evitar que se salga por arriba
      maxHeight = Math.max(100, maxHeight); // Altura mínima
      maxHeight = Math.min(maxHeight, viewportHeight - topPosition - buffer); // Ajuste final max height
      
      // Aplicar estilos
      clinicMenu.style.position = "fixed";
      clinicMenu.style.zIndex = "99999";
      clinicMenu.style.left = leftPosition;
      clinicMenu.style.top = `${topPosition}px`; // <<< USAR NUEVO topPosition
      clinicMenu.style.width = `${menuWidth}px`;
      clinicMenu.style.maxHeight = `${maxHeight}px`; // <<< USAR NUEVO maxHeight
      clinicMenu.style.overflowY = "auto";
      clinicMenu.style.visibility = "visible";
      clinicMenu.style.opacity = "1";
      clinicMenu.style.display = "block";

    } else if (clinicMenu) {
      // Ocultar si no debe mostrarse
      clinicMenu.style.visibility = "hidden";
      clinicMenu.style.opacity = "0";
    }
  }, [isClinicSelectorOpen, isClinicHovered, isCollapsed, openMenus.size]); // Dependencias clave
  // --- Fin useEffect Posición Menú Clínica ---

  // --- useEffect para Cerrar Menús al Colapsar Sidebar (NUEVO) ---
  useEffect(() => {
    if (isCollapsed) {
       closeAllMenus();
       setIsClinicSelectorOpen(false);
       setIsClinicHovered(false);
       setIsUserMenuOpen(false);
       // Limpiar timers de hover por si acaso
       if (userMenuHoverTimeout.current) {
           clearTimeout(userMenuHoverTimeout.current);
           userMenuHoverTimeout.current = null;
       }
        if (clinicHoverTimerRef.current) {
           clearTimeout(clinicHoverTimerRef.current);
           clinicHoverTimerRef.current = null;
       }
    }
  }, [isCollapsed, closeAllMenus]); // Dependencia: isCollapsed
  // --- Fin useEffect Cerrar Menús ---

  // Handler de scroll
  const handleScroll = useCallback(() => {
    // ... (lógica de scroll) ...
  }, []);

  // --- Funciones para Hover Menú Usuario (RESTAURADAS) ---
  const handleUserMenuEnter = useCallback(() => {
    if (userMenuHoverTimeout.current) {
      clearTimeout(userMenuHoverTimeout.current);
      userMenuHoverTimeout.current = null;
    }
    // Abrir solo en escritorio y si está autenticado
    if (!forceMobileView && status === "authenticated") { 
      setIsUserMenuOpen(true);
    }
  }, [forceMobileView, status]);

  const handleUserMenuLeave = useCallback(() => {
    // Cerrar con retraso solo en escritorio
    if (!forceMobileView) { 
      userMenuHoverTimeout.current = setTimeout(() => {
        setIsUserMenuOpen(false);
      }, 300); // Retraso de 300ms
    }
  }, [forceMobileView]);
  // --- Fin Funciones Hover Menú Usuario ---

  return (
    <div
      id="main-sidebar"
      className={cn(
        "bg-white border-r flex flex-col h-screen fixed left-0 z-40",
        isCollapsed ? "w-14" : "w-64",
        className
      )}
      style={{ 
        top: 0,
        bottom: 0,
        overflowY: 'auto',
        transition: isCollapsed ? 'width 0.3s ease-in-out' : 'width 0.3s ease-in-out'
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

      {/* Clinic selector - Aplicar nuevos handlers */}
      <div
        ref={clinicRef} // Ref para calcular posición
        className="relative p-2 border-b"
        style={{ zIndex: 50 }}
        onMouseEnter={handleClinicMouseEnter} // <<< AÑADIDO
        onMouseLeave={handleClinicMouseLeave} // <<< AÑADIDO
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
          onClick={handleClinicClick} // <<< USAR NUEVO HANDLER
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

        {/* Menú selector de clínicas - Condición y estilos modificados */}
        {(isClinicSelectorOpen || (isClinicHovered && openMenus.size === 0)) && ( // <<< CONDICIÓN MODIFICADA
          <div 
            ref={clinicMenuRef} // Ref para aplicar estilos
            className="fixed mt-2 w-80 bg-white rounded-md shadow-lg border overflow-hidden clinic-selector-menu" // Clases base
            style={{ 
              // Quitar estilos inline de posición, ahora se manejan en useEffect
              visibility: 'hidden', // Empezar oculto
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out' // Añadir transición suave
            }}
            onClick={(e) => e.stopPropagation()} 
            onMouseEnter={handleClinicMouseEnter} // Mantener abierto al entrar al menú
            onMouseLeave={handleClinicMouseLeave} // Iniciar cierre al salir del menú
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
          {/* Botón principal del menú de usuario */} 
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start app-sidebar-item hover:app-sidebar-hover user-menu-button", 
              isUserMenuOpen && status === "authenticated" && "bg-purple-50", // Solo activo si está autenticado
              status === "loading" && "cursor-wait"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (status === "authenticated") {
                // El clic ahora solo alterna si ya estaba cerrado por hover
                // o si estamos en móvil donde no hay hover.
                if (!isUserMenuOpen || forceMobileView) {
                  setIsClinicSelectorOpen(false);
                  setIsUserMenuOpen(!isUserMenuOpen);
                } else {
                  // Si ya estaba abierto por hover, el clic no hace nada 
                  // o podrías decidir cerrarlo.
                  // Por ahora, no hace nada extra al click si ya está abierto por hover.
                }
              } else if (status === "unauthenticated") {
                signIn();
              }
            }}
            onMouseEnter={handleUserMenuEnter}
            onMouseLeave={handleUserMenuLeave}
            disabled={status === "loading"}
          >
            {/* Avatar y Nombre/Email */} 
            {status === "loading" ? (
                <>
                  <Skeleton className={cn("rounded-full mr-2", isCollapsed ? "w-7 h-7" : "w-8 h-8")} />
                  {!isCollapsed && (
                    <div className="flex flex-col items-start space-y-1">
                       <Skeleton className="h-4 w-24" />
                       <Skeleton className="h-3 w-32" />
                     </div>
                   )}
                 </>
             ) : status === "authenticated" ? (
               <>
                 <Avatar className={cn("mr-2", isCollapsed ? "w-7 h-7" : "w-8 h-8")}>
                   <AvatarFallback>{userInitials}</AvatarFallback>
                 </Avatar>
                 {!isCollapsed && (
                   <div className="flex flex-col items-start overflow-hidden">
                     <span className="text-sm font-medium truncate w-full">{userFullName}</span>
                     <span className="text-xs text-gray-500 truncate w-full">{userEmail}</span>
                   </div>
                 )}
               </>
             ) : ( // status === "unauthenticated"
               <>
                 <LogIn className={cn("text-gray-600", isCollapsed ? "w-5 h-5 mx-auto" : "w-4 h-4 mr-2")} />
                 {!isCollapsed && (
                   <span className="text-sm font-medium">Iniciar Sesión</span>
                 )}
               </>
             )}
          </Button>

          {/* Menú desplegable (solo si está autenticado) */} 
          {status === "authenticated" && isUserMenuOpen && (
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
              onMouseEnter={handleUserMenuEnter}
              onMouseLeave={handleUserMenuLeave}
            >
              <div className="flex flex-col">
                {/* Cabecera del menú desplegable */} 
                <div className="flex items-center gap-3 p-3 border-b">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{userFullName}</span>
                    <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                  </div>
                </div>
                {/* Items del menú (Perfil, etc.) */} 
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
                        setIsUserMenuOpen(false); // Cerrar menú al hacer clic
                      }}
                    >
                      <item.icon className="w-4 h-4 mr-3 text-purple-600" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
                {/* Botón Desconectar */} 
                <div className="py-1 border-t">
                  <button 
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      signOut({ callbackUrl: '/' }); // Desconectar y redirigir a la raíz
                      setIsUserMenuOpen(false);
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

