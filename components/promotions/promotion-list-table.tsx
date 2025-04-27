"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { TFunction } from 'i18next';

import {
    ColumnDef,
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
} from "@tanstack/react-table";
import type { CheckedState } from "@radix-ui/react-checkbox";

import { DataTable } from "@/components/ui/data-table";
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
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { AlertModal } from "@/components/common/alert-modal";

// Tipos de Prisma y Enums necesarios
import { Promotion, PromotionType, PromotionTargetScope, Clinic, PromotionAccumulationMode } from '@prisma/client';
// Importar el tipo centralizado
import { PromotionWithRelations } from '@/types/promotion';

// <<< RESTAURAR DEFINICIÓN PromotionsApiResponse >>>
// Definir la estructura de la respuesta de la API
interface PromotionsApiResponse {
    data: PromotionWithRelations[];
}
// <<< FIN RESTAURAR >>>

// Helper para formatear tipos y scopes (AHORA NECESITA EL PREFIJO COMPLETO)
const formatEnumValue = (value: string, prefix: string, t: (key: string) => string): string => {
    const key = `enums.${prefix}.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
};

// --- Constantes Configurables ---
const MAX_PILLS_DISPLAY = 3; // Número máximo de píldoras a mostrar antes de mostrar número/...

// --- Componente para la Celda de Acciones ---
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
                setShowDeleteModal(false); // Cerrar modal en éxito
            } else {
                 // Intentar leer el error del cuerpo si existe
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || response.statusText || t('promotions.delete_error');
                throw new Error(errorMessage); // Lanzar error para que onError lo capture
            }
        },
        onError: (error) => {
             toast.error(t('promotions.delete_error_detailed', { error: error.message }));
             setShowDeleteModal(false); // Opcional: cerrar modal también en error
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
                loading={isDeleting} // Usar isPending de la mutación
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

// Definición explícita de Columnas
const getColumns = (
    t: TFunction,
    handleEdit: (id: string) => void
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
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.name')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => 
            <div className="font-medium">{row.original.name}</div>,
    },
    {
        accessorKey: "code",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.code')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => 
            row.original.code || '-',
    },
    {
        accessorKey: "type",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.type')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => 
            formatEnumValue(row.original.type, 'PromotionType', t),
    },
    {
        accessorKey: "targetScope",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.targetScope')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => {
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
                // Añadir casos para BOGO si se incluyen en el select y tipo
                // case PromotionTargetScope.BOGO_SERVICE: // Asumiendo que BOGO tiene su propio scope o se maneja diferente
                //     targetName = promotion.bogoGetService?.name;
                //     break;
                // case PromotionTargetScope.BOGO_PRODUCT:
                //     targetName = promotion.bogoGetProduct?.name;
                //     break;
            }
            
            // Mostrar nombre si existe, si no, el tipo de scope traducido
            return <span>{targetName ?? formatEnumValue(scope, 'PromotionTargetScope', t)}</span>;
        },
    },
    {
        accessorKey: "accumulationMode",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.accumulationCompatibilities')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => {
            const promotion = row.original;
            const mode = promotion.accumulationMode;
            const compatibilities = promotion.definedCompatibilities || [];
            const count = compatibilities.length;
            
            // DEBUG: console.log("Promo:", promotion.name, "Mode:", mode, "Compatibilities:", compatibilities);

            if (mode === PromotionAccumulationMode.SPECIFIC) {
                if (count === 0) {
                    return <span className="text-muted-foreground">-</span>;
                } else if (count <= MAX_PILLS_DISPLAY) {
                    // Mostrar Píldoras (SIN truncar)
                    return (
                        <div className="flex flex-wrap gap-1">
                            {compatibilities.map((comp, index) => {
                                const name = comp.compatiblePromotion?.name;
                                return name ? (
                                    <Badge key={index} variant="secondary" className="whitespace-nowrap">
                                        {name}
                                    </Badge>
                                ) : null;
                            })}
                        </div>
                    );
                } else {
                    // Mostrar Número
                    return <span>{t('promotions.compatibilitiesCount', { count: count })}</span>;
                }
            } else if (mode) {
                // Mostrar Texto para ALL o EXCLUSIVE
                return <span>{formatEnumValue(mode, 'PromotionAccumulationMode', t)}</span>;
            } else {
                return <span className="text-muted-foreground">-</span>;
            }
        },
        filterFn: (row, id, value) => { 
            return value.includes(row.getValue(id))
        },
    },
    {
        id: "applicableClinics",
        header: t('promotions.columns.applicableClinics'),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => {
            const clinics = row.original.applicableClinics || [];
            const count = clinics.length;

            if (count === 0) {
                return <span>{t('common.all')}</span>; 
            } else if (count <= MAX_PILLS_DISPLAY) {
                // Mostrar Píldoras (SIN truncar)
                return (
                    <div className="flex flex-wrap gap-1">
                        {clinics.map((ac, index) => {
                             const name = ac.clinic?.name;
                             return name ? (
                                <Badge key={index} variant="outline" className="whitespace-nowrap">
                                    {name}
                                </Badge>
                             ) : null;
                        })}
                    </div>
                );
            } else {
                // Mostrar Número
                return <span>{t('promotions.clinicsCount', { count: count })}</span>;
            }
        },
        enableSorting: false,
    },
    {
        accessorKey: "isActive",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.isActive')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => (
            <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
                {row.original.isActive ? t('common.active') : t('common.inactive')}
            </Badge>
        ),
    },
    {
        accessorKey: "startDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.startDate')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => {
            const date = row.original.startDate;
            return date ? format(new Date(date), 'P', { locale: es }) : '-';
        },
    },
    {
        accessorKey: "endDate",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('promotions.columns.endDate')} />
        ),
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => {
            const date = row.original.endDate;
            return date ? format(new Date(date), 'P', { locale: es }) : '-';
        },
    },
    {
        id: "actions",
        cell: ({ row }: CellContext<PromotionWithRelations, unknown>) => (
             // Usar el nuevo componente de celda
            <ActionsCell row={row} handleEdit={handleEdit} t={t} />
        ),
        enableSorting: false,
        enableHiding: false,
    },
];

// --- Componente Principal de la Tabla ---

interface PromotionListTableProps {}

export function PromotionListTable({ }: PromotionListTableProps) {
    const { t } = useTranslation();
    const router = useRouter();

    const { data: promotionsResponse, isLoading, isError, error, refetch } = useQuery<PromotionsApiResponse, Error>({
        queryKey: ['promotions'],
        queryFn: async () => {
            const response = await fetch('/api/promociones');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch promotions');
            }
            return response.json();
        },
    });

    const promotions = useMemo(() => promotionsResponse?.data ?? [], [promotionsResponse]);

    const handleEdit = (id: string) => {
        router.push(`/configuracion/promociones/${id}`);
    };

    const columns = useMemo(() => getColumns(t, handleEdit), [t]);

    if (isLoading) {
        return <div>{t('common.loading')}...</div>;
    }

    if (isError) {
        return <div className="text-red-600">{t('common.errors.dataLoading', { context: 'promociones' })}: {error.message}</div>;
    }

    return (
         <DataTable 
             columns={columns} 
             data={promotions}
             searchKey="name"
         />
    );
}
