/**
 * 🔍 VERIFICACIÓN DE PERFILES ENERGÉTICOS
 * =====================================
 * 
 * Script simple para verificar que las tablas de perfiles energéticos
 * se han poblado correctamente después de la migración.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 [VERIFY] Verificando perfiles energéticos...')
  
  try {
    // Verificar perfiles de servicios
    const serviceProfiles = await prisma.serviceEnergyProfile.count()
    console.log(`📊 [SERVICE_PROFILES] Total: ${serviceProfiles}`)
    
    // Verificar perfiles de clientes
    const clientProfiles = await prisma.clientServiceEnergyProfile.count()
    console.log(`👤 [CLIENT_PROFILES] Total: ${clientProfiles}`)
    
    // Verificar perfiles de empleados
    const userProfiles = await prisma.userServiceEnergyProfile.count()
    console.log(`👨‍⚕️ [USER_PROFILES] Total: ${userProfiles}`)
    
    // Verificar datos de la tabla desagregada
    const energyUsage = await prisma.appointmentServiceEnergyUsage.count()
    console.log(`📈 [ENERGY_USAGE] Total registros: ${energyUsage}`)
    
    // Mostrar algunos ejemplos de perfiles de clientes
    const sampleClientProfiles = await prisma.clientServiceEnergyProfile.findMany({
      take: 3,
      include: {
        client: {
          select: { firstName: true, lastName: true }
        },
        service: {
          select: { name: true }
        }
      }
    })
    
    console.log('\n📋 [SAMPLE_CLIENT_PROFILES] Ejemplos:')
    sampleClientProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.client.firstName} ${profile.client.lastName} - ${profile.service.name}`)
      console.log(`     📊 Hora: ${profile.hourBucket}h | Muestras: ${profile.samples} | kWh promedio: ${profile.meanKwh.toFixed(3)} | Minutos promedio: ${profile.meanMinutes.toFixed(1)}`)
    })
    
    // Mostrar algunos ejemplos de perfiles de empleados
    const sampleUserProfiles = await prisma.userServiceEnergyProfile.findMany({
      take: 3
    })
    
    console.log('\n👨‍⚕️ [SAMPLE_USER_PROFILES] Ejemplos:')
    sampleUserProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. UserId: ${profile.userId} - ServiceId: ${profile.serviceId}`)
      console.log(`     📊 Hora: ${profile.hourBucket}h | Muestras: ${profile.samples} | kWh promedio: ${profile.meanKwh.toFixed(3)} | Minutos promedio: ${profile.meanMinutes.toFixed(1)}`)
    })
    
    console.log('\n✅ [VERIFY] Verificación completada!')
    
  } catch (error) {
    console.error('❌ [VERIFY] Error durante la verificación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 