"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useInterfaz } from "./interfaz-Context"
import { Equipo as EquipoModel, EntityImage } from "@/services/data/models/interfaces"

// Definir alias para los tipos usando los tipos del modelo central
export type Equipo = EquipoModel;
export type EquipoImage = EntityImage;

// Tipo extendido para equipo con imágenes
export interface EquipoWithImages extends Equipo {
  images?: Array<{
    id: string;
    url: string;
    isPrimary?: boolean;
    file?: File;
  }>;
}

export interface EquipmentContextType {
  allEquipos: Equipo[]
  getClinicEquipos: (clinicId: string) => Equipo[]
  getEquipoById: (id: string) => Promise<Equipo | null>
  addEquipo: (equipo: Omit<Equipo, 'id'>) => Promise<Equipo>
  updateEquipo: (id: string, data: Partial<Equipo>) => Promise<boolean>
  deleteEquipo: (id: string) => Promise<boolean>
  refreshEquipos: () => Promise<void>
  clinics: Array<{id: string, name: string}>
  saveEquipo: (data: EquipoWithImages) => Promise<boolean>
  getEquipoImages: (equipoId: string) => Promise<EquipoImage[]>
  getEquipoPrimaryImage: (equipoId: string) => Promise<EquipoImage | undefined>
  getEquiposByClinicaId: (clinicId: string) => Promise<Equipo[]>
  getGlobalEquipos: () => Promise<Equipo[]>
  createEquipo: (equipo: Omit<Equipo, 'id'>) => Promise<Equipo>
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(undefined)

export const EquipmentProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [allEquipos, setAllEquipos] = useState<Equipo[]>([])
  const [clinics, setClinics] = useState<Array<{id: string, name: string}>>([])
  const [dataFetched, setDataFetched] = useState(false)
  const interfaz = useInterfaz();

  // Función para disparar eventos de actualización
  const dispatchUpdateEvent = (equipoId: string = '', action: string) => {
    try {
      window.dispatchEvent(new CustomEvent("equipment-updated", {
        detail: { equipoId, action }
      }));
    } catch (eventError) {
      console.error("Error al disparar evento de actualización de equipamiento:", eventError);
      // No bloqueamos la operación principal por un error en el evento
    }
  };

  // Cargar todo el equipamiento al inicializar
  const loadAllEquipos = async () => {
    if (interfaz.initialized && !dataFetched) {
      try {
        // Obtener el equipamiento de todas las clínicas
        const equipos = await interfaz.getAllEquipos();
        setAllEquipos(equipos || []);
        setDataFetched(true);
        console.log("EquipmentContext: Datos cargados correctamente");
      } catch (error) {
        console.error("Error al cargar equipamiento:", error);
        setAllEquipos([]);
      }
    }
  };

