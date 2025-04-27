"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react"
import { useInterfaz } from "./interfaz-Context"
import type { Equipment, EntityImage, Clinic as PrismaClinic } from "@prisma/client"
import { useClinic } from "./clinic-context"
import { useSession } from "next-auth/react"

// Definir alias para los tipos usando los tipos del modelo central
// export type Equipo = EquipoModel;
// export type EquipoImage = EntityImage;

// Tipo extendido para equipo con imágenes
export interface EquipoWithImages extends Equipment {
  images?: Array<{
    id: string;
    url: string;
    isPrimary?: boolean;
    file?: File;
  }>;
}

export interface EquipmentContextType {
  allEquipos: Equipment[]
  getClinicEquipos: (clinicId: string) => Equipment[]
  getEquipoById: (id: string) => Promise<Equipment | null>
  addEquipo: (equipoData: Partial<Equipment>) => Promise<Equipment | null>
  updateEquipo: (id: string, data: Partial<Equipment>) => Promise<boolean>
  deleteEquipo: (id: string) => Promise<boolean>
  refreshEquipos: () => Promise<void>
  clinics: Array<{id: string, name: string}>
  saveEquipo: (data: EquipoWithImages) => Promise<boolean>
  getEquipoImages: (equipoId: string) => Promise<EntityImage[]>
  getEquipoPrimaryImage: (equipoId: string) => Promise<EntityImage | undefined>
  getGlobalEquipos: () => Promise<Equipment[]>
  loading: boolean;
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(undefined)

export const EquipmentProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [allEquipos, setAllEquipos] = useState<Equipment[]>([])
  const [loadingEquipos, setLoadingEquipos] = useState(true)
  const interfaz = useInterfaz();
  const { data: session, status: sessionStatus } = useSession();
  const { 
    clinics: clinicListFromContext, 
    isLoading: isLoadingClinics, 
    activeClinic
  } = useClinic();

  const formattedClinics = useMemo(() => {
    return (clinicListFromContext || []).map((clinic: PrismaClinic) => ({ 
      id: String(clinic.id),
      name: clinic.name
    }));
  }, [clinicListFromContext]);

  const dispatchUpdateEvent = (equipoId: string = '', action: string) => {
    try {
      window.dispatchEvent(new CustomEvent("equipment-updated", {
        detail: { equipoId, action }
      }));
    } catch (eventError) {
      console.error("Error al disparar evento de actualización de equipamiento:", eventError);
    }
  };

  const loadAllEquipos = async () => {
    setLoadingEquipos(true);
    try {
      const equipos = await interfaz.getAllEquipos();
      setAllEquipos((equipos as Equipment[]) || []);
    } catch (error) {
      console.error("Error al cargar equipamiento:", error);
      setAllEquipos([]);
    } finally {
      setLoadingEquipos(false);
    }
  };

  useEffect(() => {
    if (interfaz.initialized && sessionStatus === 'authenticated') {
       loadAllEquipos();
    } else if (sessionStatus !== 'loading') {
       setAllEquipos([]);
       setLoadingEquipos(false);
    }

    const handleEquipmentUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.action) {
        refreshEquipos();
      }
    };

