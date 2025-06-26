"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  CheckCircle, 
  Settings, 
  TestTube, 
  Map, 
  Activity,
  Copy,
  Save,
  Trash2,
  Power,
  Link,
  Shield,
  Zap,
  Monitor,
  X,
  Key,
  RefreshCw,
  Loader2,
  XCircle,
  ArrowDown,
  ArrowUpDown
} from "lucide-react"
import { WebhookCurlTester } from "./webhook-curl-tester"
import { WebhookLogsPanel, WebhookLog } from "./webhook-logs-panel"
import { WebhookResponseConfig } from "./forms/webhook-response-config"
import { WebhookHttpForm } from "./forms/webhook-http-form"
import { WebhookSecurityForm } from "./forms/webhook-security-form"
import { DataMapperForm } from "./forms/data-mapper-form"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface WebhookEditModalProps {
  webhook: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUpdate?: () => void
}

interface SlugValidation {
  isAvailable: boolean
  isChecking: boolean
  suggestions: string[]
}

interface WebhookFormData {
  // Basic
  name: string
  description: string
  direction: "incoming" | "outgoing" | "bidirectional"
  slug: string
  isActive: boolean
  
  // HTTP
  allowedMethods: string[]
  requiresAuth: boolean
  customHeaders: Record<string, string>
  rateLimitPerMinute: number
  ipWhitelist: string[]
  secretKey: string
  targetUrl?: string
  triggerEvents?: string[]
  
  // Security & Auth
  authType: "none" | "bearer" | "hmac" | "api_key"
  hmacSecret?: string
  tokenAuth?: string
  apiKeyHeader?: string
  
  // Data mapping
  expectedSchema?: any
  dataMapping?: any
  targetTable?: string
  
  // Response config
  successResponseCode: number
  successResponseBody?: string
  errorResponseCode: number
  errorResponseBody?: string
  responseConfig?: {
    type: "simple" | "custom_json" | "created_record"
    statusCode?: number
    customJson?: string
    includeId?: boolean
    includeTimestamps?: boolean
    customFields?: string[]
    errorHandling?: "standard" | "custom"
  },
  samplePayload?: any
}

// <<< Función de Estilos de Dirección >>>
const getDirectionStyles = (direction: string) => {
    const normalizedDirection = direction.toUpperCase()
    switch (normalizedDirection) {
      case "INCOMING":
        return {
          icon: <ArrowDown className="w-3 h-3" />,
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        };
      // ... otros casos
      default:
        return {
          icon: <ArrowUpDown className="w-3 h-3" />,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        };
  }
}

