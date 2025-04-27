"use client"

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as sonnerToast } from "sonner";
import { Plus, Search, Pencil, Trash2, ArrowUpDown, ChevronUp, ChevronDown, CircleDollarSign, Package as PackageIcon } from "lucide-react"; // Renombrar Package para evitar conflicto
import { Product, Category, VATType } from "@prisma/client";
import { ProductFormModal } from "@/components/product-form-modal"; // Importamos el modal aunque no lo usemos directamente aquí
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Extender el tipo Product para incluir relaciones opcionales
type ProductWithIncludes = Product & {
  category?: Category | null;
  vatType?: VATType | null; // Cambiado de defaultVatType a vatType
};

export default function GestionProductos() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithIncludes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProductWithIncludes; direction: 'ascending' | 'descending' } | null>(null);
  
  // Estado para confirmación de borrado
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithIncludes | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar productos
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener productos`);
      }
      const data: ProductWithIncludes[] = await response.json();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Lógica de ordenación
  const requestSort = (key: keyof ProductWithIncludes) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ProductWithIncludes) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="ml-1 h-3 w-3" />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp size={14} className="ml-1 h-3 w-3" /> 
      : <ChevronDown size={14} className="ml-1 h-3 w-3" />;
  };

  // Filtrado y ordenación
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(prod => {
      const searchTermLower = searchTerm.toLowerCase();
      const nameMatch = prod.name.toLowerCase().includes(searchTermLower);
      const skuMatch = prod.sku?.toLowerCase().includes(searchTermLower);
      const categoryMatch = prod.category?.name.toLowerCase().includes(searchTermLower);
      return nameMatch || skuMatch || categoryMatch;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Manejar relaciones anidadas como categoría
        if (sortConfig.key === 'category') {
            aValue = a.category?.name;
            bValue = b.category?.name;
        }
        if (sortConfig.key === 'vatType') {
            aValue = a.vatType?.name;
            bValue = b.vatType?.name;
        }

        if (aValue == null && bValue != null) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue != null && bValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (aValue == null && bValue == null) return 0;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        // Comparación para números y strings
        if (aValue! < bValue!) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue! > bValue!) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [products, searchTerm, sortConfig]);

  // Navegación
  const handleNuevoProducto = () => {
    router.push('/configuracion/productos/nuevo');
  };

  const handleEditarProducto = (productId: string) => {
    router.push(`/configuracion/productos/${productId}`);
  };

  // Borrado
   const handleOpenDeleteConfirm = (product: ProductWithIncludes) => {
    setProductToDelete(product);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setProductToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
        const response = await fetch(`/api/products/${productToDelete.id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status} al eliminar`);
        }
        sonnerToast.success(`Producto "${productToDelete.name}" eliminado.`);
        fetchProducts(); // Recargar lista
        handleCloseDeleteConfirm(); // Cerrar confirmación
    } catch (error) {
        console.error("Error deleting product:", error);
        sonnerToast.error(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
         setIsDeleting(false);
    }
  };

  // Renderizado Skeleton
   const renderSkeleton = (rows = 5, cols = 6) => (
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
      <h1 className="text-2xl font-semibold mb-4">Gestión de Productos</h1>

      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <div className="relative w-full sm:w-64">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             type="search"
             placeholder="Buscar por nombre, SKU, categoría..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-8 w-full"
           />
        </div>
        <Button onClick={handleNuevoProducto}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
        </Button>
      </div>

      {error && <div className="text-red-600 mb-4">Error al cargar productos: {error}</div>}

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Ajustar cabeceras según datos a mostrar */} 
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => requestSort('sku')}>SKU {getSortIcon('sku')}</TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>Nombre {getSortIcon('name')}</TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => requestSort('category')}>Categoría {getSortIcon('category')}</TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => requestSort('price')}>Precio Base {getSortIcon('price')}</TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => requestSort('vatType')}>IVA Base {getSortIcon('vatType')}</TableHead>
              <TableHead className="text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderSkeleton(5, 6) // 6 columnas
            ) : filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => (
                <TableRow key={product.id}><TableCell className="py-2 px-4">{product.sku || '-'}</TableCell><TableCell className="font-medium py-2 px-4">{product.name}</TableCell><TableCell className="py-2 px-4">{product.category?.name || '-'}</TableCell><TableCell className="py-2 px-4 text-right">{product.price?.toFixed(2) ?? '-'} €</TableCell><TableCell className="py-2 px-4">{product.vatType ? `${product.vatType.name} (${product.vatType.rate}%)` : '-'}</TableCell><TableCell className="text-right py-2 pr-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEditarProducto(product.id)} className="mr-1 h-8 w-8">
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteConfirm(product)} className="text-red-600 hover:text-red-700 h-8 w-8">
                      <Trash2 size={16} />
                    </Button>
                  </TableCell></TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       
      {/* Diálogo de Confirmación de Borrado */} 
       <Dialog open={isDeleteConfirmOpen} onOpenChange={handleCloseDeleteConfirm}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Confirmar Eliminación</DialogTitle>
           </DialogHeader>
           <div className="py-4">
             ¿Seguro que quieres eliminar el producto "{productToDelete?.name}"? Esta acción no se puede deshacer.
             <br/>
             <span className="text-sm text-orange-600">Asegúrate de que no esté asociado a ninguna tarifa activa.</span>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={handleCloseDeleteConfirm}>Cancelar</Button>
             <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
               {isDeleting ? "Eliminando..." : "Eliminar"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

    </div>
  );
} 