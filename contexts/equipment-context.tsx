"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import {
  getEquipment,
  addEquipment as addEquipmentMock,
  updateEquipment as updateEquipmentMock,
  deleteEquipment as deleteEquipmentMock,
  DATA_CHANGE_EVENT,
  MockData
} from "@/mockData"
import { useStorage } from './storage-context';
import { useImages } from './image-context';
import { generateId } from "@/lib/utils";

export interface Equipment {
  id: number
  code: string
  name: string
  description: string
  serialNumber: string
  clinicId: number
  images?: DeviceImage[]
}

export interface DeviceImage {
  id: string
  url: string
  isPrimary: boolean
  file?: File
  path?: string
}

export interface EquipmentContextType {
  allEquipment: Equipment[]
  getClinicEquipment: (clinicId: number) => Equipment[]
  getEquipmentById: (id: number) => Equipment | undefined
  addEquipment: (equipment: Partial<Equipment>, images?: DeviceImage[]) => Promise<Equipment>
  updateEquipment: (id: number, data: Partial<Equipment>, images?: DeviceImage[]) => Promise<boolean>
  deleteEquipment: (id: number) => boolean
  refreshEquipment: () => void
  clinics: Array<{id: number, name: string, nombre?: string}>
  saveEquipment: (data: Equipment, imageFiles?: File[]) => Promise<boolean>
  getEquipmentImages: (equipmentId: number) => DeviceImage[]
  getEquipmentPrimaryImage: (equipmentId: number) => DeviceImage | undefined
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(undefined)

export const EquipmentProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const { registerFileForClinic, updateStorageStats } = useStorage();
  const { uploadImage } = useImages();

  const refreshEquipment = () => {
    // Obtener datos de todas las clínicas
    const clinicsData = MockData.clinicas || []
    setClinics(clinicsData)
    
    // Obtener todo el equipamiento de MockData
    const equipmentFromMock = [...(MockData.equipment || [])];
    
    // Procesar equipamientos y añadir imágenes desde el almacenamiento de MockData
    const equipmentWithImages = equipmentFromMock.map(equipment => {
      try {
        // Obtener imágenes desde MockData en lugar de localStorage
        const images = MockData.equipmentImages?.[equipment.id.toString()] || [];
        
        if (images.length > 0) {
          console.log(`Encontradas ${images.length} imágenes para equipo ${equipment.id} en MockData`);
          
          // Procesar imágenes para asegurar que las URLs son correctas
          const processedImages = images.map(img => {
            // Si la URL es un blob, intentar usar la ruta persistente
            if (img.url && img.url.startsWith('blob:') && img.path) {
              return {
                ...img,
                url: `/api/storage/file?path=${img.path}`
              };
            }
            return img;
          });
          
          // Devolver equipamiento con sus imágenes
          return {
            ...equipment,
            images: processedImages
          };
        }
      } catch (error) {
        console.error(`Error al cargar imágenes para equipamiento ${equipment.id}:`, error);
      }
      
      // Si no hay imágenes o hay error, devolver el equipamiento sin cambios
      return equipment;
    });
    
    // Actualizar el estado local
    setAllEquipment(equipmentWithImages);
  }