export function WebhookEditModal({ webhook, open, onOpenChange, onUpdate }: WebhookEditModalProps) {
  const [activeTab, setActiveTab] = useState("config")
  const [formData, setFormData] = useState<WebhookFormData>({
    name: "",
    description: "",
    direction: "incoming",
    slug: "",
    isActive: true,
    allowedMethods: ["POST"],
    requiresAuth: false,
    customHeaders: {},
    rateLimitPerMinute: 120,
    ipWhitelist: [],
    secretKey: "",
    authType: "none",
    successResponseCode: 200,
    errorResponseCode: 400,
    responseConfig: {
      type: "simple",
      includeId: true,
      includeTimestamps: true
    },
    samplePayload: null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testData, setTestData] = useState<any>(null)
  const [isHeaderEditing, setIsHeaderEditing] = useState(false)
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)

  const [slugValidation, setSlugValidation] = useState<SlugValidation>({
    isAvailable: true,
    isChecking: false,
    suggestions: []
  })
  
  // Un único callback para manejar todos los cambios de los componentes hijos
  const handleConfigChange = useCallback((newConfig: Partial<WebhookFormData>) => {
      setFormData(prev => ({
          ...prev,
          ...newConfig,
      }));
  }, []);

  const validateSlug = useCallback(async (slug: string) => {
    if (!slug) return
    
    setSlugValidation(prev => ({ ...prev, isChecking: true }))
    
    try {
      const response = await fetch('/api/internal/webhooks/validate-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, systemId: webhook?.systemId, webhookId: webhook?.id })
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
  }, [webhook?.systemId, webhook?.id])
  
  useEffect(() => {
    if (formData.slug && isHeaderEditing) {
      validateSlug(formData.slug)
    }
  }, [formData.slug, validateSlug, isHeaderEditing])

  // Cargar datos del webhook Y LOGS cuando se abre el modal
  useEffect(() => {
    const loadInitialData = async () => {
    if (webhook && open) {
            // Cargar datos del formulario
      // ===== DEBUG COMPLETO DEL WEBHOOK =====
      console.log("🔍 WEBHOOK RECIBIDO:", {
        webhookCompleto: webhook,
        token: webhook.token,
        secretKey: webhook.secretKey,
        tokenExiste: !!webhook.token,
        secretKeyExiste: !!webhook.secretKey,
        tokenLength: webhook.token?.length || 0,
        secretKeyLength: webhook.secretKey?.length || 0
      })
      
      // ===== LÓGICA MEJORADA PARA DETECTAR TIPO DE AUTH =====
      let detectedAuthType: "none" | "bearer" | "hmac" | "api_key" = "none"
      
      // Priorizar Bearer token sobre HMAC
      if (webhook.token && webhook.token.trim() !== "") {
        detectedAuthType = "bearer"
        console.log("🔑 BEARER TOKEN DETECTADO:", webhook.token)
      } else if (webhook.secretKey && webhook.secretKey.trim() !== "") {
        detectedAuthType = "hmac"
        console.log("🔐 HMAC SECRET DETECTADO:", webhook.secretKey)
      }
      
      console.log("🔍 Detectando autenticación:", {
        token: webhook.token ? "✅ Existe" : "❌ No existe",
        secretKey: webhook.secretKey ? "✅ Existe" : "❌ No existe", 
        detectedAuthType
      })
      
      setFormData({
              ...webhook,
        name: webhook.name || "",
        description: webhook.description || "",
              direction: (webhook.direction || "incoming").toLowerCase() as "incoming" | "outgoing" | "bidirectional",
        slug: webhook.slug || "",
        isActive: webhook.isActive ?? true,
        allowedMethods: webhook.allowedMethods || ["POST"],
        requiresAuth: detectedAuthType !== "none",
        customHeaders: webhook.customHeaders || {},
        rateLimitPerMinute: webhook.rateLimitPerMinute || 120,
        ipWhitelist: webhook.ipWhitelist || [],
        secretKey: webhook.secretKey || "",
        authType: detectedAuthType,
        hmacSecret: webhook.secretKey || "",
        tokenAuth: webhook.token || "",
        apiKeyHeader: "Authorization",
        expectedSchema: webhook.expectedSchema,
        samplePayload: webhook.samplePayload,
        dataMapping: webhook.dataMapping,
        targetTable: webhook.dataMapping?.targetTable || "",
        successResponseCode: webhook.successResponseCode || 200,
        successResponseBody: webhook.successResponseBody || "",
        errorResponseCode: webhook.errorResponseCode || 400,
        errorResponseBody: webhook.errorResponseBody || ""
      })
      
      console.log("📋 Datos cargados en formulario:", {
        authType: detectedAuthType,
        tokenAuth: webhook.token || "Sin token",
        hmacSecret: webhook.secretKey || "Sin secret",
        requiresAuth: detectedAuthType !== "none",
        formDataCompleto: {
          authType: detectedAuthType,
          tokenAuth: webhook.token || "",
          hmacSecret: webhook.secretKey || "",
          requiresAuth: detectedAuthType !== "none"
        }
      })

            // Cargar logs en paralelo
            setIsLoadingLogs(true);
            try {
                const response = await fetch(`/api/internal/webhooks/${webhook.id}/logs?filter=all`);
                if (response.ok) {
                    const logsData = await response.json();
                    setLogs(logsData);
                } else {
                    // No mostrar error aquí, el panel lo hará si es necesario
                    setLogs([]); 
                }
            } catch (error) {
                console.error("Error pre-fetching logs:", error);
                setLogs([]);
            } finally {
                setIsLoadingLogs(false);
            }
        }
    };
    
    loadInitialData();
  }, [webhook, open])

  const handleSave = async () => {
    setIsSubmitting(true)
    
    // Log para verificar el estado de formData ANTES de preparar los datos
    console.log('📋 Estado actual de formData antes de guardar:', formData);

    try {
      // Preparar datos para enviar
      const updateData = {
        ...formData,
        // Configurar auth según el tipo seleccionado
        token: formData.authType === "bearer" ? formData.tokenAuth : undefined,
        secretKey: formData.authType === "hmac" ? formData.hmacSecret : undefined,
        requiresAuth: formData.authType !== "none",
        
        // CORRECCIÓN CLAVE: Asegurar que el dataMapping completo se envía
        dataMapping: formData.dataMapping,
        samplePayload: formData.samplePayload,
        responseConfig: formData.responseConfig,
        
        // Limpiar campos que no deben enviarse directamente en la raíz
        hmacSecret: undefined,
        tokenAuth: undefined,
      }
      
      console.log('✅ Datos finales que se enviarán a la API:', updateData)
      
      const response = await fetch(`/api/internal/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error:', errorData)
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('Update result:', result)
      
      toast.success("Webhook actualizado correctamente")
      onUpdate?.()
      
    } catch (error) {
      console.error('Error updating webhook:', error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error(`Error al actualizar webhook: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
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
        throw new Error('Error deleting webhook')
      }
      
      toast.success("Webhook eliminado correctamente")
      onUpdate?.()
      onOpenChange?.(false)
      
    } catch (error) {
      console.error('Error deleting webhook:', error)
      toast.error("Error al eliminar el webhook")
    }
  }

  const copyWebhookUrl = () => {
    // Construir la URL correcta
    const baseUrl = window.location.origin
    const correctUrl = `${baseUrl}/api/webhooks/${webhook.id}/${formData.slug}`
    
    navigator.clipboard.writeText(correctUrl)
    setShowCopiedTooltip(true)
    setTimeout(() => setShowCopiedTooltip(false), 2000) // Ocultar después de 2 segundos
    toast.success("URL copiada al portapapeles")
  }

  const toggleActive = useCallback(async (newActiveState: boolean) => {
    // Evitar actualizaciones si el estado no ha cambiado realmente
    if (formData.isActive === newActiveState) {
      return
    }
    
    // ✅ RENDERIZACIÓN OPTIMISTA - Actualizar UI inmediatamente
    const previousState = formData.isActive
    setFormData(prev => ({ ...prev, isActive: newActiveState }))
    
    try {
      const response = await fetch(`/api/internal/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActiveState })
      })
      
      if (!response.ok) {
        throw new Error('Error updating webhook status')
      }
      
      toast.success(`Webhook ${newActiveState ? 'activado' : 'desactivado'} correctamente`)
      onUpdate?.()
      
    } catch (error) {
      console.error('Error updating webhook status:', error)
      toast.error("Error al cambiar el estado del webhook")
      // ❌ ROLLBACK - Revertir SOLO en caso de error
      setFormData(prev => ({ ...prev, isActive: previousState }))
    }
  }, [formData.isActive, webhook.id, onUpdate])

  const isIncoming = formData.direction === 'incoming' || formData.direction === 'bidirectional';
  const isOutgoing = formData.direction === 'outgoing' || formData.direction === 'bidirectional';

  const directionStyles = getDirectionStyles(formData.direction || 'incoming');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 py-3 border-b">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 items-center">
                <DialogTitle className="flex gap-2 items-center text-lg">
                  <Settings className="w-5 h-5" />
                Configurar Webhook
              </DialogTitle>
                <Badge variant="outline" className={cn("text-xs h-5", directionStyles.className)}>
                  {directionStyles.icon}
                  <span className="font-medium">{formData.direction?.charAt(0).toUpperCase() + formData.direction?.slice(1)}</span>
                </Badge>
              </div>

              {!isHeaderEditing ? (
                <div className="flex gap-6 justify-between items-start">
                  <div className="flex-1 space-y-1">
              <div className="flex gap-3 items-center">
                      <h2 className="text-xl font-bold text-foreground">{formData.name}</h2>
                      <div className="flex gap-1 items-center">
                                              <Button variant="ghost" size="icon" className="w-5 h-5 border-0 shadow-none outline-none hover:bg-transparent focus:ring-0 focus:ring-offset-0" onClick={() => setIsHeaderEditing(true)}>
                        <Settings className="w-3 h-3" />
                      </Button>
                        <Button
                          variant={formData.isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleActive(!formData.isActive)}
                          className={`w-10 h-5 text-xs ${
                            formData.isActive 
                              ? "bg-green-500 hover:bg-green-600 text-white" 
                              : "bg-red-500 hover:bg-red-600 text-white"
                          }`}
                        >
                          {formData.isActive ? "ON" : "OFF"}
                        </Button>
                      </div>
                    </div>
                    {formData.description && (
                      <p className="text-sm text-muted-foreground">{formData.description}</p>
                    )}
                    <div className="flex gap-1 items-center">
                      <span className="text-xs font-medium text-muted-foreground">slug:</span>
                      <code className="px-1.5 py-0.5 font-mono text-xs rounded bg-muted">{formData.slug}</code>
                </div>
              </div>
              
                  {/* Información de URL integrada en el header */}
                  <Card className="flex-shrink-0 min-w-0 max-w-md">
                    <CardContent className="p-2">
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center min-w-0">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                            {`${window.location?.origin}/api/webhooks/${webhook?.id}/${formData.slug}`}
                          </code>
                                                    <Button variant="ghost" size="icon" className="relative flex-shrink-0 w-4 h-4 border-0 shadow-none outline-none hover:bg-transparent focus:ring-0 focus:ring-offset-0" onClick={copyWebhookUrl}>
                            <Copy className="w-3 h-3" />
                            {showCopiedTooltip && (
                              <div className="absolute -top-8 left-1/2 px-2 py-1 text-xs text-white whitespace-nowrap bg-black rounded transform -translate-x-1/2 z-[9999]">
                                ¡Copiado!
                              </div>
                            )}
                          </Button>
            </div>
                        <div className="flex gap-3 items-center text-xs text-muted-foreground">
                          <div className="flex gap-1 items-center" title="Métodos permitidos">
                            <Link className="w-3 h-3" />
                            <span>{formData.allowedMethods.join(', ')}</span>
          </div>
                          <div className="flex gap-1 items-center" title="Autenticación">
                            <Shield className="w-3 h-3" />
                            <span>{formData.authType === "none" ? "Ninguna" : formData.authType.charAt(0).toUpperCase() + formData.authType.slice(1)}</span>
                          </div>
                          <div className="flex gap-1 items-center" title="Límite de peticiones">
                            <Zap className="w-3 h-3" />
                            <span>{formData.rateLimitPerMinute}/min</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="slug">Slug</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          className={cn(!slugValidation.isAvailable && "border-red-500")}
                        />
                         <Button variant="outline" size="icon" onClick={() => setFormData(prev => ({ ...prev, slug: `${prev.name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 6)}` }))}>
                           <RefreshCw className="w-4 h-4" />
                         </Button>
                      </div>
                      {slugValidation.isChecking && <p className="text-xs text-muted-foreground">Verificando...</p>}
                      {!slugValidation.isAvailable && slugValidation.suggestions.length > 0 && (
                        <p className="text-xs text-red-500">
                          Slug no disponible. Sugerencias: {slugValidation.suggestions.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))} />
                  </div>
                  <Button size="sm" onClick={() => setIsHeaderEditing(false)}>Guardar Cabecera</Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex overflow-hidden">
          {/* Menú de pestañas a la izquierda */}
          <div className="bg-muted/40 border-r w-48">
            <TabsList className="flex flex-col items-start justify-start h-full p-2 space-y-1 bg-transparent">
              <TabsTrigger value="config" className="w-full justify-start gap-2">
                <Settings className="w-4 h-4" /> Configuración
              </TabsTrigger>
              <TabsTrigger value="data" className="w-full justify-start gap-2">
                <Map className="w-4 h-4" /> Datos y Pruebas
              </TabsTrigger>
              <TabsTrigger value="logs" className="w-full justify-start gap-2">
                <Monitor className="w-4 h-4" /> Logs
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Contenido de las pestañas a la derecha */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <TabsContent value="config" className="mt-0 space-y-6">
              <WebhookHttpForm 
                direction={formData.direction} 
                data={formData} 
                onChange={handleConfigChange} 
              />
              <WebhookSecurityForm
                data={formData}
                onChange={handleConfigChange}
              />
              <WebhookResponseConfig 
                initialConfig={formData.responseConfig} 
                onChange={(config) => handleConfigChange({ responseConfig: config })} 
              />
            </TabsContent>

            <TabsContent value="data" className="mt-0 flex-grow overflow-y-auto p-4 md:p-6 space-y-6">
                <WebhookCurlTester
                    webhook={{
                        ...webhook,
                        samplePayload: formData.samplePayload
                    }}
                    onConfigChange={handleConfigChange}
                    onTestDataReceived={setTestData}
                />

                <DataMapperForm
                    webhook={webhook}
                    data={{
                        expectedSchema: formData.expectedSchema,
                        dataMapping: formData.dataMapping,
                        targetTable: formData.dataMapping?.targetTable,
                        samplePayload: formData.samplePayload,
                    }}
                    onChange={handleConfigChange}
                    testData={testData}
                />
            </TabsContent>

            {/* Panel de Logs */}
            <TabsContent value="logs" className="flex-grow overflow-y-auto p-4 md:p-6">
              <WebhookLogsPanel
                webhookId={webhook?.id}
              />
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="flex-shrink-0 px-6 py-2 border-t bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyWebhookUrl}
                className="gap-1"
              >
                <Copy className="w-3 h-3" />
                Copiar URL
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Eliminar
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => onOpenChange?.(false)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSubmitting}
                className="gap-1"
              >
                <Save className="w-3 h-3" />
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 