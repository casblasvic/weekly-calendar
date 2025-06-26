"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import { WebhookBasicForm } from "./forms/webhook-basic-form"
import { WebhookHttpForm } from "./forms/webhook-http-form"
import { toast } from "sonner"

interface WebhookCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  systemId?: string | null
}

interface WebhookFormData {
  // Step 1: Basic
  name: string
  description: string
  direction: "incoming" | "outgoing" | "bidirectional"
  slug: string
  category: string
  
  // Step 2: HTTP
  allowedMethods: string[]
  requiresAuth: boolean
  customHeaders: Record<string, string>
  rateLimitPerMinute: number
  ipWhitelist: string[]
  secretKey: string
  targetUrl?: string
  triggerEvents?: string[]
  
  // Step 3: Data mapping (TODO)
  expectedSchema?: any
  dataMapping?: any
}

export function WebhookCreateModal({ open, onOpenChange, systemId: propSystemId }: WebhookCreateModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<WebhookFormData>({
    // Valores por defecto
    name: "",
    description: "",
    direction: "incoming",
    slug: "",
    category: "",
    allowedMethods: ["POST"],
    requiresAuth: true,
    customHeaders: {},
    rateLimitPerMinute: 60,
    ipWhitelist: [],
    secretKey: "",
    targetUrl: "",
    triggerEvents: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Usar systemId del prop o obtener de la sesión
  const systemId = propSystemId
  
  const steps = [
    { id: 1, title: "Configuración básica", isValid: Boolean(formData.name && formData.slug && formData.direction) },
    { id: 2, title: "Configuración HTTP", isValid: formData.allowedMethods.length > 0 || (formData.direction === "outgoing" && formData.targetUrl) },
    { id: 3, title: "Mapeo de datos", isValid: true }, // TODO: Validar cuando se implemente
    { id: 4, title: "Revisión y creación", isValid: true }
  ]

  const canProceedToNext = () => {
    const currentStepData = steps.find(s => s.id === currentStep)
    return currentStepData?.isValid || false
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!systemId) {
      toast.error("Error: no se pudo obtener el ID del sistema")
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/internal/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, systemId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error creating webhook')
      }
      
      const result = await response.json()
      
      toast.success("Webhook creado correctamente")
      onOpenChange(false)
      
      // Refrescar la página para mostrar el nuevo webhook
      window.location.reload()
      
      // Reset form
      setCurrentStep(1)
      setFormData({
        name: "",
        description: "",
        direction: "incoming",
        slug: "",
        category: "",
        allowedMethods: ["POST"],
        requiresAuth: true,
        customHeaders: {},
        rateLimitPerMinute: 60,
        ipWhitelist: [],
        secretKey: "",
        targetUrl: "",
        triggerEvents: []
      })
    } catch (error) {
      console.error('Error creating webhook:', error)
      toast.error("Error al crear el webhook")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WebhookBasicForm
            data={{
              name: formData.name,
              description: formData.description,
              direction: formData.direction,
              slug: formData.slug,
              category: formData.category
            }}
            onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
            systemId={systemId}
          />
        )
      case 2:
        return (
          <WebhookHttpForm
            data={{
              allowedMethods: formData.allowedMethods,
              requiresAuth: formData.requiresAuth,
              customHeaders: formData.customHeaders,
              rateLimitPerMinute: formData.rateLimitPerMinute,
              ipWhitelist: formData.ipWhitelist,
              secretKey: formData.secretKey,
              targetUrl: formData.targetUrl,
              triggerEvents: formData.triggerEvents
            }}
            onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
            direction={formData.direction}
          />
        )
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Mapeo de Datos</h3>
              <p className="text-sm text-muted-foreground">
                Configura cómo se mapearán los datos recibidos a tu base de datos
              </p>
            </div>
            <div className="text-center py-12 bg-muted/20 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium mb-2">Próximamente</h3>
              <p className="text-muted-foreground">
                El visual data mapper estará disponible pronto
              </p>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Revisión Final</h3>
              <p className="text-sm text-muted-foreground">
                Revisa la configuración antes de crear el webhook
              </p>
            </div>
            
            <div className="grid gap-6">
              {/* Configuración básica */}
              <div className="space-y-3">
                <h4 className="font-medium">Configuración Básica</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dirección:</span>
                    <p className="font-medium">{formData.direction}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slug:</span>
                    <p className="font-medium font-mono">{formData.slug}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoría:</span>
                    <p className="font-medium">{formData.category}</p>
                  </div>
                </div>
                {formData.description && (
                  <div>
                    <span className="text-muted-foreground text-sm">Descripción:</span>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}
              </div>

              {/* Configuración HTTP */}
              <div className="space-y-3">
                <h4 className="font-medium">Configuración HTTP</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Métodos permitidos:</span>
                    <p className="font-medium">{formData.allowedMethods.join(", ")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Autenticación:</span>
                    <p className="font-medium">{formData.requiresAuth ? "Requerida" : "No requerida"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rate limit:</span>
                    <p className="font-medium">{formData.rateLimitPerMinute} req/min</p>
                  </div>
                  {formData.ipWhitelist.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">IPs permitidas:</span>
                      <p className="font-medium">{formData.ipWhitelist.length} configuradas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* URL final */}
              <div className="p-4 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground text-sm">URL del webhook:</span>
                <p className="font-mono text-sm break-all">
                                     {typeof window !== 'undefined' ? window.location.origin : 'https://tu-app.com'}/api/webhooks/{systemId}/{formData.slug}
                </p>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header con padding apropiado */}
        <DialogHeader className="flex-shrink-0 px-8 pt-8 pb-6">
          <DialogTitle className="text-2xl font-semibold">Crear Nuevo Webhook</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Configura un webhook para integrar tu aplicación con servicios externos
          </p>
        </DialogHeader>
        
        {/* Stepper con mejor espaciado */}
        <div className="flex-shrink-0 px-8 pb-6">
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200
                    ${currentStep >= step.id 
                      ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                      : 'bg-background border-2 border-muted text-muted-foreground'
                    }
                  `}>
                    {currentStep > step.id && step.isValid ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="ml-3">
                    <span className={`block text-sm font-medium ${
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {currentStep > step.id && step.isValid ? 'Completado' : 
                       currentStep === step.id ? 'En progreso' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-6 transition-colors duration-200 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content con scroll y padding perfecto */}
        <div className="flex-1 overflow-auto px-8 pb-2">
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>
        </div>
        
        {/* Footer con separación visual clara */}
        <div className="flex-shrink-0 bg-muted/10 border-t px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Paso {currentStep} de {steps.length}
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="min-w-[100px]"
              >
                Anterior
              </Button>
              
              <Button 
                onClick={handleNext}
                disabled={!canProceedToNext() || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? "Creando..." : 
                 currentStep === steps.length ? 'Crear Webhook' : 'Siguiente'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 