import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useFiles } from './file-context';
import { useInterfaz } from './interfaz-Context';
import { v4 as uuidv4 } from 'uuid';
import { EntityDocument, EntityImage } from '@/services/data/models/interfaces';

interface StorageQuota {
  id: string;
  entityType: 'global' | 'clinic';
  entityId?: string;
  quotaSize: number; // En bytes
  isUnlimited: boolean;
}

interface StorageStats {
  used: number;
  quota: number;
  isUnlimited: boolean;
  percentUsed: number;
  byType: Record<string, number>;
  byEntityType: Record<string, number>;
}

// Opciones de configuración global para cuotas
interface QuotaSettings {
  mode: 'global' | 'individual'; // 'global' = misma cuota para todas, 'individual' = personalizada por clínica
  defaultQuotaSize: number; // Tamaño predeterminado en bytes
  defaultIsUnlimited: boolean; // Si la cuota predeterminada es ilimitada
}

interface StorageContextType {
  getStorageStats: (clinicId?: string) => Promise<StorageStats>;
  setQuota: (entityType: 'global' | 'clinic', entityId: string | undefined, size: number, isUnlimited?: boolean) => Promise<boolean>;
  getQuota: (entityType: 'global' | 'clinic', entityId?: string) => Promise<StorageQuota>;
  connectExternalProvider: (provider: string, config: any) => Promise<boolean>;
  disconnectExternalProvider: (provider: string) => Promise<boolean>;
  getConnectedProviders: () => Promise<{ provider: string; isConnected: boolean; }[]>;
  registerFileForClinic: (clinicId: string, fileData: EntityDocument) => Promise<void>;
  updateStorageStats: (clinicId?: string) => Promise<void>;
  // Nuevos métodos para gestión avanzada de cuotas
  getQuotaSettings: () => Promise<QuotaSettings>;
  setQuotaSettings: (settings: QuotaSettings) => Promise<void>;
  applyQuotaToAllClinics: (size: number, isUnlimited: boolean) => Promise<boolean>;
  getClinicQuotas: () => Promise<StorageQuota[]>;
  // Nuevo método para reparto proporcional
  distributeStorageProportionally: (totalStorage?: number) => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

// Valores por defecto para evitar problemas de renderizado
const DEFAULT_QUOTA_SIZE = 0; // Cambiado de 1TB a 0 (sin asignación por defecto)
const MIN_QUOTA_SIZE = 1024 * 1024 * 1024; // 1GB para evitar divisiones por cero

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fileContext = useFiles();
  const interfaz = useInterfaz();
  
  // Estado para cuotas - ahora es temporal, se cargará desde la interfaz
  const [quotas, setQuotas] = useState<StorageQuota[]>([]);
  
  // Nuevo estado para configuración de cuotas
  const [quotaSettings, setQuotaSettingsState] = useState<QuotaSettings>({
    mode: 'global',
    defaultQuotaSize: 0, // Sin valor predeterminado para nuevas clínicas
    defaultIsUnlimited: false
  });
  
  // Estado para proveedores conectados
  const [connectedProviders, setConnectedProviders] = useState<{ provider: string; isConnected: boolean; }[]>([
    { provider: 'local', isConnected: true },
    { provider: 'gdrive', isConnected: false },
    { provider: 'dropbox', isConnected: false }
  ]);
  
  // Cargar datos iniciales usando la interfaz
  useEffect(() => {
    if (interfaz.initialized) {
      loadQuotasFromInterface();
      loadQuotaSettingsFromInterface();
      loadProvidersFromInterface();
    }
  }, [interfaz.initialized]);
  
