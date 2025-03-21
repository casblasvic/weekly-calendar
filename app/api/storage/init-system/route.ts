import { NextResponse } from 'next/server';

// Importar fs y path de forma segura solo en el servidor
const fs = require('fs');
const path = require('path');

/**
 * Inicializa la estructura de carpetas para almacenamiento del sistema
 * Esta ruta se llama automáticamente al iniciar la aplicación
 */
export async function GET() {
  try {
    console.log("API: Inicializando sistema de almacenamiento...");
    
    // Inicializar manualmente (no usando el modulo init.ts para evitar problemas de compilación)
    const storagePath = path.join(process.cwd(), 'storage');
    const metadataFile = path.join(storagePath, 'metadata.json');
    
    // Asegurar que existe el directorio base de almacenamiento
    if (!fs.existsSync(storagePath)) {
      console.log("Creando directorio base de almacenamiento:", storagePath);
      fs.mkdirSync(storagePath, { recursive: true });
    }
    
    // Crear subdirectorios necesarios
    const directories = [
      path.join(storagePath, 'clinicas'),
      path.join(storagePath, 'global'),
      path.join(storagePath, 'global', 'templates'),
      path.join(storagePath, 'global', 'common'),
      path.join(storagePath, 'global', 'backup'),
      path.join(storagePath, 'temp')
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        console.log("Creando directorio:", dir);
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Crear archivo de metadatos si no existe
    if (!fs.existsSync(metadataFile)) {
      console.log("Creando archivo de metadatos:", metadataFile);
      fs.writeFileSync(metadataFile, JSON.stringify({}, null, 2));
    }
    
    return NextResponse.json({
      success: true,
      message: 'Estructura de almacenamiento del sistema inicializada correctamente',
      metadataFile
    });
  } catch (error: any) {
    console.error('Error al crear estructura de carpetas del sistema:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 