'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { useDataService } from '@/contexts/data-context';
import { BonoDefinition, Service, Category, VATType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Schema Zod Refinado (sin categoryId)
const bonoSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'), 
  sessions: z.coerce.number().int('Debe ser un número entero').min(1, 'Las sesiones deben ser al menos 1'), 
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'), 
  validityDays: z.coerce.number().int('Debe ser un número entero').min(0, 'Los días de validez no pueden ser negativos').optional().nullable(), 
  isActive: z.boolean().default(true), 
  description: z.string().optional().nullable(),
  pointsAwarded: z.coerce.number().int().min(0).default(0).optional().nullable(),
  serviceId: z.string().optional().nullable(), // Mantener para integridad, aunque se obtiene de props
});

type BonoFormValues = z.infer<typeof bonoSchema>;

interface BonoFormProps {
  servicioId: string;
  tarifaId?: string;
  bonoId?: string;
  isReadOnly?: boolean;
}

// CSS para forzar spinners (puede necesitar ajustes según el navegador)
// Puedes mover esto a un archivo CSS global si lo prefieres
const numberInputStyles = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    opacity: 1 !important;
    margin-left: 5px; /* Ajusta el espacio si es necesario */
  }
  /* Para Firefox (puede no mostrar spinners por defecto) */
  input[type=number] {
    -moz-appearance: textfield; /* Intenta forzar apariencia de campo de texto */
  }
  input[type=number]:hover::-webkit-inner-spin-button,
  input[type=number]:hover::-webkit-outer-spin-button {
     opacity: 1 !important; /* Asegura visibilidad al pasar el ratón también */
  }
