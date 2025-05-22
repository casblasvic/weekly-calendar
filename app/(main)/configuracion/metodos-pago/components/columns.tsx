'use client'

import { ColumnDef } from "@tanstack/react-table"
import { TFunction } from "i18next" 
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation" 

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { PaymentMethodType } from "@prisma/client"

export type PaymentMethodDefinitionData = {
  id: string;
  name: string;
  type: PaymentMethodType;
  details: string | null;
  isActive: boolean;
  code: string | null;
  _count?: {
    clinicSettings: number;
  };
};

const getPaymentMethodTypeText = (type: PaymentMethodType, t: TFunction): string => {
    const key = `enums.PaymentMethodType.${type}`; 
    const translated = t(key);
    return translated === key ? type : translated; 
};

export const getPaymentMethodDefinitionColumns = (t: TFunction): ColumnDef<PaymentMethodDefinitionData>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {t('config_payment_methods.table.name')} 
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {t('config_payment_methods.table.type')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <div>{getPaymentMethodTypeText(row.getValue("type"), t)}</div>,
    filterFn: (row, id, value) => {
        const typeValue = row.getValue(id) as PaymentMethodType;
        const typeText = getPaymentMethodTypeText(typeValue, t).toLowerCase();
        return value.includes(typeValue) || typeText.includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "details",
    header: () => <div>{t('config_payment_methods.table.details')}</div>,
    cell: ({ row }) => <div>{row.getValue("details") || '-'}</div>,
  },
   {
    accessorKey: "isActive",
    header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {t('config_payment_methods.table.status')} 
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => {
        const isActive = row.getValue("isActive")
        return (
            <Badge variant={isActive ? "default" : "outline"}>
                {isActive ? t('common.active') : t('common.inactive')}
            </Badge>
        );
    },
    filterFn: (row, id, value) => {
        return String(row.getValue(id)) === value;
    },
  },
  {
    accessorKey: "_count.clinicSettings",
    header: () => <div>{t('config_payment_methods.table.active_clinics', 'Clínicas Activas')}</div>,
    cell: ({ row }) => {
      const count = row.original._count?.clinicSettings;
      const methodCode = row.original.code;
      const isGloballyActive = row.original.isActive;

      if (methodCode === "SYS_DEFERRED_PAYMENT") {
        return count !== undefined && count > 0 
          ? <Badge variant="secondary">{count} {count === 1 ? t('common.clinic') : t('common.clinics')}</Badge> 
          : <Badge variant="outline">{t('common.none')}</Badge>;
      }
      
      if (count !== undefined && count > 0) {
        return <Badge variant="default">{count} {count === 1 ? t('common.clinic') : t('common.clinics')}</Badge>;
      } else if (isGloballyActive) {
        return <Badge variant="secondary">{t('common.scope_global', 'Global')}</Badge>;
      } else {
        return <Badge variant="outline">{t('common.none')}</Badge>;
      }
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-right">{t('common.actions')}</div>,
    cell: ({ row }) => {
      const paymentMethod = row.original;
      const router = useRouter();

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t('common.open_menu')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(paymentMethod.id)}
              >
                {t('common.copy_id')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/configuracion/metodos-pago/${paymentMethod.id}`)}>
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                >
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
]; 