  // Función para cargar cuotas desde la interfaz
  const loadQuotasFromInterface = async () => {
    try {
      // Aquí se usará la interfaz cuando los métodos estén implementados
      // Por ahora, función placeholder que usa datos locales temporales
      // Esta función será reemplazada cuando se implementen los métodos en la interfaz
      
      // Futuro: const quotasData = await interfaz.getAllStorageQuotas();
      
      // Mientras tanto, intentamos cargar del localStorage para mantener compatibilidad
      const savedQuotas = localStorage.getItem('appStorageQuotas');
      if (savedQuotas) {
        try {
          setQuotas(JSON.parse(savedQuotas));
        } catch (error) {
          console.error("Error parsing saved quotas:", error);
          // Establecer cuota global por defecto
          setQuotas([
            {
              id: 'global',
              entityType: 'global',
              quotaSize: MIN_QUOTA_SIZE,
              isUnlimited: false
            }
          ]);
        }
      } else {
        // Cuota global por defecto
        setQuotas([
          {
            id: 'global',
            entityType: 'global',
            quotaSize: MIN_QUOTA_SIZE,
            isUnlimited: false
          }
        ]);
      }
    } catch (error) {
      console.error("Error loading quotas from interface:", error);
      // Valor por defecto seguro
      setQuotas([
        {
          id: 'global',
          entityType: 'global',
          quotaSize: MIN_QUOTA_SIZE,
          isUnlimited: false
        }
      ]);
    }
  };
  
  // Función para cargar configuración de cuotas
  const loadQuotaSettingsFromInterface = async () => {
    try {
      // Futuro: const settings = await interfaz.getStorageQuotaSettings();
      
      // Mientras tanto, cargar de localStorage
      const savedQuotaSettings = localStorage.getItem('appQuotaSettings');
      if (savedQuotaSettings) {
        try {
          setQuotaSettingsState(JSON.parse(savedQuotaSettings));
        } catch (error) {
          console.error("Error parsing quota settings:", error);
          // Usar valores predeterminados
          setQuotaSettingsState({
            mode: 'global',
            defaultQuotaSize: 0,
            defaultIsUnlimited: false
          });
        }
      }
    } catch (error) {
      console.error("Error loading quota settings from interface:", error);
    }
  };
  
  // Función para cargar proveedores
  const loadProvidersFromInterface = async () => {
    try {
      // Futuro: const providers = await interfaz.getStorageProviders();
      // Por ahora mantener los proveedores estáticos
    } catch (error) {
      console.error("Error loading providers from interface:", error);
    }
  };

  // Función para calcular el espacio total disponible en el sistema
  const getTotalSystemStorage = (): number => {
    // Este es el espacio total físico del sistema (1TB por defecto)
    return 1024 * 1024 * 1024 * 1024; // 1TB
  };
  
  // Función para calcular el espacio total asignado a clínicas específicas
  const getTotalAssignedStorage = (): number => {
    let total = 0;
    
    // Sumar todas las cuotas específicas (no ilimitadas)
    quotas.forEach(quota => {
      if (quota.entityType === 'clinic' && !quota.isUnlimited) {
        total += quota.quotaSize;
      }
    });
    
    return total;
  };

  // Función para calcular el espacio compartido disponible (global - asignado)
  const getSharedStorageAvailable = (): number => {
    const totalSystem = getTotalSystemStorage();
    const totalAssigned = getTotalAssignedStorage();
    return Math.max(0, totalSystem - totalAssigned);
  };

