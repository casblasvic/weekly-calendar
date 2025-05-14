"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/components/ui/use-toast';
// Importar tipos directamente de Prisma y el tipo extendido
import type { BonoDefinition, Service, Product, VATType } from '@prisma/client';
import type { BonoDefinitionWithRelations } from '@/app/(main)/configuracion/bonos/page'; // Ajusta la ruta si es necesario
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

// Esquema Zod GLOBAL (basado en BonoDefinitionCreateSchema/UpdateSchema de API)
// NOTA: Ajustar según los campos finales y obligatoriedad
const BonoDefinitionFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'), 
  description: z.string().optional().nullable(),
  // Tipo de Asociación (Radio)
  associationType: z.enum(['service', 'product'], { required_error: "Debe seleccionar un tipo de asociación"}),
  // IDs (ComboBox)
  serviceId: z.string().cuid().optional().nullable(),
  productId: z.string().cuid().optional().nullable(),
  // Campos principales (hacer opcionales para facilitar pruebas)
  quantity: z.coerce.number().int('Debe ser entero').min(0).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  costPrice: z.coerce.number().optional().nullable(),
  validityDays: z.coerce.number().int('Debe ser entero').min(0).optional().nullable(), 
  // IVA (Select)
  vatTypeId: z.string().cuid().optional().nullable(),
  // Comisiones
  commissionType: z.string().optional().nullable(), // Quizás Enum?
  commissionValue: z.coerce.number().optional().nullable(),
  // Opciones Booleanas
  isActive: z.boolean().default(true),
  appearsInApp: z.boolean().default(true),
  autoAddToInvoice: z.boolean().default(false),
  // Otros campos
  pointsAwarded: z.coerce.number().int().min(0).default(0).optional().nullable(),
})
// Validación cruzada: Si associationType es service, serviceId debe tener valor. Si es product, productId debe tener valor.
.refine(data => {
  if (data.associationType === 'service') return !!data.serviceId;
  if (data.associationType === 'product') return !!data.productId;
  return false; // Si associationType no es ninguno, algo falló
}, {
  message: "Debe seleccionar un Servicio o Producto válido según el tipo de asociación",
  path: ["serviceId", "productId"] // O path: ["associationType"]?
})
// Asegurar que solo uno de los IDs tiene valor
.refine(data => !(data.serviceId && data.productId), {
  message: "No se puede asociar a un Servicio y un Producto a la vez",
  path: ["serviceId", "productId"]
});

type BonoDefinitionFormValues = z.infer<typeof BonoDefinitionFormSchema>;

interface BonoDefinitionFormProps {
  initialData?: BonoDefinitionWithRelations | null; // Datos para edición
  // Añadir props para IDs preseleccionados
  preselectedServiceId?: string;
  preselectedProductId?: string;
}

