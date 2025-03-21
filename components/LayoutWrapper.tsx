"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { MainSidebar } from "@/components/main-sidebar"
import { Button } from "@/components/ui/button"
import { Home, Calendar, Users, BarChart2, User, LogOut, Settings, FileText } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { MobileDrawerMenu } from "@/components/mobile/layout/drawer-menu"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  
  // Verificar si el componente se ha montado en el cliente
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Si no estamos montados, mostrar un layout básico
  if (!hasMounted) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar con header integrado - siempre visible en todas las pantallas */}
      <MainSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="block" // Siempre mostrar la barra, sin importar el tamaño de pantalla
      />

      {/* Contenido principal */}
      <main
        className="flex-1 overflow-auto"
        style={{
          marginLeft: isSidebarCollapsed ? "4rem" : "16rem", // Siempre considerar espacio para la barra lateral
          transition: "margin-left 0.3s ease-in-out",
          width: "calc(100% - 16rem)", // Ajustar el ancho para evitar desbordamiento
        }}
      >
        {children}
      </main>
    </div>
  )
}

