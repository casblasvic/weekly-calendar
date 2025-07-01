import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { type ProductWithIncludes } from '@/lib/types/product-types';
import { CACHE_TIME } from '@/lib/react-query';

/**
 * Hook para obtener todos los productos
 */
export function useProductsQuery(options?: Omit<UseQueryOptions<ProductWithIncludes[], unknown, ProductWithIncludes[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<ProductWithIncludes[], unknown, ProductWithIncludes[]>({
    queryKey: ['products'],
    queryFn: async (): Promise<ProductWithIncludes[]> => {
      const data = await api.get('/api/products');
      return data as ProductWithIncludes[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos (reducido para mejor actualización)
    refetchOnMount: false, // No refrescar automáticamente al montar
    refetchOnWindowFocus: false, // No refrescar al cambiar ventana
    ...options,
  });
}

/**
 * Hook para obtener detalles de un producto específico
 */
export function useProductDetailQuery(productId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      return await api.get(`/api/products/${productId}`);
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 1, // 1 minuto (reducido para mejor actualización)
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
 * Hook para crear un producto
 */
export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/products', data);
      return response;
    },
    onSuccess: () => {
      // Invalidar consultas relacionadas con productos
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

/**
 * Hook para actualizar un producto
 */
export function useUpdateProductMutation(productId: string) {
  const queryClient = useQueryClient();
  return useMutation<ProductWithIncludes, unknown, Partial<ProductWithIncludes>>({
    mutationFn: async (data) => {
      const response = await api.patch(`/api/products/${productId}`, data);
      return response as ProductWithIncludes;
    },
    // Actualización optimista para respuesta inmediata
    onMutate: async (data) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] });

      // Obtener datos previos
      const previousProducts = queryClient.getQueryData(['products']);
      const previousProduct = queryClient.getQueryData(['product', productId]);

      // Actualizar optimísticamente la lista de productos
      queryClient.setQueryData(['products'], (old: any[]) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map(product => 
          product.id === productId ? { ...product, ...data } : product
        );
      });

      // Actualizar optimísticamente el producto individual
      queryClient.setQueryData(['product', productId], (old: any) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      return { previousProducts, previousProduct, productId };
    },
    onError: (err, variables, context: any) => {
      // Revertir en caso de error
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      if (context?.previousProduct) {
        queryClient.setQueryData(['product', context.productId], context.previousProduct);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidar para obtener datos actualizados del servidor
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // Por si cambió la categoría
    }
  });
}

/**
 * Hook para eliminar un producto
 */
export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/products/${id}`);
      return response;
    },
    // Actualización optimista para respuesta inmediata
    onMutate: async (id) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', id] });

      // Obtener datos previos
      const previousProducts = queryClient.getQueryData(['products']);

      // Remover optimísticamente de la lista
      queryClient.setQueryData(['products'], (old: any[]) => {
        if (!old || !Array.isArray(old)) return old;
        return old.filter(product => product.id !== id);
      });

      return { previousProducts, id };
    },
    onError: (err, id, context: any) => {
      // Revertir en caso de error
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
    },
    onSuccess: (_, id) => {
      // Limpiar datos específicos del producto eliminado
      queryClient.removeQueries({ queryKey: ['product', id] });
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // Por si cambió el tipo de categoría
    }
  });
}

/**
 * Hook para obtener stock actual de un producto
 */
export function useProductStockQuery(productId: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['product-stock', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      // Suponiendo que existe un endpoint para obtener el stock específico
      return await api.get(`/api/products/${productId}/stock`);
    },
    enabled: !!productId,
    staleTime: 1000 * 60, // 1 minuto (el stock cambia con más frecuencia)
    ...options,
  });
}

/**
 * Hook para añadir productos a una tarifa
 */
export function useAddProductsToTariffMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tariffId, productIds }: { tariffId: string; productIds: string[] }) => {
      if (!tariffId) throw new Error("ID de tarifa no especificado.");
      const response = await api.post(`/api/tariffs/${tariffId}/products`, { productIds });
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar consultas relacionadas con esta tarifa
      queryClient.invalidateQueries({ queryKey: ['tariff', variables.tariffId] });
      // También invalidar la consulta específica de productos de tarifa
      queryClient.invalidateQueries({ queryKey: ['tariffProducts', variables.tariffId] });
      // Y las consultas de productos para actualizar su estado de asignación
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
} 