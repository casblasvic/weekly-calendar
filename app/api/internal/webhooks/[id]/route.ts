import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
import { auth } from "@/lib/auth"

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
    if (data.dataMapping !== undefined) updateData.dataMapping = data.dataMapping
    
    // ===== LÓGICA DE SEGURIDAD MEJORADA =====
    console.log("Processing security with authType:", data.authType)
    
    if (data.authType !== undefined) {
      switch (data.authType) {
        case "bearer":
          // Bearer Token: guardar en 'token', NO tocar 'secretKey'
          if (data.tokenAuth) {
            updateData.token = data.tokenAuth
            console.log("✅ Bearer token saved:", data.tokenAuth)
          }
          // NO establecer secretKey como null, simplemente no lo actualizamos
          break
          
        case "hmac":
          // HMAC: guardar en 'secretKey', NO tocar 'token'
          if (data.hmacSecret) {
            updateData.secretKey = data.hmacSecret
            console.log("✅ HMAC secret saved:", data.hmacSecret)
          }
          // NO establecer token como null, simplemente no lo actualizamos
          break
          
        case "apikey":
          // API Key: tratarlo como Bearer token
          if (data.apiKey || data.tokenAuth) {
            updateData.token = data.apiKey || data.tokenAuth
            console.log("✅ API Key saved:", data.apiKey || data.tokenAuth)
          }
          break
          
        case "none":
          // Sin autenticación: solo limpiamos secretKey (token debe permanecer)
          updateData.secretKey = null
          console.log("✅ Security cleared (secretKey only)")
          break
      }
    } else {
      // Fallback a la lógica anterior si no se especifica authType
      if (data.secretKey !== undefined || data.hmacSecret !== undefined) {
        updateData.secretKey = data.secretKey || data.hmacSecret
      }
      if (data.tokenAuth !== undefined) {
        updateData.token = data.tokenAuth
      }
    }
    
    updateData.updatedAt = new Date()

    console.log("Final update data:", JSON.stringify(updateData, null, 2))

    // Actualizar webhook
    const updatedWebhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: updateData
    })

    // Regenerar URL si cambió el slug - detección dinámica de puerto
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   `http://localhost:${process.env.PORT || 3001}`
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