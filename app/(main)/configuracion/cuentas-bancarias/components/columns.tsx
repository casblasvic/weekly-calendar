'use client'

import { ColumnDef } from "@tanstack/react-table"
import { TFunction } from "i18next"
import { ArrowUpDown, Pencil, Trash2, Globe, Users } from "lucide-react"
import Link from "next/link"
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

// Tipo de datos esperado para cada fila 
// (Debe coincidir con lo que devuelve /api/bank-accounts)
export type BankAccountData = {
  id: string;
  accountName: string;
  iban: string;
  swiftBic: string | null;
  currency: string;
  isActive: boolean; // Asumiendo que el modelo tiene este campo
  bank: { // Incluimos el banco asociado
    id: string;
    name: string;
  };
  _count?: { // <-- Añadido (opcional)
    applicableClinics?: number;
  };
  applicableClinics?: Array<{ clinicId: string }>;
  // clinic: { id: string; name: string; } | null; // Si se incluye la clínica
};

// Extendemos el tipo para incluir la función handleDelete
type TableFunctions = {
  handleDelete?: (id: string) => void;
};

// Función para generar las columnas
export const getBankAccountColumns = (t: TFunction): ColumnDef<BankAccountData>[] => [
  {
    accessorKey: "accountName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {t('config_bank_accounts.table.accountName')}
        <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => <div className="capitalize">{row.getValue("accountName")}</div>,
  },
  {
    accessorKey: "iban",
    header: () => <div>{t('config_bank_accounts.table.iban')}</div>,
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <span className="font-mono">{row.getValue("iban")}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-6 h-6 p-0" 
          onClick={() => navigator.clipboard.writeText(row.getValue("iban"))}
          title={t('common.copy_to_clipboard')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span className="sr-only">{t('common.copy_to_clipboard')}</span>
        </Button>
      </div>
    ),
  },
  {
    accessorKey: "swiftBic",
    header: () => <div>{t('config_bank_accounts.table.swiftBic')}</div>,
    cell: ({ row }) => (
      <div className="font-mono">{row.getValue("swiftBic") || "-"}</div>
    ),
  },
  {
    // Acceder al nombre del banco anidado
    accessorKey: "bank.name", 
    id: "bank.name",
    header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {t('config_bank_accounts.table.bankName')}
            <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
    ),
    cell: ({ row }) => <div>{row.original.bank.name}</div>,
    // Habilitar filtrado por nombre de banco
    filterFn: (row, id, value) => {
        return row.original.bank.name.toLowerCase().includes(value.toLowerCase());
    },
  },
   {
    accessorKey: "currency",
    header: () => <div>{t('config_bank_accounts.table.currency')}</div>,
    cell: ({ row }) => <div className="uppercase">{row.getValue("currency")}</div>,
  },
  // Columna para Clínica (si se decide incluir)
  // {
  //   accessorKey: "clinic.name",
  //   header: () => <div>{t('config_bank_accounts.table.clinicName')}</div>,
  //   cell: ({ row }) => <div>{row.original.clinic?.name || '-'}</div>,
  // },
   {
    id: "scope",
    header: ({ column }) => (
      <Button
        variant="ghost"
      >
        {t('config_bank_accounts.table.scope')}
      </Button>
    ),
    cell: ({ row }) => {
      const clinics = row.original.applicableClinics;
      const isSpecific = clinics && clinics.length > 0;

      return isSpecific ? (
        <Badge variant="outline" className="flex items-center gap-1.5 border-blue-600 text-blue-700">
          <Users className="h-3.5 w-3.5" />
          {t('common.scope_specific')}
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1.5 border-green-600 text-green-700">
          <Globe className="h-3.5 w-3.5" />
          {t('common.scope_global')}
        </Badge>
      );
    },
  },
   {
    accessorKey: "isActive",
    header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {t('config_bank_accounts.table.status')} 
            <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
    ),
    cell: ({ row }) => {
        // Asumir que isActive existe en el modelo BankAccount
        // Si no existe, habrá que adaptar esta lógica
        const isActive = row.original.isActive ?? true; // Default a true si no viene
        return (
            <Badge variant={isActive ? "default" : "outline"}>
                {isActive ? t('common.active') : t('common.inactive')}
            </Badge>
        );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-right">{t('common.actions')}</div>,
    cell: ({ row, handleDelete }: { row: any, handleDelete?: (id: string) => void }) => {
      const bankAccount = row.original;
      const router = useRouter();

      return (
        <div className="flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="w-8 h-8"
            onClick={() => router.push(`/configuracion/cuentas-bancarias/${bankAccount.id}`)}
            title={t('common.edit')}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDelete && handleDelete(bankAccount.id)}
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
]; 