"use client"

import * as React from "react"
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { ChevronDown, Search } from "lucide-react"
import { useTranslation } from 'react-i18next'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClinicPaymentSettingWithRelations } from "@/lib/api/clinicPaymentSettings"

// --- Props Interface ---
interface ClinicPaymentSettingsTableProps {
  data: ClinicPaymentSettingWithRelations[]; 
  columns: ColumnDef<ClinicPaymentSettingWithRelations>[];
  isLoading: boolean;
}

// --- DataTable Component ---
export function ClinicPaymentSettingsTable({
  data,
  columns,
  isLoading,
}: ClinicPaymentSettingsTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({}) 

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  const columnCount = table.getAllColumns().length;

  // --- Skeleton Loading State ---
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

  // --- Renderizado de la Tabla Real ---
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between py-4">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder={t('config_payment_methods.filter_placeholder')}
            value={(table.getColumn('paymentMethodName')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
                table.getColumn('paymentMethodName')?.setFilterValue(event.target.value)
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
                if (typeof column.columnDef.header === 'string') {
                  headerText = t(column.columnDef.header) || column.id;
                } else {
                  headerText = t(`config_clinic_payment_settings.columns.${column.id}`) || column.id; 
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
                  {t('common.data_table_placeholder')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2 py-4">
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
  )
} 