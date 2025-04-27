'use client'

import { ColumnDef } from "@tanstack/react-table"
import { TFunction } from "i18next" 
import { ArrowUpDown, Edit, Trash2, Copy, Globe, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { AlertDialogAction } from "@/components/ui/alert-dialog"
import { MoreHorizontal } from "lucide-react"

// Tipo para banco
export type Bank = {
  id: string
  name: string
  code: string | null
  address: string | null
  phone: string | null
  phone1CountryIsoCode: string | null
  phone2: string | null
  phone2CountryIsoCode: string | null
  email: string | null
  countryIsoCode: string | null
  countryName?: string | null
  countryFlag?: string | null
  systemId: string | null
  _count?: {
    applicableClinics?: number
  }
  applicableClinics?: Array<{ clinicId: string }>
}

// Función para generar las columnas, aceptando t como argumento
export const getBankColumns = (t: TFunction): ColumnDef<Bank>[] => [
  // Columna Nombre
  {
    accessorKey: "name",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
        {t('config_banks.table.name')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  
  // Columna Código
  {
    accessorKey: "code",
    header: ({ column }) => {
        return (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
          {t('config_banks.table.code')}
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        )
    },
    cell: ({ row }) => {
      const code = row.getValue("code") as string | null
      return code ? (
        <div className="font-mono">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1.5 px-2 py-1 h-auto"
            onClick={() => {
              navigator.clipboard.writeText(code);
              toast.success(t('config_banks.notifications.copy_success'));
            }}
          >
            {code}
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null
    },
  },
  
  // Columna País
  {
    accessorKey: "countryName",
    header: () => <div>{t('config_banks.table.countryName')}</div>,
    cell: ({ row }) => {
      const countryName = row.original.countryName
      const countryFlag = row.original.countryFlag
      return countryName ? (
        <div className="flex items-center gap-1.5">
          {countryFlag && <span>{countryFlag}</span>}
          <span>{countryName}</span>
        </div>
      ) : null
    },
  },
  
  // Columna Teléfono
  {
    accessorKey: "phone",
    header: () => <div>{t('config_banks.table.phone')}</div>,
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null
      const countryCode = row.original.phone1CountryIsoCode
      return phone ? (
        <div className="flex items-center">
          {countryCode && <span className="mr-1">{row.original.countryFlag}</span>}
          <span>{phone}</span>
        </div>
      ) : null
    },
  },
  
  // Columna Ámbito
  {
    id: "scope",
    header: ({ column }) => (
      <Button
        variant="ghost"
      >
        {t('config_banks.table.scope')} 
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
  
  // Columna Acciones
  {
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-right">{t('common.actions')}</div>,
    cell: ({ row }) => {
      const bank = row.original;
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
              <DropdownMenuItem onClick={() => router.push(`/configuracion/bancos/${bank.id}`)}> 
                <Edit className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive" 
                onClick={() => {
                  console.log(`Trigger delete for bank ${bank.id}`);
                  document.dispatchEvent(new CustomEvent('deleteBankTrigger', { detail: { id: bank.id, name: bank.name } }));
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
]; 