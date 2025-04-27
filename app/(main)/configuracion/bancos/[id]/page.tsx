'use client'

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation'; // Importar useParams
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Plus, Copy } from 'lucide-react';
import { BankForm } from '../components/bank-form'; // <<< Solo importar el componente
import { type BankFormValues } from '@/lib/schemas/bank'; // <<< Importar el tipo desde su origen
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Importar hooks query/mutation
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // <<< Importar Card
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner'; // Importar toast

// Definir tipo esperado de la API GET [id]
// Podríamos mover esto a un archivo de tipos si se reutiliza
interface BankApiResponse extends BankFormValues {
  id: string;
  // Añadir otros campos si la API devuelve más que el formulario
}

// Función para obtener un banco por ID
async function fetchBankById(id: string): Promise<BankApiResponse> {
  const response = await fetch(`/api/banks/${id}`);
  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar */ }

    if (response.status === 404) {
      throw new Error(`Bank not found with ID: ${id}`); 
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

// <<< Función para actualizar un banco >>>
async function updateBank({ id, data }: { id: string, data: BankFormValues }): Promise<BankApiResponse> {
  const response = await fetch(`/api/banks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar */ }
    // Lanzar error para que onError de useMutation lo capture
    throw new Error(errorMsg);
  }

  return response.json(); // Devolver los datos del banco actualizado
}

// <<< NUEVO: Tipo placeholder para Cuenta Bancaria (adaptar según schema real) >>>
interface BankAccountData {
    id: string;
    accountName: string;
    iban: string;
    swiftBic: string | null; // Añadir swiftBic para mostrarlo en la tabla
    currency: string;
    isActive: boolean;
    // Añadir más campos necesarios para la tabla
}

// <<< CORREGIDO: Función para obtener cuentas bancarias de un banco >>>
async function fetchBankAccountsByBankId(bankId: string): Promise<BankAccountData[]> {
    // Usar parámetro de consulta para filtrar por bankId
    const response = await fetch(`/api/bank-accounts?bankId=${encodeURIComponent(bankId)}`);
    if (!response.ok) {
        // Manejo de errores similar a fetchBankById
        let errorMsg = `Error fetching accounts: ${response.status} ${response.statusText}`;
        try { errorMsg = (await response.json()).message || errorMsg; } catch(e){} 
        console.error(errorMsg);
        // Podríamos lanzar un error o devolver array vacío
        // throw new Error(errorMsg);
        return []; // Devolver vacío si hay error o no se implementa aún
    }
    const data = await response.json();
    // Asegurarse que la API devuelve un array
    return Array.isArray(data) ? data : [];
}

// <<< NUEVO: Tipo placeholder para Terminal POS (adaptar según schema real) >>>
interface PosTerminalData {
    id: string;
    name: string;
    bankAccountName: string; // Nombre de la cuenta asociada (para mostrar)
    provider: string | null;
    // Añadir más campos
}

// <<< CORREGIDO: Función para obtener TPVs asociados a un banco >>>
async function fetchPosTerminalsByBankId(bankId: string): Promise<PosTerminalData[]> {
    // TODO: Implementar API real. Esto requerirá una lógica más compleja en el backend:
    // 1. En el backend: Obtener BankAccounts para bankId.
    // 2. En el backend: Obtener PosTerminals filtrando por los bankAccountIds obtenidos.
    // Por ahora, simulamos una llamada que pasaría el bankId, 
    // el backend tendría que interpretarlo.
    const response = await fetch(`/api/pos-terminals?bankId=${encodeURIComponent(bankId)}`);
    if (!response.ok) {
        let errorMsg = `Error fetching terminals: ${response.status} ${response.statusText}`;
        try { errorMsg = (await response.json()).message || errorMsg; } catch(e){} 
        console.error(errorMsg);
        // throw new Error(errorMsg);
        return []; 
    }
    const data = await response.json();
    return Array.isArray(data) ? data : []; 
}

// Función para actualizar el estado isActive de una cuenta bancaria
async function toggleBankAccountActiveStatus(accountId: string, isActive: boolean): Promise<void> {
  try {
    // Usar el nuevo endpoint especializado para toggle
    const response = await fetch('/api/bank-accounts/toggle-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: accountId,
        isActive: !isActive, // Invertir el estado actual
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar el estado de la cuenta');
    }
  } catch (error) {
    console.error('Error toggleando el estado de la cuenta:', error);
    throw error;
  }
}

// Función para eliminar una cuenta bancaria
async function deleteBankAccount(accountId: string): Promise<void> {
  try {
    const response = await fetch(`/api/bank-accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al eliminar la cuenta bancaria');
    }
  } catch (error) {
    console.error('Error eliminando la cuenta bancaria:', error);
    throw error;
  }
}

