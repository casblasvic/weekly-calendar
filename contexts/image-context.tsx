"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useInterfaz } from './interfaz-Context';
import { EntityImage, EntityType } from '@prisma/client';
import { generateId } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

// Alias para tipos específicos usando tipos del modelo central
export type ImageFile = EntityImage;

// Extendemos el tipo ImageFile para incluir las propiedades que necesitamos
export interface ExtendedImageFile extends ImageFile {
  entityType: EntityType;
  entityId: string;
}

interface ImageContextType {
  uploadImage: (
    file: File, 
    entityType: EntityType, 
    entityId: string, 
    clinicId: string, 
    options?: { isProfilePic?: boolean; position?: number; },
    onProgress?: (progress: number) => void
  ) => Promise<ImageFile>;
  getImagesByEntity: (entityType: EntityType, entityId: string) => Promise<ImageFile[]>;
  setProfilePic: (imageId: string, entityType: EntityType, entityId: string) => Promise<boolean>;
  reorderImages: (entityType: EntityType, entityId: string, orderedIds: string[]) => Promise<boolean>;
  getEntityProfilePic: (entityType: EntityType, entityId: string) => Promise<ImageFile | undefined>;
  // Métodos alias para compatibilidad
  getEntityImages: (entityType: EntityType, entityId: string) => Promise<ImageFile[]>;
  saveEntityImages: (entityType: EntityType, entityId: string, images: ImageFile[]) => Promise<boolean>;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();
  
  // Función para subir una imagen
  const uploadImage = async (
    file: File, 
    entityType: EntityType, 
    entityId: string, 
    clinicId: string,
    options: { isProfilePic?: boolean; position?: number; } = {}, 
    onProgress?: (progress: number) => void
  ): Promise<ImageFile> => {
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
      formData.append('isProfilePic', options.isProfilePic ? 'true' : 'false');
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
        imageUrl: result.publicUrl, 
        isProfilePic: options.isProfilePic || false, 
        entityId: entityId,
        entityType: entityType, 
        altText: '',
        caption: '',
        order: options.position !== undefined ? options.position : 0,
        uploadedByUserId: '',
        systemId: '',
        createdAt: new Date(), 
        updatedAt: new Date()
      };
      
      // Usar la interfaz para guardar los metadatos de la imagen
      await interfaz.saveEntityImages(entityType, entityId, [newImage]);
      
      return newImage;
    } catch (error) {
      console.error('Error al guardar imagen:', error);
      throw new Error('No se pudo guardar la imagen');
    }
  };
  
  // Obtener imágenes por entidad a través de la interfaz
  const getImagesByEntity = async (entityType: EntityType, entityId: string): Promise<ImageFile[]> => {
    try {
      const images = await interfaz.getEntityImages(entityType, entityId);
      return images || [];
    } catch (error) {
      console.error('Error al obtener imágenes:', error);
      return [];
    }
  };
  
  // Guardar imágenes de una entidad (alias para compatibilidad)
  const saveEntityImages = async (entityType: EntityType, entityId: string, images: ImageFile[]): Promise<boolean> => {
    try {
      return await interfaz.saveEntityImages(entityType, entityId, images);
    } catch (error) {
      console.error('Error al guardar imágenes:', error);
      return false;
    }
  };
  
  // Establecer una imagen como de perfil usando la interfaz
  const setProfilePic = async (imageId: string, entityType: EntityType, entityId: string): Promise<boolean> => {
    try {
      // Ya no necesitamos buscar la imagen primero, tenemos entityType y entityId
      
      // Obtenemos todas las imágenes de esta entidad usando los parámetros
      const entityImages = await getImagesByEntity(entityType, entityId);
      
      // Verificar si la imagen a marcar como perfil existe en la lista
      const imageExists = entityImages.some(img => img.id === imageId);
      if (!imageExists) {
          throw new Error(`Imagen con id ${imageId} no encontrada para la entidad ${entityType}:${entityId}`);
      }

      // Marcar la imagen seleccionada como de perfil y las demás como no
      const updatedImages = entityImages.map(img => ({
        ...img,
        isProfilePic: img.id === imageId 
      }));
      
      // Guardar los cambios a través de la interfaz usando los parámetros
      return await interfaz.saveEntityImages(entityType, entityId, updatedImages);
    } catch (error) {
      console.error('Error al establecer imagen de perfil:', error); 
      return false;
    }
  };
  
  // Reordenar imágenes usando la interfaz
  const reorderImages = async (entityType: EntityType, entityId: string, orderedIds: string[]): Promise<boolean> => {
    try {
      // Obtener todas las imágenes de esta entidad
      const entityImages = await getImagesByEntity(entityType, entityId);
      
      // Verificar que todos los IDs existen
      if (orderedIds.length !== entityImages.length) {
        throw new Error("La lista de IDs no coincide con las imágenes existentes");
      }
      
      // Reordenar las imágenes según los IDs proporcionados
      const reorderedImages = orderedIds.map((id, index) => {
        const image = entityImages.find(img => img.id === id);
        if (!image) {
          throw new Error(`Imagen con id ${id} no encontrada`);
        }
        return {
          ...image,
          position: index
        };
      });
      
      // Guardar las imágenes reordenadas a través de la interfaz
      return await interfaz.saveEntityImages(entityType, entityId, reorderedImages);
    } catch (error) {
      console.error('Error al reordenar imágenes:', error);
      return false;
    }
  };
  
  // Obtener la imagen de perfil de una entidad
  const getEntityProfilePic = async (entityType: EntityType, entityId: string): Promise<ImageFile | undefined> => {
    try {
      const images = await getImagesByEntity(entityType, entityId);
      return images.find(img => img.isProfilePic);
    } catch (error) {
      console.error('Error al obtener imagen principal:', error);
      return undefined;
    }
  };
  
  return (
    <ImageContext.Provider value={{
      uploadImage,
      getImagesByEntity,
      setProfilePic,
      reorderImages,
      getEntityProfilePic,
      // Alias para compatibilidad
      getEntityImages: getImagesByEntity,
      saveEntityImages
    }}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImages = () => {
  const context = useContext(ImageContext);
  if (context === undefined) {
    throw new Error('useImages debe ser usado dentro de un ImageProvider');
  }
  return context;
};