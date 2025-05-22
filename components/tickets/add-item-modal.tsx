"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Gift, ShoppingBag, Clipboard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { MagicCard } from '@/components/ui/magic-card';
import { BorderBeam } from '@/components/ui/border-beam';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PlusCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { type TicketItemFormValues } from '@/lib/schemas/ticket';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useServicesQuery, useProductsQuery, usePackagesQuery, useBonosQuery } from '@/lib/hooks/use-api-query';

// Tipo de datos para ítems seleccionables
type ItemType = 'SERVICE' | 'PRODUCT' | 'BONO_DEFINITION' | 'PACKAGE_DEFINITION';

// Interfaz para cualquier ítem seleccionable (servicio, producto, etc.)
interface SelectableItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  vatTypeId?: string;
  vatType?: {
    id: string;
    rate: number;
  };
  settings?: {
    isActive?: boolean;
    [key: string]: any;
  };
  category?: {
    name: string;
  };
  [key: string]: any; // Para otras propiedades específicas
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: TicketItemFormValues) => void;
}

export function AddItemModal({ isOpen, onClose, onAddItem }: AddItemModalProps) {
  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<string>('services');
  
  // Estados para cada tipo de ítem
  const [services, setServices] = useState<SelectableItem[]>([]);
  const [products, setProducts] = useState<SelectableItem[]>([]);
  const [packages, setPackages] = useState<SelectableItem[]>([]);
  const [bonos, setBonos] = useState<SelectableItem[]>([]);
  
  // Estados de carga
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingBonos, setLoadingBonos] = useState(false);
  
  // Estado para el término de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para campos adicionales
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
  
  // Usar los hooks optimizados de TanStack Query con sus opciones predefinidas
  const {
    data: servicesData = [],
    isLoading: loadingServicesData,
    error: servicesError
  } = useServicesQuery();

  const {
    data: productsData = [],
    isLoading: loadingProductsData,
    error: productsError
  } = useProductsQuery();

  const {
    data: packagesData = [],
    isLoading: loadingPackagesData,
    error: packagesError
  } = usePackagesQuery();

  const {
    data: bonosData = [],
    isLoading: loadingBonosData,
    error: bonosError
  } = useBonosQuery();
  
  // Actualizar los estados locales cuando los datos de las consultas cambian
  useEffect(() => {
    if (servicesData && Array.isArray(servicesData) && servicesData.length > 0) {
      setServices(servicesData);
    }
  }, [servicesData]);
  
  useEffect(() => {
    if (productsData && Array.isArray(productsData) && productsData.length > 0) {
      setProducts(productsData);
    }
  }, [productsData]);
  
  useEffect(() => {
    // Añadir diagnóstico para entender mejor los datos recibidos
    console.log('Datos de packagesData recibidos:', packagesData);
    console.log('¿Es un array?', Array.isArray(packagesData));
    console.log('Tipo:', typeof packagesData);
    
    // Verificar si packagesData existe, tiene datos, y ya ha sido transformado a array por usePackagesQuery
    if (packagesData && Array.isArray(packagesData) && packagesData.length > 0) {
      setPackages(packagesData);
      console.log('✅ Paquetes actualizados desde TanStack Query:', packagesData.length);
    }
  }, [packagesData]);
  
  useEffect(() => {
    if (bonosData && Array.isArray(bonosData) && bonosData.length > 0) {
      setBonos(bonosData);
    }
  }, [bonosData]);
  
  // Cargar datos al abrir el modal o cambiar de pestaña
  useEffect(() => {
    if (isOpen) {
      // Si los datos ya están cargados por TanStack Query, no necesitamos usar axios
      // Solo cargar manualmente si no hay datos en las consultas
      if (activeTab === 'services' && services.length === 0 && !loadingServicesData && !servicesData?.length) {
        loadServices();
      } else if (activeTab === 'products' && products.length === 0 && !loadingProductsData && !productsData?.length) {
        loadProducts();
      } else if (activeTab === 'packages' && packages.length === 0 && !loadingPackagesData && !packagesData?.length) {
        loadPackages();
      } else if (activeTab === 'bonos' && bonos.length === 0 && !loadingBonosData && !bonosData?.length) {
        loadBonos();
      }
    }
  }, [isOpen, activeTab, loadingServicesData, loadingProductsData, loadingPackagesData, loadingBonosData, servicesData, productsData, packagesData, bonosData, services.length, products.length, packages.length, bonos.length]);
  
  // Función para cargar servicios
  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const response = await axios.get('/api/services');
      setServices(response.data);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los servicios.',
        variant: 'destructive',
      });
    } finally {
      setLoadingServices(false);
    }
  };
  
  // Función para cargar productos
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos.',
        variant: 'destructive',
      });
    } finally {
      setLoadingProducts(false);
    }
  };
  
  // Función para cargar paquetes
  const loadPackages = async () => {
    try {
      setLoadingPackages(true);
      // API a implementar
      const response = await axios.get('/api/package-definitions');
      
      // Asegurarnos de manejar correctamente la estructura de respuesta
      if (response.data && response.data.packageDefinitions) {
        // La API devuelve { packageDefinitions: [...] }
        setPackages(response.data.packageDefinitions);
      } else if (Array.isArray(response.data)) {
        // La API devuelve directamente un array
        setPackages(response.data);
      } else {
        // En caso de un formato inesperado, usar un array vacío
        console.error("Formato de respuesta inesperado para paquetes:", response.data);
        setPackages([]);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los paquetes.',
        variant: 'destructive',
      });
      // Asegurarnos de inicializar como array vacío en caso de error
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };
  
  // Función para cargar bonos
  const loadBonos = async () => {
    try {
      setLoadingBonos(true);
      // API a implementar
      const response = await axios.get('/api/bono-definitions');
      setBonos(response.data);
    } catch (error) {
      console.error('Error loading bonos:', error);
      // En caso de error, usar datos de ejemplo
      setBonos([
        { 
          id: 'bono1', 
          name: 'Bono 5 Masajes Relajantes', 
          description: 'Válido por 90 días', 
          price: 200,
          category: { name: 'Masajes' }
        },
        { 
          id: 'bono2', 
          name: 'Bono 3 Limpiezas Faciales', 
          description: 'Válido por 120 días', 
          price: 135,
          category: { name: 'Facial' }
        }
      ]);
    } finally {
      setLoadingBonos(false);
    }
  };
  
  // Función para filtrar ítems por término de búsqueda
  const filterItems = (items: SelectableItem[]) => {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase().trim();
    return items.filter(item => 
      item.name.toLowerCase().includes(term) || 
      (item.description || '').toLowerCase().includes(term) ||
      (item.category?.name || '').toLowerCase().includes(term)
    );
  };
  
  // Obtener ítems según la pestaña activa y filtrar
  const getFilteredItems = () => {
    let items: SelectableItem[] = [];
    
    // Garantizar que items sea siempre un array
    switch (activeTab) {
      case 'services':
        items = Array.isArray(services) ? services : [];
        break;
      case 'products':
        items = Array.isArray(products) ? products : [];
        break;
      case 'packages':
        items = Array.isArray(packages) ? packages : [];
        console.log('Paquetes disponibles:', items); // Para diagnóstico
        break;
      case 'bonos':
        items = Array.isArray(bonos) ? bonos : [];
        break;
      default:
        items = [];
    }
    
    // Si aún estamos cargando con TanStack Query, devolver array vacío 
    // para evitar errores de renderizado
    if ((activeTab === 'services' && loadingServicesData) ||
        (activeTab === 'products' && loadingProductsData) ||
        (activeTab === 'packages' && loadingPackagesData) ||
        (activeTab === 'bonos' && loadingBonosData)) {
      return [];
    }
    
    // Filtrar solo si items es un array y no está vacío
    if (Array.isArray(items) && items.length > 0) {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        return items.filter(item => 
          (item.name || '').toLowerCase().includes(term) || 
          (item.description || '').toLowerCase().includes(term) ||
          ((item.category?.name || '')).toLowerCase().includes(term)
        );
      }
      return items;
    }
    
    // Si llegamos aquí, devolvemos un array vacío como fallback seguro
    return [];
  };
  
  // Mapear tipo de pestaña a tipo de ítem
  const getItemType = (): ItemType => {
    switch (activeTab) {
      case 'services':
        return 'SERVICE';
      case 'products':
        return 'PRODUCT';
      case 'packages':
        return 'PACKAGE_DEFINITION';
      case 'bonos':
        return 'BONO_DEFINITION';
      default:
        return 'SERVICE';
    }
  };
  
  // Función para manejar la selección de un ítem
  const handleItemSelect = (item: SelectableItem) => {
    setSelectedItem(item);
    setUnitPrice(item.price || 0);
  };
  
  // Función para añadir el ítem seleccionado al ticket
  const handleAddItem = () => {
    if (!selectedItem) {
      toast({
        title: 'Error',
        description: 'Por favor, seleccione un artículo para añadir.',
        variant: 'destructive',
      });
      return;
    }
    
    const finalUnitPrice = typeof unitPrice === 'number' ? unitPrice : selectedItem.price || 0;

    // Construir el objeto del ítem para el ticket
    const ticketItem: TicketItemFormValues = {
      itemId: selectedItem.id,
      type: getItemType(),
      concept: selectedItem.name,
      quantity: quantity,
      unitPrice: finalUnitPrice,
      originalUnitPrice: selectedItem.price || 0,
      
      vatRateId: selectedItem.vatType?.id,
      vatRate: selectedItem.vatType?.rate ?? 0,
      
      discountPercentage: 0,
      discountAmount: 0,
      manualDiscountPercentage: 0,
      manualDiscountAmount: 0,
      promotionDiscountAmount: 0,      
      finalPrice: finalUnitPrice * quantity,
      vatAmount: (finalUnitPrice * quantity * (selectedItem.vatType?.rate ?? 0)) / 100,
      appliedPromotionId: undefined,
      accumulatedDiscount: false,
      bonoInstanceId: undefined,
    };
    
    onAddItem(ticketItem);
    
    // Restablecer estados
    setSelectedItem(null);
    setQuantity(1);
    setUnitPrice(undefined);
    setSearchTerm('');
    
    // Cerrar el modal
    onClose();
  };
  
  // Renderizar los ítems disponibles
  const renderItems = () => {
    // Determinar si estamos cargando datos desde TanStack Query o desde axios
    const loading = 
      (activeTab === 'services' && (loadingServices || loadingServicesData)) ||
      (activeTab === 'products' && (loadingProducts || loadingProductsData)) ||
      (activeTab === 'packages' && (loadingPackages || loadingPackagesData)) ||
      (activeTab === 'bonos' && (loadingBonos || loadingBonosData));
    
    if (loading) {
      return (
        <div className="px-4 py-2 text-sm text-center text-gray-500">
          <LoadingSpinner size="sm" className="mx-auto my-1" />
          <span className="inline-block ml-2">Cargando...</span>
        </div>
      );
    }

    // Comprobar si hay errores en alguna de las consultas
    const error = servicesError || productsError || packagesError || bonosError;
    if (error) {
      return (
        <div className="py-4 text-center text-red-500">
          <p>Error al cargar datos</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Reintentar
          </Button>
        </div>
      );
    }

    // Obtener los items filtrados garantizando que sea un array
    const items = getFilteredItems();
    
    // Verificar si items es un array vacío
    if (!items || items.length === 0) {
      return (
        <div className="py-4 text-center text-gray-500">
          No se encontraron {activeTab === 'services' ? 'servicios' : 
            activeTab === 'products' ? 'productos' : 
            activeTab === 'packages' ? 'paquetes' : 'bonos'}
        </div>
      );
    }
    
    // Renderizar la lista de items
    return (
      <ul className="divide-y divide-gray-100">
        {items.map(item => (
          <li
            key={item.id}
            className={cn(
              "flex justify-between items-center py-2 px-3 text-sm hover:bg-gray-50 cursor-pointer",
              selectedItem?.id === item.id && "bg-blue-50 hover:bg-blue-50"
            )}
            onClick={() => handleItemSelect(item)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                {activeTab === 'services' && item.category && (
                  <span className="inline-block mr-2">{item.category.name}</span>
                )}
                {activeTab === 'products' && item.stock !== undefined && (
                  <span className="inline-block mr-2">Stock: {item.stock}</span>
                )}
                {item.description && (
                  <span className="truncate">{item.description}</span>
                )}
              </div>
            </div>
            <div className="font-medium text-right">{item.price?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '0,00 €'}</div>
          </li>
        ))}
      </ul>
    );
  };
  
  // Traducciones
  const { t: tCommon } = useTranslation('common');
  const { t } = useTranslation('tickets');
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <BorderBeam 
          colorFrom="#8b5cf6" 
          colorTo="#ec4899" 
          duration={8} 
          size={100}
        />
        
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg font-semibold text-center">
            Añadir Producto/Servicio
          </DialogTitle>
          
          {/* Buscador */}
          <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden md:grid-cols-3">
            {/* Columna Izquierda: Lista de ítems */}
            <div className="flex flex-col overflow-hidden md:col-span-2">
              {/* Buscador y Pestañas */}
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        {/* Pestañas */}
        <Tabs 
          defaultValue="services" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList className="p-1 bg-gray-100 rounded-md">
            <TabsTrigger value="services" className="flex items-center gap-1">
              <Clipboard className="w-4 h-4" />
              <span>Servicios</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1">
              <ShoppingBag className="w-4 h-4" />
              <span>Productos</span>
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span>Paquetes</span>
            </TabsTrigger>
            <TabsTrigger value="bonos" className="flex items-center gap-1">
              <Gift className="w-4 h-4" />
              <span>Bonos</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Contenido de las pestañas con scroll */}
          <div className="flex-1 mt-3 overflow-hidden">
            <ScrollArea className="h-[300px] pr-3">
              <TabsContent value="services" className="mt-0">
                {renderItems()}
              </TabsContent>
              
              <TabsContent value="products" className="mt-0">
                {renderItems()}
              </TabsContent>
              
              <TabsContent value="packages" className="mt-0">
                {renderItems()}
              </TabsContent>
              
              <TabsContent value="bonos" className="mt-0">
                {renderItems()}
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
        
        {/* Sección de detalles y botones */}
        {selectedItem && (
          <div className="pt-3 mt-3 border-t">
            <div className="grid items-end grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs text-gray-500">
                  Cantidad
                </label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-500">
                  Precio unitario
                </label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter className="mt-2 sm:mt-4">
          <Button variant="outline" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleAddItem}
            disabled={!selectedItem || quantity <= 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 min-w-[120px]"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {t('addItemModal.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 