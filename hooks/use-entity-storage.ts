// ===================================================================
// HOOK ESTANDARIZADO PARA GESTIÓN DE STORAGE POR ENTIDAD
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md
// Para uso en toda la aplicación

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  EntityType, 
  StorageFile, 
  StorageUploadRequest, 
  StorageUploadResponse, 
  StorageFilters,
  StorageListResponse,
  mapEntityImageToStorageFile,
  mapEntityDocumentToStorageFile 
} from '@/types/storage'
import { EntityImage, EntityDocument } from '@prisma/client'

/**
 * Configuración del hook useEntityStorage
 */
interface UseEntityStorageConfig {
  entityType: EntityType
  entityId: string
  category?: string
  autoFetch?: boolean
}

/**
 * Hook principal para gestión de storage de cualquier entidad
 */
export function useEntityStorage({
  entityType,
  entityId,
  category,
  autoFetch = true
}: UseEntityStorageConfig) {
  const queryClient = useQueryClient()
  
  // Query key dinámico basado en los parámetros
  const queryKey = ['entity-storage', entityType, entityId, category].filter(Boolean)
  
  // ===================================================================
  // FETCH: Obtener archivos de la entidad
  // ===================================================================
  
  const {
    data: filesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<StorageFile[]> => {
      const filters: StorageFilters = {
        entityType,
        entityId,
        ...(category && { category })
      }
      
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value.toString())
      })
      
      const response = await fetch(`/api/storage/files?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar archivos')
      }
      
      const result: StorageListResponse = await response.json()
      return result.files
    },
    enabled: autoFetch && !!entityId
  })
  
  // ===================================================================
  // UPLOAD: Subir archivos
  // ===================================================================
  
  const uploadMutation = useMutation({
    mutationFn: async (uploadRequest: StorageUploadRequest): Promise<StorageUploadResponse> => {
      const formData = new FormData()
      formData.append('file', uploadRequest.file)
      formData.append('entityType', uploadRequest.entityType)
      formData.append('entityId', uploadRequest.entityId)
      formData.append('category', uploadRequest.category)
      formData.append('securityLevel', uploadRequest.securityLevel)
      
      if (uploadRequest.altText) {
        formData.append('altText', uploadRequest.altText)
      }
      if (uploadRequest.caption) {
        formData.append('caption', uploadRequest.caption)
      }
      if (uploadRequest.order !== undefined) {
        formData.append('order', uploadRequest.order.toString())
      }
      
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al subir archivo')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['entity-storage', entityType, entityId] })
    }
  })
  
  // ===================================================================
  // DELETE: Eliminar archivo
  // ===================================================================
  
  const deleteMutation = useMutation({
    mutationFn: async ({ fileId, permanent = false }: { fileId: string; permanent?: boolean }) => {
      const response = await fetch(`/api/storage/file/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permanent })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar archivo')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['entity-storage', entityType, entityId] })
    }
  })
  
  // ===================================================================
  // HELPERS
  // ===================================================================
  
  /**
   * Subir uno o múltiples archivos
   */
  const uploadFiles = async (
    files: File[],
    options: {
      category: string
      securityLevel: 'public' | 'internal' | 'confidential' | 'ultra-confidential'
      altText?: string
      caption?: string
    }
  ) => {
    const uploadPromises = files.map((file, index) => 
      uploadMutation.mutateAsync({
        entityType,
        entityId,
        category: options.category,
        securityLevel: options.securityLevel,
        file,
        altText: options.altText,
        caption: options.caption,
        order: index
      })
    )
    
    return Promise.all(uploadPromises)
  }
  
  /**
   * Eliminar archivo por ID
   */
  const deleteFile = async (fileId: string, permanent = false) => {
    return deleteMutation.mutateAsync({ fileId, permanent })
  }
  
  /**
   * Obtener archivos filtrados por categoría
   */
  const getFilesByCategory = (targetCategory: string): StorageFile[] => {
    return filesData?.filter(file => file.category === targetCategory) || []
  }
  
  /**
   * Obtener solo imágenes
   */
  const getImages = (): StorageFile[] => {
    return filesData?.filter(file => file.isImage) || []
  }
  
  /**
   * Obtener solo documentos
   */
  const getDocuments = (): StorageFile[] => {
    return filesData?.filter(file => file.isDocument) || []
  }
  
  /**
   * Obtener archivo principal (isPrimary = true)
   */
  const getPrimaryFile = (): StorageFile | undefined => {
    return filesData?.find(file => file.isPrimary)
  }
  
  // ===================================================================
  // RETURN
  // ===================================================================
  
  return {
    // Datos
    files: filesData || [],
    isLoading,
    error,
    
    // Acciones
    uploadFiles,
    deleteFile,
    refetch,
    
    // Estados de mutaciones
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    uploadError: uploadMutation.error,
    deleteError: deleteMutation.error,
    
    // Helpers de filtrado
    getFilesByCategory,
    getImages,
    getDocuments,
    getPrimaryFile,
    
    // Estadísticas útiles
    totalFiles: filesData?.length || 0,
    totalImages: getImages().length,
    totalDocuments: getDocuments().length,
    hasPrimaryFile: !!getPrimaryFile()
  }
}

