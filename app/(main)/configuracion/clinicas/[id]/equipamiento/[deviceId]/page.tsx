"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, HelpCircle, Save, Upload, X, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { useEquipment } from "@/contexts/equipment-context"
import { useImages } from "@/contexts/image-context"
import { useClinic } from "@/contexts/clinic-context"
import type { Equipo } from "@/contexts/equipment-context"
import type { Clinica } from "@/contexts/clinic-context"

interface DeviceData {
  name: string
  description: string
  serialNumber?: string
  clinicId: string | null
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
  const { getImagesByEntity, uploadImage, saveImagesForEntity } = useImages()
  const { getActiveClinicas } = useClinic()
  
  const [isSaving, setIsSaving] = useState(false)
  const [fromGlobalList, setFromGlobalList] = useState(false)
  
  const [deviceData, setDeviceData] = useState<DeviceData>({
    name: "",
    description: "",
    serialNumber: "",
    clinicId: null,
  })
  
  const [images, setImages] = useState<DeviceImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeClinics, setActiveClinics] = useState<Clinica[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log(`Subiendo ${e.target.files.length} archivos para clínica ID: ${clinicId}`);
      
      const newImages: DeviceImage[] = Array.from(e.target.files).map(file => {
        const imageId = Math.random().toString(36).substring(2, 9);
        console.log(`Imagen ${imageId}: ${file.name} (${file.size} bytes, ${file.type})`);
        
        const fileObject = new File([file], file.name, { 
          type: file.type,
          lastModified: file.lastModified 
        });
        
        return {
          id: imageId,
          url: URL.createObjectURL(file),
          isPrimary: images.length === 0,
          file: fileObject
        };
      });
      
      console.log("Añadiendo nuevas imágenes:", newImages.map(img => ({
        id: img.id,
        hasFile: !!img.file,
        url: img.url,
        isPrimary: img.isPrimary
      })));
      
      setImages(prevImages => [...prevImages, ...newImages]);
    }

    if (!fromGlobalList && params.id && typeof params.id === 'string') {
      setDeviceData(prev => ({ ...prev, clinicId: params.id as string }));
    }
  }

  const setAsPrimary = (id: string) => {
    setImages(images.map(img => ({
      ...img,
      isPrimary: img.id === id
    })));
  }

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
    if (currentImageIndex >= images.length - 1) {
      setCurrentImageIndex(Math.max(0, images.length - 2));
    }
  }

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
    const loadActiveClinics = async () => {
      try {
        const active = await getActiveClinicas();
        setActiveClinics(active || []);
      } catch (error) {
        console.error("Error al cargar clínicas activas:", error);
        toast.error("Error al cargar la lista de clínicas.");
      }
    };
    loadActiveClinics();
  }, [getActiveClinicas]);

  const loadDeviceAndImages = useCallback(async () => {
    if (isNew) {
      setIsLoading(false);
      if (!fromGlobalList && params.id) {
        setDeviceData(prev => ({ ...prev, clinicId: params.id as string }));
      }
      return;
    }

    setIsLoading(true);
    try {
      const equipment = await getEquipoById(deviceId);
      if (equipment) {
        setDeviceData({
          name: equipment.name || "",
          description: equipment.description || "",
          serialNumber: equipment.serialNumber || "",
          clinicId: equipment.clinicId || null,
        });
      } else {
        toast.error("Equipo no encontrado");
        router.push(`/configuracion/clinicas/${params.id}/equipamiento`); 
        return;
      }

      const deviceImages = await getImagesByEntity('equipment', deviceId);
      if (deviceImages && deviceImages.length > 0) {
        const validImages = deviceImages
          .filter(img => img && img.url && img.id)
          .map(img => ({
            id: String(img.id),
            url: img.url.startsWith('blob:') 
                 ? (img.path ? `/api/storage/file?path=${img.path}` : img.url) 
                 : img.url,
            isPrimary: !!img.isPrimary,
            path: img.path
          }));
        setImages(validImages);
      } else {
        setImages([]);
      }

    } catch (error) {
      console.error("Error cargando datos del equipo o imágenes:", error);
      toast.error("Error al cargar los datos del equipo.");
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, isNew, fromGlobalList, params.id, getEquipoById, getImagesByEntity, router]); 

  useEffect(() => {
    const referer = document.referrer;
    if (referer && referer.includes("/configuracion/equipamiento")) {
      setFromGlobalList(true);
    }
    loadDeviceAndImages();
  }, [loadDeviceAndImages]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDeviceData(prev => ({ ...prev, [name]: value }));
  };

  const handleClinicChange = (selectedClinicId: string) => {
    setDeviceData(prev => ({ ...prev, clinicId: selectedClinicId === "null" ? null : selectedClinicId }));
  };

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const equipmentData: Partial<Equipo> = {
        name: deviceData.name,
        description: deviceData.description,
        serialNumber: deviceData.serialNumber,
        clinicId: deviceData.clinicId,
      };

      let savedEquipment: Equipo | null = null;
      let success = false;

      if (isNew) {
        console.log("Creando nuevo equipo:", equipmentData);
        savedEquipment = await addEquipo(equipmentData as Omit<Equipo, 'id'>);
        if (savedEquipment) {
          toast.success(`Equipo "${savedEquipment.name}" creado.`);
          success = true;
          if (images.some(img => img.file) && savedEquipment.id) {
            await saveImagesForEntity('equipment', String(savedEquipment.id), images.map(img => ({...img, file: img.file, id: undefined })));
          }
          router.replace(`/configuracion/clinicas/${params.id}/equipamiento/${savedEquipment.id}`);
        } else {
          toast.error("Error al crear el equipo.");
        }
      } else {
        console.log(`Actualizando equipo ${deviceId}:`, equipmentData);
        const updateSuccess = await updateEquipo(deviceId, equipmentData);
        if (updateSuccess) {
          toast.success(`Equipo "${deviceData.name}" actualizado.`);
          success = true;
          if (images.some(img => img.file)) {
            await saveImagesForEntity('equipment', deviceId, images.map(img => ({...img, file: img.file, id: img.id.startsWith('new-') ? undefined : img.id })));
          }
        } else {
          toast.error("Error al actualizar el equipo.");
        }
      }

    } catch (error) {
      console.error("Error guardando equipo:", error);
      toast.error(error instanceof Error ? error.message : "Error desconocido al guardar.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleBack = () => {
    const redirectPath = fromGlobalList 
      ? `/configuracion/equipamiento` 
      : `/configuracion/clinicas/${params.id}/equipamiento`;
    router.push(redirectPath);
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
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Datos básicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nombre del equipo</Label>
                <Input
                  id="name"
                  value={deviceData.name}
                  onChange={handleChange}
                  placeholder="Introduzca el nombre"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="serialNumber">Número de serie</Label>
                <Input
                  id="serialNumber"
                  value={deviceData.serialNumber || ""}
                  onChange={handleChange}
                  placeholder="Introduzca el número de serie"
                  className="mt-1"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={deviceData.description}
                  onChange={handleChange}
                  placeholder="Introduzca una descripción"
                  className="mt-1 h-32"
                />
              </div>
            </div>
          </Card>
          
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

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-medium">Clínicas Asociadas</h3>
            <div className="space-y-2">
              <Label htmlFor="clinic-select">Clínica Asociada</Label>
              <Select 
                value={deviceData.clinicId ?? "null"}
                onValueChange={handleClinicChange}
              >
                <SelectTrigger id="clinic-select">
                  <SelectValue placeholder="Seleccionar clínica..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Ninguna</SelectItem>
                  {activeClinics.map(clinic => (
                    <SelectItem key={String(clinic.id)} value={String(clinic.id)}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>
      )}

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

