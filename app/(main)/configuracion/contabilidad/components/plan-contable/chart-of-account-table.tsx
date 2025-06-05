'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ExpandedState,
  getExpandedRowModel,
  Row,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Search, ChevronDown, Download, Trash2, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartOfAccountEntry } from '@prisma/client';
import { columns as tableColumns } from './columns';
import { PaginationControls } from '@/components/pagination-controls';
import { Checkbox } from '@/components/ui/checkbox';
import { ChartOfAccountRow } from './columns';
import { TableMeta } from '@tanstack/react-table';
import { toast } from 'sonner';

interface AppTableMeta extends TableMeta<ChartOfAccountRow> {
  onEditAccount: (account: ChartOfAccountRow) => void;
  onAddSubAccount: (parentId: string | null, newAccountBase?: Partial<ChartOfAccountRow>) => void;
  onDeleteAccount: (account: ChartOfAccountRow) => void;
  onDeleteMultiple?: (accounts: ChartOfAccountRow[]) => void;
}

interface ChartOfAccountTableProps {
  data: ChartOfAccountRow[];
  metadata?: AppTableMeta;
  legalEntityId: string;
  systemId: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ChartOfAccountTable({ 
  data, 
  metadata, 
  legalEntityId, 
  systemId,
  onRefresh,
  isLoading = false
}: ChartOfAccountTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<any[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [showSelectAllMessage, setShowSelectAllMessage] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [selectAllRows, setSelectAllRows] = useState(false);

  // Estado para el modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const columns = useMemo(() => {
    return tableColumns.map((colDef) => {
      const col = colDef as ColumnDef<ChartOfAccountRow>;
      if (col.id === "accountNumber" || ("accessorKey" in col && col.accessorKey === "accountNumber")) {
        return {
          ...col,
          cell: ({ row, getValue }) => (
            <div style={{ paddingLeft: `${row.depth * 1.5}rem` }} className="flex items-center">
              {row.getCanExpand() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    row.toggleExpanded();
                  }}
                  className="mr-1 p-1 h-auto text-xs"
                >
                  {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </Button>
              ) : (
                <span className="mr-1 w-[22px] inline-block"></span>
              )}
              {getValue() as string}
            </div>
          ),
        };
      }
      return col;
    });
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getSubRows: (row) => row.subRows,
    meta: metadata,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      globalFilter,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    pageCount: Math.ceil(data.length / pageSize),
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newPaginationState = updater({
          pageIndex,
          pageSize,
        });
        setPageIndex(newPaginationState.pageIndex);
        setPageSize(newPaginationState.pageSize);
      }
    },
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
    getRowId: (row) => row.id,
  });

  const handleBulkDelete = async () => {
    const selectedAccounts = selectAllRows 
      ? table.getFilteredRowModel().rows
      : table.getSelectedRowModel().rows;
    
    if (selectedAccounts.length === 0) return;

    // Abrir el modal de confirmación
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const performDelete = async () => {
    setIsDeleting(true);
    setDeleteProgress(0);
    setDeleteError(null);

    // Iniciar simulación de progreso
    const progressInterval = setInterval(() => {
      setDeleteProgress((prev) => {
        // Incrementar progreso de forma logarítmica para que sea más realista
        if (prev < 30) {
          return prev + 2; // Fase inicial rápida
        } else if (prev < 60) {
          return prev + 1.5; // Fase media
        } else if (prev < 85) {
          return prev + 0.8; // Fase lenta
        } else if (prev < 95) {
          return prev + 0.3; // Muy lenta cerca del final
        }
        return prev; // Mantener en 95 hasta que termine
      });
    }, 200); // Actualizar cada 200ms

    const selectedRows = selectAllRows 
      ? table.getFilteredRowModel().rows 
      : table.getSelectedRowModel().rows;
    
    const accountIds = selectedRows.map(row => row.original.id);

    try {
      const response = await fetch('/api/chart-of-accounts/delete-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountIds,
          legalEntityId: legalEntityId || '',
          systemId: systemId,
        }),
      });

      // Limpiar intervalo de progreso
      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar las cuentas');
      }

      const result = await response.json();
      
      // Completar la barra de progreso
      setDeleteProgress(100);
      
      // Esperar un momento para mostrar el 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mostrar mensaje de éxito
      toast.success(result.message || `Se eliminaron ${result.deletedAccounts} cuentas correctamente`);

      // Limpiar selección
      table.resetRowSelection();
      setSelectAllRows(false);
      setShowSelectAllMessage(false);
      
      // Actualizar tabla sin refrescar página
      const meta = table.options.meta as AppTableMeta | undefined;
      if (meta?.onDeleteAccount) {
        // Notificar al componente padre para refrescar datos
        selectedRows.forEach(row => {
          meta.onDeleteAccount(row.original);
        });
      }

      // Refrescar datos si se proporciona la función
      if (onRefresh) {
        onRefresh();
      }
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        setShowDeleteModal(false);
        setIsDeleting(false);
        setDeleteProgress(0);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error eliminando cuentas:', error);
      setDeleteError(error instanceof Error ? error.message : 'Error desconocido al eliminar las cuentas');
      setDeleteProgress(0); // Resetear progreso en caso de error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportSelected = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const dataToExport = selectedRows.map((row) => ({
      numero: row.original.accountNumber,
      nombre: row.original.name,
      tipo: row.original.type,
      activa: row.original.isActive ? "Sí" : "No",
      descripcion: row.original.description || "",
    }));

    const headers = Object.keys(dataToExport[0]).join(",");
    const csv = [
      headers,
      ...dataToExport.map((row) => Object.values(row).map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cuentas_seleccionadas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleSelectAllPage = useCallback((checked: boolean) => {
    if (checked) {
      const pageRows = table.getRowModel().rows;
      const newSelection: RowSelectionState = {};
      pageRows.forEach((row) => {
        newSelection[row.id] = true;
      });
      setRowSelection(newSelection);

      const totalRows = table.getFilteredRowModel().rows.length;
      const visibleRows = pageRows.length;
      if (totalRows > visibleRows && !selectAllRows) {
        setShowSelectAllMessage(true);
      }
    } else {
      setRowSelection({});
      setShowSelectAllMessage(false);
      setSelectAllRows(false);
    }
  }, [table, selectAllRows]);

  const handleSelectAllRows = useCallback(() => {
    const allRows = table.getFilteredRowModel().rows;
    const newSelection: RowSelectionState = {};
    allRows.forEach((row) => {
      newSelection[row.id] = true;
    });
    setRowSelection(newSelection);
    setSelectAllRows(true);
    setShowSelectAllMessage(false);
  }, [table]);

  const selectedCount = selectAllRows
    ? table.getFilteredRowModel().rows.length
    : Object.keys(rowSelection).length;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-4 text-center">Cargando plan contable...</p>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrar por nombre o número..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm h-9"
          />
          {selectedCount > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    Acciones ({selectedCount})
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleExportSelected}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar seleccionadas
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleBulkDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar seleccionadas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {showSelectAllMessage && (
        <div className="bg-blue-50 p-2 text-sm text-blue-700 rounded-md mx-1 my-2">
          Se han seleccionado las {table.getRowModel().rows.length} cuentas de esta página.{" "}
          <button
            onClick={handleSelectAllRows}
            className="font-medium underline hover:no-underline"
          >
            Seleccionar las {table.getFilteredRowModel().rows.length} cuentas
          </button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (header.id === "select") {
                    return (
                      <TableHead key={header.id} className={header.column.getCanHide() ? "" : "sticky left-0"}>
                        <input
                          type="checkbox"
                          checked={
                            selectAllRows ||
                            (table.getRowModel().rows.length > 0 &&
                              table.getRowModel().rows.every((row) => rowSelection[row.id]))
                          }
                          onChange={(e) => handleSelectAllPage(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </TableHead>
                    );
                  }
                  return (
                    <TableHead key={header.id} className={header.column.getCanHide() ? "" : "sticky left-0"}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())
                      }
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
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                  No hay resultados para la entidad legal seleccionada o no hay plan contable definido.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        onPageChange={(page) => table.setPageIndex(page - 1)}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          table.setPageSize(size);
        }}
        totalCount={table.getFilteredRowModel().rows.length}
        itemType="cuentas"
      />
      <div className="flex items-center justify-end space-x-2 py-4 px-1">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedCount} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>
      </div>
      {showDeleteModal && (
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Eliminar cuentas seleccionadas
              </DialogTitle>
              <DialogDescription className="text-sm mt-2">
                ¿Está seguro de que desea eliminar {selectAllRows ? table.getFilteredRowModel().rows.length : table.getSelectedRowModel().rows.length} cuenta(s) seleccionada(s)?
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-1.5">
                    <p className="font-medium text-sm text-destructive">
                      ⚠️ ADVERTENCIA IMPORTANTE
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                      <li>Esta acción NO se puede deshacer</li>
                      <li>Se eliminarán TODAS las subcuentas</li>
                      <li>Se perderán todos los mapeos contables</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            {isDeleting && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm font-medium">Eliminando cuentas...</p>
                </div>
                <Progress value={deleteProgress} className="h-2 transition-all duration-300 ease-out" />
                <p className="text-xs text-muted-foreground mt-1">
                  {deleteProgress < 20 && "Preparando eliminación..."}
                  {deleteProgress >= 20 && deleteProgress < 35 && "Analizando dependencias..."}
                  {deleteProgress >= 35 && deleteProgress < 55 && "Eliminando asociaciones contables..."}
                  {deleteProgress >= 55 && deleteProgress < 75 && "Procesando cuentas y subcuentas..."}
                  {deleteProgress >= 75 && deleteProgress < 90 && "Verificando integridad..."}
                  {deleteProgress >= 90 && deleteProgress < 100 && "Finalizando proceso..."}
                  {deleteProgress === 100 && "¡Completado!"}
                </p>
              </div>
            )}
            {deleteError && !isDeleting && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{deleteError}</AlertDescription>
              </Alert>
            )}
            {!isDeleting && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                  }}
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={performDelete}
                  disabled={deleteError !== null}
                  size="sm"
                >
                  Eliminar cuentas
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
