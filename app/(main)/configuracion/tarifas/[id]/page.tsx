"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronDown, Pencil, Trash2, ShoppingCart, Package, User, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Wrench, SmilePlus, Plus, Edit3, Building2, AlertCircle, X, Star, CheckCircle, CircleDollarSign, Search, Tag, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tariff, Clinic, VATType, Category, Service, Product, Prisma } from "@prisma/client"
import { toast as sonnerToast } from "sonner"
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { CheckedState } from '@radix-ui/react-checkbox'
import { PaginationControls } from '@/components/pagination-controls'
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

// Incluir las relaciones que esperamos de la API en el tipo
type TariffServicePriceWithIncludes = Prisma.TariffServicePriceGetPayload<{
  include: { service: { include: { category: true }}, vatType: true }
}>
type TariffProductPriceWithIncludes = Prisma.TariffProductPriceGetPayload<{
  include: { product: { include: { category: true }}, vatType: true }
}>

type TarifaCompleta = Tariff & {
  clinics: Clinic[];
  defaultVatType: VATType | null;
  servicePrices?: TariffServicePriceWithIncludes[]; // Usar optional chaining si el tipo base no se actualiza
  productPrices?: TariffProductPriceWithIncludes[]; // Usar optional chaining
  isGeneral: boolean;
  applyToAllClinics: boolean;
}

// Interfaz unificada para la tabla
interface TarifaItem { 
  id: string; // ID del Servicio o Producto
  type: 'Servicio' | 'Producto' | 'Paquete';
  code?: string | null;
  name: string;
  familyName?: string | null; 
  price: number; // Precio específico de la tarifa
  vatName?: string | null; // Nombre del IVA específico
  isActive: boolean; // Si está activo en la tarifa
  // Añadir los IDs originales de la asociación para acciones
  tariffId?: string; 
  originalId: string; // ID del Servicio o Producto
  categoryId: string | null;
  vatTypeId: string | null;
}

// Interfaz para el estado del formulario de la tarifa
interface TariffFormData {
  name: string;
  description: string | null;
  isGeneral: boolean;
  applyToAllClinics: boolean;
  defaultVatTypeId: string | null;
  isActive: boolean;
}

// +++ MOVER helpers ANTES del componente +++
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((value, key) => value?.[key], obj);
};

