'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importar si se necesitan acciones directas
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { BonoDefinitionWithRelations } from '@/app/(main)/configuracion/bonos/page'; // Usar el tipo extendido

// Definir los tipos para ordenación
type SortField = keyof BonoDefinitionWithRelations | 'associatedTo'; // Añadir 'associatedTo' para servicio/producto
type SortDirection = 'asc' | 'desc';

interface BonoDefinitionListProps {
  bonos: BonoDefinitionWithRelations[]; // Recibe los datos como prop
  // Opcional: Callbacks para acciones si no se manejan con server actions/API routes directamente
  // onDelete?: (id: string) => Promise<void>; 
  // onToggleStatus?: (id: string) => Promise<void>;
}

export function BonoDefinitionList({ bonos: initialBonos }: BonoDefinitionListProps) {
  const [bonos, setBonos] = useState<BonoDefinitionWithRelations[]>(initialBonos); // Estado local para interactividad si es necesario
  const [showInactive, setShowInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // ID del bono que se está eliminando
  
  const router = useRouter();
  const { toast } = useToast();

  // Lógica de filtrado y ordenación
  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUpDown className="ml-2 h-4 w-4" /> // Podrías usar ArrowUp si prefieres
      : <ArrowUpDown className="ml-2 h-4 w-4" />; // Podrías usar ArrowDown si prefieres
  };

  const sortedAndFilteredBonos = () => {
    let filtered = showInactive ? bonos : bonos.filter(bono => bono.isActive);
    
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      const valueA = (sortField === 'associatedTo') 
                      ? (a.service?.name || a.product?.name || '') 
                      : a[sortField as keyof BonoDefinitionWithRelations];
      const valueB = (sortField === 'associatedTo') 
                      ? (b.service?.name || b.product?.name || '')
                      : b[sortField as keyof BonoDefinitionWithRelations];

      if (valueA === null || valueA === undefined) comparison = -1;
      else if (valueB === null || valueB === undefined) comparison = 1;
      else if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        comparison = (valueA === valueB) ? 0 : (valueA ? 1 : -1);
      } else {
        comparison = String(valueA).localeCompare(String(valueB));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const displayedBonos = sortedAndFilteredBonos();

  // Acción de Editar (Navegación)
  const handleEdit = (id: string) => {
    router.push(`/configuracion/bonos/${id}`);
  };

  // Acción de Eliminar (con confirmación)
  const handleDelete = async (id: string) => {
      setIsDeleting(id);
      try {
          const response = await fetch(`/api/bono-definitions/${id}`, {
              method: 'DELETE',
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Error ${response.status} al eliminar`);
          }

          // Actualizar estado local para reflejar la eliminación
          setBonos(prev => prev.filter(b => b.id !== id));

          toast({
              title: "Bono eliminado",
              description: "La definición del bono se ha eliminado correctamente.",
              variant: "default",
          });

      } catch (error: any) {
          console.error("Error al eliminar bono:", error);
          toast({
              title: "Error al eliminar",
              description: error.message || "No se pudo eliminar la definición del bono.",
              variant: "destructive",
          });
      } finally {
          setIsDeleting(null); // Resetear estado de eliminación
      }
  };


  // Acción de Cambiar Estado (Placeholder - requiere API endpoint)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
     toast({ title: "Pendiente", description: "API para cambiar estado no implementada." });
     // TODO: Implementar llamada a API PUT /api/bono-definitions/[id] con { isActive: !currentStatus }
     // y actualizar el estado local 'setBonos' si la llamada es exitosa.
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="showInactiveBonoDefs" 
          checked={showInactive} 
          onCheckedChange={(checked) => setShowInactive(Boolean(checked))}
        />
        <label htmlFor="showInactiveBonoDefs" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Mostrar bonos inactivos
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                <div className="flex items-center">Nombre {getSortIcon('name')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('associatedTo')} className="cursor-pointer">
                 <div className="flex items-center">Asociado a {getSortIcon('associatedTo')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('quantity')} className="cursor-pointer text-center">
                 <div className="flex items-center justify-center">Cantidad {getSortIcon('quantity')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('price')} className="cursor-pointer text-right">
                 <div className="flex items-center justify-end">Precio {getSortIcon('price')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('validityDays')} className="cursor-pointer text-center">
                 <div className="flex items-center justify-center">Validez (días) {getSortIcon('validityDays')}</div>
              </TableHead>
              <TableHead onClick={() => handleSort('isActive')} className="cursor-pointer text-center">
                 <div className="flex items-center justify-center">Estado {getSortIcon('isActive')}</div>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedBonos.length > 0 ? (
              displayedBonos.map((bono) => (
                <TableRow key={bono.id}>
                  <TableCell className="font-medium">{bono.name}</TableCell>
                  <TableCell>{bono.service?.name || bono.product?.name || 'N/A'}</TableCell>
                  <TableCell className="text-center">{bono.quantity}</TableCell>
                  <TableCell className="text-right">{bono.price?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                  <TableCell className="text-center">{bono.validityDays ?? 'Indef.'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={bono.isActive ? 'default' : 'outline'}>
                      {bono.isActive ? 'Activo' : 'Inactivo'}
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
                           <DropdownMenuItem onClick={() => handleEdit(bono.id)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                           </DropdownMenuItem>
                           {/* <DropdownMenuItem onClick={() => handleToggleStatus(bono.id, bono.isActive)}>
                               {bono.isActive ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                               {bono.isActive ? 'Desactivar' : 'Activar'}
                           </DropdownMenuItem> */}
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()} // Evitar que el menú se cierre
                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente la definición del bono "{bono.name}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => handleDelete(bono.id)} 
                                            disabled={isDeleting === bono.id}
                                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                        >
                                            {isDeleting === bono.id ? 'Eliminando...' : 'Sí, eliminar'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron definiciones de bonos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default BonoDefinitionList; 