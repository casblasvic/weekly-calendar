'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Trash, MoreHorizontal, Search, Mail, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SuppliersListProps {
  onEdit: (supplier: any) => void;
}

export function SuppliersList({ onEdit }: SuppliersListProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [deleteSupplier, setDeleteSupplier] = useState<any>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [page, search]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const response = await fetch(`/api/suppliers?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSuppliers(data.suppliers);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error('Error al cargar proveedores');
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplier: any) => {
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Proveedor eliminado correctamente');
        fetchSuppliers();
        setDeleteSupplier(null);
      } else {
        toast.error(data.error || 'Error al eliminar proveedor');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Error al eliminar proveedor');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CIF, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>CIF/NIF</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Facturas</TableHead>
              <TableHead>Gastos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No se encontraron proveedores
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.tradeName && (
                        <div className="text-sm text-muted-foreground">
                          {supplier.tradeName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.vat}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.contactPerson && (
                        <div className="text-sm">{supplier.contactPerson}</div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {supplier.email && (
                          <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-primary">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{supplier.email}</span>
                          </a>
                        )}
                        {supplier.phone && (
                          <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{supplier._count.purchaseInvoices}</div>
                      <div className="text-xs text-muted-foreground">facturas</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{supplier._count.expenses}</div>
                      <div className="text-xs text-muted-foreground">gastos</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={supplier.isActive ? 'default' : 'secondary'}
                      className={cn(
                        supplier.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {supplier.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(supplier)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteSupplier(supplier)}
                          className="text-red-600"
                          disabled={supplier._count.purchaseInvoices > 0 || supplier._count.expenses > 0}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <div className="text-sm">
            Página {page} de {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el proveedor <strong>{deleteSupplier?.name}</strong>?
              {deleteSupplier?.isClient && (
                <span className="block mt-2 text-blue-600">
                  Esta empresa también es cliente. Solo se eliminará como proveedor.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteSupplier)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
