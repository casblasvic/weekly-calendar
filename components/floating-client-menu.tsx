"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { User, Calendar, ClipboardList, FileText, MessageCircle, Gift, Receipt, Camera, File, Bell, CreditCard, Target, Users, ChevronRight } from "lucide-react"
import { useLastClient } from "@/contexts/last-client-context"
import { useRouter } from "next/navigation"
import { FloatingMenuBase } from "@/components/ui/floating-menu-base"
import { motion, AnimatePresence } from "framer-motion"

interface FloatingClientMenuProps {
  className?: string
  onOutsideClick?: () => void
  autoCollapseTimeout?: number
  onMenuToggle?: () => void
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

export function FloatingClientMenu({ className, onOutsideClick, autoCollapseTimeout, onMenuToggle }: FloatingClientMenuProps) {
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
    <div className="bg-white rounded-md overflow-hidden" style={{ width: "210px" }}>
      {/* Encabezado con información del cliente */}
      <div className="p-2.5 border-b bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-purple-600 bg-purple-100 rounded-full border-2 border-white shadow-sm">
            {lastClient.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-xs text-gray-800 leading-tight">{lastClient.name}</div>
            {lastClient.clientNumber && (
              <div className="text-[10px] text-gray-500 flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full mr-1"></span>
                #{lastClient.clientNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menú de opciones - con animación al aparecer */}
      <div className="py-1 max-h-[calc(100vh-180px)] overflow-y-auto menu-items-animation">
        <style jsx global>{`
          @keyframes menuItemAppear {
            0% { 
              opacity: 0; 
              transform: translateY(2px);
            }
            100% { 
              opacity: 1; 
              transform: translateY(0);
            }
          }
          
          .menu-items-animation > * {
            animation: menuItemAppear 0.2s ease-out forwards;
            opacity: 0;
          }
          
          .menu-items-animation > *:nth-child(2) { animation-delay: 0.03s; }
          .menu-items-animation > *:nth-child(3) { animation-delay: 0.06s; }
          .menu-items-animation > *:nth-child(4) { animation-delay: 0.09s; }
          .menu-items-animation > *:nth-child(5) { animation-delay: 0.12s; }
          .menu-items-animation > *:nth-child(6) { animation-delay: 0.15s; }
          .menu-items-animation > *:nth-child(7) { animation-delay: 0.18s; }
          .menu-items-animation > *:nth-child(8) { animation-delay: 0.21s; }
          .menu-items-animation > *:nth-child(9) { animation-delay: 0.24s; }
          .menu-items-animation > *:nth-child(10) { animation-delay: 0.27s; }
          .menu-items-animation > *:nth-child(11) { animation-delay: 0.30s; }
          .menu-items-animation > *:nth-child(12) { animation-delay: 0.33s; }
          .menu-items-animation > *:nth-child(13) { animation-delay: 0.36s; }
        `}</style>
        
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full px-2.5 py-1.5 justify-start hover:bg-purple-50 hover:text-purple-600 rounded-none border-l-2 border-transparent text-xs",
              activeSection === item.id 
                ? "bg-purple-50 text-purple-600 border-l-2 border-purple-500" 
                : "text-gray-700"
            )}
            onClick={() => handleMenuItemClick(item)}
          >
            <div className="flex items-center w-4 h-4 mr-1.5 text-purple-500">
              <item.icon className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left truncate">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
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
      onMenuToggle={onMenuToggle}
    >
      {menuContent}
    </FloatingMenuBase>
  )
} 