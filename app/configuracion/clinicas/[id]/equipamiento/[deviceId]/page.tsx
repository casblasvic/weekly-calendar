"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, HelpCircle, Save, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { useEquipment, DeviceImage } from "@/contexts/equipment-context"

interface DeviceData {
  name: string
  code: string
  weight: string
  description: string
  flowwIntegration: string
  serialNumber?: string
}

export default function DevicePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const deviceId = params.deviceId as string
  const clinicId = Number(params.id as string)
  const isNew = deviceId === "new"
  
  const { getEquipmentById, updateEquipment, addEquipment } = useEquipment()
  
  // Añadir estado para controlar la animación de guardado
  const [isSaving, setIsSaving] = useState(false)
  
  // Estado para saber de dónde viene el usuario
  const [fromGlobalList, setFromGlobalList] = useState(false)
  
  // Estado inicial vacío
  const [deviceData, setDeviceData] = useState<DeviceData>({
    name: "",
    code: "",
    weight: "",
    description: "",
    flowwIntegration: "Ninguna",
    serialNumber: ""
  })
  
  // Estado para imágenes
  const [images, setImages] = useState<DeviceImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Añadir estado de carga
  const [isLoading, setIsLoading] = useState(true)

  // Función para manejar la carga de archivos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: DeviceImage[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        url: URL.createObjectURL(file),
        isPrimary: images.length === 0, // La primera imagen es la principal por defecto
        file
      }));
      
      setImages([...images, ...newImages]);
    }
  }

  // Función para cambiar la imagen principal
  const setAsPrimary = (id: string) => {
    setImages(images.map(img => ({
      ...img,
      isPrimary: img.id === id
    })));
  }

  // Eliminar una imagen
  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
    if (currentImageIndex >= images.length - 1) {
      setCurrentImageIndex(Math.max(0, images.length - 2));
    }
  }

  // Navegar por el carrusel
  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  }

  useEffect(() => {
    // Verificar si el usuario viene de la página global de equipamiento
    const fromParam = searchParams.get("from");
    const isFromGlobal = fromParam === "global";
    console.log("From global:", isFromGlobal);
    setFromGlobalList(isFromGlobal);
    
    if (deviceId !== "new") {
      setIsLoading(true)
      const numDeviceId = Number(deviceId)
      
      const device = getEquipmentById(numDeviceId)
      
      if (device) {
        setDeviceData({
          name: device.name,
          code: device.code,
          weight: "1", // Valor por defecto si no existe
          description: device.description,
          flowwIntegration: "Ninguna", // Valor por defecto si no existe
          serialNumber: device.serialNumber || ""
        })
        
        if (device.images) {
          setImages(device.images.map(img => ({
            id: img.id,
            url: img.url,
            isPrimary: img.isPrimary
          })));
        }
      } else {
        toast.error("No se encontró el dispositivo solicitado")
        router.push(`/configuracion/clinicas/${params.id}/equipamiento`)
      }
      setIsLoading(false)
    } else {
      // Si es nuevo, inicializar con valores vacíos
      setDeviceData({
        name: "",
        code: "",
        weight: "1",
        description: "",
        flowwIntegration: "Ninguna",
        serialNumber: ""
      })
      setIsLoading(false)
    }
  }, [deviceId, params.id, router, getEquipmentById, searchParams])

  const handleSave = () => {
    setIsSaving(true) // Iniciar animación de guardado
    
    try {
      if (isNew) {
        // Añadimos el equipo y obtenemos el ID del nuevo equipo
        const newEquipment = addEquipment({
          ...deviceData,
          clinicId,
          images
        })
        
        if (newEquipment && newEquipment.id) {
          toast.success("Dispositivo añadido correctamente")
          
          // Actualizar la URL sin recargar la página para mantener al usuario en la página de edición
          if (fromGlobalList) {
            router.replace(`/configuracion/clinicas/${clinicId}/equipamiento/${newEquipment.id}?from=global`, { scroll: false })
          } else {
            router.replace(`/configuracion/clinicas/${clinicId}/equipamiento/${newEquipment.id}`, { scroll: false })
          }
        } else {
          toast.error("Error al añadir el dispositivo")
        }
      } else {
        // Actualizamos el equipo existente con el ID actual
        const success = updateEquipment(Number(deviceId), {
          id: Number(deviceId), // Añadimos el ID explícitamente
          ...deviceData,
          clinicId,
          images
        })
        
        if (success) {
          toast.success("Dispositivo actualizado correctamente")
          
          // Refrescar los datos para comprobar que se guardaron correctamente
          const updatedDevice = getEquipmentById(Number(deviceId))
          if (updatedDevice) {
            setDeviceData({
              name: updatedDevice.name,
              code: updatedDevice.code,
              weight: "1", // Valor por defecto si no existe
              description: updatedDevice.description,
              flowwIntegration: "Ninguna", // Valor por defecto si no existe
              serialNumber: updatedDevice.serialNumber || ""
            })
            
            if (updatedDevice.images) {
              setImages(updatedDevice.images.map(img => ({
                id: img.id,
                url: img.url,
                isPrimary: img.isPrimary
              })));
            }
          }
        } else {
          toast.error("No se pudo actualizar el dispositivo")
        }
      }
      
      // Detener la animación después de un breve retraso
      setTimeout(() => {
        setIsSaving(false)
      }, 500)
      
    } catch (error) {
      console.error("Error al guardar:", error)
      toast.error("Error al guardar el dispositivo")
      setIsSaving(false)
    }
  }
  
  const handleBack = () => {
    // Asegurarse de que se detecta correctamente si venimos de la vista global
    if (fromGlobalList) {
      router.push('/configuracion/equipamiento')
    } else {
      router.push(`/configuracion/clinicas/${params.id}?tab=equipamiento`)
    }
  }

  return (
    <div className="container max-w-4xl p-6 pb-24 mx-auto space-y-6 pt-28 md:pt-16">
      <h2 className="mb-6 text-2xl font-semibold">Datos del equipo</h2>

      {isLoading ? (
        <Card className="p-6">
          <div className="flex items-center justify-center h-32">
            <p>Cargando datos del equipo...</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={deviceData.name}
                  onChange={(e) => setDeviceData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={deviceData.code}
                  onChange={(e) => setDeviceData((prev) => ({ ...prev, code: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Ponderación</Label>
                <Input
                  id="weight"
                  value={deviceData.weight}
                  onChange={(e) => setDeviceData((prev) => ({ ...prev, weight: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flowwIntegration">Integración con Floww</Label>
                <Select
                  value={deviceData.flowwIntegration}
                  onValueChange={(value) => setDeviceData((prev) => ({ ...prev, flowwIntegration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar integración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ninguna">Ninguna</SelectItem>
                    <SelectItem value="Básica">Básica</SelectItem>
                    <SelectItem value="Completa">Completa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Número de serie</Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={deviceData.serialNumber || ""}
                  onChange={(e) => setDeviceData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="SN-12345678"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={deviceData.description}
                  onChange={(e) => setDeviceData((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </Card>
          
          {/* Sección de imágenes - Carrusel */}
          <Card className="p-6">
            <div className="space-y-4">
              <Label>Imágenes del dispositivo</Label>
              
              <div className="flex items-center justify-center h-64 overflow-hidden border rounded-md">
                {images.length > 0 ? (
                  <>
                    <div className="relative w-full h-full">
                      <Image 
                        src={images[currentImageIndex].url} 
                        alt={`Imagen ${currentImageIndex + 1}`} 
                        fill
                        className="object-contain"
                      />
                      
                      {/* Indicador de imagen principal */}
                      {images[currentImageIndex].isPrimary && (
                        <div className="absolute flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md top-2 left-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Principal
                        </div>
                      )}
                      
                      {/* Botones de navegación */}
                      {images.length > 1 && (
                        <>
                          <button 
                            onClick={prevImage}
                            disabled={currentImageIndex === 0}
                            className="absolute p-1 transform -translate-y-1/2 rounded-full left-2 top-1/2 bg-white/80 disabled:opacity-30"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={nextImage}
                            disabled={currentImageIndex === images.length - 1}
                            className="absolute p-1 transform -translate-y-1/2 rounded-full right-2 top-1/2 bg-white/80 disabled:opacity-30"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Arrastra imágenes aquí o haz clic para seleccionarlas</p>
                  </div>
                )}
              </div>
              
              {/* Selector de archivos */}
              <div className="flex justify-center">
                <label className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir imágenes
                  <input
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              
              {/* Miniaturas */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((img, index) => (
                    <div 
                      key={img.id} 
                      className={`relative rounded-md overflow-hidden border-2 h-16 ${
                        currentImageIndex === index ? 'border-purple-600' : 'border-transparent'
                      } ${img.isPrimary ? 'ring-2 ring-yellow-400' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <Image 
                        src={img.url} 
                        alt={`Miniatura ${index + 1}`}
                        fill
                        className="object-cover cursor-pointer"
                      />
                      <div className="absolute top-0 right-0 flex p-1 space-x-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAsPrimary(img.id);
                          }}
                          className={`bg-white/80 rounded-full p-0.5 ${img.isPrimary ? 'text-yellow-500' : 'text-gray-500'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill={img.isPrimary ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="bg-white/80 rounded-full p-0.5 text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Botones de parámetros */}
      <div className="flex gap-2">
        <Button variant="outline" disabled>
          Parámetro I
        </Button>
        <Button variant="outline" disabled>
          Parámetro II
        </Button>
        <Button variant="outline" disabled>
          Parámetro III
        </Button>
      </div>

      {/* Botones fijos inferiores */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-4 border-t bg-background">
        <div className="container flex justify-between max-w-4xl mx-auto">
          <Button 
            variant="outline" 
            onClick={handleBack}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="text-white bg-purple-600 hover:bg-purple-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

