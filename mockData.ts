/**
 * Este archivo sirve como adaptador temporal para mantener compatibilidad con código existente
 * mientras migramos al nuevo sistema basado en contextos y servicios de datos.
 * 
 * Redirige todas las llamadas a los antiguos métodos de mockData a los nuevos
 * métodos de los contextos respectivos.
 */

import {
  useInterfaz,
  Clinica,
  Tarifa,
  FamiliaTarifa,
  Servicio,
  TipoIVA,
  Equipo,
  ScheduleBlock,
  EntityImage,
  EntityDocument,
  ClinicConfig
} from "@/contexts/interfaz-Context";
import { getDataService } from "@/services/data";

// Re-exportamos los tipos para mantener compatibilidad
export type {
  Clinica,
  Tarifa,
  FamiliaTarifa,
  Servicio,
  TipoIVA,
  Equipo,
  ScheduleBlock,
  EntityImage,
  EntityDocument,
  ClinicConfig
};

// Tipo Clinic para compatibilidad con código existente
export type Clinic = Clinica;

// Tipo Cabin para compatibilidad
export interface Cabin {
  id: number | string;
  clinicId: number;
  code: string;
  name: string;
  color: string;
  isActive: boolean;
  order: number;
}

// Objeto global que solía contener datos mock
export const MockData: Record<string, any> = {};

// Funciones relacionadas con Clínicas
export const getClinics = (): Clinica[] => {
  try {
    const dataService = getDataService();
    // Devolver un array vacío en caso de que la llamada asíncrona falle
    const clinicas: Clinica[] = [];
    
    // Realizar la llamada asíncrona, pero devolver inmediatamente el array vacío
    dataService.getAllClinicas()
      .then(result => {
        // Si hay resultados, actualizamos el array en el siguiente ciclo
        if (result && result.length > 0) {
          clinicas.push(...result);
        }
      })
      .catch(error => {
        console.error("Error en getClinics:", error);
      });
    
    // Devolver el array que puede estar vacío inicialmente
    return clinicas;
  } catch (error) {
    console.error("Error en getClinics:", error);
    return [];
  }
};

export const getClinic = async (id: string | number): Promise<Clinica | null> => {
  try {
    const dataService = getDataService();
    return await dataService.getClinicaById(String(id));
  } catch (error) {
    console.error(`Error en getClinic(${id}):`, error);
    return null;
  }
};

export const updateClinic = async (updatedClinic: Clinica): Promise<boolean> => {
  try {
    const dataService = getDataService();
    const result = await dataService.updateClinica(updatedClinic.id, updatedClinic);
    return !!result;
  } catch (error) {
    console.error("Error en updateClinic:", error);
    return false;
  }
};

// Funciones relacionadas con Equipamiento
export const getEquipment = async (clinicId: string | number): Promise<Equipo[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEquiposByClinicaId(String(clinicId));
  } catch (error) {
    console.error(`Error en getEquipment(${clinicId}):`, error);
    return [];
  }
};

export const getEquipmentImages = async (equipmentId: string): Promise<EntityImage[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEntityImages('equipo', equipmentId);
  } catch (error) {
    console.error(`Error en getEquipmentImages(${equipmentId}):`, error);
    return [];
  }
};

// Funciones relacionadas con Servicios
export const getServiceImages = async (serviceId: string): Promise<EntityImage[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEntityImages('servicio', serviceId);
  } catch (error) {
    console.error(`Error en getServiceImages(${serviceId}):`, error);
    return [];
  }
};

export const saveServiceImages = async (serviceId: string, images: EntityImage[]): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.saveEntityImages('servicio', serviceId, images);
  } catch (error) {
    console.error(`Error en saveServiceImages(${serviceId}):`, error);
    return false;
  }
};

export const getServiceDocuments = async (serviceId: string, category?: string): Promise<EntityDocument[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEntityDocuments('servicio', serviceId, category);
  } catch (error) {
    console.error(`Error en getServiceDocuments(${serviceId}):`, error);
    return [];
  }
};

export const saveServiceDocuments = async (serviceId: string, documents: EntityDocument[], category?: string): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.saveEntityDocuments('servicio', serviceId, documents, category);
  } catch (error) {
    console.error(`Error en saveServiceDocuments(${serviceId}):`, error);
    return false;
  }
};

