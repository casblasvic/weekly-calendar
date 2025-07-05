"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowUpDown, Trash2, Search, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EquipmentModal } from "@/components/equipment"
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
import { useEquipmentWithAssignmentsQuery, useDeleteEquipmentMutation } from "@/lib/hooks/use-equipment-query"
import { useClinicsQuery } from "@/lib/hooks/use-clinic-query"
import { useQueryClient } from "@tanstack/react-query"

// Importar el nuevo componente de asignaciones
import { EquipmentAssignmentsCell } from "@/components/equipment/equipment-assignments-cell"

// Tipo extendido para Equipment con asignaciones
interface EquipmentWithAssignments extends Equipment {
  clinicAssignments: Array<{
    id: string;
    clinicId: string;
    serialNumber: string;
    deviceId: string;
    isActive: boolean;
    clinic: {
      id: string;
      name: string;
    };
  }>;
}

export default function EquipmentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Limpiar caché al montar el componente
  useEffect(() => {
    // Limpiar cualquier caché de equipamiento en sessionStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('equipment') || key.includes('api:/api/equipment')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    // No invalidamos las queries si ya existen en caché; esto evita mostrar
    // spinner cuando los datos ya fueron precargados por AppPrefetcher.
  }, [queryClient]);
  
  // Usar los hooks optimizados en lugar del contexto
  const {
    data: equipos = [],
    isLoading: loadingEquipment,
    error: equipmentError,
    refetch: refetchEquipment
  } = useEquipmentWithAssignmentsQuery();
  
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
  
  // Estados para selección múltiple y eliminación
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Estado de carga: solo mostramos spinner/esqueleto si NO hay datos en caché
  const loading = (loadingEquipment && equipos.length === 0) || (loadingClinics && clinics.length === 0);

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

  const filteredEquipment = (equipos as EquipmentWithAssignments[]).filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    
    // Buscar en nombres de clínicas asignadas
    const clinicNames = item.clinicAssignments?.map(assignment => 
      assignment.clinic?.name?.toLowerCase() || ''
    ).join(' ') || '';
    
    // Buscar en números de serie de las asignaciones
    const serialNumbers = item.clinicAssignments?.map(assignment => 
      assignment.serialNumber?.toLowerCase() || ''
    ).join(' ') || '';
    
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.modelNumber?.toLowerCase() || "").includes(searchLower) ||
      clinicNames.includes(searchLower) ||
      serialNumbers.includes(searchLower)
    )
  }).sort((a, b) => {
    let aValue: any = a[sortColumn as keyof Equipment]
    let bValue: any = b[sortColumn as keyof Equipment]
    
    if (sortColumn === "assignedClinics") {
      aValue = a.clinicAssignments?.length || 0;
      bValue = b.clinicAssignments?.length || 0;
      const comparison = aValue - bValue;
      return sortDirection === "asc" ? comparison : -comparison;
    } else {
      aValue = String(aValue ?? '').toLowerCase();
      bValue = String(bValue ?? '').toLowerCase();
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === "asc" ? comparison : -comparison;
    }
  });

  // Función para verificar si un equipamiento puede eliminarse (sin asignaciones)
  const canBeDeleted = (equipment: EquipmentWithAssignments) => {
    const activeAssignments = equipment.clinicAssignments?.filter(a => a.isActive) || [];
    return activeAssignments.length === 0;
  }

  // Manejar selección individual
  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  // Manejar selección de todos los elementos eliminables
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const deletableIds = filteredEquipment
        .filter(item => canBeDeleted(item))
        .map(item => item.id)
      setSelectedIds(new Set(deletableIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Manejar eliminación múltiple
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return

    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedIds.size} tipo${selectedIds.size > 1 ? 's' : ''} de equipamiento?`
    if (!confirm(confirmMessage)) return

    setIsDeleting(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/equipment/${id}`, { method: 'DELETE' })
      )
      
      const results = await Promise.all(promises)
      const failedDeletes = results.filter(result => !result.ok)
      
      if (failedDeletes.length > 0) {
        throw new Error(`Error al eliminar ${failedDeletes.length} equipamiento(s)`)
      }

      // Éxito: actualizar tabla y limpiar selección
      await refetchEquipment()
      setSelectedIds(new Set())
      
      if (selectedIds.size === 1) {
        toast("Equipamiento eliminado correctamente")
      } else {
        toast(`${selectedIds.size} equipamientos eliminados correctamente`)
      }
    } catch (error) {
      console.error('Error deleting equipment:', error)
      toast(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrar equipos eliminables y seleccionados
  const deletableEquipment = filteredEquipment.filter(item => canBeDeleted(item))
  const selectedDeletableCount = Array.from(selectedIds).filter(id => 
    deletableEquipment.some(item => item.id === id)
  ).length
  const allDeletableSelected = deletableEquipment.length > 0 && 
    deletableEquipment.every(item => selectedIds.has(item.id))

  const handleDelete = async (id: string) => {
    const equipment = (equipos as EquipmentWithAssignments[]).find((e) => e.id === id);
    const activeAssignments = equipment?.clinicAssignments?.filter(a => a.isActive)?.length || 0;
    
    if (activeAssignments > 0) {
      toast(`No se puede eliminar: el equipamiento tiene ${activeAssignments} asignación(es) activa(s). Desactívalas primero desde el detalle.`);
      return;
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este tipo de equipamiento?")) {
      deleteEquipmentMutation.mutate(id, {
        onSuccess: () => {
          toast("Equipamiento eliminado correctamente");
        },
        onError: (error) => {
          toast(`Error al eliminar el equipamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      });
    }
  };

  // Función wrapper para refetch con logs
  const handleRefreshEquipment = useCallback(async () => {
    console.log('🔄 [EquipmentPage] Iniciando refetch de equipamiento...');
    try {
      await refetchEquipment();
      console.log('✅ [EquipmentPage] Refetch completado exitosamente');
    } catch (error) {
      console.error('❌ [EquipmentPage] Error en refetch:', error);
    }
  }, [refetchEquipment]);

  const openModal = (equipment: Equipment | null = null) => {
    setSelectedEquipment(equipment);
    setIsEditMode(!!equipment);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    // Refetch equipment data to ensure the table shows updated assignment counts
    console.log('🔄 [EquipmentPage] Modal cerrado, refrescando datos...');
    handleRefreshEquipment();
  };

  return (
    <div className="container p-6 pt-16 mx-auto space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 justify-between items-start md:flex-row">
        <div className="space-y-4 w-full">
          <h2 className="text-2xl font-semibold">Gestión de Equipamiento</h2>
          <p className="text-sm text-gray-600">
            Gestiona los tipos y modelos de equipamiento. Cada tipo puede tener múltiples instancias asignadas a diferentes clínicas.
          </p>
          <div className="flex flex-col gap-4 justify-between items-start sm:flex-row sm:items-center">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Buscar por nombre, modelo, clínica..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            
            <div className="flex gap-2">
              {/* Botón Eliminar con contador */}
              <Button 
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0 || isDeleting}
                variant="destructive"
                size="default"
                className="flex gap-2 items-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar {selectedIds.size > 0 && `(${selectedIds.size})`}
                  </>
                )}
              </Button>

              {/* Botón Nuevo Equipamiento */}
              <Button 
                onClick={() => openModal(null)}
                className="flex gap-2 items-center text-white whitespace-nowrap bg-purple-600 hover:bg-purple-700"
                size="default"
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
                {loading ? "Cargando..." : "Nuevo tipo de equipamiento"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="w-4 h-4" /></TableHead>
                <TableHead><Skeleton className="w-24 h-4" /></TableHead>
                <TableHead><Skeleton className="w-40 h-4" /></TableHead>
                <TableHead><Skeleton className="w-20 h-4" /></TableHead>
                <TableHead><Skeleton className="w-32 h-4" /></TableHead>
                <TableHead className="text-right"><Skeleton className="w-16 h-4" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="w-4 h-4" /></TableCell>
                  <TableCell><Skeleton className="w-full h-4" /></TableCell>
                  <TableCell><Skeleton className="w-full h-4" /></TableCell>
                  <TableCell><Skeleton className="w-full h-4" /></TableCell>
                  <TableCell><Skeleton className="w-full h-4" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="inline-block w-8 h-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allDeletableSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={deletableEquipment.length === 0}
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  Nombre {sortColumn === "name" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
                </TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("modelNumber")}>
                  Modelo {sortColumn === "modelNumber" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("assignedClinics")}>
                  Asignaciones Activas {sortColumn === "assignedClinics" && (
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
                filteredEquipment.map((item: EquipmentWithAssignments) => {
                  const activeAssignments = item.clinicAssignments?.filter(a => a.isActive) || [];
                  const isDeletable = canBeDeleted(item);
                  const isSelected = selectedIds.has(item.id);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          disabled={!isDeletable}
                          className={!isDeletable ? "opacity-30" : ""}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description || '-'}</TableCell>
                      <TableCell>{item.modelNumber || '-'}</TableCell>
                      <TableCell>
                        <EquipmentAssignmentsCell equipmentId={item.id} />
                      </TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openModal(item)}
                          className="w-8 h-8"
                          title="Ver detalles y gestionar asignaciones"
                          disabled={loading}
                        >
                          <Search className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="w-8 h-8 text-red-600 hover:text-red-700"
                          title="Eliminar tipo de equipamiento"
                          disabled={loading || deleteEquipmentMutation.isPending || activeAssignments.length > 0}
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

      {isModalOpen && (
         <EquipmentModal
           isOpen={isModalOpen}
           onClose={handleModalClose}
           initialEquipment={selectedEquipment}
           isEditMode={isEditMode}
           onRefreshData={handleRefreshEquipment}
         />
      )}
    </div>
  )
}

