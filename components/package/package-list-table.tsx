"use client";

import React, { useState } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel, // Necesario para la paginación del lado del cliente si se usa
    useReactTable,
    SortingState, // Para ordenar
    getSortedRowModel, // Para ordenar
    ColumnFiltersState, // Para filtrar
    getFilteredRowModel, // Para filtrar
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
import { Input } from "@/components/ui/input"; // Para filtro
import { Edit, Trash2, ArrowUpDown, ChevronDown, Settings2 } from 'lucide-react'; // Iconos
import { useRouter } from 'next/navigation';
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

// Tipos (se mantienen igual)
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
interface PackageDefinition {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    isActive: boolean;
    pointsAwarded: number;
    items: PackageItem[];
    createdAt: string; // O Date
    updatedAt: string; // O Date
    systemId: string;
}
interface PaginationState {
    currentPage: number;
    totalPages: number;
    totalPackages: number;
    limit: number;
}

interface PackageListTableProps {
    data: PackageDefinition[];
    isLoading: boolean;
    error: string | null;
    pagination: PaginationState; // La paginación externa se usará más adelante
    onPageChange: (newPage: number) => void;
    onRefresh: () => void;
}

// --- Definición de Columnas ---
const getColumns = (
    handleEdit: (id: string) => void,
    handleDelete: (id: string, name: string) => void,
    t: (key: string) => string
): ColumnDef<PackageDefinition>[] => [
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
        accessorKey: "pointsAwarded",
        header: () => <div className="text-right">{t('packages.table.headers.points')}</div>,
        cell: ({ row }) => <div className="text-right hidden md:table-cell">{row.getValue("pointsAwarded")}</div>,
        enableHiding: true,
    },
    {
        accessorKey: "isActive",
        header: () => <div className="text-center">{t('packages.table.headers.active')}</div>,
        cell: ({ row }) => (
            <div className="text-center">
                 <Badge variant={row.getValue("isActive") ? 'default' : 'destructive'}>
                    {row.getValue("isActive") ? t('common.status.active') : t('common.status.inactive')} 
                </Badge>
            </div>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id)?.toString());
        },
        enableHiding: true,
    },
    {
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
    },
];


export default function PackageListTable({
    data,
    isLoading,
    error,
    pagination, // Recibimos pero no usamos directamente para paginación interna aún
    onPageChange,
    onRefresh
}: PackageListTableProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState({});

    const handleEdit = (id: string) => {
        router.push(`/configuracion/paquetes/${id}`);
    };

    const handleDelete = async (id: string, name: string) => {
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
    };

    const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, t), [onRefresh, t]);

    const table = useReactTable({
        data: data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    });

    if (isLoading) {
        return (
             <div className="space-y-4">
                 <div className="flex items-center py-4">
                     <Skeleton className="h-10 w-1/3" />
                     <Skeleton className="h-10 w-24 ml-auto" /> 
                 </div>
                 <div className="rounded-md border">
                     <Skeleton className="h-96 w-full" />
                 </div>
                 <div className="flex items-center justify-end space-x-2 py-4">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                 </div>
            </div>
        );
    }
     if (error) {
         return <p className="text-red-500 text-center p-4">{t('packages.table.errorLoading')}: {error}</p>;
     }

    return (
        <div>
             <div className="flex items-center justify-between py-4">
                 <Input
                    placeholder={t('common.filterByName') + '...'}
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                 />
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                         <Button variant="outline" className="ml-auto">
                             {t('common.table.columns')} <Settings2 className="ml-2 h-4 w-4" />
                         </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                         <DropdownMenuLabel>{t('common.table.toggleColumns')}</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         {table
                             .getAllColumns()
                             .filter((column) => column.getCanHide())
                             .map((column) => {
                                 const headerText = typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;
                                 return (
                                     <DropdownMenuCheckboxItem
                                         key={column.id}
                                         className="capitalize"
                                         checked={column.getIsVisible()}
                                         onCheckedChange={(value) =>
                                             column.toggleVisibility(!!value)
                                         }
                                     >
                                         {t(`packages.table.headers.${column.id}` as any, headerText)}
                                     </DropdownMenuCheckboxItem>
                                 );
                             })}
                     </DropdownMenuContent>
                 </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
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
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {t('packages.table.empty')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
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
    );
} 