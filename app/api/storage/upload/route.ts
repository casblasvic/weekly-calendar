import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Importar fs y path de forma segura solo en el servidor
const fs = require('fs');
const path = require('path');
const storageService = require('@/lib/storage/storage-service').storageService;

/**
 * API para subir archivos al servidor
 * POST /api/storage/upload
 */
export async function POST(request: NextRequest) {
  console.log("API: Recibida solicitud de carga de archivo");
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const clinicId = formData.get('clinicId') as string;
    
    // Usar el fileId proporcionado o generar uno nuevo
    const fileId = formData.get('fileId') as string || uuidv4();
    
    console.log("API: Datos recibidos:", { 
      entityType, 
      entityId, 
      clinicId, 
      fileId, 
      fileType: file?.type, 
      fileName: file?.name 
    });
    
    if (!file || !entityType || !entityId || !clinicId) {
      console.error("API: Faltan parámetros requeridos");
      return NextResponse.json(
        { error: 'Se requieren todos los parámetros: file, entityType, entityId, clinicId' },
        { status: 400 }
      );
    }
    
    // Obtener metadatos adicionales del formulario
    const isPrimary = formData.get('isPrimary') === 'true';
    const position = parseInt(formData.get('position') as string || '0');
    
    // Determinar tipo de archivo
    const fileType = file.type.startsWith('image/') 
      ? 'images' 
      : file.type.includes('pdf') || file.type.includes('word') || file.type.includes('excel')
        ? 'documents'
        : 'other';
    
    // Verificar si el directorio base existe
    const baseDir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(baseDir)) {
      console.log("API: Creando directorio base:", baseDir);
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    // Crear la ruta simplificada
    const simplePath = path.join(
      baseDir, 
      'clinicas',
      clinicId,
      entityType,
      entityId,
      fileType
    );
    
    // Asegurar que existe la estructura
    fs.mkdirSync(simplePath, { recursive: true });
    
    // Determinar nombre de archivo
    const extension = file.name.split('.').pop() || '';
    const fileName = `${fileId}.${extension}`;
    const filePath = path.join(simplePath, fileName);
    
    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Escribir archivo
    fs.writeFileSync(filePath, buffer);
    
    // URL pública para acceder al archivo
    const relativePath = `clinicas/${clinicId}/${entityType}/${entityId}/${fileType}/${fileName}`;
    const publicUrl = `/api/storage/file?path=${relativePath}`;
    
    return NextResponse.json({
      success: true,
      fileName,
      fileSize: buffer.length,
      mimeType: file.type,
      path: relativePath,
      localPath: filePath,
      publicUrl: publicUrl,
      storageProvider: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        isPrimary,
        position
      }
    });
  } catch (error: any) {
    console.error('API: Error general al subir archivo:', error);
    console.error("API: Stack:", error.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 