"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as sonnerToast } from "sonner";
import { Plus, Search, Pencil, Trash2, ArrowUpDown, ChevronUp, ChevronDown, CircleDollarSign, Package as PackageIcon, CheckCircle, XCircle, FilterX, ArrowLeft, HelpCircle, Settings2 } from "lucide-react"; // Renombrar Package para evitar conflicto
import { ProductFormModal } from "@/components/product-form-modal"; // Importamos el modal aunque no lo usemos directamente aquí
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // <<< Añadir useQuery y useMutation
import { Badge } from "@/components/ui/badge"; // Para mostrar "Asignado"
import { 
    ColumnDef, 
    flexRender, 
    getCoreRowModel, 
    getFilteredRowModel, 
    getPaginationRowModel, 
    getSortedRowModel, 
    SortingState, 
    useReactTable, 
    RowSelectionState, 
    VisibilityState,
    ColumnFiltersState,
    FilterFn,
    Row,
    Column,
    Table as ReactTableType, // Renombrar Table para evitar conflicto con el de shadcn
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox"; // Para la columna de selección
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Para filtros
import { Label } from "@/components/ui/label"; // Para filtros
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/pagination-controls";
import { PageSizeSelector } from '@/components/pagination-controls';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AssociateToTariffModal } from "@/components/tariff/associate-to-tariff-modal";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { CheckedState } from "@radix-ui/react-checkbox"; // <<< Importar tipo CheckedState
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { type ProductWithIncludes as PrismaProductWithIncludes } from '@/lib/types/product-types'; // <<< NUEVA IMPORTACIÓN

// Importar los hooks optimizados
import { useProductsQuery, useDeleteProductMutation, useAddProductsToTariffMutation } from '@/lib/hooks/use-product-query';
import { useCategoriesQuery } from '@/lib/hooks/use-category-query';
import { useVatTypesQuery } from '@/lib/hooks/use-vat-query';
import { useTariffsQuery, useTariffProductsQuery } from '@/lib/hooks/use-tariff-query';
import BulkCategoryChanger, { BulkItem } from '@/components/bulk-category-changer';

// Extender el tipo Product para incluir relaciones opcionales
type ProductWithIncludes = PrismaProductWithIncludes & {
  // Campos derivados para la tabla (estos se calculan en el frontend)
  rowIsActive: boolean; 
  isAssignedToTariff?: boolean; 
  assignedTariffNames: string[];
};

// <<< Definir función de filtro global >>>
const globalFilterFn: FilterFn<ProductWithIncludes> = (
  row: Row<ProductWithIncludes>,
  columnId: string, // No se usa directamente aquí, pero es parte de la firma
  value: string,
  addMeta: (meta: any) => void
) => {
  // return true; // <<< DEVOLVER SIEMPRE TRUE PARA DESHABILITAR LÓGICA DE FILTRADO (COMENTADO)
  // <<< INICIO LÓGICA DE FILTRO RESTAURADA >>>
  const searchTerm = value.toLowerCase();

  // Extraer valores relevantes de la fila
  const productName = row.original.name?.toLowerCase() ?? '';
  const productSku = row.original.sku?.toLowerCase() ?? '';
  const productDescription = row.original.description?.toLowerCase() ?? '';
  const categoryName = row.original.category?.name?.toLowerCase() ?? '';
  
  // Comprobar si alguno de los campos incluye el término de búsqueda
  return (
    productName.includes(searchTerm) ||
    productSku.includes(searchTerm) ||
    productDescription.includes(searchTerm) ||
    categoryName.includes(searchTerm)
  );
  // <<< FIN LÓGICA DE FILTRO RESTAURADA >>>
};

