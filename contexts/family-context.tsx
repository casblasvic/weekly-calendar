"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useInterfaz } from "./interfaz-Context"
import { FamiliaTarifa as FamiliaTarifaModel } from "@/services/data/models/interfaces"

// Alias para tipos específicos usando tipos del modelo central
export type FamiliaTarifa = FamiliaTarifaModel;
export type Family = FamiliaTarifa;

interface FamilyContextType {
  families: Family[]
  addFamily: (family: Omit<Family, "id">) => Promise<void>
  updateFamily: (id: string, family: Partial<Family>) => Promise<void>
  toggleFamilyStatus: (id: string) => Promise<void>
  getFamilyById: (id: string) => Promise<Family | undefined>
  getSubfamilies: (parentId: string) => Promise<Family[]>
  getRootFamilies: (tarifaId?: string) => Promise<Family[]>
  getFamiliesByTarifaId: (tarifaId: string) => Promise<Family[]>
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined)

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [families, setFamilies] = useState<Family[]>([])
  const interfaz = useInterfaz()

  // Cargar datos iniciales utilizando la interfaz
  useEffect(() => {
    const fetchFamilies = async () => {
      if (interfaz.initialized) {
        try {
          const data = await interfaz.getAllFamiliasTarifa();
          setFamilies(data);
        } catch (error) {
          console.error("Error al cargar familias:", error);
        }
      }
    };
    
    fetchFamilies();
  }, [interfaz.initialized]);

  const addFamily = async (family: Omit<Family, "id">) => {
    try {
      const newFamily = await interfaz.createFamiliaTarifa(family);
      setFamilies(prev => [...prev, newFamily]);
    } catch (error) {
      console.error("Error al añadir familia:", error);
      throw error;
    }
  };

  const updateFamily = async (id: string, updatedFamily: Partial<Family>) => {
    try {
      const updated = await interfaz.updateFamiliaTarifa(id, updatedFamily);
      if (updated) {
        setFamilies(prev => prev.map(family => family.id === id ? { ...family, ...updatedFamily } : family));
        
        try {
          const tarifaId = updatedFamily.tarifaId || families.find(f => f.id === id)?.tarifaId || '';
          window.dispatchEvent(new CustomEvent("familia-actualizada", { 
            detail: { id, tarifaId } 
          }));
        } catch (eventError) {
          console.error("Error al disparar evento:", eventError);
        }
      }
    } catch (error) {
      console.error("Error al actualizar familia:", error);
      throw error;
    }
  };

  const toggleFamilyStatus = async (id: string) => {
    try {
      const success = await interfaz.toggleFamiliaStatus(id);
      if (success) {
        setFamilies(prev => prev.map(family => 
          family.id === id ? { ...family, isActive: !family.isActive } : family
        ));
      }
    } catch (error) {
      console.error("Error al cambiar estado de familia:", error);
      throw error;
    }
  };

  const getFamilyById = async (id: string) => {
    try {
      return await interfaz.getFamiliaTarifaById(id);
    } catch (error) {
      console.error("Error al obtener familia por ID:", error);
      return undefined;
    }
  };

  const getSubfamilies = async (parentId: string) => {
    if (!parentId) {
      console.warn("Se solicitaron subfamilias con parentId vacío");
      return [];
    }
    
    try {
      const subfamilias = await interfaz.getSubfamilias(parentId);
      return subfamilias || [];
    } catch (error) {
      console.error("Error al obtener subfamilias:", error);
      
      // Intentar recuperar del estado local en caso de error
      const subfamiliasLocales = families.filter(f => f.parentId === parentId);
      return subfamiliasLocales;
    }
  };

  const getRootFamilies = async (tarifaId?: string) => {
    try {
      if (tarifaId) {
        const familias = await interfaz.getRootFamilias(tarifaId);
        return familias || [];
      } else {
        // Obtener todas las familias raíz (sin parentId)
        const todasFamilias = await interfaz.getAllFamiliasTarifa();
        return todasFamilias.filter(f => !f.parentId) || [];
      }
    } catch (error) {
      console.error("Error al obtener familias raíz:", error);
      
      // Recuperar del estado local como fallback
      const familiasRaiz = tarifaId 
        ? families.filter(f => f.tarifaId === tarifaId && !f.parentId)
        : families.filter(f => !f.parentId);
      
      return familiasRaiz;
    }
  };
  
  const getFamiliesByTarifaId = async (tarifaId: string) => {
    if (!tarifaId) {
      console.warn("Se solicitaron familias con tarifaId vacío");
      return [];
    }
    
    try {
      const familias = await interfaz.getFamiliasByTarifaId(tarifaId);
      return familias || [];
    } catch (error) {
      console.error("Error al obtener familias por tarifaId:", error);
      
      // Intentar recuperar del estado local en caso de error
      const familiasLocales = families.filter(f => f.tarifaId === tarifaId);
      if (familiasLocales.length > 0) {
        console.log("Familias recuperadas del estado local tras error:", tarifaId);
        return familiasLocales;
      }
      
      return [];
    }
  };

  return (
    <FamilyContext.Provider value={{
      families,
      addFamily,
      updateFamily,
      toggleFamilyStatus,
      getFamilyById,
      getSubfamilies,
      getRootFamilies,
      getFamiliesByTarifaId
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