// Funciones relacionadas con bloques de horario
export const getScheduleBlocks = async (clinicId: number, startDate?: string, endDate?: string): Promise<ScheduleBlock[]> => {
  try {
    const dataService = getDataService();
    
    // Si no se proporcionan fechas, obtener todos los bloques
    if (!startDate || !endDate) {
      // Calcular fechas por defecto (una semana)
      const today = new Date();
      const formattedToday = today.toISOString().split('T')[0];
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const formattedNextWeek = nextWeek.toISOString().split('T')[0];
      
      startDate = startDate || formattedToday;
      endDate = endDate || formattedNextWeek;
    }
    
    return await dataService.getBlocksByDateRange(clinicId, startDate, endDate);
  } catch (error) {
    console.error(`Error en getScheduleBlocks(${clinicId}, ${startDate}, ${endDate}):`, error);
    return [];
  }
};

export const createScheduleBlock = async (block: Omit<ScheduleBlock, "id">): Promise<ScheduleBlock> => {
  try {
    const dataService = getDataService();
    return await dataService.createScheduleBlock(block);
  } catch (error) {
    console.error("Error en createScheduleBlock:", error);
    throw error;
  }
};

export const updateScheduleBlock = async (id: string, block: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> => {
  try {
    const dataService = getDataService();
    return await dataService.updateScheduleBlock(id, block);
  } catch (error) {
    console.error(`Error en updateScheduleBlock(${id}):`, error);
    return null;
  }
};

export const deleteScheduleBlock = async (id: string): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.deleteScheduleBlock(id);
  } catch (error) {
    console.error(`Error en deleteScheduleBlock(${id}):`, error);
    return false;
  }
};

// Variables que eran usadas directamente desde mockData
export const mockClinics = [] as Clinica[];

// Evento para cambios en datos
export const DATA_CHANGE_EVENT = "storage-updated";

// Funciones de equipment extras
export const addEquipment = async (equipmentData: Equipo): Promise<number> => {
  try {
    const dataService = getDataService();
    const newEquipment = await dataService.createEquipo(equipmentData);
    return parseInt(newEquipment.id);
  } catch (error) {
    console.error("Error en addEquipment:", error);
    return 0;
  }
};

export const updateEquipment = async (id: string, equipmentData: Partial<Equipo>): Promise<boolean> => {
  try {
    const dataService = getDataService();
    const result = await dataService.updateEquipo(id, equipmentData);
    return !!result;
  } catch (error) {
    console.error(`Error en updateEquipment(${id}):`, error);
    return false;
  }
};

export const deleteEquipment = async (id: string): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.deleteEquipo(id);
  } catch (error) {
    console.error(`Error en deleteEquipment(${id}):`, error);
    return false;
  }
};

// Imagen extras
export const getEntityImages = async (entityType: string, entityId: string): Promise<EntityImage[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEntityImages(entityType, entityId);
  } catch (error) {
    console.error(`Error en getEntityImages(${entityType}, ${entityId}):`, error);
    return [];
  }
};

export const saveEntityImages = async (entityType: string, entityId: string, images: EntityImage[]): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.saveEntityImages(entityType, entityId, images);
  } catch (error) {
    console.error(`Error en saveEntityImages(${entityType}, ${entityId}):`, error);
    return false;
  }
};

export const getTarifaImages = async (tarifaId: string): Promise<EntityImage[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEntityImages('tarifa', tarifaId);
  } catch (error) {
    console.error(`Error en getTarifaImages(${tarifaId}):`, error);
    return [];
  }
};

export const saveTarifaImages = async (tarifaId: string, images: EntityImage[]): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.saveEntityImages('tarifa', tarifaId, images);
  } catch (error) {
    console.error(`Error en saveTarifaImages(${tarifaId}):`, error);
    return false;
  }
};

export const getClientImages = async (clientId: string): Promise<EntityImage[]> => {
  try {
    const dataService = getDataService();
    return await dataService.getEntityImages('client', clientId);
  } catch (error) {
    console.error(`Error en getClientImages(${clientId}):`, error);
    return [];
  }
};

export const saveClientImages = async (clientId: string, images: EntityImage[]): Promise<boolean> => {
  try {
    const dataService = getDataService();
    return await dataService.saveEntityImages('client', clientId, images);
  } catch (error) {
    console.error(`Error en saveClientImages(${clientId}):`, error);
    return false;
  }
};

// Exportar alias de funciones para equipment para compatibilidad
export const addEquipmentMock = addEquipment;
export const updateEquipmentMock = updateEquipment;
export const deleteEquipmentMock = deleteEquipment; 