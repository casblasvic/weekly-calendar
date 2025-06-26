"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Database, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Eye,
  Code,
  Table,
  MapPin,
  Settings,
  Target
} from "lucide-react"
import { toast } from "sonner"

interface DataMapperFormProps {
  webhook: any
  data: {
    expectedSchema?: any
    dataMapping?: any
    targetTable?: string
  }
  onChange: (data: any) => void
  testData?: any
}

interface FieldMapping {
  sourceField: string
  targetField: string
  targetType: string
  required: boolean
  transformation?: string
  defaultValue?: string
  condition?: string
}

// Tablas disponibles para mapear (esto debería venir de una API)
const AVAILABLE_TABLES = [
  {
    name: "appointment_device_usage",
    displayName: "Uso de Equipos en Citas",
    fields: [
      { name: "id", type: "string", required: true, auto: true },
      { name: "appointmentId", type: "string", required: true },
      { name: "appointmentServiceId", type: "string", required: false },
      { name: "equipmentId", type: "string", required: true },
      { name: "deviceId", type: "string", required: true },
      { name: "startedAt", type: "datetime", required: true },
      { name: "endedAt", type: "datetime", required: false },
      { name: "estimatedMinutes", type: "integer", required: true },
      { name: "actualMinutes", type: "integer", required: false },
      { name: "energyConsumption", type: "float", required: false },
      { name: "deviceData", type: "json", required: false },
      { name: "startedByUserId", type: "string", required: true },
      { name: "systemId", type: "string", required: true, auto: true },
      { name: "createdAt", type: "datetime", required: false, auto: true },
      { name: "updatedAt", type: "datetime", required: false, auto: true }
    ]
  },
  {
    name: "appointments",
    displayName: "Citas",
    fields: [
      { name: "id", type: "string", required: true, auto: true },
      { name: "startTime", type: "datetime", required: true },
      { name: "endTime", type: "datetime", required: true },
      { name: "durationMinutes", type: "integer", required: true },
      { name: "status", type: "string", required: true },
      { name: "notes", type: "string", required: false },
      { name: "professionalUserId", type: "string", required: true },
      { name: "personId", type: "string", required: true },
      { name: "systemId", type: "string", required: true, auto: true },
      { name: "clinicId", type: "string", required: true }
    ]
  },
  {
    name: "persons",
    displayName: "Personas",
    fields: [
      { name: "id", type: "string", required: true, auto: true },
      { name: "firstName", type: "string", required: false },
      { name: "lastName", type: "string", required: false },
      { name: "email", type: "string", required: false },
      { name: "phone", type: "string", required: false },
      { name: "birthDate", type: "date", required: false },
      { name: "gender", type: "string", required: false },
      { name: "systemId", type: "string", required: true, auto: true }
    ]
  }
]

const TRANSFORMATION_TYPES = [
  { value: "none", label: "Ninguna" },
  { value: "datetime", label: "Convertir a fecha/hora" },
  { value: "date", label: "Convertir a fecha" },
  { value: "integer", label: "Convertir a número entero" },
  { value: "float", label: "Convertir a número decimal" },
  { value: "string", label: "Convertir a texto" },
  { value: "boolean", label: "Convertir a verdadero/falso" },
  { value: "json", label: "Mantener como JSON" },
  { value: "uppercase", label: "Convertir a mayúsculas" },
  { value: "lowercase", label: "Convertir a minúsculas" },
  { value: "trim", label: "Eliminar espacios" }
]

