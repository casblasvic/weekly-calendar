import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, FileText, FolderOpen, Image, Search, Trash2, Film, Archive, ExternalLink, Link as LinkIcon, ChevronDown, ChevronRight, Plus, Wrench, ShoppingCart, Users, Receipt } from 'lucide-react';
import { BaseFile, useFiles } from '@/contexts/file-context';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import FileDeleteDialog from './file-delete-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useClinic } from '@/contexts/clinic-context';
import { useEquipment } from '@/contexts/equipment-context';
import { useServicio } from '@/contexts/servicios-context';
import { useTarif } from '@/contexts/tarif-context';

interface EnhancedFilesTableProps {
  files: BaseFile[];
  onDelete?: (fileId: string) => void;
  onView?: (file: BaseFile) => void;
  showClinic?: boolean;
  showEntity?: boolean;
}

// Función para formatear bytes en forma legible
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Mapa de iconos por tipo de archivo
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />;
  } else if (mimeType.startsWith('video/')) {
    return <Film className="h-4 w-4 text-red-500" />;
  } else if (mimeType.includes('pdf')) {
    return <FileText className="h-4 w-4 text-orange-500" />;
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className="h-4 w-4 text-blue-700" />;
  } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return <FileText className="h-4 w-4 text-green-600" />;
  } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return <Archive className="h-4 w-4 text-gray-600" />;
  }
  return <FileText className="h-4 w-4 text-gray-500" />;
};

// Obtener icono según tipo de entidad
const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'equipment':
      return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'service':
      return <ShoppingCart className="h-4 w-4 text-purple-500" />;
    case 'client':
      return <Users className="h-4 w-4 text-green-500" />;
    case 'tarifa':
      return <Receipt className="h-4 w-4 text-amber-500" />;
    default:
      return <FolderOpen className="h-4 w-4 text-gray-500" />;
  }
};

