"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { TFunction } from 'i18next';
import { cn } from "@/lib/utils";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
    FilterFn,
    Row,
    CellContext,
    HeaderContext,
    VisibilityState
} from "@tanstack/react-table";
import type { CheckedState } from "@radix-ui/react-checkbox";

import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import { AlertModal } from "@/components/common/alert-modal";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { Promotion, PromotionType, PromotionTargetScope, Clinic, PromotionAccumulationMode } from '@prisma/client';
import { PromotionWithRelations } from '@/types/promotion';

interface PromotionsTableMeta {
    handleEdit: (id: string) => void;
    t: TFunction;
}

interface PromotionsApiResponse {
    data: PromotionWithRelations[];
    totalPromotions?: number; 
}

const formatEnumValue = (value: string, prefix: string, t: (key: string) => string): string => {
    const key = `enums.${prefix}.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
};

const MAX_PILLS_DISPLAY = 3;

interface ActionsCellProps {
    row: Row<PromotionWithRelations>;
    handleEdit: (id: string) => void;
    t: TFunction;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ row, handleEdit, t }) => {
    const promotion = row.original;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const queryClient = useQueryClient();

    const { mutate: deletePromotion, isPending: isDeleting } = useMutation<Response, Error, string>({
        mutationFn: (promotionId: string) => {
            return fetch(`/api/promociones/${promotionId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async (response) => {
            if (response.ok) {
                toast.success(t('promotions.delete_success', { name: promotion.name }));
                await queryClient.invalidateQueries({ queryKey: ['promotions'] });
                setShowDeleteModal(false);
            } else {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || response.statusText || t('promotions.delete_error');
                throw new Error(errorMessage); 
            }
        },
        onError: (error) => {
             toast.error(t('promotions.delete_error_detailed', { error: error.message }));
             setShowDeleteModal(false); 
        },
    });

    const handleConfirmDelete = () => {
        deletePromotion(promotion.id);
    };

    return (
        <>
            <AlertModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                loading={isDeleting}
                title={t('promotions.delete_confirmation_title')}
                description={t('promotions.delete_confirmation_message', { name: promotion.name })}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-8 h-8 p-0">
                        <span className="sr-only">{t('data_table.open_menu')}</span>
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('data_table.actions')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEdit(promotion.id)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteModal(true)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('common.delete')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};

