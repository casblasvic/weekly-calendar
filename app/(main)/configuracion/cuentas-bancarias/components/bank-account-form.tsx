'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bankAccountFormSchema, type BankAccountFormValues } from '@/lib/schemas/bank-account';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import type { Bank, Clinic } from '@prisma/client';
import { MultiSelectCombobox, type ComboboxOption } from "@/components/ui/multi-select-combobox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FetchedBankData {
  id: string;
  name: string;
  isGlobal: boolean;
  applicableClinics: { clinicId: string }[];
}

interface BankAccountFormProps {
  initialData?: BankAccountFormValues & { id: string };
  setIsSubmitting: (isSubmitting: boolean) => void;
  preselectedBankId?: string;
  redirectUrl?: string;
}

export function BankAccountForm({ initialData, setIsSubmitting, preselectedBankId, redirectUrl }: BankAccountFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  
  const [banks, setBanks] = useState<Bank[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string}[]>([]);
  const [selectedBankData, setSelectedBankData] = useState<FetchedBankData | null>(null);
  const [isLoadingSelectedBank, setIsLoadingSelectedBank] = useState(false);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [banksError, setBanksError] = useState<Error | null>(null);
  const [clinicsError, setClinicsError] = useState<Error | null>(null);
  const [currenciesError, setCurrenciesError] = useState<Error | null>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: initialData || {
      accountName: '',
      iban: '',
      swiftBic: null,
      currency: 'EUR',
      bankId: preselectedBankId || '',
      notes: null,
      isActive: true,
      isGlobal: true,
      applicableClinicIds: [],
    },
  });

  useEffect(() => {
    setIsSubmitting(form.formState.isSubmitting);
  }, [form.formState.isSubmitting, setIsSubmitting]);

  useEffect(() => {
    if (preselectedBankId && !initialData?.bankId) {
      form.setValue('bankId', preselectedBankId);
    }
  }, [preselectedBankId, form, initialData]);

  const selectedBankId = useWatch({ control: form.control, name: 'bankId' });

  useEffect(() => {
    async function fetchSelectedBank(bankId: string) {
      setIsLoadingSelectedBank(true);
      setSelectedBankData(null);
      try {
        const response = await fetch(`/api/banks/${bankId}`);
        if (!response.ok) {
          throw new Error('Error cargando datos del banco seleccionado');
        }
        const bankData: FetchedBankData = await response.json();
        setSelectedBankData(bankData);
        
        if (!initialData || (initialData && initialData.bankId !== bankId)) {
          if (bankData) {
            form.setValue('isGlobal', bankData.isGlobal, { shouldValidate: true });
            const clinicIds = bankData.applicableClinics?.map(c => c.clinicId) || [];
            form.setValue('applicableClinicIds', clinicIds, { shouldValidate: true });
            
            if (!bankData.isGlobal && clinicIds.length > 0) {
              form.clearErrors("applicableClinicIds");
            } else if (bankData.isGlobal) {
              form.clearErrors("applicableClinicIds");
            }
          }
        }

      } catch (error) {
        console.error(`Error cargando datos del banco ${bankId}:`, error);
        toast({
          title: t('common.error'),
          description: t('config_bank_accounts.toast.fetch_bank_error'),
          variant: 'destructive',
        });
      } finally {
        setIsLoadingSelectedBank(false);
      }
    }

    if (selectedBankId) {
      fetchSelectedBank(selectedBankId);
    } else {
      setSelectedBankData(null);
      if (!initialData) {
          form.setValue('isGlobal', true);
          form.setValue('applicableClinicIds', []);
      }
    }
  }, [selectedBankId, form, initialData, toast, t]);

  useEffect(() => {
    async function fetchBanks() {
      setIsLoadingBanks(true);
      try {
        const response = await fetch('/api/banks');
        if (!response.ok) {
          throw new Error('Error cargando bancos');
        }
        const data = await response.json();
        setBanks(data);
      } catch (error) {
        console.error('Error al cargar bancos:', error);
        setBanksError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoadingBanks(false);
      }
    }
    
    fetchBanks();
  }, []);

  useEffect(() => {
    async function fetchClinics() {
      setIsLoadingClinics(true);
      try {
        const response = await fetch('/api/clinics?active=true');
        if (!response.ok) {
          throw new Error('Error cargando clínicas');
        }
        const data = await response.json();
        setClinics(data);
      } catch (error) {
        console.error('Error al cargar clínicas:', error);
        setClinicsError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoadingClinics(false);
      }
    }
    
    fetchClinics();
  }, []);

  useEffect(() => {
    async function fetchCurrencies() {
      setIsLoadingCurrencies(true);
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) {
          throw new Error('Error cargando monedas');
        }
        const data = await response.json();
        
        const currenciesMap = new Map<string, {code: string, name: string, symbol: string}>();
        data.forEach((country: any) => {
          if (country.currencyCode && country.currencyCode.trim() !== '' && country.currencyName && country.currencyName.trim() !== '') {
            currenciesMap.set(country.currencyCode, {
              code: country.currencyCode,
              name: country.currencyName,
              symbol: country.currencySymbol || country.currencyCode
            });
          }
        });
        const uniqueCurrencies = Array.from(currenciesMap.values());
        uniqueCurrencies.sort((a, b) => a.code.localeCompare(b.code));
        setCurrencies(uniqueCurrencies);
      } catch (error) {
        console.error('Error al cargar monedas:', error);
        setCurrenciesError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoadingCurrencies(false);
      }
    }
    
    fetchCurrencies();
  }, []);

  async function createBankAccount(values: BankAccountFormValues) {
    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('config_bank_accounts.toast.create_error'));
      }

      const data = await response.json();
      
      toast({
        title: t('common.success'),
        description: t('config_bank_accounts.toast.create_success'),
      });
      
      router.push(redirectUrl || '/configuracion/cuentas-bancarias');
      router.refresh();
      return data;
    } catch (error) {
      console.error("Error creando cuenta:", error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('config_bank_accounts.toast.create_error'),
        variant: 'destructive',
      });
      throw error;
    }
  }

  async function updateBankAccount(id: string, values: BankAccountFormValues) {
    try {
      const response = await fetch(`/api/bank-accounts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('config_bank_accounts.toast.update_error'));
      }

      const data = await response.json();
      
      toast({
        title: t('common.success'),
        description: t('config_bank_accounts.toast.update_success'),
      });
      
      router.push(redirectUrl || '/configuracion/cuentas-bancarias');
      router.refresh();
      return data;
    } catch (error) {
      console.error("Error actualizando cuenta:", error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('config_bank_accounts.toast.update_error'),
        variant: 'destructive',
      });
      throw error;
    }
  }

  async function onSubmit(values: BankAccountFormValues) {
    console.log("Datos del formulario validados para cuenta:", values);
    const finalValues = {
      ...values,
      applicableClinicIds: values.isGlobal ? [] : (values.applicableClinicIds || []),
    };
    
    try {
      if (initialData?.id) {
        await updateBankAccount(initialData.id, finalValues);
      } else {
        await createBankAccount(finalValues);
      }
    } catch (error) {
      console.error("Submit error caught in onSubmit:", error);
    }
  }
  
  if (banksError || clinicsError || currenciesError) {
     console.error("Error cargando datos auxiliares:", { banksError, clinicsError, currenciesError });
     return (
       <Card className="mt-4">
         <CardHeader><CardTitle>{t('common.error')}</CardTitle></CardHeader>
         <CardContent><p>{t('common.errors.auxDataLoadError')}</p></CardContent>
       </Card>
     );
  }

  const isGlobalValue = useWatch({ control: form.control, name: 'isGlobal' });
  
  const clinicOptions: ComboboxOption[] = clinics.map(clinic => ({
    value: clinic.id,
    label: clinic.name,
  }));

  return (
    <Form {...form}>
      <form id="bank-account-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('config_bank_accounts.form.account_details_title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t('config_bank_accounts.form.accountName_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('config_bank_accounts.form.accountName_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('config_bank_accounts.form.iban_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder="ES00 ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="swiftBic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('config_bank_accounts.form.swiftBic_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Código SWIFT/BIC" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>{t('common.optional')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('config_bank_accounts.form.currency_label')}</FormLabel>
                  <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={currencyOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoadingCurrencies}
                        >
                          {isLoadingCurrencies ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : field.value ? (
                             `${currencies.find((c) => c.code === field.value)?.code ?? '???'} (${currencies.find((c) => c.code === field.value)?.symbol ?? ''})`
                          ) : (
                             t('config_bank_accounts.form.currency_placeholder')
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command filter={(value, search) => {
                          const currency = currencies.find(c => `${c.name} (${c.code})`.toLowerCase() === value.toLowerCase());
                          if (!currency) return 0;
                          const terms = search.toLowerCase().split(" ");
                          const matchName = terms.every(term => currency.name.toLowerCase().includes(term));
                          const matchCode = terms.every(term => currency.code.toLowerCase().includes(term));
                          return (matchName || matchCode) ? 1 : 0;
                        }}>
                        <CommandInput placeholder={t('config_bank_accounts.form.currency_search_placeholder')} />
                        <CommandEmpty>{t('common.no_results')}</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-72">
                            {currencies.map((currency) => (
                              <CommandItem
                                value={`${currency.name} (${currency.code})`}
                                key={currency.code}
                                onSelect={() => {
                                  form.setValue("currency", currency.code)
                                  setCurrencyOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currency.code === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {currency.name} ({currency.code}) - {currency.symbol}
                              </CommandItem>
                            ))}
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('config_bank_accounts.form.bankId_label')}</FormLabel>
                   <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                    disabled={isLoadingBanks || !!preselectedBankId}
                  >
                    <FormControl>
                      <SelectTrigger>
                       {isLoadingBanks ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       ) : (
                          <SelectValue placeholder={t('config_bank_accounts.form.bankId_placeholder')} />
                       )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingBanks && <SelectItem value="loading" disabled>{t('common.loading')}</SelectItem>}
                      {!isLoadingBanks && banks.length === 0 && <SelectItem value="no-banks" disabled>{t('config_bank_accounts.form.no_banks_found')}</SelectItem>}
                      {!isLoadingBanks && banks.map(bank => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name}
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
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t('config_bank_accounts.form.notes_label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('config_bank_accounts.form.notes_placeholder')}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>{t('common.optional')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel>{t('config_bank_accounts.form.isActive_label')}</FormLabel>
                    <FormDescription>
                      {t('config_bank_accounts.form.isActive_description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('config_bank_accounts.form.scope_section_title')}</CardTitle>
             {isLoadingSelectedBank && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                {t('config_bank_accounts.form.loading_bank_scope')}
              </div>
             )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedBankId && (
              <p className="text-sm text-muted-foreground">{t('config_bank_accounts.form.select_bank_for_scope')}</p>
            )}
            {selectedBankId && !isLoadingSelectedBank && (
              <>
                <FormField
                  control={form.control}
                  name="isGlobal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>{t('config_bank_accounts.form.isGlobal_label')}</FormLabel>
                        <FormDescription>
                          {t('config_bank_accounts.form.isGlobal_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoadingSelectedBank}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!isGlobalValue && ( 
                  <FormField
                    control={form.control}
                    name="applicableClinicIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('config_bank_accounts.form.clinics_label')}</FormLabel>
                        <FormControl>
                          <MultiSelectCombobox
                            options={clinicOptions}
                            selectedValues={field.value ?? []} 
                            onChange={field.onChange}
                            placeholder={t('config_bank_accounts.form.clinics_placeholder')}
                            searchPlaceholder={t('config_bank_accounts.form.clinics_search_placeholder')}
                            emptyPlaceholder={t('config_bank_accounts.form.clinics_empty_placeholder')}
                            disabled={isLoadingSelectedBank || isLoadingClinics}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          {t('config_bank_accounts.form.clinics_description')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
} 