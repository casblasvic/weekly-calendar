"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getDataService } from "@/services/data"

// Tipos de datos para configuración de bases de datos
export enum DatabaseType {
  LOCAL = "local",
  SUPABASE = "supabase",
  // Se pueden añadir más tipos en el futuro
}

// Configuración para Supabase
export interface SupabaseConfig {
  url: string
  apiKey: string
  schemaPrefix: string
  schemaId: string
}

// Definición de una tabla en el esquema
export interface SchemaTable {
  name: string
  description?: string
  columns: SchemaColumn[]
  relationships?: SchemaRelationship[]
}

// Definición de una columna en una tabla
export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  description?: string
}

// Definición de una relación entre tablas
export interface SchemaRelationship {
  name: string
  fromColumn: string
  toTable: string
  toColumn: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
}

// Definición del esquema completo
export interface DatabaseSchema {
  tables: SchemaTable[]
  version: string
  lastUpdated: string
}

// Configuración general de base de datos
export interface DatabaseConfig {
  type: DatabaseType
  supabaseConfig?: SupabaseConfig
}

// Interfaz del contexto
interface DatabaseContextType {
  // Estado actual
  databaseType: DatabaseType
  isConfigured: boolean
  isConnected: boolean
  schemaId: string | null
  schema: DatabaseSchema | null
  
  // Acciones
  setDatabaseType: (type: DatabaseType) => void
  configureSupabase: (config: SupabaseConfig) => Promise<boolean>
  testConnection: () => Promise<boolean>
  createSchema: () => Promise<string | null>
  checkSchemaExists: (schemaId: string) => Promise<boolean>
  fetchSchema: () => Promise<DatabaseSchema | null>
  
  // Nuevas funciones
  deleteSchema: () => Promise<boolean>
  importLocalData: () => Promise<boolean>
  verifyDataIntegrity: () => Promise<{isValid: boolean, issues: string[]}>
  
  // Configuración general
  saveConfig: () => Promise<boolean>
  loadConfig: () => Promise<void>
}

// Valores por defecto
const defaultConfig: DatabaseConfig = {
  type: DatabaseType.LOCAL,
}

