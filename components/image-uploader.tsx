'use client';

import { useState, useEffect } from 'react';
import { useImages } from '@/contexts/image-context';
import { 
  getEntityImages, 
  saveEntityImages,
  getServiceImages,
  saveServiceImages,
  getTarifaImages,
  saveTarifaImages,
  getClientImages,
  saveClientImages 
} from '@/mockData';
import { Upload, X, Star } from 'lucide-react';
import Image from 'next/image';
import { DeviceImage } from '@/contexts/equipment-context';

interface ImageUploaderProps {
  entityType: 'equipment' | 'service' | 'tarifa' | 'client';
  entityId: string | number;
  clinicId: string | number;
  onChange?: (images: DeviceImage[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUploader({
  entityType,
  entityId,
  clinicId,
  onChange,
  maxImages = 10,
  className = ''
}: ImageUploaderProps) {
  const { uploadImage } = useImages();
  const [images, setImages] = useState<DeviceImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Cargar imágenes existentes al montar el componente
  useEffect(() => {
    const loadImages = () => {
      try {
        console.log(`Intentando cargar imágenes para ${entityType} ${entityId} (clínica: ${clinicId})`);
        let entityImages: DeviceImage[] = [];
        
        // Obtener imágenes según el tipo de entidad
        switch (entityType) {
          case 'equipment':
            entityImages = getEntityImages('equipment', entityId);
            break;
          case 'service':
            entityImages = getServiceImages(entityId.toString());
            console.log(`Imágenes para servicio ${entityId}: `, entityImages);
            break;
          case 'tarifa':
            entityImages = getTarifaImages(entityId.toString());
            break;
          case 'client':
            entityImages = getClientImages(entityId.toString());
            break;
        }
        
        if (entityImages && entityImages.length > 0) {
          // Procesar las imágenes para asegurar que tienen URLs válidas
          const processedImages = entityImages.map(img => ({
            ...img,
            url: img.url.startsWith('blob:') && img.path
              ? `/api/storage/file?path=${img.path}`
              : img.url
          }));
          
          setImages(processedImages);
          console.log(`Cargadas ${processedImages.length} imágenes para ${entityType} ${entityId}:`, processedImages);
          
          // Notificar al componente padre
          if (onChange) {
            onChange(processedImages);
          }
        } else {
          console.log(`No se encontraron imágenes para ${entityType} ${entityId}`);
        }
      } catch (error) {
        console.error(`Error al cargar imágenes para ${entityType} ${entityId}:`, error);
      }
    };
    
    if (entityId) {
      loadImages();
    }
  }, [entityType, entityId, clinicId, onChange]);

  // Manejar la carga de nuevas imágenes
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsLoading(true);
    
    try {
      const files = Array.from(e.target.files);
      const newImages: DeviceImage[] = [];
      
      // Verificar si no excedemos el límite de imágenes
      const totalImages = images.length + files.length;
      if (totalImages > maxImages) {
        alert(`Solo puedes subir un máximo de ${maxImages} imágenes. Ya tienes ${images.length}.`);
        setIsLoading(false);
        return;
      }
      
      console.log(`Subiendo ${files.length} imágenes para ${entityType} ${entityId}`);
      
      for (const file of files) {
        // Crear objeto File para garantizar que se pasa correctamente
        const fileObject = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });
        
        try {
          // Subir la imagen usando el contexto de imágenes
          const uploadedImage = await uploadImage(
            fileObject,
            entityType,
            String(entityId),
            String(clinicId),
            { isPrimary: images.length === 0 && newImages.length === 0 }
          );
          
          // Añadir a la lista de nuevas imágenes
          newImages.push({
            id: uploadedImage.id,
            url: uploadedImage.url,
            isPrimary: images.length === 0 && newImages.length === 0,
            path: uploadedImage.path
          });
          
          console.log(`Imagen subida: ${uploadedImage.id}, URL: ${uploadedImage.url}`);
        } catch (error) {
          console.error('Error al subir imagen:', error);
        }
      }
      
      // Actualizar el estado con las nuevas imágenes
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      
      // Guardar las imágenes en MockData según el tipo de entidad
      switch (entityType) {
        case 'equipment':
          saveEntityImages('equipment', entityId, updatedImages);
          break;
        case 'service':
          console.log(`Guardando imágenes de servicio ${entityId}:`, updatedImages);
          const saveResult = saveServiceImages(entityId.toString(), updatedImages);
          console.log(`Resultado de guardar imágenes para servicio ${entityId}:`, saveResult);
          // Verificar que se guardaron correctamente
          console.log(`Verificando imágenes guardadas para servicio ${entityId}:`, getServiceImages(entityId.toString()));
          break;
        case 'tarifa':
          saveTarifaImages(entityId.toString(), updatedImages);
          break;
        case 'client':
          saveClientImages(entityId.toString(), updatedImages);
          break;
      }
      
      // Notificar al componente padre
      if (onChange) {
        onChange(updatedImages);
      }
    } catch (error) {
      console.error('Error al procesar imágenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Establecer imagen como principal
  const setAsPrimary = (id: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === id
    }));
    
    setImages(updatedImages);
    
    // Guardar cambios en MockData
    switch (entityType) {
      case 'equipment':
        saveEntityImages('equipment', entityId, updatedImages);
        break;
      case 'service':
        saveServiceImages(entityId.toString(), updatedImages);
        break;
      case 'tarifa':
        saveTarifaImages(entityId.toString(), updatedImages);
        break;
      case 'client':
        saveClientImages(entityId.toString(), updatedImages);
        break;
    }
    
    // Notificar al componente padre
    if (onChange) {
      onChange(updatedImages);
    }
  };

