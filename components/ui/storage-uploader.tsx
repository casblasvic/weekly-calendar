// ===================================================================
// COMPONENTE ESTANDARIZADO PARA UPLOAD DE ARCHIVOS
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md
// Para uso en toda la aplicación

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  X, 
  Image, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { 
  StorageUploadConfig, 
  validateFileUpload,
  getFileTypeInfo,
  StorageFile,
  SecurityLevel 
} from '@/types/storage'
import { cn } from '@/lib/utils'

interface StorageUploaderProps {
  config: StorageUploadConfig
  files?: StorageFile[]
  onUpload: (files: File[], options: {
    category: string
    securityLevel: SecurityLevel
    altText?: string
    caption?: string
  }) => Promise<any>
  onDelete?: (fileId: string, permanent?: boolean) => Promise<any>
  isUploading?: boolean
  isDeleting?: boolean
  uploadError?: Error | null
  deleteError?: Error | null
  layout?: 'grid' | 'list' | 'compact'
  showPreview?: boolean
  maxFiles?: number
  className?: string
}

export function StorageUploader({
  config,
  files = [],
  onUpload,
  onDelete,
  isUploading = false,
  isDeleting = false,
  uploadError = null,
  deleteError = null,
  layout = 'grid',
  showPreview = true,
  maxFiles,
  className
}: StorageUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // ===================================================================
  // DROPZONE CONFIGURACIÓN
  // ===================================================================
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setDragActive(false)
    
    // Validar archivos
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of acceptedFiles) {
      const validation = validateFileUpload(file, config)
      if (validation.isValid) {
        validFiles.push(file)
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    }
    
    if (errors.length > 0) {
      // TODO: Mostrar errores usando toast o similar
      console.error('Errores de validación:', errors)
      return
    }
    
    if (validFiles.length === 0) return
    
    // Verificar límite de archivos
    if (maxFiles && files.length + validFiles.length > maxFiles) {
      console.error(`Máximo ${maxFiles} archivos permitidos`)
      return
    }
    
    try {
      setUploadProgress(0)
      
      await onUpload(validFiles, {
        category: config.category,
        securityLevel: config.securityLevel
      })
      
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 1000)
    } catch (error) {
      console.error('Error en upload:', error)
      setUploadProgress(0)
    }
  }, [config, files.length, maxFiles, onUpload])
  
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: config.allowedTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    multiple: config.allowMultiple ?? false,
    maxSize: config.maxSize,
    disabled: isUploading
  })
  
  // ===================================================================
  // HELPERS
  // ===================================================================
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const getFileIcon = (file: StorageFile) => {
    if (file.isImage) return <Image className="h-4 w-4" />
    if (file.isDocument) return <FileText className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }
  
  const getSecurityLevelColor = (level: SecurityLevel) => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800'
      case 'internal': return 'bg-blue-100 text-blue-800'
      case 'confidential': return 'bg-orange-100 text-orange-800'
      case 'ultra-confidential': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  // ===================================================================
  // RENDER DROPZONE
  // ===================================================================
  
  const renderDropzone = () => (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        isUploading && "cursor-not-allowed opacity-50",
        !isDragActive && !isDragReject && "border-muted-foreground/25 hover:border-primary",
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center space-y-2">
        <Upload className={cn(
          "h-8 w-8",
          isDragActive && !isDragReject && "text-primary",
          isDragReject && "text-destructive",
          !isDragActive && "text-muted-foreground"
        )} />
        
        {isUploading ? (
          <div className="space-y-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Subiendo archivos...</p>
            {uploadProgress > 0 && (
              <Progress value={uploadProgress} className="w-32" />
            )}
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">
              {isDragActive ? (
                isDragReject ? "Archivos no permitidos" : "Suelta los archivos aquí"
              ) : (
                "Arrastra archivos aquí o haz clic para seleccionar"
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Tipos permitidos: {config.allowedTypes.map(type => {
                const info = getFileTypeInfo(type)
                return info.extension
              }).join(', ')}
            </p>
            <p className="text-xs text-muted-foreground">
              Tamaño máximo: {formatFileSize(config.maxSize)}
            </p>
            {maxFiles && (
              <p className="text-xs text-muted-foreground">
                Máximo {maxFiles} archivo{maxFiles > 1 ? 's' : ''}
                {files.length > 0 && ` (${files.length}/${maxFiles})`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
  
  // ===================================================================
  // RENDER ARCHIVOS EXISTENTES
  // ===================================================================
  
  const renderFilesList = () => {
    if (!showPreview || files.length === 0) return null
    
    if (layout === 'grid') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="space-y-2">
                {file.isImage && file.url ? (
                  <div className="aspect-square rounded overflow-hidden bg-muted">
                    <img
                      src={file.url}
                      alt={file.altText || file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded bg-muted flex items-center justify-center">
                    {getFileIcon(file)}
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getSecurityLevelColor(file.securityLevel))}
                    >
                      {file.securityLevel}
                    </Badge>
                  </div>
                  
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7"
                      disabled={isDeleting}
                      onClick={() => onDelete(file.id)}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )
    }
    
    // Layout lista
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <Card key={file.id} className="p-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getFileIcon(file)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getSecurityLevelColor(file.securityLevel))}
                  >
                    {file.securityLevel}
                  </Badge>
                </div>
              </div>
              
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => onDelete(file.id)}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    )
  }
  
  // ===================================================================
  // RENDER ERRORES
  // ===================================================================
  
  const renderErrors = () => {
    if (!uploadError && !deleteError) return null
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {uploadError?.message || deleteError?.message || 'Error desconocido'}
        </AlertDescription>
      </Alert>
    )
  }
  
  // ===================================================================
  // RENDER PRINCIPAL
  // ===================================================================
  
  return (
    <div className="space-y-4">
      {renderDropzone()}
      {renderErrors()}
      {renderFilesList()}
    </div>
  )
} 