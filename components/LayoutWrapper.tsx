"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { MainSidebar } from "@/components/main-sidebar"
import { Button } from "@/components/ui/button"
import { Home, Calendar, Users, BarChart2, User, LogOut, Settings, FileText } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { MobileDrawerMenu } from "@/components/mobile/layout/drawer-menu"
import { MobileClinicButton } from "@/components/mobile-clinic-button"
import { FloatingMenu } from "./ui/floating-menu"
import { GranularityProvider } from "@/lib/drag-drop/granularity-context"
import { MoveAppointmentProvider } from "@/contexts/move-appointment-context"
import { MoveAppointmentUI } from "@/components/move-appointment-ui"
import { format } from "date-fns"

interface LayoutWrapperProps {
  children: React.ReactNode
  user: any
}

export function LayoutWrapper({ children, user }: LayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const lastPathname = useRef<string>(pathname || "")
  
  // ✅ CORREGIDA: Obtener fecha actual de la vista desde la URL (ruta + query params)
  const getCurrentViewDate = useCallback((): Date => {
    if (pathname?.includes('/agenda')) {
      try {
        // ✅ MÉTODO 1: Buscar fecha en la RUTA (e.g., /agenda/dia/2025-06-27)
        const routeMatch = pathname.match(/\/agenda\/(?:dia|semana)\/(\d{4}-\d{2}-\d{2})/)
        if (routeMatch && routeMatch[1]) {
          const parsedDate = new Date(routeMatch[1])
          if (!isNaN(parsedDate.getTime())) {
            console.log('[LayoutWrapper] ✅ Fecha extraída de ruta:', format(parsedDate, 'yyyy-MM-dd'))
            return parsedDate
          }
        }
        
        // ✅ MÉTODO 2: Buscar fecha en QUERY PARAMS (fallback)
        const urlParams = new URLSearchParams(window.location.search)
        const dateParam = urlParams.get('date')
        if (dateParam) {
          const parsedDate = new Date(dateParam)
          if (!isNaN(parsedDate.getTime())) {
            console.log('[LayoutWrapper] ✅ Fecha extraída de query params:', format(parsedDate, 'yyyy-MM-dd'))
            return parsedDate
          }
        }
      } catch (error) {
        console.log('[LayoutWrapper] ⚠️ Error al extraer fecha de URL:', error)
      }
    }
    
    // ✅ FALLBACK: Solo usar fecha actual si NO hay nada más
    console.log('[LayoutWrapper] ⚠️ No se pudo obtener fecha de vista - usando fecha actual')
    return new Date()
  }, [pathname])
  
  const currentViewDate = getCurrentViewDate()
  
  // ✅ DEBUGGING TEMPORAL: Ver qué fecha se está obteniendo
  console.log('[LayoutWrapper] 🔍 DEBUGGING currentViewDate:', {
    pathname,
    currentViewDate: currentViewDate ? format(currentViewDate, 'yyyy-MM-dd') : 'undefined',
    windowLocationHref: typeof window !== 'undefined' ? window.location.href : 'SSR'
  })
  
  // Función para alternar la barra lateral
  const toggleSidebar = useCallback(() => {
    console.log("TOGGLE SIDEBAR CALLED");
    // Simplemente alternamos el estado de la barra lateral
    setIsSidebarCollapsed(prev => !prev);
  }, []);
  
  // Verificar si el componente se ha montado en el cliente
  useEffect(() => {
    setHasMounted(true)
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // En móvil, colapsar la barra lateral y ocultarla
      if (mobile) {
        setIsSidebarCollapsed(true)
        setIsSidebarVisible(false)
      }
      
      // Ajustes específicos para iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS && mobile) {
        // Forzar el recálculo del viewport para iOS
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Agregar clase CSS específica para iOS
        document.documentElement.classList.add('ios-device');
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Asegurarse de que el viewport esté correctamente establecido en iOS
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 100);
    });
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', () => {});
    }
  }, [])
  
  // Cerrar la barra lateral cuando cambia la ruta
  useEffect(() => {
    // Si la ruta ha cambiado
    if (pathname && pathname !== lastPathname.current) {
      // En móvil, ocultar la barra lateral
      if (isMobile) {
        setIsSidebarVisible(false);
      }
      // En escritorio, colapsar la barra lateral
      else if (!isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
      
      // Asegurarnos de cerrar cualquier menú desplegable o notificación que esté abierto
      const mainSidebar = document.getElementById('main-sidebar');
      if (mainSidebar) {
        // Disparar un evento personalizado que MainSidebar puede escuchar
        const routeChangeEvent = new CustomEvent('route-change', {
          detail: { path: pathname, forced: true }
        });
        mainSidebar.dispatchEvent(routeChangeEvent);
        
        // Asegurarnos de que todos los submenús se oculten
        setTimeout(() => {
          const submenus = document.querySelectorAll('.submenu');
          submenus.forEach(submenu => {
            if (submenu instanceof HTMLElement) {
              submenu.style.display = 'none';
              submenu.style.visibility = 'hidden';
              submenu.style.opacity = '0';
            }
          });
        }, 100);
      }
      
      // Actualizar la última ruta conocida
      lastPathname.current = pathname;
    }
  }, [pathname, isMobile, isSidebarCollapsed]);

  // Actualizar la variable CSS --sidebar-width cuando el estado del sidebar cambie
  useEffect(() => {
    const root = document.documentElement;
    if (isMobile) {
      root.style.setProperty('--sidebar-width', isSidebarVisible ? '3.5rem' : '0px');
    } else {
      root.style.setProperty('--sidebar-width', isSidebarCollapsed ? '3.5rem' : '16rem');
    }
  }, [isMobile, isSidebarVisible, isSidebarCollapsed]);
  
  // Manejar el cambio de visibilidad de la barra lateral en móvil
  const toggleMobileSidebar = useCallback(() => {
    console.log("Toggle mobile sidebar");
    
    // Para iOS, forzar reflow y restablecer posición
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      // Forzar reflow y mejorar posicionamiento
      document.body.style.webkitTransform = 'scale(1)';
      
      // Pequeño retraso antes de cambiar el estado
      setTimeout(() => {
        setIsSidebarVisible(prev => !prev);
        document.body.style.webkitTransform = '';
      }, 10);
    } else {
      // En otros navegadores, comportamiento normal
      setIsSidebarVisible(prev => !prev);
    }
  }, []);

  // Manejar clic fuera de la barra lateral
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    // Verificar si el clic ocurrió en algún menú flotante o en algún menú desplegable
    const isClickInFloatingMenu = 
      e.target instanceof Node && 
      (document.querySelector('.floating-client-menu')?.contains(e.target) || 
       document.querySelector('.floating-staff-menu')?.contains(e.target) ||
       document.querySelector('.submenu')?.contains(e.target));
    
    // Verificar si el clic ocurrió en un botón de toggle o similar
    const isClickInControlButton = 
      e.target instanceof Element && 
      (e.target.closest('button[aria-label="Toggle navigation"]') ||
       e.target.closest('[data-sidebar="menu-button"]'));
       
    // Verificar si es un clic en el menú de usuario o su botón
    const isClickInUserMenu =
      e.target instanceof Node &&
      (document.querySelector('.user-menu')?.contains(e.target) ||
       document.querySelector('.user-menu-button')?.contains(e.target) ||
       document.querySelector('.notifications-menu')?.contains(e.target) ||
       document.querySelector('#notifications-button')?.contains(e.target) ||
       document.querySelector('.clinic-selector-menu')?.contains(e.target));
    
    // Si el clic ocurrió en un menú flotante, menú de usuario o en un botón de control, ignorarlo
    if (isClickInFloatingMenu || isClickInControlButton || isClickInUserMenu) {
      return;
    }
    
    // Si el clic ocurrió fuera de la barra lateral y no en un menú flotante o botón de control
    if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
      // En móvil, ocultar la barra lateral
      if (isMobile && isSidebarVisible) {
        setIsSidebarVisible(false);
      }
      // En escritorio, colapsar la barra lateral si está expandida
      else if (!isMobile && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    }
  }, [isMobile, isSidebarVisible, isSidebarCollapsed]);

  // Configurar listener para clics fuera de la barra lateral
  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  // Calcular estilos para main ANTES del return
  const mainStyle = useMemo(() => {
    const ml = isMobile ? (isSidebarVisible ? "3.5rem" : "0") : (isSidebarCollapsed ? "3.5rem" : "16rem");
    const w = isMobile ? 
      (isSidebarVisible ? "calc(100% - 3.5rem)" : "100%") : 
      `calc(100% - ${isSidebarCollapsed ? "3.5rem" : "16rem"})`;
      
    return {
        marginLeft: ml,
        width: w,
        transition: "margin-left 0.3s ease-in-out, width 0.3s ease-in-out",
        '--main-margin-left': ml, 
        '--main-width': w,
    } as React.CSSProperties; // Cast para incluir CSS Variables
  }, [isMobile, isSidebarVisible, isSidebarCollapsed]);

  // ✅ FUNCIÓN PARA VOLVER A LA CITA ORIGINAL (funcionalidad "deshacer")
  const handleGoBackToAppointment = useCallback((appointment: any) => {
    console.log('[LayoutWrapper] 🔄 Navegando de vuelta a cita original:', appointment.name)
    
    // Determinar vista apropiada y navegar
    const appointmentDate = appointment.date instanceof Date ? appointment.date : new Date(appointment.date)
    const dateString = format(appointmentDate, 'yyyy-MM-dd')
    
    // ✅ DETECTAR VISTA ACTUAL desde la URL para preservarla
    const currentView = (() => {
      if (pathname.includes('/agenda/dia/')) return 'day'
      if (pathname.includes('/agenda/semana/')) return 'week'
      // Fallback: detectar desde query params si existe
      const urlParams = new URLSearchParams(window.location.search)
      const viewParam = urlParams.get('view')
      return viewParam === 'day' ? 'day' : 'week' // Default a semana
    })()
    
    console.log('[LayoutWrapper] 🔍 Vista detectada:', currentView, 'navegando a fecha:', dateString)
    
    // ✅ NAVEGAR PRESERVANDO LA VISTA ACTUAL
    if (currentView === 'day') {
      // Vista diaria: navegar a día específico
      router.push(`/agenda/dia/${dateString}`)
    } else {
      // Vista semanal: navegar a semana que contiene la fecha
      router.push(`/agenda/semana/${dateString}`)
    }
  }, [router, pathname])

  // Si no estamos montados, mostrar un layout básico
  if (!hasMounted) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50"> {/* Cambiado OTRA VEZ a min-h-screen */}
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className="transition-all duration-300 ease-in-out flex-shrink-0"
        style={{ /* ... estilos sidebar ... */ zIndex: 45 }}
      >
        <MainSidebar
          isCollapsed={isMobile ? !isSidebarVisible : isSidebarCollapsed}
          onToggle={toggleSidebar}
          forceMobileView={isMobile}
        />
      </div>

      {/* Botón móvil para mostrar la barra lateral */}
      <MobileClinicButton 
        onClick={toggleMobileSidebar}
        isOpen={isSidebarVisible}
      />

      {/* Menús flotantes */}
      <div className="fixed right-0 top-0 z-[9999] space-y-1 p-3">
        <FloatingMenu />
      </div>

      {/* Área principal CON overflow-auto y estilos calculados */}
      <main
        className="flex-1" 
        style={mainStyle} // <<< Usar el objeto style calculado
      >
        {/* Envolver children con GranularityProvider */}
        <GranularityProvider>
          <MoveAppointmentProvider 
            onGoBackToAppointment={handleGoBackToAppointment}
          >
            {children}
            {/* UI para citas en movimiento - DENTRO del provider */}
            <MoveAppointmentUI currentViewDate={currentViewDate} />
          </MoveAppointmentProvider>
        </GranularityProvider>
      </main>
    </div>
  )
}
