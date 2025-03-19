"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, HelpCircle, Save, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import { getEquipment } from "@/mockData"
import { toast } from "sonner"
import Image from "next/image"

interface DeviceData {
  name: string
  code: string
  weight: string
  description: string
  flowwIntegration: string
  serialNumber?: string
}

interface DeviceImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export default function DevicePage({ params }: { params: { id: string; deviceId: string } }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const isNew = resolvedParams.deviceId === "new"
  
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
        isPrimary: images.length === 0 // La primera imagen es la principal por defecto
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
    if (resolvedParams.deviceId !== "new") {
      setIsLoading(true)
      const deviceId = Number(resolvedParams.deviceId)
      const clinicId = Number(resolvedParams.id)
      
      const clinicEquipment = getEquipment(clinicId)
      const device = clinicEquipment.find(item => item.id === deviceId)
      
      if (device) {
        setDeviceData({
          name: device.name,
          code: device.code,
          weight: "1", // Valor por defecto si no existe
          description: device.description,
          flowwIntegration: "Ninguna", // Valor por defecto si no existe
          serialNumber: device.serialNumber || ""
        })
        
        // Aquí cargaríamos las imágenes del dispositivo si existieran
        // Este es un ejemplo simulado - necesitarías adaptar esto a tu API real
        if (device.images) {
          setImages(device.images.map((img: any, index: number) => ({
            id: img.id || String(index),
            url: img.url,
            isPrimary: img.isPrimary || index === 0
          })));
        }
      } else {
        // Manejar el caso en que no se encuentra el dispositivo
        toast.error("No se encontró el dispositivo solicitado")
        router.push(`/configuracion/clinicas/${resolvedParams.id}/equipamiento`)
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
  }, [resolvedParams.deviceId, resolvedParams.id, router])

  const handleSave = () => {
    // Aquí iría la lógica para guardar el dispositivo con sus imágenes
    console.log("Guardando dispositivo:", deviceData, images)
    toast.success("Dispositivo guardado correctamente")
    router.push(`/configuracion/clinicas/${resolvedParams.id}/equipamiento`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl pt-28 md:pt-16 pb-24">
      <h2 className="text-2xl font-semibold mb-6">Datos del equipo</h2>

      {isLoading ? (
        <Card className="p-6">
          <div className="flex justify-center items-center h-32">
            <p>Cargando datos del equipo...</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              <div className="border rounded-md h-64 flex items-center justify-center overflow-hidden">
                {images.length > 0 ? (
                  <>
                    <div className="relative h-full w-full">
                      <Image 
                        src={images[currentImageIndex].url} 
                        alt={`Imagen ${currentImageIndex + 1}`} 
                        fill
                        className="object-contain"
                      />
                      
                      {/* Indicador de imagen principal */}
                      {images[currentImageIndex].isPrimary && (
                        <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-medium flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
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
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-1 disabled:opacity-30"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <button 
                            onClick={nextImage}
                            disabled={currentImageIndex === images.length - 1}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-1 disabled:opacity-30"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Arrastra imágenes aquí o haz clic para seleccionarlas</p>
                  </div>
                )}
              </div>
              
              {/* Selector de archivos */}
              <div className="flex justify-center">
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
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
                      <div className="absolute top-0 right-0 flex space-x-1 p-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAsPrimary(img.id);
                          }}
                          className={`bg-white/80 rounded-full p-0.5 ${img.isPrimary ? 'text-yellow-500' : 'text-gray-500'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill={img.isPrimary ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
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
                          <X className="h-3 w-3" />
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
      <div className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-background border-t">
        <div className="flex justify-between container mx-auto max-w-4xl">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/configuracion/clinicas/${resolvedParams.id}?tab=equipamiento`)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

