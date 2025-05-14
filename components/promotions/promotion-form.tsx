"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PromotionSchema } from '@/lib/schemas/promotion';
import {
    Promotion,
    PromotionTargetScope,
    PromotionType,
    PromotionAccumulationMode,
    Service,
    Product,
    Category,
    Tariff,
    BonoDefinition,
    PackageDefinition,
    Clinic
} from '@prisma/client';
import { useTranslation } from 'react-i18next';
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Check, ChevronsUpDown, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery } from '@tanstack/react-query';
import { Label } from "@/components/ui/label";
import { useSearchParams } from 'next/navigation';

// Definir el tipo para los datos del formulario basados en el schema Zod
export type PromotionFormValues = z.infer<typeof PromotionSchema>;

// --- Interfaces simplificadas para las listas de opciones --- 
interface SelectOption {
    value: string;
    label: string;
}

interface CompatiblePromotionOption {
    id: string;
    name: string;
    clinicNames: string[];
}

// --- Interfaces simplificadas para las promociones compatibles --- 
interface PromotionFormProps {
  initialData?: PromotionFormValues & { id?: string }; // Hacer opcional el ID
  onSubmit: (data: PromotionFormValues) => Promise<void>; // Función a llamar al enviar
  onCancel?: () => void; // Función opcional para cancelar
  isLoading: boolean; // Estado de carga general (p.ej. cargando datos iniciales)
  isSubmitting?: boolean; // Estado específico de envío del formulario
  errorMessage?: string | null;
}

// --- Función fetch ACTUALIZADA para promociones elegibles --- 
const fetchEligiblePromotions = async (
  currentPromotionId?: string, 
  currentClinicIds?: string[] // Array de IDs de clínicas
): Promise<CompatiblePromotionOption[]> => {
    
    let url = '/api/promotions/eligible-for-compatibility'; 
    const params = new URLSearchParams();

    if (currentPromotionId) {
        params.append('excludeId', currentPromotionId);
    }
    if (currentClinicIds && currentClinicIds.length > 0) {
        params.append('currentClinicIds', currentClinicIds.join(','));
    }
    
    const urlWithParams = `${url}?${params.toString()}`;
    console.log("[fetchEligiblePromotions] Calling URL:", urlWithParams); 
    
    const response = await fetch(urlWithParams);
    
    if (!response.ok) {
        console.error("[fetchEligiblePromotions] Error response:", response.status, response.statusText);
        const errorBody = await response.text(); // Intentar leer el cuerpo del error
        console.error("[fetchEligiblePromotions] Error body:", errorBody);
        throw new Error('Failed to fetch eligible promotions');
    }
    
    const data = await response.json();
    console.log("[fetchEligiblePromotions] Received data:", data);
    
    return Array.isArray(data) ? data : []; 
};

