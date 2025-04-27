'use client'

import * as React from "react"
import { useTranslation } from 'react-i18next';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteBankAccount } from "@/lib/api/bank-accounts"; // Importar la función para eliminar

// Importar las columnas y el tipo de dato
import { getBankAccountColumns, type BankAccountData } from './columns'; 

interface DataTableProps {
  data: BankAccountData[];
  isLoading: boolean;
}

export function BankAccountDataTable({ data, isLoading }: DataTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Función para manejar la eliminación
  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm(t('config_bank_accounts.toast.delete_confirm_message'))) {
      try {
        await deleteBankAccount(accountId);
        // Invalidar la consulta para refrescar los datos
        queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
        toast.success(t('config_bank_accounts.toast.delete_success'));
      } catch (error) {
        console.error('Error eliminando cuenta bancaria:', error);
        toast.error(t('config_bank_accounts.toast.delete_error'));
      }
    }
  };
  
  // Usar las columnas de BankAccount y pasar la función de eliminación
  const columns = React.useMemo(
    () => {
      const cols = getBankAccountColumns(t);
      // Modificar la columna de acciones para pasar la función de eliminación
      const actionsColumn = cols.find(col => col.id === 'actions');
      if (actionsColumn && 'cell' in actionsColumn) {
        const originalCell = actionsColumn.cell;
        actionsColumn.cell = (props) => {
          // Usar el contexto original pero reemplazar handleDelete
          const context = {
            ...props,
            handleDelete: handleDeleteAccount
          };
          return typeof originalCell === 'function' ? originalCell(context) : null;
        };
      }
      return cols;
    },
    [t]
  );

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({}) 
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data: isLoading ? [] : data,
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
    // initialState: { pagination: { pageSize: 10 } }, // Descomentar si quieres paginación inicial
  })

  const columnCount = columns.length;

  return (
    <div className="w-full">
      {/* --- Filtros --- */}
      <div className="flex flex-wrap items-center gap-4 py-4">
        {/* Filtro por Nombre de Cuenta */}
        <Input
          placeholder={t('config_bank_accounts.table.filter_accountName_placeholder')}
          value={(table.getColumn("accountName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("accountName")?.setFilterValue(event.target.value)
          }
          className="max-w-xs" // Ajustar ancho si es necesario
          disabled={isLoading}
        />
        {/* Filtro por Nombre de Banco (usando el accessorKey anidado) */}
        <Input
          placeholder={t('config_bank_accounts.table.filter_bankName_placeholder')}
          value={(table.getColumn("bank.name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("bank.name")?.setFilterValue(event.target.value)
          }
          className="max-w-xs"
          disabled={isLoading}
        />
        
        {/* Botón de Visibilidad (movido al final para mejor flujo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto" disabled={isLoading}>
              {t('common.columns')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                // Obtener el header para mostrarlo en el menú (puede ser string o componente)
                 let headerText = column.id;
                 if (typeof column.columnDef.header === 'string') {
                   headerText = column.columnDef.header;
                 } else if (typeof column.id === 'string') {
                   // Intentar traducir basado en el ID si no es un componente complejo
                   const translatedHeader = t(`config_bank_accounts.table.${column.id}`);
                   if (translatedHeader !== `config_bank_accounts.table.${column.id}`) {
                       headerText = translatedHeader;
                   }
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

      {/* --- Tabla --- */}
      <div className="border rounded-md">
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
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {[...Array(columnCount)].map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
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
                  colSpan={columnCount}
                  className="h-24 text-center"
                >
                  {t('config_bank_accounts.table.no_results')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Paginación --- */}
      <div className="flex items-center justify-end py-4 space-x-2">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  )
} 