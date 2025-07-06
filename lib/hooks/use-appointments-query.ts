/*
 * 📆 use-appointments-query — Citas diarias/semanales persistidas
 * @see docs/PERSISTENT_CACHE_STRATEGY.md
 */
import { useQuery, useQueries, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/react-query';
import { format, addWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/contexts/clinic-context';

// Tipos para appointments
interface Appointment {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  date: Date;
  duration: number;
  roomId: string;
  personId: string;
  phone?: string;
  services: any[];
  tags: string[];
  color?: string;
  [key: string]: any;
}

interface WeekAppointmentsResponse {
  appointments: Appointment[];
  weekKey: string;
}

interface DayAppointmentsResponse {
  appointments: Appointment[];
  dayKey: string;
}

// Utilidades para keys
export function getWeekKey(date: Date | string, offset: number = 0): string {
  let targetDate: Date;
  
  // ✅ MANEJAR STRINGS DE SEMANA ISO (formato "W2025-27")
  if (typeof date === 'string') {
    if (date.startsWith('W')) {
      // Es un weekKey, extraer la fecha de inicio de semana
      const match = date.match(/^W(\d{4})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1]);
        const week = parseInt(match[2]);
        
        // Calcular fecha de inicio de semana ISO
        const jan1 = new Date(year, 0, 1);
        const daysToFirstMonday = (8 - jan1.getDay()) % 7;
        const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
        targetDate = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      } else {
        console.error('[getWeekKey] Formato de weekKey inválido:', date);
        targetDate = new Date(); // Fallback a fecha actual
      }
    } else {
      // Es una fecha normal en string
      targetDate = new Date(date);
    }
  } else {
    targetDate = date;
  }
  
  // ✅ VALIDAR que la fecha sea válida
  if (isNaN(targetDate.getTime())) {
    console.error('[getWeekKey] Fecha inválida recibida:', date);
    return getWeekKey(new Date(), offset); // Fallback a fecha actual
  }
  
  const weekStart = startOfWeek(addWeeks(targetDate, offset), { weekStartsOn: 1 });
  
  // ✅ FORMATO CORREGIDO: usar 'I' para número de semana ISO
  const year = format(weekStart, 'yyyy');
  const weekNumber = format(weekStart, 'I'); // 'I' = semana ISO (1-53)
  
  return `W${year}-${weekNumber.padStart(2, '0')}`;
}

export function getDayKey(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return format(targetDate, 'yyyy-MM-dd');
}

export function getCurrentWeekKey(): string {
  return getWeekKey(new Date(), 0);
}

// API Functions
async function fetchWeekAppointments(weekKey: string, clinicId: string, isAuthenticated: boolean): Promise<WeekAppointmentsResponse> {
  if (!isAuthenticated) {
    throw new Error('Usuario no autenticado');
  }
  
  // ✅ CORREGIDO: Solo pasar parámetro week (sin date)
  const response = await fetch(`/api/appointments?clinicId=${clinicId}&week=${weekKey}`);
  
  if (!response.ok) {
    throw new Error('Error fetching week appointments');
  }
  
  const data = await response.json();
  return {
    appointments: data.map((apt: any) => ({
      ...apt,
      date: new Date(apt.date)
    })),
    weekKey
  };
}

async function fetchDayAppointments(dayKey: string, clinicId: string, isAuthenticated: boolean): Promise<DayAppointmentsResponse> {
  if (!isAuthenticated) {
    throw new Error('Usuario no autenticado');
  }
  
  const response = await fetch(`/api/appointments?clinicId=${clinicId}&startDate=${dayKey}&endDate=${dayKey}`);
  
  if (!response.ok) {
    throw new Error('Error fetching day appointments');
  }
  
  const data = await response.json();
  return {
    appointments: data.map((apt: any) => ({
      ...apt,
      date: new Date(apt.date)
    })),
    dayKey
  };
}

