// ===================================================================
// API ENDPOINT: Servir y Eliminar Archivos Individuales del Sistema de Storage
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { mapEntityImageToStorageFile, mapEntityDocumentToStorageFile } from '@/types/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    const { searchParams } = new URL(request.url)
    const thumb = searchParams.get('thumb') === 'true'
    const size = searchParams.get('size') || 'medium'

    // Buscar archivo en ambas tablas
    const [image, document] = await Promise.all([
      prisma.entityImage.findUnique({ where: { id: fileId } }),
      prisma.entityDocument.findUnique({ where: { id: fileId } })
    ])

    const fileRecord = image || document
    if (!fileRecord) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener URL del archivo
    const fileUrl = image ? image.imageUrl : document!.documentUrl
    
    // Convertir URL a path físico
    const filePath = join(process.cwd(), fileUrl.replace(/^\//, ''))

    try {
      // Leer archivo del sistema de archivos
      const fileBuffer = await readFile(filePath)
      
      // Determinar content type
      let contentType = 'application/octet-stream'
      if (image) {
        if (fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg')) {
          contentType = 'image/jpeg'
        } else if (fileUrl.endsWith('.png')) {
          contentType = 'image/png'
        } else if (fileUrl.endsWith('.webp')) {
          contentType = 'image/webp'
        }
      } else if (document) {
        contentType = document.fileType || 'application/octet-stream'
      }

      // TODO: Implementar generación de thumbnails si thumb=true
      if (thumb && image) {
        // Por ahora devolver la imagen original
        // En el futuro implementar resize automático
      }

      // Actualizar contador de acceso (opcional)
      // await prisma.entityImage/entityDocument.update({
      //   where: { id: fileId },
      //   data: { lastAccessedAt: new Date(), accessCount: { increment: 1 } }
      // })

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000', // 1 año
        }
      })

    } catch (fileError) {
      console.error('Error leyendo archivo del sistema:', fileError)
      return NextResponse.json(
        { error: 'Archivo no accesible en el sistema de archivos' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Error sirviendo archivo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    const body = await request.json()
    const { permanent = false } = body

    // Buscar archivo en ambas tablas
    const [image, document] = await Promise.all([
      prisma.entityImage.findUnique({ where: { id: fileId } }),
      prisma.entityDocument.findUnique({ where: { id: fileId } })
    ])

    const fileRecord = image || document
    if (!fileRecord) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener URL del archivo
    const fileUrl = image ? image.imageUrl : document!.documentUrl
    
    if (permanent) {
      // Eliminación permanente: borrar archivo físico y registro de BD
      const filePath = join(process.cwd(), fileUrl.replace(/^\//, ''))
      
      try {
        await unlink(filePath)
      } catch (fileError) {
        console.warn('No se pudo eliminar archivo físico:', fileError)
        // Continuar con eliminación de BD aunque el archivo físico falle
      }

      // Eliminar de BD
      if (image) {
        await prisma.entityImage.delete({ where: { id: fileId } })
      } else {
        await prisma.entityDocument.delete({ where: { id: fileId } })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Archivo eliminado permanentemente' 
      })

    } else {
      // Soft delete: marcar como eliminado (requiere campos deletedAt/deletedBy en schema)
      // Por ahora hacer eliminación permanente hasta que se agreguen los campos
      
      if (image) {
        await prisma.entityImage.delete({ where: { id: fileId } })
      } else {
        await prisma.entityDocument.delete({ where: { id: fileId } })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Archivo eliminado' 
      })
    }

  } catch (error) {
    console.error('Error eliminando archivo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 