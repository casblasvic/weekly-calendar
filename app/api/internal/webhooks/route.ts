import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/internal/webhooks - Listar webhooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const systemId = searchParams.get('systemId')
    
    console.log('[Webhooks API] GET request with systemId:', systemId)
    
    if (!systemId) {
      console.error('[Webhooks API] SystemId is missing')
      return NextResponse.json(
        { error: 'SystemId is required' },
        { status: 400 }
      )
    }

    // Verificar si el sistema existe
    const systemExists = await prisma.system.findUnique({
      where: { id: systemId }
    })

    if (!systemExists) {
      console.error('[Webhooks API] System not found:', systemId)
      return NextResponse.json(
        { error: `System with id ${systemId} not found` },
        { status: 404 }
      )
    }

    // Obtener webhooks del sistema
    const webhooks = await prisma.webhook.findMany({
      where: {
        systemId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        logs: {
          select: {
            id: true,
            timestamp: true,
            statusCode: true
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calcular estadísticas
    const stats = {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter(w => w.isActive).length,
      requestsToday: await prisma.webhookLog.count({
        where: {
          webhook: {
            systemId
          },
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      successRate: webhooks.length > 0 ? 
        webhooks.reduce((acc, w) => acc + (w.totalCalls > 0 ? (w.successfulCalls / w.totalCalls) * 100 : 100), 0) / webhooks.length 
        : 0
    }

    // Formatear respuesta
    const formattedWebhooks = webhooks.map(webhook => ({
      id: webhook.id,
      name: webhook.name,
      description: webhook.description,
      slug: webhook.slug,
      direction: webhook.direction,
      isActive: webhook.isActive,
      url: webhook.url,
      allowedMethods: webhook.allowedMethods,
      totalCalls: webhook.totalCalls,
      successfulCalls: webhook.successfulCalls,
      lastTriggered: webhook.lastTriggered,
      createdAt: webhook.createdAt,
      createdBy: webhook.createdBy,
      // Campos adicionales para el modal de edición
      systemId: webhook.systemId,
      token: webhook.token,
      secretKey: webhook.secretKey,
      rateLimitPerMinute: webhook.rateLimitPerMinute,
      ipWhitelist: webhook.ipWhitelist,
      customHeaders: webhook.customHeaders,
      targetUrl: webhook.targetUrl,
      triggerEvents: webhook.triggerEvents,
      expectedSchema: webhook.expectedSchema,
      dataMapping: webhook.dataMapping
    }))

    return NextResponse.json({
      webhooks: formattedWebhooks,
      stats
    })

  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/internal/webhooks - Crear webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      direction,
      slug,
      category,
      allowedMethods,
      requiresAuth,
      customHeaders,
      rateLimitPerMinute,
      ipWhitelist,
      secretKey,
      targetUrl,
      triggerEvents,
      systemId,
      createdByUserId
    } = body

    // Validaciones básicas
    if (!name || !slug || !direction || !systemId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, direction, systemId' },
        { status: 400 }
      )
    }

    // Verificar que el slug sea único en el sistema
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        slug,
        systemId
      }
    })

    if (existingWebhook) {
      return NextResponse.json(
        { error: 'Slug already exists in this system' },
        { status: 409 }
      )
    }

    // Generar token único
    const token = `wh_${systemId.substring(0, 8)}_${Math.random().toString(36).substring(2, 15)}`
    
    // Generar URL del webhook - detección dinámica de puerto
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   `http://localhost:${process.env.PORT || 3001}`
    const webhookUrl = `${baseUrl}/api/webhooks/${systemId}/${slug}`

    // Crear webhook
    const webhook = await prisma.webhook.create({
      data: {
        name,
        description,
        slug,
        direction,
        systemId,
        allowedMethods,
        url: webhookUrl,
        token,
        secretKey,
        rateLimitPerMinute: rateLimitPerMinute || 60,
        ipWhitelist: ipWhitelist || [],
        customHeaders: customHeaders || {},
        targetUrl,
        triggerEvents: triggerEvents || [],
        createdByUserId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        description: webhook.description,
        slug: webhook.slug,
        direction: webhook.direction,
        isActive: webhook.isActive,
        url: webhook.url,
        token: webhook.token,
        allowedMethods: webhook.allowedMethods,
        totalCalls: webhook.totalCalls,
        successfulCalls: webhook.successfulCalls,
        createdAt: webhook.createdAt,
        createdBy: webhook.createdBy
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 