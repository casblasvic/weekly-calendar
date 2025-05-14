import { QueryClient } from '@tanstack/react-query';
import { getCachedData, cacheData } from '@/utils/cache-utils';
import { CACHE_TIME } from '@/lib/react-query';

/**
 * Crea y configura un QueryClient de TanStack Query con opciones óptimas de rendimiento
 * y compatibilidad con el sistema de caché existente.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Mejora rendimiento evitando refetching innecesario
        staleTime: CACHE_TIME.MEDIO, // 5 minutos por defecto
        
        // Mantiene datos en caché por más tiempo
        gcTime: CACHE_TIME.LARGO, // 15 minutos
        
        // Retry optimizado para no sobrecargar el servidor
        retry: (failureCount, error) => {
          // No reintentar en errores 4xx (cliente)
          if (error instanceof Error && 'status' in error && (error as any).status >= 400 && (error as any).status < 500) {
            return false;
          }
          // Máximo 2 reintentos para otros errores
          return failureCount < 2;
        },
        
        // Tiempo de espera entre reintentos (backoff exponencial)
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // No refetch al recuperar foco
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Persister para TanStack Query que usa el sistema de caché existente de la aplicación.
 * Esto permite integrar el sistema de caché actual con TanStack Query.
 */
export const customPersister = {
  persistClient: (cacheSnapshot) => {
    cacheData('tanstack-query-cache', cacheSnapshot, 1000 * 60 * 60 * 2); // 2 horas
    return Promise.resolve();
  },
  restoreClient: () => {
    const cachedData = getCachedData('tanstack-query-cache', 1000 * 60 * 60 * 2);
    return Promise.resolve(cachedData || undefined);
  },
  removeClient: () => {
    sessionStorage.removeItem('tanstack-query-cache');
    return Promise.resolve();
  }
};

// QueryClient singleton que se usa en toda la aplicación
let queryClientInstance: QueryClient | null = null;

/**
 * Obtiene una instancia singleton del QueryClient para garantizar consistencia en toda la aplicación
 */
export function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
} 