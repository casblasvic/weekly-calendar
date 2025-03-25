"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useInterfaz } from "./interfaz-Context"
import { ScheduleBlock as ScheduleBlockModel } from "@/services/data/models/interfaces"

// Definir alias para los tipos usando los tipos del modelo central
export type ScheduleBlock = ScheduleBlockModel;

// Interfaz del contexto
interface ScheduleBlocksContextType {
  blocks: ScheduleBlock[];
  loading: boolean;
  getBlockById: (id: string) => Promise<ScheduleBlock | null>;
  createBlock: (block: Omit<ScheduleBlock, 'id' | 'createdAt'>) => Promise<ScheduleBlock>;
  updateBlock: (id: string, block: Partial<ScheduleBlock>) => Promise<ScheduleBlock | null>;
  deleteBlock: (id: string) => Promise<boolean>;
  getBlocksByDateRange: (clinicId: string, startDate: string, endDate: string) => Promise<ScheduleBlock[]>;
  refreshBlocks: () => Promise<void>;
}

// Crear el contexto
const ScheduleBlocksContext = createContext<ScheduleBlocksContextType | undefined>(undefined);

// Provider del contexto
export function ScheduleBlocksProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();

  // Cargar bloques de agenda al iniciar
  useEffect(() => {
    if (interfaz.initialized && !dataFetched) {
      loadBlocks();
    }
  }, [interfaz.initialized, dataFetched]);

  // Función para cargar todos los bloques
  const loadBlocks = async () => {
    try {
      setLoading(true);
      const loadedBlocks = await interfaz.getAllScheduleBlocks();
      setBlocks(loadedBlocks || []);
      setDataFetched(true);
      console.log("ScheduleBlocksContext: Datos cargados correctamente");
    } catch (error) {
      console.error("Error al cargar bloques de agenda:", error);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener un bloque por ID
  const getBlockById = async (id: string): Promise<ScheduleBlock | null> => {
    try {
      // Intentar buscar en el estado local primero para mejor rendimiento
      const localBlock = blocks.find(block => block.id === id);
      if (localBlock) {
        return localBlock;
      }
      
      // Si no está en el estado local, solicitarlo a través de la interfaz
      return await interfaz.getScheduleBlockById(id);
    } catch (error) {
      console.error(`Error al obtener bloque de agenda ${id}:`, error);
      return null;
    }
  };

  // Crear un nuevo bloque
  const createBlock = async (block: Omit<ScheduleBlock, 'id' | 'createdAt'>): Promise<ScheduleBlock> => {
    try {
      const newBlock = await interfaz.createScheduleBlock({
        ...block,
        createdAt: new Date().toISOString()
      });
      
      // Actualizar el estado local
      setBlocks(prev => [...prev, newBlock]);
      return newBlock;
    } catch (error) {
      console.error("Error al crear bloque de agenda:", error);
      throw error;
    }
  };

  // Actualizar un bloque existente
  const updateBlock = async (id: string, block: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> => {
    try {
      const updatedBlock = await interfaz.updateScheduleBlock(id, block);
      
      if (updatedBlock) {
        // Actualizar el estado local
        setBlocks(prev => prev.map(b => b.id === id ? updatedBlock : b));
        return updatedBlock;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al actualizar bloque de agenda ${id}:`, error);
      return null;
    }
  };

  // Eliminar un bloque
  const deleteBlock = async (id: string): Promise<boolean> => {
    try {
      const success = await interfaz.deleteScheduleBlock(id);
      
      if (success) {
        // Actualizar el estado local
        setBlocks(prev => prev.filter(b => b.id !== id));
      }
      
      return success;
    } catch (error) {
      console.error(`Error al eliminar bloque de agenda ${id}:`, error);
      return false;
    }
  };

  // Obtener bloques por rango de fechas
  const getBlocksByDateRange = async (clinicId: string, startDate: string, endDate: string): Promise<ScheduleBlock[]> => {
    try {
      const rangeBlocks = await interfaz.getBlocksByDateRange(clinicId, startDate, endDate);
      return rangeBlocks;
    } catch (error) {
      console.error(`Error al obtener bloques para el rango de fechas (${startDate} - ${endDate}):`, error);
      return [];
    }
  };

  // Actualizar lista de bloques
  const refreshBlocks = async (): Promise<void> => {
    setDataFetched(false); // Esto forzará la recarga en el useEffect
  };

  return (
    <ScheduleBlocksContext.Provider value={{
      blocks,
      loading,
      getBlockById,
      createBlock,
      updateBlock,
      deleteBlock,
      getBlocksByDateRange,
      refreshBlocks
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
