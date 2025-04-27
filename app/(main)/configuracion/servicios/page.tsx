"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit3, Trash2, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle, XCircle, SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PaginationControls } from '@/components/pagination-controls';
import { Service, Category, VATType } from '@prisma/client'; // Importar tipos
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Interfaz ajustada a los campos reales de Service + campos enriquecidos
interface ServiceRow extends Service { // Hereda campos reales: name, code, categoryId, vatTypeId, durationMinutes, price, isActive, etc.
    categoryName?: string;
    vatTypeName?: string;
    vatRate?: number;
}

const ITEMS_PER_PAGE = 15;

export default function GestionServiciosPage() {
    const router = useRouter();
    const [services, setServices] = useState<ServiceRow[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para filtros y paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ServiceRow; direction: 'ascending' | 'descending' } | null>(null);

    // Estado para modal de eliminación
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Carga inicial de datos
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [servicesRes, categoriesRes, vatTypesRes] = await Promise.all([
                fetch('/api/services'),
                fetch('/api/categories'),
                fetch('/api/vat-types'),
            ]);

            if (!servicesRes.ok) throw new Error('Error al cargar servicios');
            if (!categoriesRes.ok) throw new Error('Error al cargar categorías');
            if (!vatTypesRes.ok) throw new Error('Error al cargar tipos de IVA');

            const servicesData: Service[] = await servicesRes.json();
            const categoriesData: Category[] = await categoriesRes.json();
            const vatTypesData: VATType[] = await vatTypesRes.json();

            setCategories(categoriesData);
            setVatTypes(vatTypesData);

            // Enriquecer servicios (usando campos correctos de Service)
            const enrichedServices: ServiceRow[] = servicesData.map(service => {
                const category = categoriesData.find(c => c.id === service.categoryId);
                const vatType = vatTypesData.find(v => v.id === service.vatTypeId); // <-- Usar service.vatTypeId
                return {
                    ...service, // Incluye name, code, durationMinutes, price, isActive, etc.
                    categoryName: category?.name,
                    vatTypeName: vatType?.name,
                    vatRate: vatType?.rate,
                };
            });

            setServices(enrichedServices);

        } catch (err: any) {
            console.error("Error cargando datos:", err);
            setError(err.message || 'Error desconocido');
            toast.error("Error al cargar datos: " + (err.message || 'Error desconocido'));
        } finally {
            setIsLoading(false);
        }
    }, []);

  useEffect(() => {
        loadData();
    }, [loadData]);

    // Lógica de filtrado, ordenación y paginación
    const filteredAndSortedServices = useMemo(() => {
        let filtered = services;

        // Filtrar por término de búsqueda (nombre o código)
        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.code.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrar por categoría
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(s => s.categoryId === categoryFilter);
        }

        // Filtrar por estado
        if (statusFilter !== 'all') {
            filtered = filtered.filter(s => statusFilter === 'active' ? s.isActive : !s.isActive);
        }

        // Ordenar (usando claves de ServiceRow / Service)
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const key = sortConfig.key;
                let valA = a[key]; // Accede a campos como name, code, categoryName, price, vatTypeName, durationMinutes, isActive
                let valB = b[key];
                
                // Normalizar valores para comparar (tratar null/undefined como string vacío o 0)
                 if (valA === null || valA === undefined) valA = typeof valB === 'number' ? 0 : '';
                 if (valB === null || valB === undefined) valB = typeof valA === 'number' ? 0 : '';

                 let comparison = 0;
                 if (typeof valA === 'number' && typeof valB === 'number') {
                     comparison = valA - valB;
                 } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
                     comparison = valA === valB ? 0 : (valA ? 1 : -1);
                 } else {
                     comparison = String(valA).localeCompare(String(valB));
                 }
                
                 return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
            });
        }

        return filtered;
    }, [services, searchTerm, categoryFilter, statusFilter, sortConfig]);

    const totalPages = Math.ceil(filteredAndSortedServices.length / ITEMS_PER_PAGE);
    const paginatedServices = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSortedServices, currentPage]);

    // Handlers para ordenación (claves deben ser de ServiceRow / Service)
    const requestSort = (key: keyof ServiceRow) => { // Claves válidas: name, code, categoryName, price, vatTypeName, durationMinutes, isActive etc.
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const getSortIcon = (key: keyof ServiceRow) => { // Clave válida
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="ml-1 h-3 w-3" />;
        }
        return sortConfig.direction === 'ascending' ? (
            <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
            <ChevronDown className="ml-1 h-3 w-3" />
        );
    };

    // Handlers para acciones
    const handleNewService = () => {
        router.push('/configuracion/servicios/nuevo');
    };

    const handleEditService = (id: string) => {
        router.push(`/configuracion/servicios/${id}`);
    };

    const handleDeleteClick = (service: ServiceRow) => {
        setServiceToDelete(service);
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/services/${serviceToDelete.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al eliminar el servicio');
            }
            toast.success(`Servicio "${serviceToDelete.name}" eliminado correctamente.`);
            setServiceToDelete(null);
            await loadData(); // Recargar datos
        } catch (err: any) {
            console.error("Error eliminando servicio:", err);
            toast.error(`Error al eliminar: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Renderizado
    if (error && !isLoading) {
        return <div className="p-6 text-center text-red-600">Error al cargar los datos: {error}</div>;
    }

  return (
        <div className="flex flex-col h-full p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-6">Gestión Global de Servicios</h1>

            {/* Card de Filtros y Acciones */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Filtros y Acciones</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Filtro Búsqueda */}
      <div className="relative">
                        <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
                            type="search"
                            placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full"
        />
      </div>

                    {/* Filtro Categoría */}
                    <div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Familia..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Familias</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                      
                    {/* Filtro Estado */}
                    <div>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Estado..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Estados</SelectItem>
                                <SelectItem value="active">Activos</SelectItem>
                                <SelectItem value="inactive">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
      </div>

                    {/* Botón Nuevo Servicio */}
                    <div className="lg:col-start-4 flex justify-end">
                        <Button onClick={handleNewService}>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Servicios */}
            <div className="flex-grow overflow-auto border rounded-lg shadow-sm">
                 {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <div className="inline-block w-8 h-8 border-4 border-purple-600 rounded-full animate-spin border-t-transparent mb-2"></div>
                            <p>Cargando servicios...</p>
                        </div>
                  </div>
                ) : ( 
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('name')}>
                                    <div className="flex items-center">Nombre {getSortIcon('name')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('code')}>
                                    <div className="flex items-center">Código {getSortIcon('code')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('categoryName')}>
                                    <div className="flex items-center">Familia {getSortIcon('categoryName')}</div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer" onClick={() => requestSort('price')}>
                                    <div className="flex items-center justify-end">Precio Base {getSortIcon('price')}</div>
                                </TableHead>
                                 <TableHead className="cursor-pointer" onClick={() => requestSort('vatTypeName')}>
                                    <div className="flex items-center">IVA Defecto {getSortIcon('vatTypeName')}</div>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer" onClick={() => requestSort('durationMinutes')}>
                                    <div className="flex items-center justify-center">Duración {getSortIcon('durationMinutes')}</div>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer" onClick={() => requestSort('isActive')}>
                                    <div className="flex items-center justify-center">Activo {getSortIcon('isActive')}</div>
                                </TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedServices.length > 0 ? (
                                paginatedServices.map((service) => (
                                    <TableRow key={service.id} className={`${!service.isActive ? 'opacity-60' : ''}`}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell>{service.code || '-'}</TableCell>
                                        <TableCell>{service.categoryName || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {service.price !== null ? `${service.price.toFixed(2)} €` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {service.vatTypeName ? `${service.vatTypeName} (${service.vatRate ?? 'N/A'}%)` : (service.vatTypeId ? '(' + service.vatTypeId.substring(0,4) + '...)' : 'Sin IVA')}
                                        </TableCell>
                                         <TableCell className="text-center">{service.durationMinutes} min</TableCell>
                                         <TableCell className="text-center">
                                            {service.isActive ? 
                                                <CheckCircle className="h-4 w-4 text-green-600 mx-auto" /> : 
                                                <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditService(service.id)} className="h-8 w-8 mr-1">
                                                <Edit3 size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(service)} className="h-8 w-8 text-red-600 hover:text-red-700">
                                                <Trash2 size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No se encontraron servicios con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
              )}
            </div>

            {/* Controles de Paginación */}
            {!isLoading && filteredAndSortedServices.length > ITEMS_PER_PAGE && (
                <div className="mt-4">
                     <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            <Dialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Eliminación</DialogTitle>
                        <DialogDescription className="pt-2">
                            ¿Estás seguro de que quieres eliminar el servicio "<span className="font-semibold">{serviceToDelete?.name}</span>"?
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setServiceToDelete(null)} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    );
}

