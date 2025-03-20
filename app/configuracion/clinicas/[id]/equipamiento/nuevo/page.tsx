"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, HelpCircle, Upload, X, ChevronLeft, ChevronRight, StarIcon } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { useEquipment, DeviceImage } from "@/contexts/equipment-context"

export default function NewEquipmentPage() {
  // Usar useParams para obtener los parámetros de la URL
  const routeParams = useParams();
  const clinicId = routeParams.id as string;
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addEquipment } = useEquipment()
  
  const fromGlobal = searchParams.get("from") === "global"
  
  const [isSaving, setIsSaving] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  
  // Estado para gestionar errores de validación
  const [errors, setErrors] = useState({
    name: false,
    code: false,
    serialNumber: false,
    description: false,
  })
  
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    code: "",
    weight: "1",
    description: "",
    serialNumber: "",
    flowwIntegration: "Ninguna",
  })
  
  const [images, setImages] = useState<DeviceImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Validar el formulario cuando los datos cambian
  useEffect(() => {
    validateForm(false);
  }, [equipmentData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEquipmentData((prev) => ({ ...prev, [name]: value }))
  }
  
  // Función de validación del formulario
  const validateForm = (showErrors = true): boolean => {
    const newErrors = {
      name: equipmentData.name.trim() === "",
      code: equipmentData.code.trim() === "",
      serialNumber: equipmentData.serialNumber.trim() === "",
      description: equipmentData.description.trim() === "",
    }
    
    if (showErrors) {
      setErrors(newErrors)
    }
    
    const valid = !Object.values(newErrors).some(error => error)
    setIsFormValid(valid)
    return valid
  }

  const handleSave = () => {
    // Validar antes de guardar
    if (!validateForm()) {
      toast.error("Por favor, completa todos los campos obligatorios")
      return
    }
    
    setIsSaving(true)
    try {
      const newEquipment = addEquipment({
        ...equipmentData,
        clinicId: Number(clinicId),
        images
      })
      
      if (newEquipment && newEquipment.id) {
        toast.success("Equipamiento añadido correctamente")
        const fromParam = fromGlobal ? "?from=global" : ""
        router.push(`/configuracion/clinicas/${clinicId}/equipamiento/${newEquipment.id}${fromParam}`)
      } else {
        toast.error("Error al guardar el equipamiento")
        setIsSaving(false)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al añadir el equipamiento")
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (fromGlobal) {
      router.push('/configuracion/equipamiento')
    } else {
      router.push(`/configuracion/clinicas/${clinicId}?tab=equipamiento`)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: DeviceImage[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        url: URL.createObjectURL(file),
        isPrimary: images.length === 0
      }));
      
      setImages([...images, ...newImages]);
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

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl pt-16">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h2 className="text-2xl font-semibold">Nuevo equipamiento</h2>
      </div>
      
      <p className="text-sm text-gray-500 mb-2">
        Los campos marcados con <span className="text-red-500">*</span> son obligatorios
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código <span className="text-red-500">*</span></Label>
                <Input
                  id="code"
                  name="code"
                  value={equipmentData.code}
                  onChange={handleInputChange}
                  placeholder="Código de referencia"
                  className={errors.code ? 'border-red-500 ring-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-xs text-red-500">Este campo es obligatorio</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={equipmentData.name}
                  onChange={handleInputChange}
                  placeholder="Nombre del equipamiento"
                  className={errors.name ? 'border-red-500 ring-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">Este campo es obligatorio</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Número de serie <span className="text-red-500">*</span></Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={equipmentData.serialNumber}
                onChange={handleInputChange}
                placeholder="Número de serie del fabricante"
                className={errors.serialNumber ? 'border-red-500 ring-red-500' : ''}
              />
              {errors.serialNumber && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso</Label>
              <Input
                id="weight"
                name="weight"
                value={equipmentData.weight}
                onChange={handleInputChange}
                placeholder="Peso del equipo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flowwIntegration">Integración con Floww</Label>
              <Select
                value={equipmentData.flowwIntegration}
                onValueChange={(value) => setEquipmentData((prev) => ({ ...prev, flowwIntegration: value }))}
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
              <Label htmlFor="description">Descripción <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                name="description"
                value={equipmentData.description}
                onChange={handleInputChange}
                placeholder="Descripción del equipamiento"
                className={`min-h-[100px] resize-none ${errors.description ? 'border-red-500 ring-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>
          </div>
        </Card>

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
                    
                    {images[currentImageIndex].isPrimary && (
                      <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Principal
                      </div>
                    )}
                    
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

      <div className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-background border-t">
        <div className="flex justify-between container mx-auto max-w-4xl">
          <Button 
            variant="outline" 
            onClick={handleBack}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

