"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Loader2, Copy, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface WebhookBasicFormProps {
  data: {
    name: string
    description: string
    direction: "incoming" | "outgoing" | "bidirectional"
    slug: string
  }
  onChange: (data: any) => void
  systemId: string
  isEditing?: boolean
  webhookId?: string
}

interface SlugValidation {
  isAvailable: boolean
  isChecking: boolean
  suggestions: string[]
}

export function WebhookBasicForm({ data, onChange, systemId, isEditing = false, webhookId }: WebhookBasicFormProps) {
  const [slugValidation, setSlugValidation] = useState<SlugValidation>({
    isAvailable: true,
    isChecking: false,
    suggestions: []
  })
  
  // Generar slug automáticamente desde el nombre
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
      .replace(/\s+/g, '-')         // Espacios → guiones
      .replace(/-+/g, '-')          // Múltiples guiones → uno solo
      .replace(/^-|-$/g, '')        // Eliminar guiones al inicio/final
  }
  
  const validateSlug = useCallback(async (slug: string) => {
    if (!slug) return
    
    setSlugValidation(prev => ({ ...prev, isChecking: true }))
    
    try {
      const response = await fetch('/api/internal/webhooks/validate-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, systemId, webhookId: isEditing ? webhookId : undefined })
      })
      
      if (!response.ok) {
        throw new Error('Failed to validate slug')
      }
      
      const validation = await response.json()
      
      setSlugValidation({
        isAvailable: validation.isAvailable,
        isChecking: false,
        suggestions: validation.suggestions || []
      })
    } catch (error) {
      console.error('Error validating slug:', error)
      setSlugValidation({
        isAvailable: false,
        isChecking: false,
        suggestions: []
      })
    }
  }, [systemId, isEditing, webhookId])
  
  // Validar slug cuando cambia
  useEffect(() => {
    if (data.slug) {
      validateSlug(data.slug)
    }
  }, [data.slug, validateSlug])
  
  const handleSlugChange = (newSlug: string) => {
    onChange({ ...data, slug: newSlug })
  }
  
  const regenerateSlug = () => {
    if (data.name) {
      const newSlug = generateSlug(data.name)
      onChange({ ...data, slug: newSlug })
    }
  }
  
  const copyUrl = () => {
    const url = `${window.location.origin}/api/webhooks/${systemId}/${data.slug}`
    navigator.clipboard.writeText(url)
    toast.success("URL copiada al portapapeles")
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Configuración Básica</h3>
        <p className="text-sm text-muted-foreground">
          Define la información básica de tu webhook
        </p>
      </div>

      <div className="grid gap-6">
        {/* Nombre del webhook */}
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del webhook *</Label>
          <Input
            id="name"
            placeholder="Ej: Formulario de contacto web"
            value={data.name}
            onChange={(e) => {
              const newName = e.target.value
              onChange({ ...data, name: newName })
              
              // Generar slug automáticamente mientras se escribe
              if (newName) {
                const autoSlug = generateSlug(newName)
                if (autoSlug !== data.slug) {
                  onChange({ ...data, name: newName, slug: autoSlug })
                }
              }
            }}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Nombre descriptivo para identificar este webhook
          </p>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            placeholder="Describe el propósito de este webhook..."
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Dirección del webhook */}
        <div className="space-y-2">
          <Label htmlFor="direction">Dirección *</Label>
          <Select
            value={data.direction}
            onValueChange={(value: "incoming" | "outgoing" | "bidirectional") => 
              onChange({ ...data, direction: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la dirección" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incoming">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    Incoming
                  </Badge>
                  <span>Recibir datos desde externos</span>
                </div>
              </SelectItem>
              <SelectItem value="outgoing">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                    Outgoing
                  </Badge>
                  <span>Enviar datos a externos</span>
                </div>
              </SelectItem>
              <SelectItem value="bidirectional">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                    Bidirectional
                  </Badge>
                  <span>Ambas direcciones</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Slug del webhook */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="slug">Slug del webhook *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={regenerateSlug}
              disabled={!data.name}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerar
            </Button>
          </div>
          
          <div className="relative">
            <Input
              id="slug"
              placeholder="mi-webhook-personalizado"
              value={data.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={cn(
                "pr-10",
                slugValidation.isAvailable && !slugValidation.isChecking && "border-green-500",
                !slugValidation.isAvailable && !slugValidation.isChecking && "border-red-500"
              )}
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugValidation.isChecking && <Loader2 className="h-4 w-4 animate-spin" />}
              {!slugValidation.isChecking && slugValidation.isAvailable && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {!slugValidation.isChecking && !slugValidation.isAvailable && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Sugerencias si slug no está disponible */}
          {!slugValidation.isAvailable && slugValidation.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sugerencias disponibles:</p>
              <div className="flex flex-wrap gap-2">
                {slugValidation.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSlugChange(suggestion)}
                    className="text-xs h-7"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 