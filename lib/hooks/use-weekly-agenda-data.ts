import { useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useWeekAppointmentsQuery, getWeekKey } from './use-appointments-query';
import { useClinic } from '@/contexts/clinic-context';
import { useQueryClient } from '@tanstack/react-query';

export interface WeeklyAgendaAppointment {
  id: string;
  name: string;
  service: string; // ✅ AÑADIR para compatibilidad con Appointment type
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
  estimatedDurationMinutes?: number;
  [key: string]: any;
}

// ✅ NUEVO: Sistema de cache optimista global
// ✅ SISTEMA DE RENDERIZADO OPTIMISTA INMEDIATO
// Las operaciones se aplican directamente al cache de React Query con setQueryData

/**
 * Hook que reemplaza el fetchAppointments manual de WeeklyAgenda
 * con el nuevo sistema de cache inteligente + renderizado optimista global
 */
export function useWeeklyAgendaData(currentDate: Date) {
  const { activeClinic } = useClinic();
  const queryClient = useQueryClient();
  
  // Generar key de semana desde la fecha actual
  const weekKey = useMemo(() => {
    return getWeekKey(currentDate, 0);
  }, [currentDate]);
  
  // Usar el hook de cache de semana
  const { 
    data: weekData, 
    isLoading, 
    isFetching,
    isError, 
    error,
    refetch 
  } = useWeekAppointmentsQuery(weekKey, activeClinic?.id || null);
  
  // ✅ DEBUG: Ver estados del hook principal - SOLO EN DESARROLLO
  // console.log('[useWeeklyAgendaData] 🔍 ESTADOS QUERY:', {
  //   weekKey,
  //   isLoading,
  //   isFetching,
  //   hasData: !!weekData?.appointments,
  //   appointmentsCount: weekData?.appointments?.length || 0
  // });
  
  // ✅ MEMOIZAR datos estables para evitar re-renders
  const appointmentsData = useMemo(() => weekData?.appointments, [weekData?.appointments]);
  const activeClinicId = useMemo(() => activeClinic?.id, [activeClinic?.id]);
  
  // ✅ APLICAR OPERACIONES OPTIMISTAS AL CACHE - SIN RE-RENDERS EXCESIVOS
  const processedAppointments = useMemo((): WeeklyAgendaAppointment[] => {
    if (!appointmentsData) {
      // console.log('[useWeeklyAgendaData] ⚠️ No hay appointmentsData disponible'); // ✅ REDUCIR LOGS PARA EVITAR SPAM
      return [];
    }
    
    // console.log('[useWeeklyAgendaData] 🔄 Procesando', appointmentsData.length, 'citas desde cache'); // ✅ DEBUG: Comentado para evitar spam en consola
    
    // Obtener zona horaria de la clínica una sola vez
    const clinicTimezone = (activeClinic as any)?.countryInfo?.timezone || 
                          (activeClinic as any)?.country?.timezone || 
                          Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return appointmentsData.map((apt) => {

      
      // ✅ CALCULAR COLOR USANDO LA MISMA LÓGICA DE WEEKLY-AGENDA
      let appointmentColor = '#9CA3AF'; // Color por defecto (gris)
      
      if (apt.services && apt.services.length > 0) {
        const serviceTypes = new Set(apt.services.map((s: any) => s.service?.categoryId));
        const uniqueColors = new Set(apt.services.map((s: any) => s.service?.colorCode).filter(Boolean));
        
        if (serviceTypes.size === 1 && uniqueColors.size === 1) {
          // Todos los servicios del mismo tipo - usar el color del servicio
          const firstColor = Array.from(uniqueColors)[0];
          appointmentColor = (typeof firstColor === 'string' ? firstColor : null) || appointmentColor;
        } else if (apt.equipment?.color) {
          // Múltiples tipos de servicios - usar el color de la cabina
          appointmentColor = apt.equipment.color;
        }
      } else if (apt.equipment?.color) {
        // Sin servicios - usar color de cabina
        appointmentColor = apt.equipment.color;
      }

      // ✅ HELPER PARA PROCESAR TIEMPO
      const processTime = (timeValue: any, fallback: string): string => {
        if ((timeValue as any) instanceof Date) {
          const zonedTime = toZonedTime(timeValue as unknown as Date, clinicTimezone);
          return format(zonedTime, 'HH:mm');
        }
        if (typeof timeValue === 'string') {
          try {
            const utcDate = new Date(timeValue);
            if (!isNaN(utcDate.getTime())) {
              const zonedTime = toZonedTime(utcDate, clinicTimezone);
              return format(zonedTime, 'HH:mm');
            }
            if (/^\d{2}:\d{2}$/.test(timeValue)) {
              return timeValue;
            }
          } catch (e) {
            // Error silencioso
          }
        }
        return fallback;
      };

      // ✅ HELPER PARA PROCESAR FECHA
      const processDate = (dateValue: any, startTimeValue: any): Date => {
        // PRIORIDAD 1: Usar startTime si date es inválido
        if (!dateValue || (dateValue instanceof Date && isNaN((dateValue as Date).getTime()))) {
          if (startTimeValue) {
            try {
              const utcDate = new Date(startTimeValue);
              if (!isNaN(utcDate.getTime())) {
                return toZonedTime(utcDate, clinicTimezone);
              }
            } catch (e) {
              // Error silencioso
            }
          }
        }
        
        // PRIORIDAD 2: Procesar date normal
        if ((dateValue as any) instanceof Date && !isNaN((dateValue as Date).getTime())) {
          return toZonedTime(dateValue as unknown as Date, clinicTimezone);
        }
        
        if (typeof dateValue === 'string') {
          try {
            const utcDate = new Date(dateValue);
            if (!isNaN(utcDate.getTime())) {
              return toZonedTime(utcDate, clinicTimezone);
            }
          } catch (e) {
            // Error silencioso
          }
        }
        
        return new Date(); // Fallback
      };

      // ✅ HELPER PARA PROCESAR DURACIÓN CON ESTIMACIÓN PRECISA Y VALIDACIÓN
      const processDuration = (durationMinutes: any, startTimeValue: any, endTimeValue: any, estimatedDurationMinutes: any): number => {
        // PRIORIDAD 1: Usar durationMinutes si está disponible y es válido
        if (durationMinutes && durationMinutes > 0 && durationMinutes <= 1440) { // ✅ Máximo 24 horas
          return durationMinutes;
        }
        
        // PRIORIDAD 2: Calcular desde startTime/endTime solo si son válidos
        try {
          let startDate: Date;
          let endDate: Date;
          
          if ((startTimeValue as any) instanceof Date) {
            startDate = startTimeValue as unknown as Date;
          } else if (typeof startTimeValue === 'string') {
            startDate = new Date(startTimeValue);
          } else {
            // ✅ PRIORIDAD 3: Usar estimatedDurationMinutes antes del fallback
            return estimatedDurationMinutes && estimatedDurationMinutes > 0 ? estimatedDurationMinutes : 60;
          }
          
          if ((endTimeValue as any) instanceof Date) {
            endDate = endTimeValue as unknown as Date;
          } else if (typeof endTimeValue === 'string') {
            endDate = new Date(endTimeValue);
          } else {
            // ✅ PRIORIDAD 3: Usar estimatedDurationMinutes antes del fallback
            return estimatedDurationMinutes && estimatedDurationMinutes > 0 ? estimatedDurationMinutes : 60;
          }
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const diffMinutes = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60));
            // ✅ VALIDACIÓN: Solo usar si es una duración razonable
            if (diffMinutes > 0 && diffMinutes <= 1440) { // Entre 1 minuto y 24 horas
              return diffMinutes;
            }
          }
        } catch (e) {
          // Error silencioso para evitar spam en consola
        }
        
        // ✅ PRIORIDAD 3: Usar estimatedDurationMinutes de servicios si está disponible
        if (estimatedDurationMinutes && estimatedDurationMinutes > 0) {
          return estimatedDurationMinutes;
        }
        
        // ✅ FALLBACK FINAL: 60 minutos solo si no hay estimación
        return 60;
      };

      // ✅ MAPEAR AL FORMATO ESPERADO CON VALIDACIÓN COMPLETA
      const finalDuration = processDuration(apt.durationMinutes, apt.startTime, apt.endTime, apt.estimatedDurationMinutes);
      
      const processed = {
        id: apt.id,
        name: apt.name || `${apt.person?.firstName || ''} ${apt.person?.lastName || ''}`.trim() || 'Cliente',
        service: apt.services?.map((s: any) => s.service?.name).filter(Boolean).join(", ") || 'Sin servicio',
        startTime: processTime(apt.startTime, '00:00'),
        endTime: processTime(apt.endTime, '01:00'),
        date: processDate(apt.date, apt.startTime),
        duration: finalDuration,
        color: appointmentColor,
        tags: apt.tags?.map((tagRelation: any) => {
          // ✅ VALIDAR que tagRelation existe antes de procesarlo
          if (!tagRelation) return null;
          
          // ✅ MANEJAR AMBOS FORMATOS: string directo o objeto con tagId
          if (typeof tagRelation === 'string') {
            return tagRelation; // Formato GET: ["id1", "id2"]
          }
          return tagRelation.tagId || tagRelation.id || tagRelation; // Formato PUT: [{ tagId: "..." }]
        }).filter(Boolean) || [], // ✅ FILTRAR elementos null/undefined
        services: apt.services || [],
        roomId: apt.roomId || '',
        personId: apt.personId || apt.person?.id || '',
        phone: apt.person?.phone || '',
        estimatedDurationMinutes: apt.estimatedDurationMinutes,
        // ✅ NUEVO: Marcar como datos estables para evitar re-renders visuales
        isDataStable: true // Todas las citas procesadas aquí tienen datos estables
      };
      
      return processed;
    }) as WeeklyAgendaAppointment[];
    
    // console.log('[useWeeklyAgendaData] ✅ Procesamiento completado:', processedAppointments.length, 'citas'); // ✅ DEBUG: Comentado para evitar spam en consola
    

    
    return processedAppointments;
  }, [appointmentsData, activeClinicId]); // ✅ DEPENDENCIAS ESTABLES para evitar re-renders infinitos
  
  // ✅ NUEVO: Estado de estabilización visual para evitar "flash" de citas incorrectas
  const isDataStable = useMemo(() => {
    // Considerar estable si:
    // 1. No está cargando
    // 2. Tiene datos O es una vista vacía válida
    // 3. Todas las citas tienen duraciones válidas (> 0)
    const hasValidData = processedAppointments.length === 0 || 
                        processedAppointments.every(apt => apt.duration > 0 && apt.duration <= 1440);
    
    return !isLoading && hasValidData;
  }, [isLoading, processedAppointments]);

  // ✅ FUNCIÓN DE REFETCH compatible con WeeklyAgenda - MEMOIZADA para evitar re-renders infinitos
  const fetchAppointments = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // ✅ FUNCIÓN DE INVALIDACIÓN compatible con WeeklyAgenda
  const invalidateCache = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['appointments', 'week', weekKey] });
  }, [queryClient, weekKey]);

  // ✅ NUEVO: Funciones de renderizado optimista global
  const addOptimisticAppointment = useCallback((appointment: WeeklyAgendaAppointment) => {
    console.log('[useWeeklyAgendaData] 🚀 RENDERIZADO OPTIMISTA INMEDIATO: Agregando cita', appointment.id);
    
    // ✅ USAR CACHE KEY CONSISTENTE con use-appointments-query.ts
    const clinicId = activeClinic?.id || null;
    const fullCacheKey = ['appointments', 'week', weekKey, clinicId];
    
    // ✅ RENDERIZADO INMEDIATO: Actualizar cache directamente con setQueryData
    queryClient.setQueryData(fullCacheKey, (oldData: any) => {
      if (!oldData) return oldData;
      const newData = {
        ...oldData,
        appointments: [...(oldData.appointments || []), appointment]
      };
      console.log('[useWeeklyAgendaData] ✅ Cache actualizado inmediatamente con nueva cita');
      return newData;
    });
  }, [queryClient, weekKey, activeClinic]);

  const updateOptimisticAppointment = useCallback((appointmentId: string, updates: Partial<WeeklyAgendaAppointment>) => {
    // console.log('[useWeeklyAgendaData] 🚀 RENDERIZADO OPTIMISTA INMEDIATO: Actualizando cita', appointmentId);
    // console.log('[useWeeklyAgendaData] 🔍 Updates recibidas:', { 
    //   appointmentId, 
    //   updateKeys: Object.keys(updates), 
    //   duration: updates.duration,
    //   durationMinutes: (updates as any).durationMinutes, // ✅ AÑADIR CAMPO CORRECTO
    //   endTime: updates.endTime,
    //   service: updates.service,
    //   updates 
    // });
    
    // ✅ USAR CACHE KEY CONSISTENTE con use-appointments-query.ts
    const clinicId = activeClinic?.id || null;
    const fullCacheKey = ['appointments', 'week', weekKey, clinicId];
    // console.log('[useWeeklyAgendaData] 📋 Cache key que se usará:', fullCacheKey);
    
    // ✅ RENDERIZADO INMEDIATO: Actualizar cache directamente con setQueryData
    const result = queryClient.setQueryData(fullCacheKey, (oldData: any) => {
      // console.log('[useWeeklyAgendaData] 🔍 Old data en cache:', oldData ? `${oldData.appointments?.length || 0} citas` : 'null');
      
      if (!oldData) {
        // console.log('[useWeeklyAgendaData] ⚡ CACHE VACÍO - CREANDO CACHE CON CITA OPTIMISTA');
        
        // ✅ CREAR CACHE DESDE CERO con la cita optimista
        const optimisticAppointment = {
          ...updates, // Ya contiene todos los datos de la cita
          id: appointmentId, // Asegurar el ID correcto
        };
        
        // console.log('[useWeeklyAgendaData] ✅ Cita optimista creada:', optimisticAppointment);
        
        return {
          appointments: [optimisticAppointment]
        };
      }
      
      const appointmentFound = oldData.appointments?.find((apt: any) => apt.id === appointmentId);
      // console.log('[useWeeklyAgendaData] 🔍 Cita encontrada en cache:', appointmentFound ? 'SÍ' : 'NO');
      // console.log('[useWeeklyAgendaData] 🔍 IDs en cache actual:', oldData.appointments?.map((apt: any) => apt.id) || []);
      
      const newData = {
        ...oldData,
        appointments: (oldData.appointments || []).map((apt: any) => {
          if (apt.id === appointmentId) {
            const updatedAppointment = { ...apt, ...updates };
            // console.log('[useWeeklyAgendaData] 🔧 Cita después de aplicar updates:', {
            //   oldDuration: apt.duration,
            //   newDuration: updatedAppointment.duration,
            //   oldDurationMinutes: apt.durationMinutes,
            //   newDurationMinutes: (updatedAppointment as any).durationMinutes, // ✅ AÑADIR CAMPO CORRECTO
            //   oldEndTime: apt.endTime,
            //   newEndTime: updatedAppointment.endTime,
            //   oldService: apt.service,
            //   newService: updatedAppointment.service,
            //   appointmentId: apt.id,
            //   updatedAppointment
            // });
            return updatedAppointment;
          }
          return apt;
        })
      };
      // console.log('[useWeeklyAgendaData] ✅ Cache actualizado inmediatamente - nuevas citas:', newData.appointments?.length || 0);
      // console.log('[useWeeklyAgendaData] 🔍 IDs después de actualización:', newData.appointments?.map((apt: any) => apt.id) || []);
      return newData;
    });
    
    // console.log('[useWeeklyAgendaData] 🎯 setQueryData result:', result);
  }, [queryClient, weekKey, activeClinic]);

  const updateOptimisticTags = useCallback((appointmentId: string, tagIds: string[]) => {
    console.log('[useWeeklyAgendaData] 🚀 RENDERIZADO OPTIMISTA INMEDIATO: Actualizando etiquetas', appointmentId, tagIds);
    
    // ✅ USAR CACHE KEY CONSISTENTE con use-appointments-query.ts  
    const clinicId = activeClinic?.id || null;
    const fullCacheKey = ['appointments', 'week', weekKey, clinicId];
    console.log('[useWeeklyAgendaData] 📋 Cache key CONSISTENTE:', fullCacheKey);
    
    // ✅ VERIFICACIÓN SIMPLIFICADA - Solo en caso de problemas
    const currentCacheData = queryClient.getQueryData(fullCacheKey);
    if (!currentCacheData) {
      console.warn('[useWeeklyAgendaData] ⚠️ Cache no encontrado para key:', fullCacheKey);
    }
    
    // ✅ RENDERIZADO INMEDIATO: Actualizar cache directamente con setQueryData
    const result = queryClient.setQueryData(fullCacheKey, (oldData: any) => {
      if (!oldData) {
        console.warn('[useWeeklyAgendaData] ❌ No hay cache para actualizar etiquetas');
        return oldData;
      }
      
      const newData = {
        ...oldData,
        appointments: (oldData.appointments || []).map((apt: any) => 
          apt.id === appointmentId ? { ...apt, tags: tagIds } : apt
        )
      };
      
      console.log('[useWeeklyAgendaData] ✅ Etiquetas actualizadas inmediatamente');
      return newData;
    });
    
    if (!result) {
      console.error('[useWeeklyAgendaData] ❌ Error actualizando etiquetas para:', appointmentId);
    }
  }, [queryClient, weekKey, activeClinic]);

  const deleteOptimisticAppointment = useCallback((appointmentId: string) => {
    console.log('[useWeeklyAgendaData] 🚀 RENDERIZADO OPTIMISTA INMEDIATO: Eliminando cita', appointmentId);
    
    // ✅ USAR CACHE KEY CONSISTENTE con use-appointments-query.ts
    const clinicId = activeClinic?.id || null;
    const fullCacheKey = ['appointments', 'week', weekKey, clinicId];
    
    // ✅ RENDERIZADO INMEDIATO: Actualizar cache directamente con setQueryData
    queryClient.setQueryData(fullCacheKey, (oldData: any) => {
      if (!oldData) return oldData;
      const newData = {
        ...oldData,
        appointments: (oldData.appointments || []).filter((apt: any) => apt.id !== appointmentId)
      };
      console.log('[useWeeklyAgendaData] ✅ Cache actualizado inmediatamente - cita eliminada');
      return newData;
    });
  }, [queryClient, weekKey, activeClinic]);

  const clearOptimisticOperations = useCallback(() => {
    console.log('[useWeeklyAgendaData] 🧹 Limpiando operaciones optimistas y refrescando datos reales');
    // ✅ RENDERIZADO INMEDIATO: Forzar refetch de datos reales
    queryClient.invalidateQueries({ queryKey: ['appointments', 'week'] });
  }, [queryClient]);

  const replaceOptimisticAppointment = useCallback((tempId: string, realAppointment: WeeklyAgendaAppointment) => {
    console.log('[useWeeklyAgendaData] 🔄 REEMPLAZANDO cita optimista con datos reales', tempId, '→', realAppointment.id);
    
    // ✅ USAR CACHE KEY CONSISTENTE con use-appointments-query.ts
    const clinicId = activeClinic?.id || null;
    const fullCacheKey = ['appointments', 'week', weekKey, clinicId];
    
    // ✅ RENDERIZADO INMEDIATO: Reemplazar en cache directamente
    queryClient.setQueryData(fullCacheKey, (oldData: any) => {
      if (!oldData) return oldData;
      const newData = {
        ...oldData,
        appointments: (oldData.appointments || []).map((apt: any) => 
          apt.id === tempId ? realAppointment : apt
        )
      };
      console.log('[useWeeklyAgendaData] ✅ Cache actualizado - cita optimista reemplazada con datos reales');
      return newData;
    });
  }, [queryClient, weekKey, activeClinic]);

  return {
    appointments: processedAppointments,
    isLoading,
    isFetching, // ✅ EXPORTAR TAMBIÉN isFetching
    isError,
    error,
    fetchAppointments,
    invalidateCache,
    weekKey,
    hasData: processedAppointments.length > 0,
    // ✅ NUEVAS FUNCIONES OPTIMISTAS GLOBALES
    addOptimisticAppointment,
    updateOptimisticAppointment, 
    updateOptimisticTags,
    deleteOptimisticAppointment,
    clearOptimisticOperations,
    replaceOptimisticAppointment,
    isDataStable
  };
}

