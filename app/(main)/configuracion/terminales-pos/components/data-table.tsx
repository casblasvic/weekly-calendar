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
import { useQueryClient, useMutation } from '@tanstack/react-query';
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
import { Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast";

// Importar las columnas y el tipo de dato
import { getPosTerminalColumns, type PosTerminalData } from './columns'; 
import { deletePosTerminal } from '@/lib/api/pos-terminals';

interface DataTableProps {
  data: PosTerminalData[];
  isLoading: boolean;
}

export function PosTerminalDataTable({ data, isLoading }: DataTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [terminalToDelete, setTerminalToDelete] = React.useState<PosTerminalData | null>(null);

  const deleteMutation = useMutation({ 
    mutationFn: deletePosTerminal,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('config_pos_terminals.form.success_delete'),
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['posTerminals'] });
      setIsDeleteDialogOpen(false);
      setTerminalToDelete(null);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('config_pos_terminals.form.error_delete'),
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      setTerminalToDelete(null);
    },
  });

  const handleDeleteClick = (terminal: PosTerminalData) => {
    setTerminalToDelete(terminal);
    setIsDeleteDialogOpen(true);
  };

  const columns = React.useMemo(() => getPosTerminalColumns(t, handleDeleteClick), [t]);

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({}) 
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data: data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
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
      globalFilter,
    },
  })

  const columnCount = columns.length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="relative flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('common.search_placeholder')}
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              disabled={isLoading || deleteMutation.isPending}
            />
          </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto" disabled={isLoading || deleteMutation.isPending}>
              {t('common.columns')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                let headerText = column.id;
                if (typeof column.columnDef.header === 'string') {
                  headerText = column.columnDef.header;
                } else if (typeof column.id === 'string') {
                  let translationKey = `config_pos_terminals.table.${column.id}`;
                  if (column.id === 'bankAccountName') translationKey = 'config_pos_terminals.table.bank_account';
                  if (column.id === 'clinicName') translationKey = 'config_pos_terminals.table.clinic';
                  if (column.id === 'terminalIdProvider') translationKey = 'config_pos_terminals.table.terminal_id';
                  if (column.id === 'status') translationKey = 'config_pos_terminals.table.status';
                  
                  const translatedHeader = t(translationKey);
                  if (translatedHeader !== translationKey) {
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
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {Array.from({ length: columnCount }).map((_, cellIndex) => (
                    <TableCell key={`skeleton-cell-${index}-${cellIndex}`}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-purple-50/50 transition-colors duration-150"
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
                  {t('config_pos_terminals.table.no_results')} 
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('config_pos_terminals.form.confirm_delete')}
              {terminalToDelete && (
                <span className="font-semibold block mt-2">{terminalToDelete.name}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMutation.isPending} 
              onClick={() => setTerminalToDelete(null)}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (terminalToDelete) {
                  deleteMutation.mutate(terminalToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? t('common.deleting', {item: '...'}) : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 