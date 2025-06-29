import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 🔍 ENDPOINT: Verificar Versión de Socket.io
 * 
 * CONTEXTO:
 * - Verifica la versión actual de Socket.io instalada
 * - Consulta NPM Registry para obtener la última versión disponible
 * - Compara versiones y proporciona información de actualización
 * 
 * PROPÓSITO:
 * - Permitir verificación manual de actualizaciones de Socket.io
 * - Proporcionar información de notas de versión
 * - Detectar si hay actualizaciones disponibles
 * 
 * RESPUESTA:
 * - current: Versión actual instalada
 * - latest: Última versión disponible en NPM
 * - hasUpdate: Boolean indicando si hay actualización
 * - releaseNotes: URL a las notas de la versión
 */

export async function GET(request: NextRequest) {
  try {
    // Leer package.json para obtener versión actual
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    const currentVersion = packageJson.dependencies?.['socket.io'] || 
                          packageJson.devDependencies?.['socket.io'] || 
                          '4.0.0';
    
    // Limpiar versión (remover ^ o ~)
    const cleanCurrentVersion = currentVersion.replace(/[\^~]/, '');
    
    // Consultar NPM Registry para obtener la última versión
    const npmResponse = await fetch('https://registry.npmjs.org/socket.io/latest');
    const npmData = await npmResponse.json();
    
    const latestVersion = npmData.version;
    const hasUpdate = compareVersions(cleanCurrentVersion, latestVersion) < 0;
    
    // URL de notas de versión
    const releaseNotes = `https://github.com/socketio/socket.io/releases/tag/${latestVersion}`;
    
    return NextResponse.json({
      success: true,
      data: {
        current: cleanCurrentVersion,
        latest: latestVersion,
        hasUpdate,
        releaseNotes
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking Socket.io version:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al verificar la versión de Socket.io'
    }, { status: 500 });
  }
}

/**
 * Compara dos versiones semver
 * @param version1 Primera versión
 * @param version2 Segunda versión
 * @returns -1 si version1 < version2, 0 si iguales, 1 si version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
} 