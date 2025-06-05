import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from '@prisma/client';
import { toast as sonnerToast } from "sonner";
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { CategoryType } from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

// Esquema Zod para validación del formulario
const CategoryFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  parentId: z.string().cuid({ message: "ID de categoría padre inválido." }).optional().nullable(),
  type: z.enum(['SERVICE', 'PRODUCT', 'MIXED']).default('MIXED'),
});

// Tipo simplificado para el estado del formulario
type CategoryFormData = {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    type?: CategoryType;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  category: Category | null; // Null para crear, objeto para editar
  allCategories: Category[]; // Para el selector de padre
  onSave: () => void; // Callback para recargar datos después de guardar
}

export default function CategoryFormModal({ 
  isOpen, 
  setIsOpen, 
  category, 
  allCategories, 
  onSave 
}: CategoryFormModalProps) {
  // Usar el tipo simplificado
  const [formData, setFormData] = useState<CategoryFormData>({});
  const [errors, setErrors] = useState<z.ZodFormattedError<z.infer<typeof CategoryFormSchema>> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar formulario cuando cambia la categoría a editar
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        type: (category as any).type || 'MIXED', // Temporalmente manejamos el campo como opcional
      });
    } else {
      // Resetear para nueva categoría
      setFormData({ name: '', description: '', parentId: null, type: 'MIXED' as CategoryType });
    }
    setErrors(null); // Limpiar errores al abrir/cambiar
  }, [category, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleParentChange = (value: string) => {
    setFormData(prev => ({ ...prev, parentId: value === 'none' ? null : value }));
  };

  const handleTypeChange = (value: CategoryType) => {
    setFormData(prev => ({ ...prev, type: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrors(null);

    // Convertir cadenas vacías a null antes de validar
    const dataToValidate = {
      ...formData,
      description: formData.description?.trim() === '' ? null : formData.description,
      parentId: formData.parentId?.trim() === '' ? null : formData.parentId
    };

    // Validar con Zod
    const result = CategoryFormSchema.safeParse(dataToValidate);
    if (!result.success) {
      setErrors(result.error.format());
      setIsSaving(false);
      return;
    }

    const dataToSend = result.data;
    const url = category ? `/api/categories/${category.id}` : '/api/categories';
    const method = category ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
           const errorData = await response.json();
           errorMsg = errorData.message || errorMsg;
        } catch(e){
        }
        throw new Error(errorMsg);
      }

      sonnerToast.success(`Familia ${category ? 'actualizada' : 'creada'} correctamente.`);
      onSave(); // Llama al callback para recargar
      setIsOpen(false); // Cierra el modal

    } catch (error) {
      console.error("Error saving category:", error);
      sonnerToast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrar categorías disponibles para ser padre
  const availableParents = allCategories.filter(c => c.id !== category?.id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Familia' : 'Nueva Familia'}</DialogTitle>
          <DialogDescription>
            {category ? 'Modifica los detalles de la familia.' : 'Introduce los detalles para la nueva familia.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Nombre */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre *</Label>
            <Input 
              id="name" 
              name="name" 
              value={formData.name || ''} 
              onChange={handleChange} 
              className="col-span-3" 
            />
          </div>
          {/* Mostrar error de Zod para name */}
          {errors?.name?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.name._errors.join(', ')}
            </div>
           )}
           
          {/* Descripción */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descripción</Label>
            <Input 
              id="description" 
              name="description" 
              value={formData.description || ''} 
              onChange={handleChange} 
              className="col-span-3" 
            />
          </div>
           {/* Mostrar error de Zod para description (si hubiera) */}
           {errors?.description?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.description._errors.join(', ')}
            </div>
           )}

          {/* Familia Padre */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="parentId" className="text-right">Familia Padre</Label>
            <Select 
              value={formData.parentId || 'none'} 
              onValueChange={handleParentChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="(Ninguna)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Ninguna - Nivel Superior)</SelectItem>
                {availableParents.map(parent => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           {/* Mostrar error de Zod para parentId */}
            {errors?.parentId?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.parentId._errors.join(', ')}
            </div>
           )}

          {/* Tipo */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Tipo</Label>
            <Select 
              value={formData.type} 
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SERVICE">Servicio</SelectItem>
                <SelectItem value="PRODUCT">Producto</SelectItem>
                <SelectItem value="MIXED">Mixto</SelectItem>
              </SelectContent>
            </Select>
          </div>
           {/* Mostrar error de Zod para type */}
            {errors?.type?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.type._errors.join(', ')}
            </div>
           )}
        </div>
        <DialogFooter>
           {/* Usar onClick para cerrar en lugar de DialogClose */}
           <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 