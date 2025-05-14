import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { Equipment } from '@prisma/client';

/**
 * Hook para obtener todo el equipamiento
 */
export function useEquipmentQuery(options?: Omit<UseQueryOptions<Equipment[], unknown, Equipment[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Equipment[], unknown>({
    queryKey: ['equipment'],
    queryFn: async () => {
      return await api.cached.get('/api/equipment');
    },
    staleTime: 1000 * 60 * 15, // 15 minutos (equipos cambian poco)
    ...options,
  });
}

/**
 * Hook para obtener equipamiento específico por ID
 */
export function useEquipmentDetailQuery(equipmentId: string | null, options?: Omit<UseQueryOptions<Equipment, unknown, Equipment>, 'queryKey' | 'queryFn'>) {
  return useQuery<Equipment, unknown>({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => {
      if (!equipmentId) throw new Error('ID de equipamiento no proporcionado');
      return await api.cached.get(`/api/equipment/${equipmentId}`);
    },
    enabled: !!equipmentId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: (failureCount, error: any) => {
      // No reintentar en caso de 404 (no encontrado)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
    ...options,
  });
}

/**
 * Hook para obtener equipamiento por clínica
 */
export function useClinicEquipmentQuery(clinicId: string | null, options?: Omit<UseQueryOptions<Equipment[], unknown, Equipment[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<Equipment[], unknown>({
    queryKey: ['clinic-equipment', clinicId],
    queryFn: async () => {
      if (!clinicId) throw new Error('ID de clínica no proporcionado');
      return await api.cached.get(`/api/clinics/${clinicId}/equipment`);
    },
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    ...options,
  });
}

/**
 * Hook para crear nuevo equipamiento
 */
export function useCreateEquipmentMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Equipment>) => {
      const response = await api.post('/api/equipment', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

/**
 * Hook para actualizar equipamiento existente
 */
export function useUpdateEquipmentMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Equipment> }) => {
      const response = await api.put(`/api/equipment/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['clinic-equipment'] });
    },
  });
}

/**
 * Hook para eliminar equipamiento
 */
export function useDeleteEquipmentMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/equipment/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-equipment'] });
    },
  });
}

/**
 * Hook para obtener parámetros de un equipo específico
 */
export function useEquipmentParametersQuery(equipmentId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['equipment-parameters', equipmentId],
    queryFn: async () => {
      if (!equipmentId) throw new Error('Equipment ID is required');
      // Suponiendo que existe un endpoint para obtener parámetros de un equipo
      return await api.cached.get(`/api/equipment/${equipmentId}/parameters`);
    },
    enabled: !!equipmentId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    ...options,
  });
} 