// Esquema predeterminado para la aplicación
const defaultSchema: DatabaseSchema = {
  tables: [
    {
      name: "clients",
      description: "Información de clientes",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "email", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "phone", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "client_number", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "clinic_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "address", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "birth_date", type: "date", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "notes", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "avatar", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "updated_at", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_clinic", 
          fromColumn: "clinic_id", 
          toTable: "clinics", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "clinics",
      description: "Clínicas o centros",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "address", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "phone", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "email", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "logo", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: []
    },
    {
      name: "appointments",
      description: "Citas programadas",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "cabin_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "start_time", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "end_time", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "service_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "notes", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_appointment", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "service_appointment", 
          fromColumn: "service_id", 
          toTable: "services", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "cabin_appointment", 
          fromColumn: "cabin_id", 
          toTable: "cabins", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "services",
      description: "Servicios ofrecidos",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "description", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "duration", type: "integer", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "price", type: "decimal", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "category", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "icon", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "color", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: []
    },
    {
      name: "service_history",
      description: "Historial de servicios realizados",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "service_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "appointment_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "performed_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "notes", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "equipment_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "parameters", type: "jsonb", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "results", type: "jsonb", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_service_history", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "service_service_history", 
          fromColumn: "service_id", 
          toTable: "services", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "appointment_service_history", 
          fromColumn: "appointment_id", 
          toTable: "appointments", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "equipment_service_history", 
          fromColumn: "equipment_id", 
          toTable: "equipment", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "equipment",
      description: "Equipamiento disponible",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "type", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "model", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "manufacturer", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "serial_number", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "purchase_date", type: "date", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "last_maintenance", type: "date", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "specifications", type: "jsonb", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "clinic_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "cabin_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "clinic_equipment", 
          fromColumn: "clinic_id", 
          toTable: "clinics", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "cabin_equipment", 
          fromColumn: "cabin_id", 
          toTable: "cabins", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "cabins",
      description: "Cabinas o salas de tratamiento",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "description", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "capacity", type: "integer", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "clinic_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "clinic_cabin", 
          fromColumn: "clinic_id", 
          toTable: "clinics", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "storage_files",
      description: "Archivos almacenados",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "file_name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "original_name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "file_path", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "url", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "mime_type", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "size", type: "integer", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "category", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "service_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "uploaded_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_file", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "service_file", 
          fromColumn: "service_id", 
          toTable: "services", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "consent_forms",
      description: "Consentimientos informados",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "service_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "form_type", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "content", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "signature", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "file_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "signed_at", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "valid_until", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_consent", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "service_consent", 
          fromColumn: "service_id", 
          toTable: "services", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "file_consent", 
          fromColumn: "file_id", 
          toTable: "storage_files", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "photos",
      description: "Fotografías de clientes",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "file_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "category", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "body_area", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "treatment_stage", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "notes", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "taken_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_photo", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "file_photo", 
          fromColumn: "file_id", 
          toTable: "storage_files", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "service_packages",
      description: "Paquetes y bonos de servicios",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "description", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "total_sessions", type: "integer", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "price", type: "decimal", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "valid_days", type: "integer", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: []
    },
    {
      name: "client_packages",
      description: "Paquetes adquiridos por clientes",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "package_id", type: "uuid", nullable: false, isPrimaryKey: false, isForeignKey: true },
        { name: "purchase_date", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "expiry_date", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "sessions_used", type: "integer", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "remaining_sessions", type: "integer", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "notes", type: "text", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_package", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        },
        { 
          name: "package_client", 
          fromColumn: "package_id", 
          toTable: "service_packages", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "notifications",
      description: "Avisos y recordatorios",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "client_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "title", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "message", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "type", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "scheduled_for", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false },
        { name: "sent_at", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "client_notification", 
          fromColumn: "client_id", 
          toTable: "clients", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    },
    {
      name: "schedule_templates",
      description: "Plantillas horarias para clínicas",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: "description", type: "text", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "schedule", type: "jsonb", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "clinic_id", type: "uuid", nullable: true, isPrimaryKey: false, isForeignKey: true },
        { name: "is_default", type: "boolean", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "created_at", type: "timestamp", nullable: false, isPrimaryKey: false, isForeignKey: false },
        { name: "updated_at", type: "timestamp", nullable: true, isPrimaryKey: false, isForeignKey: false }
      ],
      relationships: [
        { 
          name: "clinic_template", 
          fromColumn: "clinic_id", 
          toTable: "clinics", 
          toColumn: "id", 
          type: "many-to-one" 
        }
      ]
    }
  ],
  version: "1.0",
  lastUpdated: new Date().toISOString()
};

// Crear contexto
const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

