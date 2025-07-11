import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateExpectedEnergy } from '@/lib/energy/calculate-expected-energy'
import { Prisma } from '@prisma/client'

interface Body {
  startDate?: string
  endDate?: string
}

export async function POST (req: NextRequest) {
  // Feature-flag: solo si está activo el plugin Shelly
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const systemId = session.user.systemId

  const { startDate, endDate } = (await req.json()) as Body
  const dateFilter: Prisma.AppointmentDeviceUsageWhereInput = {
    startedAt: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined
    }
  }

  // 1) Recalcular perfiles energéticos
  const rawProfiles = await prisma.$queryRawUnsafe<Array<{
    equipmentId: string
    serviceId: string
    avg: number
    stddev: number
    samples: number
  }>>(`
    SELECT "equipmentId", (jsonb_array_elements(deviceData->'servicesDetails')->>'serviceId')::text  AS "serviceId",
           avg("energyConsumption" / NULLIF("actualMinutes",0))                         as avg,
           stddev("energyConsumption" / NULLIF("actualMinutes",0))                      as stddev,
           count(*)::int                                                                  as samples
    FROM "AppointmentDeviceUsage"
    WHERE "systemId" = $1
      AND "currentStatus" = 'COMPLETED'
      AND "actualMinutes" > 0
      ${startDate ? 'AND "startedAt" >= $2' : ''}
      ${endDate ? 'AND "startedAt" <= $3' : ''}
    GROUP BY "equipmentId", "serviceId"`,
    ...(startDate && endDate ? [systemId, new Date(startDate!), new Date(endDate!)] : startDate ? [systemId, new Date(startDate!)] : [systemId])
  )

  for (const p of rawProfiles) {
    await prisma.serviceEnergyProfile.upsert({
      where: {
        systemId_equipmentId_serviceId: {
          systemId, equipmentId: p.equipmentId, serviceId: p.serviceId
        }
      },
      update: {
        avgKwhPerMin: p.avg,
        stdDevKwhPerMin: p.stddev,
        sampleCount: p.samples
      },
      create: {
        systemId,
        equipmentId: p.equipmentId,
        serviceId: p.serviceId,
        avgKwhPerMin: p.avg,
        stdDevKwhPerMin: p.stddev,
        sampleCount: p.samples
      }
    })
  }

  // 2) Re-evaluar usos en rango
  const usages = await prisma.appointmentDeviceUsage.findMany({
    where: {
      systemId,
      currentStatus: 'COMPLETED',
      ...dateFilter
    }
  })

  let insightsCreated = 0
  for (const usage of usages) {
    const { expectedKwh, stdDevSum } = await calculateExpectedEnergy(usage)
    if (expectedKwh === 0) continue

    const deviationPct = (usage.energyConsumption! - expectedKwh) / expectedKwh
    const exceeds = deviationPct > 0.25 &&
      usage.energyConsumption! > expectedKwh + Math.max(stdDevSum * 2, expectedKwh * 0.25)

    if (!exceeds) continue

    const exists = await prisma.deviceUsageInsight.findFirst({
      where: {
        appointmentId: usage.appointmentId,
        insightType: 'OVER_CONSUMPTION',
        resolved: false
      }
    })

    if (!exists) {
      await prisma.deviceUsageInsight.create({
        data: {
          systemId,
          appointmentId: usage.appointmentId,
          deviceUsageId: usage.id,
          equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId ?? null,
          clientId: null,
          insightType: 'OVER_CONSUMPTION',
          actualKwh: usage.energyConsumption ?? 0,
          expectedKwh,
          deviationPct: deviationPct * 100,
          detailJson: { stdDevSum, recalc: true, timestamp: new Date().toISOString() }
        }
      })
      insightsCreated++
    }
  }

  return NextResponse.json({ profiles: rawProfiles.length, insightsCreated })
} 