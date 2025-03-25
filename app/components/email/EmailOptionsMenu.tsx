"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Star, StarOff, Archive, Trash2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface EmailOptionsMenuProps {
  id: string
  folder: string
  onToggleStarred: (id: string) => void
  onMoveToSpam: (id: string) => void
  onMoveToTrash: (id: string) => void
  onDeletePermanently: (id: string) => void
}

export function EmailOptionsMenu({
  id,
  folder,
  onToggleStarred,
  onMoveToSpam,
  onMoveToTrash,
  onDeletePermanently
}: EmailOptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onToggleStarred(id)}>
          <Star className="mr-2 h-4 w-4" />
          Marcar como favorito
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToSpam(id)}>
          <AlertCircle className="mr-2 h-4 w-4" />
          Mover a spam
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToTrash(id)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Mover a papelera
        </DropdownMenuItem>
        {folder === "Papelera" && (
          <DropdownMenuItem onClick={() => onDeletePermanently(id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar permanentemente
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 