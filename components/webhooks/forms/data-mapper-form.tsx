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
  Target,
  Wand2
} from "lucide-react"
import { toast } from "sonner"

interface DataMapperFormProps {
  webhook: any
  data: {
    expectedSchema?: any
    dataMapping?: any
    targetTable?: string
    samplePayload?: any
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

// Interfaz para la estructura de las tablas que obtendremos de la API
interface AvailableTable {
  name: string;
  displayName: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    auto?: boolean;
  }>;
}

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

// NUEVO: Helper para sugerir la transformación correcta basada en el tipo de la BD
const getSuggestedTransformation = (dbType: string): string => {
  if (!dbType) return "none";
  const type = dbType.toLowerCase();

  if (type.includes('date') || type.includes('time')) return 'datetime';
  if (type.includes('int')) return 'integer';
  if (type.includes('float') || type.includes('decimal') || type.includes('double') || type.includes('numeric')) return 'float';
  if (type.includes('bool')) return 'boolean';
  if (type.includes('json')) return 'json';
  
  // Para strings (text, varchar, etc.), no se necesita transformación por defecto.
  return 'none';
};

export function DataMapperForm({ webhook, data, onChange, testData }: DataMapperFormProps) {
  const [selectedTable, setSelectedTable] = useState("");
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [parsedSample, setParsedSample] = useState<any>(null);
  const [targetTableFields, setTargetTableFields] = useState<any[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Efecto 1: Sincronizar estado interno con los props (la fuente de la verdad guardada)
  useEffect(() => {
    // Sincronizar tabla seleccionada
    if (data?.targetTable && data.targetTable !== selectedTable) {
      setSelectedTable(data.targetTable);
    }
    // Sincronizar payload de ejemplo
    if (data?.samplePayload) {
      setParsedSample(data.samplePayload);
    }
    // Sincronizar mapeos
    if (data?.dataMapping?.fieldMappings) {
      const mappingsArray = Object.entries(data.dataMapping.fieldMappings).map(([target, config]: [string, any]) => ({
        sourceField: config.source || "",
        targetField: target,
        targetType: config.type || "string",
        required: config.required || false,
        transformation: config.transform || "",
        defaultValue: config.default || "",
        condition: config.condition || ""
      }));
      setFieldMappings(mappingsArray);
    } else {
      setFieldMappings([]);
    }
  }, [data]);

  // Efecto 2: Reaccionar a datos de prueba sintéticos para iniciar el mapeo
  useEffect(() => {
    if (testData?.synthetic && testData.selectedTable) {
      setSelectedTable(testData.selectedTable);
      setParsedSample(testData.requestPayload);
    }
  }, [testData]);

  // Efecto 3: Obtener los campos de la tabla de destino cuando esta cambia
  useEffect(() => {
    const fetchTargetTableFields = async () => {
      if (!selectedTable) {
        setTargetTableFields([]);
        return;
      }
      setIsLoadingFields(true);
      try {
        const response = await fetch(`/api/internal/prisma/schema-models/${selectedTable}`);
        if (response.ok) {
          const fields = await response.json();
          setTargetTableFields(fields);
        } else {
          toast.error(`No se pudieron cargar los campos para la tabla ${selectedTable}`);
          setTargetTableFields([]);
        }
      } catch (error) {
        console.error(`Error fetching fields for ${selectedTable}:`, error);
        setTargetTableFields([]);
      } finally {
        setIsLoadingFields(false);
      }
    };
    fetchTargetTableFields();
  }, [selectedTable]);
  
  const getAvailableSourceFields = useCallback((dataSourceOverride?: any) => {
    const dataSource = dataSourceOverride || parsedSample;
    if (!dataSource) return [];
    
    const fields: string[] = [];
    const extractFields = (obj: any, prefix = "") => {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        fields.push(fullKey);
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          extractFields(obj[key], fullKey);
        }
      });
    };
    extractFields(dataSource);
    return fields;
  }, [parsedSample]);

  // Efecto 4: Calcular el mapeo SOLO cuando los campos de destino y el payload están listos.
  useEffect(() => {
    if (targetTableFields.length > 0 && parsedSample) {
        const sourceFields = getAvailableSourceFields(parsedSample);
        const autoMappings: FieldMapping[] = [];
        
        targetTableFields
            .filter(field => !['id', 'createdAt', 'updatedAt', 'systemId'].includes(field.name))
            .forEach(targetField => {
                if (sourceFields.includes(targetField.name)) {
                    autoMappings.push({
                        sourceField: targetField.name,
                        targetField: targetField.name,
                        targetType: targetField.type,
                        required: !targetField.isOptional,
                        transformation: getSuggestedTransformation(targetField.type),
                        defaultValue: "",
                        condition: "",
                    });
                }
            });

        if (autoMappings.length > 0) {
            setFieldMappings(autoMappings);
            updateDataMapping(selectedTable, autoMappings);
            toast.success(`🎯 Mapeo automático: ${autoMappings.length} campos detectados.`);
        }
    }
  }, [targetTableFields, parsedSample]);

  const addFieldMapping = () => {
    const newFieldMappings = [...fieldMappings, {
      sourceField: "",
      targetField: "",
      targetType: "string",
      required: false,
      transformation: "",
      defaultValue: "",
      condition: ""
    }];
    setFieldMappings(newFieldMappings);
    updateDataMapping(selectedTable, newFieldMappings);
  };

  const updateFieldMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newFieldMappings = fieldMappings.map((mapping, i) =>
      i === index ? { ...mapping, ...updates } : mapping
    );
    setFieldMappings(newFieldMappings);
    updateDataMapping(selectedTable, newFieldMappings);
  };

  const removeFieldMapping = (index: number) => {
    const newFieldMappings = fieldMappings.filter((_, i) => i !== index);
    setFieldMappings(newFieldMappings);
    updateDataMapping(selectedTable, newFieldMappings);
  };

  const updateDataMapping = (table: string, mappings: FieldMapping[]) => {
    const fieldMappingsObj: any = {};
    mappings.forEach(mapping => {
      if (mapping.targetField) {
        fieldMappingsObj[mapping.targetField] = {
          source: mapping.sourceField,
          required: mapping.required,
          transform: mapping.transformation || undefined,
          default: mapping.defaultValue || undefined,
          condition: mapping.condition || undefined,
        };
      }
    });

    onChange({
      dataMapping: {
        targetTable: table,
        fieldMappings: fieldMappingsObj,
      },
    });
  };

  const autoMapFields = () => {
    if (parsedSample && selectedTable && targetTableFields.length > 0) {
      const sourceFields = getAvailableSourceFields(parsedSample);
      const newMappings = targetTableFields
        .filter(field => !['id', 'createdAt', 'updatedAt', 'systemId'].includes(field.name) && sourceFields.includes(field.name))
        .map(targetField => ({
            sourceField: targetField.name,
            targetField: targetField.name,
            targetType: targetField.type,
            required: !targetField.isOptional,
            transformation: getSuggestedTransformation(targetField.type),
            defaultValue: "",
            condition: "",
        }));

      setFieldMappings(newMappings);
      updateDataMapping(selectedTable, newMappings);
      toast.success("Campos re-mapeados exitosamente.");
    } else {
      toast.error("No hay datos o tabla de destino para realizar el mapeo.");
    }
  };

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
          {/* Información de tabla seleccionada desde el generador */}
          {selectedTable && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                <Table className="inline-block w-4 h-4 mr-2" />
                Tabla seleccionada: {selectedTable}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Los campos de mapeo se configurarán automáticamente basándose en la tabla seleccionada en el generador cURL.
              </p>
            </div>
          )}

          {/* Mapeo de campos - SIEMPRE VISIBLE cuando hay tabla seleccionada */}
          {selectedTable && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Mapeo de Campos</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoMapFields}
                    disabled={!selectedTable}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Auto-mapear
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
                          disabled={targetTableFields.length === 0}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {targetTableFields.filter(f => !f.auto).map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs">{field.name}</code>
                                    <Badge variant="outline" className="text-xs">
                                      {field.type}
                                    </Badge>
                                  </div>
                                  {!field.isOptional && (
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
                          value={mapping.transformation || 'none'}
                          onValueChange={(value) => updateFieldMapping(index, { transformation: value === 'none' ? '' : value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Ninguna" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSFORMATION_TYPES.map((transform) => (
                              <SelectItem key={transform.value} value={transform.value}>
                                <div className="flex items-center gap-2">
                                  {transform.value !== 'none' && <Wand2 className="w-3 h-3 text-muted-foreground" />}
                                  <span>{transform.label}</span>
                                </div>
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
              {fieldMappings.length > 0 && (parsedSample || testData?.requestPayload) && (
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
                                parsedSample || testData.requestPayload
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

          {/* Instrucciones si no hay tabla seleccionada */}
          {!selectedTable && (
            <div className="text-center py-8 bg-muted/20 border-2 border-dashed rounded-lg">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h4 className="font-medium mb-1">Sin datos para mapear</h4>
              <p className="text-sm text-muted-foreground">
                Ve a la pestaña "Tester" para seleccionar una tabla y generar datos de prueba.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 