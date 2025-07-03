/**
 * ✅ PÁGINA DE AGENDA SEMANAL CON NAVEGACIÓN FLUIDA Y CACHE OPTIMIZADO
 * 
 * ARQUITECTURA COMPLETA DEL SISTEMA:
 * ==================================
 * 
 * 🎯 **PROPÓSITO**: Vista semanal de citas con navegación instantánea y prefetching inteligente
 * 
 * 🚀 **PRE-FETCHING Y CACHE INTELIGENTE**:
 * - Sliding window de 3 semanas (anterior, actual, siguiente)
 * - Datos pre-cargados al cambiar clínica activa
 * - Navegación entre fechas SIN loading states cuando hay cache
 * - Cache persistente durante sesión del usuario
 * 
 * 🔧 **INTEGRACIÓN CON PRISMA**:
 * - SIEMPRE usar: import { prisma } from '@/lib/db';
 * - Datos de citas con includes optimizados
 * 
 * 💾 **HOOKS UTILIZADOS**:
 * - useWeeklyAgendaData(): Cache inteligente + funciones optimistas
 * - useWeeklyAgendaPrefetch(): Pre-carga de semanas adyacentes
 * - useClinic(): Clínica activa + cabinas disponibles
 * 
 * 🔄 **RENDERIZACIÓN OPTIMISTA**:
 * - Cambios visibles INMEDIATAMENTE sin esperar API
 * - Cache actualizado con setQueryData()
 * - Operaciones CRUD sin spinners ni delays
 * 
 * ⚡ **NAVEGACIÓN FLUIDA**:
 * - Solo mostrar loading en carga inicial (sin cache)
 * - Navegación entre fechas instantánea
 * - Prefetch automático de semanas adyacentes
 * 
 * ⚠️ REGLAS CRÍTICAS PARA MODIFICACIONES:
 * 1. NO mostrar spinner si hay datos en cache
 * 2. MANTENER el sliding window cache funcionando
 * 3. PRESERVAR funcionalidad de navegación fluida
 * 4. NO romper el sistema de renderizado optimista
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { parse, format, isSameWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { AgendaLayout } from "@/components/agenda/agenda-layout"; 
import ResponsiveAgendaView from "@/components/responsive-agenda-view";
import { Loader2 } from 'lucide-react';
import { useWeeklyAgendaData } from '@/lib/hooks/use-weekly-agenda-data';
import { useClinic } from '@/contexts/clinic-context';

// Tipar correctamente los params
interface WeeklyAgendaPageProps {
  params: Promise<{ date: string }> | { date: string };
}

export default function WeeklyAgendaPage({ params: paramsProp }: WeeklyAgendaPageProps) {
  const router = useRouter();
  const { activeClinic } = useClinic();
  
  // ✅ RESOLUCIÓN OPTIMIZADA: Intentar resolver params sincrónicamente primero
  const [dateParam, setDateParam] = useState<string | null>(() => {
    // Si params no es una Promise, resolverlo inmediatamente
    if (paramsProp && typeof paramsProp === 'object' && !('then' in paramsProp)) {
      return paramsProp.date;
    }
    return null;
  });
  
  const [currentDate, setCurrentDate] = useState<Date | null>(() => {
    // Si tenemos dateParam inmediatamente, parsear la fecha
    if (paramsProp && typeof paramsProp === 'object' && !('then' in paramsProp)) {
      try {
        return parse(paramsProp.date, "yyyy-MM-dd", new Date());
      } catch (error) {
        console.error("Error parsing date in WeeklyAgendaPage:", error);
        return null;
      }
    }
    return null;
  });
  
  // ✅ LOADING STATE OPTIMIZADO: Solo true si realmente necesitamos resolver una Promise
  const [isLoadingParams, setIsLoadingParams] = useState(() => {
    return !!(paramsProp && typeof paramsProp === 'object' && 'then' in paramsProp);
  });

  // ✅ useEffect SOLO para casos asincrónicos (Promise params)
  useEffect(() => {
    // Solo ejecutar si params es una Promise Y aún no tenemos datos
    if (paramsProp && typeof paramsProp === 'object' && 'then' in paramsProp && !dateParam) {
      const loadParams = async () => {
        try {
          const resolvedParams = await paramsProp;
          setDateParam(resolvedParams.date);
          
          const parsedDate = parse(resolvedParams.date, "yyyy-MM-dd", new Date());
          setCurrentDate(parsedDate);
        } catch (error) {
          console.error("Error loading async params in WeeklyAgendaPage:", error);
        } finally {
          setIsLoadingParams(false);
        }
      };

      loadParams();
    }
  }, [paramsProp, dateParam]);

  // ✅ USAR CACHE HOOK PARA DETECTAR SI HAY DATOS DISPONIBLES
  const { 
    isLoading: isCacheLoading, 
    appointments: cachedAppointments 
  } = useWeeklyAgendaData(currentDate || new Date());

  // ✅ LÓGICA OPTIMIZADA: Solo mostrar loading si realmente no hay datos útiles para la semana actual
  const shouldShowLoading = useMemo(() => {
    // 1. Si aún estamos resolviendo params asincrónicos
    if (isLoadingParams || !currentDate || !dateParam) {
      return true;
    }
    
    // 2. Si no hay clínica activa
    if (!activeClinic) {
      return true;
    }
    
    // 3. ✅ NUEVA LÓGICA: Verificar si hay datos específicos para la semana actual
    const hasDataForCurrentWeek = cachedAppointments && cachedAppointments.some(apt => {
      return apt.date && isSameWeek(apt.date, currentDate, { weekStartsOn: 1 });
    });
    
    // Solo mostrar loading si está cargando Y no hay datos específicos para la semana actual
    if (isCacheLoading && !hasDataForCurrentWeek) {
      console.log('[WeeklyAgendaPage] 🔄 Mostrando loading: cache cargando y sin datos para semana actual');
      return true;
    }
    
    // ✅ Si hay datos para la semana actual, NO mostrar loading aunque el cache esté refrescando
    if (hasDataForCurrentWeek) {
      console.log('[WeeklyAgendaPage] ✅ Datos disponibles para semana actual - NO mostrar loading');
      return false;
    }
    
    // ✅ En todos los demás casos, mostrar la vista (puede tener datos en cache o vista vacía)
    return false;
  }, [isLoadingParams, currentDate, dateParam, activeClinic, isCacheLoading, cachedAppointments]);

  // Handler para cambios de fecha desde AgendaNavBar
  const handleDateChange = useCallback((newDate: Date) => {
    if (!newDate || isNaN(newDate.getTime())) return;
    const formattedDate = format(newDate, "yyyy-MM-dd");
    // Actualizar estado local inmediatamente para UI
    setCurrentDate(newDate);
    // Navegar a la nueva URL
    router.push(`/agenda/semana/${formattedDate}`);
  }, [router]);

  // Handler para cambios de vista desde AgendaNavBar
  const handleViewChange = useCallback((newView: 'day' | 'week', date?: Date) => {
    const dateToUse = date || currentDate;
    if (!dateToUse || isNaN(dateToUse.getTime())) return; 

    const formattedDate = format(dateToUse, "yyyy-MM-dd");
    if (newView === 'day') {
      router.push(`/agenda/dia/${formattedDate}`);
    } else if (date && date.getTime() !== currentDate?.getTime()) {
      // Si ya estamos en semana pero la fecha cambió (ej, desde DatePicker)
      handleDateChange(date);
    }
  }, [router, currentDate, handleDateChange]);

  // ✅ MOSTRAR LOADING SOLO CUANDO REALMENTE ES NECESARIO
  if (shouldShowLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin"/>
          <span>
            {isLoadingParams ? 'Cargando parámetros...' :
             !activeClinic ? 'Cargando clínica...' :
             'Cargando agenda semanal...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    // Envolver con AgendaLayout
    <AgendaLayout
      title="Agenda Semanal"
      date={currentDate!}
      view="week"
      onDateChange={handleDateChange}
      onViewChange={handleViewChange}
    >
      {/* ResponsiveAgendaView recibe la fecha original como string */}
      <ResponsiveAgendaView 
        date={dateParam!}
        initialView="week" 
      />
    </AgendaLayout>
  );
}

