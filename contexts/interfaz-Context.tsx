"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getDataService, initializeDataService } from "@/services/data"
import {
  Clinica,
  ClinicConfig,
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
  Consumo
} from "@/services/data/models/interfaces"
import { Client } from "@/services/data/data-service"

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
  
  // Funciones de imágenes
  getEntityImages: (entityType: string, entityId: string) => Promise<EntityImage[]>;
  saveEntityImages: (entityType: string, entityId: string, images: EntityImage[]) => Promise<boolean>;
  deleteEntityImages: (entityType: string, entityId: string) => Promise<boolean>;
  
  // Funciones de documentos
  getEntityDocuments: (entityType: string, entityId: string, category?: string) => Promise<EntityDocument[]>;
  saveEntityDocuments: (entityType: string, entityId: string, documents: EntityDocument[], category?: string) => Promise<boolean>;
  deleteEntityDocuments: (entityType: string, entityId: string, category?: string) => Promise<boolean>;

  // Funciones de archivos
  getAllFiles: () => Promise<EntityDocument[]>;
  getFileById: (id: string) => Promise<EntityDocument | null>;
  saveFile: (file: Omit<EntityDocument, 'id'>) => Promise<EntityDocument>;
  deleteFile: (id: string) => Promise<boolean>;
  updateFileMetadata: (id: string, metadata: Partial<EntityDocument>) => Promise<EntityDocument | null>;
  restoreFile: (id: string) => Promise<boolean>;
  getFilesByFilter: (filter: {entityType?: string, entityId?: string, category?: string}) => Promise<EntityDocument[]>;
  getStorageStats: (clinicId?: string) => Promise<{used: number, byType: Record<string, number>}>;
  
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
}

// Crear el contexto
const InterfazContext = createContext<InterfazContextType | undefined>(undefined);

