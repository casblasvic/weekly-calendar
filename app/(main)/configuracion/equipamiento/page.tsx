"use client"

import { useState, useMemo } from "react"
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
import type { Equipment } from "@prisma/client";
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

// Importar los hooks optimizados de TanStack Query
import { useEquipmentQuery, useDeleteEquipmentMutation } from "@/lib/hooks/use-equipment-query"
import { useClinicsQuery } from "@/lib/hooks/use-clinic-query"

export default function EquipmentPage() {
  const router = useRouter()
  
  // Usar los hooks optimizados en lugar del contexto
  const {
    data: equipos = [],
    isLoading: loadingEquipment,
    error: equipmentError
  } = useEquipmentQuery();
  
  const {
    data: clinics = [],
    isLoading: loadingClinics,
  } = useClinicsQuery();
  
  // Mutación para eliminar equipamiento
  const deleteEquipmentMutation = useDeleteEquipmentMutation();
  
  // Estado local
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Estado de carga combinado
  const loading = loadingEquipment || loadingClinics;

  const clinicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    clinics.forEach(clinic => {
      map.set(String(clinic.id), clinic.name);
    });
    return map;
  }, [clinics]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const filteredEquipment = equipos.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    const clinicName = item.clinicId ? clinicNameMap.get(String(item.clinicId))?.toLowerCase() ?? '' : '';
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.serialNumber?.toLowerCase() || "").includes(searchLower) ||
      (item.modelNumber?.toLowerCase() || "").includes(searchLower) ||
      clinicName.includes(searchLower)
    )
  }).sort((a, b) => {
    let aValue: any = a[sortColumn as keyof Equipment]
    let bValue: any = b[sortColumn as keyof Equipment]
    
    if (sortColumn === "clinicId") {
      aValue = a.clinicId ? clinicNameMap.get(String(a.clinicId)) ?? '' : '';
      bValue = b.clinicId ? clinicNameMap.get(String(b.clinicId)) ?? '' : '';
    } else {
      aValue = String(aValue ?? '').toLowerCase();
      bValue = String(bValue ?? '').toLowerCase();
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este equipo?")) {
      deleteEquipmentMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Equipo eliminado correctamente");
        },
        onError: (error) => {
          toast.error(`Error al eliminar el equipo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      });
    }
  };

  const openModal = (equipment: Equipment | null = null) => {
    setSelectedEquipment(equipment);
    setIsEditMode(!!equipment);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: Partial<Equipment>) => {
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

      {loading ? (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-40" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="inline-block h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  Nombre {sortColumn === "name" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
                </TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("serialNumber")}>
                  Núm. Serie {sortColumn === "serialNumber" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("modelNumber")}>
                  Modelo {sortColumn === "modelNumber" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("clinicId")}>
                  Clínica Asociada {sortColumn === "clinicId" && (
                    <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />
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
                filteredEquipment.map((item) => {
                  const clinic = item.clinicId ? clinics.find(c => String(c.id) === String(item.clinicId)) : null;
                  const clinicName = clinic ? clinic.name : null;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>{item.serialNumber}</TableCell>
                      <TableCell>{item.modelNumber || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {clinicName ? (
                            <Badge variant="secondary" className="text-xs">
                              {clinicName}
                            </Badge>
                          ) : (
                            item.clinicId ? 
                            <Badge variant="outline" className="text-xs font-mono">ID: {item.clinicId}</Badge> 
                            : <span className="text-xs text-gray-500">Sin asignar</span>
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
                          disabled={loading}
                        >
                          <Search className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          title="Eliminar"
                          disabled={loading || deleteEquipmentMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="fixed bottom-8 right-8">
        <Button 
          onClick={() => openModal(null)}
          className="text-white bg-purple-600 hover:bg-purple-700 shadow-lg"
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-2" />
          {loading ? "Cargando..." : "Nuevo equipamiento"}
        </Button>
      </div>

      {isModalOpen && (
         <AddEquipmentModal
           isOpen={isModalOpen}
           onClose={() => { setIsModalOpen(false); setSelectedEquipment(null); }}
           clinics={clinics || []}
           initialEquipment={selectedEquipment}
           isEditMode={isEditMode}
         />
      )}
    </div>
  )
}