// Función para obtener información de la entidad relacionada
const getEntityInfo = (
  entityType: string, 
  entityId: string, 
  getEquipo: (id: string) => Promise<any>, 
  getClinica: (id: string) => Promise<any>,
  getServicio: (id: string) => Promise<any>,
  getTarifa: (id: string) => Promise<any>
) => {
  let name = '';
  let link = '#';
  let code = entityId;
  let detailedInfo = '';
  
  const getEquipmentInfo = async () => {
    try {
      const equipment = await getEquipo(entityId);
      if (equipment) {
        const clinicId = equipment.clinicId?.toString() || '';
        const clinic = await getClinica(clinicId);
        name = equipment.name;
        code = equipment.code;
        link = `/configuracion/clinicas/${clinicId}/equipamiento/${equipment.id}`;
        detailedInfo = clinic ? `${clinic.name} > Equipamiento` : 'Equipamiento';
      }
    } catch (error) {
      console.error("Error al obtener información del equipo:", error);
    }
  };
  
  const getServiceInfo = async () => {
    try {
      const service = await getServicio(entityId);
      if (service) {
        const tarifaId = service.tarifaId || '';
        const tarifa = await getTarifa(tarifaId);
        name = service.nombre;
        code = service.id;
        link = `/configuracion/tarifas/${tarifaId}/nuevo-servicio?servicioId=${service.id}`;
        detailedInfo = tarifa ? `${tarifa.nombre} > Servicios` : 'Servicios';
      }
    } catch (error) {
      console.error("Error al obtener información del servicio:", error);
    }
  };
  
  // Iniciar la carga de la información (asíncrona)
  if (entityType === 'equipment') {
    getEquipmentInfo();
  } else if (entityType === 'service') {
    getServiceInfo();
  } else if (entityType === 'client') {
    // Cliente (pendiente de implementar con interfaz)
    name = `Cliente ${entityId}`;
    code = entityId;
    link = `/clientes/${entityId}`;
    detailedInfo = 'Clientes';
  } else if (entityType === 'tarifa') {
    // Tarifa (pendiente de implementar con interfaz)
    const getTarifaInfo = async () => {
      try {
        const tarifa = await getTarifa(entityId);
        if (tarifa) {
          name = tarifa.nombre;
          code = entityId;
          link = `/configuracion/tarifas/${entityId}`;
          detailedInfo = 'Tarifas';
        }
      } catch (error) {
        console.error("Error al obtener información de la tarifa:", error);
      }
    };
    getTarifaInfo();
  }
  
  // Si no se encontró información específica
  if (!name) {
    name = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`;
    detailedInfo = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  }
  
  return {
    name,
    code,
    link,
    detailedInfo
  };
};

// Función para obtener el nombre de la clínica
const getClinicName = async (clinicId: string, interfaz: any) => {
  try {
    const clinic = await interfaz.getClinicaById(clinicId);
    return clinic ? clinic.name : clinicId;
  } catch (error) {
    console.error("Error al obtener información de la clínica:", error);
    return clinicId;
  }
};

// Añadir una función para verificar si un archivo está duplicado
const findDuplicateFiles = (files: BaseFile[]): Record<string, BaseFile[]> => {
  // Agrupar archivos primero por path (si existe) para identificar duplicados exactos
  // y luego por nombre y tamaño como respaldo
  const fileGroups: Record<string, BaseFile[]> = {};
  
  // Primero, agrupar por path (contenido idéntico)
  const pathGroups: Record<string, BaseFile[]> = {};
  files.forEach(file => {
    if (file.path) {
      const pathKey = file.path;
      if (!pathGroups[pathKey]) {
        pathGroups[pathKey] = [];
      }
      pathGroups[pathKey].push(file);
    }
  });
  
  // Procesar los archivos agrupados por path
  Object.entries(pathGroups).forEach(([path, pathFiles]) => {
    if (pathFiles.length > 0) {
      // Usar la primera instancia del archivo como clave
      const firstFile = pathFiles[0];
      const key = `path_${path}`;
      fileGroups[key] = pathFiles;
    }
  });
  
  // Luego, agrupar el resto (sin path) por nombre y tamaño
  files.filter(file => !file.path).forEach(file => {
    const key = `name_${file.fileName}_${file.fileSize}`;
    if (!fileGroups[key]) {
      fileGroups[key] = [];
    }
    fileGroups[key].push(file);
  });
  
  // Devolver solo los grupos con más de un archivo (duplicados)
  return Object.fromEntries(
    Object.entries(fileGroups).filter(([_, group]) => group.length > 1)
  );
};

// Añadir una interfaz para archivos agrupados
interface FileGroup {
  mainFile: BaseFile;
  relatedFiles: BaseFile[]; // Todas las instancias del mismo archivo (incluida la principal)
  isExpanded: boolean;
}

const EnhancedFilesTable: React.FC<EnhancedFilesTableProps> = ({
  files = [],
  onDelete,
  onView,
  showClinic = false,
  showEntity = true
}) => {
  const router = useRouter();
  const { deleteFile } = useFiles();
  const { getClinicaById } = useClinic();
  const { getEquipoById } = useEquipment();
  const { getServicioById } = useServicio();
  const { getTarifaById } = useTarif();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<BaseFile | null>(null);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [clinicNames, setClinicNames] = useState<Record<string, string>>({});
  const [entityInfos, setEntityInfos] = useState<Record<string, any>>({});
  const [fileGroups, setFileGroups] = useState<{ mainFile: BaseFile, relatedFiles: BaseFile[], isExpanded: boolean }[]>([]);
  const [groupExpansionState, setGroupExpansionState] = useState<Record<string, boolean>>({});
  
  // Obtener tipos de entidades únicas
  const entityTypes = [...new Set(files.map(file => file.entityType))];
  
  // Debug: Mostrar información de archivos en la consola
  useEffect(() => {
    console.log('EnhancedFilesTable recibió', files.length, 'archivos');
    files.forEach(file => {
      console.log(`Archivo en tabla: ${file.fileName}, entidad: ${file.entityType}/${file.entityId}, clínica: ${file.clinicId}`);
    });
  }, [files]);
  
  // Cargar nombres de clínicas
  useEffect(() => {
    const loadClinicNames = async () => {
      const uniqueClinicIds = [...new Set(files.map(file => file.clinicId))];
      const clinicData: Record<string, string> = {};
      
      for (const clinicId of uniqueClinicIds) {
        if (clinicId) {
          try {
            const clinic = await getClinicaById(clinicId);
            if (clinic) {
              clinicData[clinicId] = clinic.name;
            } else {
              clinicData[clinicId] = clinicId;
            }
          } catch (error) {
            console.error(`Error al cargar información de clínica ${clinicId}:`, error);
            clinicData[clinicId] = clinicId;
          }
        }
      }
      
      setClinicNames(clinicData);
    };
    
    if (showClinic) {
      loadClinicNames();
    }
  }, [files, showClinic, getClinicaById]);
  
  // Cargar información de entidades
  useEffect(() => {
    const loadEntityInfo = async () => {
      const entityKeys = files
        .filter(file => file.entityType && file.entityId)
        .map(file => `${file.entityType}_${file.entityId}`);
      
      const uniqueEntityKeys = [...new Set(entityKeys)];
      const entityData: Record<string, any> = {};
      
      for (const key of uniqueEntityKeys) {
        const [entityType, entityId] = key.split('_');
        
        if (!entityType || !entityId) continue;
        
        // Obtener información según tipo de entidad
        let entityInfo = {
          name: `${entityType} ${entityId}`,
          link: '#',
          code: entityId,
          detailedInfo: entityType
        };
        
        try {
          // Usar los contextos adecuados según el tipo de entidad
          if (entityType === 'equipment') {
            const equipo = await getEquipoById(entityId);
            if (equipo) {
              const clinic = await getClinicaById(equipo.clinicId.toString());
              entityInfo = {
                name: equipo.name,
                link: `/configuracion/clinicas/${equipo.clinicId}/equipamiento/${equipo.id}`,
                code: equipo.code,
                detailedInfo: clinic ? `${clinic.name} > Equipamiento` : 'Equipamiento'
              };
            }
          } else if (entityType === 'service') {
            const servicio = await getServicioById(entityId);
            if (servicio) {
              const tarifa = await getTarifaById(servicio.tarifaId);
              entityInfo = {
                name: servicio.nombre,
                link: `/configuracion/tarifas/${servicio.tarifaId}/nuevo-servicio?servicioId=${servicio.id}`,
                code: servicio.codigo,
                detailedInfo: tarifa ? `${tarifa.nombre} > Servicios` : 'Servicios'
              };
            }
          } else if (entityType === 'tarifa') {
            const tarifa = await getTarifaById(entityId);
            if (tarifa) {
              entityInfo = {
                name: tarifa.nombre,
                link: `/configuracion/tarifas/${tarifa.id}`,
                code: entityId,
                detailedInfo: 'Tarifas'
              };
            }
          }
        } catch (error) {
          console.error(`Error al cargar información de entidad ${entityType}/${entityId}:`, error);
        }
        
        entityData[key] = entityInfo;
      }
      
      setEntityInfos(entityData);
    };
    
    if (showEntity) {
      loadEntityInfo();
    }
  }, [files, showEntity, getClinicaById, getEquipoById, getServicioById, getTarifaById]);

  // Obtener información de entidad de manera síncrona desde los datos cargados
  const getEntityInfoSync = (entityType: string, entityId: string) => {
    const key = `${entityType}_${entityId}`;
    return entityInfos[key] || {
      name: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`,
      code: entityId,
      link: '#',
      detailedInfo: entityType.charAt(0).toUpperCase() + entityType.slice(1)
    };
  };

  // Obtener nombre de clínica de manera síncrona desde los datos cargados
  const getClinicNameSync = (clinicId: string) => {
    return clinicNames[clinicId] || clinicId;
  };
  
  // Aplicar filtros y ordenación
  const filteredFiles = files
    .filter(file => {
      // Filtro de búsqueda
      const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por tipo de archivo
      const matchesType = 
        typeFilter === 'all' ||
        (typeFilter === 'image' && file.mimeType.startsWith('image/')) ||
        (typeFilter === 'document' && (
          file.mimeType.includes('pdf') || 
          file.mimeType.includes('word') || 
          file.mimeType.includes('document') ||
          file.mimeType.includes('sheet') ||
          file.mimeType.includes('excel')
        )) ||
        (typeFilter === 'video' && file.mimeType.startsWith('video/')) ||
        (typeFilter === 'other' && !(
          file.mimeType.startsWith('image/') ||
          file.mimeType.startsWith('video/') ||
          file.mimeType.includes('pdf') ||
          file.mimeType.includes('word') ||
          file.mimeType.includes('document') ||
          file.mimeType.includes('sheet') ||
          file.mimeType.includes('excel')
        ));
      
      // Filtro por tipo de entidad
      const matchesEntity = entityFilter === 'all' || file.entityType === entityFilter;
      
      return matchesSearch && matchesType && matchesEntity;
    })
    .sort((a, b) => {
      // Ordenación
      if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'name') {
        return sortDirection === 'asc'
          ? a.fileName.localeCompare(b.fileName)
          : b.fileName.localeCompare(a.fileName);
      } else if (sortBy === 'size') {
        return sortDirection === 'asc'
          ? a.fileSize - b.fileSize
          : b.fileSize - a.fileSize;
      } else if (sortBy === 'entity') {
        const entityA = getEntityInfoSync(a.entityType, a.entityId);
        const entityB = getEntityInfoSync(b.entityType, b.entityId);
        return sortDirection === 'asc'
          ? entityA.name.localeCompare(entityB.name)
          : entityB.name.localeCompare(entityA.name);
      }
      return 0;
    });
  
  // Calcular duplicados
  const duplicateGroups = useMemo(() => findDuplicateFiles(files), [files]);
  
  // Verificar si un archivo está duplicado
  const isDuplicate = (file: BaseFile): boolean => {
    // Intentar primero por path
    if (file.path) {
      const pathKey = `path_${file.path}`;
      if (duplicateGroups[pathKey] && duplicateGroups[pathKey].length > 1) {
        return true;
      }
    }
    
    // Si no hay coincidencia por path, verificar por nombre y tamaño
    const nameKey = `name_${file.fileName}_${file.fileSize}`;
    return !!duplicateGroups[nameKey] && duplicateGroups[nameKey].length > 1;
  };
  
  // Obtener todas las entidades donde está asociado un archivo duplicado
  const getDuplicateLocations = (file: BaseFile): BaseFile[] => {
    // Intentar primero por path
    if (file.path) {
      const pathKey = `path_${file.path}`;
      if (duplicateGroups[pathKey]) {
        return duplicateGroups[pathKey];
      }
    }
    
    // Si no hay coincidencia por path, obtener por nombre y tamaño
    const nameKey = `name_${file.fileName}_${file.fileSize}`;
    return duplicateGroups[nameKey] || [];
  };
  
  // Agrupar archivos duplicados para mostrar jerárquicamente
  const groupedFiles = useMemo(() => {
    const groups: FileGroup[] = [];
    const processedKeys = new Set<string>();
    
    // Recorrer los archivos filtrados
    for (const file of filteredFiles) {
      // Generar keys para identificar archivos duplicados
      const pathKey = file.path ? `path_${file.path}` : null;
      const nameKey = `name_${file.fileName}_${file.fileSize}`;
      
      // Usar la clave más específica
      const key = pathKey || nameKey;
      
      // Si ya procesamos este grupo, continuamos
      if (processedKeys.has(key)) continue;
      
      // Marcar como procesado
      processedKeys.add(key);
      
      // Encontrar todos los archivos relacionados
      const relatedFiles = file.path 
        ? filteredFiles.filter(f => f.path === file.path) 
        : filteredFiles.filter(f => `name_${f.fileName}_${f.fileSize}` === nameKey);
      
      // Si hay más de uno, es un grupo, si no, es un archivo individual
      if (relatedFiles.length > 1) {
        groups.push({
          mainFile: relatedFiles[0], // Primer archivo como principal
          relatedFiles: relatedFiles,
          isExpanded: !!groupExpansionState[key]
        });
      } else {
        groups.push({
          mainFile: file,
          relatedFiles: [file],
          isExpanded: false
        });
      }
    }
    
    return groups;
  }, [filteredFiles, groupExpansionState]);
  
  // Función para alternar la expansión de un grupo
  const toggleGroupExpansion = (key: string) => {
    setGroupExpansionState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Función para manejar la eliminación con confirmación
  const handleDeleteClick = (file: BaseFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };
  
  // Función para confirmar la eliminación
  const confirmDelete = () => {
    if (fileToDelete && onDelete) {
      // Verificar si el archivo está duplicado
      if (isDuplicate(fileToDelete)) {
        // Si está duplicado, mostrar información en consola
        console.log("El archivo está asociado a múltiples entidades:", getDuplicateLocations(fileToDelete));
        console.log("Solo se eliminará la referencia actual, no el archivo completo");
      }
      
      onDelete(fileToDelete.id);
    }
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };
  
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Explorador de archivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search" className="sr-only">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Buscar archivos..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="type-filter" className="sr-only">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo de archivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="image">Imágenes</SelectItem>
                  <SelectItem value="document">Documentos</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="other">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {showEntity && (
              <div>
                <Label htmlFor="entity-filter" className="sr-only">Entidad</Label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filtrar por entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las entidades</SelectItem>
                    {entityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="sort-by" className="sr-only">Ordenar por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="size">Tamaño</SelectItem>
                  {showEntity && <SelectItem value="entity">Entidad</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
          
          {/* Tabla de archivos */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  {showClinic && <TableHead>Clínica</TableHead>}
                  {showEntity && <TableHead>Entidad asociada</TableHead>}
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedFiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showClinic ? (showEntity ? 7 : 6) : (showEntity ? 6 : 5)} className="text-center py-8 text-gray-500">
                      No se encontraron archivos
                    </TableCell>
                  </TableRow>
                )}
                
                {groupedFiles.map((group) => {
                  const { mainFile, relatedFiles, isExpanded } = group;
                  const hasMultipleReferences = relatedFiles.length > 1;
                  const fileKey = `${mainFile.fileName}_${mainFile.fileSize}`;
                  const entityInfo = getEntityInfoSync(mainFile.entityType, mainFile.entityId);
                  
                  return (
                    <React.Fragment key={mainFile.id}>
                      {/* Fila principal del archivo */}
                      <TableRow className={hasMultipleReferences ? "border-b-0" : ""}>
                        <TableCell className="flex items-center gap-2">
                          {hasMultipleReferences && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 p-0 mr-2 hover:bg-purple-100 hover:text-purple-700 border border-purple-200 rounded-full flex items-center justify-center"
                              onClick={() => toggleGroupExpansion(fileKey)}
                              title={groupExpansionState[fileKey] ? "Ocultar referencias" : `Mostrar ${relatedFiles.length - 1} referencias adicionales`}
                            >
                              {groupExpansionState[fileKey] ? (
                                <ChevronDown className="h-4 w-4 text-purple-600" />
                              ) : (
                                <div className="flex items-center justify-center">
                                  <Plus className="h-4 w-4 text-purple-600" />
                                </div>
                              )}
                            </Button>
                          )}
                          {getFileIcon(mainFile.mimeType)}
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <span className="truncate max-w-[200px]">{mainFile.fileName}</span>
                              {hasMultipleReferences && (
                                <Badge 
                                  variant="outline" 
                                  className="ml-2 gap-1 text-xs bg-purple-100 border-purple-200 text-purple-700 rounded-full px-2 hover:bg-purple-200 cursor-pointer"
                                  onClick={() => toggleGroupExpansion(fileKey)}
                                >
                                  <Plus className="h-3 w-3 text-purple-600" />
                                  <span>{relatedFiles.length - 1}</span>
                                </Badge>
                              )}
                            </div>
                            {hasMultipleReferences && (
                              <div className="text-xs text-purple-700 mt-1 flex items-center gap-1.5 cursor-pointer" onClick={() => toggleGroupExpansion(fileKey)}>
                                <span>Archivo con {relatedFiles.length} {relatedFiles.length === 1 ? 'asociación' : 'asociaciones'}</span>
                                {groupExpansionState[fileKey] ? 
                                  <ChevronDown className="h-3 w-3" /> : 
                                  <ChevronRight className="h-3 w-3" />
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        {showClinic && (
                          <TableCell>
                            {getClinicNameSync(mainFile.clinicId)}
                          </TableCell>
                        )}
                        
                        {showEntity && (
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1.5">
                                  {getEntityTypeIcon(mainFile.entityType)}
                                  <span className="font-medium text-sm">{entityInfo.name}</span>
                                </span>
                                {entityInfo.link !== '#' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      console.log(`Navegando a: ${entityInfo.link}`);
                                      router.push(entityInfo.link);
                                    }}
                                    title="Ir a editar"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {entityInfo.detailedInfo}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        
                        <TableCell>{mainFile.mimeType.split('/')[1]}</TableCell>
                        <TableCell>{formatBytes(mainFile.fileSize)}</TableCell>
                        <TableCell>{new Date(mainFile.createdAt).toLocaleDateString()}</TableCell>
                        
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {onView && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onView(mainFile)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(mainFile.url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteClick(mainFile)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Filas de referencias adicionales (expandibles) */}
                      {hasMultipleReferences && groupExpansionState[fileKey] && (
                        <div className="border-l-2 border-purple-200 ml-4 pl-2">
                          {relatedFiles.slice(1).map((relatedFile) => {
                            const relatedEntityInfo = getEntityInfoSync(relatedFile.entityType, relatedFile.entityId);
                            
                            return (
                              <TableRow 
                                key={relatedFile.id} 
                                className="bg-purple-50/30 border-dashed"
                              >
                                <TableCell className="pl-10 flex items-center gap-2">
                                  <div className="flex items-center p-1 rounded-full bg-purple-100 text-purple-700">
                                    <LinkIcon className="h-3 w-3" />
                                  </div>
                                  <span className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-purple-800 font-medium">{relatedFile.fileName}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Referencia #{relatedFiles.indexOf(relatedFile) + 1}
                                    </div>
                                  </span>
                                </TableCell>
                                
                                {showClinic && (
                                  <TableCell className="text-sm text-gray-600">
                                    {getClinicNameSync(relatedFile.clinicId)}
                                  </TableCell>
                                )}
                                
                                {showEntity && (
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1">
                                        <Badge className="px-2 py-0.5 bg-purple-100 text-purple-800 border-none text-xs rounded flex items-center gap-1">
                                          {getEntityTypeIcon(relatedFile.entityType)}
                                          <span>{relatedFile.entityType}</span>
                                        </Badge>
                                        <span className="text-sm text-purple-700 font-medium ml-1">{relatedEntityInfo.name}</span>
                                        {relatedEntityInfo.link !== '#' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 py-0 text-xs flex items-center gap-1 border-purple-200 text-purple-700 hover:bg-purple-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log(`Navegando a: ${relatedEntityInfo.link}`);
                                              router.push(relatedEntityInfo.link);
                                            }}
                                            title="Editar esta entidad"
                                          >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            <span>Editar</span>
                                          </Button>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {relatedEntityInfo.detailedInfo}
                                      </div>
                                    </div>
                                  </TableCell>
                                )}
                                
                                <TableCell className="text-sm text-gray-600">
                                  {relatedFile.mimeType.split('/')[1]}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {formatBytes(relatedFile.fileSize)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {new Date(relatedFile.createdAt).toLocaleDateString()}
                                </TableCell>
                                
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {onView && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => onView(relatedFile)}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => window.open(relatedFile.url, '_blank')}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    
                                    {onDelete && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteClick(relatedFile)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Usar el componente de diálogo personalizado */}
        <FileDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          file={fileToDelete}
          isDuplicate={fileToDelete ? isDuplicate(fileToDelete) : false}
          onConfirm={confirmDelete}
          getEntityName={(type, id) => getEntityInfoSync(type, id).name}
          relatedEntities={fileToDelete ? 
            getDuplicateLocations(fileToDelete)
              .filter(f => f.id !== fileToDelete.id)
              .map(f => ({ type: f.entityType, id: f.entityId })) 
            : []
          }
        />
      </CardContent>
    </Card>
  );
};

export default EnhancedFilesTable; 