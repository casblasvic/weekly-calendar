'use client'

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark, Save, Info, Trash2, PlusCircle } from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateLegalEntityMutation } from '@/lib/hooks/mutations/legal-entities';
import { createLegalEntitySchema, type CreateLegalEntityPayload, type LegalEntityFormValues } from '@/lib/schemas/legal-entity-schemas';
import { useGetCountriesQuery, type CountryForSelector } from '@/lib/hooks/queries/countries';
import { useGetClinicsQuery, type ClinicForAssociation } from '@/lib/hooks/queries/clinics';

// Usamos el esquema Zod centralizado importado
const legalEntityFormSchema = createLegalEntitySchema;

// LegalEntityFormValues se importa directamente desde '@/lib/schemas/legal-entity-schemas'.
// Ya no es necesario inferirlo localmente.

export default function CreateLegalEntityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const createLegalEntity = useCreateLegalEntityMutation();
  const { data: countries, isLoading: isLoadingCountries } = useGetCountriesQuery();
  const { data: allClinics, isLoading: isLoadingClinics } = useGetClinicsQuery();

  const form = useForm<LegalEntityFormValues>({
    resolver: zodResolver(legalEntityFormSchema),
    defaultValues: {
      name: '',
      fullAddress: '',
      countryIsoCode: '',
      taxIdentifiers: [], // Cambiado de taxIdentifierFields: {} a taxIdentifiers: []
      notes: '',
      email: '',
      phone: '',
      phoneCountryIsoCode: '',
      clinicIds: [],
    },
  });

  // Inicializar useFieldArray para taxIdentifiers
  const { fields, append, remove } = useFieldArray<LegalEntityFormValues>({
    control: form.control,
    name: "taxIdentifiers", 
  });

  async function onSubmit(values: LegalEntityFormValues) {
    let taxIdentifierFieldsForApi: { [key: string]: string } | undefined = undefined;

    if (values.taxIdentifiers && values.taxIdentifiers.length > 0) {
      const reducedIdentifiers = values.taxIdentifiers.reduce((acc, item) => {
        if (item && typeof item.name === 'string' && item.name.trim() !== '' && typeof item.value === 'string' && item.value.trim() !== '') {
          acc[item.name.trim()] = item.value.trim();
        }
        return acc;
      }, {} as { [key: string]: string });

      // Si el objeto de identificadores reducidos no está vacío, asignarlo.
      // De lo contrario, taxIdentifierFieldsForApi permanecerá undefined.
      if (Object.keys(reducedIdentifiers).length > 0) {
        taxIdentifierFieldsForApi = reducedIdentifiers;
      }
    }

    const payload: CreateLegalEntityPayload = {
      name: values.name,
      fullAddress: values.fullAddress,
      countryIsoCode: values.countryIsoCode,
      notes: values.notes,
      email: values.email,
      phone: values.phone,
      phoneCountryIsoCode: values.phoneCountryIsoCode,
      clinicIds: values.clinicIds,
      taxIdentifierFields: taxIdentifierFieldsForApi, // Enviar el objeto transformado (o undefined)
    };

    createLegalEntity.mutate(payload, {
      onSuccess: (data) => {
        router.push('/configuracion/sociedades');
      },
      // onError se maneja en el hook
    });
  }

  return (
    <div className="container relative flex flex-col min-h-screen px-4 py-6 mx-auto">
      <div className="flex items-center mb-6">
        <Landmark className="w-6 h-6 mr-2 text-purple-600" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('config_legal_entities.create_page_title', 'Crear Nueva Sociedad Mercantil')}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCountries}>
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sección de Identificadores Fiscales Dinámicos */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-medium text-gray-800">{t('config_legal_entities.form.tax_identifiers_title', 'Identificadores Fiscales')}</h3>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-3 mb-3 border rounded-md">
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
                          <Input placeholder={t('config_legal_entities.form.tax_identifier_value_placeholder', 'Ej: B12345678')} {...valueField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label={t('common.remove', 'Eliminar')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: '', value: '' })}
                className="mt-2 text-sm"
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
                    <Input type="email" placeholder={t('config_legal_entities.form.email_placeholder', 'Ej: contacto@empresa.com')} {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCountries}>
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
                      <Input type="tel" placeholder={t('config_legal_entities.form.phone_number_placeholder', 'Ej: 912345678')} {...field} />
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
              {allClinics && allClinics.length === 0 && !isLoadingClinics && (
                <Alert variant="default" className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t('common.information', 'Información')}</AlertTitle>
                  <AlertDescription>
                    {t('config_legal_entities.form.no_clinics_found', 'No se encontraron clínicas para asociar. Primero debes crear clínicas.')}
                  </AlertDescription>
                </Alert>
              )}
              {allClinics && allClinics.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('config_legal_entities.clinics_table.clinic_name', 'Clínica')}</TableHead>
                      <TableHead>{t('config_legal_entities.clinics_table.association_status', 'Estado Asociación')}</TableHead>
                      <TableHead className="text-right">{t('config_legal_entities.clinics_table.associate', 'Asociar')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allClinics.map((clinic) => {
                      const isAssociatedToOther = clinic.legalEntity !== null;
                      const isSelected = form.watch('clinicIds')?.includes(clinic.id);

                      return (
                        <TableRow key={clinic.id}>
                          <TableCell className="font-medium">{clinic.name}</TableCell>
                          <TableCell>
                            {isAssociatedToOther ? (
                              <span className="text-xs text-yellow-600 font-medium">
                                {t('config_legal_entities.form.clinic_associated_to', 'Asociada a: {{legalEntityName}}', { legalEntityName: clinic.legalEntity!.name })}
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
                                  checked={isSelected}
                                  disabled={isAssociatedToOther} // Deshabilitado si ya está asociada a OTRA
                                  onCheckedChange={(checked) => {
                                    const currentClinicIds = field.value || [];
                                    if (checked) {
                                      form.setValue('clinicIds', [...currentClinicIds, clinic.id], { shouldDirty: true, shouldValidate: true });
                                    } else {
                                      form.setValue('clinicIds', currentClinicIds.filter((id) => id !== clinic.id), { shouldDirty: true, shouldValidate: true });
                                    }
                                  }}
                                  aria-label={`Asociar ${clinic.name}`}
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

          <div className="p-4 bg-white border rounded-lg shadow-sm md:p-6"> {/* Re-abrir un div para los campos que estaban después o crear uno nuevo */} 
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>{t('config_legal_entities.form.notes', 'Notas Adicionales')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('config_legal_entities.form.notes_placeholder', 'Cualquier información relevante...')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="fixed z-50 flex items-center gap-2 bottom-4 right-4">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={createLegalEntity.isPending}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Volver')}
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={createLegalEntity.isPending}>
              <Save className="w-4 h-4 mr-2" /> {t('common.save', 'Guardar')}
              {createLegalEntity.isPending && <span className="ml-2 animate-spin">⏳</span>}{/* TODO: Usar un componente Spinner real */}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
