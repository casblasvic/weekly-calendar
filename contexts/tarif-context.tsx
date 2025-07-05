"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react"
import { useQueryClient } from '@tanstack/react-query';
import { useClinic } from '@/contexts/clinic-context';
// QUITAR: import { useRouter } from "next/navigation"
// QUITAR: import { useInterfaz } from "./interfaz-Context"
// QUITAR: import { Tarifa as TarifaModel, FamiliaTarifa as FamiliaTarifaModel, EntityImage } from "@/services/data/models/interfaces"
import { Tariff as PrismaTariff, Clinic as PrismaClinic } from '@prisma/client'; // Usar tipos Prisma

// Definir alias para los tipos usando los tipos de Prisma
export type Tarifa = PrismaTariff & {
  clinics?: Pick<PrismaClinic, 'id' | 'name' | 'prefix'>[]; // clínicas asociadas (opcional)
};
// export type FamiliaTarifa = PrismaTariffFamily;
// export type TarifaImage = EntityImage; // PENDIENTE

interface TarifContextType {
  tarifas: Tarifa[]
  // familiasTarifa: FamiliaTarifa[]; // Mantener estado local, pero carga/CRUD pendiente
  isLoading: boolean;
  error: string | null;
  refetchTariffs: () => Promise<void>;
  // CRUD Tarifas (refactorizado)
  addTarifa: (tarifa: Omit<Tarifa, "id" | 'createdAt' | 'updatedAt' | 'systemId'>) => Promise<Tarifa | null>; // Ajustar tipo y retorno
  updateTarifa: (id: string, tarifa: Partial<Omit<Tarifa, "id" | 'createdAt' | 'updatedAt' | 'systemId'>>) => Promise<Tarifa | null>; // Ajustar tipo y retorno
  getTarifaById: (id: string) => Promise<Tarifa | null>;
  deleteTarifa: (id: string) => Promise<boolean>; // Añadir deleteTarifa
  // Pendiente API / Refactor
  // addFamiliaTarifa: (familia: Omit<FamiliaTarifa, "id" | 'tarifaId' | 'parentId'> & { tarifaId: string; parentId?: string | null }) => Promise<string>; // Ajustar tipo, pendiente
  // updateFamiliaTarifa: (id: string, familia: Partial<FamiliaTarifa>) => Promise<boolean>; // Pendiente
  // getFamiliasByTarifaId: (tarifaId: string) => Promise<FamiliaTarifa[]>; // Pendiente
  // toggleFamiliaStatus: (id: string) => Promise<boolean>; // Pendiente
  // getRootFamilias: (tarifaId: string) => Promise<FamiliaTarifa[]>; // Pendiente
  // getSubfamilias: (parentId: string) => Promise<FamiliaTarifa[]>; // Pendiente
  getTarifaImages?: (tarifaId: string) => Promise<any[]>; // Pendiente
  saveTarifaImages?: (tarifaId: string, images: any[]) => Promise<boolean>; // Pendiente
  deleteTarifaImages?: (tarifaId: string) => Promise<boolean>; // Pendiente
  addClinicaToTarifa?: (tarifaId: string, clinicaId: string, isPrimary?: boolean) => Promise<boolean>; // Pendiente
  removeClinicaFromTarifa?: (tarifaId: string, clinicaId: string) => Promise<boolean>; // Pendiente
  setPrimaryClinicaForTarifa?: (tarifaId: string, clinicaId: string) => Promise<boolean>; // Pendiente
}

const TarifContext = createContext<TarifContextType | undefined>(undefined);

