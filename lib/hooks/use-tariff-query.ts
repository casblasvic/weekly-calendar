import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { useServiceDetailQuery } from '@/lib/hooks/use-service-query';

/**
 * Hook especializado para obtener tarifas con optimizaciones específicas
 * para mejorar la velocidad de carga.
 */
export function useTariffsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariffs'],
    queryFn: async () => {
      return await api.cached.get('/api/tariffs');
    },
    staleTime: 1000 * 60 * 15, // 15 minutos
    ...options,
  });
}

/**
 * Hook especializado para obtener detalle de una tarifa específica con todas sus relaciones
 */
export function useTariffDetailQuery(tariffId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariff', tariffId],
    queryFn: async () => {
      if (!tariffId) throw new Error('Tariff ID is required');
      return await api.cached.get(`/api/tariffs/${tariffId}`);
    },
    enabled: !!tariffId,
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
 * Hook para actualizar una tarifa
 */
export function useUpdateTariffMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/tariffs/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
    }
  });
}

/**
 * Hook para actualizar las clínicas asociadas a una tarifa
 */
export function useUpdateTariffClinicsMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, clinicIds }: { tariffId: string; clinicIds: string[] }) => {
      const response = await api.patch(`/api/tariffs/${tariffId}/clinics`, { clinicIds });
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
    }
  });
}

/**
 * Hook para eliminar un item de una tarifa
 */
export function useDeleteTariffItemMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, type, itemId }: { tariffId: string; type: string; itemId: string }) => {
      let endpoint = '';
      
      if (type === 'SERVICE') {
        endpoint = `/api/tariffs/${tariffId}/services/${itemId}`;
      } else if (type === 'PRODUCT') {
        endpoint = `/api/tariffs/${tariffId}/products/${itemId}`;
      } else if (type === 'BONO_DEFINITION') {
        endpoint = `/api/tariffs/${tariffId}/bonos/${itemId}`;
      } else if (type === 'PACKAGE_DEFINITION') {
        endpoint = `/api/tariffs/${tariffId}/packages/${itemId}`;
      } else {
        throw new Error("Tipo de item desconocido para eliminar.");
      }
      
      const response = await api.delete(endpoint);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
    }
  });
}

/**
 * Hook para obtener los servicios de una tarifa específica
 */
export function useTariffServicesQuery(tariffId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariffServices', tariffId],
    queryFn: async () => {
      if (!tariffId) throw new Error('Tariff ID is required');
      return await api.cached.get(`/api/tariffs/${tariffId}/services`);
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener los productos de una tarifa específica
 */
export function useTariffProductsQuery(tariffId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariffProducts', tariffId],
    queryFn: async () => {
      if (!tariffId) throw new Error('Tariff ID is required');
      return await api.cached.get(`/api/tariffs/${tariffId}/products`);
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener los bonos de una tarifa específica
 */
export function useTariffBonosQuery(tariffId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariffBonos', tariffId],
    queryFn: async () => {
      if (!tariffId) throw new Error('Tariff ID is required');
      return await api.cached.get(`/api/tariffs/${tariffId}/bonos`);
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener los paquetes de una tarifa específica
 */
export function useTariffPackagesQuery(tariffId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['tariffPackages', tariffId],
    queryFn: async () => {
      if (!tariffId) throw new Error('Tariff ID is required');
      return await api.cached.get(`/api/tariffs/${tariffId}/packages`);
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

// --- HOOKS DERIVADOS ---

/**
 * Hook derivado para obtener el nombre y precio de un servicio para una tarifa específica.
 * Ideal para mostrar información básica en tablas o listas sin necesidad de cargar todo el detalle.
 */
export function useServiceInTariffInfo(serviceId: string, tariffId: string) {
  // Reutiliza hooks base con configuraciones específicas
  const serviceQuery = useServiceDetailQuery(serviceId, {
    select: (data) => ({
      id: data.id,
      name: data.name,
      basePrice: data.price,
      description: data.description,
    }),
    // Desactivar si no hay IDs
    enabled: !!serviceId && !!tariffId,
  });

  const tariffServiceQuery = useTariffServicesQuery(tariffId, {
    select: (data) => data.find((s: any) => s.serviceId === serviceId) || null,
    // Desactivar si no hay IDs o si la consulta de servicio falló
    enabled: !!serviceId && !!tariffId && !serviceQuery.isError,
  });

  // Combinar los resultados de ambas consultas
  return {
    // Datos combinados
    data: {
      ...serviceQuery.data,
      tariffPrice: tariffServiceQuery.data?.price,
      isInTariff: !!tariffServiceQuery.data,
    },
    // Estados combinados
    isLoading: serviceQuery.isLoading || tariffServiceQuery.isLoading,
    isError: serviceQuery.isError || tariffServiceQuery.isError,
    error: serviceQuery.error || tariffServiceQuery.error,
  };
}

/**
 * Hook derivado para obtener información básica de todas las tarifas.
 * Útil para componentes de selección o listas simples de tarifas.
 */
export function useTariffNames() {
  // Reutiliza el hook base con transformación específica
  return useTariffsQuery({
    select: (tarifas) => tarifas.map((t: any) => ({
      id: t.id,
      name: t.name,
      isDefault: t.isDefault,
      isActive: t.isActive,
    })),
  });
}

/**
 * Hook derivado para obtener el nombre de una tarifa por su ID.
 * Ideal para mostrar el nombre de una tarifa sin cargar todos sus detalles.
 */
export function useTariffName(tariffId: string | null) {
  // Reutiliza el hook base con transformación específica
  return useTariffDetailQuery(tariffId, {
    select: (data) => data?.name || 'Tarifa no encontrada',
    // Respuesta predeterminada si no hay datos
    placeholderData: 'Cargando tarifa...',
  });
} 