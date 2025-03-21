"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, Bell, User, LogOut, Settings, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ClinicSelector } from "./clinic-selector"
import { ClientCardWrapper } from "./client-card-wrapper"

interface HeaderProps {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export function Header({ isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-16 border-b bg-white px-6 flex items-center justify-between relative z-40">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-purple-600 hover:bg-purple-50">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex flex-col">
          <div className="text-xl font-semibold">LOGO</div>
          <div className="text-xs text-purple-600">
            {format(currentDateTime, "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-end items-center gap-4">
        <ClinicSelector />

        {!pathname?.startsWith("/clientes/") && <ClientCardWrapper />}

        {/* System User Menu */}
        <button
          style={{
            width: "30px",
            height: "30px",
            backgroundColor: "purple",
            color: "white",
            fontWeight: "bold",
            border: "none",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          4
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="font-medium">Notificaciones</span>
              <Button variant="ghost" size="sm" className="text-xs">
                Marcar todo como leído
              </Button>
            </div>
            <div className="py-2">
              <div className="px-4 py-2 text-sm text-gray-500">No hay notificaciones nuevas</div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-medium text-purple-800">RA</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white" align="end">
            <div className="flex items-center gap-3 p-3 border-b">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-medium text-purple-800">RA</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Squad Chafiki</span>
                <span className="text-xs text-muted-foreground">usuario@example.com</span>
              </div>
            </div>
            <DropdownMenuItem asChild className="text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              <Link href="/perfil/datos-personales">
                <User className="mr-2 h-4 w-4" />
                <span>Editar datos personales</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              <Link href="/perfil/suscripcion">
                <Settings className="mr-2 h-4 w-4" />
                <span>Mi suscripción</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              <Link href="/perfil/facturacion">
                <FileText className="mr-2 h-4 w-4" />
                <span>Datos de facturación</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              <Link href="/perfil/servicios">
                <Settings className="mr-2 h-4 w-4" />
                <span>Servicios contratados</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              <Link href="/perfil/facturas">
                <FileText className="mr-2 h-4 w-4" />
                <span>Facturas</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 hover:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Desconectar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

