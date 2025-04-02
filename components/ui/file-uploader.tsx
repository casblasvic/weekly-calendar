import React, { useCallback, useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  onUpload: (files: File[]) => Promise<void>;
  variant?: 'standard' | 'compact' | 'icon';
  children?: React.ReactNode;
  id?: string;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  accept = 'image/*',
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB
  className,
  onUpload,
  variant = 'standard',
  children,
  id,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Procesamos los tipos MIME aceptados para incluir formatos de documento comunes
  const processAcceptTypes = useMemo(() => {
    // Si se acepta todo, devolvemos un objeto vacío (acepta todo)
    if (accept === '*/*') return {};
    
    // Objeto para almacenar tipos MIME
    const acceptMap: Record<string, string[]> = {};
    
    // Convertir la cadena de tipos aceptados en un array
    const acceptTypes = accept.split(',').map(type => type.trim());
    
    // Procesar cada tipo (solo una vez, al renderizar)
    acceptTypes.forEach(type => {
      if (type === 'application/pdf' || type === '.pdf') {
        acceptMap['application/pdf'] = [];
      } 
      else if (type === 'application/msword' || type === '.doc') {
        acceptMap['application/msword'] = [];
      }
      else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || type === '.docx') {
        acceptMap['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = [];
      }
      else if (type === 'image/*') {
        // Especificar los tipos de imagen más comunes para evitar el array vacío
        acceptMap['image/jpeg'] = [];
        acceptMap['image/png'] = [];
        acceptMap['image/gif'] = [];
        acceptMap['image/webp'] = [];
        acceptMap['image/svg+xml'] = [];
      }
      else if (type === 'application/*') {
        // Añadir tipos de documento comunes
        acceptMap['application/pdf'] = [];
        acceptMap['application/msword'] = [];
        acceptMap['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = [];
        acceptMap['application/vnd.ms-excel'] = [];
        acceptMap['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = [];
      }
      else {
        acceptMap[type] = [];
      }
    });
    
    // Si está vacío (posible debido a un formato incorrecto), aceptar cualquier archivo
    if (Object.keys(acceptMap).length === 0) {
      return {};
    }
    
    return acceptMap;
  }, [accept]); // Solo se recalcula si cambia la prop accept
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      // Simular progreso de carga
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 5;
          return next > 90 ? 90 : next;
        });
      }, 100);
      
      // Llamar a la función de carga proporcionada
      await onUpload(acceptedFiles);
      
      // Completar progreso
      clearInterval(progressInterval);
      setProgress(100);
      
      // Resetear después de un tiempo
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivos');
      setUploading(false);
      setProgress(0);
    }
  }, [onUpload]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: processAcceptTypes,
    maxSize,
    multiple,
    disabled: uploading || disabled
  });
  
  // Renderizar variante compacta (botón)
  if (variant === 'compact') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        {...getRootProps()}
        className={cn("relative", className)}
        disabled={uploading || disabled}
        id={id}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{Math.round(progress)}%</span>
          </div>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            <span>{multiple ? "Subir archivos" : "Subir archivo"}</span>
          </>
        )}
        {error && (
          <div className="absolute left-0 right-0 text-xs text-red-500 -bottom-8">
            {error}
          </div>
        )}
      </Button>
    );
  }
  
  // Renderizar variante icono (solo icono)
  if (variant === 'icon') {
    return (
      <div 
        {...getRootProps()} 
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "hover:bg-gray-100 transition-colors duration-200 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Plus className="w-5 h-5 text-gray-500" />
        )}
      </div>
    );
  }
  
  // Renderizar variante estándar (dropzone completo)
  return (
    <div className={cn("relative", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg transition-colors duration-200",
          "text-center cursor-pointer flex flex-col items-center justify-center p-6",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input {...getInputProps()} id={id} />
        
        {children || (
          <>
            {uploading ? (
              <div className="w-full space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                <Progress value={progress} className="w-full h-2" />
                <p className="text-sm text-gray-600">Subiendo... {Math.round(progress)}%</p>
              </div>
            ) : (
              <>
                <div className="p-3 mb-3 rounded-full bg-primary/10">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="mb-2 text-sm text-gray-600">
                  {isDragActive 
                    ? "Suelta los archivos aquí..." 
                    : `Arrastra ${multiple ? "archivos" : "un archivo"} aquí o haz clic para seleccionar`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {accept === '*/*' 
                    ? "Todos los formatos aceptados" 
                    : `Formatos: ${accept.replace(/\*/g, 'todos')}`}
                  . Tamaño máximo: {Math.round(maxSize / (1024 * 1024))}MB
                </p>
              </>
            )}
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader; 