// --- Skeleton MODIFICADO para devolver tabla completa --- 
const renderTarifEditSkeleton = (cols: number = 8) => (
  // Envolver todo en un contenedor div o fragmento si es necesario por el layout padre
  <div className="p-4 py-8"> {/* Añadir padding similar al contenido real */} 
      {/* Skeleton de la cabecera y Card (opcional, pero mejora experiencia) */}
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Card className="mb-6">
          <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Simplificar skeleton del card */} 
                  <div className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
                  <div className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
                  <div className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></div>
    </div>
      </CardContent>
    </Card>
      {/* Skeleton del título y controles de la tabla */}
      <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-10 w-1/4" />
    </div>
       {/* Skeleton de la TABLA */} 
      <div className="overflow-x-auto bg-white rounded-lg shadow border">
      <Table>
        <TableHeader>
          <TableRow>
                      {Array.from({ length: cols }).map((_, i) => (
                          <TableHead key={`skel-head-${i}`}><Skeleton className="h-5 w-full my-2" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
                  {/* Generar las filas del esqueleto DENTRO de TableBody */}
          {Array.from({ length: 8 }).map((_, index) => (
            <TableRow key={`skel-row-${index}`}>
                          {Array.from({ length: cols }).map((_, i) => (
                              <TableCell key={`skel-cell-${i}-${index}`}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
      {/* Skeleton Paginación */}
    <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-40" />
      </div>
  </div>
);

export default function ConfiguracionTarifa() {
  const router = useRouter()
  const params = useParams()
  const tarifaId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tarifaEditada, setTarifaEditada] = useState<TarifaCompleta | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [editingTarifa, setEditingTarifa] = useState(false)
  const [formData, setFormData] = useState<TariffFormData>({
    name: "",
    description: "",
    isGeneral: false,
    applyToAllClinics: false,
    defaultVatTypeId: null,
    isActive: true,
  })
  const [initialFormData, setInitialFormData] = useState<TariffFormData | null>(null)
  const [tarifaItems, setTarifaItems] = useState<TarifaItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState('all')
  const [familiaFiltro, setFamiliaFiltro] = useState('all')
  const [showDisabled, setShowDisabled] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [isClinicasModalOpen, setIsClinicasModalOpen] = useState(false)
  const [allClinics, setAllClinics] = useState<Clinic[]>([])
  const [selectedClinics, setSelectedClinics] = useState<Set<string>>(new Set())
  const [vatTypes, setVatTypes] = useState<VATType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<TarifaItem | null>(null)
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false)
  const [nombreItemEliminar, setNombreItemEliminar] = useState("")

  const loadTarifaCompleta = useCallback(async () => {
    if (!tarifaId) {
      setError("ID de tarifa no encontrado.")
      setIsLoading(false)
      return
    }
    setError(null)
    try {
      const response = await fetch(`/api/tariffs/${tarifaId}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error("Tarifa no encontrada")
        throw new Error(`Error ${response.status} al cargar la tarifa`)
      }
      const data: TarifaCompleta = await response.json()
      setTarifaEditada(data)
      const initialData: TariffFormData = {
        name: data.name || "",
        description: data.description || "",
        isGeneral: data.isGeneral || false,
        applyToAllClinics: data.applyToAllClinics || false,
        defaultVatTypeId: data.defaultVatTypeId || null,
        isActive: data.isActive === undefined ? true : data.isActive,
      }
      setFormData(initialData)
      setInitialFormData(initialData)
      setSelectedClinics(new Set(data.clinics.map(c => c.id)))
      setIsDirty(false)
      setEditingTarifa(false)

      // Combinar y mapear servicePrices y productPrices a TarifaItem
      const combinedItems: TarifaItem[] = []
      if (data.servicePrices) {
        data.servicePrices.forEach(sp => {
          if (sp.service) {
            combinedItems.push({
              id: sp.service.id,
              type: 'Servicio',
              code: sp.service.code,
              name: sp.service.name,
              familyName: sp.service.category?.name,
              price: sp.price,
              vatName: sp.vatType?.name,
              isActive: sp.isActive,
              tariffId: sp.tariffId,
              originalId: sp.serviceId,
              categoryId: sp.service.categoryId,
              vatTypeId: sp.vatTypeId,
            })
          }
        })
      }
      if (data.productPrices) {
        data.productPrices.forEach(pp => {
          if (pp.product) {
            combinedItems.push({
              id: pp.product.id,
              type: 'Producto',
              code: pp.product.sku,
              name: pp.product.name,
              familyName: pp.product.category?.name,
              price: pp.price,
              vatName: pp.vatType?.name,
              isActive: pp.isActive,
              tariffId: pp.tariffId,
              originalId: pp.productId,
              categoryId: pp.product.categoryId,
              vatTypeId: pp.vatTypeId,
            })
          }
        })
      }
      // TODO: Mapear paquetes cuando existan

      combinedItems.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type)
        return (a.name || '').localeCompare(b.name || '')
      })
      setTarifaItems(combinedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar datos.")
      setTarifaEditada(null)
      setTarifaItems([])
    }
  }, [tarifaId])

  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [vatRes, catRes, clinicsRes] = await Promise.all([
                fetch('/api/vat-types'),
                fetch('/api/categories'),
                fetch('/api/clinics') 
            ]);

            if (!vatRes.ok) throw new Error('Error fetching VAT types');
            if (!catRes.ok) throw new Error('Error fetching categories');
            if (!clinicsRes.ok) throw new Error('Error fetching clinics');

            const vatData = await vatRes.json();
            const catData = await catRes.json();
            const clinicsData = await clinicsRes.json();

            setVatTypes(vatData);
            setCategories(catData);
            setAllClinics(clinicsData);

            // Llamar a loadTarifaCompleta DESPUÉS de tener los datos básicos
            await loadTarifaCompleta();

        } catch (error: any) {
            console.error("Failed to load initial data or tariff:", error);
            setError(error.message || "Error al cargar datos.");
            // Asegurarse de limpiar estados si falla la carga inicial
            setTarifaEditada(null);
            setTarifaItems([]);
        } finally {
            setIsLoading(false); // Finalizar carga aquí
        }
    };
    fetchInitialData();
  }, [tarifaId]); 

  const { filteredItems, sortedItems, paginatedItems, totalPages } = useMemo(() => {
    const filtered = tarifaItems.filter(item => {
      const searchTermLower = searchTerm.toLowerCase()
      const searchTermMatch = !searchTerm || 
        item.name.toLowerCase().includes(searchTermLower) || 
        item.code?.toLowerCase().includes(searchTermLower) ||
        item.familyName?.toLowerCase().includes(searchTermLower)
      const typeMatch = !tipoFiltro || tipoFiltro === 'all' || item.type.toLowerCase() === tipoFiltro
      const familyMatch = !familiaFiltro || familiaFiltro === 'all' || item.familyName === familiaFiltro
      const activeMatch = showDisabled || item.isActive
      return searchTermMatch && typeMatch && familyMatch && activeMatch
    })

    let sorted = [...filtered]
    if (sortConfig) {
      sorted.sort((a, b) => {
        const itemA = a as TarifaItem
        const itemB = b as TarifaItem
        let valA = sortConfig.key === 'price' ? itemA.price : getNestedValue(itemA, sortConfig.key)
        let valB = sortConfig.key === 'price' ? itemB.price : getNestedValue(itemB, sortConfig.key)
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA == null && valB != null) return 1
        if (valA != null && valB == null) return -1
        if (valA == null && valB == null) return 0
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1
        return 0
      })
    }

    const newTotalPages = Math.ceil(sorted.length / itemsPerPage) || 1
    const effectiveCurrentPage = Math.max(1, Math.min(currentPage, newTotalPages))
    const startIndex = (effectiveCurrentPage - 1) * itemsPerPage
    const paginated = sorted.slice(startIndex, startIndex + itemsPerPage)

    return { 
      filteredItems: filtered, 
      sortedItems: sorted,
      paginatedItems: paginated, 
      totalPages: newTotalPages 
    }
  }, [tarifaItems, searchTerm, tipoFiltro, familiaFiltro, showDisabled, sortConfig, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const requestSort = (key: keyof TarifaItem) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof TarifaItem) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="ml-1" />
    }
    return sortConfig.direction === "ascending" ? (
      <ChevronUp size={14} className="ml-1" />
    ) : (
      <ChevronDown size={14} className="ml-1" />
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleSelectChange = (value: string, name: keyof TariffFormData) => {
    const newValue = value === 'none' ? null : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setIsDirty(true);
  };

  const handleCheckboxChange = (checked: CheckedState, name: keyof TariffFormData) => {
    if (typeof checked === 'boolean') {
        setFormData(prev => ({ ...prev, [name]: checked }));
        setIsDirty(true);
    }
  };

  const handleEditarTarifa = () => { setEditingTarifa(true) }
  const handleCancelEditTarifa = () => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
    setEditingTarifa(false);
    setIsDirty(false);
  }
  const handleGuardarTarifa = async () => {
    if (!tarifaEditada) return;
    
    const dataToSave: Partial<TariffFormData> = { ...formData };
    
    try {
      const response = await fetch(`/api/tariffs/${tarifaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const updatedTariff: TarifaCompleta = await response.json();
      
      const updatedFormData: TariffFormData = {
          name: updatedTariff.name || "",
          description: updatedTariff.description || null,
          isGeneral: updatedTariff.isGeneral || false,
          applyToAllClinics: updatedTariff.applyToAllClinics || false,
          defaultVatTypeId: updatedTariff.defaultVatTypeId || null,
          isActive: updatedTariff.isActive === undefined ? true : updatedTariff.isActive,
      };
      
      setFormData(updatedFormData);
      setInitialFormData(updatedFormData);
      setEditingTarifa(false);
      setIsDirty(false);
      sonnerToast.success("Detalles de la tarifa actualizados.");
    } catch (error) {
      console.error("Error saving tariff details:", error);
      sonnerToast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleClinicasModalOpen = () => { setIsClinicasModalOpen(true); };
  const handleClinicSelectionChange = (clinicId: string) => {
      setSelectedClinics(prev => {
          const newSet = new Set(prev);
          if (newSet.has(clinicId)) {
              newSet.delete(clinicId);
          } else {
              newSet.add(clinicId);
          }
          return newSet;
      });
      // Marcar como dirty si la selección cambia respecto a la inicial
      const initialClinicIds = new Set(tarifaEditada?.clinics.map(c => c.id) || []);
      setIsDirty(JSON.stringify(Array.from(initialClinicIds).sort()) !== JSON.stringify(Array.from(selectedClinics).sort()));
  };
  const handleSaveClinicas = async () => {
    if (!tarifaEditada) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tariffs/${tarifaId}/clinics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicIds: Array.from(selectedClinics) }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar clínicas');
      }
      sonnerToast.success('Clínicas asociadas actualizadas.');
      setIsClinicasModalOpen(false);
      await loadTarifaCompleta(); // Recargar datos
    } catch (error: any) {
      console.error("Error saving clinics:", error);
      sonnerToast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItemModalOpen = () => { router.push(`/configuracion/servicios`) }
  const handleEditItem = (item: TarifaItem) => {
      console.log("Editar item (precio/IVA tarifa):", item)
      sonnerToast.info(`Editar asociación de ${item.type} "${item.name}" pendiente.`)
  }
  const handleDeleteItem = async (item: TarifaItem) => {
    if (!window.confirm(`¿Desvincular ${item.type.toLowerCase()} "${item.name}" de esta tarifa?`)) return
    const apiUrl = item.type === 'Servicio' 
      ? `/api/tariffs/${item.tariffId}/services/${item.originalId}`
      : `/api/tariffs/${item.tariffId}/products/${item.originalId}`
    try {
      const response = await fetch(apiUrl, { method: 'DELETE' })
      if (!response.ok) { /* ... manejo error ... */ }
      sonnerToast.success(`${item.type} "${item.name}" desvinculado.`)
      loadTarifaCompleta()
    } catch (error) { /* ... manejo error ... */ }
  }

  const handleNuevoServicio = () => router.push(`/configuracion/servicios/nuevo`);
  const handleNuevoProducto = () => router.push(`/configuracion/productos/nuevo`);
  const handleNuevoPaquete = () => router.push(`/configuracion/paquetes/nuevo`);
  const handleNuevoBono = () => router.push(`/configuracion/bonos/nuevo`);
  const navegarATiposIVA = () => router.push(`/configuracion/iva`);
  const navegarATarifasPlanas = () => {
    router.push(`/configuracion/bonos`);
    sonnerToast.info("Navegando a gestión de Bonos/Tarifas planas.");
  }

  const handleDeleteItemClick = (item: TarifaItem) => {
      setItemToDelete(item);
      setNombreItemEliminar(item.name || 'Elemento sin nombre');
    setConfirmEliminarOpen(true);
  };
  
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { type, id: itemId } = itemToDelete;
    const tariffId = params.id as string;
    let endpoint = '';

    if (type === 'Servicio') {
      endpoint = `/api/tariffs/${tariffId}/services/${itemId}`;
    } else if (type === 'Producto') {
      endpoint = `/api/tariffs/${tariffId}/products/${itemId}`;
    } else if (type === 'Paquete') {
      // TODO: endpoint = `/api/tariffs/${tariffId}/packages/${itemId}`;
      sonnerToast.warning("La eliminación de paquetes aún no está implementada.");
      return;
    } else {
        sonnerToast.error("Tipo de item desconocido.");
        return;
    }

    setIsSaving(true); // Podrías usar un estado de carga específico para la eliminación
    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Intenta obtener detalles del error
            throw new Error(errorData.message || `Error ${response.status} al eliminar el item.`);
        }
        sonnerToast.success(`"${nombreItemEliminar}" eliminado de la tarifa.`);
        // Recargar los datos completos o solo filtrar localmente
        await loadTarifaCompleta(); // Recargar para asegurar consistencia

    } catch (error: any) {
        console.error("Error deleting item:", error);
        sonnerToast.error(`Error al eliminar: ${error.message}`);
    } finally {
        setIsSaving(false);
        setItemToDelete(null);
      setConfirmEliminarOpen(false);
    }
  };

  if (isLoading) {
    // Devolver la tabla completa del skeleton
    return renderTarifEditSkeleton(8); // Pasar número de columnas (incluyendo Acciones)
  }

  if (error) {
    return <div className="p-6 text-red-600">Error al cargar la tarifa: {error}</div>;
  }

  if (!tarifaEditada && !isLoading) {
    return <div className="p-6">No se encontró la tarifa o hubo un error al cargarla.</div>;
  }

  return (
    <div className="flex flex-col p-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold">{editingTarifa ? formData.name : (tarifaEditada?.name || 'Cargando Tarifa...')}</h1>
          {!editingTarifa && tarifaEditada && (
            <Button variant="ghost" size="icon" onClick={handleEditarTarifa} className="text-gray-500 hover:text-purple-600">
              <Edit3 className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.back()} className="bg-white">
            Volver
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
             <div className="space-y-4 md:col-span-1">
              <div>
                     <Label htmlFor="name">Nombre Tarifa</Label>
                     <Input id="name" name="name" value={formData.name} onChange={handleInputChange} readOnly={!editingTarifa} />
                 </div>
                 <div>
                     <Label htmlFor="description">Descripción</Label>
                     <Input id="description" name="description" value={formData.description || ''} onChange={handleInputChange} readOnly={!editingTarifa} />
                 </div>
                 <div>
                     <Label htmlFor="defaultVatTypeId">IVA por Defecto</Label>
                     <Select name="defaultVatTypeId"
                             value={formData.defaultVatTypeId || 'none'}
                             onValueChange={(v) => handleSelectChange(v, 'defaultVatTypeId')}
                             disabled={!editingTarifa}>
                         <SelectTrigger><SelectValue placeholder="Seleccionar IVA..." /></SelectTrigger>
                         <SelectContent>
                              <SelectItem value="none">Sin IVA por defecto</SelectItem>
                              {vatTypes.map((vat) => (
                                  <SelectItem key={vat.id} value={vat.id}>{vat.name} ({vat.rate}%)</SelectItem>
                              ))}
                         </SelectContent>
                     </Select>
                 </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="isGeneral" name="isGeneral" checked={formData.isGeneral} onCheckedChange={(c) => handleCheckboxChange(c, 'isGeneral')} disabled={!editingTarifa} />
                    <Label htmlFor="isGeneral">Es Tarifa General</Label>
                 </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="applyToAllClinics" name="applyToAllClinics" checked={formData.applyToAllClinics} onCheckedChange={(c) => handleCheckboxChange(c, 'applyToAllClinics')} disabled={!editingTarifa} />
                    <Label htmlFor="applyToAllClinics">Aplicar a Todas las Clínicas</Label>
                 </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="isActive" name="isActive" checked={formData.isActive} onCheckedChange={(c) => handleCheckboxChange(c, 'isActive')} disabled={!editingTarifa} />
                    <Label htmlFor="isActive">Activa</Label>
                 </div>
            </div>

            <div className="space-y-4 md:col-span-1">
              <div>
                <Label htmlFor="searchTerm">Buscar Item</Label>
                <Input
                  id="searchTerm"
                  placeholder="Nombre, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="tipoFiltro">Tipo</Label>
                <Select value={tipoFiltro} onValueChange={(v: "all" | "Servicio" | "Producto" | "Paquete") => setTipoFiltro(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todos)</SelectItem>
                    <SelectItem value="Servicio">Servicios</SelectItem>
                    <SelectItem value="Producto">Productos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="familiaFiltro">Familia</Label>
                <Select value={familiaFiltro} onValueChange={setFamiliaFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todas)</SelectItem>
                    {categories.map((familia) => (
                      <SelectItem key={familia.id} value={familia.id}>
                        {familia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Exportar
                </Button>
              </div>
            </div>

            <div className="space-y-4 md:col-span-1">
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  className="w-full bg-purple-700 hover:bg-purple-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                    Añadir/Nuevo Item
                </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-56">
                    <DropdownMenuItem onClick={handleNuevoServicio}>
                      <SmilePlus className="w-4 h-4 mr-2" /> Nuevo Servicio Global
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handleNuevoProducto}>
                      <ShoppingCart className="w-4 h-4 mr-2" /> Nuevo Producto Global
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handleNuevoPaquete} disabled>
                      <Package className="w-4 h-4 mr-2" /> Nuevo Paquete Global
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={handleNuevoBono} disabled>
                      <Tag className="w-4 h-4 mr-2" /> Nuevo Bono Global
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Plus className="w-4 h-4 mr-2" /> Añadir Servicio Existente...
                    </DropdownMenuItem>
                     <DropdownMenuItem disabled>
                      <Plus className="w-4 h-4 mr-2" /> Añadir Producto Existente...
                    </DropdownMenuItem>
                     <DropdownMenuItem disabled>
                      <Package className="w-4 h-4 mr-2" /> Añadir Paquete Existente...
                    </DropdownMenuItem>
                     <DropdownMenuItem disabled>
                      <Tag className="w-4 h-4 mr-2" /> Añadir Bono Existente...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>

              <div className="grid grid-cols-1 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="justify-start w-full text-pink-600 border-pink-600 hover:bg-pink-50"
                  onClick={navegarATiposIVA}
                >
                  <Wrench className="w-5 h-5 mr-2" />
                  <span>Tipos de IVA (Global)</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start w-full text-purple-600 border-purple-600 hover:bg-purple-50"
                  onClick={handleClinicasModalOpen}
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  <span>Clínicas asociadas</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start w-full text-lime-600 border-lime-600 hover:bg-lime-50"
                  onClick={navegarATarifasPlanas}
                >
                  <Star className="w-5 h-5 mr-2" />
                  <span>Bonos / Tarifas planas</span>
                </Button>
              </div>
              
              {tarifaEditada?.clinics && tarifaEditada.clinics.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>Clínicas Asociadas ({tarifaEditada.clinics.length})</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tarifaEditada.clinics.map((clinic) => (
                      <Badge key={clinic.id} variant={clinic.isActive ? "secondary" : "outline"} className="whitespace-nowrap">
                         {clinic.name}
                         {!clinic.isActive && <XCircle className="w-3 h-3 ml-1.5 text-red-500"/>}
                      </Badge>
                    ))}
                  </div>
                   {!editingTarifa && (
                     <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs" onClick={handleClinicasModalOpen}>
                       Editar clínicas
                     </Button>
                   )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
         {editingTarifa && (
           <CardFooter className="flex justify-end border-t pt-6">
               <Button variant="outline" onClick={handleCancelEditTarifa} className="mr-2">Cancelar</Button>
               <Button onClick={handleGuardarTarifa} disabled={!isDirty || isSaving}>{isSaving ? 'Guardando...': 'Guardar Cambios Tarifa'}</Button>
           </CardFooter>
       )}
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Items Incluidos ({filteredItems.length})</h2>
      </div>

      <div className="flex items-center justify-end mb-4 space-x-2">
        <span className="text-sm text-gray-600">Mostrar</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">elementos</span>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('type')}>
                 <div className="flex items-center">Tipo {getSortIcon('type')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('categoryId')}>
                  <div className="flex items-center">Familia {getSortIcon('categoryId')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('name')}>
                 <div className="flex items-center">Nombre {getSortIcon('name')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase cursor-pointer" onClick={() => requestSort('code')}>
                 <div className="flex items-center">Código {getSortIcon('code')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase cursor-pointer" onClick={() => requestSort('price')}>
                 <div className="flex items-center justify-end">Precio {getSortIcon('price')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase cursor-pointer" onClick={() => requestSort('vatTypeId')}>
                  <div className="flex items-center justify-end">IVA {getSortIcon('vatTypeId')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-center uppercase cursor-pointer" onClick={() => requestSort('isActive')}>
                 <div className="flex items-center justify-center">Activo {getSortIcon('isActive')}</div>
               </TableHead>
               <TableHead className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems && paginatedItems.length > 0 ? (
               paginatedItems.map((item) => {
                  const categoryName = categories.find(c => c.id === item.categoryId)?.name || item.categoryId || '(Sin Cat.)';
                  const vat = vatTypes.find(v => v.id === item.vatTypeId);
                  const displayVat = vat ? `${vat.name} (${vat.rate}%)` : (item.vatTypeId ? '(IVA Desc.)' : '(Sin IVA)');
                  const displayName = item.name || '(Sin Nombre)';

                  return (
                 <TableRow key={`${item.type}-${item.id}`} className={`${!item.isActive ? 'opacity-50' : ''}`}>
                   <TableCell className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center">
                       {item.type === 'Servicio' ? <SmilePlus size={18} className="text-purple-600" />
                        : item.type === 'Producto' ? <ShoppingCart size={18} className="text-blue-600" />
                        : item.type === 'Paquete' ? <Package size={18} className="text-green-600" />
                        : <SmilePlus size={18} className="text-gray-400" />} 
                       <span className="ml-2 text-xs font-medium text-gray-500 uppercase">{item.type}</span>
                     </div>
                   </TableCell>
                   <TableCell className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{categoryName}</TableCell>
                   <TableCell className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{displayName}</TableCell>
                   <TableCell className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.code || '-'}</TableCell>
                   <TableCell className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap">
                      {typeof item.price === 'number' ? item.price.toFixed(2) + ' €' : '-'}
                   </TableCell>
                   <TableCell className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap">{displayVat}</TableCell>
                   <TableCell className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                       {item.isActive ? <CheckCircle className='h-4 w-4 text-green-600 mx-auto'/> : <X className='h-4 w-4 text-red-500 mx-auto'/>}
                   </TableCell>
                   <TableCell className="px-6 py-4 text-sm text-right whitespace-nowrap">
                     <div className="flex justify-end space-x-1">
                       <Button variant="ghost" size="icon" disabled className="w-8 h-8 p-0 text-indigo-600 hover:text-indigo-900" title="Editar Asociación (Próximamente)"><Edit3 size={16} /></Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteItemClick(item)} className="w-8 h-8 p-0 text-red-600 hover:text-red-900" title="Eliminar Asociación"><Trash2 size={16} /></Button>
                     </div>
                   </TableCell>
                 </TableRow>
                );
               })
             ) : (
               <TableRow>
                 <TableCell colSpan={8} className="px-6 py-4 text-center text-gray-500 h-24">
                    {tarifaItems.length > 0 ? "No hay items que coincidan con los filtros en esta página." : "No hay servicios, productos o paquetes asociados a esta tarifa."}
                 </TableCell>
               </TableRow>
             )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Mostrando {filteredItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length} items
        </div>
        {totalPages > 1 && (
           <div className="flex space-x-1">
             <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft size={16} /></Button>
             <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
             <span className="px-4 py-1.5 text-sm">Página {currentPage} / {totalPages}</span>
             <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
             <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight size={16} /></Button>
           </div>
        )}
      </div>

      <Dialog open={confirmEliminarOpen} onOpenChange={setConfirmEliminarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmar Desvinculación</DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea desvincular <span className="font-semibold">"{nombreItemEliminar}"</span> de esta tarifa?
              <div className="mt-2 text-sm">El {itemToDelete?.type.toLowerCase()} seguirá existiendo globalmente, pero no estará asociado a esta tarifa con su precio/IVA específico.</div>
              <div className="mt-2 font-medium text-red-500">Esta acción no se puede deshacer fácilmente.</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmEliminarOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteItem} disabled={isSaving}>{isSaving ? 'Eliminando...' : 'Confirmar Desvinculación'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClinicasModalOpen} onOpenChange={setIsClinicasModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Clínicas Asociadas a "{tarifaEditada?.name}"</DialogTitle>
            <DialogDescription>
              Selecciona las clínicas donde esta tarifa estará disponible.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              {allClinics.length > 0 ? (
                allClinics.map(clinic => (
                  <div key={clinic.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-accent">
                    <Label htmlFor={`clinic-${clinic.id}`} className="flex items-center cursor-pointer">
                      {clinic.name}
                      {!clinic.isActive && <Badge variant="outline" className="ml-2 text-xs">Inactiva</Badge>}
                    </Label>
                    <Checkbox 
                      id={`clinic-${clinic.id}`} 
                      checked={selectedClinics.has(clinic.id)}
                      onCheckedChange={() => handleClinicSelectionChange(clinic.id)}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-center text-gray-500">No se encontraron clínicas.</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsClinicasModalOpen(false); loadTarifaCompleta(); }}>Cancelar</Button>
            <Button onClick={handleSaveClinicas} disabled={isSaving || !isDirty}> 
               {isSaving ? 'Guardando...' : 'Guardar Cambios Clínicas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

