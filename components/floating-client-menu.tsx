"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { User, Calendar, ClipboardList, FileText, MessageCircle, Gift, Receipt, Camera, File, Bell, CreditCard, Target, Users, ChevronRight } from "lucide-react"
import { useLastClient } from "@/contexts/last-client-context"
import { useRouter } from "next/navigation"
import { FloatingMenuBase } from "@/components/ui/floating-menu-base"

interface FloatingClientMenuProps {
  className?: string
  onOutsideClick?: () => void
  autoCollapseTimeout?: number
}

const menuItems = [
  {
    id: "datos",
    label: "Datos del cliente",
    icon: User,
    href: "/clientes/[id]"
  },
  {
    id: "historial",
    label: "Historial",
    icon: ClipboardList,
    href: "/clientes/[id]/historial"
  },
  {
    id: "consentimientos",
    label: "Consentimientos",
    icon: FileText,
    href: "/clientes/[id]/consentimientos"
  },
  {
    id: "aplazado",
    label: "Aplazado",
    icon: Calendar,
    href: "/clientes/[id]/aplazado"
  },
  {
    id: "mensajes-app",
    label: "Enviar mensaje App",
    icon: MessageCircle,
    href: "/mensajes/app/[id]",
    isAction: true
  },
  {
    id: "bonos",
    label: "Bonos",
    icon: Gift,
    href: "/clientes/[id]/bonos"
  },
  {
    id: "whatsapp",
    label: "Enviar mensaje WhatsApp",
    icon: MessageCircle,
    href: "/mensajes/whatsapp/[id]",
    isAction: true
  },
  {
    id: "suscripciones",
    label: "Suscripciones",
    icon: Users,
    href: "/clientes/[id]/suscripciones"
  },
  {
    id: "recibos",
    label: "Recibos pendientes",
    icon: Receipt,
    href: "/clientes/[id]/recibos"
  },
  {
    id: "fotos",
    label: "Fotografías",
    icon: Camera,
    href: "/clientes/[id]/fotografias"
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: File,
    href: "/clientes/[id]/documentos"
  },
  {
    id: "avisos",
    label: "Avisos",
    icon: Bell,
    href: "/clientes/[id]/avisos"
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: CreditCard,
    href: "/clientes/[id]/facturacion"
  }
]

export function FloatingClientMenu({ className, onOutsideClick, autoCollapseTimeout }: FloatingClientMenuProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const { lastClient } = useLastClient()
  const router = useRouter()

  // Si no hay cliente activo, no renderizamos el menú
  if (!lastClient) return null

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    const url = item.href.replace('[id]', lastClient.id)
    router.push(url)
    setActiveSection(null)
  }

  const menuContent = (
    <>
      {/* Información del cliente */}
      <div className="p-4">
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
      <div className="px-4 pb-4 space-y-1">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full justify-start hover:bg-purple-50 hover:text-purple-600",
              activeSection === item.id && "bg-purple-50 text-purple-600"
            )}
            onClick={() => handleMenuItemClick(item)}
          >
            <item.icon className="w-4 h-4 mr-2" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        ))}
      </div>
    </>
  )

  return (
    <FloatingMenuBase
      className={className}
      onOutsideClick={onOutsideClick}
      icon={<User className="w-6 h-6" />}
      color="purple"
      isVisible={true}
      label="Cliente activo"
      autoCollapseTimeout={autoCollapseTimeout}
    >
      {menuContent}
    </FloatingMenuBase>
  )
} 