export const TarifProvider = ({ children }: { children: ReactNode }) => {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  // const [familiasTarifa, setFamiliasTarifa] = useState<FamiliaTarifa[]>([]); // Mantener, pero carga pendiente
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // QUITAR: const router = useRouter();
  // QUITAR: const interfaz = useInterfaz();
  // QUITAR: dataFetched

  const queryClient = useQueryClient();
  const { activeClinic } = useClinic();

  // Cargar tarifas iniciales desde API (pero usar cache si existe)
  const fetchTariffs = useCallback(async () => {
    if (!activeClinic?.id) return;

    const cacheKey = ['tariffs', activeClinic.id];

    // 1️⃣  Comprobar caché persistida ----------------------------------------------------
    const cached = queryClient.getQueryData<Tarifa[]>(cacheKey);
    if (cached && cached.length > 0) {
      setTarifas(cached);
      setIsLoading(false);
      console.debug('[TarifContext] Tariffs loaded from react-query cache');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tariffs?clinicId=${activeClinic.id}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const loadedTarifas: Tarifa[] = await response.json();
      setTarifas(loadedTarifas);
      // 2️⃣  Guardar en caché para accesos futuros -------------------------------------
      queryClient.setQueryData(cacheKey, loadedTarifas);
      console.log("TarifContext: Tarifas cargadas/actualizadas desde API");
      // TODO: Cargar familias de tarifa cuando la API esté lista
      // const familiasResponse = await fetch('/api/tariff-families'); ... setFamiliasTarifa(...)
    } catch (err) {
      console.error("Error al cargar tarifas desde API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar tarifas');
      setTarifas([]);
      // setFamiliasTarifa([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeClinic?.id, queryClient]);

  useEffect(() => {
    fetchTariffs();
  }, [fetchTariffs]);

  // QUITAR: dispatchUpdateEvent si ya no se usa o se rediseña

  // --- Funciones CRUD Tarifas (con API) ---

  const addTarifa = useCallback(async (tarifaData: Omit<Tarifa, "id" | 'createdAt' | 'updatedAt' | 'systemId'>): Promise<Tarifa | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tariffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tarifaData),
      });
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      const newTariff: Tarifa = await response.json();
      setTarifas(prev => [...prev, newTariff]);
      return newTariff;
    } catch (err) {
      console.error("Error al añadir tarifa vía API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear tarifa');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setTarifas]);

  const updateTarifa = useCallback(async (id: string, tarifaUpdate: Partial<Omit<Tarifa, "id" | 'createdAt' | 'updatedAt' | 'systemId'>>): Promise<Tarifa | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tariffs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tarifaUpdate),
      });
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      const updatedTariff: Tarifa = await response.json();
      setTarifas(prev => 
        prev.map(tarifa => (tarifa.id === id ? updatedTariff : tarifa))
      );
      return updatedTariff;
    } catch (err) {
      console.error(`Error al actualizar tarifa ${id} vía API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setTarifas]);

  const getTarifaById = useCallback(async (id: string): Promise<Tarifa | null> => {
    if (!id) return null;
    const localTariff = tarifas.find(t => t.id === id);
    if (localTariff) return localTariff;
    // Si no está local, buscar en API
    console.log(`TarifContext: Tarifa ${id} no encontrada localmente, buscando en API...`)
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tariffs/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const tariff: Tarifa = await response.json();
      // Opcional: actualizar estado local si se encuentra en API
      setTarifas(prev => prev.map(t => (t.id === id ? tariff : t)));
      return tariff;
    } catch (err) {
      console.error(`Error fetching tariff ${id} from API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
        setIsLoading(false);
    }
  }, [tarifas, setIsLoading, setError]);

  const deleteTarifa = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
       const response = await fetch(`/api/tariffs/${id}`, {
        method: 'DELETE',
      });
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      setTarifas(prev => prev.filter(t => t.id !== id));
      // TODO: ¿Eliminar familias asociadas del estado local también?
      return true;
    } catch (err) {
      console.error(`Error deleting tariff ${id} via API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setTarifas]);

  // --- Funciones pendientes (Familias, Imágenes, Clínicas) ---
  // Mantener placeholders o funciones que devuelvan error/estado local

  // const addFamiliaTarifa = async (familia: Omit<FamiliaTarifa, "id">): Promise<string> => {
  //     console.warn("addFamiliaTarifa pendiente de API"); throw new Error("No implementado");
  // };
  // const updateFamiliaTarifa = async (id: string, familia: Partial<FamiliaTarifa>): Promise<boolean> => {
  //     console.warn("updateFamiliaTarifa pendiente de API"); return false;
  // };
  // const getFamiliasByTarifaId = async (tarifaId: string): Promise<FamiliaTarifa[]> => {
  //     console.warn("getFamiliasByTarifaId pendiente de API, devolviendo estado local");
  //     return familiasTarifa.filter(f => f.tarifaId === tarifaId);
  // };
  // const toggleFamiliaStatus = async (id: string): Promise<boolean> => {
  //     console.warn("toggleFamiliaStatus pendiente de API"); return false;
  // };
  // const getRootFamilias = async (tarifaId: string): Promise<FamiliaTarifa[]> => {
  //     console.warn("getRootFamilias pendiente de API, devolviendo estado local");
  //      return familiasTarifa.filter(f => f.tarifaId === tarifaId && !f.parentId);
  // };
  // const getSubfamilias = async (parentId: string): Promise<FamiliaTarifa[]> => {
  //     console.warn("getSubfamilias pendiente de API, devolviendo estado local");
  //      return familiasTarifa.filter(f => f.parentId === parentId);
  // };
  // ... añadir placeholders similares para imágenes y clínicas ...

  const contextValue = useMemo(() => ({
    tarifas,
    // familiasTarifa,
    isLoading,
    error,
    refetchTariffs: fetchTariffs,
    addTarifa,
    updateTarifa,
    getTarifaById,
    deleteTarifa,
    // Pendientes
    // addFamiliaTarifa,
    // updateFamiliaTarifa,
    // getFamiliasByTarifaId,
    // toggleFamiliaStatus,
    // getRootFamilias,
    // getSubfamilias,
    getTarifaImages: async () => [],
    saveTarifaImages: async () => false,
    deleteTarifaImages: async () => false,
    addClinicaToTarifa: async () => false,
    removeClinicaFromTarifa: async () => false,
    setPrimaryClinicaForTarifa: async () => false,
  }), [
    tarifas,
    isLoading,
    error,
    fetchTariffs,
    addTarifa,
    updateTarifa,
    getTarifaById,
    deleteTarifa,
  ]);

  return <TarifContext.Provider value={contextValue}>{children}</TarifContext.Provider>;
};

export const useTarif = () => {
  const context = useContext(TarifContext);
  if (context === undefined) {
    throw new Error("useTarif debe usarse dentro de un TarifProvider");
  }
  return context;
}; 