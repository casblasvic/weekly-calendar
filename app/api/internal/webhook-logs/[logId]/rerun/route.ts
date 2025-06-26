import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

// POST /api/internal/webhook-logs/[logId]/rerun - Re-ejecutar un log de webhook fallido
export async function POST(request: NextRequest, { params }: { params: { logId: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { logId } = params

  try {
    // 1. Obtener el log original y el webhook asociado
    const originalLog = await prisma.webhookLog.findUnique({
      where: { id: logId },
      include: { webhook: true },
    })

    if (!originalLog) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    // 2. Verificar permisos: El webhook debe pertenecer al systemId del usuario
    if (originalLog.webhook.systemId !== session.user.systemId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Re-enviar la petición al endpoint público del webhook
    // Usamos la URL almacenada en el webhook, no la del log, por si ha cambiado.
    const webhookUrl = originalLog.webhook.url
    
    const response = await fetch(webhookUrl, {
      method: originalLog.method,
      headers: originalLog.headers as HeadersInit,
      body: originalLog.body ? JSON.stringify(originalLog.body) : null,
    })

    // No necesitamos procesar la respuesta aquí, el endpoint ya habrá creado un nuevo log
    // o actualizado el existente. Simplemente confirmamos que la re-ejecución se disparó.
    if (!response.ok) {
        // La ejecución del webhook falló, pero la acción de "rerun" en sí fue exitosa
        console.warn(`Rerun for log ${logId} resulted in a non-ok response: ${response.status}`);
    }

    // Actualizar el log original para contar el reintento
    await prisma.webhookLog.update({
        where: { id: logId },
        data: { retries: { increment: 1 } }
    });

    return NextResponse.json({ success: true, message: 'Webhook log re-run initiated.' })
  } catch (error) {
    console.error(`Error re-running log ${logId}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 