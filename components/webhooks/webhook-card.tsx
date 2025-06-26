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
import { Switch } from "@/components/ui/switch"
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

export function WebhookCard({ webhook, onWebhookUpdate }: WebhookCardProps) {
  const [isActive, setIsActive] = useState(webhook.isActive)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  
  const successRate = webhook.totalCalls > 0 
    ? Math.round((webhook.successfulCalls / webhook.totalCalls) * 100)
    : 0

  const handleToggleActive = async () => {
    try {
      const response = await fetch(`/api/internal/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !isActive
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar webhook')
      }

      setIsActive(!isActive)
      toast.success(`Webhook ${!isActive ? 'activado' : 'desactivado'} correctamente`)
    } catch (error) {
      toast.error('Error al cambiar el estado del webhook')
      console.error('Error:', error)
    }
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(webhook.url)
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

  const getDirectionIcon = () => {
    switch (webhook.direction) {
      case "incoming":
        return <ArrowDown className="h-3 w-3" />
      case "outgoing":
        return <ArrowUp className="h-3 w-3" />
      case "bidirectional":
        return <ArrowUpDown className="h-3 w-3" />
    }
  }

  const getDirectionColor = () => {
    switch (webhook.direction) {
      case "incoming":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "outgoing":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "bidirectional":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
    }
  }

  const getSuccessRateColor = () => {
    if (successRate >= 95) return "text-green-600"
    if (successRate >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-md h-fit",
        !isActive && "opacity-60"
      )}>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{webhook.name}</h3>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs gap-1 px-1 py-0", getDirectionColor())}
                >
                  {getDirectionIcon()}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {webhook.slug}
                </code>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {webhook.allowedMethods[0]}{webhook.allowedMethods.length > 1 ? '+' : ''}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
        
        <CardContent className="px-4 pb-4 space-y-2">
          {/* Estado y Switch */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Estado</span>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-xs",
                isActive ? "text-green-600" : "text-muted-foreground"
              )}>
                {isActive ? "Activo" : "Inactivo"}
              </span>
              <Switch 
                checked={isActive}
                onCheckedChange={handleToggleActive}
                className="scale-75"
              />
            </div>
          </div>
          
          {/* Stats en una línea */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Calls: <span className="font-medium text-foreground">{webhook.totalCalls}</span>
              </span>
              <span className="text-muted-foreground">
                Success: <span className={cn("font-medium", getSuccessRateColor())}>{successRate}%</span>
              </span>
            </div>
            {webhook.lastTriggered && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(webhook.lastTriggered, { locale: es })}</span>
              </div>
            )}
          </div>
          
          {/* URL compacta */}
          <div className="flex items-center gap-1 p-1.5 bg-muted rounded text-xs">
            <code className="flex-1 truncate text-muted-foreground">{webhook.url}</code>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={handleCopyUrl}
            >
              <Copy className="h-2.5 w-2.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modales */}
      <WebhookEditModal
        key={`edit-${webhook.id}-${isEditModalOpen}`}
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