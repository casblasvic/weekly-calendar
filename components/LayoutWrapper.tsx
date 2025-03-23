"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { MainSidebar } from "@/components/main-sidebar"
import { FloatingClientMenu } from "@/components/floating-client-menu"
import { FloatingStaffMenu } from "@/components/floating-staff-menu"
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

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const lastPathname = useRef<string>(pathname || "")
  
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
  
  // Manejar el cambio de visibilidad de la barra lateral en móvil
  const toggleMobileSidebar = () => {
    setIsSidebarVisible(prev => !prev);
    console.log("Toggle mobile sidebar");
  }

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
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (isSidebarVisible ? 0 : '-100%') : 0,
          top: 0,
          height: '100%',
          zIndex: 50,
          visibility: isMobile && !isSidebarVisible ? 'hidden' : 'visible',
          width: isMobile ? '85%' : 'auto'
        }}
      >
        <MainSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          forceMobileView={isMobile}
        />
      </div>

      {/* Botón móvil para mostrar la barra lateral */}
      <MobileClinicButton 
        onClick={toggleMobileSidebar}
        isOpen={isSidebarVisible}
      />

      {/* Overlay para cerrar sidebar al hacer click fuera */}
      {isMobile && isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => {
            setIsSidebarVisible(false);
            console.log("Click en overlay");
          }}
        />
      )}

      {/* Menús flotantes */}
      <div className="fixed right-0 top-0 z-[9999] space-y-1 p-3">
        <FloatingClientMenu 
          onOutsideClick={() => {}}
          autoCollapseTimeout={8000}
          onMenuToggle={() => {
            // Cerrar el menú de personal cuando se abre el menú de cliente
            const staffMenuElement = document.querySelector('.floating-staff-menu');
            if (staffMenuElement) {
              const event = new CustomEvent('close-menu', { bubbles: true });
              staffMenuElement.dispatchEvent(event);
            }
          }}
        />
        <FloatingStaffMenu 
          onOutsideClick={() => {}} 
          offsetY={60}
          autoCollapseTimeout={8000}
          onMenuToggle={() => {
            // Cerrar el menú de cliente cuando se abre el menú de personal
            const clientMenuElement = document.querySelector('.floating-client-menu');
            if (clientMenuElement) {
              const event = new CustomEvent('close-menu', { bubbles: true });
              clientMenuElement.dispatchEvent(event);
            }
          }}
        />
      </div>

      {/* Contenido principal */}
      <main
        className="flex-1 overflow-auto"
        style={{
          marginLeft: isMobile ? 0 : (isSidebarCollapsed ? "3.5rem" : "16rem"),
          transition: "margin-left 0.3s ease-in-out",
          width: isMobile ? "100%" : `calc(100% - ${isSidebarCollapsed ? "3.5rem" : "16rem"})`,
        }}
      >
        {children}
      </main>
    </div>
  )
}

