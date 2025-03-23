"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Users, MessageCircle, Phone, Calendar, 
  Clock, CheckCircle, XCircle, Sun
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

interface StaffActionCardProps {
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

export function StaffActionCard({ person, onClose }: StaffActionCardProps) {
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
    <div 
      className="w-[170px] bg-white rounded-lg shadow-lg overflow-hidden"
      style={{ 
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
        animation: "cardSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
      }}
    >
      <style jsx global>{`
        @keyframes cardSlideIn {
          0% { 
            opacity: 0; 
            transform: translateX(-10px);
          }
          100% { 
            opacity: 1; 
            transform: translateX(0);
          }
        }
      `}</style>
      
      {/* Encabezado con información del empleado */}
      <div className="p-2.5 border-b bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full shadow-sm",
            "bg-blue-100 text-blue-600 text-sm font-medium"
          )}>
            {person.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div className="font-medium text-xs leading-tight">{person.name}</div>
            <div className="text-[10px] text-gray-500">{person.role}</div>
          </div>
        </div>
      </div>
      
      {/* Lista de acciones rápidas */}
      <div className="py-1">
        {availableActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2.5 py-1 h-auto text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-none"
            onClick={(e) => {
              e.stopPropagation();
              action.action(person.id);
              onClose();
              // Plegar todos los menús flotantes
              foldAllFloatingMenus();
            }}
          >
            <action.icon className="w-3.5 h-3.5 mr-2 text-blue-500" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
} 