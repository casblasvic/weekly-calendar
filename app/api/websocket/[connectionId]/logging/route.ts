/**
 * ========================================
 * WEBSOCKET LOGGING CONTROL API - CONTROL DE LOGGING POR CONEXIÓN
 * ========================================
 * 
 * 🔧 API DE CONTROL DE LOGGING WEBSOCKET
 * Este endpoint permite activar/desactivar el sistema de logging para conexiones
 * WebSocket específicas. Útil para reducir el volumen de logs durante operaciones
 * normales y habilitarlo solo para debugging.
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * Endpoint para controlar logging de conexiones WebSocket
 * @see docs/AUTHENTICATION_PATTERNS.md
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * CRÍTICO: Siempre usar: import { prisma } from '@/lib/db';
 * Esta es la única importación válida para Prisma en el proyecto.
 * 
 * 🎯 OPERACIONES SOPORTADAS:
 * 
 * **PUT - Actualizar Estado de Logging:**
 * - Habilitar/deshabilitar logging para conexión específica
 * - Validación de permisos por systemId
 * - Actualización inmediata del estado
 * 
 * **GET - Consultar Estado de Logging:**
 * - Obtener estado actual del logging
 * - Información de la conexión asociada
 * - Estadísticas de logs generados
 * 
 * 📤 ESTRUCTURA DE REQUEST (PUT):
 * ```typescript
 * {
 *   loggingEnabled: boolean  // true para habilitar, false para deshabilitar
 * }
 * ```
 * 
 * 📤 ESTRUCTURA DE RESPUESTA:
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     connectionId: string,
 *     loggingEnabled: boolean,
 *     type: string,
 *     status: string,
 *     lastUpdated: string
 *   }
 * }
 * ```
 * 
 * 🚨 VALIDACIONES Y SEGURIDAD:
 * - Validación de sesión de usuario
 * - Verificación de systemId para tenant isolation
 * - Validación de existencia de conexión
 * - Permisos de modificación por usuario
 * 
 * 💡 CASOS DE USO:
 * - Debugging de conexiones problemáticas
 * - Reducir volumen de logs en producción
 * - Control granular por tipo de conexión
 * - Troubleshooting de problemas específicos
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { WebSocketConnectionService } from '@/lib/websocket/connection-service';

const webSocketConnectionService = new WebSocketConnectionService();

export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { connectionId } = params;

    // Obtener información de la conexión
    // Manejo gracioso para cuando el campo loggingEnabled no existe aún
    try {
      const connection = await prisma.webSocketConnection.findFirst({
        where: { 
          id: connectionId,
          systemId: session.user.systemId // 🛡️ FILTRO MULTI-TENANT CRÍTICO
        },
        select: {
          id: true,
          type: true,
          status: true,
          loggingEnabled: true,
          updatedAt: true,
          _count: {
            select: {
              logs: true
            }
          }
        }
      });

      if (!connection) {
        return NextResponse.json({ 
          error: 'Conexión no encontrada' 
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          connectionId: connection.id,
          type: connection.type,
          status: connection.status,
          loggingEnabled: connection.loggingEnabled,
          totalLogs: connection._count.logs,
          lastUpdated: connection.updatedAt.toISOString()
        }
      });
    } catch (fieldError: any) {
      // Si el campo loggingEnabled no existe, devolver información básica
      if (fieldError.message?.includes('loggingEnabled')) {
        console.warn('⚠️ Campo loggingEnabled no existe, devolviendo información básica');
        
        const connection = await prisma.webSocketConnection.findFirst({
          where: { 
            id: connectionId,
            systemId: session.user.systemId
          },
          select: {
            id: true,
            type: true,
            status: true,
            updatedAt: true,
            _count: {
              select: {
                logs: true
              }
            }
          }
        });

        if (!connection) {
          return NextResponse.json({ 
            error: 'Conexión no encontrada' 
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: {
            connectionId: connection.id,
            type: connection.type,
            status: connection.status,
            loggingEnabled: true, // Default a true
            totalLogs: connection._count.logs,
            lastUpdated: connection.updatedAt.toISOString()
          },
          warning: 'Campo loggingEnabled no existe en la base de datos. Ejecute la migración para habilitar el control de logging.'
        });
      }
      throw fieldError;
    }

  } catch (error) {
    console.error('Error obteniendo estado de logging:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { connectionId } = params;
    const body = await request.json();
    const { loggingEnabled } = body;

    // Validar parámetros
    if (typeof loggingEnabled !== 'boolean') {
      return NextResponse.json({ 
        error: 'loggingEnabled debe ser un boolean' 
      }, { status: 400 });
    }

    // Verificar que la conexión existe y pertenece al sistema del usuario
    const connection = await prisma.webSocketConnection.findFirst({
      where: { 
        id: connectionId,
        systemId: session.user.systemId // 🛡️ FILTRO MULTI-TENANT CRÍTICO
      }
    });

    if (!connection) {
      return NextResponse.json({ 
        error: 'Conexión no encontrada' 
      }, { status: 404 });
    }

    // Actualizar estado del logging
    const success = await webSocketConnectionService.updateLoggingEnabled(
      connectionId, 
      loggingEnabled
    );

    if (!success) {
      return NextResponse.json({ 
        error: 'Error actualizando estado de logging' 
      }, { status: 500 });
    }

    // Obtener datos actualizados
    const updatedConnection = await prisma.webSocketConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        type: true,
        status: true,
        loggingEnabled: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        connectionId: updatedConnection!.id,
        type: updatedConnection!.type,
        status: updatedConnection!.status,
        loggingEnabled: updatedConnection!.loggingEnabled,
        lastUpdated: updatedConnection!.updatedAt.toISOString()
      },
      message: `Logging ${loggingEnabled ? 'habilitado' : 'deshabilitado'} para la conexión`
    });

  } catch (error) {
    console.error('Error actualizando estado de logging:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 