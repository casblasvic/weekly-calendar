"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { MainSidebar } from "@/components/main-sidebar"
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
  
  // Verificar si el componente se ha montado en el cliente
  useEffect(() => {
    setHasMounted(true)
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      console.log("Detectado móvil:", mobile)
      setIsMobile(mobile)
      
      // En móvil, colapsar la barra lateral y ocultarla
      if (mobile) {
        setIsSidebarCollapsed(true)
        setIsSidebarVisible(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Cerrar barra lateral cuando se cambia de ruta en móvil
  useEffect(() => {
    if (isMobile) {
      setIsSidebarVisible(false)
    }
  }, [pathname, isMobile])
  
  // Manejar el cambio de visibilidad de la barra lateral en móvil
  const toggleMobileSidebar = () => {
    console.log("Toggling sidebar de:", isSidebarVisible, "a:", !isSidebarVisible)
    setIsSidebarVisible(!isSidebarVisible)
  }

  // Efecto para depurar
  useEffect(() => {
    console.log("Estado actual: Mobile:", isMobile, "Sidebar visible:", isSidebarVisible)
  }, [isMobile, isSidebarVisible])

  // Si no estamos montados, mostrar un layout básico
  if (!hasMounted) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar con header integrado */}
      <div 
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
          onToggle={() => {
            if (isMobile) {
              setIsSidebarVisible(false)
            } else {
              setIsSidebarCollapsed(!isSidebarCollapsed)
            }
          }}
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
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {/* Contenido principal */}
      <main
        className="flex-1 overflow-auto"
        style={{
          marginLeft: isMobile ? 0 : (isSidebarCollapsed ? "4rem" : "16rem"),
          transition: "margin-left 0.3s ease-in-out",
          width: isMobile ? "100%" : `calc(100% - ${isSidebarCollapsed ? "4rem" : "16rem"})`,
        }}
      >
        {children}
      </main>
    </div>
  )
} 