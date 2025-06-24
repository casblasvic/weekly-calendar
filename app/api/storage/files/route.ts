// ===================================================================
// API ENDPOINT: Listar Archivos del Sistema de Storage
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  StorageFilters,
  StorageListResponse,
  mapEntityImageToStorageFile,
  mapEntityDocumentToStorageFile
} from '@/types/storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extraer filtros de la query string
    const filters: StorageFilters = {
      entityType: searchParams.get('entityType') as any || undefined,
      entityId: searchParams.get('entityId') || undefined,
      category: searchParams.get('category') || undefined,
      fileType: searchParams.get('fileType') || undefined,
      securityLevel: searchParams.get('securityLevel') as any || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    }

    // Construir where clauses
    const imageWhere: any = {}
    const documentWhere: any = {}

    if (filters.entityType) {
      imageWhere.entityType = filters.entityType
      documentWhere.entityType = filters.entityType
    }

    if (filters.entityId) {
      imageWhere.entityId = filters.entityId
      documentWhere.entityId = filters.entityId
    }

    // Para search, buscar en nombres de archivo, altText, caption
    if (filters.search) {
      imageWhere.OR = [
        { imageUrl: { contains: filters.search } },
        { altText: { contains: filters.search } },
        { caption: { contains: filters.search } }
      ]
      documentWhere.OR = [
        { fileName: { contains: filters.search } },
        { documentUrl: { contains: filters.search } },
        { description: { contains: filters.search } }
      ]
    }

    // Paginación
    const skip = ((filters.page || 1) - 1) * (filters.limit || 50)
    const take = filters.limit || 50

    // Obtener imágenes y documentos por separado
    const [images, documents, totalImages, totalDocuments] = await Promise.all([
      prisma.entityImage.findMany({
        where: imageWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.entityDocument.findMany({
        where: documentWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.entityImage.count({ where: imageWhere }),
      prisma.entityDocument.count({ where: documentWhere })
    ])

    // Mapear a StorageFile
    const imageFiles = images.map(mapEntityImageToStorageFile)
    const documentFiles = documents.map(mapEntityDocumentToStorageFile)
    
    // Combinar y ordenar por fecha
    const allFiles = [...imageFiles, ...documentFiles]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    // Aplicar filtros adicionales si es necesario
    let filteredFiles = allFiles

    if (filters.category) {
      filteredFiles = filteredFiles.filter(file => file.category === filters.category)
    }

    if (filters.fileType) {
      filteredFiles = filteredFiles.filter(file => file.type.includes(filters.fileType!))
    }

    if (filters.securityLevel) {
      filteredFiles = filteredFiles.filter(file => file.securityLevel === filters.securityLevel)
    }

    const total = totalImages + totalDocuments
    const response: StorageListResponse = {
      files: filteredFiles,
      total,
      page: filters.page || 1,
      limit: filters.limit || 50,
      hasMore: skip + take < total
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error listando archivos de storage:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 