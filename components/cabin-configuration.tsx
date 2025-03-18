"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { ChevronUp, ChevronDown, Trash2, Search, Save } from "lucide-react"
import { CabinEditDialog } from "./cabin-edit-dialog"
import {
  updateCabin as updateCabinInMock,
  deleteCabin as deleteCabinInMock,
  getClinic,
  DATA_CHANGE_EVENT,
} from "@/mockData"
import { toast } from "sonner"

interface Cabin {
  id: number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

interface CabinConfigurationProps {
  cabins: Cabin[]
  clinicId: number
  updateCabin?: (cabin: Cabin) => void
  deleteCabin?: (cabinId: number) => void
}

export default function CabinConfiguration({ cabins, clinicId, updateCabin, deleteCabin }: CabinConfigurationProps) {
  const [isCabinDialogOpen, setIsCabinDialogOpen] = useState(false)
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null)
  const [filterText, setFilterText] = useState("")
  const [localCabins, setLocalCabins] = useState<Cabin[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize with fresh data from mockData
  useEffect(() => {
    const clinic = getClinic(clinicId)
    if (clinic) {
      setLocalCabins(clinic.cabins)
    } else {
      setLocalCabins(cabins)
    }
  }, [clinicId, cabins])

  // Listen for data changes
  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      if (e.detail.dataType === "cabins" || e.detail.dataType === "clinics" || e.detail.dataType === "all") {
        const clinic = getClinic(clinicId)
        if (clinic) {
          setLocalCabins(clinic.cabins)
        }
      }
    }

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    }
  }, [clinicId])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
  }

  const filteredCabins = localCabins.filter(
    (cabin) =>
      cabin.name.toLowerCase().includes(filterText.toLowerCase()) ||
      cabin.code.toLowerCase().includes(filterText.toLowerCase()),
  )

  const moveCabin = (index: number, direction: "up" | "down") => {
    const sortedCabins = [...localCabins].sort((a, b) => a.order - b.order)
    if (direction === "up" && index > 0) {
      const temp = sortedCabins[index].order
      sortedCabins[index].order = sortedCabins[index - 1].order
      sortedCabins[index - 1].order = temp
    } else if (direction === "down" && index < sortedCabins.length - 1) {
      const temp = sortedCabins[index].order
      sortedCabins[index].order = sortedCabins[index + 1].order
      sortedCabins[index + 1].order = temp
    }
    setLocalCabins([...sortedCabins])
    setHasChanges(true)
  }

  const handleSaveCabin = (cabin: Cabin) => {
    if (cabin.id === 0) {
      const newId = Math.max(0, ...localCabins.map((c) => c.id)) + 1
      const newCabin = { ...cabin, id: newId, order: localCabins.length + 1 }

      // Update local state
      setLocalCabins((prev) => [...prev, newCabin])

      // Save to mock data
      const success = updateCabinInMock(clinicId, newCabin)

      if (success) {
        toast.success("Cabina añadida correctamente")
        if (updateCabin) updateCabin(newCabin)
      } else {
        toast.error("Error al añadir la cabina")
      }
    } else {
      // Update local state
      setLocalCabins((prev) => prev.map((c) => (c.id === cabin.id ? cabin : c)))

      // Save to mock data
      const success = updateCabinInMock(clinicId, cabin)

      if (success) {
        toast.success("Cabina actualizada correctamente")
        if (updateCabin) updateCabin(cabin)
      } else {
        toast.error("Error al actualizar la cabina")
      }
    }
    setIsCabinDialogOpen(false)
    setHasChanges(true)
  }

  const handleDeleteCabin = (cabinId: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta cabina?")) {
      // Update local state
      setLocalCabins((prev) => prev.filter((c) => c.id !== cabinId))

      // Delete from mock data
      const success = deleteCabinInMock(clinicId, cabinId)

      if (success) {
        toast.success("Cabina eliminada correctamente")
        if (deleteCabin) deleteCabin(cabinId)
      } else {
        toast.error("Error al eliminar la cabina")
      }

      setHasChanges(true)
    }
  }

  const handleUpdateCabinStatus = (cabin: Cabin, checked: boolean) => {
    const updatedCabin = { ...cabin, isActive: checked }

    // Update local state
    setLocalCabins((prev) => prev.map((c) => (c.id === cabin.id ? updatedCabin : c)))

    // Save to mock data
    const success = updateCabinInMock(clinicId, updatedCabin)

    if (success) {
      if (updateCabin) updateCabin(updatedCabin)
    } else {
      toast.error("Error al actualizar el estado de la cabina")
    }

    setHasChanges(true)
  }

  const saveAllChanges = () => {
    // Save all cabins to mock data
    let allSuccess = true

    localCabins.forEach((cabin) => {
      const success = updateCabinInMock(clinicId, cabin)
      if (!success) allSuccess = false
    })

    if (allSuccess) {
      toast.success("Todos los cambios guardados correctamente")
      setHasChanges(false)
    } else {
      toast.error("Error al guardar algunos cambios")
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Configuración de cabinas</h2>
          {hasChanges && (
            <Button onClick={saveAllChanges} className="bg-purple-600 hover:bg-purple-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder="Buscar cabinas" className="pl-10" value={filterText} onChange={handleFilterChange} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Nº</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="text-center">Subir</TableHead>
                <TableHead className="text-center">Bajar</TableHead>
                <TableHead className="text-center">Borrar</TableHead>
                <TableHead className="text-center">Ver +</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCabins
                .sort((a, b) => a.order - b.order)
                .map((cabin, index) => (
                  <TableRow key={cabin.id} className={cabin.isActive ? "" : "opacity-50"}>
                    <TableCell>{cabin.order}</TableCell>
                    <TableCell>{cabin.code}</TableCell>
                    <TableCell>{cabin.name}</TableCell>
                    <TableCell>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cabin.color }}></div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={cabin.isActive}
                        onCheckedChange={(checked) => {
                          handleUpdateCabinStatus(cabin, checked as boolean)
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                        onClick={() => moveCabin(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-6 w-6 font-bold" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                        onClick={() => moveCabin(index, "down")}
                        disabled={index === filteredCabins.length - 1}
                      >
                        <ChevronDown className="h-6 w-6 font-bold" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                        onClick={() => handleDeleteCabin(cabin.id)}
                      >
                        <Trash2 className="h-6 w-6 font-bold" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                        onClick={() => {
                          setEditingCabin(cabin)
                          setIsCabinDialogOpen(true)
                        }}
                      >
                        <Search className="h-6 w-6 font-bold" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <CabinEditDialog
        isOpen={isCabinDialogOpen}
        onClose={() => setIsCabinDialogOpen(false)}
        cabin={editingCabin}
        onSave={handleSaveCabin}
      />
    </Card>
  )
}

