/**
 * Interfaz de servicio de datos
 * Define todas las operaciones de datos que puede realizar la aplicación
 * Esta interfaz será implementada por diferentes proveedores de datos (localStorage, API, etc.)
 */

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
  Consumo,
  Bono,
  Usuario
} from './models/interfaces';

/**
 * Interfaz para Clientes
 */
export interface Client {
  id: string;
  name: string;
  clientNumber: string;
  phone: string;
  email: string;
  clinic: string;
  clinicId: string;
  address?: string;
  birthDate?: string;
  notes?: string;
  visits?: any[];
  avatar?: string;
}

/**
 * Interfaz para Plantillas Horarias
 */
export interface ScheduleTemplate {
  id: string;
  description: string;
  schedule: any; // WeekSchedule pero simplificado para la interfaz
  clinicId?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Interfaz principal del servicio de datos
 */
export interface DataService {
  /**
   * Inicializa el servicio de datos
   */
  initialize(): Promise<void>;
  
  /**
   * Limpia todos los datos y fuerza la regeneración de datos de ejemplo
   */
  clearStorageAndReloadData(): Promise<void>;

  // Operaciones con imágenes
  getEntityImages(entityType: string, entityId: string): Promise<EntityImage[]>;
  saveEntityImages(entityType: string, entityId: string, images: EntityImage[]): Promise<boolean>;
  deleteEntityImages(entityType: string, entityId: string): Promise<boolean>;

  // Operaciones con documentos
  getEntityDocuments(entityType: string, entityId: string, category?: string): Promise<EntityDocument[]>;
  saveEntityDocuments(entityType: string, entityId: string, documents: EntityDocument[], category?: string): Promise<boolean>;
  deleteEntityDocuments(entityType: string, entityId: string, category?: string): Promise<boolean>;

  // Operaciones de Clínicas
  getAllClinicas(): Promise<Clinica[]>;
  getClinicaById(id: string): Promise<Clinica | null>;
  createClinica(clinica: Omit<Clinica, 'id'>): Promise<Clinica>;
  updateClinica(id: string, clinica: Partial<Clinica>): Promise<Clinica | null>;
  deleteClinica(id: string): Promise<boolean>;
  getActiveClinicas(): Promise<Clinica[]>;

  // Operaciones de Tarifas
  getAllTarifas(): Promise<Tarifa[]>;
  getTarifaById(id: string): Promise<Tarifa | null>;
  createTarifa(tarifa: Omit<Tarifa, 'id'>): Promise<Tarifa>;
  updateTarifa(id: string, tarifa: Partial<Tarifa>): Promise<Tarifa | null>;
  deleteTarifa(id: string): Promise<boolean>;
  getTarifasByClinicaId(clinicaId: string): Promise<Tarifa[]>;
  addClinicaToTarifa(tarifaId: string, clinicaId: string, isPrimary?: boolean): Promise<boolean>;
  removeClinicaFromTarifa(tarifaId: string, clinicaId: string): Promise<boolean>;
  setPrimaryClinicaForTarifa(tarifaId: string, clinicaId: string): Promise<boolean>;

  // Operaciones de Familias de Tarifas
  getAllFamiliasTarifa(): Promise<FamiliaTarifa[]>;
  getFamiliaTarifaById(id: string): Promise<FamiliaTarifa | null>;
  createFamiliaTarifa(familia: Omit<FamiliaTarifa, 'id'>): Promise<FamiliaTarifa>;
  updateFamiliaTarifa(id: string, familia: Partial<FamiliaTarifa>): Promise<FamiliaTarifa | null>;
  deleteFamiliaTarifa(id: string): Promise<boolean>;
  getFamiliasByTarifaId(tarifaId: string): Promise<FamiliaTarifa[]>;
  getRootFamilias(tarifaId: string): Promise<FamiliaTarifa[]>;
  getSubfamilias(parentId: string): Promise<FamiliaTarifa[]>;
  toggleFamiliaStatus(id: string): Promise<boolean>;

  // Operaciones de Servicios
  getAllServicios(): Promise<Servicio[]>;
  getServicioById(id: string): Promise<Servicio | null>;
  createServicio(servicio: Omit<Servicio, 'id'>): Promise<Servicio>;
  updateServicio(id: string, servicio: Partial<Servicio>): Promise<Servicio | null>;
  deleteServicio(id: string): Promise<boolean>;
  getServiciosByTarifaId(tarifaId: string): Promise<Servicio[]>;

  // Operaciones de Tipos de IVA
  getAllTiposIVA(): Promise<TipoIVA[]>;
  getTipoIVAById(id: string): Promise<TipoIVA | null>;
  createTipoIVA(tipoIVA: Omit<TipoIVA, 'id'>): Promise<TipoIVA>;
  updateTipoIVA(id: string, tipoIVA: Partial<TipoIVA>): Promise<TipoIVA | null>;
  deleteTipoIVA(id: string): Promise<boolean>;
  getTiposIVAByTarifaId(tarifaId: string): Promise<TipoIVA[]>;

