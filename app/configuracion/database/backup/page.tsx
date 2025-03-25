"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { HardDrive, Clock, Download, Upload, Trash2, Plus, Info, AlertTriangle, DownloadCloud, ArrowDownToLine, CheckCircle2 } from "lucide-react"
import { useDatabase, DatabaseType } from "@/contexts/database-context"

// Tipos para respaldos
interface Backup {
  id: string
  name: string
  date: string
  size: string
  type: 'auto' | 'manual'
  format: 'json' | 'sql'
}

export default function DatabaseBackupPage() {
  const { toast } = useToast()
  const { databaseType, isConnected, schema } = useDatabase()

  // Estado para la página
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [backupTab, setBackupTab] = useState<string>("auto")

  // Datos simulados de respaldos
  const backups: Backup[] = [
    {
      id: '1',
      name: 'Respaldo automático diario',
      date: '2023-03-24 00:00:00',
      size: '2.3 MB',
      type: 'auto',
      format: 'json'
    },
    {
      id: '2',
      name: 'Respaldo manual pre-actualización',
      date: '2023-03-22 15:30:45',
      size: '2.1 MB',
      type: 'manual',
      format: 'json'
    },
    {
      id: '3',
      name: 'Respaldo automático semanal',
      date: '2023-03-21 00:00:00',
      size: '2.0 MB',
      type: 'auto',
      format: 'json'
    },
    {
      id: '4',
      name: 'Respaldo manual completo',
      date: '2023-03-18 12:15:30',
      size: '1.9 MB',
      type: 'manual',
      format: 'sql'
    },
  ]

  // Filtrar respaldos por tipo
  const filteredBackups = backups.filter(backup => 
    backupTab === 'all' || backup.type === backupTab
  )

  // Crear respaldo
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    
    try {
      // Simulación de creación de respaldo
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: "Respaldo creado",
        description: "El respaldo de la base de datos se ha creado correctamente",
      })
    } catch (error) {
      console.error("Error al crear respaldo:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al crear el respaldo",
        variant: "destructive",
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  // Restaurar respaldo
  const handleRestoreBackup = async (backupId: string) => {
    if (!backupId) return
    
    setIsRestoring(true)
    setSelectedBackup(backupId)
    
    try {
      // Simulación de restauración
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Respaldo restaurado",
        description: "El respaldo se ha restaurado correctamente en la base de datos",
      })
    } catch (error) {
      console.error("Error al restaurar respaldo:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al restaurar el respaldo",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
      setSelectedBackup(null)
    }
  }

  // Descargar respaldo
  const handleDownloadBackup = (backupId: string) => {
    toast({
      title: "Descargando respaldo",
      description: "El respaldo se está descargando",
    })
  }

  // Eliminar respaldo
  const handleDeleteBackup = (backupId: string) => {
    toast({
      title: "Respaldo eliminado",
      description: "El respaldo se ha eliminado correctamente",
    })
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
        <HardDrive className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Respaldos de Base de Datos</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Respaldos disponibles</CardTitle>
              <CardDescription>
                Gestiona los respaldos de tu base de datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="auto" value={backupTab} onValueChange={setBackupTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="auto">Automáticos</TabsTrigger>
                  <TabsTrigger value="manual">Manuales</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="m-0">
                  <BackupList 
                    backups={filteredBackups}
                    isRestoring={isRestoring}
                    selectedBackup={selectedBackup}
                    onRestore={handleRestoreBackup}
                    onDownload={handleDownloadBackup}
                    onDelete={handleDeleteBackup}
                  />
                </TabsContent>
                
                <TabsContent value="auto" className="m-0">
                  <BackupList 
                    backups={filteredBackups}
                    isRestoring={isRestoring}
                    selectedBackup={selectedBackup}
                    onRestore={handleRestoreBackup}
                    onDownload={handleDownloadBackup}
                    onDelete={handleDeleteBackup}
                  />
                </TabsContent>
                
                <TabsContent value="manual" className="m-0">
                  <BackupList 
                    backups={filteredBackups}
                    isRestoring={isRestoring}
                    selectedBackup={selectedBackup}
                    onRestore={handleRestoreBackup}
                    onDownload={handleDownloadBackup}
                    onDelete={handleDeleteBackup}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                {filteredBackups.length} respaldos disponibles
              </div>
              <Button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="flex items-center"
              >
                {isCreatingBackup ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    <span>Creando respaldo...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Crear respaldo manual</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Configuración de respaldos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <DownloadCloud className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Respaldos automáticos</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Respaldo diario</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">Activo</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Respaldo semanal</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">Activo</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Respaldo mensual</span>
                        <Badge variant="outline" className="bg-gray-100">Inactivo</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <ArrowDownToLine className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Formatos disponibles</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {databaseType === DatabaseType.LOCAL ? (
                        <Badge className="justify-center bg-blue-50 text-blue-700 hover:bg-blue-100">JSON</Badge>
                      ) : (
                        <>
                          <Badge className="justify-center bg-blue-50 text-blue-700 hover:bg-blue-100">JSON</Badge>
                          <Badge className="justify-center bg-purple-50 text-purple-700 hover:bg-purple-100">SQL</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Política de retención</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Se conservan los últimos 7 respaldos diarios y 4 semanales.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50">
              <Button variant="outline" className="w-full">
                Configurar respaldos
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Opciones avanzadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  <span>Importar respaldo externo</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  <span>Exportar esquema</span>
                </Button>
                <Alert className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs">
                    La restauración de respaldos en modo {databaseType} requiere reiniciar la aplicación.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Componente para la lista de respaldos
function BackupList({ 
  backups, 
  isRestoring, 
  selectedBackup, 
  onRestore, 
  onDownload, 
  onDelete 
}: { 
  backups: Backup[]
  isRestoring: boolean
  selectedBackup: string | null
  onRestore: (id: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (backups.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No hay respaldos disponibles en esta categoría</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Tamaño</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {backups.map((backup) => (
          <TableRow key={backup.id}>
            <TableCell className="font-medium">{backup.name}</TableCell>
            <TableCell>{new Date(backup.date).toLocaleString()}</TableCell>
            <TableCell>
              {backup.type === 'auto' ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Automático
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  Manual
                </Badge>
              )}
            </TableCell>
            <TableCell>{backup.size}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDownload(backup.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onRestore(backup.id)}
                  disabled={isRestoring}
                  className={isRestoring && selectedBackup === backup.id ? "animate-pulse" : ""}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDelete(backup.id)}
                  disabled={isRestoring}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
} 