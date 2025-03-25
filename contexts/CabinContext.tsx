"use client"

import type React from "react"
import { createContext, useState, useContext, type ReactNode, useEffect } from "react"
import { expandHexColor } from "@/utils/color-utils"
import { useInterfaz } from "./interfaz-Context"
import { Cabin as CabinModel } from "@/services/data/models/interfaces"

// Definir alias para los tipos usando los tipos del modelo central
export type Cabin = CabinModel;

interface CabinContextType {
  cabins: Cabin[]
  addCabin: (cabin: Omit<Cabin, "id">, clinicId: number | string) => Promise<Cabin | null>
  updateCabin: (id: number | string, data: Partial<Cabin>) => Promise<boolean>
  deleteCabin: (id: number | string) => Promise<boolean>
  getCabinsByClinic: (clinicId: number | string) => Promise<Cabin[]>
  reorderCabins: (clinicId: number | string, cabins: Cabin[]) => Promise<boolean>
  loading: boolean
}

const CabinContext = createContext<CabinContextType | undefined>(undefined)

export const CabinProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)
  const [dataFetched, setDataFetched] = useState(false)
  const interfaz = useInterfaz()

  // Cargar datos al inicializar
  useEffect(() => {
    const loadCabins = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          setLoading(true)
          // Obtener todas las cabinas de las clínicas activas
          const clinics = await interfaz.getActiveClinicas();
          
          if (clinics && clinics.length > 0) {
            let allCabins: Cabin[] = [];
            
            for (const clinic of clinics) {
              if (clinic.config && clinic.config.cabins) {
                allCabins = [...allCabins, ...clinic.config.cabins];
              }
            }
            
            setCabins(allCabins);
          }
          
          setDataFetched(true);
        } catch (error) {
          console.error("Error al cargar cabinas:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadCabins();
  }, [interfaz.initialized, dataFetched]);

  // Añadir nueva cabina a una clínica
  const addCabin = async (cabin: Omit<Cabin, "id">, clinicId: number | string): Promise<Cabin | null> => {
    try {
      // Obtener la clínica
      const clinic = await interfaz.getClinicaById(String(clinicId));
      
      if (!clinic) {
        throw new Error("Clínica no encontrada");
      }
      
      // Asegurar que el color esté en formato hexadecimal completo
      const cabinToAdd = {
        ...cabin,
        color: expandHexColor(cabin.color),
      };
      
      // Añadir la cabina a la configuración de la clínica
      const currentCabins = clinic.config?.cabins || [];
      const newId = Math.max(...currentCabins.map(c => Number(c.id)), 0) + 1;
      
      const newCabin = {
        ...cabinToAdd,
        id: newId,
        order: currentCabins.length + 1,
      } as Cabin;
      
      const updatedCabins = [...currentCabins, newCabin];
      
      // Actualizar la configuración de la clínica
      const success = await interfaz.updateClinicConfig(String(clinicId), {
        cabins: updatedCabins
      });
      
      if (success) {
        // Actualizar estado local
        setCabins(prev => [...prev, newCabin]);
        return newCabin;
      }
      
      return null;
    } catch (error) {
      console.error("Error al añadir cabina:", error);
      return null;
    }
  };

  // Actualizar cabina existente
  const updateCabin = async (id: number | string, data: Partial<Cabin>): Promise<boolean> => {
    try {
      // Encontrar la cabina en el estado local para saber a qué clínica pertenece
      const cabinToUpdate = cabins.find(c => Number(c.id) === Number(id));
      
      if (!cabinToUpdate || !cabinToUpdate.clinicId) {
        throw new Error("Cabina no encontrada o sin clínica asociada");
      }
      
      // Obtener la clínica
      const clinic = await interfaz.getClinicaById(String(cabinToUpdate.clinicId));
      
      if (!clinic) {
        throw new Error("Clínica no encontrada");
      }
      
      // Asegurar que el color esté en formato hexadecimal completo si se actualiza
      const updatedData = {
        ...data,
        color: data.color ? expandHexColor(data.color) : cabinToUpdate.color,
      };
      
      // Actualizar la cabina en la configuración de la clínica
      const currentCabins = clinic.config?.cabins || [];
      const updatedCabins = currentCabins.map(c => 
        Number(c.id) === Number(id) ? { ...c, ...updatedData } : c
      );
      
      // Actualizar la configuración de la clínica
      const success = await interfaz.updateClinicConfig(String(cabinToUpdate.clinicId), {
        cabins: updatedCabins
      });
      
      if (success) {
        // Actualizar estado local
        setCabins(prev => prev.map(c => 
          Number(c.id) === Number(id) ? { ...c, ...updatedData } : c
        ));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al actualizar cabina:", error);
      return false;
    }
  };

  // Eliminar cabina
  const deleteCabin = async (id: number | string): Promise<boolean> => {
    try {
      // Encontrar la cabina en el estado local para saber a qué clínica pertenece
      const cabinToDelete = cabins.find(c => Number(c.id) === Number(id));
      
      if (!cabinToDelete || !cabinToDelete.clinicId) {
        throw new Error("Cabina no encontrada o sin clínica asociada");
      }
      
      // Obtener la clínica
      const clinic = await interfaz.getClinicaById(String(cabinToDelete.clinicId));
      
      if (!clinic) {
        throw new Error("Clínica no encontrada");
      }
      
      // Eliminar la cabina de la configuración de la clínica
      const currentCabins = clinic.config?.cabins || [];
      const updatedCabins = currentCabins.filter(c => Number(c.id) !== Number(id));
      
      // Actualizar la configuración de la clínica
      const success = await interfaz.updateClinicConfig(String(cabinToDelete.clinicId), {
        cabins: updatedCabins
      });
      
      if (success) {
        // Actualizar estado local
        setCabins(prev => prev.filter(c => Number(c.id) !== Number(id)));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al eliminar cabina:", error);
      return false;
    }
  };

  // Obtener cabinas por clínica
  const getCabinsByClinic = async (clinicId: number | string): Promise<Cabin[]> => {
    try {
      const clinic = await interfaz.getClinicaById(String(clinicId));
      
      if (!clinic) {
        throw new Error("Clínica no encontrada");
      }
      
      return clinic.config?.cabins || [];
    } catch (error) {
      console.error(`Error al obtener cabinas de la clínica ${clinicId}:`, error);
      return [];
    }
  };

  // Reordenar cabinas de una clínica
  const reorderCabins = async (clinicId: number | string, reorderedCabins: Cabin[]): Promise<boolean> => {
    try {
      // Obtener la clínica
      const clinic = await interfaz.getClinicaById(String(clinicId));
      
      if (!clinic) {
        throw new Error("Clínica no encontrada");
      }
      
      // Actualizar el orden de las cabinas
      const updatedCabins = reorderedCabins.map((cabin, index) => ({
        ...cabin,
        order: index + 1,
      }));
      
      // Actualizar la configuración de la clínica
      const success = await interfaz.updateClinicConfig(String(clinicId), {
        cabins: updatedCabins
      });
      
      if (success) {
        // Actualizar el estado local
        setCabins(prev => {
          // Reemplazar las cabinas de esta clínica y mantener las demás
          const otherCabins = prev.filter(c => c.clinicId !== clinicId);
          return [...otherCabins, ...updatedCabins];
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al reordenar cabinas:", error);
      return false;
    }
  };

  return (
    <CabinContext.Provider
      value={{
        cabins,
        addCabin,
        updateCabin,
        deleteCabin,
        getCabinsByClinic,
        reorderCabins,
        loading
      }}
    >
      {children}
    </CabinContext.Provider>
  )
}

export const useCabins = () => {
  const context = useContext(CabinContext)
  if (context === undefined) {
    throw new Error("useCabins must be used within a CabinProvider")
  }
  return context
}