  // Operaciones de Equipos
  getAllEquipos(): Promise<Equipo[]>;
  getEquipoById(id: string): Promise<Equipo | null>;
  createEquipo(equipo: Omit<Equipo, 'id'>): Promise<Equipo>;
  updateEquipo(id: string, equipo: Partial<Equipo>): Promise<Equipo | null>;
  deleteEquipo(id: string): Promise<boolean>;
  getEquiposByClinicaId(clinicaId: string): Promise<Equipo[]>;

  // Operaciones de Bloques de Agenda
  getAllScheduleBlocks(): Promise<ScheduleBlock[]>;
  getScheduleBlockById(id: string): Promise<ScheduleBlock | null>;
  createScheduleBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock>;
  updateScheduleBlock(id: string, block: Partial<ScheduleBlock>): Promise<ScheduleBlock | null>;
  deleteScheduleBlock(id: string): Promise<boolean>;
  getBlocksByDateRange(clinicId: string, startDate: string, endDate: string): Promise<ScheduleBlock[]>;

  // Métodos para Clientes
  getAllClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  createClient(client: Omit<Client, 'id'>): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client | null>;
  deleteClient(id: string): Promise<boolean>;
  getClientsByClinicId(clinicId: string): Promise<Client[]>;
  
  // Métodos para Plantillas Horarias
  getAllScheduleTemplates(): Promise<ScheduleTemplate[]>;
  getScheduleTemplateById(id: string): Promise<ScheduleTemplate | null>;
  createScheduleTemplate(template: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleTemplate>;
  updateScheduleTemplate(id: string, template: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | null>;
  deleteScheduleTemplate(id: string): Promise<boolean>;
  getScheduleTemplatesByClinic(clinicId: string | null): Promise<ScheduleTemplate[]>;
  
  // Métodos para Archivos
  getAllFiles(): Promise<EntityDocument[]>;
  getFileById(id: string): Promise<EntityDocument | null>;
  saveFile(file: Omit<EntityDocument, 'id'>): Promise<EntityDocument>;
  deleteFile(id: string): Promise<boolean>;
  updateFileMetadata(id: string, metadata: Partial<EntityDocument>): Promise<EntityDocument | null>;
  restoreFile(id: string): Promise<boolean>;
  getFilesByFilter(filter: {entityType?: string, entityId?: string, category?: string}): Promise<EntityDocument[]>;
  getStorageStats(clinicId?: string): Promise<{used: number, byType: Record<string, number>}>;
  
  // Operaciones de Productos
  getAllProductos(): Promise<Producto[]>;
  getProductoById(id: string): Promise<Producto | null>;
  createProducto(producto: Omit<Producto, 'id'>): Promise<Producto>;
  updateProducto(id: string, producto: Partial<Producto>): Promise<Producto | null>;
  deleteProducto(id: string): Promise<boolean>;
  getProductosByTarifaId(tarifaId: string): Promise<Producto[]>;
  getProductosByFamilia(familia: string): Promise<Producto[]>;
  
  // Operaciones de Consumos
  getAllConsumos(): Promise<Consumo[]>;
  getConsumoById(id: string): Promise<Consumo | null>;
  createConsumo(consumo: Omit<Consumo, 'id'>): Promise<Consumo>;
  updateConsumo(id: string, consumo: Partial<Consumo>): Promise<Consumo | null>;
  deleteConsumo(id: string): Promise<boolean>;
  getConsumosByServicioId(servicioId: string): Promise<Consumo[]>;
  
  // Operaciones de Bonos
  getAllBonos(): Promise<Bono[]>;
  getBonoById(id: string): Promise<Bono | null>;
  createBono(bono: Omit<Bono, 'id'>): Promise<Bono>;
  updateBono(id: string, bono: Partial<Bono>): Promise<Bono | null>;
  deleteBono(id: string): Promise<boolean>;
  getBonosByServicioId(servicioId: string): Promise<Bono[]>;
  getBonosHabilitados(): Promise<Bono[]>;
  toggleBonoStatus(id: string): Promise<boolean>;

  // Operaciones de Usuarios
  getAllUsuarios(): Promise<Usuario[]>;
  getUsuarioById(id: string): Promise<Usuario | null>;
  createUsuario(usuario: Omit<Usuario, 'id'>): Promise<Usuario>;
  updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario | null>;
  deleteUsuario(id: string): Promise<boolean>;
  getUsuariosByClinica(clinicaId: string): Promise<Usuario[]>;
} 