/**
 * 🔧 API DE CONFIGURACIÓN DE LOGS WEBSOCKET
 * Endpoints para gestionar la configuración de logs de WebSocket
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const WebSocketLogConfigSchema = z.object({
  liveSample: z.boolean(),
  webSocketRaw: z.boolean(),
  deviceStatusUpdate: z.boolean(),
  deviceUpdate: z.boolean(),
  socketJs: z.boolean(),
  apiCalls: z.boolean()
})

const WebSocketLogSettingsSchema = z.object({
  enabled: z.boolean(),
  config: WebSocketLogConfigSchema,
  lastUpdated: z.string()
})

// Almacén temporal en memoria (en producción usar Redis o base de datos)
let logSettings: any = {
  enabled: true,
  config: {
    liveSample: false,
    webSocketRaw: false,
    deviceStatusUpdate: false,
    deviceUpdate: false,
    socketJs: false,
    apiCalls: false
  },
  lastUpdated: new Date().toISOString()
}

/**
 * GET - Obtener configuración de logs
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: logSettings
    })
  } catch (error) {
    console.error('Error al obtener configuración de logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST - Actualizar configuración de logs
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = WebSocketLogSettingsSchema.parse(body)

    logSettings = {
      ...validatedData,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: logSettings,
      message: 'Configuración de logs actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error al actualizar configuración de logs:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Actualizar tipo específico de log
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { logType, enabled } = body

    if (!logType || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      )
    }

    if (logType === 'enabled') {
      logSettings.enabled = enabled
    } else if (logSettings.config.hasOwnProperty(logType)) {
      logSettings.config[logType] = enabled
    } else {
      return NextResponse.json(
        { error: 'Tipo de log no válido' },
        { status: 400 }
      )
    }

    logSettings.lastUpdated = new Date().toISOString()

    return NextResponse.json({
      success: true,
      data: logSettings,
      message: `Log ${logType} ${enabled ? 'activado' : 'desactivado'} exitosamente`
    })
  } catch (error) {
    console.error('Error al actualizar tipo de log:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Resetear configuración a valores por defecto
 */
export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    logSettings = {
      enabled: true,
      config: {
        liveSample: false,
        webSocketRaw: false,
        deviceStatusUpdate: false,
        deviceUpdate: false,
        socketJs: false,
        apiCalls: false
      },
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: logSettings,
      message: 'Configuración de logs reseteada exitosamente'
    })
  } catch (error) {
    console.error('Error al resetear configuración de logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}