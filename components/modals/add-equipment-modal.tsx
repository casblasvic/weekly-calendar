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
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, /* PlusCircle, X */ } from "lucide-react"
import { useEquipment } from "@/contexts/equipment-context"
import type { Equipment } from "@prisma/client";
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinics?: { id: string; name: string, city?: string }[];
  initialEquipment?: Equipment | null;
  isEditMode?: boolean;
}

const defaultEquipmentState = (): Omit<Equipment, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> => ({ 
  name: "",
  description: null,
  serialNumber: null,
  modelNumber: null,
  purchaseDate: null,
  warrantyEndDate: null,
  location: null,
  notes: null,
  isActive: true,
  clinicId: null,
  deviceId: "",
});

export default function AddEquipmentModal({
  isOpen,
  onClose,
  isEditMode = false,
  initialEquipment = null,
  clinics = []
}: AddEquipmentModalProps) {
  const router = useRouter()
  const { addEquipo, updateEquipo } = useEquipment()
  
  const [equipmentData, setEquipmentData] = useState(defaultEquipmentState());
  
  const [errors, setErrors] = useState({
    name: false,
    clinicId: false,
    deviceId: false,
  })
  
  const [isFormChanged, setIsFormChanged] = useState(false)
  const [initialData, setInitialData] = useState<ReturnType<typeof defaultEquipmentState> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialEquipment) {
        const initData = {
          name: initialEquipment.name ?? "",
          description: initialEquipment.description ?? null,
          serialNumber: initialEquipment.serialNumber ?? null,
          modelNumber: initialEquipment.modelNumber ?? null,
          purchaseDate: initialEquipment.purchaseDate ? new Date(initialEquipment.purchaseDate) : null,
          warrantyEndDate: initialEquipment.warrantyEndDate ? new Date(initialEquipment.warrantyEndDate) : null,
          location: initialEquipment.location ?? null,
          notes: initialEquipment.notes ?? null,
          isActive: initialEquipment.isActive ?? true,
          clinicId: initialEquipment.clinicId ?? null,
          deviceId: initialEquipment.deviceId ?? "",
        }
        setEquipmentData(initData)
        setInitialData(initData)
        setIsFormChanged(false)
      } else {
        resetForm()
      }
    }
  }, [isOpen, initialEquipment, isEditMode])
  
  const validateForm = (showErrors = true) => {
    const newErrors = {
      name: equipmentData.name.trim() === "",
      clinicId: !equipmentData.clinicId,
      deviceId: equipmentData.deviceId.trim() === "",
    }
    if (showErrors) {
      setErrors(newErrors)
    }
    return !newErrors.name && !newErrors.deviceId;
  }
  
  useEffect(() => {
    if (!isOpen) return;
    let changed = false;
    if (isEditMode && initialData) {
      changed = 
        initialData.name !== equipmentData.name ||
        initialData.description !== equipmentData.description ||
        initialData.serialNumber !== equipmentData.serialNumber ||
        initialData.modelNumber !== equipmentData.modelNumber ||
        (initialData.purchaseDate?.toISOString() ?? null) !== (equipmentData.purchaseDate?.toISOString() ?? null) ||
        (initialData.warrantyEndDate?.toISOString() ?? null) !== (equipmentData.warrantyEndDate?.toISOString() ?? null) ||
        initialData.location !== equipmentData.location ||
        initialData.notes !== equipmentData.notes ||
        initialData.isActive !== equipmentData.isActive ||
        initialData.clinicId !== equipmentData.clinicId ||
        initialData.deviceId !== equipmentData.deviceId;
    } else {
      changed = equipmentData.name.trim() !== "" || 
                equipmentData.deviceId.trim() !== "" ||
                equipmentData.clinicId !== null; 
    }
    setIsFormChanged(changed);
  }, [equipmentData, isEditMode, initialData, isOpen])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setEquipmentData(prev => ({ ...prev, [name]: newValue }))
  }

  const handleDateChange = (name: keyof Equipment, date: Date | undefined) => {
      setEquipmentData(prev => ({ ...prev, [name]: date || null }));
  };

  const handleClinicChange = (clinicId: string) => {
      setEquipmentData(prev => ({ ...prev, clinicId: clinicId || null }));
  };

  const handleSave = async () => {
    if (equipmentData.name.trim() === "" || equipmentData.deviceId.trim() === "") {
      setErrors(prev => ({
         ...prev, 
         name: equipmentData.name.trim() === "", 
         deviceId: equipmentData.deviceId.trim() === ""
      }));
      toast.error("Los campos Nombre y Device ID son obligatorios.")
      return
    }
    setErrors(prev => ({ ...prev, name: false, clinicId: false, deviceId: false }));
    
    setIsSaving(true)
    const startTime = Date.now()
    const minAnimationTime = 700
    
    try {
      const dataToSave: Partial<Equipment> = {
        name: equipmentData.name,
        description: equipmentData.description,
        serialNumber: equipmentData.serialNumber,
        modelNumber: equipmentData.modelNumber,
        purchaseDate: equipmentData.purchaseDate,
        warrantyEndDate: equipmentData.warrantyEndDate,
        location: equipmentData.location,
        notes: equipmentData.notes,
        isActive: equipmentData.isActive,
        clinicId: equipmentData.clinicId,
        deviceId: equipmentData.deviceId,
      };
      
      if (isEditMode && initialEquipment) {
        const success = await updateEquipo(initialEquipment.id, dataToSave);
        if (!success) throw new Error("Fallo al actualizar");
        toast.success("Equipamiento actualizado correctamente");
      } else {
        const { id, createdAt, updatedAt, systemId, ...dataForAdd } = dataToSave as Equipment;
        const newEquipment = await addEquipo(dataForAdd);
        if (!newEquipment?.id) throw new Error("Fallo al crear");
        toast.success("Equipamiento añadido correctamente");
      }

      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
      setTimeout(() => {
        setIsSaving(false)
        onClose();
      }, remainingTime)

    } catch (error) {
      console.error("Error al guardar equipamiento:", error)
      toast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
      setTimeout(() => setIsSaving(false), remainingTime)
    }
  }
  
  const resetForm = () => {
    setEquipmentData(defaultEquipmentState());
    setErrors({ name: false, clinicId: false, deviceId: false })
    setInitialData(null)
    setIsFormChanged(false)
  }

  const handleCloseSimple = () => {
     resetForm();
     onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseSimple()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="mb-4">
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
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
            <Input 
              id="name" 
              name="name" 
              value={equipmentData.name}
              onChange={handleInputChange} 
              placeholder="Ej: Láser Diodo LS-1200"
              className={cn(errors.name && "border-red-500")}
            />
            {errors.name && <p className="text-xs text-red-500">El nombre es obligatorio.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deviceId">Device ID <span className="text-red-500">*</span></Label>
            <Input 
              id="deviceId" 
              name="deviceId" 
              value={equipmentData.deviceId}
              onChange={handleInputChange} 
              placeholder="Identificador único del dispositivo"
              className={cn(errors.deviceId && "border-red-500")}
            />
            {errors.deviceId && <p className="text-xs text-red-500">El Device ID es obligatorio.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinicId">Clínica Asociada</Label>
            <Select 
              value={equipmentData.clinicId || ""} 
              onValueChange={handleClinicChange}
              name="clinicId"
            >
              <SelectTrigger className={cn(errors.clinicId && "border-red-500")}>
                <SelectValue placeholder="Seleccionar clínica..." />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name} {clinic.city ? `(${clinic.city})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="modelNumber">Modelo</Label>
              <Input id="modelNumber" name="modelNumber" value={equipmentData.modelNumber || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">Número de Serie</Label>
              <Input id="serialNumber" name="serialNumber" value={equipmentData.serialNumber || ''} onChange={handleInputChange} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" value={equipmentData.description || ''} onChange={handleInputChange} />
          </div>
        </div>
        
        <DialogFooter className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleCloseSimple}>Cancelar</Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !isFormChanged} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSaving ? "Guardando..." : (isEditMode ? "Guardar Cambios" : "Añadir Equipo")}
            {isSaving && <Save className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}