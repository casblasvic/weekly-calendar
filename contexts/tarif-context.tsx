"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useInterfaz } from "./interfaz-Context"
import { Tarifa as TarifaModel, FamiliaTarifa as FamiliaTarifaModel, EntityImage } from "@/services/data/models/interfaces"

// Definir alias para los tipos usando los tipos del modelo central
export type Tarifa = TarifaModel;
export type FamiliaTarifa = FamiliaTarifaModel;
export type TarifaImage = EntityImage;

interface TarifContextType {
  tarifas: Tarifa[]
  familiasTarifa: FamiliaTarifa[]
  addTarifa: (tarifa: Omit<Tarifa, "id">) => Promise<string>
  updateTarifa: (id: string, tarifa: Partial<Tarifa>) => Promise<boolean>
  getTarifaById: (id: string) => Promise<Tarifa | null>
  addFamiliaTarifa: (familia: Omit<FamiliaTarifa, "id">) => Promise<string>
  updateFamiliaTarifa: (id: string, familia: Partial<FamiliaTarifa>) => Promise<boolean>
  getFamiliasByTarifaId: (tarifaId: string) => Promise<FamiliaTarifa[]>
  toggleFamiliaStatus: (id: string) => Promise<boolean>
  getRootFamilias: (tarifaId: string) => Promise<FamiliaTarifa[]>
  getSubfamilias: (parentId: string) => Promise<FamiliaTarifa[]>
  // Funciones para manejar imágenes de tarifas
  getTarifaImages: (tarifaId: string) => Promise<TarifaImage[]>
  saveTarifaImages: (tarifaId: string, images: TarifaImage[]) => Promise<boolean>
  deleteTarifaImages: (tarifaId: string) => Promise<boolean>
  // Funciones para gestionar clínicas asociadas
  addClinicaToTarifa: (tarifaId: string, clinicaId: string, isPrimary?: boolean) => Promise<boolean>
  removeClinicaFromTarifa: (tarifaId: string, clinicaId: string) => Promise<boolean>
  setPrimaryClinicaForTarifa: (tarifaId: string, clinicaId: string) => Promise<boolean>
}

const TarifContext = createContext<TarifContextType | undefined>(undefined);

