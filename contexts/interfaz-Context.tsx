"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getDataService } from "@/services/data"
import type {
  Prisma,
  Category as PrismaFamily,
  Service as PrismaService,
  VATType as PrismaTipoIVA,
  Equipment as PrismaEquipo,
  EntityImage as PrismaEntityImage,
  EntityDocument as PrismaEntityDocument,
  ScheduleTemplate as PrismaScheduleTemplate,
  Product as PrismaProducto,
  ServiceConsumption as PrismaConsumo,
  User as PrismaUsuario,
  Clinic as PrismaClinica,
  Tariff as PrismaTarifa,
  Category as PrismaFamiliaTarifa,
  ClinicScheduleBlock,
  ScheduleTemplateBlock,
} from '@prisma/client'
import type { Client } from '@/services/data/data-service'

// Claves de localStorage para distintas entidades
const CLINICAS_KEY = "clinicas";
const TARIFAS_KEY = "tarifas";
const FAMILIAS_KEY = "familias";
const TIPOS_IVA_KEY = "tipos_iva";
const SERVICIOS_KEY = "servicios";
const PRODUCTOS_KEY = "productos";
const EQUIPOS_KEY = "equipos";

// Contexto para la interfaz de datos
interface InterfazContextType {
  // Indicador de inicialización
  initialized: boolean;
  
  // Función para reiniciar datos (forzar regeneración)
  resetData: () => Promise<void>;
  
  // Funciones de clínicas
  getAllClinicas: () => Promise<PrismaClinica[]>;
  getClinicaById: (id: string) => Promise<PrismaClinica | null>;
  createClinica: (clinica: Omit<PrismaClinica, 'id'>) => Promise<PrismaClinica>;
  updateClinica: (id: string, clinica: Partial<PrismaClinica>) => Promise<PrismaClinica | null>;
  deleteClinica: (id: string) => Promise<boolean>;
  getActiveClinicas: () => Promise<PrismaClinica[]>;
  
