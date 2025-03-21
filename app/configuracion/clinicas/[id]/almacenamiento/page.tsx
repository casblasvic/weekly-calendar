"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Database, HardDrive, Network, Upload } from 'lucide-react';
import { useFiles, BaseFile } from '@/contexts/file-context';
import EnhancedFilesTable from '@/components/storage/enhanced-files-table';
import StorageStatusCard from '@/components/storage/storage-status-card';
import StorageTypeChart from '@/components/storage/storage-type-chart';
import { getClinic } from '@/mockData';

export default function AlmacenamientoClinicaPage({ params }: { params: { id: string } }) {
  const clinicId = params.id;
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
      
      // Listar todos los archivos y sus propiedades para depuración
      files.forEach(file => {
        console.log(`Archivo: ${file.fileName}, clinicId: ${file.clinicId} (${typeof file.clinicId}), entityType: ${file.entityType}, deleted: ${file.isDeleted}`);
      });
      
      // Modificar el filtro para comparar clinicId como string o número
      const filesForClinic = files.filter(file => {
        const matchesClinic = 
          file.clinicId === clinicId || 
          file.clinicId === parseInt(clinicId) || 
          file.clinicId?.toString() === clinicId;
        
        return !file.isDeleted && matchesClinic;
      });
      
      console.log(`Se encontraron ${filesForClinic.length} archivos para la clínica ${clinicId}`);
      console.log("Archivos encontrados:", filesForClinic);
      
      // Asegurar que todos los archivos tengan el clinicId como string para consistencia
      const cleanedFiles = filesForClinic.map(file => {
        if (typeof file.clinicId === 'number') {
          return { ...file, clinicId: file.clinicId.toString() };
        }
        return file;
      });
      
      setClinicFiles(cleanedFiles);
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
  
  return (
    <div className="container p-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Almacenamiento - {clinic?.name || `Clínica ${clinicId}`}
        </h1>
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
              used={clinicFiles.length * 100 * 1024} // Ejemplo
              total={1024 * 1024}
              isUnlimited={false}
            />
            
            <StorageStatusCard
              used={5 * 1024 * 1024} // Ejemplo
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
                    data={Object.entries(entityStats).map(([key, value], index) => {
                      const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
                      return {
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        value,
                        color: colors[index % colors.length]
                      };
                    })}
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