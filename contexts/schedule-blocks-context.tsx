"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { useInterfaz } from "./interfaz-Context"
import type { 
    ClinicScheduleBlock,
    ScheduleTemplateBlock,
    CabinScheduleOverride
} from '@prisma/client'
import { toast } from "@/components/ui/use-toast"
import { parseISO, format, isValid, startOfDay } from 'date-fns'

// Define a union type for the blocks this context will handle
export type ScheduleBlockUnion = ClinicScheduleBlock | ScheduleTemplateBlock;

// Interfaz del contexto using the union type
interface ScheduleBlocksContextType {
  blocks: ScheduleBlockUnion[];
  loading: boolean;
  getBlockById: (id: string) => Promise<ScheduleBlockUnion | null>;
  createBlock: (block: Omit<ClinicScheduleBlock, 'id' | 'createdAt' | 'updatedAt'> | Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ScheduleBlockUnion>;
  updateBlock: (id: string, block: Partial<Omit<ClinicScheduleBlock, 'id' | 'createdAt' | 'updatedAt'>> | Partial<Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ScheduleBlockUnion | null>;
  deleteBlock: (id: string) => Promise<boolean>;
  getBlocksByDateRange: (clinicId: string, startDate: string, endDate: string) => Promise<ScheduleBlockUnion[]>;
  refreshBlocks: () => Promise<void>;
  cabinOverrides: CabinScheduleOverride[];
  loadingOverrides: boolean;
  errorOverrides: string | null;
  fetchOverridesByDateRange: (clinicId: string, startDate: string, endDate: string) => Promise<void>;
  createCabinOverride: (overrideData: Omit<CabinScheduleOverride, 'id' | 'createdAt' | 'updatedAt' | 'clinic'>) => Promise<CabinScheduleOverride | null>;
  updateCabinOverride: (id: string, overrideData: Partial<Omit<CabinScheduleOverride, 'id' | 'createdAt' | 'updatedAt' | 'clinic' | 'clinicId'>>) => Promise<CabinScheduleOverride | null>;
  deleteCabinOverride: (id: string) => Promise<boolean>;
}

// Crear el contexto
const ScheduleBlocksContext = createContext<ScheduleBlocksContextType | undefined>(undefined);

// Provider del contexto
export function ScheduleBlocksProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<ScheduleBlockUnion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();

  const [cabinOverrides, setCabinOverrides] = useState<CabinScheduleOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState<boolean>(false);
  const [errorOverrides, setErrorOverrides] = useState<string | null>(null);
  const [lastFetchedRange, setLastFetchedRange] = useState<{ clinicId: string, startDate: string, endDate: string } | null>(null);

  useEffect(() => {
    if (interfaz.initialized && !dataFetched) {
      loadBlocks();
    }
  }, [interfaz.initialized, dataFetched]);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const loadedBlocks = await interfaz.getAllScheduleBlocks();
      setBlocks(loadedBlocks || []);
      setDataFetched(true);
      // console.log("ScheduleBlocksContext: Datos cargados correctamente"); // Log optimizado
    } catch (error) {
      console.error("Error al cargar bloques de agenda:", error);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const getBlockById = async (id: string): Promise<ScheduleBlockUnion | null> => {
    try {
      const localBlock = blocks.find(block => block.id === id);
      if (localBlock) {
        return localBlock;
      }
      
      return await interfaz.getScheduleBlockById(id);
    } catch (error) {
      console.error(`Error al obtener bloque de agenda ${id}:`, error);
      return null;
    }
  };

  const createBlock = async (block: Omit<ClinicScheduleBlock, 'id' | 'createdAt' | 'updatedAt'> | Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleBlockUnion> => {
    console.warn("createBlock in ScheduleBlocksContext needs refactoring to handle specific block types.");
    try {
      const newBlock = await interfaz.createScheduleBlock(block);
      
      setBlocks(prev => [...prev, newBlock]);
      return newBlock;
    } catch (error) {
      console.error("Error al crear bloque de agenda:", error);
      throw error;
    }
  };

  const updateBlock = async (id: string, block: Partial<Omit<ClinicScheduleBlock, 'id' | 'createdAt' | 'updatedAt'>> | Partial<Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ScheduleBlockUnion | null> => {
    console.warn("updateBlock in ScheduleBlocksContext needs refactoring to handle specific block types.");
    try {
      const updatedBlock = await interfaz.updateScheduleBlock(id, block);
      
      if (updatedBlock) {
        setBlocks(prev => prev.map(b => b.id === id ? updatedBlock : b));
        return updatedBlock;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al actualizar bloque de agenda ${id}:`, error);
      return null;
    }
  };

  const deleteBlock = async (id: string): Promise<boolean> => {
    console.warn("deleteBlock in ScheduleBlocksContext needs refactoring to know which block type/table to target.");
    try {
      const success = await interfaz.deleteScheduleBlock(id);
      
      if (success) {
        setBlocks(prev => prev.filter(b => b.id !== id));
      }
      
      return success;
    } catch (error) {
      console.error(`Error al eliminar bloque de agenda ${id}:`, error);
      return false;
    }
  };

  const getBlocksByDateRange = async (clinicId: string, startDate: string, endDate: string): Promise<ScheduleBlockUnion[]> => {
    try {
      const rangeBlocks = await interfaz.getBlocksByDateRange(clinicId, startDate, endDate);
      return rangeBlocks;
    } catch (error) {
      console.error(`Error al obtener bloques para el rango de fechas (${startDate} - ${endDate}):`, error);
      return [];
    }
  };

  const refreshBlocks = async (): Promise<void> => {
    setDataFetched(false);
    if(lastFetchedRange) {
        await fetchOverridesByDateRange(lastFetchedRange.clinicId, lastFetchedRange.startDate, lastFetchedRange.endDate);
    }
  };

  const fetchOverridesByDateRange = useCallback(async (clinicId: string, startDate: string, endDate: string) => {
    // console.log(`[ScheduleBlocksContext] Fetching overrides for clinic ${clinicId} from ${startDate} to ${endDate}`); // Log optimizado
    setLoadingOverrides(true);
    setErrorOverrides(null);
    setLastFetchedRange({ clinicId, startDate, endDate });
    try {
      const apiUrl = `/api/cabin-schedule-overrides?clinicId=${clinicId}&startDate=${startDate}&endDate=${endDate}`;
      // console.log(`[ScheduleBlocksContext] Calling API URL: ${apiUrl}`); // Log optimizado

      const response = await fetch(apiUrl);

      // console.log(`[ScheduleBlocksContext] API Response Status: ${response.status}`); // Log optimizado

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ScheduleBlocksContext] API Error Response Text: ${errorText}`);
        throw new Error(`Error fetching overrides: ${response.statusText || response.status}`);
      }

      const data = await response.json();
      
      // console.log('[ScheduleBlocksContext] Raw data received from API:', data); // Log optimizado

      const overridesWithDates = data.map((override: any) => {
        const startDateLocal = override.startDate && typeof override.startDate === 'string' ? startOfDay(parseISO(override.startDate)) : null;
        const endDateLocal = override.endDate && typeof override.endDate === 'string' ? startOfDay(parseISO(override.endDate)) : null;
        const recurrenceEndDateLocal = override.recurrenceEndDate && typeof override.recurrenceEndDate === 'string' ? startOfDay(parseISO(override.recurrenceEndDate)) : null;
        
        return {
          ...override,
          startDate: startDateLocal,
          endDate: endDateLocal,
          recurrenceEndDate: recurrenceEndDateLocal,
          createdAt: override.createdAt && typeof override.createdAt === 'string' ? parseISO(override.createdAt) : override.createdAt,
          updatedAt: override.updatedAt && typeof override.updatedAt === 'string' ? parseISO(override.updatedAt) : override.updatedAt,
        }
      });

      // >>> NUEVO LOG: Mostrar datos procesados al cargar <<<
      // console.log('>>> FETCHED Overrides:', JSON.stringify(overridesWithDates, null, 2)); // Log optimizado

      setCabinOverrides(overridesWithDates);
      // console.log('[ScheduleBlocksContext] Overrides fetched and parsed successfully:', overridesWithDates); // Log original

    } catch (error: any) {
      console.error("[ScheduleBlocksContext] Error in fetchOverridesByDateRange:", error);
      setErrorOverrides(error.message);
      setCabinOverrides([]);
      toast({ title: "Error", description: "No se pudieron cargar los bloqueos de horario.", variant: "destructive" });
    } finally {
      setLoadingOverrides(false);
    }
  }, []);

  const createCabinOverride = useCallback(async (overrideData: Omit<CabinScheduleOverride, 'id' | 'createdAt' | 'updatedAt' | 'clinic'>): Promise<CabinScheduleOverride | null> => {
    console.log("[ScheduleBlocksContext] Creating cabin override:", overrideData);
    setLoadingOverrides(true);
    try {
      const payload = {
          ...overrideData,
          startDate: format(overrideData.startDate, 'yyyy-MM-dd'),
          endDate: overrideData.endDate ? format(overrideData.endDate, 'yyyy-MM-dd') : undefined,
          recurrenceEndDate: overrideData.recurrenceEndDate ? format(overrideData.recurrenceEndDate, 'yyyy-MM-dd') : undefined,
      };

      const response = await fetch('/api/cabin-schedule-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error creating override:", errorData);
        toast({ title: "Error al crear bloqueo", description: errorData.message || JSON.stringify(errorData.errors), variant: "destructive" });
        return null;
      }

      const newOverride: CabinScheduleOverride = await response.json();
      
      // REVERTIR/MODIFICAR: Normalizar a inicio del día LOCAL
      const startDateLocal = newOverride.startDate ? startOfDay(parseISO(newOverride.startDate as any)) : null;
      const endDateLocal = newOverride.endDate ? startOfDay(parseISO(newOverride.endDate as any)) : null;
      const recurrenceEndDateLocal = newOverride.recurrenceEndDate ? startOfDay(parseISO(newOverride.recurrenceEndDate as any)) : null;

      const newOverrideWithDates = {
        ...newOverride,
        startDate: startDateLocal,
        endDate: endDateLocal,
        recurrenceEndDate: recurrenceEndDateLocal,
        // Mantener createdAt/updatedAt como ISO si se necesitan con hora exacta
        createdAt: newOverride.createdAt ? parseISO(newOverride.createdAt as any) : null,
        updatedAt: newOverride.updatedAt ? parseISO(newOverride.updatedAt as any) : null,
      };

      setCabinOverrides(prev => [...prev, newOverrideWithDates]);
      toast({ title: "Éxito", description: "Bloqueo de horario creado correctamente." });
      return newOverrideWithDates;

    } catch (error) {
      console.error("Error creating cabin schedule override (catch):", error);
      toast({ title: "Error", description: "Ocurrió un problema al crear el bloqueo.", variant: "destructive" });
      return null;
    } finally {
      setLoadingOverrides(false);
    }
  }, []);

  const updateCabinOverride = useCallback(async (id: string, overrideData: Partial<Omit<CabinScheduleOverride, 'id' | 'createdAt' | 'updatedAt' | 'clinic' | 'clinicId'>>): Promise<CabinScheduleOverride | null> => {
    console.log(`[ScheduleBlocksContext] Updating cabin override ${id} with data:`, overrideData);
    setLoadingOverrides(true);
    try {
      const payload: Record<string, any> = { ...overrideData };

      if (payload.startDate && payload.startDate instanceof Date) {
         payload.startDate = format(payload.startDate, 'yyyy-MM-dd');
      } else if (typeof payload.startDate === 'string' && !isValid(parseISO(payload.startDate))) {
         console.warn('Invalid startDate string format, skipping conversion', payload.startDate);
      }
       
       if (payload.endDate && payload.endDate instanceof Date) {
         payload.endDate = format(payload.endDate, 'yyyy-MM-dd');
      } else if (typeof payload.endDate === 'string' && !isValid(parseISO(payload.endDate))) {
         console.warn('Invalid endDate string format, skipping conversion', payload.endDate);
      } else if (payload.hasOwnProperty('endDate') && payload.endDate === null) {
          payload.endDate = null; 
      }

      if (payload.recurrenceEndDate && payload.recurrenceEndDate instanceof Date) {
        payload.recurrenceEndDate = format(payload.recurrenceEndDate, 'yyyy-MM-dd');
      } else if (typeof payload.recurrenceEndDate === 'string' && !isValid(parseISO(payload.recurrenceEndDate))) {
          console.warn('Invalid recurrenceEndDate string format, skipping conversion', payload.recurrenceEndDate);
      } else if (payload.hasOwnProperty('recurrenceEndDate') && payload.recurrenceEndDate === null) {
          payload.recurrenceEndDate = null; 
      }

      // <<< LIMPIANDO LOGS DE DEBUG >>>
      // console.log(`[ScheduleBlocksContext] Sending stringified date payload to API:`, payload);
      // console.log('[ScheduleBlocksContext] Final payload being sent to PUT API:', JSON.stringify(payload, null, 2));

      const response = await fetch(`/api/cabin-schedule-overrides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // >>> Log movido a fetchOverridesByDateRange

      if (!response.ok) {
         let errorData: any = {};
         try {
             // Primero intentar obtener JSON, que es el formato esperado por la API en caso de error Zod
             errorData = await response.json();
         } catch (e) {
             // Si falla el JSON (ej. cuerpo vacío o texto plano), intentar obtener texto
             console.warn("[ScheduleBlocksContext] Failed to parse error response as JSON, attempting text.");
             try {
                 const errorText = await response.text();
                 // Construir un objeto de error consistente
                 errorData = { message: errorText || `Error ${response.status} - Respuesta no JSON`, errors: null }; 
             } catch (textError) {
                 // Si incluso obtener texto falla, usar un mensaje genérico
                 console.error("[ScheduleBlocksContext] Failed to get error response text.", textError);
                 errorData = { message: `Error ${response.status} - No se pudo leer la respuesta`, errors: null };
             }
         }
         // Asegurarse de que errorData siempre tenga al menos un message
         errorData.message = errorData.message || JSON.stringify(errorData.errors) || `Error ${response.status} - Respuesta desconocida`;

         console.error(`API Error updating override ${id}:`, errorData); // Loguear el objeto errorData completo
         toast({ title: "Error al actualizar bloqueo", description: errorData.message, variant: "destructive" });
         return null;
      }
       const updatedOverride: CabinScheduleOverride = await response.json();
       
       // REVERTIR/MODIFICAR: Normalizar a inicio del día LOCAL
       const startDateLocal = updatedOverride.startDate ? startOfDay(parseISO(updatedOverride.startDate as any)) : null;
       const endDateLocal = updatedOverride.endDate ? startOfDay(parseISO(updatedOverride.endDate as any)) : null;
       const recurrenceEndDateLocal = updatedOverride.recurrenceEndDate ? startOfDay(parseISO(updatedOverride.recurrenceEndDate as any)) : null;

       const updatedOverrideWithDates = {
          ...updatedOverride,
          startDate: startDateLocal,
          endDate: endDateLocal,
          recurrenceEndDate: recurrenceEndDateLocal,
          createdAt: updatedOverride.createdAt ? parseISO(updatedOverride.createdAt as any) : null,
          updatedAt: updatedOverride.updatedAt ? parseISO(updatedOverride.updatedAt as any) : null,
       };
       setCabinOverrides(prev => prev.map(ov => ov.id === id ? updatedOverrideWithDates : ov));
       toast({ title: "Éxito", description: "Bloqueo de horario actualizado." });
       return updatedOverrideWithDates;

    } catch (error) { 
      console.error(`Error updating cabin schedule override ${id} (catch):`, error);
      toast({ title: "Error", description: "Ocurrió un problema al actualizar el bloqueo.", variant: "destructive" });
      return null; 
    }
    finally { setLoadingOverrides(false); }
  }, []);

  const deleteCabinOverride = useCallback(async (id: string): Promise<boolean> => {
    console.log(`[ScheduleBlocksContext] Deleting cabin override ${id}`);
    setLoadingOverrides(true);
    try {
      const response = await fetch(`/api/cabin-schedule-overrides/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
         if (response.status === 204) {
         } else {
            const errorData = await response.json().catch(() => ({ message: `Error ${response.status}` }));
            console.error(`API Error deleting override ${id}:`, errorData);
            toast({ title: "Error al eliminar bloqueo", description: errorData.message || `Error ${response.status}`, variant: "destructive" });
            return false;
         }
      }

      setCabinOverrides(prev => prev.filter(ov => ov.id !== id));
      toast({ title: "Éxito", description: "Bloqueo de horario eliminado." });
      return true;

    } catch (error) {
      console.error(`Error deleting cabin schedule override ${id} (catch):`, error);
      toast({ title: "Error", description: "Ocurrió un problema al eliminar el bloqueo.", variant: "destructive" });
      return false;
    } finally {
      setLoadingOverrides(false);
    }
  }, []);

  return (
    <ScheduleBlocksContext.Provider value={{
      blocks,
      loading,
      getBlockById,
      createBlock,
      updateBlock,
      deleteBlock,
      getBlocksByDateRange,
      refreshBlocks,
      cabinOverrides,
      loadingOverrides,
      errorOverrides,
      fetchOverridesByDateRange,
      createCabinOverride,
      updateCabinOverride,
      deleteCabinOverride,
    }}>
      {children}
    </ScheduleBlocksContext.Provider>
  );
}

// Hook para acceder al contexto
export function useScheduleBlocks() {
  const context = useContext(ScheduleBlocksContext);
  if (context === undefined) {
    throw new Error('useScheduleBlocks debe ser usado dentro de un ScheduleBlocksProvider');
  }
  return context;
}
