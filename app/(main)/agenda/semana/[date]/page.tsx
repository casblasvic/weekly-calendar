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
import { parse, format } from 'date-fns';
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
  
  // Estados para manejar la carga y la fecha
  const [isLoadingParams, setIsLoadingParams] = useState(true);
  const [dateParam, setDateParam] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // Efecto para manejar los params (ya sean Promise o no)
  useEffect(() => {
    const loadParams = async () => {
      try {
        // Si paramsProp es una promesa, la resolvemos
        const resolvedParams = 'then' in paramsProp ? await paramsProp : paramsProp;
        setDateParam(resolvedParams.date);
        
        // Parsear la fecha
        const parsedDate = parse(resolvedParams.date, "yyyy-MM-dd", new Date());
        setCurrentDate(parsedDate);
      } catch (error) {
        console.error("Error loading params in WeeklyAgendaPage:", error);
      } finally {
        setIsLoadingParams(false);
      }
    };

    loadParams();
  }, [paramsProp]);

  // ✅ USAR CACHE HOOK PARA DETECTAR SI HAY DATOS DISPONIBLES
  const { 
    isLoading: isCacheLoading, 
    appointments: cachedAppointments 
  } = useWeeklyAgendaData(currentDate || new Date());

  // ✅ LÓGICA OPTIMIZADA: Solo mostrar loading si realmente no hay datos
  const shouldShowLoading = useMemo(() => {
    // 1. Si aún estamos cargando los params de la URL
    if (isLoadingParams || !currentDate || !dateParam) {
      return true;
    }
    
    // 2. Si no hay clínica activa
    if (!activeClinic) {
      return true;
    }
    
    // 3. Solo mostrar loading si el cache está cargando Y no hay datos previos
    if (isCacheLoading && (!cachedAppointments || cachedAppointments.length === 0)) {
      return true;
    }
    
    // ✅ En todos los demás casos, mostrar la vista (puede tener datos en cache)
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
             'Cargando agenda...'}
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

