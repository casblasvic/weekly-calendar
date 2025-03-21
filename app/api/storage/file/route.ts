import { NextRequest, NextResponse } from 'next/server';

// Importar fs y path de forma segura solo en el servidor
const fs = require('fs');
const path = require('path');

/**
 * API para servir archivos desde el almacenamiento local
 * Ruta: /api/storage/file?path=path/to/file.ext
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener la ruta del archivo desde la URL
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'Se requiere un parámetro path' }, { status: 400 });
    }
    
    // Construir la ruta absoluta del archivo
    const fullPath = path.join(process.cwd(), 'storage', filePath);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }
    
    // Leer el archivo
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Determinar el tipo MIME
    let contentType = 'application/octet-stream';
    if (fullPath.endsWith('.jpg') || fullPath.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (fullPath.endsWith('.png')) {
      contentType = 'image/png';
    } else if (fullPath.endsWith('.pdf')) {
      contentType = 'application/pdf';
    }
    
    // Devolver el archivo con el tipo MIME adecuado
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error al obtener archivo:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
} 