import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

/**
 * Hook para obtener todas las clínicas disponibles (estables, cambian poco)
 */
export function useClinicsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['clinics'],
    queryFn: async () => {
      return await api.cached.get('/api/clinics');
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    ...options,
  });
}

/**
 * Hook para obtener detalles de una clínica específica
 */
export function useClinicDetailQuery(clinicId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      if (!clinicId) throw new Error('Clinic ID is required');
      return await api.cached.get(`/api/clinics/${clinicId}`);
    },
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 15, // 15 minutos
    ...options,
  });
} 