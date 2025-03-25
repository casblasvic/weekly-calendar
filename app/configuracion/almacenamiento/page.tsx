"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useStorage } from '@/contexts/storage-context';
import { useFiles } from '@/contexts/file-context';
import StorageStatusCard from '@/components/storage/storage-status-card';
import StorageTypeChart from '@/components/storage/storage-type-chart';
import StorageQuotaSettings from '@/components/storage/storage-quota-settings';
import FilesExplorer from '@/components/storage/files-explorer';
import { StorageSettings } from '@/components/storage/storage-settings';
import { HardDrive, Database, Cloud, Settings, Briefcase, Server } from 'lucide-react';
import Link from 'next/link';
import { useClinic } from "@/contexts/clinic-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ActionButtons } from '@/app/components/ui/action-buttons';
import { useRouter } from 'next/navigation';

// Definir una constante para el almacenamiento total del sistema (en bytes)
const SYSTEM_TOTAL_STORAGE = 1024 * 1024 * 1024 * 1024; // 1TB

// Función para formatear bytes fuera del componente para evitar recreaciones
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function GlobalStoragePage() {
  const router = useRouter();
  const storage = useStorage();
  const files = useFiles();
  const { clinics: availableClinics } = useClinic();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [savingConfig, setSavingConfig] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  
  // Estados para almacenar los datos
  const [clinics, setClinics] = useState<any[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [clinicQuotas, setClinicQuotas] = useState<Record<string, any>>({});
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Estado adicional para estadísticas de clínicas individuales
  const [clinicStats, setClinicStats] = useState<Record<string, any>>({});
  
  // File stats
  const [attachmentsByType, setAttachmentsByType] = useState<Record<string, number>>({});
  
  // Cargar datos iniciales de forma segura usando useEffect
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Obtener clínicas
        setClinics(availableClinics || []);
        
        // Obtener estadísticas globales
        const stats = storage.getStorageStats();
        setStorageStats(stats);
        
        const globalQuota = storage.getQuota('global');
        setQuota(globalQuota);
        
        const connectedProviders = storage.getConnectedProviders();
        setProviders(connectedProviders);
        
        // Obtener archivos
        const filesList = files.getFilesByFilter({ isDeleted: false });
        setAllFiles(filesList);
        
        // Procesar cuotas de clínicas
        const quotasMap: Record<string, any> = {};
        const statsMap: Record<string, any> = {};
        let assignedQuotaTotal = 0;
        
        // Cargar estadísticas para cada clínica
        for (const clinic of availableClinics) {
          if (clinic && clinic.id) {  // Verificar que la clínica sea válida
            const clinicId = clinic.id.toString();
            try {
              const clinicQuota = storage.getQuota('clinic', clinicId);
              quotasMap[clinicId] = clinicQuota;
              
              // Cargar estadísticas de cada clínica
              const clinicStatsData = storage.getStorageStats(clinicId);
              statsMap[clinicId] = clinicStatsData;
              
              // Sumar al total asignado si tiene cuota específica
              if (clinicQuota && clinicQuota.id !== 'global' && !clinicQuota.isUnlimited) {
                assignedQuotaTotal += clinicQuota.quotaSize;
              }
            } catch (error) {
              console.error(`Error obteniendo datos para clínica ${clinicId}:`, error);
            }
          }
        }
        
        setClinicQuotas(quotasMap);
        setClinicStats(statsMap);
        setTotalAssigned(assignedQuotaTotal);
        setDataLoaded(true);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        toast.error("Error cargando datos de almacenamiento");
      }
    };
    
    loadInitialData();
  }, [storage, files, needsUpdate]);

  // Los cálculos que antes estaban en el resto del useMemo
  const calculatedValues = useMemo(() => {
    if (!dataLoaded) {
      return {
        storageByType: {},
        storageByEntity: {},
        percentAssigned: 0,
        remainingStorage: 0
      };
    }
    
    // Calcular distribuciones por tipo
    const storageByType: Record<string, number> = {};
    allFiles.forEach(file => {
      const fileType = file.mimeType.split('/')[0];
      storageByType[fileType] = (storageByType[fileType] || 0) + file.fileSize;
    });
    
    // Calcular distribución por tipo de entidad
    const storageByEntity: Record<string, number> = {};
    allFiles.forEach(file => {
      storageByEntity[file.entityType] = (storageByEntity[file.entityType] || 0) + file.fileSize;
    });
    
    // Calcular porcentaje asignado
    const percentAssigned = (totalAssigned / SYSTEM_TOTAL_STORAGE) * 100;
    
    // Calcular almacenamiento restante
    const remainingStorage = Math.max(0, SYSTEM_TOTAL_STORAGE - storageStats?.used || 0);
    
    return {
      storageByType,
      storageByEntity,
      percentAssigned,
      remainingStorage
    };
  }, [dataLoaded, allFiles, totalAssigned, storageStats]);
  
  // Manejar eliminación de archivos
  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      await files.deleteFile(fileId);
      toast.success('Archivo eliminado correctamente');
    } catch (error) {
      toast.error('Error al eliminar el archivo');
    }
  }, [files]);
  
  // Manejar conexión con proveedor externo
  const handleConnectProvider = useCallback(async (provider: string) => {
    try {
      await storage.connectExternalProvider(provider, {});
      toast.success(`Conectado a ${provider} correctamente`);
    } catch (error) {
      toast.error(`Error al conectar con ${provider}`);
    }
  }, [storage]);
  
  // Actualizar cuota global o por clínica
  const handleUpdateQuota = useCallback((size: number, isUnlimited: boolean, mode?: string, clinicId?: string) => {
    try {
      // Si es cuota global, actualizar para todas las clínicas sin cuota específica
      if (mode === 'global') {
        storage.setQuota('global', undefined, size, isUnlimited);
        toast.success('Cuota global actualizada correctamente');
      } 
      // Si es cuota específica, verificar que no exceda el límite
      else if (mode === 'perClinic' && clinicId) {
        // Obtener la cuota actual de esta clínica
        const currentQuota = clinicQuotas[clinicId] || {};
        const currentSize = (currentQuota.id && currentQuota.id !== 'global' && !currentQuota.isUnlimited) 
          ? currentQuota.quotaSize : 0;
        
        // Calcular el nuevo total asignado
        const newTotalAssigned = totalAssigned - currentSize + (isUnlimited ? 0 : size);
        
        // Validar que no exceda el total del sistema
        if (!isUnlimited && newTotalAssigned > SYSTEM_TOTAL_STORAGE) {
          toast.error(`La suma de cuotas no puede exceder el almacenamiento total del sistema (${formatBytes(SYSTEM_TOTAL_STORAGE)})`);
          return;
        }
        
        // Actualizar la cuota de la clínica
        storage.setQuota('clinic', clinicId, size, isUnlimited);
        
        // Actualizar el mapa de cuotas
        setClinicQuotas(prev => ({
          ...prev,
          [clinicId]: {
            id: `clinic-${clinicId}`,
            entityType: 'clinic',
            entityId: clinicId,
            quotaSize: size,
            isUnlimited
          }
        }));
        
        // Actualizar el total asignado
        setTotalAssigned(newTotalAssigned);
        
        toast.success(`Cuota actualizada para la clínica #${clinicId}`);
      }
    } catch (error) {
      console.error("Error actualizando cuota:", error);
      toast.error("Error al actualizar la cuota");
    }
  }, [storage, clinicQuotas, totalAssigned]);
  
  // Guardar configuración general
  const handleSaveConfig = useCallback(async () => {
    setSavingConfig(true);
    
    try {
      // Aquí iría la lógica de guardado de configuración general
      // Por ahora solo simulamos un delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Almacenamiento Global</h1>
          <p className="text-gray-500">Administra el almacenamiento para todos los centros del sistema</p>
        </div>
        <div className="ml-auto">
          <Link href="/configuracion/almacenamiento/configuracion">
            <Button variant="default">
              <Settings className="h-4 w-4 mr-2" />
              Configuración avanzada
            </Button>
          </Link>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
          <TabsTrigger value="quotas">Cuotas</TabsTrigger>
          <TabsTrigger value="providers">Proveedores</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="col-span-1 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Espacio total disponible
                </CardTitle>
                <CardDescription>
                  Resumen del almacenamiento del sistema y distribución por clínicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Información global */}
                  <div className="pb-2 border-b">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span>Total configurado:</span>
                      <span className="text-purple-600">{formatBytes(SYSTEM_TOTAL_STORAGE)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Asignado a clínicas:</span>
                      <span>{formatBytes(totalAssigned)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Espacio disponible para asignar:</span>
                      <span>{formatBytes(Math.max(0, SYSTEM_TOTAL_STORAGE - totalAssigned))}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Realmente utilizado (consumido):</span>
                      <span>{formatBytes(storageStats?.used || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Espacio libre total:</span>
                      <span>{formatBytes(Math.max(0, SYSTEM_TOTAL_STORAGE - storageStats?.used || 0))}</span>
                    </div>
                    
                    {/* Barra de progreso global */}
                    <div className="mt-2">
                      <div className="relative">
                        <div className="bg-gray-200 rounded-full h-3 w-full overflow-hidden">
                          {/* Barra de asignado (azul) */}
                          <div 
                            className="bg-blue-600 h-3 rounded-full" 
                            style={{ width: `${Math.min(100, (totalAssigned / SYSTEM_TOTAL_STORAGE) * 100)}%` }}
                          ></div>
                        </div>
                        {/* Barra de utilizado (verde) superpuesta */}
                        <div 
                          className="absolute top-0 left-0 bg-green-500 h-3 rounded-full" 
                          style={{ width: `${Math.min(100, (storageStats?.used / SYSTEM_TOTAL_STORAGE) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>0%</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Utilizado ({((storageStats?.used / SYSTEM_TOTAL_STORAGE) * 100).toFixed(1)}%)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span>Asignado ({((totalAssigned / SYSTEM_TOTAL_STORAGE) * 100).toFixed(1)}%)</span>
                          </div>
                        </div>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información por clínica */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Espacio por clínica</h3>
                    {Array.isArray(clinics) && clinics.length > 0 
                      ? clinics.slice(0, 3).map(clinic => {
                          if (!clinic || !clinic.id) return null;
                          const clinicId = clinic.id.toString();
                          // Usar datos precargados en vez de llamar durante renderización
                          const clinicStatsData = clinicStats[clinicId] || { used: 0 };
                          const clinicQuota = clinicQuotas[clinicId] || {};
                          const hasCustomQuota = clinicQuota.id && clinicQuota.id !== 'global';
                          const clinicQuotaToUse = hasCustomQuota ? clinicQuota : quota;
                          const percentUsed = clinicQuotaToUse?.isUnlimited 
                            ? 0 
                            : Math.min(100, (clinicStatsData.used / (clinicQuotaToUse?.quotaSize || 1)) * 100);
                          
                          return (
                            <div key={clinic.id} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-medium">{clinic.name}</span>
                                <span>
                                  {formatBytes(clinicStatsData.used)} / 
                                  {clinicQuotaToUse?.isUnlimited 
                                    ? '∞' 
                                    : formatBytes(clinicQuotaToUse?.quotaSize || 0)} 
                                  ({percentUsed.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="bg-gray-200 rounded-full h-1.5 w-full">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full" 
                                  style={{ width: `${percentUsed}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        }) : <div className="text-sm text-gray-500">No hay clínicas disponibles</div>}
                    
                    {Array.isArray(clinics) && clinics.length > 3 && (
                      <div className="text-xs text-center text-blue-600 hover:text-blue-800 cursor-pointer mt-1" onClick={() => setActiveTab('quotas')}>
                        Ver todas las clínicas ({clinics.length})
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <StorageTypeChart data={calculatedValues.storageByType} />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Distribución por entidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                    <span className="text-sm">Equipamiento</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatBytes(
                      allFiles
                        .filter(f => f.entityType === 'equipment')
                        .reduce((sum, f) => sum + f.fileSize, 0)
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    <span className="text-sm">Servicios</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatBytes(
                      allFiles
                        .filter(f => f.entityType === 'service')
                        .reduce((sum, f) => sum + f.fileSize, 0)
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                    <span className="text-sm">Clientes</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatBytes(
                      allFiles
                        .filter(f => f.entityType === 'client')
                        .reduce((sum, f) => sum + f.fileSize, 0)
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                    <span className="text-sm">Otros</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatBytes(
                      allFiles
                        .filter(f => !['equipment', 'service', 'client'].includes(f.entityType))
                        .reduce((sum, f) => sum + f.fileSize, 0)
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de archivos */}
        <TabsContent value="files">
          <FilesExplorer 
            files={allFiles}
            onDelete={handleDeleteFile}
            onView={(file) => window.open(file.url, '_blank')}
            showClinic={true}
          />
        </TabsContent>
        
        {/* Pestaña de cuotas */}
        <TabsContent value="quotas">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Configuración de cuotas por clínica
                </CardTitle>
                <CardDescription>
                  Establece límites de almacenamiento para todas las clínicas o configura cuotas individuales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StorageQuotaSettings 
                  showTotalInfo={true}
                  onSave={(size, isUnlimited) => {
                    // Recargar datos después de aplicar la cuota
                    setNeedsUpdate(prev => !prev);
                    
                    // Notificar al usuario
                    toast.success('Cuota actualizada correctamente');
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Pestaña de proveedores */}
        <TabsContent value="providers">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Proveedor Local */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Almacenamiento Local
                </CardTitle>
                <CardDescription>
                  Sistema de almacenamiento local del servidor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-600">Conectado</span>
                    <Button variant="outline" disabled>
                      Predeterminado
                    </Button>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      Este almacenamiento utiliza el espacio del servidor donde está alojada la aplicación.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Google Drive */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Google Drive
                </CardTitle>
                <CardDescription>
                  Conecta con Google Drive para almacenamiento externo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={providers.find(p => p.provider === 'gdrive')?.isConnected 
                      ? "text-sm font-medium text-green-600" 
                      : "text-sm font-medium text-gray-600"}>
                      {providers.find(p => p.provider === 'gdrive')?.isConnected ? 'Conectado' : 'No conectado'}
                    </span>
                    <Button 
                      variant={providers.find(p => p.provider === 'gdrive')?.isConnected ? "destructive" : "default"}
                      onClick={() => {
                        if (providers.find(p => p.provider === 'gdrive')?.isConnected) {
                          storage.disconnectExternalProvider('gdrive');
                        } else {
                          handleConnectProvider('gdrive');
                        }
                      }}
                    >
                      {providers.find(p => p.provider === 'gdrive')?.isConnected ? 'Desconectar' : 'Conectar'}
                    </Button>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      Conecta con tu cuenta de Google Drive para usar como almacenamiento externo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Dropbox */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Dropbox
                </CardTitle>
                <CardDescription>
                  Conecta con Dropbox para almacenamiento externo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={providers.find(p => p.provider === 'dropbox')?.isConnected 
                      ? "text-sm font-medium text-green-600" 
                      : "text-sm font-medium text-gray-600"}>
                      {providers.find(p => p.provider === 'dropbox')?.isConnected ? 'Conectado' : 'No conectado'}
                    </span>
                    <Button 
                      variant={providers.find(p => p.provider === 'dropbox')?.isConnected ? "destructive" : "default"}
                      onClick={() => {
                        if (providers.find(p => p.provider === 'dropbox')?.isConnected) {
                          storage.disconnectExternalProvider('dropbox');
                        } else {
                          handleConnectProvider('dropbox');
                        }
                      }}
                    >
                      {providers.find(p => p.provider === 'dropbox')?.isConnected ? 'Desconectar' : 'Conectar'}
                    </Button>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      Conecta con tu cuenta de Dropbox para usar como almacenamiento externo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Configuración de almacenamiento</CardTitle>
                <CardDescription>
                  Establece la cuota global y configura opciones de almacenamiento
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <StorageQuotaSettings 
                  showTotalInfo={true}
                  onSave={(size, isUnlimited) => {
                    // Recargar datos después de aplicar la cuota
                    setNeedsUpdate(prev => !prev);
                    
                    // Notificar al usuario
                    toast.success('Cuota actualizada correctamente');
                  }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <StorageSettings />
              </CardContent>
            </Card>
            
            <div className="flex justify-end mt-4 space-x-2">
              <ActionButtons
                onCancel={() => setActiveTab('overview')}
                onSave={handleSaveConfig}
                isSaving={savingConfig}
                saveText="Guardar configuración"
                cancelText="Cancelar"
                alignment="end"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 