  useEffect(() => {
    refreshEquipment()

    // Escuchar cambios en los datos
    const handleDataChange = (e: CustomEvent) => {
      if (e.detail.dataType === "equipment" || e.detail.dataType === "all") {
        refreshEquipment()
      }
    }

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    }
  }, [])

  const getClinicEquipment = (clinicId: number) => {
    return allEquipment.filter(item => item.clinicId === clinicId)
  }

  const getEquipmentById = (id: number) => {
    return allEquipment.find(item => item.id === id)
  }

  const addEquipmentItem = async (equipmentData: Partial<Equipment>, images?: DeviceImage[]) => {
    // Primero añadimos el equipo a la mock data
    const newId = addEquipmentMock(equipmentData as any)
    const clinicId = equipmentData.clinicId as number;
    
    console.log("Añadiendo equipamiento:", { 
      id: newId, 
      clinicId: clinicId, 
      nombre: equipmentData.name, 
      imagesCount: images?.length || 0 
    });
    
    const finalImages: DeviceImage[] = [];
    
    // Procesar las imágenes si las hay
    if (images && images.length > 0) {
      console.log(`Procesando ${images.length} imágenes para equipamiento ID ${newId} de clínica ${clinicId}`);
      
      for (const image of images) {
        if (image.file) {
          try {
            console.log("Procesando imagen:", { 
              imageId: image.id, 
              fileName: image.file.name,
              fileSize: image.file.size,
              mimeType: image.file.type,
              isPrimary: image.isPrimary,
              entityType: 'equipment',
              entityId: String(newId),
              clinicId: String(clinicId)
            });
            
            // Subir la imagen usando el contexto de imágenes
            const uploadedImage = await uploadImage(
              image.file,
              'equipment', 
              String(newId),
              String(clinicId),
              { isPrimary: image.isPrimary }
            );
            
            // Añadir la imagen procesada a la lista final
            finalImages.push({
              id: uploadedImage.id,
              url: uploadedImage.url,
              isPrimary: image.isPrimary || false,
              path: uploadedImage.path
            });
            
            console.log(`Imagen subida correctamente: ${uploadedImage.id}, URL: ${uploadedImage.url}`);
            
            // También registrar en el sistema de almacenamiento
            registerFileForClinic(String(clinicId), {
              id: uploadedImage.id,
              fileName: uploadedImage.fileName || image.file.name,
              fileSize: image.file.size,
              mimeType: image.file.type,
              url: uploadedImage.url,
              thumbnailUrl: uploadedImage.url,
              path: uploadedImage.path,
              categories: [],
              tags: [],
              entityType: 'equipment',
              entityId: String(newId),
              clinicId: String(clinicId),
              storageProvider: 'local',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
              isDeleted: false,
              isPublic: false,
              metadata: { isPrimary: image.isPrimary }
            });
          } catch (error) {
            console.error("Error al procesar imagen:", error);
          }
        } else if (image.url) {
          // Si ya tenemos una URL (edición), mantener la imagen
          finalImages.push(image);
        }
      }
      
      console.log(`${finalImages.length} imágenes procesadas correctamente`);
    }
    
    // Actualizar el equipamiento con las imágenes procesadas
    const completeEquipment = { 
      ...equipmentData, 
      id: newId,
      images: finalImages 
    };
    
    // Actualizar en MockData para persistencia
    if (MockData.equipment) {
      MockData.equipment = MockData.equipment.map(e => 
        e.id === newId ? completeEquipment as Equipment : e
      );
    }
    
    // CRUCIAL: Guardar en localStorage para persistencia
    console.log(`Guardando equipamiento ${newId} en localStorage con ${finalImages.length} imágenes`);
    localStorage.setItem(`equipment_${newId}`, JSON.stringify(completeEquipment));
    
    // Actualizar la vista
    refreshEquipment()
    
    // Devolver el nuevo equipo
    return completeEquipment as Equipment
  }

  const updateEquipmentItem = async (id: number, data: Partial<Equipment>, images?: DeviceImage[]) => {
    console.log(`Actualizando equipamiento ${id} con ${images?.length || 0} imágenes`);
    
    // Verificar si las imágenes están en el objeto data o en el parámetro images
    // A veces pueden venir en el objeto data.images en lugar de como parámetro separado
    const imagesToProcess = images || data.images || [];
    console.log(`Total imagesToProcess: ${imagesToProcess.length}`);
    
    // Obtener equipamiento actual para mantener las imágenes existentes si no se proporcionan nuevas
    const currentEquipment = getEquipmentById(id);
    const existingImages = currentEquipment?.images || [];
    
    // Obtener también las imágenes almacenadas en MockData
    const storedImages = MockData.equipmentImages?.[id.toString()] || [];
    
    // Imprimir información detallada para depuración
    console.log("Detalle de imágenes recibidas:", 
      imagesToProcess?.map(img => ({
        id: img.id,
        hasFile: !!img.file,
        url: img.url,
        isPrimary: img.isPrimary
      }))
    );
    
    console.log("Imágenes existentes en contexto:", 
      existingImages.map(img => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary
      }))
    );
    
    console.log("Imágenes almacenadas en MockData:", 
      storedImages.map(img => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary
      }))
    );
    
    // Determinar qué imágenes mantener (las que no tienen file son existentes)
    const existingImagesToKeep = imagesToProcess?.filter(img => !img.file) || [];
    
    // Preparar las nuevas imágenes a subir
    const newImagesToUpload = imagesToProcess?.filter(img => img.file) || [];
    
    // Si no se proporcionan imágenes nuevas, mantenemos todas las existentes
    const finalImages = imagesToProcess?.length ? [...existingImagesToKeep] : 
                        storedImages.length ? [...storedImages] : 
                        [...existingImages];
    
    console.log(`Manteniendo ${existingImagesToKeep.length} imágenes existentes y subiendo ${newImagesToUpload.length} nuevas`);
    
    // Actualizar datos básicos en mock data
    // Eliminar las imágenes del objeto para que no haya duplicación
    const equipmentToUpdate = { 
      ...data, 
      id,
      images: undefined // No incluimos las imágenes en el objeto principal
    };
    
    const success = updateEquipmentMock(equipmentToUpdate as any);
    
    if (success) {
      // Procesar las nuevas imágenes si hay
      if (newImagesToUpload.length > 0) {
        const clinicId = data.clinicId as number;
        
        console.log(`Procesando ${newImagesToUpload.length} nuevas imágenes para equipamiento ${id}`);
        
        // Subir las nuevas imágenes
        for (const image of newImagesToUpload) {
          if (image.file) {
            try {
              console.log(`Subiendo imagen para equipamiento ${id}: ${image.file.name}`);
              
              // Subir la imagen usando el contexto de imágenes
              const uploadedImage = await uploadImage(
                image.file,
                'equipment', 
                String(id),
                String(clinicId),
                { isPrimary: image.isPrimary }
              );
              
              // Añadir la imagen procesada a la lista final
              finalImages.push({
                id: uploadedImage.id,
                url: uploadedImage.url,
                isPrimary: image.isPrimary || false,
                path: uploadedImage.path
              });
              
              console.log(`Imagen subida correctamente: ${uploadedImage.id}, URL: ${uploadedImage.url}`);
              
              // Registrar la imagen en el sistema de archivos
              registerFileForClinic(String(clinicId), {
                id: uploadedImage.id,
                fileName: uploadedImage.fileName || image.file.name,
                fileSize: image.file.size,
                mimeType: image.file.type,
                url: uploadedImage.url,
                thumbnailUrl: uploadedImage.url,
                path: uploadedImage.path,
                categories: [],
                tags: [],
                entityType: 'equipment',
                entityId: String(id),
                clinicId: String(clinicId),
                storageProvider: 'local',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'system',
                isDeleted: false,
                isPublic: false,
                metadata: { isPrimary: image.isPrimary }
              });
              
              // Actualizar estadísticas de almacenamiento
              updateStorageStats(String(clinicId));
            } catch (error) {
              console.error("Error al procesar imagen:", error);
            }
          }
        }
      }
      
      // Guardar las imágenes en MockData directamente
      if (finalImages.length > 0) {
        // Importar la función desde mockData
        const { saveEquipmentImages } = require('@/mockData');
        saveEquipmentImages(id, finalImages);
        
        console.log(`Guardadas ${finalImages.length} imágenes para equipamiento ${id} en MockData`);
      }
      
      // Actualizar vista
      refreshEquipment();
    }
    
    return success;
  }

  const deleteEquipmentItem = (id: number) => {
    const success = deleteEquipmentMock(id)
    if (success) refreshEquipment()
    return success
  }

  // Función para guardar o actualizar un equipamiento con imágenes
  const saveEquipment = async (data: Equipment, imageFiles?: File[]) => {
    try {
      // Guardar datos básicos del equipo (esto depende de tu implementación)
      const equipmentId = data.id || Date.now(); // Generar ID si es nuevo
      const savedEquipment = {...data, id: equipmentId};
      
      // Actualizar la lista de equipos
      setAllEquipment(prev => {
        const index = prev.findIndex(e => e.id === equipmentId);
        if (index >= 0) {
          // Actualizar equipo existente
          const updated = [...prev];
          updated[index] = savedEquipment;
          return updated;
        } else {
          // Añadir nuevo equipo
          return [...prev, savedEquipment];
        }
      });
      
      // Procesar imágenes si se proporcionan
      if (imageFiles && imageFiles.length > 0) {
        const clinicId = String(data.clinicId);
        const equipmentImages: DeviceImage[] = [];
        
        // Subir cada imagen
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          
          // Subir usando el servicio de imágenes
          const uploadedImage = await uploadImage(
            file,
            'equipment',
            String(equipmentId),
            clinicId,
            { 
              isPrimary: i === 0, // Primera imagen como principal
              position: i
            }
          );
          
          // Guardar referencia a la imagen
          equipmentImages.push({
            id: uploadedImage.id,
            url: uploadedImage.url,
            path: uploadedImage.path,
            isPrimary: i === 0,
            createdAt: new Date().toISOString()
          });
        }
        
        // Actualizar el equipo con sus imágenes
        setAllEquipment(prev => {
          return prev.map(e => {
            if (e.id === equipmentId) {
              return {
                ...e,
                images: [...(e.images || []), ...equipmentImages]
              };
            }
            return e;
          });
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error al guardar equipo con imágenes:", error);
      return false;
    }
  };
  
  // Función para obtener todas las imágenes de un equipo
  const getEquipmentImages = (equipmentId: number): DeviceImage[] => {
    const item = allEquipment.find(e => e.id === equipmentId);
    return item?.images || [];
  };
  
  // Función para obtener la imagen principal de un equipo
  const getEquipmentPrimaryImage = (equipmentId: number): DeviceImage | undefined => {
    const images = getEquipmentImages(equipmentId);
    return images.find(img => img.isPrimary);
  };

  return (
    <EquipmentContext.Provider
      value={{
        allEquipment,
        getClinicEquipment,
        getEquipmentById,
        addEquipment: addEquipmentItem,
        updateEquipment: updateEquipmentItem,
        deleteEquipment: deleteEquipmentItem,
        refreshEquipment,
        clinics,
        saveEquipment,
        getEquipmentImages,
        getEquipmentPrimaryImage
      }}
    >
      {children}
    </EquipmentContext.Provider>
  )
}

export const useEquipment = () => {
  const context = useContext(EquipmentContext)
  if (context === undefined) {
    throw new Error("useEquipment debe usarse dentro de un EquipmentProvider")
  }
  return context
} 