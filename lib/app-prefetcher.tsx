'use client';

/*
 * ⚡ AppPrefetcher — Precarga masiva de datos a IndexedDB  
 * @see docs/PERSISTENT_CACHE_STRATEGY.md
 * Al añadir nuevas colecciones o cambiar TTL, actualiza ese README
 * y añade cabecera similar en el nuevo archivo.
 */
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';
import { useClinic } from '@/contexts/clinic-context';
import { cashSessionKeys } from '@/lib/hooks/use-cash-session-query';
import { menuItems } from '@/config/menu-structure';

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
  const router = useRouter();
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

        // 🗄️ PREFETCH CABINAS de la clínica (muy utilizadas para renderizar columnas)
        if (!queryClient.getQueryData(['cabins', activeClinicId])) {
          queryClient.prefetchQuery({
            queryKey: ['cabins', activeClinicId],
            queryFn: () => api.cached.get(`/api/clinics/${activeClinicId}/cabins?systemId=${activeClinic?.systemId ?? ''}`),
            staleTime: CACHE_TIME.LARGO
          });
        }

        // 🗄️ PREFETCH PLANTILLAS DE HORARIO del sistema (casi estáticas)
        const systemId = activeClinic?.systemId;
        if (systemId && !queryClient.getQueryData(['scheduleTemplates', systemId])) {
          queryClient.prefetchQuery({
            queryKey: ['scheduleTemplates', systemId],
            queryFn: () => api.cached.get('/api/templates'),
            staleTime: CACHE_TIME.LARGO
          });
        }

        if (systemId && !queryClient.getQueryData(['integrations', systemId])) {
          queryClient.prefetchQuery({
            queryKey: ['integrations', systemId],
            queryFn: () => api.cached.get('/api/internal/integrations'),
            staleTime: CACHE_TIME.LARGO
          });
        }

        // ✅ ELIMINADO: PREFETCH EQUIPMENT REQUIREMENTS - ahora viene pre-cargado con appointments
        // Los datos de equipamiento ya vienen incluidos en la API /api/appointments
        // Ver: docs/SERVICE_EQUIPMENT_REQUIREMENTS_OPTIMIZATION.md

        // PREFETCH smart plug devices
        if (systemId && !queryClient.getQueryData(['smartPlugDevices', systemId])) {
          queryClient.prefetchQuery({
            queryKey: ['smartPlugDevices', systemId],
            queryFn: () => api.cached.get('/api/internal/smart-plug-devices?page=1&pageSize=1000'),
            staleTime: CACHE_TIME.LARGO
          });
        }

        // PREFETCH EQUIPMENT CATALOGO
        if (!queryClient.getQueryData(['equipment'])) {
          queryClient.prefetchQuery({
            queryKey: ['equipment'],
            queryFn: () => api.cached.get('/api/equipment'),
            staleTime: CACHE_TIME.LARGO,
          });
        }

        // PREFETCH USERS POR CLÍNICA ACTIVA
        if (activeClinicId && !queryClient.getQueryData(['usersByClinic', { clinicId: activeClinicId }])) {
          queryClient.prefetchQuery({
            queryKey: ['usersByClinic', { clinicId: activeClinicId }],
            queryFn: () => api.cached.get(`/api/users/byClinic/${activeClinicId}`),
            staleTime: CACHE_TIME.LARGO,
          });
        }

        // ✅ PREFETCH MEJORADO: Overrides de cabinas para múltiples semanas
        const prefetchOverrides = async (weekOffset: number) => {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + (weekOffset * 7));
          const monday = new Date(targetDate);
          monday.setDate(monday.getDate() - ((monday.getDay()+6)%7)); // lunes
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate()+6);
          const mondayStr = monday.toISOString().split('T')[0];
          const sundayStr = sunday.toISOString().split('T')[0];

          const cacheKey = ['cabin-schedule-overrides', activeClinicId, mondayStr, sundayStr];
          
          if (!queryClient.getQueryData(cacheKey)) {
            queryClient.prefetchQuery({
              queryKey: cacheKey,
              queryFn: () => api.cached.get(`/api/cabin-schedule-overrides?clinicId=${activeClinicId}&startDate=${mondayStr}&endDate=${sundayStr}`),
              staleTime: CACHE_TIME.CORTO,
            });
          }
        };

        // Prefetch semana anterior, actual y siguiente
        prefetchOverrides(-1); // Semana anterior
        prefetchOverrides(0);  // Semana actual
        prefetchOverrides(1);  // Semana siguiente
      }
    };
    
    prefetchForPage();
  }, [pathname, queryClient, activeClinic?.id, activeClinic?.systemId]);

  /**
   * PREFETCH UNIVERSAL POR CLÍNICA ─ se ejecuta cada vez que cambia la clínica
   * activa.  Persistimos catálogos que se usan en múltiples páginas (agenda y
   * configuración).  Si el usuario cambia entre varias clínicas NO borramos la
   * caché previa; simplemente añadimos la nueva entrada.  React-Query gestionará
   * el tamaño en IndexedDB con LRU y nuestro TTL de 12 h.
   */
  useEffect(() => {
    if (!activeClinic?.id) return;

    const clinicId = activeClinic.id;
    const systemId = activeClinic.systemId;

    // 1️⃣ Integraciones (stripe, shelly, etc.)
    if (systemId && !queryClient.getQueryData(['integrations', systemId])) {
      queryClient.prefetchQuery({
        queryKey: ['integrations', systemId],
        queryFn: () => api.cached.get('/api/internal/integrations'),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    // 2️⃣ Dispositivos IoT / enchufes inteligentes
    if (systemId && !queryClient.getQueryData(['smartPlugDevices', systemId])) {
      queryClient.prefetchQuery({
        queryKey: ['smartPlugDevices', systemId],
        queryFn: () => api.cached.get('/api/internal/smart-plug-devices?page=1&pageSize=1000'),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    // 3️⃣ Asignaciones de equipos por clínica
    if (!queryClient.getQueryData(['equipmentAssignments', clinicId])) {
      queryClient.prefetchQuery({
        queryKey: ['equipmentAssignments', clinicId],
        queryFn: () => api.cached.get(`/api/equipment/clinic-assignments?clinicId=${clinicId}`),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    // 4️⃣ Requerimientos de equipo por servicio
    // Ruta antigua eliminada (devuelve 400). A la espera de nuevo endpoint por clínica.

    // 5️⃣ Servicios / Tarifas / Paquetes / Bonos
    if (!queryClient.getQueryData(['services', clinicId])) {
      queryClient.prefetchQuery({
        queryKey: ['services', clinicId],
        queryFn: () => api.cached.get(`/api/services?clinicId=${clinicId}`),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    // ✅ NUEVO: Prefetch de bonos para agenda
    if (!queryClient.getQueryData(['bonos', clinicId])) {
      queryClient.prefetchQuery({
        queryKey: ['bonos', clinicId],
        queryFn: () => api.cached.get(`/api/bonos?clinicId=${clinicId}`),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    // ✅ NUEVO: Prefetch de paquetes para agenda
    if (!queryClient.getQueryData(['packages', clinicId])) {
      queryClient.prefetchQuery({
        queryKey: ['packages', clinicId],
        queryFn: () => api.cached.get(`/api/packages?clinicId=${clinicId}`),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    if (!queryClient.getQueryData(['tariffs', clinicId])) {
      queryClient.prefetchQuery({
        queryKey: ['tariffs', clinicId],
        queryFn: () => api.cached.get(`/api/tariffs?clinicId=${clinicId}`),
        staleTime: CACHE_TIME.LARGO,
      });
    }

    // 7️⃣ Tarifas por clínica -------------------------------------------------
    if (!queryClient.getQueryData(['tariffs', clinicId])) {
      queryClient.prefetchQuery({
        queryKey: ['tariffs', clinicId],
        queryFn: () => api.cached.get(`/api/tariffs?clinicId=${clinicId}`),
        staleTime: 1000 * 60 * 60 * 12,
      });
    }

    // 8️⃣ Cash Session (día actual) -----------------------------------------
    const todayStr = new Date().toISOString().split('T')[0];
    const cashKey = cashSessionKeys.detailByDate(clinicId, { date: todayStr, sessionId: undefined });
    if (!queryClient.getQueryData(cashKey)) {
      queryClient.prefetchQuery({
        queryKey: cashKey,
        queryFn: () => api.cached.get(`/api/cash-sessions/by-date?clinicId=${clinicId}&date=${todayStr}`),
        staleTime: 1000 * 60 * 5,
      });
    }

    // 9️⃣ Tickets abiertos y cerrados (página 1) ----------------------------
    const pageSize = 10;
    const openFilters = { clinicId, status: ['OPEN'], page: 1, pageSize };
    const closedFilters = { clinicId, status: ['CLOSED'], page: 1, pageSize };

    const openKey: any = ['tickets', openFilters];
    const closedKey: any = ['tickets', closedFilters];

    if (!queryClient.getQueryData(openKey)) {
      queryClient.prefetchQuery({
        queryKey: openKey,
        queryFn: () => api.cached.get(`/api/tickets?clinicId=${clinicId}&status=OPEN&page=1&pageSize=${pageSize}`),
        staleTime: CACHE_TIME.MEDIO,
        gcTime: CACHE_TIME.MUY_LARGO,
      }).then((openList: any) => {
        // Prefetch detalle de cada ticket abierto para edición instantánea
        const tickets: any[] = openList?.data ?? [];
        tickets.forEach((t) => {
          const detailKey = ['ticket', t.id] as const;
          if (!queryClient.getQueryData(detailKey)) {
            queryClient.prefetchQuery({
              queryKey: detailKey,
              queryFn: () => api.cached.get(`/api/tickets/${t.id}`),
              staleTime: CACHE_TIME.MEDIO,
              gcTime: CACHE_TIME.MUY_LARGO,
            });
          }
        });
      });
    }

    // Prefetch lista CLOSED (página 1) y sus detalles (consultados con frecuencia)
    if (!queryClient.getQueryData(closedKey)) {
      queryClient.prefetchQuery({
        queryKey: closedKey,
        queryFn: () => api.cached.get(`/api/tickets?clinicId=${clinicId}&status=CLOSED&page=1&pageSize=${pageSize}`),
        staleTime: 1000 * 60 * 15, // 15 min
        gcTime: CACHE_TIME.MUY_LARGO,
      }).then((closedList: any) => {
        const tickets: any[] = closedList?.data ?? [];
        tickets.forEach((t) => {
          const detailKey = ['ticket', t.id] as const;
          if (!queryClient.getQueryData(detailKey)) {
            queryClient.prefetchQuery({
              queryKey: detailKey,
              queryFn: () => api.cached.get(`/api/tickets/${t.id}`),
              staleTime: 1000 * 60 * 15,
              gcTime: CACHE_TIME.MUY_LARGO,
            });
          }
        });
      });
    }
  }, [activeClinic?.id, activeClinic?.systemId, queryClient]);
  
  // Prefetch rutas de menú al estar ocioso
  useEffect(() => {
    const idle = (cb: () => void) => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(cb, { timeout: 1500 });
      } else {
        setTimeout(cb, 500);
      }
    };

    idle(() => {
      const links: string[] = [];
      const collect = (items: any[]) => {
        items?.forEach((it) => {
          if (it.href) links.push(it.href);
          if (it.submenu) collect(it.submenu);
        });
      };
      collect(menuItems);
      links.forEach((href) => router.prefetch(href));
    });
  }, [router]);

  return null;
} 