`;

export function BonoForm({ servicioId, tarifaId, bonoId, isReadOnly = false }: BonoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [tiposIVA, setTiposIVA] = useState<VATType[]>([]);
  const [servicio, setServicio] = useState<Service | null>(null);
  const dataService = useDataService();
  const router = useRouter();
  const { toast } = useToast();

  const { control, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<BonoFormValues>({
    resolver: zodResolver(bonoSchema),
    defaultValues: {
      name: '',
      sessions: 1,
      price: 0,
      validityDays: null,
      isActive: true,
      description: null,
      pointsAwarded: 0,
      serviceId: servicioId,
    }
  });

  // Obtener los datos necesarios al cargar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Usar nombres de método existentes en dataService
        const servicioData = await dataService.getServicioById(servicioId);
        if (servicioData) {
          setServicio(servicioData);
          // Obtener categorías usando método antiguo (¿asociado a tarifa?)
          // Nota: La fuente de categorías/familias podría necesitar revisión global
          const efectiveTarifaId = tarifaId || (servicioData as any).tarifaId; // Usar any si tarifaId no existe en Service
          const categoriasData = await dataService.getFamiliasByTarifaId(efectiveTarifaId);
          setCategorias(categoriasData as Category[]); // Castear a Category[] temporalmente
          // Obtener tipos IVA usando método antiguo
          const tiposIVAData = await dataService.getTiposIVAByTarifaId(efectiveTarifaId);
          setTiposIVA(tiposIVAData as VATType[]); // Castear a VATType[] temporalmente

          // Cargar datos del bono si estamos editando
          if (bonoId) {
            // Usar método antiguo getBonoById
            const bonoData = await dataService.getBonoById(bonoId);
            if (bonoData) {
              // Mapear campos de la estructura ANTIGUA (bonoData) a la NUEVA (BonoFormValues)
              reset({
                name: bonoData.nombre, // nombre -> name
                sessions: Number(bonoData.credito), // credito -> sessions
                price: Number(bonoData.precioConIVA), // precioConIVA -> price
                // Mapear caducidad compleja a validityDays (si es intervalo y días)
                validityDays: bonoData.caducidad?.tipo === 'intervalo' && bonoData.caducidad.intervalo?.tipo === 'dias' 
                              ? Number(bonoData.caducidad.intervalo.valor) 
                              : null, // TODO: Manejar otros intervalos o fecha fija?
                isActive: !bonoData.deshabilitado, // deshabilitado -> isActive (invertido)
                description: bonoData.descripcion || null, // Asumiendo que descripción existe o es null
                pointsAwarded: Number(bonoData.pointsAwarded) || 0, // Asumiendo que existe o es 0
                serviceId: bonoData.servicioId, // servicioId existe
              });
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los datos necesarios',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dataService, servicioId, bonoId, tarifaId, reset, setValue, toast]); // Añadido tarifaId a deps por si acaso

  // useEffect para asignar ID al formulario (MOVIDO AQUÍ DENTRO)
  useEffect(() => {
    // Considerar usar un ref para el form en lugar de querySelector si hay riesgo de colisión
    const formElement = document.querySelector('form'); 
    if (formElement) {
      formElement.id = 'bono-form-id';
    }
    // Opcional: Limpieza si es necesario
    // return () => { 
    //   const formElem = document.getElementById('bono-form-id');
    //   if(formElem) formElem.removeAttribute('id');
    // }
  }, []); // Dependencias vacías para que se ejecute solo al montar

  // Manejar el envío del formulario
  const onSubmit = async (values: BonoFormValues) => {
    try {
      setIsLoading(true);
      console.log("Valores del formulario validados por Zod:", values);

      // Construir objeto con datos para API (usando campos de BonoDefinition)
      // Omitimos campos como id, createdAt, updatedAt, systemId (se gestionan en backend o se añaden aquí)
      const bonoApiData = {
        name: values.name,
        sessions: values.sessions,
        price: values.price,
        validityDays: values.validityDays, // Zod asegura number | null
        isActive: values.isActive,
        description: values.description, // Zod asegura string | null
        pointsAwarded: values.pointsAwarded, // Zod asegura number | null
        serviceId: values.serviceId, // Incluido en el schema y defaultValues
        // systemId: '...', // TODO: Obtener systemId de forma fiable (contexto, servicio.systemId, etc.)
      };

      console.log("Datos preparados para enviar a la API:", bonoApiData);

      if (bonoId) {
        // Actualizar BonoDefinition existente
        // Usar nombre antiguo del dataService por ahora
        await dataService.updateBono(bonoId, bonoApiData);
        toast({ title: 'Bono actualizado', description: 'La definición del bono se actualizó correctamente.' });
      } else {
        // Crear nuevo BonoDefinition
        // Usar nombre antiguo del dataService por ahora
        await dataService.createBono(bonoApiData);
        toast({ title: 'Bono creado', description: 'La definición del bono se creó correctamente.' });
      }

      // Redirigir o limpiar formulario?
      // Construir la ruta de vuelta
      const basePath = tarifaId ? `/configuracion/tarifas/${tarifaId}/servicio/${servicioId}` : `/servicios/${servicioId}`;
      router.push(`${basePath}/bonos`); 

    } catch (error) {
      console.error('Error al guardar el bono:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la definición del bono.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar el botón de volver
  const handleBack = () => {
    // Construir la URL de regreso según los props disponibles
    let redirectUrl = '';
    if (tarifaId) {
      redirectUrl = `/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos`;
    } else {
      redirectUrl = `/servicios/${servicioId}/bonos`;
    }

    router.push(redirectUrl);
  };

  console.log('[BonoForm] Estado de familias antes de renderizar:', categorias);

  if (isLoading) {
    return (
      <div className="text-center py-8 bg-white rounded-md shadow">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto"></div>
          <div className="mt-4 h-4 w-64 bg-gray-200 rounded mx-auto"></div>
          <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <p className="mt-6 text-sm text-gray-500">Cargando datos del bono...</p>
        <p className="mt-2 text-xs text-gray-400">Obteniendo datos del servicio, familias y tipos de IVA</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isReadOnly ? 'Detalles del Bono' : (bonoId ? 'Editar Bono' : 'Nuevo Bono')}</CardTitle>
        <CardDescription>
          {isReadOnly
            ? `Viendo detalles de la definición del bono para el servicio: ${servicio?.name || '...'}`
            : bonoId
              ? `Editando definición de bono para el servicio: ${servicio?.name || '...'}`
              : `Creando una nueva definición de bono para el servicio: ${servicio?.name || '...'}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6" id="bono-form-content">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input id="name" {...field} value={field.value ?? ''} disabled={isReadOnly} placeholder="Nombre del bono" />
                  )}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Categoría del Servicio</Label>
                <Input 
                  value={categorias.find(c => c.id === servicio?.categoryId)?.name || '-'}
                  disabled 
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessions">Sesiones</Label>
                <Controller
                  name="sessions"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="sessions" 
                      type="number" 
                      min="1" 
                      {...field} 
                      value={field.value ?? 1}
                      onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)}
                      disabled={isReadOnly} 
                      className="appearance-textfield" 
                    />
                  )}
                />
                {errors.sessions && <p className="text-sm text-red-500">{errors.sessions.message}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="price" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      {...field} 
                      value={field.value ?? 0}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly} 
                      className="appearance-textfield" 
                    />
                  )}
                />
                {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="validityDays">Días de validez (0 o vacío = sin caducidad)</Label>
                <Controller
                  name="validityDays"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="validityDays" 
                      type="number" 
                      min="0" 
                      {...field} 
                      value={field.value === null || field.value === undefined ? '' : field.value}
                      onChange={e => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : parseInt(value, 10) || 0);
                      }}
                      disabled={isReadOnly} 
                      className="appearance-textfield" 
                      placeholder="Ej: 365"
                    />
                  )}
                />
                {errors.validityDays && <p className="text-sm text-red-500">{errors.validityDays.message}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Input id="description" {...field} value={field.value ?? ''} disabled={isReadOnly} placeholder="Descripción del bono" />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pointsAwarded">Puntos otorgados</Label>
                <Controller
                  name="pointsAwarded"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="pointsAwarded" 
                      type="number" 
                      min="0" 
                      {...field} 
                      value={field.value === null || field.value === undefined ? 0 : field.value}
                      onChange={e => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 0 : parseInt(value, 10) || 0); 
                      }}
                      disabled={isReadOnly} 
                      className="appearance-textfield" 
                    />
                  )}
                />
                {errors.pointsAwarded && <p className="text-sm text-red-500">{errors.pointsAwarded.message}</p>}
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox id="isActive" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />
                  )}
                />
                <Label htmlFor="isActive">Activo</Label>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleBack}>Volver</Button>
        {!isReadOnly && (
          <Button 
            type="submit"
            form="bono-form-id"
            disabled={isLoading} 
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? 'Guardando...' : (bonoId ? 'Actualizar Bono' : 'Crear Bono')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default BonoForm; 