export function DataMapperForm({ webhook, data, onChange, testData }: DataMapperFormProps) {
  const [selectedTable, setSelectedTable] = useState(data.targetTable || "")
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [sampleJson, setSampleJson] = useState("")
  const [parsedSample, setParsedSample] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [hasAutoMapped, setHasAutoMapped] = useState(false)

  const generateExampleFromSchema = useCallback((schema: any): any => {
    if (!schema || !schema.properties) return {}
    
    const example: any = {}
    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
      switch (prop.type) {
        case 'string':
          example[key] = prop.enum ? prop.enum[0] : `example_${key}`
          break
        case 'number':
          example[key] = 123.45
          break
        case 'integer':
          example[key] = 123
          break
        case 'boolean':
          example[key] = true
          break
        case 'array':
          example[key] = ['item1', 'item2']
          break
        case 'object':
          example[key] = generateExampleFromSchema(prop)
          break
        default:
          example[key] = `value_${key}`
      }
    })
    return example
  }, [])

  // Cargar mapeos existentes SOLO al inicio
  useEffect(() => {
    if (data.dataMapping?.fieldMappings && fieldMappings.length === 0) {
      setFieldMappings(Object.entries(data.dataMapping.fieldMappings).map(([target, config]: [string, any]) => ({
        sourceField: config.source || "",
        targetField: target,
        targetType: config.transform || config.type || "string",
        required: config.required || false,
        transformation: config.transform || "",
        defaultValue: config.default || "",
        condition: config.condition || ""
      })))
    }
  }, [data.dataMapping?.fieldMappings]) // Eliminar fieldMappings.length de dependencias

  // Cargar esquema esperado como ejemplo SOLO una vez
  useEffect(() => {
    if (data.expectedSchema && !sampleJson) {
      // Crear un JSON de ejemplo basado en el esquema
      const example = generateExampleFromSchema(data.expectedSchema)
      setSampleJson(JSON.stringify(example, null, 2))
    }
  }, [data.expectedSchema, generateExampleFromSchema]) // Eliminar sampleJson de dependencias

  // Auto-populación desde datos de prueba SOLO una vez
  useEffect(() => {
    if (testData?.requestPayload && !parsedSample) {
      // Si hay datos de prueba, usarlos automáticamente
      setParsedSample(testData.requestPayload)
      setSampleJson(JSON.stringify(testData.requestPayload, null, 2))
      
      // Si es sintético y tiene tabla seleccionada, usarla
      if (testData.synthetic && testData.selectedTable && !selectedTable) {
        setSelectedTable(testData.selectedTable)
        onChange({
          ...data,
          targetTable: testData.selectedTable
        })
      }
    }
  }, [testData?.requestPayload, testData?.selectedTable]) // Añadir selectedTable

  // ===== MAPEO INTELIGENTE MEJORADO =====
  const autoMapFieldsIntelligent = useCallback(() => {
    const dataSource = testData?.requestPayload || parsedSample
    if (!dataSource || !selectedTable) {
      toast.error("Necesitas seleccionar una tabla y tener datos de prueba")
      return
    }

    const sourceFields = getAvailableSourceFields()
    const targetTable = getTargetTable()
    
    if (!targetTable) return

    const autoMappings: FieldMapping[] = []

    // ===== MAPEO ESPECÍFICO PARA appointment_device_usage =====
    if (selectedTable === "appointment_device_usage") {
      const shellyMappings = [
        // Mapeos directos para Shelly Smart Plugs
        { source: "device_id", target: "deviceId", type: "string", required: true },
        { source: "appointment_id", target: "appointmentId", type: "string", required: true },
        { source: "appointment_service_id", target: "appointmentServiceId", type: "string", required: false },
        { source: "equipment_id", target: "equipmentId", type: "string", required: true },
        { source: "started_by_user_id", target: "startedByUserId", type: "string", required: true },
        { source: "estimated_minutes", target: "estimatedMinutes", type: "integer", required: true },
        { source: "actual_minutes", target: "actualMinutes", type: "integer", required: false },
        
        // Timestamp mappings
        { source: "timestamp", target: "startedAt", type: "datetime", required: true },
        { source: "started_at", target: "startedAt", type: "datetime", required: true },
        { source: "ended_timestamp", target: "endedAt", type: "datetime", required: false },
        { source: "ended_at", target: "endedAt", type: "datetime", required: false },
        
        // Energy mappings
        { source: "energy_total", target: "energyConsumption", type: "float", required: false },
        { source: "energy", target: "energyConsumption", type: "float", required: false },
        { source: "power", target: "energyConsumption", type: "float", required: false },
        { source: "consumption", target: "energyConsumption", type: "float", required: false },
      ]

      // Aplicar mapeos específicos de Shelly
      shellyMappings.forEach(mapping => {
        const sourceExists = sourceFields.includes(mapping.source)
        if (sourceExists) {
          autoMappings.push({
            sourceField: mapping.source,
            targetField: mapping.target,
            targetType: mapping.type,
            required: mapping.required,
            transformation: mapping.type === "datetime" ? "datetime" : "",
            defaultValue: "",
            condition: ""
          })
        }
      })

      // Mapear campos técnicos a deviceData JSON
      const technicalFields = ["power", "voltage", "current", "is_on", "temperature", "fw_version", "ip_address", "action"]
      const availableTechnicalFields = sourceFields.filter(field => 
        technicalFields.some(tech => field.toLowerCase().includes(tech.toLowerCase()))
      )

      if (availableTechnicalFields.length > 0) {
        autoMappings.push({
          sourceField: "_computed_device_data", // Campo computado especial
          targetField: "deviceData",
          targetType: "json",
          required: false,
          transformation: "json",
          defaultValue: `Datos técnicos: ${availableTechnicalFields.join(", ")}`,
          condition: `Incluye: ${availableTechnicalFields.join(", ")}`
        })
      }
    }

    // ===== MAPEO GENÉRICO PARA OTRAS TABLAS =====
    else {
      targetTable.fields
        .filter(field => !field.auto)
        .forEach(targetField => {
          const exactMatch = sourceFields.find(sf => sf === targetField.name)
          const camelCaseMatch = sourceFields.find(sf => 
            sf.toLowerCase() === targetField.name.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          )
          const similarMatch = sourceFields.find(sf => 
            sf.toLowerCase().includes(targetField.name.toLowerCase()) ||
            targetField.name.toLowerCase().includes(sf.toLowerCase())
          )
          
          const sourceField = exactMatch || camelCaseMatch || similarMatch || ""
          
          if (sourceField || targetField.required) {
            autoMappings.push({
              sourceField,
              targetField: targetField.name,
              targetType: targetField.type,
              required: targetField.required,
              transformation: targetField.type === "datetime" ? "datetime" : "",
              defaultValue: "",
              condition: ""
            })
          }
        })
    }

    // Remover duplicados por targetField
    const uniqueMappings = autoMappings.filter((mapping, index, array) => 
      array.findIndex(m => m.targetField === mapping.targetField) === index
    )

    setFieldMappings(uniqueMappings)
    updateDataMapping(uniqueMappings)
    
    const detectedFields = uniqueMappings.filter(m => m.sourceField).length
    const tableName = targetTable.displayName
    
    toast.success(`🎯 Mapeo inteligente: ${detectedFields} campos detectados automáticamente para ${tableName}`)
  }, [testData?.requestPayload, parsedSample, selectedTable])

  // NUEVO: Auto-mapeo automático para datos sintéticos
  useEffect(() => {
    if (testData?.synthetic && testData?.requestPayload && selectedTable && !hasAutoMapped) {
      // Si son datos sintéticos (desde "Crear comando cURL"), ejecutar auto-mapeo automáticamente
      console.log("🎯 Ejecutando auto-mapeo automático para datos sintéticos")
      setTimeout(() => {
        autoMapFieldsIntelligent()
        setHasAutoMapped(true)
        toast.success("🎯 Auto-mapeo ejecutado automáticamente")
      }, 1000) // Aumentar delay para asegurar que todo esté listo
    }
  }, [testData?.synthetic, testData?.requestPayload, selectedTable, hasAutoMapped, autoMapFieldsIntelligent])

  // NUEVO: Resetear hasAutoMapped cuando cambien datos o tabla
  useEffect(() => {
    setHasAutoMapped(false)
  }, [selectedTable, testData?.requestPayload])

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName)
    onChange({
      ...data,
      targetTable: tableName
    })
  }

  const handleSampleJsonChange = (value: string) => {
    setSampleJson(value)
    try {
      const parsed = JSON.parse(value)
      setParsedSample(parsed)
    } catch (error) {
      setParsedSample(null)
    }
  }

  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, {
      sourceField: "",
      targetField: "",
      targetType: "string",
      required: false,
      transformation: "",
      defaultValue: "",
      condition: ""
    }])
  }

  const updateFieldMapping = (index: number, updates: Partial<FieldMapping>) => {
    const updated = fieldMappings.map((mapping, i) => 
      i === index ? { ...mapping, ...updates } : mapping
    )
    setFieldMappings(updated)
    updateDataMapping(updated)
  }

  const removeFieldMapping = (index: number) => {
    const updated = fieldMappings.filter((_, i) => i !== index)
    setFieldMappings(updated)
    updateDataMapping(updated)
  }

  const updateDataMapping = (mappings: FieldMapping[]) => {
    const fieldMappings: any = {}
    mappings.forEach(mapping => {
      if (mapping.targetField) {
        fieldMappings[mapping.targetField] = {
          source: mapping.sourceField,
          required: mapping.required,
          transform: mapping.transformation || undefined,
          default: mapping.defaultValue || undefined,
          condition: mapping.condition || undefined
        }
      }
    })

    onChange({
      ...data,
      dataMapping: {
        targetTable: selectedTable,
        fieldMappings
      }
    })
  }

  const getAvailableSourceFields = () => {
    // Priorizar testData sobre parsedSample
    const dataSource = testData?.requestPayload || parsedSample
    if (!dataSource) return []
    
    const fields: string[] = []
    
    const extractFields = (obj: any, prefix = "") => {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key
        fields.push(fullKey)
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          extractFields(obj[key], fullKey)
        }
      })
    }
    
    extractFields(dataSource)
    return fields
  }

  const getTargetTable = () => {
    return AVAILABLE_TABLES.find(table => table.name === selectedTable)
  }

  const autoMapFields = () => {
    autoMapFieldsIntelligent()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Mapeo de Datos
          </CardTitle>
          <CardDescription>
            Mapea campos JSON recibidos a campos de la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mostrar datos de prueba si están disponibles Y NO son sintéticos */}
          {testData?.requestPayload && !testData?.synthetic && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                Datos recibidos en la prueba:
              </h4>
              <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(testData.requestPayload, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Mostrar información de datos sintéticos */}
          {testData?.requestPayload && testData?.synthetic && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">
                ✨ Estructura generada automáticamente desde tabla
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Se ha generado automáticamente una estructura de datos basada en los campos de la tabla seleccionada. 
                El mapeo se ha configurado automáticamente.
              </p>
            </div>
          )}
          
          {/* Selector de tabla */}
          <div className="space-y-2">
            <Label>Tabla destino *</Label>
            <Select value={selectedTable} onValueChange={handleTableChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una tabla..." />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TABLES.map((table) => (
                  <SelectItem key={table.name} value={table.name}>
                    <div className="space-y-1">
                      <div className="font-medium">{table.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {table.fields.length} campos disponibles
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mapeo de campos */}
          {selectedTable && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Mapeo de Campos</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      autoMapFields()
                      setHasAutoMapped(true)
                    }}
                    disabled={!testData?.requestPayload || !selectedTable}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    {hasAutoMapped ? "Re-mapear" : "Auto-mapear"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFieldMapping}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir Campo
                  </Button>
                </div>
              </div>

              {/* Lista de mapeos */}
              <div className="space-y-3">
                {fieldMappings.length === 0 && selectedTable && (
                  <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded">
                    <p className="text-sm">No hay campos mapeados aún</p>
                    <p className="text-xs">Haz clic en "Auto-mapear" o "Añadir Campo" para comenzar</p>
                  </div>
                )}
                {fieldMappings.map((mapping, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Campo origen */}
                      <div className="space-y-1">
                        <Label className="text-xs">Campo JSON (origen)</Label>
                        <Select
                          value={mapping.sourceField}
                          onValueChange={(value) => updateFieldMapping(index, { sourceField: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableSourceFields().map((field) => (
                              <SelectItem key={field} value={field}>
                                <code className="text-xs">{field}</code>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campo destino */}
                      <div className="space-y-1">
                        <Label className="text-xs">Campo BD (destino)</Label>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(value) => updateFieldMapping(index, { targetField: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getTargetTable()?.fields.map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs">{field.name}</code>
                                  <Badge variant="outline" className="text-xs">
                                    {field.type}
                                  </Badge>
                                  {field.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Requerido
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Transformación */}
                      <div className="space-y-1">
                        <Label className="text-xs">Transformación</Label>
                        <Select
                          value={mapping.transformation}
                          onValueChange={(value) => updateFieldMapping(index, { transformation: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Ninguna" />
                          </SelectTrigger>
                                                                                <SelectContent>
                             {TRANSFORMATION_TYPES.map((transform) => (
                               <SelectItem key={transform.value} value={transform.value}>
                                 {transform.label}
                               </SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFieldMapping(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Vista previa del mapeo */}
              {fieldMappings.length > 0 && testData?.requestPayload && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Vista Previa del Mapeo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs bg-muted p-3 rounded">
                      <p className="font-medium mb-2">Datos que se almacenarían:</p>
                      <pre className="text-xs">
                        {JSON.stringify(
                          fieldMappings.reduce((acc, mapping) => {
                            if (mapping.sourceField && mapping.targetField) {
                              const value = mapping.sourceField.split('.').reduce(
                                (obj, key) => obj?.[key], 
                                testData.requestPayload
                              )
                              acc[mapping.targetField] = value
                            }
                            return acc
                          }, {} as any),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Instrucciones si no hay datos de prueba */}
          {!testData?.requestPayload && (
            <div className="text-center py-8 bg-muted/20 border-2 border-dashed rounded-lg">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h4 className="font-medium mb-1">Sin datos para mapear</h4>
              <p className="text-sm text-muted-foreground">
                Ve a la pestaña "Datos, Pruebas y Mapeo" y usa el botón "Generar Estructura" o ejecuta una prueba para configurar el mapeo automáticamente
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 