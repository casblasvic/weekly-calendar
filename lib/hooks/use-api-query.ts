import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

// Constantes para tiempos de caché
const CACHE_TIME = {
  INMEDIATO: 0,             // Sin caché
  MUY_CORTO: 1000 * 30,     // 30 segundos
  CORTO: 1000 * 60 * 2,     // 2 minutos
  MEDIO: 1000 * 60 * 5,     // 5 minutos
  LARGO: 1000 * 60 * 15,    // 15 minutos
  MUY_LARGO: 1000 * 60 * 60, // 1 hora
};

/**
 * Hook genérico para realizar consultas a la API utilizando TanStack Query.
 * Integra el sistema existente de api-client.ts con TanStack Query para
 * optimizar la carga de datos con caché avanzada.
 *
 * @param key - Clave única para la consulta (usado para la caché)
 * @param endpoint - Endpoint de la API a consultar
 * @param options - Opciones adicionales para useQuery
 * @returns Resultado de useQuery con datos tipados
 */
export function useApiQuery<TData = unknown, TError = unknown>(
  key: string | string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>
) {
  const queryKey = Array.isArray(key) ? key : [key];
  
  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      // Usar el api.cached.get existente que ya tiene manejo de caché
      return await api.cached.get<TData>(endpoint);
    },
    // Permite al componente especificar opciones de revalidación
    ...options,
  });
}

/**
 * Hook para realizar una mutación (POST, PUT, DELETE) a través de la API
 * utilizando TanStack Query para un manejo óptimo de estado y caché.
 *
 * @param key - Clave para invalidar después de la mutación
 * @param endpoint - Endpoint de la API a consultar
 * @param method - Método HTTP (post, put, patch, delete)
 * @returns Funciones de mutación y estado
 */
export function useApiMutation<TData = unknown, TVariables = unknown, TError = unknown>(
  key: string | string[],
  endpoint: string,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post'
) {
  const queryClient = useQueryClient();
  const queryKey = Array.isArray(key) ? key : [key];
  
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      // Usar el método correspondiente del api client existente
      if (method === 'delete') {
        return await api.delete<TData>(endpoint);
      }
      return await api[method]<TData>(endpoint, variables);
    },
    // Invalidar automáticamente las consultas relacionadas
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook para obtener métodos de pago disponibles
 */
export function usePaymentMethodsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      return await api.get('/api/payment-methods');
    },
    staleTime: CACHE_TIME.MEDIO, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener servicios
 */
export function useServicesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['services'],
    queryFn: async () => {
      return await api.get('/api/services');
    },
    staleTime: CACHE_TIME.MEDIO, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener productos
 */
export function useProductsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['products'],
    queryFn: async () => {
      return await api.get('/api/products');
    },
    staleTime: CACHE_TIME.MEDIO, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener definiciones de paquetes
 */
export function usePackagesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['packages'],
    queryFn: async () => {
      return await api.get('/api/package-definitions');
    },
    staleTime: CACHE_TIME.MEDIO, // 5 minutos
    ...options,
  });
}

/**
 * Hook para obtener definiciones de bonos
 */
export function useBonosQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['bonos'],
    queryFn: async () => {
      return await api.get('/api/bono-definitions');
    },
    staleTime: CACHE_TIME.MEDIO, // 5 minutos
    ...options,
  });
}

/**
 * Hook especializado para obtener bonos con optimizaciones específicas
 * para mejorar la velocidad de carga.
 */
export function useTariffsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useApiQuery('tariffs', '/api/tariffs', {
    // Las tarifas cambian con poca frecuencia
    staleTime: 1000 * 60 * 15, // 15 minutos
    ...options,
  });
}

/**
 * Hook especializado para obtener detalle de una tarifa específica con todas sus relaciones
 */
export function useTariffDetailQuery(
  tariffId: string | null, 
  options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery(
    ['tariff', tariffId], 
    tariffId ? `/api/tariffs/${tariffId}` : '', 
    {
      // Desactivar la consulta si no hay tariffId
      enabled: !!tariffId,
      // La información detallada de tarifa cambia poco
      staleTime: 1000 * 60 * 5, // 5 minutos
      // Manejar errores específicos
      retry: (failureCount, error: any) => {
        // No reintentar en caso de 404
        if (error?.response?.status === 404) return false;
        // Reintentar hasta 3 veces para otros errores
        return failureCount < 3;
      },
      ...options,
    }
  );
}

/**
 * Hook para obtener todas las clínicas disponibles (estables, cambian poco)
 */
export function useClinicsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useApiQuery('clinics', '/api/clinics', {
    staleTime: 1000 * 60 * 30, // 30 minutos
    ...options,
  });
}

/**
 * Hook para obtener todos los tipos de IVA (muy estables, casi no cambian)
 */
export function useVatTypesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useApiQuery('vat-types', '/api/vat-types', {
    staleTime: 1000 * 60 * 60, // 60 minutos
    ...options,
  });
}

/**
 * Hook para obtener categorías/familias (muy estables)
 */
export function useCategoriesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useApiQuery('categories', '/api/categories', {
    staleTime: 1000 * 60 * 30, // 30 minutos
    ...options,
  });
}

/**
 * Función para prefetch de datos que se usarán frecuentemente
 * Esta función puede llamarse en componentes críticos para cargar datos
 * de manera anticipada
 */
export function prefetchCommonData(queryClient = useQueryClient()) {
  // Prefetch de servicios
  queryClient.prefetchQuery({
    queryKey: ['services'],
    queryFn: async () => await api.cached.get('/api/services'),
  });
  
  // Prefetch de productos
  queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: async () => await api.cached.get('/api/products'),
  });
  
  // Prefetch de paquetes
  queryClient.prefetchQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const data = await api.cached.get('/api/package-definitions');
      // Aplicar la misma transformación que en usePackagesQuery
      if (data && typeof data === 'object' && 'packageDefinitions' in data) {
        return (data as { packageDefinitions: any[] }).packageDefinitions;
      }
      return Array.isArray(data) ? data : [];
    },
    // Menor prioridad que servicios/productos
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
  
  // Prefetch de bonos (menos prioritario)
  queryClient.prefetchQuery({
    queryKey: ['bonos'],
    queryFn: async () => await api.cached.get('/api/bono-definitions'),
    // Menor prioridad que servicios/productos
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
  
  // Prefetch de datos comunes utilizados en configuraciones
  queryClient.prefetchQuery({
    queryKey: ['vat-types'],
    queryFn: async () => await api.cached.get('/api/vat-types'),
    staleTime: 1000 * 60 * 60, // 60 minutos (raramente cambian)
  });
  
  queryClient.prefetchQuery({
    queryKey: ['categories'],
    queryFn: async () => await api.cached.get('/api/categories'),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
  
  queryClient.prefetchQuery({
    queryKey: ['clinics'],
    queryFn: async () => await api.cached.get('/api/clinics'),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
} 