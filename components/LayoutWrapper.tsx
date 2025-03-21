"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { MainSidebar } from "@/components/main-sidebar"
import { Button } from "@/components/ui/button"
import { Menu, Home, Calendar, Users, BarChart2, Bell, User, LogOut, Settings, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ClientCardWrapper } from "@/components/client-card-wrapper"
import { MobileDrawerMenu } from "@/components/mobile/layout/drawer-menu"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "@/app/contexts/theme-context"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { theme } = useTheme()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false)
  const [currentDate, setCurrentDate] = useState<string>("")
  const [hasMounted, setHasMounted] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()

  // Verificar si el componente se ha montado en el cliente
  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    // Sólo ejecutar en el cliente después del montaje
    if (hasMounted) {
      // Actualizamos la fecha solo en el cliente para evitar errores de hidratación
      setCurrentDate(format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }))
      
      // Actualizar la fecha cada minuto
      const intervalId = setInterval(() => {
        setCurrentDate(format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }))
      }, 60000)
      
      return () => clearInterval(intervalId)
    }
  }, [hasMounted])

  useEffect(() => {
    if (typeof window === "undefined") return

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Cerrar el menú de notificaciones cuando se hace clic fuera de él
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showNotifications && !target.closest("#notifications-menu") && !target.closest("#notifications-button")) {
        setShowNotifications(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showNotifications])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:flex-row">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b z-50 app-header">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(true)} className="md:hidden text-white hover:bg-white/10">
              <Menu className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex text-white hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex flex-col">
              <div className="h-8 flex items-center">
                {hasMounted ? (
                  <>
                    {!logoError && theme?.logoUrl ? (
                      <img 
                        src={theme.logoUrl} 
                        alt="Logo" 
                        className="h-8 object-contain max-w-[140px]"
                        onError={() => {
                          // Si hay error, mostrar texto en lugar de imagen
                          setLogoError(true)
                        }}
                      />
                    ) : (
                      <div className="text-xl font-semibold text-white">LOGO</div>
                    )}
                  </>
                ) : (
                  <div className="text-xl font-semibold text-white">LOGO</div>
                )}
              </div>
              <div className="text-xs text-white/80">
                {hasMounted ? currentDate : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Campana de notificaciones */}
            <div className="relative">
              <button
                id="notifications-button"
                className="p-2 rounded-full hover:bg-white/10 relative text-white"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              </button>

              {/* Menú de notificaciones */}
              {showNotifications && (
                <div
                  id="notifications-menu"
                  className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border"
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="font-medium">Notificaciones</span>
                    <button className="text-xs text-blue-600 hover:text-blue-800">Marcar todo como leído</button>
                  </div>
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-gray-500">No hay notificaciones nuevas</div>
                  </div>
                </div>
              )}
            </div>

            <ClientCardWrapper />
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <MobileDrawerMenu isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Sidebar for desktop */}
      {!isMobile && (
        <div className="fixed left-0 top-16 bottom-0 z-40">
          <MainSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 main-container ${
          isMobile ? "mt-16 pb-16" : isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        {/* Contenido scrolleable */}
        <div className="relative h-full overflow-auto">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 border-t z-50 grid grid-cols-5 app-footer">
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-full app-sidebar-item"
            onClick={() => router.push("/")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Inicio</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-full app-sidebar-item"
            onClick={() => router.push("/agenda")}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Agenda</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-full app-sidebar-item"
            onClick={() => router.push("/clientes")}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Clientes</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-full app-sidebar-item"
            onClick={() => router.push("/estadisticas")}
          >
            <BarChart2 className="h-5 w-5" />
            <span className="text-xs">Estadísticas</span>
          </Button>

          {/* User Avatar Menu in Mobile Navigation */}
          <DropdownMenu open={showMobileUserMenu} onOpenChange={setShowMobileUserMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex flex-col items-center justify-center h-full app-sidebar-item">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">RA</AvatarFallback>
                </Avatar>
                <span className="text-xs">Perfil</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 mb-16" // Add margin to avoid overlapping with bottom nav
              side="top"
            >
              <div className="flex items-center gap-3 p-3 border-b">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>RA</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Squad Chafiki</span>
                  <span className="text-xs text-muted-foreground">usuario@example.com</span>
                </div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/perfil/datos-personales">
                  <User className="mr-2 h-4 w-4" />
                  <span>Editar datos personales</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/perfil/suscripcion">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Mi suscripción</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/perfil/facturacion">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Datos de facturación</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/perfil/servicios">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Servicios contratados</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/perfil/facturas">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Facturas</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Desconectar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      )}
    </div>
  )
}

