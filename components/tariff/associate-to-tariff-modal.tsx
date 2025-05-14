"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tariff } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssociateToTariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemType: 'SERVICE' | 'PRODUCT' | 'BONO' | 'PACKAGE'; // Para futura reutilización
  onAssociationSuccess: () => void;
}

export const AssociateToTariffModal: React.FC<AssociateToTariffModalProps> = ({
  isOpen,
  onClose,
  itemIds,
  itemType,
  onAssociationSuccess,
}) => {
  const [selectedTariffId, setSelectedTariffId] = useState<string>('');

  // Cargar tarifas disponibles (versión básica)
  const { data: tariffs, isLoading: isLoadingTariffs, error: tariffsError } = useQuery<Tariff[]>({
    queryKey: ['tariffs', 'basic'], // Clave para identificar esta query
    queryFn: async () => {
      const response = await fetch('/api/tariffs?basic=true'); // Asumimos endpoint que devuelve {id, name}
      if (!response.ok) {
        throw new Error('No se pudieron cargar las tarifas');
      }
      return response.json();
    },
    enabled: isOpen, // Solo ejecutar la query si el modal está abierto
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Mutación para asociar los items a la tarifa seleccionada
  const { mutate: associateItems, isPending: isAssociating } = useMutation({
    mutationFn: async (tariffId: string) => {
      let apiUrl = '';
      let bodyKey = '';

      // Determinar endpoint y clave del body según el tipo de item
      switch (itemType) {
        case 'SERVICE':
          apiUrl = `/api/tariffs/${tariffId}/services`;
          bodyKey = 'serviceIds';
          break;
        case 'PRODUCT':
          apiUrl = `/api/tariffs/${tariffId}/products`;
          bodyKey = 'productIds';
          break;
        case 'BONO':
          apiUrl = `/api/tariffs/${tariffId}/bonos`;
          bodyKey = 'bonoDefinitionIds';
          break;
        case 'PACKAGE':
          apiUrl = `/api/tariffs/${tariffId}/packages`;
          bodyKey = 'packageDefinitionIds';
          break;
        default:
          toast.error(`La asociación para el tipo '${itemType}' aún no está implementada.`);
          throw new Error(`Tipo de item no soportado: ${itemType}`);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [bodyKey]: itemIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido al asociar.' }));
        throw new Error(errorData.message || `Error ${response.status} al asociar.`);
      }
      return response.json(); 
    },
    onSuccess: (data, variables) => {
      const tariffName = tariffs?.find(t => t.id === variables)?.name ?? variables;
      toast.success(`${itemIds.length} ${getItemTypeName(true)} asociados correctamente a la tarifa "${tariffName}".`);
      onAssociationSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error("Error en la mutación de asociación:", error);
      toast.error(`Error al asociar: ${error.message}`);
    },
  });

  const handleConfirm = () => {
    if (!selectedTariffId) {
      toast.warning('Por favor, selecciona una tarifa de destino.');
      return;
    }
    associateItems(selectedTariffId);
  };

  // Manejar error de carga de tarifas
  useEffect(() => {
    if (tariffsError) {
      toast.error(`Error al cargar tarifas: ${tariffsError.message}`);
    }
  }, [tariffsError]);

  const getItemTypeName = (plural: boolean = false) => {
      const count = plural ? itemIds.length : 1; // Usar la cuenta real para pluralización
      switch (itemType) {
          case 'SERVICE': return count > 1 ? 'servicios' : 'servicio';
          case 'PRODUCT': return count > 1 ? 'productos' : 'producto';
          case 'BONO': return count > 1 ? 'bonos' : 'bono';
          case 'PACKAGE': return count > 1 ? 'paquetes' : 'paquete';
          default: return count > 1 ? 'items' : 'item';
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle>Asociar {itemIds.length} {getItemTypeName(true)} a Tarifa</DialogTitle>
            <DialogDescription>
              Selecciona la tarifa a la que deseas añadir los {getItemTypeName(true)} seleccionados. 
              Se añadirán con sus precios y configuraciones globales por defecto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tariff-select">Tarifa de Destino</Label>
              <Select 
                value={selectedTariffId}
                onValueChange={setSelectedTariffId}
                disabled={isLoadingTariffs || isAssociating}
              >
                <SelectTrigger id="tariff-select" className="w-full">
                  <SelectValue placeholder={isLoadingTariffs ? "Cargando tarifas..." : "Selecciona una tarifa..."} />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {isLoadingTariffs && <SelectItem value="loading" disabled>Cargando...</SelectItem>}
                    {tariffs && tariffs.length > 0 ? (
                      tariffs.map((tariff) => (
                        <SelectItem key={tariff.id} value={tariff.id}>
                          {tariff.name}
                        </SelectItem>
                      ))
                    ) : (
                      !isLoadingTariffs && <SelectItem value="no-tariffs" disabled>No hay tarifas disponibles.</SelectItem>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
              {tariffsError && <p className='text-xs text-red-600'>Error al cargar tarifas.</p>}
            </div>
            {/* Opcional: Mostrar lista resumida de items seleccionados si son pocos */} 
            {/* {itemIds.length < 10 && (
              <div className="text-sm text-muted-foreground">
                Items a asociar: {itemIds.join(', ')} // O mejor, buscar nombres?
              </div>
            )} */} 
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={isAssociating}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoadingTariffs || !selectedTariffId || isAssociating}>
            {isAssociating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Asociando...</>
            ) : (
              'Confirmar Asociación'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 