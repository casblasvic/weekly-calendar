'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bankFormSchema, type BankFormValues } from '@/lib/schemas/bank';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch";
import { MultiSelectCombobox, type ComboboxOption } from "@/components/ui/multi-select-combobox";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getActiveClinics, type Clinic } from "@/lib/api/clinics";

// Interfaz para parámetros del formulario
interface BankFormProps {
  initialData?: Omit<BankFormValues, 'applicableClinicIds'> & { 
    id: string;
    applicableClinicIds?: string[];
  };
  isLoading?: boolean;
  onSubmit: (data: BankFormValues) => Promise<void>;
}

// Tipo para países
type CountryInfo = {
  isoCode: string;
  name: string;
  flagEmoji?: string;
  phoneCode?: string;
  dialCode?: string;
}

// Componente principal
export function BankForm({ initialData, isLoading = false, onSubmit }: BankFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
  // Estado para datos cargados
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const [openPhone1Country, setOpenPhone1Country] = useState(false);
  const [openPhone2Country, setOpenPhone2Country] = useState(false);

  // Cargar países y clínicas al iniciar
  useEffect(() => {
    async function fetchData() {
      // Cargar países
      setIsLoadingCountries(true);
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) throw new Error('Error cargando países');
        const data = await response.json();
        setCountries(data);
      } catch (error) {
        console.error('Error cargando países:', error);
        toast.error("No se pudieron cargar los países.");
      } finally {
        setIsLoadingCountries(false);
      }

      // Cargar clínicas
      setIsLoadingClinics(true);
      try {
        const clinicsData = await getActiveClinics();
        setClinics(clinicsData);
      } catch (error) {
        console.error('Error cargando clínicas:', error);
        toast.error("No se pudieron cargar las clínicas activas.");
      } finally {
        setIsLoadingClinics(false);
      }
    }

    fetchData();
  }, []);

  // Configuración del formulario con zod
  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: initialData 
      ? { 
          ...initialData, 
          isGlobal: !(initialData.applicableClinicIds && initialData.applicableClinicIds.length > 0),
          applicableClinicIds: initialData.applicableClinicIds || [],
        } 
      : {
          name: '',
          code: null,
          phone: null,
          phone1CountryIsoCode: null,
          phone2: null,
          phone2CountryIsoCode: null,
          email: null,
          address: null,
          countryIsoCode: null,
          isGlobal: true,
          applicableClinicIds: [],
        },
  });

  // Cargar datos iniciales cuando estén disponibles
  useEffect(() => {
    if (initialData) {
      const isInitiallyGlobal = !(initialData.applicableClinicIds && initialData.applicableClinicIds.length > 0);
      form.reset({ 
        ...initialData,
        isGlobal: isInitiallyGlobal,
        applicableClinicIds: initialData.applicableClinicIds || [],
      });
    }
  }, [initialData, form]);

  // Sincronizar códigos de país
  useEffect(() => {
    const countryValue = form.watch('countryIsoCode');
    if (countryValue && !form.getValues('phone1CountryIsoCode')) {
      form.setValue('phone1CountryIsoCode', countryValue);
    }
    if (countryValue && !form.getValues('phone2CountryIsoCode')) {
      form.setValue('phone2CountryIsoCode', countryValue);
    }
  }, [form.watch('countryIsoCode')]);

  // La función onSubmit real se pasa como prop desde la página padre
  const handleFormSubmit = async (data: BankFormValues) => {
    const finalData = {
      ...data,
      applicableClinicIds: data.isGlobal ? [] : data.applicableClinicIds || [],
    };
    await onSubmit(finalData);
  };

  // Función para obtener el código telefónico según el isoCode
  const getPhoneCodeByIsoCode = useCallback((isoCode: string | null) => {
    if (!isoCode) return "";
    const country = countries.find(c => c.isoCode === isoCode);
    return country?.phoneCode || "";
  }, [countries]);
  
  // Opciones para el MultiSelect de Clínicas
  const clinicOptions: ComboboxOption[] = clinics.map(clinic => ({
    value: clinic.id,
    label: clinic.name,
  }));

  // <<< RESTAURAR WATCH para renderizado condicional >>>
  const isGlobalValue = form.watch('isGlobal');

  return (
    <Form {...form}>
      <form id="bank-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{initialData ? t('config_banks.form.edit_title') : t('config_banks.form.new_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">{t('config_banks.form.general_section_title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_banks.form.name_label')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('config_banks.form.name_placeholder')}
                        {...field} 
                        disabled={isLoading}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_banks.form.code_label')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('config_banks.form.code_placeholder')}
                        {...field}
                        value={field.value ?? ''} 
                        disabled={isLoading}
                        className="w-full md:w-32 font-mono"
                        maxLength={4}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('config_banks.form.code_description')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryIsoCode"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('config_banks.form.country_label')}</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading || isLoadingCountries}
                          >
                            {field.value ? (
                              countries.find((country) => country.isoCode === field.value)?.name
                            ) : (
                              t('config_banks.form.country_placeholder')
                            )}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-full" align="start">
                        <Command>
                          <CommandInput 
                            placeholder={t('config_banks.form.country_placeholder')} 
                            value={countrySearchValue}
                            onValueChange={setCountrySearchValue}
                          />
                          <CommandEmpty>{t('common.no_results')}</CommandEmpty>
                          <ScrollArea className="h-[200px]">
                            <CommandGroup>
                              {countries.map((country) => (
                                <CommandItem
                                  key={country.isoCode}
                                  value={country.name}
                                  onSelect={() => {
                                    form.setValue("countryIsoCode", country.isoCode);
                                    form.setValue("phone1CountryIsoCode", country.isoCode);
                                    form.setValue("phone2CountryIsoCode", country.isoCode);
                                    setOpen(false);
                                    setCountrySearchValue("");
                                  }}
                                >
                                  {country.flagEmoji} {country.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </ScrollArea>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {t('common.optional')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_banks.form.email_label')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder={t('config_banks.form.email_placeholder')}
                        {...field}
                        value={field.value ?? ''} 
                        disabled={isLoading}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('common.optional')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t('config_banks.form.address_label')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('config_banks.form.address_placeholder')}
                        {...field}
                        value={field.value ?? ''} 
                        disabled={isLoading}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('common.optional')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h3 className="text-lg font-medium border-b pb-2 mt-6">{t('config_banks.form.phone_section_title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_banks.form.phone1_label')}</FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="phone1CountryIsoCode"
                        render={({ field: prefixField }) => (
                          <FormItem className="flex flex-col w-24">
                            <Popover open={openPhone1Country} onOpenChange={setOpenPhone1Country}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-[90px] justify-between",
                                      !prefixField.value && "text-muted-foreground"
                                    )}
                                    disabled={isLoading || isLoadingCountries}
                                    size="sm"
                                  >
                                    {prefixField.value ? getPhoneCodeByIsoCode(prefixField.value) : "+Pref"}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[200px]" align="start">
                                <Command>
                                  <CommandInput placeholder={t('config_banks.form.prefix_search_placeholder')} />
                                  <CommandEmpty>{t('common.no_results')}</CommandEmpty>
                                  <ScrollArea className="h-[150px]">
                                    <CommandGroup>
                                      {countries.map((country) => (
                                        <CommandItem
                                          key={country.isoCode + "-phone1"}
                                          value={country.phoneCode ?? country.name}
                                          onSelect={() => {
                                            form.setValue("phone1CountryIsoCode", country.isoCode);
                                            setOpenPhone1Country(false);
                                          }}
                                        >
                                          {country.flagEmoji} {country.phoneCode} ({country.name})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </ScrollArea>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                      <FormControl className="flex-1">
                        <Input 
                          type="tel"
                          placeholder={t('config_banks.form.phone_placeholder')}
                          {...field} 
                          value={field.value ?? ''}
                          disabled={isLoading}
                          className="w-full"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_banks.form.phone2_label')}</FormLabel>
                    <div className="flex gap-2">
                       <FormField
                        control={form.control}
                        name="phone2CountryIsoCode"
                        render={({ field: prefixField }) => (
                          <FormItem className="flex flex-col w-24">
                            <Popover open={openPhone2Country} onOpenChange={setOpenPhone2Country}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-[90px] justify-between",
                                      !prefixField.value && "text-muted-foreground"
                                    )}
                                    disabled={isLoading || isLoadingCountries}
                                    size="sm"
                                  >
                                    {prefixField.value ? getPhoneCodeByIsoCode(prefixField.value) : "+Pref"}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[200px]" align="start">
                                <Command>
                                  <CommandInput placeholder={t('config_banks.form.prefix_search_placeholder')} />
                                  <CommandEmpty>{t('common.no_results')}</CommandEmpty>
                                   <ScrollArea className="h-[150px]">
                                    <CommandGroup>
                                      {countries.map((country) => (
                                        <CommandItem
                                          key={country.isoCode + "-phone2"}
                                          value={country.phoneCode ?? country.name}
                                          onSelect={() => {
                                            form.setValue("phone2CountryIsoCode", country.isoCode);
                                            setOpenPhone2Country(false);
                                          }}
                                        >
                                          {country.flagEmoji} {country.phoneCode} ({country.name})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </ScrollArea>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                      <FormControl className="flex-1">
                        <Input 
                          type="tel"
                          placeholder={t('config_banks.form.phone_placeholder')}
                          {...field} 
                          value={field.value ?? ''}
                          disabled={isLoading}
                          className="w-full"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* --- RESTAURAR SECCIÓN ÁMBITO --- */}
            <h3 className="text-lg font-medium border-b pb-2 mt-6">{t('config_banks.form.scope_section_title')}</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isGlobal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>{t('config_banks.form.isGlobal_label')}</FormLabel>
                      <FormDescription>
                        {t('config_banks.form.isGlobal_description')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Mostrar selector de clínicas solo si isGlobal es false */}
              {!isGlobalValue && (
                <FormField
                  control={form.control}
                  name="applicableClinicIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('config_banks.form.clinics_label')}</FormLabel>
                      <FormControl>
                        <MultiSelectCombobox
                          options={clinicOptions}
                          selectedValues={field.value ?? []}
                          onChange={field.onChange}
                          placeholder={t('config_banks.form.clinics_placeholder')}
                          searchPlaceholder={t('config_banks.form.clinics_search_placeholder')}
                          emptyPlaceholder={t('config_banks.form.clinics_empty_placeholder')}
                          disabled={isLoading || isLoadingClinics}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('config_banks.form.clinics_description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            {/* --- FIN RESTAURAR SECCIÓN ÁMBITO --- */}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
} 