  // Obtener estadísticas de almacenamiento
  const getStorageStats = async (clinicId?: string): Promise<StorageStats> => {
    try {
      // Futuro: usar interfaz.getStorageStats(clinicId);
      
      // Obtener estadísticas del contexto de archivos (temporal)
      // Verificar si el método existe y manejar posibles promesas
      let fileStats = { used: 0, byType: {}, byEntityType: {} };
      
      if (fileContext.getStorageStats) {
        const stats = fileContext.getStorageStats(clinicId);
        // Comprobar si es una promesa
        if (stats instanceof Promise) {
          fileStats = await stats;
          // Asegurar que tiene todas las propiedades requeridas
          if (!fileStats.byEntityType) {
            fileStats.byEntityType = {};
          }
        } else {
          fileStats = stats;
          // Asegurar que tiene todas las propiedades requeridas
          if (!fileStats.byEntityType) {
            fileStats.byEntityType = {};
          }
        }
      }
      
      // Obtener la cuota aplicable
      let quota: StorageQuota;
      
      if (!clinicId) {
        // Para estadísticas globales del sistema
        quota = {
          id: 'system',
          entityType: 'global',
          quotaSize: getTotalSystemStorage(),
          isUnlimited: false
        };
      } else {
        // Buscar cuota específica para esta clínica
        const specificQuota = quotas.find(q => q.id === `clinic-${clinicId}`);
        
        if (specificQuota) {
          // La clínica tiene una cuota específica asignada
          quota = specificQuota;
        } else {
          // La clínica usa el espacio compartido
          quota = {
            id: 'shared',
            entityType: 'global',
            quotaSize: getSharedStorageAvailable(),
            isUnlimited: true // Usa el espacio compartido
          };
        }
      }
      
      // Asegurar un tamaño mínimo para la cuota
      const safeQuotaSize = quota.isUnlimited ? getSharedStorageAvailable() : Math.max(quota.quotaSize, MIN_QUOTA_SIZE);
      
      // Cálculo seguro del porcentaje
      const percentUsed = quota.isUnlimited 
        ? Math.min(100, (fileStats.used / getSharedStorageAvailable()) * 100)
        : Math.min(100, (fileStats.used / safeQuotaSize) * 100);
      
      return {
        used: fileStats.used,
        quota: safeQuotaSize,
        isUnlimited: quota.isUnlimited,
        percentUsed,
        byType: fileStats.byType || {},
        byEntityType: fileStats.byEntityType || {}
      };
    } catch (error) {
      console.error("Error getting storage stats:", error);
      // Devolver estadísticas seguras por defecto
      return {
        used: 0,
        quota: MIN_QUOTA_SIZE,
        isUnlimited: false,
        percentUsed: 0,
        byType: {},
        byEntityType: {}
      };
    }
  };

  // Establecer una cuota
  const setQuota = async (
    entityType: 'global' | 'clinic', 
    entityId: string | undefined, 
    size: number, 
    isUnlimited: boolean = false
  ): Promise<boolean> => {
    try {
      // Futuro: usar interfaz.setStorageQuota(entityType, entityId, size, isUnlimited);
      
      // Generar ID según tipo
      const quotaId = entityType === 'global' 
        ? 'global'
        : `clinic-${entityId}`;
      
      // Buscar si ya existe
      const existingIndex = quotas.findIndex(q => q.id === quotaId);
      
      // Crear cuota actualizada
      const updatedQuota: StorageQuota = {
        id: quotaId,
        entityType,
        entityId,
        quotaSize: size,
        isUnlimited
      };
      
      if (existingIndex >= 0) {
        // Actualizar cuota existente
        const updatedQuotas = [...quotas];
        updatedQuotas[existingIndex] = updatedQuota;
        setQuotas(updatedQuotas);
      } else {
        // Agregar nueva cuota
        setQuotas([...quotas, updatedQuota]);
      }
      
      // Guardar en localStorage (temporal)
      try {
        localStorage.setItem('appStorageQuotas', JSON.stringify(quotas));
      } catch (error) {
        console.error("Error saving quotas to localStorage:", error);
      }
      
      return true;
    } catch (error) {
      console.error("Error setting quota:", error);
      return false;
    }
  };

