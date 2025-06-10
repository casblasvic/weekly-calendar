'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

import { PosTerminalForm } from '../components/PosTerminalForm';
import {
  getPosTerminal,
  updatePosTerminal,
  type PosTerminalFormValues,
  type PosTerminal
} from '@/lib/api/pos-terminals';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditPosTerminalPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const terminalId = params.id as string;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query para obtener los datos del terminal a editar
  const { 
    data: initialData,
    isLoading: isLoadingData,
    isError: isLoadError,
    error: loadError
  } = useQuery<PosTerminal, Error>({
    queryKey: ['posTerminal', terminalId],
    queryFn: () => getPosTerminal(terminalId),
    enabled: !!terminalId, // Solo ejecutar si hay ID
  });

  // Log para depurar
  useEffect(() => {
    console.log('[EditPosTerminalPage] Query state:', {
      terminalId,
      initialData,
      isLoadingData,
      isLoadError,
      loadError: loadError?.message
    });
  }, [terminalId, initialData, isLoadingData, isLoadError, loadError]);

  const mutation = useMutation({
    mutationFn: (data: PosTerminalFormValues) => updatePosTerminal(terminalId, data),
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('config_pos_terminals.form.success_update'),
        variant: "default",
      });
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['posTerminals'] });
      queryClient.invalidateQueries({ queryKey: ['posTerminal', terminalId] });
      // Redirigir a la página principal
      router.push('/configuracion/terminales-pos');
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('config_pos_terminals.form.error_update'),
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
    onSettled: () => {
       // No es necesario setIsSubmitting aquí
    },
  });

  const handleUpdateSubmit = async (data: PosTerminalFormValues) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  // Skeleton para el título mientras carga t o datos
  const TitleSkeleton = () => <Skeleton className="h-8 w-72 mb-6" />;

  if (isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <TitleSkeleton />
        {/* Skeleton para el formulario */}
        <div className="space-y-8">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        {/* Skeleton para botones flotantes */}
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (isLoadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">
          {t ? t('config_pos_terminals.form.edit_title', { name: initialData?.name || '...' }) : <TitleSkeleton />}
        </h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
          <AlertDescription>
            {loadError?.message || t('config_pos_terminals.form.error_load')}
          </AlertDescription>
        </Alert>
        {/* Botón volver en caso de error */}
         <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
           <Button variant="outline" onClick={() => router.back()}> 
             <ArrowLeft className="h-4 w-4 mr-2" />
             {t('common.back')}
           </Button>
         </div>
      </div>
    );
  }

  if (!initialData) {
     // Manejo por si acaso los datos son nulos después de cargar sin error
     return (
       <div className="container mx-auto px-4 py-8">
         <h1 className="text-2xl font-semibold mb-6">
           {t ? t('config_pos_terminals.form.edit_title', { name: '' }) : <TitleSkeleton />}
         </h1>
         <Alert variant="default">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>{t('common.not_found')}</AlertTitle>
           <AlertDescription>
             {t('config_pos_terminals.toast.not_found_error')}
           </AlertDescription>
         </Alert>
         <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
           <Button variant="outline" onClick={() => router.back()}> 
             <ArrowLeft className="h-4 w-4 mr-2" />
             {t('common.back')}
           </Button>
         </div>
       </div>
     );
   }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <h1 className="text-2xl font-semibold mb-6">
        {t ? t('config_pos_terminals.form.edit_title', { name: initialData?.name || '' }) : <TitleSkeleton />}
      </h1>
      
      <PosTerminalForm 
        initialData={initialData} 
        onSubmit={handleUpdateSubmit} 
        isLoading={isSubmitting} 
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
          type="button" 
          onClick={() => {
            const formElement = document.querySelector('form');
            if (formElement) {
               const submitButton = document.getElementById('pos-terminal-form-submit') as HTMLButtonElement | null;
               submitButton?.click();
            }
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('common.saving') : t('common.saveChanges')}
        </Button>
      </div>
    </div>
  );
} 