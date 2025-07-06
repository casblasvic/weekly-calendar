/**
 * LayoutWrapper.tsx - COMPONENTE CRÍTICO DE SEGURIDAD Y LAYOUT
 * 
 * 🔐 FUNCIÓN PRINCIPAL:
 * Este componente controla qué layout se muestra según el estado de autenticación.
 * Es FUNDAMENTAL para la seguridad ya que previene que se rendericen componentes
 * sensibles (como MainSidebar) antes de que la autenticación esté completa.
 * 
 * 🛡️ SEGURIDAD:
 * - SOLO muestra layout simple en página de login (pathname === '/login')
 * - SOLO muestra layout completo cuando la autenticación está verificada
 * - Previene errores de "useClinic debe usarse dentro de un ClinicProvider"
 * - Maneja transiciones de login → dashboard de manera segura
 * 
 * 🔄 FLUJO DE AUTENTICACIÓN:
 * 1. Usuario en /login → Layout simple (solo children)
 * 2. Login exitoso → NextAuth redirige a /
 * 3. pathname cambia de '/login' → '/' 
 * 4. isLoginPage = false → Layout completo con sidebar
 * 5. Providers ya están cargados → Todo funciona
 * 
 * ⚠️ REGLAS CRÍTICAS PARA DESARROLLADORES:
 * 
 * 1. NUNCA modificar la lógica de isLoginPage sin entender las implicaciones
 * 2. NUNCA agregar verificaciones adicionales que bloqueen el layout completo
 * 3. SIEMPRE usar pathname de Next.js, NUNCA window.location.pathname
 * 4. CUALQUIER componente que use contexts sensibles DEBE estar dentro del layout completo
 * 
 * 🧩 COMPONENTES QUE DEPENDEN DE ESTE CONTROL:
 * - MainSidebar (usa useClinic, useUser, etc.)
 * - FloatingMenu (usa contexts de clientes)
 * - MobileClinicButton (usa contextos de clínica)
 * - Todos los providers sensibles en AuthenticatedProviders
 * 
 * 📋 CÓMO AGREGAR NUEVAS FUNCIONALIDADES:
 * 
 * ✅ CORRECTO:
 * - Agregar componentes DENTRO del return del layout completo
 * - Usar hooks de contexto solo en componentes renderizados después de autenticación
 * - Verificar autenticación en el componente específico si es necesario
 * 
 * ❌ INCORRECTO:
 * - Agregar verificaciones que bloqueen shouldShowFullLayout
 * - Usar contexts sensibles en componentes renderizados en layout simple
 * - Modificar la detección de isLoginPage sin coordinación con AuthenticatedProviders
 * 
 * 🔧 DEBUGGING:
 * Los logs muestran claramente el estado:
 * - "🚫 En página de login - layout simple" → No se carga sidebar
 * - "✅ Fuera de login - layout completo" → Se carga todo
 * 
 * 💡 COORDINACIÓN CON OTROS ARCHIVOS:
 * - app/components/providers-wrapper.tsx: Controla qué providers se cargan
 * - Ambos DEBEN usar la misma lógica de detección de login (pathname === '/login')
 * - Ambos DEBEN estar sincronizados para evitar errores de contexto
 */

"use client"

import React from 'react'
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MainSidebar } from "@/components/main-sidebar"
import { Button } from "@/components/ui/button"
import { Home, Calendar, Users, BarChart2, User, LogOut, Settings, FileText } from "lucide-react"
import { usePathname } from "next/navigation"
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
import { SmartPlugsProvider, useSmartPlugsContextOptional } from "@/contexts/smart-plugs-context"
import { clientLogger } from "@/lib/utils/client-logger"

interface LayoutWrapperProps {
  children: React.ReactNode
  user?: any
}

