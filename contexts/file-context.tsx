import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Importar funciones necesarias para manejar archivos específicos
let deleteEntityImages: ((entityType: string, entityId: string) => boolean) | undefined;
let deleteEntityDocuments: ((entityType: string, entityId: string) => boolean) | undefined;

try {
  // Importar dinámicamente desde mockData si está disponible
  const mockDataModule = require('@/mockData');
  if (mockDataModule) {
    deleteEntityImages = mockDataModule.deleteEntityImages;
    deleteEntityDocuments = mockDataModule.deleteEntityDocuments;
  }
} catch (error) {
  console.warn('No se pudieron importar funciones de mockData:', error);
}

// Tipos básicos
export interface BaseFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  path: string;
  categories: string[];
  tags: string[];
  entityType: 'equipment' | 'service' | 'client' | 'invoice' | 'document' | 'treatment';
  entityId: string;
  clinicId: string;
  storageProvider: 'local' | 'gdrive' | 'dropbox' | 's3';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDeleted: boolean;
  isPublic: boolean;
  metadata: Record<string, any>;
}

export interface ImageFile extends BaseFile {
  isPrimary: boolean;
  width?: number;
  height?: number;
  position: number;
}

export interface DocumentFile extends BaseFile {
  pageCount?: number;
}

// Filtros para búsqueda
export interface FileFilter {
  entityType?: string;
  entityId?: string;
  clinicId?: string;
  mimeType?: string;
  categories?: string[];
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
  searchText?: string;
}

interface FileContextType {
  files: BaseFile[];
  uploadFile: (file: File, metadata: any, onProgress?: (progress: number) => void) => Promise<BaseFile>;
  deleteFile: (fileId: string, hardDelete?: boolean) => Promise<boolean>;
  restoreFile: (fileId: string) => Promise<boolean>;
  getFileById: (fileId: string) => BaseFile | undefined;
  getFilesByFilter: (filter: FileFilter) => BaseFile[];
  updateFileMetadata: (fileId: string, metadata: Partial<BaseFile>) => Promise<BaseFile>;
  getStorageStats: (clinicId?: string) => { used: number, byType: Record<string, number> };
  addFileToContext: (fileData: BaseFile) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<BaseFile[]>([]);
  
  // Cargar datos de localStorage al inicio
  useEffect(() => {
    const savedFiles = localStorage.getItem('appFiles');
    if (savedFiles) {
      try {
        setFiles(JSON.parse(savedFiles));
      } catch (error) {
        console.error("Error parsing saved files:", error);
        // Inicializar con array vacío en caso de error
        setFiles([]);
      }
    }
  }, []);
  
  // Guardar cambios en localStorage
  useEffect(() => {
    localStorage.setItem('appFiles', JSON.stringify(files));
  }, [files]);
  
