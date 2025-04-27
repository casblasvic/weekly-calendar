'use client'

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Plus } from 'lucide-react';
import { PaymentMethodDefinitionDataTable } from './components/data-table';
import { type PaymentMethodDefinitionData } from './components/columns';
import { PaymentMethodType } from '@prisma/client';
import { getPaymentMethods } from '@/lib/api/paymentMethods';

// <<< Placeholder: Definición del tipo de datos esperado de la API >>>
// Adaptar según el schema Prisma final para PaymentMethodDefinition
// type PaymentMethodDefinitionData = {
//   id: string;
//   name: string;
//   type: string; // Debería ser PaymentMethodType enum
//   details: string | null;
//   isActive: boolean;
// };

// <<< Placeholder: Componente DataTable (Reemplazar con el real) >>>
// const PaymentMethodDefinitionDataTablePlaceholder = ({ isLoading }: { isLoading: boolean }) => { ... };

export default function PaymentMethodsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const { 
    data: paymentMethodsData = [], 
    isLoading,
    isError,
    error
  } = useQuery<PaymentMethodDefinitionData[], Error>({
    queryKey: ['paymentMethodDefinitions'],
    queryFn: getPaymentMethods,
  });

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col">
      {/* Título */}
      <h1 className="text-2xl font-semibold mb-6">
        {isLoading ? <Skeleton className="h-8 w-72" /> : t('config_payment_methods.page_title')}
      </h1>

      {/* Alerta de Error */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
          <AlertDescription>
            {/* Mostrar mensaje de error específico si está disponible */}
            {error?.message || t('common.errors.loadingDesc')}
          </AlertDescription>
        </Alert>
      )}

      {/* Contenedor de la tabla */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-20">
         {/* Usar la DataTable real pasando los datos y estado de carga */}
         <PaymentMethodDefinitionDataTable data={paymentMethodsData} isLoading={isLoading} />
      </div>

      {/* Botones Flotantes Fijos */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading} 
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.cancel')}
        </Button>
        {/* TODO: Implementar botón Ayuda */}
        {/* <Button variant="secondary" disabled={isLoading}><HelpCircle className="h-4 w-4 mr-2" />{t('common.help')}</Button> */}
        <Link href="/configuracion/metodos-pago/nuevo" passHref>
          <Button disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            {t('config_payment_methods.add_button')}
          </Button>
        </Link>
      </div>
    </div>
  );
} 