export const TarifProvider = ({ children }: { children: ReactNode }) => {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [familiasTarifa, setFamiliasTarifa] = useState<FamiliaTarifa[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const router = useRouter();
  const interfaz = useInterfaz();

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          // Cargar tarifas y familias
          const loadedTarifas = await interfaz.getAllTarifas();
          const loadedFamilias = await interfaz.getAllFamiliasTarifa();
          
          setTarifas(loadedTarifas);
          setFamiliasTarifa(loadedFamilias);
          setDataFetched(true);
          
          console.log("TarifContext: Datos cargados correctamente");
        } catch (error) {
          console.error("Error al cargar datos iniciales en TarifContext:", error);
        }
      }
    };
    
    loadInitialData();
  }, [interfaz.initialized, dataFetched]);

  // Función para disparar eventos de actualización
  const dispatchUpdateEvent = (type: 'tarifas' | 'familias', tarifaId: string = '', action: string) => {
    try {
      window.dispatchEvent(new CustomEvent(`${type}-updated`, {
        detail: { tarifaId, action }
      }));
    } catch (eventError) {
      console.error(`Error al disparar evento de actualización de ${type}:`, eventError);
      // No bloqueamos la operación principal por un error en el evento
    }
  };

  // Funciones para manejar tarifas
  const addTarifa = async (tarifa: Omit<Tarifa, "id">): Promise<string> => {
    try {
      const newTarifa = await interfaz.createTarifa(tarifa);
      
      if (!newTarifa || !newTarifa.id) {
        throw new Error("No se pudo crear la tarifa. Respuesta incompleta del servidor.");
      }
      
      // Actualizar estado local
      setTarifas(prev => [...prev, newTarifa]);
      
      // Notificar la actualización
      dispatchUpdateEvent('tarifas', '', 'create');
      
      return newTarifa.id;
    } catch (error) {
      console.error("Error al añadir tarifa:", error);
      throw error;
    }
  };

  const updateTarifa = async (id: string, tarifaActualizada: Partial<Tarifa>): Promise<boolean> => {
    try {
      const updatedTarifa = await interfaz.updateTarifa(id, tarifaActualizada);
      
      if (!updatedTarifa) {
        throw new Error("No se pudo actualizar la tarifa.");
      }
      
      // Actualizar estado local
      setTarifas(prev => 
        prev.map(tarifa => 
          tarifa.id === id ? { ...tarifa, ...tarifaActualizada } : tarifa
        )
      );
      
      // Notificar la actualización
      dispatchUpdateEvent('tarifas', id, 'update');
      
      return true;
    } catch (error) {
      console.error("Error al actualizar tarifa:", error);
      return false;
    }
  };

  const getTarifaById = async (id: string): Promise<Tarifa | null> => {
    if (!id) {
      console.warn("Se solicitó una tarifa con ID vacío");
      return null;
    }
    
    try {
      const tarifa = await interfaz.getTarifaById(id);
      
      // Si no se encuentra en la interfaz pero está en nuestro estado local
      if (!tarifa) {
        const tarifaLocal = tarifas.find(t => t.id === id);
        if (tarifaLocal) {
          console.log("Tarifa obtenida del estado local:", id);
          return tarifaLocal;
        }
        return null;
      }
      
      return tarifa;
    } catch (error) {
      console.error("Error al obtener tarifa por ID:", error);
      
      // Intentar recuperar del estado local en caso de error
      const tarifaLocal = tarifas.find(t => t.id === id);
      if (tarifaLocal) {
        console.log("Tarifa recuperada del estado local tras error:", id);
        return tarifaLocal;
      }
      
      return null;
    }
  };

  // Funciones para manejar familias de tarifa
  const addFamiliaTarifa = async (familia: Omit<FamiliaTarifa, "id">): Promise<string> => {
    try {
      const nuevaFamilia = await interfaz.createFamiliaTarifa(familia);
      
      if (!nuevaFamilia || !nuevaFamilia.id) {
        throw new Error("No se pudo crear la familia de tarifa. Respuesta incompleta del servidor.");
      }
      
      // Actualizar estado local
      setFamiliasTarifa(prev => [...prev, nuevaFamilia]);
      
      // Notificar la actualización
      dispatchUpdateEvent('familias', familia.tarifaId, 'create');
      
      return nuevaFamilia.id;
    } catch (error) {
      console.error("Error al añadir familia de tarifa:", error);
      throw error;
    }
  };

  const updateFamiliaTarifa = async (id: string, familiaActualizada: Partial<FamiliaTarifa>): Promise<boolean> => {
    try {
      const updatedFamilia = await interfaz.updateFamiliaTarifa(id, familiaActualizada);
      
      if (!updatedFamilia) {
        throw new Error("No se pudo actualizar la familia de tarifa.");
      }
      
      // Actualizar estado local
      setFamiliasTarifa(prev => 
        prev.map(familia => 
          familia.id === id ? { ...familia, ...familiaActualizada } : familia
        )
      );
      
      // Determinar tarifaId para el evento
      const tarifaId = familiaActualizada.tarifaId || 
        familiasTarifa.find(f => f.id === id)?.tarifaId || '';
        
      // Notificar la actualización
      dispatchUpdateEvent('familias', tarifaId, 'update');
      
      return true;
    } catch (error) {
      console.error("Error al actualizar familia de tarifa:", error);
      return false;
    }
  };

  const getFamiliasByTarifaId = async (tarifaId: string): Promise<FamiliaTarifa[]> => {
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
      const familiasLocales = familiasTarifa.filter(f => f.tarifaId === tarifaId);
      if (familiasLocales.length > 0) {
        console.log("Familias recuperadas del estado local tras error:", tarifaId);
        return familiasLocales;
      }
      
      return [];
    }
  };

  const toggleFamiliaStatus = async (id: string): Promise<boolean> => {
    if (!id) {
      console.warn("Se intentó cambiar el estado de una familia con ID vacío");
      return false;
    }
    
    try {
      const success = await interfaz.toggleFamiliaStatus(id);
      
      if (!success) {
        throw new Error("No se pudo cambiar el estado de la familia de tarifa.");
      }
      
      // Actualizar estado local
      setFamiliasTarifa(prev => 
        prev.map(familia => 
          familia.id === id ? { ...familia, isActive: !familia.isActive } : familia
        )
      );
      
      // Determinar tarifaId para el evento
      const tarifaId = familiasTarifa.find(f => f.id === id)?.tarifaId || '';
      
      // Notificar la actualización
      dispatchUpdateEvent('familias', tarifaId, 'toggle-status');
      
      return true;
    } catch (error) {
      console.error("Error al cambiar estado de familia de tarifa:", error);
      return false;
    }
  };

  const getRootFamilias = async (tarifaId: string): Promise<FamiliaTarifa[]> => {
    if (!tarifaId) {
      console.warn("Se solicitaron familias raíz con tarifaId vacío");
      return [];
    }
    
    try {
      const familias = await interfaz.getRootFamilias(tarifaId);
      return familias || [];
    } catch (error) {
      console.error("Error al obtener familias raíz:", error);
      
      // Intentar recuperar del estado local en caso de error
      const familiasLocales = familiasTarifa.filter(f => f.tarifaId === tarifaId && !f.parentId);
      if (familiasLocales.length > 0) {
        console.log("Familias raíz recuperadas del estado local tras error:", tarifaId);
        return familiasLocales;
      }
      
      return [];
    }
  };

  const getSubfamilias = async (parentId: string): Promise<FamiliaTarifa[]> => {
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
      const subfamiliasLocales = familiasTarifa.filter(f => f.parentId === parentId);
      if (subfamiliasLocales.length > 0) {
        console.log("Subfamilias recuperadas del estado local tras error:", parentId);
        return subfamiliasLocales;
      }
      
      return [];
    }
  };

  // Funciones para manejar imágenes
  const getTarifaImages = async (tarifaId: string): Promise<TarifaImage[]> => {
    if (!tarifaId) {
      console.warn("Se solicitaron imágenes con tarifaId vacío");
      return [];
    }
    
    try {
      const imagenes = await interfaz.getEntityImages('tarifa', tarifaId);
      return imagenes || [];
    } catch (error) {
      console.error("Error al obtener imágenes de tarifa:", error);
      return [];
    }
  };

  const saveTarifaImages = async (tarifaId: string, images: TarifaImage[]): Promise<boolean> => {
    if (!tarifaId) {
      console.warn("Se intentaron guardar imágenes con tarifaId vacío");
      return false;
    }
    
    try {
      const resultado = await interfaz.saveEntityImages('tarifa', tarifaId, images);
      
      // Disparar evento de actualización si fue exitoso
      if (resultado) {
        dispatchUpdateEvent('tarifas', tarifaId, 'update-images');
      }
      
      return resultado;
    } catch (error) {
      console.error("Error al guardar imágenes de tarifa:", error);
      return false;
    }
  };

  const deleteTarifaImages = async (tarifaId: string): Promise<boolean> => {
    if (!tarifaId) {
      console.warn("Se intentaron eliminar imágenes con tarifaId vacío");
      return false;
    }
    
    try {
      const resultado = await interfaz.deleteEntityImages('tarifa', tarifaId);
      
      if (resultado) {
        dispatchUpdateEvent('tarifas', tarifaId, 'delete-images');
      }
      
      return resultado;
    } catch (error) {
      console.error("Error al eliminar imágenes de tarifa:", error);
      return false;
    }
  };

  // Funciones para gestionar clínicas asociadas
  const addClinicaToTarifa = async (tarifaId: string, clinicaId: string, isPrimary: boolean = false): Promise<boolean> => {
    if (!tarifaId || !clinicaId) {
      console.warn("Se intentó añadir una clínica con IDs incompletos");
      return false;
    }
    
    try {
      const success = await interfaz.addClinicaToTarifa(tarifaId, clinicaId, isPrimary);
      
      if (success) {
        // Actualizar el estado local
        const updatedTarifa = await interfaz.getTarifaById(tarifaId);
        if (updatedTarifa) {
          setTarifas(prev => 
            prev.map(tarifa => 
              tarifa.id === tarifaId ? updatedTarifa : tarifa
            )
          );
          
          dispatchUpdateEvent('tarifas', tarifaId, 'update-clinicas');
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error al añadir clínica a tarifa:", error);
      return false;
    }
  };

  const removeClinicaFromTarifa = async (tarifaId: string, clinicaId: string): Promise<boolean> => {
    if (!tarifaId || !clinicaId) {
      console.warn("Se intentó eliminar una clínica con IDs incompletos");
      return false;
    }
    
    try {
      const success = await interfaz.removeClinicaFromTarifa(tarifaId, clinicaId);
      
      if (success) {
        // Actualizar el estado local
        const updatedTarifa = await interfaz.getTarifaById(tarifaId);
        if (updatedTarifa) {
          setTarifas(prev => 
            prev.map(tarifa => 
              tarifa.id === tarifaId ? updatedTarifa : tarifa
            )
          );
          
          dispatchUpdateEvent('tarifas', tarifaId, 'update-clinicas');
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error al eliminar clínica de tarifa:", error);
      return false;
    }
  };

  const setPrimaryClinicaForTarifa = async (tarifaId: string, clinicaId: string): Promise<boolean> => {
    if (!tarifaId || !clinicaId) {
      console.warn("Se intentó establecer clínica primaria con IDs incompletos");
      return false;
    }
    
    try {
      const success = await interfaz.setPrimaryClinicaForTarifa(tarifaId, clinicaId);
      
      if (success) {
        // Actualizar el estado local
        const updatedTarifa = await interfaz.getTarifaById(tarifaId);
        if (updatedTarifa) {
          setTarifas(prev => 
            prev.map(tarifa => 
              tarifa.id === tarifaId ? updatedTarifa : tarifa
            )
          );
          
          dispatchUpdateEvent('tarifas', tarifaId, 'update-clinica-primaria');
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error al establecer clínica primaria para tarifa:", error);
      return false;
    }
  };

  // Proveer un valor por defecto mientras se inicializa
  if (!dataFetched) {
    return (
      <TarifContext.Provider
        value={{
          tarifas: [],
          familiasTarifa: [],
          addTarifa: async () => { throw new Error("Contexto no inicializado"); },
          updateTarifa: async () => { throw new Error("Contexto no inicializado"); },
          getTarifaById: async () => null,
          addFamiliaTarifa: async () => { throw new Error("Contexto no inicializado"); },
          updateFamiliaTarifa: async () => { throw new Error("Contexto no inicializado"); },
          getFamiliasByTarifaId: async () => [],
          toggleFamiliaStatus: async () => { throw new Error("Contexto no inicializado"); },
          getRootFamilias: async () => [],
          getSubfamilias: async () => [],
          getTarifaImages: async () => [],
          saveTarifaImages: async () => false,
          deleteTarifaImages: async () => false,
          addClinicaToTarifa: async () => false,
          removeClinicaFromTarifa: async () => false,
          setPrimaryClinicaForTarifa: async () => false
        }}
      >
        {children}
      </TarifContext.Provider>
    );
  }

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
        getSubfamilias,
        getTarifaImages,
        saveTarifaImages,
        deleteTarifaImages,
        addClinicaToTarifa,
        removeClinicaFromTarifa,
        setPrimaryClinicaForTarifa
      }}
    >
      {children}
    </TarifContext.Provider>
  );
};

export const useTarif = () => {
  const context = useContext(TarifContext);
  if (context === undefined) {
    throw new Error('useTarif debe ser usado dentro de un TarifProvider');
  }
  return context;
}; 