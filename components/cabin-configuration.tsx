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
import { useCabins, Cabin } from "@/contexts/CabinContext"
import { toast } from "sonner"

interface CabinConfigurationProps {
  cabins: Cabin[]
  clinicId: number
  updateCabin?: (cabin: Cabin) => void
  deleteCabin?: (cabinId: number) => void
}

export default function CabinConfiguration({ cabins, clinicId, updateCabin, deleteCabin }: CabinConfigurationProps) {
  const { updateCabin: updateContextCabin, deleteCabin: deleteContextCabin, getCabinsByClinic, reorderCabins } = useCabins()
  const [isCabinDialogOpen, setIsCabinDialogOpen] = useState(false)
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null)
  const [filterText, setFilterText] = useState("")
  const [localCabins, setLocalCabins] = useState<Cabin[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize with fresh data
  useEffect(() => {
    const loadClinicCabins = async () => {
      try {
        const clinicCabins = await getCabinsByClinic(clinicId);
        if (clinicCabins && clinicCabins.length > 0) {
          setLocalCabins(clinicCabins);
        } else {
          setLocalCabins(cabins);
        }
      } catch (error) {
        console.error("Error al cargar cabinas de la clínica:", error);
        setLocalCabins(cabins);
      }
    };
    
    loadClinicCabins();
  }, [clinicId, cabins, getCabinsByClinic])

  // Listen for data changes from other components
  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      const { entityType, entityId } = e.detail

      if (entityType === "clinic" && entityId === clinicId) {
        // Recargar las cabinas cuando se actualiza la clínica
        getCabinsByClinic(clinicId)
          .then(clinicCabins => {
            if (clinicCabins && clinicCabins.length > 0) {
              setLocalCabins(clinicCabins);
              setHasChanges(false);
            }
          })
          .catch(error => {
            console.error("Error al recargar cabinas:", error);
          });
      }
    }

    window.addEventListener("data-change" as any, handleDataChange)
    return () => {
      window.removeEventListener("data-change" as any, handleDataChange)
    }
  }, [clinicId, getCabinsByClinic])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
  }

  const filteredCabins = localCabins.filter(
    (cabin) =>
      cabin.name.toLowerCase().includes(filterText.toLowerCase()) ||
      cabin.code.toLowerCase().includes(filterText.toLowerCase())
  )

  const moveCabin = (index: number, direction: "up" | "down") => {
    const newCabins = [...localCabins]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newCabins.length) return

    // Swap order values
    const temp = newCabins[index].order
    newCabins[index].order = newCabins[targetIndex].order
    newCabins[targetIndex].order = temp

    // Sort by order
    newCabins.sort((a, b) => a.order - b.order)
    setLocalCabins(newCabins)
    setHasChanges(true)
  }

  const handleSaveCabin = (cabin: Cabin) => {
    let updatedCabin = { ...cabin }

    // If it's a new cabin, set a new ID and order
    if (!cabin.id) {
      updatedCabin = {
        ...updatedCabin,
        id: Date.now(), // Generate temporary ID
        order: localCabins.length > 0 ? Math.max(...localCabins.map((c) => c.order)) + 1 : 1,
      }
    }

    // Check if we're updating an existing cabin
    const cabinIndex = localCabins.findIndex((c) => c.id === updatedCabin.id)

    if (cabinIndex !== -1) {
      // Update existing cabin
      const newCabins = [...localCabins]
      newCabins[cabinIndex] = updatedCabin
      setLocalCabins(newCabins)
    } else {
      // Add new cabin
      setLocalCabins([...localCabins, updatedCabin])
    }

    setHasChanges(true)
    setIsCabinDialogOpen(false)
    setEditingCabin(null)
  }

  const handleDeleteCabin = async (cabinId: number) => {
    // Update local state to remove the cabin
    setLocalCabins(localCabins.filter((cabin) => cabin.id !== cabinId))
    setHasChanges(true)

    // If a delete function was provided as prop, use it
    if (deleteCabin) {
      deleteCabin(cabinId)
      return
    }

    // Otherwise use the context function
    const confirmDelete = window.confirm("¿Está seguro de eliminar esta cabina?")
    if (confirmDelete) {
      try {
        const success = await deleteContextCabin(cabinId);
        if (success) {
          toast.success("Cabina eliminada correctamente")
          // Dispatch event to notify other components
          window.dispatchEvent(
            new CustomEvent("data-change", {
              detail: { entityType: "clinic", entityId: clinicId },
            })
          )
        } else {
          toast.error("Error al eliminar cabina")
        }
      } catch (error) {
        console.error("Error al eliminar cabina:", error)
        toast.error("Error al eliminar cabina")
      }
    }
  }

  const handleUpdateCabinStatus = (cabin: Cabin, checked: boolean) => {
    const updatedCabin = { ...cabin, isActive: checked }
    const cabinIndex = localCabins.findIndex((c) => c.id === cabin.id)

    if (cabinIndex !== -1) {
      const newCabins = [...localCabins]
      newCabins[cabinIndex] = updatedCabin
      setLocalCabins(newCabins)
      setHasChanges(true)
    }
  }

  const saveAllChanges = async () => {
    // If an update function was provided as prop, use it for each cabin
    if (updateCabin) {
      localCabins.forEach((cabin) => {
        updateCabin(cabin)
      })
      setHasChanges(false)
      toast.success("Cambios guardados correctamente")
      return
    }

    // Otherwise use the context function to update the order
    try {
      const success = await reorderCabins(clinicId, localCabins);
      if (success) {
        setHasChanges(false)
        toast.success("Cambios guardados correctamente")
        // Dispatch event to notify other components
        window.dispatchEvent(
          new CustomEvent("data-change", {
            detail: { entityType: "clinic", entityId: clinicId },
          })
        )
      } else {
        toast.error("Error al guardar cambios")
      }
    } catch (error) {
      console.error("Error al guardar cambios:", error)
      toast.error("Error al guardar cambios")
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

