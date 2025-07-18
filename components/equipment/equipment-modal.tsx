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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Building2, Wrench, Info } from "lucide-react"
import { useCreateEquipmentMutation, useUpdateEquipmentMutation } from "@/lib/hooks/use-equipment-query"
import type { Equipment } from "@prisma/client";
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SparePartsTab } from "@/components/equipment/spare-parts"
import { ClinicAssignmentsManager } from "./clinic-assignments-manager"
import { useQueryClient } from "@tanstack/react-query"
import { useIsShellyActive } from "@/hooks/use-shelly-integration"

// Interfaces para el cache de datos
interface Product {
  id: string
  name: string
  sku?: string
  costPrice?: number
  price?: number
  settings?: {
    currentStock: number
  }
  category?: {
    name: string
  }
}

interface Installation {
  id: string
  installedAt: string
  isActive: boolean
  serialNumber?: string
  costPrice?: number
  condition: string
  currentUsageHours: number
  estimatedEndOfLife?: string
  installedByUser: {
    firstName: string
    lastName?: string
  }
}

interface SparePart {
  id: string
  partName: string
  partNumber?: string
  recommendedLifespan?: number
  warningThreshold?: number
  criticalThreshold?: number
  isRequired: boolean
  category?: string
  costPrice?: number
  product: Product
  installations: Installation[]
  _count: {
    installations: number
  }
}

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEquipment?: Equipment | null;
  isEditMode?: boolean;
  clinicFilter?: string;
  onRefreshData?: () => void;
}

// Tipo simplificado para los datos del formulario (solo campos que existen en Equipment)
interface EquipmentFormData {
  name: string;
  description: string | null;
  modelNumber: string | null;
  powerThreshold: number;
  purchaseDate: Date | null;
  warrantyEndDate: Date | null;
  isActive: boolean;
}

const defaultEquipmentState = (): EquipmentFormData => ({ 
  name: "",
  description: null,
  modelNumber: null,
  powerThreshold: 1.0,
  purchaseDate: null,
  warrantyEndDate: null,
  isActive: true,
});

