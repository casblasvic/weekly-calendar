"use client"

import { useState, useEffect } from "react"
import { useLastClient } from "@/contexts/last-client-context"
import { useClientCard } from "@/contexts/client-card-context"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  RefreshCcw, 
  Share2, 
  User, 
  FileText,
  Calendar, 
  Gift, 
  Camera, 
  Bell, 
  MoreVertical,
  ClipboardList
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

interface ClientCardWrapperProps {
  isCompact?: boolean
}

const getInitials = (name?: string): string => {
  if (!name) return "N/A"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "N/A"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  return "N/A"
}

// Usar exactamente las mismas pestañas que en la ficha del cliente
const clientTabs = [
  { id: "details", label: "Datos", path: "", icon: User },
  { id: "history", label: "Historial", path: "/historial", icon: FileText },
  { id: "consents", label: "Consentimientos", path: "/consentimientos", icon: FileText },
  { id: "deferred", label: "Aplazado", path: "/aplazado", icon: Calendar },
  { id: "vouchers", label: "Bonos", path: "/bonos", icon: Gift },
  { id: "photos", label: "Fotografías", path: "/fotografias", icon: Camera },
  { id: "notifications", label: "Avisos", path: "/avisos", icon: Bell },
]

export function ClientCardWrapper({ isCompact = false }: ClientCardWrapperProps) {
  const { lastClient } = useLastClient()
  const { hideMainCard } = useClientCard()
  const [showQuickActions, setShowQuickActions] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [isClientPage, setIsClientPage] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Comprobar si estamos en una página de cliente
    setIsClientPage(pathname?.startsWith("/clientes/") || false)
  }, [pathname])

  // Función para mostrar/ocultar el menú de acciones rápidas
  const toggleQuickActions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickActions(!showQuickActions);
  };

  // Don't show the wrapper on the search page
  if (pathname === "/clientes/busqueda") {
    return null
  }

  if (!isClient) {
    return <div className="w-10 h-7" />
  }

  if (!lastClient) {
    return (
      <div className={isCompact ? "flex items-center justify-center" : "flex items-center"}>
        {isCompact ? (
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
            --
          </div>
        ) : (
          <div className="text-sm text-gray-500">Sin cliente reciente</div>
        )}
      </div>
    )
  }

  // Versión compacta para modo colapsado
  if (isCompact) {
    return (
      <div className="flex justify-center">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-800 font-medium">
          {getInitials(lastClient.name)}
        </div>
      </div>
    )
  }

  // Versión normal para barra expandida
  return (
    <div
      className="relative overflow-visible max-w-full"
      onMouseEnter={hideMainCard ? undefined : () => setShowQuickActions(true)}
      onMouseLeave={hideMainCard ? undefined : () => setShowQuickActions(false)}
    >
      <Card className="w-full transition-all duration-300 hover:shadow-lg border border-gray-200">
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div 
              className="flex items-center gap-2 min-w-0 flex-shrink cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/clientes/${lastClient?.id}`);
              }}
            >
              <Avatar className="h-9 w-9 shrink-0 bg-purple-100">
                {lastClient?.avatar ? (
                  <AvatarImage src={lastClient.avatar} alt={lastClient.name} />
                ) : (
                  <AvatarFallback className="bg-purple-100 text-purple-800 font-medium">
                    {getInitials(lastClient.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 max-w-[120px]">
                <h2 className="text-sm font-medium text-purple-600 truncate">{lastClient?.name}</h2>
                <p className="text-xs text-gray-500 truncate">Nº: {lastClient?.clientNumber}</p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={toggleQuickActions}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {showQuickActions && (
        <div
          className="absolute top-full right-0 z-[99999] mt-1 w-64 rounded-lg border bg-white shadow-lg client-card-menu"
          style={{
            display: "block",
            visibility: "visible" as const,
            opacity: 1,
            pointerEvents: "auto" as const,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {clientTabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/clientes/${lastClient?.id}${tab.path}`}
              className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-purple-50 hover:text-purple-600"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickActions(false);
              }}
            >
              {tab.icon && <tab.icon className="h-4 w-4 mr-2 text-purple-500" />}
              {tab.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

