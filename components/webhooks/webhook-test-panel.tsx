"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Play, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Copy, 
  RefreshCw,
  Eye,
  Code
} from "lucide-react"
import { toast } from "sonner"

interface WebhookTestPanelProps {
  webhook: any
  onTest: (payload: any) => void
  testResult?: any
}

const SAMPLE_PAYLOADS = {
  "shelly-device-usage": {
    name: "Encendido de equipo Shelly",
    payload: {
      device_id: "shelly_laser_001",
      event_type: "power_on",
      timestamp: new Date().toISOString(),
      power_consumption: 850.5,
      total_energy: 0.0,
      voltage: 230.2,
      current: 3.7,
      temperature: 45.3,
      device_name: "Shelly Plug S - Láser",
      appointment_id: "APPOINTMENT_ID_PLACEHOLDER",
      service_id: "SERVICE_ID_PLACEHOLDER",
      user_id: "USER_ID_PLACEHOLDER"
    }
  },
  "kasa-equipment-monitor": {
    name: "Monitor TP-Link Kasa",
    payload: {
      device_alias: "Kasa RF Equipment",
      device_id: "kasa_rf_002",
      state: "ON",
      timestamp: new Date().toISOString(),
      power_mw: 1200000,
      energy_wh: 0,
      context: {
        appointment_id: "APPOINTMENT_ID_PLACEHOLDER",
        service_id: "SERVICE_ID_PLACEHOLDER",
        user_id: "USER_ID_PLACEHOLDER"
      }
    }
  },
  "generic-smart-plug": {
    name: "Enchufe inteligente genérico",
    payload: {
      device_id: "generic_device_001",
      equipment_id: "EQUIPMENT_ID_PLACEHOLDER",
      action: "start",
      timestamp: new Date().toISOString(),
      appointment_id: "APPOINTMENT_ID_PLACEHOLDER",
      service_id: "SERVICE_ID_PLACEHOLDER",
      user_id: "USER_ID_PLACEHOLDER",
      energy_data: {
        consumption_kwh: 0.0,
        power_w: 800,
        voltage_v: 230,
        current_a: 3.5
      },
      estimated_minutes: 30
    }
  }
}

export function WebhookTestPanel({ webhook, onTest, testResult }: WebhookTestPanelProps) {
  const [testPayload, setTestPayload] = useState("")
  const [isTesting, setIsTesting] = useState(false)

  const loadSamplePayload = (sampleKey: string) => {
    const sample = SAMPLE_PAYLOADS[sampleKey as keyof typeof SAMPLE_PAYLOADS]
    if (sample) {
      setTestPayload(JSON.stringify(sample.payload, null, 2))
    }
  }

  const handleTest = async () => {
    if (!testPayload.trim()) {
      toast.error("Introduce un payload JSON para probar")
      return
    }

    try {
      const payload = JSON.parse(testPayload)
      setIsTesting(true)
      await onTest(payload)
    } catch (error) {
      toast.error("JSON inválido. Verifica el formato.")
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copiado al portapapeles")
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Panel de configuración de prueba */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Configurar Prueba
            </CardTitle>
            <CardDescription>
              Configura el payload JSON para probar el webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Muestras rápidas */}
            <div>
              <div className="text-sm font-medium mb-2">Ejemplos rápidos:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SAMPLE_PAYLOADS).map(([key, sample]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => loadSamplePayload(key)}
                    className="text-xs"
                  >
                    {sample.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Editor de payload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Payload JSON</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(testPayload)}
                  disabled={!testPayload}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder='{\n  "device_id": "example_001",\n  "event_type": "power_on",\n  ...\n}'
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="h-64 font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleTest}
              disabled={isTesting || !testPayload.trim()}
              className="w-full"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isTesting ? "Ejecutando prueba..." : "Ejecutar Prueba"}
            </Button>
          </CardContent>
        </Card>

        {/* Información del webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Información del Webhook
            </CardTitle>
            <CardDescription>
              Detalles de configuración del webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">URL del webhook</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-2 py-1 rounded break-all">
                    {webhook?.url}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhook?.url || "")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Métodos permitidos</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {webhook?.allowedMethods?.map((method: string) => (
                    <Badge key={method} variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Token de autenticación</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">
                    {webhook?.token ? `${webhook.token.substring(0, 20)}...` : "No configurado"}
                  </code>
                  {webhook?.token && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Rate limit</div>
                <div className="text-sm">
                  {webhook?.rateLimitPerMinute || 60} requests/minuto
                </div>
              </div>

              {webhook?.customHeaders && Object.keys(webhook.customHeaders).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Headers personalizados</div>
                  <div className="text-sm space-y-1">
                    {Object.entries(webhook.customHeaders).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">{key}</code>
                        <span className="text-xs">:</span>
                        <code className="text-xs bg-muted px-1 rounded">{String(value)}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultado de la prueba */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.status >= 200 && testResult.status < 300 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado de la Prueba
            </CardTitle>
            <CardDescription>
              Respuesta del webhook - {formatTimestamp(testResult.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Estado HTTP</div>
                <Badge 
                  variant={testResult.status >= 200 && testResult.status < 300 ? "default" : "destructive"}
                >
                  {testResult.status || "Error"}
                </Badge>
              </div>
              
              {testResult.headers && (
                <div>
                  <div className="text-xs text-muted-foreground">Content-Type</div>
                  <code className="text-xs bg-muted px-1 rounded">
                    {testResult.headers['content-type'] || 'application/json'}
                  </code>
                </div>
              )}
            </div>

            <Separator />

            {/* Response body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Respuesta</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(testResult.body || testResult.error, null, 2))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg">
                <pre className="text-sm overflow-auto max-h-64">
                  {testResult.error 
                    ? testResult.error 
                    : JSON.stringify(testResult.body, null, 2)
                  }
                </pre>
              </div>
            </div>

            {/* Headers de respuesta */}
            {testResult.headers && (
              <div>
                <div className="text-sm font-medium mb-2">Headers de Respuesta</div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <div className="space-y-1">
                    {Object.entries(testResult.headers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <code className="bg-muted px-1 rounded">{key}</code>
                        <span>:</span>
                        <code className="bg-muted px-1 rounded">{String(value)}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consejos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Consejos para Pruebas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Formato JSON</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Usa comillas dobles para strings</li>
                <li>• Verifica que no falten comas</li>
                <li>• Los números no necesitan comillas</li>
                <li>• Usa formato ISO para fechas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Campos Comunes</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• <code>device_id</code>: ID del dispositivo</li>
                <li>• <code>timestamp</code>: Fecha/hora ISO</li>
                <li>• <code>appointment_id</code>: ID de la cita</li>
                <li>• <code>user_id</code>: ID del usuario</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 