"use client";

import React from "react";
import { DataTable } from "@/components/ui/data-table"; // Ajusta la ruta si es diferente
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge"; // Para mostrar estado activo/inactivo
import { formatCurrency } from "@/lib/format-utils"; // Asume una utilidad para formatear moneda

// Importar el tipo extendido desde la página
import { type BonoDefinitionWithRelations } from "../page"; 

// --- Definición de Columnas para la DataTable ---

export const columns: ColumnDef<BonoDefinitionWithRelations>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
      )
    },
  },
  {
    header: "Asociado a",
    cell: ({ row }) => {
      const bono = row.original;
      if (bono.service) {
        return <span className="font-medium">Servicio: {bono.service.name}</span>;
      } else if (bono.product) {
        return <span className="font-medium">Producto: {bono.product.name}</span>;
      } else {
        return <span className="text-muted-foreground">N/A</span>;
      }
    },
  },
  {
    accessorKey: "quantity",
    header: "Cantidad",
    cell: ({ row }) => {
        const type = row.original.service ? "Sesiones" : (row.original.product ? "Unidades" : "");
        return `${row.original.quantity} ${type}`;
    }
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio
            <ArrowUpDown className="w-4 h-4 ml-2" />
          </Button>
        )
      },
    cell: ({ row }) => {
      // Asumiendo EUR como moneda por ahora, idealmente vendría de la configuración
      return formatCurrency(row.original.price || 0);
    },
  },
  {
    accessorKey: "validityDays",
    header: "Validez",
    cell: ({ row }) => {
        const days = row.original.validityDays;
        return days ? `${days} días` : 'Indefinida';
    }
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return <Badge variant={isActive ? "default" : "destructive"}>{isActive ? "Activo" : "Inactivo"}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const bono = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-8 h-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem asChild>
                <Link href={`/configuracion/bonos/${bono.id}`}>Editar</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              // onClick={() => onDelete(bono.id)} // Añadir lógica de eliminación después
              className="text-red-600"
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// --- Componente Cliente ---

interface BonoDefinitionsClientProps {
  data: BonoDefinitionWithRelations[];
}

export const BonoDefinitionsClient: React.FC<BonoDefinitionsClientProps> = ({ 
    data 
}) => {
  return (
    <>
      {/* Puedes añadir aquí filtros o cabeceras adicionales si es necesario */}
      <DataTable columns={columns} data={data} searchKey="name" />
    </>
  );
}; 