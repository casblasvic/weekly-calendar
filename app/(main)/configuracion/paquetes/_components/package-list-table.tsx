"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef, SortingState, VisibilityState, RowSelectionState, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, flexRender, ColumnFiltersState, type PaginationState } from '@tanstack/react-table';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown, Plus, CheckCircle, XCircle, Pencil, Trash2, ChevronDown, Eye, X, Check, ChevronsUpDown, PackageCheck, Loader2, ArrowLeft, HelpCircle, PlusCircle, Search, Tags } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast as sonnerToast } from 'sonner';
import { Prisma, Tariff } from '@prisma/client';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { type PackageDefinitionWithRelations } from '../page';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AssociateToTariffModal } from '@/components/tariff/associate-to-tariff-modal';

import { usePackageDefinitionsQuery, useAddPackagesToTariffMutation, useDeletePackageDefinitionMutation } from '@/lib/hooks/use-package-query';
import { useServicesQuery } from '@/lib/hooks/use-service-query';
import { useProductsQuery } from '@/lib/hooks/use-product-query';
import { useTariffsQuery } from '@/lib/hooks/use-tariff-query';
import { useTariffPackagesQuery } from '@/lib/hooks/use-tariff-query';

import { PaginationControls } from '@/components/pagination-controls';

type SelectItem = { id: string; name: string };

type PackageDefinitionForTable = PackageDefinitionWithRelations & {
    isAssignedToTariff?: boolean;
    derivedIsActive: boolean;
    hasServices: boolean; 
    settings?: {
        isActive: boolean;
        pointsAwarded?: number | null;
    } | null;
    items: (
        Prisma.PackageItemGetPayload<{
            include: {
                service: { select: { id: true, name: true } } | null;
                product: { select: { id: true, name: true } } | null;
            }
        }>
    )[];
    tariffPrices?: { tariff: { id: string; name: string } }[] | null;
    assignedTariffNames: string[];
};

type TariffPackagePriceData = Prisma.TariffPackagePriceGetPayload<{
    select: { packageDefinitionId: true };
}>;

interface TariffData {
    id: string;
    name: string;
    packagePrices?: { packageDefinitionId: string }[];
}

interface PackageListTableProps {
    data?: PackageDefinitionWithRelations[];
    isLoading?: boolean;
    error?: Error | null;
    servicesList?: SelectItem[];
    productsList?: SelectItem[];
    tariffsList?: SelectItem[];
    currentTariff?: SelectItem | null;
    isSelectionMode: boolean;
    isCollapsed?: boolean;
}

const ITEMS_PER_PAGE = 15;

const columnIdToTKeyMap: Record<string, string> = {
    select: 'common.select',
    name: 'packages.table.headers.name',
    description: 'packages.table.headers.description',
    price: 'packages.table.headers.price',
    itemsCount: 'packages.table.headers.itemsCount',
    assignedToTariffs: 'packages.table.headers.assignedToTariffs',
    points: 'packages.table.headers.points',
    pointsAwarded: 'packages.table.headers.pointsAwarded',
    status: 'packages.table.headers.status',
    actions: 'common.actions',
    filterByService: 'packages.table.filterByService',
    filterByProduct: 'packages.table.filterByProduct',
    'packages.alreadyInThisTariff': 'packages.alreadyInThisTariff',
    'packages.addToThisTariff': 'packages.addToThisTariff',
    'packages.assignedToCurrentTariff': 'packages.assignedToCurrentTariff',
    'packages.notAssignedToCurrentTariff': 'packages.notAssignedToCurrentTariff',
};

