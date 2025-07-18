/**
 * Implementación del servicio de datos para Supabase
 * Esta implementación permite conectar con una base de datos PostgreSQL en Supabase
 */

// TODO: REFACTORIZACIÓN FUTURA Y ELIMINACIÓN
// Este archivo actualmente es necesario porque `services/data/index.ts` crea una instancia
// directa de `SupabaseDataService` que es usada por `InterfazContext` a través de `getDataService()`.
// Sin embargo, la mayoría de las funciones aquí están obsoletas, comentadas o no implementadas.
// La estrategia a largo plazo es refactorizar COMPLETAMENTE `InterfazContext` para que TODAS
// sus funciones usen llamadas `fetch` a las APIs correspondientes (ej: /api/clinics, /api/equipment, etc.).
// Una vez que `InterfazContext` no dependa más de `getDataService()` para obtener datos,
// este archivo (`supabase-data-service.ts`) podrá ser eliminado junto con la lógica de 
// instanciación directa en `services/data/index.ts`.
// (Última revisión: Durante refactor de equipamiento - Se refactorizaron funciones de Equipo en InterfazContext).
// FIN TODO

// Comentar importaciones problemáticas
import type { DataService, Person, ScheduleTemplate } from './data-service.ts'; 
import type {
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
  BonoDefinition,
  Usuario
} from './models/interfaces.ts';

// Tipos para la configuración de Supabase
export interface SupabaseConnectionConfig {
  url: string;
  apiKey: string;
  schema: string;
}

/**
 * Implementación del servicio de datos que utiliza Supabase
 */
export class SupabaseDataService implements DataService {
  private schema: string;
  private initialized: boolean = false;
  private supabaseUrl: string;
  private supabaseKey: string;
  
  // Aquí se inicializaría el cliente de Supabase
  // En una implementación real, importaríamos:
  // import { createClient } from '@supabase/supabase-js'
  // private supabase = createClient(this.supabaseUrl, this.supabaseKey);
  
  constructor(config: SupabaseConnectionConfig) {
    this.supabaseUrl = config.url;
    this.supabaseKey = config.apiKey;
    this.schema = config.schema;
  }

  /**
   * Inicializa el servicio de datos conectando con Supabase
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Verificar la conexión con Supabase
      // En una implementación real, haríamos una consulta simple para verificar
      
      // Ejemplo:
      // await this.supabase.from(`${this.schema}.clinicas`).select('count').single();
      
      this.initialized = true;
    } catch (error) {
      console.error('Error al inicializar SupabaseDataService:', error);
      throw error;
    }
  }

  /**
   * Verifica si el esquema especificado existe, y lo crea si no existe
   */
  async ensureSchemaExists(): Promise<boolean> {
    try {
      // En una implementación real, enviaríamos una consulta SQL para crear el esquema
      // await this.supabase.rpc('crear_schema', { nombre_schema: this.schema });
      
      return true;
    } catch (error) {
      console.error(`Error al verificar/crear schema "${this.schema}":`, error);
      return false;
    }
  }

  /**
   * Limpia todos los datos del esquema
   */
  async clearAll(): Promise<void> {
    try {
      // En una implementación real, enviaríamos consultas para truncar todas las tablas
      // await this.supabase.rpc('limpiar_schema', { nombre_schema: this.schema });
      
      console.log(`SupabaseDataService: Datos en schema "${this.schema}" limpiados`);
    } catch (error) {
      console.error(`Error al limpiar datos en schema "${this.schema}":`, error);
      throw error;
    }
  }

  async clearStorageAndReloadData(): Promise<void> {
    console.warn("SupabaseDataService.clearStorageAndReloadData not implemented.");
    return Promise.resolve();
  }

  async getAllScheduleTemplates(): Promise<ScheduleTemplate[]> {
    console.warn("SupabaseDataService.getAllScheduleTemplates not implemented.");
    return Promise.resolve([]);
  }

