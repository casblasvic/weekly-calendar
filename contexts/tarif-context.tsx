"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
}

export interface FamiliaTarifa {
  id: string
  name: string
  code: string
  parentId: string | null
  isActive: boolean
  tarifaId: string
}

interface TarifContextType {
  tarifas: Tarifa[]
  familiasTarifa: FamiliaTarifa[]
  addTarifa: (tarifa: Omit<Tarifa, "id">) => string
  updateTarifa: (id: string, tarifa: Partial<Tarifa>) => void
  getTarifaById: (id: string) => Tarifa | undefined
  addFamiliaTarifa: (familia: Omit<FamiliaTarifa, "id">) => string
  updateFamiliaTarifa: (id: string, familia: Partial<FamiliaTarifa>) => void
  getFamiliasByTarifaId: (tarifaId: string) => FamiliaTarifa[]
  toggleFamiliaStatus: (id: string) => void
  getRootFamilias: (tarifaId: string) => FamiliaTarifa[]
  getSubfamilias: (parentId: string) => FamiliaTarifa[]
}

// Datos iniciales para tarifas
const initialTarifas: Tarifa[] = [
  {
    id: "tarifa-california",
    nombre: "Tarifa Californie",
    clinicaId: "1",
    deshabilitada: false
  }
];

// Datos iniciales para familias según la captura
const initialFamiliasTarifa: FamiliaTarifa[] = [
  { id: "1", name: "Administration", code: "adm", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "2", name: "Ballance", code: "BALLANCE", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "3", name: "Consommables", code: "CONSOM", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "4", name: "Consultation", code: "Consulta", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "5", name: "Control", code: "Control", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "6", name: "Dispositifs", code: "DISPO", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "7", name: "EVIRL", code: "EVIRL", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "8", name: "Forte Gem", code: "FORTEGEM", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "9", name: "JETPEEL", code: "JPL", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "10", name: "Lunula", code: "LUNULA", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "11", name: "NYCE", code: "NYC", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "12", name: "RENPHO", code: "RPH", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "13", name: "SkinShape", code: "SKINSHAP", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "14", name: "SOLIDEA", code: "SLD", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "15", name: "Tarifa plana", code: "TarifPla", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "16", name: "Tricologie", code: "trc", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "17", name: "Verju", code: "VERJU", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "18", name: "Wonder", code: "WONDER", parentId: null, isActive: true, tarifaId: "tarifa-california" },
  { id: "19", name: "Acne", code: "JPAC", parentId: "9", isActive: true, tarifaId: "tarifa-california" },
  { id: "20", name: "Anti Aging", code: "JTAA", parentId: "9", isActive: true, tarifaId: "tarifa-california" },
];

const TarifContext = createContext<TarifContextType | undefined>(undefined);

export const TarifProvider = ({ children }: { children: ReactNode }) => {
  const [tarifas, setTarifas] = useState<Tarifa[]>(initialTarifas);
  const [familiasTarifa, setFamiliasTarifa] = useState<FamiliaTarifa[]>(initialFamiliasTarifa);

  // Cargar desde localStorage si existe
  useEffect(() => {
    const storedTarifas = localStorage.getItem("tarifas");
    const storedFamiliasTarifa = localStorage.getItem("familiasTarifa");
    
    if (storedTarifas) {
      setTarifas(JSON.parse(storedTarifas));
    }
    
    if (storedFamiliasTarifa) {
      setFamiliasTarifa(JSON.parse(storedFamiliasTarifa));
    }
  }, []);

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("tarifas", JSON.stringify(tarifas));
  }, [tarifas]);

  useEffect(() => {
    localStorage.setItem("familiasTarifa", JSON.stringify(familiasTarifa));
  }, [familiasTarifa]);

  // Añade un useEffect para debug
  useEffect(() => {
    console.log("Estado actual de tarifas:", tarifas);
  }, [tarifas]);

  // Funciones para manejar tarifas
  const addTarifa = (tarifa: Omit<Tarifa, "id">) => {
    const id = `tarifa-${Date.now()}`;
    const nuevaTarifa = { ...tarifa, id };
    setTarifas(prev => {
      const nuevasTarifas = [...prev, nuevaTarifa];
      console.log("Tarifas después de añadir:", nuevasTarifas);
      return nuevasTarifas;
    });
    return id;
  };

  const updateTarifa = (id: string, tarifaActualizada: Partial<Tarifa>) => {
    setTarifas(prev => 
      prev.map(tarifa => 
        tarifa.id === id ? { ...tarifa, ...tarifaActualizada } : tarifa
      )
    );
  };

  const getTarifaById = (id: string) => {
    return tarifas.find(tarifa => tarifa.id === id);
  };

  // Funciones para manejar familias de tarifa
  const addFamiliaTarifa = (familia: Omit<FamiliaTarifa, "id">) => {
    const id = Date.now().toString();
    const nuevaFamilia = { ...familia, id };
    setFamiliasTarifa(prev => [...prev, nuevaFamilia]);
    return id;
  };

  const updateFamiliaTarifa = (id: string, familiaActualizada: Partial<FamiliaTarifa>) => {
    setFamiliasTarifa(prev => 
      prev.map(familia => 
        familia.id === id ? { ...familia, ...familiaActualizada } : familia
      )
    );
  };

  const getFamiliasByTarifaId = (tarifaId: string) => {
    return familiasTarifa.filter(familia => familia.tarifaId === tarifaId);
  };

  const toggleFamiliaStatus = (id: string) => {
    setFamiliasTarifa(prev => 
      prev.map(familia => 
        familia.id === id ? { ...familia, isActive: !familia.isActive } : familia
      )
    );
  };

  const getRootFamilias = (tarifaId: string) => {
    return familiasTarifa.filter(familia => familia.parentId === null && familia.tarifaId === tarifaId);
  };

  const getSubfamilias = (parentId: string) => {
    return familiasTarifa.filter(familia => familia.parentId === parentId);
  };

  return (
    <TarifContext.Provider
      value={{
        tarifas,
        familiasTarifa,
        addTarifa,
        updateTarifa,
        getTarifaById,
        addFamiliaTarifa,
        updateFamiliaTarifa,
        getFamiliasByTarifaId,
        toggleFamiliaStatus,
        getRootFamilias,
        getSubfamilias
      }}
    >
      {children}
    </TarifContext.Provider>
  );
};

export const useTarif = () => {
  const context = useContext(TarifContext);
  if (context === undefined) {
    throw new Error("useTarif debe ser usado dentro de un TarifProvider");
  }
  return context;
}; 