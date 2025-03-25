"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { Clinica as ClinicaModel, ClinicConfig as ClinicConfigModel } from "@/services/data/models/interfaces"

// Función auxiliar para comparar IDs que pueden ser string o number
const isSameId = (id1: string | number | undefined | null, id2: string | number | undefined | null): boolean => {
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) return false;
  return String(id1) === String(id2);
}

// Definir alias para los tipos usando los tipos del modelo central
export type Clinica = ClinicaModel;
export type ClinicConfig = ClinicConfigModel;

interface ClinicContextType {
  activeClinic: Clinica | null
  setActiveClinic: (clinic: Clinica) => void
  clinics: Clinica[]
  getAllClinicas: () => Promise<Clinica[]>
  getClinicaById: (id: string) => Promise<Clinica | null>
  createClinica: (clinica: Omit<Clinica, 'id'>) => Promise<string>
  updateClinica: (id: string, clinica: Partial<Clinica>) => Promise<boolean>
  deleteClinica: (id: string) => Promise<boolean>
  updateClinicConfig: (clinicId: string, newConfig: Partial<ClinicConfig>) => Promise<boolean>
  getActiveClinicas: () => Promise<Clinica[]>
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [activeClinic, setActiveClinic] = useState<Clinica | null>(null)
  const [clinics, setClinics] = useState<Clinica[]>([])
  const [initialized, setInitialized] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const interfaz = useInterfaz()

