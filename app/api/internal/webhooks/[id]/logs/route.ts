import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

// GET /api/internal/webhooks/[id]/logs - Obtener logs de un webhook
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Accedemos a params DESPUÉS del primer await
  const resolvedParams = await params
  const webhookId = resolvedParams.id

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter')
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  try {
    const whereClause: any = {
      webhookId: webhookId,
      ...(filter === 'errors' && { isSuccess: false })
    }

    const [logs, totalCount] = await prisma.$transaction([
        prisma.webhookLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.webhookLog.count({ where: whereClause })
    ]);

    return NextResponse.json({
        logs,
        totalCount
    });
  } catch (error) {
    console.error(`Error fetching logs for webhook ${webhookId}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/internal/webhooks/[id]/logs - Eliminar todos los logs de un webhook
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    const session = await auth()
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Accedemos a params DESPUÉS del primer await
    const resolvedParams = await params
    const webhookId = resolvedParams.id

    try {
        // Verificación extra: Asegurarse de que el webhook pertenece al systemId del usuario
        const webhook = await prisma.webhook.findFirst({
            where: { 
                id: webhookId,
                systemId: session.user.systemId
            }
        });

        if (!webhook) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.webhookLog.deleteMany({
            where: {
                webhookId: webhookId,
            },
        });

        return NextResponse.json({ message: 'Logs deleted successfully' });
    } catch (error) {
        console.error(`Error deleting logs for webhook ${webhookId}:`, error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 