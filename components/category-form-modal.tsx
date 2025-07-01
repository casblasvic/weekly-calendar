import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/ui/save-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Edit3, Filter, Package, Wrench, Eye, EyeOff, Settings } from "lucide-react";
import { Category } from '@prisma/client';
import { toast as sonnerToast } from "sonner";
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { PaginationControls } from '@/components/pagination-controls';
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import BulkCategoryChanger, { BulkItem } from '@/components/bulk-category-changer';

// Esquema Zod para validación del formulario
const CategoryFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  parentId: z.string().cuid({ message: "ID de categoría padre inválido." }).optional().nullable(),
  equipmentTypeId: z.string().cuid({ message: "ID de tipo de equipamiento inválido." }).optional().nullable(),
});

// Tipo simplificado para el estado del formulario
type CategoryFormData = {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    equipmentTypeId?: string | null;
}

// Interface para Equipment
interface Equipment {
  id: string;
  name: string;
  description?: string;
}

// Interface para items asociados (servicios y productos)
interface AssociatedItem {
  id: string;
  name: string;
  type: 'service' | 'product';
  price?: number;
  isActive?: boolean;
  duration?: number; // Solo para servicios
  sku?: string; // Solo para productos
  barcode?: string; // Solo para productos
  categoryId?: string | null;
  categoryName?: string;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  category: Category | null;
  allCategories: Category[];
  onSave: () => void;
}

