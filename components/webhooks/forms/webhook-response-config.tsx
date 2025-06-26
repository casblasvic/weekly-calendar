"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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
  Info,
  FileJson,
  Server
} from "lucide-react"

interface WebhookResponseConfigProps {
  initialConfig: any
  onChange: (newConfig: any) => void
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

export function WebhookResponseConfig({ initialConfig, onChange }: WebhookResponseConfigProps) {
  const [config, setConfig] = useState({
    type: "simple",
    successStatusCode: 200,
    errorStatusCode: 400,
    successResponseBody: "",
    errorResponseBody: "",
    customJson: "{\n  \"status\": \"success\",\n  \"message\": \"Datos recibidos correctamente\"\n}",
    includeRecordId: true,
    includeTimestamps: true,
    includeBody: true,
    ...initialConfig
  })

  useEffect(() => {
    onChange(config)
  }, [config])

  const handleSelectChange = (value: string) => {
    setConfig(prev => ({ ...prev, type: value }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'number' ? parseInt(value, 10) : value
    setConfig(prev => ({ ...prev, [name]: finalValue }))
  }
  
  const handleSwitchChange = (checked: boolean, name: string) => {
    setConfig(prev => ({ ...prev, [name]: checked }))
  }

  const selectedType = RESPONSE_TYPES.find(t => t.value === config.type)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Configuración de Respuesta
        </CardTitle>
        <CardDescription>
          Define qué debe devolver el webhook al recibir una petición.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Tipo de Respuesta</Label>
          <Select value={config.type} onValueChange={handleSelectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo de respuesta..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  <span>Respuesta Simple (Solo código de estado)</span>
                </div>
              </SelectItem>
              <SelectItem value="created_record">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Devolver Registro Creado</span>
                </div>
              </SelectItem>
              <SelectItem value="custom_json">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  <span>JSON Personalizado</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.type === 'simple' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="successStatusCode">Código de Éxito (2xx)</Label>
              <Input
                id="successStatusCode"
                name="successStatusCode"
                type="number"
                value={config.successStatusCode}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="errorStatusCode">Código de Error (4xx/5xx)</Label>
              <Input
                id="errorStatusCode"
                name="errorStatusCode"
                type="number"
                value={config.errorStatusCode}
                onChange={handleInputChange}
              />
            </div>
          </div>
        )}
        
        {config.type === 'created_record' && (
          <div className="space-y-4 p-4 border rounded-md">
            <p className="text-sm text-muted-foreground">
              El webhook devolverá un JSON con el ID y las marcas de tiempo del registro creado en la base de datos.
            </p>
            <div className="flex items-center space-x-2">
              <Switch 
                id="includeRecordId" 
                checked={config.includeRecordId} 
                onCheckedChange={(checked) => handleSwitchChange(checked, "includeRecordId")}
              />
              <Label htmlFor="includeRecordId">Incluir ID del registro</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="includeTimestamps"
                checked={config.includeTimestamps}
                onCheckedChange={(checked) => handleSwitchChange(checked, "includeTimestamps")}
              />
              <Label htmlFor="includeTimestamps">Incluir `createdAt` y `updatedAt`</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="includeBody"
                checked={config.includeBody || false}
                onCheckedChange={(checked) => handleSwitchChange(checked, "includeBody")}
              />
              <Label htmlFor="includeBody">Incluir cuerpo completo del registro</Label>
            </div>
          </div>
        )}

        {config.type === 'custom_json' && (
          <div className="space-y-2">
            <Label htmlFor="customJson">Cuerpo del JSON de Respuesta</Label>
            <Textarea
              id="customJson"
              name="customJson"
              value={config.customJson}
              onChange={handleInputChange}
              rows={8}
              placeholder='{ "status": "ok" }'
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 