// Componente de Formulario Adaptado
export function BonoDefinitionForm({ initialData, preselectedServiceId, preselectedProductId }: BonoDefinitionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);
  const [vatTypes, setVatTypes] = useState<VATType[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const isEditing = !!initialData;
  // Determinar si se está creando desde un contexto preseleccionado
  const isContextualCreate = !isEditing && (!!preselectedServiceId || !!preselectedProductId);

  const { control, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<BonoDefinitionFormValues>({
    resolver: zodResolver(BonoDefinitionFormSchema),
    defaultValues: {
      // Priorizar IDs preseleccionados si existen y no estamos editando
      name: initialData?.name ?? '',
      description: initialData?.description ?? '', 
      associationType: isContextualCreate
                       ? (preselectedServiceId ? 'service' : 'product')
                       : (initialData?.serviceId ? 'service' : (initialData?.productId ? 'product' : undefined)),
      serviceId: isContextualCreate ? preselectedServiceId : (initialData?.serviceId ?? null),
      productId: isContextualCreate ? preselectedProductId : (initialData?.productId ?? null),
      quantity: initialData?.quantity ?? 1,
      price: initialData?.price ?? 0,
      costPrice: initialData?.settings?.costPrice ?? null,
      validityDays: initialData?.settings?.validityDays ?? null,
      vatTypeId: initialData?.vatTypeId ?? null,
      commissionType: initialData?.settings?.commissionType ?? null,
      commissionValue: initialData?.settings?.commissionValue ?? null,
      isActive: initialData?.settings?.isActive ?? true,
      appearsInApp: initialData?.settings?.appearsInApp ?? true,
      autoAddToInvoice: initialData?.settings?.autoAddToInvoice ?? false,
      pointsAwarded: initialData?.settings?.pointsAwarded ?? 0,
    }
  });

  // Observar el tipo de asociación para mostrar/ocultar selectores y limpiar el ID no relevante
  const associationType = watch('associationType');
  useEffect(() => {
    if (associationType === 'service') {
      setValue('productId', null);
    } else if (associationType === 'product') {
      setValue('serviceId', null);
    }
  }, [associationType, setValue]);


  // --- Carga de Datos para Selectores (Servicios, Productos, IVA) ---
  const fetchSelectData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [servicesRes, productsRes, vatsRes] = await Promise.all([
        fetch('/api/services?minimal=true'), // API a crear/ajustar
        fetch('/api/products?minimal=true'), // API a crear/ajustar
        fetch('/api/vat-types')           // API a crear/ajustar
      ]);

      if (!servicesRes.ok || !productsRes.ok || !vatsRes.ok) {
        throw new Error('Error al cargar datos para los selectores');
      }

      const servicesData: Service[] = await servicesRes.json();
      const productsData: Product[] = await productsRes.json();
      const vatsData: VATType[] = await vatsRes.json();

      setServices(servicesData.map(s => ({ value: s.id, label: s.name })));
      setProducts(productsData.map(p => ({ value: p.id, label: p.name })));
      setVatTypes(vatsData);

    } catch (error) {
      console.error("Error fetching select data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las opciones." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSelectData();
  }, [fetchSelectData]);
  // --- Fin Carga de Datos --- 


  // Manejar el envío del formulario
  const onSubmit = async (values: BonoDefinitionFormValues) => {
    try {
      setIsLoading(true);
      console.log("Valores de Formulario Validados:", values);

      // Preparar datos para la API (excluir associationType, ajustar IDs)
      const dataToSend = {
        ...values,
        serviceId: values.associationType === 'service' ? values.serviceId : null,
        productId: values.associationType === 'product' ? values.productId : null,
      };
      delete (dataToSend as any).associationType; // Eliminar campo auxiliar

      console.log("Datos a enviar a la API:", dataToSend);

      let response;
      if (isEditing) {
        // Actualizar
        response = await fetch(`/api/bono-definitions/${initialData?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      } else {
        // Crear
        response = await fetch('/api/bono-definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      toast({ title: isEditing ? 'Bono actualizado' : 'Bono creado', description: 'La definición del bono se guardó correctamente.' });
      router.push('/configuracion/bonos'); // Redirigir a la lista
      router.refresh(); // Refrescar datos en la página de lista

    } catch (error: any) {
      console.error('Error al guardar el bono:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar la definición del bono.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // --- Renderizado del Formulario --- 
  // (Similar al bono-form.tsx original, pero con todos los campos nuevos y lógica de asociación)
  return (
    <Card className="relative pb-20">
      {/* <CardHeader> se maneja en la página padre (nuevo/page.tsx o [id]/page.tsx) */}
      <CardContent className="pt-6"> {/* Añadir padding top si se quita CardHeader */}
        <form id="bono-definition-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* --- Sección Datos Generales --- */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Nombre */}
            <FormField name="name" label="Nombre del Bono" error={errors.name} control={control} render={(field) => <Input {...field} placeholder="Ej: Bono 5 Masajes" disabled={isLoading} />} />
          </div>

          {/* --- Sección Asociación (Servicio o Producto) --- */}
          <div className="p-4 space-y-4 border rounded-md">
             <Label className="text-base font-semibold">Asociación del Bono</Label>
            <FormField name="associationType" label="" error={errors.associationType} control={control} render={(field) => (
              <RadioGroup 
                onValueChange={field.onChange} 
                defaultValue={field.value} 
                className="flex space-x-4"
                disabled={isLoading || isContextualCreate}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="service" id="service" />
                  <Label htmlFor="service">Asociar a Servicio</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="product" id="product" />
                  <Label htmlFor="product">Asociar a Producto</Label>
                </div>
              </RadioGroup>
             )} />
             
            {/* Selector de Servicio (Condicional) */}
            {associationType === 'service' && (
              <FormField name="serviceId" label="Seleccionar Servicio" error={errors.serviceId} control={control} render={(field) => (
                 <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || isContextualCreate}
                 >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Servicio..." />
                    </SelectTrigger>
                    <SelectContent>
                        {services.map(service => (
                            <SelectItem key={service.value} value={service.value}>{service.label}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              )} />
            )}

            {/* Selector de Producto (Condicional) */}
            {associationType === 'product' && (
              <FormField name="productId" label="Seleccionar Producto" error={errors.productId} control={control} render={(field) => (
                 <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || isContextualCreate}
                 >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar Producto..." />
                    </SelectTrigger>
                    <SelectContent>
                        {products.map(product => (
                            <SelectItem key={product.value} value={product.value}>{product.label}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              )} />
            )}
          </div>

          {/* --- Sección Detalles y Precios --- */}
           <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Cantidad */}
              <FormField name="quantity" label={associationType === 'service' ? "Nº Sesiones" : (associationType === 'product' ? "Nº Unidades" : "Cantidad")} error={errors.quantity} control={control} render={(field) => <Input type="number" {...field} value={field?.value ?? ''} min="1" step="1" disabled={isLoading} />} />
              {/* Precio Venta */}
              <FormField name="price" label="Precio Venta (Global)" error={errors.price} control={control} render={(field) => <Input type="number" {...field} value={field?.value ?? ''} min="0" step="0.01" disabled={isLoading} placeholder="0.00" />} />
              {/* Precio Coste - Añadir chequeo field && field.value */}
              <FormField 
                  name="costPrice" 
                  label="Precio Coste (Opcional)" 
                  error={errors.costPrice} 
                  control={control} 
                  render={({ field }) => (
                      <Input 
                          type="number" 
                          {...field} 
                          value={field?.value ?? ''} // Usar optional chaining aquí también
                          min="0" 
                          step="0.01" 
                          disabled={isLoading} 
                          placeholder="0.00" 
                      />
                  )} 
              />
              {/* Días Validez - Añadir chequeo field && field.value */}
              <FormField 
                  name="validityDays" 
                  label="Días de Validez (0 o vacío = indefinido)" 
                  error={errors.validityDays} 
                  control={control} 
                  render={({ field }) => (
                      <Input 
                          type="number" 
                          {...field} 
                          value={field?.value ?? ''} // Usar optional chaining aquí también
                          min="0" 
                          step="1" 
                          disabled={isLoading} 
                          placeholder="Ej: 365" 
                      />
                  )} 
              />
              {/* Tipo IVA */}
              <FormField name="vatTypeId" label="Tipo IVA (Global Base)" error={errors.vatTypeId} control={control} render={(field) => (
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar IVA (hereda tarifa si no)" />
                    </SelectTrigger>
                    <SelectContent>
                        {vatTypes.map(vat => (
                            <SelectItem key={vat.id} value={vat.id}>{vat.name} ({vat.rate}%)</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              )} />
               {/* Puntos Otorgados - Añadir chequeo field && field.value */}
              <FormField name="pointsAwarded" label="Puntos Otorgados" error={errors.pointsAwarded} control={control} render={(field) => <Input type="number" {...field} value={field?.value ?? ''} min="0" step="1" disabled={isLoading} placeholder="0" />} />
           </div>

          {/* --- Sección Comisiones (Simplificada) --- */}
          {/* TODO: Implementar mejor si es Enum o tipos fijos */}
           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField name="commissionType" label="Tipo Comisión (Opcional)" error={errors.commissionType} control={control} render={(field) => <Input {...field} value={field?.value ?? ''} placeholder="Ej: PERCENTAGE, FIXED" disabled={isLoading} />} />
                {/* Valor Comisión - Añadir chequeo field && field.value */}
                <FormField 
                    name="commissionValue" 
                    label="Valor Comisión (Opcional)" 
                    error={errors.commissionValue} 
                    control={control} 
                    render={({ field }) => (
                        <Input 
                            type="number" 
                            {...field} 
                            value={field?.value ?? ''} // Usar optional chaining aquí también
                            step="0.01" 
                            disabled={isLoading} 
                        />
                    )} 
                />
           </div>

          {/* --- Sección Descripciones y T&C --- */}
           <div className="space-y-4">
                <FormField name="description" label="Descripción Corta" error={errors.description} control={control} render={(field) => <Textarea {...field} placeholder="Descripción breve para listas..." rows={3} disabled={isLoading} />} />
           </div>

          {/* --- Sección Opciones Adicionales --- */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
             <FormFieldCheckbox name="isActive" label="Activo" control={control} disabled={isLoading} />
             <FormFieldCheckbox name="appearsInApp" label="Aparece en App Cliente" control={control} disabled={isLoading} />
             <FormFieldCheckbox name="autoAddToInvoice" label="Añadir Auto a Factura" control={control} disabled={isLoading} />
          </div>

        </form>
      </CardContent>

      {/* --- Footer Fijo con Botones Flotantes --- */}
      <footer 
        className="fixed bottom-4 right-4 z-40 flex items-center justify-end gap-2 transition-all duration-300 ease-in-out"
        style={{ 
            left: 'var(--main-margin-left)', // Mantener ajuste por sidebar
            width: 'var(--main-width)',    // Mantener ajuste por sidebar
        }}
      >
        <Button variant="outline" onClick={handleBack} disabled={isLoading}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver 
        </Button>
        <Button 
            type="button" 
            onClick={() => {
              (document.getElementById('bono-definition-form') as HTMLFormElement | null)?.requestSubmit();
            }}
            disabled={isLoading} 
        >
          {isLoading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Bono')} 
        </Button>
      </footer>
    </Card>
  );
}

// --- Componentes Auxiliares (FormField, FormFieldCheckbox) --- 
// (Asumiendo que existen o definirlos aquí/en otro lugar)

interface FormFieldProps {
    name: keyof BonoDefinitionFormValues;
    label: string;
    control: any; // Control de react-hook-form
    error?: { message?: string };
    render: (field: any) => React.ReactElement; 
}

const FormField: React.FC<FormFieldProps> = ({ name, label, control, error, render }) => (
    <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState, formState }) => {
                if (!field) { 
                    return <></>;
                }
                return render(field); 
            }} 
        />
        {error && <p className="text-sm text-red-600">{error.message}</p>}
    </div>
);

interface FormFieldCheckboxProps {
    name: keyof BonoDefinitionFormValues;
    label: string;
    control: any;
    disabled?: boolean;
}

const FormFieldCheckbox: React.FC<FormFieldCheckboxProps> = ({ name, label, control, disabled }) => (
    <div className="flex items-center pt-6 space-x-2"> {/* Ajuste de padding top */} 
         <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <Checkbox 
                    id={name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                />
            )}
        />
        <Label htmlFor={name} className="cursor-pointer">
            {label}
        </Label>
    </div>
); 