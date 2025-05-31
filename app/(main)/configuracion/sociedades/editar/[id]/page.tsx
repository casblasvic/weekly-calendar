'use client'

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark, Save, Loader2, Trash2, PlusCircle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Info, AlertCircle } from 'lucide-react'; // AlertCircle ya estaba importado más abajo, lo consolido aquí.
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { 
  useUpdateLegalEntityMutation,
  useDeleteLegalEntityMutation
} from '@/lib/hooks/mutations/legal-entities';
import { updateLegalEntitySchema, type UpdateLegalEntityPayload } from '@/lib/schemas/legal-entity-schemas';
import { useGetLegalEntityByIdQuery } from '@/lib/hooks/queries/legal-entities';
import { useGetClinicsQuery, type ClinicForAssociation } from '@/lib/hooks/queries/clinics'; // <-- Añadir hook y tipo de clínicas
import { useGetCountriesQuery, type CountryForSelector } from '@/lib/hooks/queries/countries';

// Usamos el esquema Zod para actualización
const legalEntityFormSchema = updateLegalEntitySchema; // updateLegalEntitySchema es createLegalEntitySchema.partial()

// Tipo para los valores del formulario, inferido del esquema Zod de actualización
type LegalEntityFormValues = z.infer<typeof legalEntityFormSchema>;

