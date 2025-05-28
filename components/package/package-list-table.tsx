"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
    VisibilityState,
    RowSelectionState,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, ArrowUpDown, ChevronDown, Settings2, FilterX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/format-utils';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, CheckCircle, XCircle } from "lucide-react";
import { Prisma } from "@prisma/client";
import { AssociateToTariffModal } from '@/components/tariff/associate-to-tariff-modal';

interface Service {
    id: string;
    name: string;
}
interface Product {
    id: string;
    name: string;
}
interface PackageItem {
    id: string;
    itemType: 'SERVICE' | 'PRODUCT';
    quantity: number;
    service?: Service | null;
    productId?: string | null;
    product?: Product | null;
    serviceId?: string | null;
}
interface PackageDefinitionSetting {
    isActive: boolean;
    pointsAwarded: number;
}
interface PackageDefinition {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    settings?: PackageDefinitionSetting | null;
    items: PackageItem[];
    createdAt: string;
    updatedAt: string;
    systemId: string;
    isAssignedToTariff?: boolean;
    derivedIsActive: boolean;
}
interface PaginationState {
    currentPage: number;
    totalPages: number;
    totalPackages: number;
    limit: number;
}

type TariffPackagePriceData = Prisma.TariffPackagePriceGetPayload<{
  select: { packageDefinitionId: true } 
}>;

interface PackageListTableProps {
    data: PackageDefinition[];
    isLoading: boolean;
    error: string | null;
    pagination: PaginationState;
    onPageChange: (newPage: number) => void;
    onRefresh: () => void;
}

const columnIdToTKeyMap: Record<string, string> = {
    select: 'common.select',
    name: 'packages.table.headers.name',
    description: 'common.description',
    price: 'packages.table.headers.price',
    itemsCount: 'packages.table.headers.items',
    points: 'packages.table.headers.points',
    status: 'packages.table.headers.status',
    actions: 'common.actions',
};

const getColumns = (
    handleEdit: (id: string) => void,
    handleDelete: (id: string, name: string) => void,
    t: (key: string) => string,
    isSelectionMode: boolean
): ColumnDef<PackageDefinition>[] => [
    ...(isSelectionMode ? [{
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                onCheckedChange={(value) => {
                    const rowsToToggle = table.getRowModel().rows.filter((row: any) => !row.original.isAssignedToTariff);
                    const allSelected = rowsToToggle.every((row: any) => row.getIsSelected());
                    rowsToToggle.forEach((row: any) => row.toggleSelected(!allSelected));
                }}
                aria-label="Select all on page"
                disabled={table.getRowModel().rows.filter((row: any) => !row.original.isAssignedToTariff).length === 0}
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                disabled={row.original.isAssignedToTariff}
            />
        ),
        enableSorting: false,
        enableHiding: false,
    }] : []),
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                {t('packages.table.headers.name')}
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "description",
        header: t('common.description'),
        cell: ({ row }) => <div className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-xs">{row.getValue("description") || '-'}</div>,
        enableHiding: true,
    },
    {
        accessorKey: "price",
        header: ({ column }) => (
             <div className="text-right">
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {t('packages.table.headers.price')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        ),
        cell: ({ row }) => {
            const price = parseFloat(row.getValue("price"));
            const formatted = formatCurrency(price);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        id: "itemsCount",
        header: () => <div className="text-center">{t('packages.table.headers.items')}</div>,
        cell: ({ row }) => <div className="text-center hidden md:table-cell">{row.original.items?.length ?? 0}</div>,
        enableHiding: true,
    },
    {
        accessorKey: "points",
        header: () => <div className="text-right">{t('packages.table.headers.points')}</div>,
        cell: ({ row }) => <div className="text-right hidden md:table-cell">{row.original.settings?.pointsAwarded ?? 0}</div>,
        enableHiding: true,
    },
    {
        id: 'status',
        accessorKey: "derivedIsActive",
        header: () => <div className="text-center">{t('packages.table.headers.status')}</div>,
        cell: ({ row }) => {
            const isActive = row.original.derivedIsActive;
            return (
            <div className="text-center">
                    {isSelectionMode ? (
                        row.original.isAssignedToTariff ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Asignado</Badge>
                        ) : (
                            <Badge variant="outline" className="border-blue-300 text-blue-800">No asignado</Badge>
                        )
                    ) : (
                        isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        )
                    )}
            </div>
            );
        },
        filterFn: (row, id, value) => {
            if (value === 'all') return true;
            const isActive = !!row.original.derivedIsActive;
            return value === 'active' ? isActive : !isActive;
        },
    },
    ...(!isSelectionMode ? [{
        id: "actions",
        header: () => <div className="text-right">{t('common.actions')}</div>,
        cell: ({ row }) => (
            <div className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original.id)} title={t('common.edit')}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id, row.original.name)} title={t('common.delete')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
            </div>
        ),
    }] : []),
];

