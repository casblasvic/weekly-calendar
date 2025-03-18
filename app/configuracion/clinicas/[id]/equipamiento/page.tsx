"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchInput } from "@/components/SearchInput"
import { Button } from "@/components/ui/button"
import { Trash2, Search, Save, Plus } from "lucide-react"
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
  clinicId: number
}

export default function EquipmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const clinicId = Number.parseInt(params.id)
  const [searchTerm, setSearchTerm] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  // Get equipment for this clinic from mock data
  const [equipment, setEquipment] = useState<Equipment[]>([])

  // Initialize with fresh data from mockData
  useEffect(() => {
    const clinicEquipment = getEquipment(clinicId)
    setEquipment(clinicEquipment)
  }, [clinicId])

  // Listen for data changes
  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      if (e.detail.dataType === "equipment" || e.detail.dataType === "all") {
        const clinicEquipment = getEquipment(clinicId)
        setEquipment(clinicEquipment)
      }
    }

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    }
  }, [clinicId])

  const filteredEquipment = equipment.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const deleteEquipmentItem = (id: number) => {
    if (window.confirm("¿Está seguro de que desea eliminar este equipo?")) {
      // Delete from mock data
      const success = deleteEquipmentInMock(id)

      if (success) {
        // Update local state
        setEquipment((prev) => prev.filter((item) => item.id !== id))
        toast.success("Equipo eliminado correctamente")
      } else {
        toast.error("Error al eliminar el equipo")
      }

      setHasChanges(true)
    }
  }

  const addNewEquipment = () => {
    const newEquipment = {
      clinicId,
      code: "NUEVO",
      name: "Nuevo Equipo",
      description: "Descripción del nuevo equipo",
    }

    // Add to mock data
    const newId = addEquipment(newEquipment)

    if (newId) {
      // Add to local state
      setEquipment([...equipment, { ...newEquipment, id: newId }])
      toast.success("Nuevo equipo añadido")
    } else {
      toast.error("Error al añadir el equipo")
    }

    setHasChanges(true)
  }

  const saveChanges = () => {
    // Save all equipment to mock data
    let allSuccess = true

    equipment.forEach((item) => {
      const success = updateEquipment(item)
      if (!success) allSuccess = false
    })

    if (allSuccess) {
      toast.success("Cambios guardados correctamente")
      setHasChanges(false)
    } else {
      toast.error("Error al guardar algunos cambios")
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex flex-col gap-2 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Equipamiento</h1>
        <p className="text-sm text-muted-foreground">Listado del equipamiento de la clínica</p>
      </div>

      <div className="p-6 pt-0">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full max-w-md">
            <SearchInput
              placeholder="Buscar equipamiento"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={addNewEquipment} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo equipo
            </Button>
            {hasChanges && (
              <Button onClick={saveChanges} className="bg-purple-600 hover:bg-purple-700">
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </Button>
            )}
          </div>
        </div>

        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}

