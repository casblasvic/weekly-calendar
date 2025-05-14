"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef, SortingState, VisibilityState, RowSelectionState, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, flexRender, ColumnFiltersState, type PaginationState } from "@tanstack/react-table";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown, Plus, CheckCircle, XCircle, Pencil, Trash2, ChevronDown, Settings2, Check, ChevronsUpDown, X, ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as sonnerToast } from "sonner";
import { Prisma, BonoDefinition } from "@prisma/client";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { type BonoDefinitionWithRelations } from "../page"; 
import { AssociateToTariffModal } from '@/components/tariff/associate-to-tariff-modal';

// Importar los hooks optimizados
import { useBonoDefinitionsQuery, useDeleteBonoDefinitionMutation, useAddBonosToTariffMutation } from '@/lib/hooks/use-bono-query';
import { useServicesQuery } from '@/lib/hooks/use-service-query';
import { useProductsQuery } from '@/lib/hooks/use-product-query';
import { useTariffsQuery, useTariffBonosQuery } from '@/lib/hooks/use-tariff-query';

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// <<< AÑADIR IMPORTACIÓN DE PaginationControls >>>
import { PaginationControls } from "@/components/pagination-controls";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SelectItem = { id: string; name: string };

// NUEVA DEFINICIÓN EXPLÍCITA DE BonoDefinitionForTable
type BonoDefinitionForTable = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  serviceId: string | null;
  productId: string | null;
  service: { id: string; name: string } | null;
  product: { id: string; name: string } | null;
  settings: {
    isActive: boolean;
    validityDays?: number | null;
    pointsAwarded?: number | null;
  } | null;
  derivedIsActive: boolean;
  isAssignedToTariff?: boolean;
  assignedTariffNames: string[];
  assignedTariffIds: string[];
  createdAt: Date; // Asumiendo que Prisma la incluye y puede ser útil
  updatedAt: Date; // Asumiendo que Prisma la incluye y puede ser útil
  // NO incluir tariffPrices aquí
};

type TariffBonoPriceData = Prisma.TariffBonoPriceGetPayload<{
  select: { bonoDefinitionId: true } 
}>;

// Modificar la interfaz para no requerir los datos iniciales
interface BonoDefinitionsClientProps {
  // Ya no recibimos datos como props, los obtendremos con React Query
  data?: BonoDefinitionWithRelations[];
  isLoading?: boolean;
  error?: Error | null;
  servicesList?: SelectItem[];
  productsList?: SelectItem[];
  tariffsList?: SelectItem[];
}

// <<< AÑADIR CONSTANTE PARA ITEMS_PER_PAGE >>>
const ITEMS_PER_PAGE = 15;

const columnIdToTKeyMap: Record<string, string> = {
    select: 'common.select',
    name: 'config_bonuses.table.name', 
    description: 'common.description',
    associatedItem: 'config_bonuses.table.associatedItem',
    quantity: 'config_bonuses.table.quantity',
    validityDays: 'config_bonuses.table.validityDays',
    price: 'common.price',
    points: 'config_bonuses.table.pointsAwarded',
    status: 'common.status.title',
    tariffAssignment: 'config_bonuses.table.tariffAssignment',
    actions: 'common.actions',
};

const TriggerSpan = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ children, ...props }, ref) => {
        return (
            <span ref={ref} {...props}>
                {children}
            </span>
        );
    }
);
TriggerSpan.displayName = "TriggerSpan";

