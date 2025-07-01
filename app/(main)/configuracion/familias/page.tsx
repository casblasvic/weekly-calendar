"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Pencil, ChevronDown, AlertCircle, Menu, Check, Trash2, ChevronUp, ArrowUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Category } from "@prisma/client"
import CategoryFormModal from "@/components/category-form-modal"

// Interfaz ampliada para incluir nombre del padre y conteos
interface CategoryWithParentName extends Category {
  parentName?: string | null;
  servicesCount?: number;
  productsCount?: number;
}

export default function GestionFamilias() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  
  const [categories, setCategories] = useState<CategoryWithParentName[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/categories?includeEquipmentType=true&includeCounts=true"); // ✅ NUEVO: Incluir conteos
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener categorías`);
      }
      const data: CategoryWithParentName[] = await response.json();

      // Enriquecer con nombre del padre
      const categoriesWithParentNames = data.map(cat => {
        const parent = data.find(p => p.id === cat.parentId);
        return { ...cat, parentName: parent ? parent.name : null };
      });
      // Ordenar alfabéticamente por defecto
      categoriesWithParentNames.sort((a, b) => a.name.localeCompare(b.name)); 
      setCategories(categoriesWithParentNames);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const requestSort = (key: keyof CategoryWithParentName) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof CategoryWithParentName) => {
     if (!sortConfig || sortConfig.key !== key) {
       return <ArrowUpDown size={14} className="ml-1 h-3 w-3" />;
     }
     return sortConfig.direction === 'ascending' 
       ? <ChevronUp size={14} className="ml-1 h-3 w-3" /> 
       : <ChevronDown size={14} className="ml-1 h-3 w-3" />;
  };

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter(cat => {
      const searchTermLower = searchTerm.toLowerCase();
      const nameMatch = cat.name.toLowerCase().includes(searchTermLower);
      const parentMatch = cat.parentName?.toLowerCase().includes(searchTermLower);
      return (nameMatch || parentMatch);
    });

    if (sortConfig !== null) {
       filtered.sort((a, b) => {
         let aValue = a[sortConfig.key as keyof CategoryWithParentName];
         let bValue = b[sortConfig.key as keyof CategoryWithParentName];

         if (aValue == null && bValue != null) return sortConfig.direction === 'ascending' ? -1 : 1;
         if (aValue != null && bValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
         if (aValue == null && bValue == null) return 0;

         if (typeof aValue === 'string' && typeof bValue === 'string') {
           aValue = aValue.toLowerCase();
           bValue = bValue.toLowerCase();
         }
         if (aValue! < bValue!) return sortConfig.direction === 'ascending' ? -1 : 1;
         if (aValue! > bValue!) return sortConfig.direction === 'ascending' ? 1 : -1;
         return 0;
       });
     }
     return filtered;
  }, [categories, searchTerm, sortConfig]);

  const handleNuevaFamilia = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEditarFamilia = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchCategories();
    setIsModalOpen(false);
  };

  const handleOpenDeleteConfirm = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    let isDeleting = true;
    try {
        const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status} al eliminar`);
        }
        toast.success(`Categoría "${categoryToDelete.name}" eliminada.`);
        fetchCategories();
        handleCloseDeleteConfirm();
    } catch (error) {
        console.error("Error deleting category:", error);
        toast.error(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
         isDeleting = false;
    }
  };
  
  const renderSkeleton = (rows = 5, cols = 5) => (
      Array.from({ length: rows }).map((_, index) => (
        <TableRow key={`skel-${index}`}>
          {Array.from({ length: cols }).map((_, i) => (
              <TableCell key={`skel-cell-${i}-${index}`}><Skeleton className="h-5 w-full" /></TableCell>
          ))}
        </TableRow>
      ))
   );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold mb-4">Gestión de Familias (Categorías)</h1>

      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <div className="relative w-full sm:w-64">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             type="search"
             placeholder="Buscar por nombre, padre..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-8 w-full"
           />
        </div>
        <Button onClick={handleNuevaFamilia}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Familia
        </Button>
      </div>

      {error && <div className="text-red-600 mb-4">Error al cargar categorías: {error}</div>}

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                 className="cursor-pointer hover:bg-gray-100" 
                 onClick={() => requestSort('name')}
               >
                 Nombre {getSortIcon('name')}
               </TableHead>
               <TableHead 
                  className="cursor-pointer hover:bg-gray-100" 
                  onClick={() => requestSort('parentName')}
               >
                 Familia Padre {getSortIcon('parentName')}
               </TableHead>
               <TableHead className="text-center">Servicios</TableHead>
               <TableHead className="text-center">Productos</TableHead>
              <TableHead className="text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderSkeleton(5, 5)
            ) : filteredAndSortedCategories.length > 0 ? (
              filteredAndSortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium py-2 px-4">{category.name}</TableCell>
                  <TableCell className="py-2 px-4">{category.parentName || '-'}</TableCell>
                  <TableCell className="text-center py-2 px-4">{category.servicesCount || '-'}</TableCell>
                  <TableCell className="text-center py-2 px-4">{category.productsCount || '-'}</TableCell>
                  <TableCell className="text-right py-2 pr-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEditarFamilia(category)} className="mr-1 h-8 w-8">
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteConfirm(category)} className="text-red-600 hover:text-red-700 h-8 w-8">
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No se encontraron familias.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryFormModal
         isOpen={isModalOpen}
         setIsOpen={setIsModalOpen}
         category={editingCategory}
         onSave={handleModalSuccess}
         allCategories={categories}
       />
       
       <Dialog open={isDeleteConfirmOpen} onOpenChange={handleCloseDeleteConfirm}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Confirmar Eliminación</DialogTitle>
           </DialogHeader>
           <div className="py-4">
             ¿Seguro que quieres eliminar la categoría "{categoryToDelete?.name}"? Esta acción no se puede deshacer.
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={handleCloseDeleteConfirm}>Cancelar</Button>
             <Button variant="destructive" onClick={handleConfirmDelete} disabled={isLoading}>
               {isLoading ? "Eliminando..." : "Eliminar"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

    </div>
  );
} 