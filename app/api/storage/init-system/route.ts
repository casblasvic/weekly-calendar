import { NextRequest, NextResponse } from 'next/server';

// Importar fs y path de forma segura solo en el servidor
const fs = require('fs');
const path = require('path');

/**
 * Inicializa la estructura de carpetas para almacenamiento del sistema
 * Esta ruta se llama automáticamente al iniciar la aplicación
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar si es una solicitud de reparación
    const { searchParams } = new URL(request.url);
    const repair = searchParams.get('repair') === 'true';
    
    console.log(`API: Inicializando sistema de almacenamiento... ${repair ? '(modo reparación)' : ''}`);
    
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
    
    // Verificar si el archivo de metadatos existe y es válido
    let metadataIsValid = false;
    
    if (fs.existsSync(metadataFile) && !repair) {
      try {
        // Intentar leer y parsear para verificar que es un JSON válido
        const content = fs.readFileSync(metadataFile, 'utf8');
        JSON.parse(content);
        metadataIsValid = true;
      } catch (e) {
        console.error("El archivo de metadatos existe pero no es un JSON válido, se recreará:", e);
        metadataIsValid = false;
      }
    }
    
    // Crear/recrear archivo de metadatos si no existe o está corrupto o se forzó la reparación
    if (!fs.existsSync(metadataFile) || !metadataIsValid || repair) {
      console.log(`${repair ? 'Recreando' : 'Creando'} archivo de metadatos:`, metadataFile);
      fs.writeFileSync(metadataFile, JSON.stringify({
        version: "1.0",
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        files: {}
      }, null, 2));
    }
    
    return NextResponse.json({
      success: true,
      message: `Estructura de almacenamiento del sistema ${repair ? 'reparada' : 'inicializada'} correctamente`,
      metadataFile,
      metadataStatus: metadataIsValid ? 'valid' : (repair ? 'repaired' : 'created')
    });
  } catch (error: any) {
    console.error('Error al crear estructura de carpetas del sistema:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 