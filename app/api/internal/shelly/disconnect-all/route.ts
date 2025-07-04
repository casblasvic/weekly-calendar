import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { disconnectAllShellyWebSockets, isShellyModuleActive } from '@/lib/services/shelly-module-service';

/**
 * ========================================
 * ENDPOINT: Desconectar todas las conexiones WebSocket Shelly
 * ========================================
 * 
 * 🔌 DESCONEXIÓN FORZADA DE CONEXIONES LEGACY
 * Este endpoint desconecta todas las conexiones WebSocket Shelly existentes.
 * Se usa cuando se desactiva el módulo para limpiar conexiones legacy.
 * 
 * 🎯 FUNCIONALIDAD:
 * - Verifica autenticación del usuario
 * - Verifica que el módulo Shelly esté realmente inactivo
 * - Desconecta todas las conexiones WebSocket de Shelly
 * - Actualiza el estado en la base de datos
 * 
 * 🔧 USO:
 * POST /api/internal/shelly/disconnect-all
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log(`🔌 [DISCONNECT-ALL] Usuario ${session.user.email} solicita desconexión de WebSockets Shelly`);

    // Verificar estado del módulo
    const isModuleActive = await isShellyModuleActive(session.user.systemId);
    
    if (isModuleActive) {
      console.log(`⚠️ [DISCONNECT-ALL] Módulo Shelly está ACTIVO - no se recomienda desconectar`);
      return NextResponse.json({ 
        warning: true,
        message: "El módulo Shelly está activo. ¿Estás seguro de desconectar?",
        moduleActive: true
      }, { status: 200 });
    }

    console.log(`🔒 [DISCONNECT-ALL] Módulo Shelly INACTIVO - procediendo con desconexión masiva`);

    // Desconectar todas las conexiones Shelly
    await disconnectAllShellyWebSockets();

    console.log(`✅ [DISCONNECT-ALL] Desconexión completada para sistema ${session.user.systemId}`);

    return NextResponse.json({
      success: true,
      message: 'Todas las conexiones WebSocket Shelly han sido desconectadas',
      moduleActive: false,
      disconnectedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DISCONNECT-ALL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 