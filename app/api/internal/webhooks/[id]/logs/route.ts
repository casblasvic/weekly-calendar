import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const resolvedParams = await params
    const webhookId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    
    // Parámetros de consulta
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'success', 'error', 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const since = searchParams.get('since') // Para modo escucha

    // Verificar que el webhook existe y pertenece al sistema
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        systemId: session.user.systemId
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })
    }

    // Construir filtros
    const filters: any = {
      webhookId
    }

    // Filtro por estado
    if (status === 'success') {
      filters.AND = [
        { statusCode: { gte: 200 } },
        { statusCode: { lt: 300 } }
      ]
    } else if (status === 'error') {
      filters.OR = [
        { statusCode: { gte: 400 } },
        { processingErrors: { isEmpty: false } }
      ]
    }

    // Filtro por fecha (modo escucha usa 'since')
    if (since) {
      filters.timestamp = {
        gte: new Date(since)
      }
    } else if (startDate || endDate) {
      filters.timestamp = {}
      if (startDate) {
        filters.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        filters.timestamp.lte = new Date(endDate)
      }
    }

    // Obtener logs con paginación
    const [logs, totalCount] = await Promise.all([
      prisma.webhookLog.findMany({
        where: filters,
        orderBy: { timestamp: 'desc' },
        take: Math.min(limit, 100), // Máximo 100 logs por request
        skip: offset,
        select: {
          id: true,
          method: true,
          url: true,
          statusCode: true,
          timestamp: true,
          wasProcessed: true,
          sourceIp: true,
          userAgent: true,
          responseTime: true,
          body: true,
          queryParams: true, // Para requests GET
          headers: true, // Headers de la petición
          responseBody: true,
          validationErrors: true,
          processingErrors: true,
          isValid: true
        }
      }),
      prisma.webhookLog.count({
        where: filters
      })
    ])

    // Para modo escucha, retornar directamente los logs sin estadísticas
    if (since) {
      return NextResponse.json(logs)
    }

    // Calcular estadísticas básicas para el modo normal
    const stats = {
      total: totalCount,
      success: await prisma.webhookLog.count({
        where: {
          webhookId,
          statusCode: {
            gte: 200,
            lt: 300
          }
        }
      }),
      errors: await prisma.webhookLog.count({
        where: {
          webhookId,
          OR: [
            { statusCode: { gte: 400 } },
            { processingErrors: { isEmpty: false } }
          ]
        }
      }),
      avgResponseTime: logs.length > 0 ? Math.round(
        logs.reduce((acc, log) => acc + (log.responseTime || 0), 0) / logs.length
      ) : 0
    }

    return NextResponse.json({
      success: true,
      logs,
      stats,
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error("Error fetching webhook logs:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
} 