  // Obtener una cuota
  const getQuota = async (entityType: 'global' | 'clinic', entityId?: string): Promise<StorageQuota> => {
    try {
      // Futuro: return await interfaz.getStorageQuota(entityType, entityId);
      
      // Generar ID
      const quotaId = entityType === 'global' 
        ? 'global'
        : `clinic-${entityId}`;
      
      // Buscar cuota
      const quota = quotas.find(q => q.id === quotaId);
      
      if (quota) {
        return quota;
      }
      
      // Si no hay cuota global, devolver por defecto
      if (entityType === 'global') {
        return {
          id: 'global',
          entityType: 'global',
          quotaSize: MIN_QUOTA_SIZE,
          isUnlimited: false
        };
      }
      
      // Para clínicas sin cuota específica, usar configuración por defecto
      if (entityType === 'clinic' && entityId) {
        if (quotaSettings.mode === 'global') {
          // Todas las clínicas usan la configuración global
          const globalQuota = quotas.find(q => q.id === 'global');
          
          if (globalQuota) {
            return {
              id: `clinic-${entityId}`,
              entityType: 'clinic',
              entityId,
              quotaSize: globalQuota.quotaSize,
              isUnlimited: globalQuota.isUnlimited
            };
          }
        }
        
        // Usar cuota predeterminada para clínicas individuales
        return {
          id: `clinic-${entityId}`,
          entityType: 'clinic',
          entityId,
          quotaSize: quotaSettings.defaultQuotaSize || 0,
          isUnlimited: quotaSettings.defaultIsUnlimited
        };
      }
      
      // Fallback final
      return {
        id: quotaId,
        entityType,
        entityId,
        quotaSize: MIN_QUOTA_SIZE,
        isUnlimited: false
      };
    } catch (error) {
      console.error("Error getting quota:", error);
      return {
        id: entityType === 'global' ? 'global' : `clinic-${entityId}`,
        entityType,
        entityId,
        quotaSize: MIN_QUOTA_SIZE,
        isUnlimited: false
      };
    }
  };

  // Obtener configuración de cuotas
  const getQuotaSettings = async (): Promise<QuotaSettings> => {
    // Futuro: return await interfaz.getStorageQuotaSettings();
    return quotaSettings;
  };

  // Establecer configuración de cuotas
  const setQuotaSettings = async (settings: QuotaSettings): Promise<void> => {
    try {
      // Futuro: await interfaz.setStorageQuotaSettings(settings);
      
      setQuotaSettingsState(settings);
      
      // Guardar en localStorage (temporal)
      try {
        localStorage.setItem('appQuotaSettings', JSON.stringify(settings));
      } catch (error) {
        console.error("Error saving quota settings to localStorage:", error);
      }
    } catch (error) {
      console.error("Error setting quota settings:", error);
      throw error;
    }
  };

  // Aplicar una cuota a todas las clínicas
  const applyQuotaToAllClinics = async (size: number, isUnlimited: boolean): Promise<boolean> => {
    try {
      // Futuro: return await interfaz.applyStorageQuotaToAllClinics(size, isUnlimited);
      
      // Obtener todas las clínicas
      const clinicas = await interfaz.getAllClinicas();
      
      // Recorrer clínicas y asignar misma cuota
      const updatedQuotas = [...quotas];
      
      // Filtrar cuotas que no sean de clínicas
      const nonClinicQuotas = updatedQuotas.filter(q => q.entityType !== 'clinic');
      
      // Crear nuevas cuotas para cada clínica
      const clinicQuotas = clinicas.map(clinica => ({
        id: `clinic-${clinica.id}`,
        entityType: 'clinic' as 'clinic',
        entityId: clinica.id,
        quotaSize: size,
        isUnlimited
      }));
      
      // Guardar cuotas actualizadas
      setQuotas([...nonClinicQuotas, ...clinicQuotas]);
      
      // Guardar en localStorage (temporal)
      try {
        localStorage.setItem('appStorageQuotas', JSON.stringify([...nonClinicQuotas, ...clinicQuotas]));
      } catch (error) {
        console.error("Error saving quotas to localStorage:", error);
      }
      
      return true;
    } catch (error) {
      console.error("Error applying quota to all clinics:", error);
      return false;
    }
  };

  // Obtener cuotas de clínicas
  const getClinicQuotas = async (): Promise<StorageQuota[]> => {
    // Futuro: return await interfaz.getClinicStorageQuotas();
    return quotas.filter(q => q.entityType === 'clinic');
  };

