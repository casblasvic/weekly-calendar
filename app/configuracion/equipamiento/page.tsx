"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowUpDown, Trash2, Search, MoreHorizontal } from "lucide-react"
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
import { useEquipment, Equipo } from "@/contexts/equipment-context"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

export default function EquipmentPage() {
  const router = useRouter()
  const { allEquipos, deleteEquipo, clinics, addEquipo, updateEquipo, getGlobalEquipos } = useEquipment()
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipo | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [equipos, setEquipos] = useState<Equipo[]>([])
  
  const [sortColumn, setSortColumn] = useState<string>("code")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const equiposCargados = await getGlobalEquipos();
        setEquipos(equiposCargados || allEquipos || []);
      } catch (error) {
        console.error("Error al cargar equipamiento:", error);
        toast.error("Error al cargar datos de equipamiento");
      }
    };
    loadEquipment();
  }, [allEquipos, getGlobalEquipos]);

  const getClinicNames = (clinicIds: string[] | undefined, clinicId?: string): string => {
    if (clinicIds && clinicIds.length > 0) {
       return clinicIds.map(id => {
         const clinic = clinics.find(c => String(c.id) === String(id));
         return clinic ? clinic.name : `ID ${id}`;
       }).join(", ");
    } else if (clinicId) {
        const clinic = clinics.find(c => String(c.id) === String(clinicId));
        return clinic ? clinic.name : `ID ${clinicId}`;
    }
    return "Sin asignar";
  }
  
  const getClinicsByIds = (ids: string[] | undefined): { id: string; name: string }[] => {
      if (!ids) return [];
      return clinics.filter(c => ids.includes(String(c.id)))
                     .map(c => ({ id: String(c.id), name: c.name }));
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const filteredEquipment = equipos ? equipos.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    const clinicNames = getClinicNames(item.clinicIds, item.clinicId).toLowerCase()
    return (
      item.code?.toLowerCase().includes(searchLower) ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.serialNumber?.toLowerCase() || "").includes(searchLower) ||
      clinicNames.includes(searchLower)
    )
  }).sort((a, b) => {
    let aValue: any = a[sortColumn as keyof Equipo]
    let bValue: any = b[sortColumn as keyof Equipo]
    
    if (sortColumn === "clinicIds") {
      aValue = getClinicNames(a.clinicIds, a.clinicId)
      bValue = getClinicNames(b.clinicIds, b.clinicId)
    }
    
    const valA = String(aValue ?? '').toLowerCase();
    const valB = String(bValue ?? '').toLowerCase();
    
    if (sortDirection === "asc") {
      return valA.localeCompare(valB)
    } else {
      return valB.localeCompare(valA)
    }
  }) : [];

  const handleDelete = async (id: string) => {
      if (confirm("¿Estás seguro de que quieres eliminar este equipo?")) {
          const success = await deleteEquipo(id);
          if (success) {
              toast.success("Equipo eliminado correctamente");
              setEquipos(prev => prev.filter(eq => eq.id !== id));
          } else {
              toast.error("Error al eliminar el equipo");
          }
      }
  };

  const openModal = (equipment: Equipo | null = null) => {
    setSelectedEquipment(equipment);
    setIsEditMode(!!equipment);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: Partial<Equipo>) => {
      setIsModalOpen(false);
      setSelectedEquipment(null);
  };

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
                Código {sortColumn === "code" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Nombre {sortColumn === "name" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />}
              </TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("serialNumber")}>
                Núm. Serie {sortColumn === "serialNumber" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("clinicIds")}>
                Clínicas Asociadas {sortColumn === "clinicIds" && (
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
                  No hay equipamiento disponible que coincida con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                  <TableCell>{item.serialNumber}</TableCell>
                  <TableCell>
                     <div className="flex flex-wrap gap-1">
                        {(item.clinicIds && item.clinicIds.length > 0 ? getClinicsByIds(item.clinicIds) : (item.clinicId ? getClinicsByIds([item.clinicId]) : [])).map(clinic => (
                           <Badge key={clinic.id} variant="secondary" className="text-xs">
                              {clinic.name}
                           </Badge>
                        ))}
                        {(!item.clinicIds || item.clinicIds.length === 0) && !item.clinicId && (
                            <span className="text-xs text-gray-500">Sin asignar</span>
                        )}
                     </div>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openModal(item)}
                      className="h-8 w-8"
                      title="Editar"
                    >
                      <Search className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      title="Eliminar"
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
          onClick={() => openModal(null)}
          className="text-white bg-purple-600 hover:bg-purple-700 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo equipamiento
        </Button>
      </div>

      {isModalOpen && (
         <AddEquipmentModal
           isOpen={isModalOpen}
           onClose={() => { setIsModalOpen(false); setSelectedEquipment(null); }}
           clinics={clinics.map(c => ({ id: String(c.id), name: c.name }))}
           initialEquipment={selectedEquipment}
           isEditMode={isEditMode}
         />
      )}
    </div>
  )
}

