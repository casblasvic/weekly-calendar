"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Plus, Search, Edit3, Trash2, ArrowUpDown, ChevronUp, ChevronDown, 
    CheckCircle, XCircle, SmilePlus, Check, PackageCheck, 
    Loader2, Rows, Columns3, Settings2, Filter, ArrowLeft, HelpCircle, FilterX, Clock, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PaginationControls } from '@/components/pagination-controls';
import { PageSizeSelector } from '@/components/pagination-controls';
import { Service, Category, VATType, Tariff, ServiceSetting } from '@prisma/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
    useReactTable, 
    getCoreRowModel, 
    getPaginationRowModel, 
    getSortedRowModel, 
    getFilteredRowModel, 
    flexRender, 
    type ColumnDef, 
    type SortingState, 
    type VisibilityState,
    type RowSelectionState,
    type ColumnFiltersState,
    type FilterFn,
    type Row
} from '@tanstack/react-table';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Label } from "@/components/ui/label";
import { AssociateToTariffModal } from '@/components/tariff/associate-to-tariff-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MagicCard } from "@/components/ui/magic-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CaretSortIcon,
    CheckIcon
} from "@radix-ui/react-icons";
import { useIntegrationModules } from '@/hooks/use-integration-modules';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from "@/components/ui/command";
import { useTranslation } from 'react-i18next';

// Importar los hooks optimizados
import { useServicesQuery, useDeleteServiceMutation, useAddServicesToTariffMutation } from '@/lib/hooks/use-service-query';
import { useCategoriesQuery } from '@/lib/hooks/use-category-query';
import { useVatTypesQuery } from '@/lib/hooks/use-vat-query';
import { useTariffsQuery, useTariffServicesQuery } from '@/lib/hooks/use-tariff-query';
import BulkCategoryChanger, { BulkItem } from '@/components/bulk-category-changer';

interface ServiceRow extends Service { 
    categoryName?: string;
    vatTypeName?: string;
    vatRate?: number;
    settings?: { isActive: boolean; } | null;
    rowIsActive: boolean;
    tariffPrices?: { tariff: { id: string; name: string } }[] | null;
    assignedTariffNames: string[];
}

interface SimpleCategory {
    id: string;
    name: string;
}

interface SimpleTariff {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 15;

const serviceGlobalFilterFn: FilterFn<ServiceRow> = (
    row: Row<ServiceRow>,
    columnId: string,
    value: string,
    addMeta: (meta: any) => void
) => {
    const searchTerm = value.toLowerCase();
    const serviceName = row.original.name?.toLowerCase() ?? '';
    const serviceCode = row.original.code?.toLowerCase() ?? '';
    const serviceDescription = row.original.description?.toLowerCase() ?? '';
    const categoryName = row.original.categoryName?.toLowerCase() ?? '';

    return (
        serviceName.includes(searchTerm) ||
        serviceCode.includes(searchTerm) ||
        serviceDescription.includes(searchTerm) ||
        categoryName.includes(searchTerm)
    );
};

export default function GestionServiciosPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tariffIdForSelection = searchParams.get('selectForTariff');
    const isSelectionMode = !!tariffIdForSelection;
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const isMounted = useRef(true);

    // Estados para react-table
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRow | null>(null);
    const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

    // ✅ NUEVO: Estados para selección masiva de categorías
    const [showBulkCategoryChanger, setShowBulkCategoryChanger] = useState(false);

    // Consultas optimizadas con TanStack Query
    const { 
      data: servicesData = [], 
      isLoading: isLoadingServices,
      error: servicesError,
      refetch: refetchServices
    } = useServicesQuery();
    
    const { 
      data: categoriesData = [], 
      isLoading: isLoadingCategories 
    } = useCategoriesQuery();
    
    const { 
      data: vatTypesData = [], 
      isLoading: isLoadingVatTypes 
    } = useVatTypesQuery();

    const { 
      data: allTariffs = [], 
      isLoading: isLoadingTariffs 
    } = useTariffsQuery();