  // Conectar proveedor externo
  const connectExternalProvider = async (provider: string, config: any): Promise<boolean> => {
    try {
      // Futuro: return await interfaz.connectStorageProvider(provider, config);
      
      // Actualizar estado local
      const updatedProviders = connectedProviders.map(p => 
        p.provider === provider ? { ...p, isConnected: true } : p
      );
      
      setConnectedProviders(updatedProviders);
      
      return true;
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
      return false;
    }
  };

  // Desconectar proveedor externo
  const disconnectExternalProvider = async (provider: string): Promise<boolean> => {
    try {
      // Futuro: return await interfaz.disconnectStorageProvider(provider);
      
      // Actualizar estado local
      const updatedProviders = connectedProviders.map(p => 
        p.provider === provider ? { ...p, isConnected: false } : p
      );
      
      setConnectedProviders(updatedProviders);
      
      return true;
    } catch (error) {
      console.error(`Error disconnecting from ${provider}:`, error);
      return false;
    }
  };

  // Obtener proveedores conectados
  const getConnectedProviders = async (): Promise<{ provider: string; isConnected: boolean; }[]> => {
    // Futuro: return await interfaz.getConnectedStorageProviders();
    return connectedProviders;
  };

  // Registrar archivo para clínica
  const registerFileForClinic = async (clinicId: string, fileData: EntityDocument): Promise<void> => {
    try {
      // Futuro: await interfaz.registerFileForClinic(clinicId, fileData);
      // Por ahora, solo actualizar estadísticas
      await updateStorageStats(clinicId);
    } catch (error) {
      console.error("Error registering file for clinic:", error);
    }
  };

  // Distribuir espacio proporcionalmente
  const distributeStorageProportionally = async (totalStorage?: number): Promise<void> => {
    try {
      // Futuro: await interfaz.distributeStorageProportionally(totalStorage);
      
      const totalToDistribute = totalStorage || getTotalSystemStorage();
      
      // Obtener todas las clínicas
      const clinicas = await interfaz.getAllClinicas();
      
      if (clinicas.length === 0) return;
      
      // Calcular cantidad por clínica
      const amountPerClinic = Math.floor(totalToDistribute / clinicas.length);
      
      // Crear cuotas actualizadas
      const updatedQuotas = quotas.filter(q => q.entityType !== 'clinic');
      
      // Asignar cuota a cada clínica
      clinicas.forEach(clinica => {
        updatedQuotas.push({
          id: `clinic-${clinica.id}`,
          entityType: 'clinic',
          entityId: clinica.id,
          quotaSize: amountPerClinic,
          isUnlimited: false
        });
      });
      
      // Actualizar estado
      setQuotas(updatedQuotas);
      
      // Guardar en localStorage (temporal)
      try {
        localStorage.setItem('appStorageQuotas', JSON.stringify(updatedQuotas));
      } catch (error) {
        console.error("Error saving quotas to localStorage:", error);
      }
    } catch (error) {
      console.error("Error distributing storage proportionally:", error);
    }
  };

  // Actualizar estadísticas de almacenamiento
  const updateStorageStats = async (clinicId?: string): Promise<void> => {
    // Esta función se mantiene para compatibilidad, pero ahora las estadísticas
    // se calculan en tiempo real con getStorageStats
    try {
      // Futuro: await interfaz.refreshStorageStats(clinicId);
    } catch (error) {
      console.error("Error updating storage stats:", error);
    }
  };

  return (
    <StorageContext.Provider value={{
      getStorageStats,
      setQuota,
      getQuota,
      connectExternalProvider,
      disconnectExternalProvider,
      getConnectedProviders,
      registerFileForClinic,
      updateStorageStats,
      getQuotaSettings,
      setQuotaSettings,
      applyQuotaToAllClinics,
      getClinicQuotas,
      distributeStorageProportionally
    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error("useStorage debe ser usado dentro de un StorageProvider");
  }
  return context;
}; 