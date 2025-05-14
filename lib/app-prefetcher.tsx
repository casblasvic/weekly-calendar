'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';

/**
 * AppPrefetcher es un componente invisible que se encarga de precargar datos
 * comunes basados en la navegación del usuario para mejorar la experiencia.
 * 
 * Se coloca en _app.tsx o en el Providers wrapper para que esté disponible
 * en toda la aplicación.
 */
export function AppPrefetcher() {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  // Prefetching basado en la página actual
  useEffect(() => {
    const prefetchForPage = async () => {
      // Datos comunes que necesitamos en casi todas las páginas
      if (!queryClient.getQueryData(['vat-types'])) {
        queryClient.prefetchQuery({
          queryKey: ['vat-types'],
          queryFn: () => api.cached.get('/api/vat-types'),
          staleTime: CACHE_TIME.ESTATICO // Datos que cambian raramente
        });
      }
      
      // Prefetching específico según la página
      if (pathname?.includes('/configuracion/tarifas')) {
        // En páginas de tarifas, prefetch servicios, productos, etc.
        queryClient.prefetchQuery({
          queryKey: ['services'],
          queryFn: () => api.cached.get('/api/services'),
          staleTime: CACHE_TIME.LARGO
        });
        
        queryClient.prefetchQuery({
          queryKey: ['products'],
          queryFn: () => api.cached.get('/api/products'),
          staleTime: CACHE_TIME.LARGO
        });
      }
      
      else if (pathname?.includes('/configuracion/servicios')) {
        // Prefetch de categorías y tipos de IVA para la página de servicios
        queryClient.prefetchQuery({
          queryKey: ['categories'],
          queryFn: () => api.cached.get('/api/categories'),
          staleTime: CACHE_TIME.LARGO
        });
      }
      
      else if (pathname?.includes('/agenda')) {
        // Prefetch datos para la agenda
        const today = new Date().toISOString().split('T')[0];
        queryClient.prefetchQuery({
          queryKey: ['appointments', today],
          queryFn: () => api.cached.get(`/api/appointments?date=${today}`),
          staleTime: CACHE_TIME.CORTO // Datos que cambian frecuentemente
        });
      }
    };
    
    prefetchForPage();
  }, [pathname, queryClient]);
  
  // No renderiza nada, solo es un gestor invisible de datos
  return null;
} 