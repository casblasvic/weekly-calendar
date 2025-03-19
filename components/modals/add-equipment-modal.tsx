"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Upload, X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Image from "next/image"
import { useDropzone } from "react-dropzone"

// Interfaz para las imágenes
interface DeviceImage {
  id: string;
  url: string;
  isPrimary: boolean;
  file: File;
}

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  clinics?: { id: number; name: string }[];
}

export function AddEquipmentModal({ isOpen, onClose, onSave, clinics = [] }: AddEquipmentModalProps) {
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    code: "",
    serialNumber: "",
    description: "",
    clinicId: "",
  })
  
  // Estado para gestionar las imágenes
  const [images, setImages] = useState<DeviceImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEquipmentData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setEquipmentData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // Preparamos los datos para enviar, incluyendo las imágenes
    onSave({
      ...equipmentData,
      images: images.map(img => ({
        file: img.file,
        isPrimary: img.isPrimary
      }))
    })
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setEquipmentData({
      name: "",
      code: "",
      serialNumber: "",
      description: "",
      clinicId: "",
    })
    setImages([])
    setCurrentImageIndex(0)
  }

  // Configurar dropzone para la carga de imágenes
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: DeviceImage[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      isPrimary: images.length === 0, // La primera imagen es la principal
      file
    }))
    
    setImages(prev => {
      const updated = [...prev, ...newImages]
      return updated
    })
  }, [images])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5242880 // 5MB
  })

  // Función para eliminar una imagen
  const removeImage = (id: string) => {
    const removedImage = images.find(img => img.id === id)
    const newImages = images.filter(img => img.id !== id)
    
    // Si eliminamos la imagen principal, establecer la primera como principal
    if (removedImage?.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true
    }
    
    setImages(newImages)
    
    // Ajustar el índice si estamos eliminando la imagen actual
    if (currentImageIndex >= newImages.length && newImages.length > 0) {
      setCurrentImageIndex(newImages.length - 1)
    }
  }

  // Función para establecer una imagen como principal
  const setPrimaryImage = (id: string) => {
    setImages(
      images.map(img => ({
        ...img,
        isPrimary: img.id === id
      }))
    )
  }

  // Navegar por el carrusel
  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl">Añadir nuevo equipamiento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* Columna izquierda con los datos del equipo */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="clinicId" className="text-sm font-medium">Clínica</Label>
              <Select
                value={equipmentData.clinicId}
                onValueChange={(value) => handleSelectChange("clinicId", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar clínica" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map(clinic => (
                    <SelectItem key={clinic.id} value={clinic.id.toString()}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="code" className="text-sm font-medium">Código</Label>
                <Input
                  id="code"
                  name="code"
                  value={equipmentData.code}
                  onChange={handleInputChange}
                  placeholder="Ej: BALLA-1"
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  value={equipmentData.name}
                  onChange={handleInputChange}
                  placeholder="Ej: Ballancer"
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="serialNumber" className="text-sm font-medium">Número de serie</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={equipmentData.serialNumber}
                onChange={handleInputChange}
                placeholder="Ej: BL-2023-001"
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={equipmentData.description}
                onChange={handleInputChange}
                placeholder="Descripción del equipamiento"
                rows={3}
                className="w-full"
              />
            </div>
          </div>

          {/* Columna derecha con el carrusel de imágenes */}
          <div className="space-y-4">
            <Label>Fotografías del equipo</Label>
            
            {/* Área para subir imágenes */}
            {images.length === 0 ? (
              <div 
                {...getRootProps()} 
                className={`
                  border-2 border-dashed rounded-lg p-6
                  transition-colors duration-200 ease-in-out
                  text-center cursor-pointer h-48 flex flex-col items-center justify-center
                  ${isDragActive ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400"}
                `}
              >
                <input {...getInputProps()} />
                <div className="rounded-full bg-purple-100 p-2 mb-2">
                  <Upload className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">
                  {isDragActive 
                    ? "Suelta las imágenes aquí..." 
                    : "Arrastra imágenes aquí o haz clic para seleccionarlas"
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Formatos admitidos: JPG, PNG, GIF. Máximo 5MB.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Carrusel de imágenes */}
                <div className="relative aspect-square rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={images[currentImageIndex].url}
                    alt={`Imagen ${currentImageIndex + 1}`}
                    fill
                    className="object-contain"
                  />
                  
                  {/* Indicador de imagen principal */}
                  {images[currentImageIndex].isPrimary && (
                    <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full">
                      Principal
                    </div>
                  )}
                  
                  {/* Controles de navegación */}
                  {images.length > 1 && (
                    <>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full"
                        onClick={prevImage}
                        disabled={currentImageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full"
                        onClick={nextImage}
                        disabled={currentImageIndex === images.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Miniaturas y botones */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <div 
                      key={img.id} 
                      className={`relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 cursor-pointer
                        ${idx === currentImageIndex ? 'border-purple-600' : 'border-transparent'}
                      `}
                      onClick={() => setCurrentImageIndex(idx)}
                    >
                      <Image
                        src={img.url}
                        alt={`Miniatura ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-0.5 right-0.5 flex space-x-0.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryImage(img.id);
                          }}
                          className="bg-white/80 rounded-full p-0.5 text-yellow-500"
                          title="Establecer como principal"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill={img.isPrimary ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="bg-white/80 rounded-full p-0.5 text-red-500"
                          title="Eliminar imagen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Botón para añadir más imágenes */}
                  <div 
                    {...getRootProps()}
                    className="flex items-center justify-center h-16 w-16 flex-shrink-0 border-2 border-dashed rounded-md cursor-pointer hover:border-purple-400"
                  >
                    <input {...getInputProps()} />
                    <Plus className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-purple-600 hover:bg-purple-700 text-white ml-3"
            disabled={!equipmentData.name || !equipmentData.code}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 