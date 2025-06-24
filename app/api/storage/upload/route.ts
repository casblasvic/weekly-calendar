// ===================================================================
// API ENDPOINT: Upload de Archivos del Sistema de Storage
// ===================================================================
// Basado en: docs/SISTEMA_STORAGE_ARQUITECTURA.md

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
// TODO: Implementar autenticación del servidor
// import { getServerSession } from 'next-auth/next'
// import { authOptions } from '@/lib/auth'
import { 
  EntityType, 
  generateStoragePath, 
  validateFileUpload,
  getFileTypeInfo,
  StorageUploadConfig,
  getRecommendedSecurityLevel
} from '@/types/storage'

/**
 * API para subir archivos al servidor
 * POST /api/storage/upload
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Verificar autenticación del servidor
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'No autorizado' },
    //     { status: 401 }
    //   )
    // }
    
    // TEMPORAL: Usuario hardcodeado para desarrollo
    const session = { user: { id: 'dev-user-id' } }

    // Obtener datos del form
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as EntityType
    const entityId = formData.get('entityId') as string
    const category = formData.get('category') as string
    const securityLevel = formData.get('securityLevel') as string
    const altText = formData.get('altText') as string | null
    const caption = formData.get('caption') as string | null
    const order = formData.get('order') ? parseInt(formData.get('order') as string) : null

    // Validaciones básicas
    if (!file || !entityType || !entityId || !category) {
      return NextResponse.json(
        { error: 'Datos requeridos faltantes' },
        { status: 400 }
      )
    }

    // Obtener información del tipo de archivo
    const fileTypeInfo = getFileTypeInfo(file.type)
    if (!fileTypeInfo.isSupported) {
      return NextResponse.json(
        { error: `Tipo de archivo no soportado: ${file.type}` },
        { status: 400 }
      )
    }

    // Configuración de validación
    const uploadConfig: StorageUploadConfig = {
      entityType,
      entityId,
      category,
      securityLevel: securityLevel as any,
      allowedTypes: [file.type as any],
      maxSize: fileTypeInfo.maxSize
    }

    // Validar archivo
    const validation = validateFileUpload(file, uploadConfig)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Obtener clínica activa del usuario (TODO: implementar lógica real)
    const clinicId = 'default-clinic-id' // Placeholder

    // Generar path de storage
    const storagePath = generateStoragePath(
      clinicId,
      entityType,
      entityId,
      category,
      file.name
    )

    // Crear directorio si no existe
    const fullStoragePath = join(process.cwd(), 'storage', storagePath)
    const dirPath = fullStoragePath.substring(0, fullStoragePath.lastIndexOf('/'))
    await mkdir(dirPath, { recursive: true })

    // Guardar archivo físico
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(fullStoragePath, buffer)

    // URL pública del archivo
    const fileUrl = `/storage/${storagePath}`

    // Guardar en base de datos según el tipo
    let savedRecord
    if (fileTypeInfo.isImage) {
      savedRecord = await prisma.entityImage.create({
        data: {
          entityId,
          entityType: entityType as any,
          imageUrl: fileUrl,
          altText: altText || null,
          caption: caption || null,
          order: order,
          isProfilePic: category === 'profile',
          uploadedByUserId: session.user.id,
          systemId: 'default-system-id' // TODO: obtener del contexto
        }
      })
    } else {
      savedRecord = await prisma.entityDocument.create({
        data: {
          entityId,
          entityType: entityType as any,
          documentUrl: fileUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          description: altText || null,
          uploadedByUserId: session.user.id,
          systemId: 'default-system-id' // TODO: obtener del contexto
        }
      })
    }

    // Respuesta de éxito
    return NextResponse.json({
      success: true,
      file: {
        id: savedRecord.id,
        name: file.name,
        url: fileUrl,
        size: file.size,
        type: file.type,
        category,
        securityLevel,
        isImage: fileTypeInfo.isImage,
        isDocument: fileTypeInfo.isDocument,
        isMedia: fileTypeInfo.isMedia,
        uploadedAt: savedRecord.createdAt
      }
    })

  } catch (error) {
    console.error('Error en upload de archivo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 