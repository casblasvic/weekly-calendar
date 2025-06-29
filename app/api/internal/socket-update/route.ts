import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 🔄 ENDPOINT: Actualizar Socket.io
 * 
 * CONTEXTO:
 * - Ejecuta comandos npm para actualizar Socket.io a una versión específica
 * - Maneja dependencias relacionadas (socket.io-client si existe)
 * - Proporciona logs del proceso de actualización
 * 
 * PROPÓSITO:
 * - Permitir actualización manual de Socket.io desde la interfaz
 * - Ejecutar npm install con la nueva versión
 * - Manejar errores de compatibilidad
 * 
 * SEGURIDAD:
 * - Solo acepta versiones válidas semver
 * - Valida que la versión objetivo existe en NPM
 * - Logs de auditoría de la actualización
 * 
 * NOTA:
 * - Requiere reinicio del servidor para aplicar cambios
 * - No incluye rollback automático (se debe hacer manualmente)
 */

export async function POST(request: NextRequest) {
  try {
    const { targetVersion } = await request.json();
    
    if (!targetVersion || !isValidVersion(targetVersion)) {
      return NextResponse.json({
        success: false,
        error: 'Versión objetivo no válida'
      }, { status: 400 });
    }
    
    console.log(`🔄 [Socket.io Update] Iniciando actualización a versión ${targetVersion}`);
    
    // Verificar que la versión existe en NPM
    const npmResponse = await fetch(`https://registry.npmjs.org/socket.io/${targetVersion}`);
    if (!npmResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `La versión ${targetVersion} no existe en NPM`
      }, { status: 400 });
    }
    
    // Ejecutar actualización
    const updateCommand = `npm install socket.io@${targetVersion}`;
    console.log(`🔄 [Socket.io Update] Ejecutando: ${updateCommand}`);
    
    const { stdout, stderr } = await execAsync(updateCommand, {
      cwd: process.cwd(),
      timeout: 60000 // 1 minuto timeout
    });
    
    console.log(`✅ [Socket.io Update] Actualización completada`);
    console.log(`📋 [Socket.io Update] stdout:`, stdout);
    
    if (stderr) {
      console.warn(`⚠️ [Socket.io Update] stderr:`, stderr);
    }
    
    // Verificar si socket.io-client también necesita actualización
    try {
      const clientUpdateCommand = `npm install socket.io-client@${targetVersion}`;
      console.log(`🔄 [Socket.io Update] Actualizando cliente: ${clientUpdateCommand}`);
      
      const { stdout: clientStdout } = await execAsync(clientUpdateCommand, {
        cwd: process.cwd(),
        timeout: 30000
      });
      
      console.log(`✅ [Socket.io Update] Cliente actualizado:`, clientStdout);
    } catch (clientError) {
      console.log(`ℹ️ [Socket.io Update] Cliente no encontrado o no necesita actualización`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        version: targetVersion,
        stdout,
        stderr,
        message: `Socket.io actualizado a versión ${targetVersion}. Reinicia el servidor para aplicar los cambios.`
      }
    });
    
  } catch (error) {
    console.error('❌ [Socket.io Update] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar Socket.io'
    }, { status: 500 });
  }
}

/**
 * Valida que una cadena es una versión semver válida
 */
function isValidVersion(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/;
  return semverRegex.test(version);
} 