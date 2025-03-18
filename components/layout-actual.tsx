"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Menu, Bell } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"

interface LayoutActualProps {
  children: React.ReactNode
}

export function LayoutActual({ children }: LayoutActualProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showBellMenu, setShowBellMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:flex-row">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-50">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 hidden md:flex"
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
          <div className="flex items-center space-x-4">
            <button
              style={{
                width: "30px",
                height: "30px",
                backgroundColor: "green",
                color: "white",
                fontWeight: "bold",
                border: "none",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              3
            </button>
            {/* Campana de notificaciones */}
            <div className="relative">
              <button
                className="p-2 rounded-full bg-red-500 text-white relative"
                style={{ border: "3px solid yellow", padding: "10px" }}
                onClick={() => setShowBellMenu(!showBellMenu)}
              >
                CAMPANA
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              {showBellMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-md border bg-white shadow-lg z-[9999]">
                  <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="font-medium">Notificaciones</span>
                    <button className="text-xs text-blue-600 hover:underline">Marcar todo como leído</button>
                  </div>
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-gray-500">No hay notificaciones nuevas</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}

