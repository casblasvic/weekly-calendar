'use client'

import { ColumnDef } from "@tanstack/react-table"
import { TFunction } from "i18next"
import { ArrowUpDown, MoreHorizontal, Globe, Users } from "lucide-react"
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
import { type PosTerminal } from '@/lib/api/pos-terminals'; // Importar el tipo de la API

// Usar el tipo de la API directamente
export type PosTerminalData = PosTerminal;

// <<< AÑADIR TIPO PARA EL HANDLER DE BORRADO >>>
type DeleteHandler = (terminal: PosTerminalData) => void;

// Función para generar las columnas
// <<< AÑADIR PARÁMETRO handleDelete >>>
export const getPosTerminalColumns = (
  t: TFunction,
  handleDelete: DeleteHandler 
): ColumnDef<PosTerminalData>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {t('config_pos_terminals.table.name')}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "terminalIdProvider",
    header: () => <div>{t('config_pos_terminals.table.terminal_id')}</div>, // Clave corregida
    cell: ({ row }) => <div>{row.getValue("terminalIdProvider") || '-'}</div>,
  },
  {
    accessorKey: "provider",
    header: () => <div>{t('config_pos_terminals.table.provider')}</div>,
    cell: ({ row }) => <div>{row.getValue("provider") || '-'}</div>,
  },
  {
    accessorKey: "bankAccount.accountName",
    id: "bankAccountName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {t('config_pos_terminals.table.bank_account')} {/* Clave corregida */}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.original.bankAccount.accountName}</div>,
    filterFn: (row, id, value) => {
      return row.original.bankAccount.accountName.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "applicableClinics",
    header: () => <div>{t('config_pos_terminals.table.clinics')}</div>,
    cell: ({ row }) => {
      const applicableClinics = row.original.applicableClinics;
      if (!applicableClinics || applicableClinics.length === 0) {
        return <div>-</div>;
      }
      return (
        <div>
          {applicableClinics.map((clinic) => (
            <div key={clinic.clinic.id}>{clinic.clinic.name}</div>
          ))}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const applicableClinics = row.original.applicableClinics;
      if (!applicableClinics || applicableClinics.length === 0) {
        return false;
      }
      return applicableClinics.some((clinic) =>
        clinic.clinic.name.toLowerCase().includes(value.toLowerCase())
      );
    },
  },
  {
    id: "scope", // ID único para la columna
    header: () => <div>{t('config_pos_terminals.table.scope')}</div>,
    cell: ({ row }) => {
      const isGlobal = row.original.isGlobal;
      const clinics = row.original.applicableClinics;
      const hasSpecificClinics = !isGlobal && clinics && clinics.length > 0;

      if (isGlobal) {
        return (
          <Badge variant="outline" className="flex items-center gap-1.5 border-green-600 text-green-700">
            <Globe className="h-3.5 w-3.5" />
            {t('common.scope_global')}
          </Badge>
        );
      } else if (hasSpecificClinics) {
          // Opcional: Mostrar un tooltip con los nombres si son pocos
          // O simplemente mostrar el badge
          return (
            <Badge variant="outline" className="flex items-center gap-1.5 border-blue-600 text-blue-700">
              <Users className="h-3.5 w-3.5" />
               {/* Podríamos mostrar el número: {`${clinics.length} ${t('common.clinics')}`} */}
              {t('common.scope_specific')}
            </Badge>
          );
      } else {
          // Caso: isGlobal es false, pero no hay clínicas (¿debería ocurrir?)
          return (
              <Badge variant="secondary">{t('common.none')}</Badge> // O un estado de error/advertencia
          );
      }
    },
  },
  {
    accessorKey: "isActive",
    id: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {t('config_pos_terminals.table.status')} {/* Usar clave status */}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? t('common.status.active') : t('common.status.inactive')}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return String(row.original.isActive) === value;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => <div className="text-right">{t('common.actions')}</div>,
    cell: ({ row }) => {
      const posTerminal = row.original;
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
                onClick={() => navigator.clipboard.writeText(posTerminal.id)}
              >
                {t('common.copy_id')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Navegar a la página de edición específica */}
              <DropdownMenuItem onClick={() => router.push(`/configuracion/terminales-pos/${posTerminal.id}`)}>
                {t('common.edit')}
              </DropdownMenuItem>
              {/* <<< LLAMAR AL HANDLER handleDelete PASADO COMO PROP >>> */}
              <DropdownMenuItem 
                className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                onClick={() => handleDelete(posTerminal)} // Llamar al handler
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