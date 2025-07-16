import { NextRequest, NextResponse } from "next/server"
import { prisma, Prisma } from '@/lib/db';
// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db
import { auth } from "@/lib/auth"
import { getSiteUrl } from '@/lib/utils/site-url'

export async function PATCH(
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
    const data = await request.json()
    
    console.log("Updating webhook with data:", JSON.stringify(data, null, 2))

    // Verificar que el webhook existe y pertenece al sistema
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        systemId: session.user.systemId
      }
    })

    if (!existingWebhook) {
      return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })
    }

    // Si se cambia el slug, verificar que esté disponible
    if (data.slug && data.slug !== existingWebhook.slug) {
      const slugExists = await prisma.webhook.findFirst({
        where: {
          slug: data.slug,
          systemId: session.user.systemId,
          id: { not: webhookId }
        }
      })

      if (slugExists) {
        return NextResponse.json({ error: "El slug ya está en uso" }, { status: 400 })
      }
    }

    // Preparar datos de actualización solo con campos válidos del modelo
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.direction !== undefined) updateData.direction = data.direction
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.allowedMethods !== undefined) updateData.allowedMethods = data.allowedMethods
    if (data.customHeaders !== undefined) updateData.customHeaders = data.customHeaders || {}
    if (data.rateLimitPerMinute !== undefined) updateData.rateLimitPerMinute = data.rateLimitPerMinute
    if (data.ipWhitelist !== undefined) updateData.ipWhitelist = data.ipWhitelist || []
    if (data.targetUrl !== undefined) updateData.targetUrl = data.targetUrl
    if (data.triggerEvents !== undefined) updateData.triggerEvents = data.triggerEvents || []
    if (data.expectedSchema !== undefined) updateData.expectedSchema = data.expectedSchema
    if (data.samplePayload !== undefined) updateData.samplePayload = data.samplePayload
    if (data.dataMapping !== undefined) updateData.dataMapping = data.dataMapping
    if (data.responseConfig !== undefined) updateData.responseConfig = data.responseConfig
    
    // ===== LÓGICA DE SEGURIDAD REFACTORIZADA Y CORREGIDA =====
    console.log("Processing security with authType:", data.authType);

    if (data.authType) {
        updateData.requiresAuth = data.authType !== 'none';

        switch (data.authType) {
            case "bearer":
                // Si es bearer, guardamos el token y nos aseguramos que la secretKey sea null
                updateData.token = data.token;
                updateData.secretKey = null;
                console.log(`✅ Bearer token set. Secret key cleared.`);
                break;

            case "hmac":
                // Si es HMAC, guardamos la secretKey y nos aseguramos que el token sea null
                updateData.secretKey = data.secretKey;
                updateData.token = null;
                console.log(`✅ HMAC secret set. Token cleared.`);
                break;
            
            case "none":
                // Si no hay auth, limpiamos ambos campos para evitar conflictos
                updateData.token = null;
                updateData.secretKey = null;
                console.log("✅ Security cleared. Token and secret key are null.");
                break;
            
            default:
                // Por si llega un authType no esperado, no hacemos cambios en la seguridad.
                console.log(`⚠️ AuthType no reconocido: ${data.authType}. No se realizarán cambios de seguridad.`);
                break;
        }
    }
    
    updateData.updatedAt = new Date()

    console.log("Final update data:", JSON.stringify(updateData, null, 2))

    // Actualizar webhook
    const updatedWebhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: updateData
    })

    // Regenerar URL si cambió el slug usando helper estándar
    const baseUrl = getSiteUrl()
    const updatedUrl = `${baseUrl}/api/webhooks/${webhookId}/${updatedWebhook.slug}`

    // Actualizar la URL del webhook si es necesario
    if (updatedWebhook.url !== updatedUrl) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { url: updatedUrl }
      })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...updatedWebhook,
        url: updatedUrl
      }
    })

  } catch (error) {
    console.error("Error updating webhook:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Verificar que el webhook existe y pertenece al sistema
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        systemId: session.user.systemId
      }
    })

    if (!existingWebhook) {
      return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })
    }

    // Eliminar logs relacionados primero (si existen)
    await prisma.webhookLog.deleteMany({
      where: { webhookId }
    })

    // Eliminar el webhook
    await prisma.webhook.delete({
      where: { id: webhookId }
    })

    return NextResponse.json({
      success: true,
      message: "Webhook eliminado correctamente"
    })

  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

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

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
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
            createdAt: true,
            statusCode: true,
            method: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    })

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ webhook })

  } catch (error) {
    console.error('Error fetching webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 