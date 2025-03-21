// Verificamos que estamos en el servidor antes de importar módulos de Node.js
const isServer = typeof window === 'undefined';

import { StorageProvider, MetadataProvider, StorageFileInfo } from './interfaces';

// Importaciones condicionales para el servidor
let LocalStorageProvider: any;
let LocalMetadataProvider: any;

// Solo importamos estos proveedores en el servidor
if (isServer) {
  const { LocalStorageProvider: ServerLocalStorageProvider } = require('./providers/local-storage-provider');
  const { LocalMetadataProvider: ServerLocalMetadataProvider } = require('./providers/local-metadata-provider');
  
  LocalStorageProvider = ServerLocalStorageProvider;
  LocalMetadataProvider = ServerLocalMetadataProvider;
}

export class StorageService {
  private storageProvider: StorageProvider | null = null;
  private metadataProvider: MetadataProvider | null = null;
  private isServerSide: boolean;
  
  constructor(
    storageProvider?: StorageProvider,
    metadataProvider?: MetadataProvider
  ) {
    this.isServerSide = isServer;
    
    // Solo inicializar proveedores en el servidor
    if (this.isServerSide) {
      // Usar proveedores proporcionados o los predeterminados
      this.storageProvider = storageProvider || new LocalStorageProvider();
      this.metadataProvider = metadataProvider || new LocalMetadataProvider();
    } else {
      console.warn('StorageService se está ejecutando en el cliente. Algunas operaciones no estarán disponibles.');
    }
  }
  
  // Método para guardar un archivo completo
  async saveFile(
    file: File | Buffer,
    entityType: string,
    entityId: string,
    clinicId: string,
    fileId: string,
    additionalMetadata: any = {}
  ) {
    // Verificar que estamos en el servidor
    if (!this.isServerSide || !this.storageProvider || !this.metadataProvider) {
      // En modo cliente, redirigir al API
      if (file instanceof File) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        formData.append('entityId', entityId);
        formData.append('clinicId', clinicId);
        formData.append('fileId', fileId);
        
        // Añadir metadatos adicionales
        Object.entries(additionalMetadata).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        // Llamar al API para subir el archivo
        try {
          const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Error al subir archivo: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error('Error al subir archivo mediante API:', error);
          throw error;
        }
      } else {
        throw new Error('No se puede subir un Buffer desde el cliente');
      }
    }
    
    try {
      // Determinar tipo de archivo
      const mimeType = file instanceof File ? file.type : additionalMetadata.mimeType || 'application/octet-stream';
      const fileType = this.getFileTypeFromMimeType(mimeType);
      const fileName = file instanceof File ? file.name : additionalMetadata.fileName || `${fileId}.bin`;
      const extension = fileName.split('.').pop() || '';
      
      // Construir ruta relativa
      const relativePath = `clinicas/${clinicId}/${entityType}/${entityId}/${fileType}/${fileId}.${extension}`;
      
      // Guardar archivo físico
      const fileInfo = await this.storageProvider.saveFile(file, relativePath, {
        mimeType,
        fileName,
        fileId
      });
      
      // Preparar metadatos completos
      const metadata = {
        id: fileId,
        fileName: `${fileId}.${extension}`,
        originalName: fileName,
        fileSize: file instanceof File ? file.size : (additionalMetadata.fileSize || 0),
        mimeType,
        fileType,
        path: relativePath,
        publicUrl: fileInfo.publicUrl,
        entityType,
        entityId,
        clinicId,
        storageProvider: 'local', // Podría cambiar a 's3', 'gcs', etc.
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...additionalMetadata
      };
      
      // Guardar metadatos
      await this.metadataProvider.saveMetadata(entityType, entityId, fileId, metadata);
      
      return metadata;
    } catch (error) {
      console.error('Error en StorageService.saveFile:', error);
      throw new Error(`Error al guardar archivo: ${error}`);
    }
  }
  
  // Método utilitario para determinar si estamos en el servidor
  isServer() {
    return this.isServerSide;
  }
  
  // Obtener metadatos de archivos por entidad
  async getFilesByEntity(entityType: string, entityId: string) {
    if (!this.isServerSide || !this.metadataProvider) {
      // En modo cliente, obtener desde API
      try {
        const response = await fetch(`/api/storage/metadata/entity?type=${entityType}&id=${entityId}`);
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error('Error al obtener archivos por entidad:', error);
        return [];
      }
    }
    
    return this.metadataProvider.getMetadataByEntity(entityType, entityId);
  }
  
  // Obtener metadatos de un archivo específico
  async getFileMetadata(fileId: string) {
    if (!this.isServerSide || !this.metadataProvider) {
      // En modo cliente, obtener desde API
      try {
        const response = await fetch(`/api/storage/metadata/file?id=${fileId}`);
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error('Error al obtener metadatos del archivo:', error);
        return null;
      }
    }
    
    return this.metadataProvider.getMetadata(fileId);
  }
  
  // Obtener contenido de un archivo
  async getFileContent(path: string): Promise<Buffer> {
    if (!this.isServerSide || !this.storageProvider) {
      throw new Error('getFileContent solo puede ejecutarse en el servidor');
    }
    
    return this.storageProvider.getFile(path);
  }
  
  // Eliminar un archivo (físico y metadatos)
  async deleteFile(fileId: string): Promise<boolean> {
    if (!this.isServerSide || !this.storageProvider || !this.metadataProvider) {
      // En modo cliente, eliminar mediante API
      try {
        const response = await fetch(`/api/storage/file?id=${fileId}`, {
          method: 'DELETE'
        });
        return response.ok;
      } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return false;
      }
    }
    
    try {
      // Primero obtener metadatos para saber la ruta
      const metadata = await this.metadataProvider.getMetadata(fileId);
      
      if (!metadata) {
        throw new Error(`Archivo con ID ${fileId} no encontrado`);
      }
      
      // Eliminar archivo físico
      await this.storageProvider.deleteFile(metadata.path);
      
      // Eliminar metadatos
      await this.metadataProvider.deleteMetadata(fileId);
      
      return true;
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw new Error(`Error al eliminar archivo: ${error}`);
    }
  }
  
  // Actualizar metadatos de un archivo
  async updateFileMetadata(fileId: string, metadata: any): Promise<any> {
    if (!this.isServerSide || !this.metadataProvider) {
      // En modo cliente, actualizar mediante API
      try {
        const response = await fetch(`/api/storage/metadata/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId, metadata }),
        });
        
        if (!response.ok) {
          throw new Error('Error al actualizar metadatos');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error al actualizar metadatos:', error);
        return null;
      }
    }
    
    return this.metadataProvider.updateMetadata(fileId, metadata);
  }
  
  // Determinar el tipo de archivo a partir del MIME type
  private getFileTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'images';
    } else if (
      mimeType.includes('pdf') || 
      mimeType.includes('word') || 
      mimeType.includes('excel') ||
      mimeType.includes('text/')
    ) {
      return 'documents';
    } else {
      return 'other';
    }
  }
}

// Instancia por defecto para uso global
export const storageService = new StorageService(); 