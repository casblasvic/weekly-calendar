"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useInterfaz } from "./interfaz-Context"
import type { Category } from "@prisma/client"

// Alias para tipos específicos usando tipos del modelo central
// export type FamiliaTarifa = FamiliaTarifaModel;
// export type Family = FamiliaTarifa;

export interface FamilyContextType {
  familias: Category[];
  getFamiliaById: (id: string) => Promise<Category | null>;
  addFamilia: (familia: Omit<Category, "id" | "systemId" | "createdAt" | "updatedAt" | "parentId"> & { parentId?: string | null }) => Promise<Category>;
  updateFamilia: (id: string, familia: Partial<Omit<Category, "id" | "systemId" | "createdAt" | "updatedAt">>) => Promise<Category | null>;
  deleteFamilia: (id: string) => Promise<void>;
  getFamilias: () => Promise<void>;
}

export const FamilyContext = createContext<FamilyContextType | undefined>(
  undefined
);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [families, setFamilies] = useState<Category[]>([])
  const interfaz = useInterfaz()

  // Cargar datos iniciales utilizando la interfaz
  useEffect(() => {
    const fetchFamilies = async () => {
      if (interfaz.initialized) {
        try {
          const data = await interfaz.getAllFamiliasTarifa();
          setFamilies(data as any || []);
        } catch (error) {
          console.error("Error al cargar familias:", error);
          setFamilies([]);
        }
      }
    };
    
    fetchFamilies();
  }, [interfaz.initialized]);

  const addFamilia = async (familia: Omit<Category, "id" | "systemId" | "createdAt" | "updatedAt" | "parentId"> & { parentId?: string | null }): Promise<Category> => {
    try {
      const newFamily = await interfaz.createFamiliaTarifa(familia as any);
      setFamilies(prev => [...prev, newFamily as any]);
      return newFamily as Category;
    } catch (error) {
      console.error("Error al añadir familia:", error);
      throw error;
    }
  };

  const updateFamilia = async (id: string, familia: Partial<Omit<Category, "id" | "systemId" | "createdAt" | "updatedAt">>): Promise<Category | null> => {
    try {
      const updated = await interfaz.updateFamiliaTarifa(id, familia as any);
      if (updated) {
        const updatedCategory = { ...families.find(f => f.id === id), ...familia } as Category;
        setFamilies(prev => prev.map(family => family.id === id ? updatedCategory : family));

        try {
          const tarifaId = (familia as any).tarifaId || (families.find(f => f.id === id) as any)?.tarifaId || '';
          window.dispatchEvent(new CustomEvent("familia-actualizada", {
            detail: { id, tarifaId }
          }));
        } catch (eventError) {
          console.error("Error al disparar evento:", eventError);
        }
        return updatedCategory;
      }
      return null;
    } catch (error) {
      console.error("Error al actualizar familia:", error);
      throw error;
    }
  };

  const deleteFamilia = async (id: string): Promise<void> => {
    try {
      const success = await interfaz.toggleFamiliaStatus(id);
      if (success) {
        setFamilies(prev => prev.map(family =>
          family.id === id ? { ...family, isActive: !(family as any).isActive } as any : family
        ));
      }
    } catch (error) {
      console.error("Error al cambiar estado/eliminar familia:", error);
      throw error;
    }
  };

  const getFamiliaById = async (id: string): Promise<Category | null> => {
    try {
      const familia = await interfaz.getFamiliaTarifaById(id) as any;
      return familia || null;
    } catch (error) {
      console.error("Error al obtener familia por ID:", error);
      return null;
    }
  };

  const getSubfamilies = async (parentId: string): Promise<Category[]> => {
    if (!parentId) {
      console.warn("Se solicitaron subfamilias con parentId vacío");
      return [];
    }
    
    try {
      const subfamilias = await interfaz.getSubfamilias(parentId);
      return (subfamilias as any) || [];
    } catch (error) {
      console.error("Error al obtener subfamilias:", error);
      
      const subfamiliasLocales = families.filter(f => f.parentId === parentId);
      return subfamiliasLocales;
    }
  };

  const getFamilias = async (): Promise<void> => {
    try {
      const todasFamilias = await interfaz.getAllFamiliasTarifa();
      setFamilies((todasFamilias as any[]).filter(f => !f.parentId) as Category[] || []);
    } catch (error) {
      console.error("Error al obtener familias raíz:", error);
      setFamilies(families.filter(f => !f.parentId));
    }
  };
  
  const getFamiliesByTarifaId = async (tarifaId: string): Promise<Category[]> => {
    if (!tarifaId) {
      console.warn("Se solicitaron familias con tarifaId vacío");
      return [];
    }
    
    try {
      const familias = await interfaz.getFamiliasByTarifaId(tarifaId);
      return (familias as any) || [];
    } catch (error) {
      console.error("Error al obtener familias por tarifaId:", error);
      
      const familiasLocales = families.filter(f => (f as any).tarifaId === tarifaId);
      if (familiasLocales.length > 0) {
        console.log("Familias recuperadas del estado local tras error:", tarifaId);
        return familiasLocales;
      }
      
      return [];
    }
  };

  return (
    <FamilyContext.Provider value={{
      familias: families,
      getFamiliaById: getFamiliaById,
      addFamilia: addFamilia,
      updateFamilia: updateFamilia,
      deleteFamilia: deleteFamilia,
      getFamilias: getFamilias,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error("useFamily debe ser usado dentro de un FamilyProvider");
  }
  return context;
};

