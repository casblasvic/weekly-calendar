/**
 * 🔍 HOOK DE DIAGNÓSTICO DE AGENDA
 * 
 * Este hook permite verificar el estado de los datos en cada paso del pipeline
 * para identificar dónde se pierden las citas en el sistema.
 * 
 * Pipeline de datos:
 * 1. API → IndexedDB (persistencia)
 * 2. IndexedDB → React Query (restauración)
 * 3. React Query → WeeklyAgenda (consumo)
 * 4. WeeklyAgenda → Renderizado (visualización)
 * 
 * @see docs/AGENDA_PERFORMANCE_OPTIMIZATION.md
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface DiagnosticData {
  source: 'API' | 'IndexedDB' | 'React Query';
  queryKey: string;
  count: number;
  appointmentIds: string[];
  timestamp: string;
}

export function useAgendaDiagnostics(date: Date, clinicId: string | undefined) {
  const queryClient = useQueryClient();
  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [isEnabled, setIsEnabled] = useState(() => {
    return process.env.NODE_ENV === 'development' && 
           typeof window !== 'undefined' && 
           window.localStorage.getItem('agenda-diagnostics') === 'true';
  });

  // Función para extraer IDs de citas de diferentes formatos de datos
  const extractAppointmentIds = useCallback((data: any): string[] => {
    if (!data) return [];
    
    // Si es un array de citas directamente
    if (Array.isArray(data)) {
      return data.map(apt => apt.id || apt.appointmentId).filter(Boolean);
    }
    
    // Si es un objeto con propiedad data
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(apt => apt.id || apt.appointmentId).filter(Boolean);
    }
    
    // Si es un objeto con citas en alguna propiedad
    if (data.appointments && Array.isArray(data.appointments)) {
      return data.appointments.map(apt => apt.id || apt.appointmentId).filter(Boolean);
    }
    
    return [];
  }, []);

  // Función para obtener datos de IndexedDB
  const getIndexedDBData = useCallback(async (): Promise<DiagnosticData[]> => {
    if (typeof window === 'undefined') return [];
    
    try {
      const { openDB } = await import('idb');
      const db = await openDB('rq_cache', 1);
      const raw = await db.get('queries', 'react-query');
      
      if (!raw) return [];
      
      const parsed = JSON.parse(raw);
      const queries = parsed?.clientState?.queries || {};
      const results: DiagnosticData[] = [];
      
      // Buscar queries relacionadas con citas
      Object.entries(queries).forEach(([key, query]: [string, any]) => {
        const queryKey = query.queryKey;
        if (queryKey && Array.isArray(queryKey)) {
          const keyStr = JSON.stringify(queryKey);
          
          // Filtrar solo queries relevantes para la agenda
          if (keyStr.includes('appointments') || keyStr.includes('cabins') || keyStr.includes('services')) {
            const data = query.state?.data;
            const appointmentIds = extractAppointmentIds(data);
            
            results.push({
              source: 'IndexedDB',
              queryKey: keyStr,
              count: appointmentIds.length,
              appointmentIds,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error('[AgendaDiagnostics] Error accessing IndexedDB:', error);
      return [];
    }
  }, [extractAppointmentIds]);

  // Función para obtener datos de React Query
  const getReactQueryData = useCallback((): DiagnosticData[] => {
    if (!clinicId) return [];
    
    const results: DiagnosticData[] = [];
    const queryCache = queryClient.getQueryCache();
    
    queryCache.getAll().forEach(query => {
      const queryKey = query.queryKey;
      if (queryKey && Array.isArray(queryKey)) {
        const keyStr = JSON.stringify(queryKey);
        
        // Filtrar solo queries relevantes para la agenda
        if (keyStr.includes('appointments') || keyStr.includes('cabins') || keyStr.includes('services')) {
          const data = query.state?.data;
          const appointmentIds = extractAppointmentIds(data);
          
          results.push({
            source: 'React Query',
            queryKey: keyStr,
            count: appointmentIds.length,
            appointmentIds,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    return results;
  }, [queryClient, clinicId, extractAppointmentIds]);

  // Función para ejecutar diagnóstico completo
  const runDiagnostics = useCallback(async () => {
    if (!isEnabled || !clinicId) return;
    
    console.log('\n🔍 [AGENDA DIAGNOSTICS] Ejecutando diagnóstico completo...');
    
    try {
      // Obtener datos de IndexedDB
      const indexedDBData = await getIndexedDBData();
      
      // Obtener datos de React Query
      const reactQueryData = getReactQueryData();
      
      // Combinar y mostrar resultados
      const allDiagnostics = [...indexedDBData, ...reactQueryData];
      setDiagnostics(allDiagnostics);
      
      // Mostrar resumen en consola
      console.log('\n📊 [AGENDA DIAGNOSTICS] Resumen de datos:');
      console.log('===============================================');
      
      // Agrupar por fuente
      const bySource = allDiagnostics.reduce((acc, item) => {
        if (!acc[item.source]) acc[item.source] = [];
        acc[item.source].push(item);
        return acc;
      }, {} as Record<string, DiagnosticData[]>);
      
      Object.entries(bySource).forEach(([source, items]) => {
        console.log(`\n🗄️ ${source}:`);
        items.forEach(item => {
          console.log(`  ${item.queryKey}: ${item.count} items`);
          if (item.appointmentIds.length > 0) {
            console.log(`    IDs: ${item.appointmentIds.slice(0, 5).join(', ')}${item.appointmentIds.length > 5 ? '...' : ''}`);
          }
        });
      });
      
      // Detectar inconsistencias
      const appointmentQueries = allDiagnostics.filter(item => 
        item.queryKey.includes('appointments') && item.queryKey.includes(clinicId)
      );
      
      if (appointmentQueries.length > 1) {
        console.log('\n⚠️ [AGENDA DIAGNOSTICS] Detectadas posibles inconsistencias:');
        appointmentQueries.forEach(query => {
          console.log(`  ${query.source}: ${query.count} citas`);
        });
        
        // Comparar IDs entre fuentes
        const allIds = new Set<string>();
        appointmentQueries.forEach(query => {
          query.appointmentIds.forEach(id => allIds.add(id));
        });
        
        console.log(`\n📋 [AGENDA DIAGNOSTICS] Total de IDs únicos encontrados: ${allIds.size}`);
        console.log(`📋 [AGENDA DIAGNOSTICS] IDs: ${Array.from(allIds).slice(0, 10).join(', ')}${allIds.size > 10 ? '...' : ''}`);
      }
      
      console.log('\n===============================================\n');
      
    } catch (error) {
      console.error('[AGENDA DIAGNOSTICS] Error en diagnóstico:', error);
    }
  }, [isEnabled, clinicId, getIndexedDBData, getReactQueryData]);

  // Función para limpiar IndexedDB
  const clearIndexedDB = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('🗑️ [AGENDA DIAGNOSTICS] Limpiando IndexedDB...');
      await indexedDB.deleteDatabase('rq_cache');
      
      // Limpiar también React Query cache
      queryClient.clear();
      
      console.log('✅ [AGENDA DIAGNOSTICS] IndexedDB limpiado exitosamente');
      
      // Recargar página para empezar desde cero
      if (window.confirm('IndexedDB limpiado. ¿Recargar página para empezar desde cero?')) {
        window.location.reload();
      }
    } catch (error) {
      console.error('[AGENDA DIAGNOSTICS] Error limpiando IndexedDB:', error);
    }
  }, [queryClient]);

  // Función para habilitar/deshabilitar diagnósticos
  const toggleDiagnostics = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('agenda-diagnostics', enabled.toString());
    }
    
    if (enabled) {
      console.log('🔍 [AGENDA DIAGNOSTICS] Diagnósticos habilitados');
      runDiagnostics();
    } else {
      console.log('🔍 [AGENDA DIAGNOSTICS] Diagnósticos deshabilitados');
    }
  }, [runDiagnostics]);

  // Exponer funciones globalmente en development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).agendaDiagnostics = {
        run: runDiagnostics,
        clear: clearIndexedDB,
        toggle: toggleDiagnostics,
        isEnabled
      };
      
      console.log('🔧 [AGENDA DIAGNOSTICS] Comandos disponibles en window.agendaDiagnostics:');
      console.log('  - run(): Ejecutar diagnóstico completo');
      console.log('  - clear(): Limpiar IndexedDB y React Query cache');
      console.log('  - toggle(true/false): Habilitar/deshabilitar diagnósticos');
    }
  }, [runDiagnostics, clearIndexedDB, toggleDiagnostics, isEnabled]);

  // Ejecutar diagnóstico automáticamente cuando cambie la fecha o clínica
  useEffect(() => {
    if (isEnabled && clinicId) {
      const timer = setTimeout(runDiagnostics, 1000); // Delay para permitir carga de datos
      return () => clearTimeout(timer);
    }
  }, [isEnabled, clinicId, date, runDiagnostics]);

  return {
    diagnostics,
    isEnabled,
    runDiagnostics,
    clearIndexedDB,
    toggleDiagnostics
  };
} 