/**
 * Interfaces para la capa de abstracción de almacenamiento
 * Esto permitirá cambiar fácilmente entre diferentes proveedores
 */

// Proveedor de almacenamiento
export interface StorageProvider {
  // Métodos básicos
  saveFile(file: Buffer | File, path: string, metadata?: any): Promise<StorageFileInfo>;
  getFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<boolean>;
  getFileUrl(path: string): Promise<string>;
  
  // Métodos opcionales
  listFiles?(directory: string): Promise<StorageFileInfo[]>;
  createDirectory?(path: string): Promise<boolean>;
}

// Información de un archivo almacenado
export interface StorageFileInfo {
  path: string;
  publicUrl: string;
  size?: number;
  mimeType?: string;
  metadata?: any;
}

// Proveedor de metadatos (para información sobre archivos)
export interface MetadataProvider {
  saveMetadata(entityType: string, entityId: string, fileId: string, metadata: any): Promise<any>;
  getMetadata(fileId: string): Promise<any>;
  getMetadataByEntity(entityType: string, entityId: string): Promise<any[]>;
  updateMetadata(fileId: string, metadata: any): Promise<any>;
  deleteMetadata(fileId: string): Promise<boolean>;
} 