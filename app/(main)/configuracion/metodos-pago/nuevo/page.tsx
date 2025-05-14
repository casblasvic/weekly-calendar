'use client'

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPaymentMethod } from '@/lib/api/paymentMethods';
import { type PaymentMethodDefinitionFormValues } from '@/lib/schemas/payment-method-definition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { PaymentMethodForm } from '../components/payment-method-form';

export default function NewPaymentMethodPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const redirectBackTo = searchParams.get('redirectBackTo');
  const isFromEditPage = !!redirectBackTo;

  const mutation = useMutation<any, Error, PaymentMethodDefinitionFormValues>({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('config_payment_methods.create_success_message'),
      });
      queryClient.invalidateQueries({ queryKey: ['paymentMethodDefinitions'] });
      if (redirectBackTo) {
        router.push(redirectBackTo);
      } else {
        router.push('/configuracion/metodos-pago');
      }
      router.refresh();
    },
    onError: (error: any) => {
      console.error("Error creating payment method:", error);
      const errorMessage = error.response?.data?.message || error.message || t('common.errors.genericError');
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: errorMessage,
      });
    },
  });

  async function onSubmit(data: PaymentMethodDefinitionFormValues) {
    if (isFromEditPage) {
      data.isActive = true;
    }
    mutation.mutate(data);
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">
        {t('config_payment_methods.create_page_title')}
      </h1>

      <Card className="flex-grow mb-20">
        <CardHeader>
          <CardTitle>{t('config_payment_methods.form_title')}</CardTitle>
          <CardDescription>
            {t('config_payment_methods.form_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodForm
            onSubmit={onSubmit}
            isLoading={mutation.isPending}
            isEditMode={false}
            forceGlobalActive={isFromEditPage}
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (redirectBackTo) {
              const decodedUrl = decodeURIComponent(redirectBackTo);
              router.push(decodedUrl);
            } else {
              router.back();
            }
          }}
          disabled={mutation.isPending}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={() => {
            (document.getElementById('payment-method-form') as HTMLFormElement | null)?.requestSubmit();
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {t('common.create')}
        </Button>
      </div>
    </div>
  );
} 