// ✅ HOOK PRINCIPAL: Query de semana
// 🔥 SOLUCIÓN CRÍTICA RACE CONDITION: Este hook DEBE esperar a que isInitialized sea true
// ❌ NUNCA ELIMINAR isInitialized de la condición enabled - causa múltiples recargas y redirección a /dashboard
// 📚 DOCUMENTACIÓN: isInitialized evita que se ejecute antes de que ClinicContext esté completamente listo
export function useWeekAppointmentsQuery(weekKey: string, clinicId: string | null) {
  const { data: session, status } = useSession();
  const { isInitialized } = useClinic(); // 🔥 CRÍTICO: Previene race condition
  const isAuthenticated = status === 'authenticated';
  
  return useQuery<WeekAppointmentsResponse, Error>({
    queryKey: ['appointments', 'week', weekKey, clinicId],
    queryFn: () => fetchWeekAppointments(weekKey, clinicId!, isAuthenticated),
    enabled: !!clinicId && isAuthenticated && isInitialized, // 🔥 CRÍTICO: isInitialized previene race condition
    staleTime: 1000 * 60 * 15, // 15 min de cortesía
    gcTime: 1000 * 60 * 5, // ✅ 5 minutos para cache
    refetchOnMount: false, // ✅ NO refetch automático - el optimista maneja los datos
    refetchOnWindowFocus: false, // ✅ NO refetch en focus
    refetchInterval: false, // ✅ NO polling automático
  });
}

// ✅ HOOK: Query de día específico
// 🔥 SOLUCIÓN CRÍTICA RACE CONDITION: Este hook DEBE esperar a que isInitialized sea true
// ❌ NUNCA ELIMINAR isInitialized de la condición enabled - causa múltiples recargas y redirección a /dashboard
export function useDayAppointmentsQuery(dayKey: string, clinicId: string | null) {
  const { data: session, status } = useSession();
  const { isInitialized } = useClinic(); // 🔥 CRÍTICO: Previene race condition
  const isAuthenticated = status === 'authenticated';
  
  return useQuery<DayAppointmentsResponse, Error>({
    queryKey: ['appointments', 'day', dayKey, clinicId],
    queryFn: () => fetchDayAppointments(dayKey, clinicId!, isAuthenticated),
    enabled: !!clinicId && isAuthenticated && isInitialized, // 🔥 CRÍTICO: isInitialized previene race condition
    staleTime: 1000 * 60 * 15, // 15 min de cortesía
    gcTime: 1000 * 60 * 3, // ✅ REDUCIR a 3 minutos para días
    refetchOnMount: false, // ✅ NO refetch automático - causa bucles infinitos
    refetchOnWindowFocus: false, // ✅ NO refetch en focus para evitar spam
    refetchInterval: false, // ✅ NO polling automático
  });
}

