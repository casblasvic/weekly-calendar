/**
 * Implementación del servicio de datos que utiliza localStorage
 * Esta implementación se utiliza durante el desarrollo y para demostraciones
 * En producción, se reemplazará por una implementación que utilice una API real
 */

import { DataService } from './data-service';
import {
  BaseEntity,
  Clinica,
  EntityDocument,
  EntityImage,
  Equipo,
  FamiliaTarifa,
  ScheduleBlock,
  Servicio,
  Tarifa,
  TipoIVA,
  Producto,
  Consumo
} from './models/interfaces';
import {
  Client
} from './data-service';
// Importar los datos iniciales desde mockData.ts
import { initialMockData } from '@/mockData';

/**
 * Generador de IDs secuenciales para entidades
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Implementación del servicio de datos que utiliza almacenamiento en memoria
 */
export class LocalDataService implements DataService {
  private data: {
    clinicas: Clinica[];
    tarifas: Tarifa[];
    familiasTarifa: FamiliaTarifa[];
    servicios: Servicio[];
    tiposIVA: TipoIVA[];
    equipos: Equipo[];
    scheduleBlocks: ScheduleBlock[];
    entityImages: Record<string, Record<string, EntityImage[]>>;
    entityDocuments: Record<string, Record<string, Record<string, EntityDocument[]>>>;
    clients: Client[];
    scheduleTemplates: any[];
    productos: Producto[];
  };

  private initialized: boolean = false;

  constructor() {
    // Inicializar con datos vacíos, se llenarán en initialize()
    this.data = {
      clinicas: [],
      tarifas: [],
      familiasTarifa: [],
      servicios: [],
      tiposIVA: [],
      equipos: [],
      scheduleBlocks: [],
      entityImages: {},
      entityDocuments: {},
      clients: [],
      scheduleTemplates: [],
      productos: []
    };
  }

  /**
   * Inicializa el servicio de datos cargando los datos iniciales en memoria
   * desde mockData.ts
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Cargar datos iniciales desde mockData haciendo una copia profunda
      this.data = JSON.parse(JSON.stringify(initialMockData));
      this.initialized = true;
      console.log('LocalDataService: Inicializado con copia de initialMockData importado.');
    } catch (error) {
      console.error('Error al inicializar LocalDataService:', error);
      // Mantener datos vacíos en caso de error
      this.data = { clinicas: [], tarifas: [], familiasTarifa: [], servicios: [], tiposIVA: [], equipos: [], scheduleBlocks: [], entityImages: {}, entityDocuments: {}, clients: [], scheduleTemplates: [], productos: [] };
      throw error;
    }
  }

  /**
   * Guarda los datos (simulado, solo opera en memoria)
   */
  private saveData(): void {
    // En esta implementación local, no hay persistencia real más allá de la memoria.
    // Si se quisiera guardar en localStorage o un archivo, se haría aquí.
    console.log('[LocalDataService] Datos actualizados en memoria (no persistente).');
  }

  /**
   * Limpia todos los datos y fuerza la recarga de los datos iniciales
   */
  async clearStorageAndReloadData(): Promise<void> {
    try {
      // Reiniciar los datos cargando de nuevo la copia inicial
      this.data = JSON.parse(JSON.stringify(initialMockData));
      console.log('[LocalDataService] Datos reiniciados a partir de initialMockData.');
    } catch (error) {
      console.error('Error al reiniciar los datos locales:', error);
      throw error;
    }
  }

  // #region Operaciones con imágenes
  
  async getEntityImages(entityType: string, entityId: string): Promise<EntityImage[]> {
    if (!this.data.entityImages[entityType] || !this.data.entityImages[entityType][entityId]) {
      return [];
    }
    return this.data.entityImages[entityType][entityId];
  }

  async saveEntityImages(entityType: string, entityId: string, images: EntityImage[]): Promise<boolean> {
    try {
      if (!this.data.entityImages[entityType]) {
        this.data.entityImages[entityType] = {};
      }
      this.data.entityImages[entityType][entityId] = images;
      this.saveData();
      return true;
    } catch (error) {
      console.error('Error al guardar imágenes:', error);
      return false;
    }
  }