const getColumns = (
    t: TFunction,
): ColumnDef<PromotionWithRelations>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={ 
                    table.getIsSomePageRowsSelected()
                        ? "indeterminate"
                        : table.getIsAllPageRowsSelected()
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label={t('data_table.select_all')}
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label={t('data_table.select_row')}
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.name')} />
        ),
        cell: ({ row }) => 
            <div className="font-medium truncate overflow-hidden">{row.original.name}</div>,
        minSize: 180,
        size: 220,
    },
    {
        accessorKey: "code",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.code')} />
        ),
        cell: ({ row }) => 
            <div className="text-xs text-muted-foreground">{row.original.code || '-'}</div>,
        size: 100,
    },
    {
        accessorKey: "type",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.type')} />
        ),
        cell: ({ row }) => 
            <div className="text-xs">{formatEnumValue(row.original.type, 'PromotionType', t)}</div>,
        size: 150,
    },
    {
        accessorKey: "targetScope",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.targetScope')} />
        ),
        cell: ({ row }) => {
            const promotion = row.original;
            const scope = promotion.targetScope;
            let targetName: string | null | undefined = null;

            switch (scope) {
                case PromotionTargetScope.SPECIFIC_SERVICE:
                    targetName = promotion.targetService?.name;
                    break;
                case PromotionTargetScope.SPECIFIC_PRODUCT:
                    targetName = promotion.targetProduct?.name;
                    break;
                case PromotionTargetScope.SPECIFIC_BONO:
                    targetName = promotion.targetBonoDefinition?.name;
                    break;
                case PromotionTargetScope.SPECIFIC_PACKAGE:
                    targetName = promotion.targetPackageDefinition?.name;
                    break;
                case PromotionTargetScope.CATEGORY:
                    targetName = promotion.targetCategory?.name;
                    break;
                case PromotionTargetScope.TARIFF:
                    targetName = promotion.targetTariff?.name;
                    break;
            }
            
            return <span className="block truncate overflow-hidden text-xs">{targetName ?? formatEnumValue(scope, 'PromotionTargetScope', t)}</span>;
        },
        minSize: 180,
        size: 200,
    },
    {
        accessorKey: "accumulationMode",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.accumulationCompatibilities')} />
        ),
        cell: ({ row }) => {
            const promotion = row.original;
            const mode = promotion.accumulationMode;
            const compatibilities = promotion.definedCompatibilities || [];
            const count = compatibilities.length;

            if (mode === PromotionAccumulationMode.SPECIFIC) {
                if (count === 0) {
                    return <span className="text-xs text-muted-foreground">-</span>;
                } else if (count <= MAX_PILLS_DISPLAY) {
                    return (
                        <div className="flex flex-wrap gap-1">
                            {compatibilities.map((comp, index) => {
                                const name = comp.compatiblePromotion?.name;
                                return name ? (
                                    <Badge key={index} variant="secondary" className="whitespace-nowrap truncate max-w-[150px]">
                                        {name}
                                    </Badge>
                                ) : null;
                            })}
                        </div>
                    );
                } else {
                    return <span className="block truncate overflow-hidden text-xs">{t('promotions.compatibilitiesCount', { count: count })}</span>;
                }
            } else if (mode) {
                return <span className="block truncate overflow-hidden text-xs">{formatEnumValue(mode, 'PromotionAccumulationMode', t)}</span>;
            } else {
                return <span className="text-xs text-muted-foreground">-</span>;
            }
        },
        filterFn: (row, id, value) => { 
            return value.includes(row.getValue(id))
        },
        minSize: 160,
        size: 180,
    },
    {
        id: "applicableClinics",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.applicableClinics')} />
        ),
        cell: ({ row }) => {
            const clinics = row.original.applicableClinics || [];
            const count = clinics.length;

            if (count === 0) {
                return <span className="block truncate overflow-hidden text-xs">{t('common.all')}</span>; 
            } else if (count <= MAX_PILLS_DISPLAY) {
                return (
                    <div className="flex flex-wrap gap-1">
                        {clinics.map((ac, index) => {
                             const name = ac.clinic?.name;
                             return name ? (
                                <Badge key={index} variant="outline" className="whitespace-nowrap truncate max-w-[150px]">
                                    {name}
                                </Badge>
                             ) : null;
                        })}
                    </div>
                );
            } else {
                return <span className="block truncate overflow-hidden text-xs">{t('promotions.clinicsCount', { count: count })}</span>;
            }
        },
        enableSorting: false,
        minSize: 150,
        size: 170,
    },
    {
        accessorKey: "isActive",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.isActive')} />
        ),
        cell: ({ row }) => (
            <Badge variant={row.original.isActive ? "default" : "outline"} className={cn(row.original.isActive ? "bg-green-500 hover:bg-green-600" : "border-gray-400 text-gray-600")}>
                {row.original.isActive ? t('common.active') : t('common.inactive')}
            </Badge>
        ),
        size: 100,
        meta: { align: 'center' },
    },
    {
        accessorKey: "startDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.startDate')} />
        ),
        cell: ({ row }) => {
            const date = row.original.startDate;
            return date ? format(new Date(date), 'dd/MM/yyyy', { locale: es }) : '-';
        },
        size: 120,
    },
    {
        accessorKey: "endDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.endDate')} />
        ),
        cell: ({ row }) => {
            const date = row.original.endDate;
            return date ? format(new Date(date), 'dd/MM/yyyy', { locale: es }) : '-';
        },
        size: 120,
    },
    {
        id: "actions",
        cell: ( context ) => {
            const row = context.row;
            const table = context.table;
            const meta = table.options.meta as PromotionsTableMeta;
            if (!meta?.handleEdit || !meta?.t) {
                console.error("Meta 'handleEdit' o 't' no encontrado en la tabla.");
                return null; 
            }
            return <ActionsCell row={row} handleEdit={meta.handleEdit} t={meta.t} />;
        },
        enableSorting: false,
        enableHiding: false,
    },
];