  // Funciones de clientes
  getAllClients: () => Promise<Client[]>;
  getClientById: (id: string) => Promise<Client | null>;
  createClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, client: Partial<Client>) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;
  getClientsByClinicId: (clinicId: string) => Promise<Client[]>;
  
  // Funciones de tarifas
  getAllTarifas: () => Promise<PrismaTarifa[]>;
  getTarifaById: (id: string) => Promise<PrismaTarifa | null>;
  createTarifa: (tarifa: Omit<PrismaTarifa, 'id'>) => Promise<PrismaTarifa>;
  updateTarifa: (id: string, tarifa: Partial<PrismaTarifa>) => Promise<PrismaTarifa | null>;
  deleteTarifa: (id: string) => Promise<boolean>;
  getTarifasByClinicaId: (clinicaId: string) => Promise<PrismaTarifa[]>;
  addClinicaToTarifa: (tarifaId: string, clinicaId: string, isPrimary?: boolean) => Promise<boolean>;
  removeClinicaFromTarifa: (tarifaId: string, clinicaId: string) => Promise<boolean>;
  setPrimaryClinicaForTarifa: (tarifaId: string, clinicaId: string) => Promise<boolean>;
  
  // Funciones de familias de tarifas
  getAllFamiliasTarifa: () => Promise<PrismaFamiliaTarifa[]>;
  getFamiliaTarifaById: (id: string) => Promise<PrismaFamiliaTarifa | null>;
  createFamiliaTarifa: (familia: Omit<PrismaFamiliaTarifa, 'id'>) => Promise<PrismaFamiliaTarifa>;
  updateFamiliaTarifa: (id: string, familia: Partial<PrismaFamiliaTarifa>) => Promise<PrismaFamiliaTarifa | null>;
  deleteFamiliaTarifa: (id: string) => Promise<boolean>;
  getFamiliasByTarifaId: (tarifaId: string) => Promise<PrismaFamiliaTarifa[]>;
  getRootFamilias: (tarifaId: string) => Promise<PrismaFamiliaTarifa[]>;
  getSubfamilias: (parentId: string) => Promise<PrismaFamiliaTarifa[]>;
  toggleFamiliaStatus: (id: string) => Promise<boolean>;
  
  // Funciones de servicios
  getAllServicios: () => Promise<PrismaService[]>;
  getServicioById: (id: string) => Promise<PrismaService | null>;
  createServicio: (servicio: Omit<PrismaService, 'id'>) => Promise<PrismaService>;
  updateServicio: (id: string, servicio: Partial<PrismaService>) => Promise<PrismaService | null>;
  deleteServicio: (id: string) => Promise<boolean>;
  getServiciosByTarifaId: (tarifaId: string) => Promise<PrismaService[]>;
  
  // Funciones de tipos de IVA
  getAllTiposIVA: () => Promise<PrismaTipoIVA[]>;
  getTipoIVAById: (id: string) => Promise<PrismaTipoIVA | null>;
  createTipoIVA: (tipoIVA: Omit<PrismaTipoIVA, 'id'>) => Promise<PrismaTipoIVA>;
  updateTipoIVA: (id: string, tipoIVA: Partial<PrismaTipoIVA>) => Promise<PrismaTipoIVA | null>;
  deleteTipoIVA: (id: string) => Promise<boolean>;
  getTiposIVAByTarifaId: (tarifaId: string) => Promise<PrismaTipoIVA[]>;
  
  // Funciones de equipos
  getAllEquipos: () => Promise<PrismaEquipo[]>;
  getEquipoById: (id: string) => Promise<PrismaEquipo | null>;
  createEquipo: (equipo: Omit<PrismaEquipo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PrismaEquipo>;
  updateEquipo: (id: string, equipo: Partial<Omit<PrismaEquipo, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<PrismaEquipo | null>;
  deleteEquipo: (id: string) => Promise<boolean>;
  getEquiposByClinicaId: (clinicaId: string) => Promise<PrismaEquipo[]>;
  
  // Funciones de bloques de agenda
  getAllScheduleBlocks: () => Promise<(ClinicScheduleBlock | ScheduleTemplateBlock)[]>;
  getScheduleBlockById: (id: string) => Promise<ClinicScheduleBlock | ScheduleTemplateBlock | null>;
  createScheduleBlock: (block: Omit<ClinicScheduleBlock, 'id' | 'createdAt' | 'updatedAt'> | Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ClinicScheduleBlock | ScheduleTemplateBlock>;
  updateScheduleBlock: (id: string, block: Partial<Omit<ClinicScheduleBlock, 'id' | 'createdAt' | 'updatedAt'>> | Partial<Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ClinicScheduleBlock | ScheduleTemplateBlock | null>;
  deleteScheduleBlock: (id: string) => Promise<boolean>;
  getBlocksByDateRange: (clinicId: string, startDate: string, endDate: string) => Promise<(ClinicScheduleBlock | ScheduleTemplateBlock)[]>;
  
  // Funciones de imágenes
  getEntityImages: (entityType: string, entityId: string) => Promise<PrismaEntityImage[]>;
  saveEntityImages: (entityType: string, entityId: string, images: PrismaEntityImage[]) => Promise<boolean>;
  deleteEntityImages: (entityType: string, entityId: string) => Promise<boolean>;
  
  // Funciones de documentos
  getEntityDocuments: (entityType: string, entityId: string, category?: string) => Promise<PrismaEntityDocument[]>;
  saveEntityDocuments: (entityType: string, entityId: string, documents: PrismaEntityDocument[], category?: string) => Promise<boolean>;
  deleteEntityDocuments: (entityType: string, entityId: string, category?: string) => Promise<boolean>;
  
  // Funciones de plantillas de agenda
  getScheduleTemplates: () => Promise<PrismaScheduleTemplate[]>;
  getTemplateById: (id: string) => Promise<PrismaScheduleTemplate | null>;
  saveTemplate: (template: Omit<PrismaScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PrismaScheduleTemplate>;
  deleteTemplate: (id: string) => Promise<boolean>;
  getTemplatesByClinic: (clinicId: string | null) => Promise<PrismaScheduleTemplate[]>;
  
  // Funciones de productos
  getAllProductos: () => Promise<PrismaProducto[]>;
  getProductoById: (id: string) => Promise<PrismaProducto | null>;
  createProducto: (producto: Omit<PrismaProducto, 'id' | 'fechaCreacion'>) => Promise<PrismaProducto>;
  updateProducto: (id: string, producto: Partial<PrismaProducto>) => Promise<PrismaProducto | null>;
  deleteProducto: (id: string) => Promise<boolean>;
  getProductosByTarifaId: (tarifaId: string) => Promise<PrismaProducto[]>;
  getProductosByFamilia: (familia: string) => Promise<PrismaProducto[]>;
  
  // Funciones de consumos de servicios
  getAllConsumos: () => Promise<PrismaConsumo[]>;
  getConsumoById: (id: string) => Promise<PrismaConsumo | null>;
  createConsumo: (consumo: Omit<PrismaConsumo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PrismaConsumo>;
  updateConsumo: (id: string, consumo: Partial<Omit<PrismaConsumo, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<PrismaConsumo | null>;
  deleteConsumo: (id: string) => Promise<boolean>;
  getConsumosByServicioId: (servicioId: string) => Promise<PrismaConsumo[]>;

  // Funciones de usuarios
  getAllUsuarios: () => Promise<PrismaUsuario[]>;
  getUsuarioById: (id: string) => Promise<PrismaUsuario | null>;
  getUsuariosByClinica: (clinicaId: string) => Promise<PrismaUsuario[]>;
  createUsuario: (usuario: Omit<PrismaUsuario, 'id'>) => Promise<PrismaUsuario>;
  updateUsuario: (id: string, usuario: Partial<PrismaUsuario>) => Promise<PrismaUsuario | null>;
  deleteUsuario: (id: string) => Promise<boolean>;
}

// Crear el contexto
const InterfazContext = createContext<InterfazContextType | undefined>(undefined);

// Provider del contexto
export function InterfazProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  // Marcar como inicializado inmediatamente
  useEffect(() => {
        setInitialized(true);
  }, []);

  // Crear un objeto con todas las funciones del servicio de datos
  const interfaz: InterfazContextType = {
    initialized,
    
    // Función para reiniciar datos
    resetData: async () => {
      try {
        const dataService = getDataService();
        // >>> COMENTADO: clearStorageAndReloadData no existe en SupabaseDataService <<<
        // await dataService.clearStorageAndReloadData(); 
        console.warn("Interfaz.resetData() llamado, pero clearStorageAndReloadData no está implementado/es obsoleto.");
        console.log("Datos reiniciados (acción omitida)."); // Cambiado log
      } catch (error) {
        console.error("Error al intentar reiniciar datos:", error);
      }
    },
    
    // --- Funciones que delegan directamente a getDataService() --- 
    
    // Clínicas
    getAllClinicas: () => getDataService().getAllClinicas(),
    getClinicaById: (id) => getDataService().getClinicaById(id),
    createClinica: (clinica) => getDataService().createClinica(clinica),
    updateClinica: (id, clinica) => getDataService().updateClinica(id, clinica),
    deleteClinica: (id) => getDataService().deleteClinica(id),
    getActiveClinicas: () => getDataService().getActiveClinicas(),
    
    // Clientes
    getAllClients: () => getDataService().getAllClients(),
    getClientById: (id) => getDataService().getClientById(id),
    createClient: (client) => getDataService().createClient(client),
    updateClient: (id, client) => getDataService().updateClient(id, client),
    deleteClient: (id) => getDataService().deleteClient(id),
    getClientsByClinicId: (clinicId) => getDataService().getClientsByClinicId(clinicId),
    
    // Tarifas
    getAllTarifas: () => getDataService().getAllTarifas(),
    getTarifaById: (id) => getDataService().getTarifaById(id),
    createTarifa: (tarifa) => getDataService().createTarifa(tarifa),
    updateTarifa: (id, tarifa) => getDataService().updateTarifa(id, tarifa),
    deleteTarifa: (id) => getDataService().deleteTarifa(id),
    getTarifasByClinicaId: (clinicaId) => getDataService().getTarifasByClinicaId(clinicaId),
    addClinicaToTarifa: (tarifaId, clinicaId, isPrimary) => getDataService().addClinicaToTarifa(tarifaId, clinicaId, isPrimary),
    removeClinicaFromTarifa: (tarifaId, clinicaId) => getDataService().removeClinicaFromTarifa(tarifaId, clinicaId),
    setPrimaryClinicaForTarifa: (tarifaId, clinicaId) => getDataService().setPrimaryClinicaForTarifa(tarifaId, clinicaId),
    
    // Familias de Tarifas
    getAllFamiliasTarifa: () => getDataService().getAllFamiliasTarifa(),
    getFamiliaTarifaById: (id) => getDataService().getFamiliaTarifaById(id),
    createFamiliaTarifa: (familia) => getDataService().createFamiliaTarifa(familia),
    updateFamiliaTarifa: (id, familia) => getDataService().updateFamiliaTarifa(id, familia),
    deleteFamiliaTarifa: (id) => getDataService().deleteFamiliaTarifa(id),
    getFamiliasByTarifaId: (tarifaId) => getDataService().getFamiliasByTarifaId(tarifaId),
    getRootFamilias: (tarifaId) => getDataService().getRootFamilias(tarifaId),
    getSubfamilias: (parentId) => getDataService().getSubfamilias(parentId),
    toggleFamiliaStatus: (id) => getDataService().toggleFamiliaStatus(id),
    
    // Servicios
    getAllServicios: () => getDataService().getAllServicios(),
    getServicioById: (id) => getDataService().getServicioById(id),
    createServicio: (servicio) => getDataService().createServicio(servicio),
    updateServicio: (id, servicio) => getDataService().updateServicio(id, servicio),
    deleteServicio: (id) => getDataService().deleteServicio(id),
    getServiciosByTarifaId: (tarifaId) => getDataService().getServiciosByTarifaId(tarifaId),
    
    // Tipos IVA
    getAllTiposIVA: () => getDataService().getAllTiposIVA(),
    getTipoIVAById: (id) => getDataService().getTipoIVAById(id),
    createTipoIVA: (tipoIVA) => getDataService().createTipoIVA(tipoIVA),
    updateTipoIVA: (id, tipoIVA) => getDataService().updateTipoIVA(id, tipoIVA),
    deleteTipoIVA: (id) => getDataService().deleteTipoIVA(id),
    getTiposIVAByTarifaId: (tarifaId) => getDataService().getTiposIVAByTarifaId(tarifaId),
    
    // Equipos - <<< REFACTORIZADO PARA USAR FETCH API >>>
    getAllEquipos: async (): Promise<PrismaEquipo[]> => {
      try {
        const response = await fetch('/api/equipment');
        if (!response.ok) {
          // console.error("API Error getAllEquipos:", response.status, await response.text()); // <<< Eliminar log
          // Lanzar error para manejo centralizado o en el contexto que llama
          throw new Error(`Error fetching all equipment: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        // console.error("Fetch error in getAllEquipos:", error); // <<< Eliminar log
        // Re-lanzar el error para que el llamador (EquipmentContext) lo maneje
        throw error;
      }
    },
    getEquipoById: async (id: string): Promise<PrismaEquipo | null> => {
      try {
        const response = await fetch(`/api/equipment/${id}`);
        if (response.status === 404) return null;
        if (!response.ok) {
          // console.error(`API Error getEquipoById(${id}):`, response.status, await response.text()); // <<< Eliminar log
          throw new Error(`Error fetching equipment ${id}: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        // console.error(`Fetch error in getEquipoById(${id}):`, error); // <<< Eliminar log
        return null;
      }
    },
    createEquipo: async (equipo): Promise<PrismaEquipo> => {
      try {
        const response = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(equipo),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          // console.error("API Error createEquipo:", response.status, errorBody); // <<< Eliminar log
          throw new Error(errorBody.error || `Error creating equipment: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        // console.error("Fetch error in createEquipo:", error); // <<< Eliminar log
        throw error; // Re-lanzar para manejo superior
      }
    },
    updateEquipo: async (id, equipo): Promise<PrismaEquipo | null> => {
      try {
        const response = await fetch(`/api/equipment/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(equipo),
        });
        if (response.status === 404) return null;
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          // console.error(`API Error updateEquipo(${id}):`, response.status, errorBody); // <<< Eliminar log
          throw new Error(errorBody.error || `Error updating equipment ${id}: ${response.status}`);
        }
        return await response.json(); // Devolver el equipo actualizado
      } catch (error) {
        // console.error(`Fetch error in updateEquipo(${id}):`, error); // <<< Eliminar log
        throw error; // Re-lanzar
      }
    },
    deleteEquipo: async (id): Promise<boolean> => {
      try {
        const response = await fetch(`/api/equipment/${id}`, {
          method: 'DELETE',
        });
        if (response.status === 404) return false;
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          // console.error(`API Error deleteEquipo(${id}):`, response.status, errorBody); // <<< Eliminar log
          throw new Error(errorBody.error || `Error deleting equipment ${id}: ${response.status}`);
        }
        return true;
      } catch (error) {
        // console.error(`Fetch error in deleteEquipo(${id}):`, error); // <<< Eliminar log
        return false;
      }
    },
    getEquiposByClinicaId: async (clinicaId): Promise<PrismaEquipo[]> => {
      try {
        const response = await fetch(`/api/equipment?clinicId=${clinicaId}`);
        if (!response.ok) {
          // console.error(`API Error getEquiposByClinicaId(${clinicaId}):`, response.status, await response.text()); // <<< Eliminar log
          throw new Error(`Error fetching equipment for clinic ${clinicaId}: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        // console.error(`Fetch error in getEquiposByClinicaId(${clinicaId}):`, error); // <<< Eliminar log
        return []; // Devolver vacío en caso de error
      }
    },
    // <<< FIN REFACTORIZADO >>>
    
    // Bloques de Agenda
    getAllScheduleBlocks: () => getDataService().getAllScheduleBlocks(),
    getScheduleBlockById: (id) => getDataService().getScheduleBlockById(id),
    createScheduleBlock: (block) => getDataService().createScheduleBlock(block),
    updateScheduleBlock: (id, block) => getDataService().updateScheduleBlock(id, block),
    deleteScheduleBlock: (id) => getDataService().deleteScheduleBlock(id),
    getBlocksByDateRange: (clinicId, startDate, endDate) => {
        // Pasar clinicId directamente como string, ya que SupabaseDataService lo espera así
        return getDataService().getBlocksByDateRange(clinicId, startDate, endDate);
    },
    
    // Imágenes (Específicas)
    getEntityImages: (entityType, entityId) => getDataService().getEntityImages(entityType, entityId),
    saveEntityImages: (entityType, entityId, images) => getDataService().saveEntityImages(entityType, entityId, images),
    deleteEntityImages: (entityType, entityId) => getDataService().deleteEntityImages(entityType, entityId),
    
    // Documentos (Específicos)
    getEntityDocuments: (entityType, entityId, category) => getDataService().getEntityDocuments(entityType, entityId, category),
    saveEntityDocuments: (entityType, entityId, documents, category) => getDataService().saveEntityDocuments(entityType, entityId, documents, category),
    deleteEntityDocuments: (entityType, entityId, category) => getDataService().deleteEntityDocuments(entityType, entityId, category),
    
    // Funciones de plantillas de agenda
    getScheduleTemplates: async () => { console.warn("getScheduleTemplates no implementado"); return []; },
    getTemplateById: async (id) => { console.warn(`getTemplateById(${id}) no implementado`); return null; },
    saveTemplate: async (template) => { console.warn("saveTemplate no implementado"); throw new Error("No implementado"); },
    deleteTemplate: async (id) => { console.warn(`deleteTemplate(${id}) no implementado`); return false; },
    getTemplatesByClinic: async (clinicId) => { console.warn(`getTemplatesByClinic(${clinicId}) no implementado`); return []; },
    
    // >>> FUNCIONES DE PRODUCTOS COMENTADAS (requieren implementación en SupabaseDataService) <<<
    // getAllProductos: () => getDataService().getAllProductos(),
    // getProductoById: (id) => getDataService().getProductoById(id),
    // createProducto: (producto) => getDataService().createProducto(producto),
    // updateProducto: (id, producto) => getDataService().updateProducto(id, producto),
    // deleteProducto: (id) => getDataService().deleteProducto(id),
    // getProductosByTarifaId: (tarifaId) => getDataService().getProductosByTarifaId(tarifaId),
    // getProductosByFamilia: (familia) => getDataService().getProductosByFamilia(familia),
    // <<< FIN FUNCIONES DE PRODUCTOS >>>
    
    // --- Implementaciones placeholder para PRODUCTOS --- 
    getAllProductos: async (): Promise<PrismaProducto[]> => {
      console.log("[interfaz-Context] Llamando a getAllProductos...");
      try {
        const response = await fetch('/api/products'); // Llama al endpoint GET
        if (!response.ok) {
          console.error(`[interfaz-Context] Error ${response.status} al obtener productos:`, await response.text());
          // Lanzar un error o devolver array vacío? Por ahora devolvemos vacío para evitar romper la UI
          // throw new Error(`Error ${response.status} al obtener productos`);
          return []; 
        }
        const products: PrismaProducto[] = await response.json();
        console.log(`[interfaz-Context] Productos obtenidos: ${products.length}`);
        return products;
      } catch (error) {
        console.error("[interfaz-Context] Error crítico en getAllProductos:", error);
        return []; // Devolver vacío en caso de error de red u otro
      }
    },
    getProductoById: async (id) => { console.warn(`getProductoById(${id}) no implementado`); return null; },
    createProducto: async (producto) => { console.warn("createProducto no implementado"); throw new Error("No implementado"); },
    updateProducto: async (id, producto) => { console.warn(`updateProducto(${id}) no implementado`); return null; },
    deleteProducto: async (id) => { console.warn(`deleteProducto(${id}) no implementado`); return false; },
    getProductosByTarifaId: async (tarifaId) => { console.warn(`getProductosByTarifaId(${tarifaId}) no implementado`); return []; },
    getProductosByFamilia: async (familia) => { console.warn(`getProductosByFamilia(${familia}) no implementado`); return []; },
    // --- Fin placeholders PRODUCTOS --- 
    
    // >>> FUNCIONES DE CONSUMOS COMENTADAS (requieren implementación en SupabaseDataService) <<<
    // getAllConsumos: () => getDataService().getAllConsumos(),
    // getConsumoById: (id) => getDataService().getConsumoById(id),
    // createConsumo: (consumo) => getDataService().createConsumo(consumo),
    // updateConsumo: (id, consumo) => getDataService().updateConsumo(id, consumo),
    // deleteConsumo: (id) => getDataService().deleteConsumo(id),
    // getConsumosByServicioId: (servicioId) => getDataService().getConsumosByServicioId(servicioId),
    // <<< FIN FUNCIONES DE CONSUMOS >>>

    // --- Implementaciones placeholder para CONSUMOS --- 
    getAllConsumos: async () => { console.warn("getAllConsumos no implementado"); return []; },
    getConsumoById: async (id) => { console.warn(`getConsumoById(${id}) no implementado`); return null; },
    createConsumo: async (consumo) => { console.warn("createConsumo no implementado"); throw new Error("No implementado"); },
    updateConsumo: async (id, consumo) => { console.warn(`updateConsumo(${id}) no implementado`); return null; },
    deleteConsumo: async (id) => { console.warn(`deleteConsumo(${id}) no implementado`); return false; },
    getConsumosByServicioId: async (servicioId) => { console.warn(`getConsumosByServicioId(${servicioId}) no implementado`); return []; },
    // --- Fin placeholders CONSUMOS --- 
    
    // >>> FUNCIONES DE USUARIOS COMENTADAS (requieren implementación en SupabaseDataService) <<<
    // getAllUsuarios: () => getDataService().getAllUsuarios(),
    // getUsuarioById: (id) => getDataService().getUsuarioById(id),
    // getUsuariosByClinica: (clinicaId) => getDataService().getUsuariosByClinica(clinicaId),
    // createUsuario: (usuario) => getDataService().createUsuario(usuario),
    // updateUsuario: (id, usuario) => getDataService().updateUsuario(id, usuario),
    // deleteUsuario: (id) => getDataService().deleteUsuario(id),
    // <<< FIN FUNCIONES DE USUARIOS >>>

    // --- Implementaciones placeholder para USUARIOS --- 
    getAllUsuarios: async () => { console.warn("getAllUsuarios no implementado"); return []; },
    getUsuarioById: async (id) => { console.warn(`getUsuarioById(${id}) no implementado`); return null; },
    getUsuariosByClinica: async (clinicaId) => { console.warn(`getUsuariosByClinica(${clinicaId}) no implementado`); return []; },
    createUsuario: async (usuario) => { console.warn("createUsuario no implementado"); throw new Error("No implementado"); },
    updateUsuario: async (id, usuario) => { console.warn(`updateUsuario(${id}) no implementado`); return null; },
    deleteUsuario: async (id) => { console.warn(`deleteUsuario(${id}) no implementado`); return false; },

    // Añadir aquí el resto de funciones delegadas...
  };
  
  return (
    <InterfazContext.Provider value={interfaz}>
      {children}
    </InterfazContext.Provider>
  );
}

// Hook para usar el contexto
export const useInterfaz = () => {
  const context = useContext(InterfazContext);
  if (context === undefined) {
    throw new Error("useInterfaz debe usarse dentro de un InterfazProvider");
  }
  if (!context.initialized) {
    console.warn("useInterfaz llamado antes de que InterfazProvider marcara como inicializado.");
  }
  return context;
};

// Exportar tipos necesarios
export type {
  PrismaClinica,
  PrismaTarifa,
  PrismaFamiliaTarifa,
  PrismaService,
  PrismaTipoIVA,
  PrismaEquipo,
  PrismaEntityImage,
  PrismaEntityDocument,
  PrismaScheduleTemplate,
  PrismaProducto,
  PrismaConsumo,
  PrismaUsuario,
  Client
}; 