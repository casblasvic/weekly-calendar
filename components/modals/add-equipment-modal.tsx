"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Upload, X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Image from "next/image"
import { useDropzone } from "react-dropzone"
import { useEquipment } from "@/contexts/equipment-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
  initialEquipment?: any; // Para edición
  isEditMode?: boolean; // Para distinguir entre añadir y editar
}

export function AddEquipmentModal({ isOpen, onClose, onSave, clinics = [], initialEquipment = null, isEditMode = false }: AddEquipmentModalProps) {
  const { addEquipment, updateEquipment } = useEquipment()
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    code: "",
    serialNumber: "",
    description: "",
    clinicId: "",
  })
  
  // Estado para gestionar errores de validación
  const [errors, setErrors] = useState<Record<string, boolean>>({
    name: false,
    code: false,
    serialNumber: false,
    description: false,
    clinicId: false
  })
  
  // Estado para gestionar las imágenes
  const [images, setImages] = useState<DeviceImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isFormChanged, setIsFormChanged] = useState(false)
  const [initialData, setInitialData] = useState<any>(null)

  // Cargar datos iniciales si estamos en modo edición
  useEffect(() => {
    if (isEditMode && initialEquipment) {
      const initData = {
        name: initialEquipment.name || "",
        code: initialEquipment.code || "",
        serialNumber: initialEquipment.serialNumber || "",
        description: initialEquipment.description || "",
        clinicId: initialEquipment.clinicId ? String(initialEquipment.clinicId) : "",
      }
      
      setEquipmentData(initData)
      setInitialData(initData)
      
      if (initialEquipment.images && initialEquipment.images.length > 0) {
        setImages(initialEquipment.images)
      }
      
      // Inicialmente el formulario no tiene cambios
      setIsFormChanged(false)
    } else {
      resetForm()
    }
  }, [isOpen, initialEquipment, isEditMode])
  
  // Comprobar si el formulario ha cambiado
  useEffect(() => {
    if (isEditMode && initialData) {
      // Verificar si hay cambios comparando con los datos iniciales
      const hasDataChanges = 
        initialData.name !== equipmentData.name ||
        initialData.code !== equipmentData.code ||
        initialData.serialNumber !== equipmentData.serialNumber ||
        initialData.description !== equipmentData.description ||
        initialData.clinicId !== equipmentData.clinicId
      
      // También considerar cambios en imágenes si estamos en modo edición
      setIsFormChanged(hasDataChanges);
    } else {
      // En modo creación, activar cuando se completen campos obligatorios
      const hasRequiredFields = 
        equipmentData.name.trim() !== "" && 
        equipmentData.code.trim() !== ""
      
      setIsFormChanged(hasRequiredFields)
    }
  }, [equipmentData, isEditMode, initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEquipmentData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setEquipmentData((prev) => ({ ...prev, [name]: value }))
  }

  // Función de validación del formulario
  const validateForm = (): boolean => {
    const newErrors = {
      name: equipmentData.name.trim() === "",
      code: equipmentData.code.trim() === "",
      serialNumber: equipmentData.serialNumber.trim() === "",
      description: equipmentData.description.trim() === "",
      clinicId: equipmentData.clinicId === ""
    }
    
    setErrors(newErrors)
    
    // Retorna true si no hay errores (todos los campos requeridos están completos)
    return !Object.values(newErrors).some(error => error)
  }

  const handleSave = () => {
    // Validar el formulario antes de proceder
    if (!validateForm()) {
      toast.error("Por favor, completa todos los campos obligatorios")
      return
    }
    
    setIsSaving(true)
    
    // Guardar el tiempo de inicio para garantizar un tiempo mínimo de animación
    const startTime = Date.now()
    const minAnimationTime = 700 // Tiempo mínimo en ms para mostrar la animación
    
    try {
      if (isEditMode && initialEquipment) {
        // Actualizar equipamiento existente
        const success = updateEquipment(initialEquipment.id, {
          ...equipmentData,
          id: initialEquipment.id,
          clinicId: Number(equipmentData.clinicId),
          images
        })
        
        // Asegurar tiempo mínimo de animación
        const endOperation = () => {
          const elapsedTime = Date.now() - startTime
          const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
          
          setTimeout(() => {
            if (success) {
              toast.success("Equipamiento actualizado correctamente")
              // Actualizar datos iniciales para detectar futuros cambios
              setInitialData({...equipmentData});
              setIsFormChanged(false);
            } else {
              toast.error("Error al actualizar el equipamiento")
            }
            setIsSaving(false)
          }, remainingTime)
        }
        
        endOperation()
      } else {
        // Añadir nuevo equipamiento
        const newEquipment = addEquipment({
          ...equipmentData,
          clinicId: Number(equipmentData.clinicId),
          images
        })
        
        // Asegurar tiempo mínimo de animación
        const elapsedTime = Date.now() - startTime
        const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
        
        setTimeout(() => {
          if (newEquipment) {
            toast.success("Equipamiento añadido correctamente")
            
            // Actualizar los datos con el nuevo equipamiento
            setEquipmentData({
              name: newEquipment.name,
              code: newEquipment.code,
              serialNumber: newEquipment.serialNumber || "",
              description: newEquipment.description || "",
              clinicId: String(newEquipment.clinicId),
            });
            
            // Restablecer el estado del formulario a no cambiado
            setIsFormChanged(false);
          } else {
            toast.error("Error al añadir el equipamiento")
          }
          setIsSaving(false)
        }, remainingTime)
      }
    } catch (error) {
      console.error("Error al guardar equipamiento:", error)
      toast.error(isEditMode ? "Error al actualizar el equipamiento" : "Error al añadir el equipamiento")
      
      // Asegurar tiempo mínimo de animación incluso en caso de error
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
      
      setTimeout(() => {
        setIsSaving(false)
      }, remainingTime)
    }
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
    setIsFormChanged(false)
    setErrors({
      name: false,
      code: false,
      serialNumber: false,
      description: false,
      clinicId: false
    })
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
    
    // Marcar que el formulario ha cambiado
    if (!isEditMode) {
      setIsFormChanged(true)
    }
  }, [images, isEditMode])

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
    
    // Marcar que el formulario ha cambiado
    if (!isEditMode) {
      setIsFormChanged(true)
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
    
    // Marcar que el formulario ha cambiado
    if (!isEditMode) {
      setIsFormChanged(true)
    }
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 mb-4">
          <DialogTitle className="text-xl">{isEditMode ? "Editar equipamiento" : "Añadir nuevo equipamiento"}</DialogTitle>
          <DialogDescription className="mt-1 text-gray-500">
            {isEditMode 
              ? "Modifica los detalles del equipamiento seleccionado" 
              : "Introduce los detalles del nuevo equipamiento"}
          </DialogDescription>
          <p className="mt-2 text-xs text-gray-500">
            Los campos marcados con <span className="text-red-500">*</span> son obligatorios
          </p>
        </DialogHeader>

        <div className="flex-1 px-6 overflow-y-auto">
          <div className="grid gap-6 py-2">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nombre del equipamiento"
                  value={equipmentData.name}
                  onChange={handleInputChange}
                  className={`h-10 ${errors.name ? 'border-red-500 ring-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">Este campo es obligatorio</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="code" className="text-sm font-medium">
                  Código <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Código de referencia"
                  value={equipmentData.code}
                  onChange={handleInputChange}
                  className={`h-10 ${errors.code ? 'border-red-500 ring-red-500' : ''}`}
                />
                {errors.code && (
                  <p className="text-xs text-red-500">Este campo es obligatorio</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="serialNumber" className="text-sm font-medium">
                Número de serie <span className="text-red-500">*</span>
              </Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                placeholder="Número de serie del fabricante"
                value={equipmentData.serialNumber}
                onChange={handleInputChange}
                className={`h-10 ${errors.serialNumber ? 'border-red-500 ring-red-500' : ''}`}
              />
              {errors.serialNumber && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Descripción del equipamiento"
                value={equipmentData.description}
                onChange={handleInputChange}
                className={`min-h-[100px] resize-none ${errors.description ? 'border-red-500 ring-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="clinicId" className="text-sm font-medium">
                Clínica <span className="text-red-500">*</span>
              </Label>
              <Select
                value={equipmentData.clinicId}
                onValueChange={(value) => handleSelectChange("clinicId", value)}
              >
                <SelectTrigger className={`h-10 ${errors.clinicId ? 'border-red-500 ring-red-500' : ''}`}>
                  <SelectValue placeholder="Selecciona una clínica" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={String(clinic.id)}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clinicId && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>

            {/* Columna con el carrusel de imágenes */}
            <div className="mt-2 space-y-4">
              <Label className="text-sm font-medium">Fotografías del equipo</Label>
              
              {/* Área para subir imágenes */}
              {images.length === 0 ? (
                <div 
                  {...getRootProps()} 
                  className={`
                    border-2 border-dashed rounded-lg p-8
                    transition-colors duration-200 ease-in-out
                    text-center cursor-pointer h-48 flex flex-col items-center justify-center
                    ${isDragActive ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400"}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="p-3 mb-3 bg-purple-100 rounded-full">
                    <Upload className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="mb-2 text-sm text-gray-600">
                    {isDragActive 
                      ? "Suelta las imágenes aquí..." 
                      : "Arrastra imágenes aquí o haz clic para seleccionarlas"
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos admitidos: JPG, PNG, GIF. Máximo 5MB.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Carrusel de imágenes */}
                  <div className="relative overflow-hidden bg-gray-100 rounded-md aspect-square">
                    <Image
                      src={images[currentImageIndex].url}
                      alt={`Imagen ${currentImageIndex + 1}`}
                      fill
                      className="object-contain"
                    />
                    
                    {/* Indicador de imagen principal */}
                    {images[currentImageIndex].isPrimary && (
                      <div className="absolute px-2 py-1 text-xs text-black bg-yellow-400 rounded-full top-3 left-3">
                        Principal
                      </div>
                    )}
                    
                    {/* Controles de navegación */}
                    {images.length > 1 && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="absolute transform -translate-y-1/2 rounded-full left-3 top-1/2 bg-white/80"
                          onClick={(e) => {
                            e.preventDefault();
                            prevImage();
                          }}
                          disabled={currentImageIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="absolute transform -translate-y-1/2 rounded-full right-3 top-1/2 bg-white/80"
                          onClick={(e) => {
                            e.preventDefault();
                            nextImage();
                          }}
                          disabled={currentImageIndex === images.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Miniaturas y botones */}
                  <div className="flex gap-3 pb-2 overflow-x-auto">
                    {images.map((img, idx) => (
                      <div 
                        key={img.id} 
                        className={`relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border-2 cursor-pointer
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
                        <div className="absolute flex space-x-1 top-1 right-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryImage(img.id);
                            }}
                            className="p-1 text-yellow-500 rounded-full bg-white/80"
                            title="Establecer como principal"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill={img.isPrimary ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            className="p-1 text-red-500 rounded-full bg-white/80"
                            title="Eliminar imagen"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Botón para añadir más imágenes */}
                    <div 
                      {...getRootProps()}
                      className="flex items-center justify-center flex-shrink-0 w-20 h-20 border-2 border-dashed rounded-md cursor-pointer hover:border-purple-400"
                    >
                      <input {...getInputProps()} />
                      <Plus className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 mt-2 border-t sticky bottom-0 bg-white">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={isSaving || !isFormChanged} 
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent" />
                {isEditMode ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 