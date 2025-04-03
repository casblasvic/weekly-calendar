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
import { Bono, Servicio, FamiliaTarifa, TipoIVA } from '@/services/data/models/interfaces';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Definir el esquema de validación (Ajustar tipos numéricos si es necesario con .coerce)
const bonoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  familiaId: z.string().min(1, 'La familia es requerida'),
  tipoComision: z.string().min(1, 'El tipo de comisión es requerido'),
  // Usar coerce para asegurar que aunque venga de un input type=number (string), se valide como número
  comision: z.coerce.number().min(0, 'La comisión no puede ser negativa').transform(String), // Validar como número, pero guardar como string si es necesario por la interfaz Bono
  credito: z.coerce.number().min(1, 'El crédito debe ser al menos 1'),
  precioConIVA: z.coerce.number().min(0, 'El precio no puede ser negativo').transform(String), // Validar como número, guardar como string
  ivaId: z.string().min(1, 'El IVA es requerido'),
  caducidadTipo: z.enum(['intervalo', 'fechaFija']),
  intervaloTipo: z.enum(['dias', 'semanas', 'meses']).optional(),
  intervaloValor: z.coerce.number().min(1, 'El intervalo debe ser al menos 1').optional(),
  fechaFija: z.string().optional(),
  apareceEnApp: z.boolean().default(false),
  soloParaPagoDeCitas: z.boolean().default(false),
  descuentosAutomaticos: z.boolean().default(false),
  descuentosManuales: z.boolean().default(true),
  aceptaPromociones: z.boolean().default(true),
  aceptaEdicionPVP: z.boolean().default(false),
  formaConPaquetesAutomaticamente: z.boolean().default(false),
  afectaEstadisticas: z.boolean().default(true),
  deshabilitado: z.boolean().default(false),
  validoParaTodosPlanaTarifa: z.boolean().default(true),
  precioCoste: z.coerce.number().min(0, 'El precio de coste no puede ser negativo').transform(String), // Validar como número, guardar como string
  archivoAyuda: z.string().nullable().optional()
}).refine(data => {
  // Validación condicional para intervalo si caducidadTipo es 'intervalo'
  if (data.caducidadTipo === 'intervalo') {
    return data.intervaloTipo !== undefined && data.intervaloValor !== undefined;
  }
  return true;
}, {
  message: "Debe especificar el tipo y valor del intervalo",
  path: ["intervaloValor"], // O path general
}).refine(data => {
  // Validación condicional para fechaFija si caducidadTipo es 'fechaFija'
  if (data.caducidadTipo === 'fechaFija') {
    return data.fechaFija !== undefined && data.fechaFija !== '';
  }
  return true;
}, {
  message: "Debe especificar la fecha de caducidad",
  path: ["fechaFija"],
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
  const [familias, setFamilias] = useState<FamiliaTarifa[]>([]);
  const [tiposIVA, setTiposIVA] = useState<TipoIVA[]>([]);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const dataService = useDataService();
  const router = useRouter();
  const { toast } = useToast();

  const { control, handleSubmit, formState: { errors }, getValues, setValue, reset, watch } = useForm<BonoFormValues>({
    resolver: zodResolver(bonoSchema),
    defaultValues: {
      nombre: '',
      familiaId: '',
      tipoComision: 'Global',
      comision: '0',
      credito: 1,
      precioConIVA: '0',
      ivaId: '',
      caducidadTipo: 'intervalo',
      intervaloTipo: 'meses',
      intervaloValor: 12,
      fechaFija: '',
      apareceEnApp: false,
      soloParaPagoDeCitas: false,
      descuentosAutomaticos: false,
      descuentosManuales: true,
      aceptaPromociones: true,
      aceptaEdicionPVP: false,
      formaConPaquetesAutomaticamente: false,
      afectaEstadisticas: true,
      deshabilitado: false,
      validoParaTodosPlanaTarifa: true,
      precioCoste: '0',
      archivoAyuda: null
    }
  });

  const caducidadTipo = watch('caducidadTipo');
  const currentFamiliaId = getValues('familiaId');
  const currentIvaId = getValues('ivaId');

  // Obtener los datos necesarios al cargar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Obtener el servicio
        const servicioData = await dataService.getServicioById(servicioId);
        if (servicioData) {
          setServicio(servicioData);

          // Usar tarifaId que viene como prop o obtenerlo del servicio
          const efectiveTarifaId = tarifaId || servicioData.tarifaId;

          // Obtener familias de la tarifa asociada al servicio
          const familiasData = await dataService.getFamiliasByTarifaId(efectiveTarifaId);
          console.log('[BonoForm] Familias obtenidas para tarifa', efectiveTarifaId, ':', familiasData);
          setFamilias(familiasData);

          // Obtener tipos de IVA de la tarifa
          const tiposIVAData = await dataService.getTiposIVAByTarifaId(efectiveTarifaId);
          setTiposIVA(tiposIVAData);

          // Si estamos creando un nuevo bono, establecer la familia del servicio como valor por defecto
          if (!bonoId && servicioData.familiaId) {
            setValue('familiaId', servicioData.familiaId);

            // También establecer el mismo IVA que el servicio si está disponible
            if (servicioData.ivaId) {
              setValue('ivaId', servicioData.ivaId);
            }
          }

          // Si estamos editando, cargar los datos del bono
          if (bonoId) {
            const bonoData = await dataService.getBonoById(bonoId);
            if (bonoData) {
              reset({
                nombre: bonoData.nombre,
                familiaId: bonoData.familiaId,
                tipoComision: bonoData.tipoComision,
                comision: bonoData.comision.toString(),
                credito: Number(bonoData.credito),
                precioConIVA: bonoData.precioConIVA.toString(),
                ivaId: bonoData.ivaId,
                caducidadTipo: bonoData.caducidad.tipo,
                intervaloTipo: bonoData.caducidad.intervalo?.tipo,
                intervaloValor: Number(bonoData.caducidad.intervalo?.valor),
                fechaFija: bonoData.caducidad.fechaFija,
                apareceEnApp: bonoData.apareceEnApp,
                soloParaPagoDeCitas: bonoData.soloParaPagoDeCitas,
                descuentosAutomaticos: bonoData.descuentosAutomaticos,
                descuentosManuales: bonoData.descuentosManuales,
                aceptaPromociones: bonoData.aceptaPromociones,
                aceptaEdicionPVP: bonoData.aceptaEdicionPVP,
                formaConPaquetesAutomaticamente: bonoData.formaConPaquetesAutomaticamente,
                afectaEstadisticas: bonoData.afectaEstadisticas,
                deshabilitado: bonoData.deshabilitado,
                validoParaTodosPlanaTarifa: bonoData.validoParaTodosPlanaTarifa,
                precioCoste: bonoData.precioCoste?.toString() || '0',
                archivoAyuda: bonoData.archivoAyuda
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
  }, [dataService, servicioId, tarifaId, bonoId, reset, setValue, toast]);

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
      console.log("Valores validados por Zod:", values);

      const bonoData: Omit<Bono, 'id'> = {
        nombre: values.nombre,
        familiaId: values.familiaId,
        servicioId: servicioId,
        tipoComision: values.tipoComision,
        comision: values.comision,
        credito: values.credito,
        precioConIVA: values.precioConIVA,
        ivaId: values.ivaId,
        caducidad: {
          tipo: values.caducidadTipo,
          ...(values.caducidadTipo === 'intervalo' ? {
            intervalo: {
              tipo: values.intervaloTipo!,
              valor: values.intervaloValor!
            }
          } : {
            fechaFija: values.fechaFija
          })
        },
        apareceEnApp: values.apareceEnApp,
        soloParaPagoDeCitas: values.soloParaPagoDeCitas,
        descuentosAutomaticos: values.descuentosAutomaticos,
        descuentosManuales: values.descuentosManuales,
        aceptaPromociones: values.aceptaPromociones,
        aceptaEdicionPVP: values.aceptaEdicionPVP,
        formaConPaquetesAutomaticamente: values.formaConPaquetesAutomaticamente,
        afectaEstadisticas: values.afectaEstadisticas,
        deshabilitado: values.deshabilitado,
        validoParaTodosPlanaTarifa: values.validoParaTodosPlanaTarifa,
        precioCoste: values.precioCoste,
        archivoAyuda: values.archivoAyuda,
        isActive: true
      };

      console.log("Datos del bono a enviar:", bonoData);

      if (bonoId) {
        await dataService.updateBono(bonoId, bonoData);
        toast({
          title: 'Bono actualizado',
          description: 'El bono ha sido actualizado correctamente',
        });
      } else {
        await dataService.createBono(bonoData);
        toast({
          title: 'Bono creado',
          description: 'El bono ha sido creado correctamente',
        });
      }

      // Construir la URL de regreso según los props disponibles
      let redirectUrl = '';
      if (tarifaId) {
        redirectUrl = `/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos`;
      } else {
        redirectUrl = `/servicios/${servicioId}/bonos`;
      }

      // Redirigir a la lista de bonos
      router.push(redirectUrl);
    } catch (error) {
      console.error('Error al guardar el bono:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar el bono',
      });
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

  console.log('[BonoForm] Estado de familias antes de renderizar:', familias);

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
    <div className="relative pb-20">
      {/* Injectar estilos para inputs numéricos */} 
      <style>{numberInputStyles}</style>
      <Card>
        <CardHeader>
          <CardTitle>
            {isReadOnly
              ? 'Detalles del Bono'
              : bonoId
                ? 'Editar Bono'
                : 'Nuevo Bono'}
          </CardTitle>
          <CardDescription>
            {isReadOnly
              ? `Viendo detalles del bono para el servicio: ${servicio?.nombre || '...'}`
              : bonoId
                ? `Editando bono para el servicio: ${servicio?.nombre || '...'}`
                : `Creando un nuevo bono para el servicio: ${servicio?.nombre || '...'}`}
          </CardDescription>
        </CardHeader>
        <form id="bono-form-id" onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* --- Columna 1 --- */}
              <div className="space-y-4">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Controller
                    name="nombre"
                    control={control}
                    render={({ field }) => (
                      <Input id="nombre" {...field} disabled={isReadOnly} placeholder="Nombre del bono" />
                    )}
                  />
                  {errors.nombre && <p className="text-sm text-red-500">{errors.nombre.message}</p>}
                </div>

                {/* Familia */}
                <div className="space-y-2">
                  <Label htmlFor="familiaId">Familia</Label>
                  <Controller
                    name="familiaId"
                    control={control}
                    render={({ field }) => (
                      <Select disabled={isReadOnly} onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar familia" /></SelectTrigger>
                        <SelectContent>
                          {familias.length === 0 ? <SelectItem value="" disabled>No hay familias</SelectItem> 
                            : familias.map((f) => <SelectItem key={f.id} value={f.id.toString()}>{f.nombre || f.name || ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.familiaId && <p className="text-sm text-red-500">{errors.familiaId.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    Las familias mostradas corresponden a la tarifa asociada al servicio.
                    {servicio?.familiaId && !currentFamiliaId && (
                      " Por defecto se usa la misma familia que el servicio."
                    )}
                  </p>
                </div>

                 {/* Crédito */}
                 <div className="space-y-2">
                  <Label htmlFor="credito">Crédito (Sesiones)</Label>
                  <Controller
                    name="credito"
                    control={control}
                    render={({ field }) => (
                      <Input id="credito" type="number" min="1" {...field} 
                             onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                             disabled={isReadOnly} className="appearance-textfield" />
                    )}
                  />
                  {errors.credito && <p className="text-sm text-red-500">{errors.credito.message}</p>}
                </div>
              </div>

              {/* --- Columna 2 --- */}
              <div className="space-y-4">
                {/* Precio con IVA */}
                <div className="space-y-2">
                  <Label htmlFor="precioConIVA">Precio con IVA</Label>
                  <Controller
                    name="precioConIVA"
                    control={control}
                    render={({ field }) => (
                      <Input id="precioConIVA" type="number" step="0.01" min="0" {...field} 
                             onChange={e => field.onChange(e.target.value)}
                             disabled={isReadOnly} className="appearance-textfield" />
                    )}
                  />
                  {errors.precioConIVA && <p className="text-sm text-red-500">{errors.precioConIVA.message}</p>}
                </div>

                {/* IVA */}
                <div className="space-y-2">
                  <Label htmlFor="ivaId">IVA</Label>
                  <Controller
                    name="ivaId"
                    control={control}
                    render={({ field }) => (
                      <Select disabled={isReadOnly} onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar IVA" /></SelectTrigger>
                        <SelectContent>
                          {tiposIVA.length === 0 ? <SelectItem value="" disabled>No hay tipos</SelectItem> 
                            : tiposIVA.map((iva) => <SelectItem key={iva.id} value={iva.id.toString()}>{iva.descripcion} ({iva.porcentaje}%)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.ivaId && <p className="text-sm text-red-500">{errors.ivaId.message}</p>}
                   <p className="text-xs text-muted-foreground">
                    Los tipos de IVA corresponden a la tarifa asociada al servicio.
                    {servicio?.ivaId && !currentIvaId && (
                      " Por defecto se usa el mismo IVA que el servicio."
                    )}
                  </p>
                </div>

                 {/* Precio de coste */}
                <div className="space-y-2">
                  <Label htmlFor="precioCoste">Precio de coste</Label>
                  <Controller
                    name="precioCoste"
                    control={control}
                    render={({ field }) => (
                      <Input id="precioCoste" type="number" step="0.01" min="0" {...field} 
                             onChange={e => field.onChange(e.target.value)}
                             disabled={isReadOnly} className="appearance-textfield" />
                    )}
                  />
                  {errors.precioCoste && <p className="text-sm text-red-500">{errors.precioCoste.message}</p>}
                </div>
              </div>

               {/* --- Columna 3 --- */}
               <div className="space-y-4">
                 {/* Tipo de comisión */}
                  <div className="space-y-2">
                    <Label>Tipo de comisión</Label>
                    <Controller
                      name="tipoComision"
                      control={control}
                      render={({ field }) => (
                        <Select disabled={isReadOnly} onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Global">Global</SelectItem>
                            <SelectItem value="Porcentaje">Porcentaje</SelectItem>
                            <SelectItem value="Importe">Importe</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.tipoComision && <p className="text-sm text-red-500">{errors.tipoComision.message}</p>}
                  </div>

                  {/* Comisión */}
                  <div className="space-y-2">
                    <Label htmlFor="comision">Comisión</Label>
                    <Controller
                      name="comision"
                      control={control}
                      render={({ field }) => (
                        <Input id="comision" type="number" step="0.01" min="0" {...field} 
                               onChange={e => field.onChange(e.target.value)}
                               disabled={isReadOnly} className="appearance-textfield" />
                      )}
                    />
                    {errors.comision && <p className="text-sm text-red-500">{errors.comision.message}</p>}
                  </div>
               </div>
            </div>

            {/* --- Caducidad (Ocupa más espacio) --- */}
            <div className="space-y-4 border p-4 rounded-md md:col-span-3"> {/* Ajustado para ocupar todo el ancho en md */}
              <Label className="text-base font-medium">Caducidad</Label>
              <Controller
                  name="caducidadTipo"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup disabled={isReadOnly} value={field.value} onValueChange={field.onChange} className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="intervalo" id="intervalo" />
                        <Label htmlFor="intervalo">Intervalo de tiempo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fechaFija" id="fechaFija" />
                        <Label htmlFor="fechaFija">Fecha fija</Label>
                      </div>
                    </RadioGroup>
                  )}
                />

                {errors.caducidadTipo && <p className="text-sm text-red-500">{errors.caducidadTipo.message}</p>}

                {caducidadTipo === 'intervalo' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="intervaloValor">Tiempo</Label>
                      <Controller
                        name="intervaloValor"
                        control={control}
                        render={({ field }) => (
                          <Input id="intervaloValor" type="number" min="1" {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                disabled={isReadOnly} className="appearance-textfield" />
                        )}
                      />
                      {errors.intervaloValor && <p className="text-sm text-red-500">{errors.intervaloValor.message}</p>}
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="intervaloTipo">Unidad</Label>
                      <Controller
                        name="intervaloTipo"
                        control={control}
                        render={({ field }) => (
                          <Select disabled={isReadOnly} onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dias">Días</SelectItem>
                              <SelectItem value="semanas">Semanas</SelectItem>
                              <SelectItem value="meses">Meses</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.intervaloTipo && <p className="text-sm text-red-500">{errors.intervaloTipo.message}</p>}
                    </div>
                  </div>
                )}

                {caducidadTipo === 'fechaFija' && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="fechaFija">Fecha de caducidad</Label>
                    <Controller
                        name="fechaFija"
                        control={control}
                        render={({ field }) => (
                          <Input id="fechaFija" type="date" {...field} disabled={isReadOnly} />
                        )}
                      />
                     {errors.fechaFija && <p className="text-sm text-red-500">{errors.fechaFija.message}</p>}
                  </div>
                )}
            </div>

            {/* --- Opciones (Checkboxes) --- */}
            <div className="space-y-4 border p-4 rounded-md md:col-span-3"> {/* Ajustado para ocupar todo el ancho en md */}
               <Label className="text-base font-medium">Opciones Adicionales</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Rejilla más densa */}
                <div className="flex items-center space-x-2">
                  <Controller
                    name="apareceEnApp"
                    control={control}
                    render={({ field }) => (
                       <Checkbox id="apareceEnApp" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />
                    )}
                  />
                  <Label htmlFor="apareceEnApp">Aparece en App / Self</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="soloParaPagoDeCitas" control={control} render={({ field }) => (<Checkbox id="soloParaPagoDeCitas" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="soloParaPagoDeCitas">Solo para pago de citas</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="descuentosAutomaticos" control={control} render={({ field }) => (<Checkbox id="descuentosAutomaticos" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="descuentosAutomaticos">Descuentos automáticos</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="descuentosManuales" control={control} render={({ field }) => (<Checkbox id="descuentosManuales" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="descuentosManuales">Descuentos manuales</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="aceptaPromociones" control={control} render={({ field }) => (<Checkbox id="aceptaPromociones" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="aceptaPromociones">Acepta promociones</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="aceptaEdicionPVP" control={control} render={({ field }) => (<Checkbox id="aceptaEdicionPVP" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="aceptaEdicionPVP">Acepta edición PVP</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="formaConPaquetesAutomaticamente" control={control} render={({ field }) => (<Checkbox id="formaConPaquetesAutomaticamente" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="formaConPaquetesAutomaticamente">Forma paquetes automát.</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="afectaEstadisticas" control={control} render={({ field }) => (<Checkbox id="afectaEstadisticas" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="afectaEstadisticas">Afecta estadísticas</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="deshabilitado" control={control} render={({ field }) => (<Checkbox id="deshabilitado" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="deshabilitado">Deshabilitado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller name="validoParaTodosPlanaTarifa" control={control} render={({ field }) => (<Checkbox id="validoParaTodosPlanaTarifa" checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />)} />
                  <Label htmlFor="validoParaTodosPlanaTarifa">Válido tarifa plana</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>
      <div className="fixed bottom-6 right-6 flex space-x-2 z-10">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
        >
          Volver
        </Button>

        {!isReadOnly && (
          <Button type="submit" disabled={isLoading} form="bono-form-id">
            {isLoading ? 'Guardando...' : bonoId ? 'Actualizar Bono' : 'Crear Bono'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default BonoForm; 