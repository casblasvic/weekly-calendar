"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Database, HardDrive, Network, Upload, ArrowLeft } from 'lucide-react';
import { useFiles, BaseFile } from '@/contexts/file-context';
import EnhancedFilesTable from '@/components/storage/enhanced-files-table';
import StorageStatusCard from '@/components/storage/storage-status-card';
import StorageTypeChart from '@/components/storage/storage-type-chart';
import { getClinic } from '@/mockData';
import { useRouter, useParams } from 'next/navigation';

interface AlmacenamientoClinicaPageProps {
  clinicId?: string;
}

export default function AlmacenamientoClinicaPage({ clinicId: propClinicId }: AlmacenamientoClinicaPageProps = {}) {
  // Usar los params si no se proporciona clinicId como prop
  const params = useParams();
  const routeClinicId = typeof params?.id === 'string' ? params.id : '';
  
  // Priorizar el prop sobre el param de la ruta
  const clinicId = propClinicId || routeClinicId;
  
  const { files, getFilesByFilter, deleteFile, getStorageStats } = useFiles();
  const [clinicFiles, setClinicFiles] = useState<BaseFile[]>([]);
  const [activeTab, setActiveTab] = useState('files');
  const clinic = getClinic(parseInt(clinicId));
  
  // Obtener las estadísticas de almacenamiento
  const storageStats = getStorageStats(clinicId);
  
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
    const loadClinicFiles = () => {
      console.log(`Cargando archivos para clínica ID: ${clinicId}`);
      console.log(`Total de archivos disponibles: ${files.length}`);
      
      // Filtramos los archivos que corresponden a esta clínica
      const filesForClinic = files.filter(file => {
        // Aseguramos que ambos sean strings para la comparación
        const fileClinicIdStr = String(file.clinicId || '');
        const currentClinicId = String(clinicId);
        
        return !file.isDeleted && fileClinicIdStr === currentClinicId;
      });
      
      console.log(`Se encontraron ${filesForClinic.length} archivos para la clínica ${clinicId}`);
      console.log("Archivos encontrados:", filesForClinic);
      
      setClinicFiles(filesForClinic);
    };
    
    loadClinicFiles();
  }, [clinicId, files]);
  
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a configuración
            </Button>
          )}
          <h1 className={`${isStandalone ? "text-2xl" : "text-xl"} font-bold`}>
            Almacenamiento - {clinic?.name || `Clínica ${clinicId}`}
          </h1>
        </div>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Subir archivo
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 gap-6 md:col-span-3">
          <div className="grid gap-6 md:grid-cols-3">
            <StorageStatusCard
              used={storageStats.used}
              total={10 * 1024 * 1024} // 10 MB ejemplo
              isUnlimited={false}
            />
            
            <StorageStatusCard
              used={clinicFiles.length > 0 ? clinicFiles.reduce((sum, file) => sum + file.fileSize, 0) : 0}
              total={1024 * 1024}
              isUnlimited={false}
            />
            
            <StorageStatusCard
              used={clinicFiles.length > 0 ? storageStats.used : 0}
              total={10 * 1024 * 1024}
              isUnlimited={false}
            />
          </div>
        </div>
        
        {/* Gráficos y tablas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="col-span-3">
          <TabsList className="mb-4">
            <TabsTrigger value="files">Archivos</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="files">
            <EnhancedFilesTable
              files={clinicFiles}
              onDelete={handleDeleteFile}
              onView={handleViewFile}
              showEntity={true}
            />
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por tipo de archivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <StorageTypeChart
                    data={{
                      image: fileTypeStats.images * 1024 * 100,
                      application: fileTypeStats.documents * 1024 * 100,
                      video: fileTypeStats.videos * 1024 * 100,
                      default: fileTypeStats.others * 1024 * 100
                    }}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por entidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <StorageTypeChart
                    data={Object.entries(entityStats).reduce((acc, [key, value], index) => {
                      const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
                      acc[key] = value; // Guardamos como un object Record<string, number>
                      return acc;
                    }, {} as Record<string, number>)}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 