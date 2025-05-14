"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronDown, Pencil, Trash2, ShoppingCart, Package, User, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Wrench, SmilePlus, Plus, Edit3, Building2, AlertCircle, X, Star, CheckCircle, CircleDollarSign, Search, Tag, XCircle, Smile, Box, AlertTriangle, Loader2 } from "lucide-react"
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
import { usePathname } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTariffDetailQuery, useUpdateTariffMutation, useUpdateTariffClinicsMutation, useDeleteTariffItemMutation } from "@/lib/hooks/use-tariff-query"
import { useVatTypesQuery } from "@/lib/hooks/use-vat-query"
import { useCategoriesQuery } from "@/lib/hooks/use-category-query"
import { useClinicsQuery } from "@/lib/hooks/use-clinic-query"

// Incluir las relaciones que esperamos de la API en el tipo
type TariffServicePriceWithIncludes = Prisma.TariffServicePriceGetPayload<{
  include: { service: { include: { category: true }}, vatType: true }
}>
type TariffProductPriceWithIncludes = Prisma.TariffProductPriceGetPayload<{
  include: { product: { include: { category: true }}, vatType: true }
}>
type TariffBonoPriceWithIncludes = Prisma.TariffBonoPriceGetPayload<{
  include: { 
    bonoDefinition: { include: { service: true, product: true } },
    vatType: true 
  }
}>
type TariffPackagePriceWithIncludes = Prisma.TariffPackagePriceGetPayload<{
  include: { 
    packageDefinition: { include: { items: { include: { service: true, product: true }}}},
    vatType: true 
  }
}>

type TarifaCompleta = Tariff & {
  clinics: Clinic[];
  defaultVatType: VATType | null;
  servicePrices?: TariffServicePriceWithIncludes[];
  productPrices?: TariffProductPriceWithIncludes[];
  bonoPrices?: TariffBonoPriceWithIncludes[];
  packagePrices?: TariffPackagePriceWithIncludes[];
  isGeneral: boolean;
  applyToAllClinics: boolean;
}

// Interfaz unificada para la tabla
interface TarifaItem { 
  id: string; // ID de la ASOCIACIÓN Tariff*Price (para acciones)
  type: 'Servicio' | 'Producto' | 'Bono' | 'Paquete'; // <<< AÑADIDO Bono y Paquete
  code?: string | null; // Código/SKU del item base (si existe)
  name: string; // Nombre del item base (Servicio, Producto, Bono Def, Paquete Def)
  familyName?: string | null; // Categoría (para Servicio/Producto)
  price: number; // Precio específico de la tarifa
  vatName?: string | null; // Nombre del IVA específico (si existe en Tariff*Price)
  isActive: boolean; // Si está activo en la tarifa (campo de Tariff*Price)
  // IDs originales para referencia y acciones
  tariffId: string; // ID de la tarifa (implícito, pero útil)
  originalItemId: string; // ID del Servicio, Producto, BonoDefinition o PackageDefinition
  baseItemType: 'SERVICE' | 'PRODUCT' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION'; // Para saber qué endpoint DELETE llamar
  categoryId?: string | null; // ID categoría (para Servicio/Producto)
  vatTypeId?: string | null; // ID del IVA específico (si existe en Tariff*Price)
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
  const queryClient = useQueryClient()
  
  const [error, setError] = useState<string | null>(null)
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
  const [isDirty, setIsDirty] = useState(false)
  
