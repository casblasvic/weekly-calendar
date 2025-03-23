import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, FileText, FolderOpen, Image, Search, Trash2, Film, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseFile } from '@/contexts/file-context';
import { MockData, getClinics } from '@/mockData';

interface FilesExplorerProps {
  files: BaseFile[];
  onDelete?: (fileId: string) => void;
  onView?: (file: BaseFile) => void;
  showClinic?: boolean;
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
    return <Image className="w-4 h-4 text-blue-500" />;
  } else if (mimeType.startsWith('video/')) {
    return <Film className="w-4 h-4 text-red-500" />;
  } else if (mimeType.includes('pdf')) {
    return <FileText className="w-4 h-4 text-orange-500" />;
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileText className="w-4 h-4 text-blue-700" />;
  } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return <FileText className="w-4 h-4 text-green-600" />;
  } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return <Archive className="w-4 h-4 text-gray-600" />;
  }
  return <FileText className="w-4 h-4 text-gray-500" />;
};

// Función para obtener el nombre de la clínica
const getClinicName = (clinicId: string) => {
  const clinic = MockData.clinicas?.find((c) => c.id.toString() === clinicId);
  return clinic ? clinic.name : clinicId;
};

const FilesExplorer: React.FC<FilesExplorerProps> = ({
  files = [],
  onDelete,
  onView,
  showClinic = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estado para paginación
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Lista de clínicas disponibles
  const [availableClinics, setAvailableClinics] = useState<{id: string, name: string}[]>([]);
  
  useEffect(() => {
    // Cargar todas las clínicas disponibles en el sistema
    if (showClinic) {
      // Obtener clínicas del sistema
      const allClinics = getClinics();
      
      // Convertir IDs a string para consistencia
      const clinicsFormatted = allClinics.map(clinic => ({
        id: clinic.id.toString(),
        name: clinic.name
      }));
      
      console.log('FilesExplorer - Todas las clínicas disponibles:', clinicsFormatted);
      setAvailableClinics(clinicsFormatted);
    }
  }, [showClinic]);
  
  // Aplicar filtros y ordenación
  const filteredFiles = files
    .filter(file => {
      // Filtro de búsqueda
      const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por tipo
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
      
      // Filtro por clínica
      const matchesClinic = !showClinic || clinicFilter === 'all' || file.clinicId === clinicFilter;
      
      return matchesSearch && matchesType && matchesClinic;
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
      }
      return 0;
    });
  
  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredFiles.length / pageSize);
  
  // Obtener los archivos para la página actual
  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Cambiar a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, clinicFilter, pageSize]);
  
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Explorador de archivos
          <span className="ml-2 text-sm font-normal text-gray-500">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'archivo' : 'archivos'}
          </span>
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
            
            {showClinic && (
              <div>
                <Label htmlFor="clinic-filter" className="sr-only">Clínica</Label>
                <Select value={clinicFilter} onValueChange={setClinicFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las clínicas</SelectItem>
                    {availableClinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {clinic.name}
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showClinic ? 6 : 5} className="py-8 text-center text-gray-500">
                      No se encontraron archivos
                    </TableCell>
                  </TableRow>
                )}
                
                {paginatedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="truncate max-w-[200px]">{file.fileName}</span>
                    </TableCell>
                    
                    {showClinic && (
                      <TableCell>
                        {getClinicName(file.clinicId)}
                      </TableCell>
                    )}
                    
                    <TableCell>{file.mimeType.split('/')[1]}</TableCell>
                    <TableCell>{formatBytes(file.fileSize)}</TableCell>
                    <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(file)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(file.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginación */}
          {filteredFiles.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Mostrar</span>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder={pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-500">por página</span>
              </div>
              
              <div className="flex items-center">
                <div className="mr-4 text-sm text-gray-500">
                  Página {currentPage} de {totalPages}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FilesExplorer; 