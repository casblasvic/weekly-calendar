"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Eye, EyeOff, Copy, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface WebhookHttpFormProps {
  data: {
    allowedMethods: string[]
    requiresAuth: boolean
    customHeaders: Record<string, string>
    rateLimitPerMinute: number
    ipWhitelist: string[]
    secretKey: string
    targetUrl?: string // Para outgoing webhooks
    triggerEvents?: string[]
  }
  onChange: (data: any) => void
  direction: "incoming" | "outgoing" | "bidirectional"
}

const HTTP_METHODS = [
  { value: "GET", label: "GET", description: "Obtener datos" },
  { value: "POST", label: "POST", description: "Crear/Enviar datos" },
  { value: "PUT", label: "PUT", description: "Actualizar datos" },
  { value: "PATCH", label: "PATCH", description: "Actualizar parcialmente" },
  { value: "DELETE", label: "DELETE", description: "Eliminar datos" },
  { value: "HEAD", label: "HEAD", description: "Solo headers, sin body" },
  { value: "OPTIONS", label: "OPTIONS", description: "Opciones de comunicación" },
  { value: "CONNECT", label: "CONNECT", description: "Túnel al servidor" },
  { value: "TRACE", label: "TRACE", description: "Test de loopback" }
]

const AVAILABLE_EVENTS = [
  { value: "appointment.created", label: "Cita creada" },
  { value: "appointment.updated", label: "Cita actualizada" },
  { value: "appointment.cancelled", label: "Cita cancelada" },
  { value: "client.created", label: "Cliente creado" },
  { value: "client.updated", label: "Cliente actualizado" },
  { value: "payment.received", label: "Pago recibido" },
  { value: "invoice.created", label: "Factura creada" },
  { value: "ticket.completed", label: "Ticket completado" }
]

