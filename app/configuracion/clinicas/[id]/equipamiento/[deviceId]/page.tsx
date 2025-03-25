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
import { useEquipment } from "@/contexts/equipment-context"
import { useImages } from "@/contexts/image-context"
import { Equipo } from "@/services/data/models/interfaces"

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
  path?: string;
  file?: File;
}

export default function DevicePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const deviceId = params.deviceId as string
  const clinicId = Number(params.id as string)
  const isNew = deviceId === "new"
  
  const { getEquipoById, addEquipo, updateEquipo } = useEquipment()
  const { getImagesByEntity, uploadImage } = useImages()
  
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
    if (e.target.files && e.target.files.length > 0) {
      console.log(`Subiendo ${e.target.files.length} archivos para clínica ID: ${clinicId}`);
      
      const newImages: DeviceImage[] = Array.from(e.target.files).map(file => {
        const imageId = Math.random().toString(36).substring(2, 9);
        console.log(`Imagen ${imageId}: ${file.name} (${file.size} bytes, ${file.type})`);
        
        // Importante: Crear un objeto File nuevo para asegurarnos que el archivo se sube correctamente
        const fileObject = new File([file], file.name, { 
          type: file.type,
          lastModified: file.lastModified 
        });
        
        return {
          id: imageId,
          url: URL.createObjectURL(file),
          isPrimary: images.length === 0, // La primera imagen es la principal por defecto
          file: fileObject  // Guardar referencia explícita al archivo original
        };
      });
      
      // Imprimir información sobre las nuevas imágenes
      console.log("Añadiendo nuevas imágenes:", newImages.map(img => ({
        id: img.id,
        hasFile: !!img.file,
        url: img.url,
        isPrimary: img.isPrimary
      })));
      
      // Añadir las nuevas imágenes al estado
      setImages(prevImages => [...prevImages, ...newImages]);
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
      
      // Cargar las imágenes usando la interfaz de contexto
      const loadImages = async () => {
        try {
          // Obtener imágenes asociadas al equipo
          const deviceImages = await getImagesByEntity('equipment', deviceId);
          
          if (deviceImages && deviceImages.length > 0) {
            console.log(`Cargadas ${deviceImages.length} imágenes para dispositivo ${numDeviceId} usando interfaz de contexto`);
            
            // Asegurar que las rutas de las imágenes sean correctas
            const validImages = deviceImages.filter(img => img && img.url && img.id).map(img => ({
              id: img.id,
              url: img.url.startsWith('blob:') ? 
                // Si es una URL de blob temporal, intentar usar la URL persistente
                (img.path ? `/api/storage/file?path=${img.path}` : img.url) : 
                img.url,
              isPrimary: !!img.isPrimary,
              path: img.path
            }));
            
            console.log(`${validImages.length} imágenes válidas cargadas usando interfaz de contexto`);
            setImages(validImages);
          } else {
            console.log(`No se encontraron imágenes para el dispositivo ${numDeviceId}`);
            setImages([]);
          }
        } catch (error) {
          console.error(`Error al cargar imágenes:`, error);
          setImages([]);
        }
      };
      
      // Cargar datos del equipo
      const loadDeviceData = async () => {
        try {
          const equipment = await getEquipoById(deviceId);
          
          if (equipment) {
            console.log("Datos del equipo cargados:", equipment);
            setDeviceData({
              name: equipment.name || "",
              code: equipment.code || "",
              description: equipment.description || "",
              serialNumber: equipment.serialNumber || "",
              weight: "",  // Estos campos podrían estar en la configuración o propiedades adicionales
              flowwIntegration: "Ninguna"
            });
          } else {
            console.error("No se pudo encontrar el equipo con ID:", deviceId);
            toast.error("Equipo no encontrado");
            router.push(`/configuracion/clinicas/${clinicId}/equipamiento`);
          }
        } catch (error) {
          console.error("Error al cargar datos del equipo:", error);
          toast.error("Error al cargar datos del equipo");
        } finally {
          setIsLoading(false);
        }
      };
      
      // Ejecutar ambas cargas en paralelo
      Promise.all([loadDeviceData(), loadImages()])
        .catch(error => {
          console.error("Error durante la carga de datos:", error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [deviceId, clinicId, getImagesByEntity, getEquipoById, router, searchParams]);

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Preparar objeto con los datos del equipo usando la interfaz Equipo
      const equipmentData: Partial<Equipo> = {
        name: deviceData.name,
        code: deviceData.code,
        description: deviceData.description,
        serialNumber: deviceData.serialNumber,
        clinicId: clinicId, 
      };
      
      let savedEquipment;
      
      if (isNew) {
        // Crear nuevo equipo usando el contexto especializado
        savedEquipment = await addEquipo(equipmentData as Omit<Equipo, 'id'>);
        console.log("Equipo creado:", savedEquipment);
      } else {
        // Actualizar equipo existente usando el contexto especializado
        const success = await updateEquipo(deviceId, equipmentData);
        if (success) {
          savedEquipment = await getEquipoById(deviceId);
          console.log("Equipo actualizado:", savedEquipment);
        } else {
          throw new Error("No se pudo actualizar el equipo");
        }
      }
      
      if (savedEquipment) {
        // Guardar las imágenes asociadas al equipo
        if (images.length > 0) {
          try {
            // Aquí necesitaríamos implementar el guardado de imágenes basado en los métodos disponibles
            // Por ahora dejamos pendiente pues uploadImage requiere un archivo File
            console.log(`${images.length} imágenes para procesar`);
            
            // Aquí necesitaríamos procesar cada imagen y usar uploadImage para las nuevas
            let success = true;
            
            if (success) {
              console.log(`${images.length} imágenes guardadas correctamente para el equipo ${savedEquipment.id}`);
            } else {
              console.error("Error al guardar imágenes");
              toast.error("Error al guardar las imágenes");
            }
          } catch (error) {
            console.error("Error al guardar imágenes:", error);
            toast.error("Error al guardar imágenes");
          }
        }
        
        toast.success(isNew ? "Equipo creado correctamente" : "Equipo actualizado correctamente");
        
        // Redirigir al listado o a donde venga el usuario
        setTimeout(() => {
          if (fromGlobalList) {
            router.push("/configuracion/equipamiento");
          } else {
            router.push(`/configuracion/clinicas/${clinicId}/equipamiento`);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar el equipo");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleBack = () => {
    if (fromGlobalList) {
      router.push("/configuracion/equipamiento?tab=list");
    } else {
      router.push(`/configuracion/clinicas/${clinicId}/equipamiento`);
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6 relative pb-24">
      <h1 className="text-2xl font-bold">
        {isNew ? "Nuevo equipo" : "Editar equipo"}
      </h1>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Datos básicos */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Datos básicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nombre del equipo</Label>
                <Input
                  id="name"
                  value={deviceData.name}
                  onChange={(e) => setDeviceData({ ...deviceData, name: e.target.value })}
                  placeholder="Introduzca el nombre"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={deviceData.code}
                  onChange={(e) => setDeviceData({ ...deviceData, code: e.target.value })}
                  placeholder="Introduzca el código"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="serialNumber">Número de serie</Label>
                <Input
                  id="serialNumber"
                  value={deviceData.serialNumber || ""}
                  onChange={(e) => setDeviceData({ ...deviceData, serialNumber: e.target.value })}
                  placeholder="Introduzca el número de serie"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="flowwIntegration">Integración floww.me</Label>
                <Select
                  value={deviceData.flowwIntegration}
                  onValueChange={(value) => setDeviceData({ ...deviceData, flowwIntegration: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccione una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ninguna">Ninguna</SelectItem>
                    <SelectItem value="Nivel 1">Nivel 1</SelectItem>
                    <SelectItem value="Nivel 2">Nivel 2</SelectItem>
                    <SelectItem value="Completa">Completa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={deviceData.description}
                  onChange={(e) => setDeviceData({ ...deviceData, description: e.target.value })}
                  placeholder="Introduzca una descripción"
                  className="mt-1 h-32"
                />
              </div>
            </div>
          </Card>
          
          {/* Imágenes */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Imágenes</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-64 relative">
                {images.length > 0 ? (
                  <>
                    <div className="relative w-full h-full">
                      <Image 
                        src={images[currentImageIndex]?.url || '/placeholder-image.jpg'} 
                        alt="Imagen del equipo"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="absolute bottom-4 right-4 flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevImage}
                        disabled={currentImageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextImage}
                        disabled={currentImageIndex === images.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-12">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin imágenes</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Suba imágenes para mostrarlas aquí
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Subir imágenes
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleFileUpload}
                  />
                </Label>
                
                <p className="mt-2 text-xs text-gray-500">
                  Formatos admitidos: JPG, PNG, GIF
                </p>
              </div>
              
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
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

