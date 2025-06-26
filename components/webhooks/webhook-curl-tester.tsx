"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator";
import { 
  Terminal, 
  Copy, 
  Send, 
  CheckCircle, 
  XCircle, 
  Zap,
  Code,
  Monitor,
  Lightbulb,
  Activity,
  Clock,
  RefreshCw,
  Shield,
  Edit,
  Plus,
  Trash2,
  Wand2
} from "lucide-react"


interface WebhookCurlTesterProps {
  webhook: {
    id: string
    name: string
    url: string
    token?: string
    secretKey?: string
    allowedMethods: string[]
    expectedSchema?: any
    samplePayload?: any; // <-- Payload para reconstruir el estado
    authType?: "none" | "bearer" | "hmac" | "api_key"
    customHeaders?: Record<string, string>
    dataMapping?: {
      targetTable?: string
      autoMapEnabled?: boolean
      fieldMappings?: Record<string, {
        source: string
        type: string
        required?: boolean
        default?: any
      }>
    }
  }
  onTestDataReceived?: (data: any) => void
  onConfigChange?: (config: { samplePayload?: any; dataMapping?: { targetTable?: string; }; customHeaders?: Record<string, string>; }) => void;
}

const DEVICE_EXAMPLES = {
  shelly: {
    name: "Shelly Smart Plug",
    icon: <Zap className="w-4 h-4" />,
    events: {
      device_usage_start: {
        method: "POST",
        payload: {
          // ===== CAMPOS REQUERIDOS (NOT NULL) =====
          "appointmentId": "apt_cm4abc123def456", // text NOT NULL
          "equipmentId": "eq_laser_co2_001", // text NOT NULL
          "deviceId": "shellyplus1pm-441793d69718", // text NOT NULL
          "startedAt": new Date().toISOString(), // timestamp with time zone NOT NULL
          "estimatedMinutes": 30, // integer NOT NULL
          "startedByUserId": "user_cm4doctor123", // text NOT NULL
          
          // ===== CAMPOS OPCIONALES (NULL permitido) =====
          "appointmentServiceId": "srv_depilacion_laser", // text NULL
          "endedAt": null, // timestamp with time zone NULL (null para inicio)
          "actualMinutes": null, // integer NULL (null para inicio)
          "energyConsumption": 264.6, // double precision NULL
          
          // ===== deviceData JSONB (datos técnicos del dispositivo) =====
          "deviceData": {
            "power": 264.6,
            "voltage": 220.5,
            "current": 1.2,
            "temperature": 42.3,
            "is_on": true,
            "total_energy": 15420.8,
            "fw_version": "1.0.10",
            "mac_address": "68:C6:3A:D6:97:18",
            "ip_address": "192.168.1.150"
          }
        }
      },
      device_usage_end: {
        method: "POST", 
        payload: {
          // ===== CAMPOS REQUERIDOS =====
          "appointmentId": "apt_cm4abc123def456",
          "equipmentId": "eq_laser_co2_001", 
          "deviceId": "shellyplus1pm-441793d69718",
          "startedAt": new Date(Date.now() - 30*60*1000).toISOString(), // 30 min atrás
          "estimatedMinutes": 30,
          "startedByUserId": "user_cm4doctor123",
          
          // ===== CAMPOS OPCIONALES =====
          "appointmentServiceId": "srv_depilacion_laser",
          "endedAt": new Date().toISOString(), // Ahora termina
          "actualMinutes": 28, // Duración real en minutos
          "energyConsumption": 452.8, // Energía total consumida
          
          // ===== deviceData JSONB =====
          "deviceData": {
            "power": 0, // Apagado
            "voltage": 220.5,
            "current": 0,
            "temperature": 38.1,
            "is_on": false,
            "total_energy": 15873.6, // Energía acumulada total
            "fw_version": "1.0.10",
            "mac_address": "68:C6:3A:D6:97:18",
            "ip_address": "192.168.1.150"
          }
        }
      },
      status_report_get: {
        method: "GET",
        payload: {},
        urlParams: "?appointmentId=apt_cm4abc123def456&equipmentId=eq_laser_co2_001&deviceId=shellyplus1pm-441793d69718&startedAt=" + new Date().toISOString() + "&estimatedMinutes=30&startedByUserId=user_cm4doctor123&energyConsumption=264.6",
        description: "Reporte de estado por GET (lectura de consumo)"
      }
    }
  },
  kasa: {
    name: "TP-Link Kasa",
    icon: <Monitor className="w-4 h-4" />,
    events: {
      device_on: {
        method: "POST",
        payload: {
          "appointmentId": "apt_kasa987654321",
          "equipmentId": "eq_ipl_device_002", 
          "deviceId": "8012F2BB82A54C8B70DE3F5B2B3CF4C7",
          "startedAt": new Date().toISOString(),
          "estimatedMinutes": 25,
          "startedByUserId": "user_cm4nurse456",
          "appointmentServiceId": "srv_ipl_treatment",
          "energyConsumption": 180.3,
          "deviceData": {
            "alias": "IPL Device Kasa",
            "relay_state": 1,
            "power_mw": 180300,
            "voltage_mv": 220500,
            "current_ma": 820,
            "total_wh": 8900
          }
        }
      },
      device_off: {
        method: "POST",
        payload: {
          "appointmentId": "apt_kasa987654321",
          "equipmentId": "eq_ipl_device_002",
          "deviceId": "8012F2BB82A54C8B70DE3F5B2B3CF4C7", 
          "startedAt": new Date(Date.now() - 25*60*1000).toISOString(),
          "estimatedMinutes": 25,
          "startedByUserId": "user_cm4nurse456",
          "appointmentServiceId": "srv_ipl_treatment",
          "endedAt": new Date().toISOString(),
          "actualMinutes": 23,
          "energyConsumption": 205.7,
          "deviceData": {
            "alias": "IPL Device Kasa", 
            "relay_state": 0,
            "on_time": 1380, // 23 minutos en segundos
            "total_wh": 9105
          }
        }
      }
    }
  },
  generic: {
    name: "Dispositivo Genérico",
    icon: <Lightbulb className="w-4 h-4" />,
    events: {
      equipment_start: {
        method: "POST",
        payload: {
          "appointmentId": "apt_generic123456",
          "equipmentId": "eq_generic_device_003",
          "deviceId": "generic_device_xyz789",
          "startedAt": new Date().toISOString(),
          "estimatedMinutes": 45,
          "startedByUserId": "user_cm4admin789",
          "appointmentServiceId": "srv_generic_treatment",
          "energyConsumption": 0,
          "deviceData": {
            "status": "started",
            "mode": "auto",
            "settings": {
              "intensity": 75,
              "duration": 45
            }
          }
        }
      },
      equipment_stop: {
        method: "POST",
        payload: {
          "appointmentId": "apt_generic123456",
          "equipmentId": "eq_generic_device_003", 
          "deviceId": "generic_device_xyz789",
          "startedAt": new Date(Date.now() - 42*60*1000).toISOString(),
          "estimatedMinutes": 45,
          "startedByUserId": "user_cm4admin789",
          "appointmentServiceId": "srv_generic_treatment",
          "endedAt": new Date().toISOString(),
          "actualMinutes": 42,
          "energyConsumption": 315.2,
          "deviceData": {
            "status": "completed",
            "mode": "auto",
            "final_energy": 315.2,
            "completion_rate": 0.93
          }
        }
      }
    }
  }
}

