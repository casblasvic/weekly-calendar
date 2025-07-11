import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET (req: NextRequest) {
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const systemId = session.user.systemId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // open | resolved | all
  const dateFrom = searchParams.get('from')
  const dateTo   = searchParams.get('to')

  const where: any = { systemId }
  if (status === 'open') where.resolved = false
  if (status === 'resolved') where.resolved = true
  if (dateFrom) where.detectedAt = { gte: new Date(dateFrom) }
  if (dateTo) {
    where.detectedAt = { ...(where.detectedAt || {}), lte: new Date(dateTo) }
  }

  const insights = await prisma.deviceUsageInsight.findMany({
    where,
    orderBy: { detectedAt: 'desc' },
    take: 200
  })

  return NextResponse.json({ insights })
}

export async function PATCH (req: NextRequest) {
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const { id, resolved, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const insight = await prisma.deviceUsageInsight.update({
    where: { id },
    data: {
      resolved: resolved ?? true,
      resolvedByUserId: session.user.id,
      resolvedAt: new Date(),
      detailJson: notes ? prisma.raw("jsonb_set(detail_json, '{notes}', ?::jsonb)", [JSON.stringify(notes)]) : undefined
    }
  })

  return NextResponse.json({ insight })
} 