    window.addEventListener('equipment-updated', handleEquipmentUpdate);
    return () => {
      window.removeEventListener('equipment-updated', handleEquipmentUpdate);
    };
  }, [interfaz.initialized, sessionStatus]);

  const loading = isLoadingClinics || loadingEquipos;

  const getClinicEquipos = (clinicId: string): Equipment[] => {
    if (!allEquipos || allEquipos.length === 0) {
      return [];
    }
    return allEquipos.filter(equip => String(equip.clinicId) === String(clinicId));
  };

  const getEquipoById = async (id: string): Promise<Equipment | null> => {
    if (!id) {
      console.warn("Se solicitó un equipo con ID vacío");
      return null;
    }
    
    try {
      const equipo = await interfaz.getEquipoById(id);
      
      if (!equipo) {
        const equipoLocal = allEquipos.find(e => e.id === id);
        if (equipoLocal) {
          console.log("Equipo obtenido del estado local:", id);
          return equipoLocal;
        }
        return null;
      }
      
      return equipo as Equipment;
    } catch (error) {
      console.error(`Error al obtener equipo ${id}:`, error);
      
      const equipoLocal = allEquipos.find(e => e.id === id);
      if (equipoLocal) {
        console.log("Equipo recuperado del estado local tras error:", id);
        return equipoLocal;
      }
      
      return null;
    }
  };

  const addEquipo = async (equipoData: Partial<Equipment>): Promise<Equipment | null> => {
    try {
      if (!equipoData.name || !equipoData.deviceId) {
         throw new Error("Nombre y Device ID son campos obligatorios para crear equipamiento");
      }

      const currentSystemId = activeClinic?.systemId;
      if (!currentSystemId) {
         throw new Error("No se pudo obtener el systemId de la clínica activa.");
      }

      const dataToCreate: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'> = {
        name: equipoData.name,
        deviceId: equipoData.deviceId,
        clinicId: equipoData.clinicId ?? null,
        systemId: currentSystemId,
        description: equipoData.description ?? null,
        serialNumber: equipoData.serialNumber ?? null,
        modelNumber: equipoData.modelNumber ?? null,
        purchaseDate: equipoData.purchaseDate ?? null,
        warrantyEndDate: equipoData.warrantyEndDate ?? null,
        location: equipoData.location ?? null,
        notes: equipoData.notes ?? null,
        isActive: equipoData.isActive ?? true,
      };
      
      const newEquipo = await interfaz.createEquipo(dataToCreate);

      if (!newEquipo || !newEquipo.id) {
        throw new Error("No se pudo crear el equipo. Respuesta incompleta del servidor.");
      }

      setAllEquipos(prev => [...prev, newEquipo as Equipment]);
      dispatchUpdateEvent(String(newEquipo.id), 'create');
      return newEquipo as Equipment;
    } catch (error) {
      console.error("Error al añadir equipo:", error);
      return null;
    }
  };

  const updateEquipo = async (id: string, data: Partial<Equipment>): Promise<boolean> => {
    if (!id) {
      console.warn("Se intentó actualizar un equipo con ID vacío");
      return false;
    }
    
    try {
      const equipoActualizado = await interfaz.updateEquipo(id, data);
      
      if (!equipoActualizado) {
        console.warn(`Fallo al actualizar equipo ${id} desde la interfaz.`);
        return false;
      }
      
      setAllEquipos(prev => 
        prev.map(item => item.id === id ? { ...item, ...data } as Equipment : item)
      );
      
      dispatchUpdateEvent(id, 'update');
      
      return true;
    } catch (error) {
      console.error("Error al actualizar equipo:", error);
      return false;
    }
  };

  const deleteEquipo = async (id: string): Promise<boolean> => {
    if (!id) {
      console.warn("Se intentó eliminar un equipo con ID vacío");
      return false;
    }
    
    try {
      const success = await interfaz.deleteEquipo(id);
      if (!success) {
        console.error(`Fallo al eliminar equipo ${id} desde la interfaz.`);
        return false;
      }
      setAllEquipos(prev => prev.filter(item => item.id !== id));
      dispatchUpdateEvent(id, 'delete');
      return true;
    } catch (error) {
      console.error("Error al eliminar equipo:", error);
      return false;
    }
  };

  const refreshEquipos = async (): Promise<void> => {
    await loadAllEquipos();
  };

  const saveEquipo = async (data: EquipoWithImages): Promise<boolean> => {
    const { images, ...equipoData } = data;
    let success = false;
    try {
      let idToDispatch: string | undefined = equipoData.id ? String(equipoData.id) : undefined;
      if (equipoData.id) {
        const equipoActualizado = await interfaz.updateEquipo(String(equipoData.id), equipoData as any);
        success = !!equipoActualizado;
      } else {
        const newEquipo = await interfaz.createEquipo(equipoData as any);
        if (newEquipo && newEquipo.id) {
          equipoData.id = String(newEquipo.id);
          idToDispatch = equipoData.id;
          success = true;
        }
      }

      if (!success || !equipoData.id) {
        throw new Error("Error al guardar los datos base del equipo");
      }

      if (images && images.length > 0) {
        console.log("Procesando imágenes para equipo:", equipoData.id);
        await interfaz.saveEntityImages('Equipment', String(equipoData.id), images as any);
        console.log("Imágenes procesadas.");
      }

      await refreshEquipos(); 
      if (idToDispatch) {
        dispatchUpdateEvent(idToDispatch, data.id ? 'update' : 'create');
      }
      return true;

    } catch (error) {
      console.error("Error guardando equipo (saveEquipo):", error);
      return false;
    }
  };

  const getEquipoImages = async (equipoId: string): Promise<EntityImage[]> => {
    try {
      const images = await interfaz.getEntityImages('Equipment', equipoId);
      return images as any || [];
    } catch (error) {
      console.error("Error al obtener imágenes del equipo:", error);
      return [];
    }
  };

  const getEquipoPrimaryImage = async (equipoId: string): Promise<EntityImage | undefined> => {
    try {
      const images = await interfaz.getEntityImages('Equipment', equipoId);
      const primary = (images as any[])?.find((img: any) => img.isPrimary);
      return primary || undefined;
    } catch (error) {
      console.error("Error al obtener imagen principal del equipo:", error);
      return undefined;
    }
  };

  const getGlobalEquipos = async (): Promise<Equipment[]> => {
    try {
      const allCurrentEquipos = allEquipos.length > 0 ? allEquipos : (await interfaz.getAllEquipos() as any[] || []);
      if (allEquipos.length === 0 && allCurrentEquipos.length > 0) {
         setAllEquipos(allCurrentEquipos as Equipment[]);
      }
      return allCurrentEquipos.filter(eq => !(eq as any).clinicId);
    } catch (error) {
      console.error("Error al obtener equipos globales:", error);
      return [];
    }
  };

  return (
    <EquipmentContext.Provider value={{
      allEquipos,
      getClinicEquipos,
      getEquipoById,
      addEquipo,
      updateEquipo,
      deleteEquipo,
      refreshEquipos,
      clinics: formattedClinics,
      saveEquipo,
      getEquipoImages,
      getEquipoPrimaryImage,
      getGlobalEquipos,
      loading
    }}>
      {children}
    </EquipmentContext.Provider>
  );
};

export const useEquipment = (): EquipmentContextType => {
  const context = useContext(EquipmentContext);
  if (context === undefined) {
    throw new Error('useEquipment debe ser usado dentro de un EquipmentProvider');
  }
  return context;
}; 