'use client'

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BankAccountForm } from '../components/bank-account-form';
import { Icons } from '@/components/icons'; // Para el spinner

export default function NewBankAccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extraer bankId de los parámetros de búsqueda
  const bankId = searchParams.get('bankId');

  // Estado para manejar la carga del botón Guardar (se pasará al formulario)
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <div className="flex flex-col h-full p-6">
      {/* Contenido principal con scroll si es necesario */}
      <div className="flex-1 overflow-y-auto pb-20"> {/* Padding bottom para dejar espacio a los botones */}
        <h1 className="text-2xl font-semibold mb-6">
          {t('config_bank_accounts.new_title')}
        </h1>

        {/* Formulario con bankId preseleccionado y URL de redirección si viene de edición de banco */}
        <BankAccountForm 
          setIsSubmitting={setIsSubmitting} 
          preselectedBankId={bankId || undefined}
          redirectUrl={bankId ? `/configuracion/bancos/${bankId}` : undefined}
        />
        
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
            // Asegúrate de que el <form> dentro de BankAccountForm tenga id="bank-account-form"
            (document.getElementById('bank-account-form') as HTMLFormElement | null)?.requestSubmit();
          }}
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t('config_bank_accounts.toast.create_success').includes('creada') ? 'Crear Cuenta' : t('common.buttons.save')} {/* Lógica simple para texto Crear/Guardar */}
        </Button>
        {/* <Button variant="outline" size="icon">
          <Icons.help className="h-4 w-4" /> 
        </Button> */}
      </div>
    </div>
  );
} 