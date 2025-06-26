import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/internal/webhooks/stats - Obtener estadísticas globales de webhooks
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { systemId } = session.user

  try {
    const twentyFourHoursAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)

    const [totalWebhooks, activeWebhooks, totalErrorsToday] = await Promise.all([
      prisma.webhook.count({ where: { systemId } }),
      prisma.webhook.count({ where: { systemId, isActive: true } }),
      prisma.webhookLog.count({
        where: {
          webhook: {
            systemId: systemId,
          },
          isSuccess: false,
          createdAt: {
            gte: twentyFourHoursAgo,
          },
        },
      }),
    ])

    const totalRequestsToday = await prisma.webhookLog.count({
        where: {
            webhook: { systemId },
            createdAt: { gte: twentyFourHoursAgo }
        }
    });

    const successfulRequestsToday = await prisma.webhookLog.count({
        where: {
            webhook: { systemId },
            createdAt: { gte: twentyFourHoursAgo },
            isSuccess: true
        }
    });

    const successRate = totalRequestsToday > 0 ? (successfulRequestsToday / totalRequestsToday) * 100 : 100;

    return NextResponse.json({
      totalWebhooks,
      activeWebhooks,
      requestsToday: totalRequestsToday,
      successRate: Math.round(successRate),
      totalErrorsToday,
    })
  } catch (error) {
    console.error('Error fetching webhook stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 