export function WebhookHttpForm({ data, onChange, direction }: WebhookHttpFormProps) {
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [newHeaderKey, setNewHeaderKey] = useState("")
  const [newHeaderValue, setNewHeaderValue] = useState("")
  const [newIp, setNewIp] = useState("")

  const handleMethodToggle = (method: string) => {
    let newMethods: string[]
    
    if (data.allowedMethods.includes(method)) {
      // Deseleccionar método
      newMethods = data.allowedMethods.filter(m => m !== method)
    } else {
      // Seleccionar método
      if (method === "GET") {
        // Si selecciona GET, hacer GET el único método (común para IoT)
        newMethods = ["GET"]
        toast.info("GET seleccionado - ideal para dispositivos IoT como Shelly")
      } else {
        // Si selecciona otro método, quitar GET si estaba solo
        if (data.allowedMethods.length === 1 && data.allowedMethods[0] === "GET") {
          newMethods = [method]
        } else {
          newMethods = [...data.allowedMethods.filter(m => m !== "GET"), method]
        }
      }
    }
    
    // Asegurar que al menos un método esté seleccionado
    if (newMethods.length === 0) {
      toast.error("Debe seleccionar al menos un método HTTP")
      return
    }
    
    onChange({ ...data, allowedMethods: newMethods })
  }

  const handleEventToggle = (event: string) => {
    const newEvents = data.triggerEvents?.includes(event)
      ? data.triggerEvents.filter(e => e !== event)
      : [...(data.triggerEvents || []), event]
    
    onChange({ ...data, triggerEvents: newEvents })
  }

  const addCustomHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      onChange({
        ...data,
        customHeaders: {
          ...data.customHeaders,
          [newHeaderKey]: newHeaderValue
        }
      })
      setNewHeaderKey("")
      setNewHeaderValue("")
    }
  }

  const removeCustomHeader = (key: string) => {
    const { [key]: removed, ...rest } = data.customHeaders
    onChange({ ...data, customHeaders: rest })
  }

  const addIpToWhitelist = () => {
    if (newIp && !data.ipWhitelist.includes(newIp)) {
      onChange({
        ...data,
        ipWhitelist: [...data.ipWhitelist, newIp]
      })
      setNewIp("")
    }
  }

  const removeIpFromWhitelist = (ip: string) => {
    onChange({
      ...data,
      ipWhitelist: data.ipWhitelist.filter(i => i !== ip)
    })
  }

  const generateSecretKey = () => {
    const key = `whs_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    onChange({ ...data, secretKey: key })
    toast.success("Clave secreta generada")
  }

  const copySecretKey = () => {
    navigator.clipboard.writeText(data.secretKey)
    toast.success("Clave secreta copiada")
  }

  const showIncoming = direction === "incoming" || direction === "bidirectional"
  const showOutgoing = direction === "outgoing" || direction === "bidirectional"

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Configuración HTTP</h3>
        <p className="text-sm text-muted-foreground">
          Configura los métodos HTTP, autenticación y seguridad
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {/* Métodos HTTP permitidos */}
          {showIncoming && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Métodos HTTP permitidos</Label>
                <p className="text-xs text-muted-foreground">
                  Haz clic en las tarjetas para seleccionar/deseleccionar métodos
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {HTTP_METHODS.map((method) => (
                  <Card 
                    key={method.value}
                    className={cn(
                      "cursor-pointer transition-all",
                      data.allowedMethods.includes(method.value) 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleMethodToggle(method.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={data.allowedMethods.includes(method.value) ? "default" : "outline"}
                              className="font-mono text-xs"
                            >
                              {method.label}
                            </Badge>
                            <Checkbox
                              checked={data.allowedMethods.includes(method.value)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {method.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* URL de destino para outgoing */}
          {showOutgoing && (
            <div className="space-y-2">
              <Label htmlFor="targetUrl">URL de destino *</Label>
              <Input
                id="targetUrl"
                placeholder="https://api.ejemplo.com/webhook"
                value={data.targetUrl || ""}
                onChange={(e) => onChange({ ...data, targetUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                URL donde se enviarán los datos cuando se triggee el webhook
              </p>
            </div>
          )}

          {/* Eventos trigger para outgoing - Solo si NO es GET */}
          {showOutgoing && !data.allowedMethods.includes("GET") && (
            <div className="space-y-3">
              <Label>Eventos que disparan el webhook</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <div
                    key={event.value}
                    className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={event.value}
                      checked={data.triggerEvents?.includes(event.value) || false}
                      onCheckedChange={() => handleEventToggle(event.value)}
                    />
                    <Label
                      htmlFor={event.value}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {event.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información para webhooks GET */}
          {showIncoming && data.allowedMethods.includes("GET") && data.allowedMethods.length === 1 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    GET
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Webhook de escucha (GET)
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Este webhook escuchará peticiones GET y almacenará automáticamente los datos recibidos en la tabla mapeada. 
                    Ideal para dispositivos IoT como Shelly Smart Plugs que envían datos de estado.
                  </p>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    <p><strong>Ejemplo de uso:</strong></p>
                    <code className="block mt-1 p-2 bg-white dark:bg-blue-950/50 rounded text-xs">
                      GET {`{webhook_url}?power=1.2&voltage=220.5&device_id=shelly123`}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limiting */}
          <div className="space-y-2">
            <Label htmlFor="rateLimit">Límite de requests por minuto</Label>
            <Input
              id="rateLimit"
              type="number"
              min="1"
              max="1000"
              value={data.rateLimitPerMinute}
              onChange={(e) => onChange({ ...data, rateLimitPerMinute: parseInt(e.target.value) || 60 })}
            />
            <p className="text-xs text-muted-foreground">
              Máximo número de requests permitidos por minuto
            </p>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Autenticación */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Requiere autenticación</Label>
                <p className="text-xs text-muted-foreground">
                  Token Bearer requerido en el header Authorization
                </p>
              </div>
              <Switch
                checked={data.requiresAuth}
                onCheckedChange={(checked) => onChange({ ...data, requiresAuth: checked })}
              />
            </div>

            {/* Clave secreta para HMAC */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="secretKey">Clave secreta (HMAC)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSecretKey}
                >
                  Generar
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? "text" : "password"}
                  placeholder="Clave para verificación HMAC..."
                  value={data.secretKey}
                  onChange={(e) => onChange({ ...data, secretKey: e.target.value })}
                  className="pr-16"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="h-6 w-6 p-0"
                  >
                    {showSecretKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copySecretKey}
                    className="h-6 w-6 p-0"
                    disabled={!data.secretKey}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Se usará para verificar la firma HMAC-SHA256 en el header X-Signature
              </p>
            </div>
          </div>

          {/* IP Whitelist */}
          <div className="space-y-3">
            <Label>IPs permitidas (opcional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="192.168.1.1 o 10.0.0.0/24"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIpToWhitelist()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addIpToWhitelist}
                disabled={!newIp}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {data.ipWhitelist.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">IPs permitidas:</p>
                <div className="flex flex-wrap gap-2">
                  {data.ipWhitelist.map((ip) => (
                    <Badge key={ip} variant="outline" className="gap-2">
                      {ip}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIpFromWhitelist(ip)}
                        className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium">¡Cuidado!</p>
                <p>Si defines IPs permitidas, solo esas IPs podrán acceder al webhook. Deja vacío para permitir cualquier IP.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Headers personalizados */}
          <div className="space-y-3">
            <Label>Headers personalizados</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Nombre del header"
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Valor del header"
                  value={newHeaderValue}
                  onChange={(e) => setNewHeaderValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomHeader()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomHeader}
                  disabled={!newHeaderKey || !newHeaderValue}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {Object.keys(data.customHeaders).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Headers configurados:</p>
                <div className="space-y-2">
                  {Object.entries(data.customHeaders).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <code className="text-xs">{key}</code>
                        <code className="text-xs text-muted-foreground">{value}</code>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomHeader(key)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 