// ===================================================================
// HOOK PARA CUOTA DE ALMACENAMIENTO
// ===================================================================

export function useStorageQuota(clinicId: string) {
  return useQuery({
    queryKey: ['storage-quota', clinicId],
    queryFn: async () => {
      const response = await fetch(`/api/storage/quota/${clinicId}`)
      if (!response.ok) {
        throw new Error('Error al cargar cuota de almacenamiento')
      }
      return response.json()
    },
    enabled: !!clinicId,
    refetchInterval: 5 * 60 * 1000 // Refrescar cada 5 minutos
  })
}

// ===================================================================
// HOOK PARA ESTADÍSTICAS DE ALMACENAMIENTO
// ===================================================================

export function useStorageStats(
  clinicId: string, 
  filters?: Pick<StorageFilters, 'dateFrom' | 'dateTo' | 'entityType'>
) {
  return useQuery({
    queryKey: ['storage-stats', clinicId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ clinicId })
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value.toString())
        })
      }
      
      const response = await fetch(`/api/storage/stats?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas de almacenamiento')
      }
      return response.json()
    },
    enabled: !!clinicId
  })
}

// ===================================================================
// HELPERS PARA COMPATIBILIDAD CON COMPONENTES EXISTENTES
// ===================================================================

/**
 * Convierte EntityImage[] a StorageFile[] para componentes existentes
 */
export function useEntityImages(entityType: EntityType, entityId: string) {
  const { data: entityImages, ...query } = useQuery({
    queryKey: ['entity-images', entityType, entityId],
    queryFn: async (): Promise<EntityImage[]> => {
      const response = await fetch(`/api/${entityType}s/${entityId}/images`)
      if (!response.ok) {
        throw new Error('Error al cargar imágenes')
      }
      return response.json()
    },
    enabled: !!entityId
  })
  
  const files = entityImages?.map(mapEntityImageToStorageFile) || []
  
  return {
    files,
    images: files,
    ...query
  }
}

/**
 * Convierte EntityDocument[] a StorageFile[] para componentes existentes
 */
export function useEntityDocuments(entityType: EntityType, entityId: string) {
  const { data: entityDocuments, ...query } = useQuery({
    queryKey: ['entity-documents', entityType, entityId],
    queryFn: async (): Promise<EntityDocument[]> => {
      const response = await fetch(`/api/${entityType}s/${entityId}/documents`)
      if (!response.ok) {
        throw new Error('Error al cargar documentos')
      }
      return response.json()
    },
    enabled: !!entityId
  })
  
  const files = entityDocuments?.map(mapEntityDocumentToStorageFile) || []
  
  return {
    files,
    documents: files,
    ...query
  }
} 