export default function EditLegalEntityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const entityId = params.id as string; // El ID de la URL

  const {
    data: legalEntityData,
    isLoading: isLoadingEntity,
    isError: isErrorLoadingEntity,
    error: loadingError,
  } = useGetLegalEntityByIdQuery(entityId, { enabled: !!entityId });

  const updateLegalEntity = useUpdateLegalEntityMutation();

  const { 
    data: clinicsData,
    isLoading: isLoadingClinics,
    isError: isErrorLoadingClinics,
    error: clinicsLoadingError
  } = useGetClinicsQuery();

  const deleteLegalEntity = useDeleteLegalEntityMutation(); // <-- Instanciar hook
  const { data: countries, isLoading: isLoadingCountries } = useGetCountriesQuery();

  const form = useForm<LegalEntityFormValues>({
    resolver: zodResolver(legalEntityFormSchema),
    defaultValues: {
      name: '',
      fullAddress: '',
      countryIsoCode: '',
      taxIdentifiers: [], // Para useFieldArray, igual que en 'nueva'
      notes: '',
      email: '',
      phone: '',
      phoneCountryIsoCode: '',
      clinicIds: [], // Inicializar clinicIds como array vacío
    },
  });

  // Inicializar useFieldArray para taxIdentifiers
  const { fields, append, remove, replace } = useFieldArray<LegalEntityFormValues>({
    control: form.control,
    name: "taxIdentifiers", 
  });

  // Popular el formulario cuando los datos de la entidad se carguen
  useEffect(() => {
    if (legalEntityData && countries && form.reset && replace) {
      const resetData = { 
        name: legalEntityData.name || '',
        taxId: legalEntityData.taxId || '',
        legalForm: legalEntityData.legalForm || '',
        registrationNumber: legalEntityData.registrationNumber || '',
        fullAddress: legalEntityData.fullAddress || '',
        countryIsoCode: legalEntityData.countryIsoCode || '',
        email: legalEntityData.email || '',
        phoneCountryIsoCode: legalEntityData.phoneCountryIsoCode || '',
        phone: legalEntityData.phone || '',
        notes: legalEntityData.notes || '',
        clinicIds: legalEntityData.clinics?.map(clinic => clinic.id) || [],
      };
      form.reset(resetData);

      // Transformar taxIdentifierFields (objeto) a taxIdentifiers (array para useFieldArray)
      if (legalEntityData.taxIdentifierFields) {
        replace(Object.entries(legalEntityData.taxIdentifierFields).map(([countryCode, value]) => ({ name: countryCode, value: (value as string) || '' })));
      } else {
        replace([]);
      }
    }
  }, [legalEntityData, countries, form.reset, replace]); // Dependencias actualizadas

  async function onSubmit(values: LegalEntityFormValues) {
    console.log("Form values on submit:", values);
    console.log("Form errors:", form.formState.errors);

    if (!entityId) return;

    // Asegurarse de que solo se envían los campos que han cambiado o están definidos.
    // react-hook-form con Zod ya maneja esto parcialmente, pero podemos ser explícitos.
    // El schema `partial()` de Zod ayuda a que solo los campos presentes se validen.
    let taxIdentifierFieldsForApi: { [key: string]: string } | undefined = undefined;
    if (values.taxIdentifiers && values.taxIdentifiers.length > 0) {
      const reducedIdentifiers = values.taxIdentifiers.reduce((acc, item) => {
        if (item && typeof item.name === 'string' && item.name.trim() !== '' && typeof item.value === 'string' && item.value.trim() !== '') {
          acc[item.name.trim()] = item.value.trim();
        }
        return acc;
      }, {} as { [key: string]: string });
      if (Object.keys(reducedIdentifiers).length > 0) {
        taxIdentifierFieldsForApi = reducedIdentifiers;
      }
    }

    // Construir el payload para la API, excluyendo taxIdentifiers (array) e incluyendo taxIdentifierFields (objeto)
    const { taxIdentifiers, ...restOfValues } = values;
    const payloadForApi: UpdateLegalEntityPayload = {
      ...restOfValues,
      taxIdentifierFields: taxIdentifierFieldsForApi,
    };

    updateLegalEntity.mutate(
      { id: entityId, payload: payloadForApi }, 
      {
        onSuccess: (data) => {
          // Opcional: Mostrar notificación de éxito
          // toast({ title: t('config_legal_entities.update_success_title'), description: t('config_legal_entities.update_success_message', { entityName: data.name }) });
          router.push('/configuracion/sociedades');
        },
        onError: (error) => {
          // Opcional: Mostrar notificación de error
          // toast({ variant: 'destructive', title: t('common.error_occurred_title'), description: error.message || t('common.error_try_again') });
          console.error("Error updating legal entity:", error);
        },
      }
    );
  }

  if (isLoadingEntity || isLoadingClinics || isLoadingCountries) { // <-- Incluir isLoadingCountries
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="ml-2">{t('common.loading', isLoadingEntity ? 'Cargando datos de la sociedad...' : isLoadingClinics ? 'Cargando lista de clínicas...' : 'Cargando lista de países...')}</p>
      </div>
    );
  }

  if (isErrorLoadingEntity || isErrorLoadingClinics) { // <-- Incluir isErrorLoadingClinics
    return (
      <div className="container py-10 mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>{t('common.error_loading_data', 'Error al Cargar Datos')}</AlertTitle>
          <AlertDescription>
            {isErrorLoadingEntity ? (loadingError?.message || t('common.error_try_again', 'Hubo un problema al cargar los datos de la sociedad. Por favor, inténtalo de nuevo.')) : (clinicsLoadingError?.message || t('common.error_try_again', 'Hubo un problema al cargar la lista de clínicas. Por favor, inténtalo de nuevo.'))}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Volver')}
        </Button>
      </div>
    );
  }

  if (!legalEntityData && !isLoadingEntity) {
    // Esto podría pasar si el ID no es válido o la entidad no se encuentra después de cargar
    return (
        <div className="container py-10 mx-auto">
            <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>{t('config_legal_entities.not_found_title', 'Sociedad no encontrada')}</AlertTitle>
                <AlertDescription>
                    {t('config_legal_entities.not_found_desc', 'No se pudo encontrar la sociedad mercantil especificada.')}
                </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Volver')}
            </Button>
        </div>
    );
}


  return (
    <div className="container relative flex flex-col min-h-screen px-4 py-6 mx-auto">
      <div className="flex items-center mb-6">
        <Landmark className="w-6 h-6 mr-2 text-purple-600" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('config_legal_entities.edit_page_title', 'Editar Sociedad Mercantil')}: {legalEntityData?.name || t('common.loading', 'Cargando...')}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="p-4 bg-white border rounded-lg shadow-sm md:p-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>{t('config_legal_entities.form.name', 'Nombre de la Sociedad')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('config_legal_entities.form.name_placeholder', 'Ej: Mi Empresa S.L.')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countryIsoCode"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>{t('config_legal_entities.form.country', 'País (Jurisdicción Fiscal)')}</FormLabel>
                  <Select
                    onValueChange={(newValueFromSelect) => {
                      // Si el Select intenta poner un string vacío, pero el campo ya tiene un valor (ej: "MA" de form.reset),
                      // ignoramos este intento de "limpieza" para no perder el valor recién establecido.
                      if (newValueFromSelect === '' && field.value !== '') {
                        // No hacer nada, mantener el valor actual del formulario
                      } else {
                        field.onChange(newValueFromSelect);
                      }
                    }}
                    value={field.value || ''}
                    disabled={isLoadingCountries}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('config_legal_entities.form.country_select_placeholder', 'Selecciona un país')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries?.map((country: CountryForSelector) => (
                        <SelectItem key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullAddress"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>{t('config_legal_entities.form.fullAddress', 'Dirección Fiscal Completa')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('config_legal_entities.form.fullAddress_placeholder', 'Ej: Calle Falsa 123, Ciudad, Provincia, CP, País')}
                      {...field} value={field.value || ''} // Asegurar que el valor no sea null/undefined para el textarea controlado
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sección de Identificadores Fiscales Dinámicos */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-medium text-gray-800">{t('config_legal_entities.form.tax_identifiers_title', 'Identificadores Fiscales')}</h3>
              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="flex items-end gap-4 p-3 mb-3 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`taxIdentifiers.${index}.name` as const}
                    render={({ field: nameField }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{t('config_legal_entities.form.tax_identifier_name', 'Nombre del Identificador')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('config_legal_entities.form.tax_identifier_name_placeholder', 'Ej: CIF, NIF, VAT ID') } {...nameField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`taxIdentifiers.${index}.value` as const}
                    render={({ field: valueField }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{t('config_legal_entities.form.tax_identifier_value', 'Valor del Identificador')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('config_legal_entities.form.tax_identifier_value_placeholder', 'Ej: B12345678') } {...valueField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={t('common.remove', 'Eliminar')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', value: '' })}
                className="mt-2 text-purple-600 border-purple-600 hover:bg-purple-50 hover:text-purple-700"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('config_legal_entities.form.add_tax_identifier', 'Añadir Identificador Fiscal')}
              </Button>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>{t('config_legal_entities.form.email', 'Email de Contacto')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('config_legal_entities.form.email_placeholder', 'Ej: contacto@empresa.com')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="phoneCountryIsoCode"
                render={({ field }) => (
                  <FormItem className="mb-4 md:col-span-1">
                    <FormLabel>{t('config_legal_entities.form.phone_country', 'Prefijo Telefónico')}</FormLabel>
                    <Select
                      onValueChange={(newValueFromSelect) => {
                        // Si el Select intenta poner un string vacío, pero el campo ya tiene un valor (ej: "MA" de form.reset),
                        // ignoramos este intento de "limpieza" para no perder el valor recién establecido.
                        if (newValueFromSelect === '' && field.value !== '') {
                          // No hacer nada, mantener el valor actual del formulario
                        } else {
                          field.onChange(newValueFromSelect);
                        }
                      }}
                      value={field.value || ''}
                      disabled={isLoadingCountries}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('config_legal_entities.form.phone_country_select_placeholder', 'País')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries?.map((country: CountryForSelector) => (
                          <SelectItem key={`phone-${country.isoCode}`} value={country.isoCode}>
                            {`${country.name} (+${country.phoneCode})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="mb-4 md:col-span-2">
                    <FormLabel>{t('config_legal_entities.form.phone_number', 'Número de Teléfono')}</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder={t('config_legal_entities.form.phone_number_placeholder', 'Ej: 912345678')} {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* TODO: Aquí irían los campos dinámicos para taxIdentifierFields basados en el país seleccionado */}
          </div> {/* Cierre del Card de datos principales */}

          {/* Sección para Asociar Clínicas */}
          <Card>
            <CardHeader>
              <CardTitle>{t('config_legal_entities.form.associated_clinics_title', 'Clínicas Asociadas')}</CardTitle>
              <FormDescription>
                {t('config_legal_entities.form.associated_clinics_description', 'Selecciona las clínicas que pertenecerán a esta sociedad mercantil.')}
              </FormDescription>
            </CardHeader>
            <CardContent>
              {isLoadingClinics && <p>{t('common.loading', 'Cargando clínicas...')}</p>}
              {clinicsData && clinicsData.length === 0 && !isLoadingClinics && (
                <Alert variant="default" className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t('common.information', 'Información')}</AlertTitle>
                  <AlertDescription>
                    {t('config_legal_entities.form.no_clinics_found', 'No se encontraron clínicas para asociar. Primero debes crear clínicas.')}
                  </AlertDescription>
                </Alert>
              )}
              {clinicsData && clinicsData.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('config_legal_entities.clinics_table.clinic_name', 'Clínica')}</TableHead>
                      <TableHead>{t('config_legal_entities.clinics_table.association_status', 'Estado Asociación')}</TableHead>
                      <TableHead className="text-right">{t('config_legal_entities.clinics_table.associate', 'Asociar')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinicsData.map((clinic: ClinicForAssociation) => {
                      const isAssociatedToAnotherEntity = clinic.legalEntity !== null && clinic.legalEntity.id !== entityId;
                      return (
                        <TableRow key={clinic.id}>
                          <TableCell className="font-medium">{clinic.name}</TableCell>
                          <TableCell>
                            {clinic.legalEntity?.name ? ( // Usamos optional chaining por si legalEntity o su nombre no existen
                              <span className={`text-xs font-medium ${clinic.legalEntity.id === entityId ? 'text-green-600' : 'text-yellow-600'}`}>
                                {t('config_legal_entities.form.clinic_associated_to', 'Asociada a: {{legalEntityName}}', { legalEntityName: clinic.legalEntity.name })}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {t('config_legal_entities.form.clinic_not_associated', 'Sin sociedad asignada')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <FormField
                              control={form.control}
                              name="clinicIds"
                              render={({ field }) => (
                                <Switch
                                  checked={field.value?.includes(clinic.id)}
                                  disabled={isAssociatedToAnotherEntity}
                                  onCheckedChange={(checked) => {
                                    const currentClinicIds = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentClinicIds, clinic.id]);
                                    } else {
                                      field.onChange(currentClinicIds.filter(id => id !== clinic.id));
                                    }
                                  }}
                                  aria-label={`${t('config_legal_entities.clinics_table.associate_aria_label', 'Asociar clínica')} ${clinic.name}`}
                                />
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('config_legal_entities.form.notes_title', 'Notas Adicionales')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_legal_entities.form.notes_label', 'Contenido de las notas')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('config_legal_entities.form.notes_placeholder', 'Cualquier información relevante...')}
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="fixed z-50 flex items-center gap-2 bottom-4 right-4">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={updateLegalEntity.isPending || deleteLegalEntity.isPending}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Volver')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" disabled={updateLegalEntity.isPending || deleteLegalEntity.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" /> {t('common.delete', 'Eliminar')}
                  {deleteLegalEntity.isPending && <Loader2 className="ml-2 w-4 h-4 animate-spin" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('config_legal_entities.delete_confirm_title', '¿Estás seguro?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('config_legal_entities.delete_confirm_desc', 'Esta acción no se puede deshacer. Esto eliminará permanentemente la sociedad mercantil y desasociará todas sus clínicas. Las clínicas no serán eliminadas.')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel', 'Cancelar')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      deleteLegalEntity.mutate(entityId, {
                        onSuccess: () => {
                          router.push('/configuracion/sociedades');
                        }
                      });
                    }}
                    disabled={deleteLegalEntity.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleteLegalEntity.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {t('common.confirm_delete', 'Sí, eliminar')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={updateLegalEntity.isPending || form.formState.isSubmitting || deleteLegalEntity.isPending || !form.formState.isValid && form.formState.isSubmitted}
            >
              <Save className="w-4 h-4 mr-2" /> {t('common.save_changes', 'Guardar Cambios')}
              {(updateLegalEntity.isPending || form.formState.isSubmitting) && <Loader2 className="ml-2 w-4 h-4 animate-spin" />}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
