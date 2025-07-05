"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { toast } from '@/app/components/ui/use-toast'
import { Upload, X, Image, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'

interface LogoUploaderProps {
  currentLogo?: string
  onLogoChange: (logoUrl: string) => void
  className?: string
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  currentLogo = '',
  onLogoChange,
  className,
}) => {
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [isHovering, setIsHovering] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasMounted, setHasMounted] = useState(false)
  
  // Montar componente solo en el cliente
  useEffect(() => {
    setHasMounted(true)
    if (currentLogo) {
      setLogoPreview(currentLogo)
    }
  }, [currentLogo])
  
  // Convertir blob a base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Verificar si una URL es de tipo blob
  const isBlobUrl = (url: string): boolean => {
    return url ? url.startsWith('blob:') : false;
  }
  
  // Simulamos la subida del logo (en un entorno real se subiría a un servidor)
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato no válido',
        description: 'Por favor, selecciona un archivo de imagen (JPEG, PNG, SVG).',
        variant: 'destructive',
      })
      return
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Archivo demasiado grande',
        description: 'El logo no debe superar los 2MB de tamaño.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Convertir a base64 para almacenamiento persistente
      const base64Logo = await blobToBase64(file);
      
      // Usar una URL de objeto para la vista previa
      const blobUrl = URL.createObjectURL(file);
      setLogoPreview(blobUrl);
      
      // Pasar la versión base64 para almacenamiento persistente
      onLogoChange(base64Logo);
      
      toast({
        title: 'Logo actualizado',
        description: 'El logo se ha actualizado correctamente.',
      });
    } catch (error) {
      console.error('Error al procesar el logo:', error);
      toast({
        title: 'Error al actualizar el logo',
        description: 'No se pudo procesar la imagen. Inténtelo de nuevo.',
        variant: 'destructive',
      });
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeLogo = () => {
    // Establecer el logo predeterminado
    setLogoPreview('')
    onLogoChange('')
    
    toast({
      title: 'Logo eliminado',
      description: 'Se ha eliminado el logo personalizado.',
    })
  }

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file) {
        // Usar el tipo correcto para la conversión
        const customEvent = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(customEvent);
      }
    },
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/svg+xml': ['.svg']
    },
  })

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      <div 
        className="relative group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex items-center justify-center w-40 h-40 bg-gray-100 border rounded-lg overflow-hidden">
          {hasMounted && logoPreview ? (
            <img
              src={logoPreview}
              alt="Logotipo de la empresa"
              onError={() => setLogoPreview('')}
              className={cn(
                'max-w-full max-h-full object-contain transition-opacity',
                isHovering && 'opacity-70'
              )}
            />
          ) : (
            <img
              src="/placeholder-logo.svg"
              alt="Logo de Qleven"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
        
        {isHovering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
            <div className="flex flex-col gap-2">
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={triggerFileInput}
                className="flex items-center gap-1"
              >
                <Upload className="w-4 h-4" />
                <span>Cambiar</span>
              </Button>
              {logoPreview && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={removeLogo}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Eliminar</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/gif,image/svg+xml"
        onChange={handleFileChange}
        aria-label="Subir logotipo"
      />
      
      <p className="text-sm text-gray-500 text-center">
        Haz clic en la imagen para cambiar el logo.<br />
        Formatos admitidos: PNG, JPEG, GIF, SVG.<br />
        Tamaño máximo: 2MB.
      </p>
    </div>
  )
} 