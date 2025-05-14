'use client'

import React from 'react';
import { DataTable } from "@/components/ui/data-table";
// import { getColumns } from "./columns"; // Ya no importamos getColumns

// <<< --- Importar ColumnDef y otros elementos necesarios --- >>>
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, CheckCircle, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClinicPaymentSettingWithRelations } from '@/lib/api/clinicPaymentSettings';
import type { BankAccount } from '@prisma/client';
import { PaymentMethodType } from '@prisma/client';
import { updateClinicPaymentSetting, deleteClinicPaymentSetting } from '@/lib/api/clinicPaymentSettings';

interface ClinicPaymentSettingsTableProps {
  data: ClinicPaymentSettingWithRelations[];
  paymentMethodType: PaymentMethodType | undefined;
  onEdit: (setting: ClinicPaymentSettingWithRelations) => void;
  // Ya no necesitamos onDelete aquí
}

export function ClinicPaymentSettingsTable({
  data,
  paymentMethodType,
  onEdit,
}: ClinicPaymentSettingsTableProps) {

  // <<< --- LLAMAR HOOKS AQUÍ --- >>>
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();

  // <<< --- INICIO: FUNCIÓN HELPER --- >>>
  const formatAccountDisplay = (account: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null | undefined): string => {
    if (!account) {
      return t('common.none'); // Opcional: o simplemente "-"
    }
    const name = account.accountName;
    const ibanSuffix = account.iban ? ` (****${account.iban.slice(-4)})` : "";
    return `${name}${ibanSuffix}`;
  };
  // <<< --- FIN: FUNCIÓN HELPER --- >>>

  // Mutación para actualizar 'isActiveInClinic'
  const updateActiveMutation = useMutation<ClinicPaymentSettingWithRelations, Error, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => updateClinicPaymentSetting(id, { isActiveInClinic: isActive }),
    onSuccess: (data) => {
      queryClient.setQueryData<ClinicPaymentSettingWithRelations[]>(['clinicPaymentSettings', { paymentMethodDefinitionId: data.paymentMethodDefinitionId }], (oldData) =>
        oldData ? oldData.map((item) => (item.id === data.id ? data : item)) : []
      );
      toast({ title: t('common.status_updated'), description: t('config_clinic_payment_settings.status_update_success', { clinicName: data.clinic.name, status: data.isActiveInClinic ? t('common.active') : t('common.inactive') }) });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    },
  });

  // Mutación para actualizar 'isDefaultReceivingBankAccount'
  const updateDefaultAccountMutation = useMutation<ClinicPaymentSettingWithRelations, Error, { id: string; isDefault: boolean }>({
    mutationFn: ({ id, isDefault }) => updateClinicPaymentSetting(id, { isDefaultReceivingBankAccount: isDefault }),
    onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', { paymentMethodDefinitionId: data.paymentMethodDefinitionId }] });
       toast({ title: t('common.default_updated'), description: t('config_clinic_payment_settings.default_account_update_success', { clinicName: data.clinic.name }) });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    },
  });

  // Mutación para actualizar 'isDefaultPosTerminal'
  const updateDefaultPosMutation = useMutation<ClinicPaymentSettingWithRelations, Error, { id: string; isDefault: boolean }>({
    mutationFn: ({ id, isDefault }) => updateClinicPaymentSetting(id, { isDefaultPosTerminal: isDefault }),
    onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', { paymentMethodDefinitionId: data.paymentMethodDefinitionId }] });
       toast({ title: t('common.default_updated'), description: t('config_clinic_payment_settings.default_pos_update_success', { clinicName: data.clinic.name }) });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    },
  });

  // Mutación para eliminar (CORREGIR onSuccess)
  const deleteMutation = useMutation<{ message?: string }, Error, string>({
    mutationFn: deleteClinicPaymentSetting,
    onSuccess: (apiResponse, idToDelete) => {
      // Obtener el ID de la definición del método de pago actual 
      // (asumiendo que los datos de la tabla no están vacíos)
      const currentDefinitionId = data?.[0]?.paymentMethodDefinitionId;
      
      if (currentDefinitionId) {
        // Invalidar la query específica de esta tabla para que se recargue
        queryClient.invalidateQueries({
           queryKey: ['clinicPaymentSettings', { paymentMethodDefinitionId: currentDefinitionId }]
        });
      } else {
          // Si no podemos obtener el ID, invalidar todas las configuraciones como fallback
          // (menos eficiente pero asegura la actualización)
          console.warn("No se pudo obtener currentDefinitionId, invalidando query genérica.");
          queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings'] });
      }

      toast({ 
        title: t('common.delete_success_title'), 
        description: apiResponse?.message || t('config_clinic_payment_settings.delete_success') 
      });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: t('common.delete_error_title'), 
        description: error.message || t('config_clinic_payment_settings.delete_error') 
      });
    },
  });

  // <<< --- DEFINIR COLUMNAS AQUÍ DENTRO de useMemo --- >>>
  const columns = React.useMemo((): ColumnDef<ClinicPaymentSettingWithRelations>[] => [
    // Columna Clínica
    {
      accessorKey: "clinic.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('config_clinic_payment_settings.columns.clinic')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.original.clinic.name}</div>,
    },
    // Columna Activo en Clínica
    {
      accessorKey: "isActiveInClinic",
      header: t('config_clinic_payment_settings.columns.isActive'),
      cell: ({ row }) => {
        const setting = row.original;
        return (
          <Switch
            checked={setting.isActiveInClinic}
            onCheckedChange={(newStatus) => {
              updateActiveMutation.mutate({ id: setting.id, isActive: newStatus });
            }}
            aria-label={t('config_clinic_payment_settings.columns.isActive_aria')}
            disabled={updateActiveMutation.isPending}
          />
        );
      },
    },
    // Columna Cuenta Bancaria (MODIFICADA)
    {
      accessorKey: "receivingBankAccount.accountName",
      header: t('config_clinic_payment_settings.columns.bankAccount'),
      cell: ({ row }) => {
        const setting = row.original;
        const currentPaymentType = setting.paymentMethodDefinition.type;
        const isDefaultAccount = setting.isDefaultReceivingBankAccount ?? false;
        let accountToDisplay: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null | undefined = null;

        if (currentPaymentType === PaymentMethodType.CARD) {
          // Para Tarjeta, mostrar la cuenta del TPV asociado
          accountToDisplay = setting.posTerminal?.bankAccount;
        } else {
          // Para otros métodos, mostrar la cuenta directamente asignada
          accountToDisplay = setting.receivingBankAccount;
        }
        
        const displayText = formatAccountDisplay(accountToDisplay);

        return (
          <div className="text-sm flex items-center">
            <span>{displayText}</span>
            {/* Mostrar badge Default solo si NO es tipo TARJETA y es la cuenta default directa */}
            {currentPaymentType !== PaymentMethodType.CARD && isDefaultAccount && (
                <Badge variant="outline" className="ml-2 border-green-500 text-green-600 px-1.5 py-0.5 text-xs">
                    {t('common.default')}
                </Badge>
            )}
          </div>
        );
      },
    },
    // Columna TPV Asociado (Con Badge, condicional)
    ...(paymentMethodType === PaymentMethodType.CARD ? [
      {
        accessorKey: "posTerminal.name",
        header: t('config_clinic_payment_settings.columns.posTerminal'),
        cell: ({ row }: { row: { original: ClinicPaymentSettingWithRelations } }) => {
          const setting = row.original;
          const terminal = setting.posTerminal;
          const isDefault = setting.isDefaultPosTerminal ?? false;
          return terminal ? (
            <div className="flex items-center">
                 <span>{terminal.name}</span>
                 {isDefault && (
                     <Badge variant="outline" className="ml-2 border-blue-500 text-blue-600 px-1.5 py-0.5 text-xs">
                         {t('common.default')}
                     </Badge>
                 )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">{t('common.none')}</span>
          );
        },
      } as ColumnDef<ClinicPaymentSettingWithRelations> 
     ] : []),
    // Columna Acciones (Con nuevas opciones)
    {
      id: "actions",
      cell: ({ row }) => {
        const setting = row.original;
        const isMutating = updateDefaultAccountMutation.isPending || updateDefaultPosMutation.isPending || deleteMutation.isPending;
        
        // Condiciones para habilitar opciones "Marcar como predeterminado"
        const canSetDefaultAccount = !!setting.receivingBankAccountId && !setting.isDefaultReceivingBankAccount;
        const canSetDefaultPos = paymentMethodType === PaymentMethodType.CARD && !!setting.posTerminalId && !setting.isDefaultPosTerminal;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isMutating}>
                <span className="sr-only">{t('common.actions_menu_label')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(setting)} disabled={isMutating}>
                {t('common.edit')}
              </DropdownMenuItem>
              
              {/* Opción Marcar Cuenta Predeterminada */} 
              {canSetDefaultAccount && (
                  <DropdownMenuItem 
                    onClick={() => updateDefaultAccountMutation.mutate({ id: setting.id, isDefault: true })} 
                    disabled={isMutating}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> 
                    {t('config_clinic_payment_settings.actions.set_default_account')}
                  </DropdownMenuItem>
              )}
              
              {/* Opción Marcar TPV Predeterminado */} 
              {canSetDefaultPos && (
                  <DropdownMenuItem 
                    onClick={() => updateDefaultPosMutation.mutate({ id: setting.id, isDefault: true })} 
                    disabled={isMutating}
                  >
                     <CheckCircle className="mr-2 h-4 w-4 text-blue-600" /> 
                     {t('config_clinic_payment_settings.actions.set_default_pos')}
                  </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                onClick={() => {
                    if (window.confirm(t('config_clinic_payment_settings.delete_confirm_message', { 
                        paymentMethodName: setting.paymentMethodDefinition.name,
                        clinicName: setting.clinic.name
                    }))) {
                         deleteMutation.mutate(setting.id);
                    }
                }}
                disabled={isMutating}
              >
                <Ban className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [t, queryClient, toast, updateActiveMutation, updateDefaultAccountMutation, updateDefaultPosMutation, deleteMutation, onEdit, paymentMethodType, data]); // Añadir data como dependencia

  return (
    <DataTable
      columns={columns}
      data={data}
    />
  );
} 