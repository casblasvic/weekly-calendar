'use client'

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Building, Plus } from 'lucide-react';
import { BankDataTable } from './components/data-table';
import { type BankData } from './components/columns';

// Función para obtener los bancos desde la API
async function fetchBanks(): Promise<BankData[]> {
  const response = await fetch('/api/banks');
  if (!response.ok) {
    // Intentar obtener mensaje de error del cuerpo si existe
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar si el cuerpo no es JSON */ }
    throw new Error(errorMsg);
  }
  return response.json();
}

export default function BanksPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Usar useQuery para obtener los datos
  const { 
    data: banksData = [], // Valor por defecto: array vacío
    isLoading,
    isError,
    error 
  } = useQuery<BankData[], Error>({
    queryKey: ['banks'], // Clave única para esta query
    queryFn: fetchBanks, // Función que llama a la API
  });

  return (
    <div className="container mx-auto px-4 py-6 relative min-h-screen flex flex-col">
      {/* Encabezado con icono y título */}
      <div className="flex items-center mb-6">
        <Building className="h-6 w-6 text-purple-600 mr-2" />
        <h1 className="text-2xl font-semibold text-gray-900">
        {t('config_banks.page_title')}
      </h1>
      </div>

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
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border flex-grow mb-20">
         <BankDataTable data={banksData} isLoading={isLoading} />
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
        <Link href="/configuracion/bancos/nuevo" passHref>
          <Button disabled={isLoading} className="bg-purple-600 hover:bg-purple-700"> 
            <Plus className="h-4 w-4 mr-2" />
            {t('config_banks.add_button')}
          </Button>
        </Link>
      </div>
    </div>
  );
} 