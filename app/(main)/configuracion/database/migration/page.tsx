"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ChevronsUpDown, AlertTriangle, Info, Upload, Download, CheckCircle2, ArrowRightLeft } from "lucide-react"
import { useDatabase, DatabaseType } from "@/contexts/database-context"

export default function DatabaseMigrationPage() {
  const { toast } = useToast()
  const { databaseType, isConnected, schemaId } = useDatabase()

  const [isMigratingToSupabase, setIsMigratingToSupabase] = useState(false)
  const [isMigratingToLocal, setIsMigratingToLocal] = useState(false)
  const [progress, setProgress] = useState(0)
  const [migrationSteps, setMigrationSteps] = useState<{text: string, done: boolean}[]>([])
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [migrationSuccess, setMigrationSuccess] = useState(false)

  // Simulación de migración
  const migrateToSupabase = async () => {
    try {
      setIsMigratingToSupabase(true)
      setMigrationError(null)
      setMigrationSuccess(false)
      setProgress(0)
      
      setMigrationSteps([
        { text: "Preparando datos locales para migración", done: false },
        { text: "Verificando conexión con Supabase", done: false },
        { text: "Verificando esquema de destino", done: false },
        { text: "Migrando datos de clínicas", done: false },
        { text: "Migrando datos de clientes", done: false },
        { text: "Migrando datos de servicios", done: false },
        { text: "Migrando datos de tarifas", done: false },
        { text: "Migrando datos de agenda", done: false },
        { text: "Verificando integridad de datos", done: false }
      ])
      
      // Simulación de progreso
      for (let i = 0; i < migrationSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800))
        
        setMigrationSteps(prev => {
          const newSteps = [...prev]
          newSteps[i].done = true
          return newSteps
        })
        
        setProgress(Math.round((i + 1) / migrationSteps.length * 100))
      }
      
      // Éxito
      setMigrationSuccess(true)
      toast({
        title: "Migración completa",
        description: "Los datos se han migrado correctamente a Supabase",
      })
    } catch (error) {
      console.error("Error en la migración:", error)
      setMigrationError("Ocurrió un error durante la migración. Por favor, inténtalo de nuevo.")
      toast({
        title: "Error de migración",
        description: "No se pudieron migrar los datos a Supabase",
        variant: "destructive",
      })
    } finally {
      setIsMigratingToSupabase(false)
    }
  }
  
  const migrateToLocal = async () => {
    try {
      setIsMigratingToLocal(true)
      setMigrationError(null)
      setMigrationSuccess(false)
      setProgress(0)
      
      setMigrationSteps([
        { text: "Verificando conexión con Supabase", done: false },
        { text: "Consultando datos del esquema", done: false },
        { text: "Preparando almacenamiento local", done: false },
        { text: "Descargando datos de clínicas", done: false },
        { text: "Descargando datos de clientes", done: false },
        { text: "Descargando datos de servicios", done: false },
        { text: "Descargando datos de tarifas", done: false },
        { text: "Descargando datos de agenda", done: false },
        { text: "Verificando integridad de datos", done: false }
      ])
      
      // Simulación de progreso
      for (let i = 0; i < migrationSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800))
        
        setMigrationSteps(prev => {
          const newSteps = [...prev]
          newSteps[i].done = true
          return newSteps
        })
        
        setProgress(Math.round((i + 1) / migrationSteps.length * 100))
      }
      
      // Éxito
      setMigrationSuccess(true)
      toast({
        title: "Migración completa",
        description: "Los datos se han importado correctamente desde Supabase",
      })
    } catch (error) {
      console.error("Error en la migración:", error)
      setMigrationError("Ocurrió un error durante la importación. Por favor, inténtalo de nuevo.")
      toast({
        title: "Error de importación",
        description: "No se pudieron importar los datos desde Supabase",
        variant: "destructive",
      })
    } finally {
      setIsMigratingToLocal(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin conexión</AlertTitle>
          <AlertDescription>
            No hay una conexión activa a la base de datos. Por favor, configura la conexión primero.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <ChevronsUpDown className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Migración de Datos</h1>
      </div>

      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Información importante</AlertTitle>
        <AlertDescription className="text-blue-700">
          La migración de datos permite mover información entre el almacenamiento local y Supabase.
          Este proceso puede tardar varios minutos dependiendo de la cantidad de datos.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Migración a Supabase */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-emerald-100 to-emerald-50">
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2 text-emerald-600" />
              <span>Local a Supabase</span>
            </CardTitle>
            <CardDescription>
              Migra tus datos desde el almacenamiento local hacia Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 py-2 px-4 bg-gray-50 rounded-md">
                <span className="font-medium">Estado actual:</span>
                <span>
                  {databaseType === DatabaseType.LOCAL ? (
                    "Usando almacenamiento local"
                  ) : (
                    `Usando Supabase (Schema: ${schemaId})`
                  )}
                </span>
              </div>

              {databaseType === DatabaseType.SUPABASE && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Ya estás usando Supabase. Esta operación copiará tus datos locales a la base de datos actual.
                  </AlertDescription>
                </Alert>
              )}

              {isMigratingToSupabase && (
                <div className="space-y-4 mt-4">
                  <Progress value={progress} className="h-2 w-full" />
                  <div className="space-y-2">
                    {migrationSteps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-300" />
                        )}
                        <span className={`text-sm ${step.done ? "text-green-600" : "text-gray-500"}`}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {migrationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{migrationError}</AlertDescription>
                </Alert>
              )}

              {migrationSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Migración completada con éxito.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 border-t">
            <Button
              onClick={migrateToSupabase}
              disabled={isMigratingToSupabase || isMigratingToLocal}
              className="flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span>Migrar a Supabase</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Migración a Local */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50">
            <CardTitle className="flex items-center">
              <Download className="w-5 h-5 mr-2 text-blue-600" />
              <span>Supabase a Local</span>
            </CardTitle>
            <CardDescription>
              Importa tus datos desde Supabase hacia el almacenamiento local
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 py-2 px-4 bg-gray-50 rounded-md">
                <span className="font-medium">Estado actual:</span>
                <span>
                  {databaseType === DatabaseType.LOCAL ? (
                    "Usando almacenamiento local"
                  ) : (
                    `Usando Supabase (Schema: ${schemaId})`
                  )}
                </span>
              </div>

              {databaseType === DatabaseType.LOCAL && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Ya estás usando almacenamiento local. Esta operación importará datos desde Supabase.
                  </AlertDescription>
                </Alert>
              )}

              {isMigratingToLocal && (
                <div className="space-y-4 mt-4">
                  <Progress value={progress} className="h-2 w-full" />
                  <div className="space-y-2">
                    {migrationSteps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-300" />
                        )}
                        <span className={`text-sm ${step.done ? "text-green-600" : "text-gray-500"}`}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {migrationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{migrationError}</AlertDescription>
                </Alert>
              )}

              {migrationSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Importación completada con éxito.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 border-t">
            <Button
              onClick={migrateToLocal}
              disabled={isMigratingToSupabase || isMigratingToLocal}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Importar desde Supabase</span>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRightLeft className="w-5 h-5 mr-2 text-primary" />
            <span>Sincronización de datos</span>
          </CardTitle>
          <CardDescription>
            Configura la sincronización automática entre almacenamiento local y Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-purple-50 border-purple-200">
            <Info className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              Esta funcionalidad estará disponible próximamente. Permitirá mantener sincronizados los datos entre
              el almacenamiento local y Supabase en tiempo real.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
} 