  // Simular subida de archivo
  const uploadFile = async (
    file: File, 
    metadata: any, 
    onProgress?: (progress: number) => void
  ): Promise<BaseFile> => {
    // Simular carga progresiva
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(Math.min(progress, 100));
        if (progress >= 100) clearInterval(interval);
      }, 100);
    }
    
    // Validación de clinicId
    if (!metadata.clinicId) {
      console.error("Error: clinicId es requerido para subir archivos");
      throw new Error("clinicId es requerido para subir archivos");
    }
    
    // Asegurar que clinicId sea string
    metadata.clinicId = String(metadata.clinicId);
    
    console.log(`Subiendo archivo asociado a clínica: ${metadata.clinicId}`);
    
    // Crear una URL temporal (en producción sería un upload real)
    const fileUrl = URL.createObjectURL(file);
    
    // Generar una miniatura para imágenes (en producción sería procesamiento real)
    let thumbnailUrl;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = fileUrl; // En un sistema real, sería una versión optimizada
    }
    
    // Determinar tipo de archivo
    const isImage = file.type.startsWith('image/');
    const isDocument = file.type === 'application/pdf' || 
                       file.type.includes('word') || 
                       file.type.includes('excel');
    
    // Crear objeto de archivo base con fecha actual
    const timestamp = new Date().toISOString();
    
    // Generar estructura de ruta virtual basada en entidad y fecha
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const basePath = `/${metadata.clinicId}/${metadata.entityType}/${metadata.entityId}`;
    const typeFolder = isImage ? 'images' : isDocument ? 'documents' : 'files';
    const path = `${basePath}/${typeFolder}/${year}/${month}/${file.name}`;
    
    // Crear el objeto base
    const newFile: BaseFile = {
      id: uuidv4(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      url: fileUrl,
      thumbnailUrl,
      path,
      categories: metadata.categories || [],
      tags: metadata.tags || [],
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      clinicId: metadata.clinicId,
      storageProvider: 'local',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: metadata.userId || 'unknown',
      isDeleted: false,
      isPublic: metadata.isPublic || false,
      metadata: {},
    };
    
    // Agregar metadatos específicos según el tipo de archivo
    let specificFile: BaseFile | ImageFile | DocumentFile = newFile;
    
    if (isImage) {
      // Determinar si esta imagen debe ser la principal
      const existingImages = files.filter(f => 
        f.entityType === metadata.entityType && 
        f.entityId === metadata.entityId &&
        f.mimeType.startsWith('image/') &&
        !f.isDeleted
      );
      
      const imageFile: ImageFile = {
        ...newFile,
        isPrimary: metadata.isPrimary || existingImages.length === 0,
        position: metadata.position || existingImages.length,
      };
      
      // Si esta imagen es primaria, actualizar las demás
      if (imageFile.isPrimary) {
        setFiles(prevFiles => 
          prevFiles.map(f => 
            (f.entityType === metadata.entityType && 
             f.entityId === metadata.entityId && 
             f.mimeType.startsWith('image/') && 
             !f.isDeleted) 
              ? { ...f, metadata: { ...f.metadata, isPrimary: false } } 
              : f
          )
        );
      }
      
      specificFile = imageFile;
    } else if (isDocument) {
      // Para documentos PDF u otros, podríamos agregar metadatos específicos
      const documentFile: DocumentFile = {
        ...newFile,
        pageCount: 1, // En un sistema real se extraería del documento
      };
      specificFile = documentFile;
    }
    
    // Agregar archivo al state
    setFiles(prevFiles => [...prevFiles, specificFile]);
    
    return specificFile;
  };
  
  // Eliminar archivo (soft delete o hard delete)
  const deleteFile = async (fileId: string, hardDelete = false): Promise<boolean> => {
    // Buscar el archivo primero para obtener sus metadatos
    const fileToDelete = files.find(f => f.id === fileId);
    
    if (!fileToDelete) {
      console.warn(`Archivo con ID ${fileId} no encontrado para eliminación`);
      return false;
    }
    
    // Guardar información importante sobre el archivo para eliminación de almacenes específicos
    const { entityType, entityId, mimeType } = fileToDelete;
    console.log(`Eliminando archivo ${fileId} de tipo ${entityType} para entidad ${entityId}`);
    
    // Eliminar del contexto principal de archivos
    if (hardDelete) {
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      
      // Intentar eliminar también de localStorage
      try {
        // Eliminar el archivo del localStorage de la entidad específica
        if (mimeType.startsWith('image/') && deleteEntityImages) {
          deleteEntityImages(entityType, entityId);
          console.log(`Eliminadas imágenes para ${entityType}/${entityId} del almacén específico`);
        } else if (deleteEntityDocuments) {
          deleteEntityDocuments(entityType, entityId);
          console.log(`Eliminados documentos para ${entityType}/${entityId} del almacén específico`);
        }
        
        // Eliminar de localStorage general
        const allFilesKey = 'files';
        const storedFiles = localStorage.getItem(allFilesKey);
        if (storedFiles) {
          const filesData = JSON.parse(storedFiles);
          const updatedFiles = filesData.filter((f: any) => f.id !== fileId);
          localStorage.setItem(allFilesKey, JSON.stringify(updatedFiles));
        }
      } catch (error) {
        console.error('Error al eliminar archivo de localStorage:', error);
      }
    } else {
      // Soft delete - solo marcar como eliminado
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId 
            ? { ...f, isDeleted: true, updatedAt: new Date().toISOString() } 
            : f
        )
      );
      
      // Actualizar localStorage
      try {
        const allFilesKey = 'files';
        const storedFiles = localStorage.getItem(allFilesKey);
        if (storedFiles) {
          const filesData = JSON.parse(storedFiles);
          const updatedFiles = filesData.map((f: any) => 
            f.id === fileId 
              ? { ...f, isDeleted: true, updatedAt: new Date().toISOString() } 
              : f
          );
          localStorage.setItem(allFilesKey, JSON.stringify(updatedFiles));
        }
      } catch (error) {
        console.error('Error al actualizar archivo en localStorage:', error);
      }
    }
    
    return true;
  };
  
  // Restaurar archivo eliminado
  const restoreFile = async (fileId: string): Promise<boolean> => {
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.id === fileId 
          ? { ...f, isDeleted: false, updatedAt: new Date().toISOString() } 
          : f
      )
    );
    return true;
  };
  
  // Obtener archivo por ID
  const getFileById = (fileId: string): BaseFile | undefined => {
    return files.find(f => f.id === fileId);
  };
  
  // Obtener archivos por filtro
  const getFilesByFilter = (filter: FileFilter): BaseFile[] => {
    return files.filter(file => {
      // Filtrar por borrados solo si se especifica
      if (filter.isDeleted !== undefined && file.isDeleted !== filter.isDeleted) {
        return false;
      }
      
      // Filtrar por tipo de entidad
      if (filter.entityType && file.entityType !== filter.entityType) {
        return false;
      }
      
      // Filtrar por ID de entidad
      if (filter.entityId && file.entityId !== filter.entityId) {
        return false;
      }
      
      // Filtrar por clínica
      if (filter.clinicId) {
        // Permitir comparación entre string y number convirtiendo ambos a string
        const fileClinicIdStr = file.clinicId?.toString() || '';
        const filterClinicIdStr = filter.clinicId.toString();
        if (fileClinicIdStr !== filterClinicIdStr) {
          return false;
        }
      }
      
      // Filtrar por tipo MIME
      if (filter.mimeType) {
        if (filter.mimeType.endsWith('/*')) {
          // Para tipos como 'image/*'
          const prefix = filter.mimeType.split('/')[0];
          if (!file.mimeType.startsWith(`${prefix}/`)) {
            return false;
          }
        } else if (file.mimeType !== filter.mimeType) {
          return false;
        }
      }
      
      // Filtrar por categorías
      if (filter.categories && filter.categories.length > 0) {
        const hasCategory = filter.categories.some(cat => file.categories.includes(cat));
        if (!hasCategory) {
          return false;
        }
      }
      
      // Filtrar por texto
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        const nameMatch = file.fileName.toLowerCase().includes(searchLower);
        const tagMatch = file.tags.some(tag => tag.toLowerCase().includes(searchLower));
        if (!nameMatch && !tagMatch) {
          return false;
        }
      }
      
      // Filtrar por fecha de creación
      if (filter.startDate && new Date(file.createdAt) < new Date(filter.startDate)) {
        return false;
      }
      
      if (filter.endDate && new Date(file.createdAt) > new Date(filter.endDate)) {
        return false;
      }
      
      return true;
    });
  };
  
  // Actualizar metadatos de archivo
  const updateFileMetadata = async (fileId: string, metadata: Partial<BaseFile>): Promise<BaseFile> => {
    let updatedFile: BaseFile | undefined;
    
    setFiles(prevFiles => 
      prevFiles.map(f => {
        if (f.id === fileId) {
          updatedFile = {
            ...f,
            ...metadata,
            updatedAt: new Date().toISOString()
          };
          return updatedFile;
        }
        return f;
      })
    );
    
    if (!updatedFile) {
      throw new Error(`File with id ${fileId} not found`);
    }
    
    return updatedFile;
  };
  
  // Obtener estadísticas de almacenamiento
  const getStorageStats = (clinicId?: string) => {
    console.log(`Calculando estadísticas para clínica: ${clinicId} (${typeof clinicId})`);
    console.log(`Total archivos disponibles: ${files.length}`);
    
    // Filtrar por clínica si se especifica
    const relevantFiles = clinicId 
      ? files.filter(f => {
          // Convertir ambos a string para comparar correctamente
          const fileClinicId = String(f.clinicId || '');
          const targetClinicId = String(clinicId);
          return fileClinicId === targetClinicId && !f.isDeleted;
        })
      : files.filter(f => !f.isDeleted);
    
    console.log(`Archivos relevantes encontrados: ${relevantFiles.length}`);
    
    // Calcular uso total
    const totalUsed = relevantFiles.reduce((sum, file) => sum + file.fileSize, 0);
    
    // Calcular uso por tipo de archivo
    const byType: Record<string, number> = {};
    
    relevantFiles.forEach(file => {
      // Extraer tipo principal (image, video, application, etc)
      const mainType = file.mimeType.split('/')[0];
      byType[mainType] = (byType[mainType] || 0) + file.fileSize;
    });
    
    return {
      used: totalUsed,
      byType
    };
  };
  
  // Añadir archivo al contexto
  const addFileToContext = (fileData: BaseFile) => {
    // Verificar si el archivo ya existe
    const fileExists = files.some(f => f.id === fileData.id);
    if (fileExists) {
      return; // Evitar duplicados
    }
    
    // Guardar metadatos del archivo en localStorage para persistencia
    const fileMetadata = {
      id: fileData.id,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      path: fileData.path,
      entityType: fileData.entityType,
      entityId: fileData.entityId,
      clinicId: fileData.clinicId,
      createdAt: fileData.createdAt,
      metadata: fileData.metadata,
    };
    
    // Guardar metadatos en localStorage
    localStorage.setItem(`file_metadata_${fileData.id}`, JSON.stringify(fileMetadata));
    
    // Añadir a la lista de archivos
    setFiles(prev => [...prev, fileData]);
  };
  
  // Añadir esta función para cargar archivos desde localStorage al iniciar
  useEffect(() => {
    const loadFilesFromStorage = () => {
      const files: BaseFile[] = [];
      
      // Buscar todos los items en localStorage que contienen metadatos de archivos
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('file_metadata_')) {
          try {
            const metadataString = localStorage.getItem(key);
            if (metadataString) {
              const metadata = JSON.parse(metadataString);
              
              // Intentar obtener datos del archivo
              const fileKey = `file_${metadata.path}`;
              const fileData = localStorage.getItem(fileKey);
              
              if (fileData) {
                // Reconstruir objeto de archivo
                const file: BaseFile = {
                  ...metadata,
                  url: fileData,
                  thumbnailUrl: fileData,
                  storageProvider: 'local',
                  updatedAt: metadata.createdAt,
                  createdBy: 'system',
                  isDeleted: false,
                  isPublic: false
                };
                
                files.push(file);
              }
            }
          } catch (error) {
            console.error('Error al cargar archivo desde localStorage:', error);
          }
        }
      }
      
      // Actualizar estado con los archivos cargados
      if (files.length > 0) {
        setFiles(files);
      }
    };
    
    loadFilesFromStorage();
  }, []);
  
  return (
    <FileContext.Provider value={{
      files,
      uploadFile,
      deleteFile,
      restoreFile,
      getFileById,
      getFilesByFilter,
      updateFileMetadata,
      getStorageStats,
      addFileToContext
    }}>
      {children}
    </FileContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}; 