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

// --- INICIO: Definición de Datos Iniciales (Mock) ---
// Esta es ahora la fuente central de datos para LocalDataService
export const initialMockData = {
  clinicas: [
    {
      id: 'clinic-1',
      prefix: '000001',
      name: 'Californie Multilaser - Organicare',
      city: 'Casablanca',
      direccion: 'Av. Mohammed VI, 234',
      telefono: '+212 522 123 456',
      email: 'info@californie-multilaser.ma',
      isActive: true,
      config: {
        openTime: '09:00',
        closeTime: '19:00',
        weekendOpenTime: '10:00',
        weekendCloseTime: '14:00',
        saturdayOpen: true,
        sundayOpen: false,
        slotDuration: 15,
        cabins: [
          { id: 1, clinicId: 'clinic-1', code: 'CAB1', name: 'Cabina Láser 1', color: '#4f46e5', isActive: true, order: 1 },
          { id: 2, clinicId: 'clinic-1', code: 'CAB2', name: 'Cabina Estética', color: '#ef4444', isActive: true, order: 2 },
          { id: 3, clinicId: 'clinic-1', code: 'CAB3', name: 'Cabina Tratamientos', color: '#22c55e', isActive: true, order: 3 }
        ],
        schedule: {
          monday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          tuesday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          wednesday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          thursday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          friday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          saturday: { isOpen: true, ranges: [{ start: '10:00', end: '14:00' }] },
          sunday: { isOpen: false, ranges: [] }
        },
        initialCash: 1000,
        appearsInApp: true,
        ticketSize: '80mm',
        rate: 'tarifa-1',
        affectsStats: true,
        scheduleControl: true
      }
    },
    {
      id: 'clinic-2',
      prefix: 'Cafc',
      name: 'Cafc Multilaser',
      city: 'Casablanca',
      direccion: 'Rue Moulay Youssef, 45',
      telefono: '+212 522 789 123',
      email: 'info@cafc-multilaser.ma',
      isActive: true,
      config: {
        openTime: '08:30',
        closeTime: '20:00',
        weekendOpenTime: '09:00',
        weekendCloseTime: '15:00',
        saturdayOpen: true,
        sundayOpen: false,
        slotDuration: 30,
        cabins: [
          { id: 4, clinicId: 'clinic-2', code: 'C1', name: 'Cabina Principal', color: '#f97316', isActive: true, order: 1 },
          { id: 5, clinicId: 'clinic-2', code: 'C2', name: 'Sala de Espera', color: '#6b7280', isActive: false, order: 2 }
        ],
        schedule: {
          monday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          tuesday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          wednesday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          thursday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          friday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          saturday: { isOpen: true, ranges: [{ start: '09:00', end: '15:00' }] },
          sunday: { isOpen: false, ranges: [] }
        },
        initialCash: 1500,
        appearsInApp: true,
        ticketSize: 'a4',
        rate: 'tarifa-2',
        affectsStats: true,
        scheduleControl: false
      }
    },
    {
      id: 'clinic-3',
      prefix: 'TEST',
      name: 'CENTRO TEST',
      city: 'Casablanca',
      direccion: 'Calle Ficticia, 123',
      telefono: '+212 522 999 888',
      email: 'test@centrotest.ma',
      isActive: false, // Inicialmente inactiva
      config: {
        openTime: '08:00',
        closeTime: '20:00',
        weekendOpenTime: '10:00',
        weekendCloseTime: '16:00',
        saturdayOpen: true,
        sundayOpen: false,
        slotDuration: 15,
        cabins: [{ id: 6, clinicId: 'clinic-3', code: 'Tes', name: 'Test Cabin', color: '#10b981', isActive: true, order: 1 }],
        schedule: {
          monday: { isOpen: true, ranges: [{ start: '08:00', end: '20:00' }] },
          tuesday: { isOpen: true, ranges: [{ start: '08:00', end: '20:00' }] },
          wednesday: { isOpen: true, ranges: [{ start: '08:00', end: '20:00' }] },
          thursday: { isOpen: true, ranges: [{ start: '08:00', end: '20:00' }] },
          friday: { isOpen: true, ranges: [{ start: '08:00', end: '20:00' }] },
          saturday: { isOpen: true, ranges: [{ start: '10:00', end: '16:00' }] },
          sunday: { isOpen: false, ranges: [] }
        },
        initialCash: 500,
        appearsInApp: false,
        ticketSize: 'a4',
        rate: 'tarifa-1', // Asociada a tarifa-1
        affectsStats: false,
        scheduleControl: false
      }
    }
  ],
  tarifas: [
    {
      id: 'tarifa-1',
      nombre: 'Tarifa General 2024',
      descripcion: 'Tarifa estándar para todos los servicios',
      clinicaId: 'clinic-1', // Clínica principal
      clinicasIds: ['clinic-1', 'clinic-3'], // Asociada a clinic-1 y clinic-3
      isActive: true
    },
    {
      id: 'tarifa-2',
      nombre: 'Tarifa Premium CAFC',
      descripcion: 'Tarifa especial para clientes de CAFC Multilaser',
      clinicaId: 'clinic-2',
      clinicasIds: ['clinic-2'],
      isActive: true
    }
  ],
  familiasTarifa: [
    { id: 'fam-1', nombre: 'Tratamientos Faciales', descripcion: 'Servicios para el rostro', tarifaId: 'tarifa-1', isActive: true },
    { id: 'fam-2', nombre: 'Tratamientos Corporales', descripcion: 'Servicios para el cuerpo', tarifaId: 'tarifa-1', isActive: true },
    { id: 'fam-3', nombre: 'Depilación Láser', descripcion: 'Servicios de depilación', tarifaId: 'tarifa-1', isActive: true },
    { id: 'fam-4', nombre: 'Servicios CAFC', descripcion: 'Servicios exclusivos CAFC', tarifaId: 'tarifa-2', isActive: true }
  ],
  servicios: [
    // Servicios Tarifa 1
    { id: 'serv-1', codigo: 'S001', nombre: 'Limpieza Facial Profunda', descripcion: 'Limpieza e hidratación', duracion: 60, familiaId: 'fam-1', tarifaId: 'tarifa-1', precio: 500, tipoIvaId: 'iva-1', activo: true, config: {} },
    { id: 'serv-2', codigo: 'S002', nombre: 'Peeling Químico', descripcion: 'Renovación celular', duracion: 45, familiaId: 'fam-1', tarifaId: 'tarifa-1', precio: 700, tipoIvaId: 'iva-1', activo: true, config: {} },
    { id: 'serv-3', codigo: 'S003', nombre: 'Masaje Relajante', descripcion: 'Masaje de cuerpo completo', duracion: 60, familiaId: 'fam-2', tarifaId: 'tarifa-1', precio: 600, tipoIvaId: 'iva-1', activo: true, config: {} },
    { id: 'serv-4', codigo: 'S004', nombre: 'Depilación Piernas Completas', descripcion: 'Láser diodo', duracion: 40, familiaId: 'fam-3', tarifaId: 'tarifa-1', precio: 1200, tipoIvaId: 'iva-1', activo: true, config: {} },
    { id: 'serv-5', codigo: 'S005', nombre: 'Depilación Axilas', descripcion: 'Láser diodo', duracion: 15, familiaId: 'fam-3', tarifaId: 'tarifa-1', precio: 300, tipoIvaId: 'iva-1', activo: true, config: {} },
    // Servicios Tarifa 2
    { id: 'serv-6', codigo: 'S006', nombre: 'Tratamiento Reafirmante CAFC', descripcion: 'Tecnología exclusiva', duracion: 75, familiaId: 'fam-4', tarifaId: 'tarifa-2', precio: 1500, tipoIvaId: 'iva-2', activo: true, config: {} }
  ],
  tiposIVA: [
    { id: 'iva-1', descripcion: 'IVA General', porcentaje: 20.00, tarifaId: 'tarifa-1' },
    { id: 'iva-2', descripcion: 'IVA Reducido', porcentaje: 10.00, tarifaId: 'tarifa-2' }
  ],
  equipos: [
    { id: 'eq-1', clinicId: 'clinic-1', clinicIds: ['clinic-1'], code: 'LASER01', name: 'Láser Diodo LS-1000', description: 'Equipo para depilación', serialNumber: 'LS1000-SN123', purchaseDate: '2023-01-15', warrantyDate: '2025-01-15', supplier: 'LaserTech', status: 'active', config: {}, isActive: true },
    { id: 'eq-2', clinicId: 'clinic-1', clinicIds: ['clinic-1'], code: 'RF01', name: 'Radiofrecuencia RF-Pro', description: 'Equipo para tratamientos faciales', serialNumber: 'RFPRO-SN456', purchaseDate: '2023-03-20', warrantyDate: '2025-03-20', supplier: 'BeautyCorp', status: 'active', config: {}, isActive: true },
    { id: 'eq-3', clinicId: 'clinic-2', clinicIds: ['clinic-2'], code: 'ULTRA01', name: 'Ultrasonido US-500', description: 'Equipo para tratamientos corporales', serialNumber: 'US500-SN789', purchaseDate: '2022-11-10', warrantyDate: '2024-11-10', supplier: 'MedEquip', status: 'active', config: {}, isActive: true }
  ],
  scheduleBlocks: [], // Inicialmente vacío, se poblará dinámicamente
  entityImages: {},
  entityDocuments: {},
  clients: [], // Inicialmente vacío
  scheduleTemplates: [],
  productos: [],
  consumos: [],
  bonos: [] // Array vacío para almacenar los bonos
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

// Objeto global que solía contener datos mock
// export const MockData: Record<string, any> = {}; // Comentado: Usar initialMockData en su lugar

// Funciones adaptadoras: Delegan al servicio de datos real
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

// Variables que eran usadas directamente desde mockData
export const mockClinics = [] as Clinica[];

// Evento para cambios en datos
export const DATA_CHANGE_EVENT = "storage-updated";

// Funciones de equipment extras
export const addEquipment = async (equipmentData: Equipo): Promise<number> => {
  try {
    const dataService = getDataService();
    const newEquipment = await dataService.createEquipo(equipmentData);
    return parseInt(String(newEquipment.id));
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