export default function AddEquipmentModal({
  isOpen,
  onClose,
  isEditMode = false,
  initialEquipment = null,
  clinicFilter,
  onRefreshData
}: AddEquipmentModalProps) {
  const createEquipmentMutation = useCreateEquipmentMutation()
  const updateEquipmentMutation = useUpdateEquipmentMutation()
  const queryClient = useQueryClient()
  
  // ✅ VERIFICAR SI EL MÓDULO SHELLY ESTÁ ACTIVO
  const isShellyActive = useIsShellyActive()
  
  const [equipmentData, setEquipmentData] = useState<EquipmentFormData>(defaultEquipmentState());
  
  const [errors, setErrors] = useState({
    name: false,
  })
  
  const [activeTab, setActiveTab] = useState<"info" | "clinic-assignments" | "spare-parts">("info")
  
  const [isFormChanged, setIsFormChanged] = useState(false)
  const [hasAssignmentChanges, setHasAssignmentChanges] = useState(false)
  const [initialData, setInitialData] = useState<EquipmentFormData | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Estados para cache de datos de recambios
  const [cachedSpareParts, setCachedSpareParts] = useState<SparePart[]>([])
  const [cachedProducts, setCachedProducts] = useState<Product[]>([])
  const [isLoadingSparePartsData, setIsLoadingSparePartsData] = useState(false)
  const [sparePartsDataLoaded, setSparePartsDataLoaded] = useState(false)

  // Funciones para cargar datos de recambios (cache inteligente)
  const loadSparePartsData = useCallback(async (equipmentId: string) => {
    if (isLoadingSparePartsData) return
    
    setIsLoadingSparePartsData(true)
    try {
      // Cargar spare parts y products en paralelo
      const [sparePartsResponse, productsResponse] = await Promise.all([
        fetch(`/api/equipment/${equipmentId}/spare-parts`),
        fetch('/api/products')
      ])

      if (!sparePartsResponse.ok) throw new Error('Error al cargar recambios')
      if (!productsResponse.ok) throw new Error('Error al cargar productos')

      const [sparePartsData, productsData] = await Promise.all([
        sparePartsResponse.json(),
        productsResponse.json()
      ])

      setCachedSpareParts(sparePartsData)
      setCachedProducts(productsData)
      setSparePartsDataLoaded(true)
    } catch (error) {
      console.error('Error loading spare parts data:', error)
      toast.error('Error al cargar datos de recambios')
    } finally {
      setIsLoadingSparePartsData(false)
    }
  }, [isLoadingSparePartsData])

  // Función para invalidar cache y recargar datos
  const invalidateSparePartsCache = useCallback(async () => {
    if (isEditMode && initialEquipment?.id) {
      await loadSparePartsData(initialEquipment.id)
    }
  }, [loadSparePartsData, isEditMode, initialEquipment?.id])

  // Función para limpiar cache
  const clearSparePartsCache = useCallback(() => {
    setCachedSpareParts([])
    setCachedProducts([])
    setSparePartsDataLoaded(false)
  }, [])

  // Esta función ahora marca cambios Y refresca la tabla principal inmediatamente
  const handleAssignmentDataChange = useCallback(() => {
    setHasAssignmentChanges(true);
    // Refrescar la tabla principal inmediatamente
    if (onRefreshData) {
      onRefreshData();
    }
  }, [onRefreshData]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialEquipment) {
        const initData: EquipmentFormData = {
          name: initialEquipment.name ?? "",
          description: initialEquipment.description ?? null,
          modelNumber: initialEquipment.modelNumber ?? null,
          powerThreshold: Number(initialEquipment.powerThreshold) ?? 1.0,
          purchaseDate: initialEquipment.purchaseDate ? new Date(initialEquipment.purchaseDate) : null,
          warrantyEndDate: initialEquipment.warrantyEndDate ? new Date(initialEquipment.warrantyEndDate) : null,
          isActive: initialEquipment.isActive ?? true,
        }
        setEquipmentData(initData)
        setInitialData(initData)
        setIsFormChanged(false)
        setHasAssignmentChanges(false)
        
        // Cargar datos de recambios si no están cargados
        if (!sparePartsDataLoaded && initialEquipment.id) {
          loadSparePartsData(initialEquipment.id)
        }
        
      } else {
        resetForm()
      }
    } else {
      // Limpiar cache cuando se cierra el modal
      clearSparePartsCache()
    }
  }, [isOpen, initialEquipment, isEditMode, sparePartsDataLoaded, loadSparePartsData, clearSparePartsCache])
  
  const validateForm = (showErrors = true) => {
    const newErrors = {
      name: equipmentData.name.trim() === "",
    }
    if (showErrors) {
      setErrors(newErrors)
    }
    return !newErrors.name;
  }
  
  useEffect(() => {
    if (!isOpen) return;
    let changed = false;
    if (isEditMode && initialData) {
      changed = 
        initialData.name !== equipmentData.name ||
        initialData.description !== equipmentData.description ||
        initialData.modelNumber !== equipmentData.modelNumber ||
        initialData.powerThreshold !== equipmentData.powerThreshold ||
        (initialData.purchaseDate?.toISOString() ?? null) !== (equipmentData.purchaseDate?.toISOString() ?? null) ||
        (initialData.warrantyEndDate?.toISOString() ?? null) !== (equipmentData.warrantyEndDate?.toISOString() ?? null) ||
        initialData.isActive !== equipmentData.isActive;
    } else {
      changed = equipmentData.name.trim() !== "";
    }
    setIsFormChanged(changed);
  }, [equipmentData, isEditMode, initialData, isOpen])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setEquipmentData(prev => ({ ...prev, [name]: newValue }))
  }

  const handleDateChange = (name: keyof EquipmentFormData, date: Date | undefined) => {
    setEquipmentData(prev => ({ ...prev, [name]: date || null }));
  };

  const handleSave = async () => {
    setIsSaving(true)
    const startTime = Date.now()
    const minAnimationTime = 700
    
    try {
      // **SOLO SI HAY CAMBIOS EN INFO BÁSICA**: Actualizar información del equipamiento
      if (isFormChanged) {
        // Validar que el nombre esté presente
        if (!validateForm()) {
          toast.error("Por favor corrige los errores del formulario.")
          setIsSaving(false)
          return
        }
        
        const dataToSave: any = {
          name: equipmentData.name,
          description: equipmentData.description,
          modelNumber: equipmentData.modelNumber,
          // Solo usar powerThreshold si Shelly está activo, sino usar valor por defecto del schema (1.0)
          powerThreshold: String(isShellyActive ? equipmentData.powerThreshold : 1.0),
          purchaseDate: equipmentData.purchaseDate,
          warrantyEndDate: equipmentData.warrantyEndDate,
          isActive: equipmentData.isActive,
        };
        
        if (isEditMode && initialEquipment) {
          const result = await updateEquipmentMutation.mutateAsync({ 
            id: initialEquipment.id, 
            data: dataToSave 
          });
          if (!result) throw new Error("Fallo al actualizar");
          toast.success("Equipamiento actualizado correctamente");
        } else {
          const newEquipment = await createEquipmentMutation.mutateAsync(dataToSave) as Equipment;
          if (!newEquipment?.id) throw new Error("Fallo al crear");
          toast.success("Equipamiento añadido correctamente");
        }
      }
      
      // **SI SOLO HAY CAMBIOS EN ASIGNACIONES**: Solo mostrar mensaje de confirmación
      if (hasAssignmentChanges && !isFormChanged) {
        // Guardando solo cambios de asignaciones
        toast.success("Cambios en asignaciones guardados correctamente");
      }

      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minAnimationTime - elapsedTime)
      setTimeout(() => {
        setIsSaving(false)
        setHasAssignmentChanges(false) // Resetear cambios de asignaciones tras guardar exitoso
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
    setErrors({ name: false })
    setInitialData(null)
    setIsFormChanged(false)
    setHasAssignmentChanges(false)
    clearSparePartsCache()
    setActiveTab("info")
  }

  const handleCloseSimple = () => {
    resetForm();
    
    // Si hubo cambios en las asignaciones, invalidamos la query principal al cerrar
    if (hasAssignmentChanges) {
      queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] });
    }
    
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseSimple()}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="flex-shrink-0 mb-4">
          <DialogTitle className="text-xl">{isEditMode ? "Editar equipamiento" : "Añadir nuevo equipamiento"}</DialogTitle>
          <DialogDescription className="mt-1 text-gray-500">
            {isEditMode 
              ? "Modifica los detalles del equipamiento seleccionado" 
              : "Introduce los detalles del nuevo equipamiento (tipo/modelo)"}
          </DialogDescription>
          <p className="mt-2 text-xs text-gray-500">
            Los campos marcados con <span className="text-red-500">*</span> son obligatorios
          </p>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex flex-col flex-grow min-h-0">
          <TabsList className="grid flex-shrink-0 grid-cols-3 w-full">
            <TabsTrigger value="info" className="flex gap-2 items-center">
              <Info className="w-4 h-4" />
              Información Básica
            </TabsTrigger>
            <TabsTrigger value="clinic-assignments" className="flex gap-2 items-center" disabled={!isEditMode || !initialEquipment?.id}>
              <Building2 className="w-4 h-4" />
              Asignaciones
            </TabsTrigger>
            <TabsTrigger value="spare-parts" className="flex gap-2 items-center" disabled={!isEditMode || !initialEquipment?.id}>
              <Wrench className="w-4 h-4" />
              Recambios
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="overflow-y-auto flex-grow pr-2 mt-4 space-y-4 min-h-0">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                name="name" 
                value={equipmentData.name}
                onChange={handleInputChange} 
                placeholder="Ej: Láser Diodo LS-1200"
                className={cn("w-full", errors.name && "border-red-500")}
              />
              {errors.name && <p className="text-xs text-red-500">El nombre es obligatorio.</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modelNumber">Modelo</Label>
              <Input id="modelNumber" name="modelNumber" value={equipmentData.modelNumber || ''} onChange={handleInputChange} className="w-full" />
            </div>

            {/* Campo de Umbral de Potencia - Solo visible si módulo Shelly activo */}
            {isShellyActive && (
              <div className="pt-4 border-t">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex gap-2 items-center mb-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <Label className="text-sm font-medium text-blue-800">Control Inteligente de Equipos</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="powerThreshold" className="text-sm text-blue-700">
                      Umbral de trabajo (Watts)
                    </Label>
                    <Input 
                      id="powerThreshold" 
                      name="powerThreshold" 
                      type="number" 
                      step="0.1"
                      min="0"
                      value={equipmentData.powerThreshold} 
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, powerThreshold: parseFloat(e.target.value) || 1.0 }))} 
                      className="w-full" 
                      placeholder="1.0"
                    />
                    <p className="text-xs text-blue-600">
                      Potencia mínima en Watts para detectar que el equipamiento está en uso activo mediante enchufes inteligentes
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" value={equipmentData.description || ''} onChange={handleInputChange} className="w-full resize-none" />
            </div>
          </TabsContent>

          <TabsContent value="clinic-assignments" className="overflow-hidden flex-grow mt-4 min-h-0">
            {isEditMode && initialEquipment?.id ? (
              <ClinicAssignmentsManager 
                equipmentId={initialEquipment.id} 
                equipmentName={initialEquipment.name}
                onDataChange={handleAssignmentDataChange}
                clinicFilter={clinicFilter}
              />
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                <div className="text-center">
                  <Building2 className="mx-auto mb-4 w-12 h-12 opacity-50" />
                  <p>Las asignaciones están disponibles después de crear el equipamiento</p>
                  <p className="text-sm">Guarda primero la información básica</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="spare-parts" className="overflow-hidden flex-grow mt-4 min-h-0">
            {isEditMode && initialEquipment?.id ? (
              <SparePartsTab 
                equipmentId={initialEquipment.id} 
                cachedSpareParts={cachedSpareParts}
                cachedProducts={cachedProducts}
                isLoadingData={isLoadingSparePartsData}
                dataLoaded={sparePartsDataLoaded}
                onDataChange={invalidateSparePartsCache}
              />
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                <div className="text-center">
                  <Wrench className="mx-auto mb-4 w-12 h-12 opacity-50" />
                  <p>Los recambios están disponibles después de crear el equipamiento</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button 
            variant="outline" 
            onClick={handleCloseSimple}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || (!isFormChanged && !hasAssignmentChanges)}
            className="flex gap-2 items-center"
          >
            {isSaving ? (
              <>
                <Save className="w-4 h-4 animate-pulse" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? "Actualizar" : "Crear"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}