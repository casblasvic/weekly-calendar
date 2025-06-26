"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle2, 
  FileText, 
  Database,
  Code,
  Settings,
  Info
} from "lucide-react"

interface WebhookResponseConfigProps {
  data: {
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
  onChange: (data: any) => void
}

const RESPONSE_TYPES = [
  {
    value: "simple",
    label: "Respuesta Simple",
    description: "Solo código HTTP 200 OK",
    icon: CheckCircle2,
    example: "HTTP 200 OK"
  },
  {
    value: "custom_json", 
    label: "JSON Personalizado",
    description: "Devolver JSON personalizado",
    icon: Code,
    example: '{"status": "success", "message": "Received"}'
  },
  {
    value: "created_record",
    label: "Registro Creado",
    description: "Devolver el registro guardado en BD",
    icon: Database,
    example: '{"id": "cuid123", "appointmentId": "apt_456", ...}'
  }
]

export function WebhookResponseConfig({ data, onChange }: WebhookResponseConfigProps) {
  const [responseType, setResponseType] = useState(data.responseConfig?.type || "simple")
  const [customJson, setCustomJson] = useState(data.responseConfig?.customJson || '{\n  "status": "success",\n  "message": "Data received successfully"\n}')
  const [includeId, setIncludeId] = useState<boolean>(data.responseConfig?.includeId ?? true)
  const [includeTimestamps, setIncludeTimestamps] = useState<boolean>(data.responseConfig?.includeTimestamps ?? true)
  const [customFields, setCustomFields] = useState<string[]>(data.responseConfig?.customFields || [])

  const handleConfigChange = (updates: any) => {
    const newConfig = {
      ...data.responseConfig,
      ...updates
    }
    
    onChange({
      ...data,
      responseConfig: newConfig
    })
  }

  const handleResponseTypeChange = (type: string) => {
    setResponseType(type as any)
    handleConfigChange({ type })
  }

  const selectedType = RESPONSE_TYPES.find(t => t.value === responseType)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Respuestas
          </CardTitle>
          <CardDescription>
            Define qué devuelve el webhook cuando recibe datos correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de tipo de respuesta */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Tipo de Respuesta</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {RESPONSE_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = responseType === type.value
                
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleResponseTypeChange(type.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                          <code className="text-xs bg-muted px-2 py-1 rounded block mt-2">
                            {type.example}
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Configuración específica por tipo */}
          {responseType === "custom_json" && (
            <div className="space-y-4">
              <Label className="text-base font-medium">JSON Personalizado</Label>
              <Textarea
                value={customJson}
                onChange={(e) => {
                  setCustomJson(e.target.value)
                  handleConfigChange({ customJson: e.target.value })
                }}
                placeholder="Escribe tu respuesta JSON personalizada..."
                className="font-mono text-xs min-h-[120px]"
              />
              <div className="text-xs text-muted-foreground">
                💡 Puedes usar variables como <code>{`{{appointmentId}}`}</code>, <code>{`{{deviceId}}`}</code>, etc.
              </div>
            </div>
          )}

          {responseType === "created_record" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Configuración del Registro</Label>
                
                {/* Incluir ID */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Incluir ID único</Label>
                    <div className="text-xs text-muted-foreground">
                      Incluir el ID generado (CUID) del registro
                    </div>
                  </div>
                  <Switch
                    checked={includeId}
                    onCheckedChange={(checked) => {
                      setIncludeId(checked)
                      handleConfigChange({ includeId: checked })
                    }}
                  />
                </div>

                {/* Incluir timestamps */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Incluir timestamps</Label>
                    <div className="text-xs text-muted-foreground">
                      Incluir createdAt y updatedAt
                    </div>
                  </div>
                  <Switch
                    checked={includeTimestamps}
                    onCheckedChange={(checked) => {
                      setIncludeTimestamps(checked)
                      handleConfigChange({ includeTimestamps: checked })
                    }}
                  />
                </div>
              </div>

              {/* Campos personalizados */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Campos a Incluir (Opcional)</Label>
                <Textarea
                  value={customFields.join(", ")}
                  onChange={(e) => {
                    const fields = e.target.value.split(",").map(f => f.trim()).filter(Boolean)
                    setCustomFields(fields)
                    handleConfigChange({ customFields: fields })
                  }}
                  placeholder="appointmentId, deviceId, startedAt, energyConsumption"
                  className="text-xs"
                />
                <div className="text-xs text-muted-foreground">
                  Lista separada por comas. Si está vacío, se incluyen todos los campos.
                </div>
              </div>

              {/* Vista previa */}
              <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Vista Previa de Respuesta
                </div>
                <pre className="text-xs bg-background p-3 rounded overflow-auto">
{`{
  ${includeId ? '"id": "cm4abc123def456",\n  ' : ''}"appointmentId": "apt_789",
  "deviceId": "shelly-device-123",
  "startedAt": "2024-12-26T15:30:00Z",
  "energyConsumption": 264.6,${includeTimestamps ? '\n  "createdAt": "2024-12-26T15:30:00Z",\n  "updatedAt": "2024-12-26T15:30:00Z"' : ''}
  "status": "success"
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    Códigos de Estado HTTP
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <div><strong>200 OK:</strong> Datos recibidos y procesados correctamente</div>
                    <div><strong>400 Bad Request:</strong> Datos inválidos o faltantes</div>
                    <div><strong>401 Unauthorized:</strong> Fallo en autenticación</div>
                    <div><strong>500 Internal Error:</strong> Error del servidor</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
} 