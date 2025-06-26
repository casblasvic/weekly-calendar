"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  RefreshCw
} from "lucide-react"
import { WebhookBasicForm } from "./forms/webhook-basic-form"
import { WebhookHttpForm } from "./forms/webhook-http-form"
import { DataMapperForm } from "./forms/data-mapper-form"
import { WebhookResponseConfig } from "./forms/webhook-response-config"
import { WebhookCurlTester } from "./webhook-curl-tester"
import { WebhookLogsPanel } from "./webhook-logs-panel"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface WebhookEditModalProps {
  webhook: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUpdate?: () => void
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
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testData, setTestData] = useState<any>(null)

  // Cargar datos del webhook cuando se abre el modal
  useEffect(() => {
    if (webhook && open) {
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
        name: webhook.name || "",
        description: webhook.description || "",
        direction: webhook.direction || "incoming",
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
    }
  }, [webhook, open])

  const handleSave = async () => {
    setIsSubmitting(true)
    
    try {
      // Preparar datos para enviar
      const updateData = {
        ...formData,
        // Configurar auth según el tipo seleccionado
        token: formData.authType === "bearer" ? formData.tokenAuth : null,
        secretKey: formData.authType === "hmac" ? formData.hmacSecret : null,
        requiresAuth: formData.authType !== "none"
      }
      
      console.log('Sending update data:', updateData)
      
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
      onOpenChange?.(false)
      
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
    navigator.clipboard.writeText(webhook.url)
    toast.success("URL copiada al portapapeles")
  }

  const toggleActive = async () => {
    const newActiveState = !formData.isActive
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
      // Revertir el cambio en caso de error
      setFormData(prev => ({ ...prev, isActive: !newActiveState }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        {/* Header con padding apropiado */}
        <DialogHeader className="flex-shrink-0 px-8 py-6 border-b">
          <div className="flex justify-between items-center">
            <div className="space-y-3">
              <DialogTitle className="flex gap-3 items-center text-xl">
                <Settings className="w-6 h-6" />
                Configurar Webhook
              </DialogTitle>
              <DialogDescription className="text-muted-foreground sr-only">
                Configura la integración completa para tu webhook: HTTP, seguridad, pruebas y mapeo de datos.
              </DialogDescription>
              
              <div className="flex gap-3 items-center">
                <h2 className="text-lg font-medium text-muted-foreground">
                  {webhook?.name}
                </h2>
                <div className="flex gap-2 items-center">
                  <Badge variant={formData.isActive ? "default" : "secondary"} className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {formData.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge variant="outline">{webhook?.direction?.toUpperCase()}</Badge>
                  <code className="px-2 py-1 font-mono text-xs rounded bg-muted">
                    {webhook?.slug}
                  </code>
                </div>
              </div>
              
              {/* Toggle activar/desactivar */}
              <div className="flex gap-3 items-center">
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={toggleActive}
                  className="data-[state=checked]:bg-green-500"
                />
                <label className="text-sm font-medium">
                  Webhook {formData.isActive ? 'activado' : 'desactivado'}
                </label>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        {/* Content con scroll apropiado */}
        <div className="overflow-hidden flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid flex-shrink-0 grid-cols-5 mx-8 mt-4 w-full">
              <TabsTrigger value="config" className="flex gap-2 items-center">
                <Settings className="w-4 h-4" />
                Configuración
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex gap-2 items-center">
                <TestTube className="w-4 h-4" />
                Pruebas y Mapeo
              </TabsTrigger>
              <TabsTrigger value="security" className="flex gap-2 items-center">
                <Shield className="w-4 h-4" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="responses" className="flex gap-2 items-center">
                <CheckCircle className="w-4 h-4" />
                Respuestas
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex gap-2 items-center">
                <Activity className="w-4 h-4" />
                Logs
              </TabsTrigger>
            </TabsList>
            
            {/* Contenido con scroll */}
            <div className="overflow-auto flex-1 px-8 py-6">
              <TabsContent value="config" className="mt-0 space-y-6">
                {/* Plantillas rápidas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2 items-center">
                      <Zap className="w-5 h-5" />
                      Plantillas Rápidas
                    </CardTitle>
                    <CardDescription>
                      Configura automáticamente tu webhook para dispositivos específicos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // ===== PLANTILLA SHELLY LECTURAS → appointment_device_usage =====
                          const shellyConfig = {
                            name: "Shelly Smart Plug - Lecturas de Consumo",
                            description: "Recibe lecturas de consumo de enchufes Shelly y las almacena en appointment_device_usage",
                            direction: "incoming" as const,
                            slug: `shelly-readings-${Date.now()}`,
                            allowedMethods: ["POST"],
                            rateLimitPerMinute: 300,
                            authType: "none" as const,
                            
                            // Schema para lecturas de Shelly (tipos exactos de la tabla BD)
                            expectedSchema: {
                              type: "object",
                              properties: {
                                // ===== CAMPOS REQUERIDOS (NOT NULL en BD) =====
                                appointmentId: { 
                                  type: "string", 
                                  description: "ID de la cita médica (text NOT NULL)",
                                  example: "apt_cm4abc123def456"
                                },
                                equipmentId: { 
                                  type: "string", 
                                  description: "ID del equipo médico asociado (text NOT NULL)",
                                  example: "eq_laser_co2_001"
                                },
                                deviceId: { 
                                  type: "string", 
                                  description: "ID único del dispositivo Shelly (text NOT NULL)",
                                  example: "shellyplus1pm-441793d69718"
                                },
                                startedAt: { 
                                  type: "string", 
                                  format: "date-time",
                                  description: "Timestamp inicio uso (timestamp with time zone NOT NULL)",
                                  example: "2024-12-26T15:30:00+01:00"
                                },
                                estimatedMinutes: { 
                                  type: "integer", 
                                  description: "Tiempo estimado en minutos (integer NOT NULL)",
                                  example: 30,
                                  minimum: 1
                                },
                                startedByUserId: { 
                                  type: "string", 
                                  description: "Usuario que inició el equipo (text NOT NULL)",
                                  example: "user_cm4doctor123"
                                },
                                
                                // ===== CAMPOS OPCIONALES (NULL permitido en BD) =====
                                appointmentServiceId: { 
                                  type: "string", 
                                  description: "ID del servicio específico (text NULL)",
                                  example: "srv_depilacion_laser"
                                },
                                endedAt: { 
                                  type: "string", 
                                  format: "date-time",
                                  description: "Timestamp fin uso (timestamp with time zone NULL)",
                                  example: "2024-12-26T16:00:00+01:00"
                                },
                                actualMinutes: { 
                                  type: "integer", 
                                  description: "Tiempo real transcurrido (integer NULL)",
                                  example: 28,
                                  minimum: 0
                                },
                                energyConsumption: { 
                                  type: "number", 
                                  description: "Consumo energético en Wh (double precision NULL)",
                                  example: 264.6,
                                  minimum: 0
                                },
                                
                                // ===== DATOS TÉCNICOS → deviceData JSONB =====
                                deviceData: {
                                  type: "object",
                                  description: "Datos técnicos del dispositivo (jsonb NULL)",
                                  properties: {
                                    power: { type: "number", description: "Potencia instantánea watts", example: 264.6 },
                                    voltage: { type: "number", description: "Voltaje en voltios", example: 220.5 },
                                    current: { type: "number", description: "Corriente en amperios", example: 1.2 },
                                    temperature: { type: "number", description: "Temperatura °C", example: 42.3 },
                                    is_on: { type: "boolean", description: "Estado del enchufe", example: true },
                                    total_energy: { type: "number", description: "Energía total acumulada", example: 15420.8 },
                                    fw_version: { type: "string", description: "Versión firmware", example: "1.0.10" },
                                    mac_address: { type: "string", description: "MAC del dispositivo", example: "68:C6:3A:D6:97:18" },
                                    ip_address: { type: "string", description: "IP en red local", example: "192.168.1.150" }
                                  }
                                }
                              },
                              required: ["appointmentId", "equipmentId", "deviceId", "startedAt", "estimatedMinutes", "startedByUserId"]
                            },
                            
                            // Auto-selección de tabla y respuesta configurada
                            targetTable: "appointment_device_usage",
                            responseConfig: {
                              type: "created_record" as const,
                              includeId: true,
                              includeTimestamps: true,
                              customFields: ["id", "appointmentId", "deviceId", "startedAt", "energyConsumption", "createdAt"]
                            }
                          }
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            ...shellyConfig,
                            // Auto-seleccionar tabla en pestaña Mapeo de Datos
                            dataMapping: {
                              targetTable: "appointment_device_usage",
                              autoMapEnabled: true,
                              fieldMappings: {}
                            }
                          }))
                          toast.success("¡Configuración Shelly aplicada! Webhook listo para usar")
                        }}
                        className="gap-2 h-auto py-3 px-4"
                      >
                        <Zap className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">Shelly Smart Plug</div>
                          <div className="text-xs text-muted-foreground">POST + Mapeo automático</div>
                        </div>
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="gap-2 h-auto py-3 px-4 opacity-50"
                      >
                        <Monitor className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">Próximamente</div>
                          <div className="text-xs text-muted-foreground">Más dispositivos IoT</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuración Básica */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2 items-center">
                      <Settings className="w-5 h-5" />
                      Configuración Básica
                    </CardTitle>
                    <CardDescription>
                      Define la información básica de tu webhook
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WebhookBasicForm
                      data={{
                        name: formData.name,
                        description: formData.description,
                        direction: formData.direction,
                        slug: formData.slug
                      }}
                      onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
                      systemId={webhook?.systemId}
                      isEditing={true}
                    />
                  </CardContent>
                </Card>

                {/* Métodos HTTP - SIMPLE Y DIRECTO */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2 items-center">
                      <Link className="w-5 h-5" />
                      Métodos HTTP
                    </CardTitle>
                    <CardDescription>
                      Selecciona qué métodos HTTP acepta este webhook
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["GET", "POST", "PUT", "PATCH"].map((method) => (
                          <Button
                            key={method}
                            type="button"
                            variant={formData.allowedMethods.includes(method) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newMethods = formData.allowedMethods.includes(method)
                                ? formData.allowedMethods.filter(m => m !== method)
                                : [...formData.allowedMethods, method]
                              
                              if (newMethods.length === 0) {
                                toast.error("Debe seleccionar al menos un método")
                                return
                              }
                              
                              setFormData(prev => ({ ...prev, allowedMethods: newMethods }))
                              
                              if (method === "GET" && newMethods.includes("GET")) {
                                toast.success("GET seleccionado - ideal para dispositivos IoT")
                              }
                            }}
                            className="justify-center"
                          >
                            {method}
                          </Button>
                        ))}
                      </div>
                      
                      {formData.allowedMethods.includes("GET") && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>GET seleccionado:</strong> Ideal para dispositivos IoT como Shelly que envían datos por parámetros en la URL
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Rate Limiting */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configuración de Límites</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="rateLimit">Requests por minuto</Label>
                        <Input
                          id="rateLimit"
                          type="number"
                          min="1"
                          max="1000"
                          value={formData.rateLimitPerMinute}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            rateLimitPerMinute: parseInt(e.target.value) || 60 
                          }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* URL y información del webhook */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2 items-center">
                      <Copy className="w-5 h-5" />
                      URL del Webhook
                    </CardTitle>
                    <CardDescription>
                      URL para configurar en sistemas externos y dispositivos IoT
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <label className="text-sm font-medium text-muted-foreground">URL del Webhook:</label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyWebhookUrl}
                            className="flex-shrink-0 gap-1"
                          >
                            <Copy className="w-4 h-4" />
                            Copiar
                          </Button>
                        </div>
                        <div className="w-full overflow-x-auto">
                          <code className="block font-mono text-sm p-2 bg-background rounded border whitespace-nowrap">
                            {webhook?.url || `${window.location?.origin || 'https://tu-app.com'}/api/webhooks/${webhook?.systemId}/${formData.slug}`}
                          </code>
                        </div>
                      </div>
                      
                      {/* Información útil */}
                      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                        <div className="space-y-1">
                          <span className="font-medium">Métodos permitidos:</span>
                          <div className="flex flex-wrap gap-1">
                            {formData.allowedMethods.map(method => (
                              <Badge key={method} variant="outline" className="text-xs">
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="font-medium">Rate limit:</span>
                          <p className="text-muted-foreground">
                            {formData.rateLimitPerMinute} requests/min
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-medium">Autenticación:</span>
                          <p className="text-muted-foreground">
                            {formData.authType === "none" ? "No requerida" : 
                             formData.authType === "bearer" ? "Bearer Token" :
                             formData.authType === "hmac" ? "HMAC-SHA256" : "API Key"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing" className="mt-0 space-y-6">
                {/* Tester integrado con mapeo */}
                <WebhookCurlTester
                  webhook={{
                    id: webhook?.id,
                    name: webhook?.name,
                    url: webhook?.url,
                    token: formData.authType === "bearer" ? formData.tokenAuth : undefined,
                    secretKey: formData.authType === "hmac" ? formData.hmacSecret : undefined,
                    allowedMethods: formData.allowedMethods,
                    expectedSchema: formData.expectedSchema,
                    authType: formData.authType,
                    customHeaders: formData.customHeaders,
                    dataMapping: formData.dataMapping
                  }}
                  onTestDataReceived={(data) => setTestData(data)}
                />
                
                <Separator />
                
                {/* Mapeo de datos con datos de prueba */}
                <DataMapperForm
                  webhook={webhook}
                  data={{
                    expectedSchema: formData.expectedSchema,
                    dataMapping: formData.dataMapping,
                    targetTable: formData.targetTable
                  }}
                  onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
                  testData={testData}
                />
              </TabsContent>

              <TabsContent value="security" className="mt-0 space-y-6">
                {/* Autenticación */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2 items-center">
                      <Shield className="w-5 h-5" />
                      Autenticación
                    </CardTitle>
                    <CardDescription>
                      Configura cómo se autentica el webhook
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* ===== SELECTOR DE TIPO DE AUTENTICACIÓN SIMPLE ===== */}
                                              <div>
                          <Label className="text-base font-medium">Tipo de Autenticación</Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Selecciona cómo se autenticará el webhook
                          </p>

                          
                          <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            variant={formData.authType === "none" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              authType: "none",
                              requiresAuth: false
                            }))}
                            className="gap-2"
                          >
                            <X className="w-4 h-4" />
                            Ninguna
                          </Button>
                          <Button
                            type="button"
                            variant={formData.authType === "bearer" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              authType: "bearer",
                              requiresAuth: true
                            }))}
                            className="gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Bearer Token
                          </Button>
                          <Button
                            type="button"
                            variant={formData.authType === "hmac" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              authType: "hmac",
                              requiresAuth: true
                            }))}
                            className="gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            HMAC-SHA256
                          </Button>
                        </div>
                      </div>

                      {/* ===== CAMPOS ESPECÍFICOS POR TIPO ===== */}
                      {formData.authType === "bearer" && (
                        <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Key className="w-4 h-4 text-blue-600" />
                              <Label className="font-medium">Configuración Bearer Token</Label>

                            </div>
                            <div>
                              <Label htmlFor="tokenAuth">Token de Autenticación</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  id="tokenAuth"
                                  type="password"
                                  placeholder="Introduce tu token Bearer"
                                  value={formData.tokenAuth || ""}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    tokenAuth: e.target.value 
                                  }))}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newToken = 'Bearer_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                                    setFormData(prev => ({ ...prev, tokenAuth: newToken }))
                                    toast.success("Token generado")
                                  }}
                                  className="gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Generar
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Se enviará en el header: <code>Authorization: Bearer {formData.tokenAuth || '[TOKEN]'}</code>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.authType === "hmac" && (
                        <div className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-green-600" />
                              <Label className="font-medium">Configuración HMAC-SHA256</Label>

                            </div>
                            <div>
                              <Label htmlFor="hmacSecret">Clave Secreta</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  id="hmacSecret"
                                  type="password"
                                  placeholder="Introduce tu clave secreta"
                                  value={formData.hmacSecret || ""}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    hmacSecret: e.target.value 
                                  }))}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newSecret = 'HMAC_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                                    setFormData(prev => ({ ...prev, hmacSecret: newSecret }))
                                    toast.success("Clave secreta generada")
                                  }}
                                  className="gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Generar
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Se verificará la firma en el header: <code>X-Signature</code>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.authType === "none" && (
                        <div className="p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-950/20">
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4 text-gray-600" />
                            <div>
                              <Label className="font-medium">Sin Autenticación</Label>
                              <p className="text-sm text-muted-foreground">
                                El webhook es público - ideal para dispositivos IoT simples
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="responses" className="mt-0 space-y-6">
                <WebhookResponseConfig
                  data={{
                    responseConfig: formData.responseConfig
                  }}
                  onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
                />
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <WebhookLogsPanel webhookId={webhook?.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Footer con padding apropiado */}
        <div className="flex-shrink-0 px-8 py-6 border-t bg-muted/20">
          <div className="flex justify-between items-center">
            {/* Botones de acción a la izquierda */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyWebhookUrl}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar URL
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </Button>
            </div>
            
            {/* Botones principales a la derecha */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => onOpenChange?.(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 