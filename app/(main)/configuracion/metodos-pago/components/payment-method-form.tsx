'use client'

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { PaymentMethodType } from '@prisma/client';
import { paymentMethodDefinitionFormSchema, type PaymentMethodDefinitionFormValues } from '@/lib/schemas/payment-method-definition';

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface PaymentMethodFormProps {
  onSubmit: (data: PaymentMethodDefinitionFormValues) => void;
  initialData?: Partial<PaymentMethodDefinitionFormValues> | null;
  isLoading?: boolean;
  isEditMode: boolean;
  disableTypeField?: boolean;
  forceGlobalActive?: boolean;
}

export function PaymentMethodForm({
  onSubmit,
  initialData,
  isLoading = false,
  isEditMode,
  disableTypeField = false,
  forceGlobalActive = false,
}: PaymentMethodFormProps) {
  const { t } = useTranslation();

  const form = useForm<PaymentMethodDefinitionFormValues>({
    resolver: zodResolver(paymentMethodDefinitionFormSchema),
    defaultValues: {
      name: '',
      type: undefined,
      details: null,
      isActive: forceGlobalActive ? true : (initialData?.isActive ?? true),
      ...initialData,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: '',
        type: undefined,
        details: null,
        isActive: forceGlobalActive ? true : (initialData?.isActive ?? true),
        ...initialData
      });
    } else if (forceGlobalActive) {
      form.setValue('isActive', true, { shouldValidate: false });
    }
  }, [initialData, forceGlobalActive, form]);

  const formId = isEditMode ? "payment-method-edit-form" : "payment-method-form";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} id={formId} className="space-y-6">
        {/* Campo Nombre */}
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

        {/* Campo Tipo */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 mb-1">
                <FormLabel>{t('config_payment_methods.form_labels.type')}</FormLabel>
              </div>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
                disabled={disableTypeField || isLoading}
              >
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

        {/* Campo Detalles */}
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

        {/* Campo Activo */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
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
                  disabled={isLoading || forceGlobalActive}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
} 