'use client'

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export type LegalEntity = {
  id: string;
  name: string;
  fullAddress?: string | null;
  countryIsoCode: string;
  country?: {
    name: string;
    isoCode: string;
  } | null;
  taxIdentifierFields?: Record<string, string> | null;
  notes?: string | null;
  clinics?: { id: string; name: string }[] | null; // Añadida la propiedad clinics
}

const getAllTaxIdsFormatted = (entity: LegalEntity): string => {
  if (entity.taxIdentifierFields && Object.keys(entity.taxIdentifierFields).length > 0) {
    return Object.entries(entity.taxIdentifierFields)
      .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
      .join(", ");
  }
  return "N/A";
}

export const columns: ColumnDef<LegalEntity>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Nombre <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "country.name",
    header: "País",
    cell: ({ row }) => {
      const country = row.original.country;
      return country ? <Badge variant="outline">{country.name}</Badge> : "N/A";
    },
  },
  {
    id: "taxIds",
    header: "ID Fiscal",
    cell: ({ row }) => getAllTaxIdsFormatted(row.original),
  },
  {
    id: "assignedClinics",
    header: "Clínicas Asignadas",
    cell: ({ row }) => {
      const clinics = row.original.clinics;
      if (!clinics || clinics.length === 0) {
        return "Ninguna";
      }
      
      const maxClinicsToShow = 4;
      const clinicNameLengthLimit = 20; // Límite de caracteres para el nombre de una clínica antes de truncar

      const clinicNames = clinics.map(clinic => 
        clinic.name.length > clinicNameLengthLimit 
          ? clinic.name.substring(0, clinicNameLengthLimit - 3) + "..." 
          : clinic.name
      );
      
      if (clinicNames.length > maxClinicsToShow) {
        return clinicNames.slice(0, maxClinicsToShow).join(", ") + ", ...";
      }
      
      return clinicNames.join(", ");
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const legalEntity = row.original
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
              <Link href={`/configuracion/sociedades/editar/${legalEntity.id}`}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 hover:!text-red-700"
              onClick={() => alert("Función eliminar no implementada")}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar (TODO)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
