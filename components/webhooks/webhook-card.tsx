"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"

import { 
  MoreHorizontal, 
  Copy, 
  Eye, 
  Settings2, 
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Clock
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { WebhookEditModal } from "./webhook-edit-modal"
import { WebhookLogsModal } from "./webhook-logs-modal"

interface WebhookCardProps {
  webhook: {
    id: string
    name: string
    description?: string
    slug: string
    direction: "incoming" | "outgoing" | "bidirectional"
    isActive: boolean
    url: string
    allowedMethods: string[]
    totalCalls: number
    successfulCalls: number
    lastTriggered?: Date
    createdAt: Date
    category?: string
    token?: string
    systemId?: string
    rateLimitPerMinute?: number
    ipWhitelist?: string[]
    customHeaders?: any
    secretKey?: string
    targetUrl?: string
    triggerEvents?: string[]
    expectedSchema?: any
    dataMapping?: any
  }
  onWebhookUpdate?: () => void
}

const getDirectionStyles = (direction: string) => {
    const normalizedDirection = direction.toUpperCase()
    switch (normalizedDirection) {
      case "INCOMING":
        return {
          icon: <ArrowDown className="h-3 w-3" />,
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        };
      case "OUTGOING":
        return {
          icon: <ArrowUp className="h-3 w-3" />,
          className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
        };
      case "BIDIRECTIONAL":
        return {
          icon: <ArrowUpDown className="h-3 w-3" />,
          className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
        };
      default:
        return {
          icon: <ArrowUpDown className="h-3 w-3" />,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        };
    }
}

export function WebhookCard({ webhook, onWebhookUpdate }: WebhookCardProps) {
  const [isActive, setIsActive] = useState(webhook.isActive)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  
  const successRate = webhook.totalCalls > 0 
    ? Math.round((webhook.successfulCalls / webhook.totalCalls) * 100)
    : 0;
  
  // Asegurar valores numéricos válidos
  const totalCalls = webhook.totalCalls || 0;
  const successfulCalls = webhook.successfulCalls || 0;
  const errorCount = totalCalls - successfulCalls;

  const directionStyles = getDirectionStyles(webhook.direction);

  const getSuccessRateColor = () => {
    if (successRate >= 95) return "text-green-600";
    if (successRate >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const handleToggleActive = async () => {
    // ✅ RENDERIZACIÓN OPTIMISTA - Actualizar UI inmediatamente
    const previousState = isActive
    const newState = !isActive
    setIsActive(newState)
    
    try {
      const response = await fetch(`/api/internal/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: newState
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar webhook')
      }

      toast.success(`Webhook ${newState ? 'activado' : 'desactivado'} correctamente`)
      
      // Actualizar la lista de webhooks
      onWebhookUpdate?.()
    } catch (error) {
      // ❌ ROLLBACK - Revertir SOLO en caso de error
      setIsActive(previousState)
      toast.error('Error al cambiar el estado del webhook')
      console.error('Error:', error)
    }
  }

  const handleCopyUrl = async () => {
    // Construir la URL correcta
    const baseUrl = window.location.origin
    const correctUrl = `${baseUrl}/api/webhooks/${webhook.id}/${webhook.slug}`
    
    await navigator.clipboard.writeText(correctUrl)
    toast.success("URL copiada al portapapeles")
  }

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true)
  }

  const handleOpenLogsModal = () => {
    setIsLogsModalOpen(true)
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar este webhook? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const response = await fetch(`/api/internal/webhooks/${webhook.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar webhook')
      }
      
      toast.success("Webhook eliminado correctamente")
      
      // Llamar callback para refrescar la lista
      onWebhookUpdate?.()
      
    } catch (error) {
      console.error('Error deleting webhook:', error)
      toast.error("Error al eliminar el webhook")
    }
  }

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-lg hover:border-primary/20 h-fit",
        !isActive && "opacity-60"
      )}>
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{webhook.name}</h3>
                <Badge variant="outline" className={cn("text-xs gap-1 pl-1 pr-1.5 py-0.5 h-5", directionStyles.className)}>
                  {directionStyles.icon}
                  <span className="font-medium text-xs">{webhook.direction}</span>
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">slug:</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {webhook.slug}
                </code>
                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                  {webhook.allowedMethods[0]}{webhook.allowedMethods.length > 1 ? '+' : ''}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 border-0 outline-none shadow-none">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleCopyUrl} className="text-xs">
                  <Copy className="h-3 w-3 mr-2" />
                  Copiar URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenLogsModal} className="text-xs">
                  <Eye className="h-3 w-3 mr-2" />
                  Ver Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenEditModal} className="text-xs">
                  <Settings2 className="h-3 w-3 mr-2" />
                  Configurar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive text-xs">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="px-3 pb-3 space-y-2">
          {/* Estado y Botón */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Estado</span>
            <Button
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={handleToggleActive}
              className={cn(
                "h-6 w-12 text-xs font-medium",
                isActive 
                  ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                  : "bg-red-500 hover:bg-red-600 text-white border-red-500"
              )}
            >
              {isActive ? "ON" : "OFF"}
            </Button>
          </div>
          
          {/* Stats en una línea */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className="text-xs px-1 py-0.5 h-4 bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                Calls: {totalCalls}
              </Badge>
              <Badge variant="outline" className={cn(
                "text-xs px-1 py-0.5 h-4 whitespace-nowrap",
                successRate >= 95 ? "bg-green-50 text-green-700 border-green-200" :
                successRate >= 80 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                "bg-red-50 text-red-700 border-red-200"
              )}>
                Success: {successRate}%
              </Badge>
              <Badge variant="outline" className={cn(
                "text-xs px-1 py-0.5 h-4 whitespace-nowrap",
                errorCount > 0 
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-green-50 text-green-700 border-green-200"
              )}>
                Errors: {errorCount}
              </Badge>
            </div>
            {webhook.lastTriggered && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(webhook.lastTriggered, { locale: es })}</span>
              </div>
            )}
          </div>
          
          {/* URL compacta */}
          <div className="flex items-center gap-1 p-1.5 bg-muted rounded text-xs overflow-hidden">
            <code className="flex-1 text-muted-foreground whitespace-nowrap overflow-x-auto">
              {`${window.location?.origin}/api/webhooks/${webhook.id}/${webhook.slug}`}
            </code>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 border-0 outline-none shadow-none" onClick={handleCopyUrl}>
              <Copy className="h-2.5 w-2.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modales */}
      <WebhookEditModal
        key={`edit-${webhook.id}`}
        webhook={webhook}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdate={onWebhookUpdate}
      />

      <WebhookLogsModal
        webhook={webhook}
        open={isLogsModalOpen}
        onOpenChange={setIsLogsModalOpen}
      />
    </>
  )
}
