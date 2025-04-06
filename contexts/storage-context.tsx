import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useFiles } from './file-context';
import { v4 as uuidv4 } from 'uuid';
import { EntityDocument, EntityImage, Clinica } from '@/services/data/models/interfaces';

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
  
  const [quotas, setQuotas] = useState<StorageQuota[]>([]);
  const [quotaSettings, setQuotaSettingsState] = useState<QuotaSettings>({
    mode: 'global',
    defaultQuotaSize: 0,
    defaultIsUnlimited: false
  });
  
  // Cargar datos iniciales desde localStorage (ya que no hay API)
  useEffect(() => {
     // Cargar Quotas
    const savedQuotas = localStorage.getItem('appStorageQuotas');
    if (savedQuotas) {
      try { setQuotas(JSON.parse(savedQuotas)); } catch (e) { console.error(e); setDefaultQuota(); }
    } else {
      setDefaultQuota();
    }
    // Cargar Settings
    const savedSettings = localStorage.getItem('appQuotaSettings');
    if (savedSettings) {
       try { setQuotaSettingsState(JSON.parse(savedSettings)); } catch (e) { console.error(e); /* Mantener default */ }
    }
  }, []);
  
  const setDefaultQuota = () => {
       setQuotas([
          {
            id: 'global', entityType: 'global', quotaSize: MIN_QUOTA_SIZE, isUnlimited: false
          }
        ]);
  };
  
  // Guardar en localStorage cuando cambien
  useEffect(() => { localStorage.setItem('appStorageQuotas', JSON.stringify(quotas)); }, [quotas]);
  useEffect(() => { localStorage.setItem('appQuotaSettings', JSON.stringify(quotaSettings)); }, [quotaSettings]);

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

  // Refactorizar getStorageStats para usar fetch
  const getStorageStats = useCallback(async (clinicId?: string): Promise<StorageStats> => {
    let used = 0;
    const byType: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    let relevantFiles: EntityDocument[] = []; // Usar EntityDocument si es el tipo de useFiles
    let targetQuota: StorageQuota = quotas.find(q => q.entityType === 'global') || 
                                   { id: 'global', entityType: 'global', quotaSize: MIN_QUOTA_SIZE, isUnlimited: false };
    let percentUsed = 0;

    try {
      if (clinicId) {
        // Obtener archivos para esta clínica específica
        relevantFiles = await fileContext.getFilesByFilter({ clinicId, isDeleted: false });
        targetQuota = quotas.find(q => q.entityType === 'clinic' && q.entityId === clinicId) || 
                      quotas.find(q => q.entityType === 'global') || targetQuota;
      } else {
        // Obtener todos los archivos (si no hay clinicId)
        relevantFiles = await fileContext.getFilesByFilter({ isDeleted: false });
        targetQuota = quotas.find(q => q.entityType === 'global') || targetQuota;
      }

      // Calcular uso y estadísticas de tipos
      relevantFiles.forEach(file => {
        const fileSize = file.fileSize || 0; 
        used += fileSize;
        const fileMimeType = file.mimeType?.split('/')[0] || 'unknown';
        byType[fileMimeType] = (byType[fileMimeType] || 0) + fileSize;
        byEntityType[file.entityType] = (byEntityType[file.entityType] || 0) + fileSize;
      });

      // Calcular porcentaje
      if (!targetQuota.isUnlimited && targetQuota.quotaSize > 0) {
           // Si es cuota global, necesitamos el uso total de *todas* las clínicas que usan cuota global
          if (targetQuota.entityType === 'global') {
              let totalGlobalUsage = 0;
              // Obtener todas las clínicas desde la API
              const response = await fetch('/api/clinics');
              if (!response.ok) {
                  console.error("Error fetching clinics for global quota calculation");
              } else {
                  const allClinics: Clinica[] = await response.json();
                  // Filtrar clínicas que usan cuota global (no tienen cuota específica)
                  const clinicsUsingGlobal = allClinics.filter(c => 
                      !quotas.some(q => q.entityType === 'clinic' && q.entityId === String(c.id))
                  );
                  // Calcular uso total para estas clínicas (requiere llamar a getFilesByFilter para cada una)
                  // ¡¡¡ ESTO PUEDE SER MUY LENTO !!! Considerar calcular esto en backend.
                  for (const clinic of clinicsUsingGlobal) {
                      const clinicFiles = await fileContext.getFilesByFilter({ clinicId: String(clinic.id), isDeleted: false });
                      totalGlobalUsage += clinicFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0);
                  }
              }
              percentUsed = Math.min(100, (totalGlobalUsage / targetQuota.quotaSize) * 100);
          } else {
              // Es cuota específica de clínica
              percentUsed = Math.min(100, (used / targetQuota.quotaSize) * 100);
          }
      } else {
          percentUsed = 0; // Ilimitado o cuota 0
      }

    } catch (error) {
      console.error("Error calculating storage stats:", error);
      // Devolver valores por defecto en caso de error
    }

    return {
      used,
      quota: targetQuota.quotaSize,
      isUnlimited: targetQuota.isUnlimited,
      percentUsed,
      byType,
      byEntityType,
    };
  }, [fileContext, quotas]); // Depender de fileContext y quotas

  // --- Funciones pendientes de API (setQuota, getQuota, etc.) ---
  // Mantener la lógica actual con localStorage por ahora

  const setQuota = async (entityType: 'global' | 'clinic', entityId: string | undefined, size: number, isUnlimited: boolean = false): Promise<boolean> => {
    console.warn("setQuota usando localStorage, pendiente de API");
    const quotaId = entityType === 'global' ? 'global' : entityId;
    if (!quotaId) return false;

    setQuotas(prev => {
      const existingIndex = prev.findIndex(q => 
        q.entityType === entityType && 
        (entityType === 'global' || q.entityId === quotaId)
      );
      const newQuota: StorageQuota = { 
          id: entityType === 'global' ? 'global' : quotaId, 
          entityType, 
          entityId: entityType === 'clinic' ? quotaId : undefined,
          quotaSize: size, 
          isUnlimited 
      };
      if (existingIndex > -1) {
        const newState = [...prev];
        newState[existingIndex] = newQuota;
        return newState;
      } else {
        return [...prev, newQuota];
      }
    });
    return true;
  };
  
  const getQuota = async (entityType: 'global' | 'clinic', entityId?: string): Promise<StorageQuota> => {
      console.warn("getQuota usando estado local, pendiente de API");
      const foundQuota = quotas.find(q => 
        q.entityType === entityType && 
        (entityType === 'global' || q.entityId === entityId)
      );
      // Si no se encuentra, devolver la global como fallback
      return foundQuota || quotas.find(q => q.entityType === 'global') || 
             { id: 'global', entityType: 'global', quotaSize: MIN_QUOTA_SIZE, isUnlimited: false }; 
  };
  
  const getQuotaSettings = async (): Promise<QuotaSettings> => {
      console.warn("getQuotaSettings usando estado local, pendiente de API");
      return quotaSettings;
  };

  const setQuotaSettings = async (settings: QuotaSettings): Promise<void> => {
      console.warn("setQuotaSettings usando localStorage, pendiente de API");
      setQuotaSettingsState(settings);
      // Podría necesitar lógica adicional si cambia el modo (ej: resetear cuotas individuales)
  };
  
  const applyQuotaToAllClinics = async (size: number, isUnlimited: boolean): Promise<boolean> => {
       console.warn("applyQuotaToAllClinics usando localStorage, pendiente de API");
       // Esto debería llamar a una API que actualice todas las clínicas
       // O, si el modo es global, simplemente actualizar la cuota global
       if (quotaSettings.mode === 'global') {
           return setQuota('global', undefined, size, isUnlimited);
       } else {
           // Actualizar todas las cuotas individuales existentes
           const response = await fetch('/api/clinics'); // Necesitamos la lista de clínicas
           if (!response.ok) return false;
           const allClinics: Clinica[] = await response.json();
           const newQuotas = [...quotas];
           allClinics.forEach(clinic => {
               const clinicId = String(clinic.id);
               const index = newQuotas.findIndex(q => q.entityType === 'clinic' && q.entityId === clinicId);
               const newClinicQuota: StorageQuota = { id: clinicId, entityType: 'clinic', entityId: clinicId, quotaSize: size, isUnlimited };
               if (index > -1) {
                   newQuotas[index] = newClinicQuota;
               } else {
                   newQuotas.push(newClinicQuota);
               }
           });
           setQuotas(newQuotas);
           return true;
       }
  };
  
   const getClinicQuotas = async (): Promise<StorageQuota[]> => {
        console.warn("getClinicQuotas usando estado local, pendiente de API");
       return quotas.filter(q => q.entityType === 'clinic');
   };
   
   const distributeStorageProportionally = async (totalStorage?: number): Promise<void> => {
       console.warn("distributeStorageProportionally no implementado");
       // Lógica compleja pendiente
   };

  // --- Implementaciones placeholder para funciones pendientes ANTES de contextValue --- 
  const connectExternalProvider = async (provider: string, config: any): Promise<boolean> => {
      console.warn("connectExternalProvider no implementado"); return false;
  };
  const disconnectExternalProvider = async (provider: string): Promise<boolean> => {
      console.warn("disconnectExternalProvider no implementado"); return false;
  };
  const getConnectedProviders = async (): Promise<{ provider: string; isConnected: boolean; }[]> => {
      console.warn("getConnectedProviders no implementado"); return [];
  };
  const registerFileForClinic = async (clinicId: string, fileData: EntityDocument): Promise<void> => {
      console.warn("registerFileForClinic no implementado");
  };
   const updateStorageStats = async (clinicId?: string): Promise<void> => {
      console.warn("updateStorageStats no implementado (obsoleto?)");
   };

  // ... (otras funciones como connect/disconnect/registerFile podrían necesitar refactor)

  const contextValue: StorageContextType = {
    getStorageStats,
    setQuota,
    getQuota,
    getQuotaSettings,
    setQuotaSettings,
    applyQuotaToAllClinics,
    getClinicQuotas,
    distributeStorageProportionally,
    // Añadir las funciones placeholder
    connectExternalProvider, 
    disconnectExternalProvider, 
    getConnectedProviders,
    registerFileForClinic,
    updateStorageStats,
  };

  return <StorageContext.Provider value={contextValue}>{children}</StorageContext.Provider>;
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}; 