export default function CategoryFormModal({ 
  isOpen, 
  setIsOpen, 
  category, 
  allCategories, 
  onSave 
}: CategoryFormModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<CategoryFormData>({});
  const [errors, setErrors] = useState<z.ZodFormattedError<z.infer<typeof CategoryFormSchema>> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para equipamiento
  const [equipmentTypes, setEquipmentTypes] = useState<Equipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [inheritedEquipmentTypeId, setInheritedEquipmentTypeId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados para la tabla de elementos asociados
  const [associatedItems, setAssociatedItems] = useState<AssociatedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemFilter, setItemFilter] = useState<'all' | 'services' | 'products'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('info');

  // ✅ NUEVO: Estados para selección masiva
  const [showBulkChanger, setShowBulkChanger] = useState(false);

  // ✅ NUEVO: Calcular contadores directamente de los datos ya disponibles
  const totalItemsCount = associatedItems.length;
  const servicesCount = associatedItems.filter(item => item.type === 'service').length;
  const productsCount = associatedItems.filter(item => item.type === 'product').length;

  // ✅ NUEVO: Hook de selección masiva
  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    hasSelection,
    selectedItems,
    isSelected,
    toggleItem,
    toggleAll,
    clearSelection
  } = useBulkSelection(associatedItems);

  // Cargar tipos de equipamiento
  useEffect(() => {
    if (isOpen) {
      setLoadingEquipment(true);
      fetch('/api/equipment?simplified=true')
        .then(res => res.json())
        .then(data => setEquipmentTypes(data))
        .catch(err => console.error('Error loading equipment:', err))
        .finally(() => setLoadingEquipment(false));
    }
  }, [isOpen]);

  // Cargar elementos asociados inmediatamente cuando hay categoría
  useEffect(() => {
    if (category && isOpen) {
      loadAssociatedItems();
    } else if (!category) {
      // Limpiar datos cuando no hay categoría (modo creación)
      setAssociatedItems([]);
    }
  }, [category, isOpen]);

  const loadAssociatedItems = async () => {
    if (!category) return;
    
    setLoadingItems(true);
    try {
      const [servicesRes, productsRes] = await Promise.all([
        fetch(`/api/services?categoryId=${category.id}&simplified=true`),
        fetch(`/api/products?categoryId=${category.id}&simplified=true`)
      ]);

      const services = servicesRes.ok ? await servicesRes.json() : [];
      const products = productsRes.ok ? await productsRes.json() : [];

      const items: AssociatedItem[] = [
        ...services.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: 'service' as const,
          price: s.price,
          isActive: s.settings?.isActive ?? true,
          duration: s.durationMinutes,
          categoryId: category.id,
          categoryName: category.name
        })),
        ...products.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: 'product' as const,
          price: p.price,
          isActive: p.settings?.isActive ?? true,
          sku: p.sku,
          barcode: p.barcode,
          categoryId: category.id,
          categoryName: category.name
        }))
      ];

      setAssociatedItems(items);
    } catch (error) {
      console.error('Error loading associated items:', error);
      setAssociatedItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Calcular herencia de equipamiento
  const calculateInheritedEquipment = (parentId: string | null) => {
    if (!parentId || !allCategories.length) return null;
    
    let currentParent = allCategories.find(c => c.id === parentId);
    while (currentParent) {
      if ((currentParent as any).equipmentTypeId) {
        return (currentParent as any).equipmentTypeId;
      }
      currentParent = allCategories.find(c => c.id === currentParent?.parentId);
    }
    return null;
  };

  // Inicializar formulario
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        equipmentTypeId: (category as any).equipmentTypeId || null,
      });
    } else {
      setFormData({ name: '', description: '', parentId: null, equipmentTypeId: null });
    }
    setErrors(null);
    setActiveTab('info'); // Reset a la primera pestaña
    setCurrentPage(1); // Reset paginación
    setItemFilter('all'); // Reset filtro
    clearSelection(); // ✅ NUEVO: Reset selección
  }, [category, isOpen]);

  // Actualizar herencia cuando cambia el padre
  useEffect(() => {
    if (formData.parentId) {
      const inherited = calculateInheritedEquipment(formData.parentId);
      setInheritedEquipmentTypeId(inherited);
      
      if (!formData.equipmentTypeId && inherited) {
        setFormData(prev => ({ ...prev, equipmentTypeId: inherited }));
      }
    } else {
      setInheritedEquipmentTypeId(null);
    }
  }, [formData.parentId, allCategories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleParentChange = (value: string) => {
    setFormData(prev => ({ ...prev, parentId: value === 'none' ? null : value }));
  };

  const handleEquipmentTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, equipmentTypeId: value === 'none' ? null : value }));
  };

  const handleEditItem = (item: AssociatedItem) => {
    const path = item.type === 'service' 
      ? `/configuracion/servicios/${item.id}`
      : `/configuracion/productos/${item.id}`;
    
    // Cerrar modal y navegar
    setIsOpen(false);
    router.push(path);
  };

  // ✅ NUEVO: Manejar cambio masivo de categorías
  const handleBulkCategoryChange = async (itemIds: string[], newCategoryId: string | null, itemType: 'service' | 'product' | 'mixed') => {
    try {
      const response = await fetch('/api/bulk/change-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds,
          itemType,
          newCategoryId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar categorías');
      }

      const result = await response.json();
      
      // Recargar datos
      await loadAssociatedItems();
      clearSelection();
      
      // Recargar categorías en el padre si es necesario
      onSave();

      return result;
    } catch (error) {
      console.error('Error in bulk category change:', error);
      throw error;
    }
  };

  // Filtrar elementos
  const filteredItems = associatedItems.filter(item => {
    if (itemFilter === 'services') return item.type === 'service';
    if (itemFilter === 'products') return item.type === 'product';
    return true;
  });

  // Paginación
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const handleSyncEquipment = async () => {
    if (!category?.id || !formData.equipmentTypeId) return;
    
    setIsSyncing(true);
    try {
      // Guardar categoría
      const dataToValidate = {
        ...formData,
        description: formData.description?.trim() === '' ? null : formData.description,
        parentId: formData.parentId?.trim() === '' ? null : formData.parentId,
        equipmentTypeId: formData.equipmentTypeId?.trim() === '' ? null : formData.equipmentTypeId
      };

      const validationResult = CategoryFormSchema.safeParse(dataToValidate);
      if (!validationResult.success) {
        setErrors(validationResult.error.format());
        throw new Error('Datos de categoría inválidos');
      }

      const saveResponse = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      });
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Error al guardar categoría');
      }

      // Sincronizar servicios
      const syncResponse = await fetch(`/api/categories/${category.id}/sync-equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          equipmentTypeId: formData.equipmentTypeId === 'none' ? null : formData.equipmentTypeId 
        }),
      });
      
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.message || 'Error al sincronizar equipamiento');
      }
      
      const syncResult = await syncResponse.json();
      sonnerToast.success(
        `✅ Proceso completado: Categoría guardada y ${syncResult.updatedServicesCount} servicios sincronizados`
      );
      
      onSave();
      
    } catch (error) {
      console.error("Error en sincronización:", error);
      sonnerToast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrors(null);

    const dataToValidate = {
      ...formData,
      description: formData.description?.trim() === '' ? null : formData.description,
      parentId: formData.parentId?.trim() === '' ? null : formData.parentId,
      equipmentTypeId: formData.equipmentTypeId?.trim() === '' ? null : formData.equipmentTypeId
    };

    const result = CategoryFormSchema.safeParse(dataToValidate);
    if (!result.success) {
      setErrors(result.error.format());
      setIsSaving(false);
      return;
    }

    const dataToSend = result.data;
    const url = category ? `/api/categories/${category.id}` : '/api/categories';
    const method = category ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
           const errorData = await response.json();
           errorMsg = errorData.message || errorMsg;
        } catch(e){}
        throw new Error(errorMsg);
      }

      sonnerToast.success(`Familia ${category ? 'actualizada' : 'creada'} correctamente.`);
      onSave();
      setIsOpen(false);

    } catch (error) {
      console.error("Error saving category:", error);
      sonnerToast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const availableParents = allCategories.filter(c => c.id !== category?.id);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="text-xl">
              {category ? 'Editar Familia' : 'Nueva Familia'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
                <TabsTrigger value="info" className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Información
                </TabsTrigger>
                <TabsTrigger value="items" disabled={!category} className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Servicios y Productos ({totalItemsCount})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="info" className="h-full overflow-auto pr-2 data-[state=active]:flex data-[state=active]:flex-col" style={{ minHeight: '500px', maxHeight: '500px' }}>
                  <div className="space-y-6 pb-4">
                    {/* Nombre */}
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name || ''} 
                        onChange={handleChange} 
                        className="mt-2"
                        placeholder="Nombre de la familia"
                      />
                      {errors?.name?._errors && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.name._errors.join(', ')}
                        </p>
                      )}
                    </div>
                    
                    {/* Descripción */}
                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">
                        Descripción
                      </Label>
                      <Input 
                        id="description" 
                        name="description" 
                        value={formData.description || ''} 
                        onChange={handleChange} 
                        className="mt-2"
                        placeholder="Descripción opcional"
                      />
                      {errors?.description?._errors && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.description._errors.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Familia Padre */}
                    <div>
                      <Label htmlFor="parentId" className="text-sm font-medium">
                        Familia Padre
                      </Label>
                      <Select 
                        value={formData.parentId || 'none'} 
                        onValueChange={handleParentChange}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Seleccionar familia padre" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin familia padre</SelectItem>
                          {availableParents.map(parent => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors?.parentId?._errors && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.parentId._errors.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Equipamiento */}
                    <div>
                      <Label htmlFor="equipmentTypeId" className="text-sm font-medium">
                        Equipamiento
                      </Label>
                      <div className="flex gap-3 mt-2">
                        <Select 
                          value={formData.equipmentTypeId || 'none'} 
                          onValueChange={handleEquipmentTypeChange}
                          disabled={loadingEquipment}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={loadingEquipment ? "Cargando..." : "Sin equipamiento"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin equipamiento</SelectItem>
                            {equipmentTypes.map(equipment => (
                              <SelectItem key={equipment.id} value={equipment.id}>
                                {equipment.name}
                                {equipment.description && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    - {equipment.description}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {category && formData.equipmentTypeId && formData.equipmentTypeId !== 'none' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleSyncEquipment}
                            disabled={isSyncing || isSaving}
                            title="Sincronizar equipamiento con todos los servicios"
                            className="shrink-0"
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                      
                      {inheritedEquipmentTypeId && (
                        <div className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Heredado de familia padre: {equipmentTypes.find(e => e.id === inheritedEquipmentTypeId)?.name}
                        </div>
                      )}
                      
                      {errors?.equipmentTypeId?._errors && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.equipmentTypeId._errors.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="items" className="data-[state=active]:flex data-[state=active]:flex-col" style={{ minHeight: '500px', maxHeight: '500px' }}>
                  <Card className="flex-1 flex flex-col min-h-0">
                    <CardHeader className="flex-shrink-0 pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Elementos Asociados</CardTitle>
                        <div className="flex items-center gap-2">
                          {/* ✅ NUEVO: Botón de acciones masivas */}
                          {hasSelection && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowBulkChanger(true)}
                              className="mr-2"
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Acciones ({selectedCount})
                            </Button>
                          )}
                          
                          <Filter className="w-4 h-4 text-muted-foreground" />
                          <Select value={itemFilter} onValueChange={(value: 'all' | 'services' | 'products') => {
                            setItemFilter(value);
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos ({totalItemsCount})</SelectItem>
                              <SelectItem value="services">
                                Servicios ({servicesCount})
                              </SelectItem>
                              <SelectItem value="products">
                                Productos ({productsCount})
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                      {/* Paginación ARRIBA - Siempre visible */}
                      {totalPages > 1 && (
                        <div className="border-b bg-background px-4 py-2 flex-shrink-0">
                          <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            pageSize={pageSize}
                            onPageSizeChange={(size) => {
                              setPageSize(size);
                              setCurrentPage(1);
                            }}
                            totalCount={totalItems}
                            itemType={itemFilter === 'all' ? 'elementos' : itemFilter === 'services' ? 'servicios' : 'productos'}
                          />
                        </div>
                      )}

                      {/* Tabla con altura fija y scroll independiente */}
                      <div className="flex-1 overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 border-b">
                            <TableRow>
                              {/* ✅ NUEVO: Columna de checkbox */}
                              <TableHead className="w-8">
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={toggleAll}
                                />
                              </TableHead>
                              <TableHead className="w-8"></TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead className="text-center">Tipo</TableHead>
                              <TableHead className="text-right">Precio</TableHead>
                              <TableHead className="text-center">Estado</TableHead>
                              <TableHead className="text-center">Detalles</TableHead>
                              <TableHead className="text-right w-16">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingItems ? (
                              // Skeleton loading
                              Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                                </TableRow>
                              ))
                            ) : paginatedItems.length > 0 ? (
                              paginatedItems.map((item) => (
                                <TableRow key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                                  {/* ✅ NUEVO: Checkbox de selección */}
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected(item.id)}
                                      onCheckedChange={() => toggleItem(item.id)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {item.type === 'service' ? (
                                      <Wrench className="w-4 h-4 text-blue-600" />
                                    ) : (
                                      <Package className="w-4 h-4 text-green-600" />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={item.type === 'service' ? 'default' : 'secondary'}>
                                      {item.type === 'service' ? 'Servicio' : 'Producto'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.price ? `${item.price.toFixed(2)} €` : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={item.isActive ? 'outline' : 'destructive'}>
                                      {item.isActive ? (
                                        <>
                                          <Eye className="w-3 h-3 mr-1" />
                                          Activo
                                        </>
                                      ) : (
                                        <>
                                          <EyeOff className="w-3 h-3 mr-1" />
                                          Inactivo
                                        </>
                                      )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center text-sm text-muted-foreground">
                                    {item.type === 'service' && item.duration ? `${item.duration} min` : ''}
                                    {item.type === 'product' && item.sku ? `SKU: ${item.sku}` : ''}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditItem(item)}
                                      title={`Editar ${item.type === 'service' ? 'servicio' : 'producto'}`}
                                      className="h-8 w-8"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                  {itemFilter === 'all' 
                                    ? 'No hay elementos asociados a esta familia'
                                    : `No hay ${itemFilter === 'services' ? 'servicios' : 'productos'} asociados`
                                  }
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              disabled={isSaving || isSyncing}
            >
              Cancelar
            </Button>
            <SaveButton 
              type="button" 
              onClick={handleSubmit} 
              isSaving={isSaving || isSyncing}
              disabled={false}
              saveText={isSyncing ? 'Sincronizando...' : 'Guardar'}
              savingText={isSaving ? 'Guardando...' : 'Sincronizando...'}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ NUEVO: Modal de cambio masivo de categorías */}
      <BulkCategoryChanger
        isOpen={showBulkChanger}
        onClose={() => setShowBulkChanger(false)}
        selectedItems={selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          categoryId: item.categoryId,
          categoryName: item.categoryName
        }))}
        categories={allCategories}
        onUpdate={handleBulkCategoryChange}
        itemType="mixed"
      />
    </>
  );
} 