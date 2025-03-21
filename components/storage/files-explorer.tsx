import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, FileText, FolderOpen, Image, Search, Trash2, Film, Archive } from 'lucide-react';
import { BaseFile } from '@/contexts/file-context';

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

const FilesExplorer: React.FC<FilesExplorerProps> = ({
  files = [],
  onDelete,
  onView,
  showClinic = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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
      
      return matchesSearch && matchesType;
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
                {filteredFiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showClinic ? 6 : 5} className="text-center py-8 text-gray-500">
                      No se encontraron archivos
                    </TableCell>
                  </TableRow>
                )}
                
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="truncate max-w-[200px]">{file.fileName}</span>
                    </TableCell>
                    
                    {showClinic && (
                      <TableCell>
                        {file.clinicId || '-'}
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
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilesExplorer; 