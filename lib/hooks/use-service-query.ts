import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

/**
 * Hook para obtener todos los servicios
 */
export function useServicesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['services'],
    queryFn: async () => {
      return await api.cached.get('/api/services');
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    refetchOnMount: true,
    ...options,
  });
}

/**
 * Hook para obtener detalles de un servicio específico
 */
export function useServiceDetailQuery(serviceId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error('Service ID is required');
      return await api.cached.get(`/api/services/${serviceId}`);
    },
    enabled: !!serviceId,
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
 * Hook para crear un servicio
 */
export function useCreateServiceMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/services', data);
      return response;
    },
    onSuccess: () => {
      // Invalidar consultas relacionadas con servicios
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
}

/**
 * Hook para actualizar un servicio
 */
export function useUpdateServiceMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/services/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con este servicio
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
}

/**
 * Hook para eliminar un servicio
 */
export function useDeleteServiceMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/services/${id}`);
      return response;
    },
    onSuccess: (_, id) => {
      // Invalidar consultas relacionadas con servicios
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', id] });
    }
  });
}

/**
 * Hook para obtener consumos de un servicio
 */
export function useServiceConsumptionsQuery(serviceId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['service-consumptions', serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error('Service ID is required');
      return await api.cached.get(`/api/services/${serviceId}/consumptions`);
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options,
  });
}

/**
 * Hook para añadir servicios a una tarifa con actualización optimista
 * Permite ver el cambio inmediatamente en la UI mientras se completa la petición
 */
export function useAddServicesToTariffMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, serviceIds }: { tariffId: string; serviceIds: string[] }) => {
      if (!tariffId) throw new Error("ID de tarifa no especificado.");
      const response = await api.post(`/api/tariffs/${tariffId}/services`, { serviceIds });
      return response;
    },
    
    // Actualización optimista: actualizamos la cache antes de la respuesta del servidor
    onMutate: async ({ tariffId, serviceIds }) => {
      // Cancelar cualquier refetch en curso para evitar sobreescribir nuestra actualización optimista
      await queryClient.cancelQueries({ queryKey: ['tariffServices', tariffId] });

      // Guardar el estado anterior para poder restaurarlo en caso de error
      const previousTariffServices = queryClient.getQueryData(['tariffServices', tariffId]);

      // Obtener los servicios existentes para combinarlos con los nuevos
      try {
        // Intentar obtener datos de servicios actuales
        const existingServices = queryClient.getQueryData(['tariffServices', tariffId]) || [];
        
        // Obtener datos de todos los servicios para encontrar los que estamos añadiendo
        const allServices = queryClient.getQueryData(['services']);
        
        // Si tenemos todos los servicios, podemos construir una actualización optimista completa
        if (allServices && Array.isArray(allServices)) {
          const servicesBeingAdded = allServices.filter(service => 
            serviceIds.includes(service.id)
          );
          
          // Actualizar la cache con la combinación de existentes + nuevos
          queryClient.setQueryData(['tariffServices', tariffId], 
            (old: any[] = []) => [...old, ...servicesBeingAdded]
          );
        } else {
          // Si no tenemos los datos completos, al menos podemos mostrar los IDs
          // mientras se completa la petición
          const placeholderServices = serviceIds.map(id => ({ id, isLoading: true }));
          queryClient.setQueryData(['tariffServices', tariffId], 
            (old: any[] = []) => [...old, ...placeholderServices]
          );
        }
      } catch (error) {
        console.error('Error en actualización optimista:', error);
        // Si hay error al construir la actualización optimista, simplemente continuamos
      }

      // Devolver el contexto con datos anteriores para poder restaurarlos en caso de error
      return { previousTariffServices };
    },
    
    // Si la mutación falla, usar el contexto guardado para restaurar el estado anterior
    onError: (err, variables, context) => {
      if (context?.previousTariffServices) {
        queryClient.setQueryData(['tariffServices', variables.tariffId], context.previousTariffServices);
      }
    },
    
    // Cuando la mutación se completa exitosamente, invalidar las consultas afectadas
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa para obtener datos frescos del servidor
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
      queryClient.invalidateQueries({ queryKey: ['tariffServices', variables.tariffId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
} 