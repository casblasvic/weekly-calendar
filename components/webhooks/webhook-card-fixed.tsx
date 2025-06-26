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
  Activity
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { WebhookEditModal } from "./webhook-edit-modal"

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
}

export function WebhookCard({ webhook }: WebhookCardProps) {
  const [isActive, setIsActive] = useState(webhook.isActive)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  const successRate = webhook.totalCalls > 0 
    ? Math.round((webhook.successfulCalls / webhook.totalCalls) * 100)
    : 0

  const handleToggleActive = async () => {
    setIsActive(!isActive)
    toast.success(`Webhook ${!isActive ? 'activado' : 'desactivado'} correctamente`)
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(webhook.url)
    toast.success("URL copiada al portapapeles")
  }

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true)
  }

  const getDirectionIcon = () => {
    switch (webhook.direction) {
      case "incoming":
        return <ArrowDown className="w-3 h-3" />
      case "outgoing":
        return <ArrowUp className="w-3 h-3" />
      case "bidirectional":
        return <ArrowUpDown className="w-3 h-3" />
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
        "transition-all hover:shadow-md",
        !isActive && "opacity-60"
      )}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex gap-2 items-center">
                <h3 className="font-medium truncate">{webhook.name}</h3>
                <Badge 
                  variant="secondary" 
                  className={cn("gap-1 text-xs", getDirectionColor())}
                >
                  {getDirectionIcon()}
                  {webhook.direction}
                </Badge>
              </div>
              
              {webhook.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {webhook.description}
                </p>
              )}
              
              <div className="flex gap-2 items-center">
                <code className="px-2 py-1 text-xs rounded bg-muted">
                  {webhook.slug}
                </code>
                <Badge variant="outline" className="text-xs">
                  {webhook.allowedMethods.join(", ")}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="mr-2 w-4 h-4" />
                  Copiar URL
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 w-4 h-4" />
                  Ver Logs
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Activity className="mr-2 w-4 h-4" />
                  Probar Webhook
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenEditModal}>
                  <Settings2 className="mr-2 w-4 h-4" />
                  Configurar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 w-4 h-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Estado</span>
            <div className="flex gap-2 items-center">
              <span className={cn(
                "text-sm",
                isActive ? "text-green-600" : "text-muted-foreground"
              )}>
                {isActive ? "Activo" : "Inactivo"}
              </span>
              <Switch 
                checked={isActive}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total llamadas</p>
              <p className="font-medium">{webhook.totalCalls.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tasa éxito</p>
              <p className={cn("font-medium", getSuccessRateColor())}>
                {successRate}%
              </p>
            </div>
          </div>
          
          {webhook.lastTriggered && (
            <div className="text-sm">
              <p className="text-muted-foreground">Última actividad</p>
              <p className="font-medium">
                {formatDistanceToNow(webhook.lastTriggered, { 
                  addSuffix: true, 
                  locale: es 
                })}
              </p>
            </div>
          )}
          
          <div className="text-xs">
            <p className="mb-1 text-muted-foreground">URL del webhook</p>
            <div className="flex gap-1 items-center p-2 rounded bg-muted text-muted-foreground">
              <code className="flex-1 truncate">{webhook.url}</code>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 w-6 h-6"
                onClick={handleCopyUrl}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <WebhookEditModal
        webhook={webhook}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </>
  )
} 