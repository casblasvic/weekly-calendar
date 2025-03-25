"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Pencil, ChevronDown, AlertCircle, Menu, Check, Trash2, ChevronUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTarif } from "@/contexts/tarif-context"

export default function GestionFamilias() {
  const router = useRouter()
  const { familiasTarifa, addFamiliaTarifa, updateFamiliaTarifa, toggleFamiliaStatus, getFamiliasByTarifaId } = useTarif()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [familyToDelete, setFamilyToDelete] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [currentFamily, setCurrentFamily] = useState<{
    id?: string
    name: string
    code: string
    parentId: string | null
    isActive: boolean
    tarifaId: string
  }>({
    name: "",
    code: "",
    parentId: null,
    isActive: true,
    tarifaId: "tarifa-california" // ID de la tarifa actual
  })
  const [isNewFamily, setIsNewFamily] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [families, setFamilies] = useState<any[]>([])
  
  // Cargar familias al iniciar
  const TARIFA_ID = "tarifa-california"; // ID de la tarifa actual
  
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const familiesData = await getFamiliasByTarifaId(TARIFA_ID);
        setFamilies(Array.isArray(familiesData) ? familiesData : []);
      } catch (error) {
        console.error("Error al cargar familias:", error);
        setFamilies([]);
      }
    };
    
    loadFamilies();
  }, [getFamiliasByTarifaId]);

  // Solicitar ordenación de una columna
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Obtener ícono de ordenación para la columna
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };

  // Filtrar familias según los criterios de búsqueda y visibilidad
  const filteredFamilies = useMemo(() => {
    // Asegurarse de que families sea un array
    const familiesArray = Array.isArray(families) ? families : [];
    
    return familiesArray.filter(familia => {
      // Filtrar por término de búsqueda (en nombre o código)
      const matchesSearch = !searchTerm || 
        familia.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        familia.code.toLowerCase().includes(searchTerm.toLowerCase());
        
      // Filtrar por estado (activo/inactivo)
      const matchesStatus = showDisabled || familia.isActive;
        
      return matchesSearch && matchesStatus;
    });
  }, [families, searchTerm, showDisabled]);

  // Filtrar y ordenar familias
  const filteredAndSortedFamilies = useMemo(() => {
    // Luego ordenamos si hay configuración de ordenación
    let sorted = [...filteredFamilies];
    if (sortConfig !== null) {
      sorted.sort((a, b) => {
        // Determinar los valores a comparar según la clave de ordenación
        let aValue = a[sortConfig.key as keyof typeof a];
        let bValue = b[sortConfig.key as keyof typeof b];
        
        // Para strings, hacemos comparación insensible a mayúsculas/minúsculas
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue !== null && bValue !== null) {
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        }
        return 0;
      });
    }
    
    return sorted;
  }, [filteredFamilies, sortConfig]);

  // Abrir diálogo para nueva familia
  const handleOpenNewFamilyDialog = () => {
    setIsNewFamily(true)
    setCurrentFamily({
      name: "",
      code: "",
      parentId: null,
      isActive: true,
      tarifaId: "tarifa-california"
    })
    setIsEditDialogOpen(true)
  }

  // Abrir diálogo para editar familia
  const handleEditFamily = (family: any) => {
    setIsNewFamily(false)
    setCurrentFamily({
      id: family.id,
      name: family.name,
      code: family.code,
      parentId: family.parentId,
      isActive: family.isActive,
      tarifaId: family.tarifaId
    })
    setIsEditDialogOpen(true)
  }

  // Guardar familia (nueva o editada)
  const handleSaveFamily = () => {
    setIsSaving(true)

    // Simulamos una operación asíncrona
    setTimeout(() => {
      if (isNewFamily) {
        addFamiliaTarifa(currentFamily)
      } else if (currentFamily.id) {
        updateFamiliaTarifa(currentFamily.id, currentFamily)
      }

      setIsSaving(false)
      setIsEditDialogOpen(false)
    }, 500)
  }

  // Cambiar estado activo/inactivo
  const handleToggleStatus = (id: string) => {
    toggleFamiliaStatus(id)
  }

  // Confirmar eliminación de familia
  const handleConfirmDelete = (id: string) => {
    setFamilyToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  // Eliminar familia
  const handleDeleteFamily = () => {
    if (familyToDelete) {
      updateFamiliaTarifa(familyToDelete, { isActive: false })
      setIsDeleteConfirmOpen(false)
      setFamilyToDelete(null)
    }
  }

  return (
    <div className="pt-20 px-6 pb-20">
      <h1 className="text-2xl font-bold mb-6">Gestión de Familias</h1>
      
      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Buscar familias..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="verFamiliasDeshabilitadas"
            checked={showDisabled}
            onCheckedChange={(checked) => setShowDisabled(!!checked)}
          />
          <label htmlFor="verFamiliasDeshabilitadas" className="text-sm">
            Ver familias deshabilitadas
          </label>
        </div>
      </div>

      {/* Tabla de familias */}
      <div className="overflow-x-auto bg-white rounded-lg shadow mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center cursor-pointer" onClick={() => requestSort('code')}>
                  Código {getSortIcon('code')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center cursor-pointer" onClick={() => requestSort('name')}>
                  Nombre {getSortIcon('name')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
              >
                Familia Padre
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedFamilies.map((family) => (
              <tr 
                key={family.id} 
                className="table-row-hover"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {family.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {family.name}
                  {!family.isActive && (
                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Deshabilitada
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {family.parentId ? (
                    families.find(f => f.id === family.parentId)?.name || "(Desconocido)"
                  ) : (
                    <span className="text-gray-400">(Ninguna)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditFamily(family)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleConfirmDelete(family.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-900 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAndSortedFamilies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron familias
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/configuracion/tarifas/${currentFamily.tarifaId}`)}
        >
          Volver
        </Button>
        <Button variant="default" className="bg-purple-800 hover:bg-purple-900" onClick={handleOpenNewFamilyDialog}>
          Nueva familia
        </Button>
        <Button variant="outline" className="bg-black text-white hover:bg-gray-800">
          Ayuda
        </Button>
      </div>

      {/* Modal de edición/creación de familia */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNewFamily ? "Nueva familia" : "Editar familia"}</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Código
              </label>
              <Input
                id="code"
                className="focus:ring-purple-500 focus:border-purple-500"
                value={currentFamily.code}
                onChange={(e) => setCurrentFamily({ ...currentFamily, code: e.target.value })}
                placeholder="Código único"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <Input
                id="name"
                className="focus:ring-purple-500 focus:border-purple-500"
                value={currentFamily.name}
                onChange={(e) => setCurrentFamily({ ...currentFamily, name: e.target.value })}
                placeholder="Nombre de la familia"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">
                Familia padre (opcional)
              </label>
              <Select 
                value={currentFamily.parentId || "none"} 
                onValueChange={(value) => setCurrentFamily({ 
                  ...currentFamily, 
                  parentId: value === "none" ? null : value 
                })}
              >
                <SelectTrigger className="focus:ring-purple-500 focus:border-purple-500">
                  <SelectValue placeholder="Seleccionar familia padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {families
                    .filter(f => f.id !== currentFamily.id) // Excluir la familia actual
                    .map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={currentFamily.isActive}
                onCheckedChange={(checked) => 
                  setCurrentFamily({ ...currentFamily, isActive: !!checked })
                }
                className="data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Activa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="default" 
              className="bg-purple-700 hover:bg-purple-800"
              onClick={handleSaveFamily}
              disabled={isSaving || !currentFamily.name || !currentFamily.code}
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm text-gray-500">
              ¿Estás seguro de que deseas eliminar esta familia? Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFamily}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