  // Eliminar imagen
  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    
    // Si eliminamos la imagen actual, ajustar el índice
    if (currentIndex >= updatedImages.length) {
      setCurrentIndex(Math.max(0, updatedImages.length - 1));
    }
    
    // Guardar cambios en MockData
    switch (entityType) {
      case 'equipment':
        saveEntityImages('equipment', entityId, updatedImages);
        break;
      case 'service':
        saveServiceImages(entityId.toString(), updatedImages);
        break;
      case 'tarifa':
        saveTarifaImages(entityId.toString(), updatedImages);
        break;
      case 'client':
        saveClientImages(entityId.toString(), updatedImages);
        break;
    }
    
    // Notificar al componente padre
    if (onChange) {
      onChange(updatedImages);
    }
  };

  // Navegación del carrusel
  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Visor de imagen principal */}
      <div className="flex items-center justify-center h-64 overflow-hidden border rounded-md">
        {images.length > 0 ? (
          <div className="relative w-full h-full">
            <Image 
              src={images[currentIndex].url} 
              alt={`Imagen ${currentIndex + 1}`} 
              fill
              className="object-contain"
            />
            
            {/* Indicador de imagen principal */}
            {images[currentIndex].isPrimary && (
              <div className="absolute flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md top-2 left-2">
                <Star className="w-3 h-3 mr-1" />
                Principal
              </div>
            )}
            
            {/* Controles de navegación */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  disabled={currentIndex === 0}
                  className="absolute p-1 transform -translate-y-1/2 rounded-full left-2 top-1/2 bg-white/80 disabled:opacity-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={nextImage}
                  disabled={currentIndex === images.length - 1}
                  className="absolute p-1 transform -translate-y-1/2 rounded-full right-2 top-1/2 bg-white/80 disabled:opacity-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {isLoading ? 'Subiendo imágenes...' : 'Arrastra imágenes aquí o haz clic para seleccionarlas'}
            </p>
          </div>
        )}
      </div>
      
      {/* Selector de archivos */}
      <div className="flex justify-center">
        <label htmlFor={`file-upload-${entityType}-${entityId}`} 
          className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50 disabled:opacity-50"
          aria-disabled={isLoading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isLoading ? 'Subiendo...' : 'Subir imágenes'}
          <input
            id={`file-upload-${entityType}-${entityId}`}
            name="file-upload"
            type="file"
            className="sr-only"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isLoading}
            autoComplete="off"
          />
        </label>
      </div>
      
      {/* Miniaturas */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {images.map((img, index) => (
            <div 
              key={img.id} 
              className={`relative rounded-md overflow-hidden border-2 h-16 ${
                currentIndex === index ? 'border-purple-600' : 'border-transparent'
              } ${img.isPrimary ? 'ring-2 ring-yellow-400' : ''}`}
              onClick={() => setCurrentIndex(index)}
            >
              <Image 
                src={img.url} 
                alt={`Miniatura ${index + 1}`}
                fill
                className="object-cover cursor-pointer"
              />
              <div className="absolute top-0 right-0 flex p-1 space-x-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setAsPrimary(img.id);
                  }}
                  className={`bg-white/80 rounded-full p-0.5 ${img.isPrimary ? 'text-yellow-500' : 'text-gray-500'}`}
                >
                  <Star className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  className="bg-white/80 rounded-full p-0.5 text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 