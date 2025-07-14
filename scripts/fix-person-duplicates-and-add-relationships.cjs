/**
 * 🔧 SCRIPT: LIMPIAR DUPLICADOS DE PERSONAS Y AÑADIR RELACIONES
 * =============================================================
 * 
 * Este script:
 * 1. Identifica personas duplicadas
 * 2. Consolida datos de duplicados
 * 3. Elimina duplicados manteniendo el más completo
 * 4. Crea las tablas para relaciones y proxies
 * 5. Añade constraints únicos
 * 
 * 🚨 IMPORTANTE: Ejecutar en entorno de desarrollo primero
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient({
  log: ['error']
})

async function main() {
  console.log('🔧 [PERSON_CLEANUP] Iniciando limpieza de duplicados de personas...')
  
  try {
    // 1️⃣ IDENTIFICAR DUPLICADOS POR EMAIL
    console.log('🔍 [STEP 1] Identificando duplicados por email...')
    
    const emailDuplicates = await prisma.$queryRaw`
      SELECT email, "systemId", array_agg(id) as ids, COUNT(*) as count
      FROM persons 
      WHERE email IS NOT NULL 
      GROUP BY email, "systemId"
      HAVING COUNT(*) > 1
    `
    
    console.log(`📊 [DUPLICATES] Encontrados ${emailDuplicates.length} grupos de duplicados por email`)
    
    // 2️⃣ CONSOLIDAR DUPLICADOS POR EMAIL
    for (const duplicate of emailDuplicates) {
      const personIds = duplicate.ids
      console.log(`🔄 [CONSOLIDATE] Consolidando ${personIds.length} personas con email: ${duplicate.email}`)
      
      // Obtener todos los registros duplicados
      const persons = await prisma.person.findMany({
        where: {
          id: { in: personIds }
        },
        include: {
          functionalRoles: {
            include: {
              clientData: true,
              leadData: true,
              contactData: true
            }
          },
          appointments: true,
          tickets: true,
          clientAnomalyScores: true
        }
      })
      
      // Encontrar el registro más completo (con más datos)
      const mostComplete = persons.reduce((best, current) => {
        const bestScore = calculateCompletenessScore(best)
        const currentScore = calculateCompletenessScore(current)
        return currentScore > bestScore ? current : best
      })
      
      console.log(`✅ [CONSOLIDATE] Registro más completo: ${mostComplete.firstName} ${mostComplete.lastName} (${mostComplete.id})`)
      
      // Consolidar datos en el registro más completo
      const consolidatedData = consolidatePersonData(persons, mostComplete)
      
      // Actualizar el registro más completo
      await prisma.person.update({
        where: { id: mostComplete.id },
        data: consolidatedData
      })
      
      // Migrar relaciones de los duplicados al registro principal
      const duplicateIds = personIds.filter(id => id !== mostComplete.id)
      
      for (const duplicateId of duplicateIds) {
        await migratePersonRelations(duplicateId, mostComplete.id)
      }
      
      // Eliminar duplicados
      await prisma.person.deleteMany({
        where: {
          id: { in: duplicateIds }
        }
      })
      
      console.log(`🗑️ [CLEANUP] Eliminados ${duplicateIds.length} duplicados`)
    }
    
    // 3️⃣ CREAR TABLAS PARA RELACIONES (si no existen)
    console.log('🏗️ [STEP 3] Creando tablas para relaciones...')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS person_relationships (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "personId" TEXT NOT NULL,
        "relatedPersonId" TEXT NOT NULL,
        "relationshipType" TEXT NOT NULL,
        "systemId" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "endDate" TIMESTAMP(3),
        notes TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_person_relationships_person FOREIGN KEY ("personId") REFERENCES persons(id) ON DELETE CASCADE,
        CONSTRAINT fk_person_relationships_related FOREIGN KEY ("relatedPersonId") REFERENCES persons(id) ON DELETE CASCADE,
        CONSTRAINT fk_person_relationships_system FOREIGN KEY ("systemId") REFERENCES systems(id) ON DELETE CASCADE
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS person_contact_proxies (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "personId" TEXT NOT NULL,
        "contactPersonId" TEXT NOT NULL,
        "systemId" TEXT NOT NULL,
        "proxyType" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "isPrimary" BOOLEAN DEFAULT false,
        "canSchedule" BOOLEAN DEFAULT true,
        "canPayment" BOOLEAN DEFAULT true,
        "canMedicalInfo" BOOLEAN DEFAULT false,
        notes TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_person_contact_proxies_person FOREIGN KEY ("personId") REFERENCES persons(id) ON DELETE CASCADE,
        CONSTRAINT fk_person_contact_proxies_contact FOREIGN KEY ("contactPersonId") REFERENCES persons(id) ON DELETE CASCADE,
        CONSTRAINT fk_person_contact_proxies_system FOREIGN KEY ("systemId") REFERENCES systems(id) ON DELETE CASCADE
      )
    `
    
    // 4️⃣ CREAR ÍNDICES
    console.log('📊 [STEP 4] Creando índices...')
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS person_relationship_unique 
      ON person_relationships("personId", "relatedPersonId", "relationshipType")
    `
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS person_contact_proxy_unique 
      ON person_contact_proxies("personId", "contactPersonId", "proxyType")
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS person_system_phone_idx 
      ON persons("systemId", phone)
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS person_system_national_id_idx 
      ON persons("systemId", "nationalId")
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS person_system_name_birth_idx 
      ON persons("systemId", "firstName", "lastName", "birthDate")
    `
    
    // 5️⃣ AÑADIR CAMPO PERSON_ID A USERS (si no existe)
    console.log('🔗 [STEP 5] Añadiendo relación User-Person...')
    
    await prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "personId" TEXT
    `
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS users_person_id_unique 
      ON users("personId")
    `
    
    // 6️⃣ CONSTRAINT ÚNICO PARA EMAIL EN PERSONS
    console.log('🔒 [STEP 6] Añadiendo constraint único para email...')
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS person_system_email_unique 
      ON persons("systemId", email) WHERE email IS NOT NULL
    `
    
    // 7️⃣ ESTADÍSTICAS FINALES
    console.log('📊 [STEP 7] Estadísticas finales...')
    
    const finalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_persons,
        COUNT(DISTINCT email) as unique_emails,
        COUNT(DISTINCT phone) as unique_phones,
        COUNT(DISTINCT "nationalId") as unique_national_ids
      FROM persons
    `
    
    console.log('✅ [CLEANUP] Estadísticas finales:', finalStats[0])
    
    console.log('🎉 [SUCCESS] Limpieza de duplicados completada exitosamente!')
    
  } catch (error) {
    console.error('❌ [ERROR] Error durante la limpieza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================================================
// 🔧 FUNCIONES AUXILIARES
// ============================================================================

function calculateCompletenessScore(person) {
  let score = 0
  
  // Campos básicos
  if (person.email) score += 10
  if (person.phone) score += 8
  if (person.nationalId) score += 6
  if (person.birthDate) score += 4
  if (person.address) score += 2
  if (person.city) score += 1
  
  // Relaciones
  score += person.functionalRoles.length * 5
  score += person.appointments.length * 2
  score += person.tickets.length * 1
  score += person.clientAnomalyScores.length * 3
  
  // Fecha de creación (más antiguo = más completo)
  const daysSinceCreation = (Date.now() - person.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  score += Math.min(daysSinceCreation / 10, 10)
  
  return score
}

function consolidatePersonData(persons, masterPerson) {
  const consolidated = { ...masterPerson }
  
  // Consolidar campos no nulos
  for (const person of persons) {
    if (!consolidated.email && person.email) consolidated.email = person.email
    if (!consolidated.phone && person.phone) consolidated.phone = person.phone
    if (!consolidated.nationalId && person.nationalId) consolidated.nationalId = person.nationalId
    if (!consolidated.birthDate && person.birthDate) consolidated.birthDate = person.birthDate
    if (!consolidated.address && person.address) consolidated.address = person.address
    if (!consolidated.city && person.city) consolidated.city = person.city
    if (!consolidated.postalCode && person.postalCode) consolidated.postalCode = person.postalCode
    if (!consolidated.gender && person.gender) consolidated.gender = person.gender
    
    // Consolidar notas
    if (person.notes && person.notes !== consolidated.notes) {
      consolidated.notes = consolidated.notes 
        ? `${consolidated.notes}\n---\n${person.notes}`
        : person.notes
    }
  }
  
  // Usar fecha de creación más antigua
  const oldestDate = persons.reduce((oldest, current) => 
    current.createdAt < oldest ? current.createdAt : oldest
  , consolidated.createdAt)
  
  consolidated.createdAt = oldestDate
  consolidated.updatedAt = new Date()
  
  return consolidated
}

async function migratePersonRelations(fromPersonId, toPersonId) {
  console.log(`🔄 [MIGRATE] Migrando relaciones de ${fromPersonId} → ${toPersonId}`)
  
  try {
    // Migrar appointments
    await prisma.appointment.updateMany({
      where: { personId: fromPersonId },
      data: { personId: toPersonId }
    })
    
    // Migrar tickets
    await prisma.ticket.updateMany({
      where: { personId: fromPersonId },
      data: { personId: toPersonId }
    })
    
    // Migrar functional roles (evitar duplicados)
    const existingRoles = await prisma.personFunctionalRole.findMany({
      where: { personId: toPersonId },
      select: { roleType: true }
    })
    
    const existingRoleTypes = new Set(existingRoles.map(r => r.roleType))
    
    const rolesToMigrate = await prisma.personFunctionalRole.findMany({
      where: { 
        personId: fromPersonId,
        roleType: { notIn: Array.from(existingRoleTypes) }
      }
    })
    
    for (const role of rolesToMigrate) {
      await prisma.personFunctionalRole.update({
        where: { id: role.id },
        data: { personId: toPersonId }
      })
    }
    
    // Migrar anomaly scores
    await prisma.clientAnomalyScore.updateMany({
      where: { clientId: fromPersonId },
      data: { clientId: toPersonId }
    })
    
    console.log(`✅ [MIGRATE] Relaciones migradas exitosamente`)
    
  } catch (error) {
    console.error(`❌ [MIGRATE] Error migrando relaciones:`, error)
    // No lanzar error para no interrumpir el proceso principal
  }
}

// Ejecutar script
main().catch(console.error) 