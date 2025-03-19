"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Search, ArrowUpDown, MoreHorizontal, Edit, Trash2, SwitchCamera, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AddEquipmentModal } from "@/components/modals/add-equipment-modal"
import { getEquipment, deleteEquipment, addEquipment } from "@/mockData"
import { MockData } from "@/mockData"

export default function EquipmentPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [equipment, setEquipment] = useState<any[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [clinics, setClinics] = useState<any[]>([])

  useEffect(() => {
    // Obtenemos todas las clínicas
    setClinics(MockData.clinicas || [])
    
    // Obtenemos todos los equipos y los procesamos
    const allEquipment: any[] = [];
    // Usamos los IDs de las clínicas del MockData
    const clinicIds = (MockData.clinicas || []).map(clinic => Number(clinic.id));
    
    clinicIds.forEach(id => {
      allEquipment.push(...getEquipment(id));
    });
    setEquipment(allEquipment);
  }, [])

  // Función para obtener el nombre de la clínica según su ID
  const getClinicName = (clinicId: number) => {
    const clinic = clinics.find(c => Number(c.id) === clinicId)
    return clinic ? clinic.nombre || clinic.name : `Clínica ${clinicId}`;
  }

  const deleteEquipmentItem = (id: number) => {
    try {
      const success = deleteEquipment(id)
      if (success) {
        setEquipment(equipment.filter((item) => item.id !== id))
        toast.success("Equipo eliminado correctamente")
      } else {
        toast.error("Error al eliminar el equipo")
      }
    } catch (error) {
      toast.error("Error al eliminar el equipo")
    }
  }

  const filteredEquipment = equipment.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.code?.toLowerCase().includes(searchLower) ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.serialNumber?.toLowerCase() || "").includes(searchLower) ||
      getClinicName(item.clinicId)?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl pt-16">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="w-full space-y-4">
          <h2 className="text-2xl font-semibold">Gestión de Equipamiento</h2>
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar equipamiento"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Card className="p-4 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Número de serie</TableHead>
              <TableHead>Clínica</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length > 0 ? (
              filteredEquipment.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.serialNumber || "-"}</TableCell>
                  <TableCell>{getClinicName(item.clinicId)}</TableCell>
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
                      onClick={() => router.push(`/configuracion/clinicas/${item.clinicId}/equipamiento/${item.id}`)}
                    >
                      <Search className="h-4 w-4 text-primary" />
                      <span className="sr-only">Ver</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No se encontraron equipos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="fixed bottom-8 right-8">
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo equipamiento
        </Button>
      </div>

      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => {
          try {
            const newEquipment = addEquipment(data)
            setEquipment([...equipment, newEquipment])
            toast.success("Equipamiento añadido correctamente")
          } catch (error) {
            toast.error("Error al añadir el equipamiento")
          }
        }}
        clinics={clinics.map(c => ({
          id: Number(c.id),
          name: c.nombre || c.name
        }))}
      />
    </div>
  )
}

