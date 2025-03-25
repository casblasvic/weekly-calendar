import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Lista de directorios permitidos (por seguridad)
const ALLOWED_DIRECTORIES = ['contexts'];

// Esta ruta lee archivos de forma segura
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    // Verificar que se proporciona una ruta
    if (!filePath) {
      return NextResponse.json({ error: 'Se requiere el parámetro path' }, { status: 400 });
    }

    // Verificar que la ruta está en un directorio permitido
    const directory = filePath.split('/')[0];
    if (!ALLOWED_DIRECTORIES.includes(directory)) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo se permiten archivos en directorios específicos.' },
        { status: 403 }
      );
    }

    // Obtener ruta absoluta y verificar que está dentro del proyecto
    const workspacePath = process.cwd();
    const absolutePath = path.join(workspacePath, filePath);
    
    // Verificar que el archivo existe
    try {
      await fs.access(absolutePath);
    } catch (error) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    // Leer el archivo
    const fileContent = await fs.readFile(absolutePath, 'utf-8');
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error al leer el archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la solicitud' },
      { status: 500 }
    );
  }
} 