"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  MessageCircle, Phone, CheckCircle, 
  Clock, XCircle, Sun
} from "lucide-react"

interface StaffMember {
  id: number
  name: string
  role: string
  isOnline: boolean
  avatar: string | null
  status: string
  absenceReason: string | null
}

interface StaffActionCardMobileProps {
  person: StaffMember
  onClose: () => void
}

const staffActionItems = [
  {
    id: "message",
    label: "Chat interno",
    icon: MessageCircle,
    action: (staffId: number) => console.log("Chat interno con", staffId),
    showWhenOffline: false
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: Phone,
    action: (staffId: number) => console.log("WhatsApp a", staffId),
    showWhenOffline: true
  },
  {
    id: "checkIn",
    label: "Marcar entrada",
    icon: CheckCircle,
    action: (staffId: number) => console.log("Marcar entrada de", staffId),
    showWhenOffline: true
  },
  {
    id: "late",
    label: "Registrar retraso",
    icon: Clock,
    action: (staffId: number) => console.log("Registrar retraso de", staffId),
    showWhenOffline: true
  },
  {
    id: "absence",
    label: "Marcar ausencia",
    icon: XCircle,
    action: (staffId: number) => console.log("Marcar ausencia de", staffId),
    showWhenOffline: true
  },
  {
    id: "vacation",
    label: "Solicitar vacaciones",
    icon: Sun,
    action: (staffId: number) => console.log("Solicitar vacaciones para", staffId),
    showWhenOffline: true
  }
]

// Versión adaptada para móvil, con un diseño más compacto y buttons horizontales
export function StaffActionCardMobile({ person, onClose }: StaffActionCardMobileProps) {
  // Filtrar acciones según el estado (online/offline)
  const availableActions = staffActionItems.filter(
    item => person.isOnline || item.showWhenOffline
  );

  // Función para plegar todos los menús flotantes
  const foldAllFloatingMenus = () => {
    // Cerrar los menús flotantes de personal
    const staffMenuElement = document.querySelector('.floating-staff-menu');
    if (staffMenuElement) {
      const event = new CustomEvent('close-menu', { bubbles: true });
      staffMenuElement.dispatchEvent(event);
    }
    
    // Cerrar los menús flotantes de cliente
    const clientMenuElement = document.querySelector('.floating-client-menu');
    if (clientMenuElement) {
      const event = new CustomEvent('close-menu', { bubbles: true });
      clientMenuElement.dispatchEvent(event);
    }
  };

  return (
    <div className="w-full">
      {/* Acciones en grid de 2 columnas */}
      <div className="grid grid-cols-2 gap-2">
        {availableActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="w-full justify-start px-2 py-1 h-auto text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded"
            onClick={(e) => {
              e.stopPropagation();
              action.action(person.id);
              onClose();
              // Plegar todos los menús flotantes
              foldAllFloatingMenus();
            }}
          >
            <action.icon className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
} 