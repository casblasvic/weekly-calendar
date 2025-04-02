"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
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
import { Equipo, Clinica } from "@/services/data"

interface DeviceData {
  name: string
  code: string
  weight?: string
  description: string
  flowwIntegration?: string
  serialNumber?: string
  status: 'active' | 'maintenance' | 'inactive' | 'retired'
  clinicIds: string[]
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
    code: "",
    description: "",
    serialNumber: "",
    status: 'active',
    clinicIds: [],
    weight: "",
    flowwIntegration: "Ninguna"
  })
  
  const [images, setImages] = useState<DeviceImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeClinics, setActiveClinics] = useState<Clinica[]>([])

  const [openClinicSelector, setOpenClinicSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleClinicSelect = (clinicIdToAdd: string) => {
    setDeviceData(prev => ({
      ...prev,
      clinicIds: [...(prev.clinicIds || []), clinicIdToAdd]
    }));
    setOpenClinicSelector(false);
    setSearchTerm("");
  };

  const handleClinicRemove = (clinicIdToRemove: string) => {
    setDeviceData(prev => ({
      ...prev,
      clinicIds: (prev.clinicIds || []).filter(id => id !== clinicIdToRemove)
    }));
  };

  const availableClinics = activeClinics.filter(
    clinic => !deviceData.clinicIds?.includes(String(clinic.id))
  );

  const selectedClinics = activeClinics.filter(
      clinic => deviceData.clinicIds?.includes(String(clinic.id))
  );

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
        setDeviceData(prev => ({ ...prev, clinicIds: [String(params.id)] }));
      }
      return;
    }

    setIsLoading(true);
    try {
      const equipment = await getEquipoById(deviceId);
      if (equipment) {
        setDeviceData({
          name: equipment.name || "",
          code: equipment.code || "",
          description: equipment.description || "",
          serialNumber: equipment.serialNumber || "",
          status: equipment.status || 'active',
          clinicIds: equipment.clinicIds || (equipment.clinicId ? [equipment.clinicId] : []),
          weight: (equipment.config?.weight as string) || "",
          flowwIntegration: (equipment.config?.flowwIntegration as string) || "Ninguna"
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

  const handleSave = async () => {
    setIsSaving(true)
    
    if (!deviceData.clinicIds || deviceData.clinicIds.length === 0) {
        toast.error("Debe seleccionar al menos una clínica.");
        setIsSaving(false);
        return;
    }

    try {
      const equipmentData: Partial<Equipo> = {
        name: deviceData.name,
        code: deviceData.code,
        description: deviceData.description,
        serialNumber: deviceData.serialNumber,
        status: deviceData.status,
        clinicIds: deviceData.clinicIds,
        clinicId: deviceData.clinicIds[0], 
      };
      
      let savedEquipmentId = deviceId;
      
      if (isNew) {
        const newEquipmentResult = await addEquipo(equipmentData as Omit<Equipo, 'id'>);
        savedEquipmentId = String(newEquipmentResult.id || newEquipmentResult);
        console.log("Equipo creado con ID:", savedEquipmentId);
      } else {
        const success = await updateEquipo(deviceId, equipmentData);
        if (!success) {
          throw new Error("No se pudo actualizar el equipo");
        }
        console.log("Equipo actualizado:", deviceId);
      }
      
      const imagesToUpload = images.filter(img => img.file);
      if (imagesToUpload.length > 0) {
          console.log(`Intentando subir ${imagesToUpload.length} imágenes para equipo ${savedEquipmentId}`);
          await saveImagesForEntity('equipment', savedEquipmentId, images);
          console.log("Imágenes guardadas.");
      } else {
          await saveImagesForEntity('equipment', savedEquipmentId, images);
           console.log("Metadatos de imágenes actualizados (sin subidas).");
      }
      
      toast.success(`Equipo ${isNew ? 'creado' : 'actualizado'} correctamente.`);
      const redirectPath = fromGlobalList 
        ? `/configuracion/equipamiento` 
        : `/configuracion/clinicas/${equipmentData.clinicId}/equipamiento`;
      router.push(redirectPath);
    } catch (error) {
      console.error("Error al guardar equipo:", error);
      toast.error(`Error al guardar el equipo: ${error instanceof Error ? error.message : String(error)}`);
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
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={deviceData.code}
                  onChange={handleChange}
                  placeholder="Introduzca el código"
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
              
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={deviceData.status}
                  onValueChange={(value) => setDeviceData({ ...deviceData, status: value as DeviceData['status'] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="retired">Retirado</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
                {selectedClinics.length > 0 ? (
                  selectedClinics.map((clinic) => (
                    <Badge key={clinic.id} variant="secondary" className="flex items-center gap-1 pr-1">
                      {clinic.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full hover:bg-red-100 hover:text-red-600"
                        onClick={() => handleClinicRemove(String(clinic.id))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Ninguna clínica asociada.</p>
                )}
              </div>

              <Popover open={openClinicSelector} onOpenChange={setOpenClinicSelector}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Clínica
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar clínica..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>No se encontraron clínicas.</CommandEmpty>
                    <CommandGroup heading="Clínicas Disponibles">
                      {availableClinics.length > 0 ? availableClinics.map((clinic) => (
                        <CommandItem
                          key={clinic.id}
                          value={clinic.name}
                          onSelect={() => handleClinicSelect(String(clinic.id))}
                          className="cursor-pointer"
                        >
                          {clinic.name} ({clinic.city})
                        </CommandItem>
                      )) : (
                         <div className="p-2 text-sm text-center text-gray-500">Todas las clínicas ya están asociadas.</div>
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {deviceData.clinicIds?.length === 0 && !isLoading && (
                <p className="mt-2 text-sm text-red-600">
                  Debe seleccionar al menos una clínica.
                </p>
              )}
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

