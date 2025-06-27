"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { Stepper, Step } from "@/components/ui/stepper"

interface WebhookCreateModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  systemId?: string | null
  onWebhookCreated?: () => void
}

interface WebhookFormData {
  name: string
  description: string
  direction: 'incoming' | 'outgoing' | 'bidirectional'
  slug: string
  category: string
}

interface SlugValidation {
  isAvailable: boolean
  isChecking: boolean
  suggestions: string[]
}

export function WebhookCreateModal({ open, onOpenChange, systemId: propSystemId, onWebhookCreated }: WebhookCreateModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<WebhookFormData>({
    name: "",
    description: "",
    direction: "incoming",
    slug: "",
    category: "default"
  })
  
  const { data: session } = useSession()
  const systemId = propSystemId || session?.user?.systemId

  const [slugValidation, setSlugValidation] = useState<SlugValidation>({
    isAvailable: true,
    isChecking: false,
    suggestions: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedToken, setGeneratedToken] = useState("")
  const [hmacSecret, setHmacSecret] = useState("")

  const validateSlug = useCallback(async (slug: string) => {
    if (!slug || !systemId) return
    setSlugValidation(prev => ({ ...prev, isChecking: true }))
    try {
      const response = await fetch('/api/internal/webhooks/validate-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, systemId })
      })
      const validation = await response.json()
      setSlugValidation({ isAvailable: validation.isAvailable, isChecking: false, suggestions: validation.suggestions || [] })
    } catch (error) {
      setSlugValidation({ isAvailable: false, isChecking: false, suggestions: [] })
    }
  }, [systemId])

  useEffect(() => {
    if (formData.slug) {
      validateSlug(formData.slug)
    }
  }, [formData.slug, validateSlug])

  const handleCreateWebhook = async () => {
    if (!formData.name || !formData.slug || !systemId) {
      toast.error("Por favor, completa los campos requeridos.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/internal/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          systemId,
          token: generatedToken,
          secretKey: hmacSecret
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el webhook');
      }
      const newWebhook = await response.json();
      const webhookUrl = `${window.location.origin}/api/webhooks/${newWebhook.id}`;
      await fetch(`/api/internal/webhooks/${newWebhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });
      toast.success("¡Webhook creado exitosamente!");
      onWebhookCreated?.();
      onOpenChange?.(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: "Información Básica" },
    { label: "Seguridad" },
    { label: "Confirmar" }
  ];

        return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Webhook</DialogTitle>
          <DialogDescription>Sigue los pasos para configurar tu nuevo webhook.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Stepper initialStep={0} activeStep={currentStep}>
            {steps.map((step, index) => (
              <Step key={index} label={step.label} />
            ))}
          </Stepper>
            </div>
            
        <div className="space-y-6 py-4 min-h-[300px]">
          {currentStep === 0 && (
            <div className="space-y-4">
                  <div>
                  <Label htmlFor="name">Nombre del webhook</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div>
                  <Label htmlFor="slug">Slug</Label>
                  <div className="relative">
                    <Input id="slug" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} className={cn(!slugValidation.isAvailable && "border-red-500")} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugValidation.isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                         slugValidation.isAvailable ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  </div>
                </div>
                  </div>
                )}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-medium">Configuración de Seguridad (Opcional)</h4>
                  <div>
                  <Label>Bearer Token</Label>
                   <div className="flex gap-2">
                    <Input value={generatedToken} onChange={e => setGeneratedToken(e.target.value)} placeholder="Dejar en blanco o generar"/>
                    <Button variant="outline" size="sm" onClick={() => setGeneratedToken('wh_bearer_' + Math.random().toString(36).substring(2))}>Generar</Button>
                  </div>
                  </div>
                  <div>
                  <Label>HMAC Secret</Label>
                   <div className="flex gap-2">
                    <Input value={hmacSecret} onChange={e => setHmacSecret(e.target.value)} placeholder="Dejar en blanco o generar"/>
                    <Button variant="outline" size="sm" onClick={() => setHmacSecret('wh_hmac_' + Math.random().toString(36).substring(2))}>Generar</Button>
                  </div>
              </div>
            </div>
          )}
           {currentStep === 2 && (
             <div className="space-y-4 rounded-lg border p-4">
               <h3 className="font-semibold">Confirmar y Crear</h3>
               <p><span className="font-medium">Nombre:</span> {formData.name}</p>
               <p><span className="font-medium">Slug:</span> {formData.slug}</p>
               <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                 URL: {`${window.location.origin}/api/webhooks/<ID_GENERADO_AL_GUARDAR>`}
               </p>
               {generatedToken && <p className="text-sm text-green-600">Se usará un Bearer Token.</p>}
               {hmacSecret && <p className="text-sm text-green-600">Se usará una clave HMAC.</p>}
                </div>
                )}
        </div>
        
        <DialogFooter>
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0}>
                Anterior
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))} disabled={!formData.name || !formData.slug || !slugValidation.isAvailable}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={handleCreateWebhook} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear Webhook
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 