// Función para generar valores de ejemplo
const getExampleValue = (type: string, fieldName?: string) => {
  const fieldSuffix = fieldName ? `_${fieldName}` : '';
  switch (type.toLowerCase()) {
    case 'string': return `"dato${fieldSuffix}"`;
    case 'int':
    case 'float':
    case 'decimal': return '123';
    case 'boolean': return 'true';
    case 'datetime': return `"${new Date().toISOString()}"`;
    case 'json': return `{"dato${fieldSuffix}": "valor"}`;
    default: return `"dato${fieldSuffix}"`;
  }
};

export function WebhookCurlTester({ webhook, onTestDataReceived, onConfigChange }: WebhookCurlTesterProps) {
  // Estados principales
  const [customPayload, setCustomPayload] = useState("")
  const [customGetParams, setCustomGetParams] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurlCommand, setShowCurlCommand] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [autoMapResult, setAutoMapResult] = useState<any>(null)
  
  // Estados para las dos pantallas
  const [sendingData, setSendingData] = useState<{
    command: string
    status: 'idle' | 'sending' | 'sent' | 'error'
    timestamp?: string
  }>({ command: '', status: 'idle' })
  
  const [receivingData, setReceivingData] = useState<{
    response: any
    status: 'idle' | 'waiting' | 'received' | 'error'
    timestamp?: string
    rawData?: any
  }>({ response: null, status: 'idle' })
  
  // Control de la ejecución
  const [isExecuting, setIsExecuting] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  
  // Control del modo escucha
  const [isListening, setIsListening] = useState(false)
  const [listeningStartTime, setListeningStartTime] = useState<Date | null>(null)
  const [incomingData, setIncomingData] = useState<any[]>([])
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null)
  
  // Estados para seguridad - Inicializar con valores del webhook
  const [securityType, setSecurityType] = useState<"none" | "bearer" | "hmac" | "api_key">(webhook.authType || "none")
  const [generatedToken, setGeneratedToken] = useState(webhook.token || "")
  const [generatedSecret, setGeneratedSecret] = useState(webhook.secretKey || "")
  const [apiKey, setApiKey] = useState("") // Asumimos que no hay api key por ahora
  
  // NUEVO: Estado para tipo de contenido
  const [contentType, setContentType] = useState<"json" | "urlencoded">("json")
  
  // Estado para el comando curl generado
  const [curlCommand, setCurlCommand] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [bodyBuilderFields, setBodyBuilderFields] = useState<Array<{ id: number; key: string; value: string }>>([])
  // Inicializar sin campos por defecto
  const [selectedTableFields, setSelectedTableFields] = useState<Array<{ name: string; type: string; isOptional: boolean }>>([])
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)
  const [showCopiedJsonTooltip, setShowCopiedJsonTooltip] = useState(false)
  const [isGetOnly, setIsGetOnly] = useState(false);
  const [prismaModels, setPrismaModels] = useState<string[]>([]);
  
  // Inicializar customHeaders con Content-Type automático
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>(() => {
    const initialHeaders = webhook.customHeaders || {}
    // Añadir Content-Type automáticamente si no existe
    if (!initialHeaders["Content-Type"] && !isGetOnly) {
      initialHeaders["Content-Type"] = "application/json"
    }
    return initialHeaders
  })

  // Cargar modelos de Prisma al montar el componente (SOLO NOMBRES)
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/internal/prisma/schema-models')
        if (response.ok) {
          const models = await response.json()
          setPrismaModels(models)
        }
      } catch (error) {
        console.error('Error fetching Prisma models:', error)
      }
    }
    fetchModels()
  }, [])

  const handleModelSelect = async (modelName: string) => {
    if (!modelName || modelName === "none") {
      setSelectedModel("");
      setSelectedTableFields([]);
      return;
    }
    
    setSelectedModel(modelName);
    
    try {
      const response = await fetch(`/api/internal/prisma/schema-models/${modelName}`);
      if (response.ok) {
        const fields = await response.json();
        setSelectedTableFields(fields);
      }
    } catch (error) {
      console.error(`Error fetching fields for model ${modelName}:`, error);
    }
  };

  // Generar cURL cuando cambien los datos importantes
  useEffect(() => {
    const updateCurl = async () => {
      try {
        // La llamada a generateCurl ahora usará el estado más reciente de customPayload
        const command = await generateCurl()
        setCurlCommand(command)
      } catch (error) {
        console.error('Error generating curl:', error)
      }
    }
    
    updateCurl()
  }, [securityType, generatedToken, generatedSecret, apiKey, customHeaders, customPayload, webhook.url, selectedModel])

  // Sincronizar bodyBuilderFields con customPayload SOLO cuando bodyBuilderFields cambia
  useEffect(() => {
    if (bodyBuilderFields.length === 0) return;
    
    try {
      const newPayload = bodyBuilderFields.reduce((acc, field) => {
        if (field.key && field.value) {
          try {
            acc[field.key] = JSON.parse(field.value);
          } catch {
            acc[field.key] = field.value;
          }
        }
        return acc;
      }, {} as Record<string, any>);
      
      const newPayloadString = Object.keys(newPayload).length > 0 
        ? JSON.stringify(newPayload, null, 2) 
        : "";
      
      setCustomPayload(newPayloadString);
    } catch (error) {
      console.error('Error updating payload:', error);
    }
  }, [bodyBuilderFields]);



  // Inicializar valores de seguridad del webhook SOLO una vez
  useEffect(() => {
    if (webhook.authType) {
      setSecurityType(webhook.authType)
    }
    if (webhook.token) {
      setGeneratedToken(webhook.token)
    }
    if (webhook.secretKey) {
      setGeneratedSecret(webhook.secretKey)
    }
  }, [webhook.id]) // Solo cuando cambie el webhook

  const generateCurl = async (payloadOverride?: string) => {
    // Usar el mapeo de datos si existe para generar el payload
    const webhookMapping = webhook.dataMapping?.fieldMappings
    let generatedPayload: any = {}
    
    // Solo generar payload si hay campos configurados
    if (bodyBuilderFields.length > 0 && bodyBuilderFields.some(f => f.key && f.value)) {
      // Usar campos del constructor de body
      bodyBuilderFields.forEach(field => {
        if (field.key && field.value) {
          try {
            generatedPayload[field.key] = JSON.parse(field.value);
          } catch {
            generatedPayload[field.key] = field.value;
          }
        }
      })
    }

    // ===== GENERAR URL DINÁMICA CON PUERTO CORRECTO =====
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
    const webhookPath = webhook.url ? webhook.url.split('/api/webhooks')[1] : '/fallback/webhook'
    const dynamicUrl = `${currentOrigin}/api/webhooks${webhookPath}`
    
    let url = dynamicUrl
    let curlCommand = ""
    
    // Determinar método HTTP (usar el primero permitido)
    const methods = webhook.allowedMethods || ['POST'];
    const method = methods.includes('POST') ? 'POST' :
                   methods.includes('PUT') ? 'PUT' :
                   methods.includes('PATCH') ? 'PATCH' :
                   methods.includes('GET') ? 'GET' : 'POST'
    
    if (isGetOnly || method === 'GET') {
      // Para GET, solo mostrar URL base si no hay parámetros configurados
      curlCommand = `curl -X GET "${dynamicUrl}"`
    } else {
      // Para POST/PUT/PATCH, usar payload en el body
      curlCommand = `curl -X ${method} "${dynamicUrl}"`
      
      // Headers - siempre incluir Content-Type desde customHeaders
      Object.entries(customHeaders).forEach(([key, value]) => {
        if (key && value) {
        curlCommand += ` \\\n  -H "${key}: ${value}"`
        }
      })
    }

    // Preparar payload. Prioridad: override > customPayload desde estado > generatedPayload
    let payload = ""
    if (payloadOverride) {
      payload = payloadOverride
    } else if (customPayload.trim()) {
      payload = customPayload
    } else if (Object.keys(generatedPayload).length > 0) {
      payload = JSON.stringify(generatedPayload, null, 2)
    }

    // Aplicar seguridad según el tipo seleccionado
    switch (securityType) {
      case "bearer":
        if (generatedToken) {
          curlCommand += ` \\\n  -H "Authorization: Bearer ${generatedToken}"`
        }
        break
      case "hmac":
        if (generatedSecret && !isGetOnly && payload) {
          try {
            const signature = await calculateHmacSignature(payload, generatedSecret)
            curlCommand += ` \\\n  -H "X-Signature: ${signature}"`
          } catch (error) {
            curlCommand += ` \\\n  -H "X-Signature: sha256=<calculated_signature>"`
          }
        } else if (generatedSecret && isGetOnly) {
          curlCommand += ` \\\n  -H "X-Signature: sha256=<calculated_from_url>"`
        }
        break
      case "api_key":
        if (apiKey) {
          curlCommand += ` \\\n  -H "X-API-Key: ${apiKey}"`
        }
        break
      case "none":
      default:
        // Sin autenticación adicional
        break
    }

    // Legacy token del webhook (si existe)
    if (webhook.token && securityType === "none") {
      curlCommand += ` \\\n  -H "Authorization: Bearer ${webhook.token}"`
    }
    
    // Payload para métodos POST/PUT/PATCH
    if (!isGetOnly && payload) {
      const escapedPayload = payload.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      curlCommand += ` \\\n  -d '${escapedPayload}'`
    }
      
    return curlCommand + "\n"
  }

  // Funciones para generar tokens de seguridad
  const generateBearerToken = () => {
    const token = `wh_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    setGeneratedToken(token)
    toast.success("Bearer token generado")
    // La notificación ahora se maneja a través de onConfigChange
    return token
  }

  const generateHmacSecret = () => {
    const secret = `hmac_${Math.random().toString(36).substring(2, 20)}${Math.random().toString(36).substring(2, 20)}`
    setGeneratedSecret(secret)
    toast.success("HMAC secret generado")
    // La notificación ahora se maneja a través de onConfigChange
    return secret
  }

  const generateApiKey = () => {
    const key = `ak_${Math.random().toString(36).substring(2, 16)}${Math.random().toString(36).substring(2, 16)}`
    setApiKey(key)
    toast.success("API Key generada")
    // La notificación ahora se maneja a través de onConfigChange
    return key
  }

  // Función para calcular HMAC-SHA256
  const calculateHmacSignature = async (payload: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    const key = encoder.encode(secret)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const hashArray = Array.from(new Uint8Array(signature))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `sha256=${hashHex}`
  }

  const handleCopyCurl = async () => {
    await navigator.clipboard.writeText(curlCommand)
    setShowCopiedTooltip(true)
    setTimeout(() => setShowCopiedTooltip(false), 2000)
    toast.success("Comando curl copiado al portapapeles")
  }

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(customPayload)
    setShowCopiedJsonTooltip(true)
    setTimeout(() => setShowCopiedJsonTooltip(false), 2000)
    toast.success("JSON copiado al portapapeles")
  }

  // NUEVA: Función para crear comando cURL desde tabla seleccionada
  const createCurlFromTable = async () => {
    if (!selectedModel || selectedTableFields.length === 0) {
      toast.error("Selecciona una tabla primero")
      return
    }

    // Generar campos automáticamente desde la tabla (incluyendo todos los campos)
    const newBodyFields = selectedTableFields
      .filter(field => {
        // Excluir campos que típicamente son automáticos
        const autoFields = ['id', 'createdAt', 'updatedAt', 'systemId']
        return !autoFields.includes(field.name)
      })
      .map((field, index) => ({
        id: Date.now() + index,
        key: field.name,
        value: getExampleValue(field.type, field.name)
      }))

    // El estado de bodyBuilderFields se actualizará, y el useEffect se encargará
    // de actualizar customPayload, que a su vez disparará la regeneración del cURL.
    setBodyBuilderFields(newBodyFields)

    // Notificar al padre para que el data-mapper pueda hacer el mapeo automático
    const testPayload = newBodyFields.reduce((acc, field) => {
        if (field.key && field.value) {
            try {
                acc[field.key] = JSON.parse(field.value);
            } catch {
                acc[field.key] = field.value;
            }
        }
        return acc;
    }, {} as Record<string, any>);

    onTestDataReceived?.({
      requestPayload: testPayload,
      status: 200,
      success: true,
      timestamp: new Date().toISOString(),
      method: 'POST',
      synthetic: true, // Marcar como datos sintéticos
      selectedTable: selectedModel, // Añadir la tabla seleccionada
    })

    toast.success(`🚀 Comando cURL y mapeo generados para ${selectedModel}`)
  }

  // Función para mapear automáticamente los datos
  const performAutoMapping = async (rawData: any) => {
    if (!webhook.dataMapping?.autoMapEnabled || !webhook.dataMapping?.fieldMappings) {
      setExecutionLogs(prev => [...prev, "ℹ️ Mapeo automático no configurado"])
      return null
    }

    // Prevenir ejecución múltiple
    const executionId = Date.now()
    console.log(`🔄 [${executionId}] Iniciando mapeo automático...`)
    setExecutionLogs(prev => [...prev, "🔄 Iniciando mapeo automático..."])
    
    try {
      // Detectar si los datos están en formato x-www-form-urlencoded o JSON
      let parsedData = rawData
      
      if (typeof rawData === 'string') {
        try {
          // Intentar parsear como JSON primero
          parsedData = JSON.parse(rawData)
          setExecutionLogs(prev => [...prev, "📄 Datos detectados como JSON"])
        } catch {
          // Si falla, intentar parsear como x-www-form-urlencoded
          const urlParams = new URLSearchParams(rawData)
          parsedData = Object.fromEntries(urlParams.entries())
          setExecutionLogs(prev => [...prev, "📝 Datos detectados como x-www-form-urlencoded"])
        }
      }
      
      setExecutionLogs(prev => [...prev, `📊 [${executionId}] Datos a mapear: ${Object.keys(parsedData).length} campos`])
      console.log(`📊 [${executionId}] Datos recibidos:`, parsedData)
      
      const mappedData: any = {}
      const fieldMappings = webhook.dataMapping.fieldMappings
      let mappedCount = 0
      let skippedCount = 0
      
      Object.entries(fieldMappings).forEach(([targetField, mapping]) => {
        const sourceValue = parsedData[mapping.source]
        
        if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
          // Convertir tipos si es necesario
          try {
            switch (mapping.type) {
              case "number":
                const numValue = Number(sourceValue)
                if (!isNaN(numValue)) {
                  mappedData[targetField] = numValue
                  mappedCount++
                  setExecutionLogs(prev => [...prev, `✅ ${mapping.source} → ${targetField}: ${numValue} (number)`])
                } else {
                  setExecutionLogs(prev => [...prev, `⚠️ ${mapping.source}: "${sourceValue}" no es un número válido`])
                  skippedCount++
                }
                break
              case "boolean":
                const boolValue = sourceValue === 'true' || sourceValue === true || sourceValue === '1' || sourceValue === 1
                mappedData[targetField] = boolValue
                mappedCount++
                setExecutionLogs(prev => [...prev, `✅ ${mapping.source} → ${targetField}: ${boolValue} (boolean)`])
                break
              case "datetime":
                if (sourceValue === "now()") {
                  mappedData[targetField] = new Date()
                  mappedCount++
                  setExecutionLogs(prev => [...prev, `✅ ${mapping.source} → ${targetField}: ${new Date().toISOString()} (datetime-now)`])
                } else {
                  const dateValue = new Date(sourceValue)
                  if (!isNaN(dateValue.getTime())) {
                    mappedData[targetField] = dateValue
                    mappedCount++
                    setExecutionLogs(prev => [...prev, `✅ ${mapping.source} → ${targetField}: ${dateValue.toISOString()} (datetime)`])
                  } else {
                    setExecutionLogs(prev => [...prev, `⚠️ ${mapping.source}: "${sourceValue}" no es una fecha válida`])
                    skippedCount++
                  }
                }
                break
              default:
                mappedData[targetField] = String(sourceValue)
                mappedCount++
                setExecutionLogs(prev => [...prev, `✅ ${mapping.source} → ${targetField}: "${sourceValue}" (string)`])
            }
          } catch (conversionError) {
            setExecutionLogs(prev => [...prev, `❌ Error convirtiendo ${mapping.source}: ${conversionError}`])
            skippedCount++
          }
        } else if (mapping.required) {
          setExecutionLogs(prev => [...prev, `⚠️ Campo requerido ${mapping.source} no encontrado o vacío`])
          skippedCount++
        } else if (mapping.default !== undefined) {
          mappedData[targetField] = mapping.default
          mappedCount++
          setExecutionLogs(prev => [...prev, `✅ ${targetField}: usando valor por defecto "${mapping.default}"`])
        }
      })

      setExecutionLogs(prev => [...prev, `📊 Resumen: ${mappedCount} campos mapeados, ${skippedCount} omitidos`])
      setExecutionLogs(prev => [...prev, "💾 Simulando guardado en BD..."])
      
      // Simular guardado en BD (en realidad aquí se haría la llamada a la API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mappingResult = {
        targetTable: webhook.dataMapping.targetTable || "AppointmentDeviceUsage",
        mappedData,
        rawData: parsedData,
        success: true,
        recordId: `record_${Date.now()}`, // ID simulado
        message: `Datos mapeados correctamente: ${mappedCount} campos procesados`,
        statistics: {
          mapped: mappedCount,
          skipped: skippedCount,
          total: Object.keys(fieldMappings).length
        }
      }
      
      setAutoMapResult(mappingResult)
      setExecutionLogs(prev => [...prev, "✅ ¡Mapeo automático completado exitosamente!"])
      
      return mappingResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error de mapeo"
      setExecutionLogs(prev => [...prev, `❌ Error en mapeo: ${errorMessage}`])
      setAutoMapResult({
        targetTable: webhook.dataMapping?.targetTable || "Unknown",
        mappedData: {},
        rawData,
        success: false,
        recordId: null,
        message: `Error en mapeo: ${errorMessage}`
      })
      return null
    }
  }

  const handleTest = async () => {
    // Prevenir ejecución múltiple
    if (isLoading || isExecuting) {
      console.log("🛑 Ejecución ya en progreso, ignorando...")
      return
    }
    
    setIsLoading(true)
    setIsExecuting(true)
    setTestResults(null)
    setExecutionLogs([])
    setAutoMapResult(null)
    
    // Crear AbortController para poder cancelar
    const controller = new AbortController()
    setAbortController(controller)
    
    // Resetear pantallas
    setSendingData({ command: '', status: 'idle' })
    setReceivingData({ response: null, status: 'idle' })
    
    setExecutionLogs(["🚀 Iniciando prueba del webhook..."])
    
    try {
      // Determinar método HTTP (usar el primero permitido)
      const methods = webhook.allowedMethods || ['POST'];
      const method = methods.includes('POST') ? 'POST' : 
                     methods.includes('PUT') ? 'PUT' :
                     methods.includes('PATCH') ? 'PATCH' :
                     methods.includes('GET') ? 'GET' : 'POST'
      
      setExecutionLogs(prev => [...prev, `📡 Preparando petición ${method}...`])
      
      // Generar el comando cURL que se enviará
      const curlCommand = await generateCurl()
      setSendingData({
        command: curlCommand,
        status: 'sending',
        timestamp: new Date().toLocaleTimeString()
      })
      
      setExecutionLogs(prev => [...prev, "📤 Enviando comando cURL..."])
      
      // Usar el payload generado desde el mapeo
      const webhookMapping = webhook.dataMapping?.fieldMappings
      let generatedPayload: any = {}
      
      if (bodyBuilderFields.length > 0 && bodyBuilderFields.some(f => f.key && f.value)) {
        // Usar campos del constructor de body
        bodyBuilderFields.forEach(field => {
          if (field.key && field.value) {
            generatedPayload[field.key] = field.value
          }
        })
      } else if (webhookMapping && !isGetOnly) {
        Object.entries(webhookMapping).forEach(([targetField, mapping]: [string, any]) => {
          const sourceField = mapping.source
          if (mapping.required !== false) {
            switch (mapping.type) {
              case "string":
                generatedPayload[sourceField] = sourceField === "device_id" ? "shelly-test-device" : 
                                                sourceField === "timestamp" ? new Date().toISOString() : "test-value"
                break
              case "number":
                generatedPayload[sourceField] = sourceField === "power" ? 250.5 : 
                                                sourceField === "voltage" ? 220.0 :
                                                sourceField === "current" ? 1.14 : 
                                                sourceField === "energy" ? 1234.5 : 42.0
                break
              case "boolean":
                generatedPayload[sourceField] = sourceField === "is_on" ? true : false
                break
              case "datetime":
                generatedPayload[sourceField] = new Date().toISOString()
                break
              default:
                generatedPayload[sourceField] = "test-value"
            }
          }
        })
      } else {
        // Payload por defecto simple
        generatedPayload = {
          timestamp: new Date().toISOString(),
          device_id: "test-device",
          status: "test-value"
        }
      }
      
      // ===== USAR URL DINÁMICA CON PUERTO CORRECTO =====
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      const webhookPath = webhook.url ? webhook.url.split('/api/webhooks')[1] : '/fallback/webhook'
      const dynamicBaseUrl = `${currentOrigin}/api/webhooks${webhookPath}`
      
      let url = dynamicBaseUrl
      let requestInit: RequestInit = {
        method: method
      }
      
      if (isGetOnly || method === 'GET') {
        // Para GET, construir URL con parámetros
      }
      
      if (isGetOnly) {
        // Para GET, construir URL con parámetros desde el mapeo
        let params = ""
        if (webhookMapping) {
          const paramsList: string[] = []
          Object.entries(webhookMapping).forEach(([targetField, mapping]: [string, any]) => {
            const sourceField = mapping.source
            if (mapping.required !== false) {
              const value = sourceField === "device_id" ? "shelly-test-device" :
                           sourceField === "power" ? "250.5" :
                           sourceField === "voltage" ? "220.0" :
                           sourceField === "current" ? "1.14" :
                           sourceField === "is_on" ? "true" : 
                           sourceField === "energy" ? "1234.5" :
                           sourceField === "timestamp" ? new Date().toISOString() : "test-value"
              paramsList.push(`${sourceField}=${encodeURIComponent(value)}`)
            }
          })
          params = paramsList.length > 0 ? "?" + paramsList.join("&") : ""
        } else {
          params = "?power=250.5&voltage=220.0&current=1.14&is_on=true&device_id=shelly-test-device"
        }
        
        url = `${dynamicBaseUrl}${params}`
        
        // Solo headers de autorización para GET
        const headers: Record<string, string> = {}
        if (webhook.token) {
          headers["Authorization"] = `Bearer ${webhook.token}`
        }
        
        // Headers personalizados (sin Content-Type para GET)
        Object.entries(customHeaders).forEach(([key, value]) => {
          if (key !== "Content-Type") {
            headers[key] = value
          }
        })
        
        requestInit.headers = headers
      } else {
        // Para POST/PUT/PATCH, usar payload en el body
        const payload = customPayload || JSON.stringify(generatedPayload)
        
        const headers = {
          ...customHeaders,
          ...(webhook.token && { "Authorization": `Bearer ${webhook.token}` })
        }
        
        requestInit.headers = headers
        requestInit.body = payload
      }
      
      setExecutionLogs(prev => [...prev, `🌐 Enviando a ${url}...`])
      
      // Actualizar pantalla de "recibiendo" a estado de espera
      setReceivingData({
        response: null,
        status: 'waiting',
        timestamp: new Date().toLocaleTimeString()
      })
      
      const startTime = Date.now()
      const response = await fetch(url, { 
        ...requestInit, 
        signal: controller.signal // Para poder cancelar
      })
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      // Marcar comando como enviado exitosamente
      setSendingData(prev => ({
        ...prev,
        status: 'sent',
        timestamp: new Date().toLocaleTimeString()
      }))
      
      setExecutionLogs(prev => [...prev, `📊 Respuesta: ${response.status} ${response.statusText} (${responseTime}ms)`])
      
      let responseBody
      try {
        responseBody = await response.json()
      } catch {
        responseBody = await response.text()
      }
      
      // ===== CONSTRUIR DATOS PARA MAPEO ANTES DE PROCESAR =====
      let requestPayload = {}
      if (isGetOnly) {
        // Para GET, extraer los parámetros de la URL
        const urlObj = new URL(url)
        requestPayload = Object.fromEntries(urlObj.searchParams.entries())
        console.log("🔗 Datos GET extraídos para mapeo:", requestPayload)
      } else {
        // Para POST, usar el payload del body
        try {
          requestPayload = JSON.parse(requestInit.body as string || "{}")
          console.log("📦 Datos POST extraídos para mapeo:", requestPayload)
        } catch {
          requestPayload = {}
        }
      }
      
      const testResult = {
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        success: response.ok,
        requestPayload,
        timestamp: new Date().toISOString(),
        method: method,
        url: url
      }
      
      setTestResults(testResult)
      
      // Actualizar pantalla de "recibiendo" con la respuesta
      setReceivingData({
        response: responseBody,
        status: response.ok ? 'received' : 'error',
        timestamp: new Date().toLocaleTimeString(),
        rawData: requestPayload
      })
      
      if (response.ok) {
        setExecutionLogs(prev => [...prev, "✅ Webhook ejecutado correctamente"])
        
        // Realizar mapeo automático si está habilitado (UNA SOLA VEZ)
        if (webhook.dataMapping?.autoMapEnabled && Object.keys(requestPayload).length > 0) {
          console.log("🎯 Ejecutando mapeo automático ÚNICO desde handleTest")
          await performAutoMapping(requestPayload)
        } else if (webhook.dataMapping?.autoMapEnabled) {
          setExecutionLogs(prev => [...prev, "⚠️ No hay datos para mapear automáticamente"])
        }
        
        toast.success(`Webhook ejecutado correctamente (${response.status})`)
      } else {
        setExecutionLogs(prev => [...prev, `❌ Error: ${response.status} ${response.statusText}`])
        toast.error(`Error en webhook: ${response.status} ${response.statusText}`)
      }
      
      // Pasar los datos al callback para usar en mapeo
      onTestDataReceived?.(testResult)
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // La ejecución fue cancelada por el usuario
        setSendingData(prev => ({ ...prev, status: 'error' }))
        setReceivingData(prev => ({ ...prev, status: 'error' }))
        setExecutionLogs(prev => [...prev, "🛑 Ejecución cancelada por el usuario"])
        toast.info("Ejecución cancelada")
        return
      }
      
      const errorMessage = error instanceof Error ? error.message : "Error de conexión"
      setExecutionLogs(prev => [...prev, `💥 Error: ${errorMessage}`])
      
      setSendingData(prev => ({ ...prev, status: 'error' }))
      setReceivingData({
        response: null,
        status: 'error',
        timestamp: new Date().toLocaleTimeString(),
        rawData: null
      })
      
      setTestResults({
        status: 0,
        statusText: "Network Error",
        responseTime: 0,
        headers: {},
        body: errorMessage,
        success: false
      })
      toast.error("Error al conectar con el webhook")
    } finally {
      setIsLoading(false)
      setIsExecuting(false)
      setAbortController(null)
    }
  }

  // Función eliminada: handlePayloadChange ya no es necesaria

  const handleStopExecution = () => {
    if (abortController) {
      abortController.abort()
      setIsExecuting(false)
      setIsLoading(false)
      toast.info("Cancelando ejecución...")
    }
  }

  // Funciones para el modo escucha
  const startListening = async () => {
    setIsListening(true)
    setListeningStartTime(new Date())
    setIncomingData([])
    setExecutionLogs(["👂 Webhook en modo escucha..."])
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
    const webhookPath = webhook.url ? webhook.url.split('/api/webhooks')[1] : '/fallback/webhook'
    const dynamicWebhookUrl = `${currentOrigin}/api/webhooks${webhookPath}`
    setExecutionLogs(prev => [...prev, "🔗 URL del webhook: " + dynamicWebhookUrl])
    setExecutionLogs(prev => [...prev, "⏳ Esperando datos entrantes..."])
    
    // Actualizar pantalla de recepción
    setReceivingData({
      response: null,
      status: 'waiting',
      timestamp: new Date().toLocaleTimeString(),
      rawData: null
    })
    
    toast.success("Webhook en escucha - Envía datos desde dispositivos externos")
    
    // El polling se iniciará automáticamente via useEffect
  }

  const stopListening = () => {
    setIsListening(false)
    setListeningStartTime(null)
    setExecutionLogs(prev => [...prev, "🛑 Modo escucha detenido"])
    
    setReceivingData({
      response: null,
      status: 'idle',
      timestamp: new Date().toLocaleTimeString(),
      rawData: null
    })
    
    toast.info("Modo escucha detenido")
  }

  const pollForIncomingData = async () => {
    if (!isListening) {
      console.log("🛑 Polling detenido - isListening = false")
      return
    }
    
    try {
      // Obtener logs del webhook desde el momento que empezamos a escuchar
      const since = listeningStartTime || new Date()
      const response = await fetch(`/api/internal/webhooks/${webhook.id}/logs?since=${since.toISOString()}&limit=10`)
      
      if (response.ok) {
        const logs = await response.json()
        
        // Filtrar solo logs nuevos (después del último poll)
        const newLogs = logs.filter((log: any) => {
          const logTime = new Date(log.timestamp)
          return !lastPollTime || logTime > lastPollTime
        })
        
        if (newLogs.length > 0) {
          setLastPollTime(new Date())
          
          // Procesar cada log nuevo
          for (const log of newLogs) {
            if (log.statusCode >= 200 && log.statusCode < 300) {
              // Log exitoso - procesar datos
              setExecutionLogs(prev => [...prev, `📥 Datos recibidos: ${log.method} ${log.statusCode}`])
              
              // ===== MEJORAR PARSING DE DATOS =====
              let parsedData = {}
              try {
                // Para GET: datos están en log.body (que son los parámetros de URL)
                // Para POST: datos están en log.body también pero como JSON
                if (log.body && typeof log.body === 'object') {
                  parsedData = log.body
                } else if (log.body && typeof log.body === 'string') {
                  try {
                    parsedData = JSON.parse(log.body)
                  } catch {
                    // Si no es JSON, es query params como string
                    const params = new URLSearchParams(log.body)
                    parsedData = Object.fromEntries(params.entries())
                  }
                }
                
                console.log("📊 Datos parseados para mapeo:", parsedData)
              } catch (e) {
                console.error("Error parsing log data:", e)
                parsedData = {}
              }
              
              // Actualizar pantalla de recepción con los nuevos datos
              setReceivingData({
                response: { message: "Datos procesados correctamente", timestamp: log.timestamp },
                status: 'received',
                timestamp: new Date(log.timestamp).toLocaleTimeString(),
                rawData: parsedData
              })
              
              // Añadir a la lista de datos entrantes
              setIncomingData(prev => [...prev, {
                timestamp: log.timestamp,
                method: log.method,
                statusCode: log.statusCode,
                data: parsedData,
                headers: log.headers || {}
              }])
              
              // Realizar mapeo automático si está habilitado
              if (webhook.dataMapping?.autoMapEnabled && Object.keys(parsedData).length > 0) {
                setExecutionLogs(prev => [...prev, "🔄 Ejecutando mapeo automático..."])
                await performAutoMapping(parsedData)
              }
              
              toast.success(`Datos recibidos desde dispositivo externo!`)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error polling for incoming data:', error)
      // Detener polling en caso de error
      setIsListening(false)
    }
  }

  // Efecto para manejar el polling - SOLO UN MÉTODO
  useEffect(() => {
    if (isListening && listeningStartTime) {
      console.log("🔄 Iniciando polling de logs cada 3 segundos")
      const interval = setInterval(() => {
        if (isListening) {
          pollForIncomingData()
        }
      }, 3000) // Cada 3 segundos en lugar de 2
      
      return () => {
        console.log("🛑 Limpiando interval de polling")
        clearInterval(interval)
      }
    }
  }, [isListening, listeningStartTime])

  useEffect(() => {
    // Cuando el payload o la tabla seleccionada cambien, notificar al padre.
    if(onConfigChange) {
      try {
        const payload = customPayload ? JSON.parse(customPayload) : null;
        onConfigChange({ 
          samplePayload: payload, 
          dataMapping: { 
            targetTable: selectedModel 
          }
        });
      } catch (error) {
        // Si el JSON es inválido, no hacemos nada.
        // El usuario está probablemente en medio de la escritura.
      }
    }
  }, [customPayload, selectedModel, onConfigChange]);

  // ---->>> LÓGICA DE REHIDRATACIÓN DE ESTADO <<<----
  useEffect(() => {
    if (webhook) {
      // 1. Re-seleccionar la tabla de destino si existe
      if (webhook.dataMapping?.targetTable) {
        setSelectedModel(webhook.dataMapping.targetTable);
        // Si hay una tabla, cargamos sus campos
        handleModelSelect(webhook.dataMapping.targetTable);
      }
      
      // 2. Reconstruir el constructor de body desde el payload guardado
      if (webhook.samplePayload && typeof webhook.samplePayload === 'object' && Object.keys(webhook.samplePayload).length > 0) {
        const fields = Object.entries(webhook.samplePayload).map(([key, value], index) => ({
            id: Date.now() + index,
            key,
            // Convertir valores de objeto/array a string JSON para el input
            value: typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)
        }));
        setBodyBuilderFields(fields);
      } else {
        // Si no hay payload, limpiar los campos para evitar mostrar datos de un webhook anterior.
        setBodyBuilderFields([]);
      }
      
      // 3. Sincronizar el payload de texto
      if (webhook.samplePayload) {
          setCustomPayload(JSON.stringify(webhook.samplePayload, null, 2));
      } else {
          setCustomPayload("");
      }
      
      // 4. Sincronizar métodos permitidos
      setIsGetOnly((webhook.allowedMethods || []).includes("GET") && (webhook.allowedMethods || []).length === 1);
    }
  }, [webhook?.id]); // FIX: Re-hidratar SOLO cuando el webhook en sí cambia (cambia el ID)

  return (
    <div className="space-y-4">
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid grid-cols-2 w-full h-8">
          <TabsTrigger value="generator" className="text-xs">Generador cURL</TabsTrigger>
          <TabsTrigger value="tester" className="text-xs">Pruebas Conexión</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-4">

          {/* Headers personalizados */}
          <div className="space-y-2">
            <Label>Headers Personalizados</Label>
            <div className="space-y-2">
              {Object.entries(customHeaders).map(([key, value], index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Header"
                    value={key}
                    onChange={(e) => {
                      const newHeaders = { ...customHeaders }
                      delete newHeaders[key]
                      newHeaders[e.target.value] = value
                      setCustomHeaders(newHeaders)
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Valor"
                    value={value}
                    onChange={(e) => {
                      setCustomHeaders(prev => ({ ...prev, [key]: e.target.value }))
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newHeaders = { ...customHeaders }
                      delete newHeaders[key]
                      setCustomHeaders(newHeaders)
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomHeaders(prev => ({ ...prev, "": "" }))}
              >
                + Añadir Header
              </Button>
            </div>
          </div>

          {/* Configuración Manual de Datos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center text-base">
                <Edit className="w-4 h-4" />
                Datos de la Petición
              </CardTitle>
              <CardDescription>
                Define los datos que se enviarán en el body (para POST/PUT) o como parámetros (para GET).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGetOnly ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Los webhooks de tipo GET envían datos a través de parámetros en la URL. No se utiliza un body.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selector de tipo de contenido */}
                <div className="space-y-3">
                    <Label>Tipo de Contenido</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={contentType === "json" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setContentType("json")
                          // Actualizar Content-Type automáticamente
                          setCustomHeaders(prev => ({
                            ...prev,
                            "Content-Type": "application/json"
                          }))
                        }}
                        className="px-3 py-2 h-auto"
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium">JSON</div>
                          <div className="text-xs text-muted-foreground">Recomendado</div>
                        </div>
                      </Button>
                      
                        <Button
                        variant={contentType === "urlencoded" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                          setContentType("urlencoded")
                          // Actualizar Content-Type automáticamente
                          setCustomHeaders(prev => ({
                            ...prev,
                            "Content-Type": "application/x-www-form-urlencoded"
                          }))
                        }}
                        className="px-3 py-2 h-auto"
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium">URL-encoded</div>
                          <div className="text-xs text-muted-foreground">Formularios</div>
                        </div>
                        </Button>
                      </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Internamente siempre se maneja como JSON. Si recibes URL-encoded se convierte automáticamente.
                    </p>
                  </div>
                  <Separator />
                  {/* Constructor Visual Mejorado */}
                  <div className="space-y-3">
                    <Label>Tabla Destino</Label>
                    <Select onValueChange={handleModelSelect} value={selectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una tabla para autocompletar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {prismaModels.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Información de tabla seleccionada */}
                    {selectedTableFields.length > 0 && (
                      <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                                Tabla: {selectedModel}
                              </h4>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                {selectedTableFields.length} campos disponibles
                              </p>
                            </div>
                    <Button
                              variant="default" 
                      size="sm"
                              onClick={createCurlFromTable}
                              className="gap-1 bg-blue-600 hover:bg-blue-700"
                    >
                              <Wand2 className="w-3 h-3" />
                              Crear Comando cURL
                    </Button>
                  </div>
                  
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Campos disponibles ({selectedTableFields.filter(f => {
                                const autoFields = ['id', 'createdAt', 'updatedAt', 'systemId']
                                return !autoFields.includes(f.name)
                              }).length} campos para mapear):
                            </Label>
                            <div className="text-xs bg-white dark:bg-gray-900 p-3 rounded border max-h-24 overflow-y-auto">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {selectedTableFields
                                  .filter(field => {
                                    const autoFields = ['id', 'createdAt', 'updatedAt', 'systemId']
                                    return !autoFields.includes(field.name)
                                  })
                                  .map((field) => (
                                    <div key={field.name} className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <code className="text-blue-600 font-medium text-xs">{field.name}</code>
                                        {!field.isOptional && <span className="text-red-500 text-xs">*</span>}
                                        {field.isOptional && <span className="text-orange-500 text-xs">?</span>}
                                      </div>
                                      <span className="text-gray-500 text-xs">{field.type}</span>
                                    </div>
                                  ))
                                }
                  </div>
                </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              <span className="text-red-500">*</span> = Requerido, 
                              <span className="text-orange-500">?</span> = Opcional
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                  <Separator />
                <div className="space-y-3">
                    <Label>Constructor de Body</Label>
                    {bodyBuilderFields.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded">
                        <p className="text-sm">No hay campos configurados</p>
                        <p className="text-xs">Selecciona una tabla y haz clic en "Crear Comando cURL" o añade campos manualmente</p>
                      </div>
                    ) : (
                      bodyBuilderFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-center">
                          <Input placeholder="nombre_del_campo" value={field.key} onChange={(e) => {
                            const newFields = [...bodyBuilderFields];
                            newFields[index].key = e.target.value;
                            setBodyBuilderFields(newFields);
                          }}/>
                          <Input placeholder="valor" value={field.value} onChange={(e) => {
                            const newFields = [...bodyBuilderFields];
                            newFields[index].value = e.target.value;
                            setBodyBuilderFields(newFields);
                          }}/>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              const newFields = bodyBuilderFields.filter(f => f.id !== field.id)
                              setBodyBuilderFields(newFields.length === 0 ? [{ id: Date.now(), key: '', value: '' }] : newFields)
                            }}
                            disabled={bodyBuilderFields.length === 1 && !field.key && !field.value}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const newField = { id: Date.now(), key: '', value: '' }
                        setBodyBuilderFields(bodyBuilderFields.length === 0 ? [newField] : [...bodyBuilderFields, newField])
                      }}
                    >
                      <Plus className="mr-2 w-4 h-4"/>Añadir Campo
                    </Button>
                  </div>
                  <Separator />
                  {/* Previsualización JSON */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Previsualización del Payload JSON</Label>
                      {customPayload && (
                        <Button size="sm" variant="outline" onClick={handleCopyJson} className="relative">
                          <Copy className="mr-1 w-3 h-3" />
                          Copiar
                          {showCopiedJsonTooltip && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              ¡Copiado!
                            </div>
                          )}
                        </Button>
                      )}
                    </div>
                  <Textarea
                      readOnly
                    value={customPayload}
                      className="min-h-[150px] font-mono text-xs bg-muted/50"
                      placeholder="El JSON se generará aquí..."
                    />
                    </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comando curl generado */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle className="flex gap-2 items-center text-base">
                <Terminal className="w-4 h-4" />
                Comando cURL
              </CardTitle>
              <Button size="sm" variant="outline" onClick={handleCopyCurl} className="relative">
                <Copy className="mr-1 w-3 h-3" />
                Copiar
                {showCopiedTooltip && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    ¡Copiado!
                  </div>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto p-3 text-xs rounded bg-muted">
                {curlCommand}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tester" className="space-y-4">
          {/* Comando cURL a ejecutar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Terminal className="w-4 h-4" />
                Comando a Ejecutar
              </CardTitle>
              <CardDescription>
                Este es el comando cURL que se ejecutará. Puedes modificarlo si necesitas ajustes específicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Comando cURL</Label>
                <Textarea
                  value={curlCommand}
                  onChange={(e) => setCurlCommand(e.target.value)}
                  className="min-h-[120px] font-mono text-xs"
                  placeholder="Comando cURL se generará automáticamente..."
                />
                <div className="flex gap-2 items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCurl}
                    className="gap-1 relative"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                    {showCopiedTooltip && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        ¡Copiado!
                      </div>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const command = await generateCurl()
                        setCurlCommand(command)
                        toast.success("Comando regenerado desde configuración")
                      } catch (error) {
                        toast.error("Error regenerando comando")
                      }
                    }}
                    className="gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control de ejecución */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Modos de Prueba</h4>
              <p className="text-sm text-muted-foreground">
                Elige cómo quieres probar tu webhook
              </p>
            </div>
            
            {/* Dos modos de prueba */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Modo 1: Ejecutar desde UI */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Send className="w-5 h-5 text-blue-500" />
                    <h5 className="font-medium">🚀 Ejecutar desde UI</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Envía el comando cURL desde la aplicación hacia tu webhook
                  </p>
                  {isExecuting ? (
                    <Button 
                      onClick={handleStopExecution} 
                      variant="destructive" 
                      className="gap-2 w-full"
                    >
                      <XCircle className="w-4 h-4" />
                      🛑 Detener Ejecución
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleTest} 
                      disabled={isLoading || isListening} 
                      className="gap-2 w-full"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isLoading ? "Ejecutando..." : "🚀 Ejecutar Prueba"}
                    </Button>
                  )}
                </div>
              </Card>

              {/* Modo 2: Escuchar datos externos */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Activity className="w-5 h-5 text-green-500" />
                    <h5 className="font-medium">👂 Escuchar Externos</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pone el webhook en escucha para recibir datos desde dispositivos externos
                  </p>
                  {isListening ? (
                    <div className="space-y-2">
                      <Button 
                        onClick={stopListening} 
                        variant="destructive" 
                        className="gap-2 w-full"
                      >
                        <XCircle className="w-4 h-4" />
                        🛑 Detener Escucha
                      </Button>
                      <div className="flex gap-2 items-center text-sm text-green-600">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Escuchando... ({incomingData.length} recibidos)
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={startListening} 
                      disabled={isExecuting} 
                      variant="outline"
                      className="gap-2 w-full"
                    >
                      <Activity className="w-4 h-4" />
                      👂 Poner en Escucha
                    </Button>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Información del modo activo */}
            {isListening && (
              <div className="p-4 bg-green-50 rounded border border-green-200 dark:bg-green-950/20">
                <div className="space-y-2">
                  <div className="flex gap-2 items-center text-green-800 dark:text-green-200">
                    <Activity className="w-4 h-4" />
                    <strong>Webhook en escucha activa</strong>
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p><strong>URL:</strong> <code className="px-1 bg-green-100 rounded dark:bg-green-900/50">{webhook.url}</code></p>
                    <p><strong>Desde:</strong> {listeningStartTime?.toLocaleTimeString()}</p>
                    <p><strong>Datos recibidos:</strong> {incomingData.length}</p>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    💡 Envía datos desde tu dispositivo Shelly, cURL externo, o cualquier sistema IoT a la URL del webhook
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dos pantallas: Envío y Recepción */}
          {(sendingData.status !== 'idle' || receivingData.status !== 'idle') && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Pantalla de ENVÍO */}
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="flex gap-2 items-center text-sm">
                    <Send className="w-4 h-4" />
                    📤 ENVIANDO
                    {sendingData.status === 'sending' && <RefreshCw className="ml-2 w-3 h-3 animate-spin" />}
                    {sendingData.status === 'sent' && <CheckCircle className="ml-2 w-3 h-3 text-green-500" />}
                    {sendingData.status === 'error' && <XCircle className="ml-2 w-3 h-3 text-red-500" />}
                  </CardTitle>
                  {sendingData.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      {sendingData.timestamp}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Comando cURL:</Label>
                      <pre className="overflow-x-auto p-3 mt-1 font-mono text-xs text-green-400 bg-black rounded">
{sendingData.command || "Generando comando..."}
                      </pre>
                    </div>
                    
                    {sendingData.status === 'sending' && (
                      <div className="flex gap-2 items-center text-sm text-blue-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Enviando petición...
                      </div>
                    )}
                    
                    {sendingData.status === 'sent' && (
                      <div className="flex gap-2 items-center text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        ✅ Comando ejecutado exitosamente
                      </div>
                    )}
                    
                    {sendingData.status === 'error' && (
                      <div className="flex gap-2 items-center text-sm text-red-600">
                        <XCircle className="w-4 h-4" />
                        ❌ Error en el envío
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pantalla de RECEPCIÓN */}
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="flex gap-2 items-center text-sm">
                    <Activity className="w-4 h-4" />
                    📥 RECIBIENDO
                    {receivingData.status === 'waiting' && <RefreshCw className="ml-2 w-3 h-3 animate-spin" />}
                    {receivingData.status === 'received' && <CheckCircle className="ml-2 w-3 h-3 text-green-500" />}
                    {receivingData.status === 'error' && <XCircle className="ml-2 w-3 h-3 text-red-500" />}
                  </CardTitle>
                  {receivingData.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      {receivingData.timestamp}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {receivingData.status === 'idle' && (
                      <div className="text-sm text-muted-foreground">
                        Esperando inicio de ejecución...
                      </div>
                    )}
                    
                    {receivingData.status === 'waiting' && (
                      <div className="flex gap-2 items-center text-sm text-blue-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Esperando respuesta del webhook...
                      </div>
                    )}
                    
                    {receivingData.status === 'received' && receivingData.response && (
                      <div>
                        <Label className="text-xs font-medium">Respuesta recibida:</Label>
                        <pre className="overflow-auto p-3 mt-1 font-mono text-xs bg-green-50 rounded border border-green-200 dark:bg-green-950/20">
{JSON.stringify(receivingData.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {receivingData.status === 'received' && receivingData.rawData && (
                      <div>
                        <Label className="text-xs font-medium">Datos enviados originalmente:</Label>
                        <pre className="overflow-auto p-3 mt-1 font-mono text-xs bg-blue-50 rounded border border-blue-200 dark:bg-blue-950/20">
{JSON.stringify(receivingData.rawData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {receivingData.status === 'error' && (
                      <div className="flex gap-2 items-center text-sm text-red-600">
                        <XCircle className="w-4 h-4" />
                        ❌ Error en la recepción
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resultados */}
          {testResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  {testResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  Resultado de la Prueba
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex gap-4 items-center">
                  <Badge variant={testResults.success ? "default" : "destructive"}>
                    {testResults.status} {testResults.statusText}
                  </Badge>
                  <div className="flex gap-1 items-center text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {testResults.responseTime}ms
                  </div>
                </div>

                {/* Response headers */}
                <div>
                  <h5 className="mb-2 font-medium">Headers de Respuesta</h5>
                  <pre className="overflow-auto p-3 max-h-32 text-xs rounded bg-muted">
                    {JSON.stringify(testResults.headers, null, 2)}
                  </pre>
                </div>

                {/* URL solicitada (para GET) */}
                {testResults.method === "GET" && (
                  <div>
                    <h5 className="mb-2 font-medium">URL Solicitada</h5>
                    <code className="block p-3 text-xs break-all rounded bg-muted">
                      {testResults.url}
                    </code>
                  </div>
                )}

                {/* Datos enviados */}
                <div>
                  <h5 className="mb-2 font-medium">
                    {testResults.method === "GET" ? "Parámetros Enviados" : "Payload Enviado"}
                  </h5>
                  <pre className="overflow-auto p-3 max-h-32 text-xs rounded bg-muted">
                    {JSON.stringify(testResults.requestPayload, null, 2)}
                  </pre>
                </div>

                {/* Response body */}
                <div>
                  <h5 className="mb-2 font-medium">Cuerpo de Respuesta</h5>
                  <pre className="overflow-auto p-3 max-h-40 text-xs rounded bg-muted">
                    {typeof testResults.body === 'string' 
                      ? testResults.body 
                      : JSON.stringify(testResults.body, null, 2)
                    }
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs de ejecución en tiempo real */}
          {executionLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <Activity className="w-5 h-5" />
                  Logs de Ejecución en Tiempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto p-3 max-h-48 font-mono text-xs text-green-400 bg-black rounded">
                  {executionLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      [{new Date().toLocaleTimeString()}] {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado del mapeo automático */}
          {autoMapResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Mapeo Automático Completado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info del mapeo */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium">Tabla Destino</Label>
                    <p className="px-2 py-1 mt-1 font-mono text-sm rounded bg-muted">
                      {autoMapResult.targetTable}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">ID Registro</Label>
                    <p className="px-2 py-1 mt-1 font-mono text-sm rounded bg-muted">
                      {autoMapResult.recordId}
                    </p>
                  </div>
                </div>

                {/* Datos originales vs mapeados */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium">Datos Originales</Label>
                    <pre className="overflow-auto p-3 mt-1 max-h-32 text-xs rounded bg-muted">
                      {JSON.stringify(autoMapResult.rawData, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Datos Mapeados</Label>
                    <pre className="overflow-auto p-3 mt-1 max-h-32 text-xs rounded bg-muted">
                      {JSON.stringify(autoMapResult.mappedData, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Mensaje de estado */}
                <div className="p-3 bg-green-50 rounded border border-green-200 dark:bg-green-950/20">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>✅ Éxito:</strong> {autoMapResult.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cabeceras Personalizadas */}
          <Card>
              <CardHeader>
                  <CardTitle className="text-base">Cabeceras Personalizadas</CardTitle>
                  <CardDescription className="text-xs">
                      Añade cabeceras HTTP personalizadas que se enviarán con cada petición.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                      {Object.entries(customHeaders).map(([key, value]) => (
                          <div key={key} className="flex gap-2 items-center">
                              <Input value={key} readOnly className="h-8 font-mono text-xs bg-muted" />
                              <Input value={value} readOnly className="h-8 font-mono text-xs bg-muted" />
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={() => {
                                      const newHeaders = { ...customHeaders };
                                      delete newHeaders[key];
                                      onConfigChange?.({ customHeaders: newHeaders });
                                  }}
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                       {/* Añadir nueva cabecera (Lógica simple por ahora) */}
                       <Button variant="outline" size="sm" className="mt-2" onClick={() => onConfigChange?.({ customHeaders: { ...customHeaders, 'Nueva-Cabecera': 'valor' } })}>
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir Cabecera
                      </Button>
                  </div>
              </CardContent>
          </Card>

          {/* Previsualización del Payload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Terminal className="w-4 h-4" />
                Previsualización del Payload
              </CardTitle>
              <CardDescription>
                Aquí puedes ver cómo se verá el payload antes de enviarlo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium">Payload</Label>
                  <pre className="overflow-auto p-3 max-h-40 text-xs rounded bg-muted">
                    {JSON.stringify(bodyBuilderFields.reduce((acc, field) => {
                      acc[field.key] = field.value;
                      return acc;
                    }, {} as Record<string, any>), null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 