import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { 
  MoreVertical, 
  Archive, 
  Trash2, 
  AlertCircle, 
  Star, 
  StarOff,
  Inbox,
  Send as SendIcon,
  FileText,
  Clock,
  AlertTriangle
} from "lucide-react"

interface EmailOptionsMenuProps {
  emailId: string
  isStarred: boolean
  currentFolder: string
  onToggleStarred: () => void
  onMoveToSpam: () => void
  onMoveToTrash: () => void
  onRestoreFromTrash: () => void
  onDeletePermanently: () => void
}

export function EmailOptionsMenu({
  emailId,
  isStarred,
  currentFolder,
  onToggleStarred,
  onMoveToSpam,
  onMoveToTrash,
  onRestoreFromTrash,
  onDeletePermanently,
}: EmailOptionsMenuProps) {
  const getMenuItems = () => {
    switch (currentFolder) {
      case "Papelera":
        return (
          <>
            <DropdownMenuItem onClick={onRestoreFromTrash}>
              <Inbox className="mr-2 h-4 w-4" />
              Restaurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeletePermanently} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar permanentemente
            </DropdownMenuItem>
          </>
        )
      case "Spam":
        return (
          <>
            <DropdownMenuItem onClick={onRestoreFromTrash}>
              <Inbox className="mr-2 h-4 w-4" />
              Restaurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveToTrash}>
              <Trash2 className="mr-2 h-4 w-4" />
              Mover a papelera
            </DropdownMenuItem>
          </>
        )
      case "Borradores":
        return (
          <>
            <DropdownMenuItem onClick={onToggleStarred}>
              {isStarred ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Quitar de favoritos
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Marcar como favorito
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveToTrash}>
              <Trash2 className="mr-2 h-4 w-4" />
              Mover a papelera
            </DropdownMenuItem>
          </>
        )
      case "Enviados":
        return (
          <>
            <DropdownMenuItem onClick={onToggleStarred}>
              {isStarred ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Quitar de favoritos
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Marcar como favorito
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveToTrash}>
              <Trash2 className="mr-2 h-4 w-4" />
              Mover a papelera
            </DropdownMenuItem>
          </>
        )
      default: // Recibidos
        return (
          <>
            <DropdownMenuItem onClick={onToggleStarred}>
              {isStarred ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Quitar de favoritos
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Marcar como favorito
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveToSpam}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Mover a spam
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveToTrash}>
              <Trash2 className="mr-2 h-4 w-4" />
              Mover a papelera
            </DropdownMenuItem>
          </>
        )
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {getMenuItems()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 