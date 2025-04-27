import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { VATType } from '@prisma/client';
import { toast as sonnerToast } from "sonner";
import { z } from 'zod';
import type { CheckedState } from '@radix-ui/react-checkbox'; // Importar CheckedState

// Esquema Zod para validación del formulario (similar a la API)
const VATTypeFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  rate: z.number({ invalid_type_error: "La tasa debe ser un número." })
           .positive({ message: "La tasa debe ser positiva." })
           .finite({ message: "La tasa debe ser finita."}),
  isDefault: z.boolean().optional().default(false),
});

// Tipo para el estado del formulario
type VATTypeFormData = {
    name?: string;
    rate?: number | string; // Usar string para el input, convertir a number al guardar
    isDefault?: boolean;
}

interface VATTypeFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vatType: VATType | null; // Null para crear, objeto para editar
  onSave: () => void; // Callback para recargar datos después de guardar
}

export default function VATTypeFormModal({ 
  isOpen, 
  setIsOpen, 
  vatType, 
  onSave 
}: VATTypeFormModalProps) {
  const [formData, setFormData] = useState<VATTypeFormData>({});
  const [errors, setErrors] = useState<z.ZodFormattedError<z.infer<typeof VATTypeFormSchema>> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (vatType) {
      setFormData({
        name: vatType.name,
        rate: vatType.rate, // Guardar como número aquí
        isDefault: vatType.isDefault,
      });
    } else {
      setFormData({ name: '', rate: '', isDefault: false });
    }
    setErrors(null); 
  }, [vatType, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
   const handleCheckedChange = (checked: CheckedState) => {
      setFormData(prev => ({ ...prev, isDefault: Boolean(checked) }));
   };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrors(null);

    // Convertir rate a número antes de validar
    const dataToValidate = {
        ...formData,
        rate: formData.rate === '' ? undefined : Number(formData.rate),
    };

    const result = VATTypeFormSchema.safeParse(dataToValidate);
    if (!result.success) {
      setErrors(result.error.format());
      setIsSaving(false);
      return;
    }

    const dataToSend = result.data; // rate ya es número aquí
    const url = vatType ? `/api/vat-types/${vatType.id}` : '/api/vat-types';
    const method = vatType ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e){}
        throw new Error(errorMsg);
      }

      sonnerToast.success(`Tipo IVA ${vatType ? 'actualizado' : 'creado'} correctamente.`);
      onSave();
      setIsOpen(false);

    } catch (error) {
      console.error("Error saving VAT type:", error);
      sonnerToast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{vatType ? 'Editar Tipo IVA' : 'Nuevo Tipo IVA'}</DialogTitle>
          <DialogDescription>
            {vatType ? 'Modifica los detalles.' : 'Introduce los detalles para el nuevo tipo de IVA.'}
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
          {errors?.name?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.name._errors.join(', ')}
            </div>
           )}
           
          {/* Tasa (%) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rate" className="text-right">Tasa (%) *</Label>
            <Input 
              id="rate" 
              name="rate" 
              type="number" // Usar tipo number para validación básica del navegador
              value={formData.rate || ''} 
              onChange={handleChange} 
              className="col-span-3" 
              step="0.01" // Permitir decimales
            />
          </div>
           {errors?.rate?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.rate._errors.join(', ')}
            </div>
           )}

          {/* Por Defecto */}
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="isDefault" className="text-right">Por Defecto</Label>
             <div className="col-span-3 flex items-center">
                <Checkbox 
                  id="isDefault"
                  name="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={handleCheckedChange} // Usar handler específico
                />
                <span className="ml-2 text-sm text-gray-600">Marcar si es el tipo de IVA por defecto del sistema.</span>
             </div>
          </div>
           {errors?.isDefault?._errors && (
             <div className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">
                {errors.isDefault._errors.join(', ')}
            </div>
           )}
        </div>
        <DialogFooter>
           <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 