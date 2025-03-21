"use client"

import React, { useState } from 'react';
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
import { HardDrive, Database, Cloud, Settings } from 'lucide-react';
import Link from 'next/link';

export default function GlobalStoragePage() {
  const { getStorageStats, setQuota, getQuota, connectExternalProvider, disconnectExternalProvider, getConnectedProviders } = useStorage();
  const { getFilesByFilter, deleteFile, getFileById } = useFiles();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Obtener estadísticas globales
  const storageStats = getStorageStats();
  const quota = getQuota('global');
  const providers = getConnectedProviders();
  
  // Archivos globales
  const allFiles = getFilesByFilter({ isDeleted: false });
  
  // Manejar eliminación de archivos
  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      toast.success('Archivo eliminado correctamente');
    } catch (error) {
      toast.error('Error al eliminar el archivo');
    }
  };
  
  // Manejar conexión con proveedor externo
  const handleConnectProvider = async (provider: string) => {
    try {
      await connectExternalProvider(provider, {});
      toast.success(`Conectado a ${provider} correctamente`);
    } catch (error) {
      toast.error(`Error al conectar con ${provider}`);
    }
  };
  
  // Actualizar cuota
  const handleUpdateQuota = (size: number, isUnlimited: boolean) => {
    setQuota('global', undefined, size, isUnlimited);
    toast.success('Cuota global actualizada correctamente');
  };
  
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
          <TabsTrigger value="providers">Proveedores</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StorageStatusCard 
              used={storageStats.used} 
              total={storageStats.quota} 
              isUnlimited={storageStats.isUnlimited}
            />
            
            <StorageTypeChart data={storageStats.byType} />
            
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
          </div>
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
                          disconnectExternalProvider('gdrive');
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
                          disconnectExternalProvider('dropbox');
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
        
        {/* Pestaña de configuración */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 gap-4">
            <StorageQuotaSettings 
              quotaSize={quota.quotaSize} 
              isUnlimited={quota.isUnlimited}
              onSave={handleUpdateQuota}
            />
            
            <StorageSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Función para formatear bytes
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 