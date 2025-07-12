"use client"

/*
 * 📂 MainSidebar — Prefetch de rutas y limpieza de caché en logout
 * ----------------------------------------------------------------
 * Este componente ejecuta `router.prefetch` (IndexedDB friendly) y
 * borra React-Query + IndexedDB al cerrar sesión.
 * @see docs/PERSISTENT_CACHE_STRATEGY.md
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, Search, User, LogOut, Settings, CreditCard, Receipt, Menu, Bell, Calendar, MoreVertical, ClipboardList, LogIn } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { menuItems, type MenuItem, processMenuItemsWithIntegrations } from "@/config/menu-structure"
import { useIntegrationModules } from "@/hooks/use-integration-modules"
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
import useOnClickOutside from "@/lib/hooks/use-on-click-outside"
import { useOpenTicketsCountQuery } from "@/lib/hooks/use-ticket-query"
import { useOpenCashSessionsCountQuery } from "@/lib/hooks/use-cash-session-query"
import { TicketStatus } from "@prisma/client"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"

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

  const toggleMenu = useCallback((menuId: string, itemDepth: number) => { 
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(menuId)) {
        next.delete(menuId)
      } else {
        if (itemDepth === 0) {
          next.clear()
        }
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
  toggleMenu: (id: string, depth: number) => void
  closeAllMenus: () => void
  isMobile?: boolean
  onToggle?: () => void
  onMenuHover?: (hasSubmenu: boolean) => void
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { activeClinic } = useClinic(); // Para el prefijo de la clínica en el menú

  // Referencias para el manejo de clics fuera y posicionamiento
  const menuButtonRef = useRef<HTMLDivElement>(null); // Ref para el botón que abre el submenú
  const submenuContainerRef = useRef<HTMLDivElement>(null); // Ref para el contenedor del submenú flotante
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref para el temporizador de hover

  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isOpen = openMenus.has(item.id)
  const [isHovered, setIsHovered] = useState(false)

  // 🔧 CORREGIDO: Condición para mostrar el submenú
  // Solo mostrar por hover si NO está abierto por clic y no hay otros menús abiertos
  const showSubmenu = isOpen || (isHovered && hasSubmenu && !isOpen && ((depth === 0 && openMenus.size === 0) || depth > 0));

  // Limpiar el temporizador al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useOnClickOutside(
    [submenuContainerRef, menuButtonRef], 
    () => {
      if (isOpen) {
        toggleMenu(item.id, depth); 
      }
      // 🔧 AÑADIDO: También cerrar hover al hacer clic fuera
      setIsHovered(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    },
    isOpen || isHovered // 🔧 CORREGIDO: Activar también cuando hay hover
  );

  // 🔧 CORREGIDO: handleClick mejorado para manejar hover y click correctamente
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Si el item está deshabilitado, no hacer nada
    if (item.isDisabled) {
      return;
    }
    
    if (hasSubmenu) {
      // 🔧 Al hacer clic, resetear hover para evitar conflictos
      setIsHovered(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      toggleMenu(item.id, depth);
      return;
    }
    
    if (item.href) {
      closeAllMenus();
      
      const mainSidebar = document.getElementById('main-sidebar');
      if (mainSidebar) {
        const routeChangeEvent = new CustomEvent('route-change', {
          detail: { 
            path: item.href,
            forced: depth > 0 
          }
        });
        mainSidebar.dispatchEvent(routeChangeEvent);
      }
      
      router.push(item.href);
    }
  };

  // Efecto para posicionar y mostrar el submenú cuando está abierto o con hover
  useEffect(() => {
    if (showSubmenu && submenuContainerRef.current && menuButtonRef.current) {
      try {
        const parentRect = menuButtonRef.current.getBoundingClientRect();
        const submenuElement = submenuContainerRef.current;
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
        submenuElement.style.left = `${parentRect.right + 2}px`; // 🔧 Reducido gap de 4px a 2px
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
        // 🔧 Añadir un pequeño padding invisible para mejor área de hover
        submenuElement.style.paddingLeft = "2px";

      } catch (error) {
        console.error("Error al actualizar el estilo del submenú:", error);
      }
    } else if (submenuContainerRef.current && !showSubmenu) { 
      submenuContainerRef.current.style.display = 'none';
      submenuContainerRef.current.style.visibility = 'hidden';
      submenuContainerRef.current.style.opacity = '0';
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu, item.id, openMenus.size, depth]);

  return (
    <div 
      ref={menuButtonRef} 
      className="relative my-1"
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        // 🔧 Activación inmediata para mejor responsividad
        setIsHovered(true);
        if (onMenuHover) {
          onMenuHover(hasSubmenu);
        }
      }}
      onMouseLeave={() => {
        // 🔧 CORREGIDO: Lógica de mouse leave más clara
        // Siempre quitar el hover, pero con delay si no está abierto por clic
        if (!isOpen) { 
          hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
          }, 300); // 🔧 Reducido a 300ms para mejor responsividad
        } else {
          // Si está abierto por clic, quitar hover inmediatamente sin afectar el menú
          setIsHovered(false);
        }
      }}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start",
          isOpen && "bg-purple-50 text-purple-600",
          item.isDisabled 
            ? "opacity-50 cursor-not-allowed text-gray-400" 
            : "hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
          depth > 0 && "pl-4",
          isCollapsed && "px-2",
        )}
        onClick={handleClick}
        disabled={item.isDisabled}
        title={item.isDisabled ? item.disabledReason : undefined}
      >
        <div className="relative">
          {item.icon && <item.icon className={cn(
            item.isDisabled 
              ? "text-gray-400" 
              : "text-purple-600 transition-all duration-200", 
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
        {/* Updated Badge Logic: Shows a red dot if badge is true, otherwise shows standard badge */}
        {typeof item.badge === 'boolean' && item.badge === true ? (
          <span className="w-2 h-2 ml-auto bg-red-500 rounded-full"></span>
        ) : (
          item.badge && typeof item.badge !== 'boolean' && item.badge !== 0 && String(item.badge).trim() !== '' && String(item.badge).trim() !== '...' &&  (
            <span
              className={cn(
                'ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out',
                'bg-destructive text-destructive-foreground',
                {
                  'group-hover:bg-destructive/90': true,
                },
                isCollapsed && depth === 0 
                  ? 'absolute top-1 right-1 text-[10px] p-0.5 leading-none transform translate-x-1/2 -translate-y-1/2' 
                  : 'relative',
                isCollapsed && depth > 0 && !isHovered && 'hidden',
                isCollapsed && depth === 0 && !isOpen && !isHovered && item.submenu && item.submenu.length > 0 && 'opacity-0 group-hover:opacity-100'
              )}
            >
              {String(item.badge)}
            </span>
          )
        )}
        {(!isCollapsed || depth > 0) && hasSubmenu && (
          <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
        )}
      </Button>
      
      {/* Submenú - Condición MODIFICADA para usar showSubmenu */} 
      {hasSubmenu && showSubmenu && (
        <div 
          ref={submenuContainerRef}
          className="submenu"
          style={{ 
            position: "fixed",
            left: (menuButtonRef.current?.getBoundingClientRect().right || 0) + 2 + "px", // 🔧 Gap reducido a 2px
            top: item.id === "configuracion" 
              ? "calc(100vh - 450px)"
              : (menuButtonRef.current?.getBoundingClientRect().top || 0) + "px",
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
          onMouseEnter={() => { // Cuando el ratón entra al submenú
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current); // Cancelar el timer de cierre del padre
              hoverTimeoutRef.current = null;
            }
            // 🔧 Asegurar que el hover permanece activo al entrar al submenu
            setIsHovered(true);
          }}
          onMouseLeave={(e) => { // Cuando el ratón sale del submenú
            // 🔧 CORREGIDO: Verificar si vuelve a la sidebar
            const relatedTarget = e.relatedTarget as Element | null;
            const isReturningToSidebar = relatedTarget && 
              typeof relatedTarget.closest === 'function' && 
              relatedTarget.closest('#main-sidebar');
            
            // Si el menú padre no estaba abierto por clic y no vuelve a sidebar
            if (!isOpen && !isReturningToSidebar) { 
              // 🔧 INMEDIATO: Sin delay para colapso rápido
              setIsHovered(false);
            } else if (!isOpen && isReturningToSidebar) {
              // Si vuelve a sidebar, pequeño delay para transición suave
              hoverTimeoutRef.current = setTimeout(() => {
                setIsHovered(false);
              }, 50);
            }
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
              // No pasar onMenuHover a los items del submenú flotante si no es necesario
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
  const queryClient = useQueryClient();
  
  // 🔧 NUEVO: Estados para auto-colapso al salir del hover
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const sidebarCollapseTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Hook para verificar módulos de integración
  const {
    isShellyActive,
    hasActiveIoTModules,
    isModuleActive,
    hasActiveCategoryModules,
    isLoading: isLoadingIntegrations,
  } = useIntegrationModules();
  
  // <<< INICIO: Query para el conteo de tickets abiertos >>>
  const clinicIdForQuery = activeClinic?.id ? String(activeClinic.id) : null; // Asegurar que es string o null
  const { data: openTicketsCountData, isLoading: isLoadingTicketsCount } = useOpenTicketsCountQuery(
    clinicIdForQuery,
    {
      // Solo hacer la query si clinicIdForQuery no es null
      enabled: !!clinicIdForQuery, 
      // Podríamos añadir un staleTime si queremos que el conteo no se actualice tan frecuentemente
      // staleTime: CACHE_TIME.CORTO, 
    }
  );
  const openTicketsCount = openTicketsCountData ?? 0;

  const { data: openCashCountData, isLoading: isLoadingCashCount } = useOpenCashSessionsCountQuery(clinicIdForQuery);
  const openCashCount = openCashCountData ?? 0;
  // <<< FIN: Query para el conteo de tickets abiertos >>>

  // Prefetch de todas las rutas del menú para navegación instantánea
  useEffect(() => {
    const links: string[] = [];
    const collect = (items: any[]) => {
      items?.forEach((it) => {
        if (it.href) links.push(it.href);
        if (it.submenu) collect(it.submenu);
      });
    };
    collect(menuItems);
    links.forEach((href) => router.prefetch(href));
  }, [menuItems, router]);

  // Hook para cerrar el menú de usuario al hacer clic fuera
  useOnClickOutside(
    [avatarRef], // Escuchar clics fuera del avatar
    () => {
      if (isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    },
    isUserMenuOpen // Activar solo si el menú de usuario está abierto
  );

  // Hook para cerrar el selector de clínica al hacer clic fuera
  useOnClickOutside(
    [clinicMenuRef, clinicRef], // Escuchar clics fuera del dropdown Y del botón de clínica
    () => {
      if (isClinicSelectorOpen || isClinicHovered) {
        setIsClinicSelectorOpen(false);
        setIsClinicHovered(false); // También desactivar el estado de hover
      }
    },
    isClinicSelectorOpen || isClinicHovered // Activar si está abierto por clic o hover
  );
  
  // Función ultra simple para la hamburguesa
  const handleHamburgerClick = (e: React.MouseEvent) => {
    if (onToggle) {
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
    toggleMenu(menuId, 0)
  }

  // 🔧 CORREGIDO: Manejo de hover en los menús sin interferir con elementos normales
  const handleMenuHover = (hasSubmenu: boolean) => {
    // Si el elemento tiene submenú, cerrar otros menús como el selector de clínicas
    if (hasSubmenu) {
      setIsClinicSelectorOpen(false)
      setIsClinicHovered(false)
      // También podríamos cerrar el menú de usuario si estuviera abierto
      // setIsUserMenuOpen(false); 
      
      // 🔧 CORREGIDO: Solo mantener sidebar hover activo para submenús flotantes
      // NO interferir con elementos normales de la sidebar
    }
    // 🔧 ELIMINADO: No cambiar isSidebarHovered aquí
    // Dejar que el hover natural de la sidebar maneje esto
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

  // Posicionar correctamente el menú de usuario (Popover lateral) y REPOSICIONAR EN RESIZE/SCROLL
  useEffect(() => {
    const menuElement = menuRef.current;
    const avatarElement = avatarRef.current;

    const reposition = () => {
      if (status === "authenticated" && isUserMenuOpen && avatarElement && menuElement) {
        const buttonRect = avatarElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const buffer = 10; 
        const menuWidth = 280;
        let menuHeightEstimate = Math.min(350, viewportHeight - (2 * buffer));

        // Estilos base (excepto visibilidad/opacidad)
        menuElement.style.position = "fixed";
        menuElement.style.zIndex = "99999";
        menuElement.style.width = `${menuWidth}px`;
        menuElement.style.overflowY = "auto";

        // Calcular posición horizontal
        const spaceRight = viewportWidth - buttonRect.right - buffer;
        const spaceLeft = buttonRect.left - buffer;
        if (spaceRight >= menuWidth) {
          menuElement.style.left = `${buttonRect.right + 2}px`; // 🔧 Gap reducido
          menuElement.style.right = "auto";
        } else if (spaceLeft >= menuWidth) {
                      menuElement.style.left = `${buttonRect.left - menuWidth - 2}px`; // 🔧 Gap reducido
          menuElement.style.right = "auto";
        } else {
          menuElement.style.left = `${viewportWidth - menuWidth - buffer}px`;
          menuElement.style.right = "auto";
        }

        // Forzar posicionamiento vertical ANCLANDO AL BOTTOM del botón y creciendo hacia ARRIBA
        menuElement.style.top = 'auto';
        menuElement.style.bottom = `${viewportHeight - buttonRect.bottom}px`;
        
        let maxHeight = buttonRect.top - buffer;
        maxHeight = Math.min(menuHeightEstimate, maxHeight);
        maxHeight = Math.max(100, maxHeight);
        menuElement.style.maxHeight = `${maxHeight}px`;

        // Hacer visible
        menuElement.style.visibility = "visible";
        menuElement.style.opacity = "1";
      } else if (menuElement) {
        menuElement.style.visibility = "hidden";
        menuElement.style.opacity = "0";
      }
    };

    if (isUserMenuOpen && status === "authenticated") {
      reposition(); // Posicionar al abrir
      window.addEventListener("resize", reposition);
      window.addEventListener("scroll", reposition, true); // Capturar scroll en fase de captura para mayor fiabilidad
    } else if (menuElement) {
      // Asegurar que se oculta si no está abierto o autenticado pero el elemento existe
      menuElement.style.visibility = "hidden";
      menuElement.style.opacity = "0";
    }

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [status, isUserMenuOpen, isCollapsed, forceMobileView, menuRef, avatarRef]); // Añadido avatarRef por si acaso y menuRef ahora es el único y correcto.

  // Manejar el cambio de visibilidad de la barra lateral en móvil
  const toggleMobileSidebar = () => {
    // Esta función ahora debería comunicarse con el componente padre
    if (onToggle) {
      onToggle();
    }
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
      }, 500); // 🔧 Aumentado a 500ms para consistencia
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
        leftPosition = `${sidebarRight + 2}px`; // 🔧 Gap reducido para mejor UX
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
      clinicMenu.style.left = leftPosition; // Usa el leftPosition ya optimizado
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

  // 🔧 CORREGIDO: Auto-colapso inmediato de sidebar al salir del hover
  useEffect(() => {
    // Solo aplicar en desktop y si no es móvil forzado
    if (forceMobileView) return;
    
    if (!isSidebarHovered && !isCollapsed) {
      // 🔧 COLAPSO INMEDIATO - Sin delay
      sidebarCollapseTimeout.current = setTimeout(() => {
        if (onToggle && !isSidebarHovered) {
          // 🔧 No colapsar si hay menús flotantes abiertos
          const hasOpenFloatingMenus = openMenus.size > 0 || isClinicSelectorOpen || isUserMenuOpen;
          
          if (!hasOpenFloatingMenus) {
            // Cerrar todos los menús antes de colapsar
            closeAllMenus();
            setIsClinicSelectorOpen(false);
            setIsClinicHovered(false);
            setIsUserMenuOpen(false);
            
            // Colapsar la sidebar
            onToggle();
          }
        }
      }, 50); // 🔧 INMEDIATO: Solo 50ms para evitar glitches
    } else if (isSidebarHovered && sidebarCollapseTimeout.current) {
      // Cancelar timer si vuelve a hacer hover
      clearTimeout(sidebarCollapseTimeout.current);
      sidebarCollapseTimeout.current = null;
    }
    
    // Cleanup al desmontar
    return () => {
      if (sidebarCollapseTimeout.current) {
        clearTimeout(sidebarCollapseTimeout.current);
        sidebarCollapseTimeout.current = null;
      }
    };
  }, [isSidebarHovered, isCollapsed, forceMobileView, onToggle, closeAllMenus, openMenus.size, isClinicSelectorOpen, isUserMenuOpen]);

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
      }, 500); // 🔧 Retraso aumentado a 500ms para consistencia
    }
  }, [forceMobileView]);
  // --- Fin Funciones Hover Menú Usuario ---

  // Procesar menuItems para badges dinámicos y estados de integración
  const processedMenuItems = useMemo(() => {
    let facturacionHasAlert = false;

    const updateBadges = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        let newBadge: string | number | boolean | undefined = item.badge; // Allow boolean for dot

        if (item.id === 'listado-tickets') {
          if (isLoadingTicketsCount) {
            newBadge = "...";
          } else if (openTicketsCount > 0) {
            newBadge = openTicketsCount;
          } else {
            newBadge = undefined;
          }
          if (newBadge) facturacionHasAlert = true;
        }

        if (item.id === 'cajas-dia') {
          if (isLoadingCashCount) {
            newBadge = '...';
          } else if (openCashCount > 0) {
            newBadge = openCashCount;
          } else {
            newBadge = undefined;
          }
          if (newBadge) facturacionHasAlert = true;
        }

        let submenuItems = item.submenu;
        if (item.submenu) {
          submenuItems = updateBadges(item.submenu);
          if (item.id === 'facturacion') {
            if (facturacionHasAlert && newBadge === undefined) { // Only set dot if no other badge is present
              newBadge = true; // Set to true to show red dot
            }
          }
        }

        return {
          ...item,
          badge: newBadge,
          // hasAlertIndicator property is removed
          submenu: submenuItems,
        };
      });
    };

    // Aplicar badges dinámicos primero
    const itemsWithBadges = updateBadges(menuItems);
    
    // Luego aplicar lógica de integración si no estamos cargando
    if (!isLoadingIntegrations) {
      return processMenuItemsWithIntegrations(itemsWithBadges, {
        isShellyActive,
        hasActiveIoTModules,
        isModuleActive,
        hasActiveCategoryModules,
      });
    }

    return itemsWithBadges;
  }, [
    menuItems, 
    openTicketsCount, 
    isLoadingTicketsCount, 
    activeClinic?.id, 
    openCashCount, 
    isLoadingCashCount,
    isLoadingIntegrations,
    isShellyActive,
    hasActiveIoTModules,
    isModuleActive,
    hasActiveCategoryModules,
  ]);

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
      onMouseEnter={() => {
        // 🔧 NUEVO: Detectar hover sobre la sidebar
        if (!forceMobileView) {
          setIsSidebarHovered(true);
          // Cancelar timer de colapso si existe
          if (sidebarCollapseTimeout.current) {
            clearTimeout(sidebarCollapseTimeout.current);
            sidebarCollapseTimeout.current = null;
          }
        }
      }}
      onMouseLeave={(e) => {
        // 🔧 CORREGIDO: Detectar salida del hover de la sidebar con precisión
        if (!forceMobileView) {
          // Verificar si el mouse se está moviendo hacia un menú flotante
          const relatedTarget = e.relatedTarget as Element | null;
          const isMovingToFloatingMenu = relatedTarget && 
            typeof relatedTarget.closest === 'function' && (
              relatedTarget.closest('.submenu') || 
              relatedTarget.closest('.user-menu') ||
              relatedTarget.closest('.clinic-selector-menu')
            );
          
          // Solo desactivar hover si NO se está moviendo a un menú flotante
          if (!isMovingToFloatingMenu) {
            setIsSidebarHovered(false);
          }
        }
      }}
      onClick={(e) => {
        // 🔧 AÑADIDO: Cerrar menús al hacer clic en áreas vacías del sidebar
        const target = e.target as Element;
        const isClickOnMenuItem = target.closest('.relative.my-1') || target.closest('.submenu');
        const isClickOnClinicSelector = target.closest('[data-clinic-selector]');
        const isClickOnUserMenu = target.closest('[data-user-menu]');
        
        if (!isClickOnMenuItem && !isClickOnClinicSelector && !isClickOnUserMenu) {
          closeAllMenus();
          setIsClinicSelectorOpen(false);
          setIsClinicHovered(false);
          setIsUserMenuOpen(false);
        }
      }}
    >
      {/* Header con botón hamburguesa */}
      <div className="p-2 overflow-hidden text-white bg-purple-600 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center w-full">
            {/* Botón hamburguesa completamente nuevo */}
            <div
              onClick={() => {
                if (onToggle) {
                  onToggle();
                }
              }}
              className="inline-flex items-center justify-center p-1.5 mr-2 text-white rounded-md cursor-pointer hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </div>
            
            {/* Logo optimizado para ser visible colapsado y expandido */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-center">
                {hasMounted && theme?.logoUrl && !logoError ? (
                  <img 
                    src={theme.logoUrl} 
                    alt="Logo de la clínica" 
                    className={cn(
                      "object-contain transition-all duration-300", 
                      isCollapsed ? "h-6 max-w-[24px]" : "h-10 max-w-[140px]"
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
                    {isCollapsed ? "•" : (
                      <div className="h-6">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" className="h-full w-auto">
                          <defs>
                            <linearGradient id="qGradMain" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8029c5"/>
                              <stop offset="100%" stopColor="#2dd0f8"/>
                            </linearGradient>
                          </defs>
                          <text x="10" y="70" fontFamily="Inter, sans-serif" fontSize="60" fill="url(#qGradMain)">Q</text>
                          <text x="70" y="70" fontFamily="Inter, sans-serif" fontSize="60" fill="white">leven</text>
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Mostrar fecha en dos líneas si no está colapsado */}
              {!isCollapsed && (
                <div className="text-xs text-center truncate text-white/90">{currentDate}</div>
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
        data-clinic-selector // 🔧 AÑADIDO: Atributo para identificar el selector de clínica
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
            className="fixed mt-2 overflow-hidden bg-white border rounded-md shadow-lg w-80 clinic-selector-menu" // 🔧 Clase para detección de hover
            style={{ 
              // Quitar estilos inline de posición, ahora se manejan en useEffect
              visibility: 'hidden', // Empezar oculto
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out' // Añadir transición suave
            }}
            onClick={(e) => e.stopPropagation()} 
            onMouseEnter={() => {
              // Mantener abierto al entrar al menú
              handleClinicMouseEnter();
              // 🔧 CORREGIDO: Mantener sidebar hover activo solo para menús flotantes
              setIsSidebarHovered(true);
              if (sidebarCollapseTimeout.current) {
                clearTimeout(sidebarCollapseTimeout.current);
                sidebarCollapseTimeout.current = null;
              }
            }}
            onMouseLeave={(e) => {
              // Iniciar cierre al salir del menú
              handleClinicMouseLeave();
              // 🔧 CORREGIDO: Solo desactivar hover si no vuelve a la sidebar
              const relatedTarget = e.relatedTarget as Element | null;
              const isReturningToSidebar = relatedTarget && 
                typeof relatedTarget.closest === 'function' && 
                relatedTarget.closest('#main-sidebar');
              
              if (!isReturningToSidebar) {
                setIsSidebarHovered(false);
              }
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
          "py-1", 
          "[&>div]:mb-0.5" 
        )}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.2) transparent',
          position: 'relative',
          zIndex: 40 
        }}
      >
        {processedMenuItems.map((item) => {
          return (
            <div 
              key={item.id} 
              className={cn(
                isCollapsed && !forceMobileView && "flex justify-center" 
              )}
              style={{ position: 'relative', zIndex: 40 }} 
            >
              <MenuItemComponent
                item={item}
                isCollapsed={isCollapsed && !forceMobileView}
                openMenus={openMenus}
                toggleMenu={toggleMenu}
                closeAllMenus={closeAllMenus}
                isMobile={forceMobileView}
                onToggle={onToggle}
                onMenuHover={handleMenuHover}
              />
            </div>
          );
        })}
        
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
          data-user-menu // 🔧 AÑADIDO: Atributo para identificar el menú de usuario
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
                       <Skeleton className="w-24 h-4" />
                       <Skeleton className="w-32 h-3" />
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
                     <span className="w-full text-sm font-medium truncate">{userFullName}</span>
                     <span className="w-full text-xs text-gray-500 truncate">{userEmail}</span>
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
              ref={menuRef} // << USAR EL REF CORRECTO Y ÚNICO
              className="fixed user-menu rounded-md border bg-white shadow-lg z-[99999]"
              style={{ 
                  position: "fixed", 
                  left: forceMobileView ? "0" : "auto",
                  visibility: "hidden", // Inicia oculto
                  opacity: 0, // Inicia oculto
                  width: forceMobileView ? "100%" : "280px",
                  display: "block", 
                  overflowY: "auto",
                  // maxHeight: "calc(100vh - 150px)", // El JS lo ajustará de forma más precisa
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  borderRadius: '0.375rem',
                  transformOrigin: 'bottom center'
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                handleUserMenuEnter();
                // 🔧 CORREGIDO: Mantener sidebar hover activo solo para menús flotantes
                setIsSidebarHovered(true);
                if (sidebarCollapseTimeout.current) {
                  clearTimeout(sidebarCollapseTimeout.current);
                  sidebarCollapseTimeout.current = null;
                }
              }}
              onMouseLeave={(e) => {
                handleUserMenuLeave();
                // 🔧 CORREGIDO: Solo desactivar hover si no vuelve a la sidebar
                const relatedTarget = e.relatedTarget as Element | null;
                const isReturningToSidebar = relatedTarget && 
                  typeof relatedTarget.closest === 'function' && 
                  relatedTarget.closest('#main-sidebar');
                
                if (!isReturningToSidebar) {
                  setIsSidebarHovered(false);
                }
              }}
            >
              <div className="flex flex-col">
                {/* Cabecera del menú desplegable */} 
                <div className="flex items-center gap-3 p-3 border-b">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{userFullName}</span>
                    <span className="text-xs truncate text-muted-foreground">{userEmail}</span>
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
                      try {
                        // 1️⃣ Limpiar React-Query y IndexedDB para seguridad
                        const qc = queryClient; // useQueryClient hook arriba
                        qc?.clear();
                        if (typeof indexedDB !== 'undefined') {
                          indexedDB.deleteDatabase('rq_cache');
                        }
                      } catch (err) {
                        console.warn('[Logout] Fallo al limpiar caché', err);
                      }

                      // 2️⃣ Cerrar sesión y redirigir
                      signOut({ callbackUrl: '/' });
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