// Componente Tabla de Cuentas Bancarias
const BankAccountsTable = ({ 
  accounts, 
  isLoading,
  bankId,
  onToggleActive
}: { 
  accounts: BankAccountData[], 
  isLoading: boolean,
  bankId: string,
  onToggleActive: (accountId: string, currentStatus: boolean) => Promise<void>
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Función para eliminar una cuenta bancaria
  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm(t('config_bank_accounts.delete_confirmation'))) {
      try {
        await deleteBankAccount(accountId);
        // Recargar los datos después de eliminar
        queryClient.invalidateQueries({ queryKey: ['bankAccounts', bankId] });
        toast.success(t('config_bank_accounts.toast.delete_success'));
      } catch (error) {
        console.error('Error eliminando cuenta:', error);
        toast.error(t('config_bank_accounts.toast.delete_error'));
      }
    }
  };

  // Función para copiar texto al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast(t('common.copied'));
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err);
        toast.error(t('common.copy_error'));
      });
  };

  if (isLoading) {
    return (
      <div className="border rounded-md">
        <div className="p-4 space-y-3">
          <Skeleton className="w-2/5 h-5" />
          <Skeleton className="w-4/5 h-4" />
          <Skeleton className="w-3/5 h-4" />
        </div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="border rounded-md">
        <div className="p-4 text-sm text-center text-muted-foreground">
          {t('config_banks.accounts.no_data')}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 font-medium text-left">{t('config_bank_accounts.form.accountName_label')}</th>
            <th className="px-4 py-2 font-medium text-left">{t('config_bank_accounts.form.iban_label')}</th>
            <th className="px-4 py-2 font-medium text-left">{t('config_bank_accounts.form.swiftBic_label')}</th>
            <th className="px-4 py-2 font-medium text-left">{t('config_bank_accounts.form.currency_label')}</th>
            <th className="px-4 py-2 font-medium text-center">{t('common.status.active')}</th>
            <th className="px-4 py-2 font-medium text-right w-28">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b hover:bg-muted/50">
              <td className="px-4 py-2">{account.accountName}</td>
              <td className="px-4 py-2">
                <div className="flex items-center space-x-2 font-mono">
                  <span>{account.iban}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6"
                    onClick={() => copyToClipboard(account.iban)}
                    title={t('common.copy')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </td>
              <td className="px-4 py-2">
                {account.swiftBic ? (
                  <div className="flex items-center space-x-2 font-mono">
                    <span>{account.swiftBic}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-6 h-6"
                      onClick={() => copyToClipboard(account.swiftBic!)}
                      title={t('common.copy')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-2">{account.currency}</td>
              <td className="px-4 py-2 text-center">
                <div className="flex justify-center">
                  <Switch 
                    checked={!!account.isActive} 
                    onCheckedChange={() => onToggleActive(account.id, !!account.isActive)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/configuracion/cuentas-bancarias/${account.id}`)}
                    title={t('common.edit')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteAccount(account.id)}
                    title={t('common.delete')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <line x1="10" x2="10" y1="11" y2="17"/>
                      <line x1="14" x2="14" y1="11" y2="17"/>
                    </svg>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function EditBankPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener ID del banco de los parámetros de la ruta
  const bankId = typeof params.id === 'string' ? params.id : undefined;

  // --- Query para obtener datos del banco --- 
  const {
    data: bankData,
    isLoading: isLoadingData,
    isError: isQueryError,
    error: queryError,
  } = useQuery<BankApiResponse, Error>({
    queryKey: ['banks', bankId], // Clave incluye el ID
    queryFn: () => fetchBankById(bankId!), // Llama a la función fetch
    enabled: !!bankId, // Solo ejecutar si bankId existe
    staleTime: 1000 * 60 * 5, // Datos frescos por 5 minutos
    // Podríamos añadir retry: false si no queremos reintentos automáticos en 404
  });
  // --- Fin Query ---

  // --- Mutation para actualizar datos --- 
  const mutation = useMutation({
    mutationFn: updateBank, // <<< Usar la función de actualización
    onSuccess: (updatedData) => {
      toast({
        title: t('common.success'), // Clave i18n
        description: t('config_banks.toast.update_success'),
        variant: "default",
      });
      // Invalidar query de la lista y la query de este banco específico
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['banks', bankId] }); 
      router.push('/configuracion/bancos');
    },
    onError: (error) => {
      console.error("Error al actualizar el banco:", error);
      toast({
        title: t('common.errors.savingTitle'),
        description: error.message || t('config_banks.toast.update_error'),
        variant: "destructive",
      });
    },
  });
  // --- Fin Mutation ---

  // Usar isPending de la mutación para el estado de guardado
  const isSaving = mutation.isPending;

  // Función onSubmit que llama a la mutación
  const handleUpdateBank = async (data: BankFormValues) => {
    if (!bankId) return; // No debería ocurrir si el botón está deshabilitado
    console.log("Llamando a mutation.mutate para actualizar con:", { id: bankId, data });
    mutation.mutate({ id: bankId, data }); // <<< Ejecutar la mutación
  };

  // Manejo explícito de Not Found basado en el error de la query
  const isNotFoundError = queryError?.message?.startsWith('Bank not found');

  // Mostrar carga inicial o si no hay ID
  if (!bankId) {
    // Manejar caso donde el ID no está o es inválido
    // Podríamos redirigir o mostrar un error diferente
    return (
      <div className="container px-4 py-8 mx-auto">Error: ID de banco inválido.</div>
    );
  }

  // --- NUEVO: Query para Cuentas Bancarias ---
  const {
      data: bankAccountsData = [],
      isLoading: isLoadingAccounts,
      isError: isAccountsError,
      error: accountsError,
  } = useQuery<BankAccountData[], Error>({
      queryKey: ['bankAccounts', bankId], // Clave incluye bankId
      queryFn: () => fetchBankAccountsByBankId(bankId!),
      enabled: !!bankId, // Depende de que bankId exista
      staleTime: 1000 * 60 * 2, // Datos frescos por 2 minutos
  });

  // --- NUEVO: Query para Terminales POS ---
    const {
      data: posTerminalsData = [],
      isLoading: isLoadingPosTerminals,
      isError: isPosTerminalsError,
      error: posTerminalsError,
  } = useQuery<PosTerminalData[], Error>({
      queryKey: ['posTerminals', bankId], // Clave incluye bankId
      queryFn: () => fetchPosTerminalsByBankId(bankId!),
      enabled: !!bankId, // Depende de que bankId exista
      staleTime: 1000 * 60 * 2, // Datos frescos por 2 minutos
  });

  // --- Componentes Placeholder para DataTables ---
  const PosTerminalDataTablePlaceholder = ({ isLoading }: { isLoading: boolean }) => (
       <div className="border rounded-md">
          {isLoading ? (
              <div className="p-4 space-y-3">
                  <Skeleton className="w-2/5 h-5" />
                  <Skeleton className="w-4/5 h-4" />
                  <Skeleton className="w-3/5 h-4" />
              </div>
          ) : (
              <div className="p-4 text-sm text-center text-muted-foreground">
                  {t('config_banks.pos_terminals.no_data')}
              </div>
          )}
      </div>
    );
  // --- Fin Placeholders ---

  return (
    <div className="container relative flex flex-col min-h-screen gap-8 px-4 py-8 mx-auto">
      <h1 className="mb-6 text-2xl font-semibold">
        {isLoadingData ? (
          <Skeleton className="w-64 h-8" />
        ) : (
          // Usar el nombre del banco en el título una vez cargado
          t('config_banks.edit_title') + (bankData ? `: ${bankData.name}` : '')
        )}
      </h1>

      {/* Alerta de Error (excluyendo el Not Found si lo manejamos abajo) */}
      {isQueryError && !isLoadingData && !isNotFoundError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
          <AlertDescription>
            {queryError?.message || t('common.errors.loadingDesc')}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-auto">
        <CardHeader>
          <CardTitle>{t('config_banks.form_section_title')}</CardTitle>
        </CardHeader>
        <CardContent>
        {isLoadingData ? (
           <div className="space-y-4">
             <Skeleton className="w-full h-10" />
             <Skeleton className="w-full h-10" />
             <Skeleton className="w-full h-10" />
           </div>
        ) : isNotFoundError ? (
          <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>{t('common.not_found')}</AlertTitle>
              <AlertDescription>{t('config_banks.toast.not_found_error', { id: bankId })}</AlertDescription>
          </Alert>
        ) : bankData ? (
          <BankForm 
            onSubmit={handleUpdateBank} 
            initialData={bankData} 
            isLoading={isSaving} 
          />
        ) : (
          <p>{t('common.unknown')}</p>
        )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg font-medium">
            {t('config_banks.accounts.section_title')}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => router.push(`/configuracion/cuentas-bancarias/nuevo?bankId=${bankId}`)}
            disabled={isLoadingData || isSaving || !bankData || isNotFoundError}
          >
            <Plus className="w-4 h-4 mr-2" /> {t('config_banks.accounts.add_button')}
          </Button>
        </CardHeader>
        <CardContent>
            {isAccountsError && !isLoadingAccounts && (
                 <Alert variant="destructive" className="mb-4">
                     <AlertCircle className="w-4 h-4" />
                     <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
                     <AlertDescription>
                         {accountsError?.message || t('common.errors.loadingDesc')}
                     </AlertDescription>
                 </Alert>
             )}
             <BankAccountsTable 
               accounts={bankAccountsData} 
               isLoading={isLoadingAccounts || isLoadingData}
               bankId={bankId}
               onToggleActive={async (accountId, currentStatus) => {
                 try {
                   await toggleBankAccountActiveStatus(accountId, currentStatus);
                   // Recargar los datos después de actualizar
                   queryClient.invalidateQueries({ queryKey: ['bankAccounts', bankId] });
                   toast({
                     title: t('common.success'),
                     description: currentStatus 
                       ? t('config_bank_accounts.toast.deactivated_success') 
                       : t('config_bank_accounts.toast.activated_success'),
                   });
                 } catch (error) {
                   toast({
                     title: t('common.error'),
                     description: t('config_bank_accounts.toast.toggle_error'),
                     variant: 'destructive',
                   });
                 }
               }}
             />
        </CardContent>
      </Card>

      <Card className="mb-20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-medium">
                  {t('config_banks.pos_terminals.section_title')}
              </CardTitle>
              <Button
                  size="sm"
                  onClick={() => router.push(`/configuracion/terminales-pos/nuevo?bancoId=${bankId}`)}
                  disabled={isLoadingData || isSaving || !bankData || isNotFoundError}
              >
                  <Plus className="w-4 h-4 mr-2" /> {t('config_banks.pos_terminals.add_button')}
              </Button>
          </CardHeader>
          <CardContent>
              {isPosTerminalsError && !isLoadingPosTerminals && (
                  <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="w-4 h-4" />
                      <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
                      <AlertDescription>
                          {posTerminalsError?.message || t('common.errors.loadingDesc')}
                      </AlertDescription>
                  </Alert>
              )}
              <PosTerminalDataTablePlaceholder isLoading={isLoadingPosTerminals || isLoadingData} />
          </CardContent>
      </Card>

      {/* Botones Flotantes */}
      <div className="fixed z-50 flex items-center gap-2 bottom-4 right-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoadingData || isSaving}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          // Deshabilitar si carga, guarda, no hay datos o es error not found
          disabled={isLoadingData || isSaving || !bankData || isNotFoundError}
          onClick={() => {
            (document.getElementById('bank-form') as HTMLFormElement | null)?.requestSubmit();
          }}
        >
          {isSaving ? (
            <>{t('common.saving')}...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />{t('common.saveChanges')}</>
          )}
        </Button>
      </div>
    </div>
  );
} 