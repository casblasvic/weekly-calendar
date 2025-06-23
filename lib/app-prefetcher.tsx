'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';
import { useClinic } from '@/contexts/clinic-context';

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
  const { activeClinic } = useClinic();

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
        // ✅ PREFETCH MEJORADO: Usar nuevo sistema de sliding window
        const { getCurrentWeekKey, getWeekKey, getDayKey } = await import('@/lib/hooks/use-appointments-query');
        
        const currentWeek = getCurrentWeekKey();
        const prevWeek = getWeekKey(currentWeek, -1);
        const nextWeek = getWeekKey(currentWeek, +1);
        const today = getDayKey(new Date());
        
        // ✅ USAR CLÍNICA ACTIVA DEL CONTEXTO
        const activeClinicId = activeClinic?.id;
        
        // Solo hacer prefetch si hay una clínica activa
        if (!activeClinicId) {
          console.log('[AppPrefetcher] No hay clínica activa, saltando prefetch de agenda');
          return;
        }
        
        // ✅ PREFETCH SLIDING WINDOW (3 semanas)
        [prevWeek, currentWeek, nextWeek].forEach(week => {
          if (!queryClient.getQueryData(['appointments', 'week', week, activeClinicId])) {
            queryClient.prefetchQuery({
              queryKey: ['appointments', 'week', week, activeClinicId],
              queryFn: () => api.cached.get(`/api/appointments?clinicId=${activeClinicId}&week=${week}`),
              staleTime: CACHE_TIME.CORTO
            });
          }
        });
        
        // ✅ PREFETCH DÍA ACTUAL (prioritario)
        if (!queryClient.getQueryData(['appointments', 'day', today, activeClinicId])) {
          queryClient.prefetchQuery({
            queryKey: ['appointments', 'day', today, activeClinicId],
            queryFn: () => api.cached.get(`/api/appointments?clinicId=${activeClinicId}&date=${today}`),
            staleTime: CACHE_TIME.MUY_CORTO
          });
        }
      }
    };
    
    prefetchForPage();
  }, [pathname, queryClient]);
  
  // No renderiza nada, solo es un gestor invisible de datos
  return null;
} 