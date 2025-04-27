"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useInterfaz } from './interfaz-Context';
import type { EntityImage, EntityDocument, EntityType } from "@prisma/client";

// Definición de tipos basados en el modelo central
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
  entityType: EntityType | string;
  entityId: string;
  clinicId: string;
  storageProvider: 'local' | 'gdrive' | 'dropbox' | 's3' | string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  isDeleted: boolean;
  isPublic: boolean;
  metadata: Record<string, any>;
}

export interface ImageFile extends BaseFile {
  isProfilePic: boolean;
  width?: number;
  height?: number;
  order: number;
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

// Helper para convertir EntityDocument (Prisma type) a BaseFile
const convertToBaseFile = (doc: EntityDocument): BaseFile => {
  // Map fields from Prisma EntityDocument to BaseFile
  return {
    id: doc.id,
    fileName: doc.fileName,
    fileSize: doc.fileSize ?? 0,
    mimeType: doc.fileType ?? '', // Correct mapping: Prisma fileType -> BaseFile mimeType
    url: doc.documentUrl,
    path: '', // Needs clarification or default value.
    entityType: doc.entityType,
    entityId: doc.entityId,
    clinicId: '', // Where does this come from?
    categories: [], // Needs mapping if applicable
    tags: [], // Needs mapping if applicable
    storageProvider: 'local', // Default or needs mapping?
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdBy: doc.uploadedByUserId ?? null,
    isDeleted: false, // Prisma doesn't have isDeleted? Set default.
    isPublic: false, // Prisma doesn't have isPublic? Set default.
    metadata: {} // Needs mapping if applicable
  };
};

// Provider del contexto
export const FileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<BaseFile[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  // interfaz is not used for most file operations in this context currently
  // const interfaz = useInterfaz(); 

  // Cargar datos iniciales (NEEDS IMPLEMENTATION)
  useEffect(() => {
    const loadFiles = async () => {
      // if (interfaz.initialized && !dataFetched) { // Remove interfaz dependency for now
      if (!dataFetched) { // Load once
        try {
          console.warn("FileContext: loadFiles needs implementation (e.g., fetch from API/local storage)");
          const loadedFiles: EntityDocument[] = []; // Mock empty array
          const baseFiles: BaseFile[] = loadedFiles.map(convertToBaseFile);
          setFiles(baseFiles);
          setDataFetched(true); 
          console.log("FileContext: Carga inicial de archivos OMITIDA");
        } catch (error) {
          console.error("Error al cargar archivos:", error);
          setFiles([]);
          setDataFetched(true); // Mark as fetched even on error to prevent loops
        }
      }
    };
    loadFiles();
  }, [dataFetched]);
  
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
  
  // Refrescar archivos (NEEDS IMPLEMENTATION)
  const refreshFiles = async (): Promise<void> => {
     console.warn("FileContext: refreshFiles needs implementation.");
    try {
      const refreshedFiles: EntityDocument[] = []; // Mock empty array
      const baseFiles: BaseFile[] = refreshedFiles.map(convertToBaseFile);
      setFiles(baseFiles);
      console.log("Archivos refrescados (simulado)");
    } catch (error) {
      console.error("Error al refrescar archivos:", error);
    }
  };
  
  // Subir archivo (NEEDS IMPLEMENTATION FOR ACTUAL UPLOAD)
  const uploadFile = async (
    file: File,
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<BaseFile> => {
    console.warn("FileContext: uploadFile needs implementation for actual backend upload and Prisma interaction.");
    try {
      // ... (validation and progress simulation)
      
      const fileId = metadata.id || uuidv4();
      const timestamp = new Date();
      const calculatedPath = `/${metadata.clinicId}/${metadata.entityType}/${metadata.entityId}/.../${file.name}`; // Simplified path calculation example

      // Mock saved document (replace with actual backend call)
      const mockSavedDoc: EntityDocument = {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        documentUrl: `mock/url/${calculatedPath}`, // Mock URL
        entityId: metadata.entityId,
        entityType: metadata.entityType, // Ensure this matches Prisma Enum
        uploadedByUserId: metadata.userId || null,
        description: metadata.description || null,
        systemId: "placeholder_system_id", // <<< Placeholder
        createdAt: timestamp,
        updatedAt: timestamp,
        // uploadedByUser: null // REMOVED INCORRECT RELATION FIELD
      };
      
      // Convert the mock saved Prisma EntityDocument back to BaseFile
      const baseFile = convertToBaseFile(mockSavedDoc);
      
      setFiles(prevFiles => [...prevFiles, baseFile]);
      dispatchUpdateEvent(baseFile.id, baseFile.entityId, 'upload');
      
      return baseFile;

    } catch (error) {
      console.error("Error al subir archivo:", error);
      throw error;
    }
  };
  
  // Delete file (NEEDS IMPLEMENTATION)
  const deleteFile = async (fileId: string, hardDelete = false): Promise<boolean> => {
    console.warn("FileContext: deleteFile needs implementation for Prisma.");
    const success = true; // Mock success
    if (success) {
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId)); 
      dispatchUpdateEvent(fileId, '', 'delete');
    }
    return success;
  };
  
