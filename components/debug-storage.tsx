"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Trash2, RefreshCw, Download, Upload } from "lucide-react"
import { useFiles } from '@/contexts/file-context'
import { useStorage } from '@/contexts/storage-context'
import StorageStatusCard from '@/components/storage/storage-status-card'
import StorageTypeChart from '@/components/storage/storage-type-chart'
import FilesExplorer from '@/components/storage/files-explorer'
import StorageQuotaSettings from '@/components/storage/storage-quota-settings'

export function DebugStorage({ clinicId }: { clinicId?: string }) {
  const [storageKeys, setStorageKeys] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [storageValue, setStorageValue] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("storage")
  const [isLoading, setIsLoading] = useState(false)

  const { getStorageStats, getQuota, setQuota } = useStorage()
  const { getFilesByFilter, deleteFile } = useFiles()

  const refreshStorageKeys = () => {
    setIsLoading(true)
    setTimeout(() => {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) keys.push(key)
      }
      setStorageKeys(keys.sort())
      setSelectedKey(null)
      setStorageValue("")
      setIsLoading(false)
    }, 500)
  }

  useEffect(() => {
    refreshStorageKeys()
  }, [])

  useEffect(() => {
    if (selectedKey) {
      try {
        const value = localStorage.getItem(selectedKey)
        setStorageValue(value || "")
      } catch (error) {
        console.error(`Error getting value for key ${selectedKey}:`, error)
        setStorageValue("")
      }
    }
  }, [selectedKey])

  const handleKeySelect = (key: string) => {
    setSelectedKey(key)
  }

  const handleDeleteKey = (key: string) => {
    try {
      localStorage.removeItem(key)
      toast({
        title: "Clave eliminada",
        description: `La clave "${key}" ha sido eliminada correctamente.`,
      })
      refreshStorageKeys()
      if (selectedKey === key) {
        setSelectedKey(null)
        setStorageValue("")
      }
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error)
      toast({
        title: "Error",
        description: `No se pudo eliminar la clave "${key}".`,
        variant: "destructive",
      })
    }
  }

  const handleClearStorage = () => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar todos los datos de almacenamiento local? Esta acción no se puede deshacer.'
    )
    if (confirmed) {
      localStorage.clear()
      toast({
        title: "Almacenamiento limpiado",
        description: "Todo el almacenamiento local ha sido limpiado correctamente.",
      })
      refreshStorageKeys()
      setSelectedKey(null)
      setStorageValue("")
    }
  }

  const handleExportStorage = () => {
    const exportData: Record<string, any> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          exportData[key] = JSON.parse(localStorage.getItem(key) || "")
        } catch {
          exportData[key] = localStorage.getItem(key)
        }
      }
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    
    const exportFileDefaultName = "local-storage-export_" + new Date().toISOString().slice(0, 10) + ".json"
    
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const handleImportStorage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8")
      fileReader.onload = (e) => {
        if (e.target?.result) {
          try {
            const content = JSON.parse(e.target.result as string)
            for (const key in content) {
              localStorage.setItem(key, JSON.stringify(content[key]))
            }
            refreshStorageKeys()
            toast({
              title: "Importación completada",
              description: "Los datos han sido importados correctamente al almacenamiento local.",
            })
          } catch (error) {
            console.error("Error importing storage:", error)
            toast({
              title: "Error",
              description: "No se pudo importar los datos al almacenamiento local.",
              variant: "destructive",
            })
          }
        }
      }
    }
  }

  const formatJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }

  // Nuevas funciones para la gestión de almacenamiento
  const storageStats = getStorageStats(clinicId)
  const quota = getQuota(clinicId ? "clinic" : "global", clinicId)
  const clinicFiles = getFilesByFilter({ clinicId, isDeleted: false })
  
  // Manejar eliminación de archivos
  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId)
      toast.success("Archivo eliminado correctamente")
    } catch (error) {
      toast.error("Error al eliminar el archivo")
    }
  }
  
  // Actualizar cuota
  const handleUpdateQuota = (size: number, isUnlimited: boolean) => {
    setQuota("clinic", clinicId, size, isUnlimited)
    toast.success("Cuota actualizada correctamente")
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="storage">Almacenamiento</TabsTrigger>
          <TabsTrigger value="debug">Depuración</TabsTrigger>
        </TabsList>
        
        <TabsContent value="storage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StorageStatusCard 
              used={storageStats.used} 
              total={storageStats.quota} 
              isUnlimited={storageStats.isUnlimited}
            />
            
            <StorageTypeChart data={storageStats.byType} />
            
            <StorageQuotaSettings
              quotaSize={quota.quotaSize}
              isUnlimited={quota.isUnlimited}
              onSave={handleUpdateQuota}
            />
          </div>
          
          <FilesExplorer 
            files={clinicFiles}
            onDelete={handleDeleteFile}
            onView={(file) => window.open(file.url, "_blank")}
          />
        </TabsContent>
        
        <TabsContent value="debug">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Depuración de Almacenamiento Local</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={refreshStorageKeys} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refrescar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportStorage}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <div className="relative">
                <input
                  type="file"
                  id="import-storage"
                  accept=".json"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleImportStorage}
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              </div>
              <Button variant="destructive" size="sm" onClick={handleClearStorage}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Todo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Claves ({storageKeys.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-y-auto border rounded-md">
                  {storageKeys.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No hay claves en el almacenamiento local</div>
                  ) : (
                    <ul className="divide-y">
                      {storageKeys.map((key) => (
                        <li key={key} className="flex justify-between items-center p-2 hover:bg-gray-50">
                          <button
                            className={`flex-1 text-left truncate ${selectedKey === key ? "font-semibold text-purple-600" : ""}`}
                            onClick={() => handleKeySelect(key)}
                          >
                            {key}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeleteKey(key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedKey ? <span className="truncate">{selectedKey}</span> : "Selecciona una clave para ver su valor"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="view">Ver</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>
                  <TabsContent value="view" className="h-[400px] overflow-auto">
                    {selectedKey ? (
                      <pre className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap">
                        {formatJSON(storageValue)}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        Selecciona una clave para ver su valor
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="raw" className="h-[400px] overflow-auto">
                    {selectedKey ? (
                      <pre className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap">{storageValue}</pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        Selecciona una clave para ver su valor
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

