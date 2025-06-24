// ===================================================================
// TIPOS DEFINITIVOS DEL SISTEMA DE STORAGE
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md
// Para uso en toda la aplicación

import { EntityImage, EntityDocument } from '@prisma/client'

// ===================================================================
// TIPOS DE ENTIDADES SOPORTADAS
// ===================================================================

export type EntityType = 
  | 'service' 
  | 'client' 
  | 'product' 
  | 'equipment' 
  | 'appointment' 
  | 'treatment' 
  | 'clinic'

// ===================================================================
// CATEGORÍAS POR TIPO DE ENTIDAD
// ===================================================================

export type CategoryByEntity = {
  service: 'profile' | 'gallery' | 'manual' | 'certificate' | 'general'
  client: 'before' | 'after' | 'progress' | 'report' | 'prescription' | 'consent' | 'history' | 'general'
  product: 'catalog' | 'instructions' | 'datasheet' | 'safety' | 'certificate'
  equipment: 'photo' | 'installation' | 'manual' | 'maintenance' | 'warranty' | 'certificate'
  appointment: 'photo' | 'document'
  treatment: 'photo' | 'protocol'
  clinic: 'logo' | 'facility' | 'team' | 'license' | 'insurance' | 'contract' | 'protocol' | 'marketing'
}

export type FileCategory<T extends EntityType = EntityType> = T extends keyof CategoryByEntity 
  ? CategoryByEntity[T] 
  : string

// ===================================================================
// NIVELES DE SEGURIDAD
// ===================================================================

export type SecurityLevel = 
  | 'public'              // 🟢 Acceso libre dentro de clínica
  | 'internal'            // 🟡 Solo usuarios autenticados de la clínica  
  | 'confidential'        // 🔴 Solo usuarios autorizados + auditoría
  | 'ultra-confidential'  // ⚫ Acceso muy restringido + doble autenticación

// ===================================================================
// TIPOS DE ARCHIVO SOPORTADOS
// ===================================================================

export const IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg', maxSize: 10 * 1024 * 1024, thumbs: true },       // 10MB
  'image/png': { ext: 'png', maxSize: 10 * 1024 * 1024, thumbs: true },        // 10MB
  'image/webp': { ext: 'webp', maxSize: 10 * 1024 * 1024, thumbs: true },      // 10MB
  'image/heic': { ext: 'heic', maxSize: 15 * 1024 * 1024, thumbs: true },      // 15MB (iPhone)
  'image/raw': { ext: 'raw', maxSize: 50 * 1024 * 1024, thumbs: false }        // 50MB (Profesional)
} as const

export const DOCUMENT_TYPES = {
  'application/pdf': { ext: 'pdf', maxSize: 25 * 1024 * 1024, preview: true },
  'application/msword': { ext: 'doc', maxSize: 10 * 1024 * 1024, preview: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', maxSize: 10 * 1024 * 1024, preview: false },
  'application/vnd.ms-excel': { ext: 'xls', maxSize: 15 * 1024 * 1024, preview: false },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', maxSize: 15 * 1024 * 1024, preview: false },
  'text/plain': { ext: 'txt', maxSize: 5 * 1024 * 1024, preview: true },
  'text/csv': { ext: 'csv', maxSize: 10 * 1024 * 1024, preview: true }
} as const

export const MEDIA_TYPES = {
  'video/mp4': { ext: 'mp4', maxSize: 100 * 1024 * 1024, thumbs: true },       // 100MB
  'audio/mpeg': { ext: 'mp3', maxSize: 25 * 1024 * 1024, thumbs: false }       // 25MB
} as const

export const ALL_SUPPORTED_TYPES = {
  ...IMAGE_TYPES,
  ...DOCUMENT_TYPES,
  ...MEDIA_TYPES
} as const

export type SupportedMimeType = keyof typeof ALL_SUPPORTED_TYPES
export type ImageMimeType = keyof typeof IMAGE_TYPES
export type DocumentMimeType = keyof typeof DOCUMENT_TYPES
export type MediaMimeType = keyof typeof MEDIA_TYPES

// ===================================================================
// INTERFACES PRINCIPALES
// ===================================================================

/**
 * Configuración para upload de archivos
 */
export interface StorageUploadConfig {
  entityType: EntityType
  entityId: string
  category: string
  securityLevel: SecurityLevel
  allowedTypes: SupportedMimeType[]
  maxSize: number
  allowMultiple?: boolean
  generateThumbs?: boolean
}

/**
 * Archivo procesado para la UI (compatible con componentes existentes)
 */
export interface StorageFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  category: string
  securityLevel: SecurityLevel
  isImage: boolean
  isDocument: boolean
  isMedia: boolean
  isPrimary?: boolean
  altText?: string
  caption?: string
  order?: number
  uploadedAt: Date
  lastAccessedAt?: Date
  metadata?: Record<string, any>
}

