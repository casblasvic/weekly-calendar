"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
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

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  // Estado inicial: siempre colapsada para el comportamiento de hover
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [hasMounted, setHasMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false) // Nuevo estado para hover
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const lastPathname = useRef<string>(pathname || "")
  
  // Función para alternar la barra lateral (solo para móvil)
  const toggleSidebar = useCallback(() => {
    console.log("TOGGLE SIDEBAR CALLED");
    if (isMobile) {
      setIsSidebarVisible(prev => !prev);
    } else {
      // En escritorio, el toggle solo afecta temporalmente
      setIsSidebarCollapsed(prev => !prev);
    }
  }, [isMobile]);
  
  // Funciones para manejar el hover
  const handleSidebarMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsHovering(true);
      setIsSidebarCollapsed(false);
    }
  }, [isMobile]);
  
  const handleSidebarMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsHovering(false);
      setIsSidebarCollapsed(true);
    }
  }, [isMobile]);
  
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
      } else {
        // En escritorio, siempre colapsada por defecto
        setIsSidebarCollapsed(true)
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
      } else {
        // En escritorio, asegurar que esté colapsada
        setIsSidebarCollapsed(true);
        setIsHovering(false);
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
      // En escritorio, asegurar que esté colapsada
      else if (!isMobile) {
        setIsSidebarCollapsed(true);
        setIsHovering(false);
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

  // Si no estamos montados, mostrar un layout básico
  if (!hasMounted) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar con header integrado */}
      <div 
        ref={sidebarRef}
        className="transition-all duration-300 ease-in-out"
        style={{
          position: isMobile ? 'relative' : 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: 45,
          visibility: 'visible',
          width: 'auto'
        }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
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

      {/* Contenido principal */}
      <main
        className="flex-1 overflow-auto"
        style={{
          marginLeft: isMobile ? (isSidebarVisible ? "3.5rem" : "0") : "3.5rem",
          transition: "margin-left 0.3s ease-in-out",
          width: isMobile ? 
            (isSidebarVisible ? "calc(100% - 3.5rem)" : "100%") : 
            "calc(100% - 3.5rem)",
        }}
      >
        {children}
      </main>
    </div>
  )
}

