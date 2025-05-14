"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox" // Puede ser útil más adelante
import { Switch } from "@/components/ui/switch"; // Para el estado activo
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"; // Para el tipo
import type { ClinicPaymentSettingWithRelations } from "@/lib/api/clinicPaymentSettings"; // Importar el tipo extendido
import { PaymentMethodType } from '@prisma/client'; // Importar enum
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"; // Para cabeceras ordenables
import { toast } from "@/components/ui/use-toast"; // Para feedback
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Para mutaciones
import { updateClinicPaymentSetting, deleteClinicPaymentSetting } from "@/lib/api/clinicPaymentSettings"; // API para actualizar/eliminar
import type { BankAccount } from '@prisma/client'; // <<< AÑADIR IMPORT BankAccount

// --- Helper para formatear nombres de cuenta/TPV ---
const formatOptionalName = (entity: { id: string; name: string } | null | undefined): string => {
  return entity?.name || "-";
};

// <<< --- INICIO: FUNCIÓN HELPER formatAccountDisplay --- >>>
const formatAccountDisplay = (account: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null | undefined, t: Function): string => {
  if (!account) {
    return t('common.none'); // Usar traducción para "Ninguna"
  }
  const name = account.accountName;
  const ibanSuffix = account.iban ? ` (****${account.iban.slice(-4)})` : "";
  return `${name}${ibanSuffix}`;
};
// <<< --- FIN: FUNCIÓN HELPER formatAccountDisplay --- >>>

// --- Tipo para las Props de las Acciones ---
interface ClinicPaymentSettingActionsProps {
  row: { original: ClinicPaymentSettingWithRelations };
  onEdit: (setting: ClinicPaymentSettingWithRelations) => void; // Función para abrir el modal de edición
}