/**
 * Información de imagen específica
 */
export interface StorageImageFile extends StorageFile {
  isImage: true
  thumbUrl?: string
  dimensions?: {
    width: number
    height: number
  }
}

/**
 * Información de documento específica  
 */
export interface StorageDocumentFile extends StorageFile {
  isDocument: true
  previewAvailable: boolean
  pageCount?: number
}

/**
 * Request para upload
 */
export interface StorageUploadRequest {
  entityType: EntityType
  entityId: string
  category: string
  securityLevel: SecurityLevel
  file: File
  altText?: string
  caption?: string
  order?: number
}

/**
 * Response de upload
 */
export interface StorageUploadResponse {
  success: boolean
  file?: StorageFile
  error?: string
  quota?: StorageQuotaInfo
}

/**
 * Filtros para búsqueda de archivos
 */
export interface StorageFilters {
  entityType?: EntityType
  entityId?: string
  category?: string
  fileType?: string
  securityLevel?: SecurityLevel
  dateFrom?: Date
  dateTo?: Date
  search?: string
  page?: number
  limit?: number
}

/**
 * Respuesta de listado
 */
export interface StorageListResponse {
  files: StorageFile[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Información de cuota de almacenamiento
 */
export interface StorageQuotaInfo {
  clinicId: string
  totalSizeBytes: number
  maxSizeBytes: number
  usedPercentage: number
  totalFiles: number
  maxFiles?: number
  isOverQuota: boolean
  warningThreshold: number
  isNearLimit: boolean
}

/**
 * Estadísticas de uso
 */
export interface StorageUsageStats {
  clinicId: string
  totalFiles: number
  totalSizeBytes: number
  byEntityType: Record<EntityType, {
    count: number
    sizeBytes: number
  }>
  byFileType: Record<string, {
    count: number
    sizeBytes: number
  }>
  bySecurityLevel: Record<SecurityLevel, {
    count: number
    sizeBytes: number
  }>
  monthlyGrowth: number
  lastCalculated: Date
}

// ===================================================================
// MAPPERS: PRISMA ENTITIES → STORAGE FILES
// ===================================================================

/**
 * Convierte EntityImage de Prisma a StorageImageFile para la UI
 * NOTA: Algunos campos se infieren o usan valores por defecto hasta actualizar el schema
 */
export function mapEntityImageToStorageFile(entityImage: EntityImage): StorageImageFile {
  // Inferir nombre del archivo desde la URL
  const fileName = entityImage.imageUrl.split('/').pop() || 'image'
  
  // Inferir tipo MIME desde la extensión  
  const extension = fileName.split('.').pop()?.toLowerCase()
  const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
                   extension === 'png' ? 'image/png' :
                   extension === 'webp' ? 'image/webp' :
                   'image/jpeg' // fallback
  
  return {
    id: entityImage.id,
    name: fileName,
    url: entityImage.imageUrl,
    size: 0, // TODO: Añadir campo fileSize al schema
    type: mimeType,
    category: 'gallery', // TODO: Añadir campo category al schema
    securityLevel: 'internal', // TODO: Añadir campo securityLevel al schema
    isImage: true,
    isDocument: false,
    isMedia: false,
    isPrimary: entityImage.isProfilePic,
    altText: entityImage.altText || undefined,
    caption: entityImage.caption || undefined,
    order: entityImage.order || undefined,
    uploadedAt: entityImage.createdAt,
    lastAccessedAt: undefined, // TODO: Añadir campo lastAccessedAt al schema
    metadata: undefined, // TODO: Añadir campo metadata al schema
    // Propiedades específicas de imagen
    thumbUrl: `${entityImage.imageUrl}?thumb=true`,
    dimensions: undefined // TODO: Extraer de metadata cuando esté disponible
  }
}

/**
 * Convierte EntityDocument de Prisma a StorageDocumentFile para la UI
 * NOTA: Algunos campos se infieren o usan valores por defecto hasta actualizar el schema
 */
export function mapEntityDocumentToStorageFile(entityDocument: EntityDocument): StorageDocumentFile {
  // Usar fileType como mimeType (puede necesitar mapeo)
  const mimeType = entityDocument.fileType || 'application/octet-stream'
  const isPreviewable = ['application/pdf', 'text/plain', 'text/csv'].includes(mimeType)
  
  return {
    id: entityDocument.id,
    name: entityDocument.fileName,
    url: entityDocument.documentUrl,
    size: entityDocument.fileSize || 0,
    type: mimeType,
    category: 'general', // TODO: Añadir campo category al schema
    securityLevel: 'internal', // TODO: Añadir campo securityLevel al schema
    isImage: false,
    isDocument: true,
    isMedia: false,
    altText: entityDocument.description || undefined,
    uploadedAt: entityDocument.createdAt,
    lastAccessedAt: undefined, // TODO: Añadir campo lastAccessedAt al schema
    metadata: undefined, // TODO: Añadir campo metadata al schema
    // Propiedades específicas de documento
    previewAvailable: isPreviewable,
    pageCount: undefined // TODO: Extraer de metadata cuando esté disponible
  }
}

/**
 * Helper para determinar el tipo de archivo
 */
export function getFileTypeInfo(mimeType: string) {
  const isImage = Object.keys(IMAGE_TYPES).includes(mimeType)
  const isDocument = Object.keys(DOCUMENT_TYPES).includes(mimeType)
  const isMedia = Object.keys(MEDIA_TYPES).includes(mimeType)
  
  const typeInfo = ALL_SUPPORTED_TYPES[mimeType as SupportedMimeType]
  
  return {
    isImage,
    isDocument,
    isMedia,
    isSupported: !!typeInfo,
    maxSize: typeInfo?.maxSize || 0,
    extension: typeInfo?.ext || '',
    supportsThumb: isImage && (typeInfo as any)?.thumbs === true,
    supportsPreview: isDocument && (typeInfo as any)?.preview === true
  }
}

/**
 * Helper para generar el path de storage
 */
export function generateStoragePath(
  clinicId: string, 
  entityType: EntityType, 
  entityId: string, 
  category: string, 
  fileName: string
): string {
  const timestamp = new Date().toISOString().replace(/[:\-T]/g, '').slice(0, 15) // YYYYMMDD_HHMMSS
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase()
  
  const fileType = category.includes('photo') || category.includes('image') || category === 'gallery' || category === 'profile' ? 'images' : 'documents'
  
  return `clinicas/${clinicId}/${entityType}s/${entityId}/${fileType}/${category}/${timestamp}_${entityType}_${entityId}_${category}_${sanitizedFileName}`
}

/**
 * Helper para obtener la URL de acceso al archivo
 */
export function getFileAccessUrl(fileId: string, options?: {
  thumb?: boolean
  size?: 'small' | 'medium' | 'large'
}): string {
  const params = new URLSearchParams()
  if (options?.thumb) params.set('thumb', 'true')
  if (options?.size) params.set('size', options.size)
  
  const queryString = params.toString()
  return `/api/storage/file/${fileId}${queryString ? `?${queryString}` : ''}`
}

// ===================================================================
// CONFIGURACIONES DE SEGURIDAD POR CATEGORIA
// ===================================================================

export const SECURITY_LEVELS_BY_CATEGORY: Record<string, SecurityLevel> = {
  // Servicios - INTERNO por defecto
  'profile': 'internal',
  'gallery': 'internal', 
  'manual': 'internal',
  'certificate': 'internal',
  'general': 'internal',
  
  // Clientes - CONFIDENCIAL por defecto (datos médicos)
  'before': 'confidential',
  'after': 'confidential',
  'progress': 'confidential',
  'report': 'ultra-confidential',
  'prescription': 'ultra-confidential', 
  'consent': 'confidential',
  'history': 'ultra-confidential',
  
  // Productos - PÚBLICO (catálogo)
  'catalog': 'public',
  'instructions': 'internal',
  'datasheet': 'internal',
  'safety': 'internal',
  
  // Equipamiento - INTERNO
  'photo': 'internal',
  'installation': 'internal',
  'maintenance': 'internal',
  'warranty': 'confidential',
  
  // Clínica
  'logo': 'public',
  'facility': 'public', 
  'team': 'internal',
  'license': 'ultra-confidential',
  'insurance': 'confidential',
  'contract': 'ultra-confidential',
  'protocol': 'internal',
  'marketing': 'public'
}

/**
 * Obtiene el nivel de seguridad recomendado para una categoría
 */
export function getRecommendedSecurityLevel(
  entityType: EntityType, 
  category: string
): SecurityLevel {
  return SECURITY_LEVELS_BY_CATEGORY[category] || 'internal'
}

// ===================================================================
// VALIDACIONES
// ===================================================================

/**
 * Valida si un archivo puede ser subido
 */
export function validateFileUpload(
  file: File, 
  config: StorageUploadConfig
): { isValid: boolean; error?: string } {
  // Verificar tipo de archivo
  if (!config.allowedTypes.includes(file.type as SupportedMimeType)) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido. Tipos permitidos: ${config.allowedTypes.join(', ')}`
    }
  }
  
  // Verificar tamaño
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024))
    return {
      isValid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`
    }
  }
  
  return { isValid: true }
}

// ===================================================================
// CONSTANTES
// ===================================================================

export const DEFAULT_UPLOAD_CONFIG: Partial<StorageUploadConfig> = {
  securityLevel: 'internal',
  allowMultiple: false,
  generateThumbs: true,
  maxSize: 10 * 1024 * 1024 // 10MB por defecto
}

export const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 }, 
  large: { width: 600, height: 600 }
} as const 