// ✅ HOOK PRINCIPAL: Sliding Window Cache (3 semanas)
// 🔥 SOLUCIÓN CRÍTICA RACE CONDITION: Todas las queries DEBEN esperar a que isInitialized sea true
// ❌ NUNCA ELIMINAR isInitialized de las condiciones enabled - causa múltiples recargas y redirección a /dashboard
export function useSlidingAgendaCache(
  currentWeek: string,
  clinicId: string | null
) {
  const { data: session, status } = useSession(); // ✅ AÑADIR verificación de sesión
  const { isInitialized } = useClinic(); // 🔥 CRÍTICO: Previene race condition
  const isAuthenticated = status === 'authenticated';
  
  const prevWeek = getWeekKey(currentWeek, -1);
  const nextWeek = getWeekKey(currentWeek, +1);
  
  // ✅ PREFETCH AUTOMÁTICO DE 3 SEMANAS - SIN BUCLE INFINITO
  const queries = useQueries({
    queries: [
      {
        queryKey: ['appointments', 'week', prevWeek, clinicId],
        queryFn: () => fetchWeekAppointments(prevWeek, clinicId!, isAuthenticated),
        staleTime: 1000 * 60 * 15, // 15 min de cortesía
        gcTime: 1000 * 60 * 5, // ✅ 5 minutos para sliding cache
        enabled: !!clinicId && isAuthenticated && isInitialized, // 🔥 CRÍTICO: isInitialized previene race condition
        refetchOnMount: false, // ✅ NO refetch automático - causa bucles
        refetchOnWindowFocus: false,
        refetchInterval: false // ✅ NO polling automático
      },
      {
        queryKey: ['appointments', 'week', currentWeek, clinicId],
        queryFn: () => fetchWeekAppointments(currentWeek, clinicId!, isAuthenticated),
        staleTime: 1000 * 60 * 15, // 15 min de cortesía
        gcTime: 1000 * 60 * 5, // ✅ 5 minutos para sliding cache
        enabled: !!clinicId && isAuthenticated && isInitialized, // 🔥 CRÍTICO: isInitialized previene race condition
        refetchOnMount: false, // ✅ NO refetch automático - causa bucles
        refetchOnWindowFocus: false,
        refetchInterval: false // ✅ NO polling automático
      },
      {
        queryKey: ['appointments', 'week', nextWeek, clinicId],
        queryFn: () => fetchWeekAppointments(nextWeek, clinicId!, isAuthenticated),
        staleTime: 1000 * 60 * 15, // 15 min de cortesía
        gcTime: 1000 * 60 * 5, // ✅ 5 minutos para sliding cache
        enabled: !!clinicId && isAuthenticated && isInitialized, // 🔥 CRÍTICO: isInitialized previene race condition
        refetchOnMount: false, // ✅ NO refetch automático - causa bucles
        refetchOnWindowFocus: false,
        refetchInterval: false // ✅ NO polling automático
      }
    ]
  });
  
  return {
    prevWeekData: queries[0],
    currentWeekData: queries[1], 
    nextWeekData: queries[2],
    isLoading: queries.some(q => q.isLoading),
    isError: queries.some(q => q.isError),
    // ✅ DATOS COMBINADOS para fácil acceso
    allAppointments: [
      ...(queries[0].data?.appointments || []),
      ...(queries[1].data?.appointments || []),
      ...(queries[2].data?.appointments || [])
    ]
  };
}

// ✅ HOOK: Prefetch inteligente para nueva clínica
export function usePrefetchAgendaForClinic() {
  const queryClient = useQueryClient();
  
  const prefetchAgendaForClinic = async (clinicId: string) => {
    console.log('[usePrefetchAgenda] 🚀 Prefetching agenda para clínica:', clinicId);
    
    const currentWeek = getCurrentWeekKey();
    const prevWeek = getWeekKey(new Date(currentWeek), -1);
    const nextWeek = getWeekKey(new Date(currentWeek), +1);
    const today = getDayKey(new Date());
    
    // ✅ PREFETCH SEMANAS (sliding window)
    const weekPrefetches = [prevWeek, currentWeek, nextWeek].map(week =>
      queryClient.prefetchQuery({
        queryKey: ['appointments', 'week', week, clinicId],
        queryFn: () => fetchWeekAppointments(week, clinicId, true),
        staleTime: CACHE_TIME.CORTO
      })
    );
    
    // ✅ PREFETCH DÍA ACTUAL (prioritario)
    const dayPrefetch = queryClient.prefetchQuery({
      queryKey: ['appointments', 'day', today, clinicId],
      queryFn: () => fetchDayAppointments(today, clinicId, true),
      staleTime: CACHE_TIME.MUY_CORTO
    });
    
    // ✅ EJECUTAR TODOS EN PARALELO
    await Promise.all([...weekPrefetches, dayPrefetch]);
    
    console.log('[usePrefetchAgenda] ✅ Prefetch completado para clínica:', clinicId);
  };
  
  return { prefetchAgendaForClinic };
}

