"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Share2 } from "lucide-react"
import Link from "next/link"
import { useLastClient } from "@/contexts/last-client-context"

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "RA"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  return "RA"
}

const quickActions = [
  { label: "Historial", path: "/historial" },
  { label: "Consentimientos", path: "/consentimientos" },
  { label: "Aplazado", path: "/aplazado" },
  { label: "Bonos", path: "/bonos" },
  { label: "Fotografías", path: "/fotografias" },
  { label: "Avisos", path: "/avisos" },
]

export function ClientCard() {
  const { lastClient } = useLastClient()
  const [showQuickActions, setShowQuickActions] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showQuickActions) {
        setShowQuickActions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showQuickActions])

  if (!lastClient) return null

  return (
    <div className="relative" onMouseEnter={() => setShowQuickActions(true)}>
      <Card className="w-full transition-all duration-300 hover:shadow-lg">
        <div className="p-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={lastClient.avatar} alt={lastClient.name} />
                <AvatarFallback>{getInitials(lastClient.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-sm font-semibold">{lastClient.name}</h2>
                <p className="text-xs text-gray-500">Nº: {lastClient.clientNumber}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm">
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick actions menu */}
      {showQuickActions && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border bg-white shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {quickActions.map((action) => (
            <Link
              key={action.path}
              href={`/clientes/${lastClient.id}${action.path}`}
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

