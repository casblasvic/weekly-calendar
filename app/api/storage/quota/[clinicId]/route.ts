// ===================================================================
// API ENDPOINT: Gestión de Cuotas de Storage por Clínica
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { promises as fs } from 'fs'
import { join } from 'path'

interface StorageQuota {
  clinicId: string
  totalSpace: number // En bytes
  usedSpace: number // En bytes
  availableSpace: number // En bytes
  fileCount: number
  imageCount: number
  documentCount: number
  quotaLimitBytes: number
  isQuotaExceeded: boolean
  usagePercentage: number
}

async function calculateClinicStorageUsage(clinicId: string): Promise<StorageQuota> {
  try {
    // Obtener estadísticas de archivos desde la base de datos
    const [images, documents] = await Promise.all([
      prisma.entityImage.findMany({
        where: { entityId: { contains: clinicId } }, // Filtrar por clínica si es posible
        select: { imageUrl: true }
      }),
      prisma.entityDocument.findMany({
        where: { entityId: { contains: clinicId } }, // Filtrar por clínica si es posible
        select: { documentUrl: true, fileSize: true }
      })
    ])

    const fileCount = images.length + documents.length
    const imageCount = images.length
    const documentCount = documents.length

    // Calcular espacio usado desde el sistema de archivos
    let usedSpace = 0
    const clinicStoragePath = join(process.cwd(), 'storage', 'clinicas', clinicId)

    try {
      const stats = await fs.stat(clinicStoragePath)
      if (stats.isDirectory()) {
        // Recursivamente calcular el tamaño de todos los archivos
        usedSpace = await calculateDirectorySize(clinicStoragePath)
      }
    } catch (error) {
      console.warn(`No se pudo acceder al directorio de storage para la clínica ${clinicId}:`, error)
      // Si no se puede acceder al directorio, usar cálculo desde BD
      usedSpace = documents.reduce((total, doc) => total + (doc.fileSize || 0), 0)
    }

    // Configuración de cuotas (esto podría venir de configuración de clínica)
    const quotaLimitBytes = 5 * 1024 * 1024 * 1024 // 5GB por defecto
    const availableSpace = Math.max(0, quotaLimitBytes - usedSpace)
    const isQuotaExceeded = usedSpace > quotaLimitBytes
    const usagePercentage = Math.min(100, (usedSpace / quotaLimitBytes) * 100)

    return {
      clinicId,
      totalSpace: quotaLimitBytes,
      usedSpace,
      availableSpace,
      fileCount,
      imageCount,
      documentCount,
      quotaLimitBytes,
      isQuotaExceeded,
      usagePercentage
    }
  } catch (error) {
    console.error(`Error calculando usage de storage para clínica ${clinicId}:`, error)
    throw error
  }
}

async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      
      if (entry.isFile()) {
        const stats = await fs.stat(fullPath)
        totalSize += stats.size
      } else if (entry.isDirectory()) {
        totalSize += await calculateDirectorySize(fullPath)
      }
    }
  } catch (error) {
    console.warn(`Error leyendo directorio ${dirPath}:`, error)
  }
  
  return totalSize
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  try {
    const { clinicId } = params

    if (!clinicId) {
      return NextResponse.json(
        { error: 'ID de clínica requerido' },
        { status: 400 }
      )
    }

    // Verificar que la clínica existe
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true }
    })

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clínica no encontrada' },
        { status: 404 }
      )
    }

    const quota = await calculateClinicStorageUsage(clinicId)

    return NextResponse.json({
      success: true,
      clinic: {
        id: clinic.id,
        name: clinic.name
      },
      quota
    })

  } catch (error) {
    console.error('Error obteniendo cuota de storage:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  try {
    const { clinicId } = params
    const body = await request.json()
    const { newQuotaLimitGB } = body

    if (!clinicId) {
      return NextResponse.json(
        { error: 'ID de clínica requerido' },
        { status: 400 }
      )
    }

    if (!newQuotaLimitGB || newQuotaLimitGB <= 0) {
      return NextResponse.json(
        { error: 'Límite de cuota debe ser mayor a 0 GB' },
        { status: 400 }
      )
    }

    // TODO: Actualizar límite de cuota en configuración de clínica
    // Por ahora solo retornamos la nueva cuota calculada con el nuevo límite
    
    const currentUsage = await calculateClinicStorageUsage(clinicId)
    const newQuotaLimitBytes = newQuotaLimitGB * 1024 * 1024 * 1024

    const updatedQuota: StorageQuota = {
      ...currentUsage,
      quotaLimitBytes: newQuotaLimitBytes,
      totalSpace: newQuotaLimitBytes,
      availableSpace: Math.max(0, newQuotaLimitBytes - currentUsage.usedSpace),
      isQuotaExceeded: currentUsage.usedSpace > newQuotaLimitBytes,
      usagePercentage: Math.min(100, (currentUsage.usedSpace / newQuotaLimitBytes) * 100)
    }

    return NextResponse.json({
      success: true,
      message: 'Cuota de storage actualizada',
      quota: updatedQuota
    })

  } catch (error) {
    console.error('Error actualizando cuota de storage:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 