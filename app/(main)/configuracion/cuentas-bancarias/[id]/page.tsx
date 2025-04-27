'use client'

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BankAccountForm } from '../components/bank-account-form';
import { Icons } from '@/components/icons';
import { useToast } from '@/components/ui/use-toast';
import type { BankAccountFormValues } from '@/lib/schemas/bank-account';

interface BankAccountPageProps {
  params: Promise<{
    id: string;
  }>
}

export default function EditBankAccountPage({ params }: BankAccountPageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  
  // Usar React.use para desenrrollar el objeto params que ahora es una promesa
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  // Estado para manejar la carga del botón Guardar (se pasará al formulario)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bankAccount, setBankAccount] = useState<(BankAccountFormValues & { id: string }) | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Cargar los datos de la cuenta bancaria
  useEffect(() => {
    async function fetchBankAccount() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/bank-accounts/${id}`);
        
        if (!response.ok) {
          throw new Error('Error cargando datos de la cuenta bancaria');
        }
        
        const data = await response.json();
        setBankAccount(data);
      } catch (error) {
        console.error('Error al cargar la cuenta bancaria:', error);
        setError(error instanceof Error ? error : new Error('Error desconocido'));
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('config_bank_accounts.toast.fetch_error'),
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchBankAccount();
  }, [id, t, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
        <p className="mt-4">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !bankAccount) {
    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-2xl font-semibold text-red-500 mb-4">
          {t('common.errors.fetchError')}
        </h1>
        <p className="mb-6">{error?.message || t('common.errors.generic')}</p>
        <Button onClick={() => router.back()}>
          {t('common.buttons.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Contenido principal con scroll si es necesario */}
      <div className="flex-1 overflow-y-auto pb-20"> {/* Padding bottom para dejar espacio a los botones */}
        <h1 className="text-2xl font-semibold mb-6">
          {t('config_bank_accounts.edit_title')}
        </h1>

        {/* Formulario de edición */}
        <BankAccountForm initialData={bankAccount} setIsSubmitting={setIsSubmitting} />
        
      </div>

      {/* Botones fijos en la parte inferior derecha */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button 
          onClick={() => {
            // Disparar el submit del formulario referenciado por ID
            (document.getElementById('bank-account-form') as HTMLFormElement | null)?.requestSubmit();
          }}
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t('common.buttons.save')}
        </Button>
      </div>
    </div>
  );
} 