export function LayoutWrapper({ children, user }: LayoutWrapperProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const lastPathname = useRef<string>(pathname || "")
  const lastLayoutState = useRef<string>('')
  
  // ✅ USAR CONTEXTO OPCIONAL para obtener datos de Smart Plugs
  const smartPlugsContext = useSmartPlugsContextOptional()
  const smartPlugsData = smartPlugsContext?.smartPlugsData || null
  
  const isLoginPage = useMemo(() => {
    const result = pathname === '/login'
    return result
  }, [pathname])

  const shouldShowFullLayout = useMemo(() => {
    if (isLoginPage) {
      return false
    }
    
    return true
  }, [isLoginPage])

  useEffect(() => {
    const currentState = `${pathname}-${status}-${!!session}-${hasMounted}`;
    
    if (currentState !== lastLayoutState.current && process.env.NODE_ENV === 'development') {
      lastLayoutState.current = currentState;
      
      console.log('🔍 [LayoutWrapper] Verificación de login:', {
        pathname,
        isLoginPage,
        status,
        sessionExists: !!session,
        decision: isLoginPage ? 'LAYOUT SIMPLE' : 'LAYOUT COMPLETO'
      })
      
      if (isLoginPage) {
        console.log('🚫 [LayoutWrapper] En página de login - layout simple')
      } else {
        console.log('✅ [LayoutWrapper] Fuera de login - layout completo', {
          status,
          sessionExists: !!session,
          hasMounted
        })
      }
    }
  }, [pathname, status, session, hasMounted, isLoginPage])

  clientLogger.debug('🔍 [LayoutWrapper] Decisión de layout:', {
    isLoginPage,
    status,
    sessionExists: !!session,
    shouldShowFullLayout
  })

  useEffect(() => {
    if (pathname === '/login') {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [LayoutWrapper] En página de login - saltando verificación de sesión')
      }
      return
    }
    
    if (status === "loading") {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ [LayoutWrapper] Sesión cargando...')
      }
      return
    }
    
    if (status === "unauthenticated" || !session) {
      console.error('❌ Sesión no válida, redirigiendo al login...')
      router.push('/login')
      return
    }
    
    if (session?.expires) {
      const now = new Date()
      const currentTime = now.getTime()
      
      let expirationDate: Date
      try {
        expirationDate = new Date(session.expires)
        if (isNaN(expirationDate.getTime())) {
          console.error('❌ Fecha de expiración inválida:', session.expires)
          return
        }
      } catch (error) {
        console.error('❌ Error al parsear fecha de expiración:', session.expires, error)
        return
      }
      
      const expirationTime = expirationDate.getTime()
      const timeUntilExpiration = expirationTime - currentTime
      
      if (currentTime >= expirationTime) {
        console.error('❌ Sesión expirada, redirigiendo al login...')
        router.push('/login')
        return
      }
    }
  }, [session, status, router, pathname])
  
  const getCurrentViewDate = useCallback((): Date => {
    if (pathname?.includes('/agenda')) {
      try {
        const routeMatch = pathname.match(/\/agenda\/(?:dia|semana)\/(\d{4}-\d{2}-\d{2})/)
        if (routeMatch && routeMatch[1]) {
          const parsedDate = new Date(routeMatch[1])
          if (!isNaN(parsedDate.getTime())) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[LayoutWrapper] ✅ Fecha extraída de ruta:', format(parsedDate, 'yyyy-MM-dd'))
            }
            return parsedDate
          }
        }
        
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const dateParam = urlParams.get('date')
          if (dateParam) {
            const parsedDate = new Date(dateParam)
            if (!isNaN(parsedDate.getTime())) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[LayoutWrapper] ✅ Fecha extraída de query params:', format(parsedDate, 'yyyy-MM-dd'))
              }
              return parsedDate
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[LayoutWrapper] ⚠️ Error al extraer fecha de URL:', error)
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[LayoutWrapper] ⚠️ No se pudo obtener fecha de vista - usando fecha actual')
    }
    return new Date()
  }, [pathname])
  
  const currentViewDate = useMemo(() => {
    return getCurrentViewDate()
  }, [getCurrentViewDate])
  

  
  const toggleSidebar = useCallback(() => {
    console.log("TOGGLE SIDEBAR CALLED");
    setIsSidebarCollapsed(prev => !prev);
  }, []);
  
  useEffect(() => {
    setHasMounted(true)
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      if (mobile) {
        setIsSidebarCollapsed(true)
        setIsSidebarVisible(false)
      }
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS && mobile) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        document.documentElement.classList.add('ios-device');
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 100);
    });
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', () => {});
    }
  }, [])
  
  useEffect(() => {
    if (pathname && pathname !== lastPathname.current) {
      if (isMobile) {
        setIsSidebarVisible(false);
      }
      else if (!isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
      
      const mainSidebar = document.getElementById('main-sidebar');
      if (mainSidebar) {
        const routeChangeEvent = new CustomEvent('route-change', {
          detail: { path: pathname, forced: true }
        });
        mainSidebar.dispatchEvent(routeChangeEvent);
        
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
      
      lastPathname.current = pathname;
    }
  }, [pathname, isMobile, isSidebarCollapsed]);

  useEffect(() => {
    const root = document.documentElement;
    if (isMobile) {
      root.style.setProperty('--sidebar-width', isSidebarVisible ? '3.5rem' : '0px');
    } else {
      root.style.setProperty('--sidebar-width', isSidebarCollapsed ? '3.5rem' : '16rem');
    }
  }, [isMobile, isSidebarVisible, isSidebarCollapsed]);
  
  const toggleMobileSidebar = useCallback(() => {
    console.log("Toggle mobile sidebar");
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      document.body.style.webkitTransform = 'scale(1)';
      
      setTimeout(() => {
        setIsSidebarVisible(prev => !prev);
        document.body.style.webkitTransform = '';
      }, 10);
    } else {
      setIsSidebarVisible(prev => !prev);
    }
  }, []);

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    const isClickInFloatingMenu = 
      e.target instanceof Node && 
      (document.querySelector('.floating-client-menu')?.contains(e.target) || 
       document.querySelector('.floating-staff-menu')?.contains(e.target) ||
       document.querySelector('.submenu')?.contains(e.target));
    
    const isClickInControlButton = 
      e.target instanceof Element && 
      (e.target.closest('button[aria-label="Toggle navigation"]') ||
       e.target.closest('[data-sidebar="menu-button"]'));
       
    const isClickInUserMenu =
      e.target instanceof Node &&
      (document.querySelector('.user-menu')?.contains(e.target) ||
       document.querySelector('.user-menu-button')?.contains(e.target) ||
       document.querySelector('.notifications-menu')?.contains(e.target) ||
       document.querySelector('#notifications-button')?.contains(e.target) ||
       document.querySelector('.clinic-selector-menu')?.contains(e.target));
    
    if (isClickInFloatingMenu || isClickInControlButton || isClickInUserMenu) {
      return;
    }
    
    if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
      if (isMobile && isSidebarVisible) {
        setIsSidebarVisible(false);
      }
      else if (!isMobile && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    }
  }, [isMobile, isSidebarVisible, isSidebarCollapsed]);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [handleOutsideClick]);

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
    } as React.CSSProperties;
  }, [isMobile, isSidebarVisible, isSidebarCollapsed]);

  const handleGoBackToAppointment = useCallback((appointment: any) => {
    console.log('[LayoutWrapper] 🔄 Navegando de vuelta a cita original:', appointment.name)
    
    const appointmentDate = appointment.date instanceof Date ? appointment.date : new Date(appointment.date)
    const dateString = format(appointmentDate, 'yyyy-MM-dd')
    
    const currentView = (() => {
      if (pathname.includes('/agenda/dia/')) return 'day'
      if (pathname.includes('/agenda/semana/')) return 'week'
      const urlParams = new URLSearchParams(window.location.search)
      const viewParam = urlParams.get('view')
      return viewParam === 'day' ? 'day' : 'week'
    })()
    
    console.log('[LayoutWrapper] 🔍 Vista detectada:', currentView, 'navegando a fecha:', dateString)
    
    if (currentView === 'day') {
      router.push(`/agenda/dia/${dateString}`)
    } else {
      router.push(`/agenda/semana/${dateString}`)
    }
  }, [router, pathname])

  if (!hasMounted) {
    return <div className="min-h-screen">{children}</div>
  }

  if (!shouldShowFullLayout) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  return (
    <SmartPlugsProvider>
      <div className="flex min-h-screen bg-gray-50">
        <div 
          ref={sidebarRef}
          className="flex-shrink-0 transition-all duration-300 ease-in-out"
          style={{ zIndex: 45 }}
        >
          {(() => {
            try {
              return (
                <MainSidebar
                  isCollapsed={isMobile ? !isSidebarVisible : isSidebarCollapsed}
                  onToggle={toggleSidebar}
                  forceMobileView={isMobile}
                />
              )
            } catch (error) {
              console.error('❌ [LayoutWrapper] Error al renderizar MainSidebar:', error)
              return (
                <div className="flex justify-center items-center w-14 h-screen bg-gray-900">
                  <div className="text-xs text-white">Cargando...</div>
                </div>
              )
            }
          })()}
        </div>

        <MobileClinicButton 
          onClick={toggleMobileSidebar}
          isOpen={isSidebarVisible}
        />

        <div className="fixed right-0 top-0 z-[9999] space-y-1 p-3">
          <FloatingMenu smartPlugsData={smartPlugsData} />
        </div>

        <main
          className="flex-1" 
          style={mainStyle}
        >
          <GranularityProvider>
            <MoveAppointmentProvider 
              onGoBackToAppointment={handleGoBackToAppointment}
            >
              {children}
              <MoveAppointmentUI currentViewDate={currentViewDate} />
            </MoveAppointmentProvider>
          </GranularityProvider>
        </main>
      </div>
    </SmartPlugsProvider>
  )
}
