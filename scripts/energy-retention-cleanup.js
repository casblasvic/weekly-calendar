#!/usr/bin/env node

/**
 * 🔄 ENERGY INSIGHTS RETENTION & DOWN-SAMPLING SCRIPT
 * 
 * Script para gestionar la retención y down-sampling de datos de energy insights.
 * Ejecuta automáticamente el mantenimiento de las tablas de muestras crudas.
 * 
 * Funciones:
 * 1. Down-sampling: Convierte muestras crudas a agregados por hora
 * 2. Purga: Elimina muestras crudas > 90 días
 * 3. Limpieza: Elimina desagregaciones > 3 años
 * 
 * Uso:
 * node scripts/energy-retention-cleanup.js --system=SYSTEM_ID [--dry-run] [--verbose]
 * 
 * Variables de entorno:
 * - DATABASE_URL: URL de conexión a PostgreSQL
 * - RETENTION_RAW_DAYS: Días de retención para muestras crudas (default: 90)
 * - RETENTION_DISAGGREGATED_YEARS: Años de retención para desagregados (default: 3)
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

// Configuración por defecto
const DEFAULT_CONFIG = {
  retentionRawDays: 90,
  retentionDisaggregatedYears: 3,
  batchSize: 1000,
  maxProcessingTimeMs: 30 * 60 * 1000 // 30 minutos máximo
}

class EnergyRetentionManager {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options }
    this.prisma = new PrismaClient({
      log: this.config.verbose ? ['query', 'info', 'warn', 'error'] : ['error']
    })
    this.stats = {
      samplesProcessed: 0,
      samplesDownsampled: 0,
      samplesDeleted: 0,
      disaggregatedDeleted: 0,
      startTime: new Date(),
      errors: []
    }
  }

  /**
   * Ejecuta el proceso completo de retención
   */
  async run(systemId, isDryRun = false) {
    try {
      this.log(`🚀 Iniciando proceso de retención para sistema: ${systemId}`)
      this.log(`📊 Configuración: raw=${this.config.retentionRawDays}d, disaggregated=${this.config.retentionDisaggregatedYears}y`)
      
      if (isDryRun) {
        this.log('🔍 MODO DRY-RUN: No se realizarán cambios en la base de datos')
      }

      // 1. Down-sampling de muestras crudas a agregados por hora
      await this.downsampleRawSamples(systemId, isDryRun)

      // 2. Purgar muestras crudas antiguas
      await this.purgeOldRawSamples(systemId, isDryRun)

      // 3. Purgar desagregaciones muy antiguas
      await this.purgeOldDisaggregatedData(systemId, isDryRun)

      // 4. Generar reporte final
      this.generateReport()

    } catch (error) {
      this.stats.errors.push(`Error general: ${error.message}`)
      throw error
    } finally {
      await this.prisma.$disconnect()
    }
  }

  /**
   * Down-sampling: Convierte muestras crudas a agregados por hora
   */
  async downsampleRawSamples(systemId, isDryRun) {
    this.log('\n📈 Iniciando down-sampling de muestras crudas...')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - Math.floor(this.config.retentionRawDays / 3)) // Down-sample a partir de 30 días

    try {
      // Obtener rango de fechas para procesar
      const dateRanges = await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', timestamp) as "day",
          COUNT(*)::int as "sampleCount"
        FROM "smart_plug_power_samples"
        WHERE "systemId" = ${systemId}
          AND timestamp < ${cutoffDate}
          AND timestamp NOT IN (
            SELECT DISTINCT DATE_TRUNC('hour', "hourTimestamp")
            FROM "smart_plug_power_sample_hourly"
            WHERE "systemId" = ${systemId}
          )
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY "day"
        LIMIT 30
      `

      if (dateRanges.length === 0) {
        this.log('✅ No hay muestras crudas pendientes de down-sampling')
        return
      }

      this.log(`📊 Procesando ${dateRanges.length} días de muestras para down-sampling`)

      for (const range of dateRanges) {
        await this.downsampleDay(systemId, range.day, isDryRun)
        
        // Control de tiempo máximo de ejecución
        if (Date.now() - this.stats.startTime.getTime() > this.config.maxProcessingTimeMs) {
          this.log('⏰ Tiempo máximo de ejecución alcanzado, pausando down-sampling')
          break
        }
      }

    } catch (error) {
      this.stats.errors.push(`Down-sampling error: ${error.message}`)
      this.log(`❌ Error en down-sampling: ${error.message}`)
    }
  }

  /**
   * Down-sampling de un día específico
   */
  async downsampleDay(systemId, day, isDryRun) {
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)

    const hourlyAggregates = await this.prisma.$queryRaw`
      SELECT 
        "deviceId",
        "usageId",
        DATE_TRUNC('hour', timestamp) as "hourTimestamp",
        AVG(watts)::float as "avgWatts",
        MAX(watts)::float as "maxWatts",
        MIN(watts)::float as "minWatts",
        MAX("totalEnergy") - MIN("totalEnergy") as "hourlyKwh",
        COUNT(*)::int as "sampleCount",
        BOOL_OR("relayOn") as "wasRelayOn"
      FROM "smart_plug_power_samples"
      WHERE "systemId" = ${systemId}
        AND timestamp >= ${day}
        AND timestamp < ${nextDay}
      GROUP BY "deviceId", "usageId", DATE_TRUNC('hour', timestamp)
      HAVING COUNT(*) >= 3
    `

    if (hourlyAggregates.length === 0) return

    this.log(`  📊 ${day.toISOString().split('T')[0]}: ${hourlyAggregates.length} agregados por hora`)

    if (!isDryRun) {
      // Insertar agregados por hora
      for (const agg of hourlyAggregates) {
        try {
          await this.prisma.$executeRaw`
            INSERT INTO "smart_plug_power_sample_hourly" (
              id, "systemId", "deviceId", "usageId", "hourTimestamp",
              "avgWatts", "maxWatts", "minWatts", "hourlyKwh", "sampleCount", "wasRelayOn"
            ) VALUES (
              ${crypto.randomUUID()}, ${systemId}, ${agg.deviceId}, ${agg.usageId}, 
              ${agg.hourTimestamp}, ${agg.avgWatts}, ${agg.maxWatts}, ${agg.minWatts},
              ${agg.hourlyKwh}, ${agg.sampleCount}, ${agg.wasRelayOn}
            )
            ON CONFLICT ("systemId", "deviceId", "usageId", "hourTimestamp") 
            DO UPDATE SET
              "avgWatts" = EXCLUDED."avgWatts",
              "maxWatts" = EXCLUDED."maxWatts",
              "minWatts" = EXCLUDED."minWatts",
              "hourlyKwh" = EXCLUDED."hourlyKwh",
              "sampleCount" = EXCLUDED."sampleCount",
              "wasRelayOn" = EXCLUDED."wasRelayOn"
          `
        } catch (error) {
          this.stats.errors.push(`Error insertando agregado: ${error.message}`)
        }
      }
    }

    this.stats.samplesDownsampled += hourlyAggregates.length
  }

  /**
   * Purgar muestras crudas antiguas
   */
  async purgeOldRawSamples(systemId, isDryRun) {
    this.log('\n🗑️ Iniciando purga de muestras crudas antiguas...')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionRawDays)

    try {
      // Contar muestras a eliminar
      const countResult = await this.prisma.$queryRaw`
        SELECT COUNT(*)::int as "count"
        FROM "smart_plug_power_samples"
        WHERE "systemId" = ${systemId}
          AND timestamp < ${cutoffDate}
      `

      const totalToDelete = countResult[0]?.count || 0

      if (totalToDelete === 0) {
        this.log('✅ No hay muestras crudas antiguas para purgar')
        return
      }

      this.log(`📊 Muestras crudas a purgar: ${totalToDelete.toLocaleString()}`)

      if (!isDryRun) {
        // Eliminar en lotes para evitar locks largos
        let deletedTotal = 0
        let batchCount = 0

        while (deletedTotal < totalToDelete) {
          const deletedBatch = await this.prisma.$executeRaw`
            DELETE FROM "smart_plug_power_samples"
            WHERE id IN (
              SELECT id FROM "smart_plug_power_samples"
              WHERE "systemId" = ${systemId}
                AND timestamp < ${cutoffDate}
              LIMIT ${this.config.batchSize}
            )
          `

          deletedTotal += deletedBatch
          batchCount++

          if (batchCount % 10 === 0) {
            this.log(`  🔄 Lote ${batchCount}: ${deletedTotal.toLocaleString()}/${totalToDelete.toLocaleString()} eliminadas`)
          }

          // Pausa entre lotes para no sobrecargar la BD
          await new Promise(resolve => setTimeout(resolve, 100))

          if (deletedBatch === 0) break // No hay más registros
        }

        this.log(`✅ Purga completada: ${deletedTotal.toLocaleString()} muestras eliminadas`)
      }

      this.stats.samplesDeleted = totalToDelete

    } catch (error) {
      this.stats.errors.push(`Purge raw samples error: ${error.message}`)
      this.log(`❌ Error en purga de muestras crudas: ${error.message}`)
    }
  }

  /**
   * Purgar datos desagregados muy antiguos
   */
  async purgeOldDisaggregatedData(systemId, isDryRun) {
    this.log('\n🗑️ Iniciando purga de datos desagregados antiguos...')

    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this.config.retentionDisaggregatedYears)

    try {
      const countResult = await this.prisma.$queryRaw`
        SELECT COUNT(*)::int as "count"
        FROM "appointment_service_energy_usage"
        WHERE "systemId" = ${systemId}
          AND "createdAt" < ${cutoffDate}
      `

      const totalToDelete = countResult[0]?.count || 0

      if (totalToDelete === 0) {
        this.log('✅ No hay datos desagregados antiguos para purgar')
        return
      }

      this.log(`📊 Registros desagregados a purgar: ${totalToDelete.toLocaleString()}`)

      if (!isDryRun) {
        const deleted = await this.prisma.$executeRaw`
          DELETE FROM "appointment_service_energy_usage"
          WHERE "systemId" = ${systemId}
            AND "createdAt" < ${cutoffDate}
        `

        this.log(`✅ Purga completada: ${deleted.toLocaleString()} registros desagregados eliminados`)
      }

      this.stats.disaggregatedDeleted = totalToDelete

    } catch (error) {
      this.stats.errors.push(`Purge disaggregated error: ${error.message}`)
      this.log(`❌ Error en purga de datos desagregados: ${error.message}`)
    }
  }

  /**
   * Generar reporte final
   */
  generateReport() {
    const duration = Date.now() - this.stats.startTime.getTime()
    const durationMin = Math.round(duration / 60000 * 100) / 100

    this.log('\n📋 REPORTE FINAL')
    this.log('================')
    this.log(`⏱️  Duración: ${durationMin} minutos`)
    this.log(`📈 Muestras down-sampled: ${this.stats.samplesDownsampled.toLocaleString()}`)
    this.log(`🗑️  Muestras crudas eliminadas: ${this.stats.samplesDeleted.toLocaleString()}`)
    this.log(`🗑️  Registros desagregados eliminados: ${this.stats.disaggregatedDeleted.toLocaleString()}`)
    
    if (this.stats.errors.length > 0) {
      this.log(`❌ Errores: ${this.stats.errors.length}`)
      this.stats.errors.forEach((error, i) => {
        this.log(`   ${i + 1}. ${error}`)
      })
    } else {
      this.log('✅ Proceso completado sin errores')
    }
  }

  log(message) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`)
  }
}

