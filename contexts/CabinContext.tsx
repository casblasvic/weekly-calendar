"use client"

import type React from "react"
import { createContext, useState, useContext, type ReactNode, useEffect } from "react"
import { expandHexColor } from "@/utils/color-utils"
import { useClinic } from './clinic-context'
// import { Cabin as CabinModel } from "@/services/data/models/interfaces" // Eliminado
import type { Cabin } from '@prisma/client'; // Añadido
import { useQueryClient } from '@tanstack/react-query'

// Definir alias para los tipos usando los tipos del modelo central
// export type Cabin = CabinModel; // Eliminado

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
  const queryClient = useQueryClient();
  const { activeClinic, isLoading: isLoadingClinic, activeClinicCabins } = useClinic()

  const cachedCabins = activeClinic?.id ? queryClient.getQueryData<Cabin[]>(['cabins', activeClinic.id]) : null;

  const [cabins, setCabins] = useState<Cabin[]>(cachedCabins || [])
  const [loading, setLoading] = useState(cachedCabins ? false : true)

  useEffect(() => {
    if (isLoadingClinic) {
      setLoading(true);
      return;
    }

    if (activeClinic && activeClinicCabins) {
      setCabins(activeClinicCabins as Cabin[]);
      setLoading(false);
    } else if (activeClinic && !activeClinicCabins) {
      setCabins([]);
      setLoading(false);
    } else {
      setCabins([]);
      setLoading(false);
    }
  }, [activeClinic, isLoadingClinic, activeClinicCabins]);

  const addCabin = async (cabin: Omit<Cabin, "id">, clinicId: number | string): Promise<Cabin | null> => {
    console.warn("[CabinProvider] addCabin necesita refactorización para usar useInterfaz");
    return null;
  };

  const updateCabin = async (id: number | string, data: Partial<Cabin>): Promise<boolean> => {
    console.warn("[CabinProvider] updateCabin necesita refactorización para usar useInterfaz");
    return false;
  };

  const deleteCabin = async (id: number | string): Promise<boolean> => {
    console.warn("[CabinProvider] deleteCabin necesita refactorización para usar useInterfaz");
    return false;
  };

  const getCabinsByClinic = async (clinicId: number | string): Promise<Cabin[]> => {
    console.warn("[CabinProvider] getCabinsByClinic necesita refactorización para usar useInterfaz");
    return [];
  };

  const reorderCabins = async (clinicId: number | string, reorderedCabins: Cabin[]): Promise<boolean> => {
    console.warn("[CabinProvider] reorderCabins necesita refactorización para usar useInterfaz");
    return false;
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
    throw new Error("useCabins debe ser usado dentro de un CabinProvider")
  }
  return context
}

