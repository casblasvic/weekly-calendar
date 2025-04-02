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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Save, PlusCircle, X } from "lucide-react"
import { useEquipment, Equipo } from "@/contexts/equipment-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinics?: { id: string; name: string, city?: string }[];
  initialEquipment?: Equipo | null;
  isEditMode?: boolean;
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
  
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    code: "",
    serialNumber: "",
    description: "",
    clinicIds: [] as string[],
    status: 'active' as Equipo['status']
  })
  
  const [errors, setErrors] = useState({
    name: false,
    code: false,
    serialNumber: false,
    description: false,
    clinicIds: false
  })
  
  const [isFormChanged, setIsFormChanged] = useState(false)
  const [initialData, setInitialData] = useState<Partial<Equipo> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [openClinicSelector, setOpenClinicSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleClinicSelect = (clinicIdToAdd: string) => {
    setEquipmentData(prev => ({
      ...prev,
      clinicIds: [...(prev.clinicIds || []), clinicIdToAdd]
    }));
    setOpenClinicSelector(false);
    setSearchTerm("");
  };

  const handleClinicRemove = (clinicIdToRemove: string) => {
    setEquipmentData(prev => ({
      ...prev,
      clinicIds: (prev.clinicIds || []).filter(id => id !== clinicIdToRemove)
    }));
  };

  const availableClinics = clinics.filter(
    clinic => !equipmentData.clinicIds?.includes(String(clinic.id))
  );

  const selectedClinics = clinics.filter(
    clinic => equipmentData.clinicIds?.includes(String(clinic.id))
  );
  
  useEffect(() => {
    if (isEditMode && initialEquipment) {
      const clinicIds = initialEquipment.clinicIds || (initialEquipment.clinicId ? [String(initialEquipment.clinicId)] : []);
      const initData = {
        name: initialEquipment.name || "",
        code: initialEquipment.code || "",
        serialNumber: initialEquipment.serialNumber || "",
        description: initialEquipment.description || "",
        clinicIds: clinicIds,
        status: initialEquipment.status || 'active'
      }
      setEquipmentData(initData)
      setInitialData(initData)
      setIsFormChanged(false)
    } else {
      resetForm()
    }
  }, [isOpen, initialEquipment, isEditMode])
  
  const validateForm = (showErrors = true) => {
    const newErrors = {
      name: equipmentData.name.trim() === "",
      code: equipmentData.code.trim() === "",
      serialNumber: false,
      description: false,
      clinicIds: equipmentData.clinicIds.length === 0
    }
    if (showErrors) {
      setErrors(newErrors)
    }
    return !newErrors.name && !newErrors.code && !newErrors.clinicIds;
  }
  
  useEffect(() => {
    if (isEditMode && initialData) {
      const clinicIdsChanged = 
        initialData.clinicIds?.length !== equipmentData.clinicIds.length ||
        !initialData.clinicIds?.every(id => equipmentData.clinicIds.includes(id));
      const hasDataChanges = 
        initialData.name !== equipmentData.name ||
        initialData.code !== equipmentData.code ||
        initialData.serialNumber !== equipmentData.serialNumber ||
        initialData.description !== equipmentData.description ||
        initialData.status !== equipmentData.status ||
        clinicIdsChanged;
      setIsFormChanged(hasDataChanges)
    } else {
      const hasRequiredFields = 
        equipmentData.name.trim() !== "" && 
        equipmentData.code.trim() !== "" &&
        equipmentData.clinicIds.length > 0;
      setIsFormChanged(hasRequiredFields)
    }
  }, [equipmentData, isEditMode, initialData])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEquipmentData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Por favor, completa Nombre, Código y selecciona al menos una Clínica")
      return
    }
    
    setIsSaving(true)
    const startTime = Date.now()
    const minAnimationTime = 700
    
    try {
      const dataToSave: Partial<Equipo> = {
        name: equipmentData.name,
        code: equipmentData.code,
        serialNumber: equipmentData.serialNumber,
        description: equipmentData.description,
        status: equipmentData.status,
        clinicIds: equipmentData.clinicIds,
        clinicId: equipmentData.clinicIds[0],
        isActive: equipmentData.status === 'active'
      };
      
      if (isEditMode && initialEquipment) {
        const success = await updateEquipo(initialEquipment.id, dataToSave);
        if (!success) throw new Error("Fallo al actualizar");
        toast.success("Equipamiento actualizado correctamente");
      } else {
        const fullDataForAdd: Omit<Equipo, 'id'> = {
           name: dataToSave.name || "",
           code: dataToSave.code || "",
           status: dataToSave.status || 'active',
           clinicIds: dataToSave.clinicIds || [],
           clinicId: dataToSave.clinicId,
           serialNumber: dataToSave.serialNumber,
           description: dataToSave.description,
           isActive: dataToSave.isActive ?? true,
           config: initialEquipment?.config || {},
        };
        const newEquipment = await addEquipo(fullDataForAdd); 
        if (!newEquipment?.id) throw new Error("Fallo al crear");
        toast.success("Equipamiento añadido correctamente");
      }

      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
      setTimeout(() => {
        setIsSaving(false)
        if (isEditMode) {
           setInitialData({...equipmentData});
        }
        setIsFormChanged(false)
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
    setEquipmentData({
      name: "",
      code: "",
      serialNumber: "",
      description: "",
      clinicIds: [],
      status: 'active'
    })
    setErrors({ name: false, code: false, serialNumber: false, description: false, clinicIds: false })
    setInitialData(null)
    setIsFormChanged(false)
    setSearchTerm("")
    setOpenClinicSelector(false)
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
        
        <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-4 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" value={equipmentData.name} onChange={handleInputChange} className={cn(errors.name && "border-red-500")}/>
              {errors.name && <p className="text-xs text-red-500 mt-1">Obligatorio.</p>}
            </div>
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input id="code" name="code" value={equipmentData.code} onChange={handleInputChange} className={cn(errors.code && "border-red-500")}/>
              {errors.code && <p className="text-xs text-red-500 mt-1">Obligatorio.</p>}
            </div>
             <div>
              <Label htmlFor="serialNumber">Número de serie</Label>
              <Input id="serialNumber" name="serialNumber" value={equipmentData.serialNumber} onChange={handleInputChange}/>
            </div>
             
            {(isEditMode || !initialEquipment) && (
              <div>
                <Label htmlFor="status">Estado</Label>
                  <Select
                    value={equipmentData.status}
                    onValueChange={(value) => setEquipmentData({ ...equipmentData, status: value as Equipo['status'] })}
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
             )}
          </div>
          
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" value={equipmentData.description} onChange={handleInputChange} className="h-24"/>
          </div>

          <div>
            <Label>Clínicas Asociadas *</Label>
            <div className="space-y-2 mt-1">
               <div className="flex flex-wrap gap-2 min-h-[40px] items-center p-2 border rounded-md bg-background">
                 {selectedClinics.length > 0 ? (
                   selectedClinics.map((clinic) => (
                     <Badge key={clinic.id} variant="secondary" className="flex items-center gap-1 pr-1">
                       {clinic.name}
                       <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-red-100 hover:text-red-600" onClick={() => handleClinicRemove(String(clinic.id))}>
                         <X className="h-3 w-3" />
                       </Button>
                     </Badge>
                   ))
                 ) : (
                   <p className="text-sm text-gray-500 px-2">Ninguna clínica asociada.</p>
                 )}
               </div>
               <Popover open={openClinicSelector} onOpenChange={setOpenClinicSelector}>
                 <PopoverTrigger asChild>
                   <Button variant="outline" size="sm" className="text-sm"><PlusCircle className="mr-2 h-4 w-4" />Añadir Clínica</Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-[300px] p-0">
                   <Command>
                     <CommandInput placeholder="Buscar clínica..." value={searchTerm} onValueChange={setSearchTerm}/>
                     <CommandEmpty>No se encontraron clínicas.</CommandEmpty>
                     <CommandGroup heading="Clínicas Disponibles">
                       {availableClinics.length > 0 ? availableClinics.map((clinic) => (
                         <CommandItem key={clinic.id} value={`${clinic.name} ${clinic.city || ''}`.trim()} onSelect={() => handleClinicSelect(String(clinic.id))} className="cursor-pointer">
                           {clinic.name} {clinic.city && `(${clinic.city})`}
                         </CommandItem>
                       )) : (
                          <div className="p-2 text-sm text-center text-gray-500">Todas las clínicas ya están asociadas.</div>
                       )}
                     </CommandGroup>
                   </Command>
                 </PopoverContent>
               </Popover>
            </div>
            {errors.clinicIds && <p className="text-xs text-red-500 mt-1">Debe seleccionar al menos una clínica.</p>}
          </div>
        </div>
        
        <DialogFooter className="border-t pt-4 mt-auto -mx-6 px-6 pb-6">
          <Button variant="outline" onClick={handleCloseSimple}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isFormChanged || isSaving} className="text-white bg-purple-600 hover:bg-purple-700">
             {isSaving ? (
                <>
                  <div className="mr-2 animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? "Guardar Cambios" : "Añadir Equipo"}
                </>
              )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}