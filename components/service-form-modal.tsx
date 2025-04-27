import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Service, Category, VATType } from '@prisma/client';
import { toast as sonnerToast } from "sonner";
import { z } from 'zod';
import type { CheckedState } from '@radix-ui/react-checkbox';

// Esquema Zod para validación (similar a API /api/services)
const ServiceFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  durationMinutes: z.number({ invalid_type_error: "Debe ser número"}).int().positive({ message: "Debe ser positivo."}),
  price: z.number({ invalid_type_error: "Debe ser número"}).positive({ message: "Debe ser positivo."}).optional().nullable(),
  code: z.string().optional().nullable(),
  colorCode: z.string().optional().nullable(), // TODO: Añadir input de color?
  requiresMedicalSignOff: z.boolean().optional().default(false),
  pointsAwarded: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  categoryId: z.string().cuid({ message: "ID de categoría inválido." }).optional().nullable(),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).optional().nullable(),
  // systemId se añade en backend
});

// Tipo para el estado del formulario
type ServiceFormData = {
    name?: string;
    description?: string | null;
    durationMinutes?: number | string;
    price?: number | string | null;
    code?: string | null;
    colorCode?: string | null;
    requiresMedicalSignOff?: boolean;
    pointsAwarded?: number | string;
    isActive?: boolean;
    categoryId?: string | null;
    vatTypeId?: string | null;
}

interface ServiceFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  service: Service | null; // Null para crear, objeto para editar
  allCategories: Category[];
  allVatTypes: VATType[];
  onSave: () => void; 
}

