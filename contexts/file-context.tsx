"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useInterfaz } from './interfaz-Context';
import { BaseEntity, EntityImage, EntityDocument } from "@/services/data/models/interfaces";

// Definición de tipos basados en el modelo central
export interface BaseFile extends BaseEntity {
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

// Interfaz del contexto
interface FileContextType {
  files: BaseFile[];
  uploadFile: (file: File, metadata: any, onProgress?: (progress: number) => void) => Promise<BaseFile>;
  deleteFile: (fileId: string, hardDelete?: boolean) => Promise<boolean>;
  restoreFile: (fileId: string) => Promise<boolean>;
  getFileById: (fileId: string) => Promise<BaseFile | null>;
  getFilesByFilter: (filter: FileFilter) => Promise<BaseFile[]>;
  updateFileMetadata: (fileId: string, metadata: Partial<BaseFile>) => Promise<BaseFile | null>;
  getStorageStats: (clinicId?: string) => Promise<{ used: number, byType: Record<string, number> }>;
  refreshFiles: () => Promise<void>;
}

// Crear el contexto
const FileContext = createContext<FileContextType | undefined>(undefined);

// Helper para convertir EntityDocument a BaseFile
const convertToBaseFile = (doc: EntityDocument): BaseFile => {
  return {
    id: doc.id,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    url: doc.url,
    path: doc.path || '',
    entityType: doc.entityType as any,
    entityId: doc.entityId,
    clinicId: '',
    categories: [],
    tags: [],
    storageProvider: 'local',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt || doc.createdAt,
    createdBy: '',
    isDeleted: false,
    isPublic: false,
    metadata: {}
  };
};

// Provider del contexto
export const FileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<BaseFile[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();
  
  // Cargar datos iniciales utilizando la interfaz
  useEffect(() => {
    const loadFiles = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          const loadedFiles = await interfaz.getAllFiles();
          // Asegurar que los datos se conviertan al formato correcto
          const baseFiles: BaseFile[] = loadedFiles ? 
            loadedFiles.map(file => {
              if ('categories' in file) {
                return file as BaseFile;
              }
              return convertToBaseFile(file as EntityDocument);
            }) : [];
          setFiles(baseFiles);
          setDataFetched(true);
          console.log("FileContext: Datos cargados correctamente");
        } catch (error) {
          console.error("Error al cargar archivos:", error);
          setFiles([]);
        }
      }
    };
    
