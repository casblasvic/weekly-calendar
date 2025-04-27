"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, ArrowUpDown, ChevronUp, ChevronDown, HelpCircle, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Service, Product, ServiceConsumption } from "@prisma/client"
import { HelpButton } from "@/components/ui/help-button"

// Interfaz extendida para la tabla
interface ConsumptionRow extends ServiceConsumption {
  productName: string;
}

// Interfaz para el estado del formulario del modal
interface ConsumptionFormData {
  id?: string; // Solo en edición
  productId: string;
  quantity: number | string; // Permitir string temporalmente
  order: number;
  // notes?: string | null; // Añadir si se restaura en API
}

export default function ConsumosServicioPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string; // Asumimos que id es serviceId aquí

  // Estados
  const [serviceName, setServiceName] = useState<string>("Servicio");
  const [consumptions, setConsumptions] = useState<ConsumptionRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<Partial<ConsumptionFormData>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Estado para guardado
  const [sortConfig, setSortConfig] = useState<{ key: keyof ConsumptionRow; direction: 'ascending' | 'descending' } | null>({ key: 'order', direction: 'ascending' });

  // Cargar datos iniciales (servicio, consumos, productos)
  const loadData = useCallback(async () => {
    if (!serviceId) {
      setError("ID de servicio no válido.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [serviceRes, consumptionsRes, productsRes] = await Promise.all([
        fetch(`/api/services/${serviceId}`),
        fetch(`/api/services/${serviceId}/consumptions`), // Nueva API GET
        fetch(`/api/products`) // API GET de productos globales
      ]);

      if (!serviceRes.ok) throw new Error(`Error ${serviceRes.status} al cargar el servicio.`);
      if (!consumptionsRes.ok) throw new Error(`Error ${consumptionsRes.status} al cargar los consumos.`);
      if (!productsRes.ok) throw new Error(`Error ${productsRes.status} al cargar los productos.`);

      const serviceData: Service = await serviceRes.json();
      const consumptionsData: (ServiceConsumption & { product: Product })[] = await consumptionsRes.json(); // Asumir que API incluye producto
      const productsData: Product[] = await productsRes.json();

      setServiceName(serviceData.name || "Servicio");
      setProducts(productsData);
      
      // Mapear consumos para la tabla
      const consumptionRows: ConsumptionRow[] = consumptionsData.map(c => ({
        ...c,
        productName: c.product?.name || "Producto desconocido",
      }));
      setConsumptions(consumptionRows);

    } catch (err: any) {
      console.error("Error cargando datos para consumos:", err);
      setError(err.message);
      toast.error("Error al cargar datos: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Lógica de Ordenación ---
  const sortedConsumptions = useMemo(() => {
    const sortableItems = [...consumptions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        // Manejo seguro de tipos y nulos
        let valA = a[key] ?? (typeof b[key] === 'number' ? 0 : '');
        let valB = b[key] ?? (typeof a[key] === 'number' ? 0 : '');
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
           return valA.localeCompare(valB) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [consumptions, sortConfig]);

  const requestSort = (key: keyof ConsumptionRow) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ConsumptionRow) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} />;
    return sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // --- Handlers CRUD y Modal ---
  const handleVolver = () => {
    router.push(`/configuracion/servicios/${serviceId}`); // Volver a la edición del servicio global
  }

  const handleNuevoConsumo = () => {
    setIsEditing(false);
    // Calcular el siguiente orden
    const nextOrder = consumptions.length > 0 ? Math.max(...consumptions.map(c => c.order)) + 1 : 1;
    setCurrentFormData({ productId: '', quantity: 1, order: nextOrder });
    setIsDialogOpen(true);
  }

  const handleEditarConsumo = (consumo: ConsumptionRow) => {
    setIsEditing(true);
    setCurrentFormData({ 
        id: consumo.id, 
        productId: consumo.productId, 
        quantity: consumo.quantity, 
        order: consumo.order 
    });
    setIsDialogOpen(true);
  }

  const handleGuardarConsumo = async () => {
    if (!currentFormData.productId || !currentFormData.quantity) {
        toast.error("Por favor, selecciona un producto y especifica una cantidad.");
        return;
    }

    setIsSaving(true);
    const url = isEditing 
        ? `/api/consumptions/${currentFormData.id}` // Necesita API PUT /api/consumptions/[id]
        : `/api/services/${serviceId}/consumptions`;
    const method = isEditing ? 'PUT' : 'POST';

    const dataToSend = {
        productId: currentFormData.productId,
        quantity: Number(currentFormData.quantity),
        order: Number(currentFormData.order),
        // notes: currentFormData.notes // Añadir si se restaura
    };

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status} al guardar el consumo`);
        }

        toast.success(`Consumo ${isEditing ? 'actualizado' : 'añadido'} correctamente.`);
        setIsDialogOpen(false);
        await loadData(); // Recargar datos de la tabla

    } catch (err: any) {
        console.error("Error guardando consumo:", err);
        toast.error(`Error al guardar: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  }

  const handleEliminarConsumo = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este consumo?")) return;
    
    setIsSaving(true); // Podríamos usar un estado deleting específico si se prefiere
    try {
        const response = await fetch(`/api/consumptions/${id}`, { // Necesita API DELETE /api/consumptions/[id]
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al eliminar el consumo');
        }
        toast.success("Consumo eliminado correctamente.");
        await loadData(); // Recargar
    } catch (err: any) {
        console.error("Error eliminando consumo:", err);
        toast.error(`Error al eliminar: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  }

  // TODO: Implementar handleMoverArriba/Abajo llamando a una API de reordenación
  const handleMoverArriba = (id: string) => { toast.info("Reordenar pendiente de API"); }
  const handleMoverAbajo = (id: string) => { toast.info("Reordenar pendiente de API"); }

  // --- Renderizado ---
  if (isLoading) {
    return <div className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" /><p>Cargando consumos...</p></div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 pb-24 relative min-h-screen">
      <h1 className="text-xl font-semibold mb-2">Control de Consumo</h1>
      <div className="flex items-center mb-6">
        <p className="text-gray-500 mr-2">Servicio:</p>
        <span className="text-purple-700 font-medium">{serviceName}</span>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          {/* ... (Tabla similar a la original, usando sortedConsumptions) ... */}
           <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 cursor-pointer" onClick={() => requestSort('order')}>
                     <div className="flex items-center">Orden {getSortIcon('order')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('productName')}>
                     <div className="flex items-center">Producto {getSortIcon('productName')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => requestSort('quantity')}>
                     <div className="flex items-center justify-end">Cantidad {getSortIcon('quantity')}</div>
                  </TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedConsumptions.map((consumo, index) => (
                  <TableRow key={consumo.id} className="hover:bg-purple-50/50">
                    <TableCell className="font-medium">{consumo.order}</TableCell>
                    <TableCell>{consumo.productName}</TableCell>
                    <TableCell className="text-right">{consumo.quantity}</TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                         <Button variant="ghost" size="icon" onClick={() => handleMoverArriba(consumo.id)} disabled={index === 0} className="h-8 w-8 text-gray-600 hover:text-purple-600">
                           <ArrowUp className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleMoverAbajo(consumo.id)} disabled={index === sortedConsumptions.length - 1} className="h-8 w-8 text-gray-600 hover:text-purple-600">
                           <ArrowDown className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleEditarConsumo(consumo)} className="h-8 w-8 text-purple-600 hover:text-purple-900">
                           <Pencil className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleEliminarConsumo(consumo.id)} className="h-8 w-8 text-red-600 hover:text-red-900">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedConsumptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                      No hay consumos configurados para este servicio.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Botones fijos */}
      <div className="fixed bottom-0 right-0 p-6 flex justify-end gap-3">
        <Button variant="outline" className="bg-white border border-gray-300" onClick={handleVolver}>
          Volver
        </Button>
        <Button variant="default" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleNuevoConsumo}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Consumo
        </Button>
        <HelpButton content="Configura los productos que se consumen automáticamente al realizar este servicio." />
      </div>
      
      {/* Modal añadir/editar (simplificado, sin alternativas) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Consumo" : "Añadir Consumo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
              <Select
                value={currentFormData.productId}
                onValueChange={(value) => setCurrentFormData({...currentFormData, productId: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(producto => (
                    <SelectItem key={producto.id} value={producto.id}>
                      {producto.name} {producto.sku ? `(${producto.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
              <Input
                type="number"
                min="0" // Permitir 0?
                step="any" // Permitir decimales si es necesario
                value={currentFormData.quantity || ""}
                onChange={(e) => setCurrentFormData({...currentFormData, quantity: e.target.value})}
                className="w-full"
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
               <Input
                type="number"
                min="1"
                step="1"
                value={currentFormData.order || ""}
                onChange={(e) => setCurrentFormData({...currentFormData, order: Number(e.target.value)})}
                className="w-full"
              />
            </div>
             {/* Input para Notas si se restaura en API */}
             {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
               <Input ... />
             </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleGuardarConsumo} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 