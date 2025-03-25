import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Star, Trash2, ImageIcon, Plus } from 'lucide-react';
import { ImageFile } from '@/contexts/file-context';
import FileUploader from './file-uploader';

interface ImageGalleryProps {
  images: ImageFile[];
  onAddImages?: (files: File[]) => Promise<void>;
  onSetPrimary?: (imageId: string) => Promise<void>;
  onRemove?: (imageId: string) => Promise<void>;
  onReorder?: (orderedIds: string[]) => Promise<void>;
  editable?: boolean;
  className?: string;
  layout?: 'carousel' | 'grid' | 'list';
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images = [],
  onAddImages,
  onSetPrimary,
  onRemove,
  onReorder,
  editable = false,
  className,
  layout = 'carousel'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Resetear índice cuando cambian las imágenes
  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images, currentIndex]);
  
  // Si no hay imágenes, mostrar estado vacío
  if (images.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-gray-50 rounded-md p-4",
        "border-2 border-dashed border-gray-300 h-[180px]",
        className
      )}>
        <ImageIcon className="h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 mb-4">No hay imágenes disponibles</p>
        
        {editable && onAddImages && (
          <div className="w-full flex justify-center">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 px-4"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    await onAddImages(Array.from(files));
                  }
                };
                input.click();
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Subir imágenes</span>
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // Función para navegar a la siguiente imagen
  const nextImage = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  // Función para navegar a la imagen anterior
  const prevImage = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  // Renderizar carrusel
  if (layout === 'carousel') {
    // Si no hay imágenes, mostrar un placeholder
    if (!images || images.length === 0) {
      return (
        <div className={cn("space-y-2", className)}>
          <div className="relative aspect-video rounded-md overflow-hidden bg-gray-100 w-full h-[180px] flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="mb-2">No hay imágenes disponibles</div>
              {editable && onAddImages && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        await onAddImages(Array.from(files));
                      }
                    };
                    input.click();
                  }}
                >
                  Añadir imágenes
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Asegurar que currentIndex es válido
    const safeIndex = Math.min(currentIndex, images.length - 1);
    if (safeIndex < 0) {
      return null; // No debería ocurrir, pero por seguridad
    }

    return (
      <div className={cn("space-y-2", className)}>
        {/* Imagen principal */}
        <div className="relative aspect-video rounded-md overflow-hidden bg-gray-50 w-full h-[180px]">
          <Image
            src={images[safeIndex].url}
            alt={images[safeIndex].fileName || 'Imagen'}
            fill
            className="object-contain"
          />
          
          {/* Indicador de imagen principal */}
          {images[safeIndex].isPrimary && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-xs px-2 py-1 rounded-full text-black">
              Principal
            </div>
          )}
          
          {/* Controles de navegación - mostrar solo si hay más de una imagen */}
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full opacity-80 bg-white h-8 w-8 p-0"
                onClick={prevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full opacity-80 bg-white h-8 w-8 p-0"
                onClick={nextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        {/* Miniaturas - mostrar siempre, independientemente del número de imágenes */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, idx) => (
            <div
              key={image.id}
              className={cn(
                "relative h-16 w-16 rounded-md overflow-hidden cursor-pointer flex-shrink-0",
                "border-2 transition-colors duration-200",
                idx === safeIndex ? "border-purple-600" : "border-transparent"
              )}
              onClick={() => setCurrentIndex(idx)}
            >
              <Image
                src={image.thumbnailUrl || image.url}
                alt={image.fileName}
                fill
                className="object-cover"
              />
              
              {/* Indicador de principal */}
              {image.isPrimary && (
                <div className="absolute top-0 left-0 bg-yellow-400 w-3 h-3 rounded-br-sm flex items-center justify-center">
                  <Star className="h-2 w-2 text-black" />
                </div>
              )}
              
              {/* Acciones de edición */}
              {editable && (
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex bg-black bg-opacity-60 p-0.5 rounded-bl-md absolute top-0 right-0">
                    {!image.isPrimary && onSetPrimary && (
                      <button
                        className="p-1 text-yellow-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetPrimary(image.id);
                        }}
                        title="Establecer como principal"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    {onRemove && (
                      <button
                        className="p-1 text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(image.id);
                        }}
                        title="Eliminar imagen"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Botón de añadir más imágenes - siempre visible si es editable */}
          {editable && onAddImages && (
            <div
              className="h-16 w-16 rounded-md border-2 border-dashed border-purple-300 
                       flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-purple-50"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    await onAddImages(Array.from(files));
                  }
                };
                input.click();
              }}
              title="Añadir más imágenes"
            >
              <Plus className="h-5 w-5 text-purple-600" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Layout de grid para múltiples imágenes
  if (layout === 'grid') {
    // Si no hay imágenes, mostrar un placeholder
    if (!images || images.length === 0) {
      return (
        <div className={cn("flex flex-col items-center justify-center h-40 bg-gray-50 rounded-md", className)}>
          <div className="text-gray-400 text-center">
            <div className="mb-2">No hay imágenes disponibles</div>
            {editable && onAddImages && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && files.length > 0) {
                      await onAddImages(Array.from(files));
                    }
                  };
                  input.click();
                }}
              >
                Añadir imágenes
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", className)}>
        {images.map((image) => (
          <div 
            key={image.id} 
            className="relative aspect-square rounded-md overflow-hidden group"
          >
            <Image
              src={image.thumbnailUrl || image.url}
              alt={image.fileName || 'Imagen'}
              fill
              className="object-cover"
            />
            
            {/* Indicador de principal */}
            {image.isPrimary && (
              <div className="absolute top-1 left-1 bg-yellow-400 px-1.5 py-0.5 rounded-full text-xs">
                Principal
              </div>
            )}
            
            {/* Acciones */}
            {editable && (
              <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && onSetPrimary && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-full bg-white/80"
                    onClick={() => onSetPrimary(image.id)}
                  >
                    <Star className="h-4 w-4 text-yellow-500" />
                  </Button>
                )}
                {onRemove && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-full bg-white/80"
                    onClick={() => onRemove(image.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
        
        {/* Botón de añadir imágenes */}
        {editable && onAddImages && (
          <div 
            className="aspect-square rounded-md border-2 border-dashed border-gray-300 
                     flex flex-col items-center justify-center cursor-pointer"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                  await onAddImages(Array.from(files));
                }
              };
              input.click();
            }}
          >
            <Plus className="h-8 w-8 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Añadir</span>
          </div>
        )}
      </div>
    );
  }

  // Layout tipo lista (para administración)
  // Si no hay imágenes, mostrar un placeholder
  if (!images || images.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-20 bg-gray-50 rounded-md", className)}>
        <div className="text-gray-400 text-center">
          <div className="text-sm">No hay imágenes disponibles</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {images.map((image) => (
        <div 
          key={image.id} 
          className="flex items-center gap-3 p-2 border rounded-md hover:bg-gray-50"
        >
          <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
            <Image
              src={image.thumbnailUrl || image.url}
              alt={image.fileName || 'Imagen'}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{image.fileName}</p>
            <p className="text-xs text-gray-500">{(image.fileSize / 1024).toFixed(1)} KB</p>
          </div>
          {image.isPrimary && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Principal
            </span>
          )}
          {editable && (
            <div className="flex items-center gap-1">
              {!image.isPrimary && onSetPrimary && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={() => onSetPrimary(image.id)}
                >
                  <Star className="h-4 w-4 text-gray-400 hover:text-yellow-500" />
                </Button>
              )}
              {onRemove && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={() => onRemove(image.id)}
                >
                  <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
      
      {editable && onAddImages && (
        <FileUploader
          accept="image/*"
          multiple={true}
          variant="compact"
          onUpload={onAddImages}
          className="mt-2"
        />
      )}
    </div>
  );
};

export default ImageGallery; 