    loadFiles();
  }, [interfaz.initialized, dataFetched]);
  
  // Función para disparar eventos de actualización
  const dispatchUpdateEvent = (fileId: string = '', entityId: string = '', action: string) => {
    try {
      window.dispatchEvent(new CustomEvent("files-updated", {
        detail: { fileId, entityId, action }
      }));
    } catch (eventError) {
      console.error("Error al disparar evento de actualización de archivos:", eventError);
      // No bloqueamos la operación principal por un error en el evento
    }
  };
  
  // Refrescar archivos
  const refreshFiles = async (): Promise<void> => {
    try {
      const refreshedFiles = await interfaz.getAllFiles();
      // Convertir a BaseFile
      const baseFiles: BaseFile[] = refreshedFiles ? 
        refreshedFiles.map(file => {
          if ('categories' in file) {
            return file as BaseFile;
          }
          return convertToBaseFile(file as EntityDocument);
        }) : [];
      setFiles(baseFiles);
      console.log("Archivos refrescados correctamente");
    } catch (error) {
      console.error("Error al refrescar archivos:", error);
    }
  };
  
  // Subir archivo
  const uploadFile = async (
    file: File,
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<BaseFile> => {
    try {
      // Validar metadata
      if (!metadata.clinicId) {
        throw new Error("clinicId es requerido para subir archivos");
      }
      
      // Asegurar que clinicId sea string
      metadata.clinicId = String(metadata.clinicId);
      
      // Simular progreso si se proporciona un callback
      if (onProgress) {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          onProgress(Math.min(progress, 100));
          if (progress >= 100) clearInterval(interval);
        }, 100);
      }
      
      // Generar ID para el archivo si no tiene
      const fileId = metadata.id || uuidv4();
      
      // Crear estructura de ruta
      const timestamp = new Date().toISOString();
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const isImage = file.type.startsWith('image/');
      const isDocument = file.type === 'application/pdf' || 
                         file.type.includes('word') || 
                         file.type.includes('excel');
      const typeFolder = isImage ? 'images' : isDocument ? 'documents' : 'files';
      const basePath = `/${metadata.clinicId}/${metadata.entityType}/${metadata.entityId}`;
      const path = `${basePath}/${typeFolder}/${year}/${month}/${file.name}`;
      
      // Preparar objeto de documento para la interfaz
      const documentData: Omit<EntityDocument, "id"> = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: '', // La URL será generada por el servidor
        path,
        entityType: metadata.entityType,
        entityId: metadata.entityId,
        category: metadata.category || 'default',
        createdAt: timestamp
      };
      
      // Guardar archivo usando interfaz
      const savedDocs = await interfaz.saveEntityDocuments(
        metadata.entityType,
        metadata.entityId,
        [{ ...documentData, id: fileId }],
        metadata.category || 'default'
      );
      
      if (!savedDocs || !Array.isArray(savedDocs) || savedDocs.length === 0) {
        throw new Error("No se pudo guardar el archivo");
      }
      
      // Convertir el documento guardado a BaseFile
      const baseFile: BaseFile = {
        id: savedDocs[0].id,
        fileName: savedDocs[0].fileName,
        fileSize: savedDocs[0].fileSize,
        mimeType: savedDocs[0].mimeType,
        url: savedDocs[0].url,
        path: savedDocs[0].path || path,
        entityType: metadata.entityType as any,
        entityId: metadata.entityId,
        clinicId: metadata.clinicId,
        categories: metadata.categories || [],
        tags: metadata.tags || [],
        storageProvider: metadata.storageProvider || 'local',
        createdAt: savedDocs[0].createdAt,
        updatedAt: savedDocs[0].updatedAt || timestamp,
        createdBy: metadata.userId || 'unknown',
        isDeleted: false,
        isPublic: metadata.isPublic || false,
        metadata: { ...metadata }
      };
      
      // Para imágenes, añadir propiedades específicas
      if (isImage) {
        baseFile.metadata.isPrimary = metadata.isPrimary || false;
        baseFile.metadata.position = metadata.position || 0;
        baseFile.metadata.width = metadata.width;
        baseFile.metadata.height = metadata.height;
      }
      
      // Para documentos, añadir propiedades específicas
      if (isDocument) {
        baseFile.metadata.pageCount = metadata.pageCount || 1;
      }
      
      // Actualizar estado local
      setFiles(prev => [...prev, baseFile]);
      
      // Disparar evento de actualización
      dispatchUpdateEvent(baseFile.id, baseFile.entityId, 'create');
      
      return baseFile;
    } catch (error) {
      console.error("Error al subir archivo:", error);
      throw error;
    }
  };
  
  // Eliminar archivo
  const deleteFile = async (fileId: string, hardDelete = false): Promise<boolean> => {
    try {
      // Validar ID
      if (!fileId) {
        console.warn("Se intentó eliminar un archivo con ID vacío");
        return false;
      }
      
      // Buscar archivo para obtener información antes de eliminarlo
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) {
        console.warn(`Archivo con ID ${fileId} no encontrado para eliminación`);
        return false;
      }
      
      // Eliminar a través de la interfaz
      const success = await interfaz.deleteFile(fileId);
      
      if (success) {
        if (hardDelete) {
          // Eliminación permanente del estado local
          setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
        } else {
          // Marcar como eliminado en el estado local
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === fileId 
                ? { ...f, isDeleted: true, updatedAt: new Date().toISOString() } 
                : f
            )
          );
        }
        
        // Disparar evento de actualización
        dispatchUpdateEvent(fileId, fileToDelete.entityId, hardDelete ? 'delete' : 'mark-deleted');
      }
      
      return success;
    } catch (error) {
      console.error("Error al eliminar archivo:", error);
      return false;
    }
  };
  
  // Restaurar archivo
  const restoreFile = async (fileId: string): Promise<boolean> => {
    try {
      // Validar ID
      if (!fileId) {
        console.warn("Se intentó restaurar un archivo con ID vacío");
        return false;
      }
      
      // Buscar archivo para obtener información antes de restaurarlo
      const fileToRestore = files.find(f => f.id === fileId);
      if (!fileToRestore) {
        console.warn(`Archivo con ID ${fileId} no encontrado para restauración`);
        return false;
      }
      
      // Restaurar a través de la interfaz
      const success = await interfaz.restoreFile(fileId);
      
      if (success) {
        // Actualizar estado local
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileId 
              ? { ...f, isDeleted: false, updatedAt: new Date().toISOString() } 
              : f
          )
        );
        
        // Disparar evento de actualización
        dispatchUpdateEvent(fileId, fileToRestore.entityId, 'restore');
      }
      
      return success;
    } catch (error) {
      console.error("Error al restaurar archivo:", error);
      return false;
    }
  };
  
  // Obtener archivo por ID
  const getFileById = async (fileId: string): Promise<BaseFile | null> => {
    try {
      // Validar ID
      if (!fileId) {
        console.warn("Se solicitó un archivo con ID vacío");
        return null;
      }
      
      // Intentar obtener archivo de la interfaz primero
      const file = await interfaz.getFileById(fileId);
      
      if (file) {
        // Convertir a BaseFile si es necesario
        return 'categories' in file ? 
          file as BaseFile : 
          convertToBaseFile(file as EntityDocument);
      }
      
      // Si no se encontró en la interfaz, buscar en el estado local
      const localFile = files.find(f => f.id === fileId);
      if (localFile) {
        console.log("Archivo recuperado del estado local:", fileId);
        return localFile;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al obtener archivo ${fileId}:`, error);
      
      // Intentar recuperar del estado local en caso de error
      const localFile = files.find(f => f.id === fileId);
      if (localFile) {
        console.log("Archivo recuperado del estado local tras error:", fileId);
        return localFile;
      }
      
      return null;
    }
  };
  
  // Obtener archivos según filtros
  const getFilesByFilter = async (filter: FileFilter): Promise<BaseFile[]> => {
    try {
      // Usar la interfaz para obtener archivos filtrados
      const filteredDocs = await interfaz.getFilesByFilter(filter);
      
      if (filteredDocs && filteredDocs.length > 0) {
        // Convertir a BaseFile si es necesario
        return filteredDocs.map(file => {
          if ('categories' in file) {
            return file as BaseFile;
          }
          return convertToBaseFile(file as EntityDocument);
        });
      }
      
      // Si no se encontraron archivos o hubo un problema, intentar filtrar del estado local
      let localFilteredFiles = [...files];
      
      // Aplicar filtros
      if (filter.entityType) {
        localFilteredFiles = localFilteredFiles.filter(f => f.entityType === filter.entityType);
      }
      
      if (filter.entityId) {
        localFilteredFiles = localFilteredFiles.filter(f => f.entityId === filter.entityId);
      }
      
      if (filter.clinicId) {
        localFilteredFiles = localFilteredFiles.filter(f => f.clinicId === filter.clinicId);
      }
      
      if (filter.mimeType) {
        localFilteredFiles = localFilteredFiles.filter(f => f.mimeType.includes(filter.mimeType!));
      }
      
      if (filter.categories && filter.categories.length > 0) {
        localFilteredFiles = localFilteredFiles.filter(f => 
          filter.categories!.some(cat => f.categories.includes(cat))
        );
      }
      
      if (filter.isDeleted !== undefined) {
        localFilteredFiles = localFilteredFiles.filter(f => f.isDeleted === filter.isDeleted);
      }
      
      if (filter.startDate) {
        const startDate = new Date(filter.startDate).getTime();
        localFilteredFiles = localFilteredFiles.filter(f => 
          new Date(f.createdAt).getTime() >= startDate
        );
      }
      
      if (filter.endDate) {
        const endDate = new Date(filter.endDate).getTime();
        localFilteredFiles = localFilteredFiles.filter(f => 
          new Date(f.createdAt).getTime() <= endDate
        );
      }
      
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        localFilteredFiles = localFilteredFiles.filter(f => 
          f.fileName.toLowerCase().includes(searchLower) || 
          f.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      return localFilteredFiles;
    } catch (error) {
      console.error("Error al obtener archivos filtrados:", error);
      return [];
    }
  };
  
  // Actualizar metadatos de un archivo
  const updateFileMetadata = async (fileId: string, metadata: Partial<BaseFile>): Promise<BaseFile | null> => {
    try {
      // Validar ID
      if (!fileId) {
        console.warn("Se intentó actualizar un archivo con ID vacío");
        return null;
      }
      
      // Obtener el archivo actual para conocer su tipo
      const currentFile = files.find(f => f.id === fileId);
      if (!currentFile) {
        console.warn(`Archivo con ID ${fileId} no encontrado para actualización de metadatos`);
        return null;
      }
      
      // Preparar datos para la interfaz
      const updateData: Partial<EntityDocument> = {
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        mimeType: metadata.mimeType,
        url: metadata.url,
        path: metadata.path,
        category: metadata.metadata?.category
      };
      
      // Actualizar a través de la interfaz
      const success = await interfaz.updateFileMetadata(fileId, updateData);
      
      if (success) {
        // Actualizar estado local
        const updatedFile: BaseFile = {
          ...currentFile,
          ...metadata,
          updatedAt: new Date().toISOString()
        };
        
        setFiles(prevFiles => 
          prevFiles.map(f => f.id === fileId ? updatedFile : f)
        );
        
        // Disparar evento de actualización
        dispatchUpdateEvent(fileId, updatedFile.entityId, 'update');
        
        return updatedFile;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al actualizar metadatos del archivo ${fileId}:`, error);
      return null;
    }
  };
  
  // Obtener estadísticas de almacenamiento
  const getStorageStats = async (clinicId?: string): Promise<{ used: number, byType: Record<string, number> }> => {
    try {
      // Obtener estadísticas a través de la interfaz
      const stats = await interfaz.getStorageStats(clinicId);
      
      if (stats) {
        return stats;
      }
      
      // Si no se obtuvieron estadísticas, calcular con datos locales
      const relevantFiles = clinicId 
        ? files.filter(f => f.clinicId === clinicId && !f.isDeleted)
        : files.filter(f => !f.isDeleted);
      
      // Calcular espacio usado
      const used = relevantFiles.reduce((total, file) => total + file.fileSize, 0);
      
      // Agrupar por tipo
      const byType: Record<string, number> = {};
      relevantFiles.forEach(file => {
        const type = file.mimeType.split('/')[0] || 'unknown';
        byType[type] = (byType[type] || 0) + file.fileSize;
      });
      
      return { used, byType };
    } catch (error) {
      console.error("Error al obtener estadísticas de almacenamiento:", error);
      return { used: 0, byType: {} };
    }
  };
  
  return (
    <FileContext.Provider
      value={{
        files,
        uploadFile,
        deleteFile,
        restoreFile,
        getFileById,
        getFilesByFilter,
        updateFileMetadata,
        getStorageStats,
        refreshFiles
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export function useFiles() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFiles debe ser usado dentro de un FileProvider');
  }
  return context;
} 