'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PaymentMethodType, ClinicPaymentSetting, PaymentMethodDefinition, Clinic, BankAccount, PosTerminal } from '@prisma/client';
import { paymentMethodDefinitionFormSchema, type PaymentMethodDefinitionFormValues } from '@/lib/schemas/payment-method-definition';

import { Button } from '@/components/ui/button';
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
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, PlusCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { getPaymentMethodById, updatePaymentMethod } from '@/lib/api/paymentMethods';
import { getClinicPaymentSettings, type ClinicPaymentSettingWithRelations } from '@/lib/api/clinicPaymentSettings';
import { ClinicPaymentSettingsTable } from './components/clinic-settings-table';
import { ClinicSettingFormModal } from './components/clinic-setting-form-modal';
import { PaymentMethodForm } from '../components/payment-method-form';

export default function EditPaymentMethodPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const paymentMethodId = params.id as string;

  const filterClinicId = searchParams.get('filterClinicId');
  const returnTo = searchParams.get('returnTo');

  const [isSubmittingGlobal, setIsSubmittingGlobal] = useState(false);
  const [isClinicSettingModalOpen, setIsClinicSettingModalOpen] = useState(false);
  const [editingClinicSetting, setEditingClinicSetting] = useState<ClinicPaymentSettingWithRelations | null>(null);

  const {
    data: paymentMethodData,
    isLoading: isLoadingGlobal,
    isError: isErrorGlobal,
    error: queryErrorGlobal
  } = useQuery<PaymentMethodDefinitionFormValues, Error>({
    queryKey: ['paymentMethodDefinition', paymentMethodId],
    queryFn: () => getPaymentMethodById(paymentMethodId),
    enabled: !!paymentMethodId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const {
    data: clinicSettingsData,
    isLoading: isLoadingClinicSettings,
    isError: isErrorClinicSettings,
    error: queryErrorClinicSettings
  } = useQuery<ClinicPaymentSettingWithRelations[], Error>({
    queryKey: ['clinicPaymentSettings', { paymentMethodDefinitionId: paymentMethodId }],
    queryFn: () => getClinicPaymentSettings({ paymentMethodDefinitionId: paymentMethodId }),
    enabled: !!paymentMethodId,
    staleTime: 1000 * 60 * 2,
  });

  const filteredClinicSettings = useMemo(() => {
    if (!clinicSettingsData) {
      return [];
    }
    if (filterClinicId) {
      return clinicSettingsData.filter(setting => setting.clinicId === filterClinicId);
    }
    return clinicSettingsData;
  }, [clinicSettingsData, filterClinicId]);

  const mutationGlobal = useMutation<any, Error, PaymentMethodDefinitionFormValues>({
    mutationFn: (data) => updatePaymentMethod(paymentMethodId, data),
    onMutate: () => {
      setIsSubmittingGlobal(true);
    },
    onSuccess: (data) => {
      toast({
        title: t('common.success'),
        description: t('config_payment_methods.update_success_message'),
      });
      queryClient.setQueryData(['paymentMethodDefinition', paymentMethodId], data);
      queryClient.invalidateQueries({ queryKey: ['paymentMethodDefinitions'] });
    },
    onError: (error) => {
      console.error("Error updating payment method definition:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message || t('common.errors.genericError'),
      });
    },
    onSettled: () => {
      setIsSubmittingGlobal(false);
    },
  });

  function onSubmitGlobal(data: PaymentMethodDefinitionFormValues) {
    mutationGlobal.mutate(data);
  }

  const handleAddClinicSetting = () => {
    setEditingClinicSetting(null);
    setIsClinicSettingModalOpen(true);
  };

  const handleEditClinicSetting = (setting: ClinicPaymentSettingWithRelations) => {
    setEditingClinicSetting(setting);
    setIsClinicSettingModalOpen(true);
  };

  const hasExistingClinicSettings = clinicSettingsData && clinicSettingsData.length > 0;
  const isTypeFieldDisabled = hasExistingClinicSettings || isLoadingClinicSettings || isSubmittingGlobal;

  if (isLoadingGlobal || isLoadingClinicSettings) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col max-w-4xl">
        <Skeleton className="h-8 w-72 mb-6" />
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card className="flex-grow mb-20">
            <CardHeader>
                 <Skeleton className="h-6 w-1/3 mb-2" />
            </CardHeader>
             <CardContent>
                 <Skeleton className="h-40 w-full" />
             </CardContent>
        </Card>
      </div>
    );
  }

  if (isErrorGlobal) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col max-w-4xl items-center justify-center">
        <Alert variant="destructive" className="mb-4 w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
          <AlertDescription>
            {queryErrorGlobal?.message || t('common.errors.loadingDesc')}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">
        {t('config_payment_methods.edit_page_title', { name: paymentMethodData?.name || '' })}
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('config_payment_methods.form_title')}</CardTitle>
          <CardDescription>
            {t('config_payment_methods.edit_form_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodForm
            onSubmit={onSubmitGlobal}
            initialData={paymentMethodData}
            isLoading={mutationGlobal.isPending || isLoadingGlobal}
            isEditMode={true}
            disableTypeField={isTypeFieldDisabled}
          />
        </CardContent>
      </Card>

      <Card className="flex-grow mb-20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('config_payment_methods.clinic_settings_title')}</CardTitle>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleAddClinicSetting}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {t('config_clinic_payment_settings.add_method_button')}
            </Button>
          </div>
          <CardDescription>{t('config_payment_methods.clinic_settings_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoadingClinicSettings || isErrorClinicSettings) && (
            <div className="text-center py-10">
              {isLoadingClinicSettings && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
              {isErrorClinicSettings && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('common.error')}</AlertTitle>
                  <AlertDescription>
                    {queryErrorClinicSettings?.message || t('config_payment_methods.errors.loading_clinic_settings')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          {!isLoadingClinicSettings && !isErrorClinicSettings && (
              <ClinicPaymentSettingsTable
                data={filteredClinicSettings}
                paymentMethodType={paymentMethodData?.type as PaymentMethodType | undefined}
                onEdit={handleEditClinicSetting}
              />
          )}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex justify-end gap-3">
           <Button 
             variant="outline" 
             onClick={() => {
               if (returnTo) {
                 const decodedUrl = decodeURIComponent(returnTo);
                 router.push(decodedUrl);
               } else {
                 router.back();
               }
             }}
             disabled={mutationGlobal.isPending}
           >
             <ArrowLeft className="h-4 w-4 mr-2" />
             {t('common.cancel')}
           </Button>
           <Button 
             type="button"
             onClick={() => {
               (document.getElementById('payment-method-edit-form') as HTMLFormElement | null)?.requestSubmit();
             }}
             disabled={mutationGlobal.isPending || isLoadingGlobal}
           >
             {mutationGlobal.isPending ? (
               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             ) : (
               <Save className="h-4 w-4 mr-2" />
             )}
             {t('common.save')}
           </Button>
        </div>
      </div>

      {isClinicSettingModalOpen && (
          <ClinicSettingFormModal
            isOpen={isClinicSettingModalOpen}
            onClose={() => setIsClinicSettingModalOpen(false)}
            paymentMethodDefinitionId={paymentMethodId}
            paymentMethodType={paymentMethodData?.type as PaymentMethodType}
            initialData={editingClinicSetting}
            forcedClinicId={filterClinicId || undefined}
          />
      )}

    </div>
  );
} 