import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateExpectedEnergy } from '@/lib/energy/calculate-expected-energy'
import { finalizeDeviceUsage } from '@/lib/energy/usage-finalizer'
import { ENERGY_INSIGHT_CFG } from '@/config/energy-insights'
import { shellyWebSocketManager } from '@/lib/shelly/websocket-manager'

/**
 * POST /api/internal/device-usage/live-sample
 * Body: { deviceId, currentPower, relayOn, totalEnergy }
 * 
 * Sincroniza en tiempo real el registro activo de appointment_device_usage
 * No usa ningún cron ni timer; se invoca desde el cliente cada vez que llega
 * un mensaje Shelly (≈8 s).
 */
export async function POST(req: NextRequest) {
  console.log('[LIVE-SAMPLE] ---- Nueva llamada recibida ----')
  try {
    const session = await auth()
    if (!session?.user?.systemId || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { deviceId, currentPower, relayOn, totalEnergy } = await req.json()

    // 0️⃣ La inserción del sample crudo se realizará tras localizar usage ↓

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId requerido' }, { status: 400 })
    }

    console.log('[LIVE-SAMPLE] Payload:', { deviceId, currentPower, relayOn })

    // 1️⃣ BÚSQUEDA DIRECTA POR deviceId (lo normal en registros nuevos)
    let usage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        deviceId,
        systemId: session.user.systemId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] }
      }
    })

    // 2️⃣ Fallback legacy → buscar por equipmentClinicAssignmentId del enchufe
    if (!usage) {
      const assignment = await prisma.smartPlugDevice.findUnique({
        where: { id: deviceId },
        select: { equipmentClinicAssignmentId: true }
      })

      if (assignment?.equipmentClinicAssignmentId) {
        usage = await prisma.appointmentDeviceUsage.findFirst({
          where: {
            equipmentClinicAssignmentId: assignment.equipmentClinicAssignmentId,
            systemId: session.user.systemId,
            currentStatus: { in: ['ACTIVE', 'PAUSED'] }
          }
        })

        if (usage) {
          console.log('[LIVE-SAMPLE] fallback-hit -> usageId', usage.id)

          // Corrige el registro añadiendo deviceId para futuras llamadas
          try {
            await prisma.appointmentDeviceUsage.update({
              where: { id: usage.id },
              data: { deviceId }
            })
          } catch (e) {
            console.error('Error corrigiendo deviceId en uso legacy', e)
          }
        }
      }
    } else {
      console.log('[LIVE-SAMPLE] direct-hit -> usageId', usage.id)
    }

    if (!usage) {
      return NextResponse.json({ updated: false })
    }

    // Extraer deviceData para servicesInfo (si existe)
    const deviceDataIn = (usage.deviceData as any) ?? {}

    // Timestamp reference para toda la función
    const now = new Date()

    // 0️⃣ Registrar lectura cruda en smart_plug_power_samples una vez resuelto usage
    try {
      const appointmentInfo = await prisma.appointment.findUnique({
        where: { id: usage.appointmentId },
        select: { clinicId: true, personId: true }
      })

      await prisma.smartPlugPowerSample.create({
        data: {
          systemId: usage.systemId,
          clinicId: appointmentInfo?.clinicId ?? 'unknown',
          clientId: appointmentInfo?.personId ?? null,
          userId: session.user.id,
          deviceId,
          usageId: usage.id,
          timestamp: new Date(),
          watts: typeof currentPower === 'number' ? currentPower : 0,
          totalEnergy: typeof totalEnergy === 'number' ? totalEnergy : 0,
          relayOn: relayOn === true
        }
      })
    } catch (e) {
      console.error('Error insertando power sample', e)
    }

    let startedAt: Date = usage.startedAt as unknown as Date

    // Determinar si cuenta como tiempo de uso efectivo
    const threshold = (usage.deviceData as any)?.powerThreshold ?? 0.1

    const lastSampleAtStr: string | undefined = deviceDataIn.lastSampleAt
    const lastSampleAt = lastSampleAtStr ? new Date(lastSampleAtStr) : (startedAt ?? now)

    let minutes = usage.actualMinutes ?? 0

    const deltaMs = now.getTime() - lastSampleAt.getTime()
    const deltaMinutes = deltaMs / 1000 / 60

    const shouldCountTime = relayOn === true && typeof currentPower === 'number' && currentPower > threshold

    // Si es la primera vez que contamos tiempo real, actualizar startedAt
    if (shouldCountTime) {
      if (!usage.startedAt) {
        await prisma.appointmentDeviceUsage.update({
          where: { id: usage.id },
          data: { startedAt: now }
        })
        startedAt = now
      }
      minutes += deltaMinutes
    }

    // Siempre refrescamos lastSampleAt para evitar sumar minutos fantasma
    const nextLastSampleAtIso = now.toISOString()

    console.log('[LIVE-SAMPLE] deviceId=%s relayOn=%s power=%s countTime=%s deltaMin=%s totalMinutes=%s', deviceId, relayOn, currentPower, shouldCountTime, deltaMinutes.toFixed(3), minutes.toFixed(3))

    // Calcular energía incremental si totalEnergy disponible
    let energyConsumption = usage.energyConsumption ?? 0

    // =======  USAGE STATUS CALCULO BASADO EN TOLERANCIA TIEMPO ========
    const diffMinutes = minutes - (usage.estimatedMinutes ?? 0)
    const toleranceColor = ENERGY_INSIGHT_CFG.timeToleranceMinutes // solo UI
    const marginSeconds = 15 // 15 segundos de margen para over_stopped
    const diffMinutesWithMargin = minutes - ((usage.estimatedMinutes ?? 0) + (marginSeconds / 60))
    
    let usageStatus: 'completed_ok' | 'over_stopped' | 'over_consuming' | null = null

    // ⚠️ LÓGICA CORREGIDA: Diferenciar entre consumo real y tiempo excedido
    if (!relayOn && Math.abs(diffMinutes) <= toleranceColor) {
      // Dispositivo apagado dentro del tiempo tolerado
      usageStatus = 'completed_ok'
    } else if (relayOn && shouldCountTime && diffMinutes > 0) {
      // 🔵 AZUL CLARO: Dispositivo ON + consumiendo watts + tiempo excedido
      usageStatus = 'over_consuming'
    } else if (!relayOn && diffMinutesWithMargin > 0) {
      // 🟡 AMARILLO: Dispositivo OFF + tiempo excedido (con margen de 15s)
      usageStatus = 'over_stopped'
    } else if (!relayOn && diffMinutes <= 0) {
      // 🟣 ÍNDIGO: Dispositivo apagado dentro del tiempo estimado
      usageStatus = 'completed_ok'
    }

    // Calcular energía incremental si totalEnergy disponible
    if (typeof totalEnergy === 'number') {
      const lastTotal = (usage.deviceData as any)?.lastTotalEnergy ?? 0
      const delta = Math.max(0, totalEnergy - lastTotal)
      energyConsumption += delta
    } else if (shouldCountTime && typeof currentPower === 'number') {
      // Fallback para dispositivos sin totalEnergy: kW = W/1000; Wh = kW * h = W*min/60000
      const deltaWh = (currentPower * deltaMinutes) / 60
      energyConsumption += deltaWh / 1000 // almacenar en kWh
    }

    // =======  ENERGY INSIGHT DETECTION  ==========
    let insightCreated = false
    try {
      const { expectedKwh, stdDevSum, confidence, validProfiles, totalProfiles } = await calculateExpectedEnergy(usage)

      if (expectedKwh > 0 && confidence !== 'insufficient_data') {
        const deviationPct = (energyConsumption - expectedKwh) / expectedKwh

        const exceeds = deviationPct > ENERGY_INSIGHT_CFG.deviationPct &&
          energyConsumption > expectedKwh + Math.max(stdDevSum * ENERGY_INSIGHT_CFG.sigmaMultiplier, expectedKwh * ENERGY_INSIGHT_CFG.deviationPct)

        if (exceeds) {
          // Verificar si ya existe
          const existing = await prisma.deviceUsageInsight.findFirst({
            where: {
              appointmentId: usage.appointmentId,
              insightType: 'OVER_CONSUMPTION',
              resolved: false
            }
          })

          if (!existing) {
            const appointmentData = await prisma.appointment.findUnique({
              where: { id: usage.appointmentId },
              select: { personId: true }
            })

            await prisma.deviceUsageInsight.create({
              data: {
                systemId: usage.systemId,
                appointmentId: usage.appointmentId,
                deviceUsageId: usage.id,
                equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId ?? null,
                clientId: appointmentData?.personId ?? null,
                insightType: 'OVER_CONSUMPTION',
                actualKwh: energyConsumption,
                expectedKwh,
                deviationPct: deviationPct * 100,
                detailJson: {
                  stdDevSum,
                  confidence,
                  validProfiles,
                  totalProfiles,
                  timestamp: now.toISOString()
                }
              }
            })

            // Emitir WebSocket si está disponible
            try {
              if (global.broadcastDeviceUpdate) {
                global.broadcastDeviceUpdate(usage.systemId, {
                  type: 'device-usage-insight',
                  appointmentId: usage.appointmentId,
                  deviceUsageId: usage.id,
                  deviationPct: deviationPct * 100,
                  confidence
                })
              }
            } catch {}

            insightCreated = true
          }
        }
      } else if (confidence === 'insufficient_data') {
        console.warn(`[ENERGY] Datos insuficientes para detectar anomalías en uso ${usage.id}`)
      }
    } catch (e) {
      console.error('Error calculando energía esperada', e)
    }

    // Construir update
    const data: any = {
      actualMinutes: minutes,
      energyConsumption,
      updatedAt: now,
      deviceData: {
        lastTotalEnergy: totalEnergy ?? null,
        lastPower: currentPower ?? null,
        lastRelay: relayOn,
        lastSampleAt: nextLastSampleAtIso,
        powerThreshold: threshold
      }
    }

    // 🕒 Preparar array de intervalos de pausa reutilizable
    let pauseIntervals: any[] = Array.isArray(usage.pauseIntervals)
      ? [...(usage.pauseIntervals as any[])]
      : []

    // --------------------- STATE TRANSITIONS ---------------------
    // 1. Device turned OFF during ACTIVE → marcar como PAUSED (reanudable)
    if (relayOn === false && usage.currentStatus === 'ACTIVE') {
      // Registrar nuevo intervalo de pausa
      pauseIntervals.push({ pausedAt: now.toISOString() })

      await prisma.appointmentDeviceUsage.update({
        where: { id: usage.id },
        data: {
          actualMinutes: minutes,
          energyConsumption,
          currentStatus: 'PAUSED',
          pausedAt: now,
          pauseIntervals,
          endedReason: 'POWER_OFF_REANUDABLE',
          deviceData: data.deviceData
        }
      })
       
      return NextResponse.json({ updated: true, warning: false, endedReason: 'POWER_OFF_REANUDABLE' })
    }

    // 2. Manage pause/resume
    if (relayOn === false && usage.currentStatus === 'PAUSED') {
      // Sigue en pausa; no se realiza cambio adicional
    }

    if (relayOn === true && usage.currentStatus === 'PAUSED') {
      data.currentStatus = 'ACTIVE'
      data.pausedAt = null
      const lastInt = pauseIntervals[pauseIntervals.length - 1]
      if (lastInt && !lastInt.resumedAt) {
        lastInt.resumedAt = now.toISOString()
      }
      data.pauseIntervals = pauseIntervals
    }

    const updated = await prisma.appointmentDeviceUsage.update({
      where: { id: usage.id },
      data
    })

    const warning = diffMinutes > 0

    // Emitir cambio de estado si corresponde
    if (usageStatus && global.broadcastDeviceUpdate) {
      try {
        global.broadcastDeviceUpdate(usage.systemId, {
          type: 'usage_status_change',
          appointmentId: usage.appointmentId,
          deviceUsageId: usage.id,
          status: usageStatus
        })
      } catch {}
    }

    // Auto-shutdown / cierre automático
    let finalEndedReason: 'AUTO_SHUTDOWN' | null = null

    if (warning && usage.currentStatus !== 'COMPLETED') {
      console.log('[AUTO-OFF] Se superó tiempo estimado + tolerancia', {
        usageId: usage.id,
        estimated: usage.estimatedMinutes,
        actual: updated.actualMinutes,
        diff: diffMinutes.toFixed(2)
      })

      // Buscar enchufe por deviceId (Shelly) primero; fallback por id UUID
      const smartPlug = await prisma.smartPlugDevice.findFirst({ where: { deviceId } })
        ?? await prisma.smartPlugDevice.findUnique({ where: { id: deviceId } })
 
      // 1️⃣ Si el enchufe sigue encendido y el autoShutdown está habilitado → apagar y cerrar
      if (smartPlug?.autoShutdownEnabled && relayOn) {
        try {
          // 1️⃣ Apagar el enchufe de forma segura
          console.log('[AUTO-OFF] Enviando comando OFF a enchufe', { deviceId: smartPlug.deviceId, cloudId: smartPlug.cloudId })
          if (!smartPlug.credentialId) {
            console.warn('[AUTO-OFF] El enchufe no tiene credentialId, no se puede enviar comando OFF')
          } else {
            await shellyWebSocketManager.controlDevice(
              smartPlug.credentialId,
              smartPlug.deviceId,
              'off'
            )
            console.log('[AUTO-OFF] Comando OFF enviado correctamente via WebSocket')
          }
        } catch (e) {
          console.error('auto-shutdown error', e)
        }

        // 2️⃣ Cerrar el registro de uso con endedReason = AUTO_SHUTDOWN
        try {
          const diff = (updated.actualMinutes ?? 0) - (updated.estimatedMinutes ?? 0)
          const outcome = diff < 0 ? 'EARLY' : diff === 0 ? 'ON_TIME' : 'EXTENDED'

          const finalStatusValue = diff > 0 ? 'over_stopped' : 'completed_ok'

          await prisma.appointmentDeviceUsage.update({
            where: { id: usage.id },
            data: {
              endedAt: new Date(),
              currentStatus: 'COMPLETED',
              endedReason: 'AUTO_SHUTDOWN',
              usageOutcome: outcome,
              // Guardamos último snapshot de deviceData
              deviceData: {
                ...data.deviceData,
                autoShutdownAt: new Date().toISOString(),
                finalStatus: finalStatusValue
              }
            }
          })

          finalEndedReason = 'AUTO_SHUTDOWN'

          const finalStatus = finalStatusValue

          // Emitir WebSocket (mismo payload que en rama relayOn)
          try {
            if (global.broadcastDeviceUpdate) {
              global.broadcastDeviceUpdate(usage.systemId, {
                type: 'usage_status_change',
                appointmentId: usage.appointmentId,
                deviceUsageId: usage.id,
                status: finalStatus
              })
              global.broadcastDeviceUpdate(usage.systemId, {
                type: 'auto_shutdown',
                appointmentId: usage.appointmentId,
                deviceUsageId: usage.id
              })
            }
          } catch {}

          // ▶️ Ejecutar finalización (desagregación + perfiles + insights tiempo)
          await finalizeDeviceUsage(usage.id)
        } catch (e) {
          console.error('error updating usage on auto-shutdown (relay already off)', e)
        }
      } else if (!relayOn) {
        // 2️⃣ El enchufe ya está apagado ⇒ solo cerrar el registro una vez

        try {
          const diff = (updated.actualMinutes ?? 0) - (updated.estimatedMinutes ?? 0)
          const outcome = diff < 0 ? 'EARLY' : diff === 0 ? 'ON_TIME' : 'EXTENDED'

          const finalStatusValue = diff > 0 ? 'over_stopped' : 'completed_ok'

          await prisma.appointmentDeviceUsage.update({
            where: { id: usage.id },
            data: {
              endedAt: new Date(),
              currentStatus: 'COMPLETED',
              endedReason: 'AUTO_SHUTDOWN',
              usageOutcome: outcome,
              deviceData: {
                ...data.deviceData,
                autoShutdownAt: new Date().toISOString(),
                finalStatus: finalStatusValue
              }
            }
          })

          finalEndedReason = 'AUTO_SHUTDOWN'

          const finalStatus = finalStatusValue

          // Emitir WebSocket (mismo payload que en rama relayOn)
          try {
            if (global.broadcastDeviceUpdate) {
              global.broadcastDeviceUpdate(usage.systemId, {
                type: 'usage_status_change',
                appointmentId: usage.appointmentId,
                deviceUsageId: usage.id,
                status: finalStatus
              })
              global.broadcastDeviceUpdate(usage.systemId, {
                type: 'auto_shutdown',
                appointmentId: usage.appointmentId,
                deviceUsageId: usage.id
              })
            }
          } catch {}

          await finalizeDeviceUsage(usage.id)
        } catch (e) {
          console.error('error updating usage on auto-shutdown (relay already off)', e)
        }
      }
    }

    return NextResponse.json({ updated: true, warning, endedReason: finalEndedReason, insightCreated })
  } catch (e) {
    console.error('live-sample error', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
} 