  // Cargar datos iniciales
  useEffect(() => {
    const loadClinics = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          // Cargar clínicas
          const loadedClinics = await interfaz.getAllClinicas();
          
          // Establecer las clínicas
          setClinics(loadedClinics);
          
          // Establecer la primera clínica activa como predeterminada
          if (loadedClinics.length > 0) {
            const activeClinics = loadedClinics.filter(c => c.isActive);
            if (activeClinics.length > 0) {
              setActiveClinic(activeClinics[0]);
            } else {
              setActiveClinic(loadedClinics[0]);
            }
          }
          
          setDataFetched(true);
          setInitialized(true);
          console.log("ClinicContext: Datos cargados correctamente");
        } catch (error) {
          console.error("Error al cargar clínicas:", error);
          setClinics([]);
          setInitialized(true);
        }
      }
    };
    
    loadClinics();
  }, [interfaz.initialized, dataFetched]);

  // Obtener todas las clínicas
  const getAllClinicas = async (): Promise<Clinica[]> => {
    try {
      const clinicas = await interfaz.getAllClinicas();
      return clinicas;
    } catch (error) {
      console.error("Error al obtener todas las clínicas:", error);
      return clinics; // Devolver estado local como fallback
    }
  };

  // Obtener clínica por ID
  const getClinicaById = async (id: string): Promise<Clinica | null> => {
    try {
      return await interfaz.getClinicaById(id);
    } catch (error) {
      console.error("Error al obtener clínica por ID:", error);
      // Intentar recuperar del estado local
      const localClinic = clinics.find(c => isSameId(c.id, id));
      return localClinic || null;
    }
  };

  // Crear nueva clínica
  const createClinica = async (clinica: Omit<Clinica, 'id'>): Promise<string> => {
    try {
      const nuevaClinica = await interfaz.createClinica(clinica);
      
      if (nuevaClinica && nuevaClinica.id) {
        // Actualizar estado local
        setClinics(prev => [...prev, nuevaClinica]);
        return String(nuevaClinica.id);
      } else {
        throw new Error("No se pudo crear la clínica");
      }
    } catch (error) {
      console.error("Error al crear clínica:", error);
      throw error;
    }
  };

  // Actualizar clínica
  const updateClinica = async (id: string, clinica: Partial<Clinica>): Promise<boolean> => {
    try {
      // Asegurar que el ID siempre sea un string
      const clinicId = String(id);
      const updatedClinica = await interfaz.updateClinica(clinicId, clinica);
      
      if (updatedClinica) {
        // Actualizar estado local
        setClinics(prev => 
          prev.map(c => isSameId(c.id, clinicId) ? { ...c, ...clinica } : c)
        );
        
        // Actualizar clínica activa si es necesario
        if (activeClinic && isSameId(activeClinic.id, clinicId)) {
          // Usar un setTimeout para evitar actualizaciones anidadas
          setTimeout(() => {
            setActiveClinic({ ...activeClinic, ...clinica });
          }, 0);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al actualizar clínica:", error);
      return false;
    }
  };

  // Eliminar clínica
  const deleteClinica = async (id: string): Promise<boolean> => {
    try {
      const stringId = String(id);
      const success = await interfaz.deleteClinica(stringId);
      
      if (success) {
        // Actualizar estado local
        setClinics(prev => prev.filter(c => !isSameId(c.id, stringId)));
        
        // Si la clínica activa es la eliminada, resetear
        if (activeClinic && isSameId(activeClinic.id, stringId)) {
          const remainingClinics = clinics.filter(c => !isSameId(c.id, stringId));
          if (remainingClinics.length > 0) {
            setActiveClinic(remainingClinics[0]);
          } else {
            setActiveClinic(null);
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al eliminar clínica:", error);
      return false;
    }
  };

  // Actualizar la configuración de una clínica
  const updateClinicConfig = async (clinicId: string, newConfig: Partial<ClinicConfig>): Promise<boolean> => {
    try {
      // Asegurar que el ID siempre sea un string
      const stringClinicId = String(clinicId);
      
      // Buscar la clínica a actualizar
      const clinic = await interfaz.getClinicaById(stringClinicId);
      if (!clinic) return false;
      
      // Actualizar la configuración
      const updatedClinic = {
        ...clinic,
        config: {
          ...clinic.config,
          ...newConfig
        }
      };
      
      // Guardar en el servicio de datos
      const result = await interfaz.updateClinica(stringClinicId, {
        config: updatedClinic.config
      });
      
      // Actualizar el estado local
      if (result) {
        setClinics(prevClinics => 
          prevClinics.map(c => 
            isSameId(c.id, stringClinicId) ? { ...c, config: { ...c.config, ...newConfig } } : c
          )
        );
        
        // Actualizar la clínica activa si corresponde
        if (activeClinic && isSameId(activeClinic.id, stringClinicId)) {
          // Usar un setTimeout para evitar actualizaciones anidadas
          setTimeout(() => {
            setActiveClinic({ 
              ...activeClinic, 
              config: { ...activeClinic.config, ...newConfig } 
            });
          }, 0);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al actualizar configuración de clínica:", error);
      return false;
    }
  }

  // Obtener clínicas activas
  const getActiveClinicas = async (): Promise<Clinica[]> => {
    try {
      return await interfaz.getActiveClinicas();
    } catch (error) {
      console.error("Error al obtener clínicas activas:", error);
      return clinics.filter(c => c.isActive);
    }
  }

  // Proveer un valor por defecto mientras se inicializa
  if (!initialized) {
    return (
      <ClinicContext.Provider
        value={{
          activeClinic: null,
          setActiveClinic: () => {},
          clinics: [],
          getAllClinicas: async () => [],
          getClinicaById: async () => null,
          createClinica: async () => { throw new Error("No inicializado"); },
          updateClinica: async () => false,
          deleteClinica: async () => false,
          updateClinicConfig: async () => false,
          getActiveClinicas: async () => []
        }}
      >
        {children}
      </ClinicContext.Provider>
    );
  }

  return (
    <ClinicContext.Provider
      value={{
        activeClinic,
        setActiveClinic,
        clinics,
        getAllClinicas,
        getClinicaById,
        createClinica,
        updateClinica,
        deleteClinica,
        updateClinicConfig,
        getActiveClinicas
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error("useClinic debe ser usado dentro de un ClinicProvider")
  }
  return context
}

export { ClinicContext }