// Crear tabla de agregados por hora si no existe
async function ensureHourlyTable(prisma) {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "smart_plug_power_sample_hourly" (
      id VARCHAR(30) PRIMARY KEY,
      "systemId" VARCHAR(25) NOT NULL,
      "deviceId" VARCHAR(30) NOT NULL,
      "usageId" VARCHAR(30) NOT NULL,
      "hourTimestamp" TIMESTAMPTZ NOT NULL,
      "avgWatts" DECIMAL(8,2) NOT NULL,
      "maxWatts" DECIMAL(8,2) NOT NULL,
      "minWatts" DECIMAL(8,2) NOT NULL,
      "hourlyKwh" DECIMAL(10,3) NOT NULL,
      "sampleCount" INTEGER NOT NULL,
      "wasRelayOn" BOOLEAN NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "smart_plug_power_sample_hourly_unique" 
    ON "smart_plug_power_sample_hourly" ("systemId", "deviceId", "usageId", "hourTimestamp")
  `

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "smart_plug_power_sample_hourly_timestamp" 
    ON "smart_plug_power_sample_hourly" ("hourTimestamp")
  `
}

// Función principal
async function main() {
  const args = process.argv.slice(2)
  const systemId = args.find(arg => arg.startsWith('--system='))?.split('=')[1]
  const isDryRun = args.includes('--dry-run')
  const isVerbose = args.includes('--verbose')

  if (!systemId) {
    console.error('❌ Error: Se requiere --system=SYSTEM_ID')
    console.log('Uso: node scripts/energy-retention-cleanup.js --system=SYSTEM_ID [--dry-run] [--verbose]')
    process.exit(1)
  }

  try {
    // Configurar entorno
    const config = {
      retentionRawDays: parseInt(process.env.RETENTION_RAW_DAYS) || DEFAULT_CONFIG.retentionRawDays,
      retentionDisaggregatedYears: parseInt(process.env.RETENTION_DISAGGREGATED_YEARS) || DEFAULT_CONFIG.retentionDisaggregatedYears,
      verbose: isVerbose
    }

    // Asegurar tabla de agregados por hora
    const prisma = new PrismaClient()
    await ensureHourlyTable(prisma)
    await prisma.$disconnect()

    // Ejecutar proceso de retención
    const manager = new EnergyRetentionManager(config)
    await manager.run(systemId, isDryRun)

    process.exit(0)

  } catch (error) {
    console.error('❌ Error fatal:', error.message)
    if (isVerbose) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

module.exports = { EnergyRetentionManager } 