// --- Componente para las Acciones ---
const ClinicPaymentSettingActions: React.FC<ClinicPaymentSettingActionsProps> = ({ row, onEdit }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setting = row.original;

  const mutationDelete = useMutation({
    mutationFn: deleteClinicPaymentSetting,
    onSuccess: () => {
      toast({
        title: t('config_clinic_payment_settings.delete_success'),
        description: `Configuración para ${setting.clinic.name} eliminada.`,
      });
      // Invalidar queries para refrescar la tabla
      queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', setting.clinicId] });
      queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings'] }); // También la global por si acaso
    },
    onError: (error: any) => {
      toast({
        title: t('config_clinic_payment_settings.delete_error'),
        description: error.message || 'Error desconocido.',
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('config_clinic_payment_settings.delete_confirm_message', { 
      paymentMethodName: setting.paymentMethodDefinition.name, 
      clinicName: setting.clinic.name 
    }))) {
      mutationDelete.mutate(setting.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('common.actions_menu_label')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(setting)}>
          {t('common.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={mutationDelete.isPending}>
          {mutationDelete.isPending ? t('common.deleting', { item: '' }) : t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// --- Definición de las Columnas ---
export const getClinicPaymentSettingColumns = (
  t: Function, 
  onEdit: (setting: ClinicPaymentSettingWithRelations) => void // Pasar la función onEdit
): ColumnDef<ClinicPaymentSettingWithRelations>[] => [
  // Columna Nombre del Método de Pago (con Tipo)
  {
    id: "paymentMethodName",
    accessorFn: (row) => row.paymentMethodDefinition?.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("config_payment_methods.table.name")} />
    ),
    cell: ({ row }) => {
      const name = row.original.paymentMethodDefinition.name;
      const type = row.original.paymentMethodDefinition.type;
      const typeLabel = t(`enums.PaymentMethodType.${type}`);
      return (
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <Badge variant="outline" className="w-fit text-xs">{typeLabel}</Badge>
        </div>
      )
    },
  },

  // Columna Activo en Clínica (Switch interactivo)
  {
    accessorKey: "isActiveInClinic",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("config_clinic_payment_settings.columns.isActive")} />
    ),
    cell: ({ row }) => {
      const setting = row.original;
      const queryClient = useQueryClient();

      const mutationToggle = useMutation({
          mutationFn: (newStatus: boolean) => 
              updateClinicPaymentSetting(setting.id, { isActiveInClinic: newStatus }),
          onSuccess: (data) => {
              toast({ 
                  title: t('common.status_updated'), 
                  description: t('config_clinic_payment_settings.status_update_success', { 
                      clinicName: setting.clinic.name, 
                      status: data.isActiveInClinic ? t('common.active') : t('common.inactive') 
                  })
              });
              // Actualizar cache o invalidar
              queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', setting.clinicId] });
              queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings'] }); 
          },
          onError: (error: any) => {
              toast({
                  title: t('common.error'),
                  description: error.message || 'Error al actualizar estado.',
                  variant: "destructive",
              });
          },
      });

      return (
        <div className="flex justify-center">
          <Switch
            checked={setting.isActiveInClinic}
            onCheckedChange={(checked) => mutationToggle.mutate(checked)}
            disabled={mutationToggle.isPending}
            aria-label={t("config_clinic_payment_settings.columns.isActive_aria")}
          />
        </div>
      )
    },
    enableSorting: false, // No suele tener sentido ordenar por un switch
    enableHiding: false, // Columna esencial, no ocultar
  },
  
  // Columna Cuenta Receptora (MODIFICADA)
  {
    accessorKey: "receivingBankAccount", // Mantenemos un accessorKey base, aunque la celda lo sobreescribe
    header: t("config_clinic_payment_settings.columns.associated_account"),
    cell: ({ row }) => {
      const setting = row.original;
      const currentPaymentType = setting.paymentMethodDefinition.type;
      // En esta tabla no mostraremos el badge "Predeterminado" 
      // ya que el contexto es diferente (lista de métodos para UNA clínica)
      let accountToDisplay: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null | undefined = null;

      if (currentPaymentType === PaymentMethodType.CARD) {
        // Para Tarjeta, mostrar la cuenta del TPV asociado
        accountToDisplay = setting.posTerminal?.bankAccount;
      } else {
        // Para otros métodos, mostrar la cuenta directamente asignada
        accountToDisplay = setting.receivingBankAccount;
      }
      
      // Llamar a la función helper pasando 't' para traducción
      return formatAccountDisplay(accountToDisplay, t);
    },
  },
  
  // Columna TPV Asignado
  {
    accessorKey: "posTerminal",
    header: t("config_clinic_payment_settings.columns.posTerminal"),
    cell: ({ row }) => formatOptionalName(row.original.posTerminal),
  },
  
  // Columna TPV Predeterminado (Switch interactivo)
  {
      accessorKey: "isDefaultPosTerminal",
      header: t("config_clinic_payment_settings.columns.isDefaultPos"),
      cell: ({ row }) => {
          const setting = row.original;
          // Mostrar solo si el método es de tipo TARJETA
          if (setting.paymentMethodDefinition.type !== PaymentMethodType.CARD) {
              return <span className="text-muted-foreground">-</span>;
          }
          
          const queryClient = useQueryClient();
          const mutationSetDefault = useMutation({
              mutationFn: () => 
                  updateClinicPaymentSetting(setting.id, { isDefaultPosTerminal: true }),
              onSuccess: () => {
                  toast({ 
                      title: t('common.default_updated'), 
                      description: t('config_clinic_payment_settings.default_pos_update_success', { clinicName: setting.clinic.name }) 
                  });
                  queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', setting.clinicId] });
              },
              onError: (error: any) => {
                  toast({ title: t('common.error'), description: error.message, variant: "destructive" });
              },
          });

          return (
              <div className="flex justify-center">
                  <Switch
                      checked={!!setting.isDefaultPosTerminal}
                      // Solo permitir marcar como predeterminado, no desmarcar directamente
                      onCheckedChange={(checked) => {
                          if (checked && !setting.isDefaultPosTerminal) {
                              mutationSetDefault.mutate();
                          }
                          // No permitir desmarcar directamente aquí, debe hacerse marcando otro como default
                      }}
                      disabled={mutationSetDefault.isPending || !!setting.isDefaultPosTerminal} // Deshabilitar si ya es default o si está cargando
                  />
              </div>
          );
      },
      enableSorting: false,
  },
  
  // Columna Cuenta Predeterminada (Switch interactivo)
  {
      accessorKey: "isDefaultReceivingBankAccount",
      header: t("config_clinic_payment_settings.columns.isDefaultReceivingBankAccount"), // Reusar label del formulario
      cell: ({ row }) => {
          const setting = row.original;
          // Mostrar solo si hay una cuenta bancaria asociada
          if (!setting.receivingBankAccountId) {
              return <span className="text-muted-foreground">-</span>;
          }
          
          const queryClient = useQueryClient();
          const mutationSetDefault = useMutation({
              mutationFn: () => 
                  updateClinicPaymentSetting(setting.id, { isDefaultReceivingBankAccount: true }),
              onSuccess: () => {
                  toast({ 
                      title: t('common.default_updated'), 
                      description: t('config_clinic_payment_settings.default_account_update_success', { clinicName: setting.clinic.name }) 
                  });
                  queryClient.invalidateQueries({ queryKey: ['clinicPaymentSettings', setting.clinicId] });
              },
              onError: (error: any) => {
                  toast({ title: t('common.error'), description: error.message, variant: "destructive" });
              },
          });

          return (
              <div className="flex justify-center">
                  <Switch
                      checked={!!setting.isDefaultReceivingBankAccount}
                      onCheckedChange={(checked) => {
                          if (checked && !setting.isDefaultReceivingBankAccount) {
                              mutationSetDefault.mutate();
                          }
                      }}
                      disabled={mutationSetDefault.isPending || !!setting.isDefaultReceivingBankAccount}
                  />
              </div>
          );
      },
      enableSorting: false,
  },
  
  // Columna Acciones
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <ClinicPaymentSettingActions row={row} onEdit={onEdit} />,
  },
] 