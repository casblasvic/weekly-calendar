import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFiles, BaseFile, ImageFile, FileFilter } from './file-context';
import { useStorage } from './storage-context';
import { generateId } from '@/lib/utils';
import { storageService } from '@/lib/storage/storage-service';
import { v4 as uuidv4 } from 'uuid';

interface ImageContextType {
  uploadImage: (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string, 
    options?: { isPrimary?: boolean; position?: number; }, 
    onProgress?: (progress: number) => void
  ) => Promise<ImageFile>;
  getImagesByEntity: (entityType: string, entityId: string) => ImageFile[];
  setPrimaryImage: (imageId: string) => Promise<boolean>;
  reorderImages: (entityType: string, entityId: string, orderedIds: string[]) => Promise<boolean>;
  getEntityPrimaryImage: (entityType: string, entityId: string) => ImageFile | undefined;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uploadFile, getFilesByFilter, updateFileMetadata, files } = useFiles();
  const { registerFileForClinic, updateStorageStats } = useStorage();
  const [images, setImages] = useState<ImageFile[]>([]);
  
  // Inicializar estructura de almacenamiento al cargar el componente
  useEffect(() => {
    const initStorage = async () => {
      try {
        // Llamar al API para inicializar la estructura de almacenamiento
        const response = await fetch('/api/storage/init-system');
        if (response.ok) {
          console.log('Estructura de almacenamiento inicializada correctamente');
        } else {
          console.error('Error al inicializar estructura de almacenamiento');
        }
      } catch (error) {
        console.error('Error al inicializar estructura de almacenamiento:', error);
      }
    };
    
    initStorage();
  }, []);
  
  // Función para subir una imagen
  const uploadImage = async (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string,
    options: { isPrimary?: boolean; position?: number; } = {}, 
    onProgress?: (progress: number) => void
  ) => {
    // Verificar que el archivo sea una imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen válida');
    }
    
    // Verificar que tenemos los IDs necesarios
    if (!entityType || !entityId || !clinicId) {
      console.error("Faltan parámetros requeridos:", { entityType, entityId, clinicId });
      throw new Error('Se requieren entityType, entityId y clinicId');
    }

    console.log("Subiendo imagen:", { entityType, entityId, clinicId, fileName: file.name });
    
    // Generar ID único para la imagen
    const imageId = uuidv4();
    
    try {
      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('clinicId', clinicId);
      formData.append('fileId', imageId);
      formData.append('isPrimary', options.isPrimary ? 'true' : 'false');
      formData.append('position', options.position?.toString() || '0');
      
      // Enviar al endpoint de carga
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al subir imagen: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Error desconocido al subir imagen");
      }
      
      // Crear objeto de imagen con los metadatos devueltos
      const newImage: ImageFile = {
        id: imageId,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        url: result.publicUrl,
        thumbnailUrl: result.publicUrl,
        path: result.path,
        categories: [entityType],
        tags: [clinicId],
        entityType: entityType as any,
        entityId,
        clinicId,
        storageProvider: result.storageProvider || 'local',
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        createdBy: 'system',
        isDeleted: false,
        isPublic: false,
        metadata: result.metadata || {
          uploadedAt: new Date().toISOString(),
          isPrimary: options.isPrimary || false,
        },
        isPrimary: options.isPrimary || false,
        position: options.position || 0
      };
      
      // Actualizar estado
      setImages(prev => [...prev, newImage]);
      
      return newImage;
    } catch (error) {
      console.error('Error al guardar imagen:', error);
      throw new Error('No se pudo guardar la imagen');
    }
  };
  
  // Obtener imágenes por entidad
  const getImagesByEntity = (entityType: string, entityId: string): ImageFile[] => {
    const filter: FileFilter = {
      entityType,
      entityId,
      mimeType: 'image/*',
      isDeleted: false
    };
    
    return getFilesByFilter(filter)
      .filter(file => file.mimeType.startsWith('image/'))
      .map(file => {
        // Asegurar que tiene propiedades de ImageFile
        return {
          ...file,
          isPrimary: file.metadata?.isPrimary || false,
          position: file.metadata?.position || 0
        } as ImageFile;
      })
      .sort((a, b) => a.position - b.position);
  };
  
  // Establecer una imagen como principal
  const setPrimaryImage = async (imageId: string): Promise<boolean> => {
    // Obtener la imagen
    const image = files.find(f => f.id === imageId && f.mimeType.startsWith('image/'));
    
    if (!image) {
      throw new Error(`Imagen con id ${imageId} no encontrada`);
    }
    
    // Quitar marca de principal a las demás imágenes de esta entidad
    for (const file of files) {
      if (
        file.entityType === image.entityType && 
        file.entityId === image.entityId && 
        file.mimeType.startsWith('image/') && 
        file.id !== imageId
      ) {
        await updateFileMetadata(file.id, {
          metadata: { ...file.metadata, isPrimary: false }
        });
      }
    }
    
    // Marcar esta imagen como principal
    await updateFileMetadata(imageId, {
      metadata: { ...image.metadata, isPrimary: true }
    });
    
    return true;
  };
  
  // Reordenar imágenes
  const reorderImages = async (entityType: string, entityId: string, orderedIds: string[]): Promise<boolean> => {
    // Obtener todas las imágenes de esta entidad
    const entityImages = getImagesByEntity(entityType, entityId);
    
    // Verificar que todos los IDs existen
    if (orderedIds.length !== entityImages.length) {
      throw new Error("La lista de IDs no coincide con las imágenes existentes");
    }
    
    // Actualizar posición de cada imagen
    for (let i = 0; i < orderedIds.length; i++) {
      const imageId = orderedIds[i];
      await updateFileMetadata(imageId, {
        metadata: { position: i }
      });
    }
    
    return true;
  };
  
  // Obtener la imagen principal de una entidad
  const getEntityPrimaryImage = (entityType: string, entityId: string): ImageFile | undefined => {
    const images = getImagesByEntity(entityType, entityId);
    
    // Buscar la imagen marcada como principal
    const primaryImage = images.find(img => img.isPrimary);
    
    // Si no hay ninguna marcada como principal, devolver la primera
    return primaryImage || (images.length > 0 ? images[0] : undefined);
  };
  
  return (
    <ImageContext.Provider value={{
      uploadImage,
      getImagesByEntity,
      setPrimaryImage,
      reorderImages,
      getEntityPrimaryImage
    }}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImages = () => {
  const context = useContext(ImageContext);
  if (context === undefined) {
    throw new Error('useImages must be used within an ImageProvider');
  }
  return context;
}; 