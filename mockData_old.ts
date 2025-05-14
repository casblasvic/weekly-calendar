// Este archivo ha sido renombrado a mockData_old.ts
// Los datos se han integrado directamente en prisma/seed.ts
// y este archivo ya no debería ser importado ni utilizado.

/**
 * Este archivo sirve como adaptador temporal para mantener compatibilidad con código existente
 * mientras migramos al nuevo sistema basado en contextos y servicios de datos.
 * 
 * Redirige todas las llamadas a los antiguos métodos de mockData a los nuevos
 * métodos de los contextos respectivos.
 */
// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg; // Obtener constructor y namespace Prisma

// --- Importación de Tipos Específicos de Prisma con alias --- 
import type {
  Clinic as PrismaClinic,
  Tariff as PrismaTariff,
  Category as PrismaCategory, // Assuming FamiliaTarifa maps to Category
  Service as PrismaService,  // Assuming Servicio maps to Service
  VATType as PrismaVATType,  // Assuming TipoIVA maps to VATType
  Equipment as PrismaEquipment, // Assuming Equipo maps to Equipment
  EntityImage as PrismaEntityImage,
  EntityDocument as PrismaEntityDocument,
  // ScheduleBlock, // No direct Prisma equivalent? Maybe ClinicScheduleBlock or ScheduleTemplateBlock?
  // ClinicConfig // No direct Prisma equivalent
} from '@prisma/client';
// --- FIN Importación Tipos Prisma ---

// Importar SOLO la función necesaria del servicio de datos
import { getDataService } from "./services/data/index.ts";

// Definir alias para compatibilidad usando los tipos importados con alias
export type Clinica = PrismaClinic;
export type Tarifa = PrismaTariff;
export type FamiliaTarifa = PrismaCategory;
export type Servicio = PrismaService;
export type TipoIVA = PrismaVATType;
export type Equipo = PrismaEquipment;
export type EntityImage = PrismaEntityImage; // Exportar directamente si el alias es igual
export type EntityDocument = PrismaEntityDocument; // Exportar directamente si el alias es igual
export type ScheduleBlock = any; // Placeholder type - needs review
export type ClinicConfig = any; // Placeholder type - needs review

// --- INICIO: Definición de Datos Iniciales (Mock) --- (YA NO ES LA FUENTE PRINCIPAL)
// Esta sección se mantiene aquí temporalmente pero los datos reales para seed están en prisma/seed.ts
export const initialMockData = {
  // ... (contenido original omitido para brevedad, pero se mantiene en el archivo renombrado)
  // ...
};
// --- FIN: Definición de Datos Iniciales (Mock) ---

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

// Objeto global que solía contener datos mock (YA NO SE USA)
// export const MockData: Record<string, any> = {};

// Funciones adaptadoras: Delegan al servicio de datos real
// Estas funciones PUEDEN seguir siendo usadas por código antiguo,
// por eso se mantienen, pero el objetivo es refactorizar para no usarlas.
export const getClinics = (): Clinica[] => {
  try {
    const dataService = getDataService();
    // Esta función parece intentar obtener datos síncronamente, lo cual puede ser problemático.
    // Devolvemos un array vacío y confiamos en que el contexto se cargará asíncronamente.
    const clinicas: Clinica[] = [];
    dataService.getAllClinicas().then(result => {
      // No modificamos el array devuelto aquí, el contexto se encarga
    }).catch(error => {
      console.error("Error en getClinics (adaptador):");
    });
    return clinicas; // Devolver siempre vacío, confiar en carga asíncrona del contexto
  } catch (error) {
    console.error("Error en getClinics (adaptador):");
    return [];
  }
};

export const getClinic = async (id: string | number): Promise<Clinica | null> => {
  try {
    const dataService = getDataService();
    return await dataService.getClinicaById(String(id));
  } catch (error) {
    console.error(`Error en getClinic (adaptador) (${id}):`);
    return null;
  }
};

export const updateClinic = async (updatedClinic: Clinica): Promise<boolean> => {
  try {
    const dataService = getDataService();
    const result = await dataService.updateClinica(String(updatedClinic.id), updatedClinic);
    return !!result;
  } catch (error) {
    console.error("Error en updateClinic (adaptador):");
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
    
    return await dataService.getBlocksByDateRange(String(clinicId), startDate, endDate);
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

// Variables que eran usadas directamente desde mockData (AHORA OBSOLETAS)
export const mockClinics = [] as Clinica[];

// Evento para cambios en datos (PODRÍA SEGUIR SIENDO USADO POR CÓDIGO ANTIGUO)
export const DATA_CHANGE_EVENT = "storage-updated";

// Funciones de equipment extras
export const addEquipment = async (equipmentData: Equipo): Promise<number> => {
  try {
    const dataService = getDataService();
    const newEquipment = await dataService.createEquipo(equipmentData);
    // CUIDADO: Devolver `newEquipment.id` directamente si es string, o adaptar
    // return parseInt(String(newEquipment.id)); // Puede fallar si ID no es numérico
    return typeof newEquipment.id === 'number' ? newEquipment.id : 0; // Asume ID numérico o devuelve 0
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