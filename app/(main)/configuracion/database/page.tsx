"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, Database, HardDrive, Info, Server, ShieldAlert, Power, Eye, Code, FileCode } from "lucide-react"
import { useDatabase, DatabaseType } from "@/contexts/database-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { ContextExplorer } from "@/components/context-explorer"

export default function DatabaseConfigPage() {
  const { toast } = useToast()
  const {
    databaseType,
    isConfigured,
    isConnected,
    schemaId,
    schema,
    setDatabaseType,
    configureSupabase,
    testConnection,
    createSchema,
    deleteSchema,
    importLocalData,
    verifyDataIntegrity,
  } = useDatabase()

  const [activeTab, setActiveTab] = useState<string>(databaseType)
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [schemaPrefix, setSchemaPrefix] = useState("tenant_")
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isCreatingSchema, setIsCreatingSchema] = useState(false)
  const [isDeletingSchema, setIsDeletingSchema] = useState(false)
  const [showCreationSuccess, setShowCreationSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<'config' | 'schema' | 'context'>('config')
  const [connectionEnabled, setConnectionEnabled] = useState(isConnected)

  // Cargar datos guardados al iniciar
  useEffect(() => {
    setActiveTab(databaseType)
    setConnectionEnabled(isConnected)
  }, [databaseType, isConnected])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setDatabaseType(value as DatabaseType)
  }

  const handleTestConnection = async () => {
    if (databaseType === DatabaseType.SUPABASE && (!supabaseUrl || !supabaseKey)) {
      toast({
        title: "Datos incompletos",
        description: "Por favor, completa la URL y la clave de API de Supabase",
        variant: "destructive",
      })
      return
    }

    setIsTestingConnection(true)

    try {
      if (databaseType === DatabaseType.SUPABASE) {
        await configureSupabase({
          url: supabaseUrl,
          apiKey: supabaseKey,
          schemaPrefix,
          schemaId: schemaId || "",
        })
      }

      const success = await testConnection()

      if (success) {
        toast({
          title: "Conexión exitosa",
          description: "La conexión a la base de datos ha sido establecida correctamente",
        })
      } else {
        toast({
          title: "Error de conexión",
          description: "No se ha podido establecer la conexión con la base de datos",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al probar conexión:", error)
      toast({
        title: "Error de conexión",
        description: "Ha ocurrido un error al intentar conectar con la base de datos",
        variant: "destructive",
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleToggleConnection = async () => {
    if (connectionEnabled) {
      // Desactivar conexión
      setConnectionEnabled(false)
      toast({
        title: "Conexión desactivada",
        description: "Se ha desactivado la conexión a la base de datos externa. Se usará almacenamiento local."
      })
    } else {
      // Activar conexión (probar conexión primero)
      const success = await testConnection()
      if (success) {
        setConnectionEnabled(true)
        toast({
          title: "Conexión activada",
          description: "Se ha activado la conexión a la base de datos externa."
        })
      } else {
        toast({
          title: "Error al activar",
          description: "No se pudo establecer conexión con la base de datos externa.",
          variant: "destructive"
        })
      }
    }
  }

  const handleCreateSchema = async () => {
    setIsCreatingSchema(true)
    setShowCreationSuccess(false)

    try {
      const newSchemaId = await createSchema()

      if (newSchemaId) {
        toast({
          title: "Esquema creado",
          description: `Se ha creado el esquema ${newSchemaId} correctamente`,
        })
        setShowCreationSuccess(true)
      } else {
        toast({
          title: "Error al crear esquema",
          description: "No se ha podido crear el esquema en la base de datos",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al crear esquema:", error)
      toast({
        title: "Error al crear esquema",
        description: "Ha ocurrido un error al intentar crear el esquema en la base de datos",
        variant: "destructive",
      })
    } finally {
      setIsCreatingSchema(false)
    }
  }

  const handleDeleteSchema = async () => {
    // Confirmar eliminación
    if (!confirm("¿Estás seguro de que deseas eliminar el esquema actual? Esta acción no se puede deshacer.")) {
      return
    }

    setIsDeletingSchema(true)

    try {
      const success = await deleteSchema()

      if (success) {
        toast({
          title: "Esquema eliminado",
          description: "El esquema ha sido eliminado correctamente",
        })
        setShowCreationSuccess(false)
      } else {
        toast({
          title: "Error al eliminar esquema",
          description: "No se ha podido eliminar el esquema",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar esquema:", error)
      toast({
        title: "Error al eliminar esquema",
        description: "Ha ocurrido un error al intentar eliminar el esquema",
        variant: "destructive",
      })
    } finally {
      setIsDeletingSchema(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Database className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Configuración de Base de Datos</h1>
      </div>

      <div className="mb-6">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center">
              <Server className="w-4 h-4 mr-2" />
              <span>Configuración</span>
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center">
              <Database className="w-4 h-4 mr-2" />
              <span>Esquema DB</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="flex items-center">
              <FileCode className="w-4 h-4 mr-2" />
              <span>Contextos</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'config' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 xl:grid-cols-4">
          <div className="lg:col-span-2 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Proveedor de datos</CardTitle>
                <CardDescription>
                  Selecciona cómo quieres almacenar los datos de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value={DatabaseType.LOCAL} className="flex items-center">
                      <HardDrive className="w-4 h-4 mr-2" />
                      <span>Almacenamiento Local</span>
                    </TabsTrigger>
                    <TabsTrigger value={DatabaseType.SUPABASE} className="flex items-center">
                      <Server className="w-4 h-4 mr-2" />
                      <span>Supabase PostgreSQL</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={DatabaseType.LOCAL} className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4 bg-blue-50 p-4 rounded-md">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-blue-700">Información</h3>
                          <p className="text-blue-700 text-sm">
                            El almacenamiento local guarda los datos en el navegador. Es ideal para desarrollo y pruebas,
                            pero no es recomendable para entornos de producción.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 border rounded-md bg-green-50">
                        <div className="flex items-center space-x-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Conectado y listo para usar</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value={DatabaseType.SUPABASE} className="mt-6">
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4 bg-blue-50 p-4 rounded-md">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-blue-700">Información</h3>
                          <p className="text-blue-700 text-sm">
                            Supabase proporciona una base de datos PostgreSQL gestionada en la nube. Es ideal para entornos
                            de producción y permite sincronización en tiempo real.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="supabase-url">URL de Supabase</Label>
                            <Input
                              id="supabase-url"
                              placeholder="https://tu-proyecto.supabase.co"
                              value={supabaseUrl}
                              onChange={(e) => setSupabaseUrl(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="supabase-key">Clave de API</Label>
                            <Input
                              id="supabase-key"
                              type="password"
                              placeholder="tu-clave-api-supabase"
                              value={supabaseKey}
                              onChange={(e) => setSupabaseKey(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="schema-prefix">Prefijo de esquema</Label>
                          <Input
                            id="schema-prefix"
                            placeholder="tenant_"
                            value={schemaPrefix}
                            onChange={(e) => setSchemaPrefix(e.target.value)}
                          />
                          <p className="text-sm text-gray-500">
                            Este prefijo se utilizará para crear esquemas en la base de datos. El valor predeterminado es
                            &quot;tenant_&quot;.
                          </p>
                        </div>

                        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                          <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={isTestingConnection}
                            className="w-full sm:w-auto"
                          >
                            {isTestingConnection ? "Probando conexión..." : "Probar conexión"}
                          </Button>

                          {isConnected && (
                            <>
                              <Button
                                variant="default"
                                onClick={handleCreateSchema}
                                disabled={isCreatingSchema || !connectionEnabled}
                                className="w-full sm:w-auto"
                              >
                                {isCreatingSchema ? "Creando esquema..." : "Crear nuevo esquema"}
                              </Button>
                              
                              {schemaId && (
                                <Button
                                  variant="destructive"
                                  onClick={handleDeleteSchema}
                                  disabled={isDeletingSchema || !connectionEnabled}
                                  className="w-full sm:w-auto"
                                >
                                  {isDeletingSchema ? "Eliminando..." : "Eliminar esquema"}
                                </Button>
                              )}
                            </>
                          )}
                        </div>

                        {isConnected && (
                          <div className="p-4 border rounded-md bg-green-50 flex justify-between items-center">
                            <div className="flex items-center space-x-2 text-green-700">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-medium">Conectado a Supabase</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="connection-switch" className="text-sm font-medium cursor-pointer">
                                {connectionEnabled ? "Conexión activa" : "Conexión inactiva"}
                              </Label>
                              <Switch 
                                id="connection-switch" 
                                checked={connectionEnabled} 
                                onCheckedChange={handleToggleConnection}
                              />
                            </div>
                          </div>
                        )}

                        {schemaId && (
                          <Alert>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              <AlertTitle>Esquema Activo</AlertTitle>
                            </div>
                            <AlertDescription className="mt-2">
                              Estás utilizando el esquema <span className="font-mono font-bold">{schemaId}</span>
                            </AlertDescription>
                          </Alert>
                        )}

                        {showCreationSuccess && (
                          <Alert className="bg-green-50 border-green-200 text-green-800">
                            <AlertTitle className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Esquema creado correctamente</span>
                            </AlertTitle>
                            <AlertDescription className="mt-2">
                              Se ha creado y configurado el esquema{" "}
                              <span className="font-mono font-bold">{schemaId}</span> en la base de datos. La aplicación
                              utilizará este esquema para todas las operaciones de datos.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => importLocalData()}
                            disabled={!isConnected || !connectionEnabled || !schemaId}
                            className="w-full sm:w-auto"
                          >
                            Importar datos locales
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => {
                              verifyDataIntegrity().then(result => {
                                if (result.isValid) {
                                  toast({
                                    title: "Integridad verificada",
                                    description: "No se encontraron problemas en los datos"
                                  })
                                } else {
                                  toast({
                                    title: "Problemas detectados",
                                    description: `Se encontraron ${result.issues.length} problemas`,
                                    variant: "destructive"
                                  })
                                }
                              })
                            }}
                            disabled={!isConnected || !connectionEnabled}
                            className="w-full sm:w-auto"
                          >
                            Verificar integridad
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Estado del sistema</CardTitle>
                <CardDescription>Información sobre la configuración actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Tipo de almacenamiento</span>
                    <span className="text-sm">{databaseType === "local" ? "Local" : "Supabase"}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Estado de conexión</span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isConnected
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isConnected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Conexión activa</span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        connectionEnabled
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {connectionEnabled ? "Activada" : "Desactivada"}
                    </span>
                  </div>

                  {databaseType === DatabaseType.SUPABASE && (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-sm font-medium">Configurado</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            isConfigured
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {isConfigured ? "Sí" : "No"}
                        </span>
                      </div>

                      {schemaId && (
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-sm font-medium">Esquema</span>
                          <span className="text-sm font-mono">{schemaId}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-start space-x-2 pt-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      {databaseType === DatabaseType.LOCAL
                        ? "Los datos se guardan localmente y se perderán si borras el caché del navegador."
                        : "Nunca compartas tus credenciales de Supabase con terceros."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {viewMode === 'schema' && schema && (
        <Card>
          <CardHeader>
            <CardTitle>Esquema de Base de Datos</CardTitle>
            <CardDescription>
              Visualización de las tablas y relaciones definidas en el esquema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 border rounded bg-slate-50">
                <h3 className="text-lg font-medium mb-2">Información general</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Versión:</div>
                  <div className="font-medium">{schema.version}</div>
                  <div>Última actualización:</div>
                  <div className="font-medium">{new Date(schema.lastUpdated).toLocaleString()}</div>
                  <div>Número de tablas:</div>
                  <div className="font-medium">{schema.tables.length}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tablas</h3>
                
                {schema.tables.map((table) => (
                  <div key={table.name} className="border rounded p-4">
                    <h4 className="text-md font-bold mb-2">{table.name}</h4>
                    {table.description && <p className="text-sm text-gray-600 mb-4">{table.description}</p>}
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Columna</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atributos</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {table.columns.map((column) => (
                            <tr key={column.name}>
                              <td className="py-2 px-3 text-sm">
                                <span className="font-mono">
                                  {column.isPrimaryKey && '🔑 '}
                                  {column.isForeignKey && '🔗 '}
                                  {column.name}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-sm font-mono">{column.type}</td>
                              <td className="py-2 px-3 text-sm">
                                {column.isPrimaryKey && <span className="bg-blue-100 text-blue-800 text-xs py-1 px-2 rounded mr-1">PK</span>}
                                {column.isForeignKey && <span className="bg-purple-100 text-purple-800 text-xs py-1 px-2 rounded mr-1">FK</span>}
                                {column.nullable ? 
                                  <span className="bg-gray-100 text-gray-800 text-xs py-1 px-2 rounded">NULL</span> : 
                                  <span className="bg-red-100 text-red-800 text-xs py-1 px-2 rounded">NOT NULL</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {table.relationships && table.relationships.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-semibold mb-2">Relaciones:</h5>
                        <ul className="text-sm space-y-1">
                          {table.relationships.map((rel) => (
                            <li key={rel.name} className="text-gray-700">
                              <span className="font-medium">{rel.name}:</span> {rel.fromColumn} → {rel.toTable}.{rel.toColumn} ({rel.type})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {viewMode === 'context' && (
        <Card>
          <CardHeader>
            <CardTitle>Contextos de la Aplicación</CardTitle>
            <CardDescription>
              Explorador de archivos de contexto que gestionan los datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>Información de contextos</span>
                </AlertTitle>
                <AlertDescription className="mt-2">
                  Los contextos son los componentes que gestionan el estado y la lógica de datos en la aplicación. 
                  Esta sección permite explorar cómo están estructurados para entender mejor la arquitectura de datos.
                </AlertDescription>
              </Alert>
              
              <ContextExplorer />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 