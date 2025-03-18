"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, LogOut, User, Settings, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function SidebarWithAvatar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Ejemplo de estructura de menú
  const menuItems = [
    { name: "Inicio", href: "/", icon: "home" },
    { name: "Clientes", href: "/clientes", icon: "users" },
    { name: "Agenda", href: "/agenda", icon: "calendar" },
    // Añade más elementos según sea necesario
  ]

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-white border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between">
            {!isCollapsed && <div className="text-xl font-bold">LOGO</div>}
            <Button variant="ghost" size="icon" onClick={onToggle} className="text-gray-500 hover:text-gray-700">
              <ChevronRight className={cn("h-5 w-5 transition-transform", isCollapsed ? "" : "rotate-180")} />
            </Button>
          </div>
        </div>

        <nav className="mt-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100",
                    pathname === item.href && "bg-gray-100 text-purple-600",
                    isCollapsed ? "justify-center" : "",
                  )}
                >
                  <span className="material-icons">{item.icon}</span>
                  {!isCollapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User Avatar at the bottom */}
      <div className="p-4 border-t">
        <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full flex items-center text-left",
                isCollapsed ? "justify-center p-0" : "justify-start px-2",
              )}
            >
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-purple-800">RA</span>
              </div>
              {!isCollapsed && (
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium truncate">Squad Chafiki</p>
                  <p className="text-xs text-gray-500 truncate">usuario@example.com</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "center" : "end"} className="w-56">
            <div className="flex items-center gap-3 p-3 border-b">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-medium text-purple-800">RA</span>
              </div>
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
      </div>
    </div>
  )
}

