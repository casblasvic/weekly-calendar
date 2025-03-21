"use client"

import { useState, useEffect } from "react"
import { useLastClient } from "@/contexts/last-client-context"
import { useClientCard } from "@/contexts/client-card-context"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Share2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const quickActions = [
  { label: "Historial", path: "/historial" },
  { label: "Consentimientos", path: "/consentimientos" },
  { label: "Aplazado", path: "/aplazado" },
  { label: "Bonos", path: "/bonos" },
  { label: "Fotografías", path: "/fotografias" },
  { label: "Avisos", path: "/avisos" },
]

export function ClientCardWrapper({ children }: { children?: React.ReactNode }) {
  const { lastClient } = useLastClient()
  const { hideMainCard } = useClientCard()
  const [showQuickActions, setShowQuickActions] = useState(false)
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  // Efecto para marcar cuándo estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't show the wrapper on the search page
  if (pathname === "/clientes/busqueda") return null

  if (!isClient || (!lastClient && !hideMainCard)) return null

  // Generar iniciales para el avatar
  const getInitials = () => {
    if (!lastClient?.name) return "?";
    return lastClient.name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2) // Limitar a 2 iniciales
      .join("")
      .toUpperCase();
  };

  return (
    <div
      className="relative"
      onMouseEnter={hideMainCard ? undefined : () => setShowQuickActions(true)}
      onMouseLeave={hideMainCard ? undefined : () => setShowQuickActions(false)}
    >
      <Card className="w-64 transition-all duration-300 hover:shadow-lg border border-gray-200">
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <Avatar className="h-9 w-9 shrink-0 bg-purple-100">
                {lastClient?.avatar ? (
                  <AvatarImage src={lastClient.avatar} alt={lastClient.name} />
                ) : (
                  <AvatarFallback className="bg-purple-100 text-purple-800 font-medium">
                    {getInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 max-w-[120px]">
                <h2 className="text-sm font-medium text-purple-600 truncate">{lastClient?.name}</h2>
                <p className="text-xs text-gray-500 truncate">Nº: {lastClient?.clientNumber}</p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {showQuickActions && (
        <div
          className="absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {quickActions.map((action) => (
            <Link
              key={action.path}
              href={`/clientes/${lastClient?.id}${action.path}`}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-purple-50 hover:text-purple-600"
              onClick={() => setShowQuickActions(false)}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