  const [tarifaItems, setTarifaItems] = useState<TarifaItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState('all')
  const [familiaFiltro, setFamiliaFiltro] = useState('all')
  const [showDisabled, setShowDisabled] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  
  const [isClinicasModalOpen, setIsClinicasModalOpen] = useState(false)
  const [selectedClinics, setSelectedClinics] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [itemToDelete, setItemToDelete] = useState<TarifaItem | null>(null)
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false)
  const [nombreItemEliminar, setNombreItemEliminar] = useState("")
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isConfirmDeleteBulkOpen, setIsConfirmDeleteBulkOpen] = useState(false)
  const [itemsToDeleteInfo, setItemsToDeleteInfo] = useState<TarifaItem[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  const {
    data: vatTypes = [],
    isLoading: isLoadingVatTypes
  } = useVatTypesQuery();

  const {
    data: categories = [],
    isLoading: isLoadingCategories
  } = useCategoriesQuery();

  const {
    data: allClinics = [],
    isLoading: isLoadingClinics
  } = useClinicsQuery();

  const {
    data: tarifaData,
    isLoading: isLoadingTarifa,
    error: tarifaError
  } = useTariffDetailQuery(tarifaId);

  const isLoading = isLoadingTarifa || isLoadingVatTypes || isLoadingCategories || isLoadingClinics;

  // +++ RESTAURAR FUNCIONES DE ORDENACIÓN +++
  const requestSort = (key: keyof TarifaItem | string) => { // Permitir string por si viene de getNestedValue
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key: key as string, direction }); // castear a string ya que getNested usa string path
    setCurrentPage(1); // Resetear a página 1 al ordenar
  };

  const getSortIcon = (key: keyof TarifaItem | string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="ml-1 text-muted-foreground" />;
    }
    return sortConfig.direction === "ascending" ? (
      <ChevronUp size={14} className="ml-1" />
    ) : (
      <ChevronDown size={14} className="ml-1" />
    );
  };
  // +++ FIN RESTAURAR FUNCIONES +++

  // Procesar los datos de la tarifa cuando se cargan
  useEffect(() => {
    if (tarifaData) {
      // Establecer los datos del formulario
      const initialData: TariffFormData = {
        name: tarifaData.name || "",
        description: tarifaData.description || "",
        isGeneral: tarifaData.isGeneral || false,
        applyToAllClinics: tarifaData.applyToAllClinics || false,
        defaultVatTypeId: tarifaData.defaultVatType?.id || null,
        isActive: tarifaData.isActive === undefined ? true : tarifaData.isActive,
      };
      setFormData(initialData);
      setInitialFormData(initialData);
      
      // Establecer clínicas seleccionadas
      if (tarifaData.clinics) {
        setSelectedClinics(new Set(tarifaData.clinics.map(c => c.id)));
      }
      
      // Resetear estados de edición
      setIsDirty(false);
      setEditingTarifa(false);

      // Transformar los datos relacionados a formato de tabla
      const combinedItems: TarifaItem[] = [];
      
      // Procesar servicios
      if (tarifaData.servicePrices) {
        tarifaData.servicePrices.forEach(sp => {
          if (sp.service) {
            combinedItems.push({
              id: sp.tariffId + '-' + sp.serviceId,
              type: 'Servicio',
              code: sp.service.code,
              name: sp.service.name,
              familyName: sp.service.category?.name,
              price: sp.price,
              vatName: sp.vatType?.name,
              isActive: sp.isActive,
              tariffId: sp.tariffId,
              originalItemId: sp.serviceId,
              baseItemType: 'SERVICE',
              categoryId: sp.service.categoryId,
              vatTypeId: sp.vatTypeId,
            });
          }
        });
      }
      
      // Procesar productos
      if (tarifaData.productPrices) {
        tarifaData.productPrices.forEach(pp => {
          if (pp.product) {
            combinedItems.push({
              id: pp.tariffId + '-' + pp.productId,
              type: 'Producto',
              code: pp.product.sku,
              name: pp.product.name,
              familyName: pp.product.category?.name,
              price: pp.price,
              vatName: pp.vatType?.name,
              isActive: pp.isActive,
              tariffId: pp.tariffId,
              originalItemId: pp.productId,
              baseItemType: 'PRODUCT',
              categoryId: pp.product.categoryId,
              vatTypeId: pp.vatTypeId,
            });
          }
        });
      }
      
      // Procesar bonos
      if (tarifaData.bonoPrices) {
        tarifaData.bonoPrices.forEach(bp => {
          if (bp.bonoDefinition) {
            combinedItems.push({
              id: bp.tariffId + '-' + bp.bonoDefinitionId,
              type: 'Bono',
              code: null,
              name: bp.bonoDefinition.name,
              familyName: bp.bonoDefinition.service?.name ?? bp.bonoDefinition.product?.name ?? 'N/A',
              price: bp.price,
              vatName: bp.vatType?.name,
              isActive: bp.isActive,
              tariffId: bp.tariffId,
              originalItemId: bp.bonoDefinitionId,
              baseItemType: 'BONO_DEFINITION',
              categoryId: null,
              vatTypeId: bp.vatTypeId,
            });
          }
        });
      }
      
      // Procesar paquetes
      if (tarifaData.packagePrices) {
        tarifaData.packagePrices.forEach(pp => {
          if (pp.packageDefinition) {
            combinedItems.push({
              id: pp.tariffId + '-' + pp.packageDefinitionId,
              type: 'Paquete',
              code: null,
              name: pp.packageDefinition.name,
              familyName: pp.packageDefinition.items?.length > 0 
                ? `${pp.packageDefinition.items.length} items` 
                : 'Vacío',
              price: pp.price,
              vatName: pp.vatType?.name,
              isActive: pp.isActive,
              tariffId: pp.tariffId,
              originalItemId: pp.packageDefinitionId,
              baseItemType: 'PACKAGE_DEFINITION',
              categoryId: null,
              vatTypeId: pp.vatTypeId,
            });
          }
        });
      }

      // Ordenar items por tipo y nombre
      combinedItems.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return (a.name || '').localeCompare(b.name || '');
      });
      
      setTarifaItems(combinedItems);
      setSelectedItemIds(new Set());
    }
  }, [tarifaData]);

  const filteredItems = useMemo(() => {
    let items = tarifaItems;
    if (searchTerm) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (tipoFiltro !== 'all') {
      items = items.filter(item => item.type === tipoFiltro);
    }
    if (!showDisabled) {
      items = items.filter(item => item.isActive);
    }
    return items;
  }, [tarifaItems, searchTerm, tipoFiltro, showDisabled]);

  const sortedItems = useMemo(() => {
    let items = [...filteredItems];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredItems, sortConfig]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  const handleSelectAll = (checked: CheckedState) => {
    if (checked === true) {
      setSelectedItemIds(new Set(sortedItems.map(item => item.id)));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: CheckedState) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const isAllFilteredSelected = sortedItems.length > 0 && selectedItemIds.size === sortedItems.length;
  const isSomeFilteredSelected = selectedItemIds.size > 0 && selectedItemIds.size < sortedItems.length;
  const selectAllCheckedState: CheckedState = isAllFilteredSelected ? true : isSomeFilteredSelected ? 'indeterminate' : false;

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
  const handleGuardarTarifa = () => {
    if (!tarifaData) return;
    updateTariffMutation.mutate({ 
      id: tarifaId, 
      data: { ...formData } 
    });
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
      const initialClinicIds = new Set(tarifaData?.clinics.map(c => c.id) || []);
      setIsDirty(JSON.stringify(Array.from(initialClinicIds).sort()) !== JSON.stringify(Array.from(selectedClinics).sort()));
  };
  const handleSaveClinicas = () => {
    if (!tarifaData) return;
    setIsSaving(true);
    updateClinicsMutation.mutate({
      tariffId: tarifaId,
      clinicIds: Array.from(selectedClinics)
    });
  };

  const handleAddItemModalOpen = () => router.push(`/configuracion/servicios`)
  const handleEditItem = (item: TarifaItem) => {
      console.log("Editar item (precio/IVA tarifa):", item)
      sonnerToast.info(`Editar asociación de ${item.type} "${item.name}" pendiente.`)
  }
  const handleDeleteItem = async (item: TarifaItem) => {
    if (!window.confirm(`¿Desvincular ${item.type.toLowerCase()} "${item.name}" de esta tarifa?`)) return
    const apiUrl = item.type === 'Servicio' 
      ? `/api/tariffs/${item.tariffId}/services/${item.originalItemId}`
      : `/api/tariffs/${item.tariffId}/products/${item.originalItemId}`
    try {
      const response = await fetch(apiUrl, { method: 'DELETE' })
      if (!response.ok) { /* ... manejo error ... */ }
      sonnerToast.success(`${item.type} "${item.name}" desvinculado.`)
    } catch (error) { /* ... manejo error ... */ }
  }

  const handleNuevoServicio = () => router.push(`/configuracion/servicios/nuevo`);
  const handleNuevoProducto = () => router.push(`/configuracion/productos/nuevo`);
  const handleNuevoPaquete = () => router.push(`/configuracion/paquetes/nuevo`);
  const handleNuevoBono = () => router.push(`/configuracion/bonos/nuevo`);
  const navegarATiposIVA = () => router.push(`/configuracion/iva`);
  const navegarATarifasPlanas = () => {
    console.log("Navegar a tarifas planas (placeholder)")
  };

  const handleDeleteItemClick = (item: TarifaItem) => {
      setItemToDelete(item);
      setNombreItemEliminar(item.name || 'Elemento sin nombre');
    setConfirmEliminarOpen(true);
  };
  
  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    setIsSaving(true);
    deleteItemMutation.mutate({
      tariffId: tarifaId,
      type: itemToDelete.baseItemType,
      itemId: itemToDelete.originalItemId
    });
  };

  // Función que se llamará al seleccionar "Añadir servicio"
  const handleAddServiceClick = () => {
    if (tarifaId) {
      // Navegar a la página de servicios pasando el ID de la tarifa actual
      router.push(`/configuracion/servicios?selectForTariff=${tarifaId}`);
    } else {
      // Manejar caso donde tarifaId no esté disponible (poco probable)
      sonnerToast.error("No se pudo determinar la tarifa actual para añadir servicios.");
    }
    setMenuOpen(false); // Cerrar el menú desplegable
  };

  const handleAddBonoClick = () => {
    if (!tarifaId) return;
    // Navega a la lista de BONOS en modo selección
    router.push(`/configuracion/bonos?selectForTariff=${tarifaId}`);
  };

  const handleAddPackageClick = () => {
    if (!tarifaId) return;
    // Navega a la lista de PAQUETES en modo selección
    router.push(`/configuracion/paquetes?selectForTariff=${tarifaId}`);
  };

  // === Handlers para Borrado en Bloque ===
  const handleOpenConfirmDeleteDialog = () => {
      const items = sortedItems.filter(item => selectedItemIds.has(item.id));
      if (items.length === 0) {
          sonnerToast.info("No hay ítems seleccionados para quitar.");
          return;
      }
      setItemsToDeleteInfo(items);
      setIsConfirmDeleteBulkOpen(true);
  };

  // Mutación para eliminar items (se podría hacer más sofisticada con Promise.allSettled)
  const deleteItemsMutation = useMutation({
      mutationFn: async (itemsInfo: TarifaItem[]) => {
          setIsDeletingBulk(true);
          const promises = itemsInfo.map(item => {
              // Construir la URL correcta basada en el tipo de item base
              let endpointType = '';
              switch (item.baseItemType) {
                  case 'SERVICE': endpointType = 'services'; break;
                  case 'PRODUCT': endpointType = 'products'; break;
                  case 'BONO_DEFINITION': endpointType = 'bonos'; break;
                  case 'PACKAGE_DEFINITION': endpointType = 'packages'; break;
                  default: return Promise.reject(`Tipo de item desconocido: ${item.baseItemType}`);
              }
              const url = `/api/tariffs/${item.tariffId}/${endpointType}/${item.originalItemId}`;
              return fetch(url, { method: 'DELETE' });
          });

          const results = await Promise.allSettled(promises);
          
          const successes: TarifaItem[] = [];
          const failures: { item: TarifaItem; reason: string }[] = [];

          results.forEach((result, index) => {
              const item = itemsInfo[index];
              if (result.status === 'fulfilled' && result.value.ok) {
                  successes.push(item);
              } else {
                  let reason = 'Error desconocido';
                  if (result.status === 'rejected') {
                      reason = result.reason?.message || String(result.reason);
                  } else if (!result.value.ok) {
                      reason = `Error ${result.value.status}`;
                      // Podríamos intentar leer el body del error aquí si fuera necesario
                  }
                  failures.push({ item, reason });
              }
          });

          return { successes, failures };
      },
      onSuccess: (data) => {
          if (data.successes.length > 0) {
              sonnerToast.success(`${data.successes.length} ítem(s) quitado(s) de la tarifa.`);
              // Actualizar estado local o recargar
              setTarifaItems(prev => prev.filter(item => 
                  !data.successes.some(deleted => deleted.id === item.id)
              ));
              setSelectedItemIds(new Set()); // Limpiar selección
          }
          if (data.failures.length > 0) {
              sonnerToast.error(`No se pudieron quitar ${data.failures.length} ítem(s).`, {
                  description: (
                      <ul>
                          {data.failures.slice(0, 5).map(f => <li key={f.item.id}>• {f.item.name}: {f.reason}</li>)} 
                          {data.failures.length > 5 && <li>... y {data.failures.length - 5} más</li>}
                      </ul>
                  )
              });
              // Mantener seleccionados los que fallaron?
              setSelectedItemIds(prev => {
                    const next = new Set(prev);
                    data.successes.forEach(s => next.delete(s.id)); // Quitar los exitosos
                    return next;
              });
          }
      },
      onError: (error: any) => {
          sonnerToast.error("Error inesperado al quitar ítems: " + error.message);
      },
      onSettled: () => {
          setIsConfirmDeleteBulkOpen(false);
          setIsDeletingBulk(false);
          setItemsToDeleteInfo([]);
      }
  });

  const handleConfirmDeleteBulk = () => {
      deleteItemsMutation.mutate(itemsToDeleteInfo);
  };
  // === Fin Handlers Borrado en Bloque ===

  // Reemplazar la definición manual de la mutación por el uso de los hooks especializados
  const updateTariffMutation = useUpdateTariffMutation();
  const updateClinicsMutation = useUpdateTariffClinicsMutation();
  const deleteItemMutation = useDeleteTariffItemMutation();

  // Añadir manejadores de onSuccess y onError para las mutaciones
  // Para updateTariffMutation
  useEffect(() => {
    if (updateTariffMutation.isSuccess && updateTariffMutation.data) {
      const data = updateTariffMutation.data as any; // Cast a any para acceder a las propiedades sin errores de tipo
      const updatedFormData: TariffFormData = {
        name: data.name || "",
        description: data.description || null,
        isGeneral: data.isGeneral || false,
        applyToAllClinics: data.applyToAllClinics || false,
        defaultVatTypeId: data.defaultVatType?.id || null,
        isActive: data.isActive === undefined ? true : data.isActive,
      };
      
      setFormData(updatedFormData);
      setInitialFormData(updatedFormData);
      setEditingTarifa(false);
      setIsDirty(false);
      sonnerToast.success("Detalles de la tarifa actualizados.");
    }
    
    if (updateTariffMutation.isError) {
      console.error("Error saving tariff details:", updateTariffMutation.error);
      sonnerToast.error(`Error al guardar: ${typeof updateTariffMutation.error === 'object' && updateTariffMutation.error !== null 
        ? String((updateTariffMutation.error as any).message || 'Error desconocido') 
        : 'Error desconocido'}`);
    }
  }, [updateTariffMutation.isSuccess, updateTariffMutation.isError, updateTariffMutation.data, updateTariffMutation.error]);

  // Para updateClinicsMutation
  useEffect(() => {
    if (updateClinicsMutation.isSuccess) {
      sonnerToast.success('Clínicas asociadas actualizadas.');
      setIsClinicasModalOpen(false);
      setIsSaving(false);
    }
    
    if (updateClinicsMutation.isError) {
      console.error("Error saving clinics:", updateClinicsMutation.error);
      sonnerToast.error(`Error: ${typeof updateClinicsMutation.error === 'object' && updateClinicsMutation.error !== null 
        ? String((updateClinicsMutation.error as any).message || 'Error desconocido')
        : 'Error desconocido'}`);
      setIsSaving(false);
    }
  }, [updateClinicsMutation.isSuccess, updateClinicsMutation.isError, updateClinicsMutation.error]);

  // Para deleteItemMutation
  useEffect(() => {
    if (deleteItemMutation.isSuccess) {
      sonnerToast.success(`"${nombreItemEliminar}" desvinculado de la tarifa.`);
      setTarifaItems(prev => prev.filter(item => 
        !(item.originalItemId === itemToDelete?.originalItemId && item.baseItemType === itemToDelete?.baseItemType)
      ));
      setIsSaving(false);
      setItemToDelete(null);
      setConfirmEliminarOpen(false);
    }
    
    if (deleteItemMutation.isError) {
      console.error("Error deleting item:", deleteItemMutation.error);
      sonnerToast.error(`Error al desvincular: ${typeof deleteItemMutation.error === 'object' && deleteItemMutation.error !== null 
        ? String((deleteItemMutation.error as any).message || 'Error desconocido')
        : 'Error desconocido'}`);
      setIsSaving(false);
      setItemToDelete(null);
      setConfirmEliminarOpen(false);
    }
  }, [deleteItemMutation.isSuccess, deleteItemMutation.isError, deleteItemMutation.error, nombreItemEliminar, itemToDelete]);

  if (isLoading) {
    return renderTarifEditSkeleton(9);
  }

  if (tarifaError) {
    const errorMessage = typeof tarifaError === 'object' && tarifaError !== null 
                        ? String((tarifaError as any).message || 'Error desconocido') 
                        : 'Error desconocido';
    return <div className="p-6 text-red-600">Error al cargar la tarifa: {errorMessage}</div>;
  }

  if (!tarifaData) {
    return <div className="p-6">No se encontró la tarifa o hubo un error al cargarla.</div>;
  }

  return (
    <div className="flex flex-col p-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold">{editingTarifa ? formData.name : (tarifaData?.name || 'Cargando Tarifa...')}</h1>
          {!editingTarifa && tarifaData && (
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
                     <Select
                       name="defaultVatTypeId"
                       value={formData.defaultVatTypeId ?? ""}
                       onValueChange={(value) => handleSelectChange(value, 'defaultVatTypeId')}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Seleccionar IVA" />
                       </SelectTrigger>
                         <SelectContent>
                         {vatTypes.map(vat => (
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
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="tipoFiltro">Tipo</Label>
                <Select value={tipoFiltro} onValueChange={(v: "all" | "Servicio" | "Producto" | "Bono" | "Paquete") => { setTipoFiltro(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todos)</SelectItem>
                    <SelectItem value="Servicio">Servicios</SelectItem>
                    <SelectItem value="Producto">Productos</SelectItem>
                    <SelectItem value="Bono">Bonos</SelectItem>
                    <SelectItem value="Paquete">Paquetes</SelectItem>
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
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Añadir Nuevo Ítem <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" ref={menuRef}>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleAddServiceClick(); // Llamar a la función de navegación
                    }}
                    className="cursor-pointer"
                  >
                    <Smile className="mr-2 h-4 w-4 text-blue-500" />
                    <span>Añadir servicio</span>
                    </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={() => router.push(`/configuracion/productos?selectForTariff=${tarifaId}`)}
                    className="cursor-pointer"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4 text-green-500" />
                    <span>Añadir producto</span>
                    </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleAddBonoClick();
                    }}
                     className="cursor-pointer"
                  >
                    <Tag className="mr-2 h-4 w-4 text-purple-500" />
                    <span>Añadir bono</span>
                    </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleAddPackageClick();
                    }}
                     className="cursor-pointer"
                  >
                    <Box className="mr-2 h-4 w-4 text-orange-500" />
                    <span>Añadir paquete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>

              <div className="grid grid-cols-1 gap-3 mt-4">
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
              
              {tarifaData?.clinics && tarifaData.clinics.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>Clínicas Asociadas ({tarifaData.clinics.length})</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tarifaData.clinics.map((clinic) => (
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

      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
         {/* Parte Izquierda: Filtros */}
         <div className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
              <Input 
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="max-w-xs"
              />
              <Select value={tipoFiltro} onValueChange={(v) => { setTipoFiltro(v); setCurrentPage(1); }}>
                  {/* ... Select tipo ... */}
              </Select>
              <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="show-disabled-items"
                        checked={showDisabled}
                        onCheckedChange={(checked) => setShowDisabled(checked as boolean)}
                    />
                    <Label htmlFor="show-disabled-items" className="text-sm font-medium">
                        Mostrar inactivos
                    </Label>
               </div>
         </div>
          {/* Parte Derecha: Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
               {/* <<< Botón Quitar Seleccionados >>> */}
               <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedItemIds.size === 0 || isDeletingBulk}
                    onClick={handleOpenConfirmDeleteDialog}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar {selectedItemIds.size > 0 ? `(${selectedItemIds.size}) ` : ''}de Tarifa
                </Button>
               {/* <<< Selector de Items por Página (MOVIDO AQUÍ) >>> */}
               <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                   <span>Mostrar</span>
                   <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                     <SelectTrigger className="w-20 h-9 text-xs"><SelectValue /></SelectTrigger> {/* Ajustar tamaño */} 
                     <SelectContent>
                       <SelectItem value="10">10</SelectItem>
                       <SelectItem value="25">25</SelectItem>
                       <SelectItem value="50">50</SelectItem>
                       <SelectItem value="100">100</SelectItem>
                     </SelectContent>
                   </Select>
                   <span>elementos</span>
               </div>
                {/* Menú Añadir Nuevo Item */}
               <DropdownMenu>
                  {/* ... Dropdown Añadir Item ... */}
               </DropdownMenu>
           </div>
       </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
               <TableHead className="w-[50px]">
                   <Checkbox 
                       checked={selectAllCheckedState}
                       onCheckedChange={handleSelectAll}
                       aria-label="Seleccionar todos los items visibles"
                   />
               </TableHead>
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
                  const category = categories.find(c => c.id === item.categoryId);
                  const displayCategoryName = category?.name || '-';
                  const vat = vatTypes.find(v => v.id === item.vatTypeId);
                  const displayVat = vat ? `${vat.name} (${vat.rate}%)` : (item.vatTypeId ? '(IVA Desc.)' : '(Sin IVA)');
                  const displayName = item.name || '(Sin Nombre)';

                  return (
                 <TableRow key={item.id} data-state={selectedItemIds.has(item.id) ? 'selected' : undefined}>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                        <Checkbox 
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                            aria-label={`Seleccionar item ${displayName}`}
                        />
                    </TableCell>
                   <TableCell className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center">
                       {item.type === 'Servicio' ? <Smile size={18} className="text-blue-500" />
                        : item.type === 'Producto' ? <ShoppingCart size={18} className="text-green-500" />
                        : item.type === 'Bono' ? <Tag size={18} className="text-purple-500" /> 
                        : <Box size={18} className="text-orange-500" />} 
                       <span className="ml-2 text-xs font-medium text-gray-500 uppercase">{item.type}</span>
                     </div>
                   </TableCell>
                   <TableCell className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{displayCategoryName}</TableCell>
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
                 <TableCell colSpan={9} className="px-6 py-4 text-center text-gray-500 h-24">
                    {tarifaItems.length > 0 ? "No hay items que coincidan con los filtros en esta página." : "No hay servicios, productos, bonos o paquetes asociados a esta tarifa."}
                 </TableCell>
               </TableRow>
             )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
            {selectedItemIds.size} de {sortedItems.length} ítems filtrados seleccionados.
        </div>
        {totalPages > 1 && (
             <PaginationControls 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
             />
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
            <DialogTitle>Editar Clínicas Asociadas a "{tarifaData?.name}"</DialogTitle>
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
            <Button variant="outline" onClick={() => { setIsClinicasModalOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSaveClinicas} disabled={isSaving || !isDirty}> 
               {isSaving ? 'Guardando...' : 'Guardar Cambios Clínicas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDeleteBulkOpen} onOpenChange={setIsConfirmDeleteBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-3" />
            <DialogTitle className="text-xl">Confirmar Eliminación Múltiple</DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground">
              ¿Estás seguro de que quieres quitar los <span className="font-semibold text-foreground">{itemsToDeleteInfo.length}</span> ítems seleccionados de esta tarifa?
              <br />
              Esta acción eliminará su precio específico en esta tarifa. 
            </DialogDescription>
          </DialogHeader>
          {itemsToDeleteInfo.length > 0 && itemsToDeleteInfo.length <= 7 && (
            <div className="max-h-40 overflow-y-auto px-4 py-2 border rounded-md my-4">
              <p className="text-sm font-medium mb-2">Ítems a quitar:</p>
              <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                {itemsToDeleteInfo.map(it => <li key={it.id}>{it.name} ({it.type})</li>)}
              </ul>
            </div>
          )}
          <DialogFooter className="sm:justify-center gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsConfirmDeleteBulkOpen(false)} disabled={isDeletingBulk}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteBulk} disabled={isDeletingBulk}>
              {isDeletingBulk ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Quitando...</>
              ) : (
                'Sí, quitar ítems'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

