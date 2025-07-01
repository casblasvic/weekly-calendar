import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/ui/save-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Wrench } from "lucide-react";
import { toast as sonnerToast } from "sonner";

export interface BulkItem {
  id: string;
  name: string;
  type: 'service' | 'product';
  categoryId?: string | null;
  categoryName?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

interface BulkCategoryChangerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: BulkItem[];
  categories: Category[];
  onUpdate: (itemIds: string[], newCategoryId: string | null, itemType: 'service' | 'product' | 'mixed') => Promise<void>;
  itemType: 'service' | 'product' | 'mixed';
}

export default function BulkCategoryChanger({
  isOpen,
  onClose,
  selectedItems,
  categories,
  onUpdate,
  itemType
}: BulkCategoryChangerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCategoryId('');
    }
  }, [isOpen]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value === 'none' ? '' : value);
  };

  const handleUpdate = async () => {
    if (!selectedItems.length) {
      sonnerToast.error('No hay elementos seleccionados');
      return;
    }

    setIsUpdating(true);
    try {
      const itemIds = selectedItems.map(item => item.id);
      const newCategoryId = selectedCategoryId || null;
      
      await onUpdate(itemIds, newCategoryId, itemType);
      
      sonnerToast.success(
        `✅ Categoría actualizada para ${selectedItems.length} ${selectedItems.length === 1 ? 'elemento' : 'elementos'}`
      );
      
      onClose();
    } catch (error) {
      console.error('Error updating categories:', error);
      sonnerToast.error(`Error al actualizar categorías: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Group selected items by current category
  const itemsByCategory = selectedItems.reduce((acc, item) => {
    const categoryName = item.categoryName || 'Sin categoría';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, BulkItem[]>);

  const serviceCount = selectedItems.filter(item => item.type === 'service').length;
  const productCount = selectedItems.filter(item => item.type === 'product').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Cambiar Categoría Masivamente
          </DialogTitle>
          <DialogDescription>
            Selecciona una nueva categoría para aplicar a todos los elementos seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-4">
          {/* Resumen de selección */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Elementos seleccionados ({selectedItems.length})</h3>
            
            <div className="flex gap-4 mb-3">
              {serviceCount > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {serviceCount} Servicio{serviceCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {productCount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {productCount} Producto{productCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Agrupación por categoría actual */}
            <div className="space-y-2">
              {Object.entries(itemsByCategory).map(([categoryName, items]) => (
                <div key={categoryName} className="text-xs text-gray-600">
                  <span className="font-medium">{categoryName}:</span> {items.map(item => item.name).join(', ')}
                </div>
              ))}
            </div>
          </div>

          {/* Selector de nueva categoría */}
          <div>
            <Label htmlFor="newCategory" className="text-sm font-medium">
              Nueva Categoría
            </Label>
            <Select value={selectedCategoryId || 'none'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Seleccionar nueva categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advertencia */}
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">¿Estás seguro?</p>
              <p className="mt-1">
                Esta acción cambiará la categoría de todos los elementos seleccionados. 
                Los tipos de categoría se actualizarán automáticamente según corresponda.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <SaveButton 
            type="button" 
            onClick={handleUpdate} 
            isSaving={isUpdating}
            disabled={!selectedItems.length}
            saveText="Actualizar Categorías"
            savingText="Actualizando..."
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 