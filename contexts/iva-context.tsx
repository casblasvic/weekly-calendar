"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useInterfaz } from "./interfaz-Context"
import type { VATType } from "@prisma/client"

interface IVAContextType {
  tiposIVA: VATType[];
  addTipoIVA: (tipoIVA: Omit<VATType, "id" | "systemId" | "createdAt" | "updatedAt">) => Promise<string>;
  updateTipoIVA: (id: string, tipoIVA: Partial<VATType>) => Promise<void>;
  deleteTipoIVA: (id: string) => Promise<void>;
  getTiposIVAByTarifaId: (tarifaId: string) => Promise<VATType[]>;
}

const IVAContext = createContext<IVAContextType | undefined>(undefined);

export const IVAProvider = ({ children }: { children: ReactNode }) => {
  const [tiposIVA, setTiposIVA] = useState<VATType[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();

  // Cargar datos iniciales utilizando la interfaz
  useEffect(() => {
    const fetchIVAs = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          const data = await interfaz.getAllTiposIVA();
          setTiposIVA(data as any || []);
          setDataFetched(true);
        } catch (error) {
          console.error("Error al cargar tipos de IVA:", error);
          setTiposIVA([]);
        }
      }
    };
    
    fetchIVAs();
  }, [interfaz.initialized, dataFetched]);

  // Funciones para gestionar tipos de IVA
  const addTipoIVA = async (tipoIVA: Omit<VATType, "id" | "systemId" | "createdAt" | "updatedAt">) => {
    try {
      const nuevoTipoIVA = await interfaz.createTipoIVA(tipoIVA as any);
      if (nuevoTipoIVA && nuevoTipoIVA.id) {
        setTiposIVA(prev => [...prev, nuevoTipoIVA as any]);
        return String(nuevoTipoIVA.id);
      } else {
        throw new Error("No se pudo crear el tipo de IVA");
      }
    } catch (error) {
      console.error("Error al añadir tipo de IVA:", error);
      throw error;
    }
  };

  const updateTipoIVA = async (id: string, tipoIVAActualizado: Partial<VATType>) => {
    try {
      const updated = await interfaz.updateTipoIVA(id, tipoIVAActualizado as any);
      if (updated) {
        setTiposIVA(prev => prev.map(iva => iva.id === id ? { ...iva, ...(tipoIVAActualizado as any) } : iva));
      }
    } catch (error) {
      console.error("Error al actualizar tipo de IVA:", error);
      throw error;
    }
  };

  const deleteTipoIVA = async (id: string) => {
    try {
      const success = await interfaz.deleteTipoIVA(id);
      if (success) {
        setTiposIVA(prev => prev.filter(iva => iva.id !== id));
      } else {
        throw new Error("No se pudo eliminar el tipo de IVA");
      }
    } catch (error) {
      console.error("Error al eliminar tipo de IVA:", error);
      throw error;
    }
  };

  const getTiposIVAByTarifaId = async (tarifaId: string): Promise<VATType[]> => {
    try {
      const tiposIVA = await interfaz.getTiposIVAByTarifaId(tarifaId);
      return (tiposIVA as any) || [];
    } catch (error) {
      console.error("Error al obtener tipos de IVA por tarifa:", error);
      return [];
    }
  };

  return (
    <IVAContext.Provider value={{
      tiposIVA,
      addTipoIVA,
      updateTipoIVA,
      deleteTipoIVA,
      getTiposIVAByTarifaId
    }}>
      {children}
    </IVAContext.Provider>
  );
};

export const useIVA = () => {
  const context = useContext(IVAContext);
  if (context === undefined) {
    throw new Error("useIVA debe ser usado dentro de un IVAProvider");
  }
  return context;
}; 