"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getDataService } from "@/services/data"
import {
  Clinica,
  Tarifa,
  FamiliaTarifa,
  Servicio,
  TipoIVA,
  Equipo,
  ScheduleBlock,
  EntityImage,
  EntityDocument,
  ScheduleTemplate,
  Producto,
  Consumo,
  Usuario
} from "@/services/data/models/interfaces"
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
  getAllClinicas: () => Promise<Clinica[]>;
  getClinicaById: (id: string) => Promise<Clinica | null>;
  createClinica: (clinica: Omit<Clinica, 'id'>) => Promise<Clinica>;
  updateClinica: (id: string, clinica: Partial<Clinica>) => Promise<Clinica | null>;
  deleteClinica: (id: string) => Promise<boolean>;
  getActiveClinicas: () => Promise<Clinica[]>;
  
  // Funciones de clientes
  getAllClients: () => Promise<Client[]>;
  getClientById: (id: string) => Promise<Client | null>;
  createClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, client: Partial<Client>) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;
  getClientsByClinicId: (clinicId: string) => Promise<Client[]>;
  
  // Funciones de tarifas
  getAllTarifas: () => Promise<Tarifa[]>;
  getTarifaById: (id: string) => Promise<Tarifa | null>;
  createTarifa: (tarifa: Omit<Tarifa, 'id'>) => Promise<Tarifa>;
  updateTarifa: (id: string, tarifa: Partial<Tarifa>) => Promise<Tarifa | null>;
  deleteTarifa: (id: string) => Promise<boolean>;
  getTarifasByClinicaId: (clinicaId: string) => Promise<Tarifa[]>;
  addClinicaToTarifa: (tarifaId: string, clinicaId: string, isPrimary?: boolean) => Promise<boolean>;
  removeClinicaFromTarifa: (tarifaId: string, clinicaId: string) => Promise<boolean>;
  setPrimaryClinicaForTarifa: (tarifaId: string, clinicaId: string) => Promise<boolean>;
  
  // Funciones de familias de tarifas
  getAllFamiliasTarifa: () => Promise<FamiliaTarifa[]>;
  getFamiliaTarifaById: (id: string) => Promise<FamiliaTarifa | null>;
  createFamiliaTarifa: (familia: Omit<FamiliaTarifa, 'id'>) => Promise<FamiliaTarifa>;
  updateFamiliaTarifa: (id: string, familia: Partial<FamiliaTarifa>) => Promise<FamiliaTarifa | null>;
  deleteFamiliaTarifa: (id: string) => Promise<boolean>;
  getFamiliasByTarifaId: (tarifaId: string) => Promise<FamiliaTarifa[]>;
  getRootFamilias: (tarifaId: string) => Promise<FamiliaTarifa[]>;
  getSubfamilias: (parentId: string) => Promise<FamiliaTarifa[]>;
  toggleFamiliaStatus: (id: string) => Promise<boolean>;
  
  // Funciones de servicios
  getAllServicios: () => Promise<Servicio[]>;
  getServicioById: (id: string) => Promise<Servicio | null>;
  createServicio: (servicio: Omit<Servicio, 'id'>) => Promise<Servicio>;
  updateServicio: (id: string, servicio: Partial<Servicio>) => Promise<Servicio | null>;
  deleteServicio: (id: string) => Promise<boolean>;
  getServiciosByTarifaId: (tarifaId: string) => Promise<Servicio[]>;
  
  // Funciones de tipos de IVA
  getAllTiposIVA: () => Promise<TipoIVA[]>;
  getTipoIVAById: (id: string) => Promise<TipoIVA | null>;
  createTipoIVA: (tipoIVA: Omit<TipoIVA, 'id'>) => Promise<TipoIVA>;
  updateTipoIVA: (id: string, tipoIVA: Partial<TipoIVA>) => Promise<TipoIVA | null>;
  deleteTipoIVA: (id: string) => Promise<boolean>;
  getTiposIVAByTarifaId: (tarifaId: string) => Promise<TipoIVA[]>;
  
  // Funciones de equipos
  getAllEquipos: () => Promise<Equipo[]>;
  getEquipoById: (id: string) => Promise<Equipo | null>;
  createEquipo: (equipo: Omit<Equipo, 'id'>) => Promise<Equipo>;
  updateEquipo: (id: string, equipo: Partial<Equipo>) => Promise<Equipo | null>;
  deleteEquipo: (id: string) => Promise<boolean>;
  getEquiposByClinicaId: (clinicaId: string) => Promise<Equipo[]>;
  
  // Funciones de bloques de agenda
  getAllScheduleBlocks: () => Promise<ScheduleBlock[]>;
  getScheduleBlockById: (id: string) => Promise<ScheduleBlock | null>;
  createScheduleBlock: (block: Omit<ScheduleBlock, 'id'>) => Promise<ScheduleBlock>;
  updateScheduleBlock: (id: string, block: Partial<ScheduleBlock>) => Promise<ScheduleBlock | null>;
  deleteScheduleBlock: (id: string) => Promise<boolean>;
  getBlocksByDateRange: (clinicId: string, startDate: string, endDate: string) => Promise<ScheduleBlock[]>;
  
  // Funciones de imágenes (ESPECÍFICAS, no genéricas)
  getEntityImages: (entityType: string, entityId: string) => Promise<EntityImage[]>;
  saveEntityImages: (entityType: string, entityId: string, images: EntityImage[]) => Promise<boolean>;
  deleteEntityImages: (entityType: string, entityId: string) => Promise<boolean>;
  
  // Funciones de documentos (ESPECÍFICAS, no genéricas)
  getEntityDocuments: (entityType: string, entityId: string, category?: string) => Promise<EntityDocument[]>;
  saveEntityDocuments: (entityType: string, entityId: string, documents: EntityDocument[], category?: string) => Promise<boolean>;
  deleteEntityDocuments: (entityType: string, entityId: string, category?: string) => Promise<boolean>;

  // Funciones de plantillas de agenda
  getScheduleTemplates: () => Promise<ScheduleTemplate[]>;
  getTemplateById: (id: string) => Promise<ScheduleTemplate | null>;
  saveTemplate: (template: Omit<ScheduleTemplate, 'id' | 'createdAt'>) => Promise<ScheduleTemplate>;
  deleteTemplate: (id: string) => Promise<boolean>;
  getTemplatesByClinic: (clinicId: string | null) => Promise<ScheduleTemplate[]>;
  
  // Funciones de productos
  getAllProductos: () => Promise<Producto[]>;
  getProductoById: (id: string) => Promise<Producto | null>;
  createProducto: (producto: Omit<Producto, 'id' | 'fechaCreacion'>) => Promise<Producto>;
  updateProducto: (id: string, producto: Partial<Producto>) => Promise<Producto | null>;
  deleteProducto: (id: string) => Promise<boolean>;
  getProductosByTarifaId: (tarifaId: string) => Promise<Producto[]>;
  getProductosByFamilia: (familia: string) => Promise<Producto[]>;
  
  // Funciones de consumos de servicios
  getAllConsumos: () => Promise<Consumo[]>;
  getConsumoById: (id: string) => Promise<Consumo | null>;
  createConsumo: (consumo: Omit<Consumo, 'id'>) => Promise<Consumo>;
  updateConsumo: (id: string, consumo: Partial<Consumo>) => Promise<Consumo | null>;
  deleteConsumo: (id: string) => Promise<boolean>;
  getConsumosByServicioId: (servicioId: string) => Promise<Consumo[]>;

  // Funciones de usuarios
  getAllUsuarios: () => Promise<Usuario[]>;
  getUsuarioById: (id: string) => Promise<Usuario | null>;
  getUsuariosByClinica: (clinicaId: string) => Promise<Usuario[]>;
  createUsuario: (usuario: Omit<Usuario, 'id'>) => Promise<Usuario>;
  updateUsuario: (id: string, usuario: Partial<Usuario>) => Promise<Usuario | null>;
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
    
    // Equipos
    getAllEquipos: () => getDataService().getAllEquipos(),
    getEquipoById: (id) => getDataService().getEquipoById(id),
    createEquipo: (equipo) => getDataService().createEquipo(equipo),
    updateEquipo: (id, equipo) => getDataService().updateEquipo(id, equipo),
    deleteEquipo: (id) => getDataService().deleteEquipo(id),
    getEquiposByClinicaId: (clinicaId) => getDataService().getEquiposByClinicaId(clinicaId),
    
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
    getAllProductos: async () => { console.warn("getAllProductos no implementado"); return []; },
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
  Clinica,
  Tarifa,
  FamiliaTarifa,
  Servicio,
  TipoIVA,
  Equipo,
  ScheduleBlock,
  EntityImage,
  EntityDocument,
  Client
}; 