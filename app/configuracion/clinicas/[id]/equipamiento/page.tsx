"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchInput } from "@/components/SearchInput"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowUpDown, Search } from "lucide-react"
import { toast } from "sonner"
import { useEquipment } from "@/contexts/equipment-context"

export default function EquipmentPage() {
  const router = useRouter()
  const params = useParams()
  const clinicId = Number(params.id as string)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Añadir estado para ordenación
  const [sortColumn, setSortColumn] = useState<string>("code")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const { getClinicEquipment, deleteEquipment } = useEquipment()
  const clinicEquipment = getClinicEquipment(clinicId)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const filteredEquipment = clinicEquipment.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      (item.serialNumber?.toLowerCase() || "").includes(searchLower)
    )
  }).sort((a, b) => {
    const aValue = a[sortColumn as keyof typeof a] || ""
    const bValue = b[sortColumn as keyof typeof b] || ""
    
    if (sortDirection === "asc") {
      return String(aValue).localeCompare(String(bValue))
    } else {
      return String(bValue).localeCompare(String(aValue))
    }
  })

  const deleteEquipmentItem = (id: number) => {
    const success = deleteEquipment(id)
    if (success) {
      toast.success("Equipo eliminado correctamente")
    } else {
      toast.error("Error al eliminar el equipo")
    }
  }

  const addNewEquipment = () => {
    router.push(`/configuracion/clinicas/${params.id}/equipamiento/nuevo`)
  }

  return (
    <div className="container p-6 pt-16 mx-auto space-y-6 max-w-7xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <div className="w-full space-y-4">
          <h2 className="text-2xl font-semibold">Equipamiento de la clínica</h2>
          <div className="w-full md:w-80">
            <SearchInput
              placeholder="Buscar equipamiento"
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("code")}>
                Código {sortColumn === "code" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Nombre {sortColumn === "name" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("serialNumber")}>
                Número de serie {sortColumn === "serialNumber" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center">
                  No hay equipamiento disponible para esta clínica
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.serialNumber}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/configuracion/clinicas/${clinicId}/equipamiento/${item.id}`)}
                    >
                      <Search className="h-4 w-4 text-primary" />
                      <span className="sr-only">Ver/Editar</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => deleteEquipmentItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

