/**
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * API para verificar credenciales activas de Shelly y estado del módulo
 * @see docs/WEBSOCKET_INTEGRATION.md
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');
    
    if (!systemId) {
      return NextResponse.json({ error: "systemId requerido" }, { status: 400 });
    }
    
    // Verificar si es el mismo sistema del usuario
    if (systemId !== session.user.systemId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    
    // Verificar si el módulo Shelly está activo
    const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
    const moduleActive = await isShellyModuleActive(systemId);
    
    if (!moduleActive) {
      return NextResponse.json({ 
        hasActiveCredentials: false, 
        moduleActive: false,
        reason: 'module_inactive'
      });
    }
    
    // Verificar credenciales activas
    const activeCredentials = await prisma.shellyCredential.findMany({
      where: {
        systemId: systemId,
        status: 'connected'
      },
      select: {
        id: true,
        name: true,
        status: true,
        lastSyncAt: true
      }
    });
    
    const hasActiveCredentials = activeCredentials.length > 0;
    
    return NextResponse.json({
      hasActiveCredentials,
      moduleActive,
      activeCredentialsCount: activeCredentials.length,
      credentials: activeCredentials
    });
    
  } catch (error) {
    console.error('❌ Error verificando credenciales activas:', error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
} 