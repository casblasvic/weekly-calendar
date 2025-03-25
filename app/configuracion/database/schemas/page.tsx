"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Info, AlertTriangle, Database, Workflow, Key, Link2, ArrowRight, Eye, RefreshCw } from "lucide-react"
import { useDatabase, DatabaseType, SchemaTable, SchemaColumn, SchemaRelationship } from "@/contexts/database-context"

export default function DatabaseSchemasPage() {
  const { toast } = useToast()
  const {
    databaseType,
    isConnected,
    isConfigured,
    schemaId,
    schema,
    fetchSchema,
  } = useDatabase()

  const [isLoading, setIsLoading] = useState(false)
  const [activeTableIndex, setActiveTableIndex] = useState(0)

  // Cargar esquema
  useEffect(() => {
    if (isConnected && isConfigured) {
      refreshSchema()
    }
  }, [isConnected, isConfigured])

  const refreshSchema = async () => {
    setIsLoading(true)
    try {
      await fetchSchema()
      toast({
        title: "Esquema actualizado",
        description: "El esquema de la base de datos se ha actualizado correctamente"
      })
    } catch (error) {
      console.error("Error al obtener esquema:", error)
      toast({
        title: "Error",
        description: "No se ha podido obtener el esquema de la base de datos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected || !isConfigured) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin conexión</AlertTitle>
          <AlertDescription>
            No hay una conexión activa a la base de datos. Por favor, configura la conexión primero.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Esquemas de base de datos</CardTitle>
            <CardDescription>
              Visualiza y gestiona la estructura de la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <Button variant="outline" onClick={() => window.location.href = "/configuracion/database"}>
                Ir a configuración de conexión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Workflow className="w-8 h-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Esquemas de Base de Datos</h1>
        </div>
        <Button
          variant="outline"
          onClick={refreshSchema}
          disabled={isLoading}
          className="flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          <span>{isLoading ? "Actualizando..." : "Actualizar esquema"}</span>
        </Button>
      </div>

      {/* Información del esquema */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2 text-primary" />
            {databaseType === DatabaseType.LOCAL ? (
              <span>Esquema Local</span>
            ) : (
              <span>Esquema en Supabase</span>
            )}
          </CardTitle>
          <CardDescription>
            {databaseType === DatabaseType.LOCAL
              ? "Los datos se almacenan localmente en archivos JSON"
              : `ID del esquema: ${schemaId || "No disponible"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4 bg-blue-50 p-4 rounded-md">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-700">Información</h3>
              <p className="text-blue-700 text-sm">
                {databaseType === DatabaseType.LOCAL
                  ? "El esquema local es una simulación y los datos se almacenan en archivos JSON en el cliente."
                  : "Este esquema muestra la estructura de la base de datos en Supabase. Los cambios en el esquema requieren migración de datos."}
              </p>
            </div>
          </div>

          {schema && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Información del esquema</h3>
                  <p className="text-sm text-gray-500">
                    Versión: {schema.version} | Última actualización: {new Date(schema.lastUpdated).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="px-2 py-1">
                  {schema.tables.length} tablas
                </Badge>
              </div>

              {/* Visualización del esquema */}
              <div className="border rounded-md overflow-hidden">
                <Tabs
                  defaultValue="tables"
                  className="w-full"
                >
                  <TabsList className="w-full bg-muted/50 p-0 h-12">
                    <TabsTrigger
                      value="tables"
                      className="flex-1 h-full data-[state=active]:bg-background rounded-none"
                    >
                      Tablas
                    </TabsTrigger>
                    <TabsTrigger
                      value="relationships"
                      className="flex-1 h-full data-[state=active]:bg-background rounded-none"
                    >
                      Relaciones
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tables" className="m-0">
                    <div className="flex">
                      {/* Lista de tablas */}
                      <div className="w-1/4 border-r h-[600px] overflow-y-auto">
                        <div className="py-2 px-3 bg-muted/30 border-b font-medium">
                          Tablas ({schema.tables.length})
                        </div>
                        <div>
                          {schema.tables.map((table, index) => (
                            <button
                              key={table.name}
                              className={`w-full text-left py-2 px-3 hover:bg-muted/30 flex items-center justify-between ${
                                index === activeTableIndex ? "bg-primary/10 text-primary font-medium" : ""
                              }`}
                              onClick={() => setActiveTableIndex(index)}
                            >
                              <span>{table.name}</span>
                              <Eye className="w-4 h-4 opacity-50" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detalles de la tabla */}
                      <div className="w-3/4 p-4 h-[600px] overflow-y-auto">
                        {schema.tables[activeTableIndex] && (
                          <div>
                            <div className="mb-4">
                              <h3 className="text-xl font-medium">{schema.tables[activeTableIndex].name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {schema.tables[activeTableIndex].description || "Sin descripción"}
                              </p>
                            </div>

                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Columna</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Nullable</TableHead>
                                  <TableHead className="text-right">Propiedades</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {schema.tables[activeTableIndex].columns.map((column) => (
                                  <TableRow key={column.name}>
                                    <TableCell className="font-medium">{column.name}</TableCell>
                                    <TableCell>
                                      <code className="px-1 py-0.5 bg-muted rounded text-xs">
                                        {column.type}
                                      </code>
                                    </TableCell>
                                    <TableCell>
                                      {column.nullable ? (
                                        <Badge variant="outline" className="bg-yellow-50">
                                          Nullable
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-blue-50">
                                          Not Null
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                        {column.isPrimaryKey && (
                                          <Badge className="bg-primary/10 text-primary border-primary/20">
                                            <Key className="w-3 h-3 mr-1" />
                                            PK
                                          </Badge>
                                        )}
                                        {column.isForeignKey && (
                                          <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                                            <Link2 className="w-3 h-3 mr-1" />
                                            FK
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="relationships" className="m-0">
                    {/* Vista de relaciones */}
                    <div className="p-4 h-[600px] overflow-y-auto">
                      <div className="space-y-6">
                        {schema.tables
                          .filter((table) => table.relationships && table.relationships.length > 0)
                          .map((table) => (
                            <div key={table.name} className="border rounded-md p-4">
                              <h3 className="text-lg font-medium mb-4">{table.name}</h3>
                              <div className="space-y-3">
                                {table.relationships?.map((rel) => (
                                  <div key={rel.name} className="flex items-center p-2 bg-muted/30 rounded-md">
                                    <div className="flex-1">
                                      <p className="font-medium">{table.name}.{rel.fromColumn}</p>
                                      <p className="text-xs text-gray-500">{rel.name}</p>
                                    </div>
                                    <div className="mx-4 flex items-center">
                                      <Badge variant="outline" className="px-2">
                                        {rel.type}
                                      </Badge>
                                      <ArrowRight className="mx-2 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium">{rel.toTable}.{rel.toColumn}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                        {schema.tables.filter((table) => table.relationships && table.relationships.length > 0).length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <p>No hay relaciones definidas en el esquema</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 