// ✅ HOOK: Mutations para appointments con invalidación inteligente
export function useAppointmentMutations() {
  const queryClient = useQueryClient();
  
  const updateAppointment = useMutation({
    mutationFn: async (appointment: Partial<Appointment> & { id: string }) => {
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      
      if (!response.ok) throw new Error('Error updating appointment');
      return response.json();
    },
    onMutate: async (newAppointment) => {
      // ✅ INVALIDACIÓN INTELIGENTE: Solo vistas afectadas
      const weekKey = getWeekKey(newAppointment.date || new Date());
      const dayKey = getDayKey(newAppointment.date || new Date());
      
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ queryKey: ['appointments', 'week', weekKey] });
      await queryClient.cancelQueries({ queryKey: ['appointments', 'day', dayKey] });
      
      // TODO: Optimistic update aquí si es necesario
    },
    onSuccess: (data, variables) => {
      // ⚠️ TEMPORALMENTE DESACTIVADO - CONFLICTO CON SISTEMA OPTIMISTA
      // ✅ INVALIDAR CACHES RELACIONADOS
      const weekKey = getWeekKey(variables.date || new Date());
      const dayKey = getDayKey(variables.date || new Date());
      
      console.log('[INVALIDACION CONFLICTIVA DESACTIVADA] updateAppointment success para weekKey:', weekKey);
      // queryClient.invalidateQueries({ queryKey: ['appointments', 'week', weekKey] });
      // queryClient.invalidateQueries({ queryKey: ['appointments', 'day', dayKey] });
    }
  });
  
  const createAppointment = useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id'>) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      
      if (!response.ok) throw new Error('Error creating appointment');
      return response.json();
    },
    onSuccess: (data, variables) => {
      const weekKey = getWeekKey(variables.date);
      const dayKey = getDayKey(variables.date);
      
      console.log('[INVALIDACION CONFLICTIVA DESACTIVADA] createAppointment success para weekKey:', weekKey);
      // queryClient.invalidateQueries({ queryKey: ['appointments', 'week', weekKey] });
      // queryClient.invalidateQueries({ queryKey: ['appointments', 'day', dayKey] });
    }
  });
  
  const deleteAppointment = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: Date }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Error deleting appointment');
      return response.json();
    },
    onSuccess: (data, variables) => {
      const weekKey = getWeekKey(variables.date);
      const dayKey = getDayKey(variables.date);
      
      console.log('[INVALIDACION CONFLICTIVA DESACTIVADA] deleteAppointment success para weekKey:', weekKey);
      // queryClient.invalidateQueries({ queryKey: ['appointments', 'week', weekKey] });
      // queryClient.invalidateQueries({ queryKey: ['appointments', 'day', dayKey] });
    }
  });
  
  return {
    updateAppointment,
    createAppointment,
    deleteAppointment
  };
}

// ----------------------------------------------------------------------------------
// 🛡️ HOOK AUXILIAR: useWeekAppointmentsQueryGuard
// Evita disparar queries redundantes si los datos ya están en caché.
// Siempre se llama (cumple las reglas de Hooks) y decide internamente si
// delegar a useWeekAppointmentsQuery o devolver un stub.
// ----------------------------------------------------------------------------------
export function useWeekAppointmentsQueryGuard(weekKey: string, clinicId: string | null) {
  const queryClient = useQueryClient();
  const { isInitialized } = useClinic();

  // Siempre invocamos el hook base para cumplir la regla de Hooks
  const underlyingQuery = useWeekAppointmentsQuery(weekKey, (isInitialized ? clinicId : null));

  // Si no hay clínica o contexto no listo devolvemos el query base (estará disabled)
  if (!isInitialized || !clinicId) {
    return underlyingQuery;
  }

  const cacheKey = ['appointments', 'week', weekKey, clinicId];
  const cachedData = queryClient.getQueryData<WeekAppointmentsResponse>(cacheKey);
  const isFetchingNow = queryClient.isFetching({ queryKey: cacheKey }) > 0;

  // Si ya existe cache y no se está refrescando, sobreescribimos los flags
  if (cachedData && !isFetchingNow) {
    return {
      ...underlyingQuery,
      data: cachedData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    } as any;
  }

  // En cualquier otro caso devolvemos el query base
  return underlyingQuery;
} 