'use client'

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/components/ui/use-toast";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPaymentMethod } from '@/lib/api/paymentMethods';

import { PaymentMethodType } from '@prisma/client';
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
import { ArrowLeft, Loader2, Plus } from 'lucide-react';

export default function NewPaymentMethodPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);

  const form = useForm<PaymentMethodDefinitionFormValues>({
    resolver: zodResolver(paymentMethodDefinitionFormSchema),
    defaultValues: {
      name: '',
      type: undefined,
      details: null,
      isActive: true,
    },
  });

  const mutation = useMutation<any, Error, PaymentMethodDefinitionFormValues>({
    mutationFn: createPaymentMethod,
    onMutate: () => {
      setIsSubmittingInternal(true);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('config_payment_methods.create_success_message'),
      });
      queryClient.invalidateQueries({ queryKey: ['paymentMethodDefinitions'] });
      router.push('/configuracion/metodos-pago');
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
    onSettled: () => {
      setIsSubmittingInternal(false);
    },
  });

  async function onSubmit(data: PaymentMethodDefinitionFormValues) {
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="payment-method-form" className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_payment_methods.form_labels.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('config_payment_methods.form_placeholders.name')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_payment_methods.form_labels.type')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('config_payment_methods.form_placeholders.type')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PaymentMethodType).map((typeValue) => (
                          <SelectItem key={typeValue} value={typeValue}>
                            {t(`enums.PaymentMethodType.${typeValue}`)}
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
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('config_payment_methods.form_labels.details')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('config_payment_methods.form_placeholders.details')}
                        className="resize-none"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                     <FormDescription>
                        {t('config_payment_methods.form_descriptions.details')}
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('config_payment_methods.form_labels.isActive')}
                      </FormLabel>
                      <FormDescription>
                        {t('config_payment_methods.form_descriptions.isActive')}
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
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
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