'use client'

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { BankForm } from '../components/bank-form';
import { type BankFormValues } from '@/lib/schemas/bank';
import { useToast } from "@/components/ui/use-toast";

// Función de mutación para crear un banco
async function createBank(bankData: BankFormValues) {
  const response = await fetch('/api/banks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bankData),
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar si el cuerpo no es JSON */ }
    // Lanzar error para que onError de useMutation lo capture
    throw new Error(errorMsg);
  }

  return response.json(); // Devolver los datos del banco creado
}

export default function NewBankPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Configurar la mutación
  const mutation = useMutation({
    mutationFn: createBank,
    onSuccess: (data) => {
      toast({
        title: t('common.success'),
        description: t('config_banks.toast.create_success'),
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      router.push('/configuracion/bancos');
    },
    onError: (error) => {
      console.error("Error al crear el banco:", error);
      toast({
        title: t('common.errors.savingTitle'),
        description: error.message || t('config_banks.toast.create_error'),
        variant: "destructive",
      });
    },
  });

  const isLoading = mutation.isPending;

  const handleCreateBank = async (data: BankFormValues) => {
    console.log("Llamando a mutation.mutate con:", data);
    mutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col">
      <h1 className="text-2xl font-semibold mb-6">
        {t('config_banks.new_title')}
      </h1>
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-20">
        <BankForm onSubmit={handleCreateBank} isLoading={isLoading} />
      </div>
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          onClick={() => {
            (document.getElementById('bank-form') as HTMLFormElement | null)?.requestSubmit();
          }}
        >
          {isLoading ? (
            <> 
              {t('common.saving')}...
            </> 
          ) : (
            <> 
              <Save className="h-4 w-4 mr-2" />
              {t('common.save')}
            </> 
          )}
        </Button>
      </div>
    </div>
  );
} 