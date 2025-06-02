"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  // Row, // No se usa directamente Row aquí
  SortingState,
  VisibilityState,
  useReactTable,
  ExpandedState,
  TableMeta, // Importar TableMeta
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

import { columns as defaultColumns, ChartOfAccountRow } from "./columns";
import { getChartOfAccounts } from "./actions";

// Definir una interfaz para la metadata de la tabla
interface AppTableMeta extends TableMeta<ChartOfAccountRow> {
  onEditAccount: (account: ChartOfAccountRow) => void;
  onAddSubAccount: (parentId: string | null, newAccountBase?: Partial<ChartOfAccountRow>) => void;
  onDeleteAccount: (account: ChartOfAccountRow) => void;
}


// Props que el componente podría recibir
interface ChartOfAccountTableProps {
  data: ChartOfAccountRow[];
  isLoading: boolean;
  legalEntityId: string; // Puede seguir siendo útil para meta o acciones específicas
  onEditAccount: (account: ChartOfAccountRow) => void;
  onAddSubAccount: (parentId: string | null, newAccountBase?: Partial<ChartOfAccountRow>) => void;
  onDeleteAccount: (account: ChartOfAccountRow) => void;
  onRefresh?: () => void; // Opcional, si se quiere un botón de refresco manual que llame a page.tsx
}

export function ChartOfAccountTable({
  data, // Prop: datos directamente desde page.tsx
  isLoading, // Prop: estado de carga desde page.tsx
  legalEntityId,
  onEditAccount,
  onAddSubAccount,
  onDeleteAccount, // Añadido para recibir la prop
  // onRefresh, // Descomentar si se implementa botón de refresco manual
}: ChartOfAccountTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<any[]>([]); 
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Ya no se necesita fetchData ni el useEffect asociado, los datos vienen de las props.
  // El error también se manejará en page.tsx y se pasará a través de isLoading o un estado de error si es necesario.

  const columns = useMemo<ColumnDef<ChartOfAccountRow>[]>(() => {
    return defaultColumns.map(colDef => {
      const col = colDef as ColumnDef<ChartOfAccountRow>; // Asignación de tipo para acceso seguro
      // Modificación para la columna de número de cuenta para añadir expansor
      if (col.id === 'accountNumber' || ( 'accessorKey' in col && col.accessorKey === 'accountNumber')) {
        return {
          ...col,
          cell: ({ row, getValue }) => (
            <div style={{ paddingLeft: `${row.depth * 1.5}rem` }} className="flex items-center">
              {row.getCanExpand() ? ( // No es necesario verificar subRows.length aquí, getCanExpand lo hace
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
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
  }, []); // Las props onEditAccount, onAddSubAccount se pasarán por `meta`


  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
    },
    meta: { // Pasar funciones a través de meta
      onEditAccount,
      onAddSubAccount,
      onDeleteAccount, // Pasar la función a meta
      // Si se necesita legalEntityId en las acciones de columna, se puede pasar aquí también
      // legalEntityId,
      // onRefresh, // Si se pasa la función onRefresh para un botón en la columna de acciones
    } as AppTableMeta, // Casting a nuestro tipo de meta
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: false, 
    manualSorting: false,    
    manualFiltering: false, 
  });

  // El mensaje de "Selecciona una entidad legal" se maneja en page.tsx
  // if (!legalEntityId) {
  //   return <p className="text-sm text-muted-foreground p-4 text-center">Selecciona una entidad legal para ver el plan contable.</p>;
  // }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-4 text-center">Cargando plan contable...</p>;
  }

  // El manejo de errores ahora reside principalmente en page.tsx.
  // Si data está vacía y no está cargando, podría ser un estado de "no hay datos" o un error ya notificado.
  // if (error) { // error ya no es un estado local
  //   return <div className="text-red-500 p-4 text-center">Error al cargar. <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="mr-2 h-4 w-4"/>Reintentar</Button></div>;
  // }


  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <Input
          placeholder="Filtrar por nombre o número..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm h-9"
        />
         {/* El botón de actualizar ahora estaría en page.tsx o se pasaría una prop onRefresh 
         <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>
          Actualizar
        </Button>*/}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} style={{width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    <TableCell key={cell.id} style={{width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined}}>
                      {flexRender( // Aquí flexRender usa el cell renderer de columns.tsx que ahora accederá a meta
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
                  No hay resultados para la entidad legal seleccionada o no hay plan contable definido.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4 px-1">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
