'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BonoDefinition } from '@prisma/client';
import { useDataService } from '@/contexts/data-context';
import { Eye, Pencil, Trash2, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BonoListProps {
  servicioId: string;
  tarifaId?: string;
}

type SortField = 'name' | 'sessions' | 'price' | 'validityDays' | 'isActive';
type SortDirection = 'asc' | 'desc' | 'none';

export function BonoList({ servicioId, tarifaId }: BonoListProps) {
  const [bonos, setBonos] = useState<BonoDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeshabilitados, setShowDeshabilitados] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const dataService = useDataService();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchBonos = async () => {
      try {
        setLoading(true);
        const bonosList = await dataService.getBonosByServicioId(servicioId);
        setBonos(bonosList);
      } catch (error) {
        console.error('Error al cargar los bonos:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los bonos',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBonos();
  }, [dataService, servicioId, toast]);

  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteBono(id);
      setBonos((prev) => prev.filter((bono) => bono.id !== id));
      toast({
        title: 'Bono eliminado',
        description: 'La definición del bono ha sido eliminada correctamente',
      });
    } catch (error) {
      console.error('Error al eliminar la definición del bono:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la definición del bono',
      });
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await dataService.toggleBonoStatus(id);
      setBonos((prev) =>
        prev.map((bono) =>
          bono.id === id ? { ...bono, isActive: !bono.isActive } : bono
        )
      );
      toast({
        title: 'Estado actualizado',
        description: 'El estado de la definición del bono ha sido actualizado',
      });
    } catch (error) {
      console.error('Error al cambiar el estado de la definición del bono:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado de la definición del bono',
      });
    }
  };

  const handleEdit = (id: string) => {
    if (tarifaId) {
      router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos/${id}`);
    } else {
      router.push(`/servicios/${servicioId}/bonos/${id}`);
    }
  };

  const handleView = (id: string) => {
    if (tarifaId) {
      router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos/${id}/view`);
    } else {
      router.push(`/servicios/${servicioId}/bonos/${id}/view`);
    }
  };

  const handleNewBono = () => {
    if (tarifaId) {
      router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos/nuevo`);
    } else {
      router.push(`/servicios/${servicioId}/bonos/nuevo`);
    }
  };
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(
        sortDirection === 'asc' ? 'desc' : 
        sortDirection === 'desc' ? 'none' : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />;
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  };
  
  const sortedAndFilteredBonos = () => {
    const filtered = showDeshabilitados 
      ? bonos 
      : bonos.filter(bono => bono.isActive);
    
    if (sortDirection === 'none') return filtered;
    
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'sessions':
          comparison = a.sessions - b.sessions;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'validityDays':
          const daysA = a.validityDays ?? Infinity;
          const daysB = b.validityDays ?? Infinity;
          comparison = daysA - daysB;
          break;
        case 'isActive':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const displayedBonos = sortedAndFilteredBonos();

  return (
    <div className="space-y-4">
      {!tarifaId && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Listado de bonos</h2>
          <Button onClick={handleNewBono} className="bg-indigo-600 hover:bg-indigo-800">
            Nuevo bono
          </Button>
        </div>
      )}
      
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox 
          id="showDisabled" 
          checked={showDeshabilitados} 
          onCheckedChange={() => setShowDeshabilitados(!showDeshabilitados)}
        />
        <label htmlFor="showDisabled" className="text-sm cursor-pointer">
          Ver bonos deshabilitados
        </label>
      </div>

      {loading ? (
        <div className="text-center py-8 bg-white rounded-md shadow">
          <div className="animate-pulse">
            <div className="h-6 w-24 bg-gray-200 rounded mx-auto"></div>
            <div className="mt-2 h-4 w-32 bg-gray-200 rounded mx-auto"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500">Cargando bonos...</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Bono
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('sessions')}
                >
                  <div className="flex items-center justify-center">
                    Sesiones
                    {getSortIcon('sessions')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-center">
                    Precio
                    {getSortIcon('price')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('validityDays')}
                >
                  <div className="flex items-center justify-center">
                    Validez
                    {getSortIcon('validityDays')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('isActive')}
                >
                  <div className="flex items-center justify-center">
                    Estado
                    {getSortIcon('isActive')}
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedBonos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No hay bonos disponibles
                  </TableCell>
                </TableRow>
              ) : (
                displayedBonos.map((bono) => (
                  <TableRow key={bono.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{bono.name}</TableCell>
                    <TableCell className="text-center">{bono.sessions}</TableCell>
                    <TableCell className="text-center">{bono.price.toFixed(2)} €</TableCell>
                    <TableCell className="text-center">
                      {bono.validityDays ? `${bono.validityDays} días` : 'Sin caducidad'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bono.isActive ? 'default' : 'outline'}>
                        {bono.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleView(bono.id)} 
                          className="h-7 w-7 text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(bono.id)} 
                          className="h-7 w-7 text-gray-600 hover:text-gray-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggleStatus(bono.id)} 
                          className={`h-7 w-7 ${bono.isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                          title={bono.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {bono.isActive ? <Trash2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default BonoList; 