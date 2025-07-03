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

import type React from "react"
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
// ✅ NUEVO: Hook para integración de enchufes inteligentes en floating menu
import { useSmartPlugsFloatingMenu } from "@/hooks/use-smart-plugs-floating-menu"
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
  
  // ✅ NUEVO: Hook para enchufes inteligentes en floating menu
  const smartPlugsData = useSmartPlugsFloatingMenu()
  
  // ✅ DETECCIÓN CORREGIDA: SOLO USAR PATHNAME DE NEXT.JS
  const isLoginPage = useMemo(() => {
    // ✅ SOLO usar pathname de Next.js (es más confiable)
    const result = pathname === '/login'
    
    console.log('🔍 [LayoutWrapper] Verificación de login:', {
      pathname,
      windowPathname: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      isLoginPage: result,
      status,
      sessionExists: !!session,
      decision: result ? 'LAYOUT SIMPLE' : 'LAYOUT COMPLETO'
    })
    
    return result
  }, [pathname, status, session])

  /**
   * LÓGICA CRÍTICA DE SEGURIDAD - shouldShowFullLayout
   * 
   * 🔐 PROPÓSITO:
   * Determina si debe mostrarse el layout completo (con sidebar, menús, etc.)
   * o el layout simple (solo children).
   * 
   * 🛡️ SEGURIDAD:
   * Esta lógica es FUNDAMENTAL para prevenir que componentes sensibles
   * (como MainSidebar) se rendericen antes de que los providers estén disponibles.
   * 
   * 📋 REGLA SIMPLE PERO CRÍTICA:
   * - Si pathname === '/login' → Layout simple (sin sidebar)
   * - Si pathname !== '/login' → Layout completo (con sidebar)
   * 
   * ⚠️ POR QUÉ ES SIMPLE:
   * Cualquier lógica adicional (verificar status, session, etc.) puede crear
   * condiciones de carrera donde el layout completo se bloquea incorrectamente.
   * 
   * 🔄 COORDINACIÓN:
   * Esta lógica DEBE estar sincronizada con AuthenticatedProviders:
   * - Ambos usan pathname === '/login' para detectar login
   * - Ambos cambian de estado al mismo tiempo
   * - Esto evita errores de contexto durante transiciones
   */
  // ✅ LÓGICA SIMPLIFICADA: Solo bloquear en login
  const shouldShowFullLayout = useMemo(() => {
    // SOLO bloquear si estamos en página de login
    if (isLoginPage) {
      console.log('🚫 [LayoutWrapper] En página de login - layout simple')
      return false
    }
    
    // ✅ PARA TODO LO DEMÁS: Mostrar layout completo
    console.log('✅ [LayoutWrapper] Fuera de login - layout completo', {
      status,
      sessionExists: !!session,
      hasMounted
    })
    return true
  }, [isLoginPage, status, session, hasMounted])

  clientLogger.debug('🔍 [LayoutWrapper] Decisión de layout:', {
    isLoginPage,
    status,
    sessionExists: !!session,
    shouldShowFullLayout
  })

  // ✅ VERIFICACIÓN DE SESIÓN EN TIEMPO REAL
  useEffect(() => {
    // ✅ EXCLUIR PÁGINA DE LOGIN para evitar bucles infinitos
    if (pathname === '/login') {
      console.log('🔍 [LayoutWrapper] En página de login - saltando verificación de sesión')
      return
    }
    
    // ✅ SOLO VERIFICAR SESIÓN EN PÁGINAS PROTEGIDAS
    if (status === "loading") {
      console.log('⏳ [LayoutWrapper] Sesión cargando...')
      return // Aún cargando
    }
    
    if (status === "unauthenticated" || !session) {
      console.error('❌ Sesión no válida, redirigiendo al login...')
      router.push('/login')
      return
    }
    
    // ✅ VERIFICAR EXPIRACIÓN DE SESIÓN con debugging detallado
    if (session?.expires) {
      const now = new Date()
      const currentTime = now.getTime()
      
      // ✅ VALIDAR formato de fecha
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
      
      // Verificar si la sesión ha expirado
      if (currentTime >= expirationTime) {
        console.error('❌ Sesión expirada, redirigiendo al login...')
        router.push('/login')
        return
      }
    }
  }, [session, status, router, pathname])
  
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
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const dateParam = urlParams.get('date')
          if (dateParam) {
            const parsedDate = new Date(dateParam)
            if (!isNaN(parsedDate.getTime())) {
              console.log('[LayoutWrapper] ✅ Fecha extraída de query params:', format(parsedDate, 'yyyy-MM-dd'))
              return parsedDate
            }
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
  
  // ✅ CORREGIDO: Usar useMemo para evitar error de hooks
  const currentViewDate = useMemo(() => {
    return getCurrentViewDate()
  }, [getCurrentViewDate])
  

  
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

  // ✅ SI NO DEBERÍAMOS MOSTRAR LAYOUT COMPLETO → LAYOUT SIMPLE
  if (!shouldShowFullLayout) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50"> {/* Cambiado OTRA VEZ a min-h-screen */}
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className="flex-shrink-0 transition-all duration-300 ease-in-out"
        style={{ zIndex: 45 }}
      >
        {/* ✅ RENDERIZAR SIDEBAR CON PROTECCIÓN CONTRA ERRORES */}
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
            // Fallback: mostrar un sidebar mínimo o nada
            return (
              <div className="flex justify-center items-center w-14 h-screen bg-gray-900">
                <div className="text-xs text-white">Cargando...</div>
              </div>
            )
          }
        })()}
      </div>

      {/* Botón móvil para mostrar la barra lateral */}
      <MobileClinicButton 
        onClick={toggleMobileSidebar}
        isOpen={isSidebarVisible}
      />

      {/* Menús flotantes */}
      <div className="fixed right-0 top-0 z-[9999] space-y-1 p-3">
        <FloatingMenu smartPlugsData={smartPlugsData} />
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