    // 🔌 Verificar si el plugin de Shelly está activo
    const { isShellyActive, isLoading: isLoadingModules } = useIntegrationModules();

    // Consulta condicional para tarifa específica cuando estamos en modo selección
    const {
      data: tariffData,
      isLoading: isLoadingTariff
    } = useQuery({
      queryKey: ['tariff', tariffIdForSelection],
      queryFn: async () => {
        if (!tariffIdForSelection) return null;
        const response = await fetch(`/api/tariffs/${tariffIdForSelection}`);
        if (!response.ok) throw new Error(`Error al cargar tarifa: ${response.statusText}`);
        return response.json();
      },
      enabled: !!tariffIdForSelection && isSelectionMode,
      staleTime: 1000 * 60 * 5, // 5 minutos
    });

    // Usar hook optimizado para obtener servicios COMPLETOS de una tarifa
    const {
      data: tariffServicesData = [],
      isLoading: isLoadingTariffServices
    } = useTariffServicesQuery(tariffIdForSelection, {
      enabled: !!tariffIdForSelection && isSelectionMode,
    });

    // Memorizar el array de IDs extraído de los datos completos
    const tariffServiceIds = useMemo(() => {
        if (!tariffServicesData || !Array.isArray(tariffServicesData)) {
            return []; // Devolver array vacío si no hay datos o no es array
        }
        return tariffServicesData.map((sp: any) => sp.serviceId);
    }, [tariffServicesData]); // Depender solo de la referencia del array completo

    // Procesar datos de servicios con relaciones
    const services = useMemo(() => {
      if (isLoadingServices || isLoadingCategories || isLoadingVatTypes) return [];
      
      return servicesData.map(service => {
        const category = categoriesData.find(c => c.id === service.categoryId);
        const vatType = vatTypesData.find(v => v.id === service.vatTypeId);
        const isActive = service.settings?.isActive ?? true;
        const assignedTariffNames = (service.tariffPrices ?? [])
                                    .map(tp => tp.tariff.name)
                                    .sort();
        
        return {
            ...service,
            categoryName: category?.name,
            vatTypeName: vatType?.name,
            vatRate: vatType?.rate,
            settings: service.settings,
            rowIsActive: isActive,
            tariffPrices: service.tariffPrices,
            assignedTariffNames: assignedTariffNames,
        };
      });
    }, [servicesData, categoriesData, vatTypesData, isLoadingServices, isLoadingCategories, isLoadingVatTypes]);



    // Calcular existingServiceIdsInTariff con useMemo
    const existingServiceIdsInTariff = useMemo(() => {
      if (!tariffServicesData || !Array.isArray(tariffServicesData) || !isSelectionMode) {
          return new Set<string>();
      }
      const ids = tariffServicesData.map((sp: any) => sp.serviceId);
      return new Set<string>(ids);
    }, [tariffServicesData, isSelectionMode]);

    // Mutación para eliminar servicio
    const deleteServiceMutation = useDeleteServiceMutation();

    // Usar hook optimizado para añadir servicios a una tarifa
    const addServicesMutation = useAddServicesToTariffMutation();

    // Verificar si hay errores en la carga de datos
    const isError = servicesError || false;
    // Verificar si está cargando cualquiera de los datos principales
    const isLoading = isLoadingServices || isLoadingCategories || isLoadingVatTypes || 
                     (isSelectionMode && isLoadingTariff);

    // Callback para el filtro de estado
    const handleStatusFilterChange = useCallback((value: string) => {
        setStatusFilter(value as 'all' | 'active' | 'inactive');
    }, []);

    // Callback para el filtro de asignación
    const handleAssignmentFilterChange = useCallback((value: string) => {
        setAssignmentFilter(value);
    }, []);

    // Callback para seleccionar "Todas las categorías" en el Popover
    const handleSelectAllCategories = useCallback(() => {
        setCategoryFilter('all');
        setIsCategoryPopoverOpen(false);
    }, []);

