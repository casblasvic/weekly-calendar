/**
 * 🔬 SEED ANOMALÍAS OPTIMIZADO - Energy Insights Test Data
 * ========================================================
 * 
 * Versión optimizada que genera datos mínimos pero suficientes
 * para probar el sistema de anomalías sin tardar 20 minutos.
 * 
 * OPTIMIZACIONES:
 * - Reduce drásticamente la cantidad de citas
 * - Usa datos pre-calculados en lugar de simulaciones complejas
 * - Elimina generación de power readings individuales
 * - Solo crea scores básicos de anomalías
 */

import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

export async function seedAnomalias(prisma: PrismaClient, systemId: string) {
  console.log('🔬 Seeding Anomalies (Optimized)...')

  try {
    // Obtener datos básicos
    const persons = await prisma.person.findMany({
      where: { systemId },
      take: 2
    })

    const users = await prisma.user.findMany({
      where: { systemId },
      take: 2
    })

    const clinics = await prisma.clinic.findMany({
      where: { systemId },
      take: 1
    })

    if (persons.length === 0 || users.length === 0 || clinics.length === 0) {
      console.log('Not enough base data for anomalies, skipping')
      return
    }

    const clinic = clinics[0]

    // Crear scores de anomalías básicos usando createMany
    const clientScores = persons.map((person, index) => ({
      id: createId(),
      systemId: systemId,
      clinicId: clinic.id,
      clientId: person.id,
      totalServices: 5 + index * 3,
      totalAnomalies: index,
      anomalyRate: index * 10.5,
      avgDeviationPercent: index * 15.2,
      maxDeviationPercent: index * 25.8,
      riskScore: index * 30,
      riskLevel: index === 0 ? 'low' : 'medium'
    }))

    const employeeScores = users.map((user, index) => ({
      id: createId(),
      systemId: systemId,
      clinicId: clinic.id,
      employeeId: user.id,
      totalServices: 10 + index * 5,
      totalAnomalies: index,
      anomalyRate: index * 8.3,
      avgEfficiency: 95 - index * 5,
      consistencyScore: 90 - index * 3,
      riskScore: index * 25,
      riskLevel: index === 0 ? 'low' : 'medium'
    }))

    // Insertar todos los scores de una vez
    await prisma.clientAnomalyScore.createMany({
      data: clientScores,
      skipDuplicates: true
    })

    await prisma.employeeAnomalyScore.createMany({
      data: employeeScores,
      skipDuplicates: true
    })

    console.log(`✅ Created ${clientScores.length} client scores and ${employeeScores.length} employee scores optimized`)

  } catch (error) {
    console.error('❌ Error seeding anomalies:', error)
    // No fallar el seed completo por este error
  }
} 