  // Restore file (NEEDS IMPLEMENTATION/REMOVAL)
  const restoreFile = async (fileId: string): Promise<boolean> => {
    console.warn("FileContext: restoreFile needs implementation or removal for Prisma.");
    const success = true; // Mock success
    if (success) {
       dispatchUpdateEvent(fileId, '', 'restore');
    }
    return success;
  };
  
  // Get file by ID (NEEDS IMPLEMENTATION)
  const getFileById = async (fileId: string): Promise<BaseFile | null> => {
    console.warn("FileContext: getFileById needs implementation for Prisma.");
    const foundFile = files.find(f => f.id === fileId); // Simulating find from local state
    return foundFile || null;
  };
  
  // Get files by filter (NEEDS IMPLEMENTATION)
  const getFilesByFilter = async (filter: FileFilter): Promise<BaseFile[]> => {
    console.warn("FileContext: getFilesByFilter needs implementation for Prisma.");
    let filtered = files; // Simulating filter from local state
    if (filter.entityId) filtered = filtered.filter(f => f.entityId === filter.entityId);
    if (filter.entityType) filtered = filtered.filter(f => f.entityType === filter.entityType);
    return filtered;
  };
  
  // Update file metadata (NEEDS IMPLEMENTATION)
  const updateFileMetadata = async (fileId: string, metadata: Partial<BaseFile>): Promise<BaseFile | null> => {
    console.warn("FileContext: updateFileMetadata needs implementation for Prisma.");
    let updatedFile: BaseFile | null = null;
    setFiles(prevFiles => 
      prevFiles.map(f => {
        if (f.id === fileId) {
          updatedFile = { ...f, ...metadata } as BaseFile;
          // Remove incorrect mimeType assignment if present
          // delete updatedFile.mimeType;
          return updatedFile;
        }
        return f;
      })
    );
    if (updatedFile) {
       dispatchUpdateEvent(fileId, updatedFile.entityId, 'update');
    }
    return updatedFile;
  };
  
  // Get storage stats (NEEDS IMPLEMENTATION)
  const getStorageStats = async (clinicId?: string): Promise<{ used: number, byType: Record<string, number> }> => {
     console.warn("FileContext: getStorageStats needs implementation for Prisma.");
     const totalSize = files.reduce((acc, file) => acc + (file.fileSize || 0), 0);
     const statsByType = files.reduce((acc, file) => {
        const type = file.mimeType?.split('/')[0] || 'unknown';
        acc[type] = (acc[type] || 0) + (file.fileSize || 0);
        return acc;
     }, {} as Record<string, number>);

     return {
       used: totalSize,
       byType: statsByType,
     };
  };
  
  // Context value
  const value = {
    files,
    uploadFile,
    deleteFile,
    restoreFile,
    getFileById,
    getFilesByFilter,
    updateFileMetadata,
    getStorageStats,
    refreshFiles,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};

export function useFiles() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFiles debe ser usado dentro de un FileProvider');
  }
  return context;
} 