const getColumns = (
    handleEdit: (id: string) => void,
    handleDelete: (id: string, name: string) => void,
    t: (key: string) => string,
): ColumnDef<BonoDefinitionForTable>[] => [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all on page"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
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
                {t(columnIdToTKeyMap.name)}
          <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
        id: 'associatedItem',
        header: t(columnIdToTKeyMap.associatedItem), 
        accessorFn: (row) => {
            if (row.service) return `Servicio: ${row.service.name}`;
            if (row.product) return `Producto: ${row.product.name}`;
            return 'N/A';
        },
    cell: ({ row }) => {
      const bono = row.original;
      if (bono.service) {
                return <span className="text-xs text-muted-foreground">Servicio: {bono.service.name}</span>;
      } else if (bono.product) {
                return <span className="text-xs text-muted-foreground">Producto: {bono.product.name}</span>;
      } else {
        return <span className="text-muted-foreground">N/A</span>;
      }
    },
        filterFn: (row, columnId, filterValue) => {
            const filterId = filterValue as string;
            return row.original.serviceId === filterId || row.original.productId === filterId;
        },
        enableHiding: true,
  },
  {
    accessorKey: "quantity",
        header: () => <div className="text-center">{t(columnIdToTKeyMap.quantity)}</div>,
    cell: ({ row }) => {
        const type = row.original.service ? "Sesiones" : (row.original.product ? "Unidades" : "");
            return <div className="text-center">{`${row.original.quantity} ${type}`}</div>;
        },
  },
  {
    accessorKey: "price",
        header: ({ column }) => (
            <div className="text-right">
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    {t(columnIdToTKeyMap.price)}
            <ArrowUpDown className="w-4 h-4 ml-2" />
          </Button>
            </div>
        ),
        cell: ({ row }) => formatCurrency(row.original.price || 0, 'EUR'),
        meta: { align: 'right' },
  },
  {
        id: "validityDays",
        header: () => <div className="text-center">{t(columnIdToTKeyMap.validityDays)}</div>,
        accessorFn: (row) => row.settings?.validityDays,
        cell: ({ getValue }) => {
            const days = getValue<number | null | undefined>();
            const displayValue = days !== null && days !== undefined 
                ? `${days} días` 
                : 'Indefinida';
            return <div className="text-center">{displayValue}</div>;
        },
        enableHiding: true,
  },
  {
        id: "pointsAwarded",
        header: () => <div className="text-right">{t(columnIdToTKeyMap.points)}</div>,
        accessorFn: (row) => row.settings?.pointsAwarded ?? 0,
        cell: ({ getValue }) => <div className="hidden text-right md:table-cell">{getValue<number>()}</div>,
        enableHiding: true,
        meta: { align: 'right' },
    },
    {
        id: "tariffAssignment",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                 {t(columnIdToTKeyMap.tariffAssignment)}
                 <ArrowUpDown className="w-4 h-4 ml-2" />
            </Button>
        ),
        accessorFn: (row) => row.assignedTariffNames,
    cell: ({ row }) => {
            const names = row.original.assignedTariffNames;
            const count = names.length;
            const { t } = useTranslation();

            if (count === 0) {
                return <div className="text-xs text-center text-blue-600">{t('config_bonuses.assignment.none')}</div>;
            }
            
            if (count <= 4) {
                return (
                    <div className="flex flex-col items-center text-xs text-muted-foreground">
                        {names.map((name, index) => (
                            <div key={index}>{name}</div>
                        ))}
                    </div>
                );
            }
            
            const displayedNames = names.slice(0, 4);

            return (
                <HoverCard openDelay={100} closeDelay={50}>
                    <HoverCardTrigger>
                        <span className="text-xs text-center underline text-muted-foreground cursor-help">
                            {displayedNames.map((name, index) => (
                                <React.Fragment key={index}>
                                    {name}
                                    {index < displayedNames.length - 1 && ', '}
                                </React.Fragment>
                            ))}
                            ...
                        </span>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" align="start" className="z-50 max-w-xs p-2 text-xs break-words">
                        <p>{names.join(', ')}</p>
                    </HoverCardContent>
                </HoverCard>
            );
        },
        meta: { align: 'center' },
        enableHiding: true, 
        filterFn: (row, columnId, filterValue) => {
            const rowTariffIds = row.original.assignedTariffIds ?? [];

            if (filterValue === 'none') {
                return rowTariffIds.length === 0;
            } else if (typeof filterValue === 'string') {
                return rowTariffIds.includes(filterValue);
            } else {
                return true;
            }
        },
    },
    {
        id: 'status',
        accessorKey: "derivedIsActive",
        header: () => <div className="text-center">{t(columnIdToTKeyMap.status)}</div>,
    cell: ({ row }) => {
            const isActive = row.original.derivedIsActive;
            return (
                <div className="text-center">
                    {isActive ? (
                        <CheckCircle className="w-4 h-4 mx-auto text-green-600" />
                    ) : (
                        <XCircle className="w-4 h-4 mx-auto text-red-500" />
                    )}
                </div>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            const isActive = row.original.derivedIsActive;
            const filterStatus = filterValue as string;
            if (filterStatus === 'active') return isActive === true;
            else return isActive === false; 
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const bono = row.original;
      return (
                <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-8 h-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t(columnIdToTKeyMap.actions)}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(bono.id)}>{t('common.edit')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
            <DropdownMenuItem
                                onClick={() => handleDelete(bono.id, bono.name)}
                                className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
            >
                                {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
                </div>
            );
        },
        enableHiding: false,
    },
];

interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  noResultsText: string;
  disabled?: boolean;
}

const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noResultsText,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between h-9 font-normal"
          disabled={disabled}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultsText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="clear-selection"
                value="__clear__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs text-muted-foreground"
              >
                <X className="w-3 h-3 mr-2" />
                Limpiar selección
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={(currentValue) => {
                    const selectedOption = options.find(opt => opt.label.toLowerCase() === currentValue.toLowerCase());
                    onChange(selectedOption ? selectedOption.value : null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const BonoDefinitionsClient: React.FC<BonoDefinitionsClientProps> = ({ 
    // Podemos mantener la compatibilidad con las props anteriores, pero no las usaremos
    data: initialData,
    isLoading: initialIsLoading,
    error: initialError,
    servicesList: initialServicesList,
    productsList: initialProductsList,
    tariffsList: initialTariffsList
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isMounted = useRef(true);

  const tariffIdParam = searchParams?.get("selectForTariff");
  const isSelectionMode = !!tariffIdParam;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedTariffFilterId, setSelectedTariffFilterId] = useState<string | null>(null);
  
  // Usar los hooks optimizados para obtener datos
  const {
    data: bonoDefinitions = [],
    isLoading: isLoadingBonos,
    error: bonosError
  } = useBonoDefinitionsQuery();

  const {
    data: services = [],
    isLoading: isLoadingServices
  } = useServicesQuery();

  const {
    data: products = [],
    isLoading: isLoadingProducts
  } = useProductsQuery();

  const {
    data: tariffs = [],
    isLoading: isLoadingTariffs
  } = useTariffsQuery();

  const { data: existingBonoIdsInTariff = [], isLoading: isLoadingExistingBonos } = useTariffBonosQuery(tariffIdParam, {
    enabled: isSelectionMode,
    select: (data) => data.map((item: any) => item.bonoDefinitionId)
  });

  // Usar hook de mutación para eliminar bono
  const deleteBonoMutation = useDeleteBonoDefinitionMutation();

  // Usar hook optimizado para añadir bonos a una tarifa
  const addBonosMutation = useAddBonosToTariffMutation();
  const isAddingBonos = addBonosMutation.isPending;

  // AJUSTAR processedData CON EL NUEVO MAPEADO EXPLÍCITO
  const processedData = useMemo((): BonoDefinitionForTable[] => {
    if (isLoadingBonos || (isSelectionMode && isLoadingExistingBonos)) return [];
    return bonoDefinitions.map(bono => { // bono es BonoDefinitionWithRelations
      
      const tariffNames = bono.tariffPrices
                            ?.map(tp => tp.tariff?.name)
                            .filter((name): name is string => typeof name === 'string') ?? [];
      const tariffIds = bono.tariffPrices?.reduce((acc: string[], tp) => {
          if (tp.tariff && typeof tp.tariff.id === 'string') {
              acc.push(tp.tariff.id);
          }
          return acc;
      }, []) ?? [];

      // Construir el objeto explícitamente según BonoDefinitionForTable
      const tableRowData: BonoDefinitionForTable = {
        id: bono.id,
        name: bono.name,
        description: bono.description,
        quantity: bono.quantity,
        price: bono.price,
        serviceId: bono.serviceId,
        productId: bono.productId,
        service: bono.service ? { id: bono.service.id, name: bono.service.name } : null,
        product: bono.product ? { id: bono.product.id, name: bono.product.name } : null,
        settings: bono.settings ? {
            isActive: bono.settings.isActive, // Asegúrate que estas propiedades existen en bono.settings
            validityDays: bono.settings.validityDays,
            pointsAwarded: bono.settings.pointsAwarded
        } : null,
        derivedIsActive: bono.settings?.isActive ?? true,
        isAssignedToTariff: isSelectionMode ? existingBonoIdsInTariff.includes(bono.id) : undefined,
        assignedTariffNames: tariffNames,
        assignedTariffIds: tariffIds,
        createdAt: bono.createdAt, 
        updatedAt: bono.updatedAt,
      };
      return tableRowData;
    });
  }, [bonoDefinitions, existingBonoIdsInTariff, isSelectionMode, isLoadingExistingBonos, isLoadingBonos]);
  
  // Determinar si hay datos cargando
  const isLoading = isLoadingBonos || isLoadingServices || isLoadingProducts || isLoadingTariffs || 
                    (isSelectionMode && isLoadingExistingBonos);

  // Obtener error general
  const error = bonosError instanceof Error ? bonosError : null;

  const handleEdit = useCallback((id: string) => {
    router.push(`/configuracion/bonos/${id}`);
  }, [router]);

  const handleDelete = useCallback((id: string, name: string) => {
    const confirmation = confirm(`¿Estás seguro de que quieres eliminar la definición de bono "${name}"?`);
    if (confirmation) {
      const deletingToast = sonnerToast.loading("Eliminando bono...");
      deleteBonoMutation.mutate(id, {
        onSuccess: () => {
          sonnerToast.success("Bono eliminado correctamente.", { id: deletingToast });
        },
        onError: (error: any) => {
          sonnerToast.error("Error al eliminar", { description: error.message, id: deletingToast });
        }
      });
    }
  }, [deleteBonoMutation]);

  useEffect(() => {
    const newFilters: ColumnFiltersState = [];
    if (statusFilter !== 'all') {
      newFilters.push({ id: 'status', value: statusFilter });
    }
    if (selectedServiceId) {
      newFilters.push({ id: 'associatedItem', value: selectedServiceId });
    } else if (selectedProductId) {
      newFilters.push({ id: 'associatedItem', value: selectedProductId });
    }
    if (selectedTariffFilterId) {
        newFilters.push({ id: 'tariffAssignment', value: selectedTariffFilterId });
    }
    
    if (JSON.stringify(newFilters) !== JSON.stringify(columnFilters)) {
         setColumnFilters(newFilters);
    }
  }, [statusFilter, selectedServiceId, selectedProductId, selectedTariffFilterId, columnFilters]);

  const serviceOptions = useMemo(() => 
    services.map(s => ({ value: s.id, label: s.name })), 
    [services]
  );
  const productOptions = useMemo(() => 
    products.map(p => ({ value: p.id, label: p.name })), 
    [products]
  );
  const tariffOptions = useMemo(() => 
    tariffs.map(t => ({ value: t.id, label: t.name })), 
    [tariffs]
  );

  // <<< INICIO: Añadir opción "Ninguna asignación" a las opciones de tarifa >>>
  const tariffFilterOptions = useMemo(() => [
    { value: 'none', label: t('config_bonuses.assignment.none') },
    ...tariffOptions, // Mantener las tarifas existentes
  ], [tariffOptions, t]);
  // <<< FIN: Añadir opción "Ninguna asignación" >>>

  const columns = getColumns(handleEdit, handleDelete, t);

  const table = useReactTable({
    data: processedData, 
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id, 
    enableRowSelection: true,
    autoResetPageIndex: false,
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAddSelectedToTariff = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedBonoIds = selectedRows.map(row => row.original.id);
    if (selectedBonoIds.length === 0) {
        sonnerToast.info("Selecciona al menos un bono para añadir.");
        return;
    }
    
    addBonosMutation.mutate(
      { tariffId: tariffIdParam!, bonoDefinitionIds: selectedBonoIds },
      {
        onSuccess: (data: any) => {
          if (isMounted.current) {
            sonnerToast.success(data.message || "Bonos añadidos correctamente.");
            table.resetRowSelection();
            router.refresh();
          }
        },
        onError: (error) => {
          if (isMounted.current) {
            console.error("Error adding bonos:", error);
            sonnerToast.error(`Error al añadir bonos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
      }
    );
  };
  const selectedCount = table.getSelectedRowModel().rows.length;
  
  const handleVolver = () => {
    if (isSelectionMode && tariffIdParam) {
      router.push(`/configuracion/tarifas/${tariffIdParam}`);
    } else {
      router.back(); 
    }
  };
  
  const renderSkeleton = (rows = 10) => (
      Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={`skel-row-${rowIndex}`}>
              {columns.map((column, colIndex) => (
                  <TableCell key={`skel-cell-${rowIndex}-${colIndex}`}>
                      <Skeleton className="w-full h-5" />
                  </TableCell>
              ))}
          </TableRow>
      ))
  );

  if (error) {
    return <div className="p-4 text-red-600">Error al cargar definiciones de bonos: {error.message}</div>;
  }

  const selectedRowCount = Object.keys(rowSelection).length;

  const getStatusFilterLabel = (filterValue: string): string => {
    switch (filterValue) {
        case 'active': return t('common.status.active');
        case 'inactive': return t('common.status.inactive');
        case 'all': 
        default: return t('common.status.title');
    }
  };
  const statusLabel = getStatusFilterLabel(statusFilter);

  const handleServiceChange = (serviceId: string | null) => {
    setSelectedServiceId(serviceId);
    if (serviceId) {
      setSelectedProductId(null);
    }
  };

  const handleProductChange = (productId: string | null) => {
    setSelectedProductId(productId);
    if (productId) {
      setSelectedServiceId(null);
    }
  };

  const handleTariffFilterChange = (tariffId: string | null) => {
    setSelectedTariffFilterId(tariffId);
  };

  const [bonoToDelete, setBonoToDelete] = useState<BonoDefinitionForTable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [bonoIdsToAssociate, setBonoIdsToAssociate] = useState<string[]>([]);

  const handleDeleteConfirm = () => {
    if (bonoToDelete) {
      setIsDeleting(true);
      deleteBonoMutation.mutate(bonoToDelete.id, {
        onSuccess: () => {
          sonnerToast.success(t('config_bonuses.delete_success', { name: bonoToDelete?.name }));
          setBonoToDelete(null);
          setIsDeleting(false);
        },
        onError: (error: any) => {
          sonnerToast.error(t('config_bonuses.delete_error', { error: error.message }));
          setIsDeleting(false);
        }
      });
    }
  };

  const handleNuevoBono = () => {
    router.push("/configuracion/bonos/nuevo");
  };

  const handleOpenAssociateModal = () => {
    const selectedIds = table.getSelectedRowModel().rows
                            .map(row => row.original.id)
                            .filter((id): id is string => !!id);
    
    if (selectedIds.length === 0) {
        sonnerToast.info("Selecciona al menos un bono para asociar.");
        return;
    }
    
    setBonoIdsToAssociate(selectedIds);
    setIsAssociateModalOpen(true);
  };

  // <<< INICIO: Definición de tableControlsJsx >>>
  const tableControlsJsx = (
      <div className="flex items-center justify-between mb-4">
          {/* Selector de Filas por Página */}
          <div className="flex items-center space-x-2">
              <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                      table.setPageSize(Number(value));
                  }}
              >
                  <SelectTrigger 
                      className="h-8 w-[55px] text-xs ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                      <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="w-auto min-w-[55px]">
                      {[10, 15, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                              {pageSize}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>

          {/* Dropdown de Visibilidad de Columnas */}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto text-xs">
                      {t('common.columns')} <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  {table.getAllColumns?.().filter(column => column.getCanHide()).map(column => ( 
                      <DropdownMenuCheckboxItem
                          key={column.id}
                          className="text-xs capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={value => column.toggleVisibility(!!value)}
                      >
                          {t(columnIdToTKeyMap[column.id] || column.id, { defaultValue: column.id })}
                      </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
          </DropdownMenu>
      </div>
  );
  // <<< FIN: Definición de tableControlsJsx >>>

  return (
    <div className="p-4 pb-20 space-y-4 md:p-6">
        <div className="flex flex-col items-start justify-between gap-4 mb-4 md:flex-row md:items-center">
            <h1 className="text-2xl font-semibold">Gestión Global de Bonos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 py-4">
            <Input
                placeholder={t('config_bonuses.table.filterPlaceholder')} 
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-9 max-w-[160px]"
                disabled={isLoading}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9" disabled={isLoading}>
                        {statusLabel}
                        <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onSelect={() => setStatusFilter('all')}
                        className={cn(
                            "text-xs cursor-pointer",
                            statusFilter === 'all' && "text-muted-foreground opacity-50 cursor-default"
                        )}
                        disabled={statusFilter === 'all'}
                    >
                        <X className="w-3 h-3 mr-2" />
                        {t('common.clearSelection')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={statusFilter === 'active'} onCheckedChange={() => setStatusFilter('active')}> {t('common.status.active')} </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={statusFilter === 'inactive'} onCheckedChange={() => setStatusFilter('inactive')}> {t('common.status.inactive')} </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Combobox
                options={serviceOptions}
                value={selectedServiceId}
                onChange={handleServiceChange}
                placeholder={t('config_bonuses.table.filterByService')}
                searchPlaceholder={t('common.search_placeholder')}
                noResultsText={t('common.noResults')}
                disabled={isLoading}
            />
            <Combobox
                options={productOptions}
                value={selectedProductId}
                onChange={handleProductChange}
                placeholder={t('config_bonuses.table.filterByProduct')}
                searchPlaceholder={t('common.search_placeholder')}
                noResultsText={t('common.noResults')}
                disabled={isLoading}
            />
            <Combobox
                options={tariffFilterOptions}
                value={selectedTariffFilterId}
                onChange={handleTariffFilterChange}
                placeholder={t('config_bonuses.assignment.filterLabel')}
                searchPlaceholder={t('common.search_placeholder')}
                noResultsText={t('common.noResults')}
                disabled={isLoading}
            />
            {(globalFilter || statusFilter !== 'all' || selectedServiceId || selectedProductId || selectedTariffFilterId) && (
                <Button
                    variant="ghost"
                    onClick={() => {
                        setGlobalFilter('');
                        setStatusFilter('all');
                        setSelectedServiceId(null);
                        setSelectedProductId(null);
                        setSelectedTariffFilterId(null);
                        table.resetColumnFilters();
                    }}
                    className="px-2 h-9 text-muted-foreground lg:px-3"
                    disabled={isLoading}
                >
                    {t('common.clearFilters')}
                    <X className="w-4 h-4 ml-2" />
                </Button>
            )}
        </div>

        {bonoToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="p-4 bg-white rounded-md">
                    <h2 className="mb-4 text-xl font-bold">{t('config_bonuses.delete_confirmation', { name: bonoToDelete.name })}</h2>
                    <div className="flex items-center justify-between gap-4">
                        <Button 
                            variant="outline" 
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <div className="flex items-center">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('common.deleting')}
                                </div>
                            ) : (
                                t('common.delete')
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => setBonoToDelete(null)} disabled={isDeleting}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </div>
        )}

        {isAssociateModalOpen && (
            <AssociateToTariffModal
                isOpen={isAssociateModalOpen}
                onClose={() => {
                    setIsAssociateModalOpen(false);
                    setBonoIdsToAssociate([]);
                }}
                itemIds={bonoIdsToAssociate}
                itemType="BONO"
                onAssociationSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['bonoDefinitions'] });
                    setRowSelection({});
                }}
            />
        )}

        <footer 
            className="fixed z-40 flex items-center gap-2 transition-all duration-300 ease-in-out bottom-4 right-4"
            style={{ 
                left: 'var(--main-margin-left)', 
                width: 'var(--main-width)',
                justifyContent: 'flex-end', 
            }}
        >
            <Button variant="outline" onClick={handleVolver}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')} 
            </Button>
            <Button variant="outline" onClick={() => sonnerToast.info(t('common.help_not_implemented'))}>
                <HelpCircle className="w-4 h-4 mr-2" /> {t('common.help')}
            </Button>
            <Button 
                onClick={isSelectionMode ? handleAddSelectedToTariff : handleOpenAssociateModal}
                disabled={selectedRowCount === 0 || (isSelectionMode && isAddingBonos)}
                title={isSelectionMode ? "Añadir bonos seleccionados a la tarifa actual" : "Asociar bonos seleccionados a una o más tarifas"}
            >
                <Plus className="w-4 h-4 mr-2" /> 
                {isSelectionMode 
                    ? (isAddingBonos ? "Añadiendo..." : `Añadir (${selectedRowCount})`) 
                    : `Asociar (${selectedRowCount})`}
            </Button>
            <Button onClick={handleNuevoBono} title={t('config_bonuses.add_button')}> 
                <Plus className="w-4 h-4 mr-2" /> {t('config_bonuses.add_button')}
            </Button>
        </footer>

        <div className="pb-20 ">
            {tableControlsJsx}

            <div className="mb-16 overflow-hidden border rounded-md max-h-[60vh]">
                <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
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
                        {isLoading ? (
                            renderSkeleton()
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={`${!row.original.derivedIsActive && !isSelectionMode ? 'opacity-60' : ''} ${row.original.isAssignedToTariff ? 'bg-green-50/50' : ''}`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell 
                                            key={cell.id} 
                                            className={cn(
                                                (cell.column.columnDef.meta as any)?.align === 'right' && 'text-right',
                                                (cell.column.columnDef.meta as any)?.align === 'center' && 'text-center'
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No se encontraron bonos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {table.getRowModel().rows.length > 0 && table.getPageCount() > 1 && (
                <div className="flex items-center justify-end mt-0.5">
                    <PaginationControls 
                        table={table}
                    />
                </div>
            )}
        </div>
    </div>
  );
}; 