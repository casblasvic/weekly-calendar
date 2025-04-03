'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bono } from '@/services/data/models/interfaces';
import { useDataService } from '@/contexts/data-context';
import { Eye, Pencil, Trash2, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BonoListProps {
  servicioId: string;
  tarifaId?: string;
}

type SortField = 'nombre' | 'credito' | 'precioConIVA' | 'caducidad' | 'estado';
type SortDirection = 'asc' | 'desc' | 'none';

export function BonoList({ servicioId, tarifaId }: BonoListProps) {
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeshabilitados, setShowDeshabilitados] = useState(false);
  const [sortField, setSortField] = useState<SortField>('nombre');
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

  const handleDelete = async (id: string | number) => {
    try {
      await dataService.deleteBono(id.toString());
      setBonos((prev) => prev.filter((bono) => bono.id !== id));
      toast({
        title: 'Bono eliminado',
        description: 'El bono ha sido eliminado correctamente',
      });
    } catch (error) {
      console.error('Error al eliminar el bono:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el bono',
      });
    }
  };

  const handleToggleStatus = async (id: string | number) => {
    try {
      await dataService.toggleBonoStatus(id.toString());
      setBonos((prev) =>
        prev.map((bono) =>
          bono.id === id ? { ...bono, deshabilitado: !bono.deshabilitado } : bono
        )
      );
      toast({
        title: 'Estado actualizado',
        description: 'El estado del bono ha sido actualizado',
      });
    } catch (error) {
      console.error('Error al cambiar el estado del bono:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado del bono',
      });
    }
  };

  const handleEdit = (id: string | number) => {
    if (tarifaId) {
      router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos/${id}`);
    } else {
      router.push(`/servicios/${servicioId}/bonos/${id}`);
    }
  };

  const handleView = (id: string | number) => {
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
      // Cambiar dirección de ordenación si el campo es el mismo
      setSortDirection(
        sortDirection === 'asc' ? 'desc' : 
        sortDirection === 'desc' ? 'none' : 'asc'
      );
    } else {
      // Establecer nuevo campo de ordenación
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
  
  // Filtrar y ordenar los bonos
  const sortedAndFilteredBonos = () => {
    // Primero filtrar
    const filtered = showDeshabilitados 
      ? bonos 
      : bonos.filter(bono => !bono.deshabilitado);
    
    // Si no hay dirección de ordenación o es 'none', devolver sin ordenar
    if (sortDirection === 'none') return filtered;
    
    // Ordenar según el campo y dirección
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'nombre':
          comparison = a.nombre.localeCompare(b.nombre);
          break;
        case 'credito':
          comparison = a.credito - b.credito;
          break;
        case 'precioConIVA':
          const priceA = typeof a.precioConIVA === 'string' ? parseFloat(a.precioConIVA) : a.precioConIVA;
          const priceB = typeof b.precioConIVA === 'string' ? parseFloat(b.precioConIVA) : b.precioConIVA;
          comparison = priceA - priceB;
          break;
        case 'caducidad':
          const cadA = a.caducidad.tipo === 'intervalo' 
            ? `${a.caducidad.intervalo?.valor || 0}`
            : a.caducidad.fechaFija || '';
          const cadB = b.caducidad.tipo === 'intervalo'
            ? `${b.caducidad.intervalo?.valor || 0}`
            : b.caducidad.fechaFija || '';
          comparison = cadA.localeCompare(cadB);
          break;
        case 'estado':
          comparison = (a.deshabilitado ? 1 : 0) - (b.deshabilitado ? 1 : 0);
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
                  onClick={() => handleSort('nombre')}
                >
                  <div className="flex items-center">
                    Bono
                    {getSortIcon('nombre')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('credito')}
                >
                  <div className="flex items-center justify-center">
                    Crédito
                    {getSortIcon('credito')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('precioConIVA')}
                >
                  <div className="flex items-center justify-center">
                    Precio
                    {getSortIcon('precioConIVA')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('caducidad')}
                >
                  <div className="flex items-center justify-center">
                    Caducidad
                    {getSortIcon('caducidad')}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[100px] text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('estado')}
                >
                  <div className="flex items-center justify-center">
                    Estado
                    {getSortIcon('estado')}
                  </div>
                </TableHead>
                <TableHead className="w-[150px] text-center">Acciones</TableHead>
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
                    <TableCell className="font-medium">{bono.nombre}</TableCell>
                    <TableCell className="text-center">{bono.credito}</TableCell>
                    <TableCell className="text-center">{bono.precioConIVA}</TableCell>
                    <TableCell className="text-center">
                      {bono.caducidad.tipo === 'intervalo' 
                        ? `${bono.caducidad.intervalo?.valor || 0} ${bono.caducidad.intervalo?.tipo || 'meses'}`
                        : bono.caducidad.fechaFija
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bono.deshabilitado ? 'outline' : 'default'} className="whitespace-nowrap">
                        {bono.deshabilitado ? 'Inactivo' : 'Activo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleView(bono.id)} 
                          title="Ver bono"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(bono.id)} 
                          title="Editar bono"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(bono.id)} 
                          title="Eliminar bono"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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