export default function PackageListTable({
    data: initialData,
    isLoading: initialIsLoading,
    error: initialError,
    pagination,
    onPageChange,
    onRefresh
}: PackageListTableProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const tariffIdParam = searchParams?.get("selectForTariff");
    const isSelectionMode = !!tariffIdParam;

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
    const [selectedPackageDefinitionIds, setSelectedPackageDefinitionIds] = useState<string[]>([]);

    const { data: existingPackageIdsInTariff = [], isLoading: isLoadingExistingPackages } = useQuery<string[]>({
        queryKey: ['tariffPackages', tariffIdParam],
        queryFn: async () => {
            if (!isSelectionMode || !tariffIdParam) return [];
            const response = await fetch(`/api/tariffs/${tariffIdParam}/packages`);
            if (!response.ok) throw new Error('Error al cargar paquetes de la tarifa');
            const data: TariffPackagePriceData[] = await response.json();
            return data.map(item => item.packageDefinitionId);
        },
        enabled: isSelectionMode,
        staleTime: 5 * 60 * 1000,
    });
    
    const processedData = useMemo(() => {
        if (isSelectionMode && isLoadingExistingPackages) return [];
        return initialData.map(pkg => ({
            ...pkg,
            derivedIsActive: pkg.settings?.isActive ?? true,
            points: pkg.settings?.pointsAwarded ?? 0,
            isAssignedToTariff: isSelectionMode ? existingPackageIdsInTariff.includes(pkg.id) : undefined,
        }));
    }, [initialData, existingPackageIdsInTariff, isSelectionMode, isLoadingExistingPackages]);
    
    const isLoading = initialIsLoading || (isSelectionMode && isLoadingExistingPackages);
    const error = initialError;

    const handleEdit = useCallback((id: string) => {
        router.push(`/configuracion/paquetes/${id}`);
    }, [router]);

    const handleDelete = useCallback(async (id: string, name: string) => {
        const confirmation = confirm(t('common.confirmTitle') + `\n\n${t('packages.table.deleteConfirmDesc').replace('paquete', `paquete "${name}"`)}`);
        if (confirmation) {
             const deletingToast = toast.loading(t('common.deleting', { item: t('packages.item') }));
            try {
                const response = await fetch(`/api/package-definitions/${id}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || t('common.errors.deleteFailed', { item: t('packages.item') }));
                }
                toast.success(t('common.deletedSuccess', { item: t('packages.item') }), { id: deletingToast });
                onRefresh();
            } catch (err: any) {
                 toast.error(t('common.errors.deleteTitle'), { description: err.message, id: deletingToast });
            }
        }
    }, [t, onRefresh]);

    const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, t, isSelectionMode), [handleEdit, handleDelete, t, isSelectionMode]);

    const table = useReactTable({
        data: processedData || [],
        columns,
        autoResetPageIndex: false,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getRowId: (row) => row.id,
        enableRowSelection: (row) => isSelectionMode && !row.original.isAssignedToTariff,
    });

    useEffect(() => {
        const statusColumn = table.getColumn('status');
        if (statusColumn) {
            statusColumn.setFilterValue(statusFilter);
        }
    }, [statusFilter, table.getColumn]);
    
    const { mutate: addPackagesMutation, isPending: isAddingPackages } = useMutation({
        mutationFn: async (selectedPackageIds: string[]) => {
            if (!tariffIdParam) throw new Error("ID de tarifa no disponible.");
            const response = await fetch(`/api/tariffs/${tariffIdParam}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageDefinitionIds: selectedPackageIds }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status} al añadir paquetes`);
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast.success(data.message || "Paquetes añadidos correctamente.");
            queryClient.invalidateQueries({ queryKey: ['tariffPackages', tariffIdParam] });
            table.resetRowSelection();
        },
        onError: (error) => {
            console.error("Error adding packages:", error);
            toast.error(`Error al añadir paquetes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        },
    });

    const handleAddSelectedToTariff = () => {
        const selectedRows = table.getSelectedRowModel().rows;
        const selectedPackageIds = selectedRows.map(row => row.original.id);
        if (selectedPackageIds.length === 0) {
            toast.info("Selecciona al menos un paquete para añadir.");
            return;
        }
        addPackagesMutation(selectedPackageIds);
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
        Array.from({ length: rows }).map((_, index) => (
            <TableRow key={`skel-${index}`}>
                {columns.map((column, colIndex) => (
                    <TableCell key={`skel-cell-${index}-${column.id || colIndex}`}>
                        <Skeleton className="h-5 w-full" />
                    </TableCell>
                ))}
            </TableRow>
        ))
    );

    useEffect(() => {
      console.log('[DEBUG i18n] Attempting translation on initial mount:');
      try {
        // Usar una clave que estaba dando problemas
        const testTranslation = t('common.status.title'); 
        console.log(`  -> Test Translation ('common.status.title'): ${testTranslation}`);
      } catch (e) {
         console.error("  -> Error translating on mount:", e);
      }
    }, []); // Array vacío para ejecutar solo una vez al montar

    const handleClearFilters = () => {
        setGlobalFilter('');
        setStatusFilter('all');
        table.resetColumnFilters();
        table.setGlobalFilter('');
    };
    
    const isFiltered = globalFilter !== '' || statusFilter !== 'all';

    const handleOpenAssociateModal = () => {
        const selectedIds = table.getSelectedRowModel().rows
                                .map(row => row.original.id)
                                .filter((id): id is string => !!id);
        
        if (selectedIds.length === 0) {
            toast.info("Selecciona al menos un paquete para asociar.");
            return;
        }
        
        setSelectedPackageDefinitionIds(selectedIds);
    };
    
    if (error && !isLoading) {
        return <div className="p-4 text-red-600">{t('common.errors.loadingError')}: {error}</div>;
    }

    return (
        <>
            <div className="flex items-center justify-between py-4 gap-2 flex-wrap"> 
                <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                 <Input
                        placeholder={t('common.filterByName') + "..."}
                        value={globalFilter ?? ''}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="max-w-xs h-9"
                 />
                </div>
                <div className="flex items-center gap-2">
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9">
                                {t('common.status.title')} <ChevronDown className="ml-2 h-4 w-4" />
                         </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('common.filterByStatus')}</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onCheckedChange={() => setStatusFilter('all')}>
                                {t('common.status.all')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={statusFilter === 'active'} onCheckedChange={() => setStatusFilter('active')}>
                                {t('common.status.active')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={statusFilter === 'inactive'} onCheckedChange={() => setStatusFilter('inactive')}>
                                {t('common.status.inactive')}
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {isFiltered && (
                        <Button
                            variant="ghost"
                            onClick={handleClearFilters}
                            className="h-9 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
                            title={t('common.clearFilters')}
                        >
                            <FilterX className="h-4 w-4" />
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto h-9">
                                <Settings2 className="mr-2 h-4 w-4" /> {t('common.columns')} 
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                         {table
                             .getAllColumns()
                             .filter((column) => column.getCanHide())
                             .map((column) => {
                                    const translationKey = columnIdToTKeyMap[column.id] || `packages.table.headers.${column.id}`;
                                 return (
                                     <DropdownMenuCheckboxItem
                                         key={column.id}
                                         className="capitalize"
                                         checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                     >
                                            {t(translationKey)} 
                                     </DropdownMenuCheckboxItem>
                                 );
                             })}
                     </DropdownMenuContent>
                 </DropdownMenu>
            </div>
            </div>

            <div className="rounded-md border mb-16">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
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
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {t('common.noResults')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 flex justify-between items-center gap-4 z-10 ml-14"> 
                <Button variant="outline" onClick={handleVolver}>
                    {isSelectionMode ? t('common.backToTariff') : t('common.back')}
                </Button>
                
                {isSelectionMode ? (
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {t('common.selectedCount', { count: selectedCount })}
                        </span>
                    )}
                    <Button onClick={handleAddSelectedToTariff} disabled={isAddingPackages || selectedCount === 0}>
                        {isAddingPackages ? t('common.adding') : `${t('common.addSelected')} ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
                        <Plus className="ml-2 h-4 w-4" />
                    </Button>
                </div>
                ) : (
                    null 
                )}
            </div>
        </>
    );
} 