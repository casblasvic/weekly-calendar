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
import { type Bank } from './components/columns';

// Función para obtener los bancos desde la API, aceptando clinicId opcional
async function fetchBanks(clinicId?: string): Promise<Bank[]> {
  // Construir la URL base
  let apiUrl = '/api/banks';
  // Añadir clinicId como query parameter si existe
  if (clinicId) {
    apiUrl += `?clinicId=${encodeURIComponent(clinicId)}`;
  }

  const response = await fetch(apiUrl); // Usar la URL construida
  if (!response.ok) {
    // Intentar obtener mensaje de error del cuerpo si existe
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar si el cuerpo no es JSON */ }
    throw new Error(errorMsg);
  }
  return response.json() as Promise<Bank[]>;
}

// El componente principal puede aceptar clinicId como prop (opcional)
interface BanksPageProps {
  clinicId?: string; // ID de la clínica para filtrar (opcional)
}

export default function BanksPage({ clinicId }: BanksPageProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Usar useQuery para obtener los datos
  const { 
    data: banksData = [], // Mantener nombre de variable, pero ahora es de tipo Bank[]
    isLoading,
    isError,
    error 
  } = useQuery<Bank[], Error>({
    queryKey: ['banks', clinicId || null], 
    queryFn: () => fetchBanks(clinicId), 
  });

  return (
    <div className="container relative flex flex-col min-h-screen px-4 py-6 mx-auto">
      {/* Encabezado con icono y título */}
      <div className="flex items-center mb-6">
        <Building className="w-6 h-6 mr-2 text-purple-600" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {/* Ajustar título si se está filtrando por clínica */}
          {clinicId 
            ? t('config_banks.page_title_filtered') // Necesitarás añadir esta clave
            : t('config_banks.page_title')
          }
        </h1>
      </div>

      {/* Alerta de Error */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
          <AlertDescription>
            {error?.message || t('common.errors.loadingDesc')}
          </AlertDescription>
        </Alert>
      )}

      {/* Contenedor de la tabla */}
      <div className="flex-grow p-4 mb-20 bg-white border rounded-lg shadow-sm md:p-6">
         <BankDataTable data={banksData} isLoading={isLoading} />
      </div>

      {/* Botones Flotantes Fijos */}
      <div className="fixed z-50 flex items-center gap-2 bottom-4 right-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <Link href="/configuracion/bancos/nuevo" passHref>
          <Button disabled={isLoading} className="bg-purple-600 hover:bg-purple-700"> 
            <Plus className="w-4 h-4 mr-2" />
            {t('config_banks.add_button')}
          </Button>
        </Link>
      </div>
    </div>
  );
} 