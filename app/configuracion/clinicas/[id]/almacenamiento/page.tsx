"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Database, HardDrive, Network, Upload, ArrowLeft, Server, FileArchive } from 'lucide-react';
import { useFiles, BaseFile } from '@/contexts/file-context';
import { useStorage } from '@/contexts/storage-context';
import EnhancedFilesTable from '@/components/storage/enhanced-files-table';
import StorageStatusCard from '@/components/storage/storage-status-card';
import StorageTypeChart from '@/components/storage/storage-type-chart';
import { useClinic } from '@/contexts/clinic-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface AlmacenamientoClinicaPageProps {
  clinicId?: string;
}

export default function AlmacenamientoClinicaPage({ clinicId: propClinicId }: AlmacenamientoClinicaPageProps = {}) {
  // Usar los params si no se proporciona clinicId como prop
  const params = useParams();
  const routeClinicId = typeof params?.id === 'string' ? params.id : '';
  
  // Priorizar el prop sobre el param de la ruta
  const clinicId = propClinicId || routeClinicId;
  
  // Obtener información de almacenamiento y archivos
  const { files, getFilesByFilter, deleteFile, getStorageStats } = useFiles();
  const { getQuota } = useStorage();
  const { getClinicaById, getAllClinicas } = useClinic();
  const [clinicFiles, setClinicFiles] = useState<BaseFile[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [clinic, setClinic] = useState<any>(null);
  
  // Estados para almacenar valores de cuotas y estadísticas para evitar problemas con Promises
  const [clinicQuota, setClinicQuota] = useState<any>({ id: '', quotaSize: 0, isUnlimited: false });
  const [globalQuota, setGlobalQuota] = useState<any>({ id: 'global', quotaSize: 0, isUnlimited: false });
  const [storageStatsData, setStorageStatsData] = useState<{ used: number; byType: Record<string, number> }>({ used: 0, byType: {} });
  const [globalStorageUsage, setGlobalStorageUsage] = useState(0);
  
  // Obtener información de la clínica
  useEffect(() => {
    const fetchClinic = async () => {
      try {
        const clinicData = await getClinicaById(clinicId);
        setClinic(clinicData);
      } catch (error) {
        console.error("Error al obtener la clínica:", error);
      }
    };
    
    if (clinicId) {
      fetchClinic();
    }
  }, [clinicId, getClinicaById]);
  
  // Obtener las cuotas asignadas
  useEffect(() => {
    const fetchQuotas = async () => {
      try {
        const clinicQuotaData = await getQuota('clinic', clinicId);
        const globalQuotaData = await getQuota('global');
        
        setClinicQuota(clinicQuotaData || { id: '', quotaSize: 0, isUnlimited: false });
        setGlobalQuota(globalQuotaData || { id: 'global', quotaSize: 0, isUnlimited: false });
      } catch (error) {
        console.error("Error al obtener cuotas:", error);
      }
    };
    
    fetchQuotas();
  }, [clinicId, getQuota]);
  
  // Obtener estadísticas de almacenamiento
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getStorageStats(clinicId);
        setStorageStatsData(stats || { used: 0, byType: {} });
      } catch (error) {
        console.error("Error al obtener estadísticas de almacenamiento:", error);
      }
    };
    
    fetchStats();
  }, [clinicId, getStorageStats]);
  
  // Determinar si la clínica tiene una cuota personalizada o usa la global
  const hasCustomQuota = clinicQuota.id && clinicQuota.id !== 'global';
  const activeQuota = hasCustomQuota ? clinicQuota : globalQuota;
  
  // Para clínicas con cuota global, calcular el espacio disponible teniendo en cuenta
  // el uso de todas las clínicas
  useEffect(() => {
    // Si usa cuota global, obtener uso de todas las clínicas
    if (!hasCustomQuota) {
      try {
        // Obtenemos todas las clínicas para calcular uso total
        const calculateGlobalUsage = async () => {
          const allClinics = await getAllClinicas();
          let totalUsed = 0;
          
          // Sumamos uso de todas las clínicas
          for (const c of allClinics) {
            const cStats = await getStorageStats(c.id.toString());
            totalUsed += cStats.used || 0;
          }
          
          setGlobalStorageUsage(totalUsed);
        };
        
        calculateGlobalUsage();
      } catch (error) {
        console.error("Error calculando uso global:", error);
      }
    }
  }, [hasCustomQuota, getStorageStats, getAllClinicas]);
  
  // Calcular el porcentaje de uso
  const percentUsed = activeQuota.isUnlimited 
    ? 0 
    : hasCustomQuota
      ? Math.min(100, (storageStatsData.used / activeQuota.quotaSize) * 100)
      : Math.min(100, (storageStatsData.used / Math.max(1, activeQuota.quotaSize - globalStorageUsage + storageStatsData.used)) * 100);
  
  // Calcular información sobre tipos de archivo
  const fileTypeStats = {
    images: clinicFiles.filter(f => f.mimeType.startsWith('image/')).length,
    documents: clinicFiles.filter(f => 
      f.mimeType.includes('pdf') || 
      f.mimeType.includes('word') || 
      f.mimeType.includes('excel')
    ).length,
    videos: clinicFiles.filter(f => f.mimeType.startsWith('video/')).length,
    others: clinicFiles.filter(f => 
      !f.mimeType.startsWith('image/') && 
      !f.mimeType.startsWith('video/') && 
      !f.mimeType.includes('pdf') && 
      !f.mimeType.includes('word') && 
      !f.mimeType.includes('excel')
    ).length
  };
  
  // Estadísticas por entidad
  const entityStats = clinicFiles.reduce((acc, file) => {
    if (!acc[file.entityType]) acc[file.entityType] = 0;
    acc[file.entityType]++;
    return acc;
  }, {} as Record<string, number>);
  
  // Cargar los archivos de la clínica
  useEffect(() => {
    const loadClinicFiles = async () => {
      try {
        // Filtramos los archivos que corresponden a esta clínica
        const filesForClinic = await getFilesByFilter({ 
          clinicId, 
          isDeleted: false 
        });
        
        setClinicFiles(filesForClinic);
      } catch (error) {
        console.error("Error al cargar archivos:", error);
        setClinicFiles([]);
      }
    };
    
    loadClinicFiles();
  }, [clinicId, getFilesByFilter]);
  
  // Manejar eliminación de archivos
  const handleDeleteFile = async (fileId: string) => {
    try {
      const success = await deleteFile(fileId);
      if (success) {
        // Actualizar la lista de archivos
        setClinicFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      }
    } catch (error) {
      console.error("Error al eliminar archivo:", error);
    }
  };
  
  // Ver un archivo
  const handleViewFile = (file: BaseFile) => {
    window.open(file.url, '_blank');
  };
  
  // Formatear bytes en una unidad legible
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Determinar si estamos dentro de una pestaña o como página independiente
  const isStandalone = !propClinicId;
  
  return (
    <div className={isStandalone ? "container p-6 mx-auto" : ""}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {isStandalone && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const router = useRouter();
                router.push(`/configuracion/clinicas/${clinicId}`);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a configuración
            </Button>
          )}
          <h1 className={`${isStandalone ? "text-2xl" : "text-xl"} font-bold`}>
            Almacenamiento - {clinic?.name || `Clínica ${clinicId}`}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/configuracion/almacenamiento">
            <Button variant="outline" size="sm" className="flex items-center">
              <Server className="w-4 h-4 mr-1" />
              <span>Configuración global</span>
            </Button>
          </Link>
          
          <Button variant="default">
            <Upload className="w-4 h-4 mr-2" />
            Subir archivo
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="col-span-1 shadow-sm">
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Almacenamiento asignado
                </CardTitle>
                <CardDescription className="text-xs leading-tight mt-0.5">
                  {hasCustomQuota 
                    ? "Esta clínica tiene una cuota personalizada" 
                    : "Esta clínica utiliza la cuota global del sistema"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pt-0 pb-3">
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div>
                      <span className="text-gray-500">Cuota:</span>
                      <span className="ml-1 font-medium text-purple-600">
                        {activeQuota.isUnlimited || !hasCustomQuota
                          ? 'Sin límite' 
                          : formatBytes(activeQuota.quotaSize)}
                        {!hasCustomQuota && <span className="ml-1 text-gray-500">(global)</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Utilizado:</span>
                      <span className="ml-1 font-medium">
                        {formatBytes(storageStatsData.used)}
                        {activeQuota.isUnlimited ? '' : ` (${percentUsed.toFixed(1)}%)`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Espacio libre:</span>
                      <span className="ml-1 font-medium">
                        {activeQuota.isUnlimited || !hasCustomQuota
                          ? formatBytes(Math.max(0, activeQuota.quotaSize - globalStorageUsage)) 
                          : formatBytes(Math.max(0, activeQuota.quotaSize - storageStatsData.used))}
                      </span>
                      {!hasCustomQuota && !activeQuota.isUnlimited && (
                        <span className="ml-1 text-xs text-blue-500">
                          (compartido entre clínicas)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Archivos:</span>
                      <span className="ml-1 font-medium">{clinicFiles.length}</span>
                    </div>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className={`${percentUsed > 90 ? 'bg-red-600' : percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-600'} h-2.5 rounded-full`} 
                        style={{ width: `${percentUsed}%` }}
                      ></div>
                    </div>
                    
                    {!hasCustomQuota && !activeQuota.isUnlimited && (
                      <div className="mt-1 text-xs text-gray-500">
                        Uso global: {formatBytes(globalStorageUsage)} de {formatBytes(activeQuota.quotaSize)} 
                        ({Math.min(100, (globalStorageUsage / activeQuota.quotaSize) * 100).toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 shadow-sm">
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <FileArchive className="h-3.5 w-3.5" />
                  Tipos de archivo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pt-0 pb-3">
                <div className="flex flex-col">
                  {/* Contenedor del gráfico con altura fija */}
                  <div className="flex-1" style={{ height: "100px" }}>
                    <StorageTypeChart
                      data={{
                        image: fileTypeStats.images * 1024 * 100,
                        application: fileTypeStats.documents * 1024 * 100,
                        video: fileTypeStats.videos * 1024 * 100,
                        default: fileTypeStats.others * 1024 * 100
                      }}
                    />
                  </div>
                  
                  {/* Lista de tipos de archivo */}
                  <div className="grid grid-cols-2 gap-x-2 mt-1.5 pt-1.5 border-t border-gray-100">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1"></div>
                      <span className="text-[10px]">Imágenes: {fileTypeStats.images}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1"></div>
                      <span className="text-[10px]">Documentos: {fileTypeStats.documents}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div>
                      <span className="text-[10px]">Videos: {fileTypeStats.videos}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1"></div>
                      <span className="text-[10px]">Otros: {fileTypeStats.others}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="files">
          <EnhancedFilesTable
            files={clinicFiles}
            onDelete={handleDeleteFile}
            onView={handleViewFile}
            showEntity={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 