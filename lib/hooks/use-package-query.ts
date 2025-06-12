import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

/**
 * Hook para obtener todas las definiciones de paquetes
 */
export function usePackageDefinitionsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['package-definitions'],
    queryFn: async () => {
      const response = await api.cached.get('/api/package-definitions');
      // Transformación para manejar diferentes formatos de respuesta
      return (response as any)?.packageDefinitions || response || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    ...options,
  });
}

/**
 * Hook para obtener detalles de una definición de paquete específica
 */
export function usePackageDefinitionDetailQuery(packageDefinitionId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['package-definition', packageDefinitionId],
    queryFn: async () => {
      if (!packageDefinitionId) throw new Error('Package Definition ID is required');
      return await api.cached.get(`/api/package-definitions/${packageDefinitionId}`);
    },
    enabled: !!packageDefinitionId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: (failureCount, error: any) => {
      // No reintentar en caso de 404
      if (error?.response?.status === 404) return false;
      // Reintentar hasta 3 veces para otros errores
      return failureCount < 3;
    },
    ...options,
  });
}

/**
 * Hook para crear una definición de paquete
 */
export function useCreatePackageDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/package-definitions', data);
      return response;
    },
    onSuccess: () => {
      // Invalidar consultas relacionadas con paquetes
      queryClient.invalidateQueries({ queryKey: ['package-definitions'] });
    }
  });
}

/**
 * Hook para actualizar una definición de paquete
 */
export function useUpdatePackageDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/package-definitions/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta definición de paquete
      queryClient.invalidateQueries({ queryKey: ['package-definition', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['package-definitions'] });
    }
  });
}

/**
 * Hook para eliminar una definición de paquete
 */
export function useDeletePackageDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/package-definitions/${id}`);
      return response;
    },
    onSuccess: (_, id) => {
      // Invalidar consultas relacionadas con definiciones de paquetes
      queryClient.invalidateQueries({ queryKey: ['package-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['package-definition', id] });
    }
  });
}

/**
 * Hook para obtener los items de un paquete específico
 */
export function usePackageItemsQuery(packageDefinitionId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['package-items', packageDefinitionId],
    queryFn: async () => {
      if (!packageDefinitionId) throw new Error('Package Definition ID is required');
      // Suponiendo que existe un endpoint para obtener los items de un paquete
      return await api.cached.get(`/api/package-definitions/${packageDefinitionId}/items`);
    },
    enabled: !!packageDefinitionId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener instancias de paquetes para una persona
 */
export function usePersonPackageInstancesQuery(personId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['person-package-instances', personId],
    queryFn: async () => {
      if (!personId) throw new Error('Person ID is required');
      const response = await api.cached.get(`/api/persons/${personId}/package-instances`);
      return (response as any)?.instances || response || [];
    },
    enabled: !!personId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para añadir paquetes a una tarifa
 */
export function useAddPackagesToTariffMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, packageDefinitionIds }: { tariffId: string; packageDefinitionIds: string[] }) => {
      if (!tariffId) throw new Error("ID de tarifa no especificado.");
      const response = await api.post(`/api/tariffs/${tariffId}/packages`, { packageDefinitionIds });
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
      // También invalidar la consulta específica de paquetes de tarifa si existe
      queryClient.invalidateQueries({ queryKey: ['tariffPackages', variables.tariffId] });
      // Y las definiciones de paquetes para actualizar su estado de asignación
      queryClient.invalidateQueries({ queryKey: ['package-definitions'] });
    }
  });
} 