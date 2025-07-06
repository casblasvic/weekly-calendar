import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureShellyOnline, ShellyOfflineError } from '@/lib/shelly/ensure-shelly-online'

export async function POST(_req: Request, { params }: { params: { deviceId: string } }) {
  const session = await auth()

  // Circuit-breaker: evitar comandos si tiempo real está caído
  try {
    ensureShellyOnline()
  } catch (e) {
    if (e instanceof ShellyOfflineError) {
      return NextResponse.json({ error: 'Shelly offline' }, { status: 503 })
    }
    throw e
  }

  // Lógica actual control
} 