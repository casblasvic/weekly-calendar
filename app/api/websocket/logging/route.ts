/**
 * ========================================
 * WEBSOCKET LOGGING CONTROL API - CONTROL DE LOGGING POR TIPO
 * ========================================
 * 
 * 🔧 API DE CONTROL DE LOGGING WEBSOCKET POR TIPO
 * Este endpoint permite activar/desactivar el sistema de logging para todas las
 * conexiones WebSocket de un tipo específico (SHELLY, SOCKET_IO, etc.).
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * Endpoint para controlar logging masivo de conexiones WebSocket
 * @see docs/AUTHENTICATION_PATTERNS.md
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * CRÍTICO: Siempre usar: import { prisma } from '@/lib/db';
 * Esta es la única importación válida para Prisma en el proyecto.
 * 
 * 🎯 OPERACIONES SOPORTADAS:
 * 
 * **PUT - Actualizar Estado de Logging por Tipo:**
 * - Habilitar/deshabilitar logging para todas las conexiones de un tipo
 * - Validación de permisos por systemId
 * - Actualización masiva del estado
 * 
 * **GET - Consultar Estado de Logging por Tipo:**
 * - Obtener estadísticas de logging por tipo de conexión
 * - Conteo de conexiones con logging habilitado/deshabilitado
 * - Información agregada por tipo
 * 
 * 📤 ESTRUCTURA DE REQUEST (PUT):
 * ```typescript
 * {
 *   type: string,            // "SHELLY", "SOCKET_IO", etc.
 *   loggingEnabled: boolean  // true para habilitar, false para deshabilitar
 * }
 * ```
 * 
 * 📤 ESTRUCTURA DE RESPUESTA:
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     type: string,
 *     affectedConnections: number,
 *     loggingEnabled: boolean,
 *     lastUpdated: string
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { WebSocketConnectionService } from '@/lib/websocket/connection-service';

const webSocketConnectionService = new WebSocketConnectionService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener estadísticas de logging por tipo
    // Manejo gracioso para cuando el campo loggingEnabled no existe aún
    try {
      const connectionStats = await prisma.webSocketConnection.groupBy({
        by: ['type', 'loggingEnabled'],
        where: {
          systemId: session.user.systemId // 🛡️ FILTRO MULTI-TENANT CRÍTICO
        },
        _count: {
          id: true
        }
      });

      // Organizar estadísticas por tipo
      const statsByType: Record<string, { enabled: number; disabled: number; total: number }> = {};

      connectionStats.forEach(stat => {
        if (!statsByType[stat.type]) {
          statsByType[stat.type] = { enabled: 0, disabled: 0, total: 0 };
        }
        
        if (stat.loggingEnabled) {
          statsByType[stat.type].enabled = stat._count.id;
        } else {
          statsByType[stat.type].disabled = stat._count.id;
        }
        
        statsByType[stat.type].total += stat._count.id;
      });

      return NextResponse.json({
        success: true,
        data: statsByType
      });
    } catch (fieldError: any) {
      // Si el campo loggingEnabled no existe, devolver estadísticas básicas
      if (fieldError.message?.includes('loggingEnabled')) {
        console.warn('⚠️ Campo loggingEnabled no existe, devolviendo estadísticas básicas');
        
        // Obtener estadísticas básicas por tipo sin el campo loggingEnabled
        const basicStats = await prisma.webSocketConnection.groupBy({
          by: ['type'],
          where: {
            systemId: session.user.systemId
          },
          _count: {
            id: true
          }
        });

        const statsByType: Record<string, { enabled: number; disabled: number; total: number }> = {};
        
        basicStats.forEach(stat => {
          statsByType[stat.type] = {
            enabled: stat._count.id, // Asumir que están habilitados por defecto
            disabled: 0,
            total: stat._count.id
          };
        });

        return NextResponse.json({
          success: true,
          data: statsByType,
          warning: 'Campo loggingEnabled no existe en la base de datos. Ejecute la migración para habilitar el control de logging.'
        });
      }
      throw fieldError;
    }

  } catch (error) {
    console.error('Error obteniendo estadísticas de logging:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { type, loggingEnabled } = body;

    // Validar parámetros
    if (!type || typeof type !== 'string') {
      return NextResponse.json({ 
        error: 'type es requerido y debe ser un string' 
      }, { status: 400 });
    }

    if (typeof loggingEnabled !== 'boolean') {
      return NextResponse.json({ 
        error: 'loggingEnabled debe ser un boolean' 
      }, { status: 400 });
    }

    // Validar tipos permitidos
    const allowedTypes = ['SHELLY', 'SOCKET_IO', 'CUSTOM', 'TEST'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ 
        error: `Tipo no válido. Tipos permitidos: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Actualizar estado del logging para todas las conexiones del tipo
    const affectedCount = await webSocketConnectionService.updateLoggingEnabledByType(
      type,
      session.user.systemId,
      loggingEnabled
    );

    return NextResponse.json({
      success: true,
      data: {
        type,
        affectedConnections: affectedCount,
        loggingEnabled,
        lastUpdated: new Date().toISOString()
      },
      message: `Logging ${loggingEnabled ? 'habilitado' : 'deshabilitado'} para ${affectedCount} conexiones tipo ${type}`
    });

  } catch (error) {
    console.error('Error actualizando estado de logging por tipo:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 