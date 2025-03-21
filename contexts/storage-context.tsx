import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFiles } from './file-context';

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

interface StorageContextType {
  getStorageStats: (clinicId?: string) => StorageStats;
  setQuota: (entityType: 'global' | 'clinic', entityId: string | undefined, size: number, isUnlimited?: boolean) => void;
  getQuota: (entityType: 'global' | 'clinic', entityId?: string) => StorageQuota;
  connectExternalProvider: (provider: string, config: any) => Promise<boolean>;
  disconnectExternalProvider: (provider: string) => Promise<boolean>;
  getConnectedProviders: () => { provider: string; isConnected: boolean; }[];
  registerFileForClinic: (clinicId: string, fileData: any) => void;
  updateStorageStats: (clinicId?: string) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getStorageStats: getFileStats, addFileToContext } = useFiles();
  
  // Estado para cuotas
  const [quotas, setQuotas] = useState<StorageQuota[]>([]);
  
  // Estado para proveedores conectados
  const [connectedProviders, setConnectedProviders] = useState<{ provider: string; isConnected: boolean; }[]>([
    { provider: 'local', isConnected: true },
    { provider: 'gdrive', isConnected: false },
    { provider: 'dropbox', isConnected: false }
  ]);
  
  // Cargar cuotas desde localStorage
  useEffect(() => {
    const savedQuotas = localStorage.getItem('appStorageQuotas');
    if (savedQuotas) {
      try {
        setQuotas(JSON.parse(savedQuotas));
      } catch (error) {
        console.error("Error parsing saved quotas:", error);
        
        // Establecer cuota global por defecto (10GB)
        setQuotas([
          {
            id: 'global',
            entityType: 'global',
            quotaSize: 10 * 1024 * 1024 * 1024, // 10GB
            isUnlimited: false
          }
        ]);
      }
    } else {
      // Establecer cuota global por defecto (10GB)
      setQuotas([
        {
          id: 'global',
          entityType: 'global',
          quotaSize: 10 * 1024 * 1024 * 1024, // 10GB
          isUnlimited: false
        }
      ]);
    }
  }, []);
  
  // Guardar cuotas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('appStorageQuotas', JSON.stringify(quotas));
  }, [quotas]);
  
  // Obtener estadísticas de almacenamiento
  const getStorageStats = (clinicId?: string): StorageStats => {
    // Obtener estadísticas del contexto de archivos
    const fileStats = getFileStats(clinicId);
    
    // Obtener la cuota aplicable
    const quota = getQuota(clinicId ? 'clinic' : 'global', clinicId);
    
    // Calcular distribución por tipo de entidad
    const byEntityType: Record<string, number> = {};
    
    return {
      used: fileStats.used,
      quota: quota.quotaSize,
      isUnlimited: quota.isUnlimited,
      percentUsed: quota.isUnlimited ? 0 : (fileStats.used / quota.quotaSize) * 100,
      byType: fileStats.byType,
      byEntityType
    };
  };
  
  // Establecer cuota
  const setQuota = (
    entityType: 'global' | 'clinic', 
    entityId: string | undefined, 
    size: number, 
    isUnlimited = false
  ) => {
    // Generar ID único para la cuota
    const quotaId = entityType === 'global' ? 'global' : `clinic-${entityId}`;
    
    // Verificar si ya existe una cuota para esta entidad
    const existingIndex = quotas.findIndex(q => q.id === quotaId);
    
    if (existingIndex >= 0) {
      // Actualizar cuota existente
      setQuotas(prev => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quotaSize: size,
          isUnlimited
        };
        return updated;
      });
    } else {
      // Crear nueva cuota
      setQuotas(prev => [
        ...prev,
        {
          id: quotaId,
          entityType,
          entityId,
          quotaSize: size,
          isUnlimited
        }
      ]);
    }
  };
  
  // Obtener cuota
  const getQuota = (entityType: 'global' | 'clinic', entityId?: string): StorageQuota => {
    // Generar ID para buscar
    const quotaId = entityType === 'global' ? 'global' : `clinic-${entityId}`;
    
    // Buscar cuota específica
    const specificQuota = quotas.find(q => q.id === quotaId);
    
    if (specificQuota) {
      return specificQuota;
    }
    
    // Si no hay cuota específica y es una clínica, devolver cuota global
    if (entityType === 'clinic') {
      const globalQuota = quotas.find(q => q.entityType === 'global');
      if (globalQuota) {
        return globalQuota;
      }
    }
    
    // Si no hay ninguna cuota, crear una por defecto (10GB)
    return {
      id: 'default',
      entityType: 'global',
      quotaSize: 10 * 1024 * 1024 * 1024, // 10GB
      isUnlimited: false
    };
  };
  
  // Conectar proveedor externo (simulado)
  const connectExternalProvider = async (provider: string, config: any): Promise<boolean> => {
    // Simulación de conexión
    return new Promise((resolve) => {
      setTimeout(() => {
        setConnectedProviders(prev => 
          prev.map(p => 
            p.provider === provider 
              ? { ...p, isConnected: true } 
              : p
          )
        );
        resolve(true);
      }, 1500);
    });
  };
  
  // Desconectar proveedor externo
  const disconnectExternalProvider = async (provider: string): Promise<boolean> => {
    // No permitir desconectar el almacenamiento local
    if (provider === 'local') {
      return false;
    }
    
    // Simulación de desconexión
    return new Promise((resolve) => {
      setTimeout(() => {
        setConnectedProviders(prev => 
          prev.map(p => 
            p.provider === provider 
              ? { ...p, isConnected: false } 
              : p
          )
        );
        resolve(true);
      }, 1000);
    });
  };
  
  // Obtener proveedores conectados
  const getConnectedProviders = () => {
    return connectedProviders;
  };
  
  // Registrar archivo para una clínica
  const registerFileForClinic = (clinicId: string, fileData: any) => {
    // En un entorno real, esto registraría el archivo en la base de datos
    console.log(`Registrando archivo ${fileData.id} para la clínica ${clinicId}`);
    
    // Añadir el archivo al contexto de archivos
    if (addFileToContext) {
      addFileToContext(fileData);
    }
  };
  
  // Actualizar estadísticas de almacenamiento
  const updateStorageStats = (clinicId?: string) => {
    // En un entorno real, esto recalcularía las estadísticas
    console.log(`Actualizando estadísticas de almacenamiento ${clinicId ? `para clínica ${clinicId}` : 'global'}`);
  };
  
  return (
    <StorageContext.Provider
      value={{
        getStorageStats,
        setQuota,
        getQuota,
        connectExternalProvider,
        disconnectExternalProvider,
        getConnectedProviders,
        registerFileForClinic,
        updateStorageStats
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}; 