'use client'

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Landmark, Plus } from 'lucide-react';
import { LegalEntityDataTable } from './components/data-table';
import { type LegalEntity, columns as legalEntityColumns } from './components/columns';

async function fetchLegalEntities(): Promise<LegalEntity[]> {
  const response = await fetch('/api/legal-entities');
  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar */ }
    throw new Error(errorMsg);
  }
  return response.json() as Promise<LegalEntity[]>;
}

export default function LegalEntitiesPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    data: legalEntitiesData = [], isLoading, isError, error
  } = useQuery<LegalEntity[], Error>({
    queryKey: ['legalEntities'],
    queryFn: fetchLegalEntities,
  });

  return (
    <div className="container relative flex flex-col min-h-screen px-4 py-6 mx-auto">
      <div className="flex items-center mb-6">
        <Landmark className="w-6 h-6 mr-2 text-purple-600" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('config_legal_entities.page_title', 'Sociedades Mercantiles')}
        </h1>
      </div>

      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>{t('common.errors.loadingTitle', 'Error al cargar')}</AlertTitle>
          <AlertDescription>
            {error?.message || t('common.errors.loadingDesc', 'Ocurrió un error al cargar los datos.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-grow p-4 mb-20 bg-white border rounded-lg shadow-sm md:p-6">
         <LegalEntityDataTable
            columns={legalEntityColumns}
            data={legalEntitiesData}
            isLoading={isLoading}
         />
      </div>

      <div className="fixed z-50 flex items-center gap-2 bottom-4 right-4">
        <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Volver')}
        </Button>
        <Link href="/configuracion/sociedades/nueva" passHref>
          <Button disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> {t('config_legal_entities.add_button', 'Crear Sociedad')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
