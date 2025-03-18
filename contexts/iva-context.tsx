"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface TipoIVA {
  id: string;
  descripcion: string;
  porcentaje: number;
  tarifaId: string;
}

interface IVAContextType {
  tiposIVA: TipoIVA[];
  addTipoIVA: (tipoIVA: Omit<TipoIVA, "id">) => string;
  updateTipoIVA: (id: string, tipoIVA: Partial<TipoIVA>) => void;
  deleteTipoIVA: (id: string) => void;
  getTiposIVAByTarifaId: (tarifaId: string) => TipoIVA[];
}

// Datos iniciales de ejemplo
const initialTiposIVA: TipoIVA[] = [
  { id: "iva-1", descripcion: "0 %", porcentaje: 0, tarifaId: "tarifa-base" },
  { id: "iva-2", descripcion: "20 %", porcentaje: 20, tarifaId: "tarifa-base" },
  { id: "iva-3", descripcion: "10 %", porcentaje: 10, tarifaId: "tarifa-california" },
  { id: "iva-4", descripcion: "4 %", porcentaje: 4, tarifaId: "tarifa-california" },
];

const IVAContext = createContext<IVAContextType | undefined>(undefined);

export const IVAProvider = ({ children }: { children: ReactNode }) => {
  const [tiposIVA, setTiposIVA] = useState<TipoIVA[]>(initialTiposIVA);

  // Cargar desde localStorage si existe
  useEffect(() => {
    const storedTiposIVA = localStorage.getItem("tiposIVA");
    if (storedTiposIVA) {
      setTiposIVA(JSON.parse(storedTiposIVA));
    }
  }, []);

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("tiposIVA", JSON.stringify(tiposIVA));
  }, [tiposIVA]);

  // Funciones para gestionar tipos de IVA
  const addTipoIVA = (tipoIVA: Omit<TipoIVA, "id">) => {
    const id = `iva-${Date.now()}`;
    const nuevoTipoIVA = { ...tipoIVA, id };
    setTiposIVA(prev => [...prev, nuevoTipoIVA]);
    return id;
  };

  const updateTipoIVA = (id: string, tipoIVAActualizado: Partial<TipoIVA>) => {
    setTiposIVA(prev => 
      prev.map(tipoIVA => 
        tipoIVA.id === id ? { ...tipoIVA, ...tipoIVAActualizado } : tipoIVA
      )
    );
  };

  const deleteTipoIVA = (id: string) => {
    setTiposIVA(prev => prev.filter(tipoIVA => tipoIVA.id !== id));
  };

  const getTiposIVAByTarifaId = (tarifaId: string) => {
    return tiposIVA.filter(tipoIVA => tipoIVA.tarifaId === tarifaId);
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

// Hook personalizado para usar el contexto
export const useIVA = () => {
  const context = useContext(IVAContext);
  if (context === undefined) {
    throw new Error("useIVA debe ser usado dentro de un IVAProvider");
  }
  return context;
}; 