// Provider del contexto
export function InterfazProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  // Inicialización del servicio de datos
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDataService();
        setInitialized(true);
        console.log("InterfazContext: Servicio de datos inicializado correctamente");
      } catch (error) {
        console.error("Error al inicializar el servicio de datos:", error);
      }
    };
    
    initialize();
  }, []);

  // Crear un objeto con todas las funciones del servicio de datos
  const interfaz: InterfazContextType = {
    initialized,
    
    // Función para reiniciar datos
    resetData: async () => {
      try {
        const dataService = getDataService();
        await dataService.clearStorageAndReloadData();
        // Reiniciamos el estado de inicialización para forzar la recarga
        setInitialized(false);
        // Permitimos que el efecto vuelva a inicializar
        setTimeout(() => setInitialized(true), 100);
        console.log("Datos reiniciados correctamente");
      } catch (error) {
        console.error("Error al reiniciar datos:", error);
      }
    },
    
    // Funciones de clínicas
    getAllClinicas: async () => {
      try {
        console.log("Interfaz: Obteniendo todas las clínicas");
        
        // Recuperar del localStorage para asegurar que tenemos los datos más recientes
        const clinicasLocalStorage = localStorage.getItem(CLINICAS_KEY);
        let clinicas: Clinica[] = clinicasLocalStorage ? JSON.parse(clinicasLocalStorage) : [];
        
        if (!Array.isArray(clinicas)) {
          console.warn("Formato incorrecto en almacenamiento, reiniciando clínicas");
          clinicas = [];
        }
        
        // Si no hay clínicas, inicializamos con datos por defecto
        if (clinicas.length === 0) {
          clinicas = [
            {
              id: "1",
              prefix: "BCN",
              name: "Barcelona Centro",
              city: "Barcelona",
              isActive: true,
              // Otros datos por defecto...
            },
            {
              id: "2",
              prefix: "MAD",
              name: "Madrid Salamanca",
              city: "Madrid",
              isActive: true,
              // Otros datos por defecto...
            },
            {
              id: "3",
              prefix: "VAL",
              name: "Valencia Centro",
              city: "Valencia",
              isActive: true,
              // Otros datos por defecto...
            },
            {
              id: "4",
              prefix: "SEV",
              name: "Sevilla Este",
              city: "Sevilla",
              isActive: false,
              // Agregar una clínica no activa...
            }
          ];
          
          // Guardar en localStorage
          localStorage.setItem(CLINICAS_KEY, JSON.stringify(clinicas));
        }
        
        // Devolver TODAS las clínicas, incluidas las inactivas
        return clinicas;
      } catch (error) {
        console.error("Error al obtener todas las clínicas:", error);
        return [];
      }
    },
    getClinicaById: async (id) => {
      const dataService = getDataService();
      return await dataService.getClinicaById(id);
    },
    createClinica: async (clinica) => {
      const dataService = getDataService();
      return await dataService.createClinica(clinica);
    },
    updateClinica: async (id, clinica) => {
      const dataService = getDataService();
      return await dataService.updateClinica(id, clinica);
    },
    deleteClinica: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteClinica(id);
    },
    getActiveClinicas: async () => {
      try {
        const todas = await interfaz.getAllClinicas();
        // Filtrar solo las activas
        return todas.filter(clinica => clinica.isActive === true);
      } catch (error) {
        console.error("Error al obtener clínicas activas:", error);
        return [];
      }
    },
    
    // Funciones de clientes
    getAllClients: async () => {
      const dataService = getDataService();
      return await dataService.getAllClients();
    },
    getClientById: async (id) => {
      const dataService = getDataService();
      return await dataService.getClientById(id);
    },
    createClient: async (client) => {
      const dataService = getDataService();
      return await dataService.createClient(client);
    },
    updateClient: async (id, client) => {
      const dataService = getDataService();
      return await dataService.updateClient(id, client);
    },
    deleteClient: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteClient(id);
    },
    getClientsByClinicId: async (clinicId) => {
      const dataService = getDataService();
      return await dataService.getClientsByClinicId(clinicId);
    },
    
    // Funciones de tarifas
    getAllTarifas: async () => {
      const dataService = getDataService();
      return await dataService.getAllTarifas();
    },
    getTarifaById: async (id) => {
      const dataService = getDataService();
      return await dataService.getTarifaById(id);
    },
    createTarifa: async (tarifa) => {
      const dataService = getDataService();
      return await dataService.createTarifa(tarifa);
    },
    updateTarifa: async (id, tarifa) => {
      const dataService = getDataService();
      return await dataService.updateTarifa(id, tarifa);
    },
    deleteTarifa: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteTarifa(id);
    },
    getTarifasByClinicaId: async (clinicaId) => {
      const dataService = getDataService();
      return await dataService.getTarifasByClinicaId(clinicaId);
    },
    addClinicaToTarifa: async (tarifaId, clinicaId, isPrimary) => {
      const dataService = getDataService();
      return await dataService.addClinicaToTarifa(tarifaId, clinicaId, isPrimary);
    },
    removeClinicaFromTarifa: async (tarifaId, clinicaId) => {
      const dataService = getDataService();
      return await dataService.removeClinicaFromTarifa(tarifaId, clinicaId);
    },
    setPrimaryClinicaForTarifa: async (tarifaId, clinicaId) => {
      const dataService = getDataService();
      return await dataService.setPrimaryClinicaForTarifa(tarifaId, clinicaId);
    },
    
    // Funciones de familias de tarifas
    getAllFamiliasTarifa: async () => {
      const dataService = getDataService();
      return await dataService.getAllFamiliasTarifa();
    },
    getFamiliaTarifaById: async (id) => {
      const dataService = getDataService();
      return await dataService.getFamiliaTarifaById(id);
    },
    createFamiliaTarifa: async (familia) => {
      const dataService = getDataService();
      return await dataService.createFamiliaTarifa(familia);
    },
    updateFamiliaTarifa: async (id, familia) => {
      const dataService = getDataService();
      return await dataService.updateFamiliaTarifa(id, familia);
    },
    deleteFamiliaTarifa: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteFamiliaTarifa(id);
    },
    getFamiliasByTarifaId: async (tarifaId) => {
      const dataService = getDataService();
      return await dataService.getFamiliasByTarifaId(tarifaId);
    },
    getRootFamilias: async (tarifaId) => {
      const dataService = getDataService();
      return await dataService.getRootFamilias(tarifaId);
    },
    getSubfamilias: async (parentId) => {
      const dataService = getDataService();
      return await dataService.getSubfamilias(parentId);
    },
    toggleFamiliaStatus: async (id) => {
      const dataService = getDataService();
      return await dataService.toggleFamiliaStatus(id);
    },
    
    // Funciones de servicios
    getAllServicios: async () => {
      const dataService = getDataService();
      return await dataService.getAllServicios();
    },
    getServicioById: async (id) => {
      const dataService = getDataService();
      return await dataService.getServicioById(id);
    },
    createServicio: async (servicio) => {
      const dataService = getDataService();
      return await dataService.createServicio(servicio);
    },
    updateServicio: async (id, servicio) => {
      const dataService = getDataService();
      return await dataService.updateServicio(id, servicio);
    },
    deleteServicio: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteServicio(id);
    },
    getServiciosByTarifaId: async (tarifaId) => {
      const dataService = getDataService();
      return await dataService.getServiciosByTarifaId(tarifaId);
    },
    
    // Funciones de tipos de IVA
    getAllTiposIVA: async () => {
      const dataService = getDataService();
      return await dataService.getAllTiposIVA();
    },
    getTipoIVAById: async (id) => {
      const dataService = getDataService();
      return await dataService.getTipoIVAById(id);
    },
    createTipoIVA: async (tipoIVA) => {
      const dataService = getDataService();
      return await dataService.createTipoIVA(tipoIVA);
    },
    updateTipoIVA: async (id, tipoIVA) => {
      const dataService = getDataService();
      return await dataService.updateTipoIVA(id, tipoIVA);
    },
    deleteTipoIVA: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteTipoIVA(id);
    },
    getTiposIVAByTarifaId: async (tarifaId) => {
      const dataService = getDataService();
      return await dataService.getTiposIVAByTarifaId(tarifaId);
    },
    
    // Funciones de equipos
    getAllEquipos: async () => {
      const dataService = getDataService();
      return await dataService.getAllEquipos();
    },
    getEquipoById: async (id) => {
      const dataService = getDataService();
      return await dataService.getEquipoById(id);
    },
    createEquipo: async (equipo) => {
      const dataService = getDataService();
      return await dataService.createEquipo(equipo);
    },
    updateEquipo: async (id, equipo) => {
      const dataService = getDataService();
      return await dataService.updateEquipo(id, equipo);
    },
    deleteEquipo: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteEquipo(id);
    },
    getEquiposByClinicaId: async (clinicaId) => {
      const dataService = getDataService();
      return await dataService.getEquiposByClinicaId(clinicaId);
    },
    
    // Funciones de bloques de agenda
    getAllScheduleBlocks: async () => {
      const dataService = getDataService();
      return await dataService.getAllScheduleBlocks();
    },
    getScheduleBlockById: async (id) => {
      const dataService = getDataService();
      return await dataService.getScheduleBlockById(id);
    },
    createScheduleBlock: async (block) => {
      const dataService = getDataService();
      return await dataService.createScheduleBlock(block);
    },
    updateScheduleBlock: async (id, block) => {
      const dataService = getDataService();
      return await dataService.updateScheduleBlock(id, block);
    },
    deleteScheduleBlock: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteScheduleBlock(id);
    },
    getBlocksByDateRange: async (clinicId, startDate, endDate) => {
      const dataService = getDataService();
      return await dataService.getBlocksByDateRange(clinicId, startDate, endDate);
    },
    
    // Funciones de imágenes
    getEntityImages: async (entityType, entityId) => {
      const dataService = getDataService();
      return await dataService.getEntityImages(entityType, entityId);
    },
    saveEntityImages: async (entityType, entityId, images) => {
      const dataService = getDataService();
      return await dataService.saveEntityImages(entityType, entityId, images);
    },
    deleteEntityImages: async (entityType, entityId) => {
      const dataService = getDataService();
      return await dataService.deleteEntityImages(entityType, entityId);
    },
    
    // Funciones de documentos
    getEntityDocuments: async (entityType, entityId, category) => {
      const dataService = getDataService();
      return await dataService.getEntityDocuments(entityType, entityId, category);
    },
    saveEntityDocuments: async (entityType, entityId, documents, category) => {
      const dataService = getDataService();
      return await dataService.saveEntityDocuments(entityType, entityId, documents, category);
    },
    deleteEntityDocuments: async (entityType, entityId, category) => {
      const dataService = getDataService();
      return await dataService.deleteEntityDocuments(entityType, entityId, category);
    },

    // Funciones de archivos
    getAllFiles: async () => {
      const dataService = getDataService();
      return await dataService.getAllFiles();
    },
    getFileById: async (id) => {
      const dataService = getDataService();
      return await dataService.getFileById(id);
    },
    saveFile: async (file) => {
      const dataService = getDataService();
      return await dataService.saveFile(file);
    },
    deleteFile: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteFile(id);
    },
    updateFileMetadata: async (id, metadata) => {
      const dataService = getDataService();
      return await dataService.updateFileMetadata(id, metadata);
    },
    restoreFile: async (id) => {
      const dataService = getDataService();
      return await dataService.restoreFile(id);
    },
    getFilesByFilter: async (filter) => {
      const dataService = getDataService();
      return await dataService.getFilesByFilter(filter);
    },
    getStorageStats: async (clinicId) => {
      const dataService = getDataService();
      return await dataService.getStorageStats(clinicId);
    },
    
    // Funciones de plantillas de agenda
    getScheduleTemplates: async () => {
      const dataService = getDataService();
      return await dataService.getScheduleTemplates();
    },
    getTemplateById: async (id) => {
      const dataService = getDataService();
      return await dataService.getTemplateById(id);
    },
    saveTemplate: async (template) => {
      const dataService = getDataService();
      return await dataService.saveTemplate(template);
    },
    deleteTemplate: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteTemplate(id);
    },
    getTemplatesByClinic: async (clinicId) => {
      const dataService = getDataService();
      return await dataService.getTemplatesByClinic(clinicId);
    },
    
    // Funciones de productos
    getAllProductos: async () => {
      const dataService = getDataService();
      return await dataService.getAllProductos();
    },
    getProductoById: async (id) => {
      const dataService = getDataService();
      return await dataService.getProductoById(id);
    },
    createProducto: async (producto) => {
      const dataService = getDataService();
      return await dataService.createProducto(producto);
    },
    updateProducto: async (id, producto) => {
      const dataService = getDataService();
      return await dataService.updateProducto(id, producto);
    },
    deleteProducto: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteProducto(id);
    },
    getProductosByTarifaId: async (tarifaId) => {
      const dataService = getDataService();
      return await dataService.getProductosByTarifaId(tarifaId);
    },
    getProductosByFamilia: async (familia) => {
      const dataService = getDataService();
      return await dataService.getProductosByFamilia(familia);
    },
    
    // Funciones de consumos de servicios
    getAllConsumos: async () => {
      const dataService = getDataService();
      return await dataService.getAllConsumos();
    },
    getConsumoById: async (id) => {
      const dataService = getDataService();
      return await dataService.getConsumoById(id);
    },
    createConsumo: async (consumo) => {
      const dataService = getDataService();
      return await dataService.createConsumo(consumo);
    },
    updateConsumo: async (id, consumo) => {
      const dataService = getDataService();
      return await dataService.updateConsumo(id, consumo);
    },
    deleteConsumo: async (id) => {
      const dataService = getDataService();
      return await dataService.deleteConsumo(id);
    },
    getConsumosByServicioId: async (servicioId) => {
      const dataService = getDataService();
      return await dataService.getConsumosByServicioId(servicioId);
    }
  };
  
  return (
    <InterfazContext.Provider value={interfaz}>
      {children}
    </InterfazContext.Provider>
  );
}

// Hook para usar el contexto
export function useInterfaz() {
  const context = useContext(InterfazContext);
  if (context === undefined) {
    throw new Error('useInterfaz debe ser usado dentro de un InterfazProvider');
  }
  return context;
}

// Exportar tipos necesarios
export type {
  Clinica,
  ClinicConfig,
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