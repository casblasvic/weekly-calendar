'use client'

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";

import { clinicPaymentSettingFormSchema, type ClinicPaymentSettingFormValues } from '@/lib/schemas/clinic-payment-setting';
import { createClinicPaymentSetting, updateClinicPaymentSetting, getClinicPaymentSettings, type ClinicPaymentSettingWithRelations } from '@/lib/api/clinicPaymentSettings';
import { getClinics } from '@/lib/api/clinics';
import { getBankAccounts, type BankAccount } from '@/lib/api/bank-accounts';
import { getPosTerminals, type PosTerminal } from '@/lib/api/pos-terminals';

import { PaymentMethodType } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';

interface ClinicSettingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethodDefinitionId: string;
  paymentMethodType: PaymentMethodType;
  initialData?: ClinicPaymentSettingWithRelations | null;
}

// Extend PosTerminal type locally if bankAccount relation isn't included by default in getPosTerminals
type PosTerminalWithOptionalAccount = PosTerminal & { bankAccount?: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null };

export function ClinicSettingFormModal({
  isOpen,
  onClose,
  paymentMethodDefinitionId,
  paymentMethodType,
  initialData,
}: ClinicSettingFormModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const defaultFormValues = useMemo(() => 
    isEditing && initialData
      ? {
          clinicId: initialData.clinicId,
          paymentMethodDefinitionId: initialData.paymentMethodDefinitionId,
          isActiveInClinic: initialData.isActiveInClinic,
          receivingBankAccountId: initialData.receivingBankAccountId,
          posTerminalId: initialData.posTerminalId,
          isDefaultPosTerminal: initialData.isDefaultPosTerminal ?? false,
          isDefaultReceivingBankAccount: initialData.isDefaultReceivingBankAccount ?? false,
        }
      : {
          clinicId: '',
          paymentMethodDefinitionId: paymentMethodDefinitionId,
          isActiveInClinic: true,
          receivingBankAccountId: null,
          posTerminalId: null,
          isDefaultPosTerminal: false,
          isDefaultReceivingBankAccount: false,
        }
  , [isEditing, initialData, paymentMethodDefinitionId]);

  const form = useForm<ClinicPaymentSettingFormValues>({
    resolver: zodResolver(clinicPaymentSettingFormSchema),
    defaultValues: defaultFormValues,
  });

  // --- Variables observadas del formulario ---
  const selectedClinicId = form.watch('clinicId');
  const watchedPosTerminalId = form.watch('posTerminalId');
  const watchedReceivingBankAccountId = form.watch('receivingBankAccountId');

  // --- Queries para Selects y Configuraciones Existentes ---
  const { data: clinics, isLoading: isLoadingClinics, isFetching: isFetchingClinics } = useQuery({
    queryKey: ['clinicsList', { isActive: true }],
    queryFn: () => getClinics({ isActive: true }),
    enabled: isOpen,
    staleTime: Infinity,
  });

  const { data: bankAccounts, isLoading: isLoadingBankAccounts, isFetching: isFetchingBankAccounts } = useQuery<BankAccount[], Error>({
    queryKey: ['bankAccountsList', { isActive: true }],
    queryFn: () => getBankAccounts({ isActive: true }),
    enabled: isOpen && paymentMethodType !== PaymentMethodType.CARD,
    staleTime: 1000 * 60 * 5,
  });

  const { data: posTerminals, isLoading: isLoadingPosTerminals, isFetching: isFetchingPosTerminals } = useQuery<
    PosTerminalWithOptionalAccount[], Error
   >({
    queryKey: ['posTerminalsListWithAccount', { isActive: true }],
    queryFn: () => getPosTerminals({ isActive: true, includeBankAccount: true }),
    enabled: isOpen && paymentMethodType === PaymentMethodType.CARD,
    staleTime: 1000 * 60 * 5,
  });
  
  const { data: existingSettingsForClinic, isLoading: isLoadingExistingSettings, isFetching: isFetchingExistingSettings } = useQuery<ClinicPaymentSettingWithRelations[], Error>({
    queryKey: ['clinicPaymentSettingsByClinic', { clinicId: selectedClinicId }],
    queryFn: () => getClinicPaymentSettings({ clinicId: selectedClinicId }), 
    enabled: !!selectedClinicId && isOpen, 
    staleTime: 1000 * 60 * 5, 
  });
  // --- Fin Queries ---

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultFormValues);
    }
  }, [isOpen, defaultFormValues, form]);

  // --- Cálculo de IDs ya usados en OTRAS configuraciones para esta clínica ---
  const usedBankAccountIds = useMemo(() => {
    if (!existingSettingsForClinic || !selectedClinicId) return new Set<string>();
    const otherSettings = isEditing && initialData
        ? existingSettingsForClinic.filter(setting => setting.id !== initialData.id)
        : existingSettingsForClinic;
    return new Set(
        otherSettings
            .filter(setting => setting.clinicId === selectedClinicId) 
            .map(setting => setting.receivingBankAccountId)
            .filter((id): id is string => !!id) 
    );
  }, [existingSettingsForClinic, selectedClinicId, isEditing, initialData]);

  const usedPosTerminalIds = useMemo(() => {
    if (!existingSettingsForClinic || !selectedClinicId) return new Set<string>();
    const otherSettings = isEditing && initialData
        ? existingSettingsForClinic.filter(setting => setting.id !== initialData.id)
        : existingSettingsForClinic;
    return new Set(
        otherSettings
            .filter(setting => setting.clinicId === selectedClinicId)
            .map(setting => setting.posTerminalId)
            .filter((id): id is string => !!id)
    );
  }, [existingSettingsForClinic, selectedClinicId, isEditing, initialData]);
  // --- Fin Cálculo IDs Usados ---

  const associatedBankAccount = useMemo(() => {
      if (paymentMethodType !== PaymentMethodType.CARD || !watchedPosTerminalId || !posTerminals) {
          return null;
      }
      const selectedTerminal = posTerminals.find(t => t.id === watchedPosTerminalId);
      return selectedTerminal?.bankAccount ?? null; 
  }, [paymentMethodType, watchedPosTerminalId, posTerminals]);

  // --- Mutación ---
  const mutation = useMutation({
    mutationFn: (data: ClinicPaymentSettingFormValues) => {
        const payload = { ...data, paymentMethodDefinitionId };
        if (paymentMethodType === PaymentMethodType.CARD) {
            payload.receivingBankAccountId = null;
            payload.isDefaultReceivingBankAccount = false; 
            if (payload.posTerminalId === null) payload.isDefaultPosTerminal = false;
        } else {
            payload.posTerminalId = null;
            payload.isDefaultPosTerminal = false;
             if (payload.receivingBankAccountId === null) payload.isDefaultReceivingBankAccount = false;
        }
        
        if (isEditing && initialData?.id) {
            return updateClinicPaymentSetting(initialData.id, payload);
        } else {
            return createClinicPaymentSetting(payload);
        }
    },
    onSuccess: (savedData) => {
      toast({
        title: isEditing ? t('common.success_edit_title') : t('common.success_create_title'),
        description: isEditing 
            ? t('config_clinic_payment_settings.success_edit_desc', { clinicName: savedData?.clinic?.name ?? 'N/A' }) 
            : t('config_clinic_payment_settings.success_create_desc', { clinicName: savedData?.clinic?.name ?? 'N/A' }),
      });
      queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', { paymentMethodDefinitionId }] });
      queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettingsByClinic', { clinicId: selectedClinicId }] });
      onClose();
    },
    onError: (error) => {
      console.error("Error saving clinic payment setting:", error);
      toast({
        title: isEditing ? t('common.error_edit_title') : t('common.error_create_title'),
        description: error.message || t('common.error_general_desc'),
        variant: "destructive",
      });
    },
  });
  // --- Fin Mutación ---

  const onSubmit = (data: ClinicPaymentSettingFormValues) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      onClose();
    }
  };

  const isLoading = mutation.isPending;

  const isFetchingSelectData = isFetchingClinics || 
                              (paymentMethodType !== PaymentMethodType.CARD && isFetchingBankAccounts) ||
                              (paymentMethodType === PaymentMethodType.CARD && isFetchingPosTerminals);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] p-6">
        <DialogHeader>
          <DialogTitle>
            {isEditing 
                ? t('config_clinic_payment_settings.edit_modal_title') 
                : t('config_clinic_payment_settings.create_modal_title')}
          </DialogTitle>
          <DialogDescription>
             {isEditing 
                ? t('config_clinic_payment_settings.edit_modal_desc') 
                : t('config_clinic_payment_settings.create_modal_desc')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            id="clinic-setting-form" 
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 max-h-[65vh] overflow-y-auto pr-3"
          >
            
            {/* Columna 1 */} 
            <div className="md:col-span-1 space-y-4">
                {/* --- Clínica --- */} 
                <FormField
                  control={form.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('config_clinic_payment_settings.form_labels.clinicId')}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value ?? ''} 
                        disabled={isFetchingClinics || isEditing || isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className={isFetchingClinics ? 'justify-start' : ''}>
                             {isFetchingClinics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            <SelectValue placeholder={isFetchingClinics ? t('common.loading') : t('config_clinic_payment_settings.form_placeholders.clinicId')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!isLoadingClinics && clinics?.map((clinic: any) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                          {!isLoadingClinics && (!clinics || clinics.length === 0) && 
                            <SelectItem value="no-clinics" disabled>{t('config_clinic_payment_settings.no_clinics_available')}</SelectItem> 
                          }
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* --- Activo en Clínica --- */} 
                <FormField
                  control={form.control}
                  name="isActiveInClinic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>{t('config_clinic_payment_settings.form_labels.isActiveInClinic')}</FormLabel>
                            <FormDescription>
                                {t('config_clinic_payment_settings.form_descriptions.isActiveInClinic')}
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
                
                {/* --- TPV (Solo si CARD) --- */} 
                {paymentMethodType === PaymentMethodType.CARD && (
                  <FormField
                    control={form.control}
                    name="posTerminalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('config_clinic_payment_settings.form_labels.posTerminalId')}</FormLabel>
                        <Select 
                           onValueChange={field.onChange} 
                           value={field.value ?? 'none'} 
                           disabled={isLoading || !selectedClinicId || isFetchingPosTerminals}
                        >
                          <FormControl>
                            <SelectTrigger className={isFetchingPosTerminals ? 'justify-start' : ''}>
                               {isFetchingPosTerminals && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                              <SelectValue placeholder={
                                  !selectedClinicId ? t('config_clinic_payment_settings.select_clinic_first') 
                                  : isFetchingPosTerminals ? t('common.loading') 
                                  : t('config_clinic_payment_settings.form_placeholders.posTerminalId')}/>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {!isFetchingPosTerminals && <SelectItem value="none">{t('common.none')}</SelectItem>} 
                              {!isFetchingPosTerminals && posTerminals?.map((terminal) => {
                                  const isUsed = usedPosTerminalIds.has(terminal.id);
                                  return (
                                      <SelectItem 
                                          key={terminal.id} 
                                          value={terminal.id} 
                                          disabled={isUsed}
                                      >
                                          {terminal.name} {terminal.provider ? `(${terminal.provider})` : ''}
                                          {isUsed && <span className="ml-2 text-xs text-muted-foreground">({t('config_clinic_payment_settings.already_assigned')})</span>} 
                                      </SelectItem>
                                  );
                              })}
                              {!isFetchingPosTerminals && (!posTerminals || posTerminals.length === 0) && 
                                  <SelectItem value="no-terminals" disabled>{t('config_clinic_payment_settings.no_pos_terminals_available')}</SelectItem> 
                              }
                          </SelectContent>
                        </Select>
                         <FormDescription>
                             {t('config_clinic_payment_settings.form_descriptions.posTerminalId')}
                         </FormDescription>
                        <FormMessage />
                         {associatedBankAccount && (
                            <div className="mt-2 text-xs text-muted-foreground border p-2 rounded-md bg-muted/50">
                                <span>{t('config_clinic_payment_settings.associated_account')}: </span>
                                <span className="font-medium">{associatedBankAccount.accountName} (...{associatedBankAccount.iban?.slice(-4)})</span>
                            </div>
                         )}
                      </FormItem>
                    )}
                  />
                 )}
            </div>
            
            {/* Columna 2 */} 
            <div className="md:col-span-1 space-y-4">
                {/* --- Cuenta Bancaria Receptora (Solo si NO es CARD) --- */} 
                {paymentMethodType !== PaymentMethodType.CARD && (
                    <FormField
                      control={form.control}
                      name="receivingBankAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('config_clinic_payment_settings.form_labels.receivingBankAccountId')}</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === 'none' ? null : value)} 
                            value={field.value ?? 'none'} 
                            disabled={isLoading || !selectedClinicId || isFetchingBankAccounts}
                          >
                            <FormControl>
                              <SelectTrigger className={isFetchingBankAccounts ? 'justify-start' : ''}>
                                 {isFetchingBankAccounts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                 <SelectValue placeholder={
                                     !selectedClinicId ? t('config_clinic_payment_settings.select_clinic_first') 
                                     : isFetchingBankAccounts ? t('common.loading')
                                     : t('config_clinic_payment_settings.form_placeholders.receivingBankAccountId')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {!isFetchingBankAccounts && <SelectItem value="none">{t('common.none')}</SelectItem>} 
                                {!isFetchingBankAccounts && bankAccounts?.map((account) => {
                                    const isUsed = usedBankAccountIds.has(account.id);
                                    return (
                                        <SelectItem 
                                            key={account.id} 
                                            value={account.id}
                                            disabled={isUsed}
                                        >
                                            {account.accountName} ({account.iban ? `...${account.iban.slice(-4)}` : t('common.iban_not_available')})
                                            {isUsed && <span className="ml-2 text-xs text-muted-foreground">({t('config_clinic_payment_settings.already_assigned')})</span>} 
                                        </SelectItem>
                                    );
                                })}
                                {!isFetchingBankAccounts && (!bankAccounts || bankAccounts.length === 0) && 
                                    <SelectItem value="no-accounts" disabled>{t('config_clinic_payment_settings.no_bank_accounts_available')}</SelectItem> 
                                }
                            </SelectContent>
                          </Select>
                           <FormDescription>
                               {t('config_clinic_payment_settings.form_descriptions.receivingBankAccountId')}
                           </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 )}
                
                {/* --- Checkbox "Cuenta Bancaria Predeterminada" (Solo si NO es CARD) --- */} 
                {paymentMethodType !== PaymentMethodType.CARD && (
                    <FormField
                      control={form.control}
                      name="isDefaultReceivingBankAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>{t('config_clinic_payment_settings.form_labels.isDefaultReceivingBankAccount')}</FormLabel>
                                <FormDescription>
                                     {t('config_clinic_payment_settings.form_descriptions.isDefaultReceivingBankAccount')}
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={!watchedReceivingBankAccountId || usedBankAccountIds.has(watchedReceivingBankAccountId) || isLoading}
                                  />
                            </FormControl>
                        </FormItem>
                      )}
                    />
                )}
                
                {/* --- Checkbox "TPV Predeterminado" (Solo si es CARD) --- */} 
                {paymentMethodType === PaymentMethodType.CARD && (
                     <FormField
                      control={form.control}
                      name="isDefaultPosTerminal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>{t('config_clinic_payment_settings.form_labels.isDefaultPosTerminal')}</FormLabel>
                                <FormDescription>
                                    {t('config_clinic_payment_settings.form_descriptions.isDefaultPosTerminal')}
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={!watchedPosTerminalId || usedPosTerminalIds.has(watchedPosTerminalId) || isLoading} 
                                  />
                            </FormControl>
                        </FormItem>
                      )}
                    />
                )}
            </div>
            
          </form>
        </Form>
        
        <DialogFooter>
            <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
            >
                {t('common.cancel')}
            </Button>
            <Button 
                type="submit" 
                form="clinic-setting-form"
                disabled={isLoading || !selectedClinicId}
            >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('common.save_changes') : t('common.create')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}