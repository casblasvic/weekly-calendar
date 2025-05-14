import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

/**
 * Hook especializado para obtener todos los tipos de IVA (muy estables, casi no cambian)
 */
export function useVatTypesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['vat-types'],
    queryFn: async () => {
      return await api.cached.get('/api/vat-types');
    },
    staleTime: 1000 * 60 * 60, // 60 minutos
    ...options,
  });
}

/**
 * Hook especializado para obtener un tipo de IVA específico
 */
export function useVatTypeDetailQuery(vatTypeId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['vat-type', vatTypeId],
    queryFn: async () => {
      if (!vatTypeId) throw new Error('VAT Type ID is required');
      return await api.cached.get(`/api/vat-types/${vatTypeId}`);
    },
    enabled: !!vatTypeId,
    staleTime: 1000 * 60 * 60, // 60 minutos
    ...options,
  });
} 