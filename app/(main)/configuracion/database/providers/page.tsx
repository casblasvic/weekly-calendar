"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle, Info, Server, HardDrive, Database, Link, Bookmark, Settings, Code, Shield } from "lucide-react"
import { useDatabase, DatabaseType, SupabaseConfig } from "@/contexts/database-context"

export default function DatabaseProvidersPage() {
  const { toast } = useToast()
  const {
    databaseType,
    isConfigured,
    isConnected,
    schemaId,
    configureSupabase,
    testConnection,
  } = useDatabase()

  // Estado para Supabase
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [supabaseKeyMasked, setSupabaseKeyMasked] = useState(true)
  const [schemaPrefix, setSchemaPrefix] = useState("tenant_")
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [supabaseClientKey, setSupabaseClientKey] = useState("")
  const [supabaseClientKeyMasked, setSupabaseClientKeyMasked] = useState(true)

  // Al cargar, si hay configuración previa
  useEffect(() => {
    if (isConfigured && databaseType === DatabaseType.SUPABASE) {
      // En una implementación real, obtendríamos los datos guardados
      // Por ahora simulamos que hay datos guardados
      setSupabaseUrl("https://example.supabase.co")
      // Las claves reales no se muestran por seguridad
      setSupabaseKey("••••••••••••••••••••••")
      setSupabaseClientKey("••••••••••••••••••••••")
    }
  }, [isConfigured, databaseType])

  const handleTestSupabaseConnection = async () => {
    if (!supabaseUrl || (!supabaseKey && supabaseKeyMasked)) {
      toast({
        title: "Datos incompletos",
        description: "Por favor, completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsTestingConnection(true)

    try {
      // Si la clave está enmascarada, usar una clave temporal para la prueba
      const apiKey = supabaseKeyMasked ? "KEY_PLACEHOLDER" : supabaseKey

      const configResult = await configureSupabase({
        url: supabaseUrl,
        apiKey,
        schemaPrefix,
        schemaId: schemaId || ""
      })

      if (configResult) {
        toast({
          title: "Conexión exitosa",
          description: "La conexión a Supabase se ha configurado correctamente",
        })
      } else {
        toast({
          title: "Error de conexión",
          description: "No se ha podido establecer la conexión con Supabase",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al configurar Supabase:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al configurar la conexión a Supabase",
        variant: "destructive",
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSaveSupabaseConfig = async () => {
    if (!supabaseUrl || (!supabaseKey && supabaseKeyMasked)) {
      toast({
        title: "Datos incompletos",
        description: "Por favor, completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      // Si la clave está enmascarada, usar una clave temporal para guardar la configuración
      const apiKey = supabaseKeyMasked ? "KEY_PLACEHOLDER" : supabaseKey

      await configureSupabase({
        url: supabaseUrl,
        apiKey,
        schemaPrefix,
        schemaId: schemaId || ""
      })

      toast({
        title: "Configuración guardada",
        description: "La configuración de Supabase se ha guardado correctamente",
      })

      // Enmascarar la clave después de guardar
      if (!supabaseKeyMasked) {
        setSupabaseKeyMasked(true)
        setSupabaseKey("••••••••••••••••••••••")
      }
      
      if (!supabaseClientKeyMasked) {
        setSupabaseClientKeyMasked(true)
        setSupabaseClientKey("••••••••••••••••••••••")
      }
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al guardar la configuración",
        variant: "destructive",
      })
    }
  }

  const toggleSupabaseKeyVisibility = () => {
    if (supabaseKeyMasked) {
      // En una implementación real, obtendríamos la clave real desde un almacén seguro
      setSupabaseKey("")
      setSupabaseKeyMasked(false)
    } else {
      setSupabaseKey("••••••••••••••••••••••")
      setSupabaseKeyMasked(true)
    }
  }

  const toggleClientKeyVisibility = () => {
    if (supabaseClientKeyMasked) {
      // En una implementación real, obtendríamos la clave real desde un almacén seguro
      setSupabaseClientKey("")
      setSupabaseClientKeyMasked(false)
    } else {
      setSupabaseClientKey("••••••••••••••••••••••")
      setSupabaseClientKeyMasked(true)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Database className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Proveedores de Base de Datos</h1>
      </div>

      <div className="space-y-8">
        {/* Supabase */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-emerald-100 to-emerald-50">
            <div className="flex items-center">
              <img 
                src="https://supabase.com/dashboard/img/supabase-logo.svg"
                alt="Supabase"
                className="h-8 w-8 mr-2"
              />
              <div>
                <CardTitle>Supabase</CardTitle>
                <CardDescription>
                  Plataforma de bases de datos PostgreSQL en la nube
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
                <Info className="h-4 w-4" />
                <AlertTitle>Acerca de Supabase</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Supabase es una alternativa de código abierto a Firebase. Proporciona una base de datos PostgreSQL
                  completamente gestionada con autenticación, almacenamiento y funciones en tiempo real.
                </AlertDescription>
              </Alert>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="supabase-url">URL de Supabase <span className="text-red-500">*</span></Label>
                  <Input
                    id="supabase-url"
                    placeholder="https://tu-proyecto.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    La URL de tu proyecto en Supabase
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supabase-key">Clave de API (server) <span className="text-red-500">*</span></Label>
                  <div className="flex">
                    <Input
                      id="supabase-key"
                      type={supabaseKeyMasked ? "password" : "text"}
                      placeholder="Clave de API de Supabase"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="flex-1 rounded-r-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleSupabaseKeyVisibility}
                      className="rounded-l-none border-l-0"
                    >
                      {supabaseKeyMasked ? "Mostrar" : "Ocultar"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    La clave secreta de servicio (service_role key)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supabase-client-key">Clave de API (cliente)</Label>
                  <div className="flex">
                    <Input
                      id="supabase-client-key"
                      type={supabaseClientKeyMasked ? "password" : "text"}
                      placeholder="Clave de API cliente de Supabase"
                      value={supabaseClientKey}
                      onChange={(e) => setSupabaseClientKey(e.target.value)}
                      className="flex-1 rounded-r-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleClientKeyVisibility}
                      className="rounded-l-none border-l-0"
                    >
                      {supabaseClientKeyMasked ? "Mostrar" : "Ocultar"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    La clave anónima para uso en el cliente (optional)
                  </p>
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
                    Prefijo para los esquemas en la base de datos
                  </p>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="config-details">
                  <AccordionTrigger>
                    <div className="flex items-center text-sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Configuración avanzada
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="pooling">Tamaño del pool de conexiones</Label>
                        <Input id="pooling" type="number" defaultValue="10" />
                        <p className="text-xs text-gray-500">
                          Número máximo de conexiones a mantener en el pool
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="timeout">Timeout de consulta (ms)</Label>
                        <Input id="timeout" type="number" defaultValue="30000" />
                        <p className="text-xs text-gray-500">
                          Tiempo máximo de espera para las consultas
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security-options">
                  <AccordionTrigger>
                    <div className="flex items-center text-sm">
                      <Shield className="w-4 h-4 mr-2" />
                      Opciones de seguridad
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="encrypt-data"
                          className="rounded border-gray-300"
                          defaultChecked
                        />
                        <Label htmlFor="encrypt-data">Cifrar datos sensibles</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="use-ssl"
                          className="rounded border-gray-300"
                          defaultChecked
                        />
                        <Label htmlFor="use-ssl">Usar conexión SSL</Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="help-resources">
                  <AccordionTrigger>
                    <div className="flex items-center text-sm">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Recursos de ayuda
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Link className="w-4 h-4" />
                        <a
                          href="https://supabase.com/docs"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Documentación oficial de Supabase
                        </a>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Bookmark className="w-4 h-4" />
                        <a
                          href="https://supabase.com/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Panel de control de Supabase
                        </a>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Code className="w-4 h-4" />
                        <a
                          href="https://github.com/supabase/supabase"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          GitHub de Supabase
                        </a>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between bg-gray-50 border-t">
            <Button
              variant="outline"
              onClick={handleTestSupabaseConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? "Probando conexión..." : "Probar conexión"}
            </Button>
            <Button onClick={handleSaveSupabaseConfig}>
              Guardar configuración
            </Button>
          </CardFooter>
        </Card>

        {/* Almacenamiento Local */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50">
            <div className="flex items-center">
              <HardDrive className="w-5 h-5 mr-2 text-blue-700" />
              <div>
                <CardTitle>Almacenamiento Local</CardTitle>
                <CardDescription>
                  Almacenamiento de datos en archivos locales
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <Info className="h-4 w-4" />
                <AlertTitle>Almacenamiento predeterminado</AlertTitle>
                <AlertDescription className="text-blue-700">
                  El almacenamiento local es el tipo de almacenamiento predeterminado y no requiere configuración
                  adicional. Los datos se guardan en el almacenamiento local del navegador.
                </AlertDescription>
              </Alert>

              <div className="py-4 px-6 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 text-sm">
                  <Server className="w-4 h-4 text-gray-500" />
                  <span>Los datos se almacenan en:</span>
                  <code className="px-2 py-1 bg-gray-100 rounded text-xs">localStorage</code>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 border-t">
            <Button
              variant={databaseType === DatabaseType.LOCAL ? "default" : "outline"}
              onClick={() => {
                if (databaseType !== DatabaseType.LOCAL) {
                  toast({
                    title: "Configuración actualizada",
                    description: "Se ha cambiado al almacenamiento local",
                  })
                }
              }}
            >
              {databaseType === DatabaseType.LOCAL ? "Modo activo" : "Usar almacenamiento local"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 