// ✅ Las funciones optimistas están disponibles a través del hook useWeeklyAgendaData

/**
 * Hook para prefetch de semanas adyacentes (sliding window)
 */
export function useWeeklyAgendaPrefetch(currentDate: Date) {
  const { activeClinic } = useClinic();
  
  const currentWeek = getWeekKey(currentDate, 0);
  const prevWeek = getWeekKey(currentDate, -1);
  const nextWeek = getWeekKey(currentDate, +1);
  
  // ✅ PREFETCH AUTOMÁTICO de 3 semanas
  const prevWeekQuery = useWeekAppointmentsQuery(prevWeek, activeClinic?.id || null);
  const currentWeekQuery = useWeekAppointmentsQuery(currentWeek, activeClinic?.id || null);
  const nextWeekQuery = useWeekAppointmentsQuery(nextWeek, activeClinic?.id || null);
  
  // ✅ DEBUG: Ver estados de prefetch - SOLO EN DESARROLLO Y SIN SPAM
  // console.log('[useWeeklyAgendaPrefetch] 🔍 ESTADOS PREFETCH:', {
  //   prevWeek: { isLoading: prevWeekQuery.isLoading, isFetching: prevWeekQuery.isFetching },
  //   currentWeek: { isLoading: currentWeekQuery.isLoading, isFetching: currentWeekQuery.isFetching },
  //   nextWeek: { isLoading: nextWeekQuery.isLoading, isFetching: nextWeekQuery.isFetching }
  // });
  
  return {
    prevWeek: prevWeekQuery,
    currentWeek: currentWeekQuery,
    nextWeek: nextWeekQuery,
    isLoading: prevWeekQuery.isLoading || currentWeekQuery.isLoading || nextWeekQuery.isLoading,
    isFetching: prevWeekQuery.isFetching || currentWeekQuery.isFetching || nextWeekQuery.isFetching, // ✅ AÑADIR isFetching
    allLoaded: !prevWeekQuery.isLoading && !currentWeekQuery.isLoading && !nextWeekQuery.isLoading
  };
} 