"use client"

import { useState } from "react"
import { MainSidebar } from "./main-sidebar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Barra lateral fija */}
      <MainSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />

      {/* Contenedor principal con margen izquierdo que se ajusta automáticamente */}
      <main 
        className="flex-1 overflow-auto"
        style={{ 
          marginLeft: isSidebarCollapsed ? "4rem" : "16rem",
          transition: "margin-left 0.3s ease-in-out"
        }}
      >
        {children}
      </main>
    </div>
  )
} 