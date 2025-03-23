"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { User, Calendar, ClipboardList, FileText, MessageCircle, Gift, Receipt, Camera, File, Bell, CreditCard, Target, Users, ChevronRight } from "lucide-react"
import { useLastClient } from "@/contexts/last-client-context"
import { useRouter } from "next/navigation"

interface FloatingClientMenuProps {
  className?: string
  onOutsideClick?: () => void
}

const menuItems = [
  {
    id: "historial",
    label: "Historial",
    icon: ClipboardList,
    href: "/clientes"
  },
  {
    id: "consentimientos",
    label: "Consentimientos",
    icon: FileText,
    href: "/clientes"
  },
  {
    id: "citas",
    label: "Citas",
    icon: Calendar,
    href: "/clientes"
  },
  {
    id: "mensajes-app",
    label: "Enviar mensaje App",
    icon: MessageCircle,
    href: "/clientes"
  },
  {
    id: "bonos",
    label: "Bonos",
    icon: Gift,
    href: "/clientes"
  },
  {
    id: "whatsapp",
    label: "Enviar mensaje WhatsApp",
    icon: MessageCircle,
    href: "/clientes"
  },
  {
    id: "suscripciones",
    label: "Suscripciones",
    icon: Users,
    href: "/clientes"
  },
  {
    id: "recibos",
    label: "Recibos pendientes",
    icon: Receipt,
    href: "/clientes"
  },
  {
    id: "fotos",
    label: "Fotografías",
    icon: Camera,
    href: "/clientes"
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: File,
    href: "/clientes"
  },
  {
    id: "avisos",
    label: "Avisos",
    icon: Bell,
    href: "/clientes"
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: CreditCard,
    href: "/clientes"
  }
]

export function FloatingClientMenu({ className, onOutsideClick }: FloatingClientMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { lastClient } = useLastClient()
  const router = useRouter()

  // Si no hay cliente activo, no renderizamos el menú
  if (!lastClient) return null

  // Cerrar el menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveSection(null)
        // Notificar al padre para que también cierre la barra lateral si es necesario
        onOutsideClick?.()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onOutsideClick])

  const handleMenuItemClick = (href: string) => {
    router.push(`${href}/${lastClient.id}`)
    setActiveSection(null)
    setIsOpen(false)
  }

  return (
    <div 
      ref={menuRef}
      className={cn(
        "fixed right-4 top-4 z-[9999]",
        className
      )}
    >
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out relative",
          isOpen ? "w-80" : "w-12",
          "bg-white rounded-lg shadow-lg border"
        )}
      >
        {/* Botón circular para abrir/cerrar */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-12 h-12 rounded-full bg-purple-600 text-white hover:bg-purple-700",
            isOpen ? "absolute right-0 top-0" : "relative"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <User className="w-6 h-6" />
        </Button>

        {/* Contenido del menú */}
        {isOpen && (
          <div className="pl-4 pr-16 mt-2">
            {/* Información del cliente */}
            <div className="py-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 text-lg font-medium text-purple-600 bg-purple-100 rounded-full">
                  {lastClient.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{lastClient.name}</div>
                  {lastClient.clientNumber && (
                    <div className="text-sm text-gray-500">#{lastClient.clientNumber}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Menú de opciones */}
            <div className="pb-4 space-y-1">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start hover:bg-purple-50 hover:text-purple-600",
                    activeSection === item.id && "bg-purple-50 text-purple-600"
                  )}
                  onClick={() => handleMenuItemClick(item.href)}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 