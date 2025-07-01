import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

/**
 * Hook para obtener categorías/familias (muy estables)
 */
export function useCategoriesQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['categories'],
    queryFn: async () => {
      return await api.get('/api/categories');
    },
    staleTime: 1000 * 60 * 5, // 5 minutos (reducido para mejor actualización)
    refetchOnWindowFocus: false, // No refrescar al cambiar ventana
    ...options,
  });
}

/**
 * Hook para obtener detalles de una categoría específica
 */
export function useCategoryDetailQuery(categoryId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) throw new Error('Category ID is required');
      return await api.get(`/api/categories/${categoryId}`);
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 2, // 2 minutos (reducido)
    ...options,
  });
} 