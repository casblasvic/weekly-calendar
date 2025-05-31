import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import apiClient from '@/lib/axios'; // Importar la instancia correcta
import { legalEntityKeys } from '../queries/legal-entities';
import { useTranslation } from 'react-i18next';
import type {
  CreateLegalEntityPayload,
  UpdateLegalEntityPayload,
  LegalEntityResponse,
  // LegalEntityDetailResponse, // No se usa directamente en este archivo de mutaciones, pero podría ser si se devuelve
} from '@/lib/schemas/legal-entity-schemas';

export function useCreateLegalEntityMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<
    LegalEntityResponse, 
    Error, 
    CreateLegalEntityPayload
  >({
    mutationFn: async (legalEntityData: CreateLegalEntityPayload): Promise<LegalEntityResponse> => {
      // apiClient.post ya devuelve response.data gracias al interceptor
      return apiClient.post<LegalEntityResponse>('/api/legal-entities', legalEntityData);
    },
    onSuccess: (data) => {
      // Invalidar y refetch la lista de sociedades mercantiles
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.lists() });
      // Podrías también invalidar detalles si tuvieras una vista de detalle que cachear
      // queryClient.invalidateQueries({ queryKey: legalEntityKeys.detail(data.id) });

      toast({
        title: t('config_legal_entities.create_success_title', 'Sociedad Mercantil Creada'),
        description: t('config_legal_entities.create_success_desc', `La sociedad "${data.name}" ha sido creada exitosamente.`),
        variant: 'default', // O simplemente omitir si 'default' es el predeterminado para éxito
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || t('common.error_unknown');
      toast({
        title: t('config_legal_entities.create_error_title', 'Error al Crear Sociedad'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLegalEntityMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<
    LegalEntityResponse, 
    Error, 
    { id: string; payload: UpdateLegalEntityPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      return apiClient.put<LegalEntityResponse>(`/api/legal-entities/${id}`, payload);
    },
    onSuccess: (data, variables) => {
      // Invalidar y refetch la lista de sociedades mercantiles y el detalle de la entidad actualizada
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.detail(variables.id) });

      toast({
        title: t('config_legal_entities.update_success_title', 'Sociedad Mercantil Actualizada'),
        description: t('config_legal_entities.update_success_desc', `La sociedad "${data.name}" ha sido actualizada exitosamente.`),
        variant: 'default',
      });
    },
    onError: (error: any, variables) => {
      const entityName = variables.payload.name || `ID ${variables.id}`; // Intenta obtener el nombre o usa el ID
      const errorMessage = error?.response?.data?.message || error.message || t('common.error_unknown');
      toast({
        title: t('config_legal_entities.update_error_title', 'Error al Actualizar Sociedad'),
        description: t('config_legal_entities.update_error_desc', { entityName, error: errorMessage }),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLegalEntityMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<
    void, // La API DELETE no devuelve contenido en el cuerpo, solo un 204 o similar
    Error,
    string // El ID de la LegalEntity a eliminar
  >({
    mutationFn: async (legalEntityId: string): Promise<void> => {
      return apiClient.delete(`/api/legal-entities/${legalEntityId}`);
    },
    onSuccess: (_, legalEntityId) => { // El primer argumento es la data, que es void aquí
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.lists() });
      // También invalidar el detalle si estaba cacheado, aunque el usuario será redirigido
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.detail(legalEntityId) });

      toast({
        title: t('config_legal_entities.delete_success_title', 'Sociedad Eliminada'),
        description: t('config_legal_entities.delete_success_desc', 'La sociedad mercantil ha sido eliminada exitosamente.'),
        variant: 'default',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || t('common.error_unknown');
      toast({
        title: t('config_legal_entities.delete_error_title', 'Error al Eliminar Sociedad'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