interface PromotionListTableProps {}

export function PromotionListTable({ }: PromotionListTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const { data: promotionsResponse, isLoading, isError, error, refetch } = useQuery<PromotionsApiResponse, Error>({
        queryKey: ['promotions'],
        queryFn: async () => {
            const response = await fetch('/api/promociones');
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || t('promotions.fetch_error'));
            }
            return response.json();
        },
    });

    const promotions = useMemo(() => promotionsResponse?.data ?? [], [promotionsResponse]);

    const handleEdit = useCallback((id: string) => {
        let targetUrl = `/configuracion/promociones/${id}`;
        const isClinicEditPage = pathname.includes('/configuracion/clinicas/'); 
        
        if (isClinicEditPage) {
            const redirectUrl = `${pathname}?tab=descuentos`; 
            targetUrl += `?redirectBackTo=${encodeURIComponent(redirectUrl)}`;
            console.log(`[PromotionListTable] Editing from Clinic. Redirect URL: ${redirectUrl}`); 
        } else {
            console.log(`[PromotionListTable] Editing from main list.`);
        }
        
        router.push(targetUrl);
    }, [pathname, router]);

    const columns = useMemo(() => getColumns(t), [t]);

    const table = useReactTable<PromotionWithRelations>({
        data: promotions,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        meta: {
            handleEdit,
            t,
        } as PromotionsTableMeta,
    });
    
    const columnCount = table.getAllColumns().length;

    if (isLoading) {
        const skeletonRows = 5;
        return (
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between py-4">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-1/4" />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(columnCount)].map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-5 w-full" />
                                </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(skeletonRows)].map((_, i) => (
                                <TableRow key={i}>
                                {[...Array(columnCount)].map((_, j) => (
                                    <TableCell key={j}>
                                    <Skeleton className="h-5 w-full" />
                                    </TableCell>
                                ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Skeleton className="h-10 w-1/4" />
                </div>
            </div>
        );
    }

    if (isError) {
        return <div className="text-red-600">{t('common.errors.dataLoading', { context: 'promociones' })}: {error.message}</div>;
    }
    
    return (
         <div className="w-full space-y-4">
            <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('promotions.table.filter_name_placeholder') || "Filtrar por nombre..."}
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("name")?.setFilterValue(event.target.value)
                        }
                        className="h-8 w-[150px] lg:w-[250px] pl-10"
                    />
                 </div>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                    {t('common.table.columns')} <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                        let headerText = column.id;
                        const headerDef = column.columnDef.header;
                        if (typeof headerDef === 'string') {
                           headerText = t(headerDef) || column.id;
                        } else {
                           headerText = t(`promotions.columns.${column.id}`) || column.id; 
                        }
                        
                        return (
                            <DropdownMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                                }
                            >
                                {headerText}
                            </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
                </DropdownMenu>
            </div>

             <div className="rounded-md border">
                <Table className="table-fixed w-[98%]">
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                        return (
                            <TableHead 
                                key={header.id}
                                className={cn(
                                    header.id === 'name' && 'min-w-[180px]',
                                    header.id === 'targetScope' && 'min-w-[150px]',
                                    header.id === 'accumulationMode' && 'min-w-[150px]',
                                    header.id === 'applicableClinics' && 'min-w-[200px]',
                                    header.id === 'actions' && 'min-w-[80px]'
                                )}
                            >
                            {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                )}
                            </TableHead>
                        )
                        })}
                    </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                        <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                            )}
                            </TableCell>
                        ))}
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                        >
                        {t('promotions.table.no_results')}
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground flex-1">
                    {t('data_table.rows_selected', { count: table.getFilteredSelectedRowModel().rows.length })}
                </div>
                <div className="flex items-center space-x-2">
                    {table.getPageCount() > 1 && (
                        <span className="text-sm text-muted-foreground">
                            {t('data_table.page')} {table.getState().pagination.pageIndex + 1} {t('data_table.of')} {table.getPageCount()}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        {t('common.pagination.previous')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        {t('common.pagination.next')}
                    </Button>
                 </div>
            </div>
        </div>
    );
}
