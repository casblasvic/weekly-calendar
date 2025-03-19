"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchInput } from "@/components/SearchInput"
import { Button } from "@/components/ui/button"
import { Trash2, Search, ArrowUpDown } from "lucide-react"
import {
  deleteEquipment as deleteEquipmentInMock,
  addEquipment,
  updateEquipment,
  getEquipment,
  DATA_CHANGE_EVENT,
} from "@/mockData"
import { toast } from "sonner"

interface Equipment {
  id: number
  code: string
  name: string
  description: string
  serialNumber: string
  clinicId: number
}

export default function EquipmentPage() {
  const router = useRouter()
  const params = useParams()
  const clinicId = Number.parseInt(params.id as string)
  const [searchTerm, setSearchTerm] = useState("")
  const [equipment, setEquipment] = useState<Equipment[]>([])
  
  // Añadir estado para ordenación
  const [sortColumn, setSortColumn] = useState<string>("code")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    // Get equipment from mock API
    const equipmentData = getEquipment(clinicId)
    setEquipment(equipmentData)

    // Listen for data changes
    const handleDataChange = (e: CustomEvent) => {
      if (e.detail.dataType === "equipment" || e.detail.dataType === "all") {
        setEquipment(getEquipment(clinicId))
      }
    }

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    }
  }, [clinicId])

  const filteredEquipment = equipment.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      (item.serialNumber?.toLowerCase() || "").includes(searchLower)
    )
  }).sort((a, b) => {
    const aValue = a[sortColumn as keyof Equipment] || "";
    const bValue = b[sortColumn as keyof Equipment] || "";
    
    if (sortDirection === "asc") {
      return String(aValue).localeCompare(String(bValue));
    } else {
      return String(bValue).localeCompare(String(aValue));
    }
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const deleteEquipmentItem = (id: number) => {
    const success = deleteEquipmentInMock(id)
    if (success) {
      setEquipment(equipment.filter((item) => item.id !== id))
      toast.success("Equipo eliminado correctamente")
    } else {
      toast.error("Error al eliminar el equipo")
    }
  }

  const addNewEquipment = () => {
    router.push(`/configuracion/clinicas/${params.id}/equipamiento/nuevo`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl pt-16">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
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

      <Card className="p-4 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("code")}>
                Código
                {sortColumn === "code" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Nombre
                {sortColumn === "name" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("description")}>
                Descripción
                {sortColumn === "description" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("serialNumber")}>
                Número de serie
                {sortColumn === "serialNumber" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length > 0 ? (
              filteredEquipment.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.serialNumber || "-"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteEquipmentItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-primary" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/configuracion/clinicas/${params.id}/equipamiento/${item.id}`)}
                    >
                      <Search className="h-4 w-4 text-primary" />
                      <span className="sr-only">Ver</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No se encontraron equipos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Botón fijo en la esquina inferior derecha */}
      <div className="fixed bottom-8 right-8">
        <Button 
          onClick={addNewEquipment}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Nuevo equipamiento
        </Button>
      </div>
    </div>
  )
}

