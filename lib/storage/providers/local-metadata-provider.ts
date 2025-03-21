// Este módulo solo debe ejecutarse en el servidor
// Utilizamos una verificación para garantizar que no se importe en el cliente

// Verificamos que estamos en el servidor antes de importar módulos de Node.js
const isServer = typeof window === 'undefined';

// Importaciones condicionales para evitar errores en el cliente
let fs: any;
let path: any;

if (isServer) {
  // Solo importamos estos módulos en el servidor
  fs = require('fs');
  path = require('path');
}

import { MetadataProvider } from '../interfaces';

export class LocalMetadataProvider implements MetadataProvider {
  private metadataFile: string;
  private metadata: Record<string, any> = {};
  
  constructor(metadataFile?: string) {
    // Verificar que estamos en el servidor
    if (!isServer) {
      console.warn('LocalMetadataProvider solo debe instanciarse en el servidor');
      this.metadataFile = '';
      return;
    }
    
    // Usamos una ruta fija para el archivo de metadatos
    this.metadataFile = metadataFile || path.join(process.cwd(), 'storage', 'metadata.json');
    
    // Cargar metadatos existentes o crear nuevo archivo si no existe
    this.loadMetadata();
    
    console.log("LocalMetadataProvider inicializado con archivo:", this.metadataFile);
  }
  
  private loadMetadata() {
    // Si no estamos en el servidor, salir
    if (!isServer) return;
    
    try {
      // Asegurar que el directorio existe
      const metadataDir = path.dirname(this.metadataFile);
      if (!fs.existsSync(metadataDir)) {
        console.log("Creando directorio para metadatos:", metadataDir);
        fs.mkdirSync(metadataDir, { recursive: true });
      }
      
      if (fs.existsSync(this.metadataFile)) {
        console.log("Cargando metadatos existentes");
        const data = fs.readFileSync(this.metadataFile, 'utf8');
        try {
          this.metadata = JSON.parse(data);
          console.log("Metadatos cargados correctamente");
        } catch (parseError) {
          console.error("Error al parsear el archivo de metadatos, creando nuevo:", parseError);
          this.metadata = {};
          this.saveMetadataToFile();
        }
      } else {
        console.log("Archivo de metadatos no encontrado, creando nuevo");
        this.metadata = {};
        this.saveMetadataToFile();
      }
    } catch (error) {
      console.error('Error al cargar metadatos:', error);
      this.metadata = {};
      
      // Intentar crear el archivo de todas formas
      try {
        this.saveMetadataToFile();
      } catch (saveError) {
        console.error("Error crítico al guardar metadatos:", saveError);
      }
    }
  }
  
  private saveMetadataToFile() {
    // Si no estamos en el servidor, salir
    if (!isServer) return;
    
    try {
      // Asegurar que el directorio existe
      const metadataDir = path.dirname(this.metadataFile);
      if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir, { recursive: true });
      }
      
      // Guardar metadatos con formato legible
      fs.writeFileSync(this.metadataFile, JSON.stringify(this.metadata, null, 2), 'utf8');
      console.log("Metadatos guardados correctamente en:", this.metadataFile);
    } catch (error) {
      console.error('Error crítico al guardar metadatos:', error);
      throw new Error(`No se pudo guardar el archivo de metadatos: ${error}`);
    }
  }
  
  async saveMetadata(entityType: string, entityId: string, fileId: string, metadata: any): Promise<any> {
    // Si no estamos en el servidor, devolver un error
    if (!isServer) {
      console.error('saveMetadata solo puede ejecutarse en el servidor');
      return null;
    }
    
    console.log(`Guardando metadatos para: ${entityType}/${entityId}/${fileId}`);
    
    // Estructura jerárquica para organizar los metadatos
    if (!this.metadata[entityType]) {
      this.metadata[entityType] = {};
    }
    
    if (!this.metadata[entityType][entityId]) {
      this.metadata[entityType][entityId] = {};
    }
    
    // Guardar metadatos con timestamp
    this.metadata[entityType][entityId][fileId] = {
      ...metadata,
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Guardar en archivo
    this.saveMetadataToFile();
    
    return this.metadata[entityType][entityId][fileId];
  }
  
  async getMetadata(fileId: string): Promise<any> {
    // Si no estamos en el servidor, devolver null
    if (!isServer) {
      console.error('getMetadata solo puede ejecutarse en el servidor');
      return null;
    }
    
    // Buscar el archivo en todas las entidades
    for (const entityType in this.metadata) {
      for (const entityId in this.metadata[entityType]) {
        if (this.metadata[entityType][entityId][fileId]) {
          return this.metadata[entityType][entityId][fileId];
        }
      }
    }
    
    return null;
  }
  
  async getMetadataByEntity(entityType: string, entityId: string): Promise<any[]> {
    // Si no estamos en el servidor, devolver array vacío
    if (!isServer) {
      console.error('getMetadataByEntity solo puede ejecutarse en el servidor');
      return [];
    }
    
    if (!this.metadata[entityType] || !this.metadata[entityType][entityId]) {
      return [];
    }
    
    // Convertir objeto de metadatos a array
    const fileIds = Object.keys(this.metadata[entityType][entityId]);
    return fileIds.map(fileId => ({
      id: fileId,
      ...this.metadata[entityType][entityId][fileId]
    }));
  }
  
  async updateMetadata(fileId: string, metadata: any): Promise<any> {
    // Si no estamos en el servidor, devolver null
    if (!isServer) {
      console.error('updateMetadata solo puede ejecutarse en el servidor');
      return null;
    }
    
    let updated = null;
    
    // Buscar y actualizar el archivo
    for (const entityType in this.metadata) {
      for (const entityId in this.metadata[entityType]) {
        if (this.metadata[entityType][entityId][fileId]) {
          this.metadata[entityType][entityId][fileId] = {
            ...this.metadata[entityType][entityId][fileId],
            ...metadata,
            updatedAt: new Date().toISOString()
          };
          
          updated = this.metadata[entityType][entityId][fileId];
          break;
        }
      }
      
      if (updated) break;
    }
    
    // Guardar cambios
    if (updated) {
      this.saveMetadataToFile();
    }
    
    return updated;
  }
  
  async deleteMetadata(fileId: string): Promise<boolean> {
    // Si no estamos en el servidor, devolver false
    if (!isServer) {
      console.error('deleteMetadata solo puede ejecutarse en el servidor');
      return false;
    }
    
    let deleted = false;
    
    // Buscar y eliminar el archivo
    for (const entityType in this.metadata) {
      for (const entityId in this.metadata[entityType]) {
        if (this.metadata[entityType][entityId][fileId]) {
          delete this.metadata[entityType][entityId][fileId];
          deleted = true;
          break;
        }
      }
      
      if (deleted) break;
    }
    
    // Guardar cambios
    if (deleted) {
      this.saveMetadataToFile();
    }
    
    return deleted;
  }
} 