const getColumns = (
    handleEdit: (id: string) => void,
    handleDelete: (id: string, name: string) => void,
    t: (key: string, params?: any) => string,
    isSelectionModeProp: boolean,
    currentTariffForSelection: SelectItem | null,
    existingPackageIdsInTariff: Set<string>,
    handleAddPackageToTariff: (packageId: string) => void,
    isAddingToTariff: boolean,
    allTariffsCount: number
): ColumnDef<PackageDefinitionForTable>[] => [
    {
        id: 'select',
        header: ({ table }) => {
            let selectableRowsOnPage: any[];
            if (isSelectionModeProp) {
                selectableRowsOnPage = table.getRowModel().rows.filter(row => 
                    !existingPackageIdsInTariff.has(row.original.id)
                );
            } else {
                selectableRowsOnPage = table.getRowModel().rows.filter(row => {
                    const assignedCount = row.original.assignedTariffNames?.length ?? 0;
                    return assignedCount < allTariffsCount;
                });
            }
            
            const areAllSelectableRowsOnPageSelected = selectableRowsOnPage.length > 0 && 
                selectableRowsOnPage.every(row => row.getIsSelected());
            const areSomeSelectableRowsOnPageSelected = selectableRowsOnPage.some(row => row.getIsSelected());

            return (
                <div className="flex justify-center">
                    <Checkbox
                        checked={
                            selectableRowsOnPage.length === 0 ? false :
                            areAllSelectableRowsOnPageSelected ? true : 
                            areSomeSelectableRowsOnPageSelected ? 'indeterminate' : false
                        }
                        onCheckedChange={(value) => {
                            selectableRowsOnPage.forEach(row => {
                                row.toggleSelected(!!value);
                            });
                        }}
                        aria-label={t('common.selectAll')}
                        disabled={selectableRowsOnPage.length === 0}
                    />
                </div>
            );
        },
        cell: ({ row }) => {
            const pkg = row.original;
            let isSelectable = true;

            if (isSelectionModeProp) {
                const isAlreadyInTariff = existingPackageIdsInTariff.has(pkg.id);
                isSelectable = !isAlreadyInTariff;
            } else {
                const assignedCount = pkg.assignedTariffNames?.length ?? 0;
                isSelectable = assignedCount < allTariffsCount;
            }

            return (
                <div className="flex justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={t('common.selectRow')}
                        disabled={!isSelectable}
                    />
                </div>
            );
        },
        enableSorting: false,
        enableHiding: false,
        size: 40,
    },
    {
        id: 'name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="px-0 hover:bg-transparent">
                {t(columnIdToTKeyMap.name)}
                <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
        ),
        accessorKey: 'name',
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("name")}</div>
        ),
        enableHiding: true,
        enableSorting: true,
    },
    {
        id: 'description',
        header: () => <div className="text-left">{t(columnIdToTKeyMap.description)}</div>,
        accessorKey: 'description',
        cell: ({ getValue }) => <div className="max-w-xs text-xs text-left truncate text-muted-foreground">{getValue<string>() || '-'}</div>,
        enableHiding: true,
        enableSorting: false,
    },
    {
        id: 'price',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-end w-full px-0 hover:bg-transparent">
                {t(columnIdToTKeyMap.price)}
                <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
        ),
        accessorKey: 'price',
        cell: ({ getValue }) => <div className="text-right">{formatCurrency(getValue<number>())}</div>,
        enableHiding: true,
        meta: { align: 'right' },
        enableSorting: true,
        size: 80,
    },
    {
        id: 'itemsCount',
        header: () => <div className="text-center">{t(columnIdToTKeyMap.itemsCount)}</div>,
        accessorFn: (row) => row.items.length,
        cell: ({ getValue }) => <div className="text-center">{getValue<number>()}</div>,
        enableHiding: true,
        enableSorting: false,
        size: 60,
        meta: { align: 'center' },
    },
    {
        id: 'assignedToTariffs',
        header: () => <div className="text-left">{t(columnIdToTKeyMap.assignedToTariffs)}</div>,
        accessorFn: (row) => row.assignedTariffNames,
        cell: ({ row }) => {
            const pkg = row.original;
            if (isSelectionModeProp) {
                const isAssignedToCurrent = existingPackageIdsInTariff.has(pkg.id);
                return isAssignedToCurrent ? (
                    <Badge variant="outline" className="font-normal text-green-600 border-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('packages.assignedToCurrentTariff')}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                        <XCircle className="w-3 h-3 mr-1" />
                        {t('packages.notAssignedToCurrentTariff')}
                    </Badge>
                );
            }
            const assignedTariffs = pkg.assignedTariffNames;
            if (!assignedTariffs || assignedTariffs.length === 0) {
                return <div className="text-xs text-left text-muted-foreground">-</div>;
            }
            const MAX_VISIBLE_TARIFFS = 3;
            const visibleTariffs = assignedTariffs.slice(0, MAX_VISIBLE_TARIFFS);
            const hiddenTariffsCount = assignedTariffs.length - MAX_VISIBLE_TARIFFS;
            
            if (assignedTariffs.length <= MAX_VISIBLE_TARIFFS) {
                return (
                     <div className="flex flex-col items-start text-xs cursor-default">
                        {visibleTariffs.map((tariffName, index) => (
                            <Badge key={index} variant="outline" className="mb-0.5 font-normal truncate max-w-[120px]">{tariffName}</Badge>
                        ))}
                    </div>
                ); 
            }
            return (
                <HoverCard openDelay={100} closeDelay={50}>
                    <HoverCardTrigger asChild>
                         <div className="flex flex-col items-start text-xs cursor-default">
                             {visibleTariffs.map((tariffName, index) => (
                                <Badge key={index} variant="outline" className="mb-0.5 font-normal truncate max-w-[120px]">{tariffName}</Badge>
                             ))}
                             {hiddenTariffsCount > 0 && (
                                 <span className="text-muted-foreground">+ {hiddenTariffsCount} {t('common.more_other', { count: hiddenTariffsCount })}</span>
                             )}
                         </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" align="start" className="z-50 w-auto max-w-xs break-words">
                        <p className="mb-1 font-semibold">{t('packages.assignedToFullList')}:</p>
                        <ul className="pl-4 text-xs list-disc">
                            {assignedTariffs.map((tariffName, index) => (
                                <li key={index}>{tariffName}</li>
                            ))}
                        </ul>
                    </HoverCardContent>
                </HoverCard>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            const assignedTariffNames = row.getValue(columnId) as string[];
            const filterTariffName = filterValue as string;

            if (!filterTariffName || filterTariffName === 'all') return true;
            if (filterTariffName === '__NONE__') {
                return assignedTariffNames.length === 0;
            }
            return assignedTariffNames.includes(filterTariffName);
        },
        enableSorting: false,
        enableHiding: true,
        size: 180,
    },
    {
        id: 'pointsAwarded',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-end w-full px-0 hover:bg-transparent">
                {t(columnIdToTKeyMap.points)}
                <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
        ),
        accessorFn: (row) => row.settings?.pointsAwarded ?? 0,
        cell: ({ getValue }) => <div className="text-right">{getValue<number>()}</div>,
        enableHiding: true,
        meta: { align: 'right' },
        enableSorting: true,
        size: 80,
    },
    {
        id: 'status',
        accessorKey: 'derivedIsActive',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-center w-full px-0 hover:bg-transparent">
                {t(columnIdToTKeyMap.status)}
                <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
        ),
        cell: ({ row }) => {
            const isActive = row.original.derivedIsActive;
            return (
                <div className="text-center">
                     <Badge variant={"outline"} className={cn(
                         "font-normal",
                         isActive
                           ? "border-green-500 text-green-600"
                           : "border-red-500 text-red-600"
                     )}>
                         {isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {isActive ? t('common.status.active') : t('common.status.inactive')}
                    </Badge>
                </div>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            const isActive = row.original.derivedIsActive;
            const filterStatus = filterValue as string;
            if (filterStatus === 'all' || !filterStatus) return true;
            return filterStatus === 'active' ? isActive : !isActive;
        },
        meta: { align: 'center' },
        enableSorting: true,
        size: 100,
    },
    {
        id: 'containsSpecificService',
        accessorFn: (row) => row.items.filter(i => !!i.serviceId).map(i => i.serviceId).join(','),
        enableHiding: false,
        enableSorting: false,
        header: null,
        cell: null,
        filterFn: (row, columnId, filterValue) => {
            const serviceIdToFind = filterValue as string;
            if (!serviceIdToFind || serviceIdToFind === 'all') return true;
            const serviceIds = row.getValue(columnId) as string;
            return serviceIds.includes(serviceIdToFind);
        },
    },
    {
        id: 'containsSpecificProduct',
        accessorFn: (row) => row.items.filter(i => !!i.productId).map(i => i.productId).join(','),
        enableHiding: false,
        enableSorting: false,
        header: null,
        cell: null,
        filterFn: (row, columnId, filterValue) => {
            const productIdToFind = filterValue as string;
            if (!productIdToFind || productIdToFind === 'all') return true;
            const productIds = row.getValue(columnId) as string;
            return productIds.includes(productIdToFind);
        },
    },
    {
        id: 'actions',
        header: () => <div className="pr-2 text-right">{t(columnIdToTKeyMap.actions)}</div>,
        cell: ({ row }) => {
            const pkg = row.original;
            const isCurrentlyAssignedToThisTariff = isSelectionModeProp && existingPackageIdsInTariff.has(pkg.id);

            let editDeleteDisabled = false;
            if (isSelectionModeProp) {
                const assignedTariffsOfPackage = pkg.tariffPrices?.map(tp => tp.tariff.id) || [];
                editDeleteDisabled = !(assignedTariffsOfPackage.length === 0 ||
                                   (assignedTariffsOfPackage.length === 1 && currentTariffForSelection != null && assignedTariffsOfPackage[0] === currentTariffForSelection.id));
            }

            return (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-8 h-8 p-0">
                                <span className="sr-only">{t('common.openMenu')}</span>
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                                onClick={() => handleEdit(pkg.id)} 
                                className="cursor-pointer"
                                disabled={editDeleteDisabled}
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                <span>{t('common.edit')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50"
                                onClick={() => handleDelete(pkg.id, pkg.name)}
                                disabled={editDeleteDisabled}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                <span>{t('common.delete')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
        enableHiding: false,
        enableSorting: false,
        meta: { align: 'right' },
        size: 80,
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
          <span className="truncate">
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
          </span>
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
                onSelect={() => { onChange(null); setOpen(false); }}
                className="text-xs text-muted-foreground"
              >
                <X className="w-3 h-3 mr-2" /> Limpiar selección
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
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
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

export const PackageListTable: React.FC<PackageListTableProps> = ({
    data: initialData,
    isLoading: initialIsLoading,
    error: initialError,
    servicesList: initialServicesList,
    productsList: initialProductsList,
    tariffsList: initialTariffsList,
    currentTariff: initialCurrentTariff,
    isSelectionMode: propIsSelectionMode,
}) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const searchParams = useSearchParams();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState<string | null>(null);
    const [productFilter, setProductFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
    const [packageToDelete, setPackageToDelete] = useState<{id: string, name: string} | null>(null);
    const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
    const [packageIdsToAssociate, setPackageIdsToAssociate] = useState<string[]>([]);

    const isSelectionMode = propIsSelectionMode;
    const currentTariffForSelection = initialCurrentTariff;
    const tariffIdForSelection = searchParams?.get("selectForTariff"); // Obtenerlo de searchParams

    // Consultas optimizadas
    const { data: packagesFromQuery = [], isLoading: isLoadingPackages, error: packagesError, refetch: refetchPackages } = usePackageDefinitionsQuery();
    const { data: servicesList = [], isLoading: isLoadingServices, error: servicesError } = useServicesQuery();
    const { data: productsList = [], isLoading: isLoadingProducts, error: productsError } = useProductsQuery();
    const { data: allTariffs = [], isLoading: isLoadingTariffs, error: tariffsError } = useTariffsQuery();

    // Consulta para obtener los paquetes de la tarifa actual (solo IDs)
    const { 
        data: tariffPackagesData = [], // Ahora debería ser TariffPackagePriceData[] o similar
        isLoading: isLoadingTariffPackages, 
        error: tariffPackagesError 
    } = useTariffPackagesQuery(tariffIdForSelection, { 
        enabled: isSelectionMode && !!tariffIdForSelection, // Solo ejecutar si estamos en modo selección y tenemos ID
    });

    // Calcular existingPackageIdsInTariff directamente con useMemo
    const existingPackageIdsInTariff = useMemo(() => {
        if (!isSelectionMode || !tariffPackagesData || !Array.isArray(tariffPackagesData)) {
            return new Set<string>();
        }
        // Asegurarse de mapear el ID correcto desde tariffPackagesData
        const ids = tariffPackagesData.map((p: any) => p.packageDefinitionId); // Ajustar si la estructura es diferente
        return new Set<string>(ids);
    }, [tariffPackagesData, isSelectionMode]);

    // Mutaciones
    const addPackagesMutation = useAddPackagesToTariffMutation();
    const deletePackageMutation = useDeletePackageDefinitionMutation();

    // Estado general de carga y error
    const isLoading = isLoadingPackages || isLoadingServices || isLoadingProducts || isLoadingTariffs || (isSelectionMode && isLoadingTariffPackages);
    const error = packagesError || servicesError || productsError || tariffsError || (isSelectionMode && tariffPackagesError);

    // Procesamiento de datos para la tabla
    const packagesDataForTable = useMemo(() => {
        if (!packagesFromQuery) return [];
        return packagesFromQuery.map(pkg => {
            const settings = pkg.settings;
            const derivedIsActive = settings?.isActive ?? true;
            const assignedTariffNames = (pkg.tariffPrices ?? [])
                .map(tp => tp.tariff.name)
                .filter((name): name is string => !!name)
                .sort();
            
            return {
                ...pkg,
                derivedIsActive,
                hasServices: pkg.items.some(item => item.serviceId !== null),
                assignedTariffNames: assignedTariffNames,
            };
        });
    }, [packagesFromQuery]);
    
    // Handlers...
    const handleEditPackage = (id: string) => {
        router.push(`/configuracion/paquetes/${id}`);
    };

    const handleAddPackageToTariff = (packageId: string) => {
        if (!tariffIdForSelection) return;
        addPackagesMutation.mutate(
            { tariffId: tariffIdForSelection, packageDefinitionIds: [packageId] },
            {
                onSuccess: (data: any) => {
                    sonnerToast.success(data.message || t("packages.addSingleSuccess"));
                    queryClient.invalidateQueries({ queryKey: ['tariffPackages', tariffIdForSelection] });
                },
                onError: (error: any) => {
                    sonnerToast.error(`${t("packages.addError")}: ${error.message || t('common.unknownError')}`);
                }
            }
        );
    };

    const handleAddSelectedToTariff = () => {
        if (!tariffIdForSelection) return;
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const packageIdsToAdd = selectedRows
            .map(row => row.original.id)
            .filter(id => !existingPackageIdsInTariff.has(id));

        if (packageIdsToAdd.length === 0) {
            sonnerToast.info(t("packages.noNewSelected"));
            return;
        }

        addPackagesMutation.mutate(
            { tariffId: tariffIdForSelection, packageDefinitionIds: packageIdsToAdd },
            {
                onSuccess: (data: any) => {
                    sonnerToast.success(data.message || t("packages.addMultipleSuccess"));
                    queryClient.invalidateQueries({ queryKey: ['tariffPackages', tariffIdForSelection] });
                    table.resetRowSelection(); 
                },
                onError: (error: any) => {
                    sonnerToast.error(`${t("packages.addError")}: ${error.message || t('common.unknownError')}`);
                }
            }
        );
    };

    const handleDeleteClick = (id: string, name: string) => {
        setPackageToDelete({ id, name });
    };
    
    const confirmDelete = () => {
        if (!packageToDelete) return;
        deletePackageMutation.mutate(packageToDelete.id, {
            onSuccess: (data: unknown, variables: string, context: unknown) => {
                const deletedPackageId = data as string;
                sonnerToast.success(t('packages.deleteSuccess', { name: packageToDelete?.name ?? deletedPackageId }));
                setPackageToDelete(null);
                queryClient.invalidateQueries({ queryKey: ['packages'] }); 
            },
            onError: (error: any) => {
                sonnerToast.error(`${t('packages.deleteError')}: ${error.message}`);
                setPackageToDelete(null);
            },
        });
    };
    
    const handleOpenAssociateModal = () => {
        const selectedIds = table.getFilteredSelectedRowModel().rows
            .map(row => row.original.id)
            .filter((id): id is string => !!id);
        
        if (selectedIds.length === 0) {
            sonnerToast.info(t("packages.selectForAssociation"));
            return;
        }

        setPackageIdsToAssociate(selectedIds);
        setIsAssociateModalOpen(true);
    };

    // Definición de columnas (usando la función getColumns)
    const columns = useMemo(() => getColumns(
        handleEditPackage, 
        handleDeleteClick,
        t,
        isSelectionMode,
        currentTariffForSelection,
        existingPackageIdsInTariff,
        handleAddPackageToTariff,
        addPackagesMutation.isPending,
        allTariffs.length
    ), [t, isSelectionMode, currentTariffForSelection, existingPackageIdsInTariff, addPackagesMutation.isPending, allTariffs.length]);

    // Configuración de la tabla
    const table = useReactTable({
        data: packagesDataForTable,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            globalFilter,
            columnFilters,
        },
        enableRowSelection: true,
        getRowId: (row) => row.id,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            pagination: {
                pageSize: 15,
            }
        },
        meta: {
        }
    });

    // Effects para filtros actualizados
    useEffect(() => {
        setColumnFilters(prev => {
            const newFilters = prev.filter(f => f.id !== 'status' && f.id !== 'assignedToTariffs');
            if (statusFilter !== 'all') {
                newFilters.push({ id: 'status', value: statusFilter });
            }
            if (!isSelectionMode && assignmentFilter && assignmentFilter !== 'all') {
                 newFilters.push({ id: 'assignedToTariffs', value: assignmentFilter === '__NONE__' ? null : assignmentFilter });
            } else if (isSelectionMode) {
                // En modo selección, el filtro 'assignedToTariffs' no se aplica o se limpia.
                // No se añade al array newFilters, por lo que efectivamente se elimina si estaba.
            }
            
            // Compara los filtros relevantes antes y después para evitar una actualización si no hay cambios.
            const relevantCurrentFilters = prev.filter(f => f.id === 'status' || f.id === 'assignedToTariffs').sort((a,b) => String(a.id).localeCompare(String(b.id)));
            const relevantNewFilters = newFilters.filter(f => f.id === 'status' || f.id === 'assignedToTariffs').sort((a,b) => String(a.id).localeCompare(String(b.id)));

            if (JSON.stringify(relevantNewFilters) !== JSON.stringify(relevantCurrentFilters)) {
                 // Reconstruye todos los filtros: los que no tocamos + los nuevos/actualizados.
                 // Esto es para asegurar que otros filtros (si los hubiera gestionados de otra forma) no se pierdan.
                 // Aunque en este caso, parece que 'status' y 'assignedToTariffs' son los únicos gestionados por columnFilters aquí.
                 const finalFilters = prev.filter(f => f.id !== 'status' && f.id !== 'assignedToTariffs');
                 if (statusFilter !== 'all') {
                    finalFilters.push({ id: 'status', value: statusFilter });
                 }
                 if (!isSelectionMode && assignmentFilter && assignmentFilter !== 'all') {
                    finalFilters.push({ id: 'assignedToTariffs', value: assignmentFilter === '__NONE__' ? undefined : assignmentFilter }); // Usar undefined
                 }                 
                 return finalFilters;
            }
            return prev;
        });
    }, [statusFilter, assignmentFilter, isSelectionMode, setColumnFilters]);

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

    // Render
    return (
        <div className={cn("w-full", /* isCollapsed ? 'max-h-96 overflow-y-auto' : '' */)}>
            {/* Filtros y acciones */} 
            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                {/* Input de búsqueda global */} 
                <div className="relative flex-grow md:flex-grow-0 md:basis-1/3">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('packages.searchPlaceholder')}
                        value={globalFilter ?? ''}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="w-full pl-8 h-9"
                    />
                </div>
                
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    {/* Filtro de estado */} 
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                        <SelectTrigger className="w-full text-sm md:w-auto h-9">
                            <SelectValue placeholder={t('common.statusPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('common.allStatuses')}</SelectItem>
                            <SelectItem value="active">{t('common.status.active')}</SelectItem>
                            <SelectItem value="inactive">{t('common.status.inactive')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Filtro de asignación a tarifa (solo si NO es modo selección) */} 
                    {!isSelectionMode && (
                        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                            <SelectTrigger className="w-full text-sm md:w-[200px] h-9">
                                <SelectValue placeholder={t('packages.filters.assignmentFilterPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('packages.filters.allAssignments')}</SelectItem>
                                <SelectItem value="__NONE__">{t('packages.filters.notAssignedShort')}</SelectItem>
                                {allTariffs.map(tariff => (
                                    <SelectItem key={tariff.id} value={tariff.id}>{tariff.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Botón Limpiar Filtros */} 
                    <Button variant="outline" onClick={() => {
                        setGlobalFilter('');
                        setStatusFilter('all');
                        setAssignmentFilter('all');
                        table.resetColumnFilters();
                    }} className="h-9">
                        <X className="w-4 h-4 mr-2" />
                        {t('common.clearFilters')}
                    </Button>
                </div>
            </div>

            {/* Mensaje de selección */} 
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

            {/* <<< INSERTAR tableControlsJsx AQUÍ >>> */}
            {tableControlsJsx}

            {/* Tabla */} 
            <div className="mb-2 overflow-hidden border rounded-md">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }} className={cn((header.column.columnDef.meta as any)?.align === 'center' && 'text-center', (header.column.columnDef.meta as any)?.align === 'right' && 'text-right')}>
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
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                    {columns.map(col => (
                                        <TableCell key={`${col.id}-skel-${i}`} className={cn((col.meta as any)?.align === 'center' && 'text-center', (col.meta as any)?.align === 'right' && 'text-right')}>
                                            <Skeleton className="w-full h-5" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        isSelectionMode && existingPackageIdsInTariff.has(row.original.id) && !row.getIsSelected() && 'opacity-60 bg-gray-50 cursor-not-allowed',
                                        isSelectionMode && !existingPackageIdsInTariff.has(row.original.id) && 'hover:bg-purple-50 cursor-pointer',
                                        !isSelectionMode && 'hover:bg-gray-50',
                                        row.getIsSelected() && isSelectionMode && 'bg-blue-100 hover:bg-blue-200',
                                        row.getIsSelected() && !isSelectionMode && 'bg-blue-50'
                                    )}
                                    onClick={() => {
                                        const pkgId = row.original.id;
                                        if (isSelectionMode && !existingPackageIdsInTariff.has(pkgId)) {
                                            row.toggleSelected();
                                        } else if (!isSelectionMode && row.getCanSelect()) {
                                            const assignedCount = row.original.assignedTariffNames?.length ?? 0;
                                            if (assignedCount < allTariffs.length) {
                                                row.toggleSelected();
                                            }
                                        }
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className={cn((cell.column.columnDef.meta as any)?.align === 'center' && 'text-center', (cell.column.columnDef.meta as any)?.align === 'right' && 'text-right')}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {t('packages.noPackagesFound')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación y Botones Flotantes */} 
            {/* Asegúrate de que la paginación funcione con los datos filtrados */} 
            {packagesDataForTable.length > 0 && ( // Mostrar si hay datos, la lógica interna de PaginationControls manejará el resto
                 <div className="flex items-center justify-end mt-1">
                    <PaginationControls table={table} />
                </div>
            )}
            
            {/* Botones flotantes */} 
            <div className="fixed z-50 flex flex-wrap items-center gap-2 bottom-4 right-4">
                {/* Botón Volver */} 
                {(isSelectionMode && tariffIdForSelection) && (
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
                
                {/* Botón Ayuda */} 
                <Button variant="outline" onClick={() => sonnerToast.info(t('common.help_not_implemented'))} className="order-2">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    {t('common.help')}
                </Button>

                {/* Botón Nuevo Paquete */} 
                <Button onClick={() => router.push('/configuracion/paquetes/nuevo')} className="order-3 text-white bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t('packages.newPackageButton')}
                </Button>
                
                {/* Botones de Acción Contextuales */} 
                <div className="flex order-4 gap-2">
                    {isSelectionMode && (
                        <Button 
                            onClick={handleAddSelectedToTariff}
                            disabled={addPackagesMutation.isPending || table.getFilteredSelectedRowModel().rows.length === 0}
                            className="text-white bg-green-600 hover:bg-green-700"
                        >
                            {addPackagesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} 
                            {t('packages.actions.addSelectedToTariff')} {table.getFilteredSelectedRowModel().rows.length > 0 ? `(${table.getFilteredSelectedRowModel().rows.length})` : ''}
                        </Button>
                    )}
                    {!isSelectionMode && (
                        <Button 
                            onClick={handleOpenAssociateModal}
                            disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                            className={cn(
                                "text-white",
                                table.getFilteredSelectedRowModel().rows.length > 0 
                                    ? "bg-purple-600 hover:bg-purple-700" 
                                    : "bg-purple-300 text-purple-100 cursor-not-allowed"
                            )}
                        >
                            <PackageCheck className="w-4 h-4 mr-2" />
                            {t('packages.actions.associateToTariff')} {table.getFilteredSelectedRowModel().rows.length > 0 ? `(${table.getFilteredSelectedRowModel().rows.length})` : ''}
                        </Button>
                    )}
                </div>
            </div>

            {/* Diálogo de Confirmación de Eliminación */} 
            <Dialog open={!!packageToDelete} onOpenChange={() => setPackageToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('packages.deleteDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('packages.deleteDialog.description', { packageName: packageToDelete?.name ?? '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPackageToDelete(null)}>{t('common.cancel')}</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deletePackageMutation.isPending}>
                            {deletePackageMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Asociación */} 
            {!isSelectionMode && (
                 <AssociateToTariffModal
                    isOpen={isAssociateModalOpen}
                    onClose={() => {
                        setIsAssociateModalOpen(false);
                        setPackageIdsToAssociate([]);
                        table.resetRowSelection();
                    }}
                    itemType="PACKAGE" 
                    itemIds={packageIdsToAssociate}
                    onAssociationSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['packages'] });
                        queryClient.invalidateQueries({ queryKey: ['tariffPackages'] });
                        table.resetRowSelection();
                    }}
                />
            )}
        </div>
    );
};

const PackageTableSkeleton: React.FC<{t: (key: string) => string, columnCount: number}> = ({ t, columnCount }) => (
    <div className="space-y-4">
        <div className="grid items-center grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Skeleton className="w-full col-span-1 h-9 sm:col-span-2 md:col-span-1" />
            <Skeleton className="w-full h-9" />
            <Skeleton className="w-full h-9" />
            <Skeleton className="w-full h-9" />
            <Skeleton className="w-full h-9" />
        </div>
        <div className="border rounded-md">
            <Skeleton className="w-full h-64" />
         </div>
         <div className="flex items-center justify-between py-4 space-x-2">
            <Skeleton className="w-32 h-4" />
            <div className="flex items-center space-x-2">
                <Skeleton className="w-20 h-8" />
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-20 h-8" />
            </div>
         </div>
    </div>
); 