// Provider del contexto
export function DatabaseProvider({ children }: { children: ReactNode }) {
  // Estado
  const [databaseType, setDatabaseType] = useState<DatabaseType>(DatabaseType.LOCAL)
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [schemaId, setSchemaId] = useState<string | null>(null)
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)

  // Cargar configuración al iniciar
  useEffect(() => {
    loadConfig()
  }, [])

  // Cambiar tipo de base de datos
  const handleSetDatabaseType = (type: DatabaseType) => {
    setDatabaseType(type)
    
    // Restablecer estado si se cambia a local
    if (type === DatabaseType.LOCAL) {
      setIsConnected(true)
      setIsConfigured(true)
      setSchema(defaultSchema)
    } else {
      // Verificar si hay configuración para el tipo seleccionado
      if (type === DatabaseType.SUPABASE && supabaseConfig) {
        setIsConfigured(true)
        // Intentar conectar automáticamente
        testConnection().then(connected => {
          setIsConnected(connected)
          if (connected) {
            fetchSchema()
          }
        })
      } else {
        setIsConfigured(false)
        setIsConnected(false)
        setSchema(null)
      }
    }
  }

  // Configurar Supabase
  const configureSupabase = async (config: SupabaseConfig): Promise<boolean> => {
    try {
      setSupabaseConfig(config)
      setIsConfigured(true)
      
      // Intentar conectar
      const connected = await testConnection()
      setIsConnected(connected)
      
      // Guardar configuración
      await saveConfig()
      
      // Si está conectado, obtener el esquema
      if (connected) {
        await fetchSchema()
      }
      
      return connected
    } catch (error) {
      console.error("Error al configurar Supabase:", error)
      return false
    }
  }

  // Probar conexión
  const testConnection = async (): Promise<boolean> => {
    try {
      // En modo local, siempre está conectado
      if (databaseType === DatabaseType.LOCAL) {
        setSchema(defaultSchema)
        return true
      }
      
      // Para Supabase, verificar que haya configuración
      if (databaseType === DatabaseType.SUPABASE && !supabaseConfig) {
        return false
      }
      
      // Aquí implementaríamos la prueba real con Supabase
      // Usando su API para verificar conexión
      
      // Por ahora simulamos una conexión exitosa
      const connected = true
      
      setIsConnected(connected)
      return connected
    } catch (error) {
      console.error("Error al probar conexión:", error)
      setIsConnected(false)
      return false
    }
  }

  // Verificar si existe el esquema
  const checkSchemaExists = async (schemaId: string): Promise<boolean> => {
    try {
      if (databaseType === DatabaseType.LOCAL) {
        return true
      }
      
      if (databaseType === DatabaseType.SUPABASE && supabaseConfig) {
        // Aquí implementaríamos la verificación real con Supabase
        // Consultando si existe el esquema con el ID proporcionado
        
        // Por ahora simulamos que existe
        return true
      }
      
      return false
    } catch (error) {
      console.error("Error al verificar esquema:", error)
      return false
    }
  }

  // Obtener el esquema de la base de datos
  const fetchSchema = async (): Promise<DatabaseSchema | null> => {
    try {
      if (databaseType === DatabaseType.LOCAL) {
        setSchema(defaultSchema)
        return defaultSchema
      }
      
      if (databaseType === DatabaseType.SUPABASE && supabaseConfig && schemaId) {
        // Aquí implementaríamos la consulta real a Supabase
        // para obtener el esquema completo
        
        // Por ahora devolvemos el esquema predeterminado
        setSchema(defaultSchema)
        return defaultSchema
      }
      
      return null
    } catch (error) {
      console.error("Error al obtener esquema:", error)
      return null
    }
  }

  // Crear un esquema nuevo
  const createSchema = async (): Promise<string | null> => {
    try {
      if (!isConnected) {
        throw new Error("No hay conexión a la base de datos")
      }
      
      if (databaseType === DatabaseType.LOCAL) {
        // En modo local, usar un ID temporal
        const tempSchemaId = `tenant_${Date.now().toString().slice(-5)}`
        setSchemaId(tempSchemaId)
        setSchema(defaultSchema)
        return tempSchemaId
      }
      
      if (databaseType === DatabaseType.SUPABASE && supabaseConfig) {
        // Generar un nuevo ID de esquema secuencial
        const newSchemaId = generateSchemaId()
        
        // Actualizar configuración
        const updatedConfig = {
          ...supabaseConfig,
          schemaId: newSchemaId
        }
        
        setSupabaseConfig(updatedConfig)
        setSchemaId(newSchemaId)
        
        // Aquí implementaríamos la creación real del esquema en Supabase
        // Creando las tablas definidas en defaultSchema con el prefijo adecuado
        
        // Establecer el esquema predeterminado
        setSchema(defaultSchema)
        
        // Guardar configuración
        await saveConfig()
        
        return newSchemaId
      }
      
      return null
    } catch (error) {
      console.error("Error al crear esquema:", error)
      return null
    }
  }

  // Generar ID de esquema
  const generateSchemaId = (): string => {
    // Formato: tenant_XXXXX donde X es un dígito
    const randomPart = Math.floor(10000 + Math.random() * 90000).toString()
    return `tenant_${randomPart}`
  }

  // Guardar configuración
  const saveConfig = async (): Promise<boolean> => {
    try {
      const config: DatabaseConfig = {
        type: databaseType,
        supabaseConfig: supabaseConfig || undefined
      }
      
      localStorage.setItem('database_config', JSON.stringify(config))
      return true
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      return false
    }
  }

  // Cargar configuración
  const loadConfig = async (): Promise<void> => {
    try {
      const storedConfig = localStorage.getItem('database_config')
      
      if (storedConfig) {
        const config: DatabaseConfig = JSON.parse(storedConfig)
        
        setDatabaseType(config.type)
        
        if (config.type === DatabaseType.SUPABASE && config.supabaseConfig) {
          setSupabaseConfig(config.supabaseConfig)
          setSchemaId(config.supabaseConfig.schemaId || null)
          setIsConfigured(true)
          
          // Comprobar conexión
          const connected = await testConnection()
          setIsConnected(connected)
          
          if (connected) {
            await fetchSchema()
          }
        } else if (config.type === DatabaseType.LOCAL) {
          setIsConfigured(true)
          setIsConnected(true)
          setSchema(defaultSchema)
        }
      } else {
        // Configuración predeterminada
        setDatabaseType(DatabaseType.LOCAL)
        setIsConfigured(true)
        setIsConnected(true)
        setSchema(defaultSchema)
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error)
      
      // Usar configuración por defecto
      setDatabaseType(DatabaseType.LOCAL)
      setIsConfigured(true)
      setIsConnected(true)
      setSchema(defaultSchema)
    }
  }

  // Eliminar esquema completo
  const deleteSchema = async (): Promise<boolean> => {
    try {
      if (!isConnected || !schemaId) {
        throw new Error("No hay conexión a la base de datos o no existe un esquema")
      }
      
      if (databaseType === DatabaseType.LOCAL) {
        // En modo local, simplemente reiniciar el esquema
        setSchemaId(null)
        return true
      }
      
      if (databaseType === DatabaseType.SUPABASE && supabaseConfig) {
        // Aquí implementaríamos la eliminación real del esquema en Supabase
        // Eliminando todas las tablas con el prefijo adecuado
        
        // Actualizar configuración
        const updatedConfig = {
          ...supabaseConfig,
          schemaId: null
        }
        
        setSupabaseConfig(updatedConfig)
        setSchemaId(null)
        
        // Guardar configuración
        await saveConfig()
        
        return true
      }
      
      return false
    } catch (error) {
      console.error("Error al eliminar esquema:", error)
      return false
    }
  }

  // Importar datos locales a la base de datos externa
  const importLocalData = async (): Promise<boolean> => {
    try {
      if (!isConnected || !schemaId) {
        throw new Error("No hay conexión a la base de datos o no existe un esquema")
      }
      
      if (databaseType === DatabaseType.LOCAL) {
        // En modo local no es necesario importar
        return true
      }
      
      if (databaseType === DatabaseType.SUPABASE && supabaseConfig) {
        // Paso 1: Obtener todos los datos locales
        // Aquí implementaríamos la obtención de todos los datos de localStorage
        
        // Paso 2: Transformar los datos al formato adecuado para Supabase
        
        // Paso 3: Insertar los datos en Supabase
        // Utilizando las APIs de Supabase para insertar datos en batch
        
        // Por ahora simulamos una importación exitosa
        console.log("Simulando importación de datos a Supabase...")
        
        return true
      }
      
      return false
    } catch (error) {
      console.error("Error al importar datos locales:", error)
      return false
    }
  }

  // Verificar integridad de los datos
  const verifyDataIntegrity = async (): Promise<{isValid: boolean, issues: string[]}> => {
    try {
      if (!isConnected) {
        throw new Error("No hay conexión a la base de datos")
      }
      
      const issues: string[] = []
      
      if (databaseType === DatabaseType.LOCAL) {
        // En modo local, verificar integridad de datos en localStorage
        // Buscar referencias rotas, datos faltantes, etc.
        
        // Por ahora simulamos una verificación
        console.log("Verificando integridad de datos locales...")
        
        return {
          isValid: true,
          issues: []
        }
      }
      
      if (databaseType === DatabaseType.SUPABASE && supabaseConfig && schemaId) {
        // Aquí implementaríamos la verificación real en Supabase
        // Usando consultas para verificar integridad referencial, etc.
        
        console.log("Verificando integridad de datos en Supabase...")
        
        return {
          isValid: true,
          issues: []
        }
      }
      
      return {
        isValid: false,
        issues: ["No se pudo verificar la integridad de datos"]
      }
    } catch (error) {
      console.error("Error al verificar integridad de datos:", error)
      return {
        isValid: false,
        issues: [`Error: ${error instanceof Error ? error.message : String(error)}`]
      }
    }
  }

  return (
    <DatabaseContext.Provider
      value={{
        databaseType,
        isConfigured,
        isConnected,
        schemaId,
        schema,
        setDatabaseType: handleSetDatabaseType,
        configureSupabase,
        testConnection,
        createSchema,
        checkSchemaExists,
        fetchSchema,
        deleteSchema,
        importLocalData,
        verifyDataIntegrity,
        saveConfig,
        loadConfig,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

// Hook para acceder al contexto
export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error("useDatabase debe usarse dentro de DatabaseProvider")
  }
  return context
} 