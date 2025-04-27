'use client'

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { PosTerminalForm } from '../components/PosTerminalForm';
import { createPosTerminal, type PosTerminalFormValues } from '@/lib/api/pos-terminals';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewPosTerminalPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const preselectedBankId = searchParams.get('bancoId');

  const mutation = useMutation({
    mutationFn: createPosTerminal,
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('config_pos_terminals.toast.create_success'),
        variant: "default",
      });
      // Invalidar query para refrescar la tabla en la página principal
      queryClient.invalidateQueries({ queryKey: ['posTerminals'] });
      // Redirigir a la página principal de terminales
      router.push('/configuracion/terminales-pos');
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('config_pos_terminals.form.error_create'),
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
    onSettled: () => {
      // No necesitamos setIsSubmitting(false) aquí,
      // onSuccess ya redirige, onError lo establece.
    },
  });

  const handleCreateSubmit = async (data: PosTerminalFormValues) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  // Skeleton para el título mientras carga t
  const TitleSkeleton = () => <Skeleton className="h-8 w-64 mb-6" />;

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <h1 className="text-2xl font-semibold mb-6">
        {t ? t('config_pos_terminals.new_title') : <TitleSkeleton />}
      </h1>
      
      {/* Renderizar el formulario */}
      <PosTerminalForm 
        onSubmit={handleCreateSubmit} 
        isLoading={isSubmitting} 
        preselectedBankId={preselectedBankId ?? undefined}
      />

      {/* Botones Flotantes Fijos */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        {/* TODO: Añadir botón Ayuda si es necesario */}
        <Button 
          type="button" // Para evitar que envíe el formulario directamente
          onClick={() => {
            // Disparar el submit del formulario interno
            const formElement = document.querySelector('form'); // Asume un solo form
            if (formElement) {
              // Crear y disparar evento submit manually
              // formElement.requestSubmit(); // Opción más moderna
              // Fallback por si requestSubmit no funciona en todos lados:
               const submitButton = document.getElementById('pos-terminal-form-submit') as HTMLButtonElement | null;
               submitButton?.click();
            }
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );
} 