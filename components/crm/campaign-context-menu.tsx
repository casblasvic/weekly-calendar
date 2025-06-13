"use client"

import { 
  MoreVertical, Edit, Copy, Play, Pause, BarChart3, 
  Users, Send, Archive, Trash2, Calendar
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface CampaignContextMenuProps {
  campaign: any
  onEdit?: () => void
  onDuplicate?: () => void
  onViewStats?: () => void
  onViewAudience?: () => void
  onSchedule?: () => void
  onSendTest?: () => void
  onActivate?: () => void
  onPause?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

export function CampaignContextMenu({
  campaign,
  onEdit,
  onDuplicate,
  onViewStats,
  onViewAudience,
  onSchedule,
  onSendTest,
  onActivate,
  onPause,
  onArchive,
  onDelete
}: CampaignContextMenuProps) {
  const isActive = campaign.status === "active"
  const isDraft = campaign.status === "draft"
  const isPaused = campaign.status === "paused"
  const isCompleted = campaign.status === "completed"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        
        {/* Acciones principales */}
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar campaña
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Acciones de estado */}
        {isDraft && (
          <>
            <DropdownMenuItem onClick={onSchedule}>
              <Calendar className="h-4 w-4 mr-2" />
              Programar envío
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onSendTest}>
              <Send className="h-4 w-4 mr-2" />
              Enviar prueba
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onActivate} className="text-green-600">
              <Play className="h-4 w-4 mr-2" />
              Activar campaña
            </DropdownMenuItem>
          </>
        )}

        {isActive && (
          <DropdownMenuItem onClick={onPause} className="text-orange-600">
            <Pause className="h-4 w-4 mr-2" />
            Pausar campaña
          </DropdownMenuItem>
        )}

        {isPaused && (
          <DropdownMenuItem onClick={onActivate} className="text-green-600">
            <Play className="h-4 w-4 mr-2" />
            Reanudar campaña
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Acciones de visualización */}
        <DropdownMenuItem onClick={onViewStats}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Ver estadísticas
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onViewAudience}>
          <Users className="h-4 w-4 mr-2" />
          Ver audiencia
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Acciones destructivas */}
        {(isCompleted || isDraft) && (
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4 mr-2" />
            Archivar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={onDelete} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
