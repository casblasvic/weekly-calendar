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
import { useEquipment } from "@/contexts/equipment-context"

interface EquipmentImage {
  id: string
  url: string
  isPrimary?: boolean
  file?: File
}

export default function NewEquipmentPage() {
  const routeParams = useParams();
  const clinicId = routeParams.id as string;
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addEquipo } = useEquipment()
  
  const fromGlobal = searchParams.get("from") === "global"
  
  const [isSaving, setIsSaving] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    serialNumber: "",
    description: "",
    modelNumber: "",
    notes: "",
    qlevenIntegration: "Ninguna",
  })
  
  const [images, setImages] = useState<EquipmentImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const isValid = equipmentData.name.trim() !== "" && 
                   equipmentData.serialNumber.trim() !== ""
    setIsFormValid(isValid)
  }, [equipmentData])

  const handleInputChange = (field: string, value: string) => {
    setEquipmentData(prev => ({
      ...prev,
      [field]: value
    }))
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!equipmentData.name.trim()) {
      newErrors.name = "El nombre del equipo es obligatorio"
    }
    
    if (!equipmentData.serialNumber.trim()) {
      newErrors.serialNumber = "El número de serie es obligatorio"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsSaving(true)
    try {
      // Crear el equipo sin las imágenes
      const newEquipment = await addEquipo({
        ...equipmentData,
        clinicId: clinicId,
      })
      
      if (newEquipment && newEquipment.id) {
        // Si hay imágenes, guardarlas por separado
        if (images.length > 0) {
          try {
            // TODO: Implementar la subida de imágenes cuando esté disponible el método
            // await saveEquipmentImages(newEquipment.id, images)
            console.log("Imágenes pendientes de implementar:", images)
          } catch (imageError) {
            console.error("Error al guardar imágenes:", imageError)
            // No bloquear el guardado del equipo si falla la subida de imágenes
          }
        }
        
        toast.success("Equipo guardado correctamente")
        if (fromGlobal) {
          router.push(`/configuracion/equipamiento?new=${newEquipment.id}`)
        } else {
          router.push(`/configuracion/clinicas/${clinicId}/equipamiento?new=${newEquipment.id}`)
        }
      } else {
        toast.error("Error al guardar el equipo")
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      toast.error("Error al guardar el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (fromGlobal) {
      router.push("/configuracion/equipamiento")
    } else {
      router.push(`/configuracion/clinicas/${clinicId}/equipamiento`)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: EquipmentImage[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        url: URL.createObjectURL(file),
        isPrimary: images.length === 0,
        file
      }))
      setImages([...images, ...newImages])
    }
  }

  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id)
    setImages(updatedImages)
    if (currentImageIndex >= updatedImages.length && updatedImages.length > 0) {
      setCurrentImageIndex(updatedImages.length - 1)
    }
  }

  const setPrimaryImage = (id: string) => {
    setImages(images.map(img => ({
      ...img,
      isPrimary: img.id === id
    })))
  }

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }
  }

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Nuevo equipo</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna izquierda - Imágenes */}
              <div className="space-y-4">
                <Label>Imágenes del equipo</Label>
                
                {/* Vista previa de imagen */}
                {images.length > 0 ? (
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
                    <Image
                      src={images[currentImageIndex].url}
                      alt={`Imagen ${currentImageIndex + 1}`}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Controles de navegación */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {/* Indicador de imagen principal */}
                    {images[currentImageIndex].isPrimary && (
                      <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <StarIcon className="h-3 w-3 fill-current" />
                        Principal
                      </div>
                    )}
                    
                    {/* Contador de imágenes */}
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ aspectRatio: '1/1' }}>
                    <div className="text-center text-gray-400">
                      <Upload className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No hay imágenes</p>
                    </div>
                  </div>
                )}

                {/* Lista de miniaturas */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, index) => (
                      <div
                        key={img.id}
                        className={`relative group cursor-pointer rounded overflow-hidden ${
                          index === currentImageIndex ? 'ring-2 ring-purple-600' : ''
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <div className="relative" style={{ aspectRatio: '1/1' }}>
                          <Image
                            src={img.url}
                            alt={`Miniatura ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        
                        {/* Overlay con acciones */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPrimaryImage(img.id)
                            }}
                            className="p-1 bg-white rounded hover:bg-gray-100"
                            title="Establecer como principal"
                          >
                            <StarIcon className={`h-3 w-3 ${img.isPrimary ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeImage(img.id)
                            }}
                            className="p-1 bg-white rounded hover:bg-gray-100"
                            title="Eliminar"
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                        
                        {img.isPrimary && (
                          <div className="absolute top-1 left-1">
                            <StarIcon className="h-3 w-3 fill-yellow-500 text-yellow-500 drop-shadow" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón de subir imagen */}
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir imágenes
                  </Button>
                </div>
              </div>

              {/* Columna derecha - Formulario */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Nombre del equipo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={equipmentData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Láser CO2"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="serialNumber">
                    Número de serie <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serialNumber"
                    value={equipmentData.serialNumber}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                    placeholder="Ej: SN123456789"
                    className={errors.serialNumber ? "border-red-500" : ""}
                  />
                  {errors.serialNumber && (
                    <p className="text-sm text-red-500 mt-1">{errors.serialNumber}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="modelNumber">
                    Número de modelo
                  </Label>
                  <Input
                    id="modelNumber"
                    value={equipmentData.modelNumber}
                    onChange={(e) => handleInputChange('modelNumber', e.target.value)}
                    placeholder="Ej: MDL-2024"
                  />
                </div>

                <div>
                  <Label htmlFor="description">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={equipmentData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción detallada del equipo..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="qlevenIntegration">
                    Integración con Qleven
                  </Label>
                  <Select
                    value={equipmentData.qlevenIntegration}
                    onValueChange={(value) => handleInputChange('qlevenIntegration', value)}
                  >
                    <SelectTrigger id="qlevenIntegration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ninguna">Ninguna</SelectItem>
                      <SelectItem value="Básica">Básica</SelectItem>
                      <SelectItem value="Completa">Completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">
                    Notas
                  </Label>
                  <Textarea
                    id="notes"
                    value={equipmentData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
        <Button variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!isFormValid || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Guardando..." : "Guardar equipo"}
        </Button>
      </div>
    </div>
  )
}
