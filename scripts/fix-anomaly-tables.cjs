/**
 * 🔧 SCRIPT DE LIMPIEZA Y RECREACIÓN DE TABLAS DE SCORING
 * ======================================================
 * 
 * Este script elimina las tablas conflictivas y recrea las tablas
 * de scoring con la nomenclatura correcta smart_plug_*.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 [FIX] Iniciando limpieza y recreación de tablas de scoring...')
  
  try {
    // 1️⃣ ELIMINAR TABLAS EXISTENTES
    console.log('🗑️ [FIX] Eliminando tablas conflictivas...')
    
    await prisma.$executeRaw`DROP TABLE IF EXISTS "client_anomaly_scores" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "employee_anomaly_scores" CASCADE;`
    
    console.log('✅ [FIX] Tablas antiguas eliminadas')
    
    // 2️⃣ CREAR NUEVAS TABLAS CON NOMENCLATURA CORRECTA
    console.log('📊 [FIX] Creando nuevas tablas de scoring...')
    
    // Tabla de scores de clientes
    await prisma.$executeRaw`
      CREATE TABLE "smart_plug_client_anomaly_scores" (
        "id" TEXT NOT NULL,
        "systemId" TEXT NOT NULL,
        "clinicId" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        
        -- Métricas agregadas
        "totalServices" INTEGER NOT NULL DEFAULT 0,
        "totalAnomalies" INTEGER NOT NULL DEFAULT 0,
        "anomalyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        
        -- Análisis de desviaciones
        "avgDeviationPercent" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "maxDeviationPercent" DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Patrones detectados (JSON)
        "suspiciousPatterns" JSONB NOT NULL DEFAULT '{}',
        "favoredByEmployees" JSONB NOT NULL DEFAULT '{}',
        
        -- Score de riesgo
        "riskScore" INTEGER NOT NULL DEFAULT 0,
        "riskLevel" TEXT NOT NULL DEFAULT 'low',
        
        -- Metadatos
        "lastAnomalyDate" TIMESTAMP(3),
        "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "smart_plug_client_anomaly_scores_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Tabla de scores de empleados
    await prisma.$executeRaw`
      CREATE TABLE "smart_plug_employee_anomaly_scores" (
        "id" TEXT NOT NULL,
        "systemId" TEXT NOT NULL,
        "clinicId" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        
        -- Métricas agregadas
        "totalServices" INTEGER NOT NULL DEFAULT 0,
        "totalAnomalies" INTEGER NOT NULL DEFAULT 0,
        "anomalyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        
        -- Análisis de eficiencia
        "avgEfficiency" DECIMAL(5,2) NOT NULL DEFAULT 100,
        "consistencyScore" DECIMAL(5,2) NOT NULL DEFAULT 100,
        
        -- Patrones sospechosos (JSON)
        "favoredClients" JSONB NOT NULL DEFAULT '{}',
        "fraudIndicators" JSONB NOT NULL DEFAULT '{}',
        "timePatterns" JSONB NOT NULL DEFAULT '{}',
        
        -- Score de riesgo
        "riskScore" INTEGER NOT NULL DEFAULT 0,
        "riskLevel" TEXT NOT NULL DEFAULT 'low',
        
        -- Metadatos
        "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "smart_plug_employee_anomaly_scores_pkey" PRIMARY KEY ("id")
      );
    `
    
    // 3️⃣ CREAR ÍNDICES
    console.log('🔍 [FIX] Creando índices optimizados...')
    
    // Índices para client scores
    await prisma.$executeRaw`CREATE UNIQUE INDEX "smart_plug_client_anomaly_scores_systemId_clinicId_clientId_key" ON "smart_plug_client_anomaly_scores"("systemId", "clinicId", "clientId");`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_client_anomaly_scores_riskLevel_riskScore_idx" ON "smart_plug_client_anomaly_scores"("riskLevel", "riskScore" DESC);`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_client_anomaly_scores_systemId_clinicId_idx" ON "smart_plug_client_anomaly_scores"("systemId", "clinicId");`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_client_anomaly_scores_anomalyRate_idx" ON "smart_plug_client_anomaly_scores"("anomalyRate" DESC);`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_client_anomaly_scores_lastAnomalyDate_idx" ON "smart_plug_client_anomaly_scores"("lastAnomalyDate" DESC);`
    
    // Índices para employee scores
    await prisma.$executeRaw`CREATE UNIQUE INDEX "smart_plug_employee_anomaly_scores_systemId_clinicId_employeeId_key" ON "smart_plug_employee_anomaly_scores"("systemId", "clinicId", "employeeId");`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_employee_anomaly_scores_riskLevel_riskScore_idx" ON "smart_plug_employee_anomaly_scores"("riskLevel", "riskScore" DESC);`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_employee_anomaly_scores_systemId_clinicId_idx" ON "smart_plug_employee_anomaly_scores"("systemId", "clinicId");`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_employee_anomaly_scores_anomalyRate_idx" ON "smart_plug_employee_anomaly_scores"("anomalyRate" DESC);`
    await prisma.$executeRaw`CREATE INDEX "smart_plug_employee_anomaly_scores_efficiency_idx" ON "smart_plug_employee_anomaly_scores"("avgEfficiency" ASC);`
    
    console.log('✅ [FIX] Nuevas tablas creadas con índices optimizados')
    
    // 4️⃣ VERIFICAR CREACIÓN
    const clientTable = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'saasavatar' 
      AND table_name = 'smart_plug_client_anomaly_scores';
    `
    
    const employeeTable = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'saasavatar' 
      AND table_name = 'smart_plug_employee_anomaly_scores';
    `
    
    console.log('🎉 [FIX] Verificación completada:')
    console.log(`   - Tabla client scores: ${clientTable.length > 0 ? '✅ Creada' : '❌ Error'}`)
    console.log(`   - Tabla employee scores: ${employeeTable.length > 0 ? '✅ Creada' : '❌ Error'}`)
    
  } catch (error) {
    console.error('❌ [FIX] Error durante la limpieza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar limpieza
main()
  .catch((error) => {
    console.error('💥 [FIX] Limpieza falló:', error)
    process.exit(1)
  }) 