// Definición de la filterFn personalizada para tariffAssignment
const tariffAssignmentFilterFn: FilterFn<ProductWithIncludes> = (row, columnId, filterValue) => {
  const product = row.original;
  const productName = product.name;
  const productPrices = product.productPrices; 

  console.log(`[Filter tariffAssignment] Producto: "${productName}", Filtro Aplicado: "${filterValue}"`);
  console.log(`  > productPrices:`, productPrices);

  if (filterValue === 'unassigned') {
    const isUnassigned = !productPrices || productPrices.length === 0;
    console.log(`  > Caso "unassigned": Producto "${productName}" ${isUnassigned ? 'SÍ' : 'NO'} está desasignado. Devuelve: ${isUnassigned}`);
    return isUnassigned;
  }

  // filterValue es un tariffId
  if (productPrices && productPrices.length > 0) {
    const isAssignedToThisTariff = productPrices.some(price => {
      console.log(`    >> Comparando price.tariff.id (${price.tariff?.id}) === filterValue (${filterValue})`);
      return price.tariff?.id === filterValue;
    });
    console.log(`  > Caso "tariffId (${filterValue})": Producto "${productName}" ${isAssignedToThisTariff ? 'SÍ' : 'NO'} está asignado a esta tarifa. Devuelve: ${isAssignedToThisTariff}`);
    return isAssignedToThisTariff;
  }
  
  console.log(`  > Caso por defecto (no debería ocurrir si filterValue es válido y hay productPrices): Producto "${productName}". Devuelve: false`);
  return false;
};

// <<< Añadir tipo para Categorías (simplificado) >>>
interface SimpleCategory {
  id: string;
  name: string;
}

// <<< NUEVO: Tipo simple para Tarifas >>>
interface SimpleTariff {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 15;

export default function GestionProductos() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient(); // Para invalidar queries
  const isMounted = useRef(true); // <<< AÑADIR REF
  
  // <<< Detectar modo selección y obtener tariffId >>>
  const tariffIdParam = searchParams?.get("selectForTariff");
  const isSelectionMode = !!tariffIdParam;
  
  // Estados para react-table
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // <<< Estados para filtros visibles (categoría y estado) >>>
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  // <<< NUEVO: Estado para filtro de asignación >>>
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all'); // 'all', 'unassigned', o tariffId
  
  // Estado para confirmación de borrado
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithIncludes | null>(null);
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Estado para el popover del combobox de categoría
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  // Consultas optimizadas con TanStack Query
  const { data: categoriesDataFound, isLoading: isLoadingCategoriesData } = useCategoriesQuery(); 
  const categories: SimpleCategory[] = useMemo(() => 
    categoriesDataFound?.map(c => ({ id: c.id, name: c.name ?? 'Sin nombre' })) ?? [],
  [categoriesDataFound]);
  const isLoadingCategories = isLoadingCategoriesData;

  const { data: allTariffsData, isLoading: isLoadingTariffsData } = useTariffsQuery();
  const allTariffs: SimpleTariff[] = useMemo(() => 
    allTariffsData?.map(t => ({ id: t.id, name: t.name ?? 'Sin nombre' })) ?? [], 
  [allTariffsData]);
  const isLoadingTariffs = isLoadingTariffsData;

  // Cargar IDs de productos existentes en la tarifa usando el hook optimizado
  const { 
    data: existingProductIdsInTariff = [], 
    // isLoading: isLoadingExistingProducts, // Podríamos necesitar este para deshabilitar selección de ya existentes
    // isError: isErrorExistingProducts,
    // error: errorExistingProducts
  } = useTariffProductsQuery(tariffIdParam, {
    enabled: isSelectionMode, // Solo ejecutar si estamos en modo selección para una tarifa
    select: (data) => data.map((price: any) => price.productId || price.id) // Ajustar según la estructura de datos de TariffProductPrice
  });
  // const isLoadingExistingProducts = false;
  // const isErrorExistingProducts = false;

  // Consulta de productos optimizada
  const { 
    data: productsDataOriginal, 
    isLoading: isLoadingProductsOriginal, 
    error: productsErrorOriginal,
  } = useProductsQuery(); 
  
  // Mantener estos hardcodeados por ahora para aislar el efecto de la query
  // const productsData: ProductWithIncludes[] = []; 
  // const isLoadingProducts = false; 
  // const productsError = null;    

  // Mutación para eliminar producto
  const deleteProductMutation = useDeleteProductMutation();

  // Usar el hook optimizado para añadir productos a una tarifa
  const addProductsMutation = useAddProductsToTariffMutation();
  // const isAddingProducts = false; // addProductsMutation.isPending; // Se puede usar addProductsMutation.isPending directamente

  const processedProducts = useMemo(() => {
    // Si productsDataOriginal no está definido o está vacío, devuelve un array vacío.
    if (!productsDataOriginal) return []; 

    return productsDataOriginal.map(product => ({
      ...product,
      rowIsActive: product.settings?.isActive ?? false, 
      // Mantener placeholders por ahora, se necesitará lógica más compleja para llenarlos desde product.productPrices
      isAssignedToTariff: product.productPrices && product.productPrices.length > 0, 
      assignedTariffNames: product.productPrices?.map(pp => pp.tariff.name ?? 'Tarifa sin nombre') ?? [], 
    })) as ProductWithIncludes[];
  }, [productsDataOriginal]);
    
  const isLoading = isLoadingProductsOriginal || isLoadingCategories || isLoadingTariffs; 
  const error = productsErrorOriginal /* || errorExistingProducts || otros errores */; 
  
  // ✅ NUEVO: Estados para selección masiva de categorías
  const [showBulkCategoryChanger, setShowBulkCategoryChanger] = useState(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // useEffect para depurar datos de productos
  useEffect(() => {
    if (productsDataOriginal) {
      console.log("Datos de useProductsQuery (productsDataOriginal - primeros 2):", JSON.stringify(productsDataOriginal.slice(0, 2), null, 2));
    } else {
      console.log("productsDataOriginal está undefined o vacío.");
    }
    if (processedProducts.length > 0) {
      console.log("Datos procesados para la tabla (processedProducts - primeros 2):", JSON.stringify(processedProducts.slice(0, 2), null, 2));
    } else {
      console.log("processedProducts está vacío.");
    }
  }, [productsDataOriginal, processedProducts]);
  
  // <<< NUEVO/REINTRODUCIDO useEffect para sincronizar filtros de UI con columnFilters de la tabla >>>
  useEffect(() => {
    const newFilters: ColumnFiltersState = [];
    
    if (!isSelectionMode && assignmentFilter !== 'all') {
      // Apuntar al nuevo id de columna. El filtrado real necesitará una filterFn personalizada.
      newFilters.push({ id: 'tariffAssignment', value: assignmentFilter }); 
    }

    if (categoryFilter !== 'all') {
      // Usamos 'category.name' como id porque así está definido el accessorKey en la columna de categoría
      newFilters.push({ id: 'category.name', value: categoryFilter }); 
    }
    
    if (statusFilter !== 'all') { 
      // La columna 'status' espera un booleano (rowIsActive). 
      // Si statusFilter es 'active', el valor es true, si es 'inactive', es false.
      newFilters.push({ id: 'status', value: statusFilter === 'active' }); 
    }

    if (isMounted.current) { // <<< AÑADIR COMPROBACIÓN
      setColumnFilters(newFilters);
    }

  }, [assignmentFilter, categoryFilter, statusFilter, isSelectionMode, setColumnFilters]); // Añadir statusFilter a las dependencias
  
  const handleNuevoProducto = () => {
    router.push('/configuracion/productos/nuevo');
  };

  const handleEditarProducto = useCallback((productId: string) => {
    router.push(`/configuracion/productos/${productId}`);
  }, [router]);

  const handleOpenDeleteConfirm = useCallback((product: ProductWithIncludes) => {
    setProductToDelete(product);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = () => {
    if (!productToDelete) return;

    deleteProductMutation.mutate(productToDelete.id, {
      onSuccess: () => {
        sonnerToast.success(`Producto "${productToDelete.name}" eliminado correctamente.`);
        // Asegúrate que la queryKey aquí coincide con la usada en useProductsQuery
        queryClient.invalidateQueries({ queryKey: ['products'] }); 
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
      },
      onError: (error: Error) => { // Especificar el tipo de error si se conoce, o usar Error general
        sonnerToast.error(`Error al eliminar el producto: ${error.message}`);
        // Considera no cerrar el modal automáticamente en caso de error, o dar más feedback.
        // setIsDeleteConfirmOpen(false); 
        // setProductToDelete(null);
      },
    });
  };

  // const handleCloseDeleteConfirm = useCallback(() => { // No es estrictamente necesario si se usa onOpenChange
  //   setIsDeleteConfirmOpen(false);
  //   setProductToDelete(null);
  // }, []);
  
  // <<< INICIO: Definición Columnas react-table >>>
  const columns = useMemo<ColumnDef<ProductWithIncludes>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected?.()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected?.(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected?.()}
          onCheckedChange={(value) => row.toggleSelected?.(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name', // Se necesita un accessorKey aunque sea estático para que la tabla funcione
      header: 'Nombre', // Cambiado de función a string simple para el encabezado
      cell: ({ row }) => {
        // Asegurarnos que product.name existe y es un string antes de renderizarlo
        const name = row.getValue('name');
        return <span className="font-medium">{typeof name === 'string' ? name : ''}</span>;
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => {
        const sku = row.getValue('sku');
        return typeof sku === 'string' || typeof sku === 'number' ? sku : 'N/A';
      },
    },
    {
      id: 'status', 
      header: 'Estado',
      cell: ({ row }) => {
        const isActive = row.original.rowIsActive; 
        return (
          <Badge variant={isActive ? 'default' : 'destructive'} className={cn(isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600', 'text-white')}>
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        return row.original.rowIsActive === filterValue;
      }
    },
    {
      accessorKey: 'category.name', 
      id: 'category.name',
      header: 'Categoría',
      cell: ({ row }) => {
        const categoryName = row.original.category?.name;
        return categoryName ?? 'N/A';
      },
      filterFn: (row, columnId, filterValue) => {
        const categoryName = row.original.category?.name?.toLowerCase();
        if (filterValue === 'all') return true;
        return row.original.category?.id === filterValue;
      }
    },
    {
      id: 'tariffAssignment',
      header: 'Asignación Tarifa',
      cell: ({ row }) => {
        const { isAssignedToTariff, assignedTariffNames } = row.original;

        if (isAssignedToTariff && assignedTariffNames && assignedTariffNames.length > 0) {
          const MAX_PILLS = 4;
          const visibleTariffs = assignedTariffNames.slice(0, MAX_PILLS);
          const remainingCount = assignedTariffNames.length - MAX_PILLS;

          return (
            <div className="flex flex-wrap gap-1 items-center">
              {visibleTariffs.map((tariffName, index) => (
                <Badge key={index} variant="outline" className="whitespace-nowrap">
                  {tariffName}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="whitespace-nowrap">
                  +{remainingCount}
                </Badge>
              )}
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground">No asignado</span>;
      },
      filterFn: tariffAssignmentFilterFn, // <<< ASIGNAR LA FUNCIÓN DE FILTRO
    },
    {
      accessorKey: 'basePrice', 
      header: 'Precio Base',
      cell: ({ row }) => {
        const price = row.getValue('basePrice');
        return typeof price === 'number' ? price.toFixed(2) + ' €' : 'N/A'; 
      }
    },
    {
      id: 'vatRate', 
      header: 'IVA (%)',
      cell: ({ row }) => {
        const vatRate = row.original.vatType?.rate;
        return typeof vatRate === 'number' ? `${vatRate}%` : 'N/A';
      }
    },
    {
      id: 'actions',
      header: () => <div className="pr-4 text-right">Acciones</div>, 
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex gap-2 justify-end items-center pr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditarProducto(product.id)}
              title="Editar Producto"
              className="text-purple-600 hover:text-purple-700"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenDeleteConfirm(product)}
              title="Eliminar Producto"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    }
  ], []); 
  // <<< FIN: Definición Columnas react-table >>>

  // <<< INICIO: Memorización para props de useReactTable (SIGUE TODO COMENTADO) >>>
  /*
  const tableState = useMemo(() => ({ 
    sorting,
    columnFilters, 
    // globalFilter, 
    columnVisibility,
    rowSelection,
  }), [sorting, columnFilters, /*globalFilter,* / columnVisibility, rowSelection]);

  const tableInitialState = useMemo(() => ({ 
    pagination: { pageSize: ITEMS_PER_PAGE },
  }), []); 
  */
  // <<< FIN: Memorización para props de useReactTable >>>

  // <<< Instancia de react-table (DESCOMENTAR Y MANTENER SIMPLIFICADA) >>>
  const table = useReactTable<ProductWithIncludes>({
    data: processedProducts, // Sigue siendo []
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: ITEMS_PER_PAGE,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
    enableRowSelection: true,
    // manualPagination: true, // <<< COMENTADO para paginación del lado del cliente
    // rowCount: processedProducts.length, // <<< COMENTADO 
            debugTable: false,
  });
  // const table: any = {}; // Eliminar el mock

  const handleVolver = useCallback(() => {
    if (isSelectionMode && tariffIdParam) {
      // table.resetRowSelection(); // Sigue comentado ya que no tenemos rowSelection activado
      router.push(`/configuracion/tarifas/${tariffIdParam}/productos`);
    } else {
      router.back(); 
    }
  }, [router, isSelectionMode, tariffIdParam /*, table*/]); // table no es dependencia si no se usa

  const handleOpenAssociateModal = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      sonnerToast.info("Por favor, selecciona al menos un producto para asociar.");
      return;
    }
    const idsToAssociate = selectedRows.map(row => row.original.id);
    setSelectedProductIds(idsToAssociate); 
    setIsAssociateModalOpen(true);
  };

  const handleAddSelectedToTariff = () => {
    if (!isSelectionMode || !tariffIdParam) {
      sonnerToast.error("Modo de selección de tarifa no activo o ID de tarifa no encontrado.");
      return;
    }

    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      sonnerToast.info("Por favor, selecciona al menos un producto para añadir.");
      return;
    }
    const productIdsToAdd = selectedRows.map(row => row.original.id);

    addProductsMutation.mutate(
      { tariffId: tariffIdParam, productIds: productIdsToAdd },
      {
        onSuccess: () => {
          sonnerToast.success(`${productIdsToAdd.length} producto(s) añadido(s) correctamente a la tarifa.`);
          queryClient.invalidateQueries({ queryKey: ['tariffProducts', tariffIdParam] }); 
          queryClient.invalidateQueries({ queryKey: ['products'] }); 
          table.resetRowSelection();
          // Opcional: Redirigir de vuelta a la página de la tarifa o mostrar un mensaje diferente
          // router.push(`/configuracion/tarifas/${tariffIdParam}/productos`);
        },
        onError: (error: Error) => {
          sonnerToast.error(`Error al añadir productos a la tarifa: ${error.message}`);
        },
      }
    );
  };



  // <<< INICIO: Definición de tableControlsJsx >>>
  const tableControlsJsx = (
    <div className="flex justify-between items-center mb-4">
      {/* ✅ NUEVO: Selector de filas por página movido a la izquierda */}
      <PageSizeSelector
        pageSize={table.getState().pagination.pageSize}
        onPageSizeChange={(size) => table.setPageSize(size)}
        itemType="productos"
      />

      {/* Dropdown de Visibilidad de Columnas */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="ml-auto text-xs">
            Columnas <ChevronDown className="ml-2 w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[9999]">
          {table.getAllColumns?.().filter(column => column.getCanHide()).map(column => ( 
            <DropdownMenuCheckboxItem
              key={column.id}
              className="text-xs capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={value => column.toggleVisibility(!!value)}
            >
              {((typeof column.columnDef.header === 'string') 
                  ? column.columnDef.header 
                  : (column.id === 'select' 
                      ? 'Seleccionar'
                      : column.id))
              }
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
  // <<< FIN: Definición de tableControlsJsx >>>

  return (
    <div className="container px-4 py-6 mx-auto md:px-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {isSelectionMode ? "Seleccionar Productos para Tarifa" : "Gestión de Productos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
              <Input
                placeholder="Buscar por nombre, SKU..."
                value={globalFilter ?? ''}
                onChange={(event) => { setGlobalFilter(event.target.value) }}
                className="py-2 pr-4 pl-10 w-full rounded-md border sm:w-64"
              />
            </div>

            {!isSelectionMode && (
               <div className="flex flex-col space-y-1.5">
                <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                  <SelectTrigger id="assignment-filter" className="w-full sm:w-[200px]"> 
                    <SelectValue placeholder="Filtrar por asignación" />
                  </SelectTrigger>
                  <SelectContent>
                     {assignmentFilter !== 'all' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-2 py-1.5 text-xs text-muted-foreground hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignmentFilter('all');
                            }}
                          >
                            <FilterX className="mr-2 h-3.5 w-3.5" />
                            Limpiar selección
                          </Button>
                          <hr className="my-1" />
                        </>
                      )}
                    <SelectItem value="all">Todas las asignaciones</SelectItem>
                    <SelectItem value="unassigned">No asignados</SelectItem>
                    {allTariffs.length > 0 && <hr className="my-1" />} 
                    {isLoadingTariffs ? (
                      <SelectItem value="loading-tariffs" disabled>Cargando tarifas...</SelectItem>
                    ) : (
                      allTariffs.map((tariff) => (
                        <SelectItem key={tariff.id} value={tariff.id}>{tariff.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro de Categoría con Popover y Command */}
            <div className="flex flex-col space-y-1.5">
              <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isCategoryPopoverOpen} className="w-full sm:w-[200px] justify-between">
                    {categoryFilter === 'all'
                      ? "Todas las categorías"
                      : categories.find(cat => cat.id === categoryFilter)?.name ?? "Seleccionar categoría..."}
                    <CaretSortIcon className="ml-2 w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 z-[9999]">
                  <Command>
                    <CommandInput placeholder="Buscar categoría..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          key="all-categories-filter-item"
                          value="all"
                          onSelect={() => {
                            setCategoryFilter("all");
                            setIsCategoryPopoverOpen(false);
                          }}
                        >
                          Todas las categorías
                          <CheckIcon className={cn("ml-auto h-4 w-4", categoryFilter === "all" ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                        {isLoadingCategories ? (
                          <CommandItem disabled key="loading-categories-filter-item">Cargando...</CommandItem>
                        ) : (
                          categories.map((category) => (
                            <CommandItem
                              key={category.id}
                              value={category.id} // El valor para onSelect es el id
                              onSelect={(currentValue) => { // currentValue es el id de la categoría seleccionada
                                setCategoryFilter(category.id === categoryFilter ? "all" : category.id); // Usar category.id
                                setIsCategoryPopoverOpen(false);
                              }}
                            >
                              {category.name}
                              <CheckIcon className={cn("ml-auto h-4 w-4", categoryFilter === category.id ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro de Estado */}
            <div className="flex flex-col space-y-1.5">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex fixed right-4 bottom-4 z-50 gap-2">
            <Button variant="outline" onClick={handleVolver}>
              <ArrowLeft className="mr-2 w-4 h-4" /> Volver
            </Button>
            {isSelectionMode ? (
              <>
                <Button 
                  onClick={handleAddSelectedToTariff} 
                  disabled={table.getSelectedRowModel().rows.length === 0 || addProductsMutation.isPending || isLoading}
                >
                  {addProductsMutation.isPending 
                    ? "Añadiendo..." 
                    : `Añadir Seleccionados (${table.getSelectedRowModel().rows.length})`}
                </Button>
                <Button onClick={handleNuevoProducto}> 
                  <Plus className="mr-2 w-4 h-4" /> Nuevo Producto
                </Button>
              </>
            ) : (
              <>
                {/* ✅ NUEVO: Dropdown de acciones masivas */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      disabled={table.getSelectedRowModel().rows.length === 0}
                      className={cn(
                          "text-white",
                          table.getSelectedRowModel().rows.length > 0 
                              ? "bg-orange-600 hover:bg-orange-700" 
                              : "bg-gray-400 cursor-not-allowed"
                      )}
                    >
                      <Settings2 className="mr-2 w-4 h-4" />
                      Acciones ({table.getSelectedRowModel().rows.length})
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[9999]">
                    <DropdownMenuItem 
                      onClick={() => setShowBulkCategoryChanger(true)}
                      disabled={table.getSelectedRowModel().rows.length === 0}
                    >
                      <PackageIcon className="mr-2 w-4 h-4" />
                      Cambiar Categoría
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleOpenAssociateModal}
                      disabled={table.getSelectedRowModel().rows.length === 0}
                    >
                      <CircleDollarSign className="mr-2 w-4 h-4" />
                      Asociar a Tarifa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  onClick={handleNuevoProducto}
                >
                    <Plus className="mr-2 w-4 h-4" /> Nuevo Producto
                </Button>
              </>
            )}
          </div>
          
          {/* ✅ NUEVO: Modal para cambio masivo de categorías */}
          <BulkCategoryChanger
              isOpen={showBulkCategoryChanger}
              onClose={() => setShowBulkCategoryChanger(false)}
              selectedItems={table.getSelectedRowModel().rows.map(row => ({
                  id: row.original.id,
                  name: row.original.name,
                  type: 'product' as const,
                  categoryId: row.original.category?.id,
                  categoryName: row.original.category?.name || 'Sin categoría'
              }))}
              onUpdate={async (itemIds: string[], newCategoryId: string | null) => {
                  try {
                      const response = await fetch('/api/bulk/change-category', {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                              itemIds: itemIds,
                              itemType: 'product',
                              newCategoryId,
                          }),
                      });

                      if (!response.ok) {
                          throw new Error('Error al cambiar categorías');
                      }

                      const result = await response.json();
                      sonnerToast.success(result.message || 'Categorías cambiadas exitosamente');
                      
                      // Actualización inmediata y forzada de datos
                      await Promise.all([
                          queryClient.invalidateQueries({ queryKey: ['products'] }),
                          queryClient.invalidateQueries({ queryKey: ['categories'] }),
                      ]);
                      
                      // Forzar refetch inmediato para ver los cambios
                      await Promise.all([
                          queryClient.refetchQueries({ queryKey: ['products'] }),
                          queryClient.refetchQueries({ queryKey: ['categories'] }),
                      ]);
                      
                      table.resetRowSelection();
                      setShowBulkCategoryChanger(false);
                  } catch (error) {
                      console.error('Error:', error);
                      sonnerToast.error('Error al cambiar categorías');
                  }
              }}
              categories={categoriesDataFound || []}
              itemType="product"
          />
          
          {/* Dialog de Confirmación de Borrado */}
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>
                  ¿Estás seguro de que deseas eliminar el producto "<strong>{productToDelete?.name}</strong>"?
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteProductMutation.isPending}>
                  {deleteProductMutation.isPending ? "Eliminando..." : "Eliminar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isAssociateModalOpen && (
            <AssociateToTariffModal
              isOpen={isAssociateModalOpen}
              onClose={() => {
                setIsAssociateModalOpen(false);
                setSelectedProductIds([]); // Limpiar IDs al cerrar
              }}
              itemIds={selectedProductIds}
              itemType="PRODUCT"
              onAssociationSuccess={() => {
                sonnerToast.success("Productos asociados a la tarifa correctamente.");
                queryClient.invalidateQueries({ queryKey: ['products'] }); 
                queryClient.invalidateQueries({ queryKey: ['tariffs'] }); 
                table.resetRowSelection(); 
                setIsAssociateModalOpen(false);
                setSelectedProductIds([]);
              }}
            />
          )}

          {/* Controles de la tabla y la tabla misma */}
          {tableControlsJsx}

          <div className="overflow-x-auto overflow-y-auto relative border rounded-lg max-h-[60vh] min-w-full">
            {/* Scroll horizontal siempre visible */}
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined, minWidth: header.id === 'select' ? '50px' : '120px' }}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          {header.column.getCanSort?.() && (
                            <Button variant="ghost" size="sm" onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')} className="ml-2">
                              {header.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : header.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
                            </Button>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel?.()?.rows?.length ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected?.() && "selected"}
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }} className={cn(
                              // @ts-ignore
                              cell.column.columnDef.meta?.align === 'center' && 'text-center',
                              // @ts-ignore
                              cell.column.columnDef.meta?.align === 'right' && 'text-right',
                          )}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length || 1} className="h-24 text-center">
                        {isLoading ? "Cargando productos..." : "No se encontraron productos."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Paginación */}
          {processedProducts.length > 0 && !isLoading && (
             <div className="flex items-center justify-end mt-0.5 space-x-2">
                <PaginationControls 
                    currentPage={table.getState().pagination.pageIndex + 1}
                    totalPages={table.getPageCount()}
                    onPageChange={(page) => table.setPageIndex(page - 1)}
                    totalCount={table.getFilteredRowModel().rows.length}
                    itemType="productos"
                />
             </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
} 