export function PromotionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  isSubmitting, // Usar isSubmitting para los botones
  errorMessage,
}: PromotionFormProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const preselectedClinicId = searchParams.get('preselectedClinicId');
  const redirectBackTo = searchParams.get('redirectBackTo');

  useEffect(() => {
    console.log("[PromotionForm] preselectedClinicId:", preselectedClinicId);
    console.log("[PromotionForm] redirectBackTo:", redirectBackTo);
  }, [preselectedClinicId, redirectBackTo]);

  // Estados para las listas de opciones de los Selects/Combobox
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [bonoDefinitions, setBonoDefinitions] = useState<BonoDefinition[]>([]);
  const [packageDefinitions, setPackageDefinitions] = useState<PackageDefinition[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // <<< NUEVO: Estado para controlar "Aplicar a Todas" >>>
  // Inicializar basado en si initialData tiene clínicas o no
  const [applyToAllClinics, setApplyToAllClinics] = useState(() => {
    // Modo edición: Basado en los datos iniciales
    if (initialData) {
      return !initialData.applicableClinicIds || initialData.applicableClinicIds.length === 0;
    }
    // Modo creación: Inverso a si hay clínica preseleccionada
    return !preselectedClinicId;
  });

  // Convertir fechas string a objetos Date si existen en initialData
  let processedInitialData: Partial<PromotionFormValues> & { applicableClinicIds?: string[] } = {};
  if (initialData) {
      processedInitialData = {
          ...initialData,
          startDate: initialData.startDate ? new Date(initialData.startDate) : undefined,
          endDate: initialData.endDate ? new Date(initialData.endDate) : undefined,
          // Asegurarse de que applicableClinicIds sea un array
          applicableClinicIds: Array.isArray(initialData.applicableClinicIds) ? initialData.applicableClinicIds : [],
      };
  }

  // Valores predeterminados combinados con datos iniciales formateados
  const defaultValues: Partial<PromotionFormValues> = {
      name: "",
      description: "",
      code: "",
      isActive: true,
      type: PromotionType.PERCENTAGE_DISCOUNT,
      targetScope: PromotionTargetScope.SPECIFIC_SERVICE,
      applicableClinicIds: preselectedClinicId && !initialData
                           ? [preselectedClinicId]
                           : processedInitialData.applicableClinicIds || [],
      accumulationMode: PromotionAccumulationMode.EXCLUSIVE,
      compatiblePromotionIds: [],
      // Los demás campos numéricos y de ID serán undefined por defecto
      ...processedInitialData,
  };
  const form = useForm<PromotionFormValues>({
    // Se realiza una aserción de tipo explícita (type assertion) para intentar resolver
    // un conflicto de tipos reportado por TypeScript. Este error específico ("Resolver" vs "Resolver"
    // del mismo path) usualmente indica un problema con las dependencias (ej. versiones incompatibles,
    // duplicados) o el entorno de build (ej. caché).
    // Se recomienda verificar versiones de 'react-hook-form' y '@hookform/resolvers',
    // y probar eliminando 'node_modules' y 'package-lock.json'/'yarn.lock' y reinstalando (npm install / yarn install).
    // Nota: Esta solución asume que el tipo 'Resolver' puede ser importado desde 'react-hook-form'.
    // Si no funciona, considera usar 'as any' como último recurso mientras investigas el problema de fondo.
    resolver: zodResolver(PromotionSchema) as import('react-hook-form').Resolver<PromotionFormValues>,
    defaultValues: defaultValues,
    mode: "onChange",
  });

  // --- Carga de datos para los Selects --- 
  useEffect(() => {
      const loadOptions = async () => {
          setIsLoadingOptions(true);
          try {
              const [servicesRes, productsRes, categoriesRes, tariffsRes, bonosRes, packagesRes, clinicsRes] = await Promise.all([
                  fetch('/api/services?limit=1000'),
                  fetch('/api/products?limit=1000'),
                  fetch('/api/categories?limit=1000'),
                  fetch('/api/tariffs?limit=1000'),
                  fetch('/api/bono-definitions?limit=1000'),
                  fetch('/api/package-definitions?limit=1000'),
                  fetch('/api/clinics?limit=1000')
              ]);

              const parseJsonResponse = async (response: Response, resourceName: string) => {
                  if (!response.ok) throw new Error(`${resourceName}: ${response.statusText}`);
                  const data = await response.json();
                  if (Array.isArray(data)) {
                      return data;
                  } else if (data && typeof data === 'object') {
                      const pluralKey = Object.keys(data).find(key => Array.isArray(data[key]));
                      if (pluralKey) {
                          return data[pluralKey];
                      }
                      if (Array.isArray(data.data)) {
                          return data.data;
                      }
                  }
                  console.warn(`Respuesta inesperada para ${resourceName}, se esperaba un array o un objeto con una clave de array. Recibido:`, data);
                  return [];
              };

              setServices(await parseJsonResponse(servicesRes, 'Servicios'));
              setProducts(await parseJsonResponse(productsRes, 'Productos'));
              setCategories(await parseJsonResponse(categoriesRes, 'Categorías'));
              setTariffs(await parseJsonResponse(tariffsRes, 'Tarifas'));
              setBonoDefinitions(await parseJsonResponse(bonosRes, 'Bonos'));
              setPackageDefinitions(await parseJsonResponse(packagesRes, 'Paquetes'));
              setClinics(await parseJsonResponse(clinicsRes, 'Clínicas'));

          } catch (error: any) {
              console.error("Error loading select options:", error);
              toast({
                  variant: "destructive",
                  title: t('common.errors.loadingTitle'),
                  description: `${t('common.errors.loadingDesc')} (${error.message})`,
              });
              setServices([]);
              setProducts([]);
              setCategories([]);
              setTariffs([]);
              setBonoDefinitions([]);
              setPackageDefinitions([]);
              setClinics([]);
          } finally {
              setIsLoadingOptions(false);
          }
      };
      loadOptions();
  }, [t]);

  // Resetear el formulario si los datos iniciales cambian (modo edición)
  useEffect(() => {
    if (initialData) {
        const resetData = {
            ...initialData,
            startDate: initialData.startDate ? new Date(initialData.startDate) : undefined,
            endDate: initialData.endDate ? new Date(initialData.endDate) : undefined,
        };
      // Filtrar claves que no existen en PromotionFormValues para evitar error de react-hook-form
      const baseSchema = PromotionSchema._def.schema; // Acceder al ZodObject base
      const validKeys = Object.keys(baseSchema.shape) as Array<keyof PromotionFormValues>;
      const filteredResetData = Object.fromEntries(
          Object.entries(resetData).filter(([key]) => validKeys.includes(key as keyof PromotionFormValues))
      ) as Partial<PromotionFormValues>;
      form.reset(filteredResetData);
    }
  }, [initialData, form]); // Dependencia 'form' es más estable que form.reset

  // --- OBSERVAR clinicIds seleccionadas --- 
  const watchedClinicIds = form.watch("applicableClinicIds");

  // --- Obtener ID de la promoción actual (si existe) ---
  const currentPromotionId = initialData?.id;

  // --- Hook ACTUALIZADO para obtener promociones ELEGIBLES --- 
  const { 
      data: eligiblePromotions = [], 
      isLoading: isLoadingEligible, 
      error: eligibleError 
  } = useQuery<CompatiblePromotionOption[], Error>({
      queryKey: ['eligiblePromotions', currentPromotionId, JSON.stringify(watchedClinicIds?.sort())], 
      queryFn: () => fetchEligiblePromotions(currentPromotionId, watchedClinicIds),
      enabled: true, 
      staleTime: 5 * 60 * 1000, 
      refetchOnWindowFocus: false, 
  });

  // --- Lógica condicional para mostrar campos ---
  const promotionType = form.watch("type");
  const targetScope = form.watch("targetScope");
  const accumulationMode = form.watch("accumulationMode");
  const isBogo = promotionType === PromotionType.BUY_X_GET_Y_SERVICE || promotionType === PromotionType.BUY_X_GET_Y_PRODUCT;

  // --- Calcular tarifa de la clínica preseleccionada --- 
  const clinicTariffData = React.useMemo(() => {
    if (preselectedClinicId && clinics.length > 0 && tariffs.length > 0) {
      const clinic = clinics.find(c => c.id === preselectedClinicId);
      if (clinic && clinic.tariffId) {
        const tariff = tariffs.find(t => t.id === clinic.tariffId);
        return {
          id: clinic.tariffId,
          name: tariff?.name || t('common.unknown'),
        };
      }
    }
    return null;
  }, [preselectedClinicId, clinics, tariffs, t]);

  // --- Efecto para auto-seleccionar la tarifa si aplica --- 
  useEffect(() => {
    if (targetScope === PromotionTargetScope.TARIFF && clinicTariffData) {
      form.setValue('targetTariffId', clinicTariffData.id, { shouldValidate: true });
    } 
    // Opcional: Limpiar si el scope cambia o no hay clínica preseleccionada con tarifa
    // else if (form.getValues('targetTariffId') && targetScope !== PromotionTargetScope.TARIFF) {
    //   form.setValue('targetTariffId', null);
    // } 
    // Nota: La limpieza general por cambio de scope ya se maneja en otro useEffect
  }, [targetScope, clinicTariffData, form]);

  // --- Efecto para limpiar campos de ID específicos cuando cambia targetScope ---
  useEffect(() => {
      // Lista de todos los posibles campos de ID de objetivo
      const targetIdFields: (keyof PromotionFormValues)[] = [
          'targetServiceId',
          'targetProductId',
          'targetCategoryId',
          'targetTariffId',
          'targetBonoDefinitionId',
          'targetPackageDefinitionId'
      ];
      // Limpiar todos los campos excepto el que correspondería al nuevo scope
      targetIdFields.forEach(fieldName => {
          let shouldKeep = false;
          if (targetScope === PromotionTargetScope.SPECIFIC_SERVICE && fieldName === 'targetServiceId') shouldKeep = true;
          if (targetScope === PromotionTargetScope.SPECIFIC_PRODUCT && fieldName === 'targetProductId') shouldKeep = true;
          if (targetScope === PromotionTargetScope.CATEGORY && fieldName === 'targetCategoryId') shouldKeep = true;
          if (targetScope === PromotionTargetScope.TARIFF && fieldName === 'targetTariffId') shouldKeep = true;
          if (targetScope === PromotionTargetScope.SPECIFIC_BONO && fieldName === 'targetBonoDefinitionId') shouldKeep = true;
          if (targetScope === PromotionTargetScope.SPECIFIC_PACKAGE && fieldName === 'targetPackageDefinitionId') shouldKeep = true;

          if (!shouldKeep) {
              form.setValue(fieldName, null); // Poner a null o undefined según el schema
          }
      });
  }, [targetScope, form]); // Ejecutar cuando targetScope cambie

  // --- Efecto para limpiar campos BOGO si el tipo no es BOGO ---
  useEffect(() => {
    const isBogoType = 
      promotionType === PromotionType.BUY_X_GET_Y_SERVICE || 
      promotionType === PromotionType.BUY_X_GET_Y_PRODUCT;

    if (!isBogoType) {
      // Limpiar campos BOGO si el tipo actual NO es BOGO
      form.setValue('bogoBuyQuantity', null);
      form.setValue('bogoGetQuantity', null);
      form.setValue('bogoGetServiceId', null);
      form.setValue('bogoGetProductId', null);
      form.setValue('bogoGetValue', null);
    }
    // No es necesario limpiar los campos de target aquí, eso ya lo hace el otro useEffect
  }, [promotionType, form]); // Ejecutar cuando promotionType cambie
  // --- Fin efecto limpieza BOGO ---

  // Efecto para sincronizar el estado SOLO si initialData cambia (modo edición)
  useEffect(() => {
    if (initialData) {
        setApplyToAllClinics(
            !initialData.applicableClinicIds || initialData.applicableClinicIds.length === 0
        );
    }
  }, [initialData?.applicableClinicIds]);

  // --- Handler para el Checkbox "Aplicar a Todas" --- 
  const handleApplyToAllChange = (checked: boolean) => {
    console.log("[handleApplyToAllChange] Checked:", checked);
    if (preselectedClinicId && checked) {
        toast({
            title: t('promotions.form.cannot_apply_all_when_preselected_title'),
            description: t('promotions.form.cannot_apply_all_when_preselected_desc'),
            variant: 'default',
        });
        return;
    }
    setApplyToAllClinics(checked);
  };

  // Función interna para manejar el submit
  // La lógica de toast se maneja en la página que llama al formulario
  const processSubmit = (values: PromotionFormValues) => {
    console.log('PromotionForm: processSubmit called with values:', values);
    // Convertir valores numéricos potencialmente string a números o null
    const dataToSend = {
      ...values,
      // Si "Aplicar a Todas" está marcado, asegurar que applicableClinicIds sea un array vacío
      applicableClinicIds: applyToAllClinics ? [] : (values.applicableClinicIds || []),
      // Convertir strings vacíos de IDs a null si es necesario por el backend/Prisma
      targetServiceId: values.targetServiceId || null,
      targetProductId: values.targetProductId || null,
      targetCategoryId: values.targetCategoryId || null,
      targetTariffId: values.targetTariffId || null,
      targetBonoDefinitionId: values.targetBonoDefinitionId || null,
      targetPackageDefinitionId: values.targetPackageDefinitionId || null,
      bogoGetServiceId: values.bogoGetServiceId || null,
      bogoGetProductId: values.bogoGetProductId || null,
      // Asegurarse de que los valores numéricos opcionales se envían como null si están vacíos/NaN
      // (zod `coerce` ya maneja mucho de esto, pero una verificación extra puede ser útil)
      value: values.value ? Number(values.value) : null,
      bogoBuyQuantity: values.bogoBuyQuantity !== undefined && values.bogoBuyQuantity !== null ? Number(values.bogoBuyQuantity) : null,
      bogoGetQuantity: values.bogoGetQuantity !== undefined && values.bogoGetQuantity !== null ? Number(values.bogoGetQuantity) : null,
      bogoGetValue: values.bogoGetValue !== undefined && values.bogoGetValue !== null ? Number(values.bogoGetValue) : null,
      minPurchaseAmount: values.minPurchaseAmount !== undefined && values.minPurchaseAmount !== null ? Number(values.minPurchaseAmount) : null,
      maxDiscountAmount: values.maxDiscountAmount !== undefined && values.maxDiscountAmount !== null ? Number(values.maxDiscountAmount) : null,
      maxTotalUses: values.maxTotalUses !== undefined && values.maxTotalUses !== null ? Number(values.maxTotalUses) : null,
      maxUsesPerClient: values.maxUsesPerClient !== undefined && values.maxUsesPerClient !== null ? Number(values.maxUsesPerClient) : null,
      accumulationMode: values.accumulationMode || null,
      compatiblePromotionIds: values.compatiblePromotionIds || [],
    };
    console.log("Submitting values:", dataToSend);
    onSubmit(dataToSend);
  };

  // --- Componente reutilizable para Combobox --- 
  const renderComboboxField = (
      fieldName: keyof PromotionFormValues,
      options: SelectOption[],
      labelKey: string,
      placeholderKey: string,
      searchPlaceholderKey: string,
      emptyPlaceholderKey: string
  ) => (
      <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
              <FormItem className="flex flex-col">
                  <FormLabel>{t(labelKey)}</FormLabel>
                  <Popover>
                      <PopoverTrigger asChild>
                          <FormControl>
                              <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                  )}
                                  disabled={isLoading || isSubmitting || isLoadingOptions || applyToAllClinics || !!preselectedClinicId}
                              >
                                  {field.value
                                      ? options.find(
                                            (option) => option.value === field.value
                                        )?.label
                                      : t(placeholderKey)}
                                  <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                              </Button>
                          </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                          <Command>
                              <CommandInput placeholder={t(searchPlaceholderKey)} />
                              <CommandList>
                                  <CommandEmpty>{t(emptyPlaceholderKey)}</CommandEmpty>
                                  <CommandGroup>
                                      {options.map((option) => (
                                          <CommandItem
                                              value={option.label} // Buscar por label
                                              key={option.value}
                                              onSelect={() => {
                                                  form.setValue(fieldName, option.value);
                                              }}
                                          >
                                              <Check
                                                  className={cn(
                                                      "mr-2 h-4 w-4",
                                                      option.value === field.value
                                                          ? "opacity-100"
                                                          : "opacity-0"
                                                  )}
                                              />
                                              {option.label}
                                          </CommandItem>
                                      ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
                  <FormMessage />
              </FormItem>
          )}
      />
  );

  return (
    <Form {...form}>
      <div className="max-w-5xl pb-24 mx-auto space-y-8">
        <form
          id="promotion-form-id"
          onSubmit={form.handleSubmit(processSubmit)}
          className="space-y-8"
        >
          {/* SECCIÓN: Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle>{t("promotions.form.sections.basic_info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
              {/* Columna 1: Nombre y Descripción */}
              <div className="col-span-1 space-y-6">
                {/* Nombre */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("promotions.form.name.label")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("promotions.form.name.placeholder")} {...field} disabled={isLoading || isSubmitting || isLoadingOptions} />
                      </FormControl>
                      <FormDescription>
                        {t("promotions.form.name.description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("promotions.form.description.label")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("promotions.form.description.placeholder")}
                          className="h-24 resize-none"
                          {...field}
                          value={field.value ?? ''}
                          disabled={isLoading || isSubmitting || isLoadingOptions}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("promotions.form.description.description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Columna 2: Código y Activo */}
              <div className="col-span-1 space-y-6">
                {/* Código */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("promotions.form.code.label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("promotions.form.code.placeholder")}
                          {...field}
                          value={field.value ?? ''}
                          disabled={isLoading || isSubmitting || isLoadingOptions}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("promotions.form.code.description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Activo */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 h-[calc(theme(height.24)_+_2px)]">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t("promotions.form.isActive.label")}
                        </FormLabel>
                        <FormDescription>
                          {t("promotions.form.isActive.description")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading || isSubmitting || isLoadingOptions}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN: Tipo y Valor */}
          <Card>
            <CardHeader>
              <CardTitle>{t("promotions.form.sections.type_and_value")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
              {/* Tipo */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("promotions.form.type.label")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isSubmitting || isLoadingOptions}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("promotions.form.type.placeholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PromotionType).map((typeValue) => (
                          <SelectItem key={typeValue} value={typeValue}>
                            {t(`enums.PromotionType.${typeValue}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("promotions.form.type.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Valor (si no es BOGO) */}
              {!isBogo && (
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => {
                    let placeholder = "";
                    let description = "";
                    switch (promotionType) {
                        case PromotionType.PERCENTAGE_DISCOUNT:
                            placeholder = t("promotions.form.value.placeholder_percentage");
                            description = t("promotions.form.value.description_percentage");
                            break;
                        case PromotionType.FIXED_AMOUNT_DISCOUNT:
                            placeholder = t("promotions.form.value.placeholder_fixed");
                            description = t("promotions.form.value.description_fixed");
                            break;
                        case PromotionType.POINTS_MULTIPLIER:
                            placeholder = t("promotions.form.value.placeholder_multiplier");
                            description = t("promotions.form.value.description_multiplier");
                            break;
                        default:
                            placeholder = "Introduce el valor";
                            description = "Valor de la promoción.";
                    }
                    return (
                      <FormItem>
                        <FormLabel>{t("promotions.form.value.label")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={placeholder}
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              field.onChange(val === '' ? null : parseFloat(val));
                            }}
                            disabled={isLoading || isSubmitting || isLoadingOptions}
                          />
                        </FormControl>
                        <FormDescription>{description}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN: Objetivo (MODIFICADA) */}
          <Card>
            <CardHeader>
              <CardTitle>{t("promotions.form.sections.target")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selector de Alcance del Objetivo (MODIFICADO para filtrar opción TARIFA) */} 
              <FormField
                control={form.control}
                name="targetScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("promotions.form.targetScope.label")}</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value} 
                        disabled={isLoading || isSubmitting || isLoadingOptions}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("promotions.form.targetScope.placeholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PromotionTargetScope)
                          .filter(scopeValue => {
                            // Condición para OCULTAR la opción TARIFA:
                            // 1. Estamos creando desde una clínica específica (preselectedClinicId existe)
                            // 2. La clínica NO tiene tarifa asociada (clinicTariffData es null)
                            // 3. El valor que estamos evaluando es TARIFF
                            if (
                                scopeValue === PromotionTargetScope.TARIFF &&
                                preselectedClinicId && 
                                !clinicTariffData 
                            ) {
                                return false; // Ocultar la opción TARIFA
                            }
                            return true; // Mostrar las demás opciones
                          })
                          .map((scopeValue) => (
                            <SelectItem key={scopeValue} value={scopeValue}>
                              {t(`enums.PromotionTargetScope.${scopeValue}`)}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("promotions.form.targetScope.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* --- Selector Específico (Renderizado Condicional) --- */}
              {isLoadingOptions && (
                <div className="space-y-2">
                  <Skeleton className="w-1/4 h-4" />
                  <Skeleton className="w-full h-10" />
                </div>
              )}

              {!isLoadingOptions && targetScope === PromotionTargetScope.SPECIFIC_SERVICE && renderComboboxField(
                'targetServiceId',
                services.map(s => ({ value: s.id, label: s.name })),
                'promotions.form.targetServiceId.label',
                'promotions.form.targetServiceId.placeholder',
                'promotions.form.targetServiceId.searchPlaceholder',
                'common.noResults'
              )}

              {!isLoadingOptions && targetScope === PromotionTargetScope.SPECIFIC_PRODUCT && renderComboboxField(
                'targetProductId',
                products.map(p => ({ value: p.id, label: p.name })),
                'promotions.form.targetProductId.label',
                'promotions.form.targetProductId.placeholder',
                'promotions.form.targetProductId.searchPlaceholder',
                'common.noResults'
              )}

              {!isLoadingOptions && targetScope === PromotionTargetScope.CATEGORY && renderComboboxField(
                'targetCategoryId',
                categories.map(c => ({ value: c.id, label: c.name })),
                'promotions.form.targetCategoryId.label',
                'promotions.form.targetCategoryId.placeholder',
                'promotions.form.targetCategoryId.searchPlaceholder',
                'common.noResults'
              )}

              {!isLoadingOptions && targetScope === PromotionTargetScope.TARIFF && (
                <FormField
                  control={form.control}
                  name="targetTariffId"
                  render={({ field }) => {
                    const isDisabled = !!clinicTariffData; // Deshabilitar si hay tarifa de clínica preseleccionada
                    const displayValue = isDisabled ? clinicTariffData?.name : tariffs.find(t => t.id === field.value)?.name;
                    const placeholderText = t('promotions.form.targetTariffId.placeholder');

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('promotions.form.targetTariffId.label')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={isDisabled || isLoading || isSubmitting || isLoadingOptions} // Añadir isDisabled
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && !isDisabled && "text-muted-foreground"
                                )}
                              >
                                {displayValue || placeholderText}
                                {!isDisabled && <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />} 
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          {!isDisabled && (
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                              <Command>
                                <CommandInput placeholder={t('promotions.form.targetTariffId.searchPlaceholder')} />
                                <CommandList>
                                  <CommandEmpty>{t('common.noResults')}</CommandEmpty>
                                  <CommandGroup>
                                    {tariffs.map((option) => (
                                      <CommandItem
                                        value={option.name}
                                        key={option.id}
                                        onSelect={() => {
                                          form.setValue('targetTariffId', option.id);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            option.id === field.value
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {option.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          )}
                        </Popover>
                        {/* Mostrar descripción si está deshabilitado */} 
                        {isDisabled && (
                            <FormDescription>
                                {t('promotions.form.targetTariffId.preselectedDesc', { tariffName: clinicTariffData?.name })}
                            </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              {!isLoadingOptions && targetScope === PromotionTargetScope.SPECIFIC_BONO && renderComboboxField(
                'targetBonoDefinitionId',
                bonoDefinitions.map(b => ({ value: b.id, label: b.name })),
                'promotions.form.targetBonoDefinitionId.label',
                'promotions.form.targetBonoDefinitionId.placeholder',
                'promotions.form.targetBonoDefinitionId.searchPlaceholder',
                'common.noResults'
              )}

              {!isLoadingOptions && targetScope === PromotionTargetScope.SPECIFIC_PACKAGE && renderComboboxField(
                'targetPackageDefinitionId',
                packageDefinitions.map(pkg => ({ value: pkg.id, label: pkg.name })),
                'promotions.form.targetPackageDefinitionId.label',
                'promotions.form.targetPackageDefinitionId.placeholder',
                'promotions.form.targetPackageDefinitionId.searchPlaceholder',
                'common.noResults'
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN: Alcance Geográfico (MODIFICADA) */}
          <Card>
            <CardHeader>
              <CardTitle>{t("promotions.form.sections.scope")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6"> {/* Aumentar espacio si es necesario */}
              {/* --- Checkbox Aplicar a Todas --- */} 
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apply-to-all"
                  checked={applyToAllClinics}
                  onCheckedChange={handleApplyToAllChange}
                  disabled={!!preselectedClinicId}
                />
                <Label htmlFor="apply-to-all" className="text-sm font-medium">
                  {t('promotions.form.apply_to_all_clinics', 'Aplicar a todas (FALLBACK)')}
                </Label>
              </div>
              <FormDescription>
                 {t('promotions.form.applicableClinics.applyToAllDescription')}
              </FormDescription>

              {/* --- Componente de Selección Múltiple de Clínicas (Condicionalmente deshabilitado) --- */} 
              <FormField
                control={form.control}
                name="applicableClinicIds"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("promotions.form.applicableClinics.label")}</FormLabel>
                    <FormControl>
                      <MultiSelectCombobox
                        options={clinics.map(clinic => ({ value: clinic.id, label: clinic.name }))}
                        selectedValues={field.value || []}
                        onChange={field.onChange}
                        placeholder={t('promotions.form.applicableClinics.placeholder')}
                        searchPlaceholder={t('promotions.form.applicableClinics.searchPlaceholder')}
                        emptyPlaceholder={t('common.noResults')}
                        disabled={isLoading || isLoadingOptions || isSubmitting || applyToAllClinics || !!preselectedClinicId}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('promotions.form.applicableClinics.description')} 
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECCIÓN: Detalles BOGO (si aplica) */}
          {isBogo && (
            <Card>
              <CardHeader>
                <CardTitle>{t("promotions.form.sections.bogo_details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                {/* Cantidad Requerida (Compra X) */}
                <FormField
                  control={form.control}
                  name="bogoBuyQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("promotions.form.bogoBuyQuantity.label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={t("promotions.form.bogoBuyQuantity.placeholder")}
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseInt(val, 10));
                          }}
                          min="1"
                          disabled={isLoading || isSubmitting || isLoadingOptions}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("promotions.form.bogoBuyQuantity.description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Cantidad de Regalo */}
                <FormField
                  control={form.control}
                  name="bogoGetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("promotions.form.bogoGetQuantity.label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={t("promotions.form.bogoGetQuantity.placeholder")}
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseInt(val, 10));
                          }}
                          min="1"
                          disabled={isLoading || isSubmitting || isLoadingOptions}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("promotions.form.bogoGetQuantity.description")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Item de Regalo (Llévate Y) - Columna completa */}
                <div className="space-y-6 md:col-span-2">
                  {promotionType === PromotionType.BUY_X_GET_Y_SERVICE && renderComboboxField(
                    'bogoGetServiceId',
                    services.map(s => ({ value: s.id, label: s.name })),
                    'promotions.form.bogoGetServiceId.label',
                    'promotions.form.bogoGetServiceId.placeholder',
                    'promotions.form.bogoGetServiceId.searchPlaceholder',
                    'common.noResults'
                  )}
                  {promotionType === PromotionType.BUY_X_GET_Y_PRODUCT && renderComboboxField(
                    'bogoGetProductId',
                    products.map(p => ({ value: p.id, label: p.name })),
                    'promotions.form.bogoGetProductId.label',
                    'promotions.form.bogoGetProductId.placeholder',
                    'promotions.form.bogoGetProductId.searchPlaceholder',
                    'common.noResults'
                  )}
                  {/* Descuento en Regalo (Opcional) */}
                  <FormField
                    control={form.control}
                    name="bogoGetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("promotions.form.bogoGetValue.label")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t("promotions.form.bogoGetValue.placeholder_percentage")}
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              field.onChange(val === '' ? null : parseFloat(val));
                            }}
                            disabled={isLoading || isSubmitting || isLoadingOptions}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("promotions.form.bogoGetValue.description")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECCIÓN: Condiciones y Límites */}
          <Card>
            <CardHeader>
              <CardTitle>{t("promotions.form.sections.conditions")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Importe Mínimo */}
              <FormField
                control={form.control}
                name="minPurchaseAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("promotions.form.minPurchaseAmount.label")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t("promotions.form.minPurchaseAmount.placeholder")}
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseFloat(val));
                        }}
                        disabled={isLoading || isSubmitting || isLoadingOptions}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("promotions.form.minPurchaseAmount.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Importe Máximo Descuento */}
              <FormField
                control={form.control}
                name="maxDiscountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("promotions.form.maxDiscountAmount.label")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t("promotions.form.maxDiscountAmount.placeholder")}
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseFloat(val));
                        }}
                        disabled={isLoading || isSubmitting || isLoadingOptions}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("promotions.form.maxDiscountAmount.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Fecha Inicio */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("promotions.form.startDate.label")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading || isSubmitting || isLoadingOptions}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>{t('common.select_placeholder')}</span>
                            )}
                            <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => field.onChange(date || null)}
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1)) || isLoading || isSubmitting || isLoadingOptions}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {t("promotions.form.startDate.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Fecha Fin */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("promotions.form.endDate.label")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading || isSubmitting || isLoadingOptions}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>{t('common.select_placeholder')}</span>
                            )}
                            <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => field.onChange(date || null)}
                          disabled={(date) => {
                            const startDate = form.getValues("startDate");
                            return (startDate && date < startDate) || isLoading || isSubmitting || isLoadingOptions;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {t("promotions.form.endDate.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Usos Totales */}
              <FormField
                control={form.control}
                name="maxTotalUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("promotions.form.maxTotalUses.label")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("promotions.form.maxTotalUses.placeholder")}
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseInt(val, 10));
                        }}
                        min="0"
                        disabled={isLoading || isSubmitting || isLoadingOptions}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("promotions.form.maxTotalUses.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Usos por Cliente */}
              <FormField
                control={form.control}
                name="maxUsesPerClient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("promotions.form.maxUsesPerClient.label")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("promotions.form.maxUsesPerClient.placeholder")}
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseInt(val, 10));
                        }}
                        min="0"
                        disabled={isLoading || isSubmitting || isLoadingOptions}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("promotions.form.maxUsesPerClient.description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* --- NUEVA SECCIÓN: Acumulación (con Tooltip en desplegable) --- */}
          <Card>
            <CardHeader>
              <CardTitle>{t('promotions.form.accumulation.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="accumulationMode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>{t('promotions.form.accumulation.modeLabel')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={PromotionAccumulationMode.EXCLUSIVE} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t(`promotions.accumulationModes.${PromotionAccumulationMode.EXCLUSIVE}`)} 
                            <FormDescription>{t(`promotions.accumulationModes.${PromotionAccumulationMode.EXCLUSIVE}_desc`)}</FormDescription>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={PromotionAccumulationMode.ALL} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t(`promotions.accumulationModes.${PromotionAccumulationMode.ALL}`)}
                            <FormDescription>{t(`promotions.accumulationModes.${PromotionAccumulationMode.ALL}_desc`)}</FormDescription>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={PromotionAccumulationMode.SPECIFIC} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t(`promotions.accumulationModes.${PromotionAccumulationMode.SPECIFIC}`)}
                            <FormDescription>{t(`promotions.accumulationModes.${PromotionAccumulationMode.SPECIFIC}_desc`)}</FormDescription>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selector Múltiple Condicional */} 
              {accumulationMode === PromotionAccumulationMode.SPECIFIC && (
                <FormField
                  control={form.control}
                  name="compatiblePromotionIds"
                  render={({ field }) => {
                    const selectedPromotionObjects = eligiblePromotions.filter(promo => 
                      field.value?.includes(promo.id)
                    );

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('promotions.form.accumulation.compatibleLabel')}</FormLabel>
                        
                        {selectedPromotionObjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 pb-2">
                            {selectedPromotionObjects.map((selectedPromo) => (
                              <Badge key={selectedPromo.id} variant="secondary" className="flex items-center text-xs px-1.5 py-0.5">
                                {selectedPromo.name.replace(/\s*\(.*\)$/, '')}
                                <button
                                  type="button"
                                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-1 focus:ring-ring focus:ring-offset-1"
                                  onClick={() => {
                                    const newValue = field.value?.filter(id => id !== selectedPromo.id) || [];
                                    field.onChange(newValue);
                                  }}
                                  aria-label={`Quitar ${selectedPromo.name}`}
                                >
                                  <X className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {isLoadingEligible ? (
                            <Skeleton className="w-full h-10" />
                        ) : eligibleError ? (
                            <p className='text-sm text-red-600'>{t('common.errors.loadingDesc')} ({(eligibleError as Error).message})</p>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    (!field.value || field.value.length === 0) && "text-muted-foreground"
                                  )}
                                  disabled={isLoadingEligible || eligiblePromotions.length === 0}
                                >
                                  {field.value && field.value.length > 0
                                    ? `${field.value.length} seleccionada(s)`
                                    : t('promotions.form.accumulation.compatiblePlaceholder')}
                                  <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                              <Command>
                                <CommandInput placeholder={t('promotions.form.accumulation.compatibleSearchPlaceholder')} />
                                <CommandList>
                                  <CommandEmpty>{t('promotions.form.accumulation.compatibleEmptyPlaceholder')}</CommandEmpty>
                                  <CommandGroup>
                                    {eligiblePromotions.map((option) => { 
                                      const isSelected = field.value?.includes(option.id);
                                      const match = option.name.match(/^(.*?)\s*(\(.*\))$/);
                                      const baseName = match ? match[1] : option.name;
                                      const scopeIndicator = match ? match[2] : "";

                                      return (
                                        <CommandItem
                                          key={option.id}
                                          value={option.name}
                                          onSelect={() => {
                                            const currentSelection = field.value || [];
                                            const newSelection = isSelected
                                                ? currentSelection.filter(id => id !== option.id)
                                                : [...currentSelection, option.id];
                                            field.onChange(newSelection);
                                          }}
                                          className="flex items-center"
                                        >
                                          <div className="flex items-center flex-grow mr-2">
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                isSelected ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <span className="truncate">{baseName}</span>
                                          </div>
                                          {scopeIndicator && (
                                            <span 
                                              className="pl-1 text-xs cursor-default text-muted-foreground whitespace-nowrap shrink-0"
                                            >
                                              {scopeIndicator}
                                            </span>
                                          )}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                        
                        {eligiblePromotions.length === 0 && !isLoadingEligible && !eligibleError && (
                            <FormDescription>
                                {t('promotions.form.accumulation.noCompatibleOptions')}
                            </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

            </CardContent>
          </Card>

          {/* Mensaje de error general */}
          {errorMessage && (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          )}
        </form>
      </div>

      {/* Footer Fijo (Este se queda) */}
      <div
        className="fixed bottom-0 right-0 z-10 flex justify-end px-6 py-4 space-x-4 bg-background"
        style={{ left: 'var(--sidebar-width)' }} // Aplica el offset izquierdo
      >
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSubmitting}>
            {t("common.buttons.cancel")} 
          </Button>
        )}
        <Button form="promotion-form-id" type="submit" disabled={isLoading || isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.buttons.save")} 
        </Button>
      </div>
    </Form>
  );
}