  // Cargar clínicas al inicializar
  const loadClinics = async () => {
    if (!interfaz.initialized) {
      return;
    }
    
    try {
      const clinicasData = await interfaz.getActiveClinicas();
      const formattedClinics = clinicasData.map(clinica => ({
        id: clinica.id,
        name: clinica.name
      }));
      setClinics(formattedClinics);
      console.log("EquipmentContext: Clínicas cargadas correctamente");
    } catch (error) {
      console.error("Error al cargar clínicas:", error);
      setClinics([]);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      if (interfaz.initialized && !dataFetched) {
        await loadAllEquipos();
        await loadClinics();
      }
    };
    
    loadData();
    
    // Escuchar eventos de cambio de datos
    const handleEquipmentUpdate = (e: CustomEvent) => {
      const { action } = e.detail;
      if (action) {
        refreshEquipos();
      }
    };
    
    window.addEventListener('equipment-updated' as any, handleEquipmentUpdate);
    return () => {
      window.removeEventListener('equipment-updated' as any, handleEquipmentUpdate);
    };
  }, [interfaz.initialized, dataFetched]);

  // Filtrar equipamiento por clínica
  const getClinicEquipos = (clinicId: string) => {
    if (!allEquipos || allEquipos.length === 0) {
      return [];
    }
    return allEquipos.filter(equip => equip.clinicId.toString() === clinicId);
  };

  // Obtener un equipo por ID
  const getEquipoById = async (id: string): Promise<Equipo | null> => {
    if (!id) {
      console.warn("Se solicitó un equipo con ID vacío");
      return null;
    }
    
    try {
      const equipo = await interfaz.getEquipoById(id);
      
      // Si no se encuentra en la interfaz pero está en nuestro estado local
      if (!equipo) {
        const equipoLocal = allEquipos.find(e => e.id === id);
        if (equipoLocal) {
          console.log("Equipo obtenido del estado local:", id);
          return equipoLocal;
        }
        return null;
      }
      
      return equipo;
    } catch (error) {
      console.error(`Error al obtener equipo ${id}:`, error);
      
      // Intentar recuperar del estado local en caso de error
      const equipoLocal = allEquipos.find(e => e.id === id);
      if (equipoLocal) {
        console.log("Equipo recuperado del estado local tras error:", id);
        return equipoLocal;
      }
      
      return null;
    }
  };

  // Añadir nuevo equipo
  const addEquipo = async (equipoData: Omit<Equipo, 'id'>): Promise<Equipo> => {
    try {
      // Validar datos mínimos
      if (!equipoData.name || !equipoData.code) {
        throw new Error("Nombre y código son campos obligatorios para crear equipamiento");
      }
      
      // Crear el equipo a través de la interfaz
      const newEquipo = await interfaz.createEquipo(equipoData);
      
      if (!newEquipo || !newEquipo.id) {
        throw new Error("No se pudo crear el equipo. Respuesta incompleta del servidor.");
      }
      
      // Actualizar el estado local
      setAllEquipos(prev => [...prev, newEquipo]);
      
      // Notificar cambio
      dispatchUpdateEvent(newEquipo.id, 'create');
      
      return newEquipo;
    } catch (error) {
      console.error("Error al añadir equipo:", error);
      throw error;
    }
  };

  // Actualizar equipo existente
  const updateEquipo = async (id: string, data: Partial<Equipo>): Promise<boolean> => {
    if (!id) {
      console.warn("Se intentó actualizar un equipo con ID vacío");
      return false;
    }
    
    try {
      // Actualizar el equipo a través de la interfaz
      const updated = await interfaz.updateEquipo(id, data);
      
      if (!updated) {
        throw new Error("No se pudo actualizar el equipo.");
      }
      
      // Actualizar el estado local
      setAllEquipos(prev => 
        prev.map(item => item.id === id ? { ...item, ...data } : item)
      );
      
      // Notificar cambio
      dispatchUpdateEvent(id, 'update');
      
      return true;
    } catch (error) {
      console.error("Error al actualizar equipo:", error);
      return false;
    }
  };

  // Eliminar equipo
  const deleteEquipo = async (id: string): Promise<boolean> => {
    if (!id) {
      console.warn("Se intentó eliminar un equipo con ID vacío");
      return false;
    }
    
    try {
      // Eliminar el equipo a través de la interfaz
      const success = await interfaz.deleteEquipo(id);
      
      if (!success) {
        throw new Error("No se pudo eliminar el equipo.");
      }
      
      // Actualizar el estado local
      setAllEquipos(prev => prev.filter(item => item.id !== id));
      
      // Notificar cambio
      dispatchUpdateEvent(id, 'delete');
      
      return true;
    } catch (error) {
      console.error("Error al eliminar equipo:", error);
      return false;
    }
  };

  // Actualizar lista de equipos
  const refreshEquipos = async (): Promise<void> => {
    try {
      const equipos = await interfaz.getAllEquipos();
      setAllEquipos(equipos || []);
      console.log("Lista de equipamiento actualizada");
    } catch (error) {
      console.error("Error al actualizar lista de equipamiento:", error);
    }
  };

  // Guardar equipo con imágenes
  const saveEquipo = async (data: EquipoWithImages): Promise<boolean> => {
    try {
      let equipoId: string;
      
      if (data.id) {
        // Si tiene ID, actualizar equipo existente
        const { id, ...equipoData } = data;
        await updateEquipo(id, equipoData);
        equipoId = id;
      } else {
        // Si no tiene ID, crear nuevo equipo
        const newEquipo = await addEquipo(data as Omit<Equipo, 'id'>);
        equipoId = newEquipo.id;
      }
      
      // Procesar y subir imágenes si existen
      if (data.images && data.images.length > 0 && equipoId) {
        try {
          // Subir cada imagen y crear array de objetos EntityImage
          const uploadedImages: EquipoImage[] = [];
          
          for (let i = 0; i < data.images.length; i++) {
            const image = data.images[i];
            
            // Preparar FormData para subir archivo
            const formData = new FormData();
            formData.append('file', image.file);
            formData.append('entityType', 'equipment');
            formData.append('entityId', equipoId);
            
            // Hacer petición para subir el archivo
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            
            if (!response.ok) {
              console.error(`Error al subir imagen ${i}: ${response.statusText}`);
              continue;
            }
            
            const result = await response.json();
            
            // Crear objeto EntityImage con la respuesta
            const imageData: EquipoImage = {
              id: result.id || `temp-${Date.now()}-${i}`,
              url: result.url,
              isPrimary: i === 0, // La primera imagen será la principal
              path: result.path || ''
            };
            
            uploadedImages.push(imageData);
          }
          
          // Guardar referencias de imágenes
          if (uploadedImages.length > 0) {
            await interfaz.saveEntityImages('equipment', equipoId, uploadedImages);
            dispatchUpdateEvent(equipoId, 'update-images');
          }
        } catch (imageError) {
          console.error("Error al procesar imágenes:", imageError);
          // Continuar aunque haya error con las imágenes
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error al guardar equipo:", error);
      return false;
    }
  };

  // Obtener imágenes de un equipo
  const getEquipoImages = async (equipoId: string): Promise<EquipoImage[]> => {
    if (!equipoId) {
      console.warn("Se solicitaron imágenes con ID de equipo vacío");
      return [];
    }
    
    try {
      const imagenes = await interfaz.getEntityImages('equipment', equipoId);
      return imagenes || [];
    } catch (error) {
      console.error(`Error al obtener imágenes del equipo ${equipoId}:`, error);
      return [];
    }
  };

  // Obtener imagen principal de un equipo
  const getEquipoPrimaryImage = async (equipoId: string): Promise<EquipoImage | undefined> => {
    if (!equipoId) {
      console.warn("Se solicitó imagen principal con ID de equipo vacío");
      return undefined;
    }
    
    try {
      const images = await getEquipoImages(equipoId);
      return images.find(img => img.isPrimary);
    } catch (error) {
      console.error(`Error al obtener imagen principal del equipo ${equipoId}:`, error);
      return undefined;
    }
  };

  // Obtener todos los equipos (ya no hay concepto de "equipos globales")
  const getGlobalEquipos = async (): Promise<Equipo[]> => {
    try {
      if (!interfaz.initialized) {
        console.warn("La interfaz no está inicializada para obtener equipamiento global");
        return [];
      }
      
      // Devolver todos los equipos de todas las clínicas
      return allEquipos;
    } catch (error) {
      console.error("Error al obtener equipamiento global:", error);
      return [];
    }
  };
  
  // Obtener equipos específicos de una clínica
  const getEquiposByClinicaId = async (clinicId: string): Promise<Equipo[]> => {
    try {
      // Obtener equipos específicos para esta clínica
      const equipos = await interfaz.getEquiposByClinicaId(clinicId);
      return equipos;
    } catch (error) {
      console.error("Error al obtener equipos por clínica:", error);
      return [];
    }
  };

  // Crear nuevo equipo - alias para mantener convención de nombres
  const createEquipo = async (equipo: Omit<Equipo, 'id'>): Promise<Equipo> => {
    // Simplemente llamar a nuestro método addEquipo
    return await addEquipo(equipo);
  };

  return (
    <EquipmentContext.Provider
      value={{
        allEquipos,
        getClinicEquipos,
        getEquipoById,
        addEquipo,
        updateEquipo,
        deleteEquipo,
        refreshEquipos,
        clinics,
        saveEquipo,
        getEquipoImages,
        getEquipoPrimaryImage,
        getEquiposByClinicaId,
        getGlobalEquipos,
        createEquipo
      }}
    >
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