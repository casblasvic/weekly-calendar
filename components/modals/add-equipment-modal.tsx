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
import { Save } from "lucide-react"
import { useEquipment } from "@/contexts/equipment-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useImages } from "@/contexts/image-context"
import ImageGallery from "@/components/ui/image-gallery"

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
  clinics?: { id: string; name: string }[];
  initialEquipment?: any; // Para edición
  isEditMode?: boolean; // Para distinguir entre añadir y editar
}

export default function AddEquipmentModal({
  isOpen,
  onClose,
  isEditMode = false,
  initialEquipment = null,
  clinics = []
}: AddEquipmentModalProps) {
  const router = useRouter()
  const { addEquipo, updateEquipo } = useEquipment()
  const { uploadImage, getImagesByEntity, setPrimaryImage, getEntityPrimaryImage } = useImages()
  
  // Estados para el formulario y validación
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    code: "",
    serialNumber: "",
    description: "",
    clinicId: "",
  })
  
  const [errors, setErrors] = useState({
    name: false,
    code: false,
    serialNumber: false,
    description: false,
    clinicId: false
  })
  
  const [isFormChanged, setIsFormChanged] = useState(false)
  const [initialData, setInitialData] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Estado para imágenes
  const [images, setImages] = useState([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  
  // Cargar datos iniciales
  useEffect(() => {
    if (isEditMode && initialEquipment) {
      const clinicId = initialEquipment.clinicId;
      // Asegurar que clinicId siempre es un string válido
      const validClinicId = clinicId ? String(clinicId) : "";
      
      const initData = {
        name: initialEquipment.name || "",
        code: initialEquipment.code || "",
        serialNumber: initialEquipment.serialNumber || "",
        description: initialEquipment.description || "",
        clinicId: validClinicId
      }
      
      setEquipmentData(initData)
      setInitialData(initData)
      
      // Cargar imágenes desde el nuevo sistema
      if (initialEquipment.id) {
        loadImages(initialEquipment.id)
      }
      
      setIsFormChanged(false)
    } else {
      resetForm()
    }
  }, [isOpen, initialEquipment, isEditMode])
  
  // Cargar imágenes del equipamiento
  const loadImages = async (equipmentId) => {
    setIsLoadingImages(true)
    try {
      const equipmentImages = await getImagesByEntity('equipment', equipmentId)
      setImages(equipmentImages || [])
    } catch (error) {
      console.error("Error al cargar imágenes:", error)
      setImages([])
    } finally {
      setIsLoadingImages(false)
    }
  }
  
  // Función de validación del formulario
  const validateForm = (showErrors = true) => {
    const newErrors = {
      name: equipmentData.name.trim() === "",
      code: equipmentData.code.trim() === "",
      serialNumber: equipmentData.serialNumber.trim() === "",
      description: equipmentData.description.trim() === "",
      clinicId: equipmentData.clinicId === ""
    }
    
    if (showErrors) {
      setErrors(newErrors)
    }
    
    return !Object.values(newErrors).some(error => error)
  }
  
  // Comprobar si el formulario ha cambiado
  useEffect(() => {
    if (isEditMode && initialData) {
      const hasDataChanges = 
        initialData.name !== equipmentData.name ||
        initialData.code !== equipmentData.code ||
        initialData.serialNumber !== equipmentData.serialNumber ||
        initialData.description !== equipmentData.description ||
        initialData.clinicId !== equipmentData.clinicId
      
      setIsFormChanged(hasDataChanges)
    } else {
      const hasRequiredFields = 
        equipmentData.name.trim() !== "" && 
        equipmentData.code.trim() !== ""
      
      setIsFormChanged(hasRequiredFields)
    }
  }, [equipmentData, isEditMode, initialData])
  
  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEquipmentData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSelectChange = (name, value) => {
    setEquipmentData(prev => ({ ...prev, [name]: value }))
  }
  
  // Función para guardar
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Por favor, completa todos los campos obligatorios")
      return
    }
    
    setIsSaving(true)
    
    // Guardar el tiempo de inicio para garantizar un tiempo mínimo de animación
    const startTime = Date.now()
    const minAnimationTime = 700 // Tiempo mínimo en ms para mostrar la animación
    
    try {
      // Usar el clinicId directamente como string
      const clinicId = equipmentData.clinicId;
      
      if (isEditMode && initialEquipment) {
        // Actualizar equipo existente
        const success = await updateEquipo(initialEquipment.id, {
          ...equipmentData,
          id: initialEquipment.id,
          clinicId: clinicId,
        });
        
        // Asegurar tiempo mínimo de animación
        const endOperation = () => {
          const elapsedTime = Date.now() - startTime
          const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
          
          setTimeout(() => {
            if (success) {
              toast.success("Equipamiento actualizado correctamente")
              setInitialData({...equipmentData})
              setIsFormChanged(false)
            } else {
              toast.error("Error al actualizar el equipamiento")
            }
            setIsSaving(false)
          }, remainingTime)
        }
        
        endOperation()
      } else {
        // Crear nuevo equipo
        try {
          const newEquipment = await addEquipo({
            ...equipmentData,
            clinicId: clinicId,
          });
          
          // Asegurar tiempo mínimo de animación
          const elapsedTime = Date.now() - startTime
          const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
          
          setTimeout(() => {
            if (newEquipment && newEquipment.id) {
              toast.success("Equipamiento añadido correctamente")
              
              // Actualizar los datos con el nuevo equipamiento
              setEquipmentData({
                name: newEquipment.name || "",
                code: newEquipment.code || "",
                serialNumber: newEquipment.serialNumber || "",
                description: newEquipment.description || "",
                clinicId: newEquipment.clinicId || "",
              })
              
              // Restablecer el estado del formulario a no cambiado
              setIsFormChanged(false)
            } else {
              toast.error("Error al añadir el equipamiento")
            }
            setIsSaving(false)
          }, remainingTime)
        } catch (error) {
          console.error("Error al añadir equipamiento:", error)
          
          // Manejar error específico
          const elapsedTime = Date.now() - startTime
          const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
          
          setTimeout(() => {
            toast.error("Error al añadir el equipamiento")
            setIsSaving(false)
          }, remainingTime)
        }
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
  
  // Restablecer formulario
  const resetForm = () => {
    setEquipmentData({
      name: "",
      code: "",
      serialNumber: "",
      description: "",
      clinicId: "",
    })
    setImages([])
    setIsFormChanged(false)
    setErrors({
      name: false,
      code: false,
      serialNumber: false,
      description: false,
      clinicId: false
    })
  }
  
  // Funciones para manejar imágenes
  const handleAddImages = async (files) => {
    if (!equipmentData.clinicId) {
      toast.error("Primero debes seleccionar una clínica")
      return
    }
    
    try {
      const uploadedImages = []
      const clinicIdString = equipmentData.clinicId || "";
      
      for (const file of files) {
        const newImage = await uploadImage(
          file, 
          'equipment', 
          initialEquipment?.id || 'temp-id', 
          clinicIdString,
          { isPrimary: images.length === 0 }
        )
        uploadedImages.push(newImage)
      }
      
      setImages(prev => [...prev, ...uploadedImages])
      
      if (!isEditMode) {
        setIsFormChanged(true)
      }
      
      toast.success(`${files.length} imagen(es) subida(s) correctamente`)
    } catch (error) {
      toast.error("Error al subir imágenes")
      console.error(error)
    }
  }
  
  const handleSetPrimary = async (imageId) => {
    try {
      await setPrimaryImage(imageId)
      
      // Actualizar estado local
      setImages(prev => prev.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      })))
      
      toast.success("Imagen principal actualizada")
    } catch (error) {
      toast.error("Error al establecer imagen principal")
      console.error(error)
    }
  }
  
  const handleRemoveImage = async (imageId) => {
    try {
      // Eliminar la imagen localmente (en el contexto real se eliminaría de la BD)
      setImages(prev => prev.filter(img => img.id !== imageId))
      toast.success("Imagen eliminada correctamente")
      
      if (!isEditMode) {
        setIsFormChanged(true)
      }
    } catch (error) {
      toast.error("Error al eliminar imagen")
      console.error(error)
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
                  {clinics.map((clinic, index) => {
                    // Generar una clave única usando el índice del array para garantizar unicidad
                    const uniqueKey = `clinic-${index}-${clinic.id || 'unknown'}`;
                    
                    return (
                      <SelectItem key={uniqueKey} value={clinic.id || ''}>
                        {clinic.name || 'Clínica sin nombre'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.clinicId && (
                <p className="text-xs text-red-500">Este campo es obligatorio</p>
              )}
            </div>

            {/* Sección de imágenes usando el nuevo componente ImageGallery */}
            <div className="mt-2 space-y-4">
              <Label className="text-sm font-medium">Fotografías del equipo</Label>
              
              {isLoadingImages ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                  <p className="mt-2 text-sm text-gray-500">Cargando imágenes...</p>
                </div>
              ) : (
                <ImageGallery
                  images={images}
                  onAddImages={handleAddImages}
                  onSetPrimary={handleSetPrimary}
                  onRemove={handleRemoveImage}
                  editable={true}
                  layout="carousel"
                />
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