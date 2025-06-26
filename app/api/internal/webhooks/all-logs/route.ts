import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/internal/webhooks/all-logs - Obtener todos los logs de un sistema
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { systemId } = session.user;

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter')

  try {
    const whereClause: any = {
      webhook: {
        systemId: systemId,
      },
    }
    
    if (filter === 'errors') {
      whereClause.isSuccess = false
    }

    const logs = await prisma.webhookLog.findMany({
      where: whereClause,
      include: {
        webhook: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error(`Error fetching all logs for system ${systemId}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 