export default function ServiceFormModal({ 
  isOpen, 
  setIsOpen, 
  service, 
  allCategories,
  allVatTypes,
  onSave 
}: ServiceFormModalProps) {
  const [formData, setFormData] = useState<ServiceFormData>({});
  const [errors, setErrors] = useState<z.ZodFormattedError<z.infer<typeof ServiceFormSchema>> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar/Resetear formulario
  useEffect(() => {
    if (isOpen) {
        if (service) {
          setFormData({
            name: service.name,
            description: service.description,
            durationMinutes: service.durationMinutes,
            price: service.price,
            code: service.code,
            colorCode: service.colorCode,
            requiresMedicalSignOff: service.requiresMedicalSignOff,
            pointsAwarded: service.pointsAwarded,
            isActive: service.isActive,
            categoryId: service.categoryId,
            vatTypeId: service.vatTypeId,
          });
        } else {
          // Valores por defecto para nuevo servicio
          setFormData({ 
              name: '', 
              description: '', 
              durationMinutes: 30, // Default? 
              price: null, 
              code: '', 
              colorCode: '#cccccc', 
              requiresMedicalSignOff: false, 
              pointsAwarded: 0, 
              isActive: true, 
              categoryId: null, 
              vatTypeId: null 
          });
        }
        setErrors(null); 
        setIsSaving(false);
    }
  }, [service, isOpen]);

  // Handlers para cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // Para inputs numéricos, intentar convertir o mantener string si no es válido aún
    let processedValue: string | number | boolean = value;
    if (type === 'number') {
        processedValue = value === '' ? '' : Number(value); // Mantener string si vacío
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };
  const handleSelectChange = (value: string, name: 'categoryId' | 'vatTypeId') => {
    setFormData(prev => ({ ...prev, [name]: value === 'none' ? null : value }));
  };
  const handleCheckboxChange = (checked: CheckedState, name: 'isActive' | 'requiresMedicalSignOff') => {
     setFormData(prev => ({ ...prev, [name]: Boolean(checked) }));
  };

  // Handler para submit
  const handleSubmit = async () => {
    setIsSaving(true);
    setErrors(null);

    // Convertir campos numéricos a número antes de validar
    const dataToValidate = {
        ...formData,
        durationMinutes: formData.durationMinutes === '' ? undefined : Number(formData.durationMinutes),
        price: formData.price === '' || formData.price === null ? null : Number(formData.price),
        pointsAwarded: formData.pointsAwarded === '' ? undefined : Number(formData.pointsAwarded),
    };

    // Validar con Zod
    const result = ServiceFormSchema.safeParse(dataToValidate);
    if (!result.success) {
      setErrors(result.error.format());
      setIsSaving(false);
      console.log("Errores Zod:", result.error.format());
      return;
    }

    const dataToSend = result.data;
    const url = service ? `/api/services/${service.id}` : '/api/services';
    const method = service ? 'PUT' : 'POST';

    // Añadir systemId (temporalmente hardcodeado, debe venir de sesión)
    // O la API POST debería asignarlo
    const finalData = service ? dataToSend : { ...dataToSend, systemId: 'clv5l9rpf000011u4f9dsh689' }; 

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e){}
        throw new Error(errorMsg);
      }

      sonnerToast.success(`Servicio ${service ? 'actualizado' : 'creado'} correctamente.`);
      onSave(); // Llama al callback para recargar
      setIsOpen(false); // Cierra el modal

    } catch (error) {
      console.error("Error saving service:", error);
      sonnerToast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"> {/* Ajustar tamaño y overflow */}
        <DialogHeader>
          <DialogTitle>{service ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
          <DialogDescription>
            {service ? 'Modifica los detalles del servicio.' : 'Introduce los detalles para el nuevo servicio.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 px-1"> {/* Padding para scroll */}
          {/* Nombre */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre *</Label>
            <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
          </div>
          {errors?.name?._errors && <p className="col-start-2 col-span-3 text-red-600 text-sm -mt-2">{errors.name._errors.join(', ')}</p>}
          
          {/* Descripción */}
          <div className="grid grid-cols-4 items-start gap-4"> {/* align-items-start */} 
            <Label htmlFor="description" className="text-right pt-2">Descripción</Label>
            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} className="col-span-3" rows={3}/>
          </div>

          {/* Código y Duración */}
          <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 items-center gap-2">
                 <Label htmlFor="code" className="text-right">Código</Label>
                 <Input id="code" name="code" value={formData.code || ''} onChange={handleChange} />
              </div>
               <div className="grid grid-cols-2 items-center gap-2">
                 <Label htmlFor="durationMinutes" className="text-right">Duración (min) *</Label>
                 <Input id="durationMinutes" name="durationMinutes" type="number" value={formData.durationMinutes || ''} onChange={handleChange} />
               </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>{/* Placeholder */}</div>
             <div>{errors?.durationMinutes?._errors && <p className="text-red-600 text-sm">{errors.durationMinutes._errors.join(', ')}</p>}</div>
          </div>

           {/* Precio Base y Familia */} 
           <div className="grid grid-cols-2 gap-4">
               <div className="grid grid-cols-2 items-center gap-2">
                  <Label htmlFor="price" className="text-right">Precio Base (€)</Label>
                  <Input id="price" name="price" type="number" step="0.01" value={formData.price ?? ''} onChange={handleChange} placeholder="(Opcional)"/>
               </div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <Label htmlFor="categoryId" className="text-right">Familia</Label>
                  <Select name="categoryId" value={formData.categoryId || 'none'} onValueChange={(v) => handleSelectChange(v, 'categoryId')}>
                      <SelectTrigger><SelectValue placeholder="(Sin familia)" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">(Sin familia)</SelectItem>
                          {allCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
           </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>{errors?.price?._errors && <p className="text-red-600 text-sm">{errors.price._errors.join(', ')}</p>}</div>
                 <div>{/* Placeholder */}</div>
            </div>
            
           {/* IVA Base y Color */}
           <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 items-center gap-2">
                   <Label htmlFor="vatTypeId" className="text-right">IVA Base</Label>
                   <Select name="vatTypeId" value={formData.vatTypeId || 'none'} onValueChange={(v) => handleSelectChange(v, 'vatTypeId')}>
                       <SelectTrigger><SelectValue placeholder="(Sin IVA)" /></SelectTrigger>
                       <SelectContent>
                           <SelectItem value="none">(Sin IVA base)</SelectItem>
                           {allVatTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.name} ({vt.rate}%)</SelectItem>)}
                       </SelectContent>
                   </Select>
                </div>
                 <div className="grid grid-cols-2 items-center gap-2">
                    <Label htmlFor="colorCode" className="text-right">Color Agenda</Label>
                    <Input id="colorCode" name="colorCode" type="color" value={formData.colorCode || '#cccccc'} onChange={handleChange} className="h-8 p-1"/>
                 </div>
           </div>
           
           {/* Checkboxes */}
           <div className="grid grid-cols-4 items-center gap-4">
               <div className="col-span-2 flex items-center justify-end space-x-2">
                   <Checkbox id="requiresMedicalSignOff" name="requiresMedicalSignOff" checked={formData.requiresMedicalSignOff} onCheckedChange={(c) => handleCheckboxChange(c, 'requiresMedicalSignOff')}/>
                   <Label htmlFor="requiresMedicalSignOff">Requiere VoBo Médico</Label>
               </div>
                <div className="col-span-2 flex items-center justify-start space-x-2">
                   <Checkbox id="isActive" name="isActive" checked={formData.isActive} onCheckedChange={(c) => handleCheckboxChange(c, 'isActive')}/>
                   <Label htmlFor="isActive">Activo</Label>
               </div>
           </div>
           
           {/* Puntos Otorgados */}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pointsAwarded" className="text-right col-span-2">Puntos Otorgados (Fidelización)</Label>
                <Input id="pointsAwarded" name="pointsAwarded" type="number" step="1" value={formData.pointsAwarded || '0'} onChange={handleChange} className="col-span-2"/>
            </div>
             {errors?.pointsAwarded?._errors && <p className="col-start-3 col-span-2 text-red-600 text-sm -mt-2">{errors.pointsAwarded._errors.join(', ')}</p>}

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