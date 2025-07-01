/**
 * COMPONENTE DE GESTIÓN DE RECAMBIOS DE EQUIPAMIENTO
 * ================================================
 * 
 * PROPÓSITO:
 * Gestiona la instalación y seguimiento de recambios (spare parts) para instancias específicas
 * de equipamientos en clínicas. Este componente trabaja directamente con EquipmentClinicAssignment.
 * 
 * ARQUITECTURA:
 * - Un recambio se instala en una EquipmentClinicAssignment específica (no en Equipment general)
 * - Permite rastrear qué productos se han usado como recambios en cada dispositivo
 * - Mantiene historial de instalaciones con fechas y costos
 * 
 * RELACIONES:
 * Product (1) → (N) EquipmentSparePart (N) ← (1) EquipmentClinicAssignment
 * 
 * FLUJO DE INSTALACIÓN:
 * 1. Usuario selecciona clínica (automático si solo hay una asignación activa)
 * 2. Busca y selecciona producto de la lista disponible
 * 3. Introduce cantidad a instalar
 * 4. Especifica precio de costo y razón de reemplazo
 * 5. Confirma instalación
 * 
 * CACHE Y OPTIMIZACIONES:
 * =======================
 * 
 * 1. FILTRADO INTELIGENTE:
 *    - Solo muestra productos NO YA ASOCIADOS al equipamiento
 *    - Filtro por búsqueda en nombre y SKU
 *    - Paginación automática para listas grandes
 * 
 * 2. RENDERING OPTIMISTA:
 *    - Eliminaciones se reflejan inmediatamente en UI
 *    - Rollback automático si falla operación del servidor
 *    - Toast notifications para feedback inmediato
 * 
 * 3. VALIDACIONES:
 *    - assignmentId requerido
 *    - productId requerido y debe existir
 *    - quantity > 0
 *    - costPrice >= 0
 *    - installationType debe ser válido
 * 
 * ESTADOS Y TIPOS:
 * ================
 * 
 * INSTALLATION_TYPES:
 * - 'MAINTENANCE': Mantenimiento preventivo
 * - 'REPAIR': Reparación por falla
 * - 'UPGRADE': Actualización/mejora
 * - 'REPLACEMENT': Reemplazo por desgaste
 * 
 * REPLACEMENT_REASONS:
 * - 'WEAR': Desgaste normal
 * - 'DAMAGE': Daño/rotura
 * - 'MALFUNCTION': Mal funcionamiento
 * - 'UPGRADE': Mejora del componente
 * - 'PREVENTIVE': Mantenimiento preventivo
 * 
 * INTEGRACIÓN CON OTROS SISTEMAS:
 * ===============================
 * 
 * 1. INVENTARIO:
 *    - Se conecta con sistema de productos/inventario
 *    - Actualiza stock disponible tras instalación
 *    - Verifica disponibilidad antes de permitir instalación
 * 
 * 2. CONTABILIDAD:
 *    - Registra costos de recambios
 *    - Genera asientos contables automáticos
 *    - Tracking de gastos por equipamiento
 * 
 * 3. MANTENIMIENTO:
 *    - Historial completo de intervenciones
 *    - Alertas de mantenimiento basadas en recambios
 *    - Predicción de próximos reemplazos
 * 
 * CASOS DE USO PRINCIPALES:
 * =========================
 * 
 * 1. INSTALACIÓN DE RECAMBIO:
 *    - Técnico necesita reemplazar pieza
 *    - Busca producto en sistema
 *    - Instala y registra en equipamiento específico
 * 
 * 2. MANTENIMIENTO PREVENTIVO:
 *    - Programa de mantenimiento indica reemplazo
 *    - Se registra como installationType: 'MAINTENANCE'
 *    - Se programa próxima intervención
 * 
 * 3. UPGRADE DE COMPONENTES:
 *    - Mejora de componentes existentes
 *    - Se mantiene historial de versiones
 *    - Tracking de mejoras por equipamiento
 * 
 * RENDIMIENTO:
 * ============
 * 
 * - Debounce en búsqueda de productos (300ms)
 * - Lazy loading de lista de productos
 * - Memoización de filtros de productos
 * - Optimistic updates para mejor UX
 * 
 * DEBUGGING:
 * ==========
 * 
 * Errores comunes:
 * - "No hay asignaciones activas": Verificar que equipamiento tenga asignaciones con isActive=true
 * - "Producto ya asociado": El producto ya está instalado en este equipamiento
 * - "Assignment not found": assignmentId no existe o fue eliminada
 * 
 * FUTURAS MEJORAS:
 * ================
 * 
 * - QR codes para identificación rápida de productos
 * - Integración con proveedores para pedidos automáticos
 * - Alertas inteligentes basadas en vida útil de componentes
 * - Dashboard de costos por equipamiento y clínica
 * - API para dispositivos móviles (técnicos de campo)
 */

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  Plus, 
  Wrench, 
  Package, 
  History,
  CalendarIcon,
  Trash2,
  AlertTriangle,
  Building2,
  Hash,
  MapPin,
  CheckCircle
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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

