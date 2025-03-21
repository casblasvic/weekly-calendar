import fs from 'fs';
import path from 'path';
import { StorageProvider, StorageFileInfo } from '../interfaces';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private baseUrl: string;
  
  constructor(baseDir?: string, baseUrl?: string) {
    // Directorio base, con valor por defecto
    this.baseDir = baseDir || path.join(process.cwd(), 'storage');
    
    // URL base para acceso a archivos
    this.baseUrl = baseUrl || '/api/storage/file?path=';
    
    // Asegurar que el directorio base existe
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  
  async saveFile(file: Buffer | File, filePath: string, metadata?: any): Promise<StorageFileInfo> {
    try {
      // Construir ruta completa
      const fullPath = path.join(this.baseDir, filePath);
      
      // Asegurar que la estructura de directorios existe
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Si file es un objeto File (cliente), convertirlo a Buffer
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(fullPath, buffer);
      } else {
        // Si ya es un Buffer (servidor)
        fs.writeFileSync(fullPath, file);
      }
      
      // Devolver información sobre el archivo guardado
      return {
        path: filePath,
        publicUrl: `${this.baseUrl}${encodeURIComponent(filePath)}`,
        size: fs.statSync(fullPath).size,
        mimeType: metadata?.mimeType || 'application/octet-stream',
        metadata
      };
    } catch (error) {
      console.error('Error al guardar archivo local:', error);
      throw new Error(`Error al guardar archivo: ${error}`);
    }
  }
  
  async getFile(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }
      return fs.readFileSync(fullPath);
    } catch (error) {
      console.error('Error al leer archivo local:', error);
      throw new Error(`Error al obtener archivo: ${error}`);
    }
  }
  
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar archivo local:', error);
      throw new Error(`Error al eliminar archivo: ${error}`);
    }
  }
  
  async getFileUrl(filePath: string): Promise<string> {
    return `${this.baseUrl}${encodeURIComponent(filePath)}`;
  }
  
  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, dirPath);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Error al crear directorio local:', error);
      throw new Error(`Error al crear directorio: ${error}`);
    }
  }
  
  async listFiles(dirPath: string): Promise<StorageFileInfo[]> {
    try {
      const fullPath = path.join(this.baseDir, dirPath);
      if (!fs.existsSync(fullPath)) {
        return [];
      }
      
      const files = fs.readdirSync(fullPath);
      const fileInfos: StorageFileInfo[] = [];
      
      for (const file of files) {
        const fileStat = fs.statSync(path.join(fullPath, file));
        if (fileStat.isFile()) {
          const relativePath = path.join(dirPath, file);
          fileInfos.push({
            path: relativePath,
            publicUrl: `${this.baseUrl}${encodeURIComponent(relativePath)}`,
            size: fileStat.size
          });
        }
      }
      
      return fileInfos;
    } catch (error) {
      console.error('Error al listar archivos locales:', error);
      throw new Error(`Error al listar archivos: ${error}`);
    }
  }
} 