"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { MainSidebar } from "@/components/main-sidebar"
import { ClientCardWrapper } from "./client-card-wrapper"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ClinicSelector } from "./clinic-selector"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const pathname = usePathname()
  const [showBellMenu, setShowBellMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const showClientCard = !pathname?.startsWith("/clientes/")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <MainSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-white px-6 flex items-center justify-between relative z-40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-purple-600 hover:bg-purple-50"
            >
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
            {/* Campana de notificaciones */}
            <div className="relative">
              <button
                className="p-2 rounded-full bg-red-500 text-white relative"
                style={{ border: "3px solid yellow", padding: "10px" }}
                onClick={() => {
                  const bellMenu = document.getElementById("bell-menu")
                  if (bellMenu) {
                    bellMenu.style.display = bellMenu.style.display === "none" ? "block" : "none"
                  }
                }}
              >
                CAMPANA
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                </svg>
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              <div
                id="bell-menu"
                style={{ display: "none" }}
                className="absolute right-0 top-full mt-2 w-80 rounded-md border bg-white shadow-lg z-[9999]"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <span className="font-medium">Notificaciones</span>
                  <button className="text-xs text-blue-600 hover:underline">Marcar todo como leído</button>
                </div>
                <div className="py-2">
                  <div className="px-4 py-2 text-sm text-gray-500">No hay notificaciones nuevas</div>
                </div>
              </div>
            </div>
            <button
              style={{
                width: "30px",
                height: "30px",
                backgroundColor: "blue",
                color: "white",
                fontWeight: "bold",
                border: "none",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              2
            </button>

            {showClientCard && (
              <>
                <ClinicSelector />
                <div className="w-72">
                  <ClientCardWrapper position="header" />
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

