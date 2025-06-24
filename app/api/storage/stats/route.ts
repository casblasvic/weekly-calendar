// ===================================================================
// API ENDPOINT: Estadísticas Globales de Storage del Sistema
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { promises as fs } from 'fs'
import { join } from 'path'

interface StorageStats {
  global: {
    totalFiles: number
    totalImages: number
    totalDocuments: number
    totalSizeBytes: number
    totalSizeGB: number
  }
  byClinic: Array<{
    clinicId: string
    clinicName: string
    fileCount: number
    sizeBytes: number
    sizeGB: number
    lastUpload: Date | null
  }>
  byEntityType: Array<{
    entityType: string
    fileCount: number
    sizeBytes: number
    sizeGB: number
  }>
  recentUploads: Array<{
    id: string
    fileName: string
    entityType: string
    entityId: string
    sizeBytes: number
    uploadedAt: Date
    clinicId?: string
  }>
  topCategories: Array<{
    category: string
    fileCount: number
    sizeBytes: number
  }>
}

async function calculateSystemStorageStats(): Promise<StorageStats> {
  try {
    // Obtener estadísticas básicas de la base de datos
    const [images, documents, clinics] = await Promise.all([
      prisma.entityImage.findMany({
        select: {
          id: true,
          entityType: true,
          entityId: true,
          imageUrl: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.entityDocument.findMany({
        select: {
          id: true,
          entityType: true,
          entityId: true,
          fileName: true,
          fileSize: true,
          documentUrl: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clinic.findMany({
        select: { id: true, name: true }
      })
    ])

    // Estadísticas globales
    const totalFiles = images.length + documents.length
    const totalImages = images.length
    const totalDocuments = documents.length
    
    // Calcular tamaño total aproximado
    const documentsSize = documents.reduce((total, doc) => total + (doc.fileSize || 0), 0)
    const estimatedImagesSize = images.length * 500 * 1024 // Estimación: 500KB por imagen
    const totalSizeBytes = documentsSize + estimatedImagesSize
    const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024)

    // Estadísticas por clínica (usando entityId como proxy de clínica)
    const clinicStats = new Map<string, {
      clinicName: string
      fileCount: number
      sizeBytes: number
      lastUpload: Date | null
    }>()

    // Procesar imágenes
    images.forEach(image => {
      // Intentar extraer clinicId del path o entityId
      const clinicId = extractClinicId(image.imageUrl, image.entityId)
      if (clinicId) {
        const clinic = clinics.find(c => c.id === clinicId)
        if (!clinicStats.has(clinicId)) {
          clinicStats.set(clinicId, {
            clinicName: clinic?.name || 'Clínica desconocida',
            fileCount: 0,
            sizeBytes: 0,
            lastUpload: null
          })
        }
        const stat = clinicStats.get(clinicId)!
        stat.fileCount++
        stat.sizeBytes += 500 * 1024 // Estimación por imagen
        if (!stat.lastUpload || image.createdAt > stat.lastUpload) {
          stat.lastUpload = image.createdAt
        }
      }
    })

    // Procesar documentos
    documents.forEach(doc => {
      const clinicId = extractClinicId(doc.documentUrl, doc.entityId)
      if (clinicId) {
        const clinic = clinics.find(c => c.id === clinicId)
        if (!clinicStats.has(clinicId)) {
          clinicStats.set(clinicId, {
            clinicName: clinic?.name || 'Clínica desconocida',
            fileCount: 0,
            sizeBytes: 0,
            lastUpload: null
          })
        }
        const stat = clinicStats.get(clinicId)!
        stat.fileCount++
        stat.sizeBytes += doc.fileSize || 0
        if (!stat.lastUpload || doc.createdAt > stat.lastUpload) {
          stat.lastUpload = doc.createdAt
        }
      }
    })

    const byClinic = Array.from(clinicStats.entries()).map(([clinicId, stats]) => ({
      clinicId,
      clinicName: stats.clinicName,
      fileCount: stats.fileCount,
      sizeBytes: stats.sizeBytes,
      sizeGB: stats.sizeBytes / (1024 * 1024 * 1024),
      lastUpload: stats.lastUpload
    })).sort((a, b) => b.sizeBytes - a.sizeBytes)

    // Estadísticas por tipo de entidad
    const entityTypeStats = new Map<string, { fileCount: number, sizeBytes: number }>()
    
    images.forEach(image => {
      if (!entityTypeStats.has(image.entityType)) {
        entityTypeStats.set(image.entityType, { fileCount: 0, sizeBytes: 0 })
      }
      const stat = entityTypeStats.get(image.entityType)!
      stat.fileCount++
      stat.sizeBytes += 500 * 1024 // Estimación por imagen
    })

    documents.forEach(doc => {
      if (!entityTypeStats.has(doc.entityType)) {
        entityTypeStats.set(doc.entityType, { fileCount: 0, sizeBytes: 0 })
      }
      const stat = entityTypeStats.get(doc.entityType)!
      stat.fileCount++
      stat.sizeBytes += doc.fileSize || 0
    })

    const byEntityType = Array.from(entityTypeStats.entries()).map(([entityType, stats]) => ({
      entityType,
      fileCount: stats.fileCount,
      sizeBytes: stats.sizeBytes,
      sizeGB: stats.sizeBytes / (1024 * 1024 * 1024)
    })).sort((a, b) => b.fileCount - a.fileCount)

    // Uploads recientes (últimos 20)
    const allFiles = [
      ...images.map(img => ({
        id: img.id,
        fileName: img.imageUrl.split('/').pop() || 'imagen',
        entityType: img.entityType,
        entityId: img.entityId,
        sizeBytes: 500 * 1024, // Estimación
        uploadedAt: img.createdAt,
        clinicId: extractClinicId(img.imageUrl, img.entityId)
      })),
      ...documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName || 'documento',
        entityType: doc.entityType,
        entityId: doc.entityId,
        sizeBytes: doc.fileSize || 0,
        uploadedAt: doc.createdAt,
        clinicId: extractClinicId(doc.documentUrl, doc.entityId)
      }))
    ].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(0, 20)

    // Top categorías (simplificado - basado en entityType por ahora)
    const topCategories = byEntityType.map(et => ({
      category: et.entityType,
      fileCount: et.fileCount,
      sizeBytes: et.sizeBytes
    })).slice(0, 10)

    return {
      global: {
        totalFiles,
        totalImages,
        totalDocuments,
        totalSizeBytes,
        totalSizeGB
      },
      byClinic,
      byEntityType,
      recentUploads: allFiles,
      topCategories
    }
  } catch (error) {
    console.error('Error calculando estadísticas de storage:', error)
    throw error
  }
}

function extractClinicId(fileUrl: string, entityId: string): string | null {
  // Intentar extraer clinicId del path del archivo
  const urlParts = fileUrl.split('/')
  const clinicasIndex = urlParts.indexOf('clinicas')
  if (clinicasIndex !== -1 && urlParts[clinicasIndex + 1]) {
    return urlParts[clinicasIndex + 1]
  }
  
  // Si no se puede extraer del URL, intentar usar entityId directamente
  // (esto dependerá de la convención de naming usada)
  return entityId.includes('-') ? entityId.split('-')[0] : entityId
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'
    const clinicId = searchParams.get('clinicId')

    let stats: StorageStats

    if (clinicId) {
      // Si se especifica una clínica, filtrar estadísticas por esa clínica
      // TODO: Implementar filtrado específico por clínica
      stats = await calculateSystemStorageStats()
      stats.byClinic = stats.byClinic.filter(c => c.clinicId === clinicId)
      stats.recentUploads = stats.recentUploads.filter(u => u.clinicId === clinicId)
    } else {
      stats = await calculateSystemStorageStats()
    }

    // Si no se requieren detalles, simplificar la respuesta
    if (!includeDetails) {
      return NextResponse.json({
        success: true,
        stats: {
          global: stats.global,
          clinicCount: stats.byClinic.length,
          entityTypeCount: stats.byEntityType.length,
          recentUploadsCount: stats.recentUploads.length
        }
      })
    }

    return NextResponse.json({
      success: true,
      stats,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error obteniendo estadísticas de storage:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 