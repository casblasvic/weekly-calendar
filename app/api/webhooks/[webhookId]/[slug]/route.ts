import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RouteContext {
  params: Promise<{
    webhookId: string
    slug: string
  }>
}

async function handleWebhookProcessing(
  request: NextRequest,
  webhookId: string,
  slug: string,
  method: string
) {
  try {
    // Obtener el webhook por ID y slug para mayor seguridad
    const webhook = await prisma.webhook.findFirst({
      where: { 
        id: webhookId,
        slug: slug
      },
      include: {
        system: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Verificar si el webhook está activo
    if (!webhook.isActive) {
      return NextResponse.json(
        { error: 'Webhook is disabled' },
        { status: 403 }
      )
    }

    // Verificar método permitido
    const allowedMethods = Array.isArray(webhook.allowedMethods) 
      ? webhook.allowedMethods 
      : []
    
    if (!allowedMethods.includes(method)) {
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      )
    }

    // Obtener datos del request
    const body = method !== 'GET' ? await request.text() : null
    const headers = Object.fromEntries(request.headers.entries())
    const sourceIp = headers['x-forwarded-for']?.split(',')[0] || 
                    headers['x-real-ip'] || 
                    'unknown'

    // Registrar el log
    const logData = {
      webhookId: webhook.id,
      systemId: webhook.systemId,
      method,
      url: request.url,
      headers,
      body,
      sourceIp,
      isSuccess: true,
      wasProcessed: false,
      statusCode: 200,
      retries: 0
    }

    try {
      // Aquí iría la lógica de procesamiento del webhook
      // Por ahora solo registramos y devolvemos éxito
      
      await prisma.webhookLog.create({
        data: logData
      })

      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
        webhookId: webhook.id,
        timestamp: new Date().toISOString()
      })

    } catch (processingError) {
      console.error('Error processing webhook:', processingError)
      
      // Registrar el error
      await prisma.webhookLog.create({
        data: {
          ...logData,
          isSuccess: false,
          processingError: processingError instanceof Error ? processingError.message : 'Unknown error',
          statusCode: 500
        }
      })

      return NextResponse.json(
        { error: 'Error processing webhook' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in webhook handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Manejar todos los métodos HTTP
export async function GET(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'GET')
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'POST')
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'PUT')
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'PATCH')
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'DELETE')
}

export async function HEAD(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'HEAD')
}

export async function OPTIONS(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'OPTIONS')
} 