  async getScheduleTemplateById(id: string): Promise<ScheduleTemplate | null> {
    console.warn(`SupabaseDataService.getScheduleTemplateById(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async createScheduleTemplate(template: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleTemplate> {
    console.warn("SupabaseDataService.createScheduleTemplate not implemented.");
    // This needs to return a mock ScheduleTemplate or reject
    // For simplicity, let's throw an error, as creating a full mock is complex here.
    return Promise.reject(new Error('SupabaseDataService.createScheduleTemplate not implemented')); 
  }

  async updateScheduleTemplate(id: string, template: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | null> {
    console.warn(`SupabaseDataService.updateScheduleTemplate(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async deleteScheduleTemplate(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.deleteScheduleTemplate(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async getScheduleTemplatesByClinic(clinicId: string | null): Promise<ScheduleTemplate[]> {
    console.warn(`SupabaseDataService.getScheduleTemplatesByClinic(${clinicId ?? 'all'}) not implemented.`);
    return Promise.resolve([]);
  }

  async getAllFiles(): Promise<EntityDocument[]> {
    console.warn("SupabaseDataService.getAllFiles not implemented.");
    return Promise.resolve([]);
  }

  async getFileById(id: string): Promise<EntityDocument | null> {
    console.warn(`SupabaseDataService.getFileById(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async saveFile(file: Omit<EntityDocument, 'id'>): Promise<EntityDocument> {
    console.warn("SupabaseDataService.saveFile not implemented.");
    // Requires creating a mock EntityDocument or rejecting
    // The actual file content (Blob) would likely be part of the 'file' object
    // or handled by a separate mechanism in a real implementation.
    return Promise.reject(new Error('SupabaseDataService.saveFile not implemented'));
  }

  async deleteFile(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.deleteFile(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async updateFileMetadata(id: string, metadata: Partial<Omit<EntityDocument, 'id' | 'createdAt' | 'updatedAt' | 'url' | 'size' | 'type' | 'name'>>): Promise<EntityDocument | null> {
    console.warn(`SupabaseDataService.updateFileMetadata(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async restoreFile(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.restoreFile(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async getFilesByFilter(filter: {entityType?: string, entityId?: string, category?: string}): Promise<EntityDocument[]> {
    console.warn(`SupabaseDataService.getFilesByFilter(${JSON.stringify(filter)}) not implemented.`);
    return Promise.resolve([]);
  }

  async getStorageStats(clinicId?: string): Promise<{used: number, byType: Record<string, number>}> {
    console.warn(`SupabaseDataService.getStorageStats(${clinicId ?? 'all'}) not implemented.`);
    return Promise.resolve({ used: 0, byType: {} });
  }

  async getAllProductos(): Promise<Producto[]> {
    console.warn("SupabaseDataService.getAllProductos not implemented.");
    return Promise.resolve([]);
  }

  async getProductoById(id: string): Promise<Producto | null> {
    console.warn(`SupabaseDataService.getProductoById(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async createProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    console.warn("SupabaseDataService.createProducto not implemented.");
    // Requires creating a mock Producto or rejecting
    return Promise.reject(new Error('SupabaseDataService.createProducto not implemented'));
  }

  async updateProducto(id: string, producto: Partial<Producto>): Promise<Producto | null> {
    console.warn(`SupabaseDataService.updateProducto(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async deleteProducto(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.deleteProducto(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async getProductosByTarifaId(tarifaId: string): Promise<Producto[]> {
    console.warn(`SupabaseDataService.getProductosByTarifaId(${tarifaId}) not implemented.`);
    return Promise.resolve([]);
  }

  async getProductosByFamilia(familia: string): Promise<Producto[]> {
    console.warn(`SupabaseDataService.getProductosByFamilia(${familia}) not implemented.`);
    return Promise.resolve([]);
  }

  async getAllBonos(): Promise<BonoDefinition[]> {
    console.warn("SupabaseDataService.getAllBonos not implemented.");
    return Promise.resolve([]);
  }

  async getBonoById(id: string): Promise<BonoDefinition | null> {
    console.warn(`SupabaseDataService.getBonoById(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async createBono(bono: Omit<BonoDefinition, 'id'>): Promise<BonoDefinition> {
    console.warn("SupabaseDataService.createBono not implemented.");
    return Promise.reject(new Error('SupabaseDataService.createBono not implemented'));
  }

  async updateBono(id: string, bono: Partial<BonoDefinition>): Promise<BonoDefinition | null> {
    console.warn(`SupabaseDataService.updateBono(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async deleteBono(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.deleteBono(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async getBonosByServicioId(servicioId: string): Promise<BonoDefinition[]> {
    console.warn(`SupabaseDataService.getBonosByServicioId(${servicioId}) not implemented.`);
    return Promise.resolve([]);
  }

  async getBonosHabilitados(): Promise<BonoDefinition[]> {
    console.warn("SupabaseDataService.getBonosHabilitados not implemented.");
    return Promise.resolve([]);
  }

  async toggleBonoStatus(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.toggleBonoStatus(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async getAllUsuarios(): Promise<Usuario[]> {
    console.warn("SupabaseDataService.getAllUsuarios not implemented.");
    return Promise.resolve([]);
  }

  async getUsuarioById(id: string): Promise<Usuario | null> {
    console.warn(`SupabaseDataService.getUsuarioById(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async createUsuario(usuario: Omit<Usuario, 'id'>): Promise<Usuario> {
    console.warn("SupabaseDataService.createUsuario not implemented.");
    return Promise.reject(new Error('SupabaseDataService.createUsuario not implemented'));
  }

  async updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario | null> {
    console.warn(`SupabaseDataService.updateUsuario(${id}) not implemented.`);
    return Promise.resolve(null);
  }

  async deleteUsuario(id: string): Promise<boolean> {
    console.warn(`SupabaseDataService.deleteUsuario(${id}) not implemented.`);
    return Promise.resolve(false);
  }

  async getUsuariosByClinica(clinicaId: string): Promise<Usuario[]> {
    console.warn(`SupabaseDataService.getUsuariosByClinica(${clinicaId}) not implemented.`);
    return Promise.resolve([]);
  }

  // #region Operaciones básicas de tabla
  
  /**
   * Método genérico para obtener todos los registros de una tabla
   */
  private async getAll<T>(table: string): Promise<T[]> {
    try {
      // En una implementación real:
      // const { data, error } = await this.supabase
      //   .from(`${this.schema}.${table}`)
      //   .select('*');
      
      // if (error) throw error;
      // return data as T[];
      
      // Por ahora, devolvemos un array vacío
      return [] as T[];
    } catch (error) {
      console.error(`Error al obtener datos de ${table}:`, error);
      return [] as T[];
    }
  }

  /**
   * Método genérico para obtener un registro por ID
   */
  private async getById<T>(table: string, id: string): Promise<T | null> {
    try {
      // En una implementación real:
      // const { data, error } = await this.supabase
      //   .from(`${this.schema}.${table}`)
      //   .select('*')
      //   .eq('id', id)
      //   .single();
      
      // if (error) throw error;
      // return data as T;
      
      // Por ahora, devolvemos null
      return null;
    } catch (error) {
      console.error(`Error al obtener ${table} con id ${id}:`, error);
      return null;
    }
  }

  /**
   * Método genérico para crear un registro
   */
  private async create<T extends BaseEntity>(table: string, entity: Omit<T, 'id'>): Promise<T> {
    try {
      // En una implementación real:
      // const { data, error } = await this.supabase
      //   .from(`${this.schema}.${table}`)
      //   .insert(entity)
      //   .select('*')
      //   .single();
      
      // if (error) throw error;
      // return data as T;
      
      // Por ahora, devolvemos un mock
      return { id: Date.now().toString(), ...entity } as T;
    } catch (error) {
      console.error(`Error al crear ${table}:`, error);
      throw error;
    }
  }

  /**
   * Método genérico para actualizar un registro
   */
  private async update<T extends BaseEntity>(table: string, id: string, entity: Partial<T>): Promise<T | null> {
    try {
      // En una implementación real:
      // const { data, error } = await this.supabase
      //   .from(`${this.schema}.${table}`)
      //   .update(entity)
      //   .eq('id', id)
      //   .select('*')
      //   .single();
      
      // if (error) throw error;
      // return data as T;
      
      // Por ahora, devolvemos null
      return null;
    } catch (error) {
      console.error(`Error al actualizar ${table} con id ${id}:`, error);
      return null;
    }
  }

  /**
   * Método genérico para eliminar un registro
   */
  private async delete(table: string, id: string): Promise<boolean> {
    try {
      // En una implementación real:
      // const { error } = await this.supabase
      //   .from(`${this.schema}.${table}`)
      //   .delete()
      //   .eq('id', id);
      
      // if (error) throw error;
      // return true;
      
      // Por ahora, devolvemos true
      return true;
    } catch (error) {
      console.error(`Error al eliminar ${table} con id ${id}:`, error);
      return false;
    }
  }
  
  // #endregion

  // #region Implementación de la interfaz DataService
  
  // Operaciones con imágenes
  getEntityImages = async (entityType: string, entityId: string): Promise<EntityImage[]> => {
    return this.getAll<EntityImage>(`entity_images_${entityType}_${entityId}`);
  }
  
  async saveEntityImages(entityType: string, entityId: string, images: EntityImage[]): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error('Error al guardar imágenes:', error);
      return false;
    }
  }
  
  async deleteEntityImages(entityType: string, entityId: string): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error('Error al eliminar imágenes:', error);
      return false;
    }
  }
  
  // Operaciones con documentos
  async getEntityDocuments(entityType: string, entityId: string, category?: string): Promise<EntityDocument[]> {
    return this.getAll<EntityDocument>(`entity_documents_${entityType}_${entityId}_${category || 'default'}`);
  }
  
  async saveEntityDocuments(entityType: string, entityId: string, documents: EntityDocument[], category?: string): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error('Error al guardar documentos:', error);
      return false;
    }
  }
  
  async deleteEntityDocuments(entityType: string, entityId: string, category?: string): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error('Error al eliminar documentos:', error);
      return false;
    }
  }
  
  // Operaciones de Clínicas
  async getAllClinicas(): Promise<Clinica[]> {
    return this.getAll<Clinica>('clinicas');
  }
  
  async getClinicaById(id: string): Promise<Clinica | null> {
    return this.getById<Clinica>('clinicas', id);
  }
  
  async createClinica(clinica: Omit<Clinica, 'id'>): Promise<Clinica> {
    return this.create<Clinica>('clinicas', clinica);
  }
  
  async updateClinica(id: string, clinica: Partial<Clinica>): Promise<Clinica | null> {
    return this.update<Clinica>('clinicas', id, clinica);
  }
  
  async deleteClinica(id: string): Promise<boolean> {
    return this.delete('clinicas', id);
  }
  
  async getActiveClinicas(): Promise<Clinica[]> {
    try {
      // En una implementación real:
      // const { data, error } = await this.supabase
      //   .from(`${this.schema}.clinicas`)
      //   .select('*')
      //   .eq('isActive', true);
      
      // if (error) throw error;
      // return data as Clinica[];
      
      // Por ahora, devolvemos un array vacío
      return [];
    } catch (error) {
      console.error('Error al obtener clínicas activas:', error);
      return [];
    }
  }
  
  // Operaciones de Tarifas
  async getAllTarifas(): Promise<Tarifa[]> {
    return this.getAll<Tarifa>('tarifas');
  }
  
  async getTarifaById(id: string): Promise<Tarifa | null> {
    return this.getById<Tarifa>('tarifas', id);
  }
  
  async createTarifa(tarifa: Omit<Tarifa, 'id'>): Promise<Tarifa> {
    return this.create<Tarifa>('tarifas', tarifa);
  }
  
  async updateTarifa(id: string, tarifa: Partial<Tarifa>): Promise<Tarifa | null> {
    return this.update<Tarifa>('tarifas', id, tarifa);
  }
  
  async deleteTarifa(id: string): Promise<boolean> {
    return this.delete('tarifas', id);
  }
  
  async getTarifasByClinicaId(clinicaId: string): Promise<Tarifa[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener tarifas para clínica ${clinicaId}:`, error);
      return [];
    }
  }
  
  async addClinicaToTarifa(tarifaId: string, clinicaId: string, isPrimary?: boolean): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error(`Error al añadir clínica ${clinicaId} a tarifa ${tarifaId}:`, error);
      return false;
    }
  }
  
  async removeClinicaFromTarifa(tarifaId: string, clinicaId: string): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error(`Error al eliminar clínica ${clinicaId} de tarifa ${tarifaId}:`, error);
      return false;
    }
  }
  
  async setPrimaryClinicaForTarifa(tarifaId: string, clinicaId: string): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error(`Error al establecer clínica primaria ${clinicaId} para tarifa ${tarifaId}:`, error);
      return false;
    }
  }
  
  // Operaciones de Familias de Tarifas
  async getAllFamiliasTarifa(): Promise<FamiliaTarifa[]> {
    return this.getAll<FamiliaTarifa>('familias_tarifa');
  }
  
  async getFamiliaTarifaById(id: string): Promise<FamiliaTarifa | null> {
    return this.getById<FamiliaTarifa>('familias_tarifa', id);
  }
  
  async createFamiliaTarifa(familia: Omit<FamiliaTarifa, 'id'>): Promise<FamiliaTarifa> {
    return this.create<FamiliaTarifa>('familias_tarifa', familia);
  }
  
  async updateFamiliaTarifa(id: string, familia: Partial<FamiliaTarifa>): Promise<FamiliaTarifa | null> {
    return this.update<FamiliaTarifa>('familias_tarifa', id, familia);
  }
  
  async deleteFamiliaTarifa(id: string): Promise<boolean> {
    return this.delete('familias_tarifa', id);
  }
  
  async getFamiliasByTarifaId(tarifaId: string): Promise<FamiliaTarifa[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener familias para tarifa ${tarifaId}:`, error);
      return [];
    }
  }
  
  async getRootFamilias(tarifaId: string): Promise<FamiliaTarifa[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener familias raíz para tarifa ${tarifaId}:`, error);
      return [];
    }
  }
  
  async getSubfamilias(parentId: string): Promise<FamiliaTarifa[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener subfamilias de ${parentId}:`, error);
      return [];
    }
  }
  
  async toggleFamiliaStatus(id: string): Promise<boolean> {
    try {
      // Implementación pendiente
      return true;
    } catch (error) {
      console.error(`Error al cambiar estado de familia ${id}:`, error);
      return false;
    }
  }
  
  // Operaciones de Servicios
  async getAllServicios(): Promise<Servicio[]> {
    return this.getAll<Servicio>('servicios');
  }
  
  async getServicioById(id: string): Promise<Servicio | null> {
    return this.getById<Servicio>('servicios', id);
  }
  
  async createServicio(servicio: Omit<Servicio, 'id'>): Promise<Servicio> {
    return this.create<Servicio>('servicios', servicio);
  }
  
  async updateServicio(id: string, servicio: Partial<Servicio>): Promise<Servicio | null> {
    return this.update<Servicio>('servicios', id, servicio);
  }
  
  async deleteServicio(id: string): Promise<boolean> {
    return this.delete('servicios', id);
  }
  
  async getServiciosByTarifaId(tarifaId: string): Promise<Servicio[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener servicios para tarifa ${tarifaId}:`, error);
      return [];
    }
  }
  
  // Operaciones de Tipos de IVA
  async getAllTiposIVA(): Promise<TipoIVA[]> {
    return this.getAll<TipoIVA>('tipos_iva');
  }
  
  async getTipoIVAById(id: string): Promise<TipoIVA | null> {
    return this.getById<TipoIVA>('tipos_iva', id);
  }
  
  async createTipoIVA(tipoIVA: Omit<TipoIVA, 'id'>): Promise<TipoIVA> {
    return this.create<TipoIVA>('tipos_iva', tipoIVA);
  }
  
  async updateTipoIVA(id: string, tipoIVA: Partial<TipoIVA>): Promise<TipoIVA | null> {
    return this.update<TipoIVA>('tipos_iva', id, tipoIVA);
  }
  
  async deleteTipoIVA(id: string): Promise<boolean> {
    return this.delete('tipos_iva', id);
  }
  
  async getTiposIVAByTarifaId(tarifaId: string): Promise<TipoIVA[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener tipos de IVA para tarifa ${tarifaId}:`, error);
      return [];
    }
  }
  
  // Operaciones de Equipos
  async getAllEquipos(): Promise<Equipo[]> {
    return this.getAll<Equipo>('equipos');
  }
  
  async getEquipoById(id: string): Promise<Equipo | null> {
    return this.getById<Equipo>('equipos', id);
  }
  
  async createEquipo(equipo: Omit<Equipo, 'id'>): Promise<Equipo> {
    return this.create<Equipo>('equipos', equipo);
  }
  
  async updateEquipo(id: string, equipo: Partial<Equipo>): Promise<Equipo | null> {
    return this.update<Equipo>('equipos', id, equipo);
  }
  
  async deleteEquipo(id: string): Promise<boolean> {
    return this.delete('equipos', id);
  }
  
  async getEquiposByClinicaId(clinicaId: string): Promise<Equipo[]> {
    try {
      console.log(`[SupabaseDataService] Buscando equipos para clinicaId (string): ${clinicaId}`);
      
      // --- LÓGICA DE CONSULTA A SUPABASE (Ejemplo Comentado) --- 
      // const { data, error } = await this.supabase
      //   .from(`${this.schema}.equipos`) // Usar nombre de tabla correcto
      //   .select('*')
      //   .eq('clinicId', clinicaId); // <<< Comparar directamente con el string clinicaId
      // 
      // if (error) throw error;
      // return data as Equipo[];
      // --- FIN LÓGICA SUPABASE ---
      
      // >>> ELIMINAR LÓGICA DE EJEMPLO BASADA EN this.data <<< 
      // // Por ahora, usar los datos de ejemplo
      // const equipos = this.data.equipos.filter(
      //   equipo => equipo.clinicId === clinicaIdNum
      // ); 
      // return equipos || [];
      
      // >>> Devolver array vacío mientras no haya implementación real <<<
      console.warn("[SupabaseDataService] getEquiposByClinicaId no implementado, devolviendo array vacío.");
      return []; 

    } catch (error) {
      console.error("Error en getEquiposByClinicaId:", error);
      return [];
    }
  }
  
  // Operaciones de Bloques de Agenda
  async getAllScheduleBlocks(): Promise<ScheduleBlock[]> {
    return this.getAll<ScheduleBlock>('schedule_blocks');
  }
  
  async getScheduleBlockById(id: string): Promise<ScheduleBlock | null> {
    return this.getById<ScheduleBlock>('schedule_blocks', id);
  }
  
  async createScheduleBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    return this.create<ScheduleBlock>('schedule_blocks', {
      ...block,
      createdAt: new Date().toISOString()
    });
  }
  
  async updateScheduleBlock(id: string, block: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> {
    return this.update<ScheduleBlock>('schedule_blocks', id, block);
  }
  
  async deleteScheduleBlock(id: string): Promise<boolean> {
    return this.delete('schedule_blocks', id);
  }
  
  /**
   * Obtiene bloques de horario para una clínica específica dentro de un rango de fechas
   */
  async getBlocksByDateRange(clinicId: string, startDate: string, endDate: string): Promise<ScheduleBlock[]> {
    console.log(`[SupabaseDataService] getBlocksByDateRange - clinicId: ${clinicId} (tipo: ${typeof clinicId}), startDate: ${startDate}, endDate: ${endDate}`);
    // TODO: Implementar lógica real para filtrar por clinicId y rango de fechas
    // Debería hacer una consulta a Supabase a la tabla 'schedule_blocks' (o similar)
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener bloques para clínica ${clinicId} entre ${startDate} y ${endDate}:`, error);
      return [];
    }
  }
  
  // Operaciones de Personas
  async getAllPersons(): Promise<Person[]> {
    return this.getAll<Person>('clients');
  }
  
  async getPersonById(id: string): Promise<Person | null> {
    return this.getById<Person>('clients', id);
  }
  
  async createPerson(person: Omit<Person, 'id'>): Promise<Person> {
    return this.create<Person>('clients', person);
  }
  
  async updatePerson(id: string, person: Partial<Person>): Promise<Person | null> {
    return this.update<Person>('clients', id, person);
  }
  
  async deletePerson(id: string): Promise<boolean> {
    return this.delete('clients', id);
  }
  
  async getPersonsByClinicId(clinicId: string): Promise<Person[]> {
    try {
      // Implementación pendiente
      return [];
    } catch (error) {
      console.error(`Error al obtener personas para clínica ${clinicId}:`, error);
      return [];
    }
  }
  
  // #endregion
} 