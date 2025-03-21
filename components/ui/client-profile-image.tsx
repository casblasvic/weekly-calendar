import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { User, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImages } from '@/contexts/image-context';
import FileUploader from './file-uploader';

interface ClientProfileImageProps {
  clientId: string;
  clinicId: string;
  initialImage?: any;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  editable?: boolean;
  onChange?: (image: any) => void;
}

const ClientProfileImage: React.FC<ClientProfileImageProps> = ({
  clientId,
  clinicId,
  initialImage,
  size = 'md',
  className,
  editable = false,
  onChange
}) => {
  const [image, setImage] = useState<any>(initialImage);
  const { uploadImage, getImagesByEntity } = useImages();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verificar parámetros requeridos
  useEffect(() => {
    if (editable && (!clientId || !clinicId)) {
      console.warn("ClientProfileImage: Faltan clientId o clinicId requeridos para modo editable", 
        { clientId, clinicId });
      setError("Configuración incompleta");
    } else {
      setError(null);
    }
  }, [clientId, clinicId, editable]);
  
  // Tamaño basado en la prop size
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };
  
  // Manejar carga de imagen
  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Verificar que tenemos los parámetros necesarios
    if (!clientId || !clinicId) {
      console.error("Faltan parámetros necesarios para subir imagen del cliente:", 
        { clientId, clinicId });
      return;
    }
    
    setIsUploading(true);
    try {
      console.log("Subiendo imagen de cliente con parámetros:", {
        clientId, 
        clinicId, 
        entityType: 'client',
        fileName: files[0].name
      });
      
      // Subir imagen de perfil (solo una)
      const uploadedImage = await uploadImage(
        files[0],
        'client',
        clientId,
        clinicId,
        { isPrimary: true }  // Siempre es principal en cliente
      );
      
      // Actualizar estado local
      setImage(uploadedImage);
      
      // Notificar cambio al componente padre si se proporcionó callback
      if (onChange) {
        onChange(uploadedImage);
      }
    } catch (error) {
      console.error('Error al subir imagen de perfil:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Eliminar imagen
  const handleRemoveImage = () => {
    // En un contexto real, eliminaríamos la imagen del almacenamiento
    setImage(null);
    
    if (onChange) {
      onChange(null);
    }
  };
  
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('relative rounded-full overflow-hidden bg-gray-100', sizeClasses[size])}>
        {image ? (
          <Image
            src={image.url}
            alt="Foto de perfil"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <User className={cn(
              'text-gray-400',
              size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : 'h-16 w-16'
            )} />
          </div>
        )}
        
        {editable && image && (
          <button
            onClick={handleRemoveImage}
            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {editable && (
        <div className="mt-2">
          {error ? (
            <div className="text-red-500 text-xs mb-1">{error}</div>
          ) : (
            <FileUploader
              accept="image/*"
              multiple={false}
              onUpload={handleImageUpload}
              variant="compact"
              disabled={isUploading || !!error}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ClientProfileImage; 