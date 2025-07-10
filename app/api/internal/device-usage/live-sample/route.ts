import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/internal/device-usage/live-sample
 * Body: { deviceId, currentPower, relayOn, totalEnergy }
 * 
 * Sincroniza en tiempo real el registro activo de appointment_device_usage
 * No usa ningún cron ni timer; se invoca desde el cliente cada vez que llega
 * un mensaje Shelly (≈8 s).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.systemId || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { deviceId, currentPower, relayOn, totalEnergy } = await req.json()
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId requerido' }, { status: 400 })
    }

    // Buscar uso activo o pausado de este dispositivo
    const usage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        deviceId,
        systemId: session.user.systemId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] }
      }
    })

    if (!usage) {
      return NextResponse.json({ updated: false })
    }

    // Calcular minutos reales
    const now = new Date()
    const startedAt = usage.startedAt as unknown as Date
    const minutes = (now.getTime() - startedAt.getTime()) / 1000 / 60

    // Calcular energía incremental si totalEnergy disponible
    let energyConsumption = usage.energyConsumption ?? 0
    if (typeof totalEnergy === 'number') {
      const lastTotal = (usage.deviceData as any)?.lastTotalEnergy ?? 0
      const delta = Math.max(0, totalEnergy - lastTotal)
      energyConsumption += delta
    }

    // Construir update
    const data: any = {
      actualMinutes: minutes,
      energyConsumption,
      updatedAt: now,
      deviceData: {
        lastTotalEnergy: totalEnergy ?? null,
        lastPower: currentPower ?? null,
        lastRelay: relayOn
      }
    }

    // --------------------- STATE TRANSITIONS ---------------------
    // 1. Device turned OFF during ACTIVE → close record but reactivable
    if (relayOn === false && usage.currentStatus === 'ACTIVE') {
      // close usage
      const diff = minutes - (usage.pauseIntervals ? 0 : 0) // simplified
      let outcome: any = 'ON_TIME'
      if (diff < 0) outcome = 'EARLY'
      else if (diff > 0) outcome = 'EXTENDED'

      await prisma.appointmentDeviceUsage.update({
        where: { id: usage.id },
        data: {
          actualMinutes: minutes,
          energyConsumption,
          endedAt: now,
          currentStatus: 'COMPLETED',
          endedReason: 'POWER_OFF_REANUDABLE',
          usageOutcome: outcome,
          deviceData: data.deviceData
        }
      })

      return NextResponse.json({ updated: true, warning: false, endedReason: 'POWER_OFF_REANUDABLE' })
    }

    // 2. Manage pause/resume as before
    if (relayOn === false && usage.currentStatus === 'PAUSED') {
      // remain paused
    }
    if (relayOn === false && usage.currentStatus === 'PAUSED') {
      // still paused
    }
    if (relayOn === true && usage.currentStatus === 'PAUSED') {
      data.currentStatus = 'ACTIVE'
      data.pausedAt = null
    }

    const updated = await prisma.appointmentDeviceUsage.update({
      where: { id: usage.id },
      data
    })

    const warning = updated.actualMinutes >= updated.estimatedMinutes

    // Auto-shutdown
    if (warning) {
      const smartPlug = await prisma.smartPlugDevice.findFirst({ where: { deviceId } })
      if (smartPlug?.autoShutdownEnabled && relayOn) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/shelly/device/${smartPlug.deviceId}/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'off', reason: 'auto_shutdown' })
          })
        } catch (e) {
          console.error('auto-shutdown error', e)
        }
      }
    }

    return NextResponse.json({ updated: true, warning, endedReason: warning ? 'AUTO_SHUTDOWN' : null })
  } catch (e) {
    console.error('live-sample error', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
} 