    // Callback para seleccionar una categoría específica en el Popover
    const handleSelectCategory = useCallback((currentValue: string) => {
        const selected = categoriesData.find(c => c.name.toLowerCase() === currentValue.toLowerCase());
        setCategoryFilter(selected ? selected.id : 'all');
        setIsCategoryPopoverOpen(false);
    }, [categoriesData]);

    const columns = useMemo<ColumnDef<ServiceRow>[]>(() => [
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
            size: 40,
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Nombre
                    {column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3 ml-1" /> : <ArrowUpDown className="w-3 h-3 ml-1" />}
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "code",
            header: "Código",
            cell: ({ row }) => <div>{row.getValue("code")}</div>,
        },
        {
            accessorKey: 'categoryId',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Categoría
                    {column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3 ml-1" /> : <ArrowUpDown className="w-3 h-3 ml-1" />}
                </Button>
            ),
            cell: ({ row }) => <div>{row.original.categoryName || '-'}</div>,
            filterFn: (row, id, value) => {
                if (value === 'all') return true;
                return row.getValue(id) === value;
            },
            enableHiding: true,
        },
        {
            accessorKey: "durationMinutes",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="justify-center w-full text-center">
                    <Clock className="w-3 h-3 mr-1" /> Duración
                </Button>
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue("durationMinutes") ? `${row.getValue("durationMinutes")} min` : '-'}</div>,
            meta: { align: 'center' }
        },
        // 🔌 Columna de "Duración Tratamiento" - Solo si Shelly está activo
        ...(isShellyActive ? [{
            accessorKey: "treatmentDurationMinutes",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="justify-center w-full text-center">
                    <Timer className="w-3 h-3 mr-1" /> Duración Tratamiento
                </Button>
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue("treatmentDurationMinutes") ? `${row.getValue("treatmentDurationMinutes")} min` : '-'}</div>,
            meta: { align: 'center' }
        }] : []),
        {
            accessorKey: "price",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="justify-end w-full text-right">
                    Precio Base
                </Button>
            ),
            cell: ({ row }) => <div className="text-right">{row.original.price?.toFixed(2) ?? '-'} €</div>,
            meta: { align: 'right' }
        },
        {
            accessorKey: "vatRate",
            header: "IVA (%)",
            cell: ({ row }) => <div className="text-right">{row.original.vatRate ?? '-'}</div>,
            meta: { align: 'right' }
        },
        {
            accessorKey: "rowIsActive",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Activo
                    {column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3 ml-1" /> : <ArrowUpDown className="w-3 h-3 ml-1" />}
                </Button>
            ),
            cell: ({ row }) => (
                <Badge 
                    variant={"outline"}
                    className={cn(
                        "flex items-center justify-center w-20",
                        row.getValue("rowIsActive") 
                            ? "border-green-600 text-green-600"
                            : "border-red-600 text-red-600"
                    )}
                >
                    {row.getValue("rowIsActive") ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {row.getValue("rowIsActive") ? 'Activo' : 'Inactivo'}
                </Badge>
            ),
            meta: { align: 'center' },
            filterFn: (row, id, value) => { 
                if (value === 'all') return true;
                const isActive = row.original.rowIsActive;
                return value === 'active' ? isActive : !isActive;
            },
        },
        {
            accessorKey: "assignedTariffNames",
            header: "Asignación",
            cell: ({ row }) => {
                const tariffNames = row.original.assignedTariffNames;
                if (!tariffNames || tariffNames.length === 0) {
                    return <span className="text-xs text-blue-600">Ninguna</span>;
                }

                const displayNames = tariffNames.join(', ');

                if (displayNames.length > 40) {
                    return (
                        <div className="relative group">
                            <span className="text-xs underline cursor-default text-muted-foreground decoration-dashed underline-offset-2">
                                {tariffNames.length} tarifas...
                            </span>
                            <div className="absolute hidden group-hover:block z-50 -translate-y-full left-0 bottom-full mb-2 min-w-[200px]">
                                <MagicCard className="rounded-md bg-card">
                                    <div className="p-3 text-sm">{displayNames}</div>
                                </MagicCard>
                            </div>
                        </div>
                    );
                } 
                
                return <span className="text-xs text-muted-foreground">{displayNames}</span>;
            },
            size: 150,
            enableSorting: false,
            filterFn: (row, id, value) => {
              if (value === 'all') {
                return true;
              }
              const tariffPrices = row.original.tariffPrices ?? [];
              if (value === 'unassigned') {
                return tariffPrices.length === 0;
              }
              return tariffPrices.some(price => price.tariff.id === value);
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Acciones</div>,
            meta: { align: 'right' },
            cell: ({ row }) => {
                const service = row.original;
                const serviceId = service.id;
                const isExisting = existingServiceIdsInTariff.has(serviceId);

                if (isSelectionMode) {
                    return (
                        <div className="text-right">
                            {isExisting ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                    <PackageCheck className="w-3 h-3 mr-1" /> Asignado
                                </Badge>
                            ) : (
                                <span className="text-xs text-blue-600">
                                    No asignado
                                </span>
                            )}
                        </div>
                    );
                 } else {
                    return (
                        <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditService(service.id)} title="Editar">
                                <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(service)} title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    );
                }
            },
        }
    ], [existingServiceIdsInTariff, isSelectionMode]);

    const table = useReactTable({
        data: services,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageIndex: 0,
                pageSize: ITEMS_PER_PAGE,
            },
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        globalFilterFn: serviceGlobalFilterFn,
        enableRowSelection: true,
        debugTable: false,
    });

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!isMounted.current) return;

        const newFilters: ColumnFiltersState = [];
        
        if (!isSelectionMode && assignmentFilter !== 'all') {
            newFilters.push({ id: 'tariffAssignment', value: assignmentFilter }); 
        }

        if (categoryFilter !== 'all') {
            newFilters.push({ id: 'categoryName', value: categoryFilter }); 
        }
        
        if (statusFilter !== 'all') { 
            newFilters.push({ id: 'status', value: statusFilter === 'active' }); 
        }

        setColumnFilters(newFilters);

    }, [assignmentFilter, categoryFilter, statusFilter, isSelectionMode, isMounted]);

    const handleNewService = () => {
        router.push('/configuracion/servicios/nuevo');
    };

    const handleEditService = (id: string) => {
        router.push(`/configuracion/servicios/${id}`);
    };

    const handleDeleteClick = (service: ServiceRow) => {
        setServiceToDelete(service);
    };

    const confirmDelete = () => {
        if (!serviceToDelete) return;
        deleteServiceMutation.mutate(serviceToDelete.id, {
          onSuccess: () => {
            toast.success(`Servicio "${serviceToDelete?.name}" eliminado correctamente.`);
            setServiceToDelete(null);
          },
          onError: (error: any) => {
            console.error("Error eliminando servicio:", error);
            toast.error(`Error al eliminar: ${error.message || 'Error desconocido'}`);
          }
        });
    };

    const handleAddSelectedToTariff = () => {
        const selectedRowIndexes = Object.keys(rowSelection).filter(index => rowSelection[index]);
        
        const serviceIdsToAdd = selectedRowIndexes.map(index => {
            const row = table.getRow(index);
            return row ? row.original.id : undefined;
        }).filter((id): id is string => id !== undefined);

        if (serviceIdsToAdd.length === 0) {
            toast.info("No hay servicios nuevos seleccionados para añadir.");
            return;
        }

        addServicesMutation.mutate(
            { tariffId: tariffIdForSelection!, serviceIds: serviceIdsToAdd },
            {
                onSuccess: (data: any) => {
                    toast.success(data.message || "Servicios añadidos/actualizados en la tarifa.");
                    const newOrUpdatedIds = [
                        ...(data.details?.added || []),
                        ...(data.details?.reactivated || [])
                    ];
                    if (newOrUpdatedIds.length > 0) {
                        queryClient.invalidateQueries({ queryKey: ['tariffServices', tariffIdForSelection] });
                    }
                    setRowSelection({});
                },
                onError: (error: any) => {
                    console.error("[addServicesMutation Error]", error);
                    toast.error(`Error al añadir: ${error.message || 'Error desconocido'}`);
                }
            }
        );
    };

    const selectedRowCount = Object.keys(rowSelection).length;
    const numRowsSelected = table.getFilteredSelectedRowModel().rows.length
    const numRows = table.getFilteredRowModel().rows.length

    const handleClearFilters = () => {
        setGlobalFilter('');
        setCategoryFilter('all');
        setStatusFilter('all');
        setAssignmentFilter('all');
        table.resetColumnFilters();
    };

    const handleOpenAssociateModal = () => {
        const selectedIds = Object.keys(rowSelection).filter(index => rowSelection[index])
                                .map(index => services[parseInt(index, 10)]?.id)
                                .filter((id): id is string => !!id);
        
        if (selectedIds.length === 0) {
            toast.info("Selecciona al menos un servicio para asociar.");
            return;
        }
        
        setSelectedServiceIds(selectedIds);
        setIsAssociateModalOpen(true);
    };



    // Determinar el número total de filas después del filtrado (antes de la paginación)
    const totalFilteredRows = table.getFilteredRowModel().rows.length;

    // JSX para controles de tabla (Visibilidad de Columnas)
    const tableControlsJsx = (
        <div className="flex items-center justify-end mb-4">
            {/* Dropdown de Visibilidad de Columnas */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto text-xs">
                        Columnas <ChevronDown className="w-4 h-4 ml-2" />
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
                                    ? t('common.select') 
                                    : t(`services.columns.${column.id}`, { defaultValue: column.id })))
                        }
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-semibold">
                    {isSelectionMode 
                        ? t('services.pageTitleSelectionMode', { tariffName: tariffIdForSelection })
                        : t('services.pageTitle')
                    }
                </h1>
            </div>

            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-grow md:flex-grow-0 md:basis-1/3">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
                        placeholder={t('services.searchPlaceholder')}
                        value={globalFilter ?? ''}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="w-full pl-8 h-9"
        />
      </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isCategoryPopoverOpen}
                                className="w-full md:w-[200px] justify-between h-9 font-normal text-sm truncate"
                            >
                                <span className="truncate">
                                    {categoryFilter === 'all'
                                        ? t('services.filters.allCategories')
                                        : categoriesData.find(c => c.id === categoryFilter)?.name ?? t('services.filters.selectCategory')}
                                </span>
                                <CaretSortIcon className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 md:w-[240px] z-[9999]" align="start">
                            <Command>
                                <CommandInput placeholder={t('services.filters.searchCategory')} />
                                <CommandList>
                                    <CommandEmpty>{t('services.filters.noCategoryFound')}</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            key="all-categories"
                                            value="all-categories-filter"
                                            onSelect={handleSelectAllCategories}
                                        >
                                            <CheckIcon className={cn("mr-2 h-4 w-4", categoryFilter === 'all' ? "opacity-100" : "opacity-0")} />
                                            {t('services.filters.allCategories')}
                                        </CommandItem>
                                        {categoriesData.map((category) => (
                                            <CommandItem
                                                key={category.id}
                                                value={category.name}
                                                onSelect={handleSelectCategory}
                                            >
                                                <CheckIcon className={cn("mr-2 h-4 w-4", categoryFilter === category.id ? "opacity-100" : "opacity-0")} />
                                                {category.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                        <SelectTrigger className="w-full text-sm md:w-auto h-9">
                            <SelectValue placeholder={t('services.filters.statusPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('services.filters.allStatuses')}</SelectItem>
                            <SelectItem value="active">{t('common.status.active')}</SelectItem>
                            <SelectItem value="inactive">{t('common.status.inactive')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {!isSelectionMode && (
                        <Select value={assignmentFilter} onValueChange={handleAssignmentFilterChange}>
                            <SelectTrigger className="w-full text-sm md:w-auto h-9">
                                <SelectValue placeholder={t('services.filters.assignmentPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('services.filters.allAssignments')}</SelectItem>
                                <SelectItem value="__NONE__">{t('services.filters.notAssignedShort')}</SelectItem>
                                {allTariffs.map(tariff => (
                                    <SelectItem key={tariff.id} value={tariff.id}>{tariff.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Button variant="outline" onClick={handleClearFilters} className="h-9">
                        <FilterX className="w-4 h-4 mr-2" /> 
                        {t('common.clearFilters')}
                    </Button>
                </div>
      </div>

            {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <div className="flex items-center justify-between p-2 mb-3 text-xs text-blue-700 border border-blue-200 rounded-md bg-blue-50">
                    <span>
                        {t('common.selectedInfo', { 
                            selected: table.getFilteredSelectedRowModel().rows.length, 
                            total: table.getCoreRowModel().rows.length 
                        })}
                    </span>
                    <Button variant="link" size="sm" onClick={() => table.resetRowSelection()} className="h-auto p-0 text-blue-700">
                        {t('common.clearSelection')}
        </Button>
                    </div>
            )}

            {/* <<< ENVOLVER TABLA Y PAGINACIÓN PARA AÑADIR PADDING INFERIOR >>> */}
            <div className="pb-20"> {/* Espacio para los botones fijos del footer */}
                {tableControlsJsx}

                {/* Contenedor de la tabla con scroll interno */}
                <div className="overflow-x-auto overflow-y-auto relative border rounded-lg max-h-[60vh] min-w-full">
                    {/* Scroll horizontal siempre visible */}
                    <div className="overflow-x-auto">
                        <Table className="min-w-full">
                            <TableHeader className="sticky top-0 z-10 bg-card">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id} style={{ width: header.id === 'actions' ? '80px' : undefined, minWidth: header.id === 'select' ? '50px' : '100px' }} className={cn(header.id === 'select' && 'text-center')}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className={cn(
                                                isSelectionMode && existingServiceIdsInTariff.has(row.original.id) && !row.getIsSelected() && 'opacity-60 bg-gray-50 cursor-not-allowed',
                                                isSelectionMode && !existingServiceIdsInTariff.has(row.original.id) && 'hover:bg-purple-50 cursor-pointer',
                                                !isSelectionMode && 'hover:bg-gray-50',
                                                row.getIsSelected() && isSelectionMode && 'bg-blue-100 hover:bg-blue-200',
                                                row.getIsSelected() && !isSelectionMode && 'bg-blue-50'
                                            )}
                                            onClick={(e) => {
                                                // Evitar activación si el click viene de las acciones
                                                if ((e.target as HTMLElement).closest('button')) {
                                                    return;
                                                }
                                                
                                                if (isSelectionMode && !existingServiceIdsInTariff.has(row.original.id)) {
                                                    row.toggleSelected();
                                                } else if (!isSelectionMode && row.getCanSelect()) {
                                                    row.toggleSelected();
                                                }
                                            }}
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id} className={cn(cell.column.id === 'select' && 'text-center')}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            {isLoading ? t('common.loading') : t('services.noServicesFound')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Paginación */}
                {services.length > 0 && (
                    <div className="flex items-center justify-between mt-0.5">
                        {/* Selector de tamaño de página a la izquierda */}
                        <PageSizeSelector
                            pageSize={table.getState().pagination.pageSize}
                            onPageSizeChange={(size) => table.setPageSize(size)}
                            itemType="servicios"
                        />
                        
                        {/* Controles de paginación a la derecha */}
                        <PaginationControls 
                            currentPage={table.getState().pagination.pageIndex + 1}
                            totalPages={table.getPageCount()}
                            onPageChange={(page) => table.setPageIndex(page - 1)}
                            totalCount={table.getFilteredRowModel().rows.length}
                            itemType="servicios"
                        />
                    </div>
                )}
            </div>

            <div className="fixed z-50 flex flex-wrap items-center gap-2 bottom-4 right-4">
                {isSelectionMode && tariffIdForSelection && (
                    <Button 
                        variant="outline"
                        onClick={() => router.push(`/configuracion/tarifas/${tariffIdForSelection}`)}
                        className="order-1"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('common.backToTariff')}
                    </Button>
                )}
                {!isSelectionMode && (
                    <Button variant="outline" onClick={() => router.back()} className="order-1">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('common.back')}
                    </Button>
                )}

                <Button variant="outline" onClick={() => toast.info(t('common.help_not_implemented'))} className="order-2">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    {t('common.help')}
                </Button>

                <Button onClick={handleNewService} className="order-3 text-white bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('services.newServiceButton')}
                </Button>

                <div className="flex order-4 gap-2">
                    {/* ✅ NUEVO: Dropdown de acciones masivas */}
                    {!isSelectionMode && (
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
                                    <Settings2 className="w-4 h-4 mr-2" />
                                    Acciones ({table.getSelectedRowModel().rows.length})
                                    <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[9999]">
                                <DropdownMenuItem 
                                    onClick={() => setShowBulkCategoryChanger(true)}
                                    disabled={table.getSelectedRowModel().rows.length === 0}
                                >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Cambiar Categoría
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={handleOpenAssociateModal}
                                    disabled={table.getSelectedRowModel().rows.length === 0}
                                >
                                    <PackageCheck className="w-4 h-4 mr-2" />
                                    Asociar a Tarifa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    
                    {isSelectionMode && (
                        <Button 
                            onClick={handleAddSelectedToTariff}
                            disabled={addServicesMutation.isPending || table.getFilteredSelectedRowModel().rows.length === 0}
                            className="text-white bg-green-600 hover:bg-green-700"
                        >
                            {addServicesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            {t('services.actions.addSelectedToTariff')} {table.getFilteredSelectedRowModel().rows.length > 0 ? `(${table.getFilteredSelectedRowModel().rows.length})` : ''}
                        </Button>
                    )}
                </div>
            </div>

            <Dialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('services.deleteDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('services.deleteDialog.description', { serviceName: serviceToDelete?.name ?? '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setServiceToDelete(null)}>{t('common.cancel')}</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteServiceMutation.isPending}>
                            {deleteServiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 
                            {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            {!isSelectionMode && (
                 <AssociateToTariffModal
                    isOpen={isAssociateModalOpen}
                    onClose={() => {
                        setIsAssociateModalOpen(false);
                        table.resetRowSelection();
                    }}
                    itemType="SERVICE" 
                    itemIds={table.getFilteredSelectedRowModel().rows.map(row => row.original.id)}
                    onAssociationSuccess={() => {
                        refetchServices();
                        table.resetRowSelection();
                    }}
                />
            )}

            {/* ✅ NUEVO: Modal para cambio masivo de categorías */}
            <BulkCategoryChanger
                isOpen={showBulkCategoryChanger}
                onClose={() => setShowBulkCategoryChanger(false)}
                selectedItems={table.getSelectedRowModel().rows.map(row => ({
                    id: row.original.id,
                    name: row.original.name,
                    type: 'service' as const,
                    categoryId: row.original.categoryId,
                    categoryName: row.original.categoryName || 'Sin categoría'
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
                                itemType: 'service',
                                newCategoryId,
                            }),
                        });

                        if (!response.ok) {
                            throw new Error('Error al cambiar categorías');
                        }

                        const result = await response.json();
                        toast.success(result.message || 'Categorías cambiadas exitosamente');
                        
                        // Actualización inmediata y forzada de datos
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['services'] }),
                            queryClient.invalidateQueries({ queryKey: ['categories'] }),
                        ]);
                        
                        // Forzar refetch inmediato para ver los cambios
                        await Promise.all([
                            queryClient.refetchQueries({ queryKey: ['services'] }),
                            queryClient.refetchQueries({ queryKey: ['categories'] }),
                        ]);
                        
                        table.resetRowSelection();
                        setShowBulkCategoryChanger(false);
                    } catch (error) {
                        console.error('Error:', error);
                        toast.error('Error al cambiar categorías');
                    }
                }}
                categories={categoriesData}
                itemType="service"
            />
    </div>
    );
}

