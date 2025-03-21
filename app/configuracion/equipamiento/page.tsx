"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowUpDown, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import AddEquipmentModal from "@/components/modals/add-equipment-modal"
import { SearchInput } from "@/components/SearchInput"
import { useEquipment, Equipment } from "@/contexts/equipment-context"

export default function EquipmentPage() {
  const router = useRouter()
  const { allEquipment, deleteEquipment, clinics, addEquipment } = useEquipment()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  
  // Añadir estado para ordenación
  const [sortColumn, setSortColumn] = useState<string>("code")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Función para obtener el nombre de la clínica según su ID
  const getClinicName = (clinicId: number) => {
    const clinic = clinics.find(c => Number(c.id) === clinicId)
    return clinic ? clinic.nombre || clinic.name : `Clínica ${clinicId}`
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const filteredEquipment = allEquipment.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      (item.serialNumber?.toLowerCase() || "").includes(searchLower) ||
      getClinicName(item.clinicId).toLowerCase().includes(searchLower)
    )
  }).sort((a, b) => {
    let aValue = a[sortColumn as keyof typeof a]
    let bValue = b[sortColumn as keyof typeof b]
    
    if (sortColumn === "clinicId") {
      aValue = getClinicName(a.clinicId)
      bValue = getClinicName(b.clinicId)
    }
    
    if (sortDirection === "asc") {
      return String(aValue).localeCompare(String(bValue))
    } else {
      return String(bValue).localeCompare(String(aValue))
    }
  })

  const handleDelete = (id: number) => {
    const success = deleteEquipment(id)
    if (success) {
      toast.success("Equipamiento eliminado correctamente")
    } else {
      toast.error("Error al eliminar el equipamiento")
    }
  }

  const openEditModal = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setIsEditModalOpen(true)
  }

  return (
    <div className="container p-6 pt-16 mx-auto space-y-6 max-w-7xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <div className="w-full space-y-4">
          <h2 className="text-2xl font-semibold">Gestión de Equipamiento</h2>
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
              <TableHead className="cursor-pointer" onClick={() => handleSort("clinicId")}>
                Clínica {sortColumn === "clinicId" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center">
                  No hay equipamiento disponible
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.serialNumber}</TableCell>
                  <TableCell>{getClinicName(item.clinicId)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditModal(item)}
                      className="h-8 w-8"
                    >
                      <Search className="h-4 w-4 text-primary" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="fixed bottom-8 right-8">
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="text-white bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo equipamiento
        </Button>
      </div>

      {/* Modal para añadir nuevo equipamiento */}
      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => {
          try {
            addEquipment(data)
            toast.success("Equipamiento añadido correctamente")
            setIsAddModalOpen(false)
          } catch (error) {
            toast.error("Error al añadir el equipamiento")
          }
        }}
        clinics={clinics.map(c => ({
          id: Number(c.id),
          name: c.nombre || c.name
        }))}
      />

      {/* Modal para editar equipamiento */}
      {selectedEquipment && (
        <AddEquipmentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={() => setIsEditModalOpen(false)}
          clinics={clinics.map(c => ({
            id: Number(c.id),
            name: c.nombre || c.name
          }))}
          initialEquipment={selectedEquipment}
          isEditMode={true}
        />
      )}
    </div>
  )
}