  async deleteEntityImages(entityType: string, entityId: string): Promise<boolean> {
    try {
      if (this.data.entityImages[entityType] && this.data.entityImages[entityType][entityId]) {
        delete this.data.entityImages[entityType][entityId];
        this.saveData();
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar imágenes:', error);
      return false;
    }
  }
  
  // #endregion

  // #region Operaciones con documentos
  
  async getEntityDocuments(entityType: string, entityId: string, category: string = 'default'): Promise<EntityDocument[]> {
    if (!this.data.entityDocuments[entityType] || 
        !this.data.entityDocuments[entityType][entityId] ||
        !this.data.entityDocuments[entityType][entityId][category]) {
      return [];
    }
    return this.data.entityDocuments[entityType][entityId][category];
  }

  async saveEntityDocuments(entityType: string, entityId: string, documents: EntityDocument[], category: string = 'default'): Promise<boolean> {
    try {
      if (!this.data.entityDocuments[entityType]) {
        this.data.entityDocuments[entityType] = {};
      }
      if (!this.data.entityDocuments[entityType][entityId]) {
        this.data.entityDocuments[entityType][entityId] = {};
      }
      this.data.entityDocuments[entityType][entityId][category] = documents;
      this.saveData();
      return true;
    } catch (error) {
      console.error('Error al guardar documentos:', error);
      return false;
    }
  }

  async deleteEntityDocuments(entityType: string, entityId: string, category?: string): Promise<boolean> {
    try {
      if (!this.data.entityDocuments[entityType] || !this.data.entityDocuments[entityType][entityId]) {
        return true;
      }
      
      if (category) {
        if (this.data.entityDocuments[entityType][entityId][category]) {
          delete this.data.entityDocuments[entityType][entityId][category];
        }
      } else {
        delete this.data.entityDocuments[entityType][entityId];
      }
      
      this.saveData();
      return true;
    } catch (error) {
      console.error('Error al eliminar documentos:', error);
      return false;
    }
  }
  
  // #endregion

  // #region Operaciones de Clínicas
  
  async getAllClinicas(): Promise<Clinica[]> {
    return JSON.parse(JSON.stringify(this.data.clinicas)); // Devolver copia
  }

  async getClinicaById(id: string): Promise<Clinica | null> {
    const clinica = this.data.clinicas.find(c => String(c.id) === String(id));
    return clinica ? JSON.parse(JSON.stringify(clinica)) : null; // Devolver copia
  }

  async createClinica(clinica: Omit<Clinica, 'id'>): Promise<Clinica> {
    const newClinica = { ...clinica, id: generateId('clinic') } as Clinica;
    this.data.clinicas.push(newClinica);
    this.saveData();
    return JSON.parse(JSON.stringify(newClinica)); // Devolver copia
  }

  async updateClinica(id: string, clinica: Partial<Clinica>): Promise<Clinica | null> {
    console.log(`[LocalDataService] Intentando actualizar clínica con ID: ${id} (Tipo: ${typeof id})`);
    
    const index = this.data.clinicas.findIndex(c => {
      console.log(`[LocalDataService] Comparando: ${c.id} (Tipo: ${typeof c.id}) === ${id} (Tipo: ${typeof id})`);
      // Comparación robusta como string
      return String(c.id) === String(id);
    });

    if (index === -1) {
      console.error(`[LocalDataService] Clínica con ID ${id} NO ENCONTRADA en this.data.clinicas.`);
      console.log("[LocalDataService] IDs disponibles:", this.data.clinicas.map(c => c.id));
      return null;
    }
    
    console.log(`[LocalDataService] Clínica encontrada en índice ${index}. Actualizando...`);
    this.data.clinicas[index] = { ...this.data.clinicas[index], ...clinica };
    this.saveData();
    console.log("[LocalDataService] Clínica actualizada, devolviendo copia:", this.data.clinicas[index]);
    return JSON.parse(JSON.stringify(this.data.clinicas[index])); // Devolver copia
  }

  async deleteClinica(id: string): Promise<boolean> {
    const initialLength = this.data.clinicas.length;
    this.data.clinicas = this.data.clinicas.filter(c => c.id !== id);
    const deleted = initialLength > this.data.clinicas.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  async getActiveClinicas(): Promise<Clinica[]> {
    const active = this.data.clinicas.filter(c => c.isActive);
    return JSON.parse(JSON.stringify(active)); // Devolver copia
  }
  
  // #endregion

  // #region Operaciones de Tarifas
  
  async getAllTarifas(): Promise<Tarifa[]> {
    return JSON.parse(JSON.stringify(this.data.tarifas)); // Devolver copia
  }

  async getTarifaById(id: string): Promise<Tarifa | null> {
    const tarifa = this.data.tarifas.find(t => t.id === id);
    return tarifa ? JSON.parse(JSON.stringify(tarifa)) : null; // Devolver copia
  }

  async createTarifa(tarifa: Omit<Tarifa, 'id'>): Promise<Tarifa> {
    const newTarifa = { ...tarifa, id: generateId('tarifa') } as Tarifa;
    
    // Asegurar que clinicasIds sea un array
    if (!newTarifa.clinicasIds) {
      newTarifa.clinicasIds = [];
    }
    
    // Si hay clinicaId pero no está en clinicasIds, añadirla
    if (newTarifa.clinicaId && !newTarifa.clinicasIds.includes(newTarifa.clinicaId)) {
      newTarifa.clinicasIds.push(newTarifa.clinicaId);
    }
    
    this.data.tarifas.push(newTarifa);
    this.saveData();
    return JSON.parse(JSON.stringify(newTarifa)); // Devolver copia
  }

  async updateTarifa(id: string, tarifa: Partial<Tarifa>): Promise<Tarifa | null> {
    const index = this.data.tarifas.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    // Actualizar tarifa existente
    const updatedTarifa = { ...this.data.tarifas[index], ...tarifa };
    
    // Asegurar coherencia entre clinicaId y clinicasIds
    if (updatedTarifa.clinicaId && updatedTarifa.clinicasIds && 
        !updatedTarifa.clinicasIds.includes(updatedTarifa.clinicaId)) {
      updatedTarifa.clinicasIds.push(updatedTarifa.clinicaId);
    }
    
    this.data.tarifas[index] = updatedTarifa;
    this.saveData();
    return JSON.parse(JSON.stringify(updatedTarifa)); // Devolver copia
  }

  async deleteTarifa(id: string): Promise<boolean> {
    const initialLength = this.data.tarifas.length;
    this.data.tarifas = this.data.tarifas.filter(t => t.id !== id);
    const deleted = initialLength > this.data.tarifas.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  async getTarifasByClinicaId(clinicaId: string): Promise<Tarifa[]> {
    return this.data.tarifas.filter(t => 
      t.clinicaId === clinicaId || 
      (t.clinicasIds && t.clinicasIds.includes(clinicaId))
    );
  }

  async addClinicaToTarifa(tarifaId: string, clinicaId: string, isPrimary: boolean = false): Promise<boolean> {
    const tarifa = await this.getTarifaById(tarifaId);
    if (!tarifa) return false;
    
    // Clonar para evitar mutaciones
    const clinicasIds = [...(tarifa.clinicasIds || [])];
    
    // Añadir clínica si no existe ya
    if (!clinicasIds.includes(clinicaId)) {
      clinicasIds.push(clinicaId);
    }
    
    // Actualizar datos
    const updateData: Partial<Tarifa> = { clinicasIds };
    
    // Si es primaria o no hay clínica primaria, establecerla como primaria
    if (isPrimary || !tarifa.clinicaId) {
      updateData.clinicaId = clinicaId;
    }
    
    await this.updateTarifa(tarifaId, updateData);
    return true;
  }

  async removeClinicaFromTarifa(tarifaId: string, clinicaId: string): Promise<boolean> {
    const tarifa = await this.getTarifaById(tarifaId);
    if (!tarifa) return false;
    
    // Clonar para evitar mutaciones
    const clinicasIds = [...(tarifa.clinicasIds || [])];
    
    // Verificar si la clínica está asociada
    if (!clinicasIds.includes(clinicaId)) {
      return true; // No hay cambios necesarios
    }
    
    // Eliminar la clínica de la lista
    const newClinicasIds = clinicasIds.filter(id => id !== clinicaId);
    
    // Preparar datos para actualizar
    const updateData: Partial<Tarifa> = { clinicasIds: newClinicasIds };
    
    // Si era la clínica primaria, establecer otra como primaria
    if (tarifa.clinicaId === clinicaId) {
      if (newClinicasIds.length > 0) {
        // Usar la primera clínica disponible como principal
        updateData.clinicaId = newClinicasIds[0];
      } else {
        // Si no hay más clínicas, limpiar clinicaId
        updateData.clinicaId = "";
      }
    }
    
    await this.updateTarifa(tarifaId, updateData);
    return true;
  }

  async setPrimaryClinicaForTarifa(tarifaId: string, clinicaId: string): Promise<boolean> {
    const tarifa = await this.getTarifaById(tarifaId);
    if (!tarifa) return false;
    
    // Clonar para evitar mutaciones
    const clinicasIds = [...(tarifa.clinicasIds || [])];
    
    // Verificar si la clínica está asociada
    if (!clinicasIds.includes(clinicaId)) {
      // Si la clínica no está asociada, añadirla primero
      clinicasIds.push(clinicaId);
    }
    
    // Actualizar con nueva clínica primaria
    await this.updateTarifa(tarifaId, { 
      clinicaId,
      clinicasIds
    });
    
    return true;
  }
  
  // #endregion

  // #region Operaciones de Familias de Tarifas
  
  async getAllFamiliasTarifa(): Promise<FamiliaTarifa[]> {
    return JSON.parse(JSON.stringify(this.data.familiasTarifa)); // Devolver copia
  }

  async getFamiliaTarifaById(id: string): Promise<FamiliaTarifa | null> {
    const familia = this.data.familiasTarifa.find(f => f.id === id);
    return familia ? JSON.parse(JSON.stringify(familia)) : null; // Devolver copia
  }

  async createFamiliaTarifa(familia: Omit<FamiliaTarifa, 'id'>): Promise<FamiliaTarifa> {
    const newFamilia = { ...familia, id: generateId('familia') } as FamiliaTarifa;
    this.data.familiasTarifa.push(newFamilia);
    this.saveData();
    return JSON.parse(JSON.stringify(newFamilia)); // Devolver copia
  }

  async updateFamiliaTarifa(id: string, familia: Partial<FamiliaTarifa>): Promise<FamiliaTarifa | null> {
    const index = this.data.familiasTarifa.findIndex(f => f.id === id);
    if (index === -1) return null;
    
    this.data.familiasTarifa[index] = { ...this.data.familiasTarifa[index], ...familia };
    this.saveData();
    return JSON.parse(JSON.stringify(this.data.familiasTarifa[index])); // Devolver copia
  }

  async deleteFamiliaTarifa(id: string): Promise<boolean> {
    const initialLength = this.data.familiasTarifa.length;
    this.data.familiasTarifa = this.data.familiasTarifa.filter(f => f.id !== id);
    const deleted = initialLength > this.data.familiasTarifa.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  async getFamiliasByTarifaId(tarifaId: string): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa.filter(f => f.tarifaId === tarifaId);
  }

  async getRootFamilias(tarifaId: string): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa.filter(f => 
      f.parentId === null && f.tarifaId === tarifaId
    );
  }

  async getSubfamilias(parentId: string): Promise<FamiliaTarifa[]> {
    return this.data.familiasTarifa.filter(f => f.parentId === parentId);
  }

  async toggleFamiliaStatus(id: string): Promise<boolean> {
    const familia = await this.getFamiliaTarifaById(id);
    if (!familia) return false;
    
    await this.updateFamiliaTarifa(id, { isActive: !familia.isActive });
    return true;
  }
  
  // #endregion

  // #region Operaciones de Servicios
  
  async getAllServicios(): Promise<Servicio[]> {
    return JSON.parse(JSON.stringify(this.data.servicios)); // Devolver copia
  }

  async getServicioById(id: string): Promise<Servicio | null> {
    const servicio = this.data.servicios.find(s => s.id === id);
    return servicio ? JSON.parse(JSON.stringify(servicio)) : null; // Devolver copia
  }

  async createServicio(servicio: Omit<Servicio, 'id'>): Promise<Servicio> {
    const newServicio = { ...servicio, id: generateId('srv') } as Servicio;
    
    // Asegurar que consumos sea un array
    if (!newServicio.consumos) {
      newServicio.consumos = [];
    }
    
    this.data.servicios.push(newServicio);
    this.saveData();
    return JSON.parse(JSON.stringify(newServicio)); // Devolver copia
  }

  async updateServicio(id: string, servicio: Partial<Servicio>): Promise<Servicio | null> {
    const index = this.data.servicios.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.data.servicios[index] = { ...this.data.servicios[index], ...servicio };
    this.saveData();
    return JSON.parse(JSON.stringify(this.data.servicios[index])); // Devolver copia
  }

  async deleteServicio(id: string): Promise<boolean> {
    const initialLength = this.data.servicios.length;
    this.data.servicios = this.data.servicios.filter(s => s.id !== id);
    const deleted = initialLength > this.data.servicios.length;
    
    if (deleted) {
      this.saveData();
      
      // Eliminar imágenes y documentos asociados
      await this.deleteEntityImages('servicio', id);
      await this.deleteEntityDocuments('servicio', id);
    }
    
    return deleted;
  }

  async getServiciosByTarifaId(tarifaId: string): Promise<Servicio[]> {
    return this.data.servicios.filter(s => s.tarifaId === tarifaId);
  }
  
  // #endregion

  // #region Operaciones de Tipos de IVA
  
  async getAllTiposIVA(): Promise<TipoIVA[]> {
    return JSON.parse(JSON.stringify(this.data.tiposIVA)); // Devolver copia
  }

  async getTipoIVAById(id: string): Promise<TipoIVA | null> {
    const tipoIVA = this.data.tiposIVA.find(t => t.id === id);
    return tipoIVA ? JSON.parse(JSON.stringify(tipoIVA)) : null; // Devolver copia
  }

  async createTipoIVA(tipoIVA: Omit<TipoIVA, 'id'>): Promise<TipoIVA> {
    const newTipoIVA = { ...tipoIVA, id: generateId('iva') } as TipoIVA;
    this.data.tiposIVA.push(newTipoIVA);
    this.saveData();
    return JSON.parse(JSON.stringify(newTipoIVA)); // Devolver copia
  }

  async updateTipoIVA(id: string, tipoIVA: Partial<TipoIVA>): Promise<TipoIVA | null> {
    const index = this.data.tiposIVA.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.data.tiposIVA[index] = { ...this.data.tiposIVA[index], ...tipoIVA };
    this.saveData();
    return JSON.parse(JSON.stringify(this.data.tiposIVA[index])); // Devolver copia
  }

  async deleteTipoIVA(id: string): Promise<boolean> {
    const initialLength = this.data.tiposIVA.length;
    this.data.tiposIVA = this.data.tiposIVA.filter(t => t.id !== id);
    const deleted = initialLength > this.data.tiposIVA.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  async getTiposIVAByTarifaId(tarifaId: string): Promise<TipoIVA[]> {
    return this.data.tiposIVA.filter(t => t.tarifaId === tarifaId);
  }
  
  // #endregion

  // #region Operaciones de Equipos
  
  async getAllEquipos(): Promise<Equipo[]> {
    return JSON.parse(JSON.stringify(this.data.equipos)); // Devolver copia
  }

  async getEquipoById(id: string): Promise<Equipo | null> {
    const equipo = this.data.equipos.find(e => e.id === id);
    return equipo ? JSON.parse(JSON.stringify(equipo)) : null; // Devolver copia
  }

  async createEquipo(equipo: Omit<Equipo, 'id'>): Promise<Equipo> {
    const newEquipo = { ...equipo, id: generateId('equipo') } as Equipo;
    this.data.equipos.push(newEquipo);
    this.saveData();
    return JSON.parse(JSON.stringify(newEquipo)); // Devolver copia
  }

  async updateEquipo(id: string, equipo: Partial<Equipo>): Promise<Equipo | null> {
    const index = this.data.equipos.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    this.data.equipos[index] = { ...this.data.equipos[index], ...equipo };
    this.saveData();
    return JSON.parse(JSON.stringify(this.data.equipos[index])); // Devolver copia
  }

  async deleteEquipo(id: string): Promise<boolean> {
    const initialLength = this.data.equipos.length;
    this.data.equipos = this.data.equipos.filter(e => e.id !== id);
    const deleted = initialLength > this.data.equipos.length;
    
    if (deleted) {
      this.saveData();
      
      // Eliminar imágenes asociadas
      await this.deleteEntityImages('equipo', id);
    }
    
    return deleted;
  }

  async getEquiposByClinicaId(clinicaId: string): Promise<Equipo[]> {
    try {
      // Ahora trabajamos directamente con string para el ID de la clínica
      const allEquipos = await this.getAllEquipos();
      return allEquipos.filter(equipo => equipo.clinicId === clinicaId);
    } catch (error) {
      console.error("Error en getEquiposByClinicaId:", error);
      return [];
    }
  }
  
  // #endregion

  // #region Operaciones de Bloques de Agenda
  
  async getAllScheduleBlocks(): Promise<ScheduleBlock[]> {
    return JSON.parse(JSON.stringify(this.data.scheduleBlocks)); // Devolver copia
  }

  async getScheduleBlockById(id: string): Promise<ScheduleBlock | null> {
    const block = this.data.scheduleBlocks.find(b => b.id === id);
    return block ? JSON.parse(JSON.stringify(block)) : null; // Devolver copia
  }

  async createScheduleBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    const newBlock = { 
      ...block, 
      id: generateId('block'),
      createdAt: new Date().toISOString()
    } as ScheduleBlock;
    
    this.data.scheduleBlocks.push(newBlock);
    this.saveData();
    return JSON.parse(JSON.stringify(newBlock)); // Devolver copia
  }

  async updateScheduleBlock(id: string, block: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> {
    const index = this.data.scheduleBlocks.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    this.data.scheduleBlocks[index] = { ...this.data.scheduleBlocks[index], ...block };
    this.saveData();
    return JSON.parse(JSON.stringify(this.data.scheduleBlocks[index])); // Devolver copia
  }

  async deleteScheduleBlock(id: string): Promise<boolean> {
    const initialLength = this.data.scheduleBlocks.length;
    this.data.scheduleBlocks = this.data.scheduleBlocks.filter(b => b.id !== id);
    const deleted = initialLength > this.data.scheduleBlocks.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  async getBlocksByDateRange(clinicId: string, startDate: string, endDate: string): Promise<ScheduleBlock[]> {
    return this.data.scheduleBlocks.filter(block => {
      // Filtrar por clínica comparando como string
      if (block.clinicId.toString() !== clinicId) return false;
      
      // Filtrar por rango de fechas
      const blockDate = new Date(block.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return blockDate >= start && blockDate <= end;
    });
  }
  
  // #endregion

  // Implementación de métodos para clientes
  async getAllClients(): Promise<Client[]> {
    try {
      // Intentar cargar clientes desde localStorage
      const storedData = localStorage.getItem('clients');
      if (storedData) {
        return JSON.parse(storedData);
      }
      return [];
    } catch (error) {
      console.error("Error en getAllClients:", error);
      return [];
    }
  }

  async getClientById(id: string): Promise<Client | null> {
    try {
      const clients = await this.getAllClients();
      const client = clients.find(c => c.id === id);
      if (!client) {
        // Si no se encuentra el cliente, crear uno de ejemplo para desarrollo
        return {
          id,
          name: "Cliente de ejemplo",
          clientNumber: "CL-" + id,
          phone: "555-123-4567",
          email: "ejemplo@mail.com",
          clinic: "Clínica Principal",
          clinicId: "1",
          address: "Dirección de ejemplo",
          birthDate: "1990-01-01",
          notes: "Notas de ejemplo",
          visits: []
        };
      }
      return client;
    } catch (error) {
      console.error(`Error en getClientById(${id}):`, error);
      return null;
    }
  }

  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    try {
      const clients = await this.getAllClients();
      const newId = Date.now().toString();
      const newClient: Client = {
        ...client,
        id: newId
      };
      
      // Guardar en localStorage y en la estructura de datos en memoria
      try {
        const updatedClients = [...clients, newClient];
        localStorage.setItem('clients', JSON.stringify(updatedClients));
        this.data.clients = updatedClients;
        this.saveData(); // Para asegurar consistencia con el resto de datos
      } catch (error) {
        console.error("Error al guardar cliente:", error);
        throw error;
      }
      
      return newClient;
    } catch (error) {
      console.error("Error en createClient:", error);
      throw new Error("No se pudo crear el cliente");
    }
  }

  async updateClient(id: string, client: Partial<Client>): Promise<Client | null> {
    try {
      const clients = await this.getAllClients();
      const index = clients.findIndex(c => c.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const updatedClient = {
        ...clients[index],
        ...client
      };
      
      clients[index] = updatedClient;
      
      // Guardar en localStorage y en la estructura de datos en memoria
      try {
        localStorage.setItem('clients', JSON.stringify(clients));
        this.data.clients = clients;
        this.saveData(); // Para asegurar consistencia con el resto de datos
      } catch (error) {
        console.error(`Error al actualizar cliente ${id}:`, error);
        throw error;
      }
      
      return updatedClient;
    } catch (error) {
      console.error(`Error en updateClient(${id}):`, error);
      return null;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      const clients = await this.getAllClients();
      const filteredClients = clients.filter(c => c.id !== id);
      
      if (filteredClients.length === clients.length) {
        return false; // No se encontró el cliente
      }
      
      // Guardar en localStorage y en la estructura de datos en memoria
      try {
        localStorage.setItem('clients', JSON.stringify(filteredClients));
        this.data.clients = filteredClients;
        this.saveData(); // Para asegurar consistencia con el resto de datos
      } catch (error) {
        console.error(`Error al eliminar cliente ${id}:`, error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Error en deleteClient(${id}):`, error);
      return false;
    }
  }

  async getClientsByClinicId(clinicId: string): Promise<Client[]> {
    if (!this.initialized) await this.initialize();
    return this.data.clients.filter(client => client.clinicId === clinicId);
  }

  // Implementación de métodos para plantillas horarias
  
  async getAllScheduleTemplates(): Promise<any[]> {
    if (!this.initialized) await this.initialize();
    
    // Verificar si hay plantillas almacenadas en localStorage
    const localTemplates = localStorage.getItem('schedule-templates');
    if (localTemplates) {
      // Si hay plantillas en localStorage, las utilizamos y actualizamos el estado interno
      const parsedTemplates = JSON.parse(localTemplates);
      this.data.scheduleTemplates = parsedTemplates;
      return parsedTemplates;
    }
    
    return this.data.scheduleTemplates;
  }
  
  async getScheduleTemplateById(id: string): Promise<any | null> {
    if (!this.initialized) await this.initialize();
    
    // Primero verificar si hay plantillas en localStorage
    await this.getAllScheduleTemplates();
    
    // Buscar la plantilla
    return this.data.scheduleTemplates.find(template => template.id === id) || null;
  }
  
  async createScheduleTemplate(template: any): Promise<any> {
    if (!this.initialized) await this.initialize();
    
    // Obtener plantillas existentes
    await this.getAllScheduleTemplates();
    
    // Crear nueva plantilla con ID y timestamp
    const now = new Date().toISOString();
    const newTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: now,
      updatedAt: null
    };
    
    // Agregar a la colección
    this.data.scheduleTemplates.push(newTemplate);
    
    // Guardar en localStorage
    localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
    
    return newTemplate;
  }
  
  async updateScheduleTemplate(id: string, template: any): Promise<any | null> {
    if (!this.initialized) await this.initialize();
    
    // Obtener plantillas existentes
    await this.getAllScheduleTemplates();
    
    // Buscar índice de la plantilla
    const index = this.data.scheduleTemplates.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    // Actualizar la plantilla
    const now = new Date().toISOString();
    const updatedTemplate = {
      ...this.data.scheduleTemplates[index],
      ...template,
      updatedAt: now
    };
    
    // Actualizar en la colección
    this.data.scheduleTemplates[index] = updatedTemplate;
    
    // Guardar en localStorage
    localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
    
    return updatedTemplate;
  }
  
  async deleteScheduleTemplate(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    // Obtener plantillas existentes
    await this.getAllScheduleTemplates();
    
    // Filtrar la plantilla a eliminar
    const initialLength = this.data.scheduleTemplates.length;
    this.data.scheduleTemplates = this.data.scheduleTemplates.filter(t => t.id !== id);
    
    // Verificar si se eliminó alguna plantilla
    const deleted = this.data.scheduleTemplates.length < initialLength;
    
    if (deleted) {
      // Guardar en localStorage
      localStorage.setItem('schedule-templates', JSON.stringify(this.data.scheduleTemplates));
    }
    
    return deleted;
  }
  
  async getScheduleTemplatesByClinic(clinicId: string | null): Promise<any[]> {
    if (!this.initialized) await this.initialize();
    
    // Obtener todas las plantillas
    await this.getAllScheduleTemplates();
    
    // Filtrar por clínica
    return this.data.scheduleTemplates.filter(t => 
      t.clinicId === clinicId || 
      t.clinicId === null || 
      t.clinicId === undefined
    );
  }

  // #region Operaciones de archivos
  
  async getAllFiles(): Promise<EntityDocument[]> {
    // Obtener todos los documentos de todas las entidades y categorías
    const allDocuments: EntityDocument[] = [];
    
    // Recorrer todas las entidades
    Object.keys(this.data.entityDocuments).forEach(entityType => {
      // Recorrer todas las entidades de este tipo
      Object.keys(this.data.entityDocuments[entityType]).forEach(entityId => {
        // Recorrer todas las categorías de esta entidad
        Object.keys(this.data.entityDocuments[entityType][entityId]).forEach(category => {
          // Añadir todos los documentos de esta categoría
          allDocuments.push(...this.data.entityDocuments[entityType][entityId][category]);
        });
      });
    });
    
    return allDocuments;
  }
  
  async getFileById(id: string): Promise<EntityDocument | null> {
    const allFiles = await this.getAllFiles();
    return allFiles.find(file => file.id === id) || null;
  }
  
  async saveFile(file: Omit<EntityDocument, 'id'>): Promise<EntityDocument> {
    // Crear un nuevo documento con ID generado
    const newFile: EntityDocument = {
      ...file,
      id: generateId('file')
    };
    
    // Asegurar que existe la estructura para guardar el documento
    if (!this.data.entityDocuments[newFile.entityType]) {
      this.data.entityDocuments[newFile.entityType] = {};
    }
    
    if (!this.data.entityDocuments[newFile.entityType][newFile.entityId]) {
      this.data.entityDocuments[newFile.entityType][newFile.entityId] = {};
    }
    
    const category = file.category || 'default';
    
    if (!this.data.entityDocuments[newFile.entityType][newFile.entityId][category]) {
      this.data.entityDocuments[newFile.entityType][newFile.entityId][category] = [];
    }
    
    // Añadir el documento
    this.data.entityDocuments[newFile.entityType][newFile.entityId][category].push(newFile);
    
    // Guardar en localStorage
    this.saveData();
    
    return newFile;
  }
  
  async deleteFile(id: string): Promise<boolean> {
    const file = await this.getFileById(id);
    if (!file) return false;
    
    try {
      // Eliminar el archivo de su ubicación
      if (this.data.entityDocuments[file.entityType] && 
          this.data.entityDocuments[file.entityType][file.entityId] && 
          this.data.entityDocuments[file.entityType][file.entityId][file.category || 'default']) {
        
        const category = file.category || 'default';
        const files = this.data.entityDocuments[file.entityType][file.entityId][category];
        const index = files.findIndex(f => f.id === id);
        
        if (index !== -1) {
          files.splice(index, 1);
          this.saveData();
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error al eliminar archivo ${id}:`, error);
      return false;
    }
  }
  
  async updateFileMetadata(id: string, metadata: Partial<EntityDocument>): Promise<EntityDocument | null> {
    const file = await this.getFileById(id);
    if (!file) return null;
    
    try {
      // Actualizar el archivo en su ubicación
      if (this.data.entityDocuments[file.entityType] && 
          this.data.entityDocuments[file.entityType][file.entityId] && 
          this.data.entityDocuments[file.entityType][file.entityId][file.category || 'default']) {
        
        const category = file.category || 'default';
        const files = this.data.entityDocuments[file.entityType][file.entityId][category];
        const index = files.findIndex(f => f.id === id);
        
        if (index !== -1) {
          // Actualizar el archivo
          const updatedFile = { ...files[index], ...metadata };
          files[index] = updatedFile;
          this.saveData();
          return updatedFile;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error al actualizar metadatos de archivo ${id}:`, error);
      return null;
    }
  }
  
  async restoreFile(id: string): Promise<boolean> {
    // En la implementación actual, los archivos no se marcan como "eliminados" sino que se eliminan realmente
    // Esta función es un placeholder para implementaciones futuras que soporten eliminación lógica
    return false;
  }
  
  async getFilesByFilter(filter: {entityType?: string, entityId?: string, category?: string}): Promise<EntityDocument[]> {
    let files = await this.getAllFiles();
    
    // Aplicar filtros
    if (filter.entityType) {
      files = files.filter(file => file.entityType === filter.entityType);
    }
    
    if (filter.entityId) {
      files = files.filter(file => file.entityId === filter.entityId);
    }
    
    if (filter.category) {
      files = files.filter(file => file.category === filter.category);
    }
    
    return files;
  }
  
  async getStorageStats(clinicId?: string): Promise<{used: number, byType: Record<string, number>}> {
    const allFiles = await this.getAllFiles();
    
    // Filtrar por clínica si se especifica
    const relevantFiles = clinicId 
      ? allFiles.filter(file => {
          // Asumimos que clinicId podría estar en metadata o como parte de la ruta
          return file.path?.includes(`/${clinicId}/`) || 
                 file.entityId === clinicId ||
                 file.entityType === 'clinic' && file.entityId === clinicId;
        }) 
      : allFiles;
    
    // Calcular estadísticas
    let totalSize = 0;
    const sizeByType: Record<string, number> = {};
    
    relevantFiles.forEach(file => {
      totalSize += file.fileSize;
      
      // Agrupar por tipo de archivo (extensión)
      const extension = file.fileName.split('.').pop()?.toLowerCase() || 'unknown';
      if (!sizeByType[extension]) {
        sizeByType[extension] = 0;
      }
      sizeByType[extension] += file.fileSize;
    });
    
    return {
      used: totalSize,
      byType: sizeByType
    };
  }
  
  // #endregion

  // #region Operaciones de Productos
  
  async getAllProductos(): Promise<Producto[]> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    return this.data.productos;
  }

  async getProductoById(id: string): Promise<Producto | null> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    const producto = this.data.productos.find(p => p.id === id);
    return producto || null;
  }

  async createProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    const newProducto = { 
      ...producto, 
      id: generateId('prod'),
      fechaCreacion: new Date().toISOString()
    } as Producto;
    
    this.data.productos.push(newProducto);
    this.saveData();
    return newProducto;
  }

  async updateProducto(id: string, producto: Partial<Producto>): Promise<Producto | null> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    const index = this.data.productos.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.data.productos[index] = { ...this.data.productos[index], ...producto };
    this.saveData();
    return this.data.productos[index];
  }

  async deleteProducto(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    const initialLength = this.data.productos.length;
    this.data.productos = this.data.productos.filter(p => p.id !== id);
    const deleted = initialLength > this.data.productos.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  async getProductosByTarifaId(tarifaId: string): Promise<Producto[]> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    return this.data.productos.filter(p => p.tarifaId === tarifaId);
  }

  async getProductosByFamilia(familia: string): Promise<Producto[]> {
    if (!this.initialized) await this.initialize();
    
    // Si no hay productos definidos, inicializamos con un array vacío
    if (!this.data.productos) {
      this.data.productos = [];
    }
    
    return this.data.productos.filter(p => p.familia === familia);
  }
  
  // #endregion

  // #region Operaciones de Consumos
  
  async getAllConsumos(): Promise<Consumo[]> {
    if (!this.initialized) await this.initialize();
    
    // Recolectar todos los consumos de todos los servicios
    const consumos: Consumo[] = [];
    this.data.servicios.forEach(servicio => {
      if (servicio.consumos && servicio.consumos.length > 0) {
        servicio.consumos.forEach(consumo => {
          consumos.push({
            ...consumo,
            servicioId: String(servicio.id)
          });
        });
      }
    });
    
    return consumos;
  }

  async getConsumoById(id: string): Promise<Consumo | null> {
    const consumos = await this.getAllConsumos();
    return consumos.find(c => c.id === id) || null;
  }

  async createConsumo(consumo: Omit<Consumo, 'id'>): Promise<Consumo> {
    // Buscar el servicio al que se asociará el consumo
    const servicio = await this.getServicioById(String(consumo.servicioId));
    if (!servicio) {
      throw new Error(`No se encontró el servicio con ID ${consumo.servicioId}`);
    }
    
    // Crear nuevo consumo con ID
    const newConsumo: Consumo = {
      ...consumo,
      id: generateId('cons'),
      servicioId: String(consumo.servicioId)
    };
    
    // Agregar consumo al servicio
    if (!servicio.consumos) {
      servicio.consumos = [];
    }
    
    servicio.consumos.push(newConsumo);
    
    // Actualizar servicio
    await this.updateServicio(String(servicio.id), { consumos: servicio.consumos });
    
    return newConsumo;
  }

  async updateConsumo(id: string, consumo: Partial<Consumo>): Promise<Consumo | null> {
    // Buscar el consumo en todos los servicios
    const allServicios = await this.getAllServicios();
    
    for (const servicio of allServicios) {
      if (!servicio.consumos) continue;
      
      const index = servicio.consumos.findIndex(c => c.id === id);
      if (index !== -1) {
        // Actualizar el consumo
        const updatedConsumo = { ...servicio.consumos[index], ...consumo };
        servicio.consumos[index] = updatedConsumo;
        
        // Actualizar el servicio
        await this.updateServicio(String(servicio.id), { consumos: servicio.consumos });
        
        return updatedConsumo;
      }
    }
    
    return null; // No se encontró el consumo
  }

  async deleteConsumo(id: string): Promise<boolean> {
    // Buscar el consumo en todos los servicios
    const allServicios = await this.getAllServicios();
    
    for (const servicio of allServicios) {
      if (!servicio.consumos) continue;
      
      const initialLength = servicio.consumos.length;
      servicio.consumos = servicio.consumos.filter(c => c.id !== id);
      
      if (servicio.consumos.length < initialLength) {
        // Actualizar el servicio
        await this.updateServicio(String(servicio.id), { consumos: servicio.consumos });
        return true;
      }
    }
    
    return false; // No se encontró el consumo
  }

  async getConsumosByServicioId(servicioId: string): Promise<Consumo[]> {
    const servicio = await this.getServicioById(String(servicioId));
    return servicio?.consumos || [];
  }
} 