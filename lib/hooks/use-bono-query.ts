import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
// Definición completa incluyendo relaciones necesarias y settings para la API
export type BonoDefinitionWithRelations = Prisma.BonoDefinitionGetPayload<{
    include: {
        service: { select: { id: true, name: true } };
        product: { select: { id: true, name: true } };
        vatType: { select: { id: true, name: true, rate: true } };
        settings: {
            select: {
                isActive: true;
                validityDays: true;
                pointsAwarded: true;
                costPrice: true;
                commissionType: true;
                commissionValue: true;
                appearsInApp: true;
                autoAddToInvoice: true;
            }
        };
        tariffPrices: {
            select: {
                tariff: {
                    select: { 
                        name: true,
                        id: true
                    }
                }
            }
        }
    }
}>;

/**
 * Hook para obtener todas las definiciones de bonos
 */
export function useBonoDefinitionsQuery(options?: Omit<UseQueryOptions<BonoDefinitionWithRelations[], unknown, BonoDefinitionWithRelations[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<BonoDefinitionWithRelations[], unknown>({
    queryKey: ['bono-definitions'],
    queryFn: async () => {
      return await api.cached.get('/api/bono-definitions');
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    ...options,
  });
}

/**
 * Hook para obtener detalles de una definición de bono específica
 */
export function useBonoDefinitionDetailQuery(bonoDefinitionId: string | null, options?: Omit<UseQueryOptions<BonoDefinitionWithRelations, unknown, BonoDefinitionWithRelations>, 'queryKey' | 'queryFn'>) {
  return useQuery<BonoDefinitionWithRelations, unknown>({
    queryKey: ['bono-definition', bonoDefinitionId],
    queryFn: async () => {
      if (!bonoDefinitionId) throw new Error('ID de definición de bono no proporcionado');
      return await api.cached.get(`/api/bono-definitions/${bonoDefinitionId}`);
    },
    enabled: !!bonoDefinitionId,
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
 * Hook para crear una nueva definición de bono
 */
export function useCreateBonoDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/bono-definitions', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bono-definitions'] });
    },
  });
}

/**
 * Hook para actualizar una definición de bono existente
 */
export function useUpdateBonoDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/bono-definitions/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bono-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['bono-definition', variables.id] });
    },
  });
}

/**
 * Hook para eliminar una definición de bono
 */
export function useDeleteBonoDefinitionMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/bono-definitions/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bono-definitions'] });
    },
  });
}

/**
 * Hook para obtener las definiciones de bono asociadas a una tarifa específica
 */
export function useBonoDefinitionsByTariffQuery(tariffId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariff-bonos', tariffId],
    queryFn: async () => {
      if (!tariffId) throw new Error('ID de tarifa no proporcionado');
      return await api.cached.get(`/api/tariffs/${tariffId}/bonos`);
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para actualizar la asociación de bonos a una tarifa
 */
export function useUpdateTariffBonosMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, bonoDefinitionIds }: { tariffId: string; bonoDefinitionIds: string[] }) => {
      const response = await api.post(`/api/tariffs/${tariffId}/bonos`, { bonoDefinitionIds });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tariff-bonos', variables.tariffId] });
      queryClient.invalidateQueries({ queryKey: ['bono-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
    },
  });
}

/**
 * Hook para obtener instancias de bonos para una persona
 */
export function usePersonBonoInstancesQuery(personId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['person-bono-instances', personId],
    queryFn: async () => {
      if (!personId) throw new Error('Person ID is required');
      // Endpoint para obtener bonos por persona
      return await api.cached.get(`/api/persons/${personId}/bonos`);
    },
    enabled: !!personId,
    staleTime: 1000 * 60 * 2, // 2 minutos
    ...options,
  });
}

/**
 * Hook para añadir bonos a una tarifa
 */
export function useAddBonosToTariffMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, bonoDefinitionIds }: { tariffId: string; bonoDefinitionIds: string[] }) => {
      if (!tariffId) throw new Error("ID de tarifa no especificado.");
      const response = await api.post(`/api/tariffs/${tariffId}/bonos`, { bonoDefinitionIds });
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
      // También invalidar la consulta específica de bonos de tarifa
      queryClient.invalidateQueries({ queryKey: ['tariffBonos', variables.tariffId] });
      // Y las definiciones de bonos para actualizar su estado de asignación
      queryClient.invalidateQueries({ queryKey: ['bonoDefinitions'] });
    }
  });
} 