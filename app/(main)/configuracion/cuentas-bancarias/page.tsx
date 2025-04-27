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

// Importar componentes de la tabla
import { BankAccountDataTable } from './components/data-table';
import { type BankAccountData } from './components/columns'; 

// Función para obtener las cuentas bancarias
async function fetchBankAccounts(): Promise<BankAccountData[]> {
  // Llamar a la API que ya creamos
  const response = await fetch('/api/bank-accounts'); 
  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar si el cuerpo no es JSON */ }
    console.error("Error fetching bank accounts:", errorMsg);
    // Lanzar error para que react-query lo capture
    throw new Error(errorMsg);
  }
  return response.json();
}

export default function BankAccountsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Usar useQuery para obtener los datos
  const { 
    data: bankAccountsData = [], // Valor por defecto: array vacío
    isLoading,
    isError,
    error 
  } = useQuery<BankAccountData[], Error>({
    queryKey: ['bankAccounts'], // Clave única para esta query
    queryFn: fetchBankAccounts, // Función que llama a la API
    // Opciones adicionales si se necesitan (ej: staleTime)
    // staleTime: 1000 * 60 * 1, // 1 minuto
  });

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col">
      {/* Título */}
      <h1 className="text-2xl font-semibold mb-6">
        {isLoading ? <Skeleton className="h-8 w-72" /> : t('config_bank_accounts.page_title')}
      </h1>

      {/* Alerta de Error */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
          <AlertDescription>
            {error?.message || t('common.errors.loadingDesc')}
          </AlertDescription>
        </Alert>
      )}

      {/* Contenedor de la tabla */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-20">
         {/* Usar la DataTable real pasando los datos y estado de carga */}
         <BankAccountDataTable data={bankAccountsData} isLoading={isLoading} />
      </div>

      {/* Botones Flotantes Fijos */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading} // Deshabilitar si está cargando
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.cancel')}
        </Button>
        {/* TODO: Añadir botón Ayuda si es necesario */}
        <Link href="/configuracion/cuentas-bancarias/nuevo" passHref>
          <Button disabled={isLoading}> {/* Deshabilitar si está cargando */}
            <Plus className="h-4 w-4 mr-2" />
            {t('config_bank_accounts.add_button')}
          </Button>
        </Link>
      </div>
    </div>
  );
} 