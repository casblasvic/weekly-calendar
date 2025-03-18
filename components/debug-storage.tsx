"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Trash2, RefreshCw, Download, Upload } from "lucide-react"

export function DebugStorage() {
  const [storageKeys, setStorageKeys] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [storageValue, setStorageValue] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("view")
  const [isLoading, setIsLoading] = useState(false)

  const refreshStorageKeys = () => {
    setIsLoading(true)
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) keys.push(key)
      }
      setStorageKeys(keys.sort())
      if (keys.length > 0 && !selectedKey) {
        setSelectedKey(keys[0])
        setStorageValue(localStorage.getItem(keys[0]) || "")
      } else if (selectedKey) {
        setStorageValue(localStorage.getItem(selectedKey) || "")
      }
    } catch (error) {
      console.error("Error refreshing storage keys:", error)
    } finally {
      setIsLoading(false)
    }
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
    try {
      localStorage.clear()
      toast({
        title: "Almacenamiento limpiado",
        description: "Todo el almacenamiento local ha sido limpiado correctamente.",
      })
      refreshStorageKeys()
      setSelectedKey(null)
      setStorageValue("")
    } catch (error) {
      console.error("Error clearing storage:", error)
      toast({
        title: "Error",
        description: "No se pudo limpiar el almacenamiento local.",
        variant: "destructive",
      })
    }
  }

  const handleExportStorage = () => {
    try {
      const storageData: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          storageData[key] = localStorage.getItem(key) || ""
        }
      }

      const dataStr = JSON.stringify(storageData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const exportFileDefaultName = `localStorage_export_${new Date().toISOString().slice(0, 10)}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()

      toast({
        title: "Exportación completada",
        description: "Los datos del almacenamiento local han sido exportados correctamente.",
      })
    } catch (error) {
      console.error("Error exporting storage:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el almacenamiento local.",
        variant: "destructive",
      })
    }
  }

  const handleImportStorage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, value as string)
        })

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
    reader.readAsText(file)

    // Reset the input value to allow selecting the same file again
    event.target.value = ""
  }

  const formatJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }

  return (
    <div className="space-y-4">
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
    </div>
  )
}