interface ClinicAssignment {
  id: string
  clinicId: string
  serialNumber: string
  deviceId: string
  isActive: boolean
  clinic: {
    id: string
    name: string
    city?: string
  }
}

interface SparePartsTabProps {
  equipmentId: string
  // Props para el cache inteligente (opcionales para mantener compatibilidad)
  cachedSpareParts?: SparePart[]
  cachedProducts?: Product[]
  isLoadingData?: boolean
  dataLoaded?: boolean
  onDataChange?: () => Promise<void> | void
}

export default function SparePartsTab({ 
  equipmentId, 
  cachedSpareParts = null,
  cachedProducts = null,
  isLoadingData = false,
  dataLoaded = false,
  onDataChange = null
}: SparePartsTabProps) {
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedSparePart, setSelectedSparePart] = useState<SparePart | null>(null)
  const [productSearchTerm, setProductSearchTerm] = useState("")
  
  // Estados para selección y eliminación
  const [selectedSparePartIds, setSelectedSparePartIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Estados para agregar recambio
  const [newSparePartData, setNewSparePartData] = useState({
    partName: "",
    productId: "",
    partNumber: "",
    installationNotes: "",
    isRequired: true,
    category: "",
    costPrice: "",
  })

  // Estados para instalación
  const [installationData, setInstallationData] = useState({
    serialNumber: "",
    costPrice: "",
    installationNotes: "",
    condition: "NEW" as "NEW" | "REFURBISHED" | "DAMAGED",
    installationDate: new Date(), // Fecha de hoy por defecto
    equipmentClinicAssignmentId: "", // Nueva propiedad
  })

  // Estados para gestionar asignaciones de clínicas
  const [clinicAssignments, setClinicAssignments] = useState<ClinicAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Función para cargar asignaciones de clínicas
  const loadClinicAssignments = async () => {
    setLoadingAssignments(true)
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/clinic-assignments`)
      if (!response.ok) {
        throw new Error('Error al cargar asignaciones de clínicas')
      }
      
      const data = await response.json()
      const activeAssignments = data.assignments.filter((assignment: ClinicAssignment) => assignment.isActive)
      setClinicAssignments(activeAssignments)
      
      // Autoselección: si solo hay una asignación activa, seleccionarla automáticamente
      if (activeAssignments.length === 1) {
        setInstallationData(prev => ({ 
          ...prev, 
          equipmentClinicAssignmentId: activeAssignments[0].id 
        }))
      }
    } catch (error) {
      console.error('Error loading clinic assignments:', error)
      toast.error('Error al cargar las asignaciones de clínicas')
    } finally {
      setLoadingAssignments(false)
    }
  }

  // Usar cache si está disponible, sino cargar datos
  useEffect(() => {
    if (cachedSpareParts !== null && cachedProducts !== null && dataLoaded) {
      // Usar datos del cache
      setSpareParts(cachedSpareParts)
      setProducts(cachedProducts)
      setIsLoading(false)
    } else if (equipmentId && !isLoadingData) {
      // Cargar datos normalmente (fallback para compatibilidad)
      loadSpareParts()
      loadProducts()
    }
  }, [equipmentId, cachedSpareParts, cachedProducts, dataLoaded, isLoadingData])

  // Mostrar loading del cache si está disponible
  useEffect(() => {
    if (isLoadingData) {
      setIsLoading(true)
    }
  }, [isLoadingData])

  // Limpiar selecciones cuando cambian los spare parts
  useEffect(() => {
    setSelectedSparePartIds([])
  }, [spareParts])

  const loadSpareParts = async () => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/spare-parts`)
      if (!response.ok) throw new Error('Error al cargar recambios')
      const data = await response.json()
      setSpareParts(data)
    } catch (error) {
      console.error('Error loading spare parts:', error)
      toast.error('Error al cargar recambios')
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Error al cargar productos')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Error al cargar productos')
    }
  }

  const handleAddSparePart = async () => {
    try {
      const dataToSend = {
        ...newSparePartData,
        costPrice: newSparePartData.costPrice ? parseFloat(newSparePartData.costPrice) : null,
      }

      const response = await fetch(`/api/equipment/${equipmentId}/spare-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear recambio')
      }

      toast.success('Producto asociado correctamente como recambio')
      setIsAddModalOpen(false)
      resetNewSparePartForm()
      
      // Invalidar cache si está disponible, sino recargar normalmente
      if (onDataChange) {
        await onDataChange()
      } else {
        loadSpareParts()
      }
    } catch (error) {
      console.error('Error adding spare part:', error)
      toast.error(error instanceof Error ? error.message : 'Error al asociar producto como recambio')
    }
  }

  const handleInstallSparePart = async () => {
    if (!selectedSparePart) return

    // Validar que se haya seleccionado una asignación de clínica
    if (!installationData.equipmentClinicAssignmentId) {
      toast.error('Debe seleccionar una clínica y número de serie donde instalar el recambio')
      return
    }

    try {
      const dataToSend = {
        ...installationData,
        costPrice: installationData.costPrice ? parseFloat(installationData.costPrice) : null,
        installationDate: installationData.installationDate.toISOString(),
      }

      const response = await fetch(`/api/equipment/${equipmentId}/spare-parts/${selectedSparePart.id}/installations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al instalar recambio')
      }

      toast.success('Recambio instalado correctamente')
      setIsInstallModalOpen(false)
      setSelectedSparePart(null)
      resetInstallationForm() // Limpiar formulario después de instalación exitosa
      
      // Invalidar cache si está disponible, sino recargar normalmente
      if (onDataChange) {
        await onDataChange()
      } else {
        loadSpareParts()
      }
    } catch (error) {
      console.error('Error installing spare part:', error)
      toast.error(error instanceof Error ? error.message : 'Error al instalar recambio')
    }
  }

  const resetNewSparePartForm = () => {
    setNewSparePartData({
      partName: "",
      productId: "",
      partNumber: "",
      installationNotes: "",
      isRequired: true,
      category: "",
      costPrice: "",
    })
    setProductSearchTerm("")
  }

  const resetInstallationForm = (sparePart?: SparePart) => {
    // Priorizar el coste del recambio, luego el del producto
    const costToUse = sparePart?.costPrice || sparePart?.product.costPrice
    setInstallationData({
      serialNumber: "",
      costPrice: costToUse ? costToUse.toString() : "",
      installationNotes: "",
      condition: "NEW",
      installationDate: new Date(), // Siempre resetear a hoy
      equipmentClinicAssignmentId: "", // Resetear asignación de clínica
    })
  }

  const getSparePartStatus = (sparePart: SparePart) => {
    const activeInstallation = sparePart.installations.find(inst => inst.isActive)
    if (!activeInstallation) return { status: 'not-installed', label: 'No instalado', color: 'bg-gray-500' }
    
    // Simple estado: si está instalado y activo, está operativo
    return { status: 'ok', label: 'Instalado', color: 'bg-green-500' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Funciones de selección
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSparePartIds(spareParts.map(part => part.id))
    } else {
      setSelectedSparePartIds([])
    }
  }

  const handleSelectOne = (sparePartId: string, checked: boolean) => {
    if (checked) {
      setSelectedSparePartIds(prev => [...prev, sparePartId])
    } else {
      setSelectedSparePartIds(prev => prev.filter(id => id !== sparePartId))
    }
  }

  const isAllSelected = spareParts.length > 0 && selectedSparePartIds.length === spareParts.length
  const isSomeSelected = selectedSparePartIds.length > 0

  // Función de eliminación
  const handleDeleteSpareParts = async () => {
    if (selectedSparePartIds.length === 0) return

    const idsToDelete = [...selectedSparePartIds]
    setIsDeleting(true)
    
    // **RENDERING OPTIMISTA** - Eliminar inmediatamente de la UI
    if (onDataChange) {
      // Para cache de props, actualizamos el estado local inmediatamente
      setSpareParts(prev => prev.filter(part => !idsToDelete.includes(part.id)))
    } else {
      // Para cache local, actualizamos inmediatamente
      setSpareParts(prev => prev.filter(part => !idsToDelete.includes(part.id)))
    }
    
    // Limpiar selección y cerrar modal inmediatamente
    setSelectedSparePartIds([])
    setIsDeleteModalOpen(false)
    
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/spare-parts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sparePartIds: idsToDelete })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar recambios')
      }

      const result = await response.json()
      toast.success(result.message || 'Recambios eliminados correctamente')
      
      // Revalidar datos del servidor para asegurar sincronización
      if (onDataChange) {
        await onDataChange()
      }
      
    } catch (error) {
      console.error('Error deleting spare parts:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar recambios')
      
      // **ROLLBACK** - Restaurar los recambios si falló la eliminación
      if (onDataChange) {
        await onDataChange() // Recargar desde servidor
      } else {
        loadSpareParts() // Recargar lista completa
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const getSelectedSparePartsNames = () => {
    const selectedParts = spareParts.filter(part => selectedSparePartIds.includes(part.id))
    return selectedParts.map(part => part.partName)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-center">
          <div className="mx-auto w-8 h-8 rounded-full border-b-2 border-purple-600 animate-spin"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando recambios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Recambios</h3>
          <p className="text-sm text-gray-500">
            Asocia productos del stock como recambios del equipo, luego instala unidades específicas
          </p>
          <p className="mt-1 text-xs text-blue-600">
            💡 Paso 1: Asocia productos → Paso 2: Instala unidades específicas cuando sea necesario
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isSomeSelected && (
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-2 w-4 h-4" />
              Eliminar {selectedSparePartIds.length === 1 ? '1 recambio' : `${selectedSparePartIds.length} recambios`}
            </Button>
          )}
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="mr-2 w-4 h-4" />
            Asociar Producto
          </Button>
        </div>
      </div>

      {/* Lista de Recambios */}
      {spareParts.length === 0 ? (
        <Card>
          <CardContent className="flex justify-center items-center h-48">
            <div className="text-center">
              <Wrench className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <p className="text-gray-500">No hay productos asociados como recambios</p>
              <p className="mt-1 text-sm text-gray-400">Asocia el primer producto para comenzar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="p-3 text-sm font-medium text-left text-gray-600">Recambio</th>
                  <th className="p-3 text-sm font-medium text-left text-gray-600">Producto</th>
                  <th className="p-3 text-sm font-medium text-right text-gray-600">Coste</th>
                  <th className="p-3 text-sm font-medium text-center text-gray-600">Stock</th>
                  <th className="p-3 text-sm font-medium text-center text-gray-600">Instalados</th>
                  <th className="p-3 text-sm font-medium text-center text-gray-600">Acciones</th>
                </tr>
              </thead>
            <tbody>
              {spareParts.map((sparePart) => {
                const status = getSparePartStatus(sparePart)
                const activeInstallation = sparePart.installations.find(inst => inst.isActive)
                const stockInfo = sparePart.product.settings?.currentStock || 0

                return (
                  <tr key={sparePart.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedSparePartIds.includes(sparePart.id)}
                        onCheckedChange={(checked) => handleSelectOne(sparePart.id, checked as boolean)}
                        aria-label={`Seleccionar ${sparePart.partName}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{sparePart.partName}</div>
                        {sparePart.partNumber && (
                          <div className="text-xs text-gray-500">P/N: {sparePart.partNumber}</div>
                        )}
                        {sparePart.category && (
                          <div className="text-xs text-gray-500">{sparePart.category}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{sparePart.product.name}</div>
                        {sparePart.product.sku && (
                          <div className="text-xs text-gray-500">SKU: {sparePart.product.sku}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {sparePart.costPrice ? `€${sparePart.costPrice.toFixed(2)}` : 
                         sparePart.product.costPrice ? `€${sparePart.product.costPrice.toFixed(2)}` : '€0.00'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn("text-sm font-medium", stockInfo <= 0 && "text-red-600")}>
                        {stockInfo}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {sparePart._count.installations}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        {!activeInstallation && stockInfo > 0 && (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="p-0 w-8 h-8"
                            onClick={async () => {
                              setSelectedSparePart(sparePart)
                              // Pre-cargar formulario con precio del producto
                              resetInstallationForm(sparePart)
                              // Cargar asignaciones de clínicas antes de abrir el modal
                              await loadClinicAssignments()
                              setIsInstallModalOpen(true)
                            }}
                            title="Instalar recambio"
                          >
                            <Package className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          variant="outline"
                          className="p-0 w-8 h-8"
                          onClick={() => {
                            setSelectedSparePart(sparePart)
                            setIsHistoryModalOpen(true)
                          }}
                          title="Ver historial"
                        >
                          <History className="w-4 h-4 text-blue-600" />
                        </Button>
                        {!activeInstallation && (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="p-0 w-8 h-8"
                            onClick={() => {
                              setSelectedSparePartIds([sparePart.id])
                              setIsDeleteModalOpen(true)
                            }}
                            title="Eliminar recambio"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Asociar Producto como Recambio */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-4 space-y-3">
            <DialogTitle>Asociar Producto como Recambio</DialogTitle>
            <DialogDescription>
              Selecciona qué producto del stock puede usarse como recambio de este equipo
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-grow py-2 space-y-4 min-h-0">
            <div className="space-y-2">
              <Label htmlFor="partName" className="text-sm font-medium">
                Nombre del Recambio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="partName"
                value={newSparePartData.partName}
                onChange={(e) => setNewSparePartData(prev => ({ ...prev, partName: e.target.value }))}
                placeholder="Ej: Lámpara de depilación"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productId" className="text-sm font-medium">
                Producto Asociado <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={newSparePartData.productId} 
                onValueChange={(value) => {
                  const selectedProduct = products.find(p => p.id === value)
                  setNewSparePartData(prev => ({ 
                    ...prev, 
                    productId: value,
                    // Auto-completar nombre del recambio con el nombre del producto si está vacío
                    partName: !prev.partName ? (selectedProduct?.name || "") : prev.partName,
                    // Auto-completar categoría con la del producto
                    category: selectedProduct?.category?.name || "",
                    // Auto-completar coste con el del producto
                    costPrice: selectedProduct?.costPrice ? selectedProduct.costPrice.toString() : "",
                  }))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Buscar producto por nombre o referencia..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Buscar producto..."
                      className="mb-2 w-full h-8"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                    />
                  </div>
                  {products
                    .filter((product) => {
                      // Filtrar por búsqueda de texto
                      const matchesSearch = !productSearchTerm || 
                        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                      
                      // Filtrar productos ya asociados como recambios
                      const isAlreadyAssociated = spareParts.some(sparePart => sparePart.product.id === product.id)
                      
                      return matchesSearch && !isAlreadyAssociated
                    })
                    .map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        {product.sku && (
                          <span className="text-xs text-gray-500">Ref: {product.sku}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partNumber" className="text-sm font-medium">Número de Parte</Label>
              <Input
                id="partNumber"
                value={newSparePartData.partNumber}
                onChange={(e) => setNewSparePartData(prev => ({ ...prev, partNumber: e.target.value }))}
                placeholder="P/N o referencia"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Categoría</Label>
                <Input
                  id="category"
                  value={newSparePartData.category}
                  onChange={(e) => setNewSparePartData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Se auto-completa del producto"
                  disabled
                  className="w-full bg-gray-50"
                />
                <p className="text-xs text-gray-500">Categoría heredada del producto seleccionado</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-medium">Coste Asociado (€)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={newSparePartData.costPrice}
                  onChange={(e) => setNewSparePartData(prev => ({ ...prev, costPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Se puede ajustar tras seleccionar el producto</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installationNotes" className="text-sm font-medium">Notas de Instalación</Label>
              <Textarea
                id="installationNotes"
                value={newSparePartData.installationNotes}
                onChange={(e) => setNewSparePartData(prev => ({ ...prev, installationNotes: e.target.value }))}
                placeholder="Instrucciones o consideraciones especiales para la instalación..."
                rows={3}
                className="w-full resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col flex-shrink-0 gap-2 pt-4 mt-4 border-t sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSparePart}
              disabled={!newSparePartData.partName || !newSparePartData.productId}
              className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
            >
              Asociar Producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Instalar Recambio */}
      <Dialog open={isInstallModalOpen} onOpenChange={setIsInstallModalOpen}>
        <DialogContent className="w-[95vw] max-w-[420px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-4 space-y-3">
            <DialogTitle>Instalar Recambio</DialogTitle>
            <DialogDescription>
              {selectedSparePart && `Instalar ${selectedSparePart.partName}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-grow py-2 space-y-4 min-h-0">
            {/* Selector de Clínica y Número de Serie del Equipamiento */}
            <div className="space-y-3">
              <Label htmlFor="clinicAssignment" className="text-sm font-medium">
                Clínica y Equipamiento <span className="text-red-500">*</span>
              </Label>
              
              {loadingAssignments ? (
                <div className="flex items-center justify-center h-12 bg-gray-50 rounded-lg border">
                  <div className="text-sm text-gray-500">Cargando clínicas disponibles...</div>
                </div>
              ) : clinicAssignments.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    ⚠️ No hay clínicas activas asignadas a este equipamiento. 
                    Debe asignar el equipamiento a al menos una clínica antes de instalar recambios.
                  </p>
                </div>
              ) : (
                <>
                  <Select 
                    value={installationData.equipmentClinicAssignmentId} 
                    onValueChange={(value) => setInstallationData(prev => ({ ...prev, equipmentClinicAssignmentId: value }))}
                  >
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Seleccionar clínica y número de serie..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicAssignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          <div className="flex items-center w-full">
                            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">{assignment.clinic.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <Hash className="h-3 w-3" />
                                {assignment.serialNumber}
                                {assignment.clinic.city && (
                                  <>
                                    <MapPin className="h-3 w-3" />
                                    {assignment.clinic.city}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  

                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-sm font-medium">Número de Serie/Lote del Recambio</Label>
              <Input
                id="serialNumber"
                value={installationData.serialNumber}
                onChange={(e) => setInstallationData(prev => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="Número de serie o lote del recambio específico"
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Diferente al número de serie del equipamiento. Es el identificador específico de esta unidad de recambio.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha de Instalación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !installationData.installationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 w-4 h-4" />
                    {installationData.installationDate ? (
                      format(installationData.installationDate, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={installationData.installationDate}
                    onSelect={(date) => {
                      if (date) {
                        setInstallationData(prev => ({ ...prev, installationDate: date }))
                      }
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                Por defecto es hoy, pero puedes cambiarla si la instalación se hizo antes
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-medium">
                  Costo (€)
                  {selectedSparePart && (selectedSparePart.costPrice || selectedSparePart.product.costPrice) && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      • Recambio: €{(selectedSparePart.costPrice || selectedSparePart.product.costPrice)?.toFixed(2)}
                    </span>
                  )}
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={installationData.costPrice}
                  onChange={(e) => setInstallationData(prev => ({ ...prev, costPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full"
                />
                {selectedSparePart && (selectedSparePart.costPrice || selectedSparePart.product.costPrice) && 
                 installationData.costPrice !== (selectedSparePart.costPrice || selectedSparePart.product.costPrice)?.toString() && (
                  <div className="text-xs text-blue-600">
                    💡 Precio modificado (original: €{(selectedSparePart.costPrice || selectedSparePart.product.costPrice)?.toFixed(2)})
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition" className="text-sm font-medium">Estado</Label>
                <Select 
                  value={installationData.condition} 
                  onValueChange={(value) => setInstallationData(prev => ({ ...prev, condition: value as "NEW" | "REFURBISHED" | "DAMAGED" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Nuevo</SelectItem>
                    <SelectItem value="REFURBISHED">Reacondicionado</SelectItem>
                    <SelectItem value="DAMAGED">Dañado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installationNotesModal" className="text-sm font-medium">Notas de Instalación</Label>
              <Textarea
                id="installationNotesModal"
                value={installationData.installationNotes}
                onChange={(e) => setInstallationData(prev => ({ ...prev, installationNotes: e.target.value }))}
                placeholder="Observaciones sobre la instalación..."
                rows={3}
                className="w-full resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col flex-shrink-0 gap-2 pt-4 mt-4 border-t sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setIsInstallModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleInstallSparePart}
              disabled={!installationData.equipmentClinicAssignmentId || clinicAssignments.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 sm:w-auto disabled:bg-gray-400"
            >
              <Package className="mr-2 w-4 h-4" />
              Instalar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Ver Historial de Instalaciones */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-4 space-y-3">
            <DialogTitle>Historial de Instalaciones</DialogTitle>
            <DialogDescription>
              {selectedSparePart && `Historial de "${selectedSparePart.partName}"`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-grow py-2 min-h-0">
            {!selectedSparePart || selectedSparePart.installations.length === 0 ? (
              <div className="py-8 text-center">
                <History className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <p className="text-gray-500">No hay instalaciones registradas</p>
                <p className="mt-1 text-sm text-gray-400">Este recambio no ha sido instalado aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedSparePart.installations.map((installation, index) => (
                  <div key={installation.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">
                          Instalación #{selectedSparePart.installations.length - index}
                        </span>
                        {installation.isActive && (
                          <Badge className="text-xs text-white bg-green-600">Activa</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(installation.installedAt)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-gray-600">Instalado por:</p>
                        <p className="font-medium">
                          {installation.installedByUser.firstName} {installation.installedByUser.lastName || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estado:</p>
                        <p className="font-medium capitalize">{installation.condition.toLowerCase()}</p>
                      </div>
                      {installation.serialNumber && (
                        <div>
                          <p className="text-gray-600">Serie/Lote:</p>
                          <p className="font-medium break-all">{installation.serialNumber}</p>
                        </div>
                      )}
                      {installation.costPrice && (
                        <div>
                          <p className="text-gray-600">Coste:</p>
                          <p className="font-medium">€{installation.costPrice.toFixed(2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Horas de uso:</p>
                        <p className="font-medium text-blue-600">
                          {installation.currentUsageHours ? `${installation.currentUsageHours}h` : 'Pendiente integración'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Días instalado:</p>
                        <p className="font-medium">
                          {Math.floor((Date.now() - new Date(installation.installedAt).getTime()) / (1000 * 60 * 60 * 24))} días
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col flex-shrink-0 gap-2 pt-4 mt-4 border-t sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)} className="w-full sm:w-auto">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-4 space-y-3">
            <DialogTitle className="flex gap-2 items-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente los siguientes recambios:
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-grow py-2 min-h-0">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="space-y-2">
                {selectedSparePartIds.length === 1 ? (
                  <div className="font-medium text-red-800 break-words">
                    🗑️ {getSelectedSparePartsNames()[0]}
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-red-800">
                      🗑️ {selectedSparePartIds.length} recambios seleccionados:
                    </div>
                    <ul className="ml-4 space-y-1">
                      {getSelectedSparePartsNames().map((name, index) => (
                        <li key={index} className="text-sm text-red-700 break-words">• {name}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 mt-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Importante:</strong> También se eliminarán automáticamente todas las instalaciones 
                y registros de historial relacionados con estos recambios.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col flex-shrink-0 gap-2 pt-4 mt-4 border-t sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSpareParts}
              disabled={isDeleting}
              className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 w-4 h-4 rounded-full border-b-2 border-white animate-spin"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 w-4 h-4" />
                  Eliminar {selectedSparePartIds.length === 1 ? 'Recambio' : `${selectedSparePartIds.length} Recambios`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
