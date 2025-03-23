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

// Opciones de configuración global para cuotas
interface QuotaSettings {
  mode: 'global' | 'individual'; // 'global' = misma cuota para todas, 'individual' = personalizada por clínica
  defaultQuotaSize: number; // Tamaño predeterminado en bytes
  defaultIsUnlimited: boolean; // Si la cuota predeterminada es ilimitada
}

interface StorageContextType {
  getStorageStats: (clinicId?: string) => StorageStats;
  setQuota: (entityType: 'global' | 'clinic', entityId: string | undefined, size: number, isUnlimited?: boolean) => boolean;
  getQuota: (entityType: 'global' | 'clinic', entityId?: string) => StorageQuota;
  connectExternalProvider: (provider: string, config: any) => Promise<boolean>;
  disconnectExternalProvider: (provider: string) => Promise<boolean>;
  getConnectedProviders: () => { provider: string; isConnected: boolean; }[];
  registerFileForClinic: (clinicId: string, fileData: any) => void;
  updateStorageStats: (clinicId?: string) => void;
  // Nuevos métodos para gestión avanzada de cuotas
  getQuotaSettings: () => QuotaSettings;
  setQuotaSettings: (settings: QuotaSettings) => void;
  applyQuotaToAllClinics: (size: number, isUnlimited: boolean) => boolean;
  getClinicQuotas: () => StorageQuota[];
  // Nuevo método para reparto proporcional
  distributeStorageProportionally: (totalStorage?: number) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

// Valores por defecto para evitar problemas de renderizado
const DEFAULT_QUOTA_SIZE = 0; // Cambiado de 1TB a 0 (sin asignación por defecto)
const MIN_QUOTA_SIZE = 1024 * 1024 * 1024; // 1GB para evitar divisiones por cero

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getStorageStats: getFileStats, addFileToContext } = useFiles();
  
  // Estado para cuotas
  const [quotas, setQuotas] = useState<StorageQuota[]>([]);
  
  // Nuevo estado para configuración de cuotas
  const [quotaSettings, setQuotaSettings] = useState<QuotaSettings>({
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
  
  // Mantener un registro de cuotas que deberían ser creadas 
  // pero no podemos hacerlo durante la renderización
  const [quotasToCreate, setQuotasToCreate] = useState<StorageQuota[]>([]);
  
  // useEffect para crear cuotas pendientes después de la renderización
  useEffect(() => {
    if (quotasToCreate.length > 0) {
      // Filtrar cuotas que ya existen para evitar duplicados
      const newQuotas = quotasToCreate.filter(newQuota => 
        !quotas.some(existingQuota => existingQuota.id === newQuota.id)
      );
      
      if (newQuotas.length > 0) {
        console.log("Creando cuotas pendientes:", newQuotas);
        setQuotas(prev => [...prev, ...newQuotas]);
      }
      
      // Limpiar la lista de cuotas pendientes
      setQuotasToCreate([]);
    }
  }, [quotasToCreate, quotas]);
  
  // Cargar cuotas desde localStorage
  useEffect(() => {
    try {
      // Cargar configuración de cuotas
      const savedQuotaSettings = localStorage.getItem('appQuotaSettings');
      if (savedQuotaSettings) {
        try {
          setQuotaSettings(JSON.parse(savedQuotaSettings));
        } catch (error) {
          console.error("Error parsing quota settings:", error);
        }
      }
      
      // Cargar cuotas individuales
      const savedQuotas = localStorage.getItem('appStorageQuotas');
      if (savedQuotas) {
        try {
          setQuotas(JSON.parse(savedQuotas));
        } catch (error) {
          console.error("Error parsing saved quotas:", error);
          
          // Establecer cuota global por defecto con mínimo esencial
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
        // Establecer cuota global por defecto con mínimo esencial
        // Esto evita valores hardcodeados altos
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
      console.error("Error loading quota settings:", error);
      // Si hay un error, establecer valores por defecto seguros mínimos
      setQuotaSettings({
        mode: 'global',
        defaultQuotaSize: 0, // Sin valor predeterminado para nuevas clínicas
        defaultIsUnlimited: false
      });
      setQuotas([
        {
          id: 'global',
          entityType: 'global',
          quotaSize: MIN_QUOTA_SIZE,
          isUnlimited: false
        }
      ]);
    }
  }, []);
  
  // Guardar cuotas en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem('appStorageQuotas', JSON.stringify(quotas));
    } catch (error) {
      console.error("Error saving quotas to localStorage:", error);
    }
  }, [quotas]);
  
  // Guardar configuración de cuotas cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem('appQuotaSettings', JSON.stringify(quotaSettings));
    } catch (error) {
      console.error("Error saving quota settings to localStorage:", error);
    }
  }, [quotaSettings]);
  
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
  const getStorageStats = (clinicId?: string): StorageStats => {
    try {
      // Obtener estadísticas del contexto de archivos
      const fileStats = getFileStats(clinicId);
      
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
          // La clínica usa el espacio compartido (sin límite = acceso al espacio global compartido)
          quota = {
            id: 'shared',
            entityType: 'global',
            quotaSize: getSharedStorageAvailable(),
            isUnlimited: true // Marcamos como ilimitado para indicar que usa el espacio compartido
          };
        }
      }
      
      // Para evitar problemas matemáticos, asegurar un tamaño mínimo para la cuota
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
        byType: fileStats.byType,
        byEntityType: {}
      };
    } catch (error) {
      console.error("Error getting storage stats:", error);
      // Devolver datos por defecto en caso de error
      return {
        used: 0,
        quota: DEFAULT_QUOTA_SIZE,
        isUnlimited: false,
        percentUsed: 0,
        byType: {},
        byEntityType: {}
      };
    }
  };
  
  // Establecer o modificar cuota
  const setQuota = (entityType: 'global' | 'clinic', entityId?: string, size: number = 0, isUnlimited: boolean = false): boolean => {
    try {
      // Log para depuración
      console.log(`Setting quota for ${entityType}${entityId ? ` with ID ${entityId}` : ''}. Size: ${formatBytes(size)}, Unlimited: ${isUnlimited}`);
      
      // Generar ID para la cuota
      const quotaId = entityType === 'global' ? 'global' : `clinic-${entityId}`;
      
      // Verificar si tenemos suficiente espacio en el sistema
      if (!isUnlimited && entityType === 'clinic') {
        const totalSystem = getTotalSystemStorage();
        const currentQuotaSize = quotas.find(q => q.id === quotaId)?.quotaSize || 0;
        const totalAssigned = getTotalAssignedStorage() - currentQuotaSize; // Restamos la cuota actual si existe
        
        // Verificar si hay suficiente espacio disponible
        if (totalAssigned + size > totalSystem) {
          console.error(`Error: No hay suficiente espacio disponible para asignar ${formatBytes(size)} a ${entityType} ${entityId}`);
          return false;
        }
      }
      
      // Buscar si ya existe esta cuota
      const existingQuotaIndex = quotas.findIndex(q => q.id === quotaId);
      
      // Crear nueva cuota o actualizar existente
      const updatedQuota: StorageQuota = {
        id: quotaId,
        entityType,
        entityId,
        quotaSize: size,
        isUnlimited
      };
      
      // Copia actual de las cuotas para actualizar
      let updatedQuotas: StorageQuota[];
      
      // Actualizar el estado
      if (existingQuotaIndex !== -1) {
        // Actualizar cuota existente
        updatedQuotas = [...quotas];
        updatedQuotas[existingQuotaIndex] = updatedQuota;
      } else {
        // Crear nueva cuota
        updatedQuotas = [...quotas, updatedQuota];
      }
      
      // Actualizar el estado inmediatamente
      setQuotas(updatedQuotas);
      
      // En caso de cuota global, actualizar la configuración también
      if (entityType === 'global') {
        setQuotaSettings({
          ...quotaSettings,
          defaultQuotaSize: size,
          defaultIsUnlimited: isUnlimited
        });
      }
      
      // Actualizar inmediatamente el localStorage para asegurar persistencia
      try {
        localStorage.setItem('appStorageQuotas', JSON.stringify(updatedQuotas));
        console.log(`Cuota ${quotaId} actualizada con éxito. Tamaño: ${formatBytes(size)}, Ilimitada: ${isUnlimited}`);
      } catch (saveError) {
        console.error("Error saving updated quotas to localStorage:", saveError);
      }
      
      // Forzar un timeout para asegurar que React registre el cambio
      setTimeout(() => {
        console.log("Estado actualizado después del timeout:", updatedQuotas);
      }, 0);
      
      return true;
    } catch (error) {
      console.error("Error setting quota:", error);
      return false;
    }
  };
  
  // Obtener cuota
  const getQuota = (entityType: 'global' | 'clinic', entityId?: string): StorageQuota => {
    try {
      // Generar ID para buscar
      const quotaId = entityType === 'global' ? 'global' : `clinic-${entityId}`;
      
      // Buscar cuota específica
      const specificQuota = quotas.find(q => q.id === quotaId);
      
      if (specificQuota) {
        return specificQuota;
      }
      
      // Si es la cuota global y no existe, crear una nueva pero no actualizar el estado durante la renderización
      if (entityType === 'global') {
        // Crear cuota global por defecto
        const defaultGlobalQuota: StorageQuota = {
          id: 'global',
          entityType: 'global',
          quotaSize: DEFAULT_QUOTA_SIZE || MIN_QUOTA_SIZE,
          isUnlimited: false
        };
        
        // Agregar a la lista de cuotas para crear en el próximo ciclo de renderización
        // No actualizamos el estado directamente durante la renderización
        setTimeout(() => {
          setQuotasToCreate(prev => [...prev, defaultGlobalQuota]);
        }, 0);
        
        return defaultGlobalQuota;
      }
      
      // Si es una clínica y no tiene una cuota específica, devolver la cuota global
      // No asignar automáticamente una cuota específica
      const globalQuota = quotas.find(q => q.entityType === 'global');
      if (globalQuota) {
        return globalQuota;
      }
      
      // Si no hay ninguna cuota, crear una por defecto (usando configuración predeterminada)
      const defaultQuota: StorageQuota = {
        id: 'default',
        entityType: 'global',
        quotaSize: quotaSettings.defaultQuotaSize || DEFAULT_QUOTA_SIZE || MIN_QUOTA_SIZE,
        isUnlimited: quotaSettings.defaultIsUnlimited || false
      };
      
      // Agregar a la lista de cuotas para crear en el próximo ciclo de renderización
      // No actualizamos el estado directamente durante la renderización
      setTimeout(() => {
        setQuotasToCreate(prev => [...prev, defaultQuota]);
      }, 0);
      
      return defaultQuota;
    } catch (error) {
      console.error("Error getting quota:", error);
      // Devolver una cuota por defecto segura en caso de error
      return {
        id: 'default',
        entityType: 'global',
        quotaSize: MIN_QUOTA_SIZE,
        isUnlimited: false
      };
    }
  };
  
  // Nuevos métodos para gestión de configuración de cuotas
  
  // Obtener configuración actual
  const getQuotaSettings = (): QuotaSettings => {
    return quotaSettings;
  };
  
  // Establecer nueva configuración
  const setQuotaSettingsConfig = (settings: QuotaSettings): void => {
    try {
      // Asegurar valores mínimos
      const safeSettings = {
        ...settings,
        defaultQuotaSize: Math.max(settings.defaultQuotaSize, MIN_QUOTA_SIZE)
      };
      
      setQuotaSettings(safeSettings);
      
      // Si cambiamos a modo global, actualizamos la cuota global
      // con los valores predeterminados
      if (settings.mode === 'global') {
        setQuota('global', undefined, safeSettings.defaultQuotaSize, safeSettings.defaultIsUnlimited);
      }
    } catch (error) {
      console.error("Error setting quota settings:", error);
    }
  };
  
  // Aplicar la misma cuota a todas las clínicas
  const applyQuotaToAllClinics = (size: number, isUnlimited: boolean): boolean => {
    try {
      // Si es ilimitado, no hay límite que validar
      if (isUnlimited) {
        // Actualizar todas las cuotas de clínicas existentes
        setQuotas(prev => 
          prev.map(quota => 
            quota.entityType === 'clinic' 
              ? { ...quota, quotaSize: 0, isUnlimited: true } 
              : quota
          )
        );
        return true;
      }
      
      // Asegurar un valor mínimo para la cuota (pero solo para valores pequeños)
      const safeSize = Math.max(size, MIN_QUOTA_SIZE);
      
      // Calcular cuántas clínicas tienen cuota específica
      const clinicQuotas = quotas.filter(q => q.entityType === 'clinic');
      const clinicCount = clinicQuotas.length;
      
      if (clinicCount === 0) {
        // No hay clínicas con cuota específica, nada que actualizar
        return true;
      }
      
      // Calcular el espacio total que se necesitaría
      const totalNeededSpace = safeSize * clinicCount;
      
      // Verificar que no exceda el total del sistema
      const SYSTEM_TOTAL_STORAGE = 1024 * 1024 * 1024 * 1024; // 1TB
      if (totalNeededSpace > SYSTEM_TOTAL_STORAGE) {
        console.error(`Error: La cuota total (${formatBytes(totalNeededSpace)}) excede el espacio total del sistema (${formatBytes(SYSTEM_TOTAL_STORAGE)})`);
        return false;
      }
      
      // Si estamos en modo global, sólo necesitamos actualizar la cuota global
      if (quotaSettings.mode === 'global') {
        setQuota('global', undefined, safeSize, isUnlimited);
        return true;
      }
      
      // En modo individual, solo actualizamos las cuotas ya existentes
      // SIN establecer valores predeterminados para nuevas clínicas
      
      // Actualizar todas las cuotas de clínicas existentes
      setQuotas(prev => 
        prev.map(quota => 
          quota.entityType === 'clinic' 
            ? { ...quota, quotaSize: safeSize, isUnlimited } 
            : quota
        )
      );
      
      return true;
    } catch (error) {
      console.error("Error applying quota to all clinics:", error);
      return false;
    }
  };
  
  // Obtener todas las cuotas de clínicas
  const getClinicQuotas = (): StorageQuota[] => {
    try {
      return quotas.filter(quota => quota.entityType === 'clinic');
    } catch (error) {
      console.error("Error getting clinic quotas:", error);
      return [];
    }
  };
  
  // Conectar proveedor externo (simulado)
  const connectExternalProvider = async (provider: string, config: any): Promise<boolean> => {
    try {
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
    } catch (error) {
      console.error("Error connecting external provider:", error);
      return false;
    }
  };
  
  // Desconectar proveedor externo
  const disconnectExternalProvider = async (provider: string): Promise<boolean> => {
    try {
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
    } catch (error) {
      console.error("Error disconnecting external provider:", error);
      return false;
    }
  };
  
  // Obtener proveedores conectados
  const getConnectedProviders = () => {
    try {
      return connectedProviders;
    } catch (error) {
      console.error("Error getting connected providers:", error);
      return [{ provider: 'local', isConnected: true }];
    }
  };
  
  // Registrar archivo para una clínica
  const registerFileForClinic = (clinicId: string, fileData: any) => {
    try {
      // En un entorno real, esto registraría el archivo en la base de datos
      console.log(`Registrando archivo ${fileData.id} para la clínica ${clinicId}`);
      
      // Añadir el archivo al contexto de archivos
      if (addFileToContext) {
        addFileToContext(fileData);
      }
    } catch (error) {
      console.error("Error registering file for clinic:", error);
    }
  };
  
  // Nuevo método para repartir proporcionalmente el almacenamiento entre todas las clínicas
  const distributeStorageProportionally = (totalStorage?: number): void => {
    try {
      // Usar el tamaño total proporcionado o el definido por sistema
      const totalSize = totalStorage || DEFAULT_QUOTA_SIZE || 1024 * 1024 * 1024 * 1024; // 1TB por defecto
      
      // Obtener todas las clínicas activas desde la función externa
      // Esta función debe ser importada de donde corresponda según la aplicación
      let clinics;
      try {
        // Intentar importar la función getClinics (asumiendo que existe)
        const mockDataModule = require('@/mockData');
        if (mockDataModule && mockDataModule.getClinics) {
          clinics = mockDataModule.getClinics();
        } else {
          console.error("No se pudo obtener la lista de clínicas");
          return;
        }
      } catch (importError) {
        console.error("Error al importar funciones para obtener clínicas:", importError);
        return;
      }
      
      // Verificar que hay clínicas activas
      if (!clinics || clinics.length === 0) {
        console.warn("No hay clínicas disponibles para distribuir almacenamiento");
        return;
      }
      
      // Filtrar solo clínicas activas si tienen esa propiedad
      const activeClinics = clinics.filter(c => c.isActive !== false);
      
      if (activeClinics.length === 0) {
        console.warn("No hay clínicas activas disponibles para distribuir almacenamiento");
        return;
      }
      
      console.log(`Distribuyendo ${totalSize} bytes entre ${activeClinics.length} clínicas activas`);
      
      // Calcular cuota por clínica (división equitativa)
      const quotaPerClinic = Math.max(
        Math.floor(totalSize / activeClinics.length),
        MIN_QUOTA_SIZE // Asegurar cuota mínima
      );
      
      // Asignar cuota a cada clínica activa
      activeClinics.forEach(clinic => {
        const clinicId = clinic.id.toString();
        console.log(`Asignando ${quotaPerClinic} bytes a clínica ${clinicId}`);
        
        setQuota('clinic', clinicId, quotaPerClinic, false);
      });
      
      // Actualizar la cuota global para que sea coherente con el reparto
      setQuota('global', undefined, totalSize, false);
      
      console.log("Reparto proporcional completado con éxito");
    } catch (error) {
      console.error("Error al distribuir almacenamiento proporcionalmente:", error);
    }
  };
  
  // Actualizar estadísticas de almacenamiento
  const updateStorageStats = (clinicId?: string) => {
    try {
      // En un entorno real, esto recalcularía las estadísticas
      console.log(`Actualizando estadísticas de almacenamiento ${clinicId ? `para clínica ${clinicId}` : 'global'}`);
    } catch (error) {
      console.error("Error updating storage stats:", error);
    }
  };
  
  // Función auxiliar para formatear bytes (para logging)
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        updateStorageStats,
        // Nuevos métodos
        getQuotaSettings,
        setQuotaSettings: setQuotaSettingsConfig,
        applyQuotaToAllClinics,
        getClinicQuotas,
        distributeStorageProportionally
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

// Hook para usar el contexto
export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}; 