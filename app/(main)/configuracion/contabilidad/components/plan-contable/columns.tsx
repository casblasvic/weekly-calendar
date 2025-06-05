"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AccountType } from "@prisma/client"; // Asegúrate que la ruta de importación sea correcta o ajústala
import { ArrowUpDown, MoreHorizontal, Pencil, PlusCircle, Trash2 } from "lucide-react"; // Eliminados imports no usados

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// Este será nuestro tipo de datos para cada fila, basado en ChartOfAccountEntry
export type ChartOfAccountRow = {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  description?: string | null;
  isMonetary: boolean;
  allowsDirectEntry: boolean;
  parentAccountId?: string | null;
  level: number; // Represents the hierarchy level
  // Para la jerarquía, TanStack Table puede manejarla si proveemos los datos anidados
  // o si usamos la opción `getSubRows`
  subRows?: ChartOfAccountRow[];
  // Podríamos añadir más campos como legalEntity.name si es necesario
};

export const columns: ColumnDef<ChartOfAccountRow>[] = [
  {
    id: "select",
    header: ({ table }) => null,  // Se maneja en el componente padre
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "accountNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Número
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    // Podríamos usar `cell` para dar formato o añadir lógica de expansión para jerarquía
  },
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "type",
    header: "Tipo",
  },
  {
    accessorKey: "isActive",
    header: "Activa",
    cell: ({ row }) => (row.original.isActive ? "Sí" : "No"),
  },
  {
    id: "actions",
    cell: ({ row, table }) => { 
      const account = row.original;
      // Actualizamos la interfaz meta para incluir onDeleteAccount
      const actions = table.options.meta as {
        onEditAccount?: (account: ChartOfAccountRow) => void;
        onAddSubAccount?: (parentId: string | null, newAccountBase?: Partial<ChartOfAccountRow>) => void;
        onDeleteAccount?: (account: ChartOfAccountRow) => void;
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                console.log("Edit action triggered for:", account.name);
                actions.onEditAccount?.(account); 
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar Cuenta
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log("Add sub-account triggered for parent:", account.name);
                const newAccountBase = { 
                  accountNumber: `${account.accountNumber}.` 
                };
                actions.onAddSubAccount?.(account.id, newAccountBase); 
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Subcuenta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // Llamamos a la nueva función onDeleteAccount del meta
                actions.onDeleteAccount?.(account);
              }}
              className="text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar Cuenta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 80,
  },
];
