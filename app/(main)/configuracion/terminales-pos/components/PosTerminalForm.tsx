'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { MultiSelectCombobox, type ComboboxOption } from "@/components/ui/multi-select-combobox";

import { posTerminalFormSchema, type PosTerminalFormValues } from '@/lib/schemas/pos-terminal';
import { type Clinic } from '@prisma/client';
import { getBanks, type Bank } from '@/lib/api/banks';
import { getBankAccountsByBank, type BankAccount } from '@/lib/api/bank-accounts';
import { getActiveClinics } from '@/lib/api/clinics';
import { type PosTerminal } from '@/lib/api/pos-terminals';

interface PosTerminalFormProps {
  initialData?: (Omit<PosTerminal, 'bankAccount' | 'applicableClinics'> & { 
    applicableClinics?: { clinic: Pick<Clinic, 'id'|'name'> }[],
    bankAccount?: {
      id: string;
      accountName: string;
      iban: string;
      bankId?: string;
      bank: Pick<Bank, 'id' | 'name'>;
    } | null;
  }) | null;
  onSubmit: (data: PosTerminalFormValues) => Promise<void>;
  isLoading: boolean;
  preselectedBankId?: string;
}

export function PosTerminalForm({ 
  initialData,
  onSubmit,
  isLoading,
  preselectedBankId
}: PosTerminalFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [selectedBankId, setSelectedBankId] = useState<string | undefined>(
    preselectedBankId ?? initialData?.bankAccount?.bankId 
  );

  const initialApplicableClinicIds = initialData?.applicableClinics?.map(ac => ac.clinic.id) ?? [];

  const form = useForm<PosTerminalFormValues>({
    resolver: zodResolver(posTerminalFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      terminalIdProvider: initialData?.terminalIdProvider ?? '',
      provider: initialData?.provider ?? '',
      bankAccountId: initialData?.bankAccountId ?? '',
      isActive: initialData?.isActive ?? true,
      isGlobal: initialData?.isGlobal ?? true, 
      applicableClinicIds: initialApplicableClinicIds,
    },
  });

  const { data: banks, isLoading: isLoadingBanks } = useQuery<
    Bank[],
    Error,
    Bank[]
  >({
    queryKey: ['banks'],
    queryFn: async (): Promise<Bank[] | undefined> => {
        try {
            const result = await getBanks();
            return Array.isArray(result) ? result : undefined;
        } catch (error) {
            console.error("Error fetching banks:", error);
            return undefined; 
        }
    },
  });

  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery<
    BankAccount[],
    Error,
    BankAccount[]
  >({
    queryKey: ['bankAccounts', selectedBankId],
    queryFn: async (): Promise<BankAccount[] | undefined> => {
        console.log(`[Query bankAccounts] Running for bankId: ${selectedBankId}`);
        if (!selectedBankId) return undefined;
        try {
            const result = await getBankAccountsByBank(selectedBankId);
            console.log(`[Query bankAccounts] API Result for bankId ${selectedBankId}:`, result);
            return Array.isArray(result) ? result : undefined;
        } catch (error) {
            console.error("Error fetching bank accounts:", error);
            return undefined;
        }
    },
    enabled: !!selectedBankId,
  });

  const { data: clinics, isLoading: isLoadingClinics } = useQuery<
    Clinic[], 
    Error,
    Clinic[]
  >({
    queryKey: ['activeClinics'],
    queryFn: async (): Promise<Clinic[] | undefined> => {
        try {
            const result = await getActiveClinics();
            return Array.isArray(result) ? result : undefined;
        } catch (error) {
            console.error("Error fetching clinics:", error);
            return undefined;
        }
    },
  });

  useEffect(() => {
    console.log('[Effect SetBankId] Running. initialData exists:', !!initialData, 'preselectedBankId:', preselectedBankId, 'current selectedBankId:', selectedBankId);
    let initialBankIdToSet: string | undefined = undefined;

    if (initialData?.bankAccount?.bank?.id) {
      initialBankIdToSet = initialData.bankAccount.bank.id;
      console.log('[Effect SetBankId] Determined bank ID from initialData.bankAccount.bank.id:', initialBankIdToSet);
    } 
    else if (initialData?.bankAccount?.bankId) {
      initialBankIdToSet = initialData.bankAccount.bankId;
      console.log('[Effect SetBankId] Determined bank ID from initialData.bankAccount.bankId:', initialBankIdToSet);
    } 
    else if (preselectedBankId) {
      initialBankIdToSet = preselectedBankId;
      console.log('[Effect SetBankId] Determined bank ID from preselectedBankId:', initialBankIdToSet);
    }

    if (initialBankIdToSet !== selectedBankId) {
        console.log(`[Effect SetBankId] Condition MET (initialBankIdToSet (${initialBankIdToSet}) !== selectedBankId (${selectedBankId})). Setting state.`);
        setSelectedBankId(initialBankIdToSet);
    }
    else if (!initialData && !preselectedBankId && selectedBankId) {
        console.log(`[Effect SetBankId] Condition MET (!initialData && !preselectedBankId && selectedBankId (${selectedBankId})). Clearing state.`);
        setSelectedBankId(undefined);
    }
  }, [initialData, preselectedBankId]);

  useEffect(() => {
    if (initialData) {
      const currentApplicableClinicIds = initialData.applicableClinics?.map(ac => ac.clinic.id) ?? [];
      const resetValues = {
        name: initialData.name ?? '',
        terminalIdProvider: initialData.terminalIdProvider ?? '',
        provider: initialData.provider ?? '',
        bankAccountId: initialData.bankAccountId ?? '',
        isActive: initialData.isActive ?? true,
        isGlobal: initialData.isGlobal ?? true,
        applicableClinicIds: currentApplicableClinicIds,
      };
      form.reset(resetValues);
      console.log('[Effect ResetForm] Form reset with data:', resetValues);
    } else {
      const defaultValues = {
        name: '',
        terminalIdProvider: '',
        provider: '',
        bankAccountId: '',
        isActive: true,
        isGlobal: true,
        applicableClinicIds: [],
      };
      form.reset(defaultValues);
      console.log('[Effect ResetForm] Form reset to default values.');
    }
  }, [initialData, form]);

  useEffect(() => {
    if (!isLoadingBankAccounts) { 
        if (selectedBankId) {
            const currentAccountId = form.getValues('bankAccountId');
            const accountExistsInCurrentBank = 
                currentAccountId &&
                Array.isArray(bankAccounts) && 
                bankAccounts.some(acc => acc.id === currentAccountId);
            
            if (currentAccountId && !accountExistsInCurrentBank) {
                form.setValue('bankAccountId', '');
                console.log('[Effect Cleanup] Account ID reset because it does not belong to the selected bank or bank accounts are empty.');
            } 
        } else {
            if (!initialData?.bankAccountId) {
                form.setValue('bankAccountId', '');
                console.log('[Effect Cleanup] Account ID reset because no bank is selected AND no initial account ID was provided.');
            }
        }
    } 
  }, [selectedBankId, form, bankAccounts, isLoadingBankAccounts, initialData?.bankAccountId]);

  const isGlobalValue = form.watch('isGlobal');
  useEffect(() => {
    if (isGlobalValue) {
      form.setValue('applicableClinicIds', []);
    }
  }, [isGlobalValue, form]);

  const isDataLoading = isLoadingBanks || isLoadingClinics;
  const FieldSkeleton = () => <Skeleton className="h-10 w-full" />;

  const clinicOptions: ComboboxOption[] = React.useMemo(() => {
    if (!clinics) return [];
    return clinics.map(clinic => ({
      value: clinic.id,
      label: clinic.name,
    }));
  }, [clinics]);

  console.log('[Render PosTerminalForm] State before return:', {
    selectedBankId,
    isLoadingBanks,
    banks: banks?.length,
    isLoadingBankAccounts,
    bankAccounts: bankAccounts?.length,
    isLoadingClinics,
    clinics: clinics?.length,
    formBankAccountId: form.getValues('bankAccountId'),
    formIsGlobal: form.getValues('isGlobal'),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('config_pos_terminals.form.basic_info')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                {isDataLoading ? <FieldSkeleton /> : (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('config_pos_terminals.form.name')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('config_pos_terminals.form.name_placeholder')}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex items-end pb-2">
                {isDataLoading ? <FieldSkeleton /> : (
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm space-x-3 w-full">
                        <div className="space-y-0.5">
                          <FormLabel>{t('config_pos_terminals.form.status')}</FormLabel>
                          <FormDescription>
                            {t('config_pos_terminals.form.status_desc')}
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
                )}
              </div>

              {isDataLoading ? <FieldSkeleton /> : (
                <FormField
                  control={form.control}
                  name="terminalIdProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('config_pos_terminals.form.terminal_id')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('config_pos_terminals.form.terminal_id_placeholder')}
                          {...field} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {isDataLoading ? <FieldSkeleton /> : (
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('config_pos_terminals.form.provider')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('config_pos_terminals.form.provider_placeholder')}
                          {...field} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('config_pos_terminals.form.connection_info')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isDataLoading ? <FieldSkeleton /> : (
              <FormItem>
                <FormLabel>{t('config_pos_terminals.form.bank')}</FormLabel>
                <Select
                  value={selectedBankId ?? ''}
                  onValueChange={(value) => {
                    setSelectedBankId(value || undefined);
                    form.setValue('bankAccountId', '');
                  }}
                  disabled={isLoadingBanks}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('config_pos_terminals.form.select_bank_placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingBanks ? (
                      <SelectItem value="loading" disabled>
                        {t('config_pos_terminals.form.loading_banks')}
                      </SelectItem>
                    ) : banks && banks.length > 0 ? (
                      banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-banks" disabled>
                        {t('config_pos_terminals.form.no_banks_found')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('config_pos_terminals.form.bank_account')}</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={!selectedBankId || isLoadingBankAccounts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('config_pos_terminals.form.select_account_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!selectedBankId ? (
                        <SelectItem value="select-bank" disabled>
                          {t('config_pos_terminals.form.select_bank_placeholder')}
                        </SelectItem>
                      ) : isLoadingBankAccounts ? (
                        <SelectItem value="loading" disabled>
                          {t('config_pos_terminals.form.loading_accounts')}
                        </SelectItem>
                      ) : bankAccounts && bankAccounts.length > 0 ? (
                        bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {`${account.accountName} (${account.iban ?? t('common.iban_not_available')})`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-accounts" disabled>
                          {t('config_pos_terminals.form.account_no_results')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('config_pos_terminals.form.scope_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isDataLoading ? <FieldSkeleton /> : (
               <FormField
                  control={form.control}
                  name="isGlobal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>{t('config_pos_terminals.form.is_global')}</FormLabel>
                        <FormDescription>
                          {t('config_pos_terminals.form.is_global_desc')}
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
            )}
            
            {!isGlobalValue && (
              isLoadingClinics ? <FieldSkeleton /> : (
                <FormField
                  control={form.control}
                  name="applicableClinicIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('config_pos_terminals.form.applicable_clinics')}</FormLabel>
                      <FormControl>
                        <MultiSelectCombobox
                          options={clinicOptions}
                          selectedValues={field.value ?? []}
                          onChange={field.onChange}
                          placeholder={t('config_pos_terminals.form.select_clinics_placeholder')}
                          searchPlaceholder={t('config_pos_terminals.form.search_clinic_placeholder')}
                          emptyPlaceholder={t('config_pos_terminals.form.no_clinics_found')}
                          disabled={isLoadingClinics}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('config_pos_terminals.form.applicable_clinics_desc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )
            )}
          </CardContent>
        </Card>

        <button type="submit" id="pos-terminal